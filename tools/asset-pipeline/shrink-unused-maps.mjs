// shrink-unused-maps.mjs — De-bloat textures the runtime never renders.
//
// The client converts every loaded material to MeshToonMaterial, which keeps
// ONLY the baseColor (`.map`); normal / metallicRoughness / occlusion maps are
// dropped (characters.ts _makeToonMaterial; arena.ts disposes them). Those maps
// are therefore downloaded + decoded then discarded — pure transfer waste.
//
// This script parses each .gltf, finds every image used ONLY by non-baseColor
// material slots, and downscales it to TARGET×TARGET. The file stays a valid PNG
// at the same path (GLTFLoader still loads it, toon still ignores it), so there
// is NO gltf edit and NO visual change — just a ~99% smaller download. git is the
// backup. Re-runnable (idempotent: already-small files are skipped).
//
// Usage: node tools/asset-pipeline/shrink-unused-maps.mjs <dir> [<dir> ...]
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const TARGET = 64
const args = process.argv.slice(2)
const CHECK = args.includes('--check')
const ALL = args.includes('--all')
const dirs = args.filter((a) => !a.startsWith('--'))
if (dirs.length === 0) {
  console.error('usage: node shrink-unused-maps.mjs [--check] [--all] <dir> [<dir> ...]')
  console.error('  --check: CI guard — exit 1 if any in-scope map exceeds the budget (no writes)')
  console.error('  --all:   every referenced texture is in scope (use for flat-shaded dirs like')
  console.error('           arena/props, where the runtime material keeps NO map at all)')
  process.exit(1)
}

// uri -> { baseColor:bool, otherOnly:bool, dir }
const usage = new Map()
for (const dir of dirs) {
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.gltf'))) {
    const g = JSON.parse(readFileSync(join(dir, f), 'utf8'))
    const images = g.images ?? []
    const textures = g.textures ?? []
    const uriOf = (i) => (i?.index != null ? images[textures[i.index]?.source]?.uri : null)
    for (const m of g.materials ?? []) {
      const pbr = m.pbrMetallicRoughness ?? {}
      const base = uriOf(pbr.baseColorTexture)
      const others = [pbr.metallicRoughnessTexture, m.normalTexture, m.occlusionTexture]
        .map(uriOf)
        .filter(Boolean)
      if (base) {
        const e = usage.get(base) ?? { dir, baseColor: false }
        e.baseColor = true
        e.dir = dir
        usage.set(base, e)
      }
      for (const u of others) {
        const e = usage.get(u) ?? { dir, baseColor: false }
        e.dir = dir
        usage.set(u, e)
      }
    }
  }
}

// Default: only maps the toon material discards (normal/ORM/occlusion). With
// --all: every referenced texture (the dir is flat-shaded, no map kept at all).
const targets = ALL ? [...usage.entries()] : [...usage.entries()].filter(([, e]) => !e.baseColor)

if (CHECK) {
  // CI guard: fail if any toon-discarded map is bigger than the budget — keeps
  // the ~67MB of normal/ORM maps from creeping back full-res.
  const offenders = []
  for (const [uri, e] of targets) {
    const path = join(e.dir, uri)
    try {
      const meta = await sharp(path).metadata()
      if ((meta.width ?? 0) > TARGET || (meta.height ?? 0) > TARGET) {
        offenders.push(
          `${uri} (${meta.width}x${meta.height}, ${Math.round(statSync(path).size / 1024)} KB)`,
        )
      }
    } catch {
      /* missing file — referenced-but-absent is a different validator's job */
    }
  }
  // Orphan detection (--all dirs only): an image file on disk that NO .gltf
  // references is pure dead weight the size loop above can't see (it only walks
  // textures wired into a material slot). This is the hole that let ~16 MB of
  // unused 2048px trim PNGs ship. Scoped to --all dirs (flat-shaded prop bundles);
  // the character dir carries referenced helper textures we don't want to misflag.
  if (ALL) {
    const IMG = /\.(png|jpe?g|webp)$/i
    const referenced = new Set([...usage.keys()].map((u) => u.split('/').pop()))
    for (const dir of dirs) {
      for (const f of readdirSync(dir)) {
        if (!IMG.test(f)) continue
        if (!referenced.has(f)) offenders.push(`${f} (orphan: referenced by no .gltf in ${dir})`)
      }
    }
  }
  if (offenders.length) {
    console.error(
      `✗ ${offenders.length} asset(s) over budget or orphaned (run shrink-unused-maps.mjs):`,
    )
    for (const o of offenders) console.error(`  - ${o}`)
    process.exit(1)
  }
  console.log(`✓ all maps within ${TARGET}px budget + no orphans (${targets.length} checked)`)
  process.exit(0)
}

let before = 0
let after = 0
let shrunk = 0
for (const [uri, e] of targets) {
  const path = join(e.dir, uri)
  let sz
  try {
    sz = statSync(path).size
  } catch {
    continue
  }
  before += sz
  const meta = await sharp(path).metadata()
  if ((meta.width ?? 0) <= TARGET && (meta.height ?? 0) <= TARGET) {
    after += sz
    continue // already tiny — idempotent
  }
  const buf = await sharp(path)
    .resize(TARGET, TARGET, { fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toBuffer()
  const { writeFileSync } = await import('node:fs')
  writeFileSync(path, buf)
  after += buf.length
  shrunk++
  console.log(
    `  ${String(Math.round(sz / 1024)).padStart(6)} KB -> ${String(Math.round(buf.length / 1024)).padStart(4)} KB  ${uri}`,
  )
}
console.log(
  `\nShrunk ${shrunk} unused-by-toon maps: ${(before / 1024 / 1024).toFixed(1)} MB -> ${(after / 1024 / 1024).toFixed(2)} MB (saved ${((before - after) / 1024 / 1024).toFixed(1)} MB)`,
)
