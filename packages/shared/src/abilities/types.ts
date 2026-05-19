// Declarative ability schema.
//
// Authority: 01_DESIGN/05_abilities_*.md.
//
// An AbilityDef is the **only** representation of an ability. The server's
// AbilityEngine consumes the def and orchestrates effects (damage, dot,
// knockup, ...). To add a new ability we only add a new entry to ABILITY_DEFS
// — no engine code touches.
//
// Effects are a discriminated union over a small, stable set of primitives.
// Each primitive maps 1:1 to a handler in the server engine. New primitives
// can be added later but the existing ones never change shape.

import type { ElementId } from '../constants/index.js'
import type { StatusKind } from '../status/types.js'

// --- Slot taxonomy ----------------------------------------------------------

// 11 loadout slots per player:
//   melee : 1     — single melee ability
//   bow   : 1     — single bow ability
//   magic : 5     — five magic abilities (drives Mastery via element stacking)
//   utility: 4    — three fixed transfer utilities + one flex utility
export type AbilitySlot =
  | 'melee' // R direct bind or E-wheel sector
  | 'bow' // G direct bind or E-wheel sector
  | 'magic' // 1..5 direct binds or E-wheel sectors
  | 'utility' // U1..U4

// Weapon required to cast. Auto-swap fires this weapon before consuming cost.
// 'none' means the cast doesn't change weapon (utility abilities mostly).
export type RequiredWeapon = 'sword' | 'bow' | 'staff' | 'none'

// Targeting mode the engine uses to resolve effects.
//   self      — anchored on caster
//   forward   — uses caster yaw/pitch (projectile / cone / direct target)
//   target    — picks the nearest visible enemy in `range`
//   point     — caster-supplied world point, clamped by the server to range
export type TargetingMode = 'self' | 'forward' | 'target' | 'point'

// Design role used by the loadout UI and balance tests. This is not inferred
// from effects because two abilities can share primitives but serve different
// combat jobs.
export type AbilityComboRole =
  | 'starter'
  | 'extender'
  | 'finisher'
  | 'ray'
  | 'pressure'
  | 'survival'
  | 'counter'
  | 'mobility'
  | 'drain'
  | 'resource'

// --- Effect primitive union -------------------------------------------------

// `at` controls when the engine resolves the effect within the cast lifecycle.
//   onCast    — fires on the cast tick (after windup)
//   onLand    — fires when a projectile / placed AoE actually impacts
//   onTick    — for channels: fires every `tickEverySec` until channel ends
export type EffectPhase = 'onCast' | 'onLand' | 'onTick'

export interface EffectBase {
  at: EffectPhase
}

// Direct damage. `radius` > 0 = AoE around resolved position.
export interface DamageEffect extends EffectBase {
  kind: 'damage'
  amount: number
  radius?: number // 0 = single-target
  element?: ElementId // for Mastery damage bonus calculation
  excludePrimary?: boolean
  canCrit?: boolean
}

// Apply a status to the resolved target (or all targets in radius).
export interface StatusEffect extends EffectBase {
  kind: 'applyStatus'
  status: StatusKind
  durationSec: number
  // For stack-based statuses (Burn 1-3, Chill 1-5, Bleed/Poison) the engine
  // adds this many stacks; for binary statuses (Stun, Freeze, Root) it sets
  // duration only.
  stacks?: number
  radius?: number
  // Optional explicit movement slow fraction for generic `slow`.
  slowFraction?: number
}

// Knockup — same primitive used by Uppercut, Eruption, Frost Pillar, Arc Lift,
// Void Spike, Root Upthrow.
export interface KnockupEffect extends EffectBase {
  kind: 'knockup'
  airborneSec: number
  radius?: number
  requiresGroundedTarget?: boolean
  // Optional horizontal shove in metres. Gives "launch away" combo starters
  // without turning knockup into a separate hand-coded ability path.
  knockbackDistance?: number
}

// Heal the caster (or allies in a self-centered radius).
export interface HealEffect extends EffectBase {
  kind: 'heal'
  amount: number
  // Spread heal across `overSec` instead of instant. 0 = instant.
  overSec?: number
  radius?: number
}

// Lifesteal modifier — recovers a fraction of the *damage dealt by the cast*.
// Engine multiplies total damage on resolution.
export interface LifestealEffect extends EffectBase {
  kind: 'lifesteal'
  fraction: number // 0..1
}

// Drain a non-HP resource from the resolved enemy and optionally refund part
// of it to the caster. HP drain should use damage + lifesteal so shields,
// parry, invulnerability, and damage events stay authoritative.
export interface ResourceDrainEffect extends EffectBase {
  kind: 'resourceDrain'
  resource: 'mana' | 'stamina'
  amount: number
  gainFraction?: number
  radius?: number
}

// Spawn a projectile through the shared projectile simulation.
export interface ProjectileEffect extends EffectBase {
  kind: 'projectile'
  speedMps: number
  gravityMps2: number
  damage: number
  splashRadius?: number // 0 = pinpoint
  element?: ElementId
  lifestealFraction?: number
  // Optional secondary effects baked into the projectile (e.g. Burn on hit).
  onHitStatus?: { status: StatusKind; durationSec: number; stacks?: number; slowFraction?: number }
}

// Persistent ground zone (Flame Wall, Thorn Field, Storm Field, Blizzard).
export interface ZoneEffect extends EffectBase {
  kind: 'zone'
  radius: number // 0 = use width below for line/wall zones
  width?: number
  placement?: 'self' | 'forward' | 'point'
  durationSec: number
  tickEverySec: number
  armDelaySec?: number
  expiresOnTrigger?: boolean
  damagePerTick?: number
  applyStatus?: { status: StatusKind; durationSec: number; stacks?: number; slowFraction?: number }
  element?: ElementId
}

// Movement primitive — caster teleports or dashes.
export interface MoveEffect extends EffectBase {
  kind: 'move'
  // 'dash' = horizontal motion at speed; 'teleport' = instant snap.
  mode: 'dash' | 'teleport'
  distance: number
  // When true, dash along current horizontal velocity if the player is moving;
  // falls back to aim yaw when standing still.
  useMovementDirection?: boolean
  // Dashes can cancel on collision; teleports require a free target point.
  cancelOnCollision?: boolean
}

// Channel — keep the caster locked while ticks fire. The cast is interrupted
// on damage taken / parry / movement (configurable by `breakOnMove`).
export interface ChannelEffect extends EffectBase {
  kind: 'channel'
  durationSec: number
  tickEverySec: number
  perTick: DamageEffect | HealEffect | StatusEffect
  lifestealFraction?: number
  breakOnMove?: boolean
  breakOnDamage?: boolean
}

// Cleanse a status type from caster. Transmute clears bleed through its own
// path; Cleanse Surge uses this primitive for explicit utility cleanse.
// When `status` is omitted the engine removes ALL negative statuses (full cleanse).
export interface CleanseEffect extends EffectBase {
  kind: 'cleanse'
  status?: StatusKind // omit → full cleanse of all debuffs
  fromCaster?: boolean // default true
}

// Instantly restore a flat amount of stamina to the caster.
// Used by Energize (U6). Engine credits `amount` clamped to STAMINA_MAX.
export interface RestoreStaminaEffect extends EffectBase {
  kind: 'restoreStamina'
  amount: number
}

// Resource transmutation — converts one resource to another at the fixed
// design ratio (see 04_transmutation.md). These are fixed utility slots
// triggered via Z/X/F.
export interface TransmuteEffect extends EffectBase {
  kind: 'transmute'
  direction: 'hp_mana' | 'mana_stam' | 'stam_hp'
}

export type EffectSpec =
  | DamageEffect
  | StatusEffect
  | KnockupEffect
  | HealEffect
  | LifestealEffect
  | ResourceDrainEffect
  | ProjectileEffect
  | ZoneEffect
  | MoveEffect
  | ChannelEffect
  | CleanseEffect
  | RestoreStaminaEffect
  | TransmuteEffect

// --- AbilityDef -------------------------------------------------------------

export interface AbilityDef {
  // Stable id used by the wire protocol (ClientCastMessage.abilityId).
  id: string
  // Human label for HUD tooltips.
  name: string
  slot: AbilitySlot
  // Element tag — drives Mastery bonuses. 'none' for utility
  // abilities and the few melee/bow abilities that have no element.
  element: ElementId | 'none'
  // Weapon the ability requires. The engine auto-swaps to this before the
  // cost is paid (per 01_controls.md auto-swap rule).
  weapon: RequiredWeapon
  // Resource cost. Current abilities use mana, stamina, or no cost; both fields
  // stay explicit so validation can reject impossible values cleanly.
  costMana: number
  costStamina: number
  // Cooldown in seconds. Per-ability, server-authoritative.
  cooldownSec: number
  // Visible windup before effects resolve. 0 = instant on cast.
  windupSec: number
  // Engagement range for `target`/`forward`/`point` modes (metres).
  range: number
  // How the engine selects what the effects apply to.
  targeting: TargetingMode
  // Combat role in the combo system: opener, extender, finisher, ray, etc.
  comboRole: AbilityComboRole
  // The actual effects, evaluated in array order at the configured phase.
  effects: readonly EffectSpec[]
  // What the ability does — shown as primary tooltip text in the loadout UI.
  description: string
  // The trade-off / weakness of this ability — shown below description.
  miniMalus: string
  // True iff this ability can be parried. Defaults to false; set true for
  // melee abilities that travel into a parry window (Uppercut, Bleed Strike).
  canParry?: boolean
  // True iff the ability counts as a knockup setup for the airborne lock
  // bookkeeping. Mostly informational at the client level.
  isKnockup?: boolean
}

// Convenience type for the registry — keys are ability ids.
export type AbilityRegistry = Readonly<Record<string, AbilityDef>>
