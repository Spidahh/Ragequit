import { describe, it, expect } from 'vitest'

import { JUMP_HEIGHT_TAP_M, MOVE_SPEED_MPS } from '../constants/stats.js'
import { TICK_MS } from '../constants/tick.js'
import {
  CAPSULE_HALF_HEIGHT_M,
  COYOTE_TICKS,
  GROUND_Y,
  JUMP_BUFFER_TICKS,
} from '../constants/world.js'

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

  it('accelerates up to MOVE_SPEED_MPS instead of starting there', () => {
    const s = makePlayerSimState({ x: 0, y: BASE_Y, z: 20 })
    const fwd = { moveX: 0, moveZ: -1, yaw: 0, jump: false, jumpHold: false }

    // One tick in, the character is moving but nowhere near top speed. This is
    // the whole point: velocity accumulates. It used to be assigned, so a single
    // tick took it from a standstill to 9 m/s.
    simulatePlayer(s, fwd, DT, STATIC_MAP)
    const afterOneTick = Math.hypot(s.vel.x, s.vel.z)
    expect(afterOneTick).toBeGreaterThan(0)
    expect(afterOneTick).toBeLessThan(MOVE_SPEED_MPS * 0.35)

    // Held, it converges on the speed limit and does not exceed it.
    for (let i = 0; i < 60; i++) simulatePlayer(s, fwd, DT, STATIC_MAP)
    expect(Math.hypot(s.vel.x, s.vel.z)).toBeCloseTo(MOVE_SPEED_MPS, 2)

    // Direction is still exactly forward — the ramp must not introduce drift.
    expect(s.pos.x).toBeCloseTo(0, 4)
    expect(s.pos.z).toBeLessThan(20)
  })

  it('keeps moving after the key is released, then stops properly', () => {
    const s = makePlayerSimState({ x: 0, y: BASE_Y, z: 20 })
    const fwd = { moveX: 0, moveZ: -1, yaw: 0, jump: false, jumpHold: false }
    const idle = { moveX: 0, moveZ: 0, yaw: 0, jump: false, jumpHold: false }
    for (let i = 0; i < 60; i++) simulatePlayer(s, fwd, DT, STATIC_MAP)

    const zAtRelease = s.pos.z
    simulatePlayer(s, idle, DT, STATIC_MAP)
    // Friction, not a switch: one tick after release you are still moving.
    expect(Math.hypot(s.vel.x, s.vel.z)).toBeGreaterThan(0)

    for (let i = 0; i < 60; i++) simulatePlayer(s, idle, DT, STATIC_MAP)
    // ...and it does reach a true zero rather than creeping forever.
    expect(Math.hypot(s.vel.x, s.vel.z)).toBe(0)
    // A real stopping distance, which is what gives the character weight.
    expect(Math.abs(s.pos.z - zAtRelease)).toBeGreaterThan(0.3)
  })

  it('treats a partial input as a lower target speed, not a shorter direction', () => {
    // Bots send magnitudes below 1 (BotController uses 0.55). If that vector were
    // used as the wish DIRECTION the fixed point would move to V/|dir| and they
    // would accelerate past the speed limit.
    const s = makePlayerSimState({ x: 0, y: BASE_Y, z: 20 })
    const half = { moveX: 0, moveZ: -0.5, yaw: 0, jump: false, jumpHold: false }
    for (let i = 0; i < 120; i++) simulatePlayer(s, half, DT, STATIC_MAP)
    expect(Math.hypot(s.vel.x, s.vel.z)).toBeCloseTo(MOVE_SPEED_MPS * 0.5, 1)
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

  it('held jump reaches same apex as tap jump (~JUMP_HEIGHT_TAP_M) because hold to jump is disabled', () => {
    const s = makePlayerSimState({ x: 20, y: BASE_Y, z: -20 })
    s.stamina = 100
    simulatePlayer(s, { ...idle(), jump: true, jumpHold: true }, DT, STATIC_MAP)
    let apex = s.pos.y
    for (let i = 0; i < 120; i++) {
      simulatePlayer(s, { ...idle(), jumpHold: true }, DT, STATIC_MAP)
      if (s.pos.y > apex) apex = s.pos.y
      if (s.onGround && i > 10) break
    }
    expect(apex - BASE_Y).toBeGreaterThan(JUMP_HEIGHT_TAP_M - 0.15)
    expect(apex - BASE_Y).toBeLessThan(JUMP_HEIGHT_TAP_M + 0.15)
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

// --- D19: jump ordering and the input buffer -------------------------------
// 00_truth.md §10 step 2. Both of these punish good timing when absent.
describe('jump buffer and ordering', () => {
  const air = (jump: boolean): SimInput => ({ moveX: 0, moveZ: 0, yaw: 0, jump, jumpHold: false })
  // +z runs away from the cover cluster around the origin; hitting a box mid-flight
  // zeroes velocity and would make this test measure collision, not friction order.
  const fwd = (jump: boolean): SimInput => ({ moveX: 0, moveZ: 1, yaw: 0, jump, jumpHold: false })

  /** Jump, then fall, pressing jump exactly `pressAt` ticks before touchdown. */
  function hopWithEarlyPress(pressAt: number): boolean {
    // z: 20 like the tests above — the origin sits inside a cover box.
    const s = makePlayerSimState({ x: 0, y: BASE_Y, z: 20 })
    simulatePlayer(s, air(true), DT, STATIC_MAP)
    // How long is the flight? Measure it on a clone that never presses again.
    const probe = structuredClone(s)
    let flight = 0
    while (!probe.onGround && flight < 300) {
      simulatePlayer(probe, air(false), DT, STATIC_MAP)
      flight++
    }
    for (let t = 0; t < flight; t++) {
      simulatePlayer(s, air(t === flight - pressAt), DT, STATIC_MAP)
    }
    // The tick after touchdown, with NO fresh press: only a buffered jump can fire.
    simulatePlayer(s, air(false), DT, STATIC_MAP)
    return s.vel.y > 0
  }

  it('fires a jump pressed just before touchdown', () => {
    expect(hopWithEarlyPress(1)).toBe(true)
    expect(hopWithEarlyPress(3)).toBe(true)
  })

  it('lets the buffer expire rather than queueing a jump forever', () => {
    expect(hopWithEarlyPress(JUMP_BUFFER_TICKS + 6)).toBe(false)
  })

  // Quake calls PM_CheckJump before PM_Friction. With the order reversed a hop
  // timed on the landing tick paid a full friction tick — 13.3% of velocity —
  // which punishes precisely the input the movement system rewards.
  it('keeps full speed through a hop timed on the landing tick', () => {
    const s = makePlayerSimState({ x: 0, y: BASE_Y, z: 20 })
    for (let i = 0; i < 60; i++) simulatePlayer(s, fwd(false), DT, STATIC_MAP)
    const cruising = Math.hypot(s.vel.x, s.vel.z)
    expect(cruising).toBeCloseTo(MOVE_SPEED_MPS, 2)

    simulatePlayer(s, fwd(true), DT, STATIC_MAP)
    while (!s.onGround) simulatePlayer(s, fwd(false), DT, STATIC_MAP)
    simulatePlayer(s, fwd(true), DT, STATIC_MAP) // hop on the landing tick
    expect(Math.hypot(s.vel.x, s.vel.z)).toBeCloseTo(cruising, 2)
  })
})
