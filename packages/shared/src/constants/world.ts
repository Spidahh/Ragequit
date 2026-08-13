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

// SINGLE SOURCE OF TRUTH for how tall a RENDERED character is, in meters.
// The visual model is scaled to exactly this height; the camera eye-height,
// nameplate/cast-ring anchors and muzzle offsets must all derive from it so the
// model, the collision capsule and the camera stay co-registered. Kept a hair
// above the 1.8 m capsule for a slightly heroic stature WITHOUT desyncing the
// camera. NEVER scale the model in isolation again (a lone 1.45× multiplier on
// the model — with the camera still trusting 1.8 m — is what made enemies read as
// giants and the player as a dwarf).
export const CHARACTER_RENDER_HEIGHT_M = 1.9 as const

/**
 * Camera eye height, as an offset from the capsule CENTRE (not the feet).
 *
 * The game is first person for every weapon, so this is where the player's view
 * lives, full stop — there is no second camera and no per-weapon variant.
 *
 * It is deliberately equal to PROJECTILE_MUZZLE_Y_OFFSET_M: the server spawns
 * projectiles at that height along the client's aim, so any difference between
 * the two is a permanent lie between where you look and where your shot comes
 * from. If one moves, the other moves with it.
 */
export const EYE_Y_OFFSET_M = 0.65 as const

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
