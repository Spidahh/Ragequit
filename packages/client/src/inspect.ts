// Character inspector — a standalone page (/inspect.html) that renders ONE class's
// character close-up via the real loader, so the modular rig, faces, weapon grip
// and shield can be verified in isolation (the in-match camera is too far for any
// of that). Drives the same code path the game uses; not shipped in the game build.
//
// URL params: ?class=tank|archer|mage|hybrid  &weapon=sword|bow|staff  &parry=1
//             &team=self|enemy  &view=full|head  &yaw=<radians>
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

import {
  applyParryArmPose,
  applyWeaponProp,
  loadCharacterGlb,
  makeCharacter,
  setCharAnimState,
  setParryShieldState,
  tickCharacterMixer,
} from './render/characters.js'
import { makeToonGradient } from './render/factories.js'

const params = new URLSearchParams(location.search)
const classId = params.get('class') ?? 'tank'
const weapon = params.get('weapon') ?? 'sword'
const parry = params.get('parry') === '1'
const team = params.get('team') === 'enemy' ? 0xe04a4a : 0x3a8fde
const view = params.get('view') ?? 'full'
const yaw = params.get('yaw') !== null ? parseFloat(params.get('yaw')!) : Math.PI

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.localClippingEnabled = true
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.1
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x202430)

const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.01, 100)
// Frame the whole 1.9 m body, or zoom to the head for a face check.
if (view === 'head') {
  camera.position.set(0, 0.62, 1.15)
  camera.lookAt(0, 0.62, 0)
} else {
  camera.position.set(0, 0.0, 3.3)
  camera.lookAt(0, 0.0, 0)
}

// Lights mirror the in-game world rig so the inspector matches what players see.
scene.add(new THREE.HemisphereLight(0xd6dcea, 0x2a2436, 1.15))
const key = new THREE.DirectionalLight(0xf0f6ff, 1.4)
key.position.set(3, 5, 4)
scene.add(key)
const rim = new THREE.DirectionalLight(0x6a86d8, 0.6)
rim.position.set(-3, 2, -3)
scene.add(rim)

// RAW mode: load an arbitrary GLB straight (no game pipeline) to evaluate a NEW
// asset pack before integrating it — plays its own first animation, frames the body.
const rawUrl = params.get('raw')
let rawMixer: THREE.AnimationMixer | null = null
if (rawUrl) {
  new GLTFLoader().load(rawUrl, (gltf) => {
    const m = gltf.scene
    m.rotation.y = yaw
    scene.add(m)
    m.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.isMesh) mesh.castShadow = true
    })
    // Auto-frame the model whatever its native scale/anchor.
    const box = new THREE.Box3().setFromObject(m)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const h = Math.max(size.y, 0.5)
    if (view === 'head') {
      camera.position.set(0, box.max.y - h * 0.12, h * 0.7)
      camera.lookAt(0, box.max.y - h * 0.12, center.z)
    } else {
      camera.position.set(0, center.y + h * 0.05, h * 2.6)
      camera.lookAt(0, center.y, center.z)
    }
    if (gltf.animations.length) {
      rawMixer = new THREE.AnimationMixer(m)
      // Prefer an idle-ish clip if present, else the first.
      const idle = gltf.animations.find((a) => /idle/i.test(a.name)) ?? gltf.animations[0]!
      rawMixer.clipAction(idle).play()
    }
    ;(globalThis as Record<string, unknown>)['__rawClips'] = gltf.animations.map((a) => a.name)
  })
}

const toon = makeToonGradient()
const char = makeCharacter(team, toon)
if (!rawUrl) {
  loadCharacterGlb(char, team, toon, classId)
  applyWeaponProp(char, weapon, toon)
  // Yaw the whole anchor so the FRONT (face) turns toward the camera (the inner
  // model carries a 180° game-convention yaw; PI here cancels it).
  char.rotation.y = yaw
  scene.add(char)
}
// Dev handle so the verify harness can traverse the loaded model.
;(globalThis as Record<string, unknown>)['__inspectChar'] = char

// Style experiment: 'toon' (current), 'pbr' (real painted textures under smooth
// PBR shading — uses the assets as authored), 'flat' (clean flat-lit colour).
// Swapped once after the async model lands.
const style = params.get('style') ?? 'toon'
let styled = false
function applyStyle(): void {
  const model = char.userData['charModel'] as THREE.Object3D | undefined
  if (!model || style === 'toon') {
    styled = true
    return
  }
  model.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh || mesh.name.endsWith('_outline')) return
    const cur = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as
      | THREE.MeshToonMaterial
      | undefined
    const map = cur?.map ?? null
    const baseColor = map ? new THREE.Color(0xffffff) : (cur?.color ?? new THREE.Color(0x888888))
    const clip = cur?.clippingPlanes ?? null
    if (style === 'pbr') {
      mesh.material = new THREE.MeshStandardMaterial({
        map,
        color: baseColor,
        roughness: 0.72,
        metalness: 0.04,
        clippingPlanes: clip,
        side: THREE.DoubleSide,
      })
    } else {
      mesh.material = new THREE.MeshBasicMaterial({ map, color: baseColor, clippingPlanes: clip })
    }
  })
  styled = true
}

const clock = new THREE.Clock()
let elapsed = 0
function loop(): void {
  const dt = clock.getDelta()
  elapsed += dt
  if (rawUrl) {
    if (rawMixer) rawMixer.update(dt)
  } else {
    if (!styled && elapsed > 1.0) applyStyle()
    tickCharacterMixer(char, dt)
    setCharAnimState(char, { moving: false, alive: true, activeWeapon: weapon, parrying: parry })
    setParryShieldState(char, parry, false, performance.now())
    applyParryArmPose(char, parry, dt)
  }
  renderer.render(scene, camera)
  // Signal the screenshot harness once the model has had time to load + settle.
  if (elapsed > 1.5) document.body.dataset['ready'] = '1'
  requestAnimationFrame(loop)
}
loop()
