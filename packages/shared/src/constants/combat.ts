// Combat fundamentals — TTK window, GCD, knockup bounds.
// Authority: 01_DESIGN/01_combat_fundamentals.md.
//
// Parry constants live in ./weapons.ts as the full authoritative set
// (tap window, tap cost, tap CD, hold drain, block fractions). Keep this file
// for mode-agnostic tuning (TTK, GCD, knockup bounds) to avoid duplicate
// exports.

// Calibration target — all ability damage/CD/cost values are tuned against this.
export const TTK_MIN_SEC = 20 as const
export const TTK_MAX_SEC = 30 as const

// Global cooldown between ability casts (not applied to M1 basic attacks).
export const GCD_SEC = 0.3 as const

// Knockup airborne duration bounds (ability-specific, falls in this range).
export const KNOCKUP_AIRBORNE_MIN_SEC = 0.6 as const
export const KNOCKUP_AIRBORNE_MAX_SEC = 1.0 as const

// Knockup immunity window after landing — a second knockup inside this window
// does not re-launch the target.
export const KNOCKUP_IMMUNITY_AFTER_LAND_SEC = 2 as const

// --- Match flow ------------------------------------------------------------
// 1v1 ranked: best-of-5 rounds, 2-min timer per round, higher HP wins on
// timeout. Authority: 01_DESIGN/07_modes.md.
export const MATCH_ROUNDS_TO_WIN = 3 as const
export const MATCH_MAX_ROUNDS = 5 as const
export const ROUND_TIMER_SEC = 120 as const
export const ROUND_COUNTDOWN_SEC = 3 as const
export const ROUND_END_HOLD_SEC = 2 as const

// ELO baseline. K-factor 25 ranked, 20 FFA. Seven visible rank tiers.
export const ELO_STARTING = 1000 as const
export const ELO_K_RANKED = 25 as const
export const ELO_K_FFA = 20 as const

// Kill counters per mode (FFA / Team), kept here for match manager flow.
export const FFA_KILLS_TO_WIN = 40 as const
export const TEAM_KILLS_TO_WIN = 75 as const
