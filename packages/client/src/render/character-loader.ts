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
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js'

import { type AnimName, ANIM_NAMES, ANIM_NAME_MAP } from './character-animation.js'

const _loader = new GLTFLoader()

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
  const candidates: string[] = [name, canonical, withPfx]

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
  return null
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
