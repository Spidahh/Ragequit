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

/**
 * Return shake intensity for a hit on the victim side.
 * Melee shakes more than ranged (felt directly on screen).
 */
export function victimShakeIntensity(cause: string, damage: number): number {
  const raw = cause.startsWith('ability:') ? cause.slice(8) : cause
  const isMelee = [
    'sword_m1',
    'uppercut',
    'whirlwind',
    'gap_closer',
    'bleed_strike',
    'guard_break',
    'rending_dash',
  ].includes(raw)
  return isMelee ? Math.min(1.4, damage / 20) : Math.min(0.9, damage / 30)
}
