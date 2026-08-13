import { describe, expect, it } from 'vitest'

import { isCapsuleBlocked2D } from './collision.js'

// A tall box centred at the origin (2x2 footprint, 0..4 tall).
const BOXES = [{ minX: -1, maxX: 1, minY: 0, maxY: 4, minZ: -1, maxZ: 1 }]

// These cases moved here with the function itself: it left the server so the
// client's dash ghost could be exact instead of approximate.
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
