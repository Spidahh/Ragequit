// scene-builder.ts — Creates and returns the Three.js scene, renderer,
// camera, lights, and post-processing pipeline.
//
// Call buildScene(app) once at startup. The returned objects are passed to
// all subsystems that need them.

import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

export interface SceneObjects {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  nameplateContainer: HTMLDivElement
  bloomComposer: EffectComposer
  finalComposer: EffectComposer
  bloomPass: UnrealBloomPass
  playerLight: THREE.PointLight
  dir: THREE.DirectionalLight
  blackMat: THREE.MeshBasicMaterial
}

export function buildScene(app: HTMLElement): SceneObjects {
  // ── Renderer ────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setClearColor(0x141c28, 1)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1
  renderer.domElement.tabIndex = 0
  renderer.domElement.style.outline = 'none'
  app.appendChild(renderer.domElement)

  // ── Nameplate container ─────────────────────────────────────────────────
  const nameplateContainer = document.createElement('div') as HTMLDivElement
  nameplateContainer.id = 'nameplate-container'
  nameplateContainer.style.cssText =
    'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:10'
  app.appendChild(nameplateContainer)

  // ── Scene + camera ──────────────────────────────────────────────────────
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0d1520)
  scene.fog = new THREE.FogExp2(0x0d1520, 0.015)

  const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 400)

  // ── Post-processing: selective bloom ────────────────────────────────────
  // Layer 1 = bloom-eligible emissive objects; layer 0 = normal.
  const bloomComposer = new EffectComposer(renderer)
  bloomComposer.renderToScreen = false
  bloomComposer.addPass(new RenderPass(scene, camera))
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.45,   // strength — subtle, not blown out
    0.55,   // radius
    0.75,   // threshold — only very bright emissive gets bloomed
  )
  bloomComposer.addPass(bloomPass)

  const finalComposer = new EffectComposer(renderer)
  finalComposer.addPass(new RenderPass(scene, camera))
  finalComposer.addPass(new OutputPass())

  // ── Lights ──────────────────────────────────────────────────────────────
  // Sky-dome hemisphere
  scene.add(new THREE.HemisphereLight(0xc4d8ff, 0x182238, 1.2))

  // Key light with PCF soft shadow
  const dir = new THREE.DirectionalLight(0xf0f6ff, 1.15)
  dir.position.set(12, 28, 14)
  dir.castShadow = true
  dir.shadow.mapSize.width = 2048
  dir.shadow.mapSize.height = 2048
  dir.shadow.camera.near = 1
  dir.shadow.camera.far = 120
  dir.shadow.camera.left = -40
  dir.shadow.camera.right = 40
  dir.shadow.camera.top = 40
  dir.shadow.camera.bottom = -40
  dir.shadow.bias = -0.0008
  scene.add(dir)

  // Fill / rim light
  const rim = new THREE.DirectionalLight(0x40c8ff, 0.55)
  rim.position.set(-12, 8, -14)
  scene.add(rim)

  // Ground bounce
  const bounce = new THREE.PointLight(0x80a8ff, 0.06, 16, 2)
  bounce.position.set(0, 0.5, 0)
  scene.add(bounce)

  // Player follow-light — moves with the self character each frame
  const playerLight = new THREE.PointLight(0xaaccff, 0.45, 8, 2)
  scene.add(playerLight)

  // ── Shared materials ────────────────────────────────────────────────────
  // Used during the bloom selective render pass to darken non-bloom objects
  const blackMat = new THREE.MeshBasicMaterial({ color: 0x000000 })

  // ── Handle window resize ────────────────────────────────────────────────
  // Caller must also update camera.aspect and call updateProjectionMatrix()
  // and draggableHud.refreshBounds() — those depend on non-scene state.

  return {
    renderer,
    scene,
    camera,
    nameplateContainer,
    bloomComposer,
    finalComposer,
    bloomPass,
    playerLight,
    dir,
    blackMat,
  }
}

/** Update all size-dependent objects after a window resize. */
export function onSceneResize(
  sceneObjects: SceneObjects,
  width: number,
  height: number,
): void {
  const { renderer, bloomComposer, finalComposer, bloomPass } = sceneObjects
  renderer.setSize(width, height)
  bloomComposer.setSize(width, height)
  finalComposer.setSize(width, height)
  bloomPass.resolution.set(width, height)
}
