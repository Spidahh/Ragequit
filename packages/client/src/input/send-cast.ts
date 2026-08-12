// Sending an ability cast, plus the feedback that must fire on the SAME frame
// as the input. Extracted from main.ts (file-budget: 02_TECH/08).
//
// The feedback split matters: previously every keypress flashed "fired" before
// any check, so an ability on cooldown or one the player could not afford
// confirmed and was retracted a round-trip later. Here the local pre-flight
// decides between a success flash and an immediate reason. The message is sent
// either way — the server remains authoritative.

import { ABILITY_DEFS, MessageTypes, type ClientCastMessage } from '@ragequit/shared'

import { castBlockLabel, castBlockReason } from './cast-preflight.js'

export interface SendCastDeps {
  /** null when not connected — the call becomes a no-op. */
  getRoom: () => { send: (type: string, msg: unknown) => void } | null
  getAim: () => { yaw: number; pitch: number }
  getAimPoint: (abilityId: string) => { x: number; y: number; z: number } | undefined
  getSchemaTick: () => number
  /** The replicated self player, or null when not in a room yet. */
  getSelfPlayer: () => {
    abilityCooldowns?: { get?: (id: string) => number | undefined }
    gcdReadyAtTick?: number
    mana?: number
    stamina?: number
  } | null
  /** `blockedLabel` is null when the cast is predicted to succeed. */
  onSent: (
    abilityId: string,
    blockedLabel: string | null,
    targetPoint: { x: number; y: number; z: number } | null,
  ) => void
}

export function sendAbilityCast(deps: SendCastDeps, abilityId: string, tick: number): void {
  const room = deps.getRoom()
  if (!room) return
  const aim = deps.getAim()
  const msg: ClientCastMessage = {
    abilityId,
    atTick: tick,
    targetYaw: aim.yaw,
    targetPitch: aim.pitch,
    targetPoint: deps.getAimPoint(abilityId),
  }
  room.send(MessageTypes.Cast, msg)

  const def = ABILITY_DEFS[abilityId]
  const self = deps.getSelfPlayer()
  const blocked = castBlockReason(def, {
    tickNow: deps.getSchemaTick(),
    abilityReadyAtTick: Number(self?.abilityCooldowns?.get?.(abilityId) ?? 0),
    gcdReadyAtTick: Number(self?.gcdReadyAtTick ?? 0),
    // Missing schema (not connected yet) must never predict a failure.
    mana: Number(self?.mana ?? Infinity),
    stamina: Number(self?.stamina ?? Infinity),
  })
  deps.onSent(abilityId, blocked ? castBlockLabel(blocked, def) : null, msg.targetPoint ?? null)
}
