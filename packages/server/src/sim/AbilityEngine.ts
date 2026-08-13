// Server-side ability engine.
//
// Consumes an `AbilityDef` from the shared registry and orchestrates:
//   1. validation (cost, CD, weapon, locks, range)
//   2. cost payment (mana / stamina + auto-swap on bound cast)
//   3. windup (if any)
//   4. effect resolution (damage, status, knockup, projectile, zone, move,
//      heal, lifesteal, channel, cleanse)
//
// New abilities are added by editing the shared registry — this engine never
// changes for a new spell unless we introduce a new effect *primitive*.
//
// The engine is decoupled from Colyseus by talking to a small `EngineHost`
// interface that the GameRoom implements. Tests provide a lightweight host.

import {
  forwardAimRadiusAt,
  ABILITY_DEFS,
  GCD_SEC,
  KNOCKUP_IMMUNITY_AFTER_LAND_SEC,
  MessageTypes,
  PLAYER_CAPSULE_HEIGHT_M,
  TICK_RATE_HZ,
  directionFromYawPitch,
  isElementId,
  type AbilityDef,
  type ChannelEffect,
  type DamageEffect,
  type EffectSpec,
  type ElementId,
  type HealEffect,
  type KnockupEffect,
  type MoveEffect,
  type Player,
  type ProjectileEffect,
  type ResourceDrainEffect,
  type ServerAbilityCastedMessage,
  type ServerChannelInterruptedMessage,
  type StatusEffect,
  type Vec3,
  type ZoneEffect,
} from '@ragequit/shared'

import type { StatusRuntime } from './StatusRuntime.js'
import type { CastTarget, EngineHost } from './ability-engine-host.js'
import { insideAoe } from './aoe-shape.js'
import { castTelegraphMessage, TAP_AFTERIMAGE_TICKS } from './cast-telegraph.js'
import { validateCast } from './cast-validation.js'
import { knockbackFromCaster, knockbackFromPoint } from './knockback-direction.js'
import { getPlayerMaxima } from './player-maxima.js'
import { placePointForward, clampPointToRange } from './targeting-geometry.js'

// Re-exported so existing importers of AbilityEngine keep working.
export { insideAoe } from './aoe-shape.js'

export type {
  CastTarget,
  EngineHost,
  ProjectileSpawnRequest,
  ZoneSpawnRequest,
} from './ability-engine-host.js'

// --- Pending windups -------------------------------------------------------
interface PendingCast {
  abilityId: string
  casterId: string
  target: CastTarget
  endsAtTick: number
}

const GCD_TICKS = Math.round(GCD_SEC * TICK_RATE_HZ)
const KNOCKUP_IMMUNITY_TICKS = Math.round(KNOCKUP_IMMUNITY_AFTER_LAND_SEC * TICK_RATE_HZ)

export class AbilityEngine {
  private readonly windups: PendingCast[] = []

  constructor(
    private readonly host: EngineHost,
    private readonly statuses: StatusRuntime,
  ) {}

  // Try to start a cast. Returns true if accepted (effects fired or windup
  // queued). Sends an `AbilityFailed` to the caster on rejection.
  tryCast(sid: string, abilityId: string, target: CastTarget): boolean {
    const baseDef = ABILITY_DEFS[abilityId]
    if (!baseDef) {
      this.host.sendAbilityFailed(sid, abilityId, 'unknown_ability')
      return false
    }
    const player = this.host.state.players.get(sid)
    if (!player) return false
    const now = this.host.state.tick
    const reason = validateCast(player, baseDef, {
      now,
      isCastLocked: this.statuses.isCastLocked(player),
      isInvulnerable: this.statuses.hasStatus(player, 'invulnerable'),
    })
    if (reason) {
      this.host.sendAbilityFailed(sid, abilityId, reason)
      return false
    }

    const def = baseDef
    const cdMult = this.host.getAbilityCooldownMult?.(sid) ?? 1
    const effectiveCdSec = def.cooldownSec * cdMult
    const effectiveMana = def.costMana
    const effectiveStam = def.costStamina

    // Auto-swap on bound cast — atomic, no GCD penalty. But if we JUST manually
    // swapped to a weapon, block for the swap-lock window to give VFX time and
    // avoid first-frame ability fires feeling instant/jarring.
    if (def.weapon !== 'none' && player.activeWeapon !== def.weapon) {
      this.host.forceWeaponSwap(sid, def.weapon)
    }
    // Swap lock: if the player just swapped to the current weapon and the
    // lock window hasn't expired, defer (reject) the cast.
    if (player.weaponSwapEndTick > now) {
      this.host.sendAbilityFailed(sid, abilityId, 'swapping')
      return false
    }

    // Pay cost + start GCD + set per-ability CD.
    if (effectiveMana > 0) {
      player.mana -= effectiveMana
      player.lastManaSpendAtTick = now
    }
    if (effectiveStam > 0) {
      player.stamina -= effectiveStam
      // The movement sim owns stamina; without this the tick loop refunds the
      // cost immediately and every stamina-costed ability is free.
      this.host.syncSimStamina?.(sid, player.stamina)
    }
    player.gcdReadyAtTick = now + GCD_TICKS
    player.abilityCooldowns.set(def.id, now + Math.round(effectiveCdSec * TICK_RATE_HZ))
    // Mirror the uppercut field used by the HUD.
    if (def.id === 'uppercut') player.uppercutReadyAtTick = player.abilityCooldowns.get(def.id)!

    const windupTicks = Math.round(def.windupSec * TICK_RATE_HZ)
    if (def.windupSec > 0) {
      const endsAt = now + windupTicks
      player.casting = true
      player.castAbilityId = def.id
      player.castEndsAtTick = endsAt
      this.windups.push({ abilityId: def.id, casterId: sid, target, endsAtTick: endsAt })
    } else {
      this.resolveOnCastEffects(sid, def, target)
    }

    // ONE telegraph path, not two — see cast-telegraph.ts for why.
    const center = this.resolveAreaCenter(sid, player, target, def)
    const tg =
      center &&
      castTelegraphMessage(sid, def, center, windupTicks > 0 ? windupTicks : TAP_AFTERIMAGE_TICKS)
    if (tg) this.host.broadcast(MessageTypes.CastTelegraph, tg)

    const msg: ServerAbilityCastedMessage = {
      casterId: sid,
      abilityId: def.id,
      atTick: now,
    }
    this.host.broadcast(MessageTypes.AbilityCasted, msg)
    return true
  }

  // Drive any in-flight windups. Resolves effects when their tick is reached
  // and clears the player's casting flag. Also drives active channels.
  tickWindups(): void {
    this.tickChannels()
    if (this.windups.length === 0) return
    const now = this.host.state.tick
    for (let i = this.windups.length - 1; i >= 0; i--) {
      const w = this.windups[i]!
      if (now < w.endsAtTick) continue
      this.windups.splice(i, 1)
      const player = this.host.state.players.get(w.casterId)
      if (!player) continue
      // If the player died / was disrupted during windup, drop the cast.
      if (!player.alive || player.castAbilityId !== w.abilityId) {
        if (player.castAbilityId === w.abilityId) {
          player.casting = false
          player.castAbilityId = ''
          player.castEndsAtTick = 0
        }
        continue
      }
      const def = ABILITY_DEFS[w.abilityId]!
      this.resolveOnCastEffects(w.casterId, def, w.target)
      if (!this.hasActiveChannel(w.casterId, w.abilityId)) {
        player.casting = false
        player.castAbilityId = ''
        player.castEndsAtTick = 0
      }
    }
  }

  // Cancel an in-flight cast (called when the caster takes damage or starts
  // parrying mid-windup). Refunds nothing — cost is committed at start.
  cancelCast(sid: string, reason: ServerChannelInterruptedMessage['reason'] = 'damage'): void {
    const player = this.host.state.players.get(sid)
    if (!player || !player.casting) return
    const id = player.castAbilityId
    let cancelled = false
    let broadcasted = false
    for (let i = this.windups.length - 1; i >= 0; i--) {
      if (this.windups[i]!.casterId === sid) {
        this.windups.splice(i, 1)
        cancelled = true
      }
    }
    for (let i = this.channels.length - 1; i >= 0; i--) {
      const c = this.channels[i]!
      if (c.casterId !== sid) continue
      if (reason === 'damage' && !c.breakOnDamage) continue
      this.channels.splice(i, 1)
      cancelled = true
      const interruptMsg: ServerChannelInterruptedMessage = {
        casterId: sid,
        abilityId: c.abilityId,
        reason,
        atTick: this.host.state.tick,
      }
      this.host.broadcast(MessageTypes.ChannelInterrupted, interruptMsg)
      broadcasted = true
    }
    if (!cancelled) return
    player.casting = false
    player.castAbilityId = ''
    player.castEndsAtTick = 0
    if (id && !broadcasted) {
      const interruptMsg: ServerChannelInterruptedMessage = {
        casterId: sid,
        abilityId: id,
        reason,
        atTick: this.host.state.tick,
      }
      this.host.broadcast(MessageTypes.ChannelInterrupted, interruptMsg)
    }
  }

  // --- Effect resolution ---------------------------------------------------

  private resolveOnCastEffects(sid: string, def: AbilityDef, target: CastTarget): void {
    const caster = this.host.state.players.get(sid)
    if (!caster) return
    // For abilities that don't spawn a projectile, `onLand` effects fire
    // immediately at cast time (point-targeted zones, instant teleports, etc).
    // Projectile-bearing abilities defer onLand until impact resolution
    // server-side in stepProjectiles.
    const hasProjectile = def.effects.some((e) => e.kind === 'projectile')
    let damageDealtForLifesteal = 0
    for (const e of def.effects) {
      if (e.at === 'onTick') continue
      if (e.at === 'onLand' && hasProjectile) continue
      damageDealtForLifesteal += this.applyEffect(sid, def, e, target)
    }
    // Apply lifesteal effects after we know the total.
    if (damageDealtForLifesteal > 0) {
      for (const e of def.effects) {
        if (e.at !== 'onCast' || e.kind !== 'lifesteal') continue
        const heal = damageDealtForLifesteal * e.fraction
        caster.hp = Math.min(caster.hp + heal, getPlayerMaxima(caster).hp)
      }
    }
  }

  // Returns the damage dealt for lifesteal aggregation.
  private applyEffect(
    sid: string,
    def: AbilityDef,
    effect: EffectSpec,
    target: CastTarget,
    opts: { lifestealFraction?: number } = {},
  ): number {
    switch (effect.kind) {
      case 'damage':
        return this.effectDamage(sid, def, effect, target, opts)
      case 'applyStatus':
        this.effectStatus(sid, def, effect, target)
        return 0
      case 'knockup':
        this.effectKnockup(sid, def, effect, target)
        return 0
      case 'heal':
        this.effectHeal(sid, effect, def.id)
        return 0
      case 'lifesteal':
        return 0 // handled by the caller after damage aggregation
      case 'resourceDrain':
        this.effectResourceDrain(sid, def, effect, target)
        return 0
      case 'projectile':
        this.effectProjectile(sid, def, effect, target)
        return 0
      case 'zone':
        this.effectZone(sid, def, effect, target)
        return 0
      case 'move':
        this.effectMove(sid, effect, target)
        return 0
      case 'channel':
        this.effectChannel(sid, def, effect, target)
        return 0
      case 'cleanse':
        if (effect.fromCaster !== false) {
          if (effect.status !== undefined && effect.status !== null) {
            this.statuses.cleanse(sid, effect.status)
          } else {
            // Full-cleanse: remove all negative debuffs (excludes mark/shield/haste).
            this.statuses.cleanseDebuffs(sid)
          }
        }
        return 0
      case 'restoreStamina': {
        const caster = this.host.state.players.get(sid)
        if (caster) {
          caster.stamina = Math.min(caster.stamina + effect.amount, getPlayerMaxima(caster).stamina)
          this.host.syncSimStamina?.(sid, caster.stamina)
        }
        return 0
      }
      default:
        return 0
    }
  }

  private effectDamage(
    sid: string,
    def: AbilityDef,
    e: DamageEffect,
    target: CastTarget,
    opts: { lifestealFraction?: number } = {},
  ): number {
    const caster = this.host.state.players.get(sid)
    if (!caster) return 0
    const radius = e.radius ?? 0
    const center =
      radius > 0
        ? this.resolveAreaCenter(sid, caster, target, def)
        : this.resolveAnchor(caster, target, def)
    if (!center) return 0
    const element: ElementId | undefined =
      e.element ?? (isElementId(def.element) ? def.element : undefined)

    const lifestealFraction = opts.lifestealFraction ?? 0

    const amount = e.amount
    let totalDealt = 0
    if (radius === 0) {
      const victimId = this.resolveSingleTarget(sid, caster, target, def)
      const victim = victimId ? this.host.state.players.get(victimId) : undefined
      // A whiff used to be silent — cost and CD spent, a successful cast
      // broadcast — so a miss was indistinguishable from a bug. Cost still
      // stands (missing should cost); this only reports it.
      if (!victimId || !victim?.alive) {
        this.host.sendAbilityFailed(sid, def.id, 'no_target')
        return 0
      }
      this.host.pendingDamage.push({
        attackerId: sid,
        victimId,
        amount,
        element: element ?? '',
        cause: `ability:${def.id}`,
        canParry: !!def.canParry,
        lifestealFraction: lifestealFraction > 0 ? lifestealFraction : undefined,
      })
      return amount
    }

    const primaryVictimId = e.excludePrimary
      ? this.resolveSingleTarget(sid, caster, target, def)
      : null
    this.host.state.players.forEach((victim, vid) => {
      if (!victim.alive) return
      if (vid === sid) return // melee/AoE skips self by default
      if (primaryVictimId && vid === primaryVictimId) return
      if (!insideAoe(victim, center, radius)) return
      this.host.pendingDamage.push({
        attackerId: sid,
        victimId: vid,
        amount,
        element: element ?? '',
        cause: `ability:${def.id}`,
        canParry: !!def.canParry,
        lifestealFraction: lifestealFraction > 0 ? lifestealFraction : undefined,
      })
      totalDealt += amount
    })
    return totalDealt
  }

  private effectStatus(sid: string, def: AbilityDef, e: StatusEffect, target: CastTarget): void {
    const caster = this.host.state.players.get(sid)
    if (!caster) return
    const radius = e.radius ?? 0
    const center =
      radius > 0
        ? this.resolveAreaCenter(sid, caster, target, def)
        : this.resolveAnchor(caster, target, def)
    if (!center) return
    const dur = e.durationSec
    if (radius === 0) {
      // Apply to the resolved single target (forward = aimed enemy in range).
      const nearest = this.resolveSingleTarget(sid, caster, target, def)
      if (nearest) {
        const victim = this.host.state.players.get(nearest)
        if (victim && this.canApplyParryableFollowup(def, victim)) {
          this.statuses.applyToPlayer(nearest, e.status, dur, e.stacks ?? 1, sid, e.slowFraction)
        }
      }
      return
    }
    this.host.state.players.forEach((victim, vid) => {
      if (!victim.alive || vid === sid) return
      if (!this.canApplyParryableFollowup(def, victim)) return
      if (!insideAoe(victim, center, radius)) return
      this.statuses.applyToPlayer(vid, e.status, dur, e.stacks ?? 1, sid, e.slowFraction)
    })
  }

  private effectKnockup(sid: string, def: AbilityDef, e: KnockupEffect, target: CastTarget): void {
    const caster = this.host.state.players.get(sid)
    if (!caster) return
    const radius = e.radius ?? 0
    const center =
      radius > 0
        ? this.resolveAreaCenter(sid, caster, target, def)
        : this.resolveAnchor(caster, target, def)
    if (!center) return
    const tickNow = this.host.state.tick
    if (radius === 0) {
      const nearest = this.resolveSingleTarget(sid, caster, target, def)
      if (!nearest) return
      const victim = this.host.state.players.get(nearest)
      if (!victim) return
      if (!this.canApplyParryableFollowup(def, victim)) return
      if (e.requiresGroundedTarget && !victim.onGround) return
      if (
        tickNow < victim.airborneUntilTick + KNOCKUP_IMMUNITY_TICKS &&
        victim.airborneUntilTick > 0
      )
        return
      this.host.applyKnockup(
        victim,
        e.airborneSec,
        knockbackFromCaster(caster, victim, e, target.yaw),
      )
      return
    }
    this.host.state.players.forEach((victim, vid) => {
      if (!victim.alive || vid === sid) return
      if (!this.canApplyParryableFollowup(def, victim)) return
      if (e.requiresGroundedTarget && !victim.onGround) return
      if (!insideAoe(victim, center, radius)) return
      if (
        tickNow < victim.airborneUntilTick + KNOCKUP_IMMUNITY_TICKS &&
        victim.airborneUntilTick > 0
      )
        return
      this.host.applyKnockup(
        victim,
        e.airborneSec,
        knockbackFromPoint(center, victim, e, target.yaw),
      )
    })
  }

  private effectHeal(sid: string, e: HealEffect, abilityId?: string): void {
    const caster = this.host.state.players.get(sid)
    if (!caster) return
    // TODO: HoT (overSec > 0) is not implemented — heal is always applied instantly.
    // If a future ability needs a heal-over-time, wire it through the channel system.
    const bonus =
      abilityId && this.host.getRecoveryHealBonus
        ? (this.host.getRecoveryHealBonus(sid, abilityId, this.host.state.tick) ?? 0)
        : 0
    caster.hp = Math.min(caster.hp + e.amount + bonus, getPlayerMaxima(caster).hp)
  }

  private effectResourceDrain(
    sid: string,
    def: AbilityDef,
    e: ResourceDrainEffect,
    target: CastTarget,
  ): void {
    const caster = this.host.state.players.get(sid)
    if (!caster) return
    const radius = e.radius ?? 0
    const victimIds: string[] = []
    if (radius > 0) {
      const center = this.resolveAreaCenter(sid, caster, target, def)
      if (!center) return
      this.host.state.players.forEach((victim, vid) => {
        if (!victim.alive || vid === sid) return
        const dx = victim.transform.x - center.x
        const dz = victim.transform.z - center.z
        if (Math.hypot(dx, dz) <= radius) victimIds.push(vid)
      })
    } else {
      const victimId = this.resolveSingleTarget(sid, caster, target, def)
      if (victimId) victimIds.push(victimId)
    }

    for (const victimId of victimIds) {
      const victim = this.host.state.players.get(victimId)
      if (!victim?.alive) continue
      // Respect parry: a parrying target blocks canParry effects (same as damage/status).
      if (!this.canApplyParryableFollowup(def, victim)) continue
      const current = e.resource === 'mana' ? victim.mana : victim.stamina
      const drained = Math.min(current, e.amount)
      if (drained <= 0) continue
      if (e.resource === 'mana') {
        victim.mana -= drained
        caster.mana = Math.min(
          caster.mana + drained * (e.gainFraction ?? 0),
          getPlayerMaxima(caster).mana,
        )
      } else {
        victim.stamina -= drained
        caster.stamina = Math.min(
          caster.stamina + drained * (e.gainFraction ?? 0),
          getPlayerMaxima(caster).stamina,
        )
        // Both sides must reach the movement sim or the drain is undone.
        this.host.syncSimStamina?.(victimId, victim.stamina)
        this.host.syncSimStamina?.(sid, caster.stamina)
      }
    }
  }

  private effectProjectile(
    sid: string,
    def: AbilityDef,
    e: ProjectileEffect,
    target: CastTarget,
  ): void {
    const caster = this.host.state.players.get(sid)
    if (!caster) return
    const dir = directionFromYawPitch(target.yaw, target.pitch)
    const origin = this.host.computeProjectileOrigin(caster, dir)
    const vel: Vec3 = { x: dir.x * e.speedMps, y: dir.y * e.speedMps, z: dir.z * e.speedMps }
    const lifetimeSec = (def.range * 2) / e.speedMps + 0.5 // headroom for arc
    const lifetimeTicks = Math.round(lifetimeSec * TICK_RATE_HZ)
    const element = e.element ?? (isElementId(def.element) ? def.element : undefined)
    const damage = e.damage
    const lifestealFraction = e.lifestealFraction ?? 0
    this.host.spawnProjectile({
      ownerId: sid,
      abilityId: def.id,
      comboRole: def.comboRole,
      // The projectile sim doesn't care about kind; the client uses it for
      // visuals — bow abilities fire arrows, everything else fires bolts.
      kind: def.weapon === 'bow' ? 'arrow' : 'bolt',
      origin,
      vel,
      gravity: e.gravityMps2,
      damage,
      lifetimeTicks,
      spawnedAtTick: this.host.state.tick,
      splashRadius: e.splashRadius,
      lifestealFraction: lifestealFraction > 0 ? lifestealFraction : undefined,
      element,
      knockbackDistance: e.knockbackDistance,
      onHitStatus: e.onHitStatus
        ? {
            kind: e.onHitStatus.status,
            durationSec: e.onHitStatus.durationSec,
            stacks: e.onHitStatus.stacks ?? 1,
            slowFraction: e.onHitStatus.slowFraction,
          }
        : undefined,
    })
  }

  private effectZone(sid: string, def: AbilityDef, e: ZoneEffect, target: CastTarget): void {
    const caster = this.host.state.players.get(sid)
    if (!caster) return
    const isWall = (e.width ?? 0) > 0 && e.radius === 0
    const placement = e.placement ?? (def.targeting === 'point' ? 'point' : 'forward')
    const placePoint =
      placement === 'self'
        ? { x: caster.transform.x, y: caster.transform.y, z: caster.transform.z }
        : placement === 'point' && target.point
          ? clampPointToRange(caster.transform, target.point, def.range)
          : placePointForward(caster.transform, target.yaw, def.range)
    this.host.spawnZone({
      ownerId: sid,
      abilityId: def.id,
      element: typeof def.element === 'string' ? def.element : 'none',
      shape: isWall ? 'wall' : 'circle',
      pos: placePoint,
      yaw: target.yaw,
      radius: isWall ? 0 : (e.radius ?? 0),
      width: e.width ?? 0,
      durationSec: e.durationSec,
      tickEverySec: e.tickEverySec,
      armDelaySec: e.armDelaySec,
      expiresOnTrigger: e.expiresOnTrigger,
      damagePerTick: e.damagePerTick ?? 0,
      applyStatus: e.applyStatus
        ? {
            kind: e.applyStatus.status,
            durationSec: e.applyStatus.durationSec,
            stacks: e.applyStatus.stacks ?? 1,
            slowFraction: e.applyStatus.slowFraction,
          }
        : undefined,
    })
  }

  private effectMove(sid: string, e: MoveEffect, target: CastTarget): void {
    const caster = this.host.state.players.get(sid)
    if (!caster) return
    const speedSq = caster.vx * caster.vx + caster.vz * caster.vz
    const dir =
      e.useMovementDirection && speedSq > 0.04
        ? { x: caster.vx / Math.sqrt(speedSq), y: 0, z: caster.vz / Math.sqrt(speedSq) }
        : directionFromYawPitch(target.yaw, 0)
    const dx = dir.x * e.distance
    const dz = dir.z * e.distance
    // The room ALWAYS supplies a collision-aware resolver (GameRoom wires it
    // unconditionally). Require it: never move the caster without collision —
    // the former fallback advanced the caster through geometry with no AABB
    // test, which would phase a dash straight through walls.
    if (!this.host.resolveDisplacement) return
    const resolved = this.host.resolveDisplacement(caster, dx, dz, !!e.cancelOnCollision)
    caster.transform.x = resolved.x
    caster.transform.z = resolved.z
    // The movement sim owns the authoritative position; without this the next
    // tick overwrites the transform and the dash never happens.
    this.host.syncSimPos?.(sid, resolved.x, resolved.z)
  }

  // Active channels — driven each tick from `tickWindups` (we reuse the
  // already-running tick loop rather than introducing a new one).
  private readonly channels: {
    casterId: string
    abilityId: string
    target: CastTarget
    endsAtTick: number
    nextTickAtTick: number
    tickIntervalTicks: number
    perTick: EffectSpec
    lifestealFraction?: number
    breakOnMove: boolean
    breakOnDamage: boolean
  }[] = []

  private effectChannel(sid: string, def: AbilityDef, e: ChannelEffect, target: CastTarget): void {
    const caster = this.host.state.players.get(sid)
    if (!caster) return
    const start = this.host.state.tick
    const endsAt = start + Math.max(1, Math.round(e.durationSec * TICK_RATE_HZ))
    const intervalTicks = Math.max(1, Math.round(e.tickEverySec * TICK_RATE_HZ))
    const lifestealFraction = e.lifestealFraction ?? 0
    caster.casting = true
    caster.castAbilityId = def.id
    caster.castEndsAtTick = endsAt
    this.channels.push({
      casterId: sid,
      abilityId: def.id,
      target,
      endsAtTick: endsAt,
      nextTickAtTick: start + intervalTicks,
      tickIntervalTicks: intervalTicks,
      perTick: e.perTick,
      lifestealFraction: lifestealFraction > 0 ? lifestealFraction : undefined,
      breakOnMove: e.breakOnMove ?? false,
      breakOnDamage: e.breakOnDamage ?? false,
    })
  }

  // Drive active channels — fires the per-tick effect at the configured cadence
  // and removes channels whose duration is up. Called from tickWindups so the
  // engine has a single per-tick driver.
  private tickChannels(): void {
    if (this.channels.length === 0) return
    const now = this.host.state.tick
    for (let i = this.channels.length - 1; i >= 0; i--) {
      const c = this.channels[i]!
      const caster = this.host.state.players.get(c.casterId)
      // Drop channel if caster is dead / disconnected.
      if (!caster || !caster.alive) {
        this.channels.splice(i, 1)
        continue
      }
      // Interrupt if the ability requires the caster to stand still.
      if (c.breakOnMove && Math.hypot(caster.vx, caster.vz) > 0.5) {
        this.channels.splice(i, 1)
        // Clear casting flag so the client cast bar disappears immediately.
        caster.casting = false
        caster.castAbilityId = ''
        caster.castEndsAtTick = 0
        const interruptMsg: ServerChannelInterruptedMessage = {
          casterId: c.casterId,
          abilityId: c.abilityId,
          reason: 'move',
          atTick: now,
        }
        this.host.broadcast(MessageTypes.ChannelInterrupted, interruptMsg)
        continue
      }
      // Fire any due tick(s).
      while (now >= c.nextTickAtTick && now <= c.endsAtTick) {
        const def = ABILITY_DEFS[c.abilityId]
        if (!def) {
          this.channels.splice(i, 1)
          break
        }
        this.applyEffect(c.casterId, def, c.perTick, c.target, {
          lifestealFraction: c.lifestealFraction,
        })
        c.nextTickAtTick += c.tickIntervalTicks
      }
      if (now >= c.endsAtTick) {
        this.channels.splice(i, 1)
        if (caster.castAbilityId === c.abilityId) {
          caster.casting = false
          caster.castAbilityId = ''
          caster.castEndsAtTick = 0
        }
      }
    }
  }

  // --- helpers --------------------------------------------------------------

  private resolveAnchor(player: Player, target: CastTarget, def: AbilityDef): Vec3 {
    const halfH = PLAYER_CAPSULE_HEIGHT_M / 2
    if (def.targeting === 'self') {
      return { x: player.transform.x, y: player.transform.y + halfH, z: player.transform.z }
    }
    if (def.targeting === 'point' && target.point) {
      return clampPointToRange(player.transform, target.point, def.range)
    }
    if (def.targeting === 'target' && target.targetId) {
      const t = this.host.state.players.get(target.targetId)
      if (t) return { x: t.transform.x, y: t.transform.y + halfH, z: t.transform.z }
    }
    // forward fallback — anchor at the caster (range checks happen per-victim)
    return { x: player.transform.x, y: player.transform.y + halfH, z: player.transform.z }
  }

  private resolveSingleTarget(
    sid: string,
    caster: Player,
    target: CastTarget,
    def: AbilityDef,
  ): string | null {
    const origin = this.resolveAnchor(caster, target, def)
    if (def.targeting === 'self') return sid
    if (def.targeting === 'target' && target.targetId) {
      const victim = this.host.state.players.get(target.targetId)
      if (!victim?.alive || target.targetId === sid) return null
      const dx = victim.transform.x - origin.x
      const dy = victim.transform.y + PLAYER_CAPSULE_HEIGHT_M / 2 - origin.y
      const dz = victim.transform.z - origin.z
      if (Math.hypot(dx, dy, dz) > def.range) return null
      if (
        this.host.hasLineOfSight &&
        !this.host.hasLineOfSight(origin, {
          x: victim.transform.x,
          y: victim.transform.y + PLAYER_CAPSULE_HEIGHT_M / 2,
          z: victim.transform.z,
        })
      )
        return null
      return target.targetId
    }
    if (def.targeting === 'forward') {
      return this.findForwardEnemy(sid, origin, target.yaw, target.pitch, def.range)
    }
    return this.findNearestEnemy(sid, origin, def.range)
  }

  private resolveAreaCenter(
    sid: string,
    caster: Player,
    target: CastTarget,
    def: AbilityDef,
  ): Vec3 | null {
    if (def.targeting === 'self') return this.resolveAnchor(caster, target, def)
    if (def.targeting === 'point') {
      return target.point ? clampPointToRange(caster.transform, target.point, def.range) : null
    }
    if (def.targeting === 'target' && target.targetId) {
      const victim = this.host.state.players.get(target.targetId)
      return victim?.alive
        ? {
            x: victim.transform.x,
            y: victim.transform.y + PLAYER_CAPSULE_HEIGHT_M / 2,
            z: victim.transform.z,
          }
        : null
    }
    if (def.targeting === 'forward') {
      // Movement abilities with an AoE follow-up detonate around the caster's
      // post-move position. Non-movement forward AoEs detonate on the aimed target.
      const hasMove = def.effects.some((effect) => effect.kind === 'move')
      if (hasMove) return this.resolveAnchor(caster, target, def)
      const victimId = this.findForwardEnemy(
        sid,
        this.resolveAnchor(caster, target, def),
        target.yaw,
        target.pitch,
        def.range,
      )
      const victim = victimId ? this.host.state.players.get(victimId) : undefined
      return victim?.alive
        ? {
            x: victim.transform.x,
            y: victim.transform.y + PLAYER_CAPSULE_HEIGHT_M / 2,
            z: victim.transform.z,
          }
        : null
    }
    return this.resolveAnchor(caster, target, def)
  }

  private findForwardEnemy(
    sid: string,
    origin: Vec3,
    yaw: number,
    pitch: number,
    range: number,
  ): string | null {
    const dir = directionFromYawPitch(yaw, pitch)
    let bestId: string | null = null
    let bestAlong = Infinity
    this.host.state.players.forEach((victim, vid) => {
      if (vid === sid || !victim.alive) return
      const vx = victim.transform.x - origin.x
      const vy = victim.transform.y + PLAYER_CAPSULE_HEIGHT_M / 2 - origin.y
      const vz = victim.transform.z - origin.z
      const along = vx * dir.x + vy * dir.y + vz * dir.z
      if (along < 0 || along > range) return
      const distSq = vx * vx + vy * vy + vz * vz
      const lateralSq = Math.max(0, distSq - along * along)
      // The lane the client draws. Shared formula on purpose — see
      // shared/abilities/aim.ts: a preview that disagrees with the hitbox
      // teaches a lie, and two literals in two files always drift eventually.
      const aimRadius = forwardAimRadiusAt(along)
      if (lateralSq > aimRadius * aimRadius) return
      if (
        this.host.hasLineOfSight &&
        !this.host.hasLineOfSight(origin, {
          x: victim.transform.x,
          y: victim.transform.y + PLAYER_CAPSULE_HEIGHT_M / 2,
          z: victim.transform.z,
        })
      )
        return
      if (along < bestAlong) {
        bestAlong = along
        bestId = vid
      }
    })
    return bestId
  }

  private findNearestEnemy(sid: string, anchor: Vec3, range: number): string | null {
    let bestId: string | null = null
    let bestDist = Number.POSITIVE_INFINITY
    this.host.state.players.forEach((p, id) => {
      if (id === sid || !p.alive) return
      const dx = p.transform.x - anchor.x
      const dz = p.transform.z - anchor.z
      const d = Math.hypot(dx, dz)
      if (d > range) return
      if (d < bestDist) {
        bestId = id
        bestDist = d
      }
    })
    return bestId
  }

  private canApplyParryableFollowup(def: AbilityDef, victim: Player): boolean {
    if (!def.canParry) return true
    return !victim.parrying
  }

  private hasActiveChannel(casterId: string, abilityId: string): boolean {
    return this.channels.some((c) => c.casterId === casterId && c.abilityId === abilityId)
  }
}
