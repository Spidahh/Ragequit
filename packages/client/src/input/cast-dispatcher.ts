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
  isInstantCast: (id: string) => boolean
  hidePlacementVisual: () => void
  sendCast: (abilityId: string, tick: number) => void
  showShootFlash: () => void
}

export interface CastDispatchParams {
  inp: GameInputState
  bowCharge: BowChargeRef
  room: RoomLike
  schemaTick: number
  combatLive: boolean
  dead: boolean
  airborne: boolean
  activeWeapon: string
}

export interface CastDispatcherController {
  activateAbilitySlot: (slotIdx: number, fromWheel: boolean) => void
  beginPlacementPreview: (abilityId: string) => void
  cancelPlacementPreview: () => void
  clearQueue: () => void
  getPrimedSlotIdx: () => number | null
  getPlacementAbilityId: () => string | null
  dispatch: (params: CastDispatchParams) => void
}

const STAFF_FIRE_THROTTLE_MS = STAFF_M1_CADENCE_SEC * 1000

export function initCastDispatcher({
  getLoadout,
  isInstantCast,
  hidePlacementVisual,
  sendCast,
  showShootFlash,
}: CastDispatcherOptions): CastDispatcherController {
  let primedSlotIdx: number | null = null
  let placementAbilityId: string | null = null
  let lastStaffFireMs = 0
  const abilityCastQueue: string[] = []

  function cancelPlacementPreview(): void {
    placementAbilityId = null
    hidePlacementVisual()
  }

  function beginPlacementPreview(abilityId: string): void {
    if (!ABILITY_DEFS[abilityId]) return
    placementAbilityId = abilityId
    abilityCastQueue.length = 0
  }

  function activateAbilitySlot(slotIdx: number, fromWheel: boolean): void {
    const id = getLoadout()[slotIdx] ?? ''
    if (!id || !ABILITY_DEFS[id]) return
    if (fromWheel) {
      cancelPlacementPreview()
      primedSlotIdx = slotIdx
      return
    }
    if (isInstantCast(id)) {
      cancelPlacementPreview()
      abilityCastQueue.push(id)
      return
    }
    beginPlacementPreview(id)
    primedSlotIdx = null
  }

  function clearQueue(): void {
    abilityCastQueue.length = 0
    primedSlotIdx = null
  }

  function dispatch({
    inp, bowCharge, room,
    schemaTick, combatLive, dead, airborne, activeWeapon,
  }: CastDispatchParams): void {
    if (!combatLive) {
      clearQueue()
      if (placementAbilityId) cancelPlacementPreview()
    }

    // --- Primed ability fire (placement confirm) ---------------------------------
    if (combatLive && inp.lmbPressEdge && placementAbilityId && !dead && !airborne) {
      sendCast(placementAbilityId, schemaTick + 1)
      cancelPlacementPreview()
      inp.lmbPressEdge = false
      inp.lmbDown = false
    }

    // --- Primed ability fire (wheel selection) -----------------------------------
    if (combatLive && inp.lmbPressEdge && primedSlotIdx !== null && !dead && !airborne) {
      const loadout = getLoadout()
      const id = loadout[primedSlotIdx] ?? ''
      primedSlotIdx = null
      if (id) {
        if (isInstantCast(id)) sendCast(id, schemaTick + 1)
        else beginPlacementPreview(id)
      }
      inp.lmbPressEdge = false
      inp.lmbDown = false
    }

    // --- LMB weapon behaviour ---------------------------------------------------
    // Bow charge release is allowed even while airborne (design: bow can fire mid-air).
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
        showShootFlash()
      }
    }

    if (combatLive && !dead && !airborne) {
      if (activeWeapon === 'sword') {
        if (inp.lmbPressEdge) {
          // Swing yaw: use inp.mouseYaw directly — it is the horizontal facing direction
          // and equals the forward direction of both the character mesh and the server
          // hit cone. Deriving from camera.quaternion in TPS mode gave incorrect pitch
          // contamination when the camera orbited at an angle.
          const msg: ClientSwingMessage = { atTick: schemaTick + 1, yaw: inp.mouseYaw }
          room.send(MessageTypes.Swing, msg)
          showShootFlash()
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
          showShootFlash()
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
    }

    if (combatLive && !dead && !airborne) {
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
    // Airborne here means knockup/launch lock, not a normal jump.
    if (airborne || !combatLive) abilityCastQueue.length = 0
    if (abilityCastQueue.length > 0 && combatLive && !dead && !airborne) {
      const id = abilityCastQueue.shift()!
      sendCast(id, schemaTick + 1)
    }
    while (abilityCastQueue.length > 2) abilityCastQueue.shift()

    // Clear per-tick edges.
    inp.lmbPressEdge   = false
    inp.lmbReleaseEdge = false
    inp.rmbPressEdge   = false
    inp.rmbReleaseEdge = false
  }

  return {
    activateAbilitySlot,
    beginPlacementPreview,
    cancelPlacementPreview,
    clearQueue,
    getPrimedSlotIdx: () => primedSlotIdx,
    getPlacementAbilityId: () => placementAbilityId,
    dispatch,
  }
}
