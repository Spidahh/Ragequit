import { describe, expect, it } from 'vitest'

import {
  assembleEndScreen,
  buildScoreboardData,
  type EndPlayerLike,
  type ScoreboardParams,
} from './scoreboard-data.js'
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

// ── assembleEndScreen: multi-player modes ─────────────────────────────────

function playersMap(entries: Record<string, EndPlayerLike>) {
  const m = new Map(Object.entries(entries))
  return {
    get: (id: string) => m.get(id),
    forEach: (cb: (p: EndPlayerLike, id: string) => void) => m.forEach(cb),
  }
}

function baseAssemble(over: Record<string, unknown> = {}) {
  return {
    players: playersMap({
      a: { name: 'ALPHA', classId: 'tank', activeWeapon: 'sword' },
      b: { name: 'BRAVO', classId: 'mage', activeWeapon: 'staff' },
      c: { name: 'CHARLIE', classId: 'archer', activeWeapon: 'bow' },
    }),
    selfId: 'b',
    selfStats: stats(),
    opponentStats: stats(),
    eloDeltas: {},
    soloScores: { a: 5, b: 9, c: 2 } as Record<string, number>,
    teamScores: null as Record<string, number> | null,
    arena: 'gladiators_arena',
    matchMs: 90000,
    mode: 'ffa',
    ...over,
  }
}

describe('assembleEndScreen — FFA', () => {
  it('ranks every player by kills and flags self', () => {
    const d = assembleEndScreen(baseAssemble())
    if (!('rows' in d)) throw new Error('expected multi scoreboard')
    expect(d.rows.map((r) => r.name)).toEqual(['BRAVO', 'ALPHA', 'CHARLIE'])
    expect(d.rows[0]!.isSelf).toBe(true)
    expect(d.isWin).toBe(true)
    expect(d.showKills).toBe(true)
  })

  it('is a loss when someone else tops the table (or on a tie)', () => {
    const lost = assembleEndScreen(baseAssemble({ soloScores: { a: 9, b: 9, c: 2 } }))
    if (!('rows' in lost)) throw new Error('expected multi scoreboard')
    expect(lost.isWin).toBe(false)
  })
})

describe('assembleEndScreen — 5v5', () => {
  it('groups red before blue and decides by team totals', () => {
    const d = assembleEndScreen(
      baseAssemble({
        mode: '5v5',
        players: playersMap({
          a: { name: 'ALPHA', team: 'red' },
          b: { name: 'BRAVO', team: 'blue' },
          c: { name: 'CHARLIE', team: 'red' },
        }),
        soloScores: null,
        teamScores: { red: 12, blue: 9 },
      }),
    )
    if (!('rows' in d)) throw new Error('expected multi scoreboard')
    expect(d.rows.map((r) => r.team)).toEqual(['red', 'red', 'blue'])
    expect(d.isWin).toBe(false) // self (BRAVO) is blue, red wins
    expect(d.title).toContain('12')
    expect(d.showKills).toBe(false) // 5v5 never reported per-player kills
  })
})

describe('assembleEndScreen — duel fallback', () => {
  it('still builds the classic winner/loser panel for 1v1', () => {
    const d = assembleEndScreen(
      baseAssemble({
        mode: 'duel_arena',
        players: playersMap({
          a: { name: 'ALPHA', classId: 'tank', activeWeapon: 'sword' },
          b: { name: 'BRAVO', classId: 'mage', activeWeapon: 'staff' },
        }),
        eloDeltas: { b: 18, a: -18 },
      }),
    )
    if ('rows' in d) throw new Error('expected duel scoreboard')
    expect(d.isWin).toBe(true)
    expect(d.eloDelta).toBe(18)
    expect(d.winner.name).toBe('BRAVO')
  })
})
