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

// duel_arena — "Court of Pillars", 1v1. Designed around classic duel-map flow
// (Quake/Mordhau yards): two FAT orbit pillars to strafe-fight around, a low
// vaultable centre slab that breaks the spawn-to-spawn sightline without
// killing movement, interrupted side lanes for bow/magic play, and an L-wall
// at each spawn so nobody gets opening-volley'd. Z-mirror symmetric (fair).
const DUEL_BOXES: readonly AABB[] = [
  // Centre slab — low (1.0 m): jump-overable, blocks the naked centre lane.
  box(0, 0.5, 0, 5, 1, 2.4),
  // Orbit anchors — two fat pillars east/west of centre. The melee dance floor:
  // wide enough to break LOS, close enough to orbit around.
  box(5, 2, 0, 1.8, 4, 1.8),
  box(-5, 2, 0, 1.8, 4, 1.8),
  // Lane breakers — slim pillars interrupting the long z=±5 bow lanes (a caster
  // gets sightlines but never a full-length shooting gallery).
  box(2.5, 1.8, 5, 1, 3.6, 1),
  box(-2.5, 1.8, 5, 1, 3.6, 1),
  box(2.5, 1.8, -5, 1, 3.6, 1),
  box(-2.5, 1.8, -5, 1, 3.6, 1),
  // Spawn protection — L-walls: a broad wall + a side stub at each spawn so
  // the opening trade can't happen before first movement.
  box(0, 0.7, 9, 4.2, 1.4, 0.6),
  box(2.4, 0.7, 9.8, 0.6, 1.4, 2),
  box(0, 0.7, -9, 4.2, 1.4, 0.6),
  box(-2.4, 0.7, -9.8, 0.6, 1.4, 2),
  // Power flanks — raised platforms on the east/west edges with a step box:
  // height advantage over the lanes, but exposed from both lanes (risk/reward).
  box(9, 1.3, 0, 2.6, 2.6, 3.2),
  box(7.2, 0.55, 2.2, 1.2, 1.1, 1.2), // step up (jump from step → platform)
  box(-9, 1.3, 0, 2.6, 2.6, 3.2),
  box(-7.2, 0.55, -2.2, 1.2, 1.1, 1.2),
  // Pocket crates — small mid-field covers for staggered approaches.
  box(3.4, 0.55, 2.2, 1.1, 1.1, 1.1),
  box(-3.4, 0.55, -2.2, 1.1, 1.1, 1.1),
]
const P_ABOVE_BOX = GROUND_Y + CAPSULE_HALF_HEIGHT_M + 0.01 // ground spawn
const DUEL_SPAWNS: readonly Vec3[] = [
  { x: 0, y: P_ABOVE_BOX, z: 11 },
  { x: 0, y: P_ABOVE_BOX, z: -11 },
]
export const DUEL_ARENA: StaticMap = {
  boxes: DUEL_BOXES as AABB[],
  groundY: GROUND_Y,
  spawns: DUEL_SPAWNS as Vec3[],
}

// gladiators_arena — "Ruined Bastion", FFA. A central keep as THE contested
// power position (two opposite step approaches — taking high ground is a
// commitment), a ring of UNEVEN broken pillars/walls placed off-grid so no
// two fights play the same, pocket covers between zones, varied-height corner
// platforms (diagonal pairs), and perimeter half-walls. 180°-rotation
// symmetric: fair without feeling like a grid.
const G_BOXES: readonly AABB[] = [
  // — Central keep: tower + two step approaches (N and S) + flanking stubs.
  box(0, 2, 0, 3.2, 4, 3.2),
  box(0, 0.6, 3, 2, 1.2, 1.6), // south step (jump: step → keep roof)
  box(0, 1.25, 2.2, 2, 2.5, 0.6), // mid step
  box(0, 0.6, -3, 2, 1.2, 1.6), // north step
  box(0, 1.25, -2.2, 2, 2.5, 0.6),
  // — Broken ruin pillars: irregular sizes & off-grid placement (180° pairs).
  box(6, 2.1, 2.5, 1.4, 4.2, 1.4),
  box(-6, 2.1, -2.5, 1.4, 4.2, 1.4),
  box(3.5, 1.6, -6.5, 1.1, 3.2, 1.1),
  box(-3.5, 1.6, 6.5, 1.1, 3.2, 1.1),
  box(8.5, 1.3, -4, 1.0, 2.6, 1.0),
  box(-8.5, 1.3, 4, 1.0, 2.6, 1.0),
  // — Staggered mid-ring walls: different lengths, off-cardinal (no naked lanes).
  box(-3, 0.9, 9.5, 5, 1.8, 0.8),
  box(3, 0.9, -9.5, 5, 1.8, 0.8),
  box(10, 0.9, 6, 0.8, 1.8, 4.5),
  box(-10, 0.9, -6, 0.8, 1.8, 4.5),
  box(11, 0.7, -1.5, 0.7, 1.4, 3),
  box(-11, 0.7, 1.5, 0.7, 1.4, 3),
  // — Pocket crates between zones (stagger approaches, vault spots).
  box(4.5, 0.55, 4.5, 1.2, 1.1, 1.2),
  box(-4.5, 0.55, -4.5, 1.2, 1.1, 1.2),
  box(7.5, 0.55, 9, 1.1, 1.1, 1.1),
  box(-7.5, 0.55, -9, 1.1, 1.1, 1.1),
  // — Corner platforms: varied heights in diagonal pairs (2.6 m vs 3.4 m), each
  //   with a step box. High pair sees further but is harder to take.
  box(12, 1.3, 12, 4, 2.6, 4),
  box(-12, 1.3, -12, 4, 2.6, 4),
  box(12, 1.7, -12, 4, 3.4, 4),
  box(-12, 1.7, 12, 4, 3.4, 4),
  box(9.5, 0.6, 12, 1, 1.2, 3),
  box(-9.5, 0.6, -12, 1, 1.2, 3),
  box(12, 0.85, -9.3, 3, 1.7, 1), // taller platforms get a taller step
  box(-12, 0.85, 9.3, 3, 1.7, 1),
  // — Perimeter half-walls: keep fights inside, break sniper lines.
  box(17, 1, 0, 0.6, 2, 10),
  box(-17, 1, 0, 0.6, 2, 10),
  box(0, 1, 17, 10, 2, 0.6),
  box(0, 1, -17, 10, 2, 0.6),
]
const G_LOW_TOP_Y = 2.6 + CAPSULE_HALF_HEIGHT_M + 0.01 // low corner platforms
const G_SPAWN_Y = GROUND_Y + CAPSULE_HALF_HEIGHT_M + 0.01
const G_SPAWNS: readonly Vec3[] = [
  { x: 16, y: G_SPAWN_Y, z: 0 },
  { x: -16, y: G_SPAWN_Y, z: 0 },
  { x: 0, y: G_SPAWN_Y, z: 16 },
  { x: 0, y: G_SPAWN_Y, z: -16 },
  { x: 12, y: G_LOW_TOP_Y, z: 12 },
  { x: -12, y: G_LOW_TOP_Y, z: -12 },
  { x: 14, y: G_SPAWN_Y, z: -14 },
  { x: -14, y: G_SPAWN_Y, z: 14 },
  { x: 8, y: G_SPAWN_Y, z: -8 },
  { x: -8, y: G_SPAWN_Y, z: 8 },
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
