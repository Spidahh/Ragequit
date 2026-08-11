import { GameState, Player } from '@ragequit/shared'
import { describe, expect, it, beforeEach } from 'vitest'

import { MatchManager } from './MatchManager.js'

// Synthetic host driving the state machine — a real GameState with two
// pre-spawned players. resetAllPlayers is a noop for the test (we only care
// about phase transitions + roundWins + ELO).
function makeHost() {
  const state = new GameState()
  const a = new Player()
  a.id = 'A'
  a.hp = 200
  state.players.set('A', a)
  const b = new Player()
  b.id = 'B'
  b.hp = 200
  state.players.set('B', b)
  const broadcasts: { type: string; message: unknown }[] = []
  const host = {
    state,
    resetAllPlayers: () => {
      a.hp = 200
      b.hp = 200
      a.alive = true
      b.alive = true
    },
    broadcast: (type: string, message: unknown) => broadcasts.push({ type, message }),
  }
  return { state, a, b, host, broadcasts }
}

describe('MatchManager', () => {
  let r: ReturnType<typeof makeHost>
  let mm: MatchManager
  beforeEach(() => {
    r = makeHost()
    mm = new MatchManager(r.host)
  })

  it('transitions lobby → countdown when 2 players present', () => {
    expect(r.state.phase).toBe('lobby')
    mm.tick()
    expect(r.state.phase).toBe('countdown')
  })

  it('transitions countdown → live after 3 s of ticks', () => {
    mm.tick() // → countdown
    expect(r.state.phase).toBe('countdown')
    // Drive 3 s + 1 tick of server time.
    for (let i = 0; i < 60 * 3 + 5; i++) {
      r.state.tick += 1
      mm.tick()
    }
    expect(r.state.phase).toBe('live')
  })

  it('records a round win on death notification', () => {
    mm.tick()
    for (let i = 0; i < 60 * 3 + 5; i++) {
      r.state.tick += 1
      mm.tick()
    }
    expect(r.state.phase).toBe('live')
    mm.notifyDeath('A', 'B')
    expect(r.state.phase).toBe('roundEnd')
    expect(r.state.roundWins.get('B')).toBe(1)
  })

  it('keeps training live after a death so controls remain testable', () => {
    r.state.mode = 'training'
    mm.tick()
    for (let i = 0; i < 60 * 3 + 5; i++) {
      r.state.tick += 1
      mm.tick()
    }
    expect(r.state.phase).toBe('live')
    mm.notifyDeath('A', 'B')
    expect(r.state.phase).toBe('live')
    expect(r.state.roundWins.get('B')).toBeUndefined()
  })

  it('cycles BO5 to matchEnd at 3 wins', () => {
    // Force 3 round wins for B.
    for (let round = 0; round < 3; round++) {
      // Drive countdown.
      mm.tick()
      for (let i = 0; i < 60 * 3 + 5; i++) {
        r.state.tick += 1
        mm.tick()
      }
      expect(r.state.phase).toBe('live')
      mm.notifyDeath('A', 'B')
      expect(r.state.phase).toBe('roundEnd')
      // Drive roundEnd hold.
      for (let i = 0; i < 60 * 2 + 5; i++) {
        r.state.tick += 1
        mm.tick()
      }
    }
    expect(r.state.phase).toBe('matchEnd')
    expect(r.state.roundWins.get('B')).toBe(3)
  })

  it('updates ELO at matchEnd (winner gains, loser loses)', () => {
    const r2 = makeHost()
    const mm2 = new MatchManager(r2.host)
    // Drive to match end with B winning 3-0.
    for (let round = 0; round < 3; round++) {
      mm2.tick()
      for (let i = 0; i < 60 * 3 + 5; i++) {
        r2.state.tick += 1
        mm2.tick()
      }
      mm2.notifyDeath('A', 'B')
      for (let i = 0; i < 60 * 2 + 5; i++) {
        r2.state.tick += 1
        mm2.tick()
      }
    }
    const ratingB = mm2.ratingFor('B')
    const ratingA = mm2.ratingFor('A')
    // K=25, baseline 1000, equal Elo: winner +12, loser -13.
    expect(ratingB).toBeGreaterThan(1000)
    expect(ratingA).toBeLessThan(1000)
    // K=25 / 2 = 12.5 → rounded to 13 (winner) and 12 (loser) depending on
    // floor/ceil on the rounding of the half-step. Check magnitude only.
    expect(Math.abs(ratingB - 1000)).toBeGreaterThanOrEqual(12)
    expect(Math.abs(ratingB - 1000)).toBeLessThanOrEqual(13)
    expect(Math.abs(1000 - ratingA)).toBeGreaterThanOrEqual(12)
    expect(Math.abs(1000 - ratingA)).toBeLessThanOrEqual(13)
  })

  it('higher-HP wins on round timeout (live for 2 min)', () => {
    mm.tick()
    for (let i = 0; i < 60 * 3 + 5; i++) {
      r.state.tick += 1
      mm.tick()
    }
    expect(r.state.phase).toBe('live')
    // A is hurt mid-round.
    r.a.hp = 50
    r.b.hp = 150
    // Drive 2 min of ticks → round timeout.
    for (let i = 0; i < 60 * 120 + 5; i++) {
      r.state.tick += 1
      mm.tick()
    }
    expect(r.state.phase).toBe('roundEnd')
    expect(r.state.roundWins.get('B')).toBe(1)
  })
})

describe('kill-cap match timer fallback', () => {
  it('ends an FFA match after the time ceiling even with no kills', () => {
    const r = makeHost()
    r.state.mode = 'ffa'
    const mm = new MatchManager(r.host)
    mm.tick() // lobby → countdown
    for (let i = 0; i < 60 * 3 + 5; i++) {
      r.state.tick += 1
      mm.tick()
    }
    expect(r.state.phase).toBe('live')
    // 10 minutes of live play with zero kills → matchEnd, not an endless lobby.
    r.state.tick += 10 * 60 * 60 + 5
    mm.tick()
    expect(r.state.phase).toBe('matchEnd')
  })

  it('never applies the ceiling to 1v1 round modes (round timer owns those)', () => {
    const r = makeHost()
    r.state.mode = 'duel_arena'
    const mm = new MatchManager(r.host)
    mm.tick()
    for (let i = 0; i < 60 * 3 + 5; i++) {
      r.state.tick += 1
      mm.tick()
    }
    expect(r.state.phase).toBe('live')
    r.state.tick += 10 * 60 * 60 + 5
    mm.tick()
    // Round timer fires first (roundEnd), not a whole-match end.
    expect(r.state.phase).not.toBe('matchEnd')
  })
})
