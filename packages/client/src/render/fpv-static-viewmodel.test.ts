import { describe, expect, it } from 'vitest'

import { createFpvStaticViewmodel } from './fpv-static-viewmodel.js'

// Offset from the trigger, in ms. The kick peaks at 90 ms and settles by 360.
const atPeak = 90
const afterSettle = 400

function kickAt(mag: number | undefined, offsetMs: number): number {
  const vm = createFpvStaticViewmodel()
  const t0 = performance.now()
  if (mag === undefined) vm.triggerCast()
  else vm.triggerCast(mag)
  vm.update(t0 + offsetMs)
  return vm.root.position.length()
}

describe('first-person viewmodel kick', () => {
  it('displaces the weapon when it fires', () => {
    expect(kickAt(1, atPeak)).toBeGreaterThan(0)
  })

  it('returns to rest', () => {
    expect(kickAt(1, afterSettle)).toBe(0)
  })

  // The staff's basic attack now reaches this at half strength. Without the
  // scaling, a poke kicked exactly as hard as a committed cast and the weapon
  // stopped saying anything about what you had just done.
  it('scales the kick with the magnitude asked for', () => {
    const full = kickAt(1, atPeak)
    const half = kickAt(0.5, atPeak)
    expect(half).toBeLessThan(full)
    expect(half).toBeCloseTo(full / 2, 5)
  })

  it('still kicks at full strength when no magnitude is given', () => {
    expect(kickAt(undefined, atPeak)).toBeCloseTo(kickAt(1, atPeak), 5)
  })

  it('ignores a negative magnitude rather than kicking inward', () => {
    expect(kickAt(-2, atPeak)).toBe(0)
  })
})
