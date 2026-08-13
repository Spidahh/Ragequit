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

// ── Horizontal movement ─────────────────────────────────────────────────────
// Quake's PM_Friction / PM_Accelerate model. Velocity is ACCUMULATED, not
// assigned: that is the whole point. Before this, vel was set straight from
// input every tick — 0 to 9 m/s in one 16 ms frame, zero stopping distance,
// instant reversal — which is why the character had no weight at all.
//
// Real acceleration is COEF x wishSpeed, so haste/slow rescale the ramp for
// free. GROUND_ACCEL_COEF MUST stay above GROUND_FRICTION: friction runs in the
// same tick, so the ramp's exponential rate is FRICTION and the reachable top
// speed is ACCEL*V/FRICTION. Time to full speed = -ln(1 - FRICTION/ACCEL)/FRICTION.
// At 12/8 that is 137 ms. Setting them equal is the degenerate case: the fixed
// point lands exactly on V and is only approached asymptotically — 2.7 SECONDS
// to top speed. Verified by simulating the exact step, not by reading the maths.
export const GROUND_ACCEL_COEF = 12.0 as const
export const GROUND_FRICTION = 8.0 as const
// Below this speed friction becomes a constant deceleration, so you actually
// reach zero instead of asymptoting toward it. 1/3 of top speed, as in Q3 and CS.
export const STOP_SPEED_MPS = 3.0 as const
// Air is a different rule, not a scaled one — 1/12 of ground steering. Applied
// to the projection of velocity on the wish direction (never to its magnitude),
// which is what lets a well-timed strafe gain speed instead of capping it.
export const AIR_ACCEL_COEF = 1.0 as const
// Hard ceiling on airborne horizontal speed so chained hops cannot run away.
export const AIR_SPEED_CAP_MPS = 11.7 as const

// Ground plane Y (world floor).
export const GROUND_Y = 0 as const

// Tolerance below which a body is considered grounded (meters).
export const GROUND_EPSILON_M = 0.02 as const

// Max vertical speed, clamp to avoid runaway under huge dt.
export const MAX_FALL_SPEED_MPS = 60 as const

// Coyote time: ticks after walking off a ledge during which the player can
// still initiate a jump. At 60 Hz, 5 ticks ≈ 83 ms — standard for 3D platformers.
export const COYOTE_TICKS = 5 as const

// Jump buffer: a jump pressed this many ticks BEFORE touchdown still fires on
// landing. The exact mirror of coyote time, which has always existed for the
// leaving-the-ground case — without it, the better your timing the more often
// the input is silently dropped, which is the worst possible lesson to teach.
export const JUMP_BUFFER_TICKS = 5 as const

// Spawn points (see sim/map.ts).
export const SPAWN_Y = CAPSULE_HALF_HEIGHT_M + 0.01 // resting height of capsule

// Weapon swap animation window (seconds). During this period ability casts
// that require the just-equipped weapon are blocked to give a cinematic feel.
// Low enough (0.12 s) that skilled players barely notice; enough for the
// transition VFX to play client-side before the first bolt/swing can fire.
export const WEAPON_SWAP_LOCK_SEC = 0.12 as const
