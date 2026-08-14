// Weapon & ability constants.
// Authority: VERITA.md.
// All timings in seconds; damages are raw HP numbers tuned to the 6-9 s TTK band
// (TTK_MIN_SEC / TTK_MAX_SEC in ./combat.ts, enforced by config/ttk.ts).

// --- Sword M1 ---------------------------------------------------------------
// 3-hit combo, 0.4 s per swing. The hit chain advances only on a landed
// contact so Sword M1 is pressure inside an exchange, not a free spam loop.

export const SWORD_M1_SWING_SEC = 0.4 as const
export const SWORD_M1_RANGE_M = 1.8 as const
// Half-angle of the hit cone (radians). 90° arc = 45° each side.
export const SWORD_M1_CONE_HALF_ANGLE_RAD = Math.PI / 4
export const SWORD_M1_DAMAGE = [5, 5, 8] as const
/**
 * Stamina a sword swing costs. ZERO.
 *
 * At 8 it was 20 stamina/s against STAMINA_REGEN_PER_SEC_MOVING = 5 on a 150
 * pool, while the Tank's own preset abilities amortise to ~18.65/s and a parry
 * tap costs 20 — the Tank ran dry in about 4.5 s, SHORTER THAN THE TTK. Against
 * a free bow and a 2-mana staff, that is three weapons with three incompatible
 * economies, and the melee class was the one being punished for attacking.
 *
 * Basic attacks are free on every weapon now. Resources gate ABILITIES, which
 * is where a build decision actually lives.
 */
export const SWORD_M1_COST_STAMINA = 0 as const
// Inactivity timeout that resets the combo counter to 0. (This is the only
// combo window: a swing within this gap continues the chain, otherwise it
// restarts at index 0 — see advanceSwordCombo.)
export const SWORD_M1_COMBO_RESET_SEC = 1.0 as const
// When during the 0.4 s swing the hit-check fires (fraction of swing duration).
// 0.5 puts the hitbox active at the peak of the arc.
export const SWORD_M1_HIT_FRACTION = 0.5 as const
// Sword contact can happen in air. Distance, aim, stamina and server hit tests
// decide whether the swing matters.

// --- Uppercut ---------------------------------------------------------------
// 0.4 s visible windup → vertical strike → 0.8 s airborne knockup on target.

export const UPPERCUT_WINDUP_SEC = 0.4 as const
export const UPPERCUT_DAMAGE = 15 as const
export const UPPERCUT_AIRBORNE_SEC = 0.8 as const

// Hard ceiling on any authored airtime, so no future ability can exceed the
// envelope the airborne rules were tested against. 00_truth.md 7.3.
export const MAX_AIRBORNE_SEC = 1.2 as const
export const UPPERCUT_COST_STAMINA = 40 as const
export const UPPERCUT_COOLDOWN_SEC = 10 as const
export const UPPERCUT_RANGE_M = 2.5 as const
// A launch ADDS to lateral velocity, it does not replace it (00_truth.md 7.1,
// and the locked rule at 01_arena_fps_air_contract.md:38). This comment used to
// say "lateral velocity is zeroed by the knockup; only vertical impulse
// matters" — which described the behaviour the launch work deleted, and would
// have told the next person that deleting the victim's momentum was intended.
// See applyKnockupToPlayer in server/src/rooms/GameRoom.ts.
// Apex ≈ 2.0 m so the visual "airborne" reads clearly. Derived so that
// freefall time from apex back to ground = UPPERCUT_AIRBORNE_SEC.
export const UPPERCUT_APEX_M = 2.0 as const

// --- Damage / death ---------------------------------------------------------

// Respawn delay. Quake's is ~1.7 s; five was three times that, and a fixed wait
// in a game whose whole point is being back in the fight. A death should cost you
// the fight you just lost, not the next thirty seconds of the match.
// See VERITA.md §6.
export const RESPAWN_SEC = 1.5 as const

// --- Lag compensation -------------------------------------------------------
// 400 ms ring buffer of past positions per entity, used to rewind melee hit
// checks and line-of-sight casts.
export const LAG_COMP_BUFFER_MS = 400 as const
export const LAG_COMP_MAX_COMPENSATE_MS = 200 as const

// --- Weapons list + swap ---------------------------------------------------
// Three default weapons every player can use. Weapon swap changes the active
// weapon immediately, cancels any charge/bolt cadence, and opens the short
// server-authoritative swap lock window defined in world.ts.

export const WEAPON_IDS = ['sword', 'bow', 'staff'] as const
export type WeaponId = (typeof WEAPON_IDS)[number]

// --- Bow M1 ----------------------------------------------------------------
// Charge 0.05 s minimum → 4 dmg. Full charge 0.65 s → 22 dmg. Linear scaling.
// Projectile velocity linear from 35 m/s (min) to 60 m/s (full). Gravity arc:
// a mild drop so aim at medium range must compensate slightly. Charge cancels
// on damage taken. No stamina / mana cost.

export const BOW_CHARGE_MIN_SEC = 0.05 as const // 0.15→0.05: near-instant tap fires
export const BOW_CHARGE_FULL_SEC = 0.65 as const // 1.1→0.65: full charge in well under 1s
export const BOW_DAMAGE_MIN = 4 as const
export const BOW_DAMAGE_FULL = 22 as const
export const BOW_SPEED_MIN_MPS = 35 as const
export const BOW_SPEED_FULL_MPS = 60 as const
// Mild gravity applied to arrow trajectory (m/s²). Keeps arrows dodgeable.
// Not the same as player gravity — arrows drop more slowly than bodies so the
// target leading stays predictable at 30-40 m.
export const BOW_GRAVITY_MPS2 = 2 as const // 6→2: near-flat arc, much easier to aim
// Lifetime cap — after this the projectile despawns even without collision.
export const BOW_PROJECTILE_LIFETIME_SEC = 2.5 as const
// Effective range used by UI hints only. Physics uses lifetime+velocity.
export const BOW_EFFECTIVE_RANGE_MIN_M = 18 as const
export const BOW_EFFECTIVE_RANGE_FULL_M = 40 as const

// --- Staff M1 ---------------------------------------------------------------
// 2.5 bolts/s (0.4 s cadence), 8 dmg, 2 mana, 75 m/s near-flat. Despawn at 50 m.

export const STAFF_M1_CADENCE_SEC = 0.4 as const // slight rate up: 2→2.5 bolts/s
export const STAFF_M1_DAMAGE = 8 as const
/** Mana a staff bolt costs. ZERO — see SWORD_M1_COST_STAMINA. */
export const STAFF_M1_MANA_COST = 0 as const
export const STAFF_M1_SPEED_MPS = 75 as const // 50→75: faster bolts, easier to land
export const STAFF_M1_MAX_RANGE_M = 50 as const // 30→50: longer effective range
// Staff bolt uses tiny gravity for a flatter path than bow. Makes it a
// different tool — bow rewards prediction, staff rewards consistent aim.
export const STAFF_M1_GRAVITY_MPS2 = 1.0 as const
export const STAFF_M1_LIFETIME_SEC = STAFF_M1_MAX_RANGE_M / STAFF_M1_SPEED_MPS

// --- Projectile collision ---------------------------------------------------
// Players are approximated as vertical capsules for projectile intersection.
// HEIGHT matches the kinematic controller (CAPSULE_HEIGHT_M = 1.8). RADIUS does
// NOT: it is INTENTIONALLY wider than the movement footprint (world.ts
// CAPSULE_RADIUS_M = 0.4) so projectiles register reliably — a feel pad, not a
// sync. Self-collision (movement/dash) must use the 0.4 footprint, not this.
export const PLAYER_CAPSULE_RADIUS_M = 0.65 as const // 0.5→0.65: larger hitbox, projectiles feel better
export const PLAYER_CAPSULE_HEIGHT_M = 1.8 as const
// Offset from replicated capsule centre to the first-person eye / projectile
// muzzle. The player transform is already capsule-centre height, so this must
// be below half-height; adding full body height here makes shots spawn above
// the head and breaks close-range crosshair alignment.
export const PROJECTILE_MUZZLE_Y_OFFSET_M = 0.65 as const
// Server collision uses the arena ground plane at y=0.
export const TERRAIN_GROUND_Y = 0 as const

// --- Parry -----------------------------------------------------------------
// Tap parry = perfect block window (100% block), burns 20 stamina, 3 s CD.
// Hold parry = continuous 70% block, drains 15 stam/s, no CD on release.
// Airborne state is not a universal parry lock in the arena-FPS contract.

export const PARRY_TAP_WINDOW_SEC = 0.5 as const
export const PARRY_TAP_COST_STAMINA = 20 as const
export const PARRY_TAP_COOLDOWN_SEC = 3 as const
export const PARRY_TAP_BLOCK_FRAC = 1.0 as const
export const PARRY_HOLD_BLOCK_FRAC = 0.7 as const
export const PARRY_HOLD_DRAIN_PER_SEC = 15 as const
