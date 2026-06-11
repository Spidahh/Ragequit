// ---------------------------------------------------------------------------
// Character weapon prop system.
// Owns: weapon GLTF loading/caching, grip configuration, applyWeaponProp.
// Uses KayKit weapon assets — loaded as self-contained `.glb` from
// `weapons/kaykit/` (see AGENTS.md). The legacy `.gltf`/`.bin`/`.png` sources
// were removed; only the `.glb` are shipped.
// ---------------------------------------------------------------------------
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

import { ELEMENT_COLORS, type ElementId } from '../character.js'

import { findBone } from './character-loader.js'
import { createOutlineMesh } from './outlines.js'

const _loader = new GLTFLoader()

// ---------------------------------------------------------------------------
// Weapon asset paths — KayKit Fantasy Weapons pack
// ---------------------------------------------------------------------------

const _weaponAssetPath: Record<'sword' | 'bow' | 'staff' | 'shield', string> = {
  // sword_C (kaykit/sword.glb) is a slim, elegant blade (0.27 m wide) — the old
  // sword_D was a chunky 0.71 m-wide slab that read as a low-quality club.
  sword: '/weapons/kaykit/sword.glb',
  bow: '/weapons/kaykit/bow.glb',
  staff: '/weapons/kaykit/staff.glb',
  shield: '/weapons/kaykit/shield_A.glb', // Physical shield model
}

// ---------------------------------------------------------------------------
// Per-weapon grip configuration — position/rotation/scale in hand-bone local space.
// These values compensate for each model's pivot and orientation so the weapon
// sits correctly in the hand during all animations.
// ---------------------------------------------------------------------------

interface WeaponGrip {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
}

const _weaponGripConfig: Record<string, Record<'sword' | 'bow' | 'staff', WeaponGrip>> = {
  tank: {
    sword: { position: [0.025, -0.01, -0.02], rotation: [Math.PI / 2, 0, 0], scale: 0.44 },
    bow: {
      position: [0.01, 0.015, -0.03],
      rotation: [Math.PI / 2, -0.08, Math.PI / 2],
      scale: 0.5,
    },
    staff: {
      position: [0.015, -0.02, -0.01],
      rotation: [Math.PI / 2, -0.14, Math.PI / 2],
      scale: 0.46,
    },
  },
  mage: {
    sword: { position: [0.02, -0.01, -0.02], rotation: [Math.PI / 2, 0, 0], scale: 0.42 },
    bow: {
      position: [0.01, 0.01, -0.03],
      rotation: [Math.PI / 2, -0.08, Math.PI / 2],
      scale: 0.48,
    },
    staff: {
      position: [0.015, -0.015, -0.01],
      rotation: [Math.PI / 2, -0.14, Math.PI / 2],
      scale: 0.46,
    },
  },
  archer: {
    sword: { position: [0.015, -0.01, -0.015], rotation: [Math.PI / 2, 0, 0], scale: 0.38 },
    bow: {
      position: [0.008, 0.008, -0.025],
      rotation: [Math.PI / 2, -0.08, Math.PI / 2],
      scale: 0.44,
    },
    staff: {
      position: [0.01, -0.015, -0.01],
      rotation: [Math.PI / 2, -0.14, Math.PI / 2],
      scale: 0.42,
    },
  },
  hybrid: {
    sword: { position: [0.016, -0.008, -0.015], rotation: [Math.PI / 2, 0, 0], scale: 0.39 },
    bow: {
      position: [0.008, 0.008, -0.025],
      rotation: [Math.PI / 2, -0.08, Math.PI / 2],
      scale: 0.44,
    },
    staff: {
      position: [0.01, -0.015, -0.01],
      rotation: [Math.PI / 2, -0.14, Math.PI / 2],
      scale: 0.42,
    },
  },
}

/** Return the grip config for a weapon — used by _installCharacterModel when
 *  re-attaching the weaponGroup to a new hand bone after a class change. */
export function getWeaponGrip(weaponId: 'sword' | 'bow' | 'staff', classId?: string): WeaponGrip {
  const c = (classId || 'hybrid').toLowerCase()
  const defs = _weaponGripConfig[c] || _weaponGripConfig['hybrid']!
  return defs[weaponId]!
}

// ---------------------------------------------------------------------------
// Loading cache
// ---------------------------------------------------------------------------

const _weaponCache = new Map<string, THREE.Group>()
const _weaponInflightMap = new Map<string, Promise<THREE.Group>>()

/** Clear all children of a weaponGroup and dispose their geometry/materials. */
export function clearWeaponGroup(wg: THREE.Group): void {
  while (wg.children.length > 0) {
    const c = wg.children[0]!
    c.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return
      // Weapon meshes are clones that SHARE geometry with the weapon cache;
      // disposing it would evict the buffers under every other player holding
      // the same weapon. Only outline meshes own a cloned geometry. Materials
      // are per-instance, so dispose those always.
      if (node.name.endsWith('_outline')) node.geometry?.dispose()
      const m = node.material
      if (Array.isArray(m)) m.forEach((x) => (x as THREE.Material).dispose())
      else (m as THREE.Material | undefined)?.dispose()
    })
    wg.remove(c)
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Load (and cache) a weapon GLTF. Returns the canonical scene group. */
export function fetchWeaponGlb(
  weaponId: 'sword' | 'bow' | 'staff' | 'shield',
): Promise<THREE.Group> {
  const cached = _weaponCache.get(weaponId)
  if (cached) return Promise.resolve(cached)
  const inflight = _weaponInflightMap.get(weaponId)
  if (inflight) return inflight

  const p = new Promise<THREE.Group>((resolve, reject) => {
    _loader.load(
      _weaponAssetPath[weaponId],
      (gltf) => {
        _weaponCache.set(weaponId, gltf.scene)
        _weaponInflightMap.delete(weaponId)
        resolve(gltf.scene)
      },
      undefined,
      (err) => {
        _weaponInflightMap.delete(weaponId)
        reject(err)
      },
    )
  })
  _weaponInflightMap.set(weaponId, p)
  return p
}

/**
 * Load the weapon model for `weapon` and attach it inside charGroup's weaponGroup.
 * Safe to call when the character model is not yet loaded — the weaponGroup is
 * always present from makeCharacter().
 */
export function applyWeaponProp(
  charGroup: THREE.Group,
  weapon: string,
  toonGradientOrElementHex?: THREE.DataTexture | number,
): void {
  let elementHex = 0xffe080
  if (typeof toonGradientOrElementHex === 'number') {
    elementHex = toonGradientOrElementHex
  } else {
    const element = charGroup.userData['element'] as ElementId | undefined
    if (element) elementHex = ELEMENT_COLORS[element] ?? 0xffe080
  }

  const wStr = String(weapon).toLowerCase()
  const weaponId: 'sword' | 'bow' | 'staff' = wStr.includes('bow')
    ? 'bow'
    : wStr.includes('staff')
      ? 'staff'
      : 'sword'

  const wg = charGroup.userData['weaponGroup'] as THREE.Group | undefined
  if (!wg) return

  // Track active weapon to guard against async race conditions.
  charGroup.userData['activeWeaponProp'] = weaponId
  clearWeaponGroup(wg)

  fetchWeaponGlb(weaponId)
    .then((scene) => {
      if (charGroup.userData['activeWeaponProp'] !== weaponId) return
      clearWeaponGroup(wg)

      const model = scene.clone() as THREE.Group

      model.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return
        child.castShadow = true
        child.frustumCulled = false

        // PBR to match the characters that hold these — metal blades/heads read
        // with real specular instead of flat toon. Glowing parts (orbs/glyphs)
        // stay emissive for bloom.
        const makeWeaponMat = (m: THREE.Material): THREE.MeshStandardMaterial => {
          const src = m as THREE.MeshStandardMaterial | THREE.MeshToonMaterial | undefined
          const hasMap = !!(src && 'map' in src && src.map && !(src.map instanceof Function))
          const color = src?.color?.clone() ?? new THREE.Color(0xffffff)
          const n = child.name.toLowerCase()
          const isGlowing =
            n.includes('glow') || n.includes('glyph') || n.includes('orb') || n.includes('element')
          return new THREE.MeshStandardMaterial({
            color: isGlowing ? new THREE.Color(elementHex) : color,
            map: hasMap ? (src as THREE.MeshStandardMaterial).map : null,
            roughness: isGlowing ? 0.3 : 0.5,
            metalness: isGlowing ? 0.0 : 0.35,
            side: THREE.DoubleSide,
            emissive: isGlowing ? new THREE.Color(elementHex) : new THREE.Color(0x000000),
            emissiveIntensity: isGlowing ? 0.8 : 0.0,
          })
        }

        const source = child.material
        child.material = Array.isArray(source) ? source.map(makeWeaponMat) : makeWeaponMat(source)
      })

      wg.add(model)

      // Apply grip — repositions the weaponGroup so the blade sits correctly in hand.
      const classId = (charGroup.userData['loadedClassId'] as string) || 'hybrid'
      const grip = getWeaponGrip(weaponId, classId)
      wg.position.set(...grip.position)
      wg.rotation.set(...grip.rotation)
      wg.scale.setScalar(grip.scale)

      // Toon outlines for weapon meshes.
      const outlines: { mesh: THREE.Mesh; outline: THREE.Mesh }[] = []
      wg.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return
        if (child.name.endsWith('_outline')) return
        outlines.push({ mesh: child, outline: createOutlineMesh(child, 0.016, 0x0a0a0f) })
      })
      for (const { mesh, outline } of outlines) mesh.parent?.add(outline)

      // Update shield visibility/attachment if weapon swap changed.
      updateShieldAttachment(charGroup)
    })
    .catch((err) => {
      console.error(`[character] Failed to load weapon "${weaponId}":`, err)
    })
}

/** Load the shield model and attach it inside charGroup's shieldGroup. */
export function applyShieldProp(charGroup: THREE.Group, _toonGradient?: THREE.DataTexture): void {
  const sg = charGroup.userData['shieldGroup'] as THREE.Group | undefined
  if (!sg) return

  clearWeaponGroup(sg)

  fetchWeaponGlb('shield')
    .then((scene) => {
      const model = scene.clone() as THREE.Group

      model.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return
        child.castShadow = true
        child.frustumCulled = false

        const makeShieldMat = (m: THREE.Material): THREE.MeshStandardMaterial => {
          const src = m as THREE.MeshStandardMaterial | THREE.MeshToonMaterial | undefined
          const hasMap = !!(src && 'map' in src && src.map && !(src.map instanceof Function))
          const color = src?.color?.clone() ?? new THREE.Color(0xffffff)
          return new THREE.MeshStandardMaterial({
            color,
            map: hasMap ? (src as THREE.MeshStandardMaterial).map : null,
            roughness: 0.68,
            metalness: 0.12,
            side: THREE.DoubleSide,
          })
        }

        const source = child.material
        child.material = Array.isArray(source) ? source.map(makeShieldMat) : makeShieldMat(source)
      })

      sg.add(model)

      // Toon outlines for shield.
      const outlines: { mesh: THREE.Mesh; outline: THREE.Mesh }[] = []
      sg.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return
        if (child.name.endsWith('_outline')) return
        outlines.push({ mesh: child, outline: createOutlineMesh(child, 0.016, 0x0a0a0f) })
      })
      for (const { mesh, outline } of outlines) mesh.parent?.add(outline)

      // Update shield attachment position
      updateShieldAttachment(charGroup)
    })
    .catch((err) => {
      console.error(`[character] Failed to load shield:`, err)
    })
}

/** Dynamically attach and reposition shieldGroup based on equipped weapon and parrying state. */
export function updateShieldAttachment(charGroup: THREE.Group): void {
  const model = charGroup.userData['charModel'] as THREE.Group | undefined
  if (!model) return

  const sg = charGroup.userData['shieldGroup'] as THREE.Group | undefined
  if (!sg) return

  const activeWeapon =
    (charGroup.userData['activeWeaponProp'] as 'sword' | 'bow' | 'staff') ?? 'sword'
  const isParrying = !!charGroup.userData['isParrying']

  // Only display the shield if the player is wielding the sword
  if (activeWeapon !== 'sword') {
    sg.visible = false
    return
  }
  sg.visible = true

  const classId = ((charGroup.userData['loadedClassId'] as string) || 'hybrid').toLowerCase()
  const leftHand = findBone(model, 'LeftHand')
  if (!leftHand) return

  // The physical shield is ALWAYS carried in the off-hand (left hand) while a
  // sword is equipped — a true sword-and-board look. On parry it swings up into
  // a forward blocking stance; otherwise it rests along the forearm.
  if (sg.parent !== leftHand) leftHand.add(sg)
  const scale = classId === 'tank' ? 0.72 : 0.6
  sg.scale.setScalar(scale)

  // shield_A is modelled upright (long axis +Y, broad face ±Z), so it needs NO
  // X-tip — the old Math.PI/2 X laid it flat. Stand it vertical on the forearm;
  // angle the broad face outward at rest, turn it forward on parry.
  if (isParrying) {
    // Blocking stance — face turned forward, raised in front of the body.
    sg.position.set(-0.02, 0.05, 0.06)
    sg.rotation.set(0, 0.4, 0)
  } else {
    // Resting stance — carried vertically on the forearm, face angled outward.
    sg.position.set(-0.03, 0.04, 0.0)
    sg.rotation.set(0, -0.2, 0.05)
  }
}

/** Cast ring shown above casting players. */
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
  m.layers.enable(1) // selective bloom: cast ring glows
  return m
}
