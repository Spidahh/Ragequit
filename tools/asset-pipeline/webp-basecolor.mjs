// webp-basecolor.mjs — Convert the RENDERED baseColor (albedo) textures of a
// .gltf set to LOSSLESS WebP and rewrite the gltf image URIs. Lossless = byte-for-
// byte identical decoded pixels, so there is NO visual change — just a smaller,
// modern format. (normal/ORM maps are left as the tiny 64² PNGs from
// shrink-unused-maps; only the baseColor the toon material actually samples is
// worth converting.) URI rewrite is a minimal string replace (gltf otherwise
// untouched). git is the backup.
//
// Usage: node tools/asset-pipeline/webp-basecolor.mjs <dir>
import { readFileSync, writeFileSync, readdirSync, statSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const dir = process.argv[2]
if (!dir) {
  console.error('usage: node webp-basecolor.mjs <dir>')
  process.exit(1)
}

const gltfFiles = readdirSync(dir).filter((f) => f.endsWith('.gltf'))

// Collect images used as baseColorTexture (and ONLY that — never as normal/ORM).
const baseColor = new Set()
const otherSlots = new Set()
for (const f of gltfFiles) {
  const g = JSON.parse(readFileSync(join(dir, f), 'utf8'))
  const images = g.images ?? []
  const textures = g.textures ?? []
  const uriOf = (i) => (i?.index != null ? images[textures[i.index]?.source]?.uri : null)
  for (const m of g.materials ?? []) {
    const pbr = m.pbrMetallicRoughness ?? {}
    const base = uriOf(pbr.baseColorTexture)
    if (base) baseColor.add(base)
    for (const slot of [pbr.metallicRoughnessTexture, m.normalTexture, m.occlusionTexture]) {
      const u = uriOf(slot)
      if (u) otherSlots.add(u)
    }
  }
}
// Convert only pure-baseColor PNGs (never one also used as a non-baseColor map).
const targets = [...baseColor].filter((u) => u.endsWith('.png') && !otherSlots.has(u))

let before = 0
let after = 0
for (const png of targets) {
  const src = join(dir, png)
  const out = join(dir, png.replace(/\.png$/, '.webp'))
  const sz = statSync(src).size
  before += sz
  const buf = await sharp(src).webp({ lossless: true }).toBuffer()
  writeFileSync(out, buf)
  after += buf.length
  console.log(`  ${String(Math.round(sz / 1024)).padStart(6)} KB -> ${String(Math.round(buf.length / 1024)).padStart(5)} KB  ${png}`)
}

// Rewrite gltf URIs (minimal string replace), then delete the PNG originals.
for (const f of gltfFiles) {
  const p = join(dir, f)
  let txt = readFileSync(p, 'utf8')
  let changed = false
  for (const png of targets) {
    const webp = png.replace(/\.png$/, '.webp')
    if (txt.includes(`"${png}"`)) {
      txt = txt.split(`"${png}"`).join(`"${webp}"`)
      changed = true
    }
  }
  if (changed) writeFileSync(p, txt)
}
for (const png of targets) {
  try {
    unlinkSync(join(dir, png))
  } catch {
    /* already gone */
  }
}
console.log(
  `\nbaseColor → WebP lossless: ${(before / 1024 / 1024).toFixed(1)} MB -> ${(after / 1024 / 1024).toFixed(2)} MB (saved ${((before - after) / 1024 / 1024).toFixed(1)} MB, ${targets.length} textures)`,
)
