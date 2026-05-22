import { CAPSULE_HALF_HEIGHT_M, CAPSULE_HEIGHT_M } from '@ragequit/shared'
import * as THREE from 'three'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js'

import {
  ELEMENT_COLORS,
  applyWeaponProp as newApplyWeaponProp,
  makeCharacter as proceduralMakeCharacter,
  type CharacterOpts,
  type ElementId,
  type WeaponId as CharacterWeaponId,
} from '../character.js'

// ---------------------------------------------------------------------------
// Loaders — shared instances, one fetch per unique URL.
// ---------------------------------------------------------------------------
const _loader = new GLTFLoader()
const _fbxLoader = new FBXLoader()

// ---------------------------------------------------------------------------
// Character GLB — loaded once, cloned per character instance.
// ---------------------------------------------------------------------------

interface _CharGlbData {
  scene: THREE.Group
  animations: THREE.AnimationClip[]
}

let _charGlbData: _CharGlbData | null = null
let _charGlbInflight: Promise<_CharGlbData> | null = null

function _fetchCharGlb(): Promise<_CharGlbData> {
  if (_charGlbData) return Promise.resolve(_charGlbData)
  if (_charGlbInflight) return _charGlbInflight
  _charGlbInflight = new Promise((resolve, reject) => {
    _loader.load(
      '/characters/player.glb',
      (gltf) => {
        _charGlbData = { scene: gltf.scene, animations: gltf.animations }
        _charGlbInflight = null
        resolve(_charGlbData)
      },
      undefined,
      reject,
    )
  })
  return _charGlbInflight
}

function _loadFbx(url: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    _fbxLoader.load(url, (group) => resolve(group), undefined, reject)
  })
}

async function _fetchLegacyCharacter(): Promise<_LegacyCharacterData> {
  if (_legacyCharacterData) return _legacyCharacterData
  if (_legacyCharacterInflight) return _legacyCharacterInflight

  _legacyCharacterInflight = (async () => {
    const scene = await _loadFbx(_LEGACY_CHARACTER_FBX)
    const baseBoneNames = _collectBoneNames(scene)
    const baseBoneQuaternions = _collectBoneQuaternions(scene)
    const clips: Partial<Record<_AnimName, THREE.AnimationClip>> = {}
    const uniqueUrls = [
      ...new Set(
        _ANIM_NAMES.flatMap((name) => {
          const url = _LEGACY_ANIM_FBX[name]
          return url ? [url] : []
        }),
      ),
    ]
    const loaded = new Map(
      await Promise.all(
        uniqueUrls.map(async (url) => {
          const animRoot = await _loadFbx(url)
          const clip = animRoot.animations[0]
          if (!clip) throw new Error(`Legacy animation missing clip: ${url}`)
          return [url, { clip, boneQuaternions: _collectBoneQuaternions(animRoot) }] as const
        }),
      ),
    )

    for (const name of _ANIM_NAMES) {
      const url = _LEGACY_ANIM_FBX[name]
      if (!url) continue
      const source = loaded.get(url)
      if (!source) continue
      clips[name] = _retargetLegacyClip(
        source.clip,
        name,
        baseBoneNames,
        source.boneQuaternions,
        baseBoneQuaternions,
      )
    }

    _legacyCharacterData = { scene, clips }
    _legacyCharacterInflight = null
    return _legacyCharacterData
  })().catch((err) => {
    _legacyCharacterInflight = null
    throw err
  })

  return _legacyCharacterInflight
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

const _LEGACY_CHARACTER_FBX = '/characters/legacy/player_base.fbx'
const _LEGACY_ANIM_FBX: Partial<Record<_AnimName, string>> = {
  Idle: '/characters/legacy/animations/idle_combat.fbx',
  Attacking_Idle: '/characters/legacy/animations/idle_combat.fbx',
  Run: '/characters/legacy/animations/run_forward.fbx',
  Walk: '/characters/legacy/animations/walk_forward.fbx',
  Jump: '/characters/legacy/animations/jump.fbx',
  Airborne: '/characters/legacy/animations/airborne.fbx',
  Land: '/characters/legacy/animations/land.fbx',
  Dagger_Attack: '/characters/legacy/animations/melee_attack_01.fbx',
  Dagger_Attack2: '/characters/legacy/animations/melee_attack_02.fbx',
  Parry_Block: '/characters/legacy/animations/parry_block.fbx',
  Bow_Draw: '/characters/legacy/animations/bow_draw.fbx',
  Bow_Release: '/characters/legacy/animations/bow_release.fbx',
  Punch: '/characters/legacy/animations/staff_cast.fbx',
  Staff_Cast: '/characters/legacy/animations/staff_cast.fbx',
  Channel: '/characters/legacy/animations/channel.fbx',
  RecieveHit: '/characters/legacy/animations/hit_react.fbx',
  RecieveHit_Attacking: '/characters/legacy/animations/hit_react.fbx',
  Roll: '/characters/legacy/animations/dash_roll.fbx',
  Death: '/characters/legacy/animations/death.fbx',
  Respawn: '/characters/legacy/animations/respawn.fbx',
}

interface _LegacyCharacterData {
  scene: THREE.Group
  clips: Partial<Record<_AnimName, THREE.AnimationClip>>
}

let _legacyCharacterData: _LegacyCharacterData | null = null
let _legacyCharacterInflight: Promise<_LegacyCharacterData> | null = null

function _trackTargetName(trackName: string): string {
  const dot = trackName.indexOf('.')
  return dot >= 0 ? trackName.slice(0, dot) : trackName
}

function _trackPropertyName(trackName: string): string {
  const dot = trackName.indexOf('.')
  return dot >= 0 ? trackName.slice(dot) : ''
}

function _collectBoneNames(root: THREE.Object3D): Set<string> {
  const names = new Set<string>()
  root.traverse((node) => {
    if (node instanceof THREE.Bone) names.add(node.name)
  })
  return names
}

function _collectBoneQuaternions(root: THREE.Object3D): Map<string, THREE.Quaternion> {
  const quaternions = new Map<string, THREE.Quaternion>()
  root.traverse((node) => {
    if (node instanceof THREE.Bone) quaternions.set(node.name, node.quaternion.clone())
  })
  return quaternions
}

function _resolveLegacyTrackTarget(target: string, boneNames: Set<string>): string | null {
  if (boneNames.has(target)) return target

  const withoutMixamo = target.replace(/^mixamorig/, '')
  if (boneNames.has(withoutMixamo)) return withoutMixamo

  return null
}

function _retargetLegacyClip(
  source: THREE.AnimationClip,
  name: _AnimName,
  boneNames: Set<string>,
  sourceBoneQuaternions: Map<string, THREE.Quaternion>,
  targetBoneQuaternions: Map<string, THREE.Quaternion>,
): THREE.AnimationClip {
  const tracks: THREE.KeyframeTrack[] = []
  const seen = new Set<string>()

  for (const track of source.tracks) {
    const sourceTarget = _trackTargetName(track.name)
    const resolvedTarget = _resolveLegacyTrackTarget(sourceTarget, boneNames)
    if (!resolvedTarget) continue
    // Gameplay owns character translation. The legacy animation FBXs come from
    // a Mixamo-scale rig whose Hips.position values do not match the base skin.
    if (_trackPropertyName(track.name) === '.position') continue

    const remappedName = `${resolvedTarget}${_trackPropertyName(track.name)}`
    if (seen.has(remappedName)) continue
    seen.add(remappedName)

    const remapped = track.clone()
    remapped.name = remappedName
    if (_trackPropertyName(track.name) === '.quaternion') {
      const sourceRest = sourceBoneQuaternions.get(sourceTarget)
      const targetRest = targetBoneQuaternions.get(resolvedTarget)
      if (sourceRest && targetRest) {
        const restOffset = targetRest.clone().multiply(sourceRest.clone().invert())
        const values = remapped.values
        const quat = new THREE.Quaternion()
        for (let offset = 0; offset < values.length; offset += 4) {
          quat.fromArray(values, offset).premultiply(restOffset).toArray(values, offset)
        }
      }
    }
    tracks.push(remapped)
  }

  if (tracks.length === 0) {
    throw new Error(`Legacy animation has no compatible tracks after retarget: ${name}`)
  }

  return new THREE.AnimationClip(name, source.duration, tracks)
}

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
    // Three.js r180 SkinnedMesh.computeBoundingBox() calls applyBoneTransform
    // per vertex, returning world-space coords — if bone matrixWorlds differ
    // between the two clone calls the measured "native height" comes out ~100×
    // too large for the second character, producing a wildly wrong target scale.
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
  teamColor: number,
  toonGradient: THREE.DataTexture,
  meshName = '',
): THREE.MeshToonMaterial {
  const src = source as THREE.MeshStandardMaterial | THREE.MeshToonMaterial | undefined
  const lowerName = meshName.toLowerCase()
  const color =
    lowerName.includes('head') || lowerName.includes('face')
      ? new THREE.Color(0xb98252)
      : lowerName.includes('body') || lowerName.includes('character')
        ? new THREE.Color(teamColor).lerp(new THREE.Color(0xffffff), 0.28)
        : (src?.color?.clone() ?? new THREE.Color(0xffffff))
  return new THREE.MeshToonMaterial({
    color,
    map: src && 'map' in src ? (src.map ?? null) : null,
    gradientMap: toonGradient,
    emissive: new THREE.Color(teamColor),
    side: THREE.DoubleSide,
    emissiveIntensity: lowerName.includes('body') || lowerName.includes('character') ? 0.38 : 0.12,
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
//
// loadCharacterGlb(charGroup, teamColor, toonGradient)
//   Call once per character after makeCharacter().  Async: procedural body
//   stays visible until the legacy FBX arrives, then procedural parts are hidden
//   and the animated model (with toon shading) takes over.
//
// tickCharacterMixer(charGroup, deltaS)
//   Call every render frame.  Updates the AnimationMixer by deltaS seconds.
//
// setCharAnimState(charGroup, state)
//   Call whenever movement / attack / alive state changes.  Crossfades to the
//   appropriate clip: Death → Dagger_Attack → Run → Attacking_Idle.
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

  const targetScale = CAPSULE_HEIGHT_M / nativeHeight
  model.scale.setScalar(targetScale)
  const scaledBox = _measureRenderableBox(model) // also calls updateMatrixWorld(true)
  model.position.y = -CAPSULE_HALF_HEIGHT_M - scaledBox.min.y

  // Do NOT call skeleton.calculateInverses() here.
  //
  // The FBXLoader computes boneInverses at load-time in the FBX native scale
  // (cm units, model scale = 1.0) and stores the mesh's bindMatrix from the FBX
  // BindPose node at the same cm scale.  Because boneInverses and bindMatrix
  // are consistent with each other, the skinning math is correct:
  //   transformed = bindMatrixInverse × Σ(w · bone.matWorld · boneInverse) · bindMatrix · vertex
  // Three.js SkinnedMesh in AttachedBindMode recomputes bindMatrixInverse every
  // frame as inverse(mesh.matrixWorld), which already accounts for the 0.01×
  // scaling we applied above — so the math cancels cleanly without us touching
  // the boneInverses.
  //
  // Re-running calculateInverses() after we set model.scale = 0.01 would
  // produce boneInverses in a different (scaled) space from bindMatrix (still
  // at cm scale), breaking the rest-pose invariant and causing visible mesh
  // deformation (or invisibility when the mismatch is extreme).
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
      const mats = source.map((mat) => _makeToonMaterial(mat, teamColor, toonGradient, child.name))
      child.material = mats
      glbMaterials.push(...mats)
    } else {
      const mat = _makeToonMaterial(source, teamColor, toonGradient, child.name)
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

  // Hide all procedural body parts — the loaded model replaces them entirely.
  // Both FBX and GLB paths fully replace the procedural geometry.
  const wg = charGroup.userData['weaponGroup'] as THREE.Group | undefined
  for (const child of [...charGroup.children]) {
    if (child !== wg) child.visible = false
  }
  charGroup.add(model)
  charGroup.userData['charModel'] = model

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
 * charGroup once it arrives.  The procedural body is hidden and replaced by
 * the animated model. Safe to call multiple times on different groups — the
 * source model is loaded only once and cloned per character.
 */
export function loadCharacterGlb(
  charGroup: THREE.Group,
  teamColor: number,
  toonGradient: THREE.DataTexture,
): void {
  _fetchLegacyCharacter()
    .then(({ scene, clips }) => {
      const model = skeletonClone(scene) as THREE.Group
      _installCharacterModel(charGroup, model, clips, teamColor, toonGradient, 'legacy FBX')
    })
    .catch((legacyErr) => {
      console.warn('[character] Legacy FBX failed, trying GLB fallback', legacyErr)
      _fetchCharGlb()
        .then(({ scene, animations }) => {
          const model = skeletonClone(scene) as THREE.Group
          const clips: Partial<Record<_AnimName, THREE.AnimationClip>> = {}
          const missing: _AnimName[] = []
          for (const name of _ANIM_NAMES) {
            const clip = _resolveClip(animations, name)
            if (clip) clips[name] = clip
            else missing.push(name)
          }
          if (missing.length > 0) {
            console.warn('[character] GLB animations missing:', missing)
          }
          _installCharacterModel(charGroup, model, clips, teamColor, toonGradient, 'player GLB')
        })
        .catch((glbErr) => {
          console.error('[character] GLB fallback failed as well:', glbErr)
        })
    })
}

/** Advance this character's AnimationMixer by deltaS seconds. */
export function tickCharacterMixer(charGroup: THREE.Group, deltaS: number): void {
  const store = charGroup.userData['mixerStore'] as _MixerStore | undefined
  if (!store) return
  store.mixer.update(Math.min(deltaS, 0.1)) // clamp to avoid large jumps after tab-switch
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
  const g = proceduralMakeCharacter(teamColor, opts)

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
  const runeMat = new THREE.MeshBasicMaterial({
    color: 0x00d0ff,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    side: THREE.DoubleSide,
  })

  const core = new THREE.Mesh(new THREE.CircleGeometry(radius, 8), coreMat)
  const edge = new THREE.Mesh(new THREE.RingGeometry(radius * 0.84, radius, 8), edgeMat)
  const rune = new THREE.Mesh(new THREE.RingGeometry(radius * 0.38, radius * 0.46, 6), runeMat)
  core.userData['parryShieldCore'] = true
  edge.userData['parryShieldEdge'] = true
  rune.userData['parryShieldRune'] = true
  shield.add(core, edge, rune)
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
    if (child.userData['parryShieldRune']) mat.opacity = hold ? 0.58 + pulse * 0.2 : 0.9
  })
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

  newApplyWeaponProp(charGroup, weaponId, elementHex)
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
