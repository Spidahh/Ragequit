// Reaction to the server's AbilityCasted broadcast.
//
// Extracted from main.ts's connect() (file-budget: AGENTS.md). Split by who
// cast it: the local player already got audio + flash on the INPUT frame, so
// this only adds what needs server confirmation (windup state, viewmodel,
// swing arc); remote players get everything here, spatialised.

import { ABILITY_DEFS } from '@ragequit/shared'

export interface AbilityCastedMessage {
  casterId: string
  abilityId: string
  atTick: number
}

export interface AbilityCastedDeps {
  selfSessionId: () => string | undefined
  trackCast: (abilityId: string, element: string) => void
  showReadout: (abilityId: string, mode: 'windup' | 'released') => void
  /** Local first-person staff recoil. */
  onSelfWindupStarted: () => void
  onSelfDash: (untilMs: number) => void
  remoteWorldPos: (casterId: string) => { x: number; y: number; z: number } | null | undefined
  playRemoteCast: (x: number, y: number, z: number, element: string) => void
  triggerRemoteCast: (casterId: string, weapon: string) => void
  triggerRemoteRoll: (casterId: string, untilMs: number) => void
}

export function onAbilityCasted(deps: AbilityCastedDeps, msg: AbilityCastedMessage): void {
  const def = ABILITY_DEFS[msg.abilityId]
  const element = def?.element ?? 'none'
  const isDash =
    def?.effects?.some((e) => e.kind === 'move' && (e as { mode?: string }).mode === 'dash') ??
    false
  const now = performance.now()

  if (msg.casterId === deps.selfSessionId()) {
    // No cast sound here: it already played locally on the input frame, and
    // replaying it would double it a full round-trip late.
    deps.trackCast(msg.abilityId, element)
    deps.showReadout(msg.abilityId, def && def.windupSec > 0 ? 'windup' : 'released')
    if (def && def.windupSec > 0) deps.onSelfWindupStarted()
    if (isDash) deps.onSelfDash(now + 400)
    return
  }

  const pos = deps.remoteWorldPos(msg.casterId)
  if (pos) deps.playRemoteCast(pos.x, pos.y, pos.z, element)
  deps.triggerRemoteCast(msg.casterId, def?.weapon ?? 'none')
  if (isDash) deps.triggerRemoteRoll(msg.casterId, now + 400)
}
