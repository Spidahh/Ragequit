// Bridge from the ability/status engines' push-shape into the room's
// PendingDamage queue. Takes a GETTER (not the array) so it always targets the
// CURRENT queue: GameRoom.drainDamage reassigns the queue to a fresh array each
// tick, and a captured array reference would orphan — silently dropping every
// ability/DoT damage entry after the first drain.
import type { StatusKind } from '@ragequit/shared'

import type { PendingDamage } from '../sim/damage-types.js'

export interface PendingDamageBridgeEntry {
  attackerId: string
  victimId: string
  amount: number
  element: string
  cause: string
  canParry: boolean
  lifestealFraction?: number
  onDamageStatus?: {
    status: StatusKind
    durationSec: number
    stacks?: number
    slowFraction?: number
  }
}

export interface PendingDamageBridge {
  push: (entry: PendingDamageBridgeEntry) => number
  length: number
}

export function makePendingDamageBridge(getTarget: () => PendingDamage[]): PendingDamageBridge {
  return {
    get length() {
      return getTarget().length
    },
    push(entry) {
      const target = getTarget()
      target.push({
        attackerId: entry.attackerId,
        victimId: entry.victimId,
        damage: entry.amount,
        knockup: false,
        cause: entry.cause,
        canParry: entry.canParry,
        element: entry.element ?? '',
        lifestealFraction: entry.lifestealFraction,
        onDamageStatus: entry.onDamageStatus
          ? {
              kind: entry.onDamageStatus.status,
              durationSec: entry.onDamageStatus.durationSec,
              stacks: entry.onDamageStatus.stacks ?? 1,
              slowFraction: entry.onDamageStatus.slowFraction,
            }
          : undefined,
      })
      return target.length
    },
  }
}
