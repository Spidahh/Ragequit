// ---------------------------------------------------------------------------
// Ability targeting geometry (pure).
//
// Small position helpers for placing and clamping ability target points,
// extracted from AbilityEngine so they can be unit-tested without the engine.
// ---------------------------------------------------------------------------
import { directionFromYawPitch, type Vec3 } from '@ragequit/shared'

/** A point `distance` in front of `origin` (along `yaw`), at the origin's height. */
export function placePointForward(origin: Vec3, yaw: number, distance: number): Vec3 {
  const dir = directionFromYawPitch(yaw, 0)
  return {
    x: origin.x + dir.x * distance,
    y: origin.y,
    z: origin.z + dir.z * distance,
  }
}

/** Clamp `point` so it lies within `range` of `origin` horizontally (keeps point.y). */
export function clampPointToRange(origin: Vec3, point: Vec3, range: number): Vec3 {
  const dx = point.x - origin.x
  const dz = point.z - origin.z
  const dist = Math.hypot(dx, dz)
  if (range <= 0 || dist <= range || dist <= 1e-5) return { ...point }
  const scale = range / dist
  return {
    x: origin.x + dx * scale,
    y: point.y,
    z: origin.z + dz * scale,
  }
}
