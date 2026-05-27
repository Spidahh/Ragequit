import { describe, it, expect } from 'vitest'

import { JUMP_HEIGHT_HOLD_M, JUMP_HEIGHT_TAP_M, MOVE_SPEED_MPS } from '../constants/stats.js'
import { TICK_MS } from '../constants/tick.js'
import { CAPSULE_HALF_HEIGHT_M, COYOTE_TICKS, GROUND_Y } from '../constants/world.js'

import { makePlayerSimState, simulatePlayer } from './controller.js'
import { STATIC_MAP } from './map.js'
import type { SimInput } from './types.js'

const DT = TICK_MS / 1000
const BASE_Y = GROUND_Y + CAPSULE_HALF_HEIGHT_M

// Use a spawn far from the central box so gravity + idle behaves.
const SAFE_SPAWN = { x: 4, y: BASE_Y, z: 4 }

function idle(yaw = 0): SimInput {
  return { moveX: 0, moveZ: 0, yaw, jump: false, jumpHold: false }
}

describe('simulatePlayer', () => {
  it('stays resting on ground with no input', () => {
    const s = makePlayerSimState(SAFE_SPAWN)
    for (let i = 0; i < 120; i++) simulatePlayer(s, idle(), DT, STATIC_MAP)
    expect(s.pos.y).toBeCloseTo(BASE_Y, 4)
    expect(s.onGround).toBe(true)
    expect(s.vel.y).toBeCloseTo(0, 4)
  })

  it('moves at MOVE_SPEED_MPS when pressing forward (before momentum bonus kicks in)', () => {
    const s = makePlayerSimState({ x: 0, y: BASE_Y, z: 20 })
    // Run for 20 ticks — below MOMENTUM_THRESHOLD_TICKS (30), so no bonus yet.
    // 20 ticks = 20/60 seconds → expected displacement ≈ MOVE_SPEED_MPS * (20/60).
    const TICKS = 20
    const expectedDisplacement = MOVE_SPEED_MPS * (TICKS * DT)
    for (let i = 0; i < TICKS; i++) {
      simulatePlayer(
        s,
        { moveX: 0, moveZ: -1, yaw: 0, jump: false, jumpHold: false },
        DT,
        STATIC_MAP,
      )
    }
    expect(s.pos.z).toBeCloseTo(20 - expectedDisplacement, 1)
    expect(s.pos.x).toBeCloseTo(0, 4)
  })

  it('tap jump reaches ~JUMP_HEIGHT_TAP_M apex', () => {
    const s = makePlayerSimState({ x: 20, y: BASE_Y, z: 20 })
    s.stamina = 100
    simulatePlayer(s, { ...idle(), jump: true }, DT, STATIC_MAP)
    let apex = s.pos.y
    for (let i = 0; i < 60; i++) {
      simulatePlayer(s, idle(), DT, STATIC_MAP)
      if (s.pos.y > apex) apex = s.pos.y
      if (s.onGround && i > 5) break
    }
    expect(apex - BASE_Y).toBeGreaterThan(JUMP_HEIGHT_TAP_M - 0.15)
    expect(apex - BASE_Y).toBeLessThan(JUMP_HEIGHT_TAP_M + 0.15)
  })

  it('held jump reaches ~JUMP_HEIGHT_HOLD_M apex', () => {
    const s = makePlayerSimState({ x: 20, y: BASE_Y, z: -20 })
    s.stamina = 100
    simulatePlayer(s, { ...idle(), jump: true, jumpHold: true }, DT, STATIC_MAP)
    let apex = s.pos.y
    for (let i = 0; i < 120; i++) {
      simulatePlayer(s, { ...idle(), jumpHold: true }, DT, STATIC_MAP)
      if (s.pos.y > apex) apex = s.pos.y
      if (s.onGround && i > 10) break
    }
    expect(apex - BASE_Y).toBeGreaterThan(JUMP_HEIGHT_HOLD_M - 0.2)
    expect(apex - BASE_Y).toBeLessThan(JUMP_HEIGHT_HOLD_M + 0.2)
  })

  it('blocks horizontal movement into a box', () => {
    const s = makePlayerSimState({ x: 5, y: BASE_Y, z: 0 })
    const input: SimInput = { moveX: 1, moveZ: 0, yaw: 0, jump: false, jumpHold: false }
    for (let i = 0; i < 60; i++) simulatePlayer(s, input, DT, STATIC_MAP)
    // Box at x=8 has minX=7. Capsule half-width 0.4 → cannot exceed 6.6.
    expect(s.pos.x).toBeLessThanOrEqual(6.6 + 0.001)
  })

  it('keeps horizontal input during knockup-air state unless a real status locks movement', () => {
    const s = makePlayerSimState({ x: 0, y: BASE_Y + 2, z: 20 })

    simulatePlayer(
      s,
      { moveX: 0, moveZ: -1, yaw: 0, jump: false, jumpHold: false },
      DT,
      STATIC_MAP,
      {
        slowFraction: 0,
        movementLocked: false,
        castLocked: false,
      },
    )

    expect(s.vel.z).toBeLessThan(0)
  })

  it('coyote time allows jump within window after walking off a ledge', () => {
    // Player starts grounded (onGround=true) but with no floor below — simulates
    // walking off a ledge. First tick: wasOnGround=true, no jump, onGround→false
    // after collision resolution → coyoteTicksLeft = COYOTE_TICKS.
    const s = makePlayerSimState({ x: 20, y: BASE_Y, z: 20 })
    s.stamina = 100
    // Map with floor far below so player immediately starts falling.
    const mapForCoyote = { boxes: [], groundY: -100, spawns: [] }
    simulatePlayer(s, idle(), DT, mapForCoyote)
    expect(s.onGround).toBe(false)
    expect(s.coyoteTicksLeft).toBe(COYOTE_TICKS)
    // Second tick: jump within coyote window — should launch upward.
    simulatePlayer(s, { ...idle(), jump: true }, DT, mapForCoyote)
    expect(s.vel.y).toBeGreaterThan(0)
    expect(s.coyoteTicksLeft).toBe(0)
  })

  it('is deterministic — same inputs produce bit-identical state', () => {
    const inputs: SimInput[] = []
    for (let i = 0; i < 30; i++) {
      inputs.push({
        moveX: Math.sin(i) * 0.5,
        moveZ: Math.cos(i) * 0.5,
        yaw: 0.1,
        jump: i === 0,
        jumpHold: i < 5,
      })
    }
    const a = makePlayerSimState(SAFE_SPAWN)
    const b = makePlayerSimState(SAFE_SPAWN)
    a.stamina = 100
    b.stamina = 100
    for (const inp of inputs) {
      simulatePlayer(a, inp, DT, STATIC_MAP)
      simulatePlayer(b, inp, DT, STATIC_MAP)
    }
    expect(a.pos.x).toBe(b.pos.x)
    expect(a.pos.y).toBe(b.pos.y)
    expect(a.pos.z).toBe(b.pos.z)
    expect(a.vel.y).toBe(b.vel.y)
  })
})
