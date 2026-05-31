// visual-helpers.ts — Three.js utility helpers with no game-state dependencies.
//
// All functions take explicit arguments so they can be imported by any module
// without pulling in the entire main.ts scope.

import * as THREE from 'three'

// ---------------------------------------------------------------------------
// Bloom layer
// ---------------------------------------------------------------------------

/** Bloom layer index. Three.js layer 1 = bloom-eligible. */
export const BLOOM_LAYER_IDX = 1

/**
 * Mark an object and all its descendants as bloom-eligible (layer 1).
 * Only call on emissive/glowing objects (sigil, border ring, zone VFX,
 * cast ring, torches). Never on regular geometry.
 */
export function markBloom(obj: THREE.Object3D): void {
  obj.layers.enable(BLOOM_LAYER_IDX)
  obj.traverse((child) => child.layers.enable(BLOOM_LAYER_IDX))
}

// ---------------------------------------------------------------------------
// Disposal
// ---------------------------------------------------------------------------

/**
 * Dispose all geometries and materials in an Object3D hierarchy.
 * Call before removing objects from the scene to avoid GPU memory leaks.
 */
export function disposeObject3D(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.geometry?.dispose()
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((m: THREE.Material) => m.dispose())
    } else {
      (mesh.material as THREE.Material | undefined)?.dispose()
    }
  })
}

// ---------------------------------------------------------------------------
// Camera helpers
// ---------------------------------------------------------------------------

/**
 * Apply a directional camera shake impulse.
 * attackerWorldPos: world-space position of the attacker (for directional push).
 * If null, the shake direction is random.
 * intensity: multiplier (1 = standard, 2 = heavy).
 */
export function applyDirectionalShake(
  shakeOffset: THREE.Vector3,
  selfPos: { x: number; y: number; z: number } | null,
  attackerWorldPos: THREE.Vector3 | null,
  intensity = 1,
): number {
  if (selfPos && attackerWorldPos) {
    const dir = new THREE.Vector3(
      selfPos.x - attackerWorldPos.x,
      0,
      selfPos.z - attackerWorldPos.z,
    ).normalize()
    shakeOffset.set(dir.x * 0.28 * intensity, 0.1 * intensity, dir.z * 0.28 * intensity)
  } else {
    const angle = Math.random() * Math.PI * 2
    shakeOffset.set(
      Math.cos(angle) * 0.22 * intensity,
      0.08 * intensity,
      Math.sin(angle) * 0.22 * intensity,
    )
  }
  return shakeOffset.length() // new shakeDecay magnitude
}

/**
 * Compute the impact kick-back/lift values for the camera recoil.
 * Returns [kickBack, kickLift] max values to apply.
 */
export function computeImpactKick(
  cause: string,
  power: number,
): { kickBack: number; kickLift: number } {
  const raw = cause.startsWith('ability:') ? cause.slice(8) : cause
  const melee =
    raw === 'sword_m1' || raw === 'uppercut' || raw === 'whirlwind' ||
    raw === 'gap_closer' || raw === 'bleed_strike' || raw === 'guard_break' ||
    raw === 'rending_dash'
  const kickBack = melee ? 0.34 : raw === 'bow' ? 0.14 : 0.12
  const kickLift = melee ? 0.06 : 0.035
  return {
    kickBack: kickBack * Math.max(0.45, power),
    kickLift: kickLift * Math.max(0.45, power),
  }
}
