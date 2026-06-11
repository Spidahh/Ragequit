// Arena blockout map. Ground plane plus five boxes positioned for movement
// testing: four cardinal cubes at 8 m distance + one taller central cube to
// create vertical cover that cannot be cleared by a single base jump.

import { CAPSULE_HALF_HEIGHT_M, GROUND_Y } from '../constants/world.js'

import type { AABB, StaticMap, Vec3 } from './types.js'

function box(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number): AABB {
  const hx = sx / 2
  const hy = sy / 2
  const hz = sz / 2
  return {
    minX: cx - hx,
    minY: cy - hy,
    minZ: cz - hz,
    maxX: cx + hx,
    maxY: cy + hy,
    maxZ: cz + hz,
  }
}

const BOXES: readonly AABB[] = [
  box(8, 1, 0, 2, 2, 2),
  box(-8, 1, 0, 2, 2, 2),
  box(0, 1, 8, 2, 2, 2),
  box(0, 1, -8, 2, 2, 2),
  // Taller central obstacle: blocks movement and line of sight.
  box(0, 1.5, 0, 3, 3, 3),
]

const SPAWN_Y = GROUND_Y + CAPSULE_HALF_HEIGHT_M + 0.01

const SPAWNS: readonly Vec3[] = [
  { x: 4, y: SPAWN_Y, z: 4 },
  { x: -4, y: SPAWN_Y, z: -4 },
  { x: 4, y: SPAWN_Y, z: -4 },
  { x: -4, y: SPAWN_Y, z: 4 },
]

export const STATIC_MAP: StaticMap = {
  boxes: BOXES as AABB[],
  groundY: GROUND_Y,
  spawns: SPAWNS as Vec3[],
}

// --- Map variants ----------------------------------------------------------
// Two named maps shared between client + server. The default `STATIC_MAP`
// stays the stable blockout for compatibility with existing tests; new maps
// are addressable by id so server config can pick one based on the
// match mode (1v1 → duel_arena, 5v5/FFA → gladiators_arena).

// duel_arena — symmetric 1v1 map with pillars, raised platforms, and cover.
// Mirror-symmetrical on the Z axis so neither player has a positional advantage.
const DUEL_BOXES: readonly AABB[] = [
  // Central raised platform — requires jump to top (height 2.2 m).
  box(0, 1.1, 0, 4, 2.2, 4),
  // Tall north/south pillars flanking centre — line-of-sight breakers.
  box(3, 2, 3, 1.2, 4, 1.2),
  box(-3, 2, 3, 1.2, 4, 1.2),
  box(3, 2, -3, 1.2, 4, 1.2),
  box(-3, 2, -3, 1.2, 4, 1.2),
  // Low cover walls near each spawn — give initial protection.
  box(0, 0.6, 7, 3, 1.2, 0.5),
  box(0, 0.6, -7, 3, 1.2, 0.5),
  // Side ramps leading up to low platforms (walkable slopes via step boxes).
  box(7, 0.5, 0, 0.8, 1, 3),
  box(-7, 0.5, 0, 0.8, 1, 3),
  // Low side platforms — accessible by jumping, give height advantage.
  box(8, 1.5, 3, 2.5, 3, 2),
  box(-8, 1.5, 3, 2.5, 3, 2),
  box(8, 1.5, -3, 2.5, 3, 2),
  box(-8, 1.5, -3, 2.5, 3, 2),
]
const P_ABOVE_BOX = GROUND_Y + CAPSULE_HALF_HEIGHT_M + 0.01 // ground spawn
const PLATFORM_TOP_Y = 2.2 + CAPSULE_HALF_HEIGHT_M + 0.01 // top of central box
const DUEL_SPAWNS: readonly Vec3[] = [
  { x: 0, y: P_ABOVE_BOX, z: 10 },
  { x: 0, y: P_ABOVE_BOX, z: -10 },
  { x: 0, y: PLATFORM_TOP_Y, z: 0 }, // optional 3rd spawn on top
]
export const DUEL_ARENA: StaticMap = {
  boxes: DUEL_BOXES as AABB[],
  groundY: GROUND_Y,
  spawns: DUEL_SPAWNS as Vec3[],
}

// gladiators_arena — large multi-player map: concentric cover ring, four
// raised corner platforms, and perimeter walls.
const G_BOXES: readonly AABB[] = [
  // Inner ring of low cover (jumpable).
  box(5, 0.8, 5, 2.5, 1.6, 2.5),
  box(-5, 0.8, 5, 2.5, 1.6, 2.5),
  box(5, 0.8, -5, 2.5, 1.6, 2.5),
  box(-5, 0.8, -5, 2.5, 1.6, 2.5),
  // Cardinal long cover walls at mid-ring.
  box(0, 0.8, 10, 4, 1.6, 0.8),
  box(0, 0.8, -10, 4, 1.6, 0.8),
  box(10, 0.8, 0, 0.8, 1.6, 4),
  box(-10, 0.8, 0, 0.8, 1.6, 4),
  // Corner raised platforms: high cover for spawn variety and traversal tests.
  box(12, 1.5, 12, 4, 3, 4),
  box(-12, 1.5, 12, 4, 3, 4),
  box(12, 1.5, -12, 4, 3, 4),
  box(-12, 1.5, -12, 4, 3, 4),
  // Central elevated feature — tall tower, visible from everywhere.
  box(0, 2, 0, 3, 4, 3),
  // Step boxes to allow partial ramp access to corner platforms.
  box(10, 0.6, 10, 1, 1.2, 3),
  box(-10, 0.6, 10, 1, 1.2, 3),
  box(10, 0.6, -10, 1, 1.2, 3),
  box(-10, 0.6, -10, 1, 1.2, 3),
  // Outer perimeter half-walls — keep fights inside, break sniper lines.
  box(17, 1, 0, 0.6, 2, 10),
  box(-17, 1, 0, 0.6, 2, 10),
  box(0, 1, 17, 10, 2, 0.6),
  box(0, 1, -17, 10, 2, 0.6),
]
const G_TOP_Y = 3 + CAPSULE_HALF_HEIGHT_M + 0.01 // top of corner platforms
const G_SPAWN_Y = GROUND_Y + CAPSULE_HALF_HEIGHT_M + 0.01
const G_SPAWNS: readonly Vec3[] = [
  { x: 16, y: G_SPAWN_Y, z: 0 },
  { x: -16, y: G_SPAWN_Y, z: 0 },
  { x: 0, y: G_SPAWN_Y, z: 16 },
  { x: 0, y: G_SPAWN_Y, z: -16 },
  { x: 12, y: G_TOP_Y, z: 12 },
  { x: -12, y: G_TOP_Y, z: 12 },
  { x: 12, y: G_TOP_Y, z: -12 },
  { x: -12, y: G_TOP_Y, z: -12 },
  { x: 8, y: G_SPAWN_Y, z: 0 },
  { x: -8, y: G_SPAWN_Y, z: 0 },
]
export const GLADIATORS_ARENA: StaticMap = {
  boxes: G_BOXES as AABB[],
  groundY: GROUND_Y,
  spawns: G_SPAWNS as Vec3[],
}

// test_room — empty, bare arena for the Test Room: NO cover boxes, flat ground,
// one player spawn at +z. GameRoom lines the 4 class dummies up in a row in front.
const TEST_SPAWN_Y = GROUND_Y + CAPSULE_HALF_HEIGHT_M + 0.01
export const TEST_ROOM_MAP: StaticMap = {
  boxes: [] as AABB[],
  groundY: GROUND_Y,
  spawns: [{ x: 0, y: TEST_SPAWN_Y, z: 8 }] as Vec3[],
}

// Map registry. Server picks via room option or match mode.
export const MAPS = {
  blockout: STATIC_MAP,
  duel_arena: DUEL_ARENA,
  gladiators_arena: GLADIATORS_ARENA,
  test_room: TEST_ROOM_MAP,
} as const

export type MapId = keyof typeof MAPS

export function getMap(id: string): StaticMap {
  return (MAPS as Record<string, StaticMap>)[id] ?? STATIC_MAP
}
