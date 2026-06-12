import { describe, expect, it } from 'vitest'

import { resolveMapId, testDummySpawn, testPlayerSpawn, testRoomMaxClients } from './test-room.js'

// Locks the Test Room layout that the owner asked for: an empty map, the 4 class
// dummies in a well-spaced ground row in front of the player. Regressions here are
// exactly what kept stacking / overlapping the dummies, so they get a test.

describe('test-room placement', () => {
  it('reserves one slot per class dummy plus the human', () => {
    expect(testRoomMaxClients(2, 4)).toBe(5)
    // never shrinks an already-larger cap
    expect(testRoomMaxClients(8, 4)).toBe(8)
  })

  it('spreads the 4 dummies 4 m apart in a row at z=0, centred on x=0', () => {
    const base = { x: 0, y: 1.9, z: 8 }
    const xs = [0, 1, 2, 3].map((botNum) => testDummySpawn(base, botNum, 4).x)
    expect(xs).toEqual([-6, -2, 2, 6])
    // all on the same ground row, never stacked
    for (const botNum of [0, 1, 2, 3]) {
      const s = testDummySpawn(base, botNum, 4)
      expect(s.z).toBe(0)
      expect(s.y).toBe(1.9) // preserves the spawn height (stays on the ground)
    }
    // adjacent dummies are always 4 m apart — no overlap
    for (let i = 1; i < xs.length; i++) expect(xs[i]! - xs[i - 1]!).toBe(4)
  })

  it('puts the human a few metres back, centred', () => {
    const s = testPlayerSpawn({ x: 9, y: 1.9, z: -3 })
    expect(s.x).toBe(0)
    expect(s.z).toBe(8)
    expect(s.y).toBe(1.9)
  })

  it('routes the Test Room to the empty test_room map, else falls back by mode', () => {
    expect(resolveMapId('training', undefined, 'test')).toBe('test_room')
    expect(resolveMapId('training', undefined, 'competent')).toBe('duel_arena')
    expect(resolveMapId('training', undefined, 'novice')).toBe('duel_arena')
    expect(resolveMapId('ffa', undefined, 'x')).toBe('gladiators_arena')
    expect(resolveMapId('5v5', undefined, 'x')).toBe('gladiators_arena')
    expect(resolveMapId('blockout', undefined, 'x')).toBe('blockout')
    expect(resolveMapId('duel_arena', undefined, 'x')).toBe('duel_arena')
    // an explicit map option wins for non-test rooms
    expect(resolveMapId('training', 'custom_map', 'competent')).toBe('custom_map')
    // ...but the Test Room always forces test_room, even if a map option is passed
    expect(resolveMapId('training', 'custom_map', 'test')).toBe('test_room')
  })
})
