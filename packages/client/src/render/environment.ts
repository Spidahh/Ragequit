import * as THREE from 'three'

// Night-arena image-based lighting (IBL). PBR materials need an environment map to
// read: without it, MeshStandard metals render black and rough stone reads flat-dark.
// We build a DARK, on-palette equirect gradient — cool moonlit zenith → near-black
// horizon → warm ember ground (the torch-lit duotone of STILE.md) — and install it as
// scene.environment via PMREM. environmentIntensity is the single knob that lifts all
// PBR surfaces out of the dark WITHOUT washing the gloom: the env map does not touch
// fog or background, so the torches + key light still own the bright accents and the
// element-coded magic stays the only saturated thing.
export function installArenaEnvironment(scene: THREE.Scene, renderer: THREE.WebGLRenderer): void {
  const envCanvas = document.createElement('canvas')
  envCanvas.width = 8
  envCanvas.height = 64
  const ectx = envCanvas.getContext('2d')
  if (ectx) {
    const grad = ectx.createLinearGradient(0, 0, 0, 64)
    grad.addColorStop(0.0, '#7c90ba') // zenith: cool moonlit blue (bright enough to fill PBR)
    grad.addColorStop(0.5, '#2a2f3d') // horizon: dim cool grey
    grad.addColorStop(1.0, '#54402a') // nadir: warm ember/ground bounce
    ectx.fillStyle = grad
    ectx.fillRect(0, 0, 8, 64)
  }
  const envTex = new THREE.CanvasTexture(envCanvas)
  envTex.mapping = THREE.EquirectangularReflectionMapping
  envTex.colorSpace = THREE.SRGBColorSpace
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromEquirectangular(envTex).texture
  scene.environmentIntensity = 3.0
  envTex.dispose()
  pmrem.dispose()
}
