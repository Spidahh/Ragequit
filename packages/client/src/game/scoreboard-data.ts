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
import { ELO_STARTING } from '@ragequit/shared'

import type { MultiScoreboard, MultiScoreRow, PlayerSummary, ScoreboardData } from '../endgame.js'

import { computeEloDelta, type MatchStats } from './stats-tracker.js'

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
    abilitiesUsed: stats.abilitiesUsed,
  }
}

export function buildScoreboardData(p: ScoreboardParams): ScoreboardData {
  const isTraining = p.mode === 'training'
  const self = summary(p.selfStats, p.selfName, p.selfBuild)
  const opponent = summary(p.opponentStats, p.opponentName, p.oppBuild)
  return {
    arena: p.arena.toUpperCase(),
    matchMs: p.matchMs > 0 ? p.matchMs : 120000,
    isWin: p.isWin,
    rounds: isTraining ? 'PRATICA' : `${p.selfStats.kills} - ${p.opponentStats.kills} kill`,
    league: isTraining ? 'NO ELO' : 'RANKED',
    winner: p.isWin ? self : opponent,
    loser: p.isWin ? opponent : self,
    eloBefore: p.eloBefore,
    eloDelta: isTraining ? 0 : p.eloDelta,
  }
}

// ── Full end-screen assembly (duel AND multi-player modes) ─────────────────
// Moved out of main.ts applyMatchPhase so FFA/5v5 get a real ranked table
// instead of being collapsed into the 1v1 winner/loser layout.

/** Minimal shape of a schema Player the end screen needs. */
export interface EndPlayerLike {
  name?: string
  classId?: string
  activeWeapon?: string
  team?: string
}
interface PlayersLike {
  get(id: string): EndPlayerLike | undefined
  forEach(cb: (p: EndPlayerLike, id: string) => void): void
}

export interface AssembleEndScreenParams {
  players: PlayersLike | null | undefined
  selfId: string
  selfStats: MatchStats
  opponentStats: MatchStats
  /** Server ELO deltas from the final Score broadcast (sessionId → delta). */
  eloDeltas: Record<string, number>
  /** Last per-player kill map (FFA) / team totals (5v5) seen from Score. */
  soloScores: Record<string, number> | null
  teamScores: Record<string, number> | null
  arena: string
  matchMs: number
  mode: string
}

function buildLabel(p: EndPlayerLike | undefined): string {
  return `${(p?.classId ?? 'drift').toUpperCase()} · ${(p?.activeWeapon ?? 'sword').toUpperCase()}`
}

export function assembleEndScreen(p: AssembleEndScreenParams): ScoreboardData | MultiScoreboard {
  if (p.mode === 'ffa' || p.mode === '5v5') return assembleMulti(p)

  const selfSchema = p.players?.get(p.selfId)
  let otherId = ''
  p.players?.forEach((_pl, sid) => {
    if (sid !== p.selfId) otherId = sid
  })
  const otherSchema = otherId ? p.players?.get(otherId) : undefined

  // Winner via server ELO deltas (authoritative) → fall back to kill count.
  const selfEloDelta = p.eloDeltas[p.selfId]
  const oppEloDelta = otherId ? p.eloDeltas[otherId] : undefined
  const isWin =
    selfEloDelta !== undefined
      ? selfEloDelta > 0
      : oppEloDelta !== undefined
        ? oppEloDelta < 0
        : p.selfStats.kills > p.opponentStats.kills

  const eloBefore = ELO_STARTING // real per-player ELO from Supabase — TODO when auth is complete
  const eloDelta =
    selfEloDelta !== undefined ? selfEloDelta : computeEloDelta(eloBefore, ELO_STARTING, isWin)

  return buildScoreboardData({
    selfName: selfSchema?.name || 'Player',
    opponentName: otherSchema?.name || 'Opponent',
    selfBuild: buildLabel(selfSchema),
    oppBuild: buildLabel(otherSchema),
    selfStats: p.selfStats,
    opponentStats: p.opponentStats,
    isWin,
    arena: p.arena,
    matchMs: p.matchMs,
    mode: p.mode,
    eloBefore,
    eloDelta,
  })
}

function assembleMulti(p: AssembleEndScreenParams): MultiScoreboard {
  const rows: MultiScoreRow[] = []
  p.players?.forEach((pl, sid) => {
    rows.push({
      name: pl.name || sid.slice(0, 6),
      build: buildLabel(pl),
      kills: p.soloScores?.[sid] ?? 0,
      isSelf: sid === p.selfId,
      team: pl.team === 'red' || pl.team === 'blue' ? pl.team : '',
    })
  })
  if (p.mode === '5v5') {
    // Group by team (red first), kills desc inside each team.
    rows.sort((a, b) => (a.team !== b.team ? (a.team === 'red' ? -1 : 1) : b.kills - a.kills))
  } else {
    rows.sort((a, b) => b.kills - a.kills)
  }
  const red = p.teamScores?.['red'] ?? 0
  const blue = p.teamScores?.['blue'] ?? 0
  const selfTeam = p.players?.get(p.selfId)?.team ?? ''
  const isWin =
    p.mode === '5v5'
      ? selfTeam === 'red'
        ? red > blue
        : blue > red
      : rows.length > 0 && rows[0]!.isSelf && rows[0]!.kills > (rows[1]?.kills ?? -1)
  return {
    kind: 'multi',
    arena: p.arena.toUpperCase(),
    matchMs: p.matchMs > 0 ? p.matchMs : 120000,
    isWin,
    title: p.mode === '5v5' ? `ROSSO ${red} — ${blue} BLU` : 'TUTTI CONTRO TUTTI',
    showKills: p.mode !== '5v5' || Boolean(p.soloScores),
    rows,
  }
}
