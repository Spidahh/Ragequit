import { knockupAirtimeOnLand } from '@ragequit/shared'
import type { AbilityDef } from '@ragequit/shared'
import { describe, expect, it } from 'vitest'

// The BOLT capability (00_truth.md 3.5). A projectile could shove a victim
// along the ground but never lift one, and an `onLand` knockup on a
// projectile-bearing ability was skipped at cast ("deferred to impact") and
// then never resolved. Nothing shipped combined the two, so it read as a
// missing capability rather than a live bug — and it is the reason every
// launcher had to be an instant hitscan inside a soft-lock cone.
const def = (effects: AbilityDef['effects']): AbilityDef =>
  ({ id: 'x', effects }) as unknown as AbilityDef

describe('knockupAirtimeOnLand', () => {
  it('finds the airtime of a knockup that resolves at impact', () => {
    expect(
      knockupAirtimeOnLand(def([{ at: 'onLand', kind: 'knockup', airborneSec: 0.65 }])),
    ).toBeCloseTo(0.65)
  })

  it('ignores a knockup that resolves at cast — that one already worked', () => {
    expect(knockupAirtimeOnLand(def([{ at: 'onCast', kind: 'knockup', airborneSec: 0.7 }]))).toBe(0)
  })

  it('returns 0 when there is no knockup at all', () => {
    expect(
      knockupAirtimeOnLand(
        def([{ at: 'onLand', kind: 'damage', amount: 30 } as AbilityDef['effects'][number]]),
      ),
    ).toBe(0)
  })

  it('returns 0 for an empty kit rather than undefined', () => {
    expect(knockupAirtimeOnLand(def([]))).toBe(0)
  })
})
