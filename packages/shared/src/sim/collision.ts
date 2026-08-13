// ---------------------------------------------------------------------------
// Static-geometry collision queries shared by client and server.
//
// These were server-only, which forced the client to approximate anything that
// depends on where the walls are — most visibly the dash preview, which had to
// either guess or show nothing. They are pure functions over the map AABBs and
// both sides load the same map, so sharing them makes the client EXACT instead
// of merely close.
// ---------------------------------------------------------------------------
import { PLAYER_CAPSULE_HEIGHT_M } from '../constants/weapons.js'
import { CAPSULE_HALF_WIDTH_M } from '../constants/world.js'

import type { StaticMap } from './types.js'

type Boxes = StaticMap['boxes']

/**
 * Does a player capsule at (x,y,z) overlap any static box (2D footprint + Y span)?
 * Uses the player's MOVEMENT footprint (CAPSULE_HALF_WIDTH_M = 0.4), the same
 * radius resolveCapsuleVsBox uses for walking — NOT the wider projectile-hit
 * radius (PLAYER_CAPSULE_RADIUS_M = 0.65). This is the self-collision test for
 * dash/knockback displacement, so it must stop the body exactly where walking
 * would; using the inflated projectile radius made dashes halt ~0.25 m short of
 * walls the player could otherwise walk right up to.
 */
export function isCapsuleBlocked2D(boxes: Boxes, x: number, y: number, z: number): boolean {
  const r = CAPSULE_HALF_WIDTH_M
  const minY = y - PLAYER_CAPSULE_HEIGHT_M / 2
  const maxY = y + PLAYER_CAPSULE_HEIGHT_M / 2
  for (const box of boxes) {
    if (maxY < box.minY || minY > box.maxY) continue
    if (x + r >= box.minX && x - r <= box.maxX && z + r >= box.minZ && z - r <= box.maxZ) {
      return true
    }
  }
  return false
}

/**
 * Hold a body inside the arena's circular boundary.
 *
 * The arena is round, so the boundary is a radius, not four AABB walls: a
 * square perimeter would either cut the corners off the sand or let the player
 * stand outside the barrier wall on the diagonals.
 *
 * Only the OUTWARD component of velocity is removed. Keeping the tangential
 * part is what makes the wall feel like a wall you can run along rather than
 * flypaper — the same reason box collision resolves on one axis and not both.
 * Returns true when the body was actually pushed back.
 */
export function clampToArenaBounds(
  pos: { x: number; z: number },
  vel: { x: number; z: number } | null,
  radius: number | undefined,
): boolean {
  if (!radius || radius <= 0) return false
  const limit = radius - CAPSULE_HALF_WIDTH_M
  const dist = Math.hypot(pos.x, pos.z)
  if (dist <= limit || dist < 1e-6) return false

  const nx = pos.x / dist
  const nz = pos.z / dist
  pos.x = nx * limit
  pos.z = nz * limit
  if (vel) {
    const outward = vel.x * nx + vel.z * nz
    if (outward > 0) {
      vel.x -= outward * nx
      vel.z -= outward * nz
    }
  }
  return true
}
