// ---------------------------------------------------------------------------
// Character asset loader — 3-layer system.
//
// Each class uses three GLTF layers stacked on a shared 65-bone skeleton:
//   Layer 1: FullBody base  (Superhero_Male/Female) — head/face only
//   Layer 2: Outfit         (Male/Female Ranger or Peasant) — full body
//   Layer 3: Hair           (class-specific hairstyle)
//
// All layers share identical bone names so outfit/hair SkinnedMeshes can be
// re-bound to the base body's skeleton without deformation.
//
// Head visibility rule:
//   If the outfit has a mesh with "head" or "hood" in its name → hide all
//   base body meshes (outfit covers the face — no z-fighting).
//   Otherwise → keep all base body meshes visible (face is part of the look).
// ---------------------------------------------------------------------------
import { TARGET_CLASS_DEFS, type ClassId } from '@ragequit/shared'
import * as THREE from 'three'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js'

import { type AnimName, ANIM_NAMES, ANIM_NAME_MAP } from './character-animation.js'

const _loader = new GLTFLoader()

// ⚠️ Cross-family animation transfer is a DEAD END (tried exhaustively): three.js
// retargetClip, world-delta and local-delta rest-pose compensation, and direct
// Mixamo→CC local application ALL garble (different rest poses / bone frames).
// Animations transfer ONLY within the same rig family (CC→CC works — see
// `ccAnims` below). Don't reintroduce a runtime retargeter here.

const _fbxLoader = new FBXLoader()
const _fbxCache = new Map<string, Promise<THREE.AnimationClip | null>>()

function _loadFbxClip(url: string): Promise<THREE.AnimationClip | null> {
  const cached = _fbxCache.get(url)
  if (cached) return cached
  const p = new Promise<THREE.AnimationClip | null>((resolve) => {
    _fbxLoader.load(
      url,
      (g) => resolve(g.animations[0] ?? null),
      undefined,
      (e) => {
        console.warn('[cc-anims] FBX load failed:', url, e)
        resolve(null)
      },
    )
  })
  _fbxCache.set(url, p)
  return p
}

// Mixamo → Character-Creator bone-name dictionary (canonical limb names; sides are
// expanded L/R). Lets the Knight_Met Mixamo clips (run/walk/death/attack/jump…) fill
// the states the free CC samples don't cover, applied as DIRECT local rotations.
const _MIXAMO_TO_CC_CORE: Record<string, string> = {
  mixamorigHips: 'CC_Base_Hip',
  mixamorigSpine: 'CC_Base_Waist',
  mixamorigSpine1: 'CC_Base_Spine01',
  mixamorigSpine2: 'CC_Base_Spine02',
  mixamorigNeck: 'CC_Base_NeckTwist01',
  mixamorigHead: 'CC_Base_Head',
}
for (const [mx, cc] of [
  ['Shoulder', 'Clavicle'],
  ['Arm', 'Upperarm'],
  ['ForeArm', 'Forearm'],
  ['Hand', 'Hand'],
  ['UpLeg', 'Thigh'],
  ['Leg', 'Calf'],
  ['Foot', 'Foot'],
] as const) {
  _MIXAMO_TO_CC_CORE[`mixamorigLeft${mx}`] = `CC_Base_L_${cc}`
  _MIXAMO_TO_CC_CORE[`mixamorigRight${mx}`] = `CC_Base_R_${cc}`
}

/**
 * Remap an external (same-rig-family) clip's track names onto the model's actual
 * bone names by stripping numeric suffixes (GLTF exports dedupe bone names:
 * `CC_Base_Hip` in the FBX ↔ `CC_Base_Hip_03` in the GLB). Keeps rotation tracks
 * only — positions are in source units/space and the game drives root motion.
 * Mixamo track names are first translated through the Mixamo→CC dictionary.
 */
function _remapClipToModel(clip: THREE.AnimationClip, model: THREE.Object3D): THREE.AnimationClip {
  const byStripped = new Map<string, string>()
  model.traverse((o) => {
    if ((o as THREE.Bone).isBone) {
      byStripped.set(o.name.replace(/_\d+$/, ''), o.name)
      byStripped.set(o.name, o.name)
    }
  })
  const tracks: THREE.KeyframeTrack[] = []
  for (const t of clip.tracks) {
    const dot = t.name.lastIndexOf('.')
    if (dot < 0) continue
    const prop = t.name.slice(dot + 1)
    if (prop !== 'quaternion') continue
    let node = t.name.slice(0, dot)
    // Skip the armature ROOT track: the FBX clip carries the source's Z-up root
    // orientation which would pitch the whole GLB-converted (Y-up) model 90°.
    if (/boneroot|^root$|_rootjoint/i.test(node)) continue
    // Mixamo source clips: translate to the CC bone vocabulary first.
    const viaMixamo = _MIXAMO_TO_CC_CORE[node.replace(/^mixamorig:?/, 'mixamorig')]
    if (viaMixamo) node = viaMixamo
    else if (/^mixamorig/i.test(node)) continue // fingers/toes/eyes: no CC target
    const stripped = node.replace(/_\d+$/, '')
    // Also try dropping the CC_Base_ prefix: the Tripo medieval-knight rig uses the
    // same skeleton naming as Character Creator minus the prefix (Hip, L_Thigh, …).
    const mapped =
      byStripped.get(node) ??
      byStripped.get(stripped) ??
      byStripped.get(stripped.replace(/^CC_Base_/, ''))
    if (!mapped) continue
    const nt = t.clone()
    nt.name = `${mapped}.${prop}`
    tracks.push(nt)
  }
  return new THREE.AnimationClip(clip.name, clip.duration, tracks)
}

// ---------------------------------------------------------------------------
// Layer → asset path mapping
// ---------------------------------------------------------------------------

interface _ClassLayers {
  base: string // Superhero_Male_FullBody | Superhero_Female_FullBody
  outfit: string // Male_Ranger | Female_Ranger | Male_Peasant | Female_Peasant
  hair: string // Hair_Buzzed | Hair_Buns | Hair_Long | Hair_SimpleParted
  accessories: string[] // Accessories like head hoods, pauldrons, beards
}

function _getClassLayers(classId: string): _ClassLayers {
  const c = classId.toLowerCase() as ClassId
  const def = TARGET_CLASS_DEFS[c] || TARGET_CLASS_DEFS['hybrid']
  return {
    base: def.visuals.base,
    outfit: def.visuals.outfit,
    hair: def.visuals.hair,
    accessories: [...def.visuals.accessories],
  }
}

// ---------------------------------------------------------------------------
// Cached character data
// ---------------------------------------------------------------------------

export interface CharacterData {
  /** FullBody base scene — cloned via SkeletonUtils for each instance. */
  baseScene: THREE.Group
  /** Outfit scene — used read-only to attach layer meshes. */
  outfitScene: THREE.Group
  /** Hair scene — optional, used read-only. */
  hairScene?: THREE.Group
  /** Accessories scenes — optional, used read-only. */
  accessoriesScenes: THREE.Group[]
  /** Animation clips keyed by internal AnimName, sourced from UAL1_Standard.glb. */
  clips: Partial<Record<AnimName, THREE.AnimationClip>>
}

const _cache = new Map<string, CharacterData>()
const _inflight = new Map<string, Promise<CharacterData>>()

function _loadGltf(
  url: string,
): Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }> {
  return new Promise((resolve, reject) =>
    _loader.load(url, resolve as (v: unknown) => void, undefined, reject),
  )
}

/** Load all three layers plus animation clips. Results are cached per class. */
export function fetchCharacterData(classId = 'hybrid'): Promise<CharacterData> {
  const layers = _getClassLayers(classId)
  const cacheKey = `${layers.base}|${layers.outfit}|${layers.hair}|${layers.accessories.join(',')}`

  const cached = _cache.get(cacheKey)
  if (cached) return Promise.resolve(cached)

  const inflight = _inflight.get(cacheKey)
  if (inflight) return inflight

  const p = (async (): Promise<CharacterData> => {
    const accessoriesPromises = layers.accessories.map((acc) =>
      _loadGltf(`/characters/${acc}.gltf`).catch((err) => {
        console.warn(`[character-loader] Failed to load accessory "${acc}":`, err)
        return null
      }),
    )

    const [baseGltf, outfitGltf, animGltf, hairGltf, ...accGltfs] = await Promise.all([
      _loadGltf(`/characters/${layers.base}.gltf`),
      _loadGltf(`/characters/${layers.outfit}.gltf`),
      _loadGltf('/characters/UAL1_Standard.glb'),
      _loadGltf(`/characters/${layers.hair}.gltf`).catch(() => null),
      ...accessoriesPromises,
    ])

    // Build clip map from UAL1_Standard.glb animations.
    const clips: Partial<Record<AnimName, THREE.AnimationClip>> = {}
    for (const name of ANIM_NAMES) {
      const sourceName = ANIM_NAME_MAP[name]
      const src = animGltf.animations.find((a) => a.name === sourceName)
      if (src) {
        const cloned = src.clone()
        cloned.name = name
        clips[name] = cloned
      } else {
        console.warn(`[character-loader] clip "${sourceName}" not found in UAL1_Standard.glb`)
      }
    }

    const accessoriesScenes: THREE.Group[] = []
    for (const g of accGltfs) {
      if (g && g.scene) {
        accessoriesScenes.push(g.scene)
      }
    }

    const data: CharacterData = {
      baseScene: baseGltf.scene,
      outfitScene: outfitGltf.scene,
      hairScene: hairGltf?.scene,
      accessoriesScenes,
      clips,
    }
    _cache.set(cacheKey, data)
    _inflight.delete(cacheKey)
    return data
  })().catch((err) => {
    _inflight.delete(cacheKey)
    throw err
  })

  _inflight.set(cacheKey, p)
  return p
}

// ---------------------------------------------------------------------------
// Single-GLB Mixamo characters (e.g. Tank = Knight_Met)
// A rigged character whose own skeleton + embedded clips are used directly, with
// the layered base/outfit/hair system bypassed entirely.
// ---------------------------------------------------------------------------

type _LoadedGltf = { scene: THREE.Group; animations: THREE.AnimationClip[] }
const _glbCache = new Map<string, _LoadedGltf>()
const _glbInflight = new Map<string, Promise<_LoadedGltf>>()

function _fetchMixamoGlb(file: string): Promise<_LoadedGltf> {
  const cached = _glbCache.get(file)
  if (cached) return Promise.resolve(cached)
  const infl = _glbInflight.get(file)
  if (infl) return infl
  const p = _loadGltf(`/characters/${file}.glb`)
    .then((g) => {
      _glbCache.set(file, g)
      _glbInflight.delete(file)
      return g
    })
    .catch((e) => {
      _glbInflight.delete(file)
      throw e
    })
  _glbInflight.set(file, p)
  return p
}

/**
 * Map a Mixamo character's embedded clip names to our internal AnimName set.
 * A PARTIAL map is fine — the animation state machine falls back via
 * `_firstAvailable`. (Knight_Met ships: idle, run, walk, strafe, attack 1, block,
 * block idle, cast 1, death, jump, powerup, whirlwind.)
 */
function _mapMixamoClips(
  animations: THREE.AnimationClip[],
): Partial<Record<AnimName, THREE.AnimationClip>> {
  const out: Partial<Record<AnimName, THREE.AnimationClip>> = {}
  const exact = (n: string) => animations.find((a) => a.name.toLowerCase() === n)
  const find = (re: RegExp) => animations.find((a) => re.test(a.name.toLowerCase()))
  const set = (name: AnimName, clip: THREE.AnimationClip | undefined): void => {
    if (!clip) return
    const c = clip.clone()
    c.name = name
    out[name] = c
  }
  const idle = exact('idle') ?? find(/idle/)
  set('Idle', idle)
  set('Attacking_Idle', idle)
  set('Run', find(/run/))
  set('Walk', find(/walk/) ?? find(/strafe/))
  const attack = find(/attack/) ?? find(/whirlwind/)
  set('Dagger_Attack', attack)
  set('Dagger_Attack2', find(/whirlwind/) ?? attack)
  set('Death', find(/death/))
  set('Jump', find(/jump/))
  set('Parry_Block', exact('block') ?? find(/block/))
  const cast = find(/cast/)
  set('Staff_Cast', cast)
  set('Channel', cast)
  set('Respawn', find(/powerup|respawn|enter/))

  // Fallback for rigs with generic clip names (e.g. Blender "NlaTrack"): if name
  // matching found no idle, spread the available clips across the core states by
  // index so the character still animates instead of standing in a frozen T-pose.
  if (!out['Idle'] && animations.length) {
    const byIdx = (name: AnimName, i: number): void => {
      if (animations[i]) set(name, animations[i])
    }
    byIdx('Idle', 0)
    byIdx('Attacking_Idle', 0)
    byIdx('Run', 1)
    byIdx('Walk', 1)
    byIdx('Dagger_Attack', 2)
    byIdx('Dagger_Attack2', 2)
    byIdx('Parry_Block', 1)
    byIdx('Staff_Cast', 2)
    byIdx('Channel', 2)
    byIdx('Death', 3)
  }
  return out
}

// ---------------------------------------------------------------------------
// Bone lookup — robust aliases for our 65-bone skeleton naming conventions
// ---------------------------------------------------------------------------

/**
 * Find a bone/object in `model` by name, trying multiple naming conventions:
 *  - exact name
 *  - mixamorig prefix / strip
 *  - common lowercase + underscore variants (root, pelvis, spine_01 …)
 *  - hand alias: hand_r / hand_l
 */
export function findBone(model: THREE.Object3D, name: string): THREE.Object3D | null {
  const nLower = name.toLowerCase()
  const canonical = name.startsWith('mixamorig') ? name.slice(9) : name
  const withPfx = name.startsWith('mixamorig') ? name : 'mixamorig' + name
  // Mixamo GLB exports name bones with a colon ("mixamorig:RightHand") — match those too.
  const candidates: string[] = [name, canonical, withPfx, 'mixamorig:' + canonical]

  // Hand aliases
  if (nLower.includes('righthand') || nLower === 'hand_r' || nLower === 'handr') {
    candidates.push('hand_r', 'RightHand', 'mixamorigRightHand', 'Hand_R')
  }
  if (nLower.includes('lefthand') || nLower === 'hand_l' || nLower === 'handl') {
    candidates.push('hand_l', 'LeftHand', 'mixamorigLeftHand', 'Hand_L')
  }
  // Hips / root / pelvis aliases
  if (nLower === 'hips' || nLower === 'pelvis' || nLower === 'root') {
    candidates.push('Hips', 'hips', 'mixamorigHips', 'Root', 'root', 'Pelvis', 'pelvis')
  }
  // Spine aliases
  if (nLower === 'spine' || nLower === 'spine1' || nLower === 'spine2') {
    candidates.push('Spine', 'spine', 'mixamorigSpine', 'spine_01', 'spine_02', 'Spine1')
  }
  // Upper arm aliases
  if (nLower.includes('uparm') || nLower.includes('upperarm')) {
    const side = nLower.includes('right') ? 'r' : 'l'
    const full = side === 'r' ? 'RightArm' : 'LeftArm'
    candidates.push(full, `mixamorig${full}`, `upperarm_${side}`)
  }

  for (const s of [...new Set(candidates)]) {
    const found = model.getObjectByName(s)
    if (found) return found
  }
  // Fuzzy fallback for realistic rigs (CC "CC_Base_L_Hand_31", Tripo "L_Hand"):
  // exact lookups miss because of prefixes and GLB-export numeric suffixes.
  // Compare canonical side+part keys instead (lhand, rupperarm, hips, …).
  const want = _canonBone(name)
  if (!want) return null
  let hit: THREE.Object3D | null = null
  model.traverse((o) => {
    if (hit || !(o as THREE.Bone).isBone) return
    if (_canonBone(o.name) === want) hit = o
  })
  return hit
}

/** side+part canonical key for humanoid bones across naming conventions. */
function _canonBone(raw: string): string | null {
  const n = raw
    .toLowerCase()
    .replace(/^mixamorig:?/, '')
    .replace(/^cc_base_/, '')
    .replace(/_\d+$/, '')
  const side = /(^|_)l(_|$)|left/.test(n) ? 'l' : /(^|_)r(_|$)|right/.test(n) ? 'r' : ''
  // Order matters: 'forearm' must be tested before the generic 'arm'.
  const part = n.includes('hand')
    ? 'hand'
    : n.includes('forearm') || n.includes('lowerarm')
      ? 'lowerarm'
      : n.includes('upperarm') || /(^|_)arm($|_)/.test(n)
        ? 'upperarm'
        : n.includes('shoulder') || n.includes('clavicle')
          ? 'clavicle'
          : n.includes('hip') || n.includes('pelvis')
            ? 'hips'
            : null
  if (!part) return null
  if (part === 'hips') return 'hips'
  return side ? side + part : null
}

// ---------------------------------------------------------------------------
// Layer attachment — rebind a layerScene's SkinnedMeshes onto the base skeleton
// ---------------------------------------------------------------------------

/**
 * Clone every SkinnedMesh in `layerScene` and bind it to the bones already
 * present in `model`. The original GLTF boneInverses are preserved to avoid
 * deformation artefacts. `tag` is stored in userData for downstream visibility
 * and renderOrder logic.
 */
function _attachLayer(model: THREE.Group, layerScene: THREE.Group, tag: 'outfit' | 'hair'): void {
  // Fallback bone: used when a bone in the layer skeleton cannot be matched.
  const fallback =
    findBone(model, 'Hips') ?? findBone(model, 'root') ?? findBone(model, 'Spine') ?? null

  layerScene.traverse((child) => {
    if (!(child instanceof THREE.SkinnedMesh)) return
    const layerMesh = child.clone()
    layerMesh.userData['layerTag'] = tag

    let missingBones = 0
    const newBones: THREE.Bone[] = child.skeleton.bones.map((b) => {
      const found = findBone(model, b.name) as THREE.Bone | null
      if (!found) missingBones++
      return (found ?? fallback ?? model) as THREE.Bone
    })

    if (missingBones > 0) {
      console.warn(
        `[character-loader] ${missingBones} bone(s) unmatched for layer "${tag}" ` +
          `mesh "${child.name}" — using fallback`,
      )
    }

    // Keep original GLTF boneInverses — do NOT call calculateInverses().
    // Both files share the same 65-bone rig so the inverses are correct as-is;
    // recalculating from current bone world-matrices risks floating-point drift.
    const newSkeleton = new THREE.Skeleton(newBones, child.skeleton.boneInverses)
    layerMesh.bind(newSkeleton, child.bindMatrix)
    model.add(layerMesh)
  })
}

// ---------------------------------------------------------------------------
// Public: build a ready-to-install model group for a given class
// ---------------------------------------------------------------------------

/**
 * Clone the base body, attach outfit and hair layers, apply head-visibility
 * rules, and return the composed THREE.Group ready for _installCharacterModel.
 * Also returns the animation clips.
 */
export async function buildCharacterModel(classId: string): Promise<{
  model: THREE.Group
  clips: Partial<Record<AnimName, THREE.AnimationClip>>
}> {
  // --- Single-GLB Mixamo path (realistic characters, e.g. Tank = Knight_Met) ---
  const cls = classId.toLowerCase() as ClassId
  const def = TARGET_CLASS_DEFS[cls] || TARGET_CLASS_DEFS['hybrid']
  // `TARGET_CLASS_DEFS` is `as const`, so `visuals` is a literal union where only the
  // tank carries `mixamoGlb`; read it through the interface shape.
  const mixamoGlb = (def.visuals as { mixamoGlb?: string }).mixamoGlb
  if (mixamoGlb) {
    const gltf = await _fetchMixamoGlb(mixamoGlb)
    const model = skeletonClone(gltf.scene) as THREE.Group
    model.updateMatrixWorld(true)
    model.userData['singleGlb'] = true
    model.userData['singleGlbFile'] = mixamoGlb
    // Hide built-in weapon/shield meshes — the game's weapon system drives
    // sword/bow/staff switching, so a baked-in sword would double up.
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && /sword|shield|weapon|blade/i.test(child.name)) {
        child.visible = false
      }
    })
    // External same-rig animation FBX files (e.g. CC MageCollection onto the CC-rig
    // shadowkin): direct application, track names remapped by suffix-stripping.
    const ccAnims = (def.visuals as { ccAnims?: Readonly<Record<string, string>> }).ccAnims
    if (ccAnims) {
      const clips: Partial<Record<AnimName, THREE.AnimationClip>> = {}
      await Promise.all(
        Object.entries(ccAnims).map(async ([state, url]) => {
          const raw = await _loadFbxClip(url)
          if (!raw) return
          const remapped = _remapClipToModel(raw, model)
          if (remapped.tracks.length === 0) {
            console.warn('[cc-anims] no tracks matched for', url)
            return
          }
          remapped.name = state
          clips[state as AnimName] = remapped
        }),
      )
      // NOTE: cross-family fill (Mixamo clips → CC bones, via name dictionary) was
      // tried and produces tumbling poses — local rotations only transfer within the
      // SAME rig family. Missing states (run/walk/death) fall back to Idle until
      // CC-family locomotion clips are added to /characters/anims/.
      if (Object.keys(clips).length > 0) return { model, clips }
    }

    return { model, clips: _mapMixamoClips(gltf.animations) }
  }

  const data = await fetchCharacterData(classId)
  const { baseScene, outfitScene, hairScene, accessoriesScenes, clips } = data

  // Clone the base body (gives each instance its own skeleton).
  const model = skeletonClone(baseScene) as THREE.Group
  model.updateMatrixWorld(true)

  // Attach outfit and optional hair layers.
  _attachLayer(model, outfitScene, 'outfit')
  if (hairScene) _attachLayer(model, hairScene, 'hair')

  // Attach accessory layers.
  for (const accScene of accessoriesScenes) {
    _attachLayer(model, accScene, 'outfit')
  }

  // --- Head visibility rule ---
  // The base FullBody carries the character's FACE (head skin + eyes + eyebrows).
  // Only a CLOSED helmet/hat fully encloses the head — in that case hide the base
  // so nothing pokes through. An open hood/cowl (the Ranger classes) leaves the
  // face exposed, so the base MUST stay visible or the hood is empty ("no faces").
  // Peasant classes have no head piece at all → base also stays visible.
  // (The outfit's own body meshes sit just outside the base body with a negative
  // polygonOffset, so the clothed silhouette wins over the base skin underneath.)
  let outfitFullyEnclosesHead = false
  model.traverse((child) => {
    if (!(child instanceof THREE.SkinnedMesh)) return
    if (child.userData['layerTag'] !== 'outfit') return
    const n = child.name.toLowerCase()
    if (n.includes('helmet') || n.includes('hat')) outfitFullyEnclosesHead = true
  })

  if (outfitFullyEnclosesHead) {
    model.traverse((child) => {
      if (!(child instanceof THREE.SkinnedMesh)) return
      if (child.userData['layerTag']) return // outfit/hair layers stay visible
      child.visible = false
    })
  }

  return { model, clips }
}
