import { SWORD_M1_CONE_HALF_ANGLE_RAD, SWORD_M1_RANGE_M } from '@ragequit/shared'
import * as THREE from 'three'

export function makeToonGradient(): THREE.DataTexture {
  const steps = 6
  const data = new Uint8Array(steps * 4)
  const ramp = [28, 68, 120, 172, 220, 255]
  for (let i = 0; i < steps; i++) {
    data[i * 4] = ramp[i]!
    data[i * 4 + 1] = ramp[i]!
    data[i * 4 + 2] = ramp[i]!
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
export const SWING_ARC_SPAN = SWORD_M1_CONE_HALF_ANGLE_RAD * 2 // 120° = full cone
export const SWING_ARC_YAW_OFFSET = Math.PI / 2 + SWORD_M1_CONE_HALF_ANGLE_RAD // ≈ 2.618

export function makeSwingArcMesh(): THREE.Mesh {
  const geo = new THREE.TorusGeometry(SWORD_M1_RANGE_M * 0.72, 0.14, 8, 22, SWING_ARC_SPAN)
  const mat = new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0 })
  const m = new THREE.Mesh(geo, mat)
  m.visible = false
  return m
}

export function makeProjectileMesh(kind: 'arrow' | 'bolt'): THREE.Mesh {
  if (kind === 'arrow') {
    // Tapered shaft — narrow at tip, wider at nock — with a warm amber glow.
    const geo = new THREE.CylinderGeometry(0.025, 0.065, 1.1, 6)
    geo.rotateX(Math.PI / 2)
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffa030,
      emissive: 0xff8000,
      emissiveIntensity: 0.65,
      roughness: 0.4,
      metalness: 0.0,
    })
    return new THREE.Mesh(geo, mat)
  }
  // Magic bolt — glowing cyan orb.
  const geo = new THREE.SphereGeometry(0.2, 12, 8)
  const mat = new THREE.MeshStandardMaterial({
    color: 0x40e8ff,
    emissive: 0x00ccff,
    emissiveIntensity: 1.2,
    roughness: 0.15,
    metalness: 0.0,
    transparent: true,
    opacity: 0.92,
  })
  return new THREE.Mesh(geo, mat)
}
