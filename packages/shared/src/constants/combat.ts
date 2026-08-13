// Combat fundamentals — TTK window, GCD, knockup bounds.
// Authority: 01_DESIGN/01_combat_fundamentals.md.
//
// Parry constants live in ./weapons.ts as the full authoritative set
// (tap window, tap cost, tap CD, hold drain, block fractions). Keep this file
// for mode-agnostic tuning (TTK, GCD, knockup bounds) to avoid duplicate
// exports.

/**
 * Calibration band for how long a kill takes, in seconds.
 *
 * 20-30 -> 6-9 on 2026-08-13 (D1, 00_truth.md). The old pair was wrong by 3-5x
 * and carried the comment "all ability damage/CD/cost values are tuned against
 * this", which was false: the shipped registry killed in about six seconds and
 * nothing in the codebase imported either constant. They were documentation
 * wearing a constant's clothes, so being wrong cost nothing and nobody noticed.
 *
 * THE DOCUMENT CHANGED, NOT THE DAMAGE TABLE. The registry was right. A flat
 * damage rescale was explicitly rejected: heals (50, 60) and shields
 * (stacks: 20) are flat numbers off any multiplier, so tripling damage to reach
 * a fictional TTK would not preserve balance, it would delete healing.
 *
 * These are enforced now — config/ttk.ts measures every class preset against
 * the shipped registry and a test fails when the roster leaves the band. A
 * target that cannot fail is not a target.
 *
 * Why short: short TTK is what makes speed matter. If a mistake costs the round
 * in seconds, every metre of positioning is load-bearing. Long TTK actively
 * hurts build diversity — it lets every build grind out the same attrition win.
 */
export const TTK_MIN_SEC = 6 as const
export const TTK_MAX_SEC = 9 as const

/**
 * No ability may exceed this cooldown (D1). At a 6-9 s TTK a 12 s cooldown
 * fires once per fight and the old 22 s maximum fired once per THREE fights, so
 * a six-slot build expressed two or three slots and the rest was decoration.
 * Every slot is up in every engagement, and the fight is decided by aim rather
 * than by which button happened to be off cooldown.
 */
export const MAX_ABILITY_COOLDOWN_SEC = 12 as const

/**
 * Damage band for `comboRole: 'finisher'` abilities (D1).
 *
 * One clean launch into a punish should take 30-35 % of a bar, so three clean
 * conversions kill. Within the band, damage is bought with COMMITMENT — windup
 * plus cooldown — which is the rationale the band exists to serve. Fireball
 * exposed the difference: at 40 damage on its old 5 s cooldown with no windup
 * it obeyed the band's letter while becoming the best sustained-damage button
 * in the game, so its cooldown rose to 8.5 to match what it now hits for.
 */
export const FINISHER_DAMAGE_MIN = 40 as const
export const FINISHER_DAMAGE_MAX = 55 as const

// Global cooldown between ability casts (not applied to M1 basic attacks).
export const GCD_SEC = 0.3 as const

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

/**
 * Modes whose lobby is filled with bots so a solo player gets a live match.
 *
 * Shared because both sides need the same answer: the client asks for the fill
 * on join, the server performs it. A tournament missing from this set is a
 * lobby that never starts — which is exactly what the first live run of
 * tools/verify/tournament.mjs found, 40 samples all in `lobby`.
 */
export const BOT_FILLED_MODES: ReadonlySet<string> = new Set([
  'duel_arena',
  'ffa',
  '5v5',
  'tournament',
])

// Kill counters per mode (FFA / Team), kept here for match manager flow.
//
// RE-DERIVED 2026-08-13 (D3, 00_truth.md). Both were sized explicitly on the
// fiction: 07_modes.md said "kill counts are high (75 / 40) on purpose — with
// TTK 20-30s, this creates 15-minute matches". TTK was never 20-30 s, so the
// counts were solving the wrong equation.
//
// The invariant kept is the INTENT — a ~15-minute match — not the old numbers.
// The model, written down so it can be argued with:
//
//   per-kill cycle = TTK + approach + respawn
//   old:  25 + 10 + 5.0 = 40 s        (fictional TTK, RESPAWN_SEC before D13)
//   new: 7.5 + 10 + 1.5 = 19 s        (measured TTK, RESPAWN_SEC after D13)
//
// FFA is first-to-N per PLAYER: 900 s / 19 s = 47 kills for the leader, so 45.
// (At the old cycle, 40 kills was a 27-minute match — the "15-minute" claim was
// already wrong before the TTK correction, not just after it.)
//
// Team is N per TEAM of five, and the honest part is that not all five are
// fighting at once. At roughly two-thirds engaged: (2/3 x 5 / 19) x 900 = 158.
// 150 is the round number, giving ~14 minutes.
//
// THE TEAM NUMBER IS THE SOFT ONE. Its engagement assumption is a guess that
// only playtest data can settle; the FFA number needs no such assumption.
export const FFA_KILLS_TO_WIN = 45 as const
export const TEAM_KILLS_TO_WIN = 150 as const
