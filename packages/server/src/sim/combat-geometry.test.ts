import { describe, expect, it } from 'vitest'

import {
  pointInsideWall,
  isCapsuleBlocked2D,
  hasLineOfSight,
  spellImpactPushDistance,
  impactPushDirection,
} from './combat-geometry.js'

// A tall box centred at the origin (2x2 footprint, 0..4 tall).
const BOX = { minX: -1, maxX: 1, minY: 0, maxY: 4, minZ: -1, maxZ: 1 }
const BOXES = [BOX]

describe('combat-geometry', () => {
  describe('pointInsideWall', () => {
    it('point at the wall origin is inside', () => {
      expect(pointInsideWall(0, 0, 0, 2)).toBe(true)
    })
    it('point beyond the wall half-width is outside', () => {
      // yaw 0: `along` axis is -dz; width 2 => |along| must be <= 1.
      expect(pointInsideWall(0, -2, 0, 2)).toBe(false)
    })
    it('point off the wall perpendicular (>0.6) is outside', () => {
      expect(pointInsideWall(1, 0, 0, 2)).toBe(false)
    })
  })

  describe('isCapsuleBlocked2D', () => {
    it('capsule overlapping the box (matching Y) is blocked', () => {
      expect(isCapsuleBlocked2D(BOXES, 0, 2, 0)).toBe(true)
    })
    it('capsule far away is clear', () => {
      expect(isCapsuleBlocked2D(BOXES, 10, 2, 10)).toBe(false)
    })
    it('capsule above the box Y span is clear', () => {
      expect(isCapsuleBlocked2D(BOXES, 0, 100, 0)).toBe(false)
    })
    it('no boxes means never blocked', () => {
      expect(isCapsuleBlocked2D([], 0, 2, 0)).toBe(false)
    })
  })

  describe('hasLineOfSight', () => {
    it('clear when the segment misses all boxes', () => {
      expect(hasLineOfSight(BOXES, { x: -5, y: 2, z: 5 }, { x: 5, y: 2, z: 5 })).toBe(true)
    })
    it('blocked when the segment crosses a box', () => {
      expect(hasLineOfSight(BOXES, { x: -5, y: 2, z: 0 }, { x: 5, y: 2, z: 0 })).toBe(false)
    })
  })

  describe('spellImpactPushDistance', () => {
    it('zone causes push a small fixed amount', () => {
      expect(spellImpactPushDistance('zone:flame_wall')).toBe(0.16)
    })
    it('dot/status causes push the smallest amount', () => {
      expect(spellImpactPushDistance('dot:burn')).toBe(0.1)
      expect(spellImpactPushDistance('status:slow')).toBe(0.1)
    })
    it('unknown ability causes no push', () => {
      expect(spellImpactPushDistance('ability:__nope__')).toBe(0)
      expect(spellImpactPushDistance('bow')).toBe(0)
    })
  })

  describe('impactPushDirection', () => {
    it('points from attacker to victim (normalized)', () => {
      const d = impactPushDirection(0, 0, 3, 0, 0)
      expect(d.x).toBeCloseTo(1)
      expect(d.z).toBeCloseTo(0)
    })
    it('falls back to the attacker facing when overlapping', () => {
      const d = impactPushDirection(0, 0, 0, 0, 0)
      // Just needs to be a unit-ish vector, not NaN.
      expect(Number.isFinite(d.x)).toBe(true)
      expect(Number.isFinite(d.z)).toBe(true)
      expect(Math.hypot(d.x, d.z)).toBeGreaterThan(0.5)
    })
  })
})
