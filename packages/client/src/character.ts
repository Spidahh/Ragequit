// Character runtime anchor.
//
// The visible fighter comes from class-specific GLTF meshes in
// render/characters.ts. This module keeps shared color constants, userData
// types, the ground shadow, and the weapon attachment group used before and
// after the skinned model finishes loading.

import * as THREE from 'three'

import { makeToonGradient } from './render/factories.js'

export const CAPSULE_HEIGHT_M = 2.0
export const CAPSULE_RADIUS_M = 0.4

/** Element colors used by character emissive and trim materials. */
export const ELEMENT_COLORS = {
  none: 0xffe080, // accent (brass-gold)
  fire: 0xff5733,
  ice: 0x5cd0ff,
  lightning: 0xffeb47,
  dark: 0x9a4dff,
  nature: 0x5cdb53,
} as const

export type ElementId = keyof typeof ELEMENT_COLORS
export type HeadId = 'helm' | 'hood' | 'circlet'
export type WeaponId = 'sword' | 'bow' | 'staff'

export interface CharacterOpts {
  head?: HeadId
  element?: ElementId
}

interface CharGroupUserData extends Record<string, unknown> {
  armorMat: THREE.MeshToonMaterial
  darkMat: THREE.MeshToonMaterial
  trimMat: THREE.MeshToonMaterial
  element: ElementId
  head: HeadId
  weaponGroup: THREE.Group
  shieldGroup?: THREE.Group
}

// Shared toon gradient for procedural silhouette materials.
// Identical to factories.ts:makeToonGradient() — single source, no duplication.
const TOON_RAMP: THREE.DataTexture = makeToonGradient()

/**
 * Build the character anchor group.
 * @param teamColor  hex int (0x3a8fde = blue self, 0xe04a4a = red enemy)
 * @param opts       { head, element }
 */
export function makeCharacter(teamColor: number, opts: CharacterOpts = {}): THREE.Group {
  const head = opts.head ?? 'helm'
  const element = opts.element ?? 'none'
  const trimColor = ELEMENT_COLORS[element] ?? ELEMENT_COLORS.none
  const elementActive = element !== 'none'

  const g = new THREE.Group()

  const armorMat = new THREE.MeshToonMaterial({
    color: teamColor,
    gradientMap: TOON_RAMP,
  })
  const clothMat = new THREE.MeshToonMaterial({ color: 0x1c2030, gradientMap: TOON_RAMP })
  const trimMat = new THREE.MeshToonMaterial({
    color: trimColor,
    emissive: elementActive ? trimColor : 0x000000,
    emissiveIntensity: elementActive ? 0.55 : 0,
    gradientMap: TOON_RAMP,
  })

  const ud = g.userData as CharGroupUserData
  ud.armorMat = armorMat
  ud.darkMat = clothMat
  ud.trimMat = trimMat
  ud.element = element
  ud.head = head

  // Ground contact shadow.
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(CAPSULE_RADIUS_M * 1.15, 24),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = -CAPSULE_HEIGHT_M / 2 + 0.015
  shadow.name = 'shadow'
  g.add(shadow)

  // Weapon attach point.
  const weaponGroup = new THREE.Group()
  weaponGroup.position.set(0.4, -0.22, -0.08)
  weaponGroup.rotation.set(0.25, 0, -0.18)
  ud.weaponGroup = weaponGroup
  g.add(weaponGroup)

  // Shield attach point.
  const shieldGroup = new THREE.Group()
  shieldGroup.position.set(-0.4, -0.22, 0.08)
  ud.shieldGroup = shieldGroup
  g.add(shieldGroup)

  return g
}
