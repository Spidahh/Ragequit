// Which enemy an ability picks.
//
// Two rules, both pure over the player map: the LANE for `forward` targeting
// (nearest body inside a cone that opens 10 degrees, line of sight required),
// and plain nearest-in-range for everything else.
//
// Extracted from AbilityEngine, which sits on its line ceiling — and it belongs
// out here anyway: choosing a victim has nothing to do with orchestrating the
// effects that then hit them. The lane radius comes from the shared solver, the
// same function the client draws the preview with, so what you see is what the
// server will accept.
import {
  PLAYER_CAPSULE_HEIGHT_M,
  directionFromYawPitch,
  forwardAimRadiusAt,
} from '@ragequit/shared'
import type { Player, Vec3 } from '@ragequit/shared'

interface PlayerMap {
  forEach: (fn: (player: Player, id: string) => void) => void
}

export interface TargetSelectionDeps {
  players: PlayerMap
  /** Omit to skip the LoS gate (tests, or a room without geometry). */
  hasLineOfSight?: (from: Vec3, to: Vec3) => boolean
}

const midCapsule = (p: Player): Vec3 => ({
  x: p.transform.x,
  y: p.transform.y + PLAYER_CAPSULE_HEIGHT_M / 2,
  z: p.transform.z,
})

/** Nearest living enemy inside the forward lane, or null. */
export function findForwardEnemy(
  deps: TargetSelectionDeps,
  sid: string,
  origin: Vec3,
  yaw: number,
  pitch: number,
  range: number,
): string | null {
  const dir = directionFromYawPitch(yaw, pitch)
  let bestId: string | null = null
  let bestAlong = Infinity
  deps.players.forEach((victim, vid) => {
    if (vid === sid || !victim.alive) return
    const vx = victim.transform.x - origin.x
    const vy = victim.transform.y + PLAYER_CAPSULE_HEIGHT_M / 2 - origin.y
    const vz = victim.transform.z - origin.z
    const along = vx * dir.x + vy * dir.y + vz * dir.z
    if (along < 0 || along > range) return
    const distSq = vx * vx + vy * vy + vz * vz
    const lateralSq = Math.max(0, distSq - along * along)
    // The lane the client draws. Shared formula on purpose — a preview that
    // disagrees with the hitbox teaches a lie, and two literals in two files
    // always drift eventually.
    const aimRadius = forwardAimRadiusAt(along)
    if (lateralSq > aimRadius * aimRadius) return
    if (deps.hasLineOfSight && !deps.hasLineOfSight(origin, midCapsule(victim))) return
    if (along < bestAlong) {
      bestAlong = along
      bestId = vid
    }
  })
  return bestId
}

/** Nearest living enemy within `range` on the horizontal plane, or null. */
export function findNearestEnemy(
  deps: TargetSelectionDeps,
  sid: string,
  anchor: Vec3,
  range: number,
): string | null {
  let bestId: string | null = null
  let bestDist = Number.POSITIVE_INFINITY
  deps.players.forEach((p, id) => {
    if (id === sid || !p.alive) return
    const d = Math.hypot(p.transform.x - anchor.x, p.transform.z - anchor.z)
    if (d > range) return
    if (d < bestDist) {
      bestId = id
      bestDist = d
    }
  })
  return bestId
}
