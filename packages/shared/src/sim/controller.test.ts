import { describe, it, expect } from 'vitest'

import { JUMP_HEIGHT_TAP_M, MOVE_SPEED_MPS } from '../constants/stats.js'
import { TICK_MS } from '../constants/tick.js'
import {
  AIR_SPEED_CAP_MPS,
  CAPSULE_HALF_HEIGHT_M,
  COYOTE_TICKS,
  GROUND_Y,
  JUMP_BUFFER_TICKS,
  KNOCKBACK_WINDOW_TICKS,
} from '../constants/world.js'

import { makePlayerSimState, simulatePlayer } from './controller.js'
import { STATIC_MAP } from './map.js'
import type { SimInput, StaticMap } from './types.js'

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
    // Start at -z and run TOWARD the origin: the arena has a perimeter now
    // (D20), and the old start at z=20 running +z reached the wall inside the
    // 60-tick run-up, so this measured the boundary clamp instead of friction
    // ordering. x=20 keeps the whole run clear of the cover cluster.
    const s = makePlayerSimState({ x: 20, y: BASE_Y, z: -12 })
    for (let i = 0; i < 60; i++) simulatePlayer(s, fwd(false), DT, STATIC_MAP)
    const cruising = Math.hypot(s.vel.x, s.vel.z)
    expect(cruising).toBeCloseTo(MOVE_SPEED_MPS, 2)

    simulatePlayer(s, fwd(true), DT, STATIC_MAP)
    while (!s.onGround) simulatePlayer(s, fwd(false), DT, STATIC_MAP)
    simulatePlayer(s, fwd(true), DT, STATIC_MAP) // hop on the landing tick
    expect(Math.hypot(s.vel.x, s.vel.z)).toBeCloseTo(cruising, 2)
  })
})

// --- D5/D7: the knockback window --------------------------------------------
// A launch is an impulse (00_truth.md 7.1). It only stays one if friction and the
// air cap let go of it for a moment: applied and then immediately bled away, an
// impulse is just an expensive way to do nothing.
describe('knockback window', () => {
  const idle: SimInput = { moveX: 0, moveZ: 0, yaw: 0, jump: false, jumpHold: false }

  it('suspends ground friction while it is open', () => {
    const s = makePlayerSimState({ x: 0, y: BASE_Y, z: 20 })
    s.vel.x = 6
    s.momentumTicks = KNOCKBACK_WINDOW_TICKS
    simulatePlayer(s, idle, DT, STATIC_MAP)
    expect(Math.abs(s.vel.x)).toBeCloseTo(6, 3)
  })

  it('lets friction take hold again as soon as it closes', () => {
    const s = makePlayerSimState({ x: 0, y: BASE_Y, z: 20 })
    s.vel.x = 6
    s.momentumTicks = 1
    simulatePlayer(s, idle, DT, STATIC_MAP) // window closes on this tick
    simulatePlayer(s, idle, DT, STATIC_MAP)
    expect(Math.abs(s.vel.x)).toBeLessThan(6)
  })

  // Quake only has to kill friction because Quake has no air cap. Ours rescales
  // every airborne tick, so it has to be suppressed too or the cap eats the launch.
  it('does not clamp an airborne impulse to the air cap while open', () => {
    const s = makePlayerSimState({ x: 0, y: BASE_Y + 4, z: 20 })
    s.onGround = false
    s.vel.x = AIR_SPEED_CAP_MPS + 5
    s.momentumTicks = KNOCKBACK_WINDOW_TICKS
    simulatePlayer(s, idle, DT, STATIC_MAP)
    expect(s.vel.x).toBeGreaterThan(AIR_SPEED_CAP_MPS)
  })

  it('applies the cap again once the window has closed', () => {
    const s = makePlayerSimState({ x: 0, y: BASE_Y + 4, z: 20 })
    s.onGround = false
    s.vel.x = AIR_SPEED_CAP_MPS + 5
    s.momentumTicks = 0
    simulatePlayer(s, idle, DT, STATIC_MAP)
    expect(s.vel.x).toBeCloseTo(AIR_SPEED_CAP_MPS, 3)
  })

  // Non-refreshing: the controller only ever counts down, so a chain of impulses
  // cannot hold the window open and turn into an unrecoverable slide.
  it('counts down and never extends itself', () => {
    const s = makePlayerSimState({ x: 0, y: BASE_Y, z: 20 })
    s.momentumTicks = KNOCKBACK_WINDOW_TICKS
    for (let i = 0; i < KNOCKBACK_WINDOW_TICKS + 2; i++) simulatePlayer(s, idle, DT, STATIC_MAP)
    expect(s.momentumTicks).toBe(0)
  })
})

// --- D18: the air cap is a ceiling you learn to reach ------------------------
// 11.7 m/s was 1.30x the 9 m/s base — the entire movement skill ceiling was
// +30 %, and a sloppy turn rate already saturated it. These tests exist to keep
// the cap MEASURED: it has to be reachable (or raising it changes nothing) and
// it has to be earned (or it is a plateau, not a ceiling).
describe('air speed cap', () => {
  const OPEN_MAP: StaticMap = { boxes: [], groundY: GROUND_Y, spawns: [] }

  // A strafe jump: hold forward+strafe and turn into the strafe while airborne,
  // hopping on every landing. The turn rate is the technique.
  function chainHops(hops: number, turnPerTick: number): number[] {
    const s = makePlayerSimState({ x: 0, y: BASE_Y, z: 0 })
    let yaw = 0
    const run = (moveX: number, jump: boolean): void => {
      simulatePlayer(s, { moveX, moveZ: -1, yaw, jump, jumpHold: false }, DT, OPEN_MAP)
    }
    for (let i = 0; i < 90; i++) run(0, false)
    const peaks: number[] = []
    for (let h = 0; h < hops; h++) {
      run(1, true)
      let guard = 0
      while (!s.onGround && guard++ < 200) {
        yaw += turnPerTick
        run(1, false)
      }
      peaks.push(Math.hypot(s.vel.x, s.vel.z))
    }
    return peaks
  }

  it('is reachable — a cap nobody can touch is not a design', () => {
    const peaks = chainHops(8, 0.014)
    expect(Math.max(...peaks)).toBeCloseTo(AIR_SPEED_CAP_MPS, 2)
  })

  it('is never exceeded, whatever the technique', () => {
    for (const turn of [0.004, 0.008, 0.014, 0.022, 0.05]) {
      for (const v of chainHops(8, turn)) {
        expect(v).toBeLessThanOrEqual(AIR_SPEED_CAP_MPS + 1e-6)
      }
    }
  })

  // The point of raising it. At 11.7 a lazy turn rate already saturated, so
  // there was nothing above "adequate" to aim at.
  it('rewards a tighter turn instead of plateauing', () => {
    const sloppy = Math.max(...chainHops(8, 0.004))
    const good = Math.max(...chainHops(8, 0.014))
    expect(good).toBeGreaterThan(sloppy + 2)
  })

  it('still lets a knockback impulse through its window', () => {
    const s = makePlayerSimState({ x: 0, y: BASE_Y + 3, z: 0 })
    s.vel.x = AIR_SPEED_CAP_MPS * 2
    s.momentumTicks = KNOCKBACK_WINDOW_TICKS
    simulatePlayer(s, { moveX: 0, moveZ: 0, yaw: 0, jump: false, jumpHold: false }, DT, OPEN_MAP)
    expect(s.vel.x).toBeCloseTo(AIR_SPEED_CAP_MPS * 2, 4)
  })
})
