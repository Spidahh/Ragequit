import { GameState, MessageTypes, Player, TICK_RATE_HZ, type StatusKind } from '@ragequit/shared'
import { describe, expect, it } from 'vitest'

import type { ZoneSpawnRequest } from './AbilityEngine.js'
import { ZoneSystem, type ZoneSystemHost } from './ZoneSystem.js'
import type { PendingDamage } from './damage-types.js'

// Synthetic host + recording arrays for the three host callbacks, mirroring the
// AbilityEngine.test.ts pattern. The system is driven by fixed tick numbers
// (state.tick), so every assertion is deterministic — no wall clock, no RNG.

interface RecordedStatus {
  victimId: string
  kind: StatusKind
  durationSec: number
  stacks: number
  sourceId: string
  slowFraction?: number
}

interface RecordedBroadcast {
  type: string
  message: unknown
}

function makeHost() {
  const state = new GameState()
  const damage: PendingDamage[] = []
  const statuses: RecordedStatus[] = []
  const broadcasts: RecordedBroadcast[] = []

  const host: ZoneSystemHost = {
    state,
    enqueueDamage: (d) => {
      damage.push(d)
    },
    applyStatus: (victimId, kind, durationSec, stacks, sourceId, slowFraction) => {
      statuses.push({ victimId, kind, durationSec, stacks, sourceId, slowFraction })
    },
    broadcast: (type, message) => {
      broadcasts.push({ type, message })
    },
  }

  const system = new ZoneSystem(host)
  return { state, system, damage, statuses, broadcasts }
}

// Owner 'A' at origin; victim 'B' planted at -Z 3 m so it sits inside a 6 m-wide
// circle/wall centred on the origin.
function addPlayers(state: GameState): { owner: Player; victim: Player } {
  const owner = new Player()
  owner.id = 'A'
  owner.transform.x = 0
  owner.transform.z = 0
  state.players.set('A', owner)

  const victim = new Player()
  victim.id = 'B'
  victim.transform.x = 0
  victim.transform.z = -3
  victim.alive = true
  victim.invulnUntilTick = 0
  state.players.set('B', victim)

  return { owner, victim }
}

function circleRequest(over: Partial<ZoneSpawnRequest> = {}): ZoneSpawnRequest {
  return {
    ownerId: 'A',
    abilityId: 'thorn_field',
    element: 'nature',
    shape: 'circle',
    pos: { x: 0, y: 0, z: 0 },
    yaw: 0,
    radius: 6,
    width: 0,
    durationSec: 2,
    tickEverySec: 0.5,
    damagePerTick: 7,
    ...over,
  }
}

describe('ZoneSystem — spawn', () => {
  it('initializes a zone schedule, inserts it into state, and broadcasts ZoneSpawned', () => {
    const { state, system, broadcasts } = makeHost()
    state.tick = 100

    const zid = system.spawnFromEngine(circleRequest({ armDelaySec: 0 }))

    // Zone is now live in replicated state.
    expect(state.zones.size).toBe(1)
    const z = state.zones.get(zid)
    expect(z).toBeDefined()
    expect(z!.id).toBe(zid)
    expect(z!.ownerId).toBe('A')
    expect(z!.abilityId).toBe('thorn_field')
    expect(z!.expired).toBe(false)

    // Schedule derived from spawn tick + per-second cadences (TICK_RATE_HZ = 60).
    expect(z!.spawnedAtTick).toBe(100)
    expect(z!.armedAtTick).toBe(100) // armDelaySec 0
    expect(z!.despawnAtTick).toBe(100 + 2 * TICK_RATE_HZ) // durationSec 2 → +120
    expect(z!.tickEveryTicks).toBe(0.5 * TICK_RATE_HZ) // tickEverySec 0.5 → 30
    // First effect fires one cadence step after spawn, clamped to armed.
    expect(z!.nextTickAtTick).toBe(100 + 30)
    expect(z!.damagePerTick).toBe(7)

    // Exactly one ZoneSpawned broadcast carrying the spawn snapshot.
    const spawned = broadcasts.filter((b) => b.type === MessageTypes.ZoneSpawned)
    expect(spawned.length).toBe(1)
    const msg = spawned[0]!.message as { id: string; atTick: number; durationSec: number }
    expect(msg.id).toBe(zid)
    expect(msg.atTick).toBe(100)
    expect(msg.durationSec).toBe(2)
  })

  it('honours armDelaySec when arming the zone and scheduling its first tick', () => {
    const { state, system } = makeHost()
    state.tick = 100

    const zid = system.spawnFromEngine(circleRequest({ armDelaySec: 2, tickEverySec: 0.5 }))
    const z = state.zones.get(zid)!

    // armDelaySec 2 → armed at +120; nextTick clamps up to armed (120 > 30).
    expect(z.armedAtTick).toBe(100 + 2 * TICK_RATE_HZ)
    expect(z.nextTickAtTick).toBe(z.armedAtTick)
  })
})

describe('ZoneSystem — per-tick effect + cadence', () => {
  it('does nothing before the zone is armed', () => {
    const { state, system, damage } = makeHost()
    addPlayers(state)
    state.tick = 100
    system.spawnFromEngine(circleRequest({ armDelaySec: 2 }))

    // Armed at 220; nextTick at 220. Drive a tick before then.
    state.tick = 150
    system.tick()

    expect(damage.length).toBe(0)
  })

  it('applies damage + status to an enemy inside the circle once per cadence window', () => {
    const { state, system, damage, statuses } = makeHost()
    addPlayers(state)
    state.tick = 100
    const zid = system.spawnFromEngine(
      circleRequest({
        damagePerTick: 7,
        applyStatus: { kind: 'poison', durationSec: 4, stacks: 1 },
      }),
    )
    const z = state.zones.get(zid)!
    // nextTickAtTick = 130, tickEveryTicks = 30.

    // Just before the first scheduled tick: nothing happens.
    state.tick = 129
    system.tick()
    expect(damage.length).toBe(0)
    expect(statuses.length).toBe(0)

    // First cadence boundary fires exactly one application.
    state.tick = 130
    system.tick()
    expect(damage.length).toBe(1)
    expect(damage[0]!.victimId).toBe('B')
    expect(damage[0]!.attackerId).toBe('A')
    expect(damage[0]!.damage).toBe(7)
    expect(damage[0]!.element).toBe('nature')
    expect(damage[0]!.cause).toBe('zone:thorn_field')
    expect(statuses.length).toBe(1)
    expect(statuses[0]!.kind).toBe('poison')
    expect(statuses[0]!.victimId).toBe('B')
    // The next-tick cursor advanced by exactly one cadence step.
    expect(z.nextTickAtTick).toBe(160)

    // Inside the same window (130..159) no further application — cadence respected.
    state.tick = 159
    system.tick()
    expect(damage.length).toBe(1)

    // Next cadence boundary fires the second application.
    state.tick = 160
    system.tick()
    expect(damage.length).toBe(2)
    expect(z.nextTickAtTick).toBe(190)
  })

  it('does not damage the zone owner or a dead / invulnerable target', () => {
    const { state, system, damage } = makeHost()
    const { victim } = addPlayers(state)

    // Move the only enemy on top of the owner-free origin but mark it dead.
    victim.alive = false
    state.tick = 100
    system.spawnFromEngine(circleRequest())
    state.tick = 130
    system.tick()
    expect(damage.length).toBe(0)

    // Alive again but invulnerable through the tick → still skipped.
    victim.alive = true
    victim.invulnUntilTick = 1000
    state.tick = 160
    system.tick()
    expect(damage.length).toBe(0)

    // Vulnerable now → finally takes damage, proving the gate was the cause.
    victim.invulnUntilTick = 0
    state.tick = 190
    system.tick()
    expect(damage.length).toBe(1)
  })

  it('does not damage an enemy standing outside the circle radius', () => {
    const { state, system, damage } = makeHost()
    const { victim } = addPlayers(state)
    victim.transform.z = -20 // well outside the 6 m radius

    state.tick = 100
    system.spawnFromEngine(circleRequest({ radius: 6 }))
    state.tick = 130
    system.tick()

    expect(damage.length).toBe(0)
  })
})

describe('ZoneSystem — expiry', () => {
  it('expires at despawnAtTick, removes the zone from state, and broadcasts ZoneExpired', () => {
    const { state, system, broadcasts } = makeHost()
    addPlayers(state)
    state.tick = 100
    const zid = system.spawnFromEngine(circleRequest({ durationSec: 2 }))
    // despawnAtTick = 220.

    // One tick before despawn: still present, no expiry broadcast.
    state.tick = 219
    system.tick()
    expect(state.zones.size).toBe(1)
    expect(broadcasts.some((b) => b.type === MessageTypes.ZoneExpired)).toBe(false)

    // At despawn tick: removed from replicated state and broadcast as expired.
    state.tick = 220
    system.tick()
    expect(state.zones.has(zid)).toBe(false)
    expect(state.zones.size).toBe(0)
    const expired = broadcasts.filter((b) => b.type === MessageTypes.ZoneExpired)
    expect(expired.length).toBe(1)
    const msg = expired[0]!.message as { id: string; atTick: number }
    expect(msg.id).toBe(zid)
    expect(msg.atTick).toBe(220)
  })

  it('removes an expiresOnTrigger zone the moment an enemy trips it', () => {
    const { state, system, damage, broadcasts } = makeHost()
    addPlayers(state)
    state.tick = 100
    const zid = system.spawnFromEngine(
      circleRequest({ durationSec: 5, expiresOnTrigger: true, damagePerTick: 12 }),
    )

    state.tick = 130
    system.tick()

    // The trip dealt its one-shot payload then removed the zone immediately,
    // well before its 5 s nominal duration.
    expect(damage.length).toBe(1)
    expect(damage[0]!.damage).toBe(12)
    expect(state.zones.has(zid)).toBe(false)
    expect(broadcasts.filter((b) => b.type === MessageTypes.ZoneExpired).length).toBe(1)
  })
})
