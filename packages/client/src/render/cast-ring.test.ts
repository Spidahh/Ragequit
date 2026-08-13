import { ABILITY_DEFS, TICK_RATE_HZ } from '@ragequit/shared'
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { ELEMENT_COLORS } from '../character.js'

import { makeCastRing, updateCastRing } from './character-weapons.js'

// A real ability with a windup, chosen from the registry rather than invented,
// so this breaks if the data stops matching the assumption.
const withWindup = Object.values(ABILITY_DEFS).find((d) => d.windupSec > 0)!
const windupTicks = Math.round(withWindup.windupSec * TICK_RATE_HZ)

const ring = (): THREE.Mesh => makeCastRing()
const mat = (m: THREE.Mesh): THREE.MeshBasicMaterial => m.material as THREE.MeshBasicMaterial

describe('enemy cast ring', () => {
  it('is hidden when nobody is casting', () => {
    const r = ring()
    updateCastRing(r, { casting: false, castAbilityId: withWindup.id, castEndsAtTick: 500 }, 100)
    expect(r.visible).toBe(false)
  })

  it('is hidden once the cast has already resolved', () => {
    const r = ring()
    updateCastRing(r, { casting: true, castAbilityId: withWindup.id, castEndsAtTick: 100 }, 100)
    expect(r.visible).toBe(false)
  })

  // Identity: which spell is coming at me?
  it('takes the colour of the element being cast', () => {
    const r = ring()
    updateCastRing(r, { casting: true, castAbilityId: withWindup.id, castEndsAtTick: 900 }, 800)
    expect(mat(r).color.getHex()).toBe(ELEMENT_COLORS[withWindup.element])
  })

  // Timing: how long have I got?
  it('closes from full to a tight core as the windup resolves', () => {
    const r = ring()
    const end = 1000
    updateCastRing(
      r,
      { casting: true, castAbilityId: withWindup.id, castEndsAtTick: end },
      end - windupTicks,
    )
    const atStart = r.scale.x
    updateCastRing(r, { casting: true, castAbilityId: withWindup.id, castEndsAtTick: end }, end - 1)
    const nearEnd = r.scale.x
    expect(atStart).toBeCloseTo(1, 2)
    expect(nearEnd).toBeLessThan(atStart)
    expect(nearEnd).toBeGreaterThan(0.3)
  })

  it('brightens in the last quarter, where the reaction has to happen', () => {
    const r = ring()
    const end = 1000
    updateCastRing(
      r,
      { casting: true, castAbilityId: withWindup.id, castEndsAtTick: end },
      end - windupTicks,
    )
    const early = mat(r).opacity
    updateCastRing(r, { casting: true, castAbilityId: withWindup.id, castEndsAtTick: end }, end - 1)
    expect(mat(r).opacity).toBeGreaterThan(early)
  })

  // An instant ability has no windup to show; inventing one would make every
  // instant read as "about to land".
  it('does not fake a countdown for an ability with no windup', () => {
    const instant = Object.values(ABILITY_DEFS).find((d) => d.windupSec === 0)
    if (!instant) return
    const r = ring()
    updateCastRing(r, { casting: true, castAbilityId: instant.id, castEndsAtTick: 900 }, 899)
    expect(r.scale.x).toBeCloseTo(1, 5)
  })

  it('resets its size when the cast ends, so the next one starts open', () => {
    const r = ring()
    updateCastRing(r, { casting: true, castAbilityId: withWindup.id, castEndsAtTick: 1000 }, 999)
    expect(r.scale.x).toBeLessThan(1)
    updateCastRing(r, { casting: false, castAbilityId: '', castEndsAtTick: 0 }, 1000)
    expect(r.scale.x).toBe(1)
  })
})
