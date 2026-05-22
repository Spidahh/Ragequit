// Balance loader (Fase 10b v0.1).
//
// Reads `packages/shared/src/constants/balance.json` at server boot and
// produces a snapshot of override values that match.constants would otherwise
// hard-code at compile time. The runtime keeps a singleton `BALANCE` instance
// that other modules can consult instead of reading the constants directly.
//
// Falls back gracefully to the compile-time constants when the JSON file is
// missing, malformed, or carries an unknown `version`. Designed so a balance
// pass post-playtest is a single PR that touches `balance.json` only.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  ELO_K_FFA,
  ELO_K_RANKED,
  ELO_STARTING,
  MATCH_MAX_ROUNDS,
  MATCH_ROUNDS_TO_WIN,
  PARRY_HOLD_BLOCK_FRAC,
  PARRY_HOLD_DRAIN_PER_SEC,
  PARRY_TAP_COOLDOWN_SEC,
  PARRY_TAP_COST_STAMINA,
  PARRY_TAP_WINDOW_SEC,
  ROUND_TIMER_SEC,
  STAFF_M1_CADENCE_SEC,
  STAFF_M1_DAMAGE,
  STAFF_M1_MANA_COST,
  TTK_MAX_SEC,
  TTK_MIN_SEC,
} from '@ragequit/shared'

export interface BalanceSnapshot {
  ttk: { minSec: number; maxSec: number }
  weapons: {
    bowChargeMinSec: number
    bowChargeFullSec: number
    bowDamageMin: number
    bowDamageFull: number
    staffM1Damage: number
    staffM1ManaCost: number
    staffM1CadenceSec: number
    swordM1Damage: readonly number[]
  }
  parry: {
    tapWindowSec: number
    tapCostStamina: number
    tapCooldownSec: number
    holdBlockFrac: number
    holdDrainPerSec: number
  }
  match: {
    roundsToWin: number
    maxRounds: number
    roundTimerSec: number
    eloStarting: number
    eloKRanked: number
    eloKFfa: number
  }
  source: 'compile-time' | 'balance.json'
}

const COMPILE_TIME_DEFAULTS: BalanceSnapshot = {
  ttk: { minSec: TTK_MIN_SEC, maxSec: TTK_MAX_SEC },
  weapons: {
    bowChargeMinSec: 0.3,
    bowChargeFullSec: 2.0,
    bowDamageMin: 4,
    bowDamageFull: 22,
    staffM1Damage: STAFF_M1_DAMAGE,
    staffM1ManaCost: STAFF_M1_MANA_COST,
    staffM1CadenceSec: STAFF_M1_CADENCE_SEC,
    swordM1Damage: [5, 5, 8],
  },
  parry: {
    tapWindowSec: PARRY_TAP_WINDOW_SEC,
    tapCostStamina: PARRY_TAP_COST_STAMINA,
    tapCooldownSec: PARRY_TAP_COOLDOWN_SEC,
    holdBlockFrac: PARRY_HOLD_BLOCK_FRAC,
    holdDrainPerSec: PARRY_HOLD_DRAIN_PER_SEC,
  },
  match: {
    roundsToWin: MATCH_ROUNDS_TO_WIN,
    maxRounds: MATCH_MAX_ROUNDS,
    roundTimerSec: ROUND_TIMER_SEC,
    eloStarting: ELO_STARTING,
    eloKRanked: ELO_K_RANKED,
    eloKFfa: ELO_K_FFA,
  },
  source: 'compile-time',
}

// Resolve `<repo>/packages/shared/src/constants/balance.json` from this
// module's location. Works in both `dist/` (post-build) and `src/` (vitest)
// because we walk up to find the workspace root.
function findBalanceJson(): string {
  // Try the standard layout first; tolerate test runs from arbitrary cwd.
  const candidates = [
    // Relative to this file when bundled: dist/sim/BalanceLoader.js → ../../../shared/src/constants/balance.json
    join(dirname(fileURLToPath(import.meta.url)), '../../../shared/src/constants/balance.json'),
    // Relative when running from src directly (vitest): src/sim/BalanceLoader.ts → ../../shared/src/constants/balance.json
    join(dirname(fileURLToPath(import.meta.url)), '../../shared/src/constants/balance.json'),
    // Absolute fallback to packages root.
    join(process.cwd(), 'packages/shared/src/constants/balance.json'),
    join(process.cwd(), '../shared/src/constants/balance.json'),
  ]
  for (const path of candidates) {
    try {
      readFileSync(path, 'utf8')
      return path
    } catch {
      continue
    }
  }
  return candidates[0]!
}

interface BalanceJsonSchema {
  version?: number
  ttk?: { min_sec?: number; max_sec?: number }
  weapons?: {
    sword_m1_damage?: number[]
    bow_charge_min_sec?: number
    bow_charge_full_sec?: number
    bow_damage_min?: number
    bow_damage_full?: number
    staff_m1_damage?: number
    staff_m1_mana_cost?: number
    staff_m1_cadence_sec?: number
  }
  parry?: {
    tap_window_sec?: number
    tap_cost_stamina?: number
    tap_cooldown_sec?: number
    hold_block_frac?: number
    hold_drain_per_sec?: number
  }
  match?: {
    rounds_to_win?: number
    max_rounds?: number
    round_timer_sec?: number
    elo_starting?: number
    elo_k_ranked?: number
    elo_k_ffa?: number
  }
}

export function loadBalance(path?: string): BalanceSnapshot {
  const filePath = path ?? findBalanceJson()
  let parsed: BalanceJsonSchema | null = null
  try {
    const raw = readFileSync(filePath, 'utf8')
    parsed = JSON.parse(raw) as BalanceJsonSchema
  } catch {
    return COMPILE_TIME_DEFAULTS
  }
  if (!parsed || typeof parsed !== 'object') return COMPILE_TIME_DEFAULTS
  if (parsed.version !== 1) return COMPILE_TIME_DEFAULTS

  const def = COMPILE_TIME_DEFAULTS
  return {
    ttk: {
      minSec: parsed.ttk?.min_sec ?? def.ttk.minSec,
      maxSec: parsed.ttk?.max_sec ?? def.ttk.maxSec,
    },
    weapons: {
      bowChargeMinSec: parsed.weapons?.bow_charge_min_sec ?? def.weapons.bowChargeMinSec,
      bowChargeFullSec: parsed.weapons?.bow_charge_full_sec ?? def.weapons.bowChargeFullSec,
      bowDamageMin: parsed.weapons?.bow_damage_min ?? def.weapons.bowDamageMin,
      bowDamageFull: parsed.weapons?.bow_damage_full ?? def.weapons.bowDamageFull,
      staffM1Damage: parsed.weapons?.staff_m1_damage ?? def.weapons.staffM1Damage,
      staffM1ManaCost: parsed.weapons?.staff_m1_mana_cost ?? def.weapons.staffM1ManaCost,
      staffM1CadenceSec: parsed.weapons?.staff_m1_cadence_sec ?? def.weapons.staffM1CadenceSec,
      swordM1Damage: parsed.weapons?.sword_m1_damage ?? def.weapons.swordM1Damage,
    },
    parry: {
      tapWindowSec: parsed.parry?.tap_window_sec ?? def.parry.tapWindowSec,
      tapCostStamina: parsed.parry?.tap_cost_stamina ?? def.parry.tapCostStamina,
      tapCooldownSec: parsed.parry?.tap_cooldown_sec ?? def.parry.tapCooldownSec,
      holdBlockFrac: parsed.parry?.hold_block_frac ?? def.parry.holdBlockFrac,
      holdDrainPerSec: parsed.parry?.hold_drain_per_sec ?? def.parry.holdDrainPerSec,
    },
    match: {
      roundsToWin: parsed.match?.rounds_to_win ?? def.match.roundsToWin,
      maxRounds: parsed.match?.max_rounds ?? def.match.maxRounds,
      roundTimerSec: parsed.match?.round_timer_sec ?? def.match.roundTimerSec,
      eloStarting: parsed.match?.elo_starting ?? def.match.eloStarting,
      eloKRanked: parsed.match?.elo_k_ranked ?? def.match.eloKRanked,
      eloKFfa: parsed.match?.elo_k_ffa ?? def.match.eloKFfa,
    },
    source: 'balance.json',
  }
}

// Process-wide singleton — main.ts calls this once at boot, every other
// runtime module reads from it.
let _balance: BalanceSnapshot | null = null
export function getBalance(): BalanceSnapshot {
  if (!_balance) _balance = loadBalance()
  return _balance
}

// Test-friendly setter — vitest replaces this between cases.
export function _setBalanceForTest(snapshot: BalanceSnapshot): void {
  _balance = snapshot
}
