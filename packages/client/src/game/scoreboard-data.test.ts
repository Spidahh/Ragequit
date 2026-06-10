import { describe, expect, it } from 'vitest'

import { buildScoreboardData, type ScoreboardParams } from './scoreboard-data.js'
import { emptyMatchStats, type MatchStats } from './stats-tracker.js'

function stats(over: Partial<MatchStats> = {}): MatchStats {
  return { ...emptyMatchStats(), ...over }
}

function params(over: Partial<ScoreboardParams> = {}): ScoreboardParams {
  return {
    selfName: 'ME',
    opponentName: 'YOU',
    selfBuild: 'TANK · SWORD',
    oppBuild: 'MAGE · STAFF',
    selfStats: stats({ kills: 3, damageDealt: 200, knockupConversions: 2, knockupAttempts: 4 }),
    opponentStats: stats({ kills: 1, damageDealt: 90 }),
    isWin: true,
    arena: 'duel_arena',
    matchMs: 60000,
    mode: 'ranked',
    eloBefore: 1000,
    eloDelta: 18,
    ...over,
  }
}

describe('buildScoreboardData', () => {
  it('puts self in winner slot on a win and upper-cases arena', () => {
    const d = buildScoreboardData(params({ isWin: true }))
    expect(d.winner.name).toBe('ME')
    expect(d.loser.name).toBe('YOU')
    expect(d.arena).toBe('DUEL_ARENA')
    expect(d.winner.knockups).toBe('2 / 4')
    expect(d.league).toBe('RANKED')
    expect(d.rounds).toBe('3 - 1 kill')
    expect(d.eloDelta).toBe(18)
    expect(d.isWin).toBe(true)
  })

  it('puts opponent in winner slot on a loss', () => {
    const d = buildScoreboardData(params({ isWin: false }))
    expect(d.winner.name).toBe('YOU')
    expect(d.loser.name).toBe('ME')
    expect(d.isWin).toBe(false)
  })

  it('training mode uses practice labels and zero elo', () => {
    const d = buildScoreboardData(params({ mode: 'training' }))
    expect(d.rounds).toBe('PRATICA')
    expect(d.league).toBe('NO ELO')
    expect(d.eloDelta).toBe(0)
  })

  it('falls back to 120000 ms for a non-positive duration', () => {
    expect(buildScoreboardData(params({ matchMs: 0 })).matchMs).toBe(120000)
    expect(buildScoreboardData(params({ matchMs: 45000 })).matchMs).toBe(45000)
  })

  it('maps per-player stat fields into the summary', () => {
    const d = buildScoreboardData(params({ isWin: true }))
    expect(d.winner.kills).toBe(3)
    expect(d.winner.damageDealt).toBe(200)
    expect(d.loser.damageDealt).toBe(90)
  })
})
