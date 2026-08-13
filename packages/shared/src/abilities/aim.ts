// ---------------------------------------------------------------------------
// The aim solver: what an ability is about to do, as geometry.
//
// WHY THIS EXISTS
//
// The owner's central ask, in his words: a simple but effective system that
// makes you understand VISUALLY where the spell will go and what it will do.
//
// The reason 46 of 53 abilities showed nothing before commit was not a missing
// renderer — the renderer existed and was good. It was that the shape an
// ability occupies lived only inside the server's resolution code, as inline
// arithmetic, in three different places. Nothing could draw it because nothing
// could ask for it.
//
// So the shape is a value now. One pure function turns an AbilityDef plus an
// aim into a list of AimShapes; the client draws them and the server resolves
// against the same numbers. A preview that drifts from the hitbox is worse than
// no preview at all — it teaches a lie — and the only durable defence against
// drift is that there is one formula, not two that agree today.
//
// This module is deliberately free of rendering concepts. It answers "what
// volume does this ability occupy", not "what colour is it".
// ---------------------------------------------------------------------------
import { PLAYER_CAPSULE_HEIGHT_M, PROJECTILE_MUZZLE_Y_OFFSET_M } from '../constants/weapons.js'
import { isCapsuleBlocked2D } from '../sim/collision.js'
import { directionFromYawPitch, segmentVsAabb } from '../sim/projectile.js'
import type { StaticMap, Vec3 } from '../sim/types.js'

import type { AbilityDef } from './types.js'

type Boxes = StaticMap['boxes']

// --- The forward-aim volume -------------------------------------------------
//
// `forward` targeting is not a cone and not a ray: it is a LANE. The server
// accepts a victim whose lateral offset from the aim axis is within a radius
// that starts at half a capsule's width and opens by 10° over distance. That
// arithmetic used to be two literals buried in findForwardEnemy, which is
// precisely why no preview could match it.

/**
 * How an ability reaches its target — 00_truth.md §3.5.
 *
 *   CONE — melee-range swing. Keeps the forgiving 10°: at 2.5 m that is 0.89 m,
 *          about one body, which is what a swing should catch.
 *   RAY  — instant ranged. 3°, so 0.97 m at 10 m: one capsule, not a funnel.
 *   BOLT — a real projectile. No widening at all; the projectile IS the aim
 *          test, and any non-projectile rider on the same cast must not be
 *          more forgiving than a ray.
 */
export type DeliveryClass = 'cone' | 'ray' | 'bolt'

/** Half-angle a melee CONE opens by, in radians (10°). */
export const FORWARD_AIM_CONE_RAD = Math.PI / 18
/** Half-angle an instant RAY opens by, in radians (3°). */
export const FORWARD_AIM_RAY_RAD = Math.PI / 60
/** Longest range that still counts as a melee swing. */
export const CONE_MAX_RANGE_M = 2.5

/** Lane radius at the muzzle — a body's width, so point-blank is forgiving. */
export const FORWARD_AIM_BASE_RADIUS_M = PLAYER_CAPSULE_HEIGHT_M * 0.25

/**
 * Which delivery class an ability belongs to.
 *
 * DERIVED, not authored. Every input is already declared on the def, so there
 * is no 53-entry table to keep in sync with the registry and no way to add an
 * ability that quietly has no class. A projectile makes it a BOLT; melee reach
 * makes it a CONE; everything else is a RAY.
 */
export function deliveryClass(def: AbilityDef): DeliveryClass {
  if (def.effects.some((e) => e.kind === 'projectile')) return 'bolt'
  if (def.range <= CONE_MAX_RANGE_M) return 'cone'
  return 'ray'
}

/**
 * Radius of the forward-aim lane `along` metres down the aim axis.
 *
 * SINGLE SOURCE OF TRUTH. The server's hit test and the client's preview both
 * call this; if the lane is ever retuned, both move together or neither does.
 *
 * The old single 10° rule captured **3.09 m laterally at 15 m** on 32 of 53
 * abilities, nearest-first — a soft lock-on in a game whose vision document
 * says "you hit what you point at and you miss what you do not" (D9). It could
 * not shrink until the airborne work shipped, because the lane measures lateral
 * offset in 3D and a launched victim at a 2 m apex was captured for free by a
 * level crosshair.
 */
export function forwardAimRadiusAt(along: number, delivery: DeliveryClass = 'cone'): number {
  if (delivery === 'bolt') return FORWARD_AIM_BASE_RADIUS_M
  const halfAngle = delivery === 'ray' ? FORWARD_AIM_RAY_RAD : FORWARD_AIM_CONE_RAD
  return FORWARD_AIM_BASE_RADIUS_M + Math.max(0, along) * Math.tan(halfAngle)
}

// --- Shapes -----------------------------------------------------------------

/** A widening tube along the aim axis — how `forward` abilities reach. */
export interface AimLane {
  kind: 'lane'
  from: Vec3
  to: Vec3
  startRadius: number
  endRadius: number
  /** True when geometry cut the lane short of `range`. */
  blocked: boolean
}

/** A flat circle on the ground — how areas land. */
export interface AimDisc {
  kind: 'disc'
  center: Vec3
  radius: number
}

/** An oriented slab — how wall zones land. */
export interface AimWall {
  kind: 'wall'
  center: Vec3
  yaw: number
  width: number
  depth: number
}

/** Where the caster's own body ends up. */
export interface AimDash {
  kind: 'dash'
  from: Vec3
  to: Vec3
  /** True when geometry stopped the body short of the full distance. */
  blocked: boolean
}

export type AimShape = AimLane | AimDisc | AimWall | AimDash

export interface AimContext {
  /** Caster's feet, in world space. */
  feet: Vec3
  /** Eye/muzzle height above the feet. */
  eyeOffset?: number
  yaw: number
  pitch: number
  /** Ground plane the discs are drawn on. */
  groundY: number
  /** Static geometry. Omit to solve as if the arena were empty. */
  boxes?: Boxes
  /** Aim point for `point` targeting, already or not yet clamped to range. */
  point?: Vec3 | null
  /**
   * Horizontal velocity, for dashes that travel along movement instead of aim
   * (`useMovementDirection`). Omit and the solver assumes a standing caster,
   * which is what the server also falls back to.
   */
  velocity?: { x: number; z: number } | null
}

// --- Effect interrogation ---------------------------------------------------

/** Largest area radius any effect of this ability resolves with. */
export function abilityEffectRadius(def: AbilityDef): number {
  let radius = 0
  for (const e of def.effects) {
    if (e.kind === 'zone') radius = Math.max(radius, e.width && e.width > 0 ? 0 : e.radius)
    else if (e.kind === 'projectile') radius = Math.max(radius, e.splashRadius ?? 0)
    else if (e.kind === 'channel') radius = Math.max(radius, e.perTick.radius ?? 0)
    else if (e.kind === 'damage' || e.kind === 'knockup' || e.kind === 'applyStatus')
      radius = Math.max(radius, e.radius ?? 0)
    else if (e.kind === 'heal' || e.kind === 'resourceDrain')
      radius = Math.max(radius, e.radius ?? 0)
  }
  return radius
}

/** The wall slab an ability places, if it places one. */
export function abilityWallFootprint(def: AbilityDef): { width: number; depth: number } | null {
  for (const e of def.effects) {
    if (e.kind === 'zone' && e.width && e.width > 0) {
      return { width: e.width, depth: Math.max(0.55, e.radius || 0.8) }
    }
  }
  return null
}

/** The move effect an ability carries, if any. */
export function abilityMoveEffect(
  def: AbilityDef,
): { distance: number; useMovementDirection: boolean; cancelOnCollision: boolean } | null {
  for (const e of def.effects) {
    if (e.kind === 'move') {
      return {
        distance: e.distance,
        useMovementDirection: e.useMovementDirection === true,
        cancelOnCollision: e.cancelOnCollision !== false,
      }
    }
  }
  return null
}

// --- Queries ----------------------------------------------------------------

/**
 * How far a segment travels before the first static box stops it, as a fraction
 * of its length. 1 when nothing is in the way.
 */
export function segmentReach(boxes: Boxes | undefined, from: Vec3, to: Vec3): number {
  if (!boxes) return 1
  let nearest = 1
  for (const box of boxes) {
    const t = segmentVsAabb(from, to, box)
    if (t !== null && t < nearest) nearest = t
  }
  return nearest
}

/**
 * Where a dash actually ends. Mirrors GameRoom.resolveAbilityDisplacement step
 * for step — same 0.25 m sampling, same capsule test — so the ghost stands
 * exactly where the body will, not roughly where it might.
 */
export function dashLanding(
  boxes: Boxes | undefined,
  feet: Vec3,
  dx: number,
  dz: number,
  cancelOnCollision: boolean,
): { x: number; z: number; blocked: boolean } {
  const target = { x: feet.x + dx, z: feet.z + dz }
  if (!cancelOnCollision || !boxes) return { ...target, blocked: false }

  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.25))
  let lastX = feet.x
  let lastZ = feet.z
  let blocked = false
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const nx = feet.x + dx * t
    const nz = feet.z + dz * t
    if (isCapsuleBlocked2D(boxes, nx, feet.y, nz)) {
      blocked = true
      break
    }
    lastX = nx
    lastZ = nz
  }
  return { x: lastX, z: lastZ, blocked }
}

/** Clamp a world point to the ability's range around the caster, on the plane. */
export function clampToRange(feet: Vec3, point: Vec3, range: number): Vec3 {
  const dx = point.x - feet.x
  const dz = point.z - feet.z
  const dist = Math.hypot(dx, dz)
  if (dist <= range || dist < 1e-5) return { x: point.x, y: point.y, z: point.z }
  const k = range / dist
  return { x: feet.x + dx * k, y: point.y, z: feet.z + dz * k }
}

// --- The solver -------------------------------------------------------------

/**
 * Where the caster's body ends up, or null when it does not move.
 *
 * Deliberately independent of `targeting`. `hunters_flow` is targeting 'self'
 * and still dashes 3 m; keying the ghost off the targeting mode is exactly the
 * assumption that left the movement abilities with no preview of any kind.
 */
function dashShape(def: AbilityDef, ctx: AimContext): AimDash | null {
  const move = abilityMoveEffect(def)
  if (!move) return null
  // A dash travels along movement when the caster is moving — the same rule
  // the server applies — so the ghost has to read velocity, not just aim.
  let ux = -Math.sin(ctx.yaw)
  let uz = -Math.cos(ctx.yaw)
  const vel = ctx.velocity
  if (move.useMovementDirection && vel) {
    const speed = Math.hypot(vel.x, vel.z)
    if (speed > 0.1) {
      ux = vel.x / speed
      uz = vel.z / speed
    }
  }
  // A negative distance is a retreat (disengage_shot). Keeping the sign here
  // rather than taking an absolute value is the whole point: the preview has
  // to be able to say "you will end up BEHIND you".
  const landing = dashLanding(
    ctx.boxes,
    ctx.feet,
    ux * move.distance,
    uz * move.distance,
    move.cancelOnCollision,
  )
  return {
    kind: 'dash',
    from: { x: ctx.feet.x, y: ctx.groundY, z: ctx.feet.z },
    to: { x: landing.x, y: ctx.groundY, z: landing.z },
    blocked: landing.blocked,
  }
}

function selfShapes(def: AbilityDef, ctx: AimContext): AimShape[] {
  const dash = dashShape(def, ctx)
  const shapes: AimShape[] = dash ? [dash] : []
  // A self-centred effect follows the body, so it lands where the dash ends.
  const anchor = dash ? dash.to : ctx.feet
  const center = { x: anchor.x, y: ctx.groundY, z: anchor.z }
  const wall = abilityWallFootprint(def)
  if (wall) {
    shapes.push({ kind: 'wall', center, yaw: ctx.yaw, ...wall })
    return shapes
  }
  const radius = abilityEffectRadius(def)
  // A self ability with no radius still occupies the caster: show the body's
  // own footprint rather than nothing, because "it affects me" is information.
  shapes.push({
    kind: 'disc',
    center,
    radius: radius > 0 ? radius : FORWARD_AIM_BASE_RADIUS_M * 2,
  })
  return shapes
}

function pointShapes(def: AbilityDef, ctx: AimContext): AimShape[] {
  const raw = ctx.point ?? {
    x: ctx.feet.x - Math.sin(ctx.yaw) * def.range,
    y: ctx.groundY,
    z: ctx.feet.z - Math.cos(ctx.yaw) * def.range,
  }
  const p = clampToRange(ctx.feet, raw, def.range)
  const center = { x: p.x, y: ctx.groundY, z: p.z }
  const wall = abilityWallFootprint(def)
  if (wall) return [{ kind: 'wall', center, yaw: ctx.yaw, ...wall }]
  const radius = abilityEffectRadius(def)
  return [{ kind: 'disc', center, radius: radius > 0 ? radius : 0.85 }]
}

function forwardShapes(def: AbilityDef, ctx: AimContext): AimShape[] {
  const eyeY = ctx.feet.y + (ctx.eyeOffset ?? PROJECTILE_MUZZLE_Y_OFFSET_M)
  const origin = { x: ctx.feet.x, y: eyeY, z: ctx.feet.z }
  const dir = directionFromYawPitch(ctx.yaw, ctx.pitch)
  const shapes: AimShape[] = []

  const dash = dashShape(def, ctx)
  if (dash) shapes.push(dash)

  // Every forward ability also reaches: a projectile flies, a cone swings, a
  // dash-plus-strike still hits along the lane. `disengage_shot` is the case
  // that proves the two shapes must coexist — it retreats AND fires forward,
  // and previewing only one of those is previewing the wrong ability.
  const range = Math.max(0.5, def.range)
  const far = {
    x: origin.x + dir.x * range,
    y: origin.y + dir.y * range,
    z: origin.z + dir.z * range,
  }
  const reach = segmentReach(ctx.boxes, origin, far)
  const end = {
    x: origin.x + dir.x * range * reach,
    y: origin.y + dir.y * range * reach,
    z: origin.z + dir.z * range * reach,
  }
  const laneLen = range * reach
  const delivery = deliveryClass(def)
  shapes.push({
    kind: 'lane',
    from: origin,
    to: end,
    startRadius: forwardAimRadiusAt(0, delivery),
    endRadius: forwardAimRadiusAt(laneLen, delivery),
    blocked: reach < 0.999,
  })

  const radius = abilityEffectRadius(def)
  if (radius > 0) {
    // The blast centres on whoever the lane finds first; with nobody in it the
    // server resolves at the aimed end. Drawing it at the end is therefore the
    // honest worst case — a victim inside the lane is inside this circle too.
    // A forward AoE that also moves detonates around the caster's POST-move
    // position, per AbilityEngine.resolveAreaCenter. Draw it there.
    const center = dash ? dash.to : { x: end.x, y: ctx.groundY, z: end.z }
    shapes.push({ kind: 'disc', center: { x: center.x, y: ctx.groundY, z: center.z }, radius })
  }
  return shapes
}

/**
 * The geometry an ability will occupy if cast right now.
 *
 * Deterministic and side-effect free: same inputs, same shapes, on both sides
 * of the wire.
 */
export function resolveAimPlan(def: AbilityDef, ctx: AimContext): AimShape[] {
  if (def.targeting === 'self') return selfShapes(def, ctx)
  if (def.targeting === 'point') return pointShapes(def, ctx)
  if (def.targeting === 'forward') return forwardShapes(def, ctx)
  // `target` picks the nearest visible enemy inside range. Nothing in the live
  // roster uses it; drawing the range it searches is still truthful.
  return [
    {
      kind: 'disc',
      center: { x: ctx.feet.x, y: ctx.groundY, z: ctx.feet.z },
      radius: Math.max(0.85, def.range),
    },
  ]
}
