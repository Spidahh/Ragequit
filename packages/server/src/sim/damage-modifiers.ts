// Outgoing damage modifier chain (curse / Fury stacks / Fury surge / Flow).
// Extracted from GameRoom.drainDamage. Multipliers compound in FLOAT and the
// result is rounded ONCE at the end — sequential per-step Math.round compounded
// rounding drift (audit [27]: 10 → ×0.85 → 9 → ×1.08 → 10, instead of
// 10 × 0.85 × 1.08 = 9.18 → 9).
import { CURSE_OUTGOING_DAMAGE_MULT, type Player } from '@ragequit/shared'

import {
  FLOW_DAMAGE_BONUS_FRAC,
  FURY_SURGE_DAMAGE_BONUS,
  type ClassMechanicRuntime,
  type StatusRuntime,
} from './index.js'

// Melee ability ids — gate the Fury damage bonuses.
const MELEE_ABILITY_IDS = new Set([
  'uppercut',
  'whirlwind',
  'gap_closer',
  'bleed_strike',
  'guard_break',
  'rending_dash',
])

export interface DamageModifierContext {
  statuses: StatusRuntime
  mechanics: ClassMechanicRuntime
}

/**
 * Apply the attacker's outgoing damage modifiers to a base damage value and
 * return the final INTEGER damage. Side effects (surge consumption, flow
 * consumption, surge stagger-slow) match the original inline logic.
 */
export function applyOutgoingDamageModifiers(
  ctx: DamageModifierContext,
  base: number,
  cause: string,
  attacker: Player | undefined,
  attackerId: string,
  victimId: string,
): number {
  let applied = base
  // Curse of Weakness: attacker's outgoing damage is reduced.
  if (attacker && ctx.statuses.hasStatus(attacker, 'curse')) {
    applied *= CURSE_OUTGOING_DAMAGE_MULT
  }
  if (attacker) {
    // Ability causes are prefixed: 'ability:uppercut'. Strip the prefix before
    // checking the set (sword_m1 is a raw cause with no prefix).
    const rawCause = cause.startsWith('ability:') ? cause.slice(8) : cause
    const isMeleeHit = rawCause === 'sword_m1' || MELEE_ABILITY_IDS.has(rawCause)
    if (isMeleeHit) {
      // Fury stack bonus: +8% per stack for Tank melee hits.
      const furyMult = ctx.mechanics.getMeleeDamageMult(attacker)
      if (furyMult > 1) applied *= furyMult
      // Fury surge: +40% burst on next melee hit after 5 stacks consumed.
      if (ctx.mechanics.consumeSurge(attacker)) {
        applied *= 1 + FURY_SURGE_DAMAGE_BONUS
        // Brief stagger: apply a 0.3 s slow as a lightweight stagger proxy.
        ctx.statuses.applyToPlayer(victimId, 'slow', 0.3, 1, attackerId, 0.5)
      }
    }
    // Flow +20% damage on the flow-amplified cast's first hit.
    if (cause !== 'sword_m1' && ctx.mechanics.consumeFlowDamagePending(attackerId)) {
      applied *= 1 + FLOW_DAMAGE_BONUS_FRAC
    }
  }
  return Math.round(applied)
}
