// ---------------------------------------------------------------------------
// Server-side zone subsystem.
//
// Owns the lifecycle of every active ground zone (Flame Wall, Ice Wall, Thorn
// Field, Vine Dash root patch, ...): spawn from an ability request, per-tick
// driver (arm delay, cadence, wall/circle containment, damage + status payload,
// expire-on-trigger), and removal/replication. The containment math is the pure
// `pointInsideWall` helper (sim/combat-geometry.ts); this class is the stateful
// orchestration.
//
// Extracted from GameRoom behind a small host interface (the same pattern as
// ProjectileSystem). GameRoom implements `ZoneSystemHost`.
// ---------------------------------------------------------------------------
import {
  MessageTypes,
  TICK_RATE_HZ,
  Zone,
  type GameState,
  type Player,
  type ServerZoneExpiredMessage,
  type ServerZoneSpawnedMessage,
  type StatusKind,
} from '@ragequit/shared'

import type { ZoneSpawnRequest } from './AbilityEngine.js'
import { pointInsideWall } from './combat-geometry.js'
import type { PendingDamage } from './damage-types.js'

/** The slice of GameRoom the zone subsystem needs. */
export interface ZoneSystemHost {
  readonly state: GameState
  /** Queue a damage entry for the room's end-of-tick damage drain. */
  enqueueDamage(d: PendingDamage): void
  /** Apply a status to a player (wraps StatusRuntime.applyToPlayer). */
  applyStatus(
    victimId: string,
    kind: StatusKind,
    durationSec: number,
    stacks: number,
    sourceId: string,
    slowFraction?: number,
  ): void
  broadcast(type: string, message: unknown): void
}

export class ZoneSystem {
  private idCounter = 0

  constructor(private readonly host: ZoneSystemHost) {}

  spawnFromEngine(req: ZoneSpawnRequest): string {
    this.idCounter += 1
    const zid = `z${this.idCounter}`
    const tick = this.host.state.tick
    const z = new Zone()
    z.id = zid
    z.ownerId = req.ownerId
    z.abilityId = req.abilityId
    z.element = req.element
    z.shape = req.shape
    z.x = req.pos.x
    z.y = req.pos.y
    z.z = req.pos.z
    z.yaw = req.yaw
    z.radius = req.radius
    z.width = req.width
    z.spawnedAtTick = tick
    z.armedAtTick = tick + Math.round((req.armDelaySec ?? 0) * TICK_RATE_HZ)
    z.despawnAtTick = tick + Math.round(req.durationSec * TICK_RATE_HZ)
    z.tickEveryTicks = Math.max(1, Math.round(req.tickEverySec * TICK_RATE_HZ))
    z.nextTickAtTick = Math.max(tick + z.tickEveryTicks, z.armedAtTick)
    z.damagePerTick = req.damagePerTick
    z.expiresOnTrigger = !!req.expiresOnTrigger
    if (req.applyStatus) {
      z.applyStatusKind = req.applyStatus.kind
      z.applyStatusDurationSec = req.applyStatus.durationSec
      z.applyStatusStacks = req.applyStatus.stacks
      z.applyStatusSlowFraction = req.applyStatus.slowFraction ?? 0
    }
    z.expired = false
    this.host.state.zones.set(zid, z)
    const msg: ServerZoneSpawnedMessage = {
      id: zid,
      ownerId: req.ownerId,
      abilityId: req.abilityId,
      element: req.element,
      shape: req.shape,
      pos: { x: req.pos.x, y: req.pos.y, z: req.pos.z },
      radius: req.radius,
      width: req.width,
      yaw: req.yaw,
      durationSec: req.durationSec,
      atTick: tick,
      armDelaySec: req.armDelaySec ?? 0,
    }
    this.host.broadcast(MessageTypes.ZoneSpawned, msg)
    return zid
  }

  /** Per-tick zone driver. */
  tick(): void {
    if (this.host.state.zones.size === 0) return
    const now = this.host.state.tick
    const removed: string[] = []
    this.host.state.zones.forEach((z, zid) => {
      if (z.expired) {
        removed.push(zid)
        return
      }
      if (now >= z.despawnAtTick) {
        z.expired = true
        removed.push(zid)
        return
      }
      if (now < z.armedAtTick) return
      if (now < z.nextTickAtTick) return
      z.nextTickAtTick = now + z.tickEveryTicks
      let triggered = false
      this.host.state.players.forEach((player: Player, pid: string) => {
        if (z.expiresOnTrigger && triggered) return
        if (!player.alive) return
        if (pid === z.ownerId) return
        if (now < player.invulnUntilTick) return
        const dx = player.transform.x - z.x
        const dz = player.transform.z - z.z
        const inside =
          z.shape === 'wall'
            ? pointInsideWall(dx, dz, z.yaw, z.width)
            : Math.hypot(dx, dz) <= z.radius
        if (!inside) return
        triggered = true
        if (z.damagePerTick > 0) {
          this.host.enqueueDamage({
            attackerId: z.ownerId,
            victimId: pid,
            damage: z.damagePerTick,
            knockup: false,
            cause: `zone:${z.abilityId}`,
            canParry: false,
            element: z.element,
          })
        }
        if (z.applyStatusKind && z.applyStatusDurationSec > 0) {
          this.host.applyStatus(
            pid,
            z.applyStatusKind as StatusKind,
            z.applyStatusDurationSec,
            z.applyStatusStacks || 1,
            z.ownerId,
            z.applyStatusSlowFraction > 0 ? z.applyStatusSlowFraction : undefined,
          )
        }
      })
      if (z.expiresOnTrigger && triggered) {
        z.expired = true
        removed.push(zid)
      }
    })
    for (const zid of removed) {
      this.host.state.zones.delete(zid)
      const msg: ServerZoneExpiredMessage = { id: zid, atTick: now }
      this.host.broadcast(MessageTypes.ZoneExpired, msg)
    }
  }
}
