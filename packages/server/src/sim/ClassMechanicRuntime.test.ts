// Pass 5 — ClassMechanicRuntime unit tests.
//
// Tests the server-side accumulation, decay, and payoff logic for the four
// class mechanics without bringing up a full GameRoom.

import { GameState, Player } from '@ragequit/shared'
import { describe, expect, it, beforeEach } from 'vitest'

import {
  ClassMechanicRuntime,
  FLOW_DAMAGE_BONUS_FRAC,
  FURY_SURGE_DAMAGE_BONUS,
  MOMENTUM_BOW_BONUS_THRESHOLD,
  MOMENTUM_BOW_CHARGE_FAST_SEC,
  type RisonanzaProcRequest,
} from './ClassMechanicRuntime.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlayer(classId: string): Player {
  const p = new Player()
  p.id = 'test'
  p.classId = classId
  p.alive = true
  return p
}

function makeRuntime(
  player: Player,
  onProc: (req: RisonanzaProcRequest, now: number) => void = () => {},
) {
  const state = new GameState()
  state.players.set(player.id, player)
  const runtime = new ClassMechanicRuntime(state, onProc)
  return { state, runtime }
}

// ---------------------------------------------------------------------------
// FURY (Tank)
// ---------------------------------------------------------------------------

describe('Fury (Tank)', () => {
  it('gains 1 stack when hit taken', () => {
    const player = makePlayer('tank')
    const { runtime } = makeRuntime(player)
    runtime.onHitTaken(player.id, 100)
    expect(player.furyStacks).toBe(1)
  })

  it('clamps stack gain at max (5)', () => {
    const player = makePlayer('tank')
    const { runtime } = makeRuntime(player)
    for (let i = 0; i < 8; i++) runtime.onHitTaken(player.id, 100 + i)
    // At 5 stacks furyNextMeleeIsSurge triggers and resets stacks to 0
    // first 5 hits: stacks 1→5 (5th triggers surge, stacks → 0)
    // hits 6-8: stacks 1→3
    expect(player.furyStacks).toBe(3)
    // 5 hits → surge → 0 stacks, then 3 more
  })

  it('triggers surge and clears stacks when reaching 5', () => {
    const player = makePlayer('tank')
    const { runtime } = makeRuntime(player)
    for (let i = 0; i < 5; i++) runtime.onHitTaken(player.id, 100)
    expect(player.furyNextMeleeIsSurge).toBe(true)
    expect(player.furyStacks).toBe(0) // consumed on surge trigger
  })

  it('grants +1 stack every 3rd sword hit landed', () => {
    const player = makePlayer('tank')
    const { runtime } = makeRuntime(player)
    runtime.onSwordHitLanded(player.id, 100)
    expect(player.furyStacks).toBe(0) // 1st hit: no stack yet
    runtime.onSwordHitLanded(player.id, 101)
    expect(player.furyStacks).toBe(0) // 2nd hit: no stack
    runtime.onSwordHitLanded(player.id, 102)
    expect(player.furyStacks).toBe(1) // 3rd hit: +1 stack
    runtime.onSwordHitLanded(player.id, 103)
    expect(player.furyStacks).toBe(1) // 4th: no new stack
    runtime.onSwordHitLanded(player.id, 104)
    expect(player.furyStacks).toBe(1) // 5th: no new stack
    runtime.onSwordHitLanded(player.id, 105)
    expect(player.furyStacks).toBe(2) // 6th: +1 stack
  })

  it('getMeleeDamageMult returns 1 + stacks * 0.08', () => {
    const player = makePlayer('tank')
    const { runtime } = makeRuntime(player)
    player.furyStacks = 3
    expect(runtime.getMeleeDamageMult(player)).toBeCloseTo(1.24, 5)
  })

  it('getMeleeDamageMult returns 1 for non-tank', () => {
    const player = makePlayer('archer')
    const { runtime } = makeRuntime(player)
    player.furyStacks = 5
    expect(runtime.getMeleeDamageMult(player)).toBe(1)
  })

  it('consumeSurge clears flag and returns true exactly once', () => {
    const player = makePlayer('tank')
    const { runtime } = makeRuntime(player)
    player.furyNextMeleeIsSurge = true
    expect(runtime.consumeSurge(player)).toBe(true)
    expect(player.furyNextMeleeIsSurge).toBe(false)
    expect(runtime.consumeSurge(player)).toBe(false)
  })

  it('does not grant stacks for non-tank sword hits', () => {
    const player = makePlayer('hybrid')
    const { runtime } = makeRuntime(player)
    for (let i = 0; i < 3; i++) runtime.onSwordHitLanded(player.id, 100 + i)
    expect(player.furyStacks).toBe(0)
  })

  it('decays stacks after 4 s of inactivity', () => {
    const player = makePlayer('tank')
    const { runtime } = makeRuntime(player)
    const FPS = 60
    // Add a stack at tick 0
    runtime.onHitTaken(player.id, 0)
    expect(player.furyStacks).toBe(1)
    // Simulate 5 s of ticks (> 4 s decay delay) at 0.5 stacks/s
    const dt = 1 / FPS
    for (let t = 0; t < 5 * FPS; t++) runtime.tick(player.id, player, dt, t)
    expect(player.furyStacks).toBe(0)
  })

  it('brace_recovery enhanced heal: consumes surge for +50 HP bonus', () => {
    const player = makePlayer('tank')
    const { state, runtime } = makeRuntime(player)
    player.furyNextMeleeIsSurge = true
    const bonus = runtime.getRecoveryHealBonus(player.id, 'brace_recovery', state.tick)
    expect(bonus).toBe(50)
    expect(player.furyNextMeleeIsSurge).toBe(false) // consumed
  })

  it('brace_recovery no bonus when fury is not maxed', () => {
    const player = makePlayer('tank')
    const { state, runtime } = makeRuntime(player)
    player.furyStacks = 2
    expect(runtime.getRecoveryHealBonus(player.id, 'brace_recovery', state.tick)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// MOMENTUM (Archer)
// ---------------------------------------------------------------------------

describe('Momentum (Archer)', () => {
  it('gains momentum while moving', () => {
    const player = makePlayer('archer')
    const { runtime } = makeRuntime(player)
    player.vx = 3
    player.vz = 4 // speed 5 > 0.5 threshold
    runtime.tick(player.id, player, 1, 100)
    expect(player.momentum).toBeGreaterThan(0)
  })

  it('does not gain momentum while stationary', () => {
    const player = makePlayer('archer')
    const { runtime } = makeRuntime(player)
    player.vx = 0
    player.vz = 0
    runtime.tick(player.id, player, 1, 100)
    expect(player.momentum).toBe(0)
  })

  it('resets momentum to 0 on hit taken', () => {
    const player = makePlayer('archer')
    const { runtime } = makeRuntime(player)
    player.momentum = 75
    runtime.onHitTaken(player.id, 100)
    expect(player.momentum).toBe(0)
  })

  it('caps momentum at 100', () => {
    const player = makePlayer('archer')
    const { runtime } = makeRuntime(player)
    player.vx = 10
    player.vz = 0
    // 100 / 12 ≈ 8.3 seconds to fill
    for (let i = 0; i < 600; i++) runtime.tick(player.id, player, 1 / 60, 100 + i)
    expect(player.momentum).toBe(100)
  })

  it('getBowChargeTimeSec returns fast time at 60+ momentum', () => {
    const player = makePlayer('archer')
    const { runtime } = makeRuntime(player)
    player.momentum = MOMENTUM_BOW_BONUS_THRESHOLD
    expect(runtime.getBowChargeTimeSec(2.0, player)).toBe(MOMENTUM_BOW_CHARGE_FAST_SEC)
  })

  it('getBowChargeTimeSec returns base time below threshold', () => {
    const player = makePlayer('archer')
    const { runtime } = makeRuntime(player)
    player.momentum = 50
    expect(runtime.getBowChargeTimeSec(2.0, player)).toBe(2.0)
  })

  it('getMomentumCooldownMult returns 0.85 at max momentum', () => {
    const player = makePlayer('archer')
    const { runtime } = makeRuntime(player)
    player.momentum = 100
    expect(runtime.getMomentumCooldownMult(player)).toBeCloseTo(0.85, 5)
  })

  it('getMomentumCooldownMult returns 1.0 below max', () => {
    const player = makePlayer('archer')
    const { runtime } = makeRuntime(player)
    player.momentum = 99
    expect(runtime.getMomentumCooldownMult(player)).toBe(1)
  })

  it('hunters_flow: bonus +25 HP when momentum >= 60', () => {
    const player = makePlayer('archer')
    const { state, runtime } = makeRuntime(player)
    player.momentum = 70
    expect(runtime.getRecoveryHealBonus(player.id, 'hunters_flow', state.tick)).toBe(25)
  })

  it('hunters_flow: no bonus when momentum < 60', () => {
    const player = makePlayer('archer')
    const { state, runtime } = makeRuntime(player)
    player.momentum = 50
    expect(runtime.getRecoveryHealBonus(player.id, 'hunters_flow', state.tick)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// RISONANZA (Mago)
// ---------------------------------------------------------------------------

describe('Risonanza (Mago)', () => {
  it('arms the window on first elemental cast', () => {
    const player = makePlayer('mage')
    const { state, runtime } = makeRuntime(player)
    runtime.onAbilityCast(player.id, 'fireball', 'fire', { yaw: 0, pitch: 0 }, state.tick)
    expect(player.risonanzaElement).toBe('fire')
    expect(player.risonanzaArmedUntilTick).toBeGreaterThan(state.tick)
  })

  it('fires proc and clears window on second same-element cast within window', () => {
    const player = makePlayer('mage')
    const procs: RisonanzaProcRequest[] = []
    const { state, runtime } = makeRuntime(player, (req) => procs.push(req))
    const now = 100
    runtime.onAbilityCast(player.id, 'fireball', 'fire', { yaw: 0, pitch: 0 }, now)
    runtime.onAbilityCast(player.id, 'ignite', 'fire', { yaw: 0, pitch: 0 }, now + 10)
    expect(procs).toHaveLength(1)
    expect(procs[0]!.element).toBe('fire')
    expect(player.risonanzaElement).toBe('')
    expect(player.risonanzaArmedUntilTick).toBe(0)
  })

  it('does not proc on different elements', () => {
    const player = makePlayer('mage')
    const procs: RisonanzaProcRequest[] = []
    const { state, runtime } = makeRuntime(player, (req) => procs.push(req))
    const now = 100
    runtime.onAbilityCast(player.id, 'fireball', 'fire', { yaw: 0, pitch: 0 }, now)
    runtime.onAbilityCast(player.id, 'frost_bolt', 'ice', { yaw: 0, pitch: 0 }, now + 10)
    expect(procs).toHaveLength(0)
    // Ice overwrites the fire window
    expect(player.risonanzaElement).toBe('ice')
  })

  it('does not proc after window expires', () => {
    const player = makePlayer('mage')
    const procs: RisonanzaProcRequest[] = []
    const { state, runtime } = makeRuntime(player, (req) => procs.push(req))
    const now = 100
    runtime.onAbilityCast(player.id, 'fireball', 'fire', { yaw: 0, pitch: 0 }, now)
    const WINDOW_TICKS = Math.round(2.5 * 60)
    // Cast after window expires
    runtime.onAbilityCast(player.id, 'ignite', 'fire', { yaw: 0, pitch: 0 }, now + WINDOW_TICKS + 5)
    // Should re-arm, not proc
    expect(procs).toHaveLength(0)
    expect(player.risonanzaElement).toBe('fire')
  })

  it('ignores non-mage players for Risonanza', () => {
    const player = makePlayer('hybrid')
    const procs: RisonanzaProcRequest[] = []
    const { state, runtime } = makeRuntime(player, (req) => procs.push(req))
    runtime.onAbilityCast(player.id, 'fireball', 'fire', { yaw: 0, pitch: 0 }, 100)
    runtime.onAbilityCast(player.id, 'fireball', 'fire', { yaw: 0, pitch: 0 }, 110)
    expect(procs).toHaveLength(0)
    expect(player.risonanzaElement).toBe('') // hybrid: no arming
  })

  it('arcane_rebind: consumes Risonanza window for +50 HP bonus', () => {
    const player = makePlayer('mage')
    const { state, runtime } = makeRuntime(player)
    // Arm a fire window
    player.risonanzaElement = 'fire'
    player.risonanzaArmedUntilTick = state.tick + 100
    const bonus = runtime.getRecoveryHealBonus(player.id, 'arcane_rebind', state.tick)
    expect(bonus).toBe(50)
    expect(player.risonanzaElement).toBe('')
    expect(player.risonanzaArmedUntilTick).toBe(0)
  })

  it('arcane_rebind: no bonus when window is expired', () => {
    const player = makePlayer('mage')
    const { state, runtime } = makeRuntime(player)
    player.risonanzaElement = 'fire'
    player.risonanzaArmedUntilTick = state.tick - 1 // already expired
    expect(runtime.getRecoveryHealBonus(player.id, 'arcane_rebind', state.tick)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// FLOW (Hybrid)
// ---------------------------------------------------------------------------

describe('Flow (Hybrid)', () => {
  it('gains 1 stack per weapon swap', () => {
    const player = makePlayer('hybrid')
    const { runtime } = makeRuntime(player)
    runtime.onWeaponSwap(player.id, 100)
    expect(player.flowStacks).toBe(1)
    runtime.onWeaponSwap(player.id, 200)
    expect(player.flowStacks).toBe(2)
  })

  it('sets flowPendingBonus at 3 stacks', () => {
    const player = makePlayer('hybrid')
    const { runtime } = makeRuntime(player)
    runtime.onWeaponSwap(player.id, 100)
    runtime.onWeaponSwap(player.id, 200)
    runtime.onWeaponSwap(player.id, 300)
    expect(player.flowStacks).toBe(3)
    expect(player.flowPendingBonus).toBe(true)
  })

  it('does not accumulate stacks for non-hybrid', () => {
    const player = makePlayer('tank')
    const { runtime } = makeRuntime(player)
    runtime.onWeaponSwap(player.id, 100)
    expect(player.flowStacks).toBe(0)
  })

  it('markFlowDamagePending + consumeFlowDamagePending round-trip', () => {
    const player = makePlayer('hybrid')
    const { runtime } = makeRuntime(player)
    runtime.markFlowDamagePending(player.id)
    expect(runtime.consumeFlowDamagePending(player.id)).toBe(true)
    expect(runtime.consumeFlowDamagePending(player.id)).toBe(false) // consumed
  })

  it('FLOW_DAMAGE_BONUS_FRAC is 0.20 (+20%)', () => {
    expect(FLOW_DAMAGE_BONUS_FRAC).toBeCloseTo(0.20, 5)
  })

  it('flow stacks decay after 8 s without a swap', () => {
    const player = makePlayer('hybrid')
    const { runtime } = makeRuntime(player)
    const FPS = 60
    runtime.onWeaponSwap(player.id, 0)
    runtime.onWeaponSwap(player.id, 10)
    expect(player.flowStacks).toBe(2)
    const dt = 1 / FPS
    // Simulate 9 s without swapping (> 8 s decay)
    for (let t = 0; t < 9 * FPS; t++) runtime.tick(player.id, player, dt, t)
    expect(player.flowStacks).toBeLessThan(2)
  })

  it('adaptive_mend: consumes max flow stacks for +40 HP bonus', () => {
    const player = makePlayer('hybrid')
    const { state, runtime } = makeRuntime(player)
    runtime.onWeaponSwap(player.id, 0)
    runtime.onWeaponSwap(player.id, 1)
    runtime.onWeaponSwap(player.id, 2) // flowStacks = 3, flowPendingBonus = true
    const bonus = runtime.getRecoveryHealBonus(player.id, 'adaptive_mend', state.tick)
    expect(bonus).toBe(40)
    expect(player.flowStacks).toBe(0)
    expect(player.flowPendingBonus).toBe(false)
  })

  it('adaptive_mend: no bonus when stacks < 3', () => {
    const player = makePlayer('hybrid')
    const { state, runtime } = makeRuntime(player)
    runtime.onWeaponSwap(player.id, 0) // only 1 stack
    expect(runtime.getRecoveryHealBonus(player.id, 'adaptive_mend', state.tick)).toBe(0)
  })

  it('adaptive_mend: consuming flow also clears pending damage bonus', () => {
    const player = makePlayer('hybrid')
    const { state, runtime } = makeRuntime(player)
    runtime.onWeaponSwap(player.id, 0)
    runtime.onWeaponSwap(player.id, 1)
    runtime.onWeaponSwap(player.id, 2) // max stacks
    runtime.markFlowDamagePending(player.id) // mark damage bonus
    runtime.getRecoveryHealBonus(player.id, 'adaptive_mend', state.tick) // consumes flow
    // damage bonus should be cancelled
    expect(runtime.consumeFlowDamagePending(player.id)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

describe('ClassMechanicRuntime lifecycle', () => {
  it('reset clears all replicated mechanic state', () => {
    const player = makePlayer('tank')
    const { runtime } = makeRuntime(player)
    runtime.onHitTaken(player.id, 100)
    runtime.onHitTaken(player.id, 101)
    player.furyNextMeleeIsSurge = true
    runtime.reset(player.id)
    expect(player.furyStacks).toBe(0)
    expect(player.furyNextMeleeIsSurge).toBe(false)
    expect(player.momentum).toBe(0)
    expect(player.risonanzaElement).toBe('')
    expect(player.flowStacks).toBe(0)
    expect(player.flowPendingBonus).toBe(false)
  })

  it('no cross-class leakage: tank fields do not change for mage', () => {
    const player = makePlayer('mage')
    const { runtime } = makeRuntime(player)
    runtime.onHitTaken(player.id, 100) // mage: neither Fury nor Momentum
    expect(player.furyStacks).toBe(0)
    expect(player.momentum).toBe(0)
  })
})
