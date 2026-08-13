import { describe, expect, it } from 'vitest'

import { CAPSULE_HALF_WIDTH_M } from '../constants/world.js'

import { clampToArenaBounds } from './collision.js'
import { MAPS } from './map.js'

// D20 (00_truth.md): the arena had no perimeter of any kind — no boxes, no
// clamp, an infinite ground plane — so a player could walk out of the coliseum
// and keep going forever over nothing. It also hid the fact that the FFA
// layout did not fit inside its own building.
describe('every map fits inside its own arena', () => {
  for (const [id, map] of Object.entries(MAPS)) {
    const bound = map.boundsRadius

    it(`${id} declares a perimeter`, () => {
      expect(bound, `${id} has no boundsRadius — a player can run to infinity`).toBeGreaterThan(0)
    })

    it(`${id} spawns every player inside it`, () => {
      const limit = bound! - CAPSULE_HALF_WIDTH_M
      for (const [i, s] of map.spawns.entries()) {
        const r = Math.hypot(s.x, s.z)
        expect(
          r,
          `${id} spawn ${i} at r=${r.toFixed(2)} is outside ${limit.toFixed(2)}`,
        ).toBeLessThanOrEqual(limit)
      }
    })

    it(`${id} keeps its geometry inside it`, () => {
      // A box hanging past the wall is a platform floating over the void — the
      // exact defect that only became visible once the arena had an edge.
      for (const box of map.boxes) {
        const far = Math.max(
          Math.hypot(box.minX, box.minZ),
          Math.hypot(box.minX, box.maxZ),
          Math.hypot(box.maxX, box.minZ),
          Math.hypot(box.maxX, box.maxZ),
        )
        expect(far, `${id} box corner at r=${far.toFixed(2)}`).toBeLessThanOrEqual(bound! + 0.01)
      }
    })
  }
})

describe('clampToArenaBounds', () => {
  const R = 24.5
  const limit = R - CAPSULE_HALF_WIDTH_M

  it('leaves a body inside the arena alone', () => {
    const pos = { x: 5, z: 5 }
    expect(clampToArenaBounds(pos, null, R)).toBe(false)
    expect(pos.x).toBe(5)
  })

  it('pulls a body back to the wall, keeping its direction', () => {
    const pos = { x: 100, z: 0 }
    expect(clampToArenaBounds(pos, null, R)).toBe(true)
    expect(pos.x).toBeCloseTo(limit, 6)
    expect(pos.z).toBe(0)
  })

  // Removing all velocity would make the wall flypaper. Only the part pushing
  // INTO the wall goes; running along it has to stay possible.
  it('kills the outward velocity and keeps the tangential part', () => {
    const pos = { x: 100, z: 0 }
    const vel = { x: 8, z: 6 }
    clampToArenaBounds(pos, vel, R)
    expect(vel.x).toBeCloseTo(0, 6)
    expect(vel.z).toBeCloseTo(6, 6)
  })

  it('does not accelerate a body already moving back inward', () => {
    const pos = { x: 100, z: 0 }
    const vel = { x: -8, z: 0 }
    clampToArenaBounds(pos, vel, R)
    expect(vel.x).toBeCloseTo(-8, 6)
  })

  it('does nothing without a radius, so an unbounded map stays unbounded', () => {
    const pos = { x: 999, z: 999 }
    expect(clampToArenaBounds(pos, null, undefined)).toBe(false)
    expect(pos.x).toBe(999)
  })

  it('does not divide by zero at the exact centre', () => {
    const pos = { x: 0, z: 0 }
    expect(clampToArenaBounds(pos, null, R)).toBe(false)
    expect(Number.isFinite(pos.x)).toBe(true)
  })
})
