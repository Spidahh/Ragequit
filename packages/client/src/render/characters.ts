import { CAPSULE_HALF_HEIGHT_M, CAPSULE_HEIGHT_M, CAPSULE_RADIUS_M } from '@ragequit/shared'
import * as THREE from 'three'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js'

// ---------------------------------------------------------------------------
// Weapon GLB loader — shared loader + cache so each model is fetched once.
// applyWeaponProp shows procedural geometry immediately, then upgrades to the
// GLB when it arrives (cel-shading applied on load for visual consistency).
// ---------------------------------------------------------------------------
const _loader = new GLTFLoader()
const _fbxLoader = new FBXLoader()
const _glbCache = new Map<string, THREE.Group>()
const _glbInflight = new Map<string, Promise<THREE.Group>>()

const _WEAPON_GLB: Record<string, string> = {
  sword: '/weapons/sword.glb',
  bow: '/weapons/bow.glb',
  staff: '/weapons/staff.glb',
}
const USE_WEAPON_GLB = false

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
          return [url, clip] as const
        }),
      ),
    )

    for (const name of _ANIM_NAMES) {
      const url = _LEGACY_ANIM_FBX[name]
      if (!url) continue
      const clip = loaded.get(url)
      if (!clip) continue
      clips[name] = _retargetLegacyClip(clip, name, baseBoneNames)
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
): THREE.AnimationClip {
  const tracks: THREE.KeyframeTrack[] = []
  const seen = new Set<string>()

  for (const track of source.tracks) {
    const resolvedTarget = _resolveLegacyTrackTarget(_trackTargetName(track.name), boneNames)
    if (!resolvedTarget) continue

    const remappedName = `${resolvedTarget}${_trackPropertyName(track.name)}`
    if (seen.has(remappedName)) continue
    seen.add(remappedName)

    const remapped = track.clone()
    remapped.name = remappedName
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

  if (state.hitReact) {
    return _firstAvailable(store, [
      state.attacking || state.casting ? 'RecieveHit_Attacking' : 'RecieveHit',
      'RecieveHit',
      'Attacking_Idle',
    ])
  }

  if (state.airborne) return _firstAvailable(store, ['Airborne', 'Jump', 'RecieveHit', 'Roll'])
  if (state.casting && weapon === 'staff')
    return _firstAvailable(store, ['Staff_Cast', 'Channel', 'Punch', 'Attacking_Idle'])

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

  if (state.moving) return _firstAvailable(store, ['Run', 'Walk', 'Attacking_Idle'])
  return _firstAvailable(store, ['Attacking_Idle', 'Idle', 'Run'])
}

const _CHAR_GLB_FALLBACK_HEIGHT = 2.856

function _measureRenderableBox(root: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3()
  root.updateMatrixWorld(true)
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.visible) return
    const childBox = new THREE.Box3().setFromObject(child)
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
    animations.find((a) => a.name === name) ??
    animations.find((a) => a.name.endsWith('|' + name))
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
    emissiveIntensity:
      lowerName.includes('body') || lowerName.includes('character') ? 0.38 : 0.12,
  })
}

function _fetchWeaponGlb(weapon: string): Promise<THREE.Group> {
  const hit = _glbCache.get(weapon)
  if (hit) return Promise.resolve(hit)
  const inflight = _glbInflight.get(weapon)
  if (inflight) return inflight
  const p = new Promise<THREE.Group>((resolve, reject) => {
    _loader.load(
      _WEAPON_GLB[weapon]!,
      (gltf) => {
        _glbCache.set(weapon, gltf.scene)
        _glbInflight.delete(weapon)
        resolve(gltf.scene)
      },
      undefined,
      reject,
    )
  })
  _glbInflight.set(weapon, p)
  return p
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

function _applyGlbToWeaponGroup(
  wg: THREE.Group,
  base: THREE.Group,
  toonGradient: THREE.DataTexture,
): void {
  _clearWeaponGroup(wg)
  const model = base.clone()
  // Normalise: longest bounding-box axis → 0.85 m
  const bbox = new THREE.Box3().setFromObject(model)
  const size = bbox.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)
  if (maxDim > 0) model.scale.setScalar(0.85 / maxDim)
  // Centre model at origin so weapon group pivot controls placement
  const bbox2 = new THREE.Box3().setFromObject(model)
  model.position.sub(bbox2.getCenter(new THREE.Vector3()))
  // Cel-shading pass
  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const orig = child.material as THREE.MeshStandardMaterial
      child.material = new THREE.MeshToonMaterial({
        color: orig.color ?? new THREE.Color(0xffffff),
        map: orig.map ?? null,
        gradientMap: toonGradient,
      })
      child.castShadow = true
    }
  })
  wg.add(model)
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
  console.log(`[character] ${sourceLabel}: nativeHeight=${nativeHeight.toFixed(3)} box.min.y=${nativeBox.min.y.toFixed(3)}`)

  const targetScale = CAPSULE_HEIGHT_M / nativeHeight
  model.scale.setScalar(targetScale)
  const scaledBox = _measureRenderableBox(model)   // also calls updateMatrixWorld(true)
  model.position.y = -CAPSULE_HALF_HEIGHT_M - scaledBox.min.y

  // After scaling the model, the bone matrixWorld values have changed but the
  // skeleton's boneInverses were computed at load-time (identity) scale.
  // Without this fix the vertex shader double-applies the scale factor and the
  // character renders at sub-millimetre size — effectively invisible.
  // We only need to recompute boneInverses; the mesh's own bindMatrix (identity)
  // is already correct for local-space skinning.
  model.updateMatrixWorld(true)
  model.traverse((child) => {
    if (child instanceof THREE.SkinnedMesh) {
      child.skeleton.calculateInverses()
    }
  })
  console.log(`[character] ${sourceLabel}: scale=${targetScale.toFixed(6)} pos.y=${model.position.y.toFixed(4)}`)

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
  console.log('[character] loadCharacterGlb called, fetching legacy FBX...')
  _fetchLegacyCharacter()
    .then(({ scene, clips }) => {
      console.log('[character] Legacy FBX loaded OK, cloning skeleton...')
      const model = skeletonClone(scene) as THREE.Group
      _installCharacterModel(charGroup, model, clips, teamColor, toonGradient, 'legacy FBX')
      console.log('[character] Legacy FBX installed OK')
    })
    .catch((legacyErr) => {
      console.warn('[character] Legacy FBX failed, trying GLB fallback', legacyErr)
      _fetchCharGlb()
        .then(({ scene, animations }) => {
          console.log('[character] GLB loaded OK, cloning...')
          const model = skeletonClone(scene) as THREE.Group
          const clips: Partial<Record<_AnimName, THREE.AnimationClip>> = {}
          for (const name of _ANIM_NAMES) {
            const clip = _resolveClip(animations, name)
            if (clip) clips[name] = clip
          }
          _installCharacterModel(charGroup, model, clips, teamColor, toonGradient, 'GLB')
          console.log('[character] GLB installed OK')
        })
        .catch((glbErr) => {
          console.warn('[character] GLB also failed, keeping procedural fallback', glbErr)
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
    target === 'Death'
      ? 0.3
      : target === 'Dagger_Attack' ||
          target === 'Dagger_Attack2' ||
          target === 'Punch' ||
          target === 'RecieveHit' ||
          target === 'RecieveHit_Attacking'
        ? 0.08
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
export function makeCharacter(teamColor: number, toonGradient: THREE.DataTexture): THREE.Group {
  const g = new THREE.Group()

  const armorMat = new THREE.MeshToonMaterial({
    color: teamColor,
    gradientMap: toonGradient,
    emissive: teamColor,
    emissiveIntensity: 0.1,
  })
  const darkMat = new THREE.MeshToonMaterial({ color: 0x1a1e2e, gradientMap: toonGradient })
  const visorMat = new THREE.MeshBasicMaterial({
    color: 0x70e8ff,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide,
  })
  const crestMat = new THREE.MeshToonMaterial({ color: 0xd8c060, gradientMap: toonGradient })
  const detailMat = new THREE.MeshBasicMaterial({
    color: 0x2a9de0,
    transparent: true,
    opacity: 0.8,
  })

  g.userData['armorMat'] = armorMat
  g.userData['darkMat'] = darkMat

  const addPart = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    px: number,
    py: number,
    pz: number,
    rx = 0,
    ry = 0,
    rz = 0,
  ): THREE.Mesh => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(px, py, pz)
    if (rx || ry || rz) m.rotation.set(rx, ry, rz)
    m.castShadow = true
    g.add(m)
    return m
  }

  // Head — slightly larger for heroic look.
  addPart(new THREE.SphereGeometry(0.2, 14, 10), armorMat, 0, 0.72, 0)
  // Visor eye slits (angled inward for a fierce look).
  addPart(new THREE.CircleGeometry(0.07, 10), visorMat, -0.075, 0.74, -0.195, 0, 0.12, 0)
  addPart(new THREE.CircleGeometry(0.07, 10), visorMat, 0.075, 0.74, -0.195, 0, -0.12, 0)
  // Helmet crest — a gold fin running front-to-back along the top.
  addPart(new THREE.BoxGeometry(0.04, 0.12, 0.28), crestMat, 0, 0.895, 0)
  addPart(new THREE.CylinderGeometry(0.025, 0.025, 0.28, 6), crestMat, 0, 0.895, 0, 0, 0, 0)
  // Neck connector
  addPart(new THREE.CylinderGeometry(0.068, 0.068, 0.12, 8), darkMat, 0, 0.54, 0)
  // Torso (slightly taller).
  addPart(new THREE.BoxGeometry(0.52, 0.6, 0.27), armorMat, 0, 0.17, 0)
  // Chest accent stripe — gives detail without texture.
  addPart(new THREE.BoxGeometry(0.1, 0.4, 0.28), detailMat, 0, 0.24, 0)
  // Shoulder pauldrons (larger for heroic silhouette).
  addPart(new THREE.BoxGeometry(0.16, 0.1, 0.22), armorMat, -0.36, 0.47, 0)
  addPart(new THREE.BoxGeometry(0.16, 0.1, 0.22), armorMat, 0.36, 0.47, 0)
  // Upper arms
  addPart(new THREE.CylinderGeometry(0.075, 0.068, 0.3, 8), darkMat, -0.33, 0.22, 0, 0, 0, 0.24)
  addPart(new THREE.CylinderGeometry(0.075, 0.068, 0.3, 8), darkMat, 0.33, 0.22, 0, 0, 0, -0.24)
  // Lower arms
  addPart(
    new THREE.CylinderGeometry(0.064, 0.058, 0.26, 8),
    darkMat,
    -0.35,
    -0.07,
    0.03,
    0.22,
    0,
    0.1,
  )
  addPart(
    new THREE.CylinderGeometry(0.064, 0.058, 0.26, 8),
    darkMat,
    0.35,
    -0.07,
    0.03,
    0.22,
    0,
    -0.1,
  )
  // Belt
  addPart(new THREE.BoxGeometry(0.48, 0.09, 0.24), armorMat, 0, -0.12, 0)
  // Upper legs
  addPart(new THREE.CylinderGeometry(0.095, 0.084, 0.36, 8), darkMat, -0.13, -0.39, 0)
  addPart(new THREE.CylinderGeometry(0.095, 0.084, 0.36, 8), darkMat, 0.13, -0.39, 0)
  // Lower legs
  addPart(new THREE.CylinderGeometry(0.082, 0.07, 0.31, 8), darkMat, -0.12, -0.72, 0.02, 0.07, 0, 0)
  addPart(new THREE.CylinderGeometry(0.082, 0.07, 0.31, 8), darkMat, 0.12, -0.72, 0.02, 0.07, 0, 0)
  // Boots
  addPart(new THREE.BoxGeometry(0.18, 0.11, 0.32), darkMat, -0.12, -0.9, 0.04)
  addPart(new THREE.BoxGeometry(0.18, 0.11, 0.32), darkMat, 0.12, -0.9, 0.04)

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(CAPSULE_RADIUS_M * 1.15, 24),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = -CAPSULE_HEIGHT_M / 2 + 0.015
  g.add(shadow)

  const weaponGroup = new THREE.Group()
  weaponGroup.position.set(0.38, -0.22, -0.08)
  weaponGroup.rotation.set(0.25, 0, -0.18)
  g.userData['weaponGroup'] = weaponGroup
  g.add(weaponGroup)

  return g
}

export function applyWeaponProp(
  charGroup: THREE.Group,
  weapon: string,
  toonGradient: THREE.DataTexture,
): void {
  const wg = charGroup.userData['weaponGroup'] as THREE.Group | undefined
  if (!wg) return

  // Tag so the async GLB callback can detect stale replacements
  wg.userData['weapon'] = weapon

  _clearWeaponGroup(wg)

  const addProp = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    px = 0,
    py = 0,
    pz = 0,
    rx = 0,
    ry = 0,
    rz = 0,
  ) => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(px, py, pz)
    m.rotation.set(rx, ry, rz)
    m.castShadow = true
    wg.add(m)
  }
  if (weapon === 'sword') {
    const bladeMat = new THREE.MeshToonMaterial({ color: 0xc8daf0, gradientMap: toonGradient })
    const edgeMat = new THREE.MeshBasicMaterial({
      color: 0xe8f4ff,
      transparent: true,
      opacity: 0.85,
    })
    const guardMat = new THREE.MeshToonMaterial({ color: 0x9a8c38, gradientMap: toonGradient })
    const handleMat = new THREE.MeshToonMaterial({ color: 0x4a2c10, gradientMap: toonGradient })
    addProp(new THREE.BoxGeometry(0.042, 0.74, 0.06), bladeMat, 0, 0.48, 0)
    addProp(new THREE.BoxGeometry(0.01, 0.74, 0.014), edgeMat, 0, 0.48, 0.034)
    addProp(new THREE.BoxGeometry(0.24, 0.046, 0.06), guardMat, 0, 0.1, 0)
    addProp(new THREE.CylinderGeometry(0.028, 0.024, 0.22, 8), handleMat, 0, -0.06, 0)
    addProp(new THREE.SphereGeometry(0.038, 8, 6), guardMat, 0, -0.18, 0)
  } else if (weapon === 'bow') {
    const woodMat = new THREE.MeshToonMaterial({ color: 0x7a5428, gradientMap: toonGradient })
    const stringMat = new THREE.MeshBasicMaterial({ color: 0xc8c090 })
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.024, 8, 22, Math.PI * 1.48), woodMat)
    arc.rotation.set(-Math.PI * 0.25, 0, 0)
    arc.castShadow = true
    wg.add(arc)
    addProp(new THREE.CylinderGeometry(0.005, 0.005, 0.68, 4), stringMat, 0, 0, 0)
  } else if (weapon === 'staff') {
    const woodMat = new THREE.MeshToonMaterial({ color: 0x2e2048, gradientMap: toonGradient })
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0x90d8ff,
      emissive: 0x4090ff,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.1,
    })
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x70b8ff,
      transparent: true,
      opacity: 0.85,
    })
    addProp(new THREE.CylinderGeometry(0.028, 0.022, 1.2, 8), woodMat, 0, 0.6, 0)
    addProp(new THREE.SphereGeometry(0.078, 12, 8), orbMat, 0, 1.28, 0)
    const orbRing = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 6, 20), ringMat)
    orbRing.position.set(0, 1.28, 0)
    orbRing.rotation.x = Math.PI / 3
    orbRing.castShadow = false
    wg.add(orbRing)
  }

  // Async GLB upgrade — replaces procedural once the model arrives.
  // Guard against stale callbacks when weapon changes before load completes.
  if (USE_WEAPON_GLB && _WEAPON_GLB[weapon]) {
    _fetchWeaponGlb(weapon)
      .then((base) => {
        if ((wg.userData['weapon'] as string) !== weapon) return
        _applyGlbToWeaponGroup(wg, base, toonGradient)
      })
      .catch((err) => {
        console.warn(`[weapon] GLB load failed for "${weapon}", keeping procedural`, err)
      })
  }
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
