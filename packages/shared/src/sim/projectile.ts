// Shared projectile simulation. Used authoritatively by the server and
// referenced in tests. Kept pure + deterministic so client-side ballistic
// prediction can reuse it.
//
// Semantics:
// - Projectile state is (pos, vel, gravity). Each tick we step by TICK_MS.
// - Collision: at every step we form a segment from the previous position to the
//   new position. We first test the segment against every player capsule
//   (ignoring the shooter), then against every AABB in the static map, then
//   against the ground plane. The nearest hit wins.
// - Hitboxes are vertical capsules centred at player.pos with radius
//   PLAYER_CAPSULE_RADIUS_M and full height PLAYER_CAPSULE_HEIGHT_M. Pos is
//   the foot of the capsule so the spine runs from `pos.y` to `pos.y + H`.

import { TICK_MS } from '../constants/tick.js'
import { TERRAIN_GROUND_Y } from '../constants/weapons.js'

import type { AABB, Vec3 } from './types.js'

// Minimal projectile state — matches the replicated Projectile schema shape.
export interface ProjectileState {
  pos: Vec3
  vel: Vec3
  gravity: number
}

// Target passed to collision tests. Keeping the shooter id on the projectile
// side lets us skip self-collision.
export interface CapsuleTarget {
  id: string
  pos: Vec3 // foot position
  radius: number
  height: number
}

// Integrate one tick. Gravity acts on vy.
export function stepProjectile(state: ProjectileState, dtSec: number = TICK_MS / 1000): void {
  state.vel.y -= state.gravity * dtSec
  state.pos.x += state.vel.x * dtSec
  state.pos.y += state.vel.y * dtSec
  state.pos.z += state.vel.z * dtSec
}

// Static helper — produce the segment start/end given previous pos + current
// velocity and dt. Keeps the collision layer decoupled from mutation order.
export function segmentFor(
  prevPos: Vec3,
  vel: Vec3,
  gravityThisStep: number,
  dtSec: number,
): { from: Vec3; to: Vec3 } {
  const from = { x: prevPos.x, y: prevPos.y, z: prevPos.z }
  // Use midpoint rule for Y to match the semi-implicit step.
  const to = {
    x: prevPos.x + vel.x * dtSec,
    y: prevPos.y + (vel.y - gravityThisStep * dtSec) * dtSec,
    z: prevPos.z + vel.z * dtSec,
  }
  return { from, to }
}

// Returns the smallest t in [0, 1] along segment (from → to) at which the
// segment enters the vertical capsule, or null if no hit. Uses closest
// approach of segment to capsule spine + radius check.
export function segmentVsCapsule(from: Vec3, to: Vec3, capsule: CapsuleTarget): number | null {
  // Segment direction.
  const sx = to.x - from.x
  const sy = to.y - from.y
  const sz = to.z - from.z
  const segLenSq = sx * sx + sy * sy + sz * sz
  if (segLenSq <= 1e-12) return null

  // Capsule spine = vertical line from (cx, cy0, cz) to (cx, cy1, cz).
  const cx = capsule.pos.x
  const cz = capsule.pos.z
  const cy0 = capsule.pos.y
  const cy1 = capsule.pos.y + capsule.height
  const r = capsule.radius

  // Step along the segment in small substeps; for each check distance to
  // spine. This is both simple and robust for small spawn steps (≤ ~1 m at
  // 60 Hz for 60 m/s arrows). Cubic analytic solution is possible but not
  // worth the complexity here.
  const steps = 8
  let bestT: number | null = null
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const px = from.x + sx * t
    const py = from.y + sy * t
    const pz = from.z + sz * t
    // Clamp point's y to spine range for nearest-point-on-spine distance.
    const spineY = py < cy0 ? cy0 : py > cy1 ? cy1 : py
    const dx = px - cx
    const dy = py - spineY
    const dz = pz - cz
    const distSq = dx * dx + dy * dy + dz * dz
    if (distSq <= r * r) {
      bestT = t
      break
    }
  }
  return bestT
}

// Segment vs AABB, returns hit t in [0, 1] via slab method.
export function segmentVsAabb(from: Vec3, to: Vec3, box: AABB): number | null {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dz = to.z - from.z

  let tmin = 0
  let tmax = 1

  // X slab.
  if (Math.abs(dx) < 1e-9) {
    if (from.x < box.minX || from.x > box.maxX) return null
  } else {
    const invD = 1 / dx
    let t1 = (box.minX - from.x) * invD
    let t2 = (box.maxX - from.x) * invD
    if (t1 > t2) [t1, t2] = [t2, t1]
    tmin = Math.max(tmin, t1)
    tmax = Math.min(tmax, t2)
    if (tmin > tmax) return null
  }

  if (Math.abs(dy) < 1e-9) {
    if (from.y < box.minY || from.y > box.maxY) return null
  } else {
    const invD = 1 / dy
    let t1 = (box.minY - from.y) * invD
    let t2 = (box.maxY - from.y) * invD
    if (t1 > t2) [t1, t2] = [t2, t1]
    tmin = Math.max(tmin, t1)
    tmax = Math.min(tmax, t2)
    if (tmin > tmax) return null
  }

  if (Math.abs(dz) < 1e-9) {
    if (from.z < box.minZ || from.z > box.maxZ) return null
  } else {
    const invD = 1 / dz
    let t1 = (box.minZ - from.z) * invD
    let t2 = (box.maxZ - from.z) * invD
    if (t1 > t2) [t1, t2] = [t2, t1]
    tmin = Math.max(tmin, t1)
    tmax = Math.min(tmax, t2)
    if (tmin > tmax) return null
  }

  return tmin >= 0 && tmin <= 1 ? tmin : null
}

// Segment vs ground plane (y = groundY). Returns t > 0 when crossing.
export function segmentVsGround(
  from: Vec3,
  to: Vec3,
  groundY: number = TERRAIN_GROUND_Y,
): number | null {
  const fy = from.y - groundY
  const ty = to.y - groundY
  // Both points already at or below ground: no crossing to detect.
  // Returning 0 here would produce a spurious impact at the segment start.
  if (fy <= 0 && ty <= 0) return null
  if (fy >= 0 && ty >= 0) return null
  // Crosses y = groundY. Linear interpolation in t.
  return fy / (fy - ty)
}

// --- Bow charge → damage + speed ------------------------------------------

// Given a charge duration in seconds, returns a ratio clamped to [0, 1].
// Charges under BOW_CHARGE_MIN_SEC return 0 (caller treats as "no shot").
export function bowChargeRatio(chargeSec: number, minSec: number, fullSec: number): number {
  if (chargeSec < minSec) return 0
  if (chargeSec >= fullSec) return 1
  return (chargeSec - minSec) / (fullSec - minSec)
}

// Linear interpolate between min and full stat for a given charge ratio.
// Ratio must be in [0, 1]. Returns stat at min for ratio 0.
export function bowLerp(min: number, full: number, ratio: number): number {
  const r = ratio < 0 ? 0 : ratio > 1 ? 1 : ratio
  return min + (full - min) * r
}

// Unit direction vector for a given yaw/pitch. Three.js convention:
// yaw 0 looks down -Z; pitch 0 is level; positive pitch looks up.
export function directionFromYawPitch(yaw: number, pitch: number): Vec3 {
  const cy = Math.cos(yaw)
  const sy = Math.sin(yaw)
  const cp = Math.cos(pitch)
  const sp = Math.sin(pitch)
  return {
    x: -sy * cp,
    y: sp,
    z: -cy * cp,
  }
}

// --- Parry damage resolution ----------------------------------------------

// Returns the final damage the victim takes given their parry state.
// Tap parry (100% block) cancels the hit entirely. Hold parry lets 30%
// through. If the victim isn't parrying, returns the raw damage.
export function applyParryReduction(
  raw: number,
  parrying: boolean,
  isHold: boolean,
  tapBlockFrac: number,
  holdBlockFrac: number,
): number {
  if (!parrying) return raw
  const blockFrac = isHold ? holdBlockFrac : tapBlockFrac
  const clamped = blockFrac < 0 ? 0 : blockFrac > 1 ? 1 : blockFrac
  const out = raw * (1 - clamped)
  return out < 0 ? 0 : out
}
