// ---------------------------------------------------------------------------
// Pure projectile collision resolution.
//
// Given a projectile's previous + next position for a tick, finds the NEAREST
// hit across players (capsules), static boxes and the ground. Extracted from
// GameRoom.stepProjectiles so the collision math is unit-testable in isolation.
// ---------------------------------------------------------------------------
import {
  segmentVsCapsule,
  segmentVsAabb,
  segmentVsGround,
  TERRAIN_GROUND_Y,
  PLAYER_CAPSULE_RADIUS_M,
  PLAYER_CAPSULE_HEIGHT_M,
  type CapsuleTarget,
  type StaticMap,
} from '@ragequit/shared'

type Boxes = StaticMap['boxes']
interface Vec3 {
  x: number
  y: number
  z: number
}

/** Minimal player shape the collision pass needs (avoids importing the schema). */
export interface CollidablePlayer {
  transform: { x: number; y: number; z: number }
  alive: boolean
  invulnUntilTick: number
}

export interface ProjectileHit {
  /** Fraction along prev->to where the nearest hit occurs (0..1). */
  t: number
  kind: 'victim' | 'terrain'
  /** Victim session id when kind === 'victim', else null. */
  victim: string | null
}

/**
 * Resolve the nearest collision for a projectile segment prev->to this tick.
 * Skips the owner, dead players and invulnerable players. Returns null on miss.
 */
export function resolveProjectileHit(
  prev: Vec3,
  to: Vec3,
  players: Iterable<readonly [string, CollidablePlayer]>,
  boxes: Boxes,
  ownerId: string,
  now: number,
): ProjectileHit | null {
  let bestT: number | null = null
  let bestKind: 'victim' | 'terrain' | null = null
  let bestVictim: string | null = null

  // Players.
  for (const [vid, player] of players) {
    if (vid === ownerId) continue
    if (!player.alive) continue
    if (now < player.invulnUntilTick) continue
    // transform.y is the capsule CENTRE; segmentVsCapsule expects the FOOT.
    const capsule: CapsuleTarget = {
      id: vid,
      pos: {
        x: player.transform.x,
        y: player.transform.y - PLAYER_CAPSULE_HEIGHT_M / 2,
        z: player.transform.z,
      },
      radius: PLAYER_CAPSULE_RADIUS_M,
      height: PLAYER_CAPSULE_HEIGHT_M,
    }
    const t = segmentVsCapsule(prev, to, capsule)
    if (t !== null && (bestT === null || t < bestT)) {
      bestT = t
      bestKind = 'victim'
      bestVictim = vid
    }
  }

  // Static boxes.
  for (const box of boxes) {
    const t = segmentVsAabb(prev, to, box)
    if (t !== null && (bestT === null || t < bestT)) {
      bestT = t
      bestKind = 'terrain'
      bestVictim = null
    }
  }

  // Ground.
  const tGround = segmentVsGround(prev, to, TERRAIN_GROUND_Y)
  if (tGround !== null && (bestT === null || tGround < bestT)) {
    bestT = tGround
    bestKind = 'terrain'
    bestVictim = null
  }

  if (bestT === null || bestKind === null) return null
  return { t: bestT, kind: bestKind, victim: bestVictim }
}

/**
 * Horizontal knockback vector for an ability projectile impact. Splash hits push
 * the victim radially away from the impact point; direct hits (and splash hits
 * exactly at the impact point) push along the projectile's travel direction.
 */
export function projectileKnockbackVector(
  splash: boolean,
  victimX: number,
  victimZ: number,
  hitX: number,
  hitZ: number,
  velDirX: number,
  velDirZ: number,
  distance: number,
): { x: number; z: number } {
  if (splash) {
    const dx = victimX - hitX
    const dz = victimZ - hitZ
    const len = Math.hypot(dx, dz)
    if (len > 0.001) return { x: (dx / len) * distance, z: (dz / len) * distance }
  }
  return { x: velDirX * distance, z: velDirZ * distance }
}

/**
 * All valid victims within `radius` of `center` (unsorted) — used for splash.
 * Skips the owner, dead and invulnerable players.
 */
export function playersInRadius(
  players: Iterable<readonly [string, CollidablePlayer]>,
  tick: number,
  ownerId: string,
  center: Vec3,
  radius: number,
): string[] {
  const out: string[] = []
  for (const [pid, player] of players) {
    if (pid === ownerId) continue
    if (!player.alive) continue
    if (tick < player.invulnUntilTick) continue
    const dx = player.transform.x - center.x
    const dy = player.transform.y - center.y
    const dz = player.transform.z - center.z
    if (Math.hypot(dx, dy, dz) <= radius) out.push(pid)
  }
  return out
}

/**
 * Find up to `maxTargets` chain-jump victims within `radius` of `origin`, nearest
 * first. Skips the owner, the already-excluded ids, dead and invulnerable players.
 */
export function findChainVictims(
  players: Iterable<readonly [string, CollidablePlayer]>,
  tick: number,
  ownerId: string,
  excluded: readonly string[],
  origin: Vec3,
  radius: number,
  maxTargets: number,
): string[] {
  if (radius <= 0 || maxTargets <= 0) return []
  const excludedSet = new Set(excluded)
  excludedSet.add(ownerId)
  const candidates: { id: string; dist2: number }[] = []
  for (const [pid, player] of players) {
    if (excludedSet.has(pid)) continue
    if (!player.alive) continue
    if (tick < player.invulnUntilTick) continue
    const dx = player.transform.x - origin.x
    const dy = player.transform.y - origin.y
    const dz = player.transform.z - origin.z
    const dist2 = dx * dx + dy * dy + dz * dz
    if (dist2 <= radius * radius) candidates.push({ id: pid, dist2 })
  }
  candidates.sort((a, b) => a.dist2 - b.dist2)
  return candidates.slice(0, maxTargets).map((c) => c.id)
}
