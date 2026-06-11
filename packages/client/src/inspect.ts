// Character inspector — a standalone page (/inspect.html) that renders ONE class's
// character close-up via the real loader, so the modular rig, faces, weapon grip
// and shield can be verified in isolation (the in-match camera is too far for any
// of that). Drives the same code path the game uses; not shipped in the game build.
//
// URL params: ?class=tank|archer|mage|hybrid  &weapon=sword|bow|staff  &parry=1
//             &team=self|enemy  &view=full|head  &yaw=<radians>
import * as THREE from 'three'

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

const toon = makeToonGradient()
const char = makeCharacter(team, toon)
loadCharacterGlb(char, team, toon, classId)
applyWeaponProp(char, weapon, toon)
// Yaw the whole anchor so the FRONT (face) turns toward the camera (the inner
// model carries a 180° game-convention yaw; PI here cancels it).
char.rotation.y = yaw
scene.add(char)
// Dev handle so the verify harness can traverse the loaded model.
;(globalThis as Record<string, unknown>)['__inspectChar'] = char

const clock = new THREE.Clock()
let elapsed = 0
function loop(): void {
  const dt = clock.getDelta()
  elapsed += dt
  tickCharacterMixer(char, dt)
  setCharAnimState(char, { moving: false, alive: true, activeWeapon: weapon, parrying: parry })
  setParryShieldState(char, parry, false, performance.now())
  applyParryArmPose(char, parry, dt)
  renderer.render(scene, camera)
  // Signal the screenshot harness once the model has had time to load + settle.
  if (elapsed > 1.5) document.body.dataset['ready'] = '1'
  requestAnimationFrame(loop)
}
loop()
