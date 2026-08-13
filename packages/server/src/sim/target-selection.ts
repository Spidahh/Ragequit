// Which enemy an ability picks.
//
// Two rules, both pure over the player map: the LANE for `forward` targeting
// (nearest body inside a cone whose width depends on the ability's delivery
// class, line of sight required), and plain nearest-in-range for everything
// else.
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
import { deliveryClass } from '@ragequit/shared'
import type { AbilityDef, DeliveryClass, Player, Vec3 } from '@ragequit/shared'

import type { CastTarget } from './ability-engine-host.js'
import { clampPointToRange } from './targeting-geometry.js'

interface PlayerMap {
  forEach: (fn: (player: Player, id: string) => void) => void
  get: (id: string) => Player | undefined
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
  delivery: DeliveryClass = 'cone',
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
    const aimRadius = forwardAimRadiusAt(along, delivery)
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

// --- Where an ability resolves ----------------------------------------------
//
// Anchor, single target, area centre. These moved out of AbilityEngine with
// findForwardEnemy because they are the same concern — "who and where does this
// cast apply to" — and keeping them next to the lane rule is what lets the lane
// width follow the ability's delivery class without threading a parameter
// through the engine.

export function resolveAnchor(
  deps: TargetSelectionDeps,
  player: Player,
  target: CastTarget,
  def: AbilityDef,
): Vec3 {
  const halfH = PLAYER_CAPSULE_HEIGHT_M / 2
  if (def.targeting === 'self') {
    return { x: player.transform.x, y: player.transform.y + halfH, z: player.transform.z }
  }
  if (def.targeting === 'point' && target.point) {
    return clampPointToRange(player.transform, target.point, def.range)
  }
  if (def.targeting === 'target' && target.targetId) {
    const t = deps.players.get(target.targetId)
    if (t) return { x: t.transform.x, y: t.transform.y + halfH, z: t.transform.z }
  }
  // forward fallback — anchor at the caster (range checks happen per-victim)
  return { x: player.transform.x, y: player.transform.y + halfH, z: player.transform.z }
}

export function resolveSingleTarget(
  deps: TargetSelectionDeps,
  sid: string,
  caster: Player,
  target: CastTarget,
  def: AbilityDef,
): string | null {
  const origin = resolveAnchor(deps, caster, target, def)
  if (def.targeting === 'self') return sid
  if (def.targeting === 'target' && target.targetId) {
    const victim = deps.players.get(target.targetId)
    if (!victim?.alive || target.targetId === sid) return null
    const dx = victim.transform.x - origin.x
    const dy = victim.transform.y + PLAYER_CAPSULE_HEIGHT_M / 2 - origin.y
    const dz = victim.transform.z - origin.z
    if (Math.hypot(dx, dy, dz) > def.range) return null
    if (
      deps.hasLineOfSight &&
      !deps.hasLineOfSight(origin, {
        x: victim.transform.x,
        y: victim.transform.y + PLAYER_CAPSULE_HEIGHT_M / 2,
        z: victim.transform.z,
      })
    )
      return null
    return target.targetId
  }
  if (def.targeting === 'forward') {
    return forwardVictim(deps, sid, origin, target, def)
  }
  return findNearestEnemy(deps, sid, origin, def.range)
}

export function resolveAreaCenter(
  deps: TargetSelectionDeps,
  sid: string,
  caster: Player,
  target: CastTarget,
  def: AbilityDef,
): Vec3 | null {
  if (def.targeting === 'self') return resolveAnchor(deps, caster, target, def)
  if (def.targeting === 'point') {
    return target.point ? clampPointToRange(caster.transform, target.point, def.range) : null
  }
  if (def.targeting === 'target' && target.targetId) {
    const victim = deps.players.get(target.targetId)
    return victim?.alive
      ? {
          x: victim.transform.x,
          y: victim.transform.y + PLAYER_CAPSULE_HEIGHT_M / 2,
          z: victim.transform.z,
        }
      : null
  }
  if (def.targeting === 'forward') {
    // Movement abilities with an AoE follow-up detonate around the caster's
    // post-move position. Non-movement forward AoEs detonate on the aimed target.
    const hasMove = def.effects.some((effect) => effect.kind === 'move')
    if (hasMove) return resolveAnchor(deps, caster, target, def)
    const victimId = forwardVictim(deps, sid, resolveAnchor(deps, caster, target, def), target, def)
    const victim = victimId ? deps.players.get(victimId) : undefined
    return victim?.alive
      ? {
          x: victim.transform.x,
          y: victim.transform.y + PLAYER_CAPSULE_HEIGHT_M / 2,
          z: victim.transform.z,
        }
      : null
  }
  return resolveAnchor(deps, caster, target, def)
}

/**
 * Nearest enemy in this ability's lane. The lane's width is the ability's own
 * delivery class (00_truth.md §3.5), which is why this is one helper rather
 * than the same eight arguments written out twice.
 */
export function forwardVictim(
  deps: TargetSelectionDeps,
  sid: string,
  origin: Vec3,
  target: CastTarget,
  def: AbilityDef,
): string | null {
  const { yaw, pitch } = target
  return findForwardEnemy(deps, sid, origin, yaw, pitch, def.range, deliveryClass(def))
}
