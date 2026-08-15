// World / physics constants.
// Authority: VERITA.md.
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
/**
 * Hard ceiling on airborne horizontal speed.
 *
 * 11.7 -> 14.5 on 2026-08-13 (D18, 00_truth.md). 11.7 was 1.30x the 9 m/s base:
 * the ENTIRE movement skill ceiling was +30 %, in a game whose second pillar is
 * "movement is the skill ceiling", against a reference (Quake 3) that has no
 * cap at all and where defrag runs reach 5x. 14.5 is 1.61x — still a hard cap,
 * because an arena this size with 200 ms of lag compensation cannot afford an
 * unbounded one, but now worth learning to reach.
 *
 * MEASURED, not chosen: simulating the real controller through chained strafe
 * jumps hits the cap exactly on the fifth hop at plausible turn rates, so this
 * is a ceiling a player meets rather than a number that never binds. It is a
 * HARD cap on purpose. The widely-circulated alternative — a soft cap at 18
 * bleeding 2 m/s per second — was simulated and does NOT converge: 20.59 m/s at
 * 5 hops, 31.03 at 20 and still climbing. The bleed needed to hold it is
 * ~4.5 m/s^2, at which point it is a hard cap wearing a costume.
 *
 * Coupled to two other numbers, so none of the three moves alone:
 * ARENA_BOUNDS_RADIUS_M (D20 — a cap is meaningless in an infinite plane) and
 * LAG_COMP_MAX_COMPENSATE_MS (200 ms is 2.9 m of rewind at this speed, ~6 % of
 * the 49 m arena; it was 22 % at the speeds D18 originally contemplated).
 */
export const AIR_SPEED_CAP_MPS = 14.5 as const

/**
 * Horizontal radius of the playable arena, in metres.
 *
 * DERIVED FROM THE ART, not chosen freely. The coliseum shell renders at
 * ARENA_SHELL_SCALE = 1.5 with its inner barrier wall at r ≈ 16.7 and its sand
 * floor at r = 16.5, so the wall stands at 25.05 m and the sand ends at 24.75.
 * 24.5 leaves the body (CAPSULE_HALF_WIDTH_M = 0.4) reaching 24.9 — hard against
 * the wall it can see, never off the edge of the sand.
 *
 * If the shell scale ever changes, this changes with it. A boundary the player
 * cannot see is a boundary that feels like a bug.
 */
export const ARENA_BOUNDS_RADIUS_M = 24.5 as const

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

// Knockback window. For this many ticks after an external impulse, ground
// friction and the air-speed cap are both suspended, so the impulse survives
// long enough to become motion instead of being bled away on the tick it lands.
// Quake only needs PMF_TIME_KNOCKBACK to kill friction because Quake has no air
// cap; ours rescales every airborne tick, so it has to be suppressed too.
// Non-refreshing: a second hit inside the window does not extend it, which is
// what stops a chain of impulses from turning into an unrecoverable slide.
// 6 ticks = 100 ms at 60 Hz. See 00_truth.md 7.2.
export const KNOCKBACK_WINDOW_TICKS = 6 as const

// Spawn points (see sim/map.ts).
export const SPAWN_Y = CAPSULE_HALF_HEIGHT_M + 0.01 // resting height of capsule

// Weapon swap animation window (seconds). During this period ability casts
// that require the just-equipped weapon are blocked to give a cinematic feel.
// Low enough (0.12 s) that skilled players barely notice; enough for the
// transition VFX to play client-side before the first bolt/swing can fire.
export const WEAPON_SWAP_LOCK_SEC = 0.12 as const
