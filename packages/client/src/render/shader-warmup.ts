// Shader warm-up scheduling — pre-links GPU programs during match load so the
// FIRST cast / weapon swap doesn't stall on shader compilation mid-fight.
import type * as THREE from 'three'

/**
 * Compile a render pass's programs after its async GLBs land. Two sweeps cover
 * slow asset loads; compile() is idempotent and cheap when nothing changed.
 */
export function scheduleViewmodelPrecompile(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  // Sweeps run from page load; the later ones cover assets that only stream in
  // on match join (FPV rigs, weapon GLBs) so their programs still pre-link.
  delaysMs: number[] = [4000, 12000, 22000, 35000],
): void {
  for (const d of delaysMs) setTimeout(() => renderer.compile(scene, camera), d)
}
