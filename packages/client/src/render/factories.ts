import { SWORD_M1_CONE_HALF_ANGLE_RAD, SWORD_M1_RANGE_M } from '@ragequit/shared'
import * as THREE from 'three'

import { VfxTextures } from './vfx-textures.js'

export function makeToonGradient(): THREE.DataTexture {
  const steps = 2
  const data = new Uint8Array(steps * 4)

  // Shadow band: moody slate dark shade
  data[0] = 80
  data[1] = 80
  data[2] = 96
  data[3] = 255

  // Lit band: full illumination highlights
  data[4] = 255
  data[5] = 255
  data[6] = 255
  data[7] = 255

  const tex = new THREE.DataTexture(data, steps, 1, THREE.RGBAFormat)
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  tex.needsUpdate = true
  return tex
}

// Arc span must equal the full hitbox cone (2 × half-angle) so the visual
// matches what the server checks.  The rotation formula in main.ts offsets
// by (π/2 + SWORD_M1_CONE_HALF_ANGLE_RAD) to centre the arc on forward.
export const SWING_ARC_SPAN = SWORD_M1_CONE_HALF_ANGLE_RAD * 2 // 120° = full cone
export const SWING_ARC_YAW_OFFSET = Math.PI / 2 + SWORD_M1_CONE_HALF_ANGLE_RAD // ≈ 2.618

export function makeSwingArcMesh(): THREE.Mesh {
  VfxTextures.init()
  const geo = new THREE.TorusGeometry(SWORD_M1_RANGE_M * 0.72, 0.14, 8, 22, SWING_ARC_SPAN)
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
