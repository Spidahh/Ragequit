import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import fs from 'node:fs'

const requireFromClient = createRequire(path.resolve('packages/client/package.json'))
const { FBXLoader } = await import(pathToFileURL(requireFromClient.resolve('three/addons/loaders/FBXLoader.js')))

const ROOT = path.resolve('packages/client/public/characters/legacy')
const BASE = path.join(ROOT, 'player_base.fbx')
const REQUIRED = {
  idle: 'animations/idle_combat.fbx',
  run: 'animations/run_forward.fbx',
  walk: 'animations/walk_forward.fbx',
  jump_start: 'animations/jump.fbx',
  fall_airborne: 'animations/airborne.fbx',
  land: 'animations/land.fbx',
  sword_attack_1: 'animations/melee_attack_01.fbx',
  sword_attack_2: 'animations/melee_attack_02.fbx',
  parry_block: 'animations/parry_block.fbx',
  bow_draw: 'animations/bow_draw.fbx',
  bow_release: 'animations/bow_release.fbx',
  staff_cast: 'animations/staff_cast.fbx',
  channel: 'animations/channel.fbx',
  hit_reaction: 'animations/hit_react.fbx',
  dash_roll: 'animations/dash_roll.fbx',
  death: 'animations/death.fbx',
  respawn: 'animations/respawn.fbx',
}

const loader = new FBXLoader()

function loadFbx(filePath) {
  const buffer = fs.readFileSync(filePath)
  return loader.parse(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    path.dirname(filePath) + path.sep,
  )
}

function inspect(root) {
  const bones = new Set()
  let meshes = 0
  let skinnedMeshes = 0
  root.traverse((node) => {
    if (node.isMesh) meshes += 1
    if (node.isSkinnedMesh) skinnedMeshes += 1
    if (node.isBone) bones.add(node.name)
  })
  return { bones, meshes, skinnedMeshes }
}

function trackTargetName(trackName) {
  const dot = trackName.indexOf('.')
  return dot >= 0 ? trackName.slice(0, dot) : trackName
}

function resolveLegacyTrackTarget(target, boneNames) {
  if (boneNames.has(target)) return target
  const withoutMixamo = target.replace(/^mixamorig/, '')
  if (boneNames.has(withoutMixamo)) return withoutMixamo
  return null
}

console.log(`Legacy character FBX audit: ${ROOT}`)

if (!fs.existsSync(BASE)) {
  console.error(`FAIL: missing base FBX: ${BASE}`)
  process.exit(1)
}

const baseRoot = loadFbx(BASE)
const base = inspect(baseRoot)

console.log(`baseMeshes=${base.meshes}`)
console.log(`baseSkinnedMeshes=${base.skinnedMeshes}`)
console.log(`baseBones=${base.bones.size}`)
console.log(`baseClips=${baseRoot.animations.length}`)

let failed = false
if (base.skinnedMeshes === 0 || base.bones.size === 0) {
  console.error('FAIL: base FBX is not a usable skinned character.')
  failed = true
}
if (baseRoot.animations.length > 0) {
  console.error('FAIL: base FBX must be the mesh/skin source, not a legacy animation FBX.')
  failed = true
}

for (const [state, rel] of Object.entries(REQUIRED)) {
  const file = path.join(ROOT, rel)
  if (!fs.existsSync(file)) {
    console.log(`MISS ${state}: ${rel}`)
    failed = true
    continue
  }

  const animRoot = loadFbx(file)
  const clip = animRoot.animations[0]
  if (!clip) {
    console.log(`MISS ${state}: ${rel} has no animation clip`)
    failed = true
    continue
  }

  const targets = new Set(clip.tracks.map((track) => trackTargetName(track.name)))
  const overlap = [...targets].filter((target) => resolveLegacyTrackTarget(target, base.bones)).length
  const ratio = targets.size > 0 ? overlap / targets.size : 0
  const ok = ratio >= 0.5
  console.log(
    `${ok ? 'OK  ' : 'FAIL'} ${state}: ${rel} duration=${clip.duration.toFixed(3)}s tracks=${clip.tracks.length} retargetableBones=${overlap}/${targets.size}`,
  )
  if (!ok) failed = true
}

if (failed) {
  console.error('FAIL: legacy character set does not satisfy the animation contract.')
  process.exit(1)
}

console.log('PASS: legacy character set satisfies the animation contract.')
