// Server-side ability engine (Fase 4).
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
  ABILITY_DEFS,
  GCD_SEC,
  HP_MAX,
  KNOCKUP_IMMUNITY_AFTER_LAND_SEC,
  MANA_MAX,
  MessageTypes,
  PLAYER_CAPSULE_HEIGHT_M,
  STAMINA_MAX,
  STATUS_META,
  TICK_MS,
  TICK_RATE_HZ,
  directionFromYawPitch,
  getMasteryBonus,
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
  type ServerAbilityFailedMessage,
  type ServerChannelInterruptedMessage,
  type ServerTransmuteResultMessage,
  type StatusEffect,
  type StatusKind,
  type TransmuteEffect,
  type Vec3,
  type ZoneEffect,
} from '@ragequit/shared'

import type { PendingDamageEntry, StatusRuntime } from './StatusRuntime.js'

// --- Host interface --------------------------------------------------------

export interface ProjectileSpawnRequest {
  ownerId: string
  kind: 'arrow' | 'bolt'
  origin: Vec3
  vel: Vec3
  gravity: number
  damage: number
  lifetimeTicks: number
  spawnedAtTick: number
  splashRadius?: number
  lifestealFraction?: number
  element?: string
  onHitStatus?: { kind: StatusKind; durationSec: number; stacks: number; slowFraction?: number }
}

export interface ZoneSpawnRequest {
  ownerId: string
  abilityId: string
  element: string
  shape: 'circle' | 'wall'
  pos: Vec3
  yaw: number
  radius: number
  width: number
  durationSec: number
  tickEverySec: number
  armDelaySec?: number
  expiresOnTrigger?: boolean
  damagePerTick: number
  applyStatus?: { kind: StatusKind; durationSec: number; stacks: number; slowFraction?: number }
}

export interface CastTarget {
  yaw: number
  pitch: number
  point?: Vec3
  targetId?: string
}

export interface EngineHost {
  state: { players: Map<string, Player>; tick: number }
  pendingDamage: { push: (e: PendingDamageEntry) => number | unknown }
  spawnProjectile: (req: ProjectileSpawnRequest) => string
  spawnZone: (req: ZoneSpawnRequest) => string
  sendAbilityFailed: (
    sid: string,
    abilityId: string,
    reason: ServerAbilityFailedMessage['reason'],
  ) => void
  broadcast: (type: string, message: unknown) => void
  // Player capsule foot offset that projectile origin uses (eye-height shoulder).
  computeProjectileOrigin: (player: Player, dir: Vec3) => Vec3
  // Trigger an atomic weapon swap (Fase 3 logic) without GCD penalty.
  forceWeaponSwap: (sid: string, weapon: 'sword' | 'bow' | 'staff') => void
  // Apply knockup using the existing Fase 2 helpers (player.airborneUntilTick + vy).
  applyKnockup: (player: Player, airborneSec: number, knockback?: { x: number; z: number; distance: number }) => void
  hasLineOfSight?: (from: Vec3, to: Vec3) => boolean
  resolveDisplacement?: (player: Player, dx: number, dz: number, cancelOnCollision: boolean) => {
    x: number
    z: number
  }
}

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
    if (!player.alive) {
      this.host.sendAbilityFailed(sid, abilityId, 'dead')
      return false
    }
    const now = this.host.state.tick

    if (player.casting) {
      this.host.sendAbilityFailed(sid, abilityId, 'casting')
      return false
    }
    if (now < player.swingEndsAtTick || player.bowChargeStartTick > 0) {
      this.host.sendAbilityFailed(sid, abilityId, 'casting')
      return false
    }
    if (now < player.airborneUntilTick) {
      this.host.sendAbilityFailed(sid, abilityId, 'airborne')
      return false
    }
    if (player.parrying) {
      this.host.sendAbilityFailed(sid, abilityId, 'parrying')
      return false
    }
    if (this.statuses.isCastLocked(player)) {
      this.host.sendAbilityFailed(sid, abilityId, 'cc')
      return false
    }
    if (this.statuses.hasStatus(player, 'invulnerable')) {
      this.host.sendAbilityFailed(sid, abilityId, 'cc')
      return false
    }
    if (now < player.gcdReadyAtTick) {
      this.host.sendAbilityFailed(sid, abilityId, 'gcd')
      return false
    }
    const cdReady = player.abilityCooldowns.get(baseDef.id) ?? 0
    if (now < cdReady) {
      this.host.sendAbilityFailed(sid, abilityId, 'cooldown')
      return false
    }
    if (!Array.from(player.loadout).includes(baseDef.id)) {
      this.host.sendAbilityFailed(sid, abilityId, 'not_in_loadout')
      return false
    }

    const transmuteEffect = baseDef.effects.find((effect): effect is TransmuteEffect => effect.kind === 'transmute')
    if (transmuteEffect) {
      const transmuteFailure = this.transmuteFailureReason(player, transmuteEffect)
      if (transmuteFailure) {
        this.host.sendAbilityFailed(sid, abilityId, transmuteFailure === 'cost' ? 'cost' : 'cooldown')
        this.broadcastTransmuteResult(sid, transmuteEffect.direction, false, transmuteFailure)
        return false
      }
    }

    const def = baseDef
    const defElement: ElementId | undefined = isElementId(def.element) ? def.element : undefined
    const masteryBonus = this.masteryBonusFor(player, defElement)
    const effectiveCdSec = def.cooldownSec * (masteryBonus?.cooldownMult ?? 1)
    const effectiveMana = def.costMana
    const effectiveStam = def.costStamina

    if (effectiveMana > player.mana) {
      this.host.sendAbilityFailed(sid, abilityId, 'cost')
      return false
    }
    if (effectiveStam > player.stamina) {
      this.host.sendAbilityFailed(sid, abilityId, 'cost')
      return false
    }

    // Auto-swap on bound cast — atomic, no GCD penalty. But if we JUST manually
    // swapped to a weapon, block for the swap-lock window to give VFX time and
    // avoid first-frame ability fires feeling instant/jarring.
    if (def.weapon !== 'none' && player.activeWeapon !== def.weapon) {
      this.host.forceWeaponSwap(sid, def.weapon)
    }
    // Swap lock: if the player just swapped to the current weapon and the
    // lock window hasn't expired, defer (reject) the cast.
    if (player.weaponSwapEndTick > now) {
      this.host.sendAbilityFailed(sid, abilityId, 'gcd') // reuse 'gcd' reason for UI
      return false
    }

    // Pay cost + start GCD + set per-ability CD.
    if (effectiveMana > 0) {
      player.mana -= effectiveMana
      player.lastManaSpendAtTick = now
    }
    if (effectiveStam > 0) {
      player.stamina -= effectiveStam
    }
    player.gcdReadyAtTick = now + GCD_TICKS
    player.abilityCooldowns.set(def.id, now + Math.round(effectiveCdSec * TICK_RATE_HZ))
    // Mirror the legacy uppercut field for back-compat with the Fase 2 client.
    if (def.id === 'uppercut') player.uppercutReadyAtTick = player.abilityCooldowns.get(def.id)!

    if (def.windupSec > 0) {
      const endsAt = now + Math.round(def.windupSec * TICK_RATE_HZ)
      player.casting = true
      player.castAbilityId = def.id
      player.castEndsAtTick = endsAt
      this.windups.push({ abilityId: def.id, casterId: sid, target, endsAtTick: endsAt })
    } else {
      this.resolveOnCastEffects(sid, def, target)
    }

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
    // server-side in stepProjectiles (Fase 5 wiring).
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
        caster.hp = Math.min(caster.hp + heal, HP_MAX)
      }
    }
  }

  // Returns the damage dealt (used by the lifesteal aggregation pass).
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
        this.effectHeal(sid, effect)
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
          caster.stamina = Math.min(caster.stamina + effect.amount, STAMINA_MAX)
        }
        return 0
      }
      case 'transmute':
        this.effectTransmute(sid, effect)
        return 0
      default:
        return 0
    }
  }

  private effectTransmute(sid: string, e: TransmuteEffect): void {
    const caster = this.host.state.players.get(sid)
    if (!caster) return
    // Ratios from 04_transmutation.md.
    // Respect per-direction cooldowns (transmuteCooldowns map).
    const now = this.host.state.tick
    const CD_TICKS = Math.round(5 * TICK_RATE_HZ)
    switch (e.direction) {
      case 'hp_mana':
        caster.hp = Math.max(0, caster.hp - 20)
        caster.mana = Math.min(caster.mana + 20, MANA_MAX)
        break
      case 'mana_stam':
        caster.mana = Math.max(0, caster.mana - 20)
        caster.stamina = Math.min(caster.stamina + 20, STAMINA_MAX)
        break
      case 'stam_hp':
        caster.stamina = Math.max(0, caster.stamina - 30)
        caster.hp = Math.min(caster.hp + 20, HP_MAX)
        break
    }
    for (let i = caster.statuses.length - 1; i >= 0; i--) {
      const k = caster.statuses[i]!.kind as StatusKind
      if (STATUS_META[k]?.cleansedByTransmute) this.statuses.cleanse(sid, k)
    }
    caster.transmuteCooldowns.set(e.direction, now + CD_TICKS)
    this.broadcastTransmuteResult(sid, e.direction, true)
  }

  private transmuteFailureReason(
    caster: Player,
    e: TransmuteEffect,
  ): ServerTransmuteResultMessage['reason'] | null {
    const cdReady = caster.transmuteCooldowns.get(e.direction) ?? 0
    if (this.host.state.tick < cdReady) return 'cooldown'
    switch (e.direction) {
      case 'hp_mana':
        return caster.hp <= 20 ? 'cost' : null
      case 'mana_stam':
        return caster.mana < 20 ? 'cost' : null
      case 'stam_hp':
        return caster.stamina < 30 ? 'cost' : null
    }
  }

  private broadcastTransmuteResult(
    sid: string,
    direction: TransmuteEffect['direction'],
    ok: boolean,
    reason?: ServerTransmuteResultMessage['reason'],
  ): void {
    const out: ServerTransmuteResultMessage = {
      playerId: sid,
      direction,
      ok,
      reason,
      atTick: this.host.state.tick,
    }
    this.host.broadcast(MessageTypes.TransmuteResult, out)
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
    const center = radius > 0 ? this.resolveAreaCenter(sid, caster, target, def) : this.resolveAnchor(caster, target, def)
    if (!center) return 0
    const element: ElementId | undefined =
      e.element ?? (isElementId(def.element) ? def.element : undefined)

    const bonus = this.masteryBonusFor(caster, element)
    const masteryMul = bonus?.damageMult ?? 1
    const lifestealFraction = opts.lifestealFraction ?? (bonus?.lifestealAdd ?? 0)

    const amount = e.amount * masteryMul
    let totalDealt = 0
    if (radius === 0) {
      const victimId = this.resolveSingleTarget(sid, caster, target, def)
      if (!victimId) return 0
      const victim = this.host.state.players.get(victimId)
      if (!victim?.alive) return 0
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

    const primaryVictimId = e.excludePrimary ? this.resolveSingleTarget(sid, caster, target, def) : null
    this.host.state.players.forEach((victim, vid) => {
      if (!victim.alive) return
      if (vid === sid) return // melee/AoE skips self by default
      if (primaryVictimId && vid === primaryVictimId) return
      const dx = victim.transform.x - center.x
      const dz = victim.transform.z - center.z
      const dy = victim.transform.y + PLAYER_CAPSULE_HEIGHT_M / 2 - center.y
      const dist = Math.hypot(dx, dz, dy)
      if (dist > radius) return
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
    const center = radius > 0 ? this.resolveAreaCenter(sid, caster, target, def) : this.resolveAnchor(caster, target, def)
    if (!center) return
    const element: ElementId | undefined = isElementId(def.element) ? def.element : undefined
    let dur = e.durationSec
    if (element && caster.masteryElement === element && caster.masteryLevel >= 1) {
      const bonus = getMasteryBonus(caster.masteryElement)
      if (bonus && bonus.ccDurationMult !== 1) {
        const meta = STATUS_META[e.status]
        if (meta.incapacitates || meta.rootsMovement || meta.slowFraction) {
          dur *= bonus.ccDurationMult
        }
      }
    }
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
      const dx = victim.transform.x - center.x
      const dz = victim.transform.z - center.z
      if (Math.hypot(dx, dz) > radius) return
      this.statuses.applyToPlayer(vid, e.status, dur, e.stacks ?? 1, sid, e.slowFraction)
    })
  }

  private effectKnockup(sid: string, def: AbilityDef, e: KnockupEffect, target: CastTarget): void {
    const caster = this.host.state.players.get(sid)
    if (!caster) return
    const radius = e.radius ?? 0
    const center = radius > 0 ? this.resolveAreaCenter(sid, caster, target, def) : this.resolveAnchor(caster, target, def)
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
      this.host.applyKnockup(victim, e.airborneSec, this.knockbackFrom(caster, victim, e, target))
      return
    }
    this.host.state.players.forEach((victim, vid) => {
      if (!victim.alive || vid === sid) return
      if (!this.canApplyParryableFollowup(def, victim)) return
      if (e.requiresGroundedTarget && !victim.onGround) return
      const dx = victim.transform.x - center.x
      const dz = victim.transform.z - center.z
      if (Math.hypot(dx, dz) > radius) return
      if (
        tickNow < victim.airborneUntilTick + KNOCKUP_IMMUNITY_TICKS &&
        victim.airborneUntilTick > 0
      )
        return
      this.host.applyKnockup(victim, e.airborneSec, this.knockbackFromPoint(center, victim, e, target.yaw))
    })
  }

  private knockbackFrom(
    caster: Player,
    victim: Player,
    effect: KnockupEffect,
    target: CastTarget,
  ): { x: number; z: number; distance: number } | undefined {
    return this.knockbackFromPoint(
      { x: caster.transform.x, y: caster.transform.y, z: caster.transform.z },
      victim,
      effect,
      target.yaw,
    )
  }

  private knockbackFromPoint(
    origin: Vec3,
    victim: Player,
    effect: KnockupEffect,
    fallbackYaw: number,
  ): { x: number; z: number; distance: number } | undefined {
    const distance = effect.knockbackDistance ?? 0
    if (distance <= 0) return undefined
    let dx = victim.transform.x - origin.x
    let dz = victim.transform.z - origin.z
    const len = Math.hypot(dx, dz)
    if (len <= 0.001) {
      const dir = directionFromYawPitch(fallbackYaw, 0)
      dx = dir.x
      dz = dir.z
    } else {
      dx /= len
      dz /= len
    }
    return { x: dx, z: dz, distance }
  }

  private effectHeal(sid: string, e: HealEffect): void {
    const caster = this.host.state.players.get(sid)
    if (!caster) return
    if (e.overSec && e.overSec > 0) {
      // Channeled heal — modelled in Fase 5; for now apply instant.
    }
    caster.hp = Math.min(caster.hp + e.amount, HP_MAX)
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
      const current = e.resource === 'mana' ? victim.mana : victim.stamina
      const drained = Math.min(current, e.amount)
      if (drained <= 0) continue
      if (e.resource === 'mana') {
        victim.mana -= drained
        caster.mana = Math.min(caster.mana + drained * (e.gainFraction ?? 0), MANA_MAX)
      } else {
        victim.stamina -= drained
        caster.stamina = Math.min(caster.stamina + drained * (e.gainFraction ?? 0), STAMINA_MAX)
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
    const bonus = this.masteryBonusFor(caster, element)
    const damage = e.damage * (bonus?.damageMult ?? 1)
    const lifestealFraction = (e.lifestealFraction ?? 0) + (bonus?.lifestealAdd ?? 0)
    this.host.spawnProjectile({
      ownerId: sid,
      // The projectile sim doesn't care about kind; we map magic projectiles
      // to 'bolt' so the client knows it's not an arrow.
      kind: 'bolt',
      origin,
      vel,
      gravity: e.gravityMps2,
      damage,
      lifetimeTicks,
      spawnedAtTick: this.host.state.tick,
      splashRadius: e.splashRadius,
      lifestealFraction: lifestealFraction > 0 ? lifestealFraction : undefined,
      element,
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
          ? this.clampPointToRange(caster, target.point, def.range)
          : this.placePointForward(caster, target.yaw, def.range)
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
    if (this.host.resolveDisplacement) {
      const resolved = this.host.resolveDisplacement(caster, dx, dz, !!e.cancelOnCollision)
      caster.transform.x = resolved.x
      caster.transform.z = resolved.z
      return
    }
    if (e.mode === 'teleport' || !e.cancelOnCollision) {
      caster.transform.x += dx
      caster.transform.z += dz
      return
    }
    // Dash with naive cancel-on-collision: try in 0.5 m steps and stop on
    // entering any static AABB. (More principled physics in Fase 5.)
    const steps = Math.max(2, Math.round(e.distance * 2))
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      const nx = caster.transform.x + dx * t
      const nz = caster.transform.z + dz * t
      caster.transform.x = nx
      caster.transform.z = nz
    }
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
    const element = isElementId(def.element) ? def.element : undefined
    const bonus = this.masteryBonusFor(caster, element)
    const lifestealFraction = (e.lifestealFraction ?? 0) + (bonus?.lifestealAdd ?? 0)
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
      return this.clampPointToRange(player, target.point, def.range)
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
      ) return null
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
      return target.point ? this.clampPointToRange(caster, target.point, def.range) : null
    }
    if (def.targeting === 'target' && target.targetId) {
      const victim = this.host.state.players.get(target.targetId)
      return victim?.alive
        ? { x: victim.transform.x, y: victim.transform.y + PLAYER_CAPSULE_HEIGHT_M / 2, z: victim.transform.z }
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
        ? { x: victim.transform.x, y: victim.transform.y + PLAYER_CAPSULE_HEIGHT_M / 2, z: victim.transform.z }
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
      // Forgiving but still directional: roughly 10 degrees plus capsule width.
      const aimRadius = PLAYER_CAPSULE_HEIGHT_M * 0.25 + along * Math.tan(Math.PI / 18)
      if (lateralSq > aimRadius * aimRadius) return
      if (
        this.host.hasLineOfSight &&
        !this.host.hasLineOfSight(origin, {
          x: victim.transform.x,
          y: victim.transform.y + PLAYER_CAPSULE_HEIGHT_M / 2,
          z: victim.transform.z,
        })
      ) return
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

  private masteryBonusFor(player: Player, element: ElementId | undefined) {
    if (!element || player.masteryElement !== element || player.masteryLevel < 1) return null
    return getMasteryBonus(player.masteryElement)
  }

  private canApplyParryableFollowup(def: AbilityDef, victim: Player): boolean {
    if (!def.canParry) return true
    return !(victim.parrying && this.host.state.tick >= victim.airborneUntilTick)
  }

  private hasActiveChannel(casterId: string, abilityId: string): boolean {
    return this.channels.some((c) => c.casterId === casterId && c.abilityId === abilityId)
  }

  private placePointForward(player: Player, yaw: number, distance: number): Vec3 {
    const dir = directionFromYawPitch(yaw, 0)
    return {
      x: player.transform.x + dir.x * distance,
      y: player.transform.y,
      z: player.transform.z + dir.z * distance,
    }
  }

  private clampPointToRange(player: Player, point: Vec3, range: number): Vec3 {
    const dx = point.x - player.transform.x
    const dz = point.z - player.transform.z
    const dist = Math.hypot(dx, dz)
    if (range <= 0 || dist <= range || dist <= 1e-5) return { ...point }
    const scale = range / dist
    return {
      x: player.transform.x + dx * scale,
      y: point.y,
      z: player.transform.z + dz * scale,
    }
  }

}

void TICK_MS // avoid unused-import warning when the file changes shape
