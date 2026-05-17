// Weapon & ability constants.
// Authority: 01_DESIGN/02_weapon_*.md + 01_DESIGN/05_abilities_melee.md.
// All timings in seconds; damages are raw HP numbers tuned to the 20-30 s TTK window.

// --- Sword M1 ---------------------------------------------------------------
// 3-hit combo, 0.4 s per swing, 2.5 m arc of ~90° (cone half-angle = 45°).
// Damage per swing: 6 / 6 / 9 (stagger bonus on third).

export const SWORD_M1_SWING_SEC = 0.4 as const
export const SWORD_M1_RANGE_M = 3.5 as const       // 2.5→3.5: easier to hit in 3rd-person view
// Half-angle of the hit cone (radians). 120° arc = 60° each side.
export const SWORD_M1_CONE_HALF_ANGLE_RAD = Math.PI / 3  // was PI/4 (45°) → PI/3 (60°), wider arc
// Damage per combo index.
export const SWORD_M1_DAMAGE = [12, 12, 18] as const  // was [6,6,9]; doubled to make melee viable
// Combo chain window — next swing must start within this many seconds of the
// previous swing's start to continue the chain (0.3 s per design doc).
export const SWORD_M1_CHAIN_WINDOW_SEC = 0.3 as const
// Inactivity timeout that resets the combo counter to 0.
export const SWORD_M1_COMBO_RESET_SEC = 1.0 as const
// When during the 0.4 s swing the hit-check fires (fraction of swing duration).
// 0.5 puts the hitbox active at the peak of the arc.
export const SWORD_M1_HIT_FRACTION = 0.5 as const
// Sword is a melee weapon — cannot swing while airborne (design doc constraint).

// --- Uppercut ---------------------------------------------------------------
// 0.4 s visible windup → vertical strike → 0.8 s airborne knockup on target.

export const UPPERCUT_WINDUP_SEC = 0.4 as const
export const UPPERCUT_DAMAGE = 15 as const
export const UPPERCUT_AIRBORNE_SEC = 0.8 as const
export const UPPERCUT_COST_STAMINA = 40 as const
export const UPPERCUT_COOLDOWN_SEC = 10 as const
export const UPPERCUT_RANGE_M = 2.5 as const
// Lateral velocity is zeroed by the knockup; only vertical impulse matters.
// Apex ≈ 2.0 m so the visual "airborne" reads clearly. Derived so that
// freefall time from apex back to ground = UPPERCUT_AIRBORNE_SEC.
export const UPPERCUT_APEX_M = 2.0 as const

// --- Damage / death ---------------------------------------------------------

// Respawn delay in Training / 1v1 local match flow.
export const RESPAWN_SEC = 5 as const

// --- Lag compensation -------------------------------------------------------
// 400 ms ring buffer of past positions per entity, used to rewind melee hit
// checks and any future true hitscan casts.
export const LAG_COMP_BUFFER_MS = 400 as const
export const LAG_COMP_MAX_COMPENSATE_MS = 200 as const

// --- Weapons list + swap ---------------------------------------------------
// Three default weapons every player can use. Weapon swap is atomic: 0 delay,
// cancels any charge/bolt cadence but does NOT affect GCD or cooldowns.

export const WEAPON_IDS = ['sword', 'bow', 'staff'] as const
export type WeaponId = (typeof WEAPON_IDS)[number]

// Weapon swap is instantaneous per 01_controls.md — there is no swap penalty
// on auto-swap. We still emit an event on swap so the client can play a VFX.
export const WEAPON_SWAP_GCD_SEC = 0 as const

// --- Bow M1 ----------------------------------------------------------------
// Charge 0.3 s minimum → 4 dmg. Full charge 2.0 s → 22 dmg. Linear scaling.
// Projectile velocity linear from 35 m/s (min) to 60 m/s (full). Gravity arc:
// a mild drop so aim at medium range must compensate slightly. Charge cancels
// on damage taken. No stamina / mana cost.

export const BOW_CHARGE_MIN_SEC = 0.05 as const   // 0.15→0.05: near-instant tap fires
export const BOW_CHARGE_FULL_SEC = 0.65 as const  // 1.1→0.65: full charge in well under 1s
export const BOW_DAMAGE_MIN = 4 as const
export const BOW_DAMAGE_FULL = 22 as const
export const BOW_SPEED_MIN_MPS = 35 as const
export const BOW_SPEED_FULL_MPS = 60 as const
// Mild gravity applied to arrow trajectory (m/s²). Keeps arrows dodgeable.
// Not the same as player gravity — arrows drop more slowly than bodies so the
// target leading stays predictable at 30-40 m.
export const BOW_GRAVITY_MPS2 = 2 as const  // 6→2: near-flat arc, much easier to aim
// Lifetime cap — after this the projectile despawns even without collision.
export const BOW_PROJECTILE_LIFETIME_SEC = 2.5 as const
// Effective range used by UI hints only. Physics uses lifetime+velocity.
export const BOW_EFFECTIVE_RANGE_MIN_M = 18 as const
export const BOW_EFFECTIVE_RANGE_FULL_M = 40 as const

// --- Staff M1 ---------------------------------------------------------------
// 2 bolts/s (0.5 s cadence), 8 dmg, 5 mana, 50 m/s near-flat. Despawn at 30 m.

export const STAFF_M1_CADENCE_SEC = 0.4 as const   // slight rate up: 2→2.5 bolts/s
export const STAFF_M1_DAMAGE = 8 as const
export const STAFF_M1_MANA_COST = 2 as const       // 5→2: sustainable rapid fire
export const STAFF_M1_SPEED_MPS = 75 as const      // 50→75: faster bolts, easier to land
export const STAFF_M1_MAX_RANGE_M = 50 as const    // 30→50: longer effective range
// Staff bolt uses tiny gravity for a flatter path than bow. Makes it a
// different tool — bow rewards prediction, staff rewards consistent aim.
export const STAFF_M1_GRAVITY_MPS2 = 1.0 as const
export const STAFF_M1_LIFETIME_SEC = STAFF_M1_MAX_RANGE_M / STAFF_M1_SPEED_MPS

// --- Projectile collision ---------------------------------------------------
// Players are approximated as vertical capsules for projectile intersection.
// Values kept in sync with the kinematic controller's capsule dimensions.
export const PLAYER_CAPSULE_RADIUS_M = 0.65 as const  // 0.5→0.65: larger hitbox, projectiles feel better
export const PLAYER_CAPSULE_HEIGHT_M = 1.8 as const
// Simple terrain floor plane y=0. More complex geo lands later.
export const TERRAIN_GROUND_Y = 0 as const

// --- Parry -----------------------------------------------------------------
// Tap parry = perfect block window (100% block), burns 20 stamina, 3 s CD.
// Hold parry = continuous 70% block, drains 15 stam/s, no CD on release.
// Parry does NOT protect against airborne follow-ups (already covered by
// airborne lock in combat.md — player can't parry while airborne anyway).

export const PARRY_TAP_WINDOW_SEC = 0.5 as const
export const PARRY_TAP_COST_STAMINA = 20 as const
export const PARRY_TAP_COOLDOWN_SEC = 3 as const
export const PARRY_TAP_BLOCK_FRAC = 1.0 as const
export const PARRY_HOLD_BLOCK_FRAC = 0.7 as const
export const PARRY_HOLD_DRAIN_PER_SEC = 15 as const
