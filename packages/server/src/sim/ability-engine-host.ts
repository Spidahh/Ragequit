// The seam between the ability engine and the room.
//
// AbilityEngine is deliberately decoupled from Colyseus: it only talks to this
// `EngineHost` interface, which GameRoom implements for real and tests
// implement with a lightweight fake. Keeping the contract in its own module
// keeps AbilityEngine.ts focused on ability resolution.

import type { AbilityComboRole, Player, StatusKind, Vec3 } from '@ragequit/shared'
import type { ServerAbilityFailedMessage } from '@ragequit/shared'

import type { PendingDamageEntry } from './StatusRuntime.js'

export interface ProjectileSpawnRequest {
  ownerId: string
  abilityId: string
  comboRole: AbilityComboRole
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
  knockbackDistance?: number
  onHitStatus?: { kind: StatusKind; durationSec: number; stacks: number; slowFraction?: number }
  /**
   * Airtime for a knockup applied when the projectile lands.
   *
   * The BOLT capability (00_truth.md 3.5): a projectile could shove a victim
   * along the ground but never lift one, so "a launcher that throws a real
   * projectile you have to lead" could not be built and every launcher stayed
   * an instant hitscan inside a soft-lock cone.
   */
  knockupSec?: number
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
  // Trigger an atomic weapon swap without GCD penalty.
  forceWeaponSwap: (sid: string, weapon: 'sword' | 'bow' | 'staff') => void
  // Apply knockup using the movement helpers (player.airborneUntilTick + vy).
  applyKnockup: (
    player: Player,
    airborneSec: number,
    knockback?: { x: number; z: number; distance: number },
  ) => void
  hasLineOfSight?: (from: Vec3, to: Vec3) => boolean
  resolveDisplacement?: (
    player: Player,
    dx: number,
    dz: number,
    cancelOnCollision: boolean,
  ) => {
    x: number
    z: number
  }
  /**
   * Push a position into the movement simulation.
   *
   * REQUIRED for any engine-driven displacement: the tick loop copies
   * `simState.pos` into `player.transform` every frame, so writing the
   * transform alone is undone one tick later — which silently made every
   * dash/teleport ability move the caster nowhere. MeleeSystem and
   * ProjectileSystem already take the same hook.
   */
  syncSimPos?: (playerId: string, x: number, z: number) => void
  /**
   * Push a stamina value into the movement simulation.
   *
   * REQUIRED for the same reason as `syncSimPos`: the tick loop copies
   * `simState.stamina` onto the player, so an engine-side deduction is
   * refunded one tick later and stamina-costed abilities become free.
   * MeleeSystem and ParrySystem already take the same hook.
   */
  syncSimStamina?: (playerId: string, stamina: number) => void
  // Optional hooks for class mechanic integration.
  // Returning undefined (when not provided) means "no bonus / no multiplier."
  /** Returns a cooldown multiplier for ability casts (e.g. Momentum CDR). */
  getAbilityCooldownMult?: (sid: string) => number
  /** Returns extra HP to grant the caster on top of the base heal amount. */
  getRecoveryHealBonus?: (sid: string, abilityId: string, now: number) => number
}
