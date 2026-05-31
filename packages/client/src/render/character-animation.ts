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
  | 'Run'
  | 'Walk'
  | 'Dagger_Attack'
  | 'Dagger_Attack2'
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
  'Run',
  'Walk',
  'Dagger_Attack',
  'Dagger_Attack2',
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
  Run: 'Sprint_Loop',
  Walk: 'Walk_Loop',
  Dagger_Attack: 'Sword_Attack',
  Dagger_Attack2: 'Sword_Attack',
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

function _crossfade(store: MixerStore, next: AnimName, fadeSec: number): void {
  if (store.current === next) return
  const from = store.actions[store.current]
  const to = store.actions[next]
  if (!to) return
  store.current = next
  to.reset()
  const isOneShot =
    next === 'Dagger_Attack' ||
    next === 'Dagger_Attack2' ||
    next === 'Death' ||
    next === 'Punch' ||
    next === 'Jump' ||
    next === 'Land' ||
    next === 'Bow_Release' ||
    next === 'Staff_Cast' ||
    next === 'Respawn' ||
    next === 'RecieveHit' ||
    next === 'RecieveHit_Attacking' ||
    next === 'Roll'
  if (isOneShot) {
    to.setLoop(THREE.LoopOnce, 1)
    to.clampWhenFinished = true
  } else {
    to.setLoop(THREE.LoopRepeat, Infinity)
    to.clampWhenFinished = false
  }
  to.play()
  if (from) from.crossFadeTo(to, fadeSec, true)
}

function _firstAvailable(store: MixerStore, names: AnimName[]): AnimName {
  return names.find((name) => !!store.actions[name]) ?? 'Attacking_Idle'
}

function _chooseAnimState(store: MixerStore, state: CharAnimState): AnimName {
  const weapon = state.activeWeapon ?? 'sword'

  if (!state.alive) return _firstAvailable(store, ['Death', 'RecieveHit', 'Attacking_Idle'])
  if (state.respawning) return _firstAvailable(store, ['Respawn', 'Attacking_Idle', 'Idle'])
  if (state.landing) return _firstAvailable(store, ['Land', 'Attacking_Idle', 'Idle'])

  if (state.hitReact) {
    return _firstAvailable(store, [
      state.attacking || state.casting ? 'RecieveHit_Attacking' : 'RecieveHit',
      'RecieveHit',
      'Attacking_Idle',
    ])
  }

  if (state.airborne) return _firstAvailable(store, ['Airborne', 'Jump', 'Attacking_Idle'])
  if (state.jumping) return _firstAvailable(store, ['Jump', 'Airborne', 'Attacking_Idle'])
  if (state.rolling) return _firstAvailable(store, ['Roll', 'Run', 'Attacking_Idle'])

  if (state.casting && weapon === 'staff') {
    if (state.channeling)
      return _firstAvailable(store, ['Channel', 'Staff_Cast', 'Punch', 'Attacking_Idle'])
    return _firstAvailable(store, ['Staff_Cast', 'Channel', 'Punch', 'Attacking_Idle'])
  }

  if (state.bowCharging) return _firstAvailable(store, ['Bow_Draw', 'Attacking_Idle', 'Idle'])

  // Parrying takes priority over attacking — a player who parries while the swing
  // arc is still visible must show Parry_Block, not the attack animation.
  if (state.parrying) return _firstAvailable(store, ['Parry_Block', 'Attacking_Idle', 'Idle'])

  if (state.attacking) {
    if (weapon === 'bow') return _firstAvailable(store, ['Bow_Release', 'Dagger_Attack', 'Punch'])
    return _firstAvailable(store, [
      state.attackVariant && state.attackVariant % 2 === 1 ? 'Dagger_Attack2' : 'Dagger_Attack',
      'Dagger_Attack',
      'Punch',
      'Attacking_Idle',
    ])
  }

  if (state.moving) {
    const isWalking = state.speed !== undefined && state.speed < 3.0
    return isWalking
      ? _firstAvailable(store, ['Walk', 'Run', 'Attacking_Idle'])
      : _firstAvailable(store, ['Run', 'Walk', 'Attacking_Idle'])
  }

  return _firstAvailable(store, ['Attacking_Idle', 'Idle', 'Run'])
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
      if (action) action.timeScale = 1
    }
  }

  // Clamp delta to 100 ms to avoid large jumps after a tab-switch.
  store.mixer.update(Math.min(deltaS, 0.1))
}

/** Drive the animation state machine based on current gameplay state. */
export function setCharAnimState(charGroup: THREE.Group, state: CharAnimState): void {
  const store = charGroup.userData['mixerStore'] as MixerStore | undefined
  if (!store) return
  const target = _chooseAnimState(store, state)
  const fadeSec =
    target === 'Death' || target === 'Respawn' ? 0.25
    : target === 'Dagger_Attack' || target === 'Dagger_Attack2' ? 0.04
    : target === 'Punch' ? 0.05
    : target === 'RecieveHit' || target === 'RecieveHit_Attacking' ? 0.05
    : target === 'Roll' ? 0.07
    : target === 'Jump' || target === 'Land' ? 0.08
    : target === 'Bow_Release' || target === 'Staff_Cast' ? 0.07
    : target === 'Bow_Draw' ? 0.12
    : target === 'Run' || target === 'Walk' ? 0.14
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
