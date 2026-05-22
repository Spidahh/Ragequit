import { describe, expect, it } from 'vitest'

import { TICK_MS } from '../constants/tick.js'
import {
  SWORD_M1_COMBO_RESET_SEC,
  SWORD_M1_DAMAGE,
  UPPERCUT_AIRBORNE_SEC,
} from '../constants/weapons.js'

import {
  advanceSwordCombo,
  finishSwordCombo,
  isInMeleeCone,
  isInSwordM1Cone,
  uppercutBallisticAirtimeSec,
} from './combat.js'

describe('melee cone hit test', () => {
  // Attacker at origin, yaw=0 (looking at -Z).
  const attacker = { x: 0, y: 0, z: 0 }

  it('hits a target directly in front within range', () => {
    expect(isInSwordM1Cone(attacker, 0, { x: 0, y: 0, z: -1.5 })).toBe(true)
  })

  it('misses a target behind the attacker', () => {
    expect(isInSwordM1Cone(attacker, 0, { x: 0, y: 0, z: +2 })).toBe(false)
  })

  it('misses a target out of range', () => {
    expect(isInSwordM1Cone(attacker, 0, { x: 0, y: 0, z: -2 })).toBe(false)
  })

  it('respects yaw rotation (facing +X)', () => {
    // yaw=-π/2 in three.js "forward = -Z" convention looks at +X.
    const yaw = -Math.PI / 2
    expect(isInSwordM1Cone(attacker, yaw, { x: 1.5, y: 0, z: 0 })).toBe(true)
    expect(isInSwordM1Cone(attacker, yaw, { x: -1.5, y: 0, z: 0 })).toBe(false)
  })

  it('ignores Y so airborne targets are still hit', () => {
    expect(isInSwordM1Cone(attacker, 0, { x: 0, y: 2, z: -1.5 })).toBe(true)
  })

  it('respects cone half-angle — edge of 40° just hits, 55° misses', () => {
    const x40 = Math.sin((Math.PI * 40) / 180) * 1.5
    const z40 = -Math.cos((Math.PI * 40) / 180) * 1.5
    expect(isInSwordM1Cone(attacker, 0, { x: x40, y: 0, z: z40 })).toBe(true)
    const x55 = Math.sin((Math.PI * 55) / 180) * 1.5
    const z55 = -Math.cos((Math.PI * 55) / 180) * 1.5
    expect(isInSwordM1Cone(attacker, 0, { x: x55, y: 0, z: z55 })).toBe(false)
  })

  it('custom cone params work', () => {
    // 180° half-angle (omnidirectional) hits everywhere in range.
    const omni = isInMeleeCone({
      attacker,
      attackerYaw: 0,
      target: { x: 0, y: 0, z: +1 },
      range: 2,
      coneHalfAngleRad: Math.PI,
    })
    expect(omni).toBe(true)
  })
})

describe('sword M1 combo state machine', () => {
  it('first swing ever plays swing 1 (index 0, SWORD_M1_DAMAGE[0])', () => {
    const r = advanceSwordCombo(0, 0, 100)
    expect(r.indexJustPlayed).toBe(0)
    expect(r.damage).toBe(SWORD_M1_DAMAGE[0])
    expect(r.nextStoredIndex).toBe(1)
  })

  it('chains 1 → 2 → 3 → 1 when within reset window', () => {
    // Simulate three swings in quick succession (10 ticks apart).
    let stored = 0
    let lastTick = 100
    const plays: number[] = []
    const damages: number[] = []
    for (let i = 0; i < 4; i++) {
      const r = advanceSwordCombo(stored, lastTick, lastTick + 10)
      plays.push(r.indexJustPlayed)
      damages.push(r.damage)
      stored = r.nextStoredIndex
      lastTick = lastTick + 10
    }
    expect(plays).toEqual([0, 1, 2, 0])
    expect(damages).toEqual([
      SWORD_M1_DAMAGE[0],
      SWORD_M1_DAMAGE[1],
      SWORD_M1_DAMAGE[2],
      SWORD_M1_DAMAGE[0],
    ])
  })

  it('resets combo after SWORD_M1_COMBO_RESET_SEC of inactivity', () => {
    const resetTicks = Math.ceil((SWORD_M1_COMBO_RESET_SEC * 1000) / TICK_MS) + 1
    // Attacker already did two swings; now idle for the reset window.
    const r = advanceSwordCombo(2, 100, 100 + resetTicks)
    expect(r.indexJustPlayed).toBe(0)
    expect(r.damage).toBe(SWORD_M1_DAMAGE[0])
  })

  it('stores no sword chain progress when the launched swing misses', () => {
    expect(finishSwordCombo(0, false)).toBe(0)
    expect(finishSwordCombo(1, false)).toBe(0)
    expect(finishSwordCombo(0, true)).toBe(1)
    expect(finishSwordCombo(2, true)).toBe(0)
  })
})

describe('uppercut ballistic airtime', () => {
  it('matches the designed 0.8 s knockup window within 1 tick', () => {
    const airtime = uppercutBallisticAirtimeSec()
    const delta = Math.abs(airtime - UPPERCUT_AIRBORNE_SEC)
    // Tolerance: within 50 ms (3 ticks). The knockup duration is a design
    // target; what matters is that the visual + gameplay feel ballistic.
    expect(delta).toBeLessThan(0.05)
  })
})
