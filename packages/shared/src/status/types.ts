// Status / condition system.
//
// Authority: 01_DESIGN/01_combat_fundamentals.md, 05_abilities_magic.md,
//            05_abilities_melee.md.
//
// A StatusInstance is a per-player record of one effect (Burn x3, Bleed,
// Slow 30%, ...). The server ticks all status instances each frame and
// applies their per-tick action (DoT damage, slow movement, root, etc.).
// Stack-based statuses (Burn 1-3, Chill 1-5, Bleed, Poison) accumulate
// stacks; binary statuses (Stun, Freeze, Root, Slow) overwrite duration.

export type StatusKind =
  | 'burn' // Fire DoT — 2 dmg/s per stack, 3 s, max 3 stacks
  | 'chill' // Ice slow — 5% per stack, 5 stacks → frozen, decays in 4 s
  | 'bleed' // Melee DoT — 6 dmg/s for 3 s; cleansed by transmute
  | 'poison' // Nature DoT — 3 dmg/s for 4 s, decays half-rate at 5/5 Mastery
  | 'slow' // Generic %-slow with explicit fraction
  | 'root' // No horizontal movement
  | 'stun' // No movement, no cast, no parry
  | 'freeze' // Like stun, ice-themed (5/5 Ice Mastery transition from chill)
  | 'curse' // Outgoing damage debuff (Curse of Weakness)
  | 'blind' // Severe vision reduction for a short punish/setup window
  | 'mark' // Visual/team marker — no combat effect
  | 'shield' // Damage absorption — stacks value = HP pool; engine checks before applying damage
  | 'haste' // Movement speed buff — negative slow fraction (additive with slows, net clamped to ≥0)
  | 'invulnerable' // Temporary full damage immunity (Phase Shift, 0.6 s) — engine skips all damage resolution

// Static metadata table — keeps tick math + caps in one place. The server
// engine reads these defaults; abilities can override durationSec / stacks
// per-cast in the AbilityDef effects[].
export interface StatusMeta {
  // Maximum stacks the status can hold. 1 for binary statuses.
  maxStacks: number
  // Damage per tick per stack (DoTs only). 0 for non-damaging statuses.
  damagePerTick: number
  // Tick period in seconds. 1 for most DoTs.
  tickEverySec: number
  // Default duration from one application (some abilities override).
  defaultDurationSec: number
  // True if a transmute cast clears this status from the caster (Bleed cleanse).
  cleansedByTransmute: boolean
  // Movement-related effect: explicit slow fraction OR full lock. Engine sums
  // slow fractions across active statuses (clamped to 1).
  slowFraction?: number
  rootsMovement?: boolean
  // True for "incapacitate" statuses (stun/freeze) — caster cannot cast or parry.
  incapacitates?: boolean
}

export const STATUS_META: Readonly<Record<StatusKind, StatusMeta>> = {
  burn: {
    maxStacks: 3,
    damagePerTick: 2,
    tickEverySec: 1,
    defaultDurationSec: 3,
    cleansedByTransmute: false,
  },
  chill: {
    maxStacks: 5,
    damagePerTick: 0,
    tickEverySec: 1,
    defaultDurationSec: 4,
    cleansedByTransmute: false,
    slowFraction: 0.05, // per stack — engine multiplies by stacks
  },
  bleed: {
    maxStacks: 1,
    damagePerTick: 6,
    tickEverySec: 1,
    defaultDurationSec: 3,
    cleansedByTransmute: true,
  },
  poison: {
    maxStacks: 5,
    damagePerTick: 3,
    tickEverySec: 1,
    defaultDurationSec: 4,
    cleansedByTransmute: false,
  },
  slow: {
    maxStacks: 1,
    damagePerTick: 0,
    tickEverySec: 1,
    defaultDurationSec: 2,
    cleansedByTransmute: false,
    // slowFraction comes from the StatusInstance itself for explicit %-slows.
  },
  root: {
    maxStacks: 1,
    damagePerTick: 0,
    tickEverySec: 1,
    defaultDurationSec: 1.5,
    cleansedByTransmute: false,
    rootsMovement: true,
  },
  stun: {
    maxStacks: 1,
    damagePerTick: 0,
    tickEverySec: 1,
    defaultDurationSec: 0.5,
    cleansedByTransmute: false,
    incapacitates: true,
    rootsMovement: true,
  },
  freeze: {
    maxStacks: 1,
    damagePerTick: 0,
    tickEverySec: 1,
    defaultDurationSec: 1.2,
    cleansedByTransmute: false,
    incapacitates: true,
    rootsMovement: true,
  },
  curse: {
    maxStacks: 1,
    damagePerTick: 0,
    tickEverySec: 1,
    defaultDurationSec: 5,
    cleansedByTransmute: false,
  },
  blind: {
    maxStacks: 1,
    damagePerTick: 0,
    tickEverySec: 1,
    defaultDurationSec: 2,
    cleansedByTransmute: false,
  },
  mark: {
    maxStacks: 1,
    damagePerTick: 0,
    tickEverySec: 1,
    defaultDurationSec: 5,
    cleansedByTransmute: false,
  },
  // shield: stacks hold the remaining HP pool; decremented by drainDamage before
  // applying HP loss. Not a movement modifier.
  shield: {
    maxStacks: 999,
    damagePerTick: 0,
    tickEverySec: 999,
    defaultDurationSec: 5,
    cleansedByTransmute: false,
  },
  // haste: applied as a negative slow fraction. stacks = fraction × 100 (int).
  // Engine clamps net speed after summing slow − haste fractions.
  haste: {
    maxStacks: 1,
    damagePerTick: 0,
    tickEverySec: 1,
    defaultDurationSec: 2,
    cleansedByTransmute: false,
    slowFraction: -0.4, // +40% effective speed while active
  },
  // invulnerable: used by Phase Shift. Engine skips all incoming damage
  // resolution while this status is active. Duration = ability durationSec.
  invulnerable: {
    maxStacks: 1,
    damagePerTick: 0,
    tickEverySec: 999,
    defaultDurationSec: 0.6,
    cleansedByTransmute: false,
  },
}

// --- Pure helpers (used by both server runtime and tests) -------------------

// Apply or refresh a status. Returns the updated instance shape (callers
// merge it into the player's status array). Stack rules:
//   - binary status (max=1): replace duration if longer than current
//   - stack-based: add stacks (clamped to max), refresh duration to longer of
//     current remaining vs new duration so the longest tail wins.
export interface StatusInstanceShape {
  kind: StatusKind
  stacks: number
  remainingSec: number
  // Optional — overrides STATUS_META.slowFraction for ability-specific %-slows.
  slowFractionOverride?: number
}

export function applyStatus(
  current: StatusInstanceShape | null,
  add: { stacks: number; durationSec: number; slowFractionOverride?: number },
  kind: StatusKind,
): StatusInstanceShape {
  const meta = STATUS_META[kind]
  if (!current) {
    return {
      kind,
      stacks: Math.min(add.stacks || 1, meta.maxStacks),
      remainingSec: add.durationSec,
      slowFractionOverride: add.slowFractionOverride,
    }
  }
  const merged: StatusInstanceShape = {
    kind,
    stacks: Math.min(current.stacks + (add.stacks || 1), meta.maxStacks),
    remainingSec: Math.max(current.remainingSec, add.durationSec),
    slowFractionOverride: add.slowFractionOverride ?? current.slowFractionOverride,
  }
  return merged
}

// Tick all statuses by `dtSec` and return the list of (status, damage)
// triples that should be applied to the bearer this tick. Decay is applied
// after damage emission (so a status with remainingSec > 0 going into the
// tick still emits one final hit).
export function tickStatuses(
  list: StatusInstanceShape[],
  dtSec: number,
  tickPeriodAccumulators: Map<StatusKind, number>,
): { dot: number; alive: StatusInstanceShape[] } {
  let totalDot = 0
  const alive: StatusInstanceShape[] = []
  for (const s of list) {
    const meta = STATUS_META[s.kind]
    const acc = (tickPeriodAccumulators.get(s.kind) ?? 0) + dtSec
    if (acc >= meta.tickEverySec) {
      // Fire one tick.
      if (meta.damagePerTick > 0) {
        totalDot += meta.damagePerTick * s.stacks
      }
      tickPeriodAccumulators.set(s.kind, acc - meta.tickEverySec)
    } else {
      tickPeriodAccumulators.set(s.kind, acc)
    }
    const remaining = s.remainingSec - dtSec
    if (remaining > 0) {
      alive.push({ ...s, remainingSec: remaining })
    } else {
      tickPeriodAccumulators.delete(s.kind)
    }
  }
  return { dot: totalDot, alive }
}

// Sum slow fractions across active statuses (clamped to 1).
export function totalSlowFraction(list: StatusInstanceShape[]): number {
  let total = 0
  for (const s of list) {
    const meta = STATUS_META[s.kind]
    const frac = s.slowFractionOverride ?? meta.slowFraction
    if (frac && !meta.rootsMovement && !meta.incapacitates) {
      total += frac * s.stacks
    }
  }
  return total > 1 ? 1 : total
}

export function isMovementLocked(list: StatusInstanceShape[]): boolean {
  for (const s of list) {
    const meta = STATUS_META[s.kind]
    if (meta.rootsMovement || meta.incapacitates) return true
  }
  return false
}

export function isCastLocked(list: StatusInstanceShape[]): boolean {
  for (const s of list) {
    const meta = STATUS_META[s.kind]
    if (meta.incapacitates) return true
  }
  return false
}

// Derive a MovementCaps-shaped record from the active status list. Used by
// both client (for prediction) and server (for the authoritative tick) so
// the kinematic step stays deterministic across the wire.
export interface MovementCapsFromStatus {
  slowFraction: number
  movementLocked: boolean
  castLocked: boolean
}

export function movementCapsFromStatuses(list: StatusInstanceShape[]): MovementCapsFromStatus {
  return {
    slowFraction: totalSlowFraction(list),
    movementLocked: isMovementLocked(list),
    castLocked: isCastLocked(list),
  }
}
