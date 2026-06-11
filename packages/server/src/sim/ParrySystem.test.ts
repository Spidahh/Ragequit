import {
  GameState,
  MessageTypes,
  PARRY_HOLD_DRAIN_PER_SEC,
  PARRY_TAP_COOLDOWN_SEC,
  PARRY_TAP_COST_STAMINA,
  PARRY_TAP_WINDOW_SEC,
  Player,
  TICK_RATE_HZ,
  type ServerAbilityFailedMessage,
  type ServerParryEventMessage,
} from '@ragequit/shared'
import { describe, expect, it } from 'vitest'

import { ParrySystem, type ParrySystemHost } from './ParrySystem.js'

// Derive the same tick conversions the system uses, from shared constants, so
// the test stays in lock-step with the source of truth instead of hardcoding
// magic numbers.
const TAP_WINDOW_TICKS = Math.round(PARRY_TAP_WINDOW_SEC * TICK_RATE_HZ) // 30
const TAP_COOLDOWN_TICKS = Math.round(PARRY_TAP_COOLDOWN_SEC * TICK_RATE_HZ) // 180
const DT = 1 / TICK_RATE_HZ

interface FailureRecord {
  sid: string
  abilityId: string
  reason: ServerAbilityFailedMessage['reason']
}
interface StaminaSync {
  playerId: string
  stamina: number
}
interface BroadcastRecord {
  type: string
  message: unknown
}

// Synthetic host: a real GameState + Player, plus recording arrays for every
// host callback (same pattern as AbilityEngine.test.ts / cast-validation.test.ts).
function makeHarness(playerOverrides: Partial<Player> = {}) {
  const state = new GameState()

  const player = new Player()
  player.id = 'A'
  player.alive = true
  player.casting = false
  player.stamina = 100
  player.weaponSwapEndTick = 0
  player.parryCooldownReadyAtTick = 0
  player.bowChargeStartTick = 0
  Object.assign(player, playerOverrides)
  state.players.set('A', player)

  const failures: FailureRecord[] = []
  const staminaSyncs: StaminaSync[] = []
  const broadcasts: BroadcastRecord[] = []

  const host: ParrySystemHost = {
    state,
    sendAbilityFailed: (sid, abilityId, reason) => failures.push({ sid, abilityId, reason }),
    syncSimStamina: (playerId, stamina) => staminaSyncs.push({ playerId, stamina }),
    broadcast: (type, message) => broadcasts.push({ type, message }),
  }

  const parry = new ParrySystem(host)

  const parryEvents = (): ServerParryEventMessage[] =>
    broadcasts
      .filter((b) => b.type === MessageTypes.ParryEvent)
      .map((b) => b.message as ServerParryEventMessage)

  return { state, player, parry, failures, staminaSyncs, broadcasts, parryEvents }
}

describe('ParrySystem — press opens a tap window', () => {
  it('enters tap mode, sets the window end tick, and broadcasts tapStart', () => {
    const h = makeHarness()
    h.state.tick = 10

    h.parry.press('A')

    expect(h.player.parrying).toBe(true)
    expect(h.player.parryIsHold).toBe(false)
    expect(h.player.parryTapEndsAtTick).toBe(10 + TAP_WINDOW_TICKS)
    // No stamina is spent merely by pressing.
    expect(h.player.stamina).toBe(100)
    expect(h.failures).toEqual([])

    const events = h.parryEvents()
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({ playerId: 'A', kind: 'tapStart', atTick: 10 })
  })

  it('cancels an in-progress bow draw when the parry opens', () => {
    const h = makeHarness({ bowChargeStartTick: 5 })
    h.state.tick = 12

    h.parry.press('A')

    expect(h.player.bowChargeStartTick).toBe(0)
  })
})

describe('ParrySystem — release inside the window finalises a tap', () => {
  it('burns PARRY_TAP_COST_STAMINA, sets the cooldown, and emits tapEnd', () => {
    const h = makeHarness()
    h.state.tick = 0
    h.parry.press('A')

    // Release before the window has elapsed (heldTicks < TAP_WINDOW_TICKS).
    h.state.tick = 10
    h.parry.release('A')

    expect(h.player.stamina).toBe(100 - PARRY_TAP_COST_STAMINA)
    expect(h.player.parryCooldownReadyAtTick).toBe(10 + TAP_COOLDOWN_TICKS)
    expect(h.player.parrying).toBe(false)
    expect(h.player.parryIsHold).toBe(false)
    expect(h.player.parryTapEndsAtTick).toBe(0)

    // Stamina change is synced to the sim once, with the post-burn value.
    expect(h.staminaSyncs).toEqual([{ playerId: 'A', stamina: 80 }])

    const kinds = h.parryEvents().map((e) => e.kind)
    expect(kinds).toEqual(['tapStart', 'tapEnd'])
  })

  it('treats release exactly on the last window tick as a completed tap (boundary)', () => {
    const h = makeHarness()
    h.state.tick = 0
    h.parry.press('A')

    // heldTicks === TAP_WINDOW_TICKS still satisfies `heldTicks <= window`.
    h.state.tick = TAP_WINDOW_TICKS
    h.parry.release('A')

    expect(h.player.stamina).toBe(80)
    expect(h.player.parryCooldownReadyAtTick).toBe(TAP_WINDOW_TICKS + TAP_COOLDOWN_TICKS)
    expect(h.parryEvents().map((e) => e.kind)).toEqual(['tapStart', 'tapEnd'])
  })
})

describe('ParrySystem — holding past the window converts to hold mode', () => {
  it('flips to hold on the first tick at/after the window end and emits holdStart', () => {
    const h = makeHarness()
    h.state.tick = 0
    h.parry.press('A')

    // Advance to the tick the window expires and run the system tick.
    h.state.tick = TAP_WINDOW_TICKS
    h.parry.tick(h.state.tick, DT)

    expect(h.player.parryIsHold).toBe(true)
    expect(h.player.parryTapEndsAtTick).toBe(0)
    // One full drain tick has been applied (stamina dropped by 15/60).
    expect(h.player.stamina).toBeCloseTo(100 - PARRY_HOLD_DRAIN_PER_SEC * DT, 6)

    const kinds = h.parryEvents().map((e) => e.kind)
    expect(kinds).toEqual(['tapStart', 'holdStart'])
  })

  it('drains stamina per tick while held and cancels the parry once empty', () => {
    // The press gate requires >= PARRY_TAP_COST_STAMINA to open at all, so we
    // must START with enough to tap; the hold then drains it to zero. Drain is
    // PARRY_HOLD_DRAIN_PER_SEC/tick === 0.25/tick, so 20 stamina empties in
    // exactly 20 / 0.25 = 80 drain ticks (a deterministic count).
    const drainPerTick = PARRY_HOLD_DRAIN_PER_SEC * DT
    const startStamina = PARRY_TAP_COST_STAMINA // 20
    const ticksToEmpty = Math.round(startStamina / drainPerTick) // 80
    const h = makeHarness({ stamina: startStamina })
    h.state.tick = 0
    h.parry.press('A')
    expect(h.player.parrying).toBe(true) // press succeeded (stamina met the cost)

    // First system tick at the window edge converts tap -> hold and drains once.
    h.state.tick = TAP_WINDOW_TICKS
    h.parry.tick(h.state.tick, DT)
    expect(h.player.parryIsHold).toBe(true)
    expect(h.player.parrying).toBe(true)
    expect(h.player.stamina).toBeCloseTo(startStamina - drainPerTick, 6)

    // Keep ticking. The parry must survive every tick until the one that hits 0.
    for (let i = 2; i < ticksToEmpty; i++) {
      h.state.tick = TAP_WINDOW_TICKS + (i - 1)
      h.parry.tick(h.state.tick, DT)
      expect(h.player.parrying).toBe(true)
    }
    // Stamina is now one drain step away from empty.
    expect(h.player.stamina).toBeCloseTo(drainPerTick, 6)

    // Final drain tick empties stamina and cancels the hold.
    h.state.tick = TAP_WINDOW_TICKS + (ticksToEmpty - 1)
    h.parry.tick(h.state.tick, DT)
    expect(h.player.stamina).toBe(0)
    expect(h.player.parrying).toBe(false)
    expect(h.player.parryIsHold).toBe(false)

    // Hold drain does NOT set a tap cooldown — releasing/ending a hold is CD-free.
    expect(h.player.parryCooldownReadyAtTick).toBe(0)

    // Lifecycle: tapStart → holdStart → holdEnd (on the empty-stamina cancel).
    expect(h.parryEvents().map((e) => e.kind)).toEqual(['tapStart', 'holdStart', 'holdEnd'])
  })

  it('emits holdEnd (not tapEnd) when an active hold is released', () => {
    const h = makeHarness()
    h.state.tick = 0
    h.parry.press('A')

    h.state.tick = TAP_WINDOW_TICKS
    h.parry.tick(h.state.tick, DT) // -> hold mode
    const staminaAfterConvert = h.player.stamina

    h.state.tick = TAP_WINDOW_TICKS + 5
    h.parry.release('A')

    // Releasing a hold does not burn the tap cost nor set a cooldown.
    expect(h.player.stamina).toBe(staminaAfterConvert)
    expect(h.player.parryCooldownReadyAtTick).toBe(0)
    expect(h.player.parrying).toBe(false)
    expect(h.parryEvents().map((e) => e.kind)).toEqual(['tapStart', 'holdStart', 'holdEnd'])
  })
})

describe('ParrySystem — release exactly on window expiry (bypass fix)', () => {
  it('burns stamina + sets cooldown when released past the window before tick() converts it', () => {
    const h = makeHarness()
    h.state.tick = 0
    h.parry.press('A')

    // Release one tick PAST the window without ever running tick(): heldTicks
    // (31) > TAP_WINDOW_TICKS (30) and parryIsHold is still false, so this takes
    // the else-branch that closes the 1-tick free-parry bypass.
    h.state.tick = TAP_WINDOW_TICKS + 1
    expect(h.player.parryIsHold).toBe(false)
    h.parry.release('A')

    expect(h.player.stamina).toBe(100 - PARRY_TAP_COST_STAMINA)
    expect(h.player.parryCooldownReadyAtTick).toBe(TAP_WINDOW_TICKS + 1 + TAP_COOLDOWN_TICKS)
    expect(h.staminaSyncs).toEqual([{ playerId: 'A', stamina: 80 }])
    // Treated as a completed tap, so the close event is tapEnd.
    expect(h.parryEvents().map((e) => e.kind)).toEqual(['tapStart', 'tapEnd'])
  })
})

describe('ParrySystem — cooldown gates new taps', () => {
  it('blocks a fresh press while the tap cooldown is still active', () => {
    const h = makeHarness()
    h.state.tick = 0
    h.parry.press('A')
    h.state.tick = 5
    h.parry.release('A') // CD now ready at 5 + 180 = 185

    // A new press inside the cooldown window must fail with reason 'cooldown'.
    h.state.tick = 100
    expect(h.state.tick).toBeLessThan(h.player.parryCooldownReadyAtTick)
    h.parry.press('A')

    expect(h.player.parrying).toBe(false)
    expect(h.failures.at(-1)).toEqual({ sid: 'A', abilityId: 'parry', reason: 'cooldown' })
  })

  it('allows a new press once the cooldown has elapsed', () => {
    const h = makeHarness()
    h.state.tick = 0
    h.parry.press('A')
    h.state.tick = 5
    h.parry.release('A')

    // Step to the exact tick the cooldown becomes ready (gate is strict `<`).
    h.state.tick = h.player.parryCooldownReadyAtTick
    h.parry.press('A')

    expect(h.player.parrying).toBe(true)
    expect(h.failures).toEqual([])
  })
})

describe('ParrySystem — insufficient stamina blocks the press', () => {
  it('rejects the press with reason cost and never enters parry', () => {
    const h = makeHarness({ stamina: PARRY_TAP_COST_STAMINA - 1 }) // 19 < 20
    h.state.tick = 0

    h.parry.press('A')

    expect(h.player.parrying).toBe(false)
    expect(h.player.parryTapEndsAtTick).toBe(0)
    expect(h.failures).toEqual([{ sid: 'A', abilityId: 'parry', reason: 'cost' }])
    // No parry event broadcast on a rejected press.
    expect(h.parryEvents()).toEqual([])
  })

  it('allows the press when stamina exactly meets the tap cost', () => {
    const h = makeHarness({ stamina: PARRY_TAP_COST_STAMINA }) // 20 == 20 → not `< cost`
    h.state.tick = 0

    h.parry.press('A')

    expect(h.player.parrying).toBe(true)
    expect(h.failures).toEqual([])
  })
})
