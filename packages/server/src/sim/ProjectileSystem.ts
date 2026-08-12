// ---------------------------------------------------------------------------
// Server-side projectile subsystem.
//
// Owns the integration + collision lifecycle of every in-flight projectile
// (bow arrows, staff bolts, ability projectiles): spawn, per-tick step with
// nearest-hit resolution, impact (direct / splash / chain / knockback), and
// removal/replication. The pure math lives in shared (`stepProjectile`) and
// `sim/projectile-collision.ts` (resolveProjectileHit, findChainVictims,
// playersInRadius, projectileKnockbackVector) — this class is the stateful
// orchestration that drives them.
//
// Extracted from GameRoom (the >800-line god-file) behind a small host
// interface so it owns the projectile maps + id counter instead of threading
// them through the room. GameRoom implements `ProjectileSystemHost`.
// ---------------------------------------------------------------------------
import {
  MessageTypes,
  Projectile,
  stepProjectile,
  type AABB,
  type AbilityComboRole,
  type GameState,
  type Player,
  type ProjectileState,
  type ServerProjectileExpiredMessage,
  type ServerProjectileSpawnedMessage,
  type StatusKind,
} from '@ragequit/shared'

import type { ProjectileSpawnRequest } from './AbilityEngine.js'
import type { PendingDamage } from './damage-types.js'
import {
  findChainVictims,
  playersInRadius,
  projectileKnockbackVector,
  resolveProjectileHit,
} from './projectile-collision.js'

export interface ProjectileMeta {
  ownerId: string
  abilityId?: string
  comboRole?: AbilityComboRole
  kind: 'arrow' | 'bolt'
  damage: number
  element: string
  splashRadius: number
  lifestealFraction?: number
  onHitStatus?: { kind: StatusKind; durationSec: number; stacks: number; slowFraction?: number }
  chainTargets?: number
  chainRadius?: number
  chainDamage?: number
  chainChance?: number
  // Normalized horizontal travel direction (xz), used for push-on-hit.
  velDirX: number
  velDirZ: number
  knockbackDistance?: number
}

/** The slice of GameRoom the projectile subsystem needs to do its work. */
export interface ProjectileSystemHost {
  readonly state: GameState
  /** Collision boxes of the active map. */
  getMapBoxes(): AABB[]
  /** Queue a damage entry for the room's end-of-tick damage drain. */
  enqueueDamage(d: PendingDamage): void
  broadcast(type: string, message: unknown): void
  /** Resolve a horizontal displacement against geometry (push/knockback). */
  resolveDisplacement(
    player: Player,
    dx: number,
    dz: number,
    cancelOnCollision: boolean,
  ): { x: number; z: number }
  /** Mirror an authoritative position change into the player's sim state. */
  syncSimPos(playerId: string, x: number, z: number): void
}

export class ProjectileSystem {
  // Projectile integration state. Keyed by projectile id; the schema object
  // holds replicated fields but we keep a companion sim state to avoid
  // reading/writing Colyseus primitives every substep.
  private readonly sim = new Map<string, ProjectileState>()
  private readonly meta = new Map<string, ProjectileMeta>()
  private idCounter = 0

  constructor(private readonly host: ProjectileSystemHost) {}

  /** Number of in-flight projectiles (sim entries). */
  get count(): number {
    return this.sim.size
  }

  spawn(params: {
    ownerId: string
    abilityId?: string
    comboRole?: AbilityComboRole
    kind: 'arrow' | 'bolt'
    origin: { x: number; y: number; z: number }
    vel: { x: number; y: number; z: number }
    gravity: number
    damage: number
    lifetimeTicks: number
    spawnedAtTick: number
    element?: string
    splashRadius?: number
    lifestealFraction?: number
    knockbackDistance?: number
    onHitStatus?: { kind: StatusKind; durationSec: number; stacks: number; slowFraction?: number }
    chainTargets?: number
    chainRadius?: number
    chainDamage?: number
    chainChance?: number
  }): void {
    this.idCounter += 1
    const pid = `p${this.idCounter}`
    const p = new Projectile()
    p.id = pid
    p.ownerId = params.ownerId
    p.kind = params.kind
    p.originX = params.origin.x
    p.originY = params.origin.y
    p.originZ = params.origin.z
    p.x = params.origin.x
    p.y = params.origin.y
    p.z = params.origin.z
    p.vx = params.vel.x
    p.vy = params.vel.y
    p.vz = params.vel.z
    p.gravity = params.gravity
    p.damage = params.damage
    p.element = params.element ?? 'none'
    p.spawnedAtTick = params.spawnedAtTick
    p.despawnAtTick = params.spawnedAtTick + params.lifetimeTicks
    p.expired = false
    this.host.state.projectiles.set(pid, p)

    this.sim.set(pid, {
      pos: { x: params.origin.x, y: params.origin.y, z: params.origin.z },
      vel: { x: params.vel.x, y: params.vel.y, z: params.vel.z },
      gravity: params.gravity,
    })
    const spd2D = Math.hypot(params.vel.x, params.vel.z) || 0.001
    this.meta.set(pid, {
      ownerId: params.ownerId,
      abilityId: params.abilityId,
      comboRole: params.comboRole,
      kind: params.kind,
      damage: params.damage,
      element: params.element ?? 'none',
      splashRadius: params.splashRadius ?? 0,
      lifestealFraction: params.lifestealFraction,
      onHitStatus: params.onHitStatus,
      chainTargets: params.chainTargets,
      chainRadius: params.chainRadius,
      chainDamage: params.chainDamage,
      chainChance: params.chainChance,
      velDirX: params.vel.x / spd2D,
      velDirZ: params.vel.z / spd2D,
      knockbackDistance: params.knockbackDistance,
    })

    const spawnedMsg: ServerProjectileSpawnedMessage = {
      id: pid,
      ownerId: params.ownerId,
      abilityId: params.abilityId,
      kind: params.kind,
      atTick: params.spawnedAtTick,
      origin: { ...params.origin },
      velocity: { ...params.vel },
      damage: params.damage,
      element: params.element ?? 'none',
    }
    this.host.broadcast(MessageTypes.ProjectileSpawned, spawnedMsg)
  }

  spawnFromEngine(req: ProjectileSpawnRequest): string {
    this.idCounter += 1
    const pid = `p${this.idCounter}`
    const p = new Projectile()
    p.id = pid
    p.ownerId = req.ownerId
    p.kind = req.kind
    p.originX = req.origin.x
    p.originY = req.origin.y
    p.originZ = req.origin.z
    p.x = req.origin.x
    p.y = req.origin.y
    p.z = req.origin.z
    p.vx = req.vel.x
    p.vy = req.vel.y
    p.vz = req.vel.z
    p.gravity = req.gravity
    p.damage = req.damage
    p.spawnedAtTick = req.spawnedAtTick
    p.despawnAtTick = req.spawnedAtTick + req.lifetimeTicks
    p.expired = false
    this.host.state.projectiles.set(pid, p)
    this.sim.set(pid, {
      pos: { x: req.origin.x, y: req.origin.y, z: req.origin.z },
      vel: { x: req.vel.x, y: req.vel.y, z: req.vel.z },
      gravity: req.gravity,
    })
    const elementStr = req.element ?? 'none'
    p.element = elementStr
    const reqSpd2D = Math.hypot(req.vel.x, req.vel.z) || 0.001
    this.meta.set(pid, {
      ownerId: req.ownerId,
      abilityId: req.abilityId,
      comboRole: req.comboRole,
      kind: req.kind,
      damage: req.damage,
      element: elementStr,
      splashRadius: req.splashRadius ?? 0,
      lifestealFraction: req.lifestealFraction,
      onHitStatus: req.onHitStatus,
      velDirX: req.vel.x / reqSpd2D,
      velDirZ: req.vel.z / reqSpd2D,
      knockbackDistance: req.knockbackDistance,
    })
    if (req.kind === 'bolt' && req.abilityId) {
      const caster = this.host.state.players.get(req.ownerId)
      if (caster?.alive) {
        const recoilDistance = (req.splashRadius ?? 0) > 0 ? 0.22 : req.damage >= 20 ? 0.18 : 0.12
        const resolved = this.host.resolveDisplacement(
          caster,
          -(req.vel.x / reqSpd2D) * recoilDistance,
          -(req.vel.z / reqSpd2D) * recoilDistance,
          true,
        )
        caster.transform.x = resolved.x
        caster.transform.z = resolved.z
        this.host.syncSimPos(req.ownerId, resolved.x, resolved.z)
      }
    }
    const spawnedMsg: ServerProjectileSpawnedMessage = {
      id: pid,
      ownerId: req.ownerId,
      abilityId: req.abilityId,
      kind: req.kind,
      atTick: req.spawnedAtTick,
      origin: { ...req.origin },
      velocity: { ...req.vel },
      damage: req.damage,
      element: elementStr,
    }
    this.host.broadcast(MessageTypes.ProjectileSpawned, spawnedMsg)
    return pid
  }

  step(dt: number, now: number): void {
    if (this.sim.size === 0) return

    const toRemove: {
      id: string
      reason: 'terrain' | 'victim' | 'timeout'
      pos: { x: number; y: number; z: number }
    }[] = []

    for (const [pid, state] of this.sim) {
      const schema = this.host.state.projectiles.get(pid)
      const meta = this.meta.get(pid)
      if (!schema || !meta) {
        toRemove.push({
          id: pid,
          reason: 'timeout',
          pos: { x: state.pos.x, y: state.pos.y, z: state.pos.z },
        })
        continue
      }
      if (now >= schema.despawnAtTick) {
        toRemove.push({
          id: pid,
          reason: 'timeout',
          pos: { x: state.pos.x, y: state.pos.y, z: state.pos.z },
        })
        continue
      }

      const prev = { x: state.pos.x, y: state.pos.y, z: state.pos.z }
      stepProjectile(state, dt)
      const to = { x: state.pos.x, y: state.pos.y, z: state.pos.z }

      // Resolve nearest collision (pure helper) and react to it.
      const hit = resolveProjectileHit(
        prev,
        to,
        this.host.state.players,
        this.host.getMapBoxes(),
        meta.ownerId,
        now,
      )
      if (hit) {
        const hitPos = {
          x: prev.x + (to.x - prev.x) * hit.t,
          y: prev.y + (to.y - prev.y) * hit.t,
          z: prev.z + (to.z - prev.z) * hit.t,
        }
        // Snap schema pos to the impact point before removal for client VFX.
        schema.x = hitPos.x
        schema.y = hitPos.y
        schema.z = hitPos.z

        if (hit.kind === 'victim' && hit.victim) {
          this.applyImpact(meta, hitPos, hit.victim)
          toRemove.push({ id: pid, reason: 'victim', pos: hitPos })
        } else {
          if (meta.splashRadius > 0) this.applyImpact(meta, hitPos, null)
          toRemove.push({ id: pid, reason: 'terrain', pos: hitPos })
        }
      } else {
        // No hit — persist the integrated position to the schema for replication.
        schema.x = state.pos.x
        schema.y = state.pos.y
        schema.z = state.pos.z
        schema.vx = state.vel.x
        schema.vy = state.vel.y
        schema.vz = state.vel.z
      }
    }

    for (const { id, reason, pos } of toRemove) {
      this.remove(id, reason, pos, now)
    }
  }

  remove(
    id: string,
    reason: ServerProjectileExpiredMessage['reason'] = 'timeout',
    pos?: { x: number; y: number; z: number },
    atTick?: number,
  ): void {
    const p = this.host.state.projectiles.get(id)
    const state = this.sim.get(id)
    const tick = atTick ?? this.host.state.tick
    const finalPos =
      pos ??
      (p
        ? { x: p.x, y: p.y, z: p.z }
        : state
          ? { x: state.pos.x, y: state.pos.y, z: state.pos.z }
          : { x: 0, y: 0, z: 0 })
    // Save meta before deleting — used for element in the expired message.
    const meta = this.meta.get(id)
    if (p) {
      p.expired = true
      this.host.state.projectiles.delete(id)
    }
    this.sim.delete(id)
    this.meta.delete(id)
    const msg: ServerProjectileExpiredMessage = {
      id,
      atTick: tick,
      reason,
      pos: finalPos,
      element: meta?.element,
    }
    this.host.broadcast(MessageTypes.ProjectileExpired, msg)
  }

  /** Remove every in-flight projectile owned by `ownerId` (e.g. on leave). */
  removeOwnedBy(ownerId: string): void {
    const toRemove: string[] = []
    for (const [pid, meta] of this.meta) {
      if (meta.ownerId === ownerId) toRemove.push(pid)
    }
    for (const pid of toRemove) this.remove(pid)
  }

  private applyImpact(
    meta: ProjectileMeta,
    hitPos: { x: number; y: number; z: number },
    directVictimId: string | null,
  ): void {
    const baseCause = meta.abilityId
      ? `ability:${meta.abilityId}`
      : meta.kind === 'arrow'
        ? 'bow'
        : 'staff'
    const victimIds: string[] =
      meta.splashRadius > 0
        ? playersInRadius(
            this.host.state.players,
            this.host.state.tick,
            meta.ownerId,
            hitPos,
            meta.splashRadius,
          )
        : directVictimId
          ? [directVictimId]
          : []

    for (const victimId of victimIds) {
      const victim = this.host.state.players.get(victimId)
      if (!victim) continue
      this.host.enqueueDamage({
        attackerId: meta.ownerId,
        victimId,
        damage: meta.damage,
        knockup: false,
        cause: baseCause,
        canParry: meta.splashRadius <= 0,
        element: meta.element,
        lifestealFraction: meta.lifestealFraction,
        onDamageStatus: meta.onHitStatus,
      })

      // Horizontal push for direct bow/staff hits — no splash, no ability override.
      // Ability projectiles manage their own knockback through AbilityEngine.
      if (!meta.abilityId && meta.splashRadius <= 0 && !victim.parrying) {
        const pushDist = meta.kind === 'arrow' ? 0.5 : 0.4
        const resolved = this.host.resolveDisplacement(
          victim,
          meta.velDirX * pushDist,
          meta.velDirZ * pushDist,
          true,
        )
        victim.transform.x = resolved.x
        victim.transform.z = resolved.z
        this.host.syncSimPos(victimId, resolved.x, resolved.z)
      }

      // Ability projectile knockback — applies horizontal push defined per-ability in the registry.
      if (
        meta.abilityId &&
        meta.knockbackDistance &&
        meta.knockbackDistance > 0 &&
        !victim.parrying
      ) {
        const push = projectileKnockbackVector(
          meta.splashRadius > 0,
          victim.transform.x,
          victim.transform.z,
          hitPos.x,
          hitPos.z,
          meta.velDirX,
          meta.velDirZ,
          meta.knockbackDistance,
        )
        const resolved = this.host.resolveDisplacement(victim, push.x, push.z, true)
        victim.transform.x = resolved.x
        victim.transform.z = resolved.z
        this.host.syncSimPos(victimId, resolved.x, resolved.z)
      }
    }

    // chainChance: 1 = always chain (all current abilities), 0 = never.
    // AGENTS.md mandates zero RNG — probabilistic values < 1 are not supported.
    // If a future infusion needs a probability < 1, replace this with a
    // deterministic tick-based gate (e.g. every N hits), not Math.random().
    const chainChance = meta.chainChance ?? 1
    const shouldChain =
      (meta.chainTargets ?? 0) > 0 && (meta.chainDamage ?? 0) > 0 && chainChance >= 1
    if (shouldChain) {
      const chained = findChainVictims(
        this.host.state.players,
        this.host.state.tick,
        meta.ownerId,
        victimIds,
        hitPos,
        meta.chainRadius ?? 0,
        meta.chainTargets ?? 0,
      )
      for (const victimId of chained) {
        this.host.enqueueDamage({
          attackerId: meta.ownerId,
          victimId,
          damage: meta.chainDamage ?? 0,
          knockup: false,
          cause: `${baseCause}:chain`,
          canParry: false,
          element: meta.element,
          lifestealFraction: meta.lifestealFraction,
          onDamageStatus: meta.onHitStatus,
        })
      }
    }
  }
}
