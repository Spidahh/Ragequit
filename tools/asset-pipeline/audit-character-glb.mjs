import fs from 'node:fs'
import path from 'node:path'

const REQUIRED_CLIPS = [
  { state: 'idle', names: ['Idle', 'Attacking_Idle'] },
  { state: 'run', names: ['Run'] },
  { state: 'walk', names: ['Walk'] },
  { state: 'jump_start', names: ['Jump', 'Jump_Start', 'JumpStart'] },
  { state: 'fall_airborne', names: ['Fall', 'Falling', 'Airborne', 'Knockup'] },
  { state: 'land', names: ['Land', 'Landing'] },
  { state: 'sword_attack_1', names: ['Sword_Attack', 'Sword_Attack1', 'Dagger_Attack'] },
  { state: 'sword_attack_2', names: ['Sword_Attack2', 'Dagger_Attack2'] },
  { state: 'parry_block', names: ['Parry', 'Block', 'Guard'] },
  { state: 'bow_draw', names: ['Bow_Draw', 'Bow_Aim', 'Bow_Charge'] },
  { state: 'bow_release', names: ['Bow_Release', 'Bow_Shoot', 'Shoot'] },
  { state: 'staff_cast', names: ['Staff_Cast', 'Cast', 'Spell_Cast', 'Punch'] },
  { state: 'channel', names: ['Channel', 'Staff_Channel', 'Beam_Channel'] },
  { state: 'hit_reaction', names: ['ReceiveHit', 'RecieveHit', 'Hit', 'HitReact'] },
  { state: 'dash_roll', names: ['Dash', 'Roll'] },
  { state: 'death', names: ['Death', 'Die'] },
  { state: 'respawn', names: ['Respawn', 'Revive', 'Spawn'] },
]

function usage() {
  console.error('Usage: node tools/asset-pipeline/audit-character-glb.mjs <file.glb|file.gltf>')
  process.exit(2)
}

function readCharacterJson(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.gltf') return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  if (ext !== '.glb') throw new Error(`Unsupported file extension: ${ext}`)
  const buffer = fs.readFileSync(filePath)
  if (buffer.readUInt32LE(0) !== 0x46546c67) throw new Error('Not a binary glTF .glb file')
  const version = buffer.readUInt32LE(4)
  if (version !== 2) throw new Error(`Unsupported GLB version ${version}`)
  let offset = 12
  while (offset < buffer.length) {
    const chunkLength = buffer.readUInt32LE(offset)
    const chunkType = buffer.readUInt32LE(offset + 4)
    offset += 8
    const chunk = buffer.subarray(offset, offset + chunkLength)
    offset += chunkLength
    if (chunkType === 0x4e4f534a) return JSON.parse(chunk.toString('utf8').trim())
  }
  throw new Error('GLB JSON chunk not found')
}

function shortClipName(name) {
  const idx = name.lastIndexOf('|')
  return idx >= 0 ? name.slice(idx + 1) : name
}

function main() {
  const fileArg = process.argv[2]
  if (!fileArg) usage()

  const filePath = path.resolve(fileArg)
  const json = readCharacterJson(filePath)
  const animations = json.animations ?? []
  const clipNames = animations.map((clip) => clip.name ?? '')
  const normalizedClipNames = new Set(clipNames.flatMap((name) => [name, shortClipName(name)]))
  const skins = json.skins ?? []
  const nodes = json.nodes ?? []
  const skinnedMeshNodes = nodes.filter((node) => node.mesh != null && node.skin != null)

  const coverage = REQUIRED_CLIPS.map((requirement) => {
    const match = requirement.names.find((name) => normalizedClipNames.has(name))
    return { ...requirement, match: match ?? null }
  })
  const missing = coverage.filter((item) => !item.match)

  console.log(`Character asset audit: ${filePath}`)
  console.log(`nodes=${nodes.length}`)
  console.log(`meshes=${json.meshes?.length ?? 0}`)
  console.log(`skins=${skins.length}`)
  console.log(`skinnedMeshNodes=${skinnedMeshNodes.length}`)
  console.log(`animations=${animations.length}`)
  console.log('')

  console.log('Skinned mesh nodes:')
  for (const node of skinnedMeshNodes) {
    console.log(`- ${node.name ?? '(unnamed)'} mesh=${node.mesh} skin=${node.skin}`)
  }
  if (skinnedMeshNodes.length === 0) console.log('- MISSING')
  console.log('')

  console.log('Animation clips:')
  for (const clip of animations) {
    console.log(`- ${clip.name ?? '(unnamed)'}`)
  }
  if (animations.length === 0) console.log('- MISSING')
  console.log('')

  console.log('Gameplay coverage:')
  for (const item of coverage) {
    console.log(`${item.match ? 'OK  ' : 'MISS'} ${item.state}${item.match ? ` -> ${item.match}` : ''}`)
  }
  console.log('')

  if (skins.length === 0 || skinnedMeshNodes.length === 0) {
    console.error('FAIL: asset has no usable skinned character mesh.')
    process.exit(1)
  }

  if (missing.length > 0) {
    console.error(`FAIL: missing ${missing.length} gameplay animation states.`)
    process.exit(1)
  }

  console.log('PASS: asset covers the current character animation contract.')
}

main()
