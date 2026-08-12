// The single AoE shape used by every area effect.

import { PLAYER_CAPSULE_HEIGHT_M, type Player } from '@ragequit/shared'

/**
 * ONE AoE shape for every effect kind: a vertical disc, as tall as a player
 * capsule above and below the blast centre.
 *
 * Damage used a 3-D sphere while status and knockup used INFINITE vertical
 * cylinders, so a single ability resolved three different sets of victims —
 * an enemy on a ledge could be rooted and launched without taking any damage,
 * and one far above the blast was still affected. The ground circle the client
 * draws is a disc, so a bounded disc is also the shape that matches the visual.
 */
export function insideAoe(
  victim: Player,
  center: { x: number; y: number; z: number },
  radius: number,
): boolean {
  const dx = victim.transform.x - center.x
  const dz = victim.transform.z - center.z
  if (Math.hypot(dx, dz) > radius) return false
  // Vertical reach grows with the blast (so a big AoE still catches an airborne
  // target, as the old sphere did) but is never shorter than a player capsule,
  // so even a tight AoE cannot miss someone standing right on top of it.
  const halfHeight = Math.max(PLAYER_CAPSULE_HEIGHT_M, radius)
  const victimMidY = victim.transform.y + PLAYER_CAPSULE_HEIGHT_M / 2
  return Math.abs(victimMidY - center.y) <= halfHeight
}
