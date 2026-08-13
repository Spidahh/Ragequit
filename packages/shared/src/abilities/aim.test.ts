import { describe, expect, it } from 'vitest'

import { PLAYER_CAPSULE_HEIGHT_M } from '../constants/weapons.js'
import { getMap } from '../sim/map.js'

import {
  FORWARD_AIM_BASE_RADIUS_M,
  abilityEffectRadius,
  abilityMoveEffect,
  abilityWallFootprint,
  clampToRange,
  dashLanding,
  forwardAimRadiusAt,
  resolveAimPlan,
  segmentReach,
  type AimDash,
  type AimDisc,
  type AimLane,
} from './aim.js'
import { ABILITY_DEFS } from './registry.js'

const OPEN = { feet: { x: 0, y: 0.9, z: 0 }, yaw: 0, pitch: 0, groundY: 0 }

describe('the forward lane', () => {
  // This is the number the server's findForwardEnemy tests against. It was two
  // inline literals; if it ever silently changes shape the preview lies.
  it('starts a body wide and opens ten degrees', () => {
    expect(forwardAimRadiusAt(0)).toBeCloseTo(PLAYER_CAPSULE_HEIGHT_M * 0.25, 6)
    expect(forwardAimRadiusAt(10)).toBeCloseTo(
      FORWARD_AIM_BASE_RADIUS_M + 10 * Math.tan(Math.PI / 18),
      6,
    )
  })

  it('never reports a negative radius behind the caster', () => {
    expect(forwardAimRadiusAt(-5)).toBe(FORWARD_AIM_BASE_RADIUS_M)
  })
})

describe('resolveAimPlan', () => {
  // The whole point of D12: no ability may preview as nothing.
  it('produces at least one shape for every ability in the roster', () => {
    for (const def of Object.values(ABILITY_DEFS)) {
      const shapes = resolveAimPlan(def, OPEN)
      expect(shapes.length, def.id).toBeGreaterThan(0)
      for (const s of shapes) {
        if (s.kind === 'disc') expect(s.radius, def.id).toBeGreaterThan(0)
        if (s.kind === 'lane') expect(s.endRadius, def.id).toBeGreaterThan(0)
        if (s.kind === 'wall') expect(s.width, def.id).toBeGreaterThan(0)
      }
    }
  })

  it('draws a self ability on the caster, not down the aim', () => {
    const shapes = resolveAimPlan(ABILITY_DEFS['whirlwind']!, OPEN)
    const disc = shapes.find((s) => s.kind === 'disc') as AimDisc
    expect(disc.center.x).toBeCloseTo(0, 6)
    expect(disc.center.z).toBeCloseTo(0, 6)
  })

  // whirlwind's radius lives on channel.perTick, which the old footprint code
  // could not see at all — it computed 0 and drew a default-sized ring.
  it('reads a channel radius through perTick', () => {
    expect(abilityEffectRadius(ABILITY_DEFS['whirlwind']!)).toBeGreaterThan(1)
  })

  it('points the lane where the caster looks', () => {
    const east = resolveAimPlan(ABILITY_DEFS['fireball']!, { ...OPEN, yaw: Math.PI / 2 })
    const lane = east.find((s) => s.kind === 'lane') as AimLane
    expect(lane.to.x).toBeLessThan(-1)
    expect(Math.abs(lane.to.z)).toBeLessThan(0.001)
  })

  it('gives a splash ability both a lane and the blast at its end', () => {
    const shapes = resolveAimPlan(ABILITY_DEFS['fireball']!, OPEN)
    const lane = shapes.find((s) => s.kind === 'lane') as AimLane
    const disc = shapes.find((s) => s.kind === 'disc') as AimDisc
    expect(lane).toBeDefined()
    expect(disc).toBeDefined()
    expect(Math.hypot(disc.center.x - lane.to.x, disc.center.z - lane.to.z)).toBeLessThan(0.001)
  })

  // disengage_shot retreats AND fires. Previewing one of those is previewing a
  // different ability than the one that will happen.
  it('shows a retreating dash going backwards while its shot goes forwards', () => {
    const shapes = resolveAimPlan(ABILITY_DEFS['disengage_shot']!, OPEN)
    const dash = shapes.find((s) => s.kind === 'dash') as AimDash
    const lane = shapes.find((s) => s.kind === 'lane') as AimLane
    expect(dash).toBeDefined()
    expect(lane).toBeDefined()
    // Facing -z; the dash must end on the opposite side of the caster.
    expect(dash.to.z).toBeGreaterThan(0)
    expect(lane.to.z).toBeLessThan(0)
  })

  it('gives every move ability a dash shape', () => {
    const movers = Object.values(ABILITY_DEFS).filter((d) => abilityMoveEffect(d))
    expect(movers.length).toBeGreaterThanOrEqual(8)
    for (const def of movers) {
      expect(
        resolveAimPlan(def, OPEN).some((s) => s.kind === 'dash'),
        def.id,
      ).toBe(true)
    }
  })

  it('follows movement direction when a dash asks for it', () => {
    const def = Object.values(ABILITY_DEFS).find((d) => abilityMoveEffect(d)?.useMovementDirection)!
    const aimed = resolveAimPlan(def, OPEN).find((s) => s.kind === 'dash') as AimDash
    const moving = resolveAimPlan(def, { ...OPEN, velocity: { x: 8, z: 0 } }).find(
      (s) => s.kind === 'dash',
    ) as AimDash
    expect(aimed.to.x).toBeCloseTo(0, 6)
    expect(moving.to.x).toBeGreaterThan(1)
  })

  it('clamps a point ability to its range', () => {
    const def = ABILITY_DEFS['meteor']!
    const shapes = resolveAimPlan(def, { ...OPEN, point: { x: 0, y: 0, z: -999 } })
    const disc = shapes.find((s) => s.kind === 'disc') as AimDisc
    expect(Math.hypot(disc.center.x, disc.center.z)).toBeCloseTo(def.range, 5)
  })

  it('lays a wall ability out as a slab, not a circle', () => {
    const def = Object.values(ABILITY_DEFS).find((d) => abilityWallFootprint(d))!
    expect(resolveAimPlan(def, OPEN).some((s) => s.kind === 'wall')).toBe(true)
  })
})

describe('static geometry', () => {
  const boxes = getMap('duel').boxes

  it('cuts the lane short at a wall instead of drawing through it', () => {
    let cut: AimLane | null = null
    for (let yaw = 0; yaw < Math.PI * 2; yaw += Math.PI / 16) {
      const shapes = resolveAimPlan(ABILITY_DEFS['fireball']!, { ...OPEN, yaw, boxes })
      const lane = shapes.find((s) => s.kind === 'lane') as AimLane
      if (lane.blocked) {
        cut = lane
        break
      }
    }
    expect(cut, 'no direction on duel is blocked — check the map fixture').not.toBeNull()
    const len = Math.hypot(cut!.to.x - cut!.from.x, cut!.to.z - cut!.from.z)
    expect(len).toBeLessThan(ABILITY_DEFS['fireball']!.range)
  })

  it('reports full reach through empty air', () => {
    expect(segmentReach(boxes, { x: 0, y: 20, z: 0 }, { x: 0, y: 20, z: -10 })).toBe(1)
  })

  it('stops the dash ghost where the body would stop', () => {
    // Straight into a wall: the landing must be short of the requested 8 m and
    // must itself be a legal standing spot.
    let blockedCase: { x: number; z: number; blocked: boolean } | null = null
    for (let yaw = 0; yaw < Math.PI * 2; yaw += Math.PI / 16) {
      const r = dashLanding(boxes, OPEN.feet, -Math.sin(yaw) * 8, -Math.cos(yaw) * 8, true)
      if (r.blocked) {
        blockedCase = r
        break
      }
    }
    expect(blockedCase).not.toBeNull()
    expect(Math.hypot(blockedCase!.x, blockedCase!.z)).toBeLessThan(8)
  })

  it('lets a non-cancelling dash pass through', () => {
    const r = dashLanding(boxes, OPEN.feet, 0, -8, false)
    expect(r.blocked).toBe(false)
    expect(r.z).toBeCloseTo(-8, 6)
  })
})

describe('clampToRange', () => {
  it('leaves a point inside range alone', () => {
    const p = clampToRange({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 5)
    expect(p.x).toBe(1)
  })

  it('does not divide by zero on a coincident point', () => {
    const p = clampToRange({ x: 3, y: 0, z: 3 }, { x: 3, y: 0, z: 3 }, 5)
    expect(Number.isFinite(p.x)).toBe(true)
  })
})
