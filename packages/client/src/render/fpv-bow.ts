// ---------------------------------------------------------------------------
// First-person animated bow viewmodel.
//
// Uses the dedicated animated_fps_bow.glb — a full FPS rig with arms, bow,
// string and arrow plus 19 baked animations (idle / walk / run / aim / fire /
// reload / jump …). This REPLACES the old static bow model + procedural draw
// hacks: we just drive the real clips from gameplay state.
//
// Animation flow for a shot:
//   IDLE ──charge──▶ AIM (0.17s) ──hold──▶ AIM_IDLE
//   AIM_IDLE ──release──▶ FIRE (0.58s) ──▶ RELOAD (1.15s) ──▶ IDLE/AIM
// ---------------------------------------------------------------------------
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const BOW_GLB = '/weapons/animated_fps_bow.glb'

// Viewmodel placement in camera space. Tuned live in-browser against the rig so
// the arms + bow sit close to the eye ("almost attached"), broad face toward the
// camera, arrow pointing toward the crosshair without covering it. The rig's
// geometry is authored far from its origin (Sketchfab FBX nesting), so these
// values frame the skinned arms+bow, not a centred mesh — re-tune via screenshots
// if the GLB is ever replaced.
const VM_POSITION = new THREE.Vector3(-0.02, -0.46, -0.5)
const VM_ROTATION = new THREE.Euler(0, 0, 0.14)
const VM_SCALE = 0.26

// The rig's relaxed clips (idle/walk/run) hold the bow edge-on — realistic for an
// archer at rest, but it reads as a thin sliver in first person. We fix it with a
// 90° yaw applied about the rig's bone centroid so the broad face turns toward the
// camera; pivoting about the centroid (not the origin) keeps the framing put. The
// aim/fire clips stay broad-faced under the same correction. CENTROID is the bone
// centroid in root-local space, captured live; re-measure if the GLB changes.
const BROAD_FACE_PIVOT = new THREE.Vector3(-0.3317, 0.9372, 0.4673)
const BROAD_FACE_YAW = Math.PI / 2

export interface FpvBowState {
  moving: boolean
  speed: number
  /** Bow drawn back (LMB held charging a shot). */
  charging: boolean
}

export interface FpvBowController {
  /** Parent this under the camera. */
  root: THREE.Group
  setVisible(v: boolean): void
  /** Call every frame with dt (seconds) and current gameplay state. */
  update(dt: number, state: FpvBowState): void
  /** Trigger the fire → reload one-shot (call on arrow release). */
  fire(): void
  dispose(): void
}

type ClipName =
  | 'Bow_IDLE'
  | 'Bow_WALK'
  | 'Bow_RUN'
  | 'Bow_AIM'
  | 'Bow_AIM_IDLE'
  | 'Bow_FIRE'
  | 'Bow_RELOAD'

export function createFpvBow(): FpvBowController {
  const root = new THREE.Group()
  root.position.copy(VM_POSITION)
  root.rotation.copy(VM_ROTATION)
  root.scale.setScalar(VM_SCALE)
  root.visible = false

  let mixer: THREE.AnimationMixer | null = null
  const actions = new Map<ClipName, THREE.AnimationAction>()
  let current: ClipName | null = null
  // One-shot sequence state: 'fire' then 'reload' then null (state-driven again).
  let oneShot: 'fire' | 'reload' | null = null

  new GLTFLoader().load(
    BOW_GLB,
    (gltf) => {
      const model = gltf.scene
      // Rendered in the dedicated viewmodel pass (separate scene + fresh depth
      // buffer), so it gets correct internal depth sorting and lighting — no
      // depthTest/renderOrder hacks needed. Just keep it always drawn (no frustum
      // cull / shadows) and single-sided.
      model.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return
        o.frustumCulled = false
        o.castShadow = false
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        for (const m of mats) {
          m.transparent = false
          ;(m as THREE.MeshStandardMaterial).side = THREE.FrontSide
        }
      })
      // Broad-face correction: pivot (rotates about the centroid) wraps a recentre
      // group (offsets the model so the centroid sits at the pivot origin) wraps the
      // model. Net effect: a 90° yaw of the rig about its own centre.
      const pivot = new THREE.Group()
      pivot.position.copy(BROAD_FACE_PIVOT)
      pivot.rotation.y = BROAD_FACE_YAW
      const recentre = new THREE.Group()
      recentre.position.copy(BROAD_FACE_PIVOT).multiplyScalar(-1)
      recentre.add(model)
      pivot.add(recentre)
      root.add(pivot)

      mixer = new THREE.AnimationMixer(model)
      for (const clip of gltf.animations) {
        const a = mixer.clipAction(clip)
        actions.set(clip.name as ClipName, a)
      }
      mixer.addEventListener('finished', (e) => {
        const finished = e.action
        if (oneShot === 'fire' && finished === actions.get('Bow_FIRE')) {
          oneShot = 'reload'
          play('Bow_RELOAD', false, 0.05)
        } else if (oneShot === 'reload' && finished === actions.get('Bow_RELOAD')) {
          oneShot = null
          current = null // hand control back to state-driven selection
        }
      })
      play('Bow_IDLE', true, 0)
    },
    undefined,
    (err) => console.error('[fpv-bow] load failed:', err),
  )

  function play(name: ClipName, loop: boolean, fadeSec: number): void {
    const next = actions.get(name)
    if (!next || current === name) return
    const prev = current ? actions.get(current) : undefined
    current = name
    next.reset()
    next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1)
    next.clampWhenFinished = !loop
    next.enabled = true
    next.play()
    if (prev && fadeSec > 0) prev.crossFadeTo(next, fadeSec, false)
    else if (prev) prev.stop()
  }

  function update(dt: number, _state: FpvBowState): void {
    if (mixer) mixer.update(dt)
    if (oneShot) return // FIRE/RELOAD one-shot owns the rig until it finishes

    // FPS archer: always hold the broad-faced "ready" pose (AIM_IDLE) — the rig's
    // relaxed IDLE/WALK/RUN clips hold the bow edge-on (a crooked sliver in first
    // person), so we never use them on the viewmodel. Charging deepens the same
    // pose into a full draw via the FIRE one-shot. This removes the dependency on
    // the fragile edge-on→broad-face correction for the resting bow.
    play('Bow_AIM_IDLE', true, 0.12)
  }

  function fire(): void {
    if (!actions.get('Bow_FIRE')) return
    oneShot = 'fire'
    play('Bow_FIRE', false, 0.03)
  }

  return {
    root,
    setVisible: (v) => {
      root.visible = v
    },
    update,
    fire,
    dispose: () => {
      mixer?.stopAllAction()
      root.clear()
    },
  }
}
