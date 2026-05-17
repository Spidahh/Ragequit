import { describe, expect, it } from 'vitest'

import { ANTI_CHEAT_LIMITS, RateLimiter, isMovementPlausible } from './AntiCheat.js'

describe('RateLimiter', () => {
  it('allows messages up to the per-channel cap', () => {
    const r = new RateLimiter()
    const cap = ANTI_CHEAT_LIMITS['cast']!.maxInWindow
    let allowed = 0
    for (let i = 0; i < cap; i++) {
      if (r.allow('A', 'cast', 1000)) allowed++
    }
    expect(allowed).toBe(cap)
  })

  it('rejects messages above the cap inside the window', () => {
    const r = new RateLimiter()
    const cap = ANTI_CHEAT_LIMITS['cast']!.maxInWindow
    for (let i = 0; i < cap; i++) r.allow('A', 'cast', 1000)
    expect(r.allow('A', 'cast', 1500)).toBe(false)
  })

  it('rolls the window — accepts again after windowMs elapses', () => {
    const r = new RateLimiter()
    const cap = ANTI_CHEAT_LIMITS['swing']!.maxInWindow
    for (let i = 0; i < cap; i++) r.allow('A', 'swing', 1000)
    expect(r.allow('A', 'swing', 1500)).toBe(false)
    expect(r.allow('A', 'swing', 2100)).toBe(true)
  })

  it('forgetClient drops state', () => {
    const r = new RateLimiter()
    const cap = ANTI_CHEAT_LIMITS['cast']!.maxInWindow
    for (let i = 0; i < cap; i++) r.allow('A', 'cast', 1000)
    expect(r.allow('A', 'cast', 1500)).toBe(false)
    r.forgetClient('A')
    expect(r.allow('A', 'cast', 1500)).toBe(true)
  })

  it('treats unknown channels as unlimited (no config = pass-through)', () => {
    const r = new RateLimiter()
    for (let i = 0; i < 1000; i++) {
      expect(r.allow('A', 'no_such_channel', 1000)).toBe(true)
    }
  })
})

describe('isMovementPlausible', () => {
  it('accepts movement within speed × dt + tolerance', () => {
    expect(isMovementPlausible(0, 0, 0.15, 0, 16.66, 9)).toBe(true)
  })

  it('rejects teleport (huge delta in 1 tick)', () => {
    expect(isMovementPlausible(0, 0, 100, 100, 16.66, 9)).toBe(false)
  })

  it('honours the tolerance band (1 m/s) for prediction drift', () => {
    // 16.66 ms * (9 + 1) m/s = 0.1666 m max. 0.16 delta is inside the band.
    expect(isMovementPlausible(0, 0, 0.16, 0, 16.66, 9, 1.0)).toBe(true)
    expect(isMovementPlausible(0, 0, 0.18, 0, 16.66, 9, 1.0)).toBe(false)
  })
})
