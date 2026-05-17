import { describe, expect, it } from 'vitest'

import {
  BOW_CHARGE_FULL_SEC,
  BOW_CHARGE_MIN_SEC,
  BOW_DAMAGE_FULL,
  BOW_DAMAGE_MIN,
  BOW_GRAVITY_MPS2,
  BOW_SPEED_FULL_MPS,
  BOW_SPEED_MIN_MPS,
  PARRY_HOLD_BLOCK_FRAC,
  PARRY_TAP_BLOCK_FRAC,
  PLAYER_CAPSULE_HEIGHT_M,
  PLAYER_CAPSULE_RADIUS_M,
} from '../constants/weapons.js'

import {
  applyParryReduction,
  bowChargeRatio,
  bowLerp,
  directionFromYawPitch,
  segmentVsAabb,
  segmentVsCapsule,
  segmentVsGround,
  stepProjectile,
} from './projectile.js'
import type { ProjectileState } from './projectile.js'

describe('bowChargeRatio', () => {
  it('returns 0 when below the minimum charge time', () => {
    // Use a value safely below the current BOW_CHARGE_MIN_SEC (0.05 s).
    expect(bowChargeRatio(BOW_CHARGE_MIN_SEC * 0.5, BOW_CHARGE_MIN_SEC, BOW_CHARGE_FULL_SEC)).toBe(0)
    expect(bowChargeRatio(BOW_CHARGE_MIN_SEC - 0.01, BOW_CHARGE_MIN_SEC, BOW_CHARGE_FULL_SEC)).toBe(
      0,
    )
  })

  it('returns 0 exactly at the minimum threshold', () => {
    expect(bowChargeRatio(BOW_CHARGE_MIN_SEC, BOW_CHARGE_MIN_SEC, BOW_CHARGE_FULL_SEC)).toBe(0)
  })

  it('returns 1 when fully charged or beyond', () => {
    expect(bowChargeRatio(BOW_CHARGE_FULL_SEC, BOW_CHARGE_MIN_SEC, BOW_CHARGE_FULL_SEC)).toBe(1)
    expect(bowChargeRatio(5, BOW_CHARGE_MIN_SEC, BOW_CHARGE_FULL_SEC)).toBe(1)
  })

  it('scales linearly between min and full', () => {
    const mid = (BOW_CHARGE_MIN_SEC + BOW_CHARGE_FULL_SEC) / 2
    const ratio = bowChargeRatio(mid, BOW_CHARGE_MIN_SEC, BOW_CHARGE_FULL_SEC)
    expect(ratio).toBeCloseTo(0.5, 3)
  })
})

describe('bowLerp (damage + speed scaling)', () => {
  it('returns min when ratio is 0', () => {
    expect(bowLerp(BOW_DAMAGE_MIN, BOW_DAMAGE_FULL, 0)).toBe(BOW_DAMAGE_MIN)
    expect(bowLerp(BOW_SPEED_MIN_MPS, BOW_SPEED_FULL_MPS, 0)).toBe(BOW_SPEED_MIN_MPS)
  })

  it('returns full when ratio is 1', () => {
    expect(bowLerp(BOW_DAMAGE_MIN, BOW_DAMAGE_FULL, 1)).toBe(BOW_DAMAGE_FULL)
    expect(bowLerp(BOW_SPEED_MIN_MPS, BOW_SPEED_FULL_MPS, 1)).toBe(BOW_SPEED_FULL_MPS)
  })

  it('clamps ratios outside [0,1]', () => {
    expect(bowLerp(0, 10, -1)).toBe(0)
    expect(bowLerp(0, 10, 2)).toBe(10)
  })
})

describe('directionFromYawPitch', () => {
  it('points toward -Z when yaw=0 pitch=0', () => {
    const d = directionFromYawPitch(0, 0)
    expect(d.x).toBeCloseTo(0, 5)
    expect(d.y).toBeCloseTo(0, 5)
    expect(d.z).toBeCloseTo(-1, 5)
  })

  it('rotates 90° to -X when yaw=pi/2', () => {
    const d = directionFromYawPitch(Math.PI / 2, 0)
    expect(d.x).toBeCloseTo(-1, 5)
    expect(d.z).toBeCloseTo(0, 5)
  })

  it('tilts up with positive pitch', () => {
    const d = directionFromYawPitch(0, Math.PI / 4)
    expect(d.y).toBeCloseTo(Math.SQRT1_2, 5)
    expect(d.z).toBeCloseTo(-Math.SQRT1_2, 5)
  })
})

describe('stepProjectile', () => {
  it('integrates position and drops under gravity', () => {
    const state: ProjectileState = {
      pos: { x: 0, y: 10, z: 0 },
      vel: { x: 0, y: 0, z: -50 },
      gravity: BOW_GRAVITY_MPS2,
    }
    stepProjectile(state, 0.1)
    // Horizontal motion: -5 m on z.
    expect(state.pos.z).toBeCloseTo(-5, 5)
    // Gravity applied: vy = -g*dt = -0.6
    expect(state.vel.y).toBeCloseTo(-BOW_GRAVITY_MPS2 * 0.1, 5)
    // Position y drops by vy * dt (semi-implicit) = -0.06
    expect(state.pos.y).toBeCloseTo(10 + state.vel.y * 0.1, 5)
  })

  it('accumulates drop over a 1 s flight consistent with analytic 0.5gt²', () => {
    const state: ProjectileState = {
      pos: { x: 0, y: 10, z: 0 },
      vel: { x: 0, y: 0, z: -60 },
      gravity: BOW_GRAVITY_MPS2,
    }
    const dt = 1 / 60
    for (let i = 0; i < 60; i++) stepProjectile(state, dt)
    // After 1 s with 60 m/s, z ≈ -60; vertical drop ≈ 0.5 * g * t² = 3 m.
    expect(state.pos.z).toBeCloseTo(-60, 1)
    const expectedDrop = 0.5 * BOW_GRAVITY_MPS2 * 1 * 1
    // semi-implicit leapfrog accumulates slightly differently; accept 10% band.
    expect(Math.abs(state.pos.y - (10 - expectedDrop))).toBeLessThan(0.5)
  })
})

describe('segmentVsCapsule', () => {
  const capsule = {
    id: 'v',
    pos: { x: 0, y: 0, z: 0 },
    radius: PLAYER_CAPSULE_RADIUS_M,
    height: PLAYER_CAPSULE_HEIGHT_M,
  }

  it('hits at close range dead-on', () => {
    const t = segmentVsCapsule({ x: -5, y: 1, z: 0 }, { x: 5, y: 1, z: 0 }, capsule)
    expect(t).not.toBeNull()
    // hit should land around t=0.45..0.55 (entering radius ~0.5 left of center).
    expect(t!).toBeGreaterThan(0.3)
    expect(t!).toBeLessThan(0.7)
  })

  it('misses when passing above the head', () => {
    const t = segmentVsCapsule(
      { x: -5, y: PLAYER_CAPSULE_HEIGHT_M + 2, z: 0 },
      { x: 5, y: PLAYER_CAPSULE_HEIGHT_M + 2, z: 0 },
      capsule,
    )
    expect(t).toBeNull()
  })

  it('misses when passing far to the side', () => {
    const t = segmentVsCapsule({ x: -5, y: 1, z: 5 }, { x: 5, y: 1, z: 5 }, capsule)
    expect(t).toBeNull()
  })
})

describe('segmentVsAabb', () => {
  const box = { minX: -1, minY: 0, minZ: -1, maxX: 1, maxY: 2, maxZ: 1 }

  it('detects entry when segment pierces the box', () => {
    const t = segmentVsAabb({ x: -5, y: 1, z: 0 }, { x: 5, y: 1, z: 0 }, box)
    expect(t).not.toBeNull()
    expect(t!).toBeCloseTo(0.4, 2) // enters at x=-1, fraction 4/10 of the segment.
  })

  it('misses when segment is outside the slab', () => {
    const t = segmentVsAabb({ x: -5, y: 5, z: 0 }, { x: 5, y: 5, z: 0 }, box)
    expect(t).toBeNull()
  })
})

describe('segmentVsGround', () => {
  it('returns the crossing t when segment punches through ground', () => {
    const t = segmentVsGround({ x: 0, y: 2, z: 0 }, { x: 0, y: -2, z: 0 }, 0)
    expect(t).not.toBeNull()
    expect(t!).toBeCloseTo(0.5, 5)
  })

  it('returns null when both endpoints are above ground', () => {
    const t = segmentVsGround({ x: 0, y: 1, z: 0 }, { x: 10, y: 2, z: 0 }, 0)
    expect(t).toBeNull()
  })
})

describe('applyParryReduction', () => {
  it('passes damage through when not parrying', () => {
    expect(applyParryReduction(10, false, false, PARRY_TAP_BLOCK_FRAC, PARRY_HOLD_BLOCK_FRAC)).toBe(
      10,
    )
  })

  it('tap parry blocks 100%', () => {
    expect(applyParryReduction(10, true, false, PARRY_TAP_BLOCK_FRAC, PARRY_HOLD_BLOCK_FRAC)).toBe(
      0,
    )
  })

  it('hold parry reduces to 30%', () => {
    const raw = 10
    const got = applyParryReduction(raw, true, true, PARRY_TAP_BLOCK_FRAC, PARRY_HOLD_BLOCK_FRAC)
    expect(got).toBeCloseTo(raw * (1 - PARRY_HOLD_BLOCK_FRAC), 5)
  })
})
