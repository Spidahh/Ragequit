// stats-tracker.ts — Per-match stats accumulation.
// Tracks kills, damage, parries, abilities used for the post-match scoreboard.

export interface MatchStats {
  kills: number
  yourHits: number
  damageDealt: number
  damageTaken: number
  knockups: number
  parries: number
  comboProcs: number
  knockupAttempts: number
  knockupConversions: number
  abilitiesUsed: Record<string, number>
}

export function emptyMatchStats(): MatchStats {
  return {
    kills: 0,
    yourHits: 0,
    damageDealt: 0,
    damageTaken: 0,
    knockups: 0,
    parries: 0,
    comboProcs: 0,
    knockupAttempts: 0,
    knockupConversions: 0,
    abilitiesUsed: {},
  }
}

export function recordAbilityCast(stats: MatchStats, abilityId: string): void {
  stats.abilitiesUsed[abilityId] = (stats.abilitiesUsed[abilityId] ?? 0) + 1
}

export function recordHit(stats: MatchStats, damage: number): void {
  stats.yourHits++
  stats.damageDealt += damage
}

export function recordDamageTaken(stats: MatchStats, damage: number): void {
  stats.damageTaken += damage
}

export function recordKill(stats: MatchStats): void {
  stats.kills++
}

export function recordParry(stats: MatchStats): void {
  stats.parries++
}

export function recordComboProc(stats: MatchStats): void {
  stats.comboProcs++
}

export function recordKnockupAttempt(stats: MatchStats): void {
  stats.knockupAttempts++
}

export function recordKnockupConversion(stats: MatchStats): void {
  stats.knockupConversions++
  stats.knockups++
}

/** Compute a simple real ELO delta given two ratings and the outcome. */
export function computeEloDelta(selfRating: number, opponentRating: number, isWin: boolean): number {
  const K = 32
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - selfRating) / 400))
  const actualScore = isWin ? 1 : 0
  return Math.round(K * (actualScore - expectedScore))
}
