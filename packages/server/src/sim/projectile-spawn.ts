// Registry shape to projectile shape.
//
// `ProjectileEffect.onHitStatus` names its field `status`; the projectile
// subsystem names it `kind`, and defaults the stack count. That translation was
// eleven lines inlined in the middle of the spawn call, which is exactly the
// kind of noise that hides a real argument — and AbilityEngine sits on its line
// ceiling, so every new capability has to pay for itself.
import type { ProjectileEffect, StatusKind } from '@ragequit/shared'

export interface ProjectileOnHitStatus {
  kind: StatusKind
  durationSec: number
  stacks: number
  slowFraction?: number
}

/** The on-hit status a projectile carries, in the subsystem's own shape. */
export function onHitStatusOf(e: ProjectileEffect): ProjectileOnHitStatus | undefined {
  const s = e.onHitStatus
  if (!s) return undefined
  return {
    kind: s.status,
    durationSec: s.durationSec,
    stacks: s.stacks ?? 1,
    slowFraction: s.slowFraction,
  }
}
