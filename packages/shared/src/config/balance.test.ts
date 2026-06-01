import { describe, expect, it, beforeEach } from 'vitest'

import {
  applyBalanceOverride,
  DEFAULT_BALANCE,
  RUNTIME_BALANCE,
  validateBalance,
} from './balance.js'
import balanceJson from '../constants/balance.json'
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

describe('balance config', () => {
  beforeEach(() => {
    // Reset RUNTIME_BALANCE to defaults between tests.
    Object.assign(RUNTIME_BALANCE, structuredClone(DEFAULT_BALANCE))
  })

  it('DEFAULT_BALANCE matches the JSON shape and passes validation', () => {
    expect(DEFAULT_BALANCE.version).toBe(1)
    expect(validateBalance(DEFAULT_BALANCE)).toEqual([])
  })

  it('applyBalanceOverride merges partial overrides preserving defaults', () => {
    const merged = applyBalanceOverride({ match: { rounds_to_win: 5 } as never })
    expect(merged.match.rounds_to_win).toBe(5)
    // Other match fields should keep defaults.
    expect(merged.match.elo_k_ranked).toBe(DEFAULT_BALANCE.match.elo_k_ranked)
    // Other top-level groups untouched.
    expect(merged.weapons.staff_m1_damage).toBe(DEFAULT_BALANCE.weapons.staff_m1_damage)
  })

  it('validateBalance flags ttk inversion', () => {
    const bad = structuredClone(DEFAULT_BALANCE)
    bad.ttk.min_sec = 40
    expect(validateBalance(bad)).toContain('ttk.min_sec must be < max_sec')
  })

  it('validateBalance flags rounds_to_win > max_rounds', () => {
    const bad = structuredClone(DEFAULT_BALANCE)
    bad.match.rounds_to_win = 7
    expect(validateBalance(bad)).toContain('match.rounds_to_win must be <= max_rounds')
  })

  it('validateBalance flags bad parry block_frac', () => {
    const bad = structuredClone(DEFAULT_BALANCE)
    bad.parry.hold_block_frac = 1.5
    expect(validateBalance(bad)).toContain('parry.hold_block_frac must be in [0, 1]')
  })

  it('RUNTIME_BALANCE is mutated by applyBalanceOverride', () => {
    expect(RUNTIME_BALANCE.match.elo_k_ranked).toBe(25)
    applyBalanceOverride({ match: { elo_k_ranked: 32 } as never })
    expect(RUNTIME_BALANCE.match.elo_k_ranked).toBe(32)
  })

  // Anti-drift: the weapon numbers in balance config are mirrors of the
  // authoritative as-const constants the sim actually uses. They must agree.
  it('DEFAULT_BALANCE.weapons mirrors the weapons.ts constants', () => {
    const w = DEFAULT_BALANCE.weapons
    expect(w.sword_m1_damage).toEqual([...SWORD_M1_DAMAGE])
    expect(w.bow_charge_min_sec).toBe(BOW_CHARGE_MIN_SEC)
    expect(w.bow_charge_full_sec).toBe(BOW_CHARGE_FULL_SEC)
    expect(w.bow_damage_min).toBe(BOW_DAMAGE_MIN)
    expect(w.bow_damage_full).toBe(BOW_DAMAGE_FULL)
    expect(w.staff_m1_damage).toBe(STAFF_M1_DAMAGE)
    expect(w.staff_m1_mana_cost).toBe(STAFF_M1_MANA_COST)
    expect(w.staff_m1_cadence_sec).toBe(STAFF_M1_CADENCE_SEC)
  })

  it('balance.json weapons stay in sync with DEFAULT_BALANCE', () => {
    expect(balanceJson.weapons).toEqual(DEFAULT_BALANCE.weapons)
  })
})
