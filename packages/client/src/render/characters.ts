import { CAPSULE_HALF_HEIGHT_M, CAPSULE_HEIGHT_M } from '@ragequit/shared'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js'

import {
  ELEMENT_COLORS,
  makeCharacter as makeCharacterAnchor,
  type CharacterOpts,
  type ElementId,
  type WeaponId as CharacterWeaponId,
} from '../character.js'

import { createOutlineMesh } from './outlines.js'

// ---------------------------------------------------------------------------
// Loaders — shared instances, one fetch per unique URL.
// ---------------------------------------------------------------------------
const _loader = new GLTFLoader()

interface _NewCharacterData {
  scene: THREE.Group
  clips: Partial<Record<_AnimName, THREE.AnimationClip>>
  headScene?: THREE.Group
}

const _newCharacterCache = new Map<string, _NewCharacterData>()
const _newCharacterInflightMap = new Map<string, Promise<_NewCharacterData>>()

function _getModelNameForClass(classId: string): string {
  const c = classId.toLowerCase()
  if (c.includes('tank')) return 'Male_Ranger'
  if (c.includes('archer') || c.includes('arciere')) return 'Female_Ranger'
  if (c.includes('mage') || c.includes('mago')) return 'Female_Peasant'
  return 'Male_Peasant' // hybrid or default
}

function _fetchNewCharacter(classId = 'hybrid'): Promise<_NewCharacterData> {
  const modelName = _getModelNameForClass(classId)
  const cached = _newCharacterCache.get(modelName)
  if (cached) return Promise.resolve(cached)

  const inflight = _newCharacterInflightMap.get(modelName)
  if (inflight) return inflight

  const newInflight = (async () => {
    const needHead = modelName.includes('Peasant')
    const headModelName = modelName.includes('Male')
      ? 'Male_Ranger_Head_Hood'
      : 'Female_Ranger_Head_Hood'

    const promises: Promise<unknown>[] = [
      new Promise<unknown>((resolve, reject) => {
        _loader.load(`/characters/${modelName}.gltf`, resolve, undefined, reject)
      }),
      new Promise<unknown>((resolve, reject) => {
        _loader.load('/characters/UAL1_Standard.glb', resolve, undefined, reject)
      }),
    ]

    if (needHead) {
      promises.push(
        new Promise<unknown>((resolve, reject) => {
          _loader.load(`/characters/${headModelName}.gltf`, resolve, undefined, reject)
        }),
      )
    }

    const results = await Promise.all(promises)
    const gltfModel = results[0] as { scene: THREE.Group }
    const gltfAnim = results[1] as { animations: THREE.AnimationClip[] }

    const scene = gltfModel.scene
    const animations = gltfAnim.animations

    let headScene: THREE.Group | undefined = undefined
    if (needHead && results[2]) {
      const gltfHead = results[2] as { scene: THREE.Group }
      headScene = gltfHead.scene
    }

    const clips: Partial<Record<_AnimName, THREE.AnimationClip>> = {}

    const nameMap: Record<_AnimName, string> = {
      Idle: 'Idle_Loop',
      Attacking_Idle: 'Idle_Loop',
      Run: 'Sprint_Loop',
      Walk: 'Walk_Loop',
      Dagger_Attack: 'Sword_Attack',
      Dagger_Attack2: 'Sword_Attack',
      Death: 'Death01',
      Punch: 'Punch_Cross',
      RecieveHit: 'Hit_Chest',
      RecieveHit_Attacking: 'Hit_Chest',
      Roll: 'Roll',
      Jump: 'Jump_Start',
      Land: 'Jump_Land',
      Airborne: 'Jump_Loop',
      Parry_Block: 'Sword_Idle',
      Bow_Draw: 'Spell_Simple_Idle_Loop',
      Bow_Release: 'Spell_Simple_Shoot',
      Staff_Cast: 'Spell_Simple_Shoot',
      Channel: 'Spell_Simple_Idle_Loop',
      Respawn: 'Spell_Simple_Enter',
    }

    for (const key in nameMap) {
      const name = key as _AnimName
      const sourceName = nameMap[name]
      const sourceClip = animations.find((a) => a.name === sourceName)
      if (sourceClip) {
        const cloned = sourceClip.clone()
        cloned.name = name
        clips[name] = cloned
      } else {
        console.warn(
          `[character] Animation ${sourceName} not found in UAL1_Standard.glb for ${name}`,
        )
      }
    }

    const data = { scene, clips, headScene }
    _newCharacterCache.set(modelName, data)
    _newCharacterInflightMap.delete(modelName)
    return data
  })().catch((err) => {
    _newCharacterInflightMap.delete(modelName)
    throw err
  })

  _newCharacterInflightMap.set(modelName, newInflight)
  return newInflight
}

type _AnimName =
  | 'Idle'
  | 'Attacking_Idle'
  | 'Run'
  | 'Walk'
  | 'Dagger_Attack'
  | 'Dagger_Attack2'
  | 'Death'
  | 'Punch'
  | 'RecieveHit'
  | 'RecieveHit_Attacking'
  | 'Roll'
  | 'Jump'
  | 'Land'
  | 'Airborne'
  | 'Parry_Block'
  | 'Bow_Draw'
  | 'Bow_Release'
  | 'Staff_Cast'
  | 'Channel'
  | 'Respawn'

const _ANIM_NAMES: _AnimName[] = [
  'Idle',
  'Attacking_Idle',
  'Run',
  'Walk',
  'Dagger_Attack',
  'Dagger_Attack2',
  'Death',
  'Punch',
  'RecieveHit',
  'RecieveHit_Attacking',
  'Roll',
  'Jump',
  'Land',
  'Airborne',
  'Parry_Block',
  'Bow_Draw',
  'Bow_Release',
  'Staff_Cast',
  'Channel',
  'Respawn',
]

interface _MixerStore {
  mixer: THREE.AnimationMixer
  actions: Partial<Record<_AnimName, THREE.AnimationAction>>
  current: _AnimName
}

function _crossfade(store: _MixerStore, next: _AnimName, fadeSec: number): void {
  if (store.current === next) return
  const from = store.actions[store.current]
  const to = store.actions[next]
  if (!to) return
  store.current = next
  to.reset()
  if (
    next === 'Dagger_Attack' ||
    next === 'Dagger_Attack2' ||
    next === 'Death' ||
    next === 'Punch' ||
    next === 'Jump' ||
    next === 'Land' ||
    next === 'Bow_Release' ||
    next === 'Staff_Cast' ||
    next === 'Respawn' ||
    next === 'RecieveHit' ||
    next === 'RecieveHit_Attacking' ||
    next === 'Roll'
  ) {
    to.setLoop(THREE.LoopOnce, 1)
    to.clampWhenFinished = true
  } else {
    to.setLoop(THREE.LoopRepeat, Infinity)
    to.clampWhenFinished = false
  }
  to.play()
  if (from) from.crossFadeTo(to, fadeSec, true)
}

function _firstAvailable(store: _MixerStore, names: _AnimName[]): _AnimName {
  return names.find((name) => !!store.actions[name]) ?? 'Attacking_Idle'
}

function _chooseAnimState(store: _MixerStore, state: CharAnimState): _AnimName {
  const weapon = state.activeWeapon ?? 'sword'

  if (!state.alive) return _firstAvailable(store, ['Death', 'RecieveHit', 'Attacking_Idle'])

  // Respawn plays once right after coming back to life.
  if (state.respawning) return _firstAvailable(store, ['Respawn', 'Attacking_Idle', 'Idle'])

  // Landing takes priority over hitReact: a landing player hit at the same
  // tick should show land (brief), then the next hit-react if still active.
  if (state.landing) return _firstAvailable(store, ['Land', 'Attacking_Idle', 'Idle'])

  if (state.hitReact) {
    return _firstAvailable(store, [
      state.attacking || state.casting ? 'RecieveHit_Attacking' : 'RecieveHit',
      'RecieveHit',
      'Attacking_Idle',
    ])
  }

  // Knockup airborne (server-driven) takes priority over regular jump.
  if (state.airborne) return _firstAvailable(store, ['Airborne', 'Jump', 'Attacking_Idle'])
  // Regular jump take-off (left the ground from self-initiated jump).
  if (state.jumping) return _firstAvailable(store, ['Jump', 'Airborne', 'Attacking_Idle'])
  // Dash / roll — plays once, takes priority over idle/run but not over jump.
  if (state.rolling) return _firstAvailable(store, ['Roll', 'Run', 'Attacking_Idle'])
  if (state.casting && weapon === 'staff') {
    // Channel (looping beam) vs Staff_Cast (one-shot burst) based on ability type.
    if (state.channeling)
      return _firstAvailable(store, ['Channel', 'Staff_Cast', 'Punch', 'Attacking_Idle'])
    return _firstAvailable(store, ['Staff_Cast', 'Channel', 'Punch', 'Attacking_Idle'])
  }

  if (state.bowCharging) return _firstAvailable(store, ['Bow_Draw', 'Attacking_Idle', 'Idle'])

  if (state.attacking) {
    if (weapon === 'bow') return _firstAvailable(store, ['Bow_Release', 'Dagger_Attack', 'Punch'])
    return _firstAvailable(store, [
      state.attackVariant && state.attackVariant % 2 === 1 ? 'Dagger_Attack2' : 'Dagger_Attack',
      'Dagger_Attack',
      'Punch',
      'Attacking_Idle',
    ])
  }

  if (state.parrying) return _firstAvailable(store, ['Parry_Block', 'Attacking_Idle', 'Idle'])

  if (state.moving) {
    // Walk at low speed (<3 m/s), Run otherwise.
    const isWalking = state.speed !== undefined && state.speed < 3.0
    return isWalking
      ? _firstAvailable(store, ['Walk', 'Run', 'Attacking_Idle'])
      : _firstAvailable(store, ['Run', 'Walk', 'Attacking_Idle'])
  }
  return _firstAvailable(store, ['Attacking_Idle', 'Idle', 'Run'])
}

const _CHAR_GLB_FALLBACK_HEIGHT = 2.856

function _measureRenderableBox(root: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3()
  root.updateMatrixWorld(true)
  root.traverse((child) => {
    // Use isMesh flag instead of instanceof to survive cross-module boundaries.
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh || !child.visible) return
    const geo = mesh.geometry
    if (!geo) return
    // Use the raw geometry bounding box (local vertex positions) instead of
    // setFromObject / SkinnedMesh.computeBoundingBox().
    if (geo.boundingBox === null) geo.computeBoundingBox()
    if (!geo.boundingBox) return
    const childBox = geo.boundingBox.clone().applyMatrix4(child.matrixWorld)
    if (!childBox.isEmpty()) box.union(childBox)
  })
  return box
}

function _validBoxHeight(box: THREE.Box3): number {
  const height = box.getSize(new THREE.Vector3()).y
  return Number.isFinite(height) && height > 0.1 ? height : _CHAR_GLB_FALLBACK_HEIGHT
}

function _resolveClip(
  animations: THREE.AnimationClip[],
  name: _AnimName,
): THREE.AnimationClip | undefined {
  return (
    animations.find((a) => a.name === name) ?? animations.find((a) => a.name.endsWith('|' + name))
  )
}

function _makeToonMaterial(
  source: THREE.Material | undefined,
  _teamColor: number,
  toonGradient: THREE.DataTexture,
): THREE.MeshToonMaterial {
  const src = source as THREE.MeshStandardMaterial | THREE.MeshToonMaterial | undefined
  const hasMap = !!(src && 'map' in src && src.map)

  const color = hasMap
    ? (src?.color?.clone() ?? new THREE.Color(0xffffff))
    : new THREE.Color(_teamColor)

  return new THREE.MeshToonMaterial({
    color,
    map: hasMap ? src.map : null,
    gradientMap: toonGradient,
    side: THREE.DoubleSide,
    emissive: hasMap ? new THREE.Color(_teamColor) : new THREE.Color(0x000000),
    emissiveIntensity: hasMap ? 0.08 : 0.0,
    alphaTest: src?.alphaTest ?? 0,
    transparent: src?.transparent ?? false,
    opacity: src?.opacity ?? 1,
  })
}

function _clearWeaponGroup(wg: THREE.Group): void {
  while (wg.children.length > 0) {
    const c = wg.children[0]!
    // Traverse into nested groups (weapon GLBs may be Group → Mesh)
    c.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return
      node.geometry?.dispose()
      const m = node.material
      if (Array.isArray(m)) m.forEach((x) => (x as THREE.Material).dispose())
      else (m as THREE.Material | undefined)?.dispose()
    })
    wg.remove(c)
  }
}

// ---------------------------------------------------------------------------
// Character model loader + AnimationMixer system.
// ---------------------------------------------------------------------------

/** Describes the character's current gameplay state for animation selection. */
export interface CharAnimState {
  moving: boolean
  alive: boolean
  activeWeapon?: string
  attacking?: boolean
  attackVariant?: number
  airborne?: boolean
  bowCharging?: boolean
  casting?: boolean
  parrying?: boolean
  hitReact?: boolean
  /** True for ~1.5 s after spawning/respawning — plays the Respawn clip once. */
  respawning?: boolean
  /** Movement speed in m/s — used to choose Walk vs Run animation. */
  speed?: number
  /** True for ~500 ms after leaving the ground (regular jump take-off). */
  jumping?: boolean
  /** True for ~400 ms after touching the ground — plays the landing clip once. */
  landing?: boolean
  /** True when the active cast is a channel effect — selects the looping Channel clip. */
  channeling?: boolean
  /** True for ~400 ms after a dash ability fires — plays the Roll clip once. */
  rolling?: boolean
}

function _findBone(model: THREE.Object3D, name: string): THREE.Object3D | null {
  const nLower = name.toLowerCase()
  const searchNames = [name, 'mixamorig' + name]
  if (nLower.includes('righthand') || nLower === 'hand_r' || nLower === 'handr') {
    searchNames.push('hand_r', 'RightHand', 'mixamorigRightHand')
  }
  if (nLower.includes('lefthand') || nLower === 'hand_l' || nLower === 'handl') {
    searchNames.push('hand_l', 'LeftHand', 'mixamorigLeftHand')
  }

  for (const sName of searchNames) {
    const found = model.getObjectByName(sName)
    if (found) return found
  }
  return null
}

function _installCharacterModel(
  charGroup: THREE.Group,
  model: THREE.Group,
  clipsByName: Partial<Record<_AnimName, THREE.AnimationClip>>,
  teamColor: number,
  toonGradient: THREE.DataTexture,
  sourceLabel: string,
): void {
  if (charGroup.userData['disposed'] as boolean) return

  const nativeBox = _measureRenderableBox(model)
  const nativeHeight = _validBoxHeight(nativeBox)

  // Scale up visual models by a factor of 1.45 to ensure characters look imposing,
  // athletic, and majestic in-game and on the main menu, without altering
  // the server-side physical capsule bounds (which remain 1.8).
  const targetScale = (CAPSULE_HEIGHT_M / nativeHeight) * 1.45
  model.scale.setScalar(targetScale)
  // Rotate the model by 180 degrees (Math.PI) so that it faces forward along the game's movement axis
  // instead of facing backward and looking at the camera.
  model.rotation.y = Math.PI
  const scaledBox = _measureRenderableBox(model) // also calls updateMatrixWorld(true)
  model.position.y = -CAPSULE_HALF_HEIGHT_M - scaledBox.min.y

  const glbMaterials: THREE.MeshToonMaterial[] = []
  let renderableMeshes = 0
  let skinnedMeshes = 0
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    renderableMeshes += 1
    if (child instanceof THREE.SkinnedMesh) skinnedMeshes += 1
    child.frustumCulled = false
    const source = child.material
    if (Array.isArray(source)) {
      const mats = source.map((mat) => _makeToonMaterial(mat, teamColor, toonGradient))
      child.material = mats
      glbMaterials.push(...mats)
    } else {
      const mat = _makeToonMaterial(source, teamColor, toonGradient)
      child.material = mat
      glbMaterials.push(mat)
    }
    child.castShadow = true
  })

  if (renderableMeshes === 0 || skinnedMeshes === 0 || glbMaterials.length === 0) {
    throw new Error(`${sourceLabel} missing renderable skinned meshes`)
  }

  charGroup.userData['armorMat'] = glbMaterials[0]
  charGroup.userData['glbMaterials'] = glbMaterials
  charGroup.userData['toonGradient'] = toonGradient

  // Find rightHand bone to attach props dynamically
  const rightHand = _findBone(model, 'RightHand')

  const wg = charGroup.userData['weaponGroup'] as THREE.Group | undefined
  const shield = charGroup.userData['parryShield'] as THREE.Group | undefined

  // Ensure matrices are fully updated so that THREE.Object3D.attach() preserves the exact world transforms
  charGroup.updateMatrixWorld(true)
  model.updateMatrixWorld(true)

  // Clean up detached anchor parts from charGroup.
  for (const child of [...charGroup.children]) {
    // Skip weaponGroup, shield, the new model itself, and ground shadow
    if (child === wg || child === shield || child === model || child.name === 'shadow') {
      continue
    }

    // Hide and remove detached anchor meshes completely so they do not double-render or clip.
    child.visible = false
    charGroup.remove(child)
  }

  // Add the new skinned glTF character model to the group
  charGroup.add(model)
  charGroup.userData['charModel'] = model

  // Attach weaponGroup to the RightHand bone.
  // The grip correction offsets compensate for the Mixamo hand bone's coordinate
  // system vs the weapon GLB's natural orientation. Without these, the blade
  // points in unexpected directions during Run/Walk animations because the bone
  // rotates significantly as the arm swings.
  if (rightHand && wg) {
    rightHand.add(wg)
    wg.position.set(0.04, 0.02, 0.0)
    // Rotate the weapon so the blade extends forward along the character's
    // facing direction in idle/combat pose. The character model is itself
    // rotated Math.PI on Y (faces forward), so these corrections are in
    // the hand bone's local space after that rotation.
    wg.rotation.set(-Math.PI / 2, 0, Math.PI / 2)
    wg.scale.set(1, 1, 1)
  }

  // Generate dynamic toon outlines for all active character meshes (both skinned model and attached armor/props)
  const outlineMeshes: { mesh: THREE.Mesh | THREE.SkinnedMesh; outline: THREE.Mesh }[] = []
  charGroup.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    if (child.name.endsWith('_outline')) return

    // Skip parry shield meshes
    let p = child.parent
    let isShield = false
    while (p) {
      if (p === shield) {
        isShield = true
        break
      }
      p = p.parent
    }
    if (isShield) return

    // Skip ground drop shadows
    if (child.name === 'shadow') return

    // Determine custom outline thickness (weapons get slightly thicker outlines)
    const thickness =
      child.name.toLowerCase().includes('weapon') ||
      child.name.toLowerCase().includes('sword') ||
      child.name.toLowerCase().includes('dagger') ||
      child.name.toLowerCase().includes('staff') ||
      child.name.toLowerCase().includes('bow')
        ? 0.016
        : 0.012
    const outline = createOutlineMesh(child, thickness, 0x0a0a0f)
    outlineMeshes.push({ mesh: child, outline })
  })

  // Add the outline shells to their respective parent groups/bones to animate together
  for (const item of outlineMeshes) {
    item.mesh.parent?.add(item.outline)
  }

  const mixer = new THREE.AnimationMixer(model)
  const actions: Partial<Record<_AnimName, THREE.AnimationAction>> = {}
  for (const name of _ANIM_NAMES) {
    const clip = clipsByName[name]
    if (clip) actions[name] = mixer.clipAction(clip)
  }

  const initial = _firstAvailable({ mixer, actions, current: 'Idle' }, [
    'Attacking_Idle',
    'Idle',
    'Run',
  ])
  const initAction = actions[initial]
  if (initAction) {
    initAction.setLoop(THREE.LoopRepeat, Infinity)
    initAction.play()
  }

  const store: _MixerStore = { mixer, actions, current: initial }
  charGroup.userData['mixerStore'] = store
}

/**
 * Starts loading the shared character model and wires up an AnimationMixer on
 * charGroup once it arrives. Safe to call multiple times on different groups.
 */
export function loadCharacterGlb(
  charGroup: THREE.Group,
  teamColor: number,
  toonGradient: THREE.DataTexture,
  classId?: string,
): void {
  const resolvedClass = classId || 'hybrid'
  charGroup.userData['loadedClassId'] = resolvedClass

  _fetchNewCharacter(resolvedClass)
    .then(({ scene, clips, headScene }) => {
      const model = skeletonClone(scene) as THREE.Group

      if (headScene) {
        // Ensure bone world matrices are fully calculated in the bind pose.
        model.updateMatrixWorld(true)

        headScene.traverse((child) => {
          if (child instanceof THREE.SkinnedMesh) {
            const hoodMesh = child.clone()

            const peasantBones: THREE.Bone[] = []
            for (const originalBone of child.skeleton.bones) {
              const matchingBone = _findBone(model, originalBone.name) as THREE.Bone | null
              if (matchingBone) {
                peasantBones.push(matchingBone)
              } else {
                const fallback = (_findBone(model, 'Head') || model) as THREE.Bone
                peasantBones.push(fallback)
              }
            }

            // Use the original ranger head skeleton's bone inverses to transform the
            // vertices (which are in ranger pose space) perfectly to local bone space,
            // preventing the face and hood from collapsing or warping.
            const newSkeleton = new THREE.Skeleton(peasantBones, child.skeleton.boneInverses)

            hoodMesh.bind(newSkeleton, child.bindMatrix)
            model.add(hoodMesh)
          }
        })
      }

      _installCharacterModel(
        charGroup,
        model,
        clips,
        teamColor,
        toonGradient,
        `${resolvedClass} GLTF`,
      )
    })
    .catch((err) => {
      console.error('[character] Failed to load character and animations:', err)
    })
}

/** Advance this character's AnimationMixer by deltaS seconds. */
export function tickCharacterMixer(charGroup: THREE.Group, deltaS: number): void {
  const store = charGroup.userData['mixerStore'] as _MixerStore | undefined
  if (!store) return
  store.mixer.update(Math.min(deltaS, 0.1)) // clamp to avoid large jumps after tab-switch

  // Force Head bone scale to (1,1,1) to prevent shared animations from collapsing the face!
  const model = charGroup.userData['charModel'] || charGroup.userData['model']
  if (model) {
    const headBone = _findBone(model, 'Head')
    if (headBone) {
      headBone.scale.set(1, 1, 1)
    }
  }
}

/** Drive the animation state machine based on current gameplay state. */
export function setCharAnimState(charGroup: THREE.Group, state: CharAnimState): void {
  const store = charGroup.userData['mixerStore'] as _MixerStore | undefined
  if (!store) return
  const target = _chooseAnimState(store, state)
  const fadeSec =
    target === 'Death' || target === 'Respawn'
      ? 0.3
      : target === 'Dagger_Attack' ||
          target === 'Dagger_Attack2' ||
          target === 'Punch' ||
          target === 'RecieveHit' ||
          target === 'RecieveHit_Attacking'
        ? 0.08
        : target === 'Jump' ||
            target === 'Land' ||
            target === 'Roll' ||
            target === 'Bow_Draw' ||
            target === 'Bow_Release' ||
            target === 'Staff_Cast'
          ? 0.1
          : 0.18
  _crossfade(store, target, fadeSec)
}

/**
 * Stop and release the AnimationMixer for charGroup.
 * Call before removing the group from the scene to prevent memory leaks.
 */
export function disposeCharacterMixer(charGroup: THREE.Group): void {
  const store = charGroup.userData['mixerStore'] as _MixerStore | undefined
  if (store) {
    store.mixer.stopAllAction()
    const model = charGroup.userData['charModel'] as THREE.Object3D | undefined
    if (model) store.mixer.uncacheRoot(model)
  }
  delete charGroup.userData['mixerStore']
  delete charGroup.userData['charModel']
  delete charGroup.userData['glbMaterials']
}

// ---------------------------------------------------------------------------
// Group origin = capsule centre (transform.y = CAPSULE_HALF_HEIGHT_M above ground).
// userData['armorMat'] → primary team-colour material (used for emissive flashes).
// userData['weaponGroup'] → THREE.Group for weapon prop swapping.
export function makeCharacter(
  teamColor: number,
  optsOrToonGradient?: CharacterOpts | THREE.DataTexture,
): THREE.Group {
  const opts =
    optsOrToonGradient && !(optsOrToonGradient instanceof THREE.DataTexture)
      ? optsOrToonGradient
      : {}
  const g = makeCharacterAnchor(teamColor, opts)

  // Simple static round parry shield attached at hips origin.
  // Set visible on self parrying and remote player parrying.
  const shield = makeParryShieldVisual(0.68)
  shield.position.set(0, 0, -0.1)
  g.add(shield)
  g.userData['parryShield'] = shield

  return g
}

export function makeParryShieldVisual(radius = 0.62): THREE.Group {
  const shield = new THREE.Group()
  shield.visible = false
  shield.renderOrder = 18

  const coreMat = new THREE.MeshBasicMaterial({
    color: 0x68ddff,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const edgeMat = new THREE.MeshBasicMaterial({
    color: 0xffd260,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const glyphMat = new THREE.MeshBasicMaterial({
    color: 0x00d0ff,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    side: THREE.DoubleSide,
  })

  const core = new THREE.Mesh(new THREE.CircleGeometry(radius, 8), coreMat)
  const edge = new THREE.Mesh(new THREE.RingGeometry(radius * 0.84, radius, 8), edgeMat)
  const glyph = new THREE.Mesh(new THREE.RingGeometry(radius * 0.38, radius * 0.46, 6), glyphMat)
  core.userData['parryShieldCore'] = true
  edge.userData['parryShieldEdge'] = true
  glyph.userData['parryShieldGlyph'] = true
  shield.add(core, edge, glyph)
  return shield
}

export function setParryShieldState(
  charGroup: THREE.Group,
  active: boolean,
  hold: boolean,
  now: number,
): void {
  const shield = charGroup.userData['parryShield'] as THREE.Group | undefined
  if (!shield) return
  shield.visible = active
  if (!active) return

  const pulse = hold ? 0.5 + 0.5 * Math.sin(now * 0.008) : 1
  shield.scale.setScalar(hold ? 1 + pulse * 0.04 : 1.04)
  shield.rotation.z = hold ? Math.sin(now * 0.0025) * 0.07 : 0
  shield.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    const mat = child.material as THREE.MeshBasicMaterial
    if (child.userData['parryShieldCore']) mat.opacity = hold ? 0.16 + pulse * 0.09 : 0.26
    if (child.userData['parryShieldEdge']) mat.opacity = hold ? 0.68 + pulse * 0.22 : 0.96
    if (child.userData['parryShieldGlyph']) mat.opacity = hold ? 0.58 + pulse * 0.2 : 0.9
  })
}

const _weaponCache = new Map<string, THREE.Group>()
const _weaponInflightMap = new Map<string, Promise<THREE.Group>>()

export function fetchWeaponGlb(weaponId: 'sword' | 'bow' | 'staff'): Promise<THREE.Group> {
  const cached = _weaponCache.get(weaponId)
  if (cached) return Promise.resolve(cached)

  const inflight = _weaponInflightMap.get(weaponId)
  if (inflight) return inflight

  const newInflight = new Promise<THREE.Group>((resolve, reject) => {
    _loader.load(
      `/weapons/${weaponId}.glb`,
      (gltf) => {
        const group = gltf.scene
        _weaponCache.set(weaponId, group)
        _weaponInflightMap.delete(weaponId)
        resolve(group)
      },
      undefined,
      (err) => {
        _weaponInflightMap.delete(weaponId)
        reject(err)
      },
    )
  })

  _weaponInflightMap.set(weaponId, newInflight)
  return newInflight
}

export function applyWeaponProp(
  charGroup: THREE.Group,
  weapon: CharacterWeaponId | string,
  toonGradientOrElementHex?: THREE.DataTexture | number,
): void {
  let elementHex = 0xffe080
  if (typeof toonGradientOrElementHex === 'number') {
    elementHex = toonGradientOrElementHex
  } else {
    const element = charGroup.userData['element'] as ElementId | undefined
    if (element) {
      elementHex = ELEMENT_COLORS[element] ?? 0xffe080
    }
  }

  let weaponId: 'sword' | 'bow' | 'staff' = 'sword'
  const wStr = String(weapon).toLowerCase()
  if (wStr.includes('bow')) weaponId = 'bow'
  else if (wStr.includes('staff')) weaponId = 'staff'
  else weaponId = 'sword'

  const wg = charGroup.userData['weaponGroup'] as THREE.Group | undefined
  if (!wg) return

  // Synchronously track the active weapon prop target to guard against async race conditions
  charGroup.userData['activeWeaponProp'] = weaponId

  // Clear existing weapon meshes from wg
  _clearWeaponGroup(wg)

  // Fetch the GLB weapon model
  fetchWeaponGlb(weaponId)
    .then((scene) => {
      // Guard against race conditions: if weapon changed while loading, skip
      if (charGroup.userData['activeWeaponProp'] !== weaponId) {
        return
      }

      // Clear again just in case another model was appended during transition
      _clearWeaponGroup(wg)

      const model = scene.clone() as THREE.Group

      // Ensure proper materials and glow effects are applied
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true
          child.frustumCulled = false

          const makeWeaponMat = (m: THREE.Material) => {
            const src = m as THREE.MeshStandardMaterial | THREE.MeshToonMaterial | undefined
            // Check if it is a standard/toon material with a map texture.
            const hasMap = !!(src && 'map' in src && src.map && !(src.map instanceof Function))
            const color = src?.color?.clone() ?? new THREE.Color(0xffffff)

            // Tint obvious emissive/detail meshes with the element color.
            const nameLower = child.name.toLowerCase()
            const isGlowing =
              nameLower.includes('glow') ||
              nameLower.includes('glyph') ||
              nameLower.includes('orb') ||
              nameLower.includes('element')

            const gradMap = (charGroup.userData['toonGradient'] as THREE.DataTexture) || null

            return new THREE.MeshToonMaterial({
              color: isGlowing ? new THREE.Color(elementHex) : color,
              map: hasMap ? src.map : null,
              gradientMap: gradMap,
              side: THREE.DoubleSide,
              emissive: isGlowing ? new THREE.Color(elementHex) : new THREE.Color(0x000000),
              emissiveIntensity: isGlowing ? 0.8 : 0.0,
            })
          }

          const source = child.material
          if (Array.isArray(source)) {
            child.material = source.map(makeWeaponMat)
          } else {
            child.material = makeWeaponMat(source)
          }
        }
      })

      wg.add(model)

      // Generate dynamic outlines for the newly attached weapon meshes
      const weaponOutlines: { mesh: THREE.Mesh; outline: THREE.Mesh }[] = []
      wg.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return
        if (child.name.endsWith('_outline')) return

        // Create a slightly thicker black outline for the weapon meshes (thickness: 0.016)
        const outline = createOutlineMesh(child, 0.016, 0x0a0a0f)
        weaponOutlines.push({ mesh: child, outline })
      })
      for (const item of weaponOutlines) {
        item.mesh.parent?.add(item.outline)
      }
    })
    .catch((err) => {
      console.error(`[character] Failed to load weapon model ${weaponId}:`, err)
    })
}

export function makeCastRing(): THREE.Mesh {
  const geo = new THREE.RingGeometry(0.28, 0.38, 24)
  geo.rotateX(-Math.PI / 2)
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffd060,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  })
  const m = new THREE.Mesh(geo, mat)
  m.visible = false
  return m
}
