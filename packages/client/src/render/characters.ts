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

// Per-class colour identity within the shared modular base (same gameplay render
// height). `accent`+`tint` give each class a strong faction hue on the outfit cloth.
// NOTE: a per-class `breadth` (X/Z body widening) was REMOVED — a non-uniform model
// scale leaks through the hand/forearm bone into the held weapon + shield socket and
// skewed them (worst on the Tank). Class silhouette now comes from outfit/hair/
// accessories + tint, never from scaling the armature. Do NOT reintroduce breadth.
const CLASS_BUILD: Record<string, { accent: number; tint: number }> = {
  tank: { accent: 0x4a4f5a, tint: 0.85 }, // gunmetal bestione
  archer: { accent: 0x2f7d2a, tint: 0.84 }, // vivid forest green
  mage: { accent: 0x6a2fc0, tint: 0.86 }, // arcane violet wizard
  hybrid: { accent: 0xb83020, tint: 0.84 }, // crimson, mid build
}

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

const _tmpV = new THREE.Vector3()

// Skinning-aware size for single-GLB Mixamo characters. Their mesh geometry bbox is
// tiny (verts authored near origin) — the real human size lives in the SKELETON, so
// `_measureRenderableBox` mis-reads them and they scale to the fallback (invisible
// off-frame). Measure the spread of bone world-positions instead.
function _measureBoneBox(root: THREE.Object3D): THREE.Box3 | null {
  const box = new THREE.Box3()
  let found = false
  root.updateMatrixWorld(true)
  root.traverse((o) => {
    if ((o as THREE.Bone).isBone) {
      box.expandByPoint(o.getWorldPosition(_tmpV))
      found = true
    }
  })
  return found && !box.isEmpty() ? box : null
}

// Character material. The class assets ship DETAILED painted baseColor textures
// (2048², plus normal/ORM) — they are PBR models. The old custom 3-band toon ramp
// (+ team-color emissive wash + heavy black outline) threw that quality away and
// made expensive assets read as flat plastic. We now render them as the PBR models
// they are: smooth MeshStandard shading on the painted albedo, which looks like a
// produced stylized hero (Valorant/Fortnite/Overwatch tier). Team identity moves to
// a thin team-coloured outline (see _installCharacterModel). `_toonGradient` is kept
// in the signature for call-site compatibility but no longer used.
function _makeToonMaterial(
  source: THREE.Material | undefined,
  teamColor: number,
  _toonGradient: THREE.DataTexture,
): THREE.MeshStandardMaterial {
  const src = source as THREE.MeshStandardMaterial | THREE.MeshToonMaterial | undefined
  const hasMap = !!(src && 'map' in src && src.map)
  const color = hasMap
    ? (src?.color?.clone() ?? new THREE.Color(0xffffff))
    : new THREE.Color(teamColor)
  return new THREE.MeshStandardMaterial({
    color,
    map: hasMap ? (src as THREE.MeshStandardMaterial).map : null,
    roughness: 0.72,
    metalness: 0.05,
    side: THREE.DoubleSide,
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
  const isSingleGlb = !!model.userData['singleGlb']
  model.rotation.y = Math.PI // face forward (game convention)
  if (isSingleGlb) {
    // NOTE: this single-GLB path is wired but currently UNUSED (no class sets
    // `mixamoGlb`). Knight_Met collapses here because it ships at 1/100 scale in a
    // "knight" node: post-load scaling breaks three.js 'attached' skinning (the skin
    // collapses while bone-attached props still render). Fix = normalise the GLB to
    // 1:1 offline, then re-enable. Size/place from the skeleton (bone world positions).
    model.scale.setScalar(1)
    model.updateMatrixWorld(true)
    const bb = _measureBoneBox(model)
    const footY = bb ? bb.min.y : 0
    model.position.y = -CAPSULE_HALF_HEIGHT_M - footY - 0.02
  } else {
    const nativeBox = _measureRenderableBox(model)
    const nativeHeight = _validBoxHeight(nativeBox)
    model.scale.setScalar(CHARACTER_RENDER_HEIGHT_M / nativeHeight)
    // UNIFORM scale only — no per-class X/Z breadth. A non-uniform armature scale
    // leaks into the hand-bone-attached weapon/shield and skews them; class identity
    // is conveyed by outfit/hair/accessories + tint instead (see CLASS_BUILD).
    const scaledBox = _measureRenderableBox(model)
    model.position.y = -CAPSULE_HALF_HEIGHT_M - scaledBox.min.y
  }

  // Single-GLB Mixamo characters (Tank = Knight_Met) are ONE rigged model: they keep
  // their authored PBR materials (albedo + normal + ORM) and are NOT head-clipped.
  // The head-only clip below exists solely for the layered base/outfit system, where
  // the FullBody base supplies just the face and its body must be hidden under the
  // outfit. Applying it to a single GLB would slice the whole body off at the neck.
  let headClip: THREE.Plane | null = null
  if (!isSingleGlb) {
    headClip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    charGroup.userData['headClipPlane'] = headClip
    charGroup.userData['headClipOffset'] = -CAPSULE_HALF_HEIGHT_M + CHARACTER_RENDER_HEIGHT_M * 0.8
    // Track the HEAD BONE so the clip plane follows animation. With a fixed
    // height the head dips BELOW the plane in crouched poses (run lean, death
    // on the ground) and the character renders decapitated.
    let headBone: THREE.Object3D | null = null
    model.traverse((o) => {
      if (headBone || !(o as THREE.Bone).isBone) return
      const n = o.name.toLowerCase()
      if (n === 'head' || (n.includes('head') && !n.includes('top') && !n.includes('end'))) {
        headBone = o
      }
    })
    charGroup.userData['headBone'] = headBone
  }

  // --- Materials ---
  const glbMaterials: THREE.MeshStandardMaterial[] = []
  let renderableMeshes = 0
  let skinnedMeshes = 0
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    renderableMeshes++
    if (child instanceof THREE.SkinnedMesh) skinnedMeshes++
    child.frustumCulled = false
    child.castShadow = true
    if (isSingleGlb) {
      // Keep the model's own PBR materials; just register any MeshStandardMaterial
      // so status-effect tints (hp pulse / shield / haste) can still reach it.
      const src = child.material
      for (const m of Array.isArray(src) ? src : [src]) {
        if (m instanceof THREE.MeshStandardMaterial) glbMaterials.push(m)
      }
      return
    }
    // Base-layer skinned meshes (no outfit/hair tag) are the FullBody body+head —
    // clip them to head-only so the body never pokes through the outfit.
    const isBase = child instanceof THREE.SkinnedMesh && !child.userData['layerTag']
    const source = child.material
    const mats = (Array.isArray(source) ? source : [source]).map((m) => {
      const mat = _makeToonMaterial(m, teamColor, toonGradient)
      if (isBase && headClip) mat.clippingPlanes = [headClip]
      return mat
    })
    child.material = Array.isArray(source) ? mats : mats[0]!
    glbMaterials.push(...mats)
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

  // Per-class colour identity on the outfit cloth — the modular pack only has two
  // outfit types (Ranger/Peasant), so a strong per-class hue makes the 4 classes read
  // as distinct factions at a glance (steel tank / green ranger / violet mage / crimson).
  const build = CLASS_BUILD[(charGroup.userData['loadedClassId'] as string) ?? '']
  if (build) {
    const accent = new THREE.Color(build.accent)
    model.traverse((child) => {
      if (!(child instanceof THREE.SkinnedMesh) || child.userData['layerTag'] !== 'outfit') return
      for (const m of Array.isArray(child.material) ? child.material : [child.material]) {
        const mm = m as THREE.MeshStandardMaterial
        if (mm?.color) mm.color.lerp(accent, build.tint)
      }
    })
  }

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
    // Base head (FullBody) meshes are head-only-clipped and carry the face — an
    // inverted-hull outline would draw the clipped body's silhouette and the fixed
    // thickness swallows the tiny eye/brow meshes. The outfit supplies the outline.
    if (child instanceof THREE.SkinnedMesh && !child.userData['layerTag']) return

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
    // Thin TEAM-COLOURED rim instead of a heavy black ink line: it reads as a clean
    // hero-shooter silhouette AND carries faction identity (self blue / enemy red),
    // which the flat textures alone can't (both teams share the same skins).
    const outline = createOutlineMesh(child, isWeaponMesh ? 0.01 : 0.008, teamColor)
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
// Dedicated installer for single-GLB realistic characters (e.g. Tank = Knight).
// Mirrors the standalone inspector RAW path (which renders this rig perfectly):
// keep the model's own materials, NO head-clip / layer / outline machinery. Built
// minimal first to isolate why the modular installer leaves the skinned body
// collapsed. TEMP: no scale/position/weapon yet.
// ---------------------------------------------------------------------------
function _installSingleGlbModel(
  charGroup: THREE.Group,
  model: THREE.Group,
  clipsByName: Partial<Record<string, THREE.AnimationClip>>,
): void {
  if (charGroup.userData['disposed'] as boolean) return

  const oldStore = charGroup.userData['mixerStore'] as MixerStore | undefined
  if (oldStore) {
    oldStore.mixer.stopAllAction()
    const oldModel = charGroup.userData['charModel'] as THREE.Object3D | undefined
    if (oldModel) oldStore.mixer.uncacheRoot(oldModel)
    delete charGroup.userData['mixerStore']
  }

  // NOTE: the brightness lift used to live here and multiplied every material's
  // colour on each install. SkeletonUtils clones share materials by reference,
  // so it compounded on every spawn until the characters were pure white. It now
  // happens once, on the cached GLTF, in character-loader.ts.

  // Register the model's real materials so status flashes (hp pulse / shield /
  // damage blink in self-emissive.ts & remote-players.ts) reach realistic chars too.
  // Also collect embedded weapon meshes (Erika ships her own animated bow+arrow):
  // applyWeaponProp toggles them against the game's weaponGroup per active weapon.
  const glbMaterials: THREE.MeshStandardMaterial[] = []
  const embeddedBow: THREE.Object3D[] = []
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    child.castShadow = true
    child.frustumCulled = false
    if (/bow|arrow|quiver/i.test(child.name)) embeddedBow.push(child)
    for (const m of Array.isArray(child.material) ? child.material : [child.material]) {
      const mm = m as THREE.MeshStandardMaterial
      if (mm instanceof THREE.MeshStandardMaterial) glbMaterials.push(mm)
    }
  })
  charGroup.userData['glbMaterials'] = glbMaterials
  if (embeddedBow.length > 0) {
    charGroup.userData['embeddedBowMeshes'] = embeddedBow
    // Visible only while the bow is the active weapon (default: hidden).
    const active = charGroup.userData['activeWeaponProp'] as string | undefined
    for (const m of embeddedBow) m.visible = active === 'bow'
  }

  // Face forward + scale to render height + feet to ground.
  model.rotation.y = Math.PI
  model.scale.setScalar(1)
  model.updateMatrixWorld(true)
  const boneBox0 = _measureBoneBox(model)
  const boneH = boneBox0 ? boneBox0.getSize(_tmpV).y : 0
  const nativeHeight = boneH > 0.1 ? boneH * 1.12 : _CHAR_GLB_FALLBACK_HEIGHT
  model.scale.setScalar(CHARACTER_RENDER_HEIGHT_M / nativeHeight)
  model.updateMatrixWorld(true)
  const boneBox1 = _measureBoneBox(model)
  const footY = boneBox1 ? boneBox1.min.y : 0
  model.position.y = -CAPSULE_HALF_HEIGHT_M - footY - CHARACTER_RENDER_HEIGHT_M * 0.04

  // Remove the procedural placeholder; keep weapon/shield/parry/model/shadow.
  const wg = charGroup.userData['weaponGroup'] as THREE.Group | undefined
  const sg = charGroup.userData['shieldGroup'] as THREE.Group | undefined
  const shield = charGroup.userData['parryShield'] as THREE.Group | undefined
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
  }

  charGroup.add(model)
  charGroup.userData['charModel'] = model

  // Attach the game's weaponGroup to the rig's right hand (CC/Tripo bone naming:
  // CC_Base_R_Hand_xx / R_Hand; GLB exports add numeric suffixes → fuzzy match).
  let rightHand: THREE.Bone | null = null
  model.traverse((o) => {
    if (rightHand || !(o as THREE.Bone).isBone) return
    const stripped = o.name.replace(/_\d+$/, '')
    if (/^(CC_Base_)?R_Hand$/i.test(stripped) || /^(mixamorig:?)?RightHand$/i.test(stripped)) {
      rightHand = o as THREE.Bone
    }
  })
  if (rightHand && wg) {
    ;(rightHand as THREE.Bone).add(wg)
    // Grip values live in ONE place — character-weapons' mixamo grip table —
    // otherwise the async applyWeaponProp overwrote whatever was set here.
    charGroup.userData['mixamoRigWeapon'] = true
    const grip = getWeaponGrip(
      (charGroup.userData['activeWeaponProp'] as 'sword' | 'bow' | 'staff') ?? 'sword',
      undefined,
      true,
    )
    wg.position.set(...grip.position)
    wg.rotation.set(...grip.rotation)
    wg.scale.setScalar(grip.scale)
  }

  // Physical off-hand shield (sword-and-board) — same as the modular installer.
  applyShieldProp(charGroup)

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

      if (model.userData['singleGlb']) {
        _installSingleGlbModel(charGroup, model, clips)
      } else {
        _installCharacterModel(
          charGroup,
          model,
          clips,
          teamColor,
          toonGradient,
          `${resolvedClass} GLTF`,
        )
      }
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
const PARRY_UPPERARM_Z = -0.8 // lift the upper arm up/across the chest
const PARRY_UPPERARM_X = 0.42 // bring it forward, in front of the torso
const PARRY_LOWERARM_Z = 0.95 // bend the elbow so the shield rises to guard height

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

/**
 * Collapse (or restore) the local player's head so the first-person camera is
 * not sitting inside their own skull.
 *
 * The standard first-person-with-a-body technique: keep the whole rig — arms,
 * weapon, shield, legs, all of it animated by the same clips everyone else sees
 * — and scale the head bone to nothing. Scaling the BONE takes every mesh
 * weighted to it (helmet, hair, face) with it, so no per-asset mesh list has to
 * be maintained as characters change.
 *
 * Idempotent: safe to call every frame.
 */
export function setFirstPersonHead(charGroup: THREE.Group, hidden: boolean): void {
  const model = charGroup.userData['charModel'] as THREE.Object3D | undefined
  if (!model) return
  const cached = charGroup.userData['headBone'] as THREE.Bone | null | undefined
  const head = cached === undefined ? findBone(model, 'Head') : cached
  if (cached === undefined) charGroup.userData['headBone'] = head ?? null
  if (!head) return
  const target = hidden ? 0.0001 : 1
  if (head.scale.x !== target) head.scale.setScalar(target)
}

// ---------------------------------------------------------------------------
// NO first-person weapon hold here, and this is the second thing that did not
// work. Composing the weapon's transform from the camera is sound — it is a
// rigid prop, it cannot deform — but it needs ONE offset and rotation per weapon
// model, and sword, bow and staff have different pivots and different authored
// orientations. Tuned against the sword by eye, the same numbers put the bow and
// the staff visibly wrong, which is worse than showing nothing.
//
// The principled version does not hand-tune anything: derive each weapon's own
// long axis from its bounding box, then build the hold by aligning THAT axis to
// the camera. It works for any model, including ones added later. That is the
// way in, and it is not a bigger guess.
// ---------------------------------------------------------------------------
