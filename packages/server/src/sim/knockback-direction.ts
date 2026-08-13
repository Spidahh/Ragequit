// Which way a knockup shoves its victim, and how hard.
//
// Pure geometry over positions — extracted from AbilityEngine, which sits on its
// line ceiling, and it belongs on its own anyway: the direction of a shove has
// nothing to do with how an ability resolves.
//
// The distance carried here is the AUTHORED metres from the registry. The launch
// converts it into an impulse (00_truth.md 7.1), so travel is a consequence of
// speed x airtime rather than a second number that can disagree with the first.

import type { KnockupEffect, Player, Vec3 } from '@ragequit/shared'

import { impactPushDirection } from './combat-geometry.js'

export interface Knockback {
  x: number
  z: number
  distance: number
}

/**
 * Shove direction from an explicit origin. `fallbackYaw` covers the degenerate
 * case where origin and victim occupy the same spot, which has no direction of
 * its own — without it a point-blank hit would shove nowhere.
 */
export function knockbackFromPoint(
  origin: Vec3,
  victim: Player,
  effect: KnockupEffect,
  fallbackYaw: number,
): Knockback | undefined {
  const distance = effect.knockbackDistance ?? 0
  if (distance <= 0) return undefined
  const dir = impactPushDirection(
    origin.x,
    origin.z,
    victim.transform.x,
    victim.transform.z,
    fallbackYaw,
  )
  return { x: dir.x, z: dir.z, distance }
}

/** Shove direction away from the caster — the common case. */
export function knockbackFromCaster(
  caster: Player,
  victim: Player,
  effect: KnockupEffect,
  yaw: number,
): Knockback | undefined {
  return knockbackFromPoint(
    { x: caster.transform.x, y: caster.transform.y, z: caster.transform.z },
    victim,
    effect,
    yaw,
  )
}
