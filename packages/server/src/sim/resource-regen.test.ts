import { describe, expect, it } from 'vitest'

import { regenResource } from './resource-regen.js'

describe('regenResource', () => {
  it('does not regen before the delay has elapsed', () => {
    // 5 ticks since the event, delay 10 => no regen.
    expect(regenResource(50, 100, 5, 10, 20, 1)).toBe(50)
  })

  it('regens at ratePerSec * dt once the delay elapsed', () => {
    // 12 ticks >= delay 10; rate 20/s, dt 0.5 => +10.
    expect(regenResource(50, 100, 12, 10, 20, 0.5)).toBe(60)
  })

  it('clamps to max', () => {
    expect(regenResource(95, 100, 100, 0, 20, 1)).toBe(100)
  })

  it('is a no-op when already at or above max', () => {
    expect(regenResource(100, 100, 100, 0, 20, 1)).toBe(100)
    expect(regenResource(120, 100, 100, 0, 20, 1)).toBe(120)
  })

  it('with delay 0 regens immediately', () => {
    expect(regenResource(0, 100, 0, 0, 10, 1)).toBe(10)
  })
})
