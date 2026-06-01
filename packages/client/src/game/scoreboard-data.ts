// ---------------------------------------------------------------------------
// Scoreboard data assembly.
//
// Pure construction of the end-of-match ScoreboardData from the two players'
// running MatchStats plus resolved match context (names, builds, win/elo, mode).
// Extracted from main.ts applyMatchPhase, where the per-player summary literal
// was duplicated four times (winner/loser × isWin branches). The surrounding
// orchestration (schema lookups, win determination, menu.showScoreboard) stays
// in main.ts; this is the data shape, unit-tested.
// ---------------------------------------------------------------------------
import type { PlayerSummary, ScoreboardData } from '../endgame.js'

import type { MatchStats } from './stats-tracker.js'

export interface ScoreboardParams {
  selfName: string
  opponentName: string
  selfBuild: string
  oppBuild: string
  selfStats: MatchStats
  opponentStats: MatchStats
  isWin: boolean
  /** Raw arena/map id — upper-cased here. */
  arena: string
  /** Raw match duration (ms); a non-positive value falls back to 120000. */
  matchMs: number
  /** Room mode — 'training' switches to practice labels and zero ELO. */
  mode: string
  eloBefore: number
  eloDelta: number
}

function summary(stats: MatchStats, name: string, build: string): PlayerSummary {
  return {
    name,
    build,
    kills: stats.kills,
    damageDealt: stats.damageDealt,
    damageTaken: stats.damageTaken,
    knockups: `${stats.knockupConversions} / ${stats.knockupAttempts}`,
    parries: stats.parries,
    comboProcs: stats.comboProcs,
  }
}

export function buildScoreboardData(p: ScoreboardParams): ScoreboardData {
  const isTraining = p.mode === 'training'
  const self = summary(p.selfStats, p.selfName, p.selfBuild)
  const opponent = summary(p.opponentStats, p.opponentName, p.oppBuild)
  return {
    arena: p.arena.toUpperCase(),
    matchMs: p.matchMs > 0 ? p.matchMs : 120000,
    rounds: isTraining ? 'PRATICA' : `${p.selfStats.kills} - ${p.opponentStats.kills} kill`,
    league: isTraining ? 'NO ELO' : 'RANKED',
    winner: p.isWin ? self : opponent,
    loser: p.isWin ? opponent : self,
    eloBefore: p.eloBefore,
    eloDelta: isTraining ? 0 : p.eloDelta,
  }
}
