// ---------------------------------------------------------------------------
// First-person viewmodel — the weapon in your hands.
//
// WHY THIS EXISTS
//
// The game shipped first-person with NOTHING of the player on screen. A capture
// of live gameplay is a camera floating in a room: no hands, no weapon, no
// evidence that anyone is holding anything. `main.ts` justified it with
// "no body is the honest first-person view, and it is what every arena shooter
// renders" — which is simply false. Quake puts a rocket launcher across the
// bottom third of your screen. Half-Life, Doom, Chivalry, Dark Messiah, Hexen,
// Witchfire: every one of them draws the weapon. It is the single loudest signal
// that the thing on screen is a game and not a 3D scene.
//
// The old solution died for a real reason: drawing the CHARACTER RIG from the
// world camera put alphaMode:BLEND submeshes 10-40 cm from the eye, which wrote
// no depth and read as half-transparent garbage. The fix for that is not "draw
// nothing" — it is the technique every shipped FPS uses, which is what this
// module is:
//
//   A SEPARATE SCENE, rendered with a SEPARATE CAMERA, on top of the world.
//
// That buys four things the rig-in-world approach can never have:
//   1. the weapon cannot clip into walls, because it is not in the world;
//   2. its FOV is independent — world FOV can go to 110 for movement feel while
//      the weapon keeps a flattering ~55 and does not smear at the edges;
//   3. it has its own lights, so the weapon stays readable in a dark arena
//      instead of disappearing into it;
//   4. depth is cleared before it draws, so no z-fighting with anything.
//
// WHAT MAKES IT FEEL ALIVE
//
// A static weapon glued to the camera looks worse than none. Three motions do
// almost all the work, and they are all driven by what the player is already
// doing:
//   - SWAY: the weapon lags behind mouse movement and swings back. This is the
//     single most important one — it is what makes an FPS feel like you are
//     holding an object rather than wearing a decal.
//   - BOB: a figure-eight driven by horizontal speed, so movement is visible in
//     the hands. Amplitude scales with speed, so Quake acceleration reads.
//   - LAND: a downward dip on touchdown, recovering on a spring. Weight.
// Plus a per-action kick (swing / shoot / cast) so an attack starts in the hands
// before it exists in the world.
// ---------------------------------------------------------------------------
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const WEAPON_ASSET: Record<string, string> = {
  sword: '/weapons/kaykit/sword.glb',
  bow: '/weapons/kaykit/bow.glb',
  staff: '/weapons/kaykit/staff.glb',
}

/**
 * Resting pose per weapon, in viewmodel-camera space.
 *
 * Held low and to the right, angled back across the screen — the standard
 * three-quarter presentation. It reads as "carried" rather than "aimed at the
 * camera", and it keeps the centre of the screen (where the crosshair and every
 * enemy live) clear.
 */
interface WeaponPose {
  pos: THREE.Vector3
  rot: THREE.Euler
  /**
   * On-screen LENGTH in viewmodel metres, not a scale multiplier.
   *
   * The KayKit assets are authored at real-world size — a ~1.1 m sword — and at
   * 0.6 m from a 55° camera that fills the whole frame, which is what the first
   * pass looked like: a monolith across half the screen. Normalising to a
   * target length means composition is controlled here instead of inherited
   * from whoever exported the GLB, and a replacement asset of any size drops in
   * without retuning.
   */
  length: number
}

// `pos` is the weapon's CENTRE in viewmodel-camera space (x right, y up, z
// toward the viewer), because the model is recentred on load. That distinction
// cost a whole iteration: the KayKit sword is 2.13 m tall with its origin at the
// grip, so a y that framed the hilt correctly threw the recentred weapon clean
// off the bottom of the screen.
//
// At z = -0.72 with a 55° vertical FOV the frame is 0.75 m tall, so these are
// readable as fractions: length 0.46 ≈ 60 % of screen height, y -0.16 ≈ centred
// 70 % of the way down. Right side, clear of the crosshair.
const POSE: Record<string, WeaponPose> = {
  // Blade up and canted right — the classic ready pose, tip out of the centre.
  sword: {
    pos: new THREE.Vector3(0.28, -0.16, -0.72),
    rot: new THREE.Euler(-0.34, 0.44, 0.42),
    length: 0.46,
  },
  // Carried low with the limb across the body: the shape says "bow" instantly
  // even before a draw starts.
  bow: {
    pos: new THREE.Vector3(0.26, -0.14, -0.75),
    rot: new THREE.Euler(0.12, -0.5, 0.62),
    length: 0.5,
  },
  // Tilted so the head sits high and inboard — the staff is where spells come
  // from, so its business end has to be on screen when one launches.
  staff: {
    pos: new THREE.Vector3(0.3, -0.18, -0.75),
    rot: new THREE.Euler(0.34, 0.4, 0.3),
    length: 0.54,
  },
}

const DEFAULT_POSE: WeaponPose = POSE['sword'] as WeaponPose

/** Vertical FOV for the weapon camera. Deliberately independent of world FOV. */
const VIEWMODEL_FOV_DEG = 55

/** How far the weapon lags behind aim, and how hard it springs back. */
const SWAY_GAIN = 0.06
const SWAY_MAX = 0.09
const SWAY_RETURN = 9

/** Bob amplitude at full ground speed, in viewmodel metres. */
const BOB_AMP_X = 0.022
const BOB_AMP_Y = 0.016
const BOB_SPEED = 9.5

/** Landing dip: metres down at full impact, and the spring that undoes it. */
const LAND_DIP_M = 0.12
const LAND_RETURN = 7

export interface Viewmodel {
  /** Draw the weapon over whatever the world composer just produced. */
  render(renderer: THREE.WebGLRenderer): void
  /** Advance the motion from raw player state; deltas and landing are derived here. */
  update(dt: number, opts: ViewmodelFrame): void
  /** Swap the held weapon. Loading is async and cached; the pose applies on arrival. */
  setWeapon(weapon: string | null | undefined): void
  /** Kick the weapon for an action — the hands move before the world does. */
  punch(kind: 'swing' | 'shoot' | 'cast'): void
  /** Bow draw ratio 0..1, pulls the bow back and into frame. */
  setCharge(charge: number): void
  setVisible(visible: boolean): void
  resize(width: number, height: number): void
  dispose(): void
}

/**
 * Raw player state, not pre-chewed. Frame deltas and the landing edge are
 * derived in here on purpose: they are viewmodel concerns, and main.ts is a
 * god-file at its size budget that must not grow bookkeeping for a renderer.
 */
export interface ViewmodelFrame {
  /** Horizontal speed in m/s. */
  speed: number
  /** Top ground speed, so bob scales to the movement system instead of a magic number. */
  maxSpeed: number
  /** Absolute aim, radians. The frame delta is measured here. */
  yaw: number
  pitch: number
  /** Airborne: bob stops, because your feet are not doing anything. */
  onGround: boolean
}

/** Wrap to (-π, π] so crossing the yaw seam does not read as a full spin. */
function shortestAngle(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a))
}

const _loader = new GLTFLoader()
const _cache = new Map<string, THREE.Group>()

function loadWeapon(path: string): Promise<THREE.Group> {
  const hit = _cache.get(path)
  if (hit) return Promise.resolve(hit.clone(true))
  return _loader.loadAsync(path).then((gltf) => {
    const root = gltf.scene
    _cache.set(path, root)
    return root.clone(true)
  })
}

export function createViewmodel(): Viewmodel {
  // Warm all three weapons up front. They are ~20 KB each, and the alternative
  // is what a capture caught: the match starts, the first-person hand is empty
  // for however long the fetch takes, and the player's first seconds are spent
  // in the exact floating-camera view this module exists to end. A swap
  // mid-fight has the same problem and no loading screen to hide behind.
  for (const path of Object.values(WEAPON_ASSET)) void loadWeapon(path).catch(() => {})

  const scene = new THREE.Scene()
  // Seeded from the real viewport so the first frame is already correct: waiting
  // for a resize event would show one squashed frame on load.
  const aspect0 = window.innerHeight > 0 ? window.innerWidth / window.innerHeight : 1
  const camera = new THREE.PerspectiveCamera(VIEWMODEL_FOV_DEG, aspect0, 0.01, 10)

  // Its own lighting rig. The weapon must stay readable when the arena is dark,
  // and a key from the upper-left plus a cool rim from behind-right is what
  // separates it from the background without making it look pasted on.
  const key = new THREE.DirectionalLight(0xfff0d8, 2.6)
  key.position.set(-0.6, 1.0, 0.7)
  const rim = new THREE.DirectionalLight(0x88aaff, 1.4)
  rim.position.set(0.8, 0.2, -0.9)
  scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.55))

  // Every transform is applied to the holder, so the loaded model keeps its own
  // authored transform and swapping weapons cannot leave stale rotation behind.
  const holder = new THREE.Group()
  scene.add(holder)

  let model: THREE.Group | null = null
  let pose: WeaponPose = DEFAULT_POSE
  let currentWeapon: string | null = null
  let loadToken = 0

  let swayX = 0
  let swayY = 0
  let bobPhase = 0
  let landDip = 0
  let punchZ = 0
  let punchRot = 0
  let charge = 0
  let visible = true
  // Previous-frame aim and stance, so the caller passes state and not deltas.
  let prevYaw = Number.NaN
  let prevPitch = 0
  let wasOnGround = true

  function setWeapon(weapon: string | null | undefined): void {
    const key = typeof weapon === 'string' ? weapon : ''
    if (key === currentWeapon) return
    currentWeapon = key || null
    const path = WEAPON_ASSET[key]
    // Clear immediately: an unknown or absent weapon must show nothing rather
    // than keep the previous one, or a swap reads as "the swap did not happen".
    if (model) {
      holder.remove(model)
      model = null
    }
    if (!path) return
    const token = ++loadToken
    void loadWeapon(path)
      .then((g) => {
        // A swap that landed while this was in flight wins.
        if (token !== loadToken) return
        pose = POSE[key] ?? DEFAULT_POSE
        g.traverse((o) => {
          o.frustumCulled = false
          const mesh = o as THREE.Mesh
          if (mesh.isMesh) {
            mesh.castShadow = false
            mesh.receiveShadow = false
          }
        })
        // Normalise to the authored on-screen length, then recentre: several of
        // these assets have their origin at the blade tip or the grip, and an
        // off-centre origin turns every rotation into a swing around a point
        // that is not where the hand is.
        const box = new THREE.Box3().setFromObject(g)
        const size = new THREE.Vector3()
        const center = new THREE.Vector3()
        box.getSize(size)
        box.getCenter(center)
        const longest = Math.max(size.x, size.y, size.z)
        const k = longest > 1e-4 ? pose.length / longest : 1
        g.scale.setScalar(k)
        g.position.copy(center).multiplyScalar(-k)
        model = g
        holder.add(g)
      })
      .catch(() => {
        // A missing weapon asset must not take the frame down with it.
      })
  }

  function punch(kind: 'swing' | 'shoot' | 'cast'): void {
    // Pull back toward the eye and twist — the anticipation happens in the
    // hands, which is what makes an attack feel like it started with you.
    if (kind === 'swing') {
      punchZ = 0.1
      punchRot = 0.34
    } else if (kind === 'shoot') {
      punchZ = 0.07
      punchRot = 0.12
    } else {
      punchZ = 0.05
      punchRot = 0.18
    }
  }

  function update(dt: number, f: ViewmodelFrame): void {
    const step = Math.min(dt, 0.05)

    // Derive the frame's aim delta. First frame seeds instead of swinging: a
    // NaN-guarded seed avoids a violent sway the moment the match starts.
    const dYaw = Number.isNaN(prevYaw) ? 0 : shortestAngle(f.yaw - prevYaw)
    const dPitch = Number.isNaN(prevYaw) ? 0 : f.pitch - prevPitch
    prevYaw = f.yaw
    prevPitch = f.pitch
    const landed = f.onGround && !wasOnGround
    wasOnGround = f.onGround

    // --- Sway: the weapon lags the aim, then springs home ------------------
    // Sign is inverted on purpose: turn right and the weapon trails left,
    // which is the direction real mass would go.
    swayX += -dYaw * SWAY_GAIN
    swayY += dPitch * SWAY_GAIN
    swayX = THREE.MathUtils.clamp(swayX, -SWAY_MAX, SWAY_MAX)
    swayY = THREE.MathUtils.clamp(swayY, -SWAY_MAX, SWAY_MAX)
    const settle = Math.exp(-SWAY_RETURN * step)
    swayX *= settle
    swayY *= settle

    // --- Bob: a figure-eight, scaled by how fast you are actually going ----
    const speedRatio = f.maxSpeed > 0 ? THREE.MathUtils.clamp(f.speed / f.maxSpeed, 0, 1.4) : 0
    if (f.onGround && speedRatio > 0.05) bobPhase += step * BOB_SPEED * speedRatio
    const bobX = Math.cos(bobPhase) * BOB_AMP_X * speedRatio
    // Doubled frequency vertically is what makes it a walk cycle and not a wobble.
    const bobY = Math.abs(Math.sin(bobPhase)) * BOB_AMP_Y * speedRatio - BOB_AMP_Y * 0.5

    // --- Land dip and action kick, both on springs -------------------------
    if (landed) landDip = LAND_DIP_M
    landDip *= Math.exp(-LAND_RETURN * step)
    punchZ *= Math.exp(-11 * step)
    punchRot *= Math.exp(-11 * step)

    // --- Bow draw: pulls back and toward centre as it charges --------------
    const drawZ = charge * 0.09
    const drawX = -charge * 0.06

    holder.position.set(
      pose.pos.x + swayX + bobX + drawX,
      pose.pos.y + swayY + bobY - landDip,
      pose.pos.z + punchZ + drawZ,
    )
    holder.rotation.set(pose.rot.x - punchRot * 0.6, pose.rot.y, pose.rot.z + punchRot)
  }

  function render(renderer: THREE.WebGLRenderer): void {
    if (!visible || !model) return
    const prevAutoClear = renderer.autoClear
    renderer.autoClear = false
    // Depth only: the colour buffer holds the finished world frame, and the
    // weapon must sit in front of all of it regardless of world depth.
    renderer.clearDepth()
    renderer.render(scene, camera)
    renderer.autoClear = prevAutoClear
  }

  return {
    render,
    update,
    setWeapon,
    punch,
    setCharge: (c) => {
      charge = THREE.MathUtils.clamp(c, 0, 1)
    },
    setVisible: (v) => {
      visible = v
    },
    resize: (width, height) => {
      camera.aspect = height > 0 ? width / height : 1
      camera.updateProjectionMatrix()
    },
    dispose: () => {
      holder.clear()
      scene.clear()
      model = null
    },
  }
}
