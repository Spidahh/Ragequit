import { describe, expect, it } from 'vitest'

import { bestSpawnIndex } from './spawn-selection.js'

const SPAWNS = [
  { x: 0, z: 0 },
  { x: 10, z: 0 },
  { x: 20, z: 0 },
]

function enemy(x: number, z: number, alive = true) {
  return { transform: { x, z }, alive }
}

describe('bestSpawnIndex', () => {
  it('returns 0 for a single spawn', () => {
    expect(bestSpawnIndex([{ x: 5, z: 5 }], new Map(), 'me', 3)).toBe(0)
  })

  it('falls back to join-order assignment when there are no living enemies', () => {
    const players = new Map([['me', enemy(0, 0)]]) // only self
    expect(bestSpawnIndex(SPAWNS, players, 'me', 1)).toBe(1)
    expect(bestSpawnIndex(SPAWNS, players, 'me', 4)).toBe(4 % 3) // wraps
  })

  it('ignores dead enemies for the fallback', () => {
    const players = new Map([
      ['me', enemy(0, 0)],
      ['corpse', enemy(20, 0, false)],
    ])
    expect(bestSpawnIndex(SPAWNS, players, 'me', 2)).toBe(2)
  })

  it('picks the spawn farthest from the nearest living enemy', () => {
    const players = new Map([
      ['me', enemy(0, 0)],
      ['foe', enemy(0, 0)], // sits on spawn 0
    ])
    // spawn 2 (x=20) is farthest from the enemy at x=0.
    expect(bestSpawnIndex(SPAWNS, players, 'me', 0)).toBe(2)
  })
})
