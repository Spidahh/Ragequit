// vet-rigs.mjs — data-driven vetting of EVERY character GLB in the library against
// the HARD rule "rig = Mixamo, must support all needed animation states".
// Recursively scans the library, reads each file's skeleton (joint names → Mixamo?
// bone count) and embedded animation clips, then prints a verdict + a final roster
// of the ONLY files that are actually drop-in usable (Mixamo-rigged).
// Usage: node tools/verify/vet-rigs.mjs [dir]
import { readdirSync } from 'node:fs'
import path from 'node:path'

import { NodeIO } from '@gltf-transform/core'

const ROOT = process.argv[2] ?? 'E:/GIOCHI/ASSET_GRAFICA/PERSONAGGI'

function walk(dir) {
  const out = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p))
    else if (/\.(glb|gltf)$/i.test(e.name)) out.push(p)
  }
  return out
}

const io = new NodeIO()
const files = walk(ROOT).sort()
console.log(`Scansiono ${files.length} file in ${ROOT}\n`)

const mixamoReady = []
const conformable = []
const junk = []

for (const file of files) {
  const name = path.relative(ROOT, file)
  let doc
  try {
    doc = await io.read(file)
  } catch (e) {
    console.log(`❌ ${name} — READ FAILED: ${String(e).split('\n')[0]}`)
    junk.push(name)
    continue
  }
  const root = doc.getRoot()
  const skins = root.listSkins()
  const anims = root.listAnimations()
  const joints = skins.length ? skins[0].listJoints().map((j) => j.getName()) : []
  const mixamo = joints.some((n) => /mixamorig/i.test(n))
  const tag = !skins.length ? '❌ STATICO' : mixamo ? '✅ MIXAMO' : '⚠️ rig non-Mixamo'
  console.log(
    `${tag.padEnd(18)} ${name}  [ossa:${joints.length} anim:${anims.length}]` +
      (joints.length ? `  bone0:${joints[0]}` : ''),
  )
  if (mixamo) mixamoReady.push(`${name} (anim:${anims.length})`)
  else if (skins.length) conformable.push(`${name} (ossa:${joints.length}, anim:${anims.length})`)
  else junk.push(name)
}

console.log('\n================ ROSTER ================')
console.log(`\n✅ MIXAMO-READY (drop-in, usano tutte le nostre anim) — ${mixamoReady.length}:`)
for (const m of mixamoReady) console.log('   ' + m)
console.log(`\n⚠️ RIGGATI ma NON-Mixamo (servono conform/retarget) — ${conformable.length}:`)
for (const c of conformable) console.log('   ' + c)
console.log(`\n❌ STATICI/illeggibili (inutili) — ${junk.length}:`)
for (const j of junk) console.log('   ' + j)
