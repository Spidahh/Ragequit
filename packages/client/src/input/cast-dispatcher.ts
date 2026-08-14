import {
  ABILITY_DEFS,
  MessageTypes,
  STAFF_M1_CADENCE_SEC,
  type ClientChargeReleaseMessage,
  type ClientChargeStartMessage,
  type ClientFireStaffMessage,
  type ClientParryPressMessage,
  type ClientParryReleaseMessage,
  type ClientSwingMessage,
} from '@ragequit/shared'

import { type GameInputState } from './game-input.js'

// Opaque ref to the player's local bow-charge timestamps — owned by SelfState.
export interface BowChargeRef {
  bowChargeStartMs: number
  bowChargeServerAcked: boolean
}

// Minimal room interface used by dispatch — avoids importing Colyseus.
interface RoomLike {
  send: (type: string, msg: unknown) => void
}

export interface CastDispatcherOptions {
  getLoadout: () => string[]
  hidePlacementVisual: () => void
  sendCast: (abilityId: string, tick: number) => void
  showShootFlash: (style?: { color?: string; tier?: 'light' | 'normal' | 'heavy' }) => void
  showAbilityReadout?: (abilityId: string, mode: 'primed' | 'placement') => void
  hideAbilityReadout?: () => void
  /** Called immediately when a sword swing is sent — used to trigger
   *  the local swing arc / attack animation without waiting for schema echo. */
  onSwingSent?: () => void
  /** Bow release / staff shot left the client — for input-frame audio. */
  onWeaponFired?: (weapon: 'bow' | 'staff') => void
}

export interface CastDispatchParams {
  inp: GameInputState
  bowCharge: BowChargeRef
  room: RoomLike
  schemaTick: number
  combatLive: boolean
  dead: boolean
  activeWeapon: string
}

export interface CastDispatcherController {
  activateAbilitySlot: (slotIdx: number, fromWheel: boolean) => void
  releaseAbilitySlot: (slotIdx: number) => void
  beginPlacementPreview: (abilityId: string) => void
  cancelPlacementPreview: () => void
  clearQueue: () => void
  getPlacementAbilityId: () => string | null
  dispatch: (params: CastDispatchParams) => void
}

const STAFF_FIRE_THROTTLE_MS = STAFF_M1_CADENCE_SEC * 1000

export function initCastDispatcher({
  getLoadout,
  hidePlacementVisual,
  sendCast,
  showShootFlash,
  showAbilityReadout,
  hideAbilityReadout,
  onSwingSent,
  onWeaponFired,
}: CastDispatcherOptions): CastDispatcherController {
  let placementAbilityId: string | null = null
  let lastStaffFireMs = 0
  const abilityCastQueue: string[] = []

  function cancelPlacementPreview(): void {
    if (placementAbilityId) hideAbilityReadout?.()
    placementAbilityId = null
    hidePlacementVisual()
  }

  function beginPlacementPreview(abilityId: string): void {
    if (!ABILITY_DEFS[abilityId]) return
    placementAbilityId = abilityId
    abilityCastQueue.length = 0
  }

  /**
   * Press the key, the ability happens. That is the whole model.
   *
   * I built the previous one yesterday and it was wrong, so this note is the
   * evidence rather than an opinion. It was "key down shows the shape, key up
   * casts", applied to all 53 abilities. The owner's report, verbatim: "when
   * you switch spell and press left click it doesn't do it", "you can't tell
   * where you're aiming because it disappears", "you can't tell if you have
   * selected a spell". All three are that model:
   *
   *  - the shape existed only while the key was physically down, so on a tap it
   *    flashed for two frames and vanished — hence "it disappears";
   *  - the cast had already left on key-up, so a following left click hit with
   *    the WEAPON — hence "left click doesn't do it";
   *  - and "armed" was a state with no persistent indicator at all.
   *
   * ONLY 7 OF 53 ABILITIES NEED AN AIMING STEP. The split is 14 `self`, 32
   * `forward`, 7 `point`. Self and forward aim with the crosshair you are
   * already looking through — there is nothing to place, so a modal aim state
   * buys them nothing and costs a vanishing indicator. I had imposed a mode on
   * 46 abilities that never needed one.
   *
   * So: `point` abilities enter a PERSISTENT placement that waits for a click
   * and never times out. Everything else fires on the press edge, the way Quake
   * and Overwatch fire an ability, and its shape is shown by the world
   * telegraph at the moment it resolves — which is where a shape teaches you
   * something anyway.
   */
  function activateAbilitySlot(slotIdx: number, _fromWheel = false): void {
    const id = getLoadout()[slotIdx] ?? ''
    const def = ABILITY_DEFS[id]
    if (!id || !def) return

    if (def.targeting === 'point') {
      // Ground-targeted: you genuinely have to choose a spot. Stays up until
      // you click or cancel — no timeout, because a state that expires on its
      // own is a state you cannot trust.
      beginPlacementPreview(id)
      showAbilityReadout?.(id, 'placement')
      return
    }

    cancelPlacementPreview()
    abilityCastQueue.push(id)
  }

  /**
   * Key up. Deliberately does nothing.
   *
   * Kept as a no-op rather than unwired, because the input layer reports slot
   * releases and a silently missing handler is how the previous model's bugs
   * hid. If a hold-to-charge ability ever ships, this is where it goes.
   */
  function releaseAbilitySlot(_slotIdx: number): void {
    /* casting happens on the press edge — see activateAbilitySlot */
  }

  function clearQueue(): void {
    abilityCastQueue.length = 0
  }

  function dispatch({
    inp,
    bowCharge,
    room,
    schemaTick,
    combatLive,
    dead,
    activeWeapon,
  }: CastDispatchParams): void {
    if (!combatLive) {
      clearQueue()
      if (placementAbilityId) cancelPlacementPreview()
    }

    // --- Confirm the previewed cast (LMB) ----------------------------------------
    // LMB only ever means "your weapon" — EXCEPT while an aim preview is
    // actually up, which is bounded and visible.
    //
    // There used to be a second, invisible state: a wheel or hotbar-pip
    // selection set `primedSlotIdx`, which NEVER EXPIRED, so from then on every
    // left click fired that spell instead of your weapon — while the only
    // indicator of it auto-hid after five seconds. That is both halves of the
    // owner's report: "when you switch spell, left click doesn't do it" and
    // "you can't tell whether a spell is selected". The wheels are gone and so
    // is the state.
    if (combatLive && inp.lmbPressEdge && placementAbilityId && !dead) {
      sendCast(placementAbilityId, schemaTick + 1)
      cancelPlacementPreview()
      inp.lmbPressEdge = false
      inp.lmbDown = false
    }

    // --- LMB weapon behaviour ---------------------------------------------------
    // All weapon M1 families stay legal in air unless the server rejects for a
    // specific real state such as death, CC, parry or an explicit air policy.
    if (combatLive && !dead && activeWeapon === 'bow') {
      if (inp.lmbPressEdge) {
        const msg: ClientChargeStartMessage = { atTick: schemaTick + 1 }
        room.send(MessageTypes.ChargeStart, msg)
        bowCharge.bowChargeStartMs = performance.now()
        bowCharge.bowChargeServerAcked = false
      }
      if (inp.lmbReleaseEdge && bowCharge.bowChargeStartMs > 0) {
        const msg: ClientChargeReleaseMessage = {
          atTick: schemaTick + 1,
          yaw: inp.mouseYaw,
          pitch: inp.mousePitch,
        }
        room.send(MessageTypes.ChargeRelease, msg)
        bowCharge.bowChargeStartMs = 0
        bowCharge.bowChargeServerAcked = false
        showShootFlash({ color: '#39ff14', tier: 'heavy' }) // a full draw is a committed shot
        onWeaponFired?.('bow')
      }
    }

    if (combatLive && !dead) {
      if (activeWeapon === 'sword') {
        if (inp.lmbPressEdge) {
          // Swing yaw: use inp.mouseYaw directly — it is the horizontal facing direction
          // and equals the forward direction of both the character mesh and the server
          // hit cone. Deriving from camera.quaternion in TPS mode gave incorrect pitch
          // contamination when the camera orbited at an angle.
          const msg: ClientSwingMessage = { atTick: schemaTick + 1, yaw: inp.mouseYaw }
          room.send(MessageTypes.Swing, msg)
          // Trigger arc + animation immediately (client-side prediction).
          // Without this, the swing arc waits for schema echo (~16 ms) and the
          // attack animation starts late, making the weapon look slower than the hit.
          onSwingSent?.()
          showShootFlash({ color: '#ff3344', tier: 'light' }) // M1 swing: frequent, so keep it subtle
        }
      } else if (activeWeapon === 'staff') {
        const now = performance.now()
        const canFire = now - lastStaffFireMs >= STAFF_FIRE_THROTTLE_MS
        if ((inp.lmbPressEdge || (inp.lmbDown && canFire)) && canFire) {
          const msg: ClientFireStaffMessage = {
            atTick: schemaTick + 1,
            yaw: inp.mouseYaw,
            pitch: inp.mousePitch,
          }
          room.send(MessageTypes.FireStaff, msg)
          lastStaffFireMs = now
          showShootFlash({ color: '#00d0ff', tier: 'light' }) // staff M1 fires fast
          onWeaponFired?.('staff')
        }
      }
    } else if (dead) {
      if (bowCharge.bowChargeStartMs > 0) {
        bowCharge.bowChargeStartMs = 0
        bowCharge.bowChargeServerAcked = false
      }
    }

    // --- Parry (RMB) -----------------------------------------------------------
    if (combatLive && inp.rmbPressEdge && placementAbilityId) {
      cancelPlacementPreview()
      inp.rmbPressEdge = false
      inp.rmbReleaseEdge = false
      // This RMB press was consumed by the cancel — suppress the held-button m2
      // flag too, or simStep would send m2:true and the server starts a parry.
      inp.rmbDown = false
    }

    if (combatLive && !dead) {
      if (inp.rmbPressEdge) {
        const msg: ClientParryPressMessage = { atTick: schemaTick + 1 }
        room.send(MessageTypes.ParryPress, msg)
      }
      if (inp.rmbReleaseEdge) {
        const msg: ClientParryReleaseMessage = { atTick: schemaTick + 1 }
        room.send(MessageTypes.ParryRelease, msg)
      }
    }

    // --- Drain queued ability casts (one per tick, max 2 queued) ---------------
    // Capping to 1/tick prevents macro-spam; cap 2 lets a "queue next cast"
    // feel responsive during short windups (standard arena-game practice).
    // Also flush while dead so slot keys pressed during the respawn wait don't
    // auto-fire a buffered cast (wasting a cooldown) on the first alive tick.
    if (!combatLive || dead) abilityCastQueue.length = 0
    if (abilityCastQueue.length > 0 && combatLive && !dead) {
      const id = abilityCastQueue.shift()!
      sendCast(id, schemaTick + 1)
    }
    while (abilityCastQueue.length > 2) abilityCastQueue.shift()

    // Clear per-tick edges.
    inp.lmbPressEdge = false
    inp.lmbReleaseEdge = false
    inp.rmbPressEdge = false
    inp.rmbReleaseEdge = false
  }

  return {
    activateAbilitySlot,
    releaseAbilitySlot,
    beginPlacementPreview,
    cancelPlacementPreview,
    clearQueue,
    getPlacementAbilityId: () => placementAbilityId,
    dispatch,
  }
}
