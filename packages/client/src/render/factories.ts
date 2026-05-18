import { SWORD_M1_CONE_HALF_ANGLE_RAD, SWORD_M1_RANGE_M } from '@ragequit/shared'
import * as THREE from 'three'

export function makeToonGradient(): THREE.DataTexture {
  const steps = 6
  const data = new Uint8Array(steps * 3)
  const ramp = [28, 68, 120, 172, 220, 255]
  for (let i = 0; i < steps; i++) {
    data[i * 3] = ramp[i]!
    data[i * 3 + 1] = ramp[i]!
    data[i * 3 + 2] = ramp[i]!
  }
  const tex = new THREE.DataTexture(data, steps, 1, THREE.RGBFormat)
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  tex.needsUpdate = true
  return tex
}

// Arc span must equal the full hitbox cone (2 × half-angle) so the visual
// matches what the server checks.  The rotation formula in main.ts offsets
// by (π/2 + SWORD_M1_CONE_HALF_ANGLE_RAD) to centre the arc on forward.
export const SWING_ARC_SPAN = SWORD_M1_CONE_HALF_ANGLE_RAD * 2   // 120° = full cone
export const SWING_ARC_YAW_OFFSET = Math.PI / 2 + SWORD_M1_CONE_HALF_ANGLE_RAD  // ≈ 2.618

export function makeSwingArcMesh(): THREE.Mesh {
  const geo = new THREE.TorusGeometry(SWORD_M1_RANGE_M * 0.72, 0.14, 8, 22, SWING_ARC_SPAN)
  const mat = new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0 })
  const m = new THREE.Mesh(geo, mat)
  m.visible = false
  return m
}

export function makeProjectileMesh(kind: 'arrow' | 'bolt'): THREE.Mesh {
  if (kind === 'arrow') {
    const geo = new THREE.CylinderGeometry(0.04, 0.09, 1.1, 6)
    geo.rotateX(Math.PI / 2)
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffd060,
    })
    return new THREE.Mesh(geo, mat)
  }
  const geo = new THREE.SphereGeometry(0.22, 12, 8)
  const mat = new THREE.MeshBasicMaterial({
    color: 0x20ffff,
  })
  return new THREE.Mesh(geo, mat)
}
