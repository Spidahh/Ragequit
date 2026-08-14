// Selective bloom: only layer-1 (emissive) meshes are allowed to glow.
//
// Three.js has no per-object bloom, so the trick every project ends up with is
// to render the scene twice: once with every non-emissive material swapped for
// flat black — leaving only the glowing things lit — and once normally, then
// add the blurred first pass into the second.
//
// Extracted out of main.ts (file-budget: AGENTS.md). It was inline in the hot
// loop, where it read as part of the frame logic rather than as the one
// self-contained trick it is.
import * as THREE from 'three'
import type { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'

const _black = new THREE.MeshBasicMaterial({ color: 0x000000 })
const _swapped: { mesh: THREE.Mesh; mat: THREE.Material | THREE.Material[] }[] = []

/**
 * Render the emissive-only pass into `composer`'s target.
 *
 * The traverse happens every frame on purpose: meshes are added and removed
 * constantly (projectiles, impacts, zones), and a cached list would silently
 * stop bloom-darkening anything that spawned after it was built.
 */
export function renderBloomPass(
  composer: EffectComposer,
  scene: THREE.Scene,
  bloomLayer: THREE.Layers,
): void {
  _swapped.length = 0
  scene.traverse((obj) => {
    const m = obj as THREE.Mesh
    if (m.isMesh && !m.layers.test(bloomLayer)) {
      _swapped.push({ mesh: m, mat: m.material })
      m.material = _black
    }
  })
  composer.render()
  for (const e of _swapped) e.mesh.material = e.mat
  _swapped.length = 0
}
