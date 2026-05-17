import { describe, expect, it } from 'vitest'

import {
  STATUS_META,
  applyStatus,
  isCastLocked,
  isMovementLocked,
  tickStatuses,
  totalSlowFraction,
  type StatusInstanceShape,
} from './types.js'

describe('applyStatus', () => {
  it('seeds from null to the new instance', () => {
    const s = applyStatus(null, { stacks: 1, durationSec: 3 }, 'burn')
    expect(s.kind).toBe('burn')
    expect(s.stacks).toBe(1)
    expect(s.remainingSec).toBe(3)
  })

  it('clamps stacks to the kind cap (burn max 3)', () => {
    let s = applyStatus(null, { stacks: 1, durationSec: 3 }, 'burn')
    s = applyStatus(s, { stacks: 1, durationSec: 3 }, 'burn')
    s = applyStatus(s, { stacks: 1, durationSec: 3 }, 'burn')
    s = applyStatus(s, { stacks: 1, durationSec: 3 }, 'burn')
    expect(s.stacks).toBe(STATUS_META.burn.maxStacks)
  })

  it('refresh keeps the longer remaining duration', () => {
    const s1 = applyStatus(null, { stacks: 1, durationSec: 5 }, 'burn')
    const s2 = applyStatus(s1, { stacks: 1, durationSec: 2 }, 'burn')
    expect(s2.remainingSec).toBe(5)
  })

  it('stacks bleed to its cap of 1 (single-stack DoT)', () => {
    let s = applyStatus(null, { stacks: 1, durationSec: 3 }, 'bleed')
    s = applyStatus(s, { stacks: 1, durationSec: 3 }, 'bleed')
    expect(s.stacks).toBe(1)
  })
})

describe('tickStatuses', () => {
  it('emits per-stack DoT damage at the tick period and decays remaining', () => {
    const list: StatusInstanceShape[] = [{ kind: 'burn', stacks: 3, remainingSec: 3 }]
    const accs = new Map()
    const r = tickStatuses(list, 1, accs)
    // burn = 2 dmg/s × 3 stacks = 6.
    expect(r.dot).toBe(6)
    expect(r.alive[0]?.remainingSec).toBe(2)
  })

  it('accumulates partial dt and only fires when reaching tickEverySec', () => {
    const list: StatusInstanceShape[] = [{ kind: 'bleed', stacks: 1, remainingSec: 3 }]
    const accs = new Map()
    // Half a second: bleed cadence is 1 s, so 0 ticks fire yet.
    let total = 0
    for (let i = 0; i < 30; i++) total += tickStatuses(list, 1 / 60, accs).dot
    expect(total).toBe(0)
    // Full second now reached — exactly one 6 dmg tick fires.
    for (let i = 0; i < 30; i++) total += tickStatuses(list, 1 / 60, accs).dot
    expect(total).toBeGreaterThanOrEqual(6)
    expect(total).toBeLessThan(12)
  })

  it('drops the instance when remaining hits 0', () => {
    const list: StatusInstanceShape[] = [{ kind: 'burn', stacks: 1, remainingSec: 1 }]
    const r = tickStatuses(list, 1, new Map())
    expect(r.alive.length).toBe(0)
  })
})

describe('totalSlowFraction', () => {
  it('sums chill stacks at 5% each, clamped to 1', () => {
    const list: StatusInstanceShape[] = [{ kind: 'chill', stacks: 5, remainingSec: 4 }]
    expect(totalSlowFraction(list)).toBeCloseTo(0.25, 5)
  })

  it('uses slowFractionOverride when provided', () => {
    const list: StatusInstanceShape[] = [
      { kind: 'slow', stacks: 1, remainingSec: 5, slowFractionOverride: 0.3 },
    ]
    expect(totalSlowFraction(list)).toBeCloseTo(0.3, 5)
  })

  it('ignores root and incapacitate statuses (those are binary, not fractional)', () => {
    const list: StatusInstanceShape[] = [
      { kind: 'root', stacks: 1, remainingSec: 1 },
      { kind: 'stun', stacks: 1, remainingSec: 0.5 },
    ]
    expect(totalSlowFraction(list)).toBe(0)
    expect(isMovementLocked(list)).toBe(true)
  })

  it('isCastLocked flags incapacitates only', () => {
    expect(isCastLocked([{ kind: 'root', stacks: 1, remainingSec: 1 }])).toBe(false)
    expect(isCastLocked([{ kind: 'stun', stacks: 1, remainingSec: 0.5 }])).toBe(true)
    expect(isCastLocked([{ kind: 'freeze', stacks: 1, remainingSec: 1.2 }])).toBe(true)
  })

  it('blind is vision-only: no slow, root, or cast lock', () => {
    const list: StatusInstanceShape[] = [{ kind: 'blind', stacks: 1, remainingSec: 2 }]
    expect(totalSlowFraction(list)).toBe(0)
    expect(isMovementLocked(list)).toBe(false)
    expect(isCastLocked(list)).toBe(false)
  })
})
