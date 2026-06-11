// ---------------------------------------------------------------------------
// characters.ts — Public API orchestrator.
//
// This module is the only surface imported by main.ts and remote-players.ts.
// Internal implementation is split across:
//   character-loader.ts    — 3-layer GLTF loading and composition
//   character-animation.ts — animation state machine
//   character-weapons.ts   — weapon prop loading and grip
// ---------------------------------------------------------------------------
import { CAPSULE_HALF_HEIGHT_M, CHARACTER_RENDER_HEIGHT_M } from '@ragequit/shared'
import * as THREE from 'three'

import { makeCharacter as makeCharacterAnchor, type CharacterOpts } from '../character.js'

import { type MixerStore, initMixerStore } from './character-animation.js'
import { buildCharacterModel, findBone } from './character-loader.js'
import { getWeaponGrip, applyShieldProp, updateShieldAttachment } from './character-weapons.js'
import { createOutlineMesh } from './outlines.js'

// Re-export everything consumers need from the sub-modules.
export type { CharAnimState } from './character-animation.js'
export {
  tickCharacterMixer,
  setCharAnimState,
  triggerWeaponRecoil,
  disposeCharacterMixer,
} from './character-animation.js'
export { fetchWeaponGlb, applyWeaponProp, makeCastRing } from './character-weapons.js'

// ---------------------------------------------------------------------------
// Internal utilities — rendering/scaling/materials
// ---------------------------------------------------------------------------

const _CHAR_GLB_FALLBACK_HEIGHT = 2.856

function _measureRenderableBox(root: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3()
  root.updateMatrixWorld(true)
  root.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh || !child.visible) return
    const geo = mesh.geometry
    if (!geo) return
    if (geo.boundingBox === null) geo.computeBoundingBox()
    if (!geo.boundingBox) return
    const cb = geo.boundingBox.clone().applyMatrix4(child.matrixWorld)
    if (!cb.isEmpty()) box.union(cb)
  })
  return box
}

function _validBoxHeight(box: THREE.Box3): number {
  const h = box.getSize(new THREE.Vector3()).y
  return Number.isFinite(h) && h > 0.1 ? h : _CHAR_GLB_FALLBACK_HEIGHT
}

function _makeToonMaterial(
  source: THREE.Material | undefined,
  teamColor: number,
  toonGradient: THREE.DataTexture,
): THREE.MeshToonMaterial {
  const src = source as THREE.MeshStandardMaterial | THREE.MeshToonMaterial | undefined
  const hasMap = !!(src && 'map' in src && src.map)
  const color = hasMap
    ? (src?.color?.clone() ?? new THREE.Color(0xffffff))
    : new THREE.Color(teamColor)
  return new THREE.MeshToonMaterial({
    color,
    map: hasMap ? (src as THREE.MeshStandardMaterial).map : null,
    gradientMap: toonGradient,
    side: THREE.DoubleSide,
    emissive: hasMap ? new THREE.Color(teamColor) : new THREE.Color(0x000000),
    emissiveIntensity: hasMap ? 0.08 : 0.0,
    alphaTest: src?.alphaTest ?? 0,
    transparent: src?.transparent ?? false,
    opacity: src?.opacity ?? 1,
  })
}

// ---------------------------------------------------------------------------
// Model installation — called once the async load resolves
// ---------------------------------------------------------------------------

function _installCharacterModel(
  charGroup: THREE.Group,
  model: THREE.Group,
  clipsByName: Partial<Record<string, THREE.AnimationClip>>,
  teamColor: number,
  toonGradient: THREE.DataTexture,
  sourceLabel: string,
): void {
  if (charGroup.userData['disposed'] as boolean) return

  // --- Stop the previous AnimationMixer before replacing the model ---
  // Prevents memory leaks and stale animation state across class changes.
  const oldStore = charGroup.userData['mixerStore'] as MixerStore | undefined
  if (oldStore) {
    oldStore.mixer.stopAllAction()
    const oldModel = charGroup.userData['charModel'] as THREE.Object3D | undefined
    if (oldModel) oldStore.mixer.uncacheRoot(oldModel)
    delete charGroup.userData['mixerStore']
  }

  // --- Scale and position ---
  // Scale the model so its measured height equals CHARACTER_RENDER_HEIGHT_M — the
  // ONE shared render-height the camera/nameplates also derive from. (Previously a
  // lone × 1.45 fudge made bodies 2.61 m tall while the camera still framed a 1.8 m
  // world, so enemies loomed and the player felt like a dwarf.)
  const nativeBox = _measureRenderableBox(model)
  const nativeHeight = _validBoxHeight(nativeBox)
  const targetScale = CHARACTER_RENDER_HEIGHT_M / nativeHeight
  model.scale.setScalar(targetScale)
  model.rotation.y = Math.PI // face forward (game convention)
  const scaledBox = _measureRenderableBox(model)
  model.position.y = -CAPSULE_HALF_HEIGHT_M - scaledBox.min.y

  // --- Apply toon materials to ALL meshes (visible and hidden alike) ---
  const glbMaterials: THREE.MeshToonMaterial[] = []
  let renderableMeshes = 0
  let skinnedMeshes = 0
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    renderableMeshes++
    if (child instanceof THREE.SkinnedMesh) skinnedMeshes++
    child.frustumCulled = false
    child.castShadow = true
    const source = child.material
    if (Array.isArray(source)) {
      const mats = source.map((m) => _makeToonMaterial(m, teamColor, toonGradient))
      child.material = mats
      glbMaterials.push(...mats)
    } else {
      const mat = _makeToonMaterial(source, teamColor, toonGradient)
      child.material = mat
      glbMaterials.push(mat)
    }
  })

  if (renderableMeshes === 0 || skinnedMeshes === 0 || glbMaterials.length === 0) {
    throw new Error(`${sourceLabel}: missing renderable skinned meshes`)
  }

  // --- polygonOffset on outfit/hair layers to prevent z-fighting ---
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.userData['layerTag']) return
    child.renderOrder = 1
    const applyOffset = (mat: THREE.Material) => {
      mat.polygonOffset = true
      mat.polygonOffsetFactor = -2
      mat.polygonOffsetUnits = -2
    }
    if (Array.isArray(child.material)) (child.material as THREE.Material[]).forEach(applyOffset)
    else if (child.material instanceof THREE.Material) applyOffset(child.material)
  })

  charGroup.userData['armorMat'] = glbMaterials[0]
  charGroup.userData['glbMaterials'] = glbMaterials
  charGroup.userData['toonGradient'] = toonGradient

  const rightHand = findBone(model, 'RightHand')
  const wg = charGroup.userData['weaponGroup'] as THREE.Group | undefined
  const sg = charGroup.userData['shieldGroup'] as THREE.Group | undefined
  const shield = charGroup.userData['parryShield'] as THREE.Group | undefined

  // Ensure transforms are up-to-date before adding.
  charGroup.updateMatrixWorld(true)
  model.updateMatrixWorld(true)

  // --- Remove old children (procedural silhouette, old model) ---
  for (const child of [...charGroup.children]) {
    if (
      child === wg ||
      child === sg ||
      child === shield ||
      child === model ||
      child.name === 'shadow'
    )
      continue
    child.visible = false
    charGroup.remove(child)
    // Dispose the replaced model's per-instance resources (toon materials +
    // cloned outline geometry/materials). Source geometry is SHARED with the
    // character cache, so it is intentionally NOT disposed here.
    child.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return
      if (node.name.endsWith('_outline')) node.geometry.dispose()
      const m = node.material
      if (Array.isArray(m)) m.forEach((x) => (x as THREE.Material).dispose())
      else (m as THREE.Material | undefined)?.dispose()
    })
  }

  charGroup.add(model)
  charGroup.userData['charModel'] = model

  // --- Re-attach weaponGroup to new hand bone using per-weapon grip config ---
  if (rightHand && wg) {
    const activeId =
      (charGroup.userData['activeWeaponProp'] as 'sword' | 'bow' | 'staff') ?? 'sword'
    const classId = (charGroup.userData['loadedClassId'] as string) || 'hybrid'
    const grip = getWeaponGrip(activeId, classId)
    rightHand.add(wg)
    wg.position.set(...grip.position)
    wg.rotation.set(...grip.rotation)
    wg.scale.setScalar(grip.scale)
  }

  // --- Toon outlines (skip hidden base meshes to avoid black fragments) ---
  // Outline ONLY the new model's meshes. The weaponGroup already carries its own
  // outlines from applyWeaponProp, and the shield outlines itself — traversing
  // the whole charGroup re-outlined the weapon on every (re)install (double
  // outlines + leaked clones).
  const outlinePairs: { mesh: THREE.Mesh; outline: THREE.Mesh }[] = []
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    if (!child.visible) return // skip hidden base body meshes
    if (child.name.endsWith('_outline')) return

    // Skip parry shield children
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
    if (child.name === 'shadow') return

    const isWeaponMesh =
      child.name.toLowerCase().includes('weapon') ||
      child.name.toLowerCase().includes('sword') ||
      child.name.toLowerCase().includes('dagger') ||
      child.name.toLowerCase().includes('staff') ||
      child.name.toLowerCase().includes('bow')
    const outline = createOutlineMesh(child, isWeaponMesh ? 0.016 : 0.012, 0x0a0a0f)
    outlinePairs.push({ mesh: child, outline })
  })
  for (const { mesh, outline } of outlinePairs) mesh.parent?.add(outline)

  // Load physical shield!
  applyShieldProp(charGroup, toonGradient)

  // --- AnimationMixer ---
  const store = initMixerStore(
    model,
    clipsByName as Partial<
      Record<import('./character-animation.js').AnimName, THREE.AnimationClip>
    >,
  )
  charGroup.userData['mixerStore'] = store
}

// ---------------------------------------------------------------------------
// Public: load character GLB for a given charGroup
// ---------------------------------------------------------------------------

/**
 * Begin loading the 3-layer character model for `classId` and wire up an
 * AnimationMixer once the assets arrive.  Safe to call multiple times — a
 * race-condition guard discards stale results if the class changes mid-flight.
 */
export function loadCharacterGlb(
  charGroup: THREE.Group,
  teamColor: number,
  toonGradient: THREE.DataTexture,
  classId?: string,
): void {
  const resolvedClass = classId || 'hybrid'
  // Set immediately so the guard below can detect stale results.
  charGroup.userData['loadedClassId'] = resolvedClass

  buildCharacterModel(resolvedClass)
    .then(({ model, clips }) => {
      // Race-condition guard: if class changed while loading, discard.
      if (charGroup.userData['loadedClassId'] !== resolvedClass) {
        console.warn(`[characters] Discarding stale load for "${resolvedClass}"`)
        return
      }
      if (charGroup.userData['disposed'] as boolean) return

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
      console.error('[characters] Failed to load character:', err)
      // Procedural silhouette from makeCharacter() remains visible as fallback.
    })
}

// ---------------------------------------------------------------------------
// makeCharacter — creates the character anchor group (procedural placeholder)
// ---------------------------------------------------------------------------

/**
 * Create the character anchor group immediately (no async).
 * Adds a parry shield and weapon attachment group.
 * The procedural silhouette inside is hidden when the GLTF model arrives.
 */
export function makeCharacter(
  teamColor: number,
  optsOrToonGradient?: CharacterOpts | THREE.DataTexture,
): THREE.Group {
  const opts =
    optsOrToonGradient && !(optsOrToonGradient instanceof THREE.DataTexture)
      ? optsOrToonGradient
      : {}
  const g = makeCharacterAnchor(teamColor, opts)

  const shield = makeParryShieldVisual(0.68)
  shield.position.set(0, 0, -0.1)
  g.add(shield)
  g.userData['parryShield'] = shield

  return g
}

// ---------------------------------------------------------------------------
// Parry shield
// ---------------------------------------------------------------------------

export function makeParryShieldVisual(radius = 0.62): THREE.Group {
  const shield = new THREE.Group()
  shield.visible = false
  shield.renderOrder = 18

  const mk = (color: number, opacity: number) =>
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
    })

  const core = new THREE.Mesh(new THREE.CircleGeometry(radius, 8), mk(0x68ddff, 0.18))
  const edge = new THREE.Mesh(new THREE.RingGeometry(radius * 0.84, radius, 8), mk(0xffd260, 0.92))
  const glyph = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.38, radius * 0.46, 6),
    mk(0x00d0ff, 0.78),
  )

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
  charGroup.userData['isParrying'] = active
  // Raise/lower the physical shield_A model (sword wielders only — handled inside).
  updateShieldAttachment(charGroup)

  // Suppress the translucent magic barrier ONLY for a real character model that
  // is wielding a sword (it blocks with the physical shield instead). The
  // first-person parry shield is a standalone group with NO charModel — it must
  // always show its barrier, otherwise bow/staff parries have no visual at all
  // ("the parry doesn't fire").
  const hasCharModel = !!charGroup.userData['charModel']
  const activeWeapon = (charGroup.userData['activeWeaponProp'] as string) ?? 'bow'
  const usesPhysicalShield = hasCharModel && activeWeapon === 'sword'

  const shield = charGroup.userData['parryShield'] as THREE.Group | undefined
  if (!shield) return
  shield.visible = active && !usesPhysicalShield
  if (!active || usesPhysicalShield) return

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

// Tuning constants for the procedural block pose (left arm raises the shield).
// The skeleton has no dedicated block clip, so we additively rotate the left
// arm bones AFTER the mixer writes the idle pose each frame.
const PARRY_UPPERARM_Z = -1.15 // lift the upper arm up/across the chest
const PARRY_UPPERARM_X = 0.55 // bring it forward, in front of the torso
const PARRY_LOWERARM_Z = 1.35 // bend the elbow so the shield rises to face level

/**
 * Procedurally raise the left (shield) arm into a blocking stance while
 * parrying, blending in/out smoothly. Call every frame AFTER tickCharacterMixer
 * (the mixer overwrites bone rotations, so this must run last). `dt` is seconds.
 */
export function applyParryArmPose(charGroup: THREE.Group, parrying: boolean, dt: number): void {
  const model = charGroup.userData['charModel'] as THREE.Object3D | undefined
  if (!model) return
  const prev = (charGroup.userData['parryArmBlend'] as number) ?? 0
  const target = parrying ? 1 : 0
  // Snap UP fast (≈50 ms) so even a quick tap-parry visibly raises the shield;
  // ease DOWN a little slower so it doesn't pop. Without the fast rise, brief
  // parries showed almost no shield motion ("the parry doesn't fire").
  const rate = parrying ? dt * 45 : dt * 18
  const blend = prev + (target - prev) * Math.min(1, rate)
  charGroup.userData['parryArmBlend'] = blend
  if (blend < 0.01) return

  const upper = findBone(model, 'upperarm_l') as THREE.Bone | null
  const lower = findBone(model, 'lowerarm_l') as THREE.Bone | null
  if (upper) {
    upper.rotation.z += PARRY_UPPERARM_Z * blend
    upper.rotation.x += PARRY_UPPERARM_X * blend
  }
  if (lower) {
    lower.rotation.z += PARRY_LOWERARM_Z * blend
  }
}
