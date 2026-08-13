// How a body gets moved by something other than its own input: shoved by a
// knockup, or carried by its own dash.
//
// Pure geometry over positions — extracted from AbilityEngine and GameRoom, both
// of which sit on their line ceilings, and it belongs on its own anyway: neither
// the direction of a shove nor where a blink lands has anything to do with how
// an ability resolves or how a room is orchestrated.
//
// The distance carried here is the AUTHORED metres from the registry. The launch
// converts it into an impulse (00_truth.md 7.1), so travel is a consequence of
// speed x airtime rather than a second number that can disagree with the first.

import {
  clampToArenaBounds,
  dashLanding,
  type KnockupEffect,
  type Player,
  type StaticMap,
  type Vec3,
} from '@ragequit/shared'

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

/**
 * Where a dash or blink actually puts the body.
 *
 * Delegates to the SAME shared solver the client's dash ghost draws with
 * (shared/abilities/aim.ts). GameRoom used to hold a private copy of the
 * stepping loop and the ghost mirrored it by hand — a duplication that becomes
 * a lie the first time either side is tuned.
 *
 * The arena perimeter stops a dash the same way a wall does. Without the clamp
 * here the controller would still pull the body back on the next tick, but as a
 * visible snap a frame after the blink instead of the blink ending short.
 */
export function resolveDisplacement(
  map: StaticMap,
  from: Vec3,
  dx: number,
  dz: number,
  cancelOnCollision: boolean,
): { x: number; z: number } {
  const landed = dashLanding(map.boxes, from, dx, dz, cancelOnCollision)
  const out = { x: landed.x, z: landed.z }
  clampToArenaBounds(out, null, map.boundsRadius)
  return out
}
