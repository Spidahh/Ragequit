import { SWORD_M1_CONE_HALF_ANGLE_RAD, SWORD_M1_RANGE_M } from '@ragequit/shared'
import * as THREE from 'three'

import { VfxTextures } from './vfx-textures.js'

export function makeToonGradient(): THREE.DataTexture {
  // 3-band cel ramp. A flat 2-band ramp (shadow→lit) leaves big areas of a single
  // shade, which reads cheap on the arena's large untextured surfaces. A mid band
  // gives forms a rounded terminator — more dimension — while keeping a crisp,
  // stylized look. Shadows carry a faint cool tint (reads as ambient sky-fill);
  // the lit band is pure white so each material's own colour comes through clean.
  const bands = [
    [104, 104, 122], // shadow — soft cool slate (brighter than pure-dark = less muddy)
    [182, 180, 188], // mid — readable half-light, the new roundness
    [255, 255, 255], // lit — full illumination
  ]
  const steps = bands.length
  const data = new Uint8Array(steps * 4)
  for (let i = 0; i < steps; i++) {
    const [r, g, b] = bands[i]!
    data[i * 4] = r!
    data[i * 4 + 1] = g!
    data[i * 4 + 2] = b!
    data[i * 4 + 3] = 255
  }

  const tex = new THREE.DataTexture(data, steps, 1, THREE.RGBAFormat)
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  tex.needsUpdate = true
  return tex
}

// Arc span must equal the full hitbox cone (2 × half-angle) so the visual
// matches what the server checks.  The rotation formula in main.ts offsets
// by (π/2 + SWORD_M1_CONE_HALF_ANGLE_RAD) to centre the arc on forward.
export const SWING_ARC_SPAN = SWORD_M1_CONE_HALF_ANGLE_RAD * 2 // 90° = full cone
export const SWING_ARC_YAW_OFFSET = Math.PI / 2 + SWORD_M1_CONE_HALF_ANGLE_RAD // ≈ 2.618

/**
 * Height above the feet to draw the swing arc.
 *
 * It used to be drawn at the capsule base, so a sword swing appeared as a ring
 * around the ankles while the blade went through the opponent's chest. This
 * matches the contact height that hit-impacts.ts already uses, so the arc, the
 * impact and the animation finally agree about where the sword is.
 */
export const SWING_ARC_HEIGHT_M = 1.15

export function makeSwingArcMesh(): THREE.Mesh {
  VfxTextures.init()
  // Thin tube: at 0.14 this read as a solid hoop rotating around the player.
  // A sword leaves a blade-width sweep, not a doughnut.
  const geo = new THREE.TorusGeometry(SWORD_M1_RANGE_M * 0.72, 0.05, 8, 22, SWING_ARC_SPAN)
  const mat = new THREE.MeshBasicMaterial({
    map: VfxTextures.slash,
    color: 0xffd260, // glowing gold tint matching active weapon palette
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const m = new THREE.Mesh(geo, mat)
  m.visible = false
  return m
}

// Arrow physical mesh — tapered shaft with warm amber glow.
// Bolts are rendered as textured crossed-planes in projectile-visuals.ts
// (makeProjectileObject), so makeProjectileMesh is only called for 'arrow'.
export function makeProjectileMesh(_kind: 'arrow'): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(0.025, 0.065, 1.1, 6)
  geo.rotateX(Math.PI / 2)
  // MeshBasicMaterial per proiettili — più economico, nessuna luce dinamica necessaria.
  const mat = new THREE.MeshBasicMaterial({ color: 0xffa030 })
  return new THREE.Mesh(geo, mat)
}
