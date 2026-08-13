// The movement caps the client PREDICTS with.
//
// These must equal what GameRoom builds for the same tick, or every step of an
// affected build is a correction the player sees as rubber-banding. Extracted
// so the derivation reads as one thing: statuses in, caps out, specialisation
// folded in on the way.
import {
  movementCapsFromStatuses,
  slowFractionWithSpecialization,
  type MovementCaps,
  type StatusKind,
} from '@ragequit/shared'

interface StatusLike {
  kind: string
  stacks: number
  remainingSec: number
  slowFractionOverride: number
}

/**
 * Caps for the local player's next simulated step.
 *
 * The schema lags by ~RTT/2, so these are the last-known server statuses
 * rather than live ones — still far more accurate than ignoring caps, and
 * root/stun prediction matches the server within one round trip.
 */
export function predictedMovementCaps(
  statuses: Iterable<StatusLike> | null | undefined,
  specializationId: string | undefined,
): MovementCaps {
  const list = statuses
    ? Array.from(statuses).map((s) => ({
        kind: s.kind as StatusKind,
        stacks: s.stacks,
        remainingSec: s.remainingSec,
        slowFractionOverride: s.slowFractionOverride > 0 ? s.slowFractionOverride : undefined,
      }))
    : []
  const fromStatus = movementCapsFromStatuses(list)
  return {
    slowFraction: slowFractionWithSpecialization(fromStatus.slowFraction, specializationId),
    movementLocked: fromStatus.movementLocked,
    castLocked: fromStatus.castLocked,
  }
}
