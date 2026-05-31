// combat-feedback.ts — Combat-state helpers for main.ts.
//
// These are small utilities that encapsulate combat state transitions
// without needing access to the full main.ts scope. They are called
// from onHit / onDeath / onKillStreak handlers.

/** Track consecutive hits from the attacker perspective. */
export interface ComboState {
  count: number
  lastHitMs: number
}

export const COMBO_RESET_MS = 2500

export function updateComboOnHit(combo: ComboState, now: number): number {
  if (now - combo.lastHitMs > COMBO_RESET_MS) combo.count = 0
  combo.count++
  combo.lastHitMs = now
  return combo.count
}

export function resetCombo(combo: ComboState): void {
  combo.count = 0
  combo.lastHitMs = 0
}

/**
 * Classify a hit into a tier for audio/visual feedback.
 * Returns: 'parried' | 'air_punish' | 'crack' | 'heavy' | 'normal'
 */
export type HitTier = 'parried' | 'air_punish' | 'crack' | 'heavy' | 'normal'

export function classifyHit(
  didParry: boolean,
  isAirPunish: boolean,
  comboCount: number,
): HitTier {
  if (didParry) return 'parried'
  if (isAirPunish) return 'air_punish'
  if (comboCount >= 3) return 'crack'
  if (comboCount === 2) return 'heavy'
  return 'normal'
}

/**
 * Classify a cause string into a profile string for the impact pool.
 * Returns one of: 'melee' | 'projectile' | 'magic' | 'zone'
 */
export function causeToImpactProfile(cause: string): 'melee' | 'projectile' | 'magic' | 'zone' {
  if (cause.startsWith('zone:')) return 'zone'
  if (cause.startsWith('combo:')) return 'magic'
  const raw = cause.startsWith('ability:') ? cause.slice(8) : cause
  const melee = ['sword_m1','uppercut','whirlwind','gap_closer','bleed_strike','guard_break','rending_dash']
  if (melee.includes(raw)) return 'melee'
  if (raw === 'bow') return 'projectile'
  return 'magic'
}

/**
 * Return shake intensity for a hit on the victim side.
 * Melee shakes more than ranged (felt directly on screen).
 */
export function victimShakeIntensity(cause: string, damage: number): number {
  const raw = cause.startsWith('ability:') ? cause.slice(8) : cause
  const isMelee = ['sword_m1','uppercut','whirlwind','gap_closer','bleed_strike','guard_break','rending_dash'].includes(raw)
  return isMelee
    ? Math.min(1.4, damage / 20)
    : Math.min(0.9, damage / 30)
}
