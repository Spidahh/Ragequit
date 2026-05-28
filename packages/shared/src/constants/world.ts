// World / physics constants.
// Authority: 01_DESIGN/11_map_philosophy.md (pending) + 02_TECH/01_entity_component_model.md.
// These are sim numbers, not gameplay — tune before touching stats.ts.

// Gravity (m/s^2), pointing down Y.
export const GRAVITY_MPS2 = 25 as const

// Capsule character — represented by deterministic custom controller/collision
// helpers in shared/server code. All dimensions in meters.
export const CAPSULE_HEIGHT_M = 1.8 as const
export const CAPSULE_RADIUS_M = 0.4 as const
// Half-extents for broad-phase/collision approximation.
export const CAPSULE_HALF_WIDTH_M = CAPSULE_RADIUS_M
export const CAPSULE_HALF_HEIGHT_M = CAPSULE_HEIGHT_M / 2

// Ground plane Y (world floor).
export const GROUND_Y = 0 as const

// Tolerance below which a body is considered grounded (meters).
export const GROUND_EPSILON_M = 0.02 as const

// Max vertical speed, clamp to avoid runaway under huge dt.
export const MAX_FALL_SPEED_MPS = 60 as const

// Coyote time: ticks after walking off a ledge during which the player can
// still initiate a jump. At 60 Hz, 5 ticks ≈ 83 ms — standard for 3D platformers.
export const COYOTE_TICKS = 5 as const

// Spawn points (see sim/map.ts).
export const SPAWN_Y = CAPSULE_HALF_HEIGHT_M + 0.01 // resting height of capsule

// Weapon swap animation window (seconds). During this period ability casts
// that require the just-equipped weapon are blocked to give a cinematic feel.
// Low enough (0.12 s) that skilled players barely notice; enough for the
// transition VFX to play client-side before the first bolt/swing can fire.
export const WEAPON_SWAP_LOCK_SEC = 0.12 as const
