// ---------------------------------------------------------------------------
// Shared damage-queue entry.
//
// Multiple subsystems (projectiles, zones, swings, abilities) enqueue damage
// that GameRoom drains at the end of each tick. The entry type belongs to none
// of them — it lives here so every producer and the consumer share one
// definition without a cross-subsystem import.
// ---------------------------------------------------------------------------
import type { StatusKind } from '@ragequit/shared'

export interface PendingDamage {
  attackerId: string
  victimId: string
  damage: number
  knockup: boolean
  cause: string
  canParry: boolean
  element: string // '' = physical; 'fire'/'ice'/etc. for elemental hits
  lifestealFraction?: number
  onDamageStatus?: { kind: StatusKind; durationSec: number; stacks: number; slowFraction?: number }
  /** True when this damage entry carries a Flow +20% amplification. */
  flowAmplified?: boolean
}
