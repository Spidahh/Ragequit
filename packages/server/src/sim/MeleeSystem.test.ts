import {
  GameState,
  Player,
  SWORD_M1_COST_STAMINA,
  type ClientSwingMessage,
  type Player as PlayerType,
  type ServerAbilityFailedMessage,
  type StatusKind,
} from '@ragequit/shared'
import { describe, expect, it } from 'vitest'

import { MeleeSystem, type MeleeSystemHost } from './MeleeSystem.js'
import type { PendingDamage } from './damage-types.js'

// Derived swing timings (mirror MeleeSystem's module constants so the test is
// self-checking, not coupled to private values). At 60 Hz:
//   SWING_TICKS = round(0.4 * 60)        = 24
//   HIT_OFFSET  = round(24 * 0.5)        = 12
const SWING_TICKS = 24
const HIT_OFFSET_TICKS = 12

interface FailureRecord {
  sid: string
  abilityId: string
  reason: ServerAbilityFailedMessage['reason']
}

interface SyncStaminaRecord {
  playerId: string
  stamina: number
}

interface SyncPosRecord {
  playerId: string
  x: number
  z: number
}

interface HitLandedRecord {
  attackerId: string
  now: number
}

// A synthetic GameRoom slice. Records every host callback so assertions can
// inspect real state transitions rather than truthy stubs. resolveDisplacement
// defaults to a frictionless move (apply the full delta) so push geometry is
// deterministic and inspectable.
function makeHost(over: Partial<MeleeSystemHost> = {}) {
  const state = new GameState()

  const damage: PendingDamage[] = []
  const failures: FailureRecord[] = []
  const staminaSyncs: SyncStaminaRecord[] = []
  const posSyncs: SyncPosRecord[] = []
  const hitsLanded: HitLandedRecord[] = []

  const host: MeleeSystemHost = {
    state,
    enqueueDamage: (d) => damage.push(d),
    resolveDisplacement: (player, dx, dz) => ({
      x: player.transform.x + dx,
      z: player.transform.z + dz,
    }),
    syncSimPos: (playerId, x, z) => posSyncs.push({ playerId, x, z }),
    syncSimStamina: (playerId, stamina) => staminaSyncs.push({ playerId, stamina }),
    lookupHistory: () => null,
    sendAbilityFailed: (sid, abilityId, reason) => failures.push({ sid, abilityId, reason }),
    hasStatus: () => false,
    onSwordHitLanded: (attackerId, now) => hitsLanded.push({ attackerId, now }),
    ...over,
  }

  return { state, host, damage, failures, staminaSyncs, posSyncs, hitsLanded }
}

// Attacker at the origin facing forward (-Z, yaw 0).
function makeAttacker(over: Partial<PlayerType> = {}): Player {
  const p = new Player()
  p.id = 'A'
  p.alive = true
  p.activeWeapon = 'sword'
  p.casting = false
  p.stamina = 100
  p.comboIndex = 0
  p.swingEndsAtTick = 0
  p.lastSwingStartTick = 0
  p.weaponSwapEndTick = 0
  p.invulnUntilTick = 0
  p.transform.x = 0
  p.transform.y = 0
  p.transform.z = 0
  Object.assign(p, over)
  return p
}

// Victim 1.2 m straight ahead of the attacker — inside the 1.8 m / 90° cone.
function makeVictim(over: Partial<PlayerType> = {}): Player {
  const v = new Player()
  v.id = 'B'
  v.alive = true
  v.parrying = false
  v.invulnUntilTick = 0
  v.transform.x = 0
  v.transform.y = 0
  v.transform.z = -1.2
  Object.assign(v, over)
  return v
}

const swingMsg = (over: Partial<ClientSwingMessage> = {}): ClientSwingMessage => ({
  atTick: 100,
  yaw: 0,
  ...over,
})

describe('MeleeSystem.tryStartSwing — resource + scheduling', () => {
  it('consumes stamina, syncs it, and schedules the swing window', () => {
    const { state, host, staminaSyncs } = makeHost()
    const attacker = makeAttacker({ stamina: 50 })
    state.players.set('A', attacker)
    const melee = new MeleeSystem(host)

    const now = 100
    melee.tryStartSwing('A', attacker, swingMsg(), now)

    // Stamina is debited by exactly the configured cost and mirrored to the sim.
    expect(attacker.stamina).toBe(50 - SWORD_M1_COST_STAMINA)
    expect(staminaSyncs).toEqual([{ playerId: 'A', stamina: 50 - SWORD_M1_COST_STAMINA }])

    // Swing window: lastSwingStartTick = now, swingEndsAtTick = now + 24.
    expect(attacker.lastSwingStartTick).toBe(now)
    expect(attacker.swingEndsAtTick).toBe(now + SWING_TICKS)
  })

  it('blocks a second swing while the previous one is still animating (cooldown gate)', () => {
    const { state, host, staminaSyncs } = makeHost()
    const attacker = makeAttacker({ stamina: 100 })
    state.players.set('A', attacker)
    const melee = new MeleeSystem(host)

    melee.tryStartSwing('A', attacker, swingMsg(), 100)
    const staminaAfterFirst = attacker.stamina
    expect(attacker.swingEndsAtTick).toBe(100 + SWING_TICKS)

    // Mid-animation: now < swingEndsAtTick must be a no-op.
    melee.tryStartSwing('A', attacker, swingMsg(), 100 + SWING_TICKS - 1)
    expect(attacker.stamina).toBe(staminaAfterFirst)
    expect(staminaSyncs.length).toBe(1)

    // Once the window has elapsed, a fresh swing is allowed and costs again.
    melee.tryStartSwing('A', attacker, swingMsg(), 100 + SWING_TICKS)
    expect(attacker.stamina).toBe(staminaAfterFirst - SWORD_M1_COST_STAMINA)
    expect(staminaSyncs.length).toBe(2)
  })

  it('blocks the swing and reports cost when stamina is insufficient', () => {
    const { state, host, failures, staminaSyncs } = makeHost()
    const attacker = makeAttacker({ stamina: SWORD_M1_COST_STAMINA - 1 })
    state.players.set('A', attacker)
    const melee = new MeleeSystem(host)

    melee.tryStartSwing('A', attacker, swingMsg(), 100)

    // No resource spent, no swing scheduled, and the failure is surfaced.
    expect(attacker.stamina).toBe(SWORD_M1_COST_STAMINA - 1)
    expect(attacker.swingEndsAtTick).toBe(0)
    expect(staminaSyncs.length).toBe(0)
    expect(failures).toEqual([{ sid: 'A', abilityId: 'sword_m1', reason: 'cost' }])
  })

  it('rejects swinging during a weapon swap and reports swapping', () => {
    const { state, host, failures } = makeHost()
    const attacker = makeAttacker({ stamina: 100, weaponSwapEndTick: 50 })
    state.players.set('A', attacker)
    state.tick = 10 // state.tick < weaponSwapEndTick → swapping
    const melee = new MeleeSystem(host)

    melee.tryStartSwing('A', attacker, swingMsg(), 10)

    expect(attacker.swingEndsAtTick).toBe(0)
    expect(attacker.stamina).toBe(100)
    expect(failures).toEqual([{ sid: 'A', abilityId: 'sword_m1', reason: 'swapping' }])
  })
})

describe('MeleeSystem.resolveSwings — hit geometry + damage', () => {
  it('does nothing before the hit tick, then applies damage on it', () => {
    const { state, host, damage } = makeHost()
    const attacker = makeAttacker()
    const victim = makeVictim()
    state.players.set('A', attacker)
    state.players.set('B', victim)
    const melee = new MeleeSystem(host)

    const start = 100
    melee.tryStartSwing('A', attacker, swingMsg({ atTick: start }), start)

    // One tick before the hit tick: nothing resolves yet.
    melee.resolveSwings(start + HIT_OFFSET_TICKS - 1)
    expect(damage.length).toBe(0)

    // On the hit tick: a single damage entry against the victim in the cone.
    melee.resolveSwings(start + HIT_OFFSET_TICKS)
    expect(damage.length).toBe(1)
    const hit = damage[0]!
    expect(hit.attackerId).toBe('A')
    expect(hit.victimId).toBe('B')
    expect(hit.cause).toBe('sword_m1')
    expect(hit.canParry).toBe(true)
    // First swing of a fresh chain plays combo index 0 → 5 damage.
    expect(hit.damage).toBe(5)
  })

  it('does not damage a victim outside the forward cone', () => {
    const { state, host, damage } = makeHost()
    const attacker = makeAttacker()
    // Directly behind the attacker (+Z) — outside the forward (-Z) cone.
    const victim = makeVictim()
    victim.transform.x = 0
    victim.transform.z = 1.2
    state.players.set('A', attacker)
    state.players.set('B', victim)
    const melee = new MeleeSystem(host)

    const start = 100
    melee.tryStartSwing('A', attacker, swingMsg({ atTick: start }), start)
    melee.resolveSwings(start + HIT_OFFSET_TICKS)

    expect(damage.length).toBe(0)
  })

  it('does not damage a victim beyond sword range', () => {
    const { state, host, damage } = makeHost()
    const attacker = makeAttacker()
    // 3 m ahead — past the 1.8 m reach.
    const victim = makeVictim()
    victim.transform.z = -3
    state.players.set('A', attacker)
    state.players.set('B', victim)
    const melee = new MeleeSystem(host)

    const start = 100
    melee.tryStartSwing('A', attacker, swingMsg({ atTick: start }), start)
    melee.resolveSwings(start + HIT_OFFSET_TICKS)

    expect(damage.length).toBe(0)
  })

  it('applies the stagger push away from the attacker and notifies the hit hook', () => {
    const { state, host, posSyncs, hitsLanded } = makeHost()
    const attacker = makeAttacker()
    const victim = makeVictim() // at z = -1.2, dead ahead
    state.players.set('A', attacker)
    state.players.set('B', victim)
    const melee = new MeleeSystem(host)

    const start = 100
    melee.tryStartSwing('A', attacker, swingMsg({ atTick: start }), start)
    melee.resolveSwings(start + HIT_OFFSET_TICKS)

    // Push direction is away from the attacker (toward -Z) by 0.45 m at combo<2.
    expect(victim.transform.z).toBeCloseTo(-1.2 - 0.45, 5)
    expect(victim.transform.x).toBeCloseTo(0, 5)
    expect(posSyncs).toEqual([{ playerId: 'B', x: victim.transform.x, z: victim.transform.z }])

    // The class-mechanic hook fires once on the landed hit tick.
    expect(hitsLanded).toEqual([{ attackerId: 'A', now: start + HIT_OFFSET_TICKS }])
  })

  it('skips the stagger push when the victim is parrying', () => {
    const { state, host, damage, posSyncs } = makeHost()
    const attacker = makeAttacker()
    const victim = makeVictim({ parrying: true })
    state.players.set('A', attacker)
    state.players.set('B', victim)
    const melee = new MeleeSystem(host)

    const start = 100
    melee.tryStartSwing('A', attacker, swingMsg({ atTick: start }), start)
    melee.resolveSwings(start + HIT_OFFSET_TICKS)

    // Damage still lands (parry blocking is resolved downstream), but no push.
    expect(damage.length).toBe(1)
    expect(victim.transform.z).toBe(-1.2)
    expect(posSyncs.length).toBe(0)
  })
})

describe('MeleeSystem — combo progression', () => {
  it('advances the attacker combo index on each landed hit', () => {
    // Pin the victim in place (no stagger push) so all three swings land in the
    // cone and the test isolates combo progression from knockback geometry.
    const { state, host, damage } = makeHost({
      resolveDisplacement: (player) => ({ x: player.transform.x, z: player.transform.z }),
    })
    const attacker = makeAttacker()
    const victim = makeVictim()
    state.players.set('A', attacker)
    state.players.set('B', victim)
    const melee = new MeleeSystem(host)

    // Swing 1 (fresh chain) → plays index 0 (5 dmg). Landing advances to 1.
    const s1 = 100
    melee.tryStartSwing('A', attacker, swingMsg({ atTick: s1 }), s1)
    melee.resolveSwings(s1 + HIT_OFFSET_TICKS)
    expect(damage[0]!.damage).toBe(5)
    expect(attacker.comboIndex).toBe(1)

    // Swing 2, within the 1 s reset window → plays stored index 1 (5 dmg).
    // Landing advances to 2.
    const s2 = s1 + SWING_TICKS
    melee.tryStartSwing('A', attacker, swingMsg({ atTick: s2 }), s2)
    melee.resolveSwings(s2 + HIT_OFFSET_TICKS)
    expect(damage[1]!.damage).toBe(5)
    expect(attacker.comboIndex).toBe(2)

    // Swing 3, still within the window → plays stored index 2 (8 dmg, the
    // finisher). Landing wraps the chain back to 0.
    const s3 = s2 + SWING_TICKS
    melee.tryStartSwing('A', attacker, swingMsg({ atTick: s3 }), s3)
    melee.resolveSwings(s3 + HIT_OFFSET_TICKS)
    expect(damage[2]!.damage).toBe(8)
    expect(attacker.comboIndex).toBe(0)
  })

  it('uses the heavier finisher push for combo index >= 2', () => {
    const { state, host } = makeHost()
    // Pre-seed a chain at index 2 with a recent swing so the reset window holds.
    const attacker = makeAttacker({ comboIndex: 2, lastSwingStartTick: 90 })
    const victim = makeVictim()
    state.players.set('A', attacker)
    state.players.set('B', victim)
    const melee = new MeleeSystem(host)

    const start = 100
    melee.tryStartSwing('A', attacker, swingMsg({ atTick: start }), start)
    melee.resolveSwings(start + HIT_OFFSET_TICKS)

    // Finisher push distance is 0.7 m (vs 0.45 m for the opener).
    expect(victim.transform.z).toBeCloseTo(-1.2 - 0.7, 5)
  })

  it('resets lastSwingStartTick when a swing misses', () => {
    const { state, host, damage } = makeHost()
    const attacker = makeAttacker()
    // Victim out of reach → the swing whiffs.
    const victim = makeVictim()
    victim.transform.z = -5
    state.players.set('A', attacker)
    state.players.set('B', victim)
    const melee = new MeleeSystem(host)

    const start = 100
    melee.tryStartSwing('A', attacker, swingMsg({ atTick: start }), start)
    expect(attacker.lastSwingStartTick).toBe(start)

    melee.resolveSwings(start + HIT_OFFSET_TICKS)
    expect(damage.length).toBe(0)
    // A miss keeps the combo at 0 and clears the chain timer.
    expect(attacker.comboIndex).toBe(0)
    expect(attacker.lastSwingStartTick).toBe(0)
  })
})

describe('MeleeSystem — friendly fire + invulnerability', () => {
  it('does not damage a same-team victim', () => {
    const { state, host, damage } = makeHost()
    const attacker = makeAttacker()
    attacker.team = 'red'
    const victim = makeVictim()
    victim.team = 'red'
    state.players.set('A', attacker)
    state.players.set('B', victim)
    const melee = new MeleeSystem(host)

    const start = 100
    melee.tryStartSwing('A', attacker, swingMsg({ atTick: start }), start)
    melee.resolveSwings(start + HIT_OFFSET_TICKS)

    expect(damage.length).toBe(0)
  })

  it('does not damage a victim that is still invulnerable on the hit tick', () => {
    const { state, host, damage } = makeHost()
    const attacker = makeAttacker()
    const victim = makeVictim()
    state.players.set('A', attacker)
    state.players.set('B', victim)
    const melee = new MeleeSystem(host)

    const start = 100
    victim.invulnUntilTick = start + HIT_OFFSET_TICKS + 5
    melee.tryStartSwing('A', attacker, swingMsg({ atTick: start }), start)
    melee.resolveSwings(start + HIT_OFFSET_TICKS)

    expect(damage.length).toBe(0)
  })
})

describe('MeleeSystem — lifecycle helpers', () => {
  it('removeByAttacker drops a pending swing so it never resolves', () => {
    const { state, host, damage } = makeHost()
    const attacker = makeAttacker()
    const victim = makeVictim()
    state.players.set('A', attacker)
    state.players.set('B', victim)
    const melee = new MeleeSystem(host)

    const start = 100
    melee.tryStartSwing('A', attacker, swingMsg({ atTick: start }), start)
    melee.removeByAttacker('A')
    melee.resolveSwings(start + HIT_OFFSET_TICKS)

    expect(damage.length).toBe(0)
  })

  it('hasStatus(invulnerable) on the attacker blocks the swing entirely', () => {
    const { state, host, damage, staminaSyncs } = makeHost({
      hasStatus: (_player: PlayerType, kind: StatusKind) => kind === 'invulnerable',
    })
    const attacker = makeAttacker()
    const victim = makeVictim()
    state.players.set('A', attacker)
    state.players.set('B', victim)
    const melee = new MeleeSystem(host)

    const start = 100
    melee.tryStartSwing('A', attacker, swingMsg({ atTick: start }), start)
    melee.resolveSwings(start + HIT_OFFSET_TICKS)

    // No swing scheduled, no stamina spent, no damage queued.
    expect(attacker.swingEndsAtTick).toBe(0)
    expect(staminaSyncs.length).toBe(0)
    expect(damage.length).toBe(0)
  })
})
