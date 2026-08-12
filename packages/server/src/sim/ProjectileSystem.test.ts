import {
  BOW_GRAVITY_MPS2,
  GameState,
  MessageTypes,
  directionFromYawPitch,
  type AABB,
  type Player,
  type ServerProjectileExpiredMessage,
  type ServerProjectileSpawnedMessage,
} from '@ragequit/shared'
import { describe, expect, it } from 'vitest'

import { ProjectileSystem, type ProjectileSystemHost } from './ProjectileSystem.js'
import type { PendingDamage } from './damage-types.js'

// ---------------------------------------------------------------------------
// Synthetic host. The projectile subsystem only reads `state`, `getMapBoxes`
// and dispatches to the four callbacks; we record every callback in arrays so
// assertions can inspect what the system did (same pattern as
// AbilityEngine.test.ts / cast-validation.test.ts).
//
// Tests are fully deterministic: no wall clock, no RNG. Every `step` is driven
// with an explicit `now` tick and a fixed `dt`, and the integration math is the
// shared `stepProjectile` (semi-implicit Euler), so positions are exact.
// ---------------------------------------------------------------------------

// One server frame at 60 Hz, matching shared TICK_MS = 1000/60.
const DT = 1 / 60

interface Recorded {
  state: GameState
  boxes: AABB[]
  damage: PendingDamage[]
  broadcasts: { type: string; message: unknown }[]
  displacements: { playerId: string; dx: number; dz: number }[]
  simSyncs: { playerId: string; x: number; z: number }[]
}

function makeHost(): { host: ProjectileSystemHost; rec: Recorded } {
  const state = new GameState()
  const rec: Recorded = {
    state,
    boxes: [],
    damage: [],
    broadcasts: [],
    displacements: [],
    simSyncs: [],
  }

  const host: ProjectileSystemHost = {
    state,
    getMapBoxes: () => rec.boxes,
    enqueueDamage: (d) => {
      rec.damage.push(d)
    },
    broadcast: (type, message) => {
      rec.broadcasts.push({ type, message })
    },
    resolveDisplacement: (player: Player, dx, dz) => {
      rec.displacements.push({ playerId: player.id, dx, dz })
      return { x: player.transform.x + dx, z: player.transform.z + dz }
    },
    syncSimPos: (playerId, x, z) => {
      rec.simSyncs.push({ playerId, x, z })
    },
  }

  return { host, rec }
}

// A flat, level shot well above the ground plane (y=0) with gravity disabled,
// fired into empty space (no players, no boxes). This isolates pure
// integration + lifetime so collisions never interfere.
function levelShotParams(
  yaw: number,
  pitch: number,
  speed: number,
  spawnedAtTick: number,
  lifetimeTicks: number,
) {
  const dir = directionFromYawPitch(yaw, pitch)
  return {
    ownerId: 'A',
    kind: 'arrow' as const,
    origin: { x: 0, y: 5, z: 0 },
    vel: { x: dir.x * speed, y: dir.y * speed, z: dir.z * speed },
    gravity: 0,
    damage: 12,
    lifetimeTicks,
    spawnedAtTick,
  }
}

describe('ProjectileSystem — spawn', () => {
  it('registers the projectile in schema + sim and sets origin/velocity/despawn', () => {
    const { host, rec } = makeHost()
    const sys = new ProjectileSystem(host)

    const speed = 50
    // yaw=0 pitch=0 looks down -Z. Velocity should be (0, 0, -speed).
    sys.spawn(levelShotParams(0, 0, speed, 100, 120))

    expect(sys.count).toBe(1)

    const schema = rec.state.projectiles.get('p1')
    expect(schema).toBeDefined()
    expect(schema!.ownerId).toBe('A')
    expect(schema!.kind).toBe('arrow')
    // Live position starts at the origin.
    expect(schema!.x).toBeCloseTo(0, 6)
    expect(schema!.y).toBeCloseTo(5, 6)
    expect(schema!.z).toBeCloseTo(0, 6)
    // Origin mirrored.
    expect(schema!.originY).toBeCloseTo(5, 6)
    // Velocity is derived from yaw/pitch * speed: forward is -Z.
    expect(schema!.vx).toBeCloseTo(0, 6)
    expect(schema!.vy).toBeCloseTo(0, 6)
    expect(schema!.vz).toBeCloseTo(-speed, 6)
    // despawnAtTick = spawnedAtTick + lifetimeTicks.
    expect(schema!.spawnedAtTick).toBe(100)
    expect(schema!.despawnAtTick).toBe(220)
    expect(schema!.expired).toBe(false)
  })

  it('derives velocity from a 45° yaw (down -X/-Z diagonal)', () => {
    const { host, rec } = makeHost()
    const sys = new ProjectileSystem(host)

    const speed = 40
    const yaw = Math.PI / 2 // 90°: directionFromYawPitch -> (-1, 0, 0)
    sys.spawn(levelShotParams(yaw, 0, speed, 0, 60))

    const schema = rec.state.projectiles.get('p1')!
    // yaw=pi/2 points down -X with zero Z component.
    expect(schema.vx).toBeCloseTo(-speed, 5)
    expect(schema.vz).toBeCloseTo(0, 5)
  })

  it('broadcasts a ProjectileSpawned message carrying spawn velocity + origin', () => {
    const { host, rec } = makeHost()
    const sys = new ProjectileSystem(host)

    const speed = 30
    sys.spawn({ ...levelShotParams(0, 0, speed, 7, 60), abilityId: 'marksman_shot' })

    const spawned = rec.broadcasts.find((b) => b.type === MessageTypes.ProjectileSpawned)
    expect(spawned).toBeDefined()
    const msg = spawned!.message as ServerProjectileSpawnedMessage
    expect(msg.id).toBe('p1')
    expect(msg.ownerId).toBe('A')
    expect(msg.abilityId).toBe('marksman_shot')
    expect(msg.atTick).toBe(7)
    expect(msg.velocity.z).toBeCloseTo(-speed, 6)
    expect(msg.origin.y).toBeCloseTo(5, 6)
  })

  it('assigns sequential ids across multiple spawns', () => {
    const { host, rec } = makeHost()
    const sys = new ProjectileSystem(host)

    sys.spawn(levelShotParams(0, 0, 30, 0, 60))
    sys.spawn(levelShotParams(0, 0, 30, 0, 60))

    expect(sys.count).toBe(2)
    expect(rec.state.projectiles.get('p1')).toBeDefined()
    expect(rec.state.projectiles.get('p2')).toBeDefined()
  })
})

describe('ProjectileSystem — step integration', () => {
  it('advances position along the velocity each tick (semi-implicit Euler, no gravity)', () => {
    const { host, rec } = makeHost()
    const sys = new ProjectileSystem(host)

    const speed = 60
    // yaw=0 -> velocity (0,0,-60). Gravity 0 keeps it level above ground.
    sys.spawn(levelShotParams(0, 0, speed, 0, 600))

    const schema = rec.state.projectiles.get('p1')!
    const startZ = schema.z

    // One frame: z advances by vz * dt = -60 * (1/60) = -1 m.
    sys.step(DT, 1)
    expect(schema.z).toBeCloseTo(startZ - 1, 6)
    expect(schema.y).toBeCloseTo(5, 6) // gravity 0 -> no vertical drop
    expect(sys.count).toBe(1)

    // Ten more frames: total 11 m travelled from the origin.
    for (let now = 2; now <= 11; now++) sys.step(DT, now)
    expect(schema.z).toBeCloseTo(startZ - 11, 5)
  })

  it('applies gravity to the vertical channel while flying', () => {
    const { host, rec } = makeHost()
    const sys = new ProjectileSystem(host)

    // Fire horizontally at a high altitude with real bow gravity so the drop is
    // measurable but the projectile never reaches the ground within the window.
    const dir = directionFromYawPitch(0, 0)
    const speed = 50
    sys.spawn({
      ownerId: 'A',
      kind: 'arrow',
      origin: { x: 0, y: 200, z: 0 },
      vel: { x: dir.x * speed, y: dir.y * speed, z: dir.z * speed },
      gravity: BOW_GRAVITY_MPS2,
      damage: 12,
      lifetimeTicks: 600,
      spawnedAtTick: 0,
    })

    const schema = rec.state.projectiles.get('p1')!

    // Advance 60 frames (1 s of flight).
    for (let now = 1; now <= 60; now++) sys.step(DT, now)

    // Horizontal: ~50 m forward on -Z.
    expect(schema.z).toBeCloseTo(-50, 1)
    // Vertical drop after 1 s is approx 0.5*g*t^2 = 1 m (semi-implicit Euler
    // accumulates close to the analytic value); altitude clearly decreased.
    expect(schema.y).toBeLessThan(200)
    expect(200 - schema.y).toBeGreaterThan(0.5)
    expect(200 - schema.y).toBeLessThan(1.5)
    expect(sys.count).toBe(1)
  })

  it('persists the integrated velocity into the schema for replication', () => {
    const { host, rec } = makeHost()
    const sys = new ProjectileSystem(host)

    const dir = directionFromYawPitch(0, 0)
    const speed = 40
    sys.spawn({
      ownerId: 'A',
      kind: 'arrow',
      origin: { x: 0, y: 200, z: 0 },
      vel: { x: dir.x * speed, y: dir.y * speed, z: dir.z * speed },
      gravity: BOW_GRAVITY_MPS2,
      damage: 12,
      lifetimeTicks: 600,
      spawnedAtTick: 0,
    })

    const schema = rec.state.projectiles.get('p1')!
    sys.step(DT, 1)

    // Horizontal velocity unchanged; vertical velocity gained -g*dt this tick.
    expect(schema.vz).toBeCloseTo(-speed, 6)
    expect(schema.vy).toBeCloseTo(-BOW_GRAVITY_MPS2 * DT, 6)
  })
})

describe('ProjectileSystem — expiry', () => {
  it('removes the projectile by lifetime once now reaches despawnAtTick', () => {
    const { host, rec } = makeHost()
    const sys = new ProjectileSystem(host)

    // Lifetime of 5 ticks: despawnAtTick = 100 + 5 = 105.
    sys.spawn(levelShotParams(0, 0, 60, 100, 5))
    expect(sys.count).toBe(1)

    // Steps strictly before the despawn tick keep it alive.
    sys.step(DT, 104)
    expect(sys.count).toBe(1)
    expect(rec.state.projectiles.get('p1')).toBeDefined()

    // Step at the despawn tick removes it (now >= despawnAtTick).
    sys.step(DT, 105)
    expect(sys.count).toBe(0)
    expect(rec.state.projectiles.get('p1')).toBeUndefined()
  })

  it('broadcasts a timeout ProjectileExpired message at removal', () => {
    const { host, rec } = makeHost()
    const sys = new ProjectileSystem(host)

    sys.spawn(levelShotParams(0, 0, 60, 0, 3))
    rec.broadcasts.length = 0 // drop the spawn broadcast

    sys.step(DT, 3)

    const expired = rec.broadcasts.find((b) => b.type === MessageTypes.ProjectileExpired)
    expect(expired).toBeDefined()
    const msg = expired!.message as ServerProjectileExpiredMessage
    expect(msg.id).toBe('p1')
    expect(msg.reason).toBe('timeout')
    expect(msg.atTick).toBe(3)
  })

  it('bounds travel range via lifetime: a longer lifetime flies farther before expiry', () => {
    // The system has no separate range cap — lifetimeTicks IS the range gate
    // (distance = speed * lifetimeTicks * dt). Verify the projectile that lives
    // longer reaches a farther |z| before being removed.
    const speed = 60 // 1 m per tick at 60 Hz

    function flyUntilExpired(lifetimeTicks: number): number {
      const { host, rec } = makeHost()
      const sys = new ProjectileSystem(host)
      sys.spawn(levelShotParams(0, 0, speed, 0, lifetimeTicks))
      const schema = rec.state.projectiles.get('p1')!
      let lastZ = schema.z
      for (let now = 1; sys.count > 0; now++) {
        // Capture the last integrated position before the system removes it.
        if (sys.count > 0) lastZ = schema.z
        sys.step(DT, now)
      }
      return lastZ
    }

    const shortRange = Math.abs(flyUntilExpired(10))
    const longRange = Math.abs(flyUntilExpired(30))

    // 1 m/tick -> short lives ~9 ticks of travel, long ~29 ticks.
    expect(shortRange).toBeCloseTo(9, 5)
    expect(longRange).toBeCloseTo(29, 5)
    expect(longRange).toBeGreaterThan(shortRange)
  })

  it('removes a projectile on ground impact when it crosses y=0', () => {
    const { host, rec } = makeHost()
    const sys = new ProjectileSystem(host)

    // Aim downward so the path crosses the ground plane (y=0) within one tick.
    // Start just above ground with a strong downward velocity component.
    const dir = directionFromYawPitch(0, -Math.PI / 4) // 45° down
    const speed = 60
    sys.spawn({
      ownerId: 'A',
      kind: 'arrow',
      origin: { x: 0, y: 0.5, z: 0 },
      vel: { x: dir.x * speed, y: dir.y * speed, z: dir.z * speed },
      gravity: 0,
      damage: 12,
      lifetimeTicks: 600,
      spawnedAtTick: 0,
    })
    expect(sys.count).toBe(1)

    rec.broadcasts.length = 0
    sys.step(DT, 1)

    // Downward shot punches through the ground -> terrain removal, not timeout.
    expect(sys.count).toBe(0)
    const expired = rec.broadcasts.find((b) => b.type === MessageTypes.ProjectileExpired)
    expect(expired).toBeDefined()
    expect((expired!.message as ServerProjectileExpiredMessage).reason).toBe('terrain')
  })

  it('removeOwnedBy clears every in-flight projectile for that owner', () => {
    const { host, rec } = makeHost()
    const sys = new ProjectileSystem(host)

    sys.spawn(levelShotParams(0, 0, 30, 0, 600)) // p1, owner A
    sys.spawn(levelShotParams(0, 0, 30, 0, 600)) // p2, owner A
    expect(sys.count).toBe(2)

    sys.removeOwnedBy('A')

    expect(sys.count).toBe(0)
    expect(rec.state.projectiles.get('p1')).toBeUndefined()
    expect(rec.state.projectiles.get('p2')).toBeUndefined()
  })
})
