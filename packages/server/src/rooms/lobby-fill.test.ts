import { describe, expect, it } from 'vitest'

import { botFillTarget, pickBalancedTeam, spawnIndexFor } from './lobby-fill.js'

// Locks the "every mode is playable solo" rules: FFA and 5v5 must fill with
// bots when the client asks, teams must stay balanced, and team spawns must
// split the ring so red and blue never start intermixed.

describe('botFillTarget', () => {
  it('fills nothing when the client did not ask (non-training)', () => {
    expect(botFillTarget('ffa', false, 8)).toBe(0)
    expect(botFillTarget('5v5', false, 10)).toBe(0)
    expect(botFillTarget('duel_arena', false, 2)).toBe(0)
  })

  it('training always gets its sparring bot', () => {
    expect(botFillTarget('training', false, 2)).toBe(1)
  })

  it('duel fills exactly one opponent', () => {
    expect(botFillTarget('duel_arena', true, 2)).toBe(1)
  })

  it('FFA fills a small brawl, capped to leave a human slot', () => {
    expect(botFillTarget('ffa', true, 8)).toBe(5)
    expect(botFillTarget('ffa', true, 4)).toBe(3) // cap: maxClients - 1
    expect(botFillTarget('ffa', true, 8, '7')).toBe(7) // env override
  })

  it('5v5 fills every slot but one so both teams are complete', () => {
    expect(botFillTarget('5v5', true, 10)).toBe(9)
  })
})

describe('pickBalancedTeam', () => {
  it('joins the smaller team, red on ties', () => {
    expect(pickBalancedTeam(0, 0)).toBe('red')
    expect(pickBalancedTeam(1, 0)).toBe('blue')
    expect(pickBalancedTeam(1, 1)).toBe('red')
    expect(pickBalancedTeam(3, 4)).toBe('red')
  })

  it('alternates to a 5/5 split when 10 players join in sequence', () => {
    let red = 0
    let blue = 0
    for (let i = 0; i < 10; i++) {
      if (pickBalancedTeam(red, blue) === 'red') red++
      else blue++
    }
    expect(red).toBe(5)
    expect(blue).toBe(5)
  })
})

describe('spawnIndexFor', () => {
  it('non-team modes rotate by join order', () => {
    expect(spawnIndexFor('', 0, 0, 8)).toBe(0)
    expect(spawnIndexFor('', 0, 3, 8)).toBe(3)
    expect(spawnIndexFor('', 0, 9, 8)).toBe(1)
  })

  it('red spawns on the first half of the ring, blue on the second', () => {
    const spawnCount = 8
    const redIdx = [0, 1, 2, 3].map((n) => spawnIndexFor('red', n, 99, spawnCount))
    const blueIdx = [0, 1, 2, 3].map((n) => spawnIndexFor('blue', n, 99, spawnCount))
    for (const i of redIdx) expect(i).toBeLessThan(4)
    for (const i of blueIdx) expect(i).toBeGreaterThanOrEqual(4)
    // no two teammates share a slot while the half has room
    expect(new Set(redIdx).size).toBe(4)
    expect(new Set(blueIdx).size).toBe(4)
  })

  it('wraps within its own half when a team outgrows it', () => {
    expect(spawnIndexFor('red', 4, 99, 8)).toBe(0)
    expect(spawnIndexFor('blue', 5, 99, 8)).toBe(5)
  })

  it('degrades safely with tiny spawn lists', () => {
    expect(spawnIndexFor('red', 2, 0, 1)).toBe(0)
    expect(spawnIndexFor('blue', 0, 0, 1)).toBe(0)
  })
})
