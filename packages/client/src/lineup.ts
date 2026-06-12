// Character lineup — a standalone page (/lineup.html) that loads several raw GLBs
// from the asset library side by side, normalised to the same height, so distinct
// class candidates can be compared in ONE shot (the "stanza test" idea, proven).
// Dev-only, not shipped. URL: ?models=Knight_Met,pbr_shadowkin_mage_rigged,...
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const params = new URLSearchParams(location.search)
const models = (params.get('models') ?? 'Knight_Met').split(',').filter(Boolean)
const yaws = (params.get('yaws') ?? '').split(',').map((v) => parseFloat(v))

const TARGET_H = 1.9
const SPACING = 1.45

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1b1f29)

scene.add(new THREE.HemisphereLight(0xd6dcea, 0x2a2436, 2.2))
const key = new THREE.DirectionalLight(0xf0f6ff, 2.6)
key.position.set(3, 6, 5)
scene.add(key)
const rim = new THREE.DirectionalLight(0x6a86d8, 1.1)
rim.position.set(-4, 3, -3)
scene.add(rim)
const fill = new THREE.DirectionalLight(0xfff0e0, 1.0)
fill.position.set(-2, 3, 5)
scene.add(fill)

const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.01, 200)
const span = Math.max(models.length - 1, 0) * SPACING
camera.position.set(0, 1.0, span * 0.5 + 3.3)
camera.lookAt(0, 0.95, 0)

const mixers: THREE.AnimationMixer[] = []
let done = 0

function place(gltf: { scene: THREE.Group; animations: THREE.AnimationClip[] }, i: number): void {
  const m = gltf.scene
  let box = new THREE.Box3().setFromObject(m)
  const size = box.getSize(new THREE.Vector3())
  const s = TARGET_H / Math.max(size.y, 0.1)
  m.scale.setScalar(s)
  box = new THREE.Box3().setFromObject(m)
  const c = box.getCenter(new THREE.Vector3())
  m.position.x -= c.x
  m.position.z -= c.z
  m.position.y -= box.min.y
  const offset = (i - (models.length - 1) / 2) * SPACING
  m.position.x += offset
  m.rotation.y = Number.isFinite(yaws[i]) ? yaws[i]! : Math.PI
  m.traverse((o) => {
    const me = o as THREE.Mesh
    if (me.isMesh) me.castShadow = true
  })
  scene.add(m)
  if (gltf.animations.length) {
    const mx = new THREE.AnimationMixer(m)
    const idle = gltf.animations.find((a) => /idle/i.test(a.name)) ?? gltf.animations[0]!
    mx.clipAction(idle).play()
    mixers.push(mx)
  }
}

const loader = new GLTFLoader()
models.forEach((name, i) => {
  loader.load(
    `/characters/${name}.glb`,
    (g) => {
      place(g, i)
      done++
    },
    undefined,
    (e) => {
      console.error('lineup load failed:', name, e)
      done++
    },
  )
})

const clock = new THREE.Clock()
let elapsed = 0
function loop(): void {
  const dt = clock.getDelta()
  elapsed += dt
  for (const mx of mixers) mx.update(dt)
  renderer.render(scene, camera)
  if (done >= models.length && elapsed > 1.5) document.body.dataset['ready'] = '1'
  requestAnimationFrame(loop)
}
loop()
