import { describe, expect, it } from 'vitest'

import { placePointForward, clampPointToRange } from './targeting-geometry.js'

describe('targeting-geometry', () => {
  describe('placePointForward', () => {
    it('places a point `distance` away horizontally at the origin height', () => {
      const o = { x: 1, y: 2, z: 3 }
      const p = placePointForward(o, 0, 5)
      expect(p.y).toBe(2)
      expect(Math.hypot(p.x - o.x, p.z - o.z)).toBeCloseTo(5)
    })
  })

  describe('clampPointToRange', () => {
    const o = { x: 0, y: 0, z: 0 }
    it('leaves a point within range unchanged', () => {
      const p = { x: 2, y: 1, z: 0 }
      expect(clampPointToRange(o, p, 5)).toEqual(p)
    })
    it('clamps a point beyond range to the range boundary, keeping y', () => {
      const c = clampPointToRange(o, { x: 10, y: 7, z: 0 }, 4)
      expect(Math.hypot(c.x, c.z)).toBeCloseTo(4)
      expect(c.y).toBe(7)
    })
    it('range 0 is a no-op', () => {
      const p = { x: 10, y: 0, z: 0 }
      expect(clampPointToRange(o, p, 0)).toEqual(p)
    })
  })
})
