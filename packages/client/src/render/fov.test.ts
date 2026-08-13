import { describe, expect, it } from 'vitest'

import { hFovToVFov, vFovToHFov } from './fov.js'

// The camera was fed a HORIZONTAL setting straight into three.js, which wants
// VERTICAL. A slider reading 100 produced 129.5 degrees horizontal at 16:9 —
// a fisheye in which an enemy at 15 m is a handful of pixels and free aim, a
// pillar of this game, is physically impossible.
describe('FOV is horizontal outside, vertical inside', () => {
  const WIDE = 16 / 9

  it('converts the shipped default to a sane vertical angle', () => {
    // 100 horizontal at 16:9 is ~67.7 vertical. Fed in raw it was 100
    // VERTICAL, which is 129.5 horizontal — nearly twice the world sideways.
    expect(hFovToVFov(100, WIDE)).toBeCloseTo(67.67, 1)
    expect(vFovToHFov(100, WIDE)).toBeCloseTo(129.5, 1)
  })

  it('round-trips', () => {
    for (const h of [70, 90, 100, 110, 120]) {
      expect(vFovToHFov(hFovToVFov(h, WIDE), WIDE)).toBeCloseTo(h, 4)
    }
  })

  // Same horizontal FOV must show the same amount of WORLD sideways on every
  // monitor; only the vertical angle changes. Feeding vertical straight in did
  // the opposite — an ultrawide silently got a wider game.
  it('keeps horizontal constant across aspect ratios', () => {
    for (const aspect of [4 / 3, 16 / 10, 16 / 9, 21 / 9, 32 / 9]) {
      expect(vFovToHFov(hFovToVFov(103, aspect), aspect)).toBeCloseTo(103, 4)
    }
  })

  it('narrows vertically as the screen gets wider, never the reverse', () => {
    const v43 = hFovToVFov(103, 4 / 3)
    const v169 = hFovToVFov(103, 16 / 9)
    const v219 = hFovToVFov(103, 21 / 9)
    expect(v169).toBeLessThan(v43)
    expect(v219).toBeLessThan(v169)
  })

  it('clamps absurd input instead of producing a broken matrix', () => {
    expect(hFovToVFov(0, WIDE)).toBeGreaterThan(0)
    expect(hFovToVFov(9999, WIDE)).toBeLessThan(180)
    expect(Number.isFinite(hFovToVFov(103, 0))).toBe(true)
  })
})
