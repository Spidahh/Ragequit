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

// Per-stat record helpers were removed — match stats are folded in one place by
// accumulateHitStats (game/hit-stats.ts), which is the single source of truth.

/** Compute a simple real ELO delta given two ratings and the outcome. */
export function computeEloDelta(
  selfRating: number,
  opponentRating: number,
  isWin: boolean,
): number {
  const K = 32
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - selfRating) / 400))
  const actualScore = isWin ? 1 : 0
  return Math.round(K * (actualScore - expectedScore))
}
