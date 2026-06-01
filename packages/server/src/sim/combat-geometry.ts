// ---------------------------------------------------------------------------
// Pure combat geometry helpers.
//
// Stateless collision / line-of-sight / push math extracted from GameRoom so
// they can be unit-tested and reused without the room. They take the arena
// boxes explicitly instead of reading room state.
// ---------------------------------------------------------------------------
import {
  ABILITY_DEFS,
  getAbilitySlotFamily,
  segmentVsAabb,
  PLAYER_CAPSULE_RADIUS_M,
  PLAYER_CAPSULE_HEIGHT_M,
  type StaticMap,
} from '@ragequit/shared'

type Boxes = StaticMap['boxes']
interface Vec3 {
  x: number
  y: number
  z: number
}

/** Is a point (relative to a wall origin, rotated by yaw) inside the wall slab? */
export function pointInsideWall(dx: number, dz: number, yaw: number, width: number): boolean {
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  const along = dx * -s + dz * -c
  const perp = dx * c + dz * -s
  return Math.abs(perp) <= 0.6 && Math.abs(along) <= width / 2
}

/** Does a player capsule at (x,y,z) overlap any static box (2D footprint + Y span)? */
export function isCapsuleBlocked2D(boxes: Boxes, x: number, y: number, z: number): boolean {
  const r = PLAYER_CAPSULE_RADIUS_M
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

/** Clear line of sight between two points (no static box intersects the segment)? */
export function hasLineOfSight(boxes: Boxes, from: Vec3, to: Vec3): boolean {
  for (const box of boxes) {
    if (segmentVsAabb(from, to, box) !== null) return false
  }
  return true
}

/** Horizontal push distance applied when a magic spell impacts (deterministic). */
export function spellImpactPushDistance(cause: string): number {
  const rawCause = cause.startsWith('ability:') ? cause.slice(8) : cause
  if (rawCause.startsWith('zone:')) return 0.16
  if (rawCause.startsWith('dot:') || rawCause.startsWith('status:')) return 0.1
  const def = ABILITY_DEFS[rawCause]
  if (!def) return 0
  const family = getAbilitySlotFamily(rawCause)
  if (family !== 'magicBase' && family !== 'magicAdvanced') return 0
  if (def.effects.some((effect) => effect.kind === 'knockup')) return 0
  if (def.effects.some((effect) => effect.kind === 'projectile')) {
    return def.effects.some((effect) => effect.kind === 'projectile' && (effect.splashRadius ?? 0) > 0)
      ? 0.34
      : 0.26
  }
  if (def.effects.some((effect) => effect.kind === 'channel')) return 0.12
  return 0.22
}
