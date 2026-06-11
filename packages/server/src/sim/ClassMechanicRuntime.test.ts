import { Player, type ClassId } from '@ragequit/shared'
import { describe, expect, it } from 'vitest'

import {
  ClassMechanicRuntime,
  FLOW_DAMAGE_BONUS_FRAC,
  FURY_STACK_DAMAGE_FRAC,
  FURY_SURGE_DAMAGE_BONUS,
  MOMENTUM_BOW_BONUS_THRESHOLD,
  MOMENTUM_BOW_CHARGE_FAST_SEC,
  type RisonanzaProcRequest,
} from './ClassMechanicRuntime.js'

// TICK_RATE_HZ is 60. We re-declare it locally so the maths in the assertions
// stays self-documenting without importing the runtime's private constants.
const TICK = 60

interface Harness {
  runtime: ClassMechanicRuntime
  state: { players: Map<string, Player>; tick: number }
  procs: { req: RisonanzaProcRequest; now: number }[]
  player: Player
}

// Build a synthetic single-player world wired to a recording array for the
// Risonanza proc callback — same shape AbilityEngine.test.ts uses for its host
// sinks. No wall-clock / randomness anywhere: callers pass explicit tick numbers.
function mkHarness(classId: ClassId, sid = 'A'): Harness {
  const player = new Player()
  player.id = sid
  player.classId = classId
  const players = new Map<string, Player>([[sid, player]])
  const state = { players, tick: 0 }
  const procs: { req: RisonanzaProcRequest; now: number }[] = []
  const runtime = new ClassMechanicRuntime(state, (req, now) => procs.push({ req, now }))
  return { runtime, state, procs, player }
}

const AIM = { yaw: 0, pitch: 0 }

// ---------------------------------------------------------------------------
// Fury (tank): stacks on hit / sword combo, surge at cap, damage mult, decay
// ---------------------------------------------------------------------------

describe('ClassMechanicRuntime — Fury (tank)', () => {
  it('increments one stack per hit taken up to the cap', () => {
    const h = mkHarness('tank')
    for (let i = 1; i <= 4; i++) {
      h.runtime.onHitTaken('A', i * 10)
      expect(h.player.furyStacks).toBe(i)
    }
    // Fifth hit would reach the cap (5) and trigger surge instead — covered below.
  })

  it('scales melee damage by 0.08 per stack', () => {
    const h = mkHarness('tank')
    expect(h.runtime.getMeleeDamageMult(h.player)).toBe(1)
    h.runtime.onHitTaken('A', 10)
    h.runtime.onHitTaken('A', 20)
    h.runtime.onHitTaken('A', 30)
    expect(h.player.furyStacks).toBe(3)
    expect(h.runtime.getMeleeDamageMult(h.player)).toBeCloseTo(1 + 3 * FURY_STACK_DAMAGE_FRAC)
    expect(FURY_STACK_DAMAGE_FRAC).toBe(0.08)
  })

  it('triggers Fury Surge at the 5th stack, then resets stacks to 0', () => {
    const h = mkHarness('tank')
    for (let i = 1; i <= 4; i++) h.runtime.onHitTaken('A', i * 10)
    expect(h.player.furyStacks).toBe(4)
    expect(h.player.furyNextMeleeIsSurge).toBe(false)

    // 5th hit reaches the cap and fires the surge: stacks reset, surge armed.
    h.runtime.onHitTaken('A', 50)
    expect(h.player.furyStacks).toBe(0)
    expect(h.player.furyNextMeleeIsSurge).toBe(true)
  })

  it('consumeSurge returns true once then clears the armed flag', () => {
    const h = mkHarness('tank')
    for (let i = 1; i <= 5; i++) h.runtime.onHitTaken('A', i * 10)
    expect(h.player.furyNextMeleeIsSurge).toBe(true)

    expect(h.runtime.consumeSurge(h.player)).toBe(true)
    expect(h.player.furyNextMeleeIsSurge).toBe(false)
    // Second consume finds nothing armed.
    expect(h.runtime.consumeSurge(h.player)).toBe(false)
  })

  it('grants a stack every 3rd sword hit, surging on the hit that caps stacks', () => {
    const h = mkHarness('tank')
    // 12 sword hits -> 4 stacks (one per 3 hits). No surge yet (cap is 5).
    for (let i = 1; i <= 12; i++) h.runtime.onSwordHitLanded('A', i)
    expect(h.player.furyStacks).toBe(4)
    expect(h.player.furyNextMeleeIsSurge).toBe(false)

    // 3 more hits -> 5th stack -> surge fires, stacks reset.
    for (let i = 13; i <= 15; i++) h.runtime.onSwordHitLanded('A', i)
    expect(h.player.furyStacks).toBe(0)
    expect(h.player.furyNextMeleeIsSurge).toBe(true)
  })

  it('does not decay before the 4 s idle delay elapses', () => {
    const h = mkHarness('tank')
    h.runtime.onHitTaken('A', 100) // furyLastCombatTick = 100, stacks = 1
    // 3 s idle (< 4 s delay): no decay.
    h.runtime.tick('A', h.player, 1 / TICK, 100 + 3 * TICK)
    expect(h.player.furyStacks).toBe(1)
  })

  it('decays stacks at 0.5/s after the idle delay', () => {
    const h = mkHarness('tank')
    for (let i = 1; i <= 4; i++) h.runtime.onHitTaken('A', 100) // 4 stacks, lastCombat = 100
    expect(h.player.furyStacks).toBe(4)

    // 5 s idle (> 4 s delay). One full-second tick removes 0.5 stacks.
    const now = 100 + 5 * TICK
    h.runtime.tick('A', h.player, 1, now)
    expect(h.player.furyStacks).toBeCloseTo(3.5)
  })

  it('snaps near-zero stacks to exactly 0 when decaying', () => {
    const h = mkHarness('tank')
    h.runtime.onHitTaken('A', 100) // 1 stack
    h.player.furyStacks = 0.004 // just below the 0.01 snap threshold
    const now = 100 + 5 * TICK
    h.runtime.tick('A', h.player, 0.001, now)
    expect(h.player.furyStacks).toBe(0)
  })

  it('exposes the documented surge damage bonus constant', () => {
    // FURY_SURGE_DAMAGE_BONUS is the consumer-facing payload of a surge hit.
    expect(FURY_SURGE_DAMAGE_BONUS).toBe(0.4)
  })

  it('brace_recovery heal bonus consumes the armed surge', () => {
    const h = mkHarness('tank')
    for (let i = 1; i <= 5; i++) h.runtime.onHitTaken('A', i * 10)
    expect(h.player.furyNextMeleeIsSurge).toBe(true)

    expect(h.runtime.getRecoveryHealBonus('A', 'brace_recovery', 100)).toBe(50)
    expect(h.player.furyNextMeleeIsSurge).toBe(false)
    // No surge left -> no bonus.
    expect(h.runtime.getRecoveryHealBonus('A', 'brace_recovery', 100)).toBe(0)
    // Unrelated ability never pays out.
    expect(h.runtime.getRecoveryHealBonus('A', 'hunters_flow', 100)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Momentum (archer): build while moving, reset on hit, bow + CDR rewards
// ---------------------------------------------------------------------------

describe('ClassMechanicRuntime — Momentum (archer)', () => {
  it('builds momentum at 12/s only while moving above the speed gate', () => {
    const h = mkHarness('archer')
    h.player.vx = 5
    h.player.vz = 0
    h.runtime.tick('A', h.player, 1, 0)
    expect(h.player.momentum).toBeCloseTo(12)

    // Standing still (below the 0.25 vxz^2 gate): no further gain.
    h.player.vx = 0
    h.player.vz = 0
    h.runtime.tick('A', h.player, 1, 60)
    expect(h.player.momentum).toBeCloseTo(12)
  })

  it('caps momentum at 100', () => {
    const h = mkHarness('archer')
    h.player.vx = 5
    h.runtime.tick('A', h.player, 100, 0) // would be 1200 uncapped
    expect(h.player.momentum).toBe(100)
  })

  it('resets momentum to 0 when hit', () => {
    const h = mkHarness('archer')
    h.player.vx = 5
    h.runtime.tick('A', h.player, 5, 0)
    expect(h.player.momentum).toBeGreaterThan(0)
    h.runtime.onHitTaken('A', 60)
    expect(h.player.momentum).toBe(0)
  })

  it('speeds up the bow charge only at or above the momentum threshold', () => {
    const h = mkHarness('archer')
    const baseSec = 0.65
    h.player.momentum = MOMENTUM_BOW_BONUS_THRESHOLD - 1
    expect(h.runtime.getBowChargeTimeSec(baseSec, h.player)).toBe(baseSec)

    h.player.momentum = MOMENTUM_BOW_BONUS_THRESHOLD
    expect(h.runtime.getBowChargeTimeSec(baseSec, h.player)).toBe(MOMENTUM_BOW_CHARGE_FAST_SEC)
    // The fast charge must be a genuine speed-up vs the base.
    expect(MOMENTUM_BOW_CHARGE_FAST_SEC).toBeLessThan(baseSec)
  })

  it('grants cooldown reduction only at full momentum', () => {
    const h = mkHarness('archer')
    h.player.momentum = 99
    expect(h.runtime.getMomentumCooldownMult(h.player)).toBe(1)
    h.player.momentum = 100
    expect(h.runtime.getMomentumCooldownMult(h.player)).toBeCloseTo(0.85)
  })

  it('hunters_flow heal bonus keys off the momentum threshold', () => {
    const h = mkHarness('archer')
    h.player.momentum = MOMENTUM_BOW_BONUS_THRESHOLD - 1
    expect(h.runtime.getRecoveryHealBonus('A', 'hunters_flow', 0)).toBe(0)
    h.player.momentum = MOMENTUM_BOW_BONUS_THRESHOLD
    expect(h.runtime.getRecoveryHealBonus('A', 'hunters_flow', 0)).toBe(25)
  })
})

// ---------------------------------------------------------------------------
// Risonanza (mage): arm on element, proc on matching second cast, decay window
// ---------------------------------------------------------------------------

describe('ClassMechanicRuntime — Risonanza (mage)', () => {
  it('arms the element on the first elemental cast without procing', () => {
    const h = mkHarness('mage')
    h.runtime.onAbilityCast('A', 'fireball', 'fire', AIM, 100)
    expect(h.player.risonanzaElement).toBe('fire')
    // Window = 2.5 s * 60 = 150 ticks.
    expect(h.player.risonanzaArmedUntilTick).toBe(100 + Math.round(2.5 * TICK))
    expect(h.procs.length).toBe(0)
  })

  it('procs when the same element is cast again inside the window', () => {
    const h = mkHarness('mage')
    h.runtime.onAbilityCast('A', 'fireball', 'fire', AIM, 100)
    // Second matching cast 1 s later (well inside the 2.5 s window).
    h.runtime.onAbilityCast('A', 'fireball', 'fire', AIM, 100 + TICK)

    expect(h.procs.length).toBe(1)
    expect(h.procs[0]!.req.element).toBe('fire')
    expect(h.procs[0]!.req.casterSid).toBe('A')
    expect(h.procs[0]!.now).toBe(100 + TICK)
    // Window cleared after the proc.
    expect(h.player.risonanzaElement).toBe('')
    expect(h.player.risonanzaArmedUntilTick).toBe(0)
  })

  it('re-arms rather than procs when a different element is cast', () => {
    const h = mkHarness('mage')
    h.runtime.onAbilityCast('A', 'fireball', 'fire', AIM, 100)
    h.runtime.onAbilityCast('A', 'ice_lance', 'ice', AIM, 130)

    expect(h.procs.length).toBe(0)
    expect(h.player.risonanzaElement).toBe('ice')
    expect(h.player.risonanzaArmedUntilTick).toBe(130 + Math.round(2.5 * TICK))
  })

  it('does not proc when the matching cast lands after the window expired', () => {
    const h = mkHarness('mage')
    h.runtime.onAbilityCast('A', 'fireball', 'fire', AIM, 100)
    const armedUntil = h.player.risonanzaArmedUntilTick
    // Cast exactly at expiry tick — window is `now < armedUntil`, so this is stale.
    h.runtime.onAbilityCast('A', 'fireball', 'fire', AIM, armedUntil)

    expect(h.procs.length).toBe(0)
    // Treated as a fresh arm from the later cast.
    expect(h.player.risonanzaElement).toBe('fire')
    expect(h.player.risonanzaArmedUntilTick).toBe(armedUntil + Math.round(2.5 * TICK))
  })

  it('ignores non-elemental casts entirely', () => {
    const h = mkHarness('mage')
    h.runtime.onAbilityCast('A', 'quick_dash', 'none', AIM, 100)
    h.runtime.onAbilityCast('A', 'barrier', undefined, AIM, 110)
    expect(h.player.risonanzaElement).toBe('')
    expect(h.player.risonanzaArmedUntilTick).toBe(0)
    expect(h.procs.length).toBe(0)
  })

  it('arcane_rebind heal bonus consumes an armed resonance', () => {
    const h = mkHarness('mage')
    h.runtime.onAbilityCast('A', 'fireball', 'fire', AIM, 100)
    // Inside the window: pays the bonus and clears the arm.
    expect(h.runtime.getRecoveryHealBonus('A', 'arcane_rebind', 110)).toBe(50)
    expect(h.player.risonanzaElement).toBe('')
    expect(h.player.risonanzaArmedUntilTick).toBe(0)
    // Disarmed -> no further bonus.
    expect(h.runtime.getRecoveryHealBonus('A', 'arcane_rebind', 110)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Flow (hybrid): stacks on weapon swap, full-stack bonus, decay on idle swap
// ---------------------------------------------------------------------------

describe('ClassMechanicRuntime — Flow (hybrid)', () => {
  it('builds one stack per weapon swap up to the cap of 3', () => {
    const h = mkHarness('hybrid')
    h.runtime.onWeaponSwap('A', 10)
    expect(h.player.flowStacks).toBe(1)
    expect(h.player.flowPendingBonus).toBe(false)

    h.runtime.onWeaponSwap('A', 20)
    expect(h.player.flowStacks).toBe(2)
    expect(h.player.flowPendingBonus).toBe(false)
  })

  it('arms the full-stack damage bonus on reaching 3 stacks and holds at the cap', () => {
    const h = mkHarness('hybrid')
    for (const t of [10, 20, 30]) h.runtime.onWeaponSwap('A', t)
    expect(h.player.flowStacks).toBe(3)
    expect(h.player.flowPendingBonus).toBe(true)

    // A 4th swap stays clamped at the cap.
    h.runtime.onWeaponSwap('A', 40)
    expect(h.player.flowStacks).toBe(3)
  })

  it('adaptive_mend consumes the full-stack bonus and the pending Flow damage', () => {
    const h = mkHarness('hybrid')
    for (const t of [10, 20, 30]) h.runtime.onWeaponSwap('A', t)
    h.runtime.markFlowDamagePending('A')
    expect(h.runtime.consumeFlowDamagePending('A')).toBe(true) // sanity: it is pending
    h.runtime.markFlowDamagePending('A') // re-arm for the real consume below

    const bonus = h.runtime.getRecoveryHealBonus('A', 'adaptive_mend', 40)
    expect(bonus).toBe(40)
    expect(h.player.flowStacks).toBe(0)
    expect(h.player.flowPendingBonus).toBe(false)
    // The pending damage flag was consumed by the heal path.
    expect(h.runtime.consumeFlowDamagePending('A')).toBe(false)
  })

  it('adaptive_mend pays nothing below the full-stack threshold', () => {
    const h = mkHarness('hybrid')
    h.runtime.onWeaponSwap('A', 10) // only 1 stack
    expect(h.runtime.getRecoveryHealBonus('A', 'adaptive_mend', 20)).toBe(0)
    expect(h.player.flowStacks).toBe(1)
  })

  it('does not decay before the 8 s no-swap delay', () => {
    const h = mkHarness('hybrid')
    h.runtime.onWeaponSwap('A', 100) // 1 stack, lastSwap = 100
    // 7 s idle (< 8 s): no decay.
    h.runtime.tick('A', h.player, 1, 100 + 7 * TICK)
    expect(h.player.flowStacks).toBe(1)
  })

  it('decays exactly one stack after the no-swap delay and rearms the timer', () => {
    const h = mkHarness('hybrid')
    for (const t of [10, 20, 30]) h.runtime.onWeaponSwap('A', t) // 3 stacks, lastSwap = 30
    const now = 30 + 9 * TICK // 9 s after the last swap (> 8 s delay)
    h.runtime.tick('A', h.player, 1, now)
    expect(h.player.flowStacks).toBe(2)

    // The decay reset the timer to `now`; an immediate follow-up tick must NOT
    // decay again (delay has not re-elapsed).
    h.runtime.tick('A', h.player, 1, now + 1)
    expect(h.player.flowStacks).toBe(2)
  })

  it('exposes the documented Flow damage bonus constant', () => {
    expect(FLOW_DAMAGE_BONUS_FRAC).toBe(0.2)
  })
})

// ---------------------------------------------------------------------------
// Runtime housekeeping: per-class dispatch, reset, forget
// ---------------------------------------------------------------------------

describe('ClassMechanicRuntime — dispatch & lifecycle', () => {
  it('routes events only to the matching class mechanic', () => {
    // An archer must not gain Fury stacks from a hit; it loses momentum instead.
    const h = mkHarness('archer')
    h.player.momentum = 50
    h.runtime.onHitTaken('A', 10)
    expect(h.player.furyStacks).toBe(0)
    expect(h.player.momentum).toBe(0)
  })

  it('reset clears every class mechanic field and per-player state', () => {
    const h = mkHarness('tank')
    for (let i = 1; i <= 3; i++) h.runtime.onHitTaken('A', i * 10)
    h.player.furyNextMeleeIsSurge = true
    h.player.momentum = 40
    h.player.risonanzaElement = 'fire'
    h.player.risonanzaArmedUntilTick = 999
    h.player.flowStacks = 2
    h.player.flowPendingBonus = true
    h.runtime.markFlowDamagePending('A')

    h.runtime.reset('A')

    expect(h.player.furyStacks).toBe(0)
    expect(h.player.furyNextMeleeIsSurge).toBe(false)
    expect(h.player.momentum).toBe(0)
    expect(h.player.risonanzaElement).toBe('')
    expect(h.player.risonanzaArmedUntilTick).toBe(0)
    expect(h.player.flowStacks).toBe(0)
    expect(h.player.flowPendingBonus).toBe(false)
    expect(h.runtime.consumeFlowDamagePending('A')).toBe(false)

    // Per-player mechanic state was dropped: a fresh sword combo starts from 0,
    // so it takes a full 3 hits to earn the next stack.
    h.runtime.onSwordHitLanded('A', 200)
    h.runtime.onSwordHitLanded('A', 201)
    expect(h.player.furyStacks).toBe(0)
    h.runtime.onSwordHitLanded('A', 202)
    expect(h.player.furyStacks).toBe(1)
  })

  it('does nothing for events targeting an unknown player', () => {
    const h = mkHarness('tank')
    expect(() => h.runtime.onHitTaken('ghost', 10)).not.toThrow()
    expect(() => h.runtime.onSwordHitLanded('ghost', 10)).not.toThrow()
    expect(() => h.runtime.onWeaponSwap('ghost', 10)).not.toThrow()
    expect(() => h.runtime.onAbilityCast('ghost', 'fireball', 'fire', AIM, 10)).not.toThrow()
    expect(h.runtime.getRecoveryHealBonus('ghost', 'brace_recovery', 10)).toBe(0)
  })
})
