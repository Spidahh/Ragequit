// Local, read-only prediction of "would the server reject this cast?".
//
// The client used to fire the success flash on EVERY keypress, before any
// check, so an ability on cooldown or one you could not afford confirmed
// visually and was then retracted a round-trip later by an AbilityFailed.
// That is the worst kind of feedback: it says yes, then takes it back.
//
// This never blocks the send — the server stays authoritative. It only decides
// whether to show a success flash or an immediate reason, using the SAME
// replicated fields the server validates against, so it cannot disagree by
// more than replication lag.

import type { AbilityDef } from '@ragequit/shared'

export type CastBlockReason = 'cooldown' | 'cost' | 'gcd'

export interface CastPreflightState {
  tickNow: number
  /** Tick the ability itself comes off cooldown (0 = ready). */
  abilityReadyAtTick: number
  /** Tick the global cooldown ends (0 = ready). */
  gcdReadyAtTick: number
  mana: number
  stamina: number
}

/**
 * Returns why the cast will be refused, or null when it should go through.
 *
 * Deliberately does NOT check the equipped weapon: the server auto-swaps for a
 * weapon-bound cast, so a "wrong weapon" press is legal and must still feel
 * like a successful action.
 */
export function castBlockReason(
  def: AbilityDef | undefined,
  state: CastPreflightState,
): CastBlockReason | null {
  if (!def) return null
  if (state.abilityReadyAtTick > state.tickNow) return 'cooldown'
  if (state.gcdReadyAtTick > state.tickNow) return 'gcd'
  if (state.mana < def.costMana || state.stamina < def.costStamina) return 'cost'
  return null
}

/** Short Italian explanation shown next to the crosshair. */
export function castBlockLabel(reason: CastBlockReason, def: AbilityDef | undefined): string {
  if (reason === 'cooldown') return 'IN RICARICA'
  if (reason === 'gcd') return 'ATTENDI IL RECUPERO'
  const needsMana = (def?.costMana ?? 0) > 0
  const needsStamina = (def?.costStamina ?? 0) > 0
  if (needsMana && needsStamina) return 'RISORSE INSUFFICIENTI'
  return needsMana ? 'MANA INSUFFICIENTE' : 'STAMINA INSUFFICIENTE'
}
