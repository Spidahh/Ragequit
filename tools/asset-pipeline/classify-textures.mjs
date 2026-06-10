// classify-textures.mjs — Read-only. Parses every .gltf under the given dirs and
// reports, per image URI, which MATERIAL SLOTS reference it (baseColor / normal /
// occlusion / metallicRoughness / emissive). The runtime converts everything to
// MeshToonMaterial which keeps ONLY the baseColor (`.map`) — so any image used
// exclusively by normal/occlusion/metallicRoughness/emissive slots is downloaded
// and immediately discarded: safe to shrink/strip.
//
// Usage: node tools/asset-pipeline/classify-textures.mjs <dir> [<dir> ...]
import { readFileSync, statSync } from 'node:fs'
import { readdirSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'

const dirs = process.argv.slice(2)
if (dirs.length === 0) {
  console.error('usage: node classify-textures.mjs <dir> [<dir> ...]')
  process.exit(1)
}

/** image uri -> Set of slot names that reference it */
const usage = new Map()
const sizeOf = (p) => {
  try {
    return statSync(p).size
  } catch {
    return 0
  }
}

function record(uri, slot) {
  if (!usage.has(uri)) usage.set(uri, { slots: new Set(), files: new Set() })
  usage.get(uri).slots.add(slot)
}

for (const dir of dirs) {
  const files = readdirSync(dir).filter((f) => f.endsWith('.gltf'))
  for (const f of files) {
    const gltf = JSON.parse(readFileSync(join(dir, f), 'utf8'))
    const images = gltf.images ?? []
    const textures = gltf.textures ?? []
    const uriOf = (texIndex) => {
      const t = textures[texIndex]
      if (!t || t.source == null) return null
      return images[t.source]?.uri ?? null
    }
    for (const mat of gltf.materials ?? []) {
      const pbr = mat.pbrMetallicRoughness ?? {}
      const slots = [
        ['baseColor', pbr.baseColorTexture?.index],
        ['metallicRoughness', pbr.metallicRoughnessTexture?.index],
        ['normal', mat.normalTexture?.index],
        ['occlusion', mat.occlusionTexture?.index],
        ['emissive', mat.emissiveTexture?.index],
      ]
      for (const [slot, idx] of slots) {
        if (idx == null) continue
        const uri = uriOf(idx)
        if (uri) {
          record(uri, slot)
          usage.get(uri).files.add(join(dir, uri))
        }
      }
    }
  }
}

const KEEP = [] // used as baseColor anywhere
const SHRINK = [] // used ONLY by non-baseColor slots (toon discards these)
for (const [uri, info] of usage) {
  const path = [...info.files][0]
  const kb = Math.round(sizeOf(path) / 1024)
  const slots = [...info.slots].sort().join(',')
  const row = { uri, slots, kb, path }
  if (info.slots.has('baseColor')) KEEP.push(row)
  else SHRINK.push(row)
}
const sum = (a) => a.reduce((s, r) => s + r.kb, 0)
SHRINK.sort((a, b) => b.kb - a.kb)
KEEP.sort((a, b) => b.kb - a.kb)

console.log('=== KEEP (baseColor / albedo — full res) ===')
for (const r of KEEP) console.log(`  ${String(r.kb).padStart(6)} KB  [${r.slots}]  ${r.uri}`)
console.log(`  total KEEP: ${sum(KEEP)} KB`)
console.log('\n=== SHRINK (normal/ORM/etc — discarded by toon material) ===')
for (const r of SHRINK) console.log(`  ${String(r.kb).padStart(6)} KB  [${r.slots}]  ${r.uri}`)
console.log(`  total SHRINK candidate: ${sum(SHRINK)} KB`)
