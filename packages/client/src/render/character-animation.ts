// ---------------------------------------------------------------------------
// Character animation state machine.
// Owns: _MixerStore, crossfade logic, _chooseAnimState, and all public
// animation exports consumed by main.ts and remote-players.ts.
// ---------------------------------------------------------------------------
import * as THREE from 'three'

// ---------------------------------------------------------------------------
// Animation name vocabulary
// ---------------------------------------------------------------------------

export type AnimName =
  | 'Idle'
  | 'Attacking_Idle'
  | 'Sword_Idle'
  | 'Bow_Idle'
  | 'Staff_Idle'
  | 'Run'
  | 'Walk'
  | 'Dagger_Attack'
  | 'Dagger_Attack2'
  | 'Dagger_Attack3'
  | 'Death'
  | 'Punch'
  | 'RecieveHit'
  | 'RecieveHit_Attacking'
  | 'Roll'
  | 'Jump'
  | 'Land'
  | 'Airborne'
  | 'Parry_Block'
  | 'Bow_Draw'
  | 'Bow_Release'
  | 'Staff_Cast'
  | 'Channel'
  | 'Respawn'

export const ANIM_NAMES: AnimName[] = [
  'Idle',
  'Attacking_Idle',
  'Sword_Idle',
  'Bow_Idle',
  'Staff_Idle',
  'Run',
  'Walk',
  'Dagger_Attack',
  'Dagger_Attack2',
  'Dagger_Attack3',
  'Death',
  'Punch',
  'RecieveHit',
  'RecieveHit_Attacking',
  'Roll',
  'Jump',
  'Land',
  'Airborne',
  'Parry_Block',
  'Bow_Draw',
  'Bow_Release',
  'Staff_Cast',
  'Channel',
  'Respawn',
]

// UAL1_Standard.glb clip name → internal AnimName
export const ANIM_NAME_MAP: Record<AnimName, string> = {
  Idle: 'Idle_Loop',
  Attacking_Idle: 'Idle_Loop',
  Sword_Idle: 'Sword_Idle',
  Bow_Idle: 'Spell_Simple_Idle_Loop',
  Staff_Idle: 'Spell_Simple_Idle_Loop',
  Run: 'Sprint_Loop',
  Walk: 'Walk_Loop',
  Dagger_Attack: 'Sword_Attack',
  Dagger_Attack2: 'Sword_Attack',
  Dagger_Attack3: 'Sword_Attack',
  Death: 'Death01',
  Punch: 'Punch_Cross',
  RecieveHit: 'Hit_Chest',
  RecieveHit_Attacking: 'Hit_Chest',
  Roll: 'Roll',
  Jump: 'Jump_Start',
  Land: 'Jump_Land',
  Airborne: 'Jump_Loop',
  Parry_Block: 'Sword_Idle',
  Bow_Draw: 'Spell_Simple_Idle_Loop',
  Bow_Release: 'Spell_Simple_Shoot',
  Staff_Cast: 'Spell_Simple_Shoot',
  Channel: 'Spell_Simple_Idle_Loop',
  Respawn: 'Spell_Simple_Enter',
}

// ---------------------------------------------------------------------------
// Mixer store — one per character instance
// ---------------------------------------------------------------------------

export interface MixerStore {
  mixer: THREE.AnimationMixer
  actions: Partial<Record<AnimName, THREE.AnimationAction>>
  current: AnimName
  /** Timestamp (ms) until which the attack action plays in reverse (recoil). */
  recoilUntilMs: number
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const _ONE_SHOTS = new Set<AnimName>([
  'Dagger_Attack',
  'Dagger_Attack2',
  'Dagger_Attack3',
  'Death',
  'Punch',
  'Jump',
  'Land',
  'Bow_Release',
  'Staff_Cast',
  'Respawn',
  'RecieveHit',
  'RecieveHit_Attacking',
  'Roll',
])

/**
 * How long the GAMEPLAY state behind each one-shot actually lasts.
 *
 * The Mixamo attack/cast clips run 1.5–2.5 s, but the state driving them is
 * held for only ~220–420 ms (the swing arc / ranged-release window), so the
 * crossfade left the clip after 10–25% of its length: the wind-up played and
 * the strike itself never rendered. Rather than stretching the gameplay
 * window — which would make the game feel sluggish — the clip is sped up to
 * fit it, so the whole motion reads inside the window it belongs to.
 */
const _ONE_SHOT_WINDOW_MS: Partial<Record<AnimName, number>> = {
  Dagger_Attack: 400,
  Dagger_Attack2: 400,
  Dagger_Attack3: 400,
  Punch: 400,
  Bow_Release: 260,
  Staff_Cast: 420,
  RecieveHit: 260,
  RecieveHit_Attacking: 260,
  Roll: 420,
  Land: 260,
}

/** Never slow a clip down, and never blur it past this speed. */
const _MAX_ONE_SHOT_SPEED = 6

/** Exported for tests. */
export function fitOneShotToWindow(action: THREE.AnimationAction, name: AnimName): void {
  const windowMs = _ONE_SHOT_WINDOW_MS[name]
  const durationSec = action.getClip().duration
  if (!windowMs || durationSec <= 0) {
    action.timeScale = 1
    return
  }
  const speed = (durationSec * 1000) / windowMs
  action.timeScale = Math.min(_MAX_ONE_SHOT_SPEED, Math.max(1, speed))
}

function _crossfade(store: MixerStore, next: AnimName, fadeSec: number): void {
  if (store.current === next) {
    // Re-trigger: consecutive IDENTICAL one-shot requests (bow shot → bow shot,
    // staff cast → staff cast) land here because the state never changes — the
    // finished clamped action must replay or "the animation doesn't fire".
    const cur = store.actions[next]
    if (cur && _ONE_SHOTS.has(next) && next !== 'Death' && !cur.isRunning()) {
      cur.reset()
      fitOneShotToWindow(cur, next)
      cur.play()
    }
    return
  }
  const from = store.actions[store.current]
  const to = store.actions[next]
  if (!to) return
  store.current = next
  to.reset()
  const isOneShot = _ONE_SHOTS.has(next)
  if (isOneShot) {
    to.setLoop(THREE.LoopOnce, 1)
    to.clampWhenFinished = true
    fitOneShotToWindow(to, next)
  } else {
    to.setLoop(THREE.LoopRepeat, Infinity)
    to.clampWhenFinished = false
    to.timeScale = 1
  }
  to.play()
  if (from) from.crossFadeTo(to, fadeSec, true)
}

function _firstAvailable(store: MixerStore, names: AnimName[]): AnimName {
  return names.find((name) => !!store.actions[name]) ?? 'Attacking_Idle'
}

/** Pure animation decision used by the runtime and semantic mapping tests. */
export function selectCharacterAnimation(
  available: ReadonlySet<AnimName>,
  state: CharAnimState,
): AnimName {
  const first = (names: AnimName[]): AnimName =>
    names.find((name) => available.has(name)) ?? 'Attacking_Idle'
  const weapon = state.activeWeapon ?? 'sword'

  if (!state.alive) return first(['Death', 'RecieveHit', 'Attacking_Idle'])
  if (state.respawning) return first(['Respawn', 'Attacking_Idle', 'Idle'])
  if (state.landing) return first(['Land', 'Attacking_Idle', 'Idle'])

  if (state.hitReact) {
    return first([
      state.attacking || state.casting ? 'RecieveHit_Attacking' : 'RecieveHit',
      'RecieveHit',
      'Attacking_Idle',
    ])
  }

  if (state.airborne) return first(['Airborne', 'Jump', 'Attacking_Idle'])
  if (state.jumping) return first(['Jump', 'Airborne', 'Attacking_Idle'])
  if (state.rolling) return first(['Roll', 'Run', 'Attacking_Idle'])

  if (state.casting) {
    if (state.channeling) return first(['Channel', 'Staff_Cast', 'Punch', 'Attacking_Idle'])
    return first(['Staff_Cast', 'Channel', 'Punch', 'Attacking_Idle'])
  }

  if (state.bowCharging) return first(['Bow_Draw', 'Bow_Idle', 'Attacking_Idle', 'Idle'])

  // Parrying takes priority over attacking — a player who parries while the swing
  // arc is still visible must show Parry_Block, not the attack animation.
  if (state.parrying) return first(['Parry_Block', 'Sword_Idle', 'Attacking_Idle', 'Idle'])

  if (state.attacking) {
    if (weapon === 'bow') return first(['Bow_Release', 'Dagger_Attack', 'Punch'])
    if (weapon === 'staff') return first(['Staff_Cast', 'Punch', 'Dagger_Attack'])
    // Cycle the swing through every variant the pack actually shipped, so a
    // 3-hit combo does not replay the same two frames. The Mixamo packs carry
    // 4-6 attack clips each; only two were ever played.
    const variants: AnimName[] = (
      ['Dagger_Attack', 'Dagger_Attack2', 'Dagger_Attack3'] as AnimName[]
    ).filter((n) => available.has(n))
    const pick =
      variants.length > 0 ? variants[(state.attackVariant ?? 0) % variants.length]! : null
    return first([...(pick ? [pick] : []), 'Dagger_Attack', 'Punch', 'Attacking_Idle'])
  }

  if (state.moving) {
    const isWalking = state.speed !== undefined && state.speed < 3.0
    return isWalking
      ? first(['Walk', 'Run', 'Attacking_Idle'])
      : first(['Run', 'Walk', 'Attacking_Idle'])
  }

  const weaponIdle: AnimName =
    weapon === 'bow' ? 'Bow_Idle' : weapon === 'staff' ? 'Staff_Idle' : 'Sword_Idle'
  return first([weaponIdle, 'Attacking_Idle', 'Idle', 'Run'])
}

function _chooseAnimState(store: MixerStore, state: CharAnimState): AnimName {
  const available = new Set(
    ANIM_NAMES.filter((name) => !!store.actions[name]),
  ) as ReadonlySet<AnimName>
  return selectCharacterAnimation(available, state)
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Gameplay state passed each frame to drive the animation state machine. */
export interface CharAnimState {
  moving: boolean
  alive: boolean
  activeWeapon?: string
  attacking?: boolean
  attackVariant?: number
  airborne?: boolean
  bowCharging?: boolean
  casting?: boolean
  parrying?: boolean
  hitReact?: boolean
  respawning?: boolean
  speed?: number
  jumping?: boolean
  landing?: boolean
  channeling?: boolean
  rolling?: boolean
}

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

/** Advance the AnimationMixer by deltaS seconds. Applies recoil timeScale logic. */
export function tickCharacterMixer(charGroup: THREE.Group, deltaS: number): void {
  const store = charGroup.userData['mixerStore'] as MixerStore | undefined
  if (!store) return

  // Recoil phase: if the window expired, restore timeScale to forward.
  if (store.recoilUntilMs > 0 && performance.now() >= store.recoilUntilMs) {
    store.recoilUntilMs = 0
    const cur = store.current
    if (cur === 'Dagger_Attack' || cur === 'Dagger_Attack2') {
      const action = store.actions[cur]
      // Restore the window-fitted speed, not a flat 1 — resetting to 1 would
      // drop the swing back to its original 2 s length mid-strike.
      if (action) fitOneShotToWindow(action, cur)
    }
  }

  // Clamp delta to 100 ms to avoid large jumps after a tab-switch.
  store.mixer.update(Math.min(deltaS, 0.1))

  // Keep the base body's head-only clip plane at the character's neck line. The
  // plane is world-space (normal +Y); it clips everything below the neck so only
  // the FullBody head/face survives while the outfit provides the body. It must
  // FOLLOW the head bone — a fixed height decapitates crouched poses (run lean,
  // death on the ground).
  const clip = charGroup.userData['headClipPlane'] as THREE.Plane | undefined
  if (clip) {
    const headBone = charGroup.userData['headBone'] as THREE.Object3D | undefined
    if (headBone) {
      // Follow the head bone's position AND orientation: the plane cuts at the
      // neck perpendicular to the head's up-axis, so the face survives in ANY
      // pose (upright run, lying death) while the base body stays hidden.
      headBone.getWorldPosition(_clipTmp)
      headBone.getWorldQuaternion(_clipQTmp)
      _clipNTmp.set(0, 1, 0).applyQuaternion(_clipQTmp).normalize()
      clip.setFromNormalAndCoplanarPoint(_clipNTmp, _clipTmp.addScaledVector(_clipNTmp, -0.12))
    } else {
      clip.normal.set(0, 1, 0)
      const offset = (charGroup.userData['headClipOffset'] as number) ?? 1.4
      clip.constant = -(charGroup.getWorldPosition(_clipTmp).y + offset)
    }
  }
}

const _clipTmp = new THREE.Vector3()
const _clipNTmp = new THREE.Vector3()
const _clipQTmp = new THREE.Quaternion()

/** Drive the animation state machine based on current gameplay state. */
export function setCharAnimState(charGroup: THREE.Group, state: CharAnimState): void {
  const store = charGroup.userData['mixerStore'] as MixerStore | undefined
  if (!store) return
  const target = _chooseAnimState(store, state)
  const fadeSec =
    target === 'Death' || target === 'Respawn'
      ? 0.25
      : target === 'Dagger_Attack' || target === 'Dagger_Attack2'
        ? 0.04
        : target === 'Punch'
          ? 0.05
          : target === 'RecieveHit' || target === 'RecieveHit_Attacking'
            ? 0.05
            : target === 'Roll'
              ? 0.07
              : target === 'Jump' || target === 'Land'
                ? 0.08
                : target === 'Bow_Release' || target === 'Staff_Cast'
                  ? 0.07
                  : target === 'Bow_Draw'
                    ? 0.12
                    : target === 'Run' || target === 'Walk'
                      ? 0.14
                      : 0.18
  _crossfade(store, target, fadeSec)
}

/**
 * Trigger weapon recoil on hit: briefly plays the attack animation in reverse
 * (blade bounces back), then resumes forward. Call when hitstop lifts.
 */
export function triggerWeaponRecoil(charGroup: THREE.Group, reverseDurationMs = 55): void {
  const store = charGroup.userData['mixerStore'] as MixerStore | undefined
  if (!store) return
  const cur = store.current
  if (cur !== 'Dagger_Attack' && cur !== 'Dagger_Attack2') return
  const action = store.actions[cur]
  if (!action || !action.isRunning()) return
  action.timeScale = -1.5
  store.recoilUntilMs = performance.now() + reverseDurationMs
}

/**
 * Stop and release the AnimationMixer for charGroup.
 * Must be called before removing the group from the scene.
 */
export function disposeCharacterMixer(charGroup: THREE.Group): void {
  const store = charGroup.userData['mixerStore'] as MixerStore | undefined
  if (store) {
    store.mixer.stopAllAction()
    const model = charGroup.userData['charModel'] as THREE.Object3D | undefined
    if (model) store.mixer.uncacheRoot(model)
  }
  delete charGroup.userData['mixerStore']
  delete charGroup.userData['charModel']
  delete charGroup.userData['glbMaterials']
}

/** Build and start the initial idle animation after model installation. */
export function initMixerStore(
  model: THREE.Group,
  clipsByName: Partial<Record<AnimName, THREE.AnimationClip>>,
): MixerStore {
  const mixer = new THREE.AnimationMixer(model)
  const actions: Partial<Record<AnimName, THREE.AnimationAction>> = {}
  for (const name of ANIM_NAMES) {
    const clip = clipsByName[name]
    if (clip) actions[name] = mixer.clipAction(clip)
  }
  const stub: MixerStore = { mixer, actions, current: 'Attacking_Idle', recoilUntilMs: 0 }
  const initial = _firstAvailable(stub, ['Attacking_Idle', 'Idle', 'Run'])
  const initAction = actions[initial]
  if (initAction) {
    initAction.setLoop(THREE.LoopRepeat, Infinity)
    initAction.play()
  }
  return { mixer, actions, current: initial, recoilUntilMs: 0 }
}
