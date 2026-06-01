// ---------------------------------------------------------------------------
// Hit → match-stats folding.
//
// Pure logic extracted from main.ts's onHit handler: takes an incoming Hit
// message plus resolved context (who is self/attacker, airborne flags, display
// names) and folds it into the running self/opponent MatchStats, returning the
// deathcam "last hit details" when the local player was the victim. The only
// side effect is the in-place mutation of the two stats objects — everything
// else is derived from the inputs, so it is unit-tested in isolation.
// ---------------------------------------------------------------------------
import type { ServerHitMessage } from '@ragequit/shared'

import type { MatchStats } from './stats-tracker.js'

export interface HitStatsContext {
  amISelf: boolean
  amIAttacker: boolean
  isAirPunish: boolean
  /** Local player's session id (''/undefined-safe). */
  selfId: string
  /** Victim was airborne at hit time — credits self a knockup conversion. */
  victimAirborne: boolean
  /** Self was airborne at hit time — credits opponent a knockup conversion. */
  selfAirborne: boolean
  /** Resolved attacker display name (for the deathcam line). */
  attackerName: string
  /** Resolved ability/cause display name (for the deathcam line). */
  abilityName: string
}

export interface LastHitDetails {
  killer: string
  ability: string
  element: string
  damage: number
}

/**
 * Fold a Hit into the running self/opponent stats (mutates both in place).
 * Returns deathcam details when the local player was the victim, else null.
 */
export function accumulateHitStats(
  self: MatchStats,
  opponent: MatchStats,
  msg: ServerHitMessage,
  ctx: HitStatsContext,
): LastHitDetails | null {
  if (msg.damage <= 0) return null

  if (msg.didParry) {
    if (ctx.amISelf) self.parries++
    else opponent.parries++
    return null
  }

  const isComboKnockup = msg.cause === 'uppercut' || ctx.isAirPunish
  const isCombo = msg.cause.startsWith('combo:')

  if (ctx.amIAttacker && !ctx.amISelf) {
    self.damageDealt += msg.damage
    self.yourHits++
    if (isComboKnockup) self.knockups++
    if (isCombo) self.comboProcs++
    if (ctx.victimAirborne) self.knockupConversions++
    return null
  }

  if (ctx.amISelf && !ctx.amIAttacker) {
    self.damageTaken += msg.damage
    if (ctx.selfAirborne) opponent.knockupConversions++
    return {
      killer: ctx.attackerName,
      ability: ctx.abilityName,
      element: msg.element || 'PHYSICAL',
      damage: msg.damage,
    }
  }

  // Neither self-as-attacker nor self-as-victim — other players in the arena.
  if (msg.attackerId !== ctx.selfId && msg.attackerId !== '') {
    opponent.damageDealt += msg.damage
    opponent.yourHits++
    if (isComboKnockup) opponent.knockups++
    if (isCombo) opponent.comboProcs++
  }
  if (msg.victimId !== ctx.selfId) opponent.damageTaken += msg.damage
  return null
}
