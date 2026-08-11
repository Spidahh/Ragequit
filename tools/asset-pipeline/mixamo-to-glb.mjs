// mixamo-to-glb.mjs — fuse a Mixamo character + its animation-pack FBX clips
// into ONE game-ready GLB with named clips.
//
// Pipeline per class:
//   1. FBX2glTF: T-pose character FBX → base GLB (skin + textures).
//   2. FBX2glTF: each selected clip FBX → temp GLB (same rig, 1 animation).
//   3. gltf-transform: mergeDocuments(base, clip), retarget every animation
//      channel onto the BASE skeleton nodes (matched by bone name), name the
//      clip from its filename, drop the duplicated clip-scene, prune+dedup.
//
// Usage: node tools/asset-pipeline/mixamo-to-glb.mjs <charDir> <outGlb> [clipFilter...]
//   charDir    packages/client/character-sources/mixamo/Paladin
//              (expects a *.fbx character at top level + pack/*.fbx clips)
//   clipFilter optional substrings — only clip files whose name contains one
//              of them are merged (default: a curated gameplay set).

import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { NodeIO } from '@gltf-transform/core'
import { dedup, mergeDocuments, prune, unpartition } from '@gltf-transform/functions'

const root = path.resolve(fileURLToPath(import.meta.url), '../../..')
const FBX2GLTF = path.join(root, 'node_modules', 'fbx2gltf', 'bin', os.type(), 'FBX2glTF.exe')

const [charDir, outGlb, ...filters] = process.argv.slice(2)
if (!charDir || !outGlb) {
  console.error('usage: node mixamo-to-glb.mjs <charDir> <outGlb> [clipFilter...]')
  process.exit(1)
}

// Curated default: full gameplay coverage without shipping all 50+ clips.
const DEFAULT_FILTERS = [
  'idle.fbx',
  'idle (2)',
  'run',
  'walk forward',
  'walk.fbx',
  'strafe',
  'jump',
  'attack',
  'slash.fbx',
  'slash (2)',
  'block idle',
  'block.fbx',
  'impact.fbx',
  'impact (2)',
  'death',
  'casting',
  'power up',
  'draw arrow',
  'aim recoil',
  'aim overdraw',
  'walk back',
  'walk left',
  'walk right',
]

const active = filters.length > 0 ? filters : DEFAULT_FILTERS
const tmp = path.join(os.tmpdir(), `mixamo-merge-${Date.now()}`)
mkdirSync(tmp, { recursive: true })

function fbxToGlb(fbxPath, name) {
  const out = path.join(tmp, name)
  execFileSync(FBX2GLTF, ['--binary', '--input', fbxPath, '--output', out], { stdio: 'pipe' })
  return `${out}.glb`
}

function clipNameFromFile(file) {
  return path
    .basename(file, '.fbx')
    .replace(/\s*\((\d+)\)\s*$/, '_$1')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

const charFbx = readdirSync(charDir)
  .filter((f) => f.toLowerCase().endsWith('.fbx'))
  .map((f) => path.join(charDir, f))
  .find((f) => statSync(f).isFile())
if (!charFbx) {
  console.error(`no character .fbx found in ${charDir}`)
  process.exit(1)
}
const packDir = path.join(charDir, 'pack')
const clipFiles = readdirSync(packDir)
  .filter((f) => f.toLowerCase().endsWith('.fbx'))
  // The pack re-ships the character FBX — skip it (no useful clip inside).
  .filter((f) => clipNameFromFile(f) !== clipNameFromFile(path.basename(charFbx)))
  .filter((f) => active.some((s) => f.toLowerCase().includes(s.toLowerCase())))
  .sort()

console.log(`character: ${path.basename(charFbx)}`)
console.log(`clips selected: ${clipFiles.length}`)

const io = new NodeIO()
const baseDoc = await io.read(fbxToGlb(charFbx, 'base'))
const baseRoot = baseDoc.getRoot()
// Drop any placeholder animation the T-pose export carries.
for (const anim of baseRoot.listAnimations()) anim.dispose()

const baseNodesByName = new Map()
for (const node of baseRoot.listNodes()) baseNodesByName.set(node.getName(), node)

let merged = 0
for (const file of clipFiles) {
  const clipName = clipNameFromFile(file)
  let clipDoc
  try {
    clipDoc = await io.read(fbxToGlb(path.join(packDir, file), clipName))
  } catch (err) {
    console.warn(`  SKIP ${clipName}: ${err.message}`)
    continue
  }
  // Merge the whole clip document in, then retarget + strip its scene.
  const scenesBefore = new Set(baseRoot.listScenes())
  mergeDocuments(baseDoc, clipDoc)
  const anims = baseRoot.listAnimations().filter((a) => !a.getName().startsWith('__done__'))
  const anim = anims[anims.length - 1]
  if (!anim) {
    console.warn(`  SKIP ${clipName}: no animation found`)
    continue
  }
  let retargeted = 0
  let dropped = 0
  for (const channel of anim.listChannels()) {
    const target = channel.getTargetNode()
    const home = target ? baseNodesByName.get(target.getName()) : null
    if (home) {
      channel.setTargetNode(home)
      retargeted++
    } else {
      channel.dispose() // bone that doesn't exist on the base rig
      dropped++
    }
  }
  anim.setName(clipName)
  // Remove the scene(s) the clip brought along (its duplicate skeleton/mesh).
  for (const scene of baseRoot.listScenes()) {
    if (!scenesBefore.has(scene)) scene.dispose()
  }
  console.log(`  + ${clipName} (${retargeted} ch${dropped ? `, ${dropped} dropped` : ''})`)
  merged++
}

await baseDoc.transform(prune(), dedup(), unpartition())
await io.write(outGlb, baseDoc)
const size = statSync(outGlb).size
console.log(`wrote ${outGlb} — ${(size / 1e6).toFixed(1)} MB, ${merged} clips`)
rmSync(tmp, { recursive: true, force: true })
