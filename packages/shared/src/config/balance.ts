// Runtime balance config.
//
// Authority split (important):
//   - The gameplay numbers for weapons (bow/staff/sword) and parry are the
//     `as const` constants in `constants/weapons.ts` / `constants/stats.ts`.
//     Both server and client import those constants DIRECTLY, so they are the
//     real source of truth and cannot be changed at runtime (determinism).
//   - `balance.json` is a runtime override surface that is currently only
//     consumed for `ttk` and `match` (ELO/round counts) — see RUNTIME_BALANCE
//     usage. The weapons/parry fields here MIRROR the constants for display and
//     telemetry; they are derived from the constants below so they can never
//     drift again (a test enforces the match).
//
// Usage:
//   - server: import `RUNTIME_BALANCE` to read live ttk/match values.
//   - tests: provide a custom JSON path to `loadBalance()` to verify overrides.
//   - client: imports the JSON directly via vite for cosmetic display.
import {
  SWORD_M1_DAMAGE,
  BOW_CHARGE_MIN_SEC,
  BOW_CHARGE_FULL_SEC,
  BOW_DAMAGE_MIN,
  BOW_DAMAGE_FULL,
  STAFF_M1_DAMAGE,
  STAFF_M1_MANA_COST,
  STAFF_M1_CADENCE_SEC,
} from '../constants/weapons.js'

export interface BalanceConfig {
  version: number
  ttk: { min_sec: number; max_sec: number }
  weapons: {
    sword_m1_damage: [number, number, number]
    bow_charge_min_sec: number
    bow_charge_full_sec: number
    bow_damage_min: number
    bow_damage_full: number
    staff_m1_damage: number
    staff_m1_mana_cost: number
    staff_m1_cadence_sec: number
  }
  parry: {
    tap_window_sec: number
    tap_cost_stamina: number
    tap_cooldown_sec: number
    hold_block_frac: number
    hold_drain_per_sec: number
  }
  match: {
    rounds_to_win: number
    max_rounds: number
    round_timer_sec: number
    elo_starting: number
    elo_k_ranked: number
    elo_k_ffa: number
  }
}

// Hardcoded defaults. The `weapons` block is DERIVED from the authoritative
// `constants/weapons.ts` values so it can never drift from real gameplay (a
// test enforces this). `ttk`/`match` are the genuinely tunable runtime fields.
export const DEFAULT_BALANCE: BalanceConfig = {
  version: 1,
  ttk: { min_sec: 20, max_sec: 30 },
  weapons: {
    sword_m1_damage: [...SWORD_M1_DAMAGE] as [number, number, number],
    bow_charge_min_sec: BOW_CHARGE_MIN_SEC,
    bow_charge_full_sec: BOW_CHARGE_FULL_SEC,
    bow_damage_min: BOW_DAMAGE_MIN,
    bow_damage_full: BOW_DAMAGE_FULL,
    staff_m1_damage: STAFF_M1_DAMAGE,
    staff_m1_mana_cost: STAFF_M1_MANA_COST,
    staff_m1_cadence_sec: STAFF_M1_CADENCE_SEC,
  },
  parry: {
    tap_window_sec: 0.5,
    tap_cost_stamina: 20,
    tap_cooldown_sec: 3,
    hold_block_frac: 0.7,
    hold_drain_per_sec: 15,
  },
  match: {
    rounds_to_win: 3,
    max_rounds: 5,
    round_timer_sec: 120,
    elo_starting: 1000,
    elo_k_ranked: 25,
    elo_k_ffa: 20,
  },
}

// Live runtime balance — mutated only by `loadBalance()` at boot. After that
// the values are read-only for the rest of the process. Keep in mind that
// changing values mid-match would break determinism between server and
// client prediction; reload requires server restart.
export const RUNTIME_BALANCE: BalanceConfig = structuredClone(DEFAULT_BALANCE)

// Merge a partial `BalanceConfig` (parsed from JSON) into RUNTIME_BALANCE.
// Returns the merged result so callers can inspect the effective config.
// Missing fields fall back to defaults — the JSON only needs to contain
// the values the operator wants to override.
export function applyBalanceOverride(overrides: Partial<BalanceConfig>): BalanceConfig {
  if (typeof overrides.version === 'number') RUNTIME_BALANCE.version = overrides.version
  if (overrides.ttk) Object.assign(RUNTIME_BALANCE.ttk, overrides.ttk)
  if (overrides.weapons) Object.assign(RUNTIME_BALANCE.weapons, overrides.weapons)
  if (overrides.parry) Object.assign(RUNTIME_BALANCE.parry, overrides.parry)
  if (overrides.match) Object.assign(RUNTIME_BALANCE.match, overrides.match)
  return RUNTIME_BALANCE
}

// Pure validator — checks the structural shape + value ranges. Returns the
// list of issues so a fail-loud server boot can refuse to start with a
// malformed config. Empty array = config is OK.
export function validateBalance(c: BalanceConfig): string[] {
  const issues: string[] = []
  if (c.ttk.min_sec >= c.ttk.max_sec) issues.push('ttk.min_sec must be < max_sec')
  if (c.match.rounds_to_win > c.match.max_rounds)
    issues.push('match.rounds_to_win must be <= max_rounds')
  if (c.match.elo_k_ranked <= 0) issues.push('match.elo_k_ranked must be > 0')
  if (c.weapons.bow_charge_min_sec >= c.weapons.bow_charge_full_sec)
    issues.push('bow_charge_min_sec must be < bow_charge_full_sec')
  if (c.weapons.bow_damage_min >= c.weapons.bow_damage_full)
    issues.push('bow_damage_min must be < bow_damage_full')
  if (c.parry.hold_block_frac < 0 || c.parry.hold_block_frac > 1)
    issues.push('parry.hold_block_frac must be in [0, 1]')
  return issues
}
