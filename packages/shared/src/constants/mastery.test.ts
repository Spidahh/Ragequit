import { describe, expect, it } from 'vitest'

import { ABILITY_DEFS } from '../abilities/registry.js'

import { computeLoadoutMastery } from './mastery.js'

describe('computeLoadoutMastery', () => {
  it('counts only the five magic slots in the canonical loadout', () => {
    const loadout = [
      ABILITY_DEFS.bleed_strike,
      ABILITY_DEFS.blast_arrow,
      ABILITY_DEFS.fireball,
      ABILITY_DEFS.flame_wall,
      ABILITY_DEFS.ignite,
      ABILITY_DEFS.meteor,
      ABILITY_DEFS.eruption,
      ABILITY_DEFS.transfer_hp_mana,
      ABILITY_DEFS.transfer_mana_stam,
      ABILITY_DEFS.transfer_stam_hp,
      ABILITY_DEFS.quick_dash,
    ]

    expect(computeLoadoutMastery(loadout)).toEqual({ element: 'fire', level: 2 })
  })

  it('ignores elemental melee and bow slots that would otherwise fake mastery', () => {
    const loadout = [
      ABILITY_DEFS.bleed_strike,
      ABILITY_DEFS.blast_arrow,
      ABILITY_DEFS.fireball,
      ABILITY_DEFS.frost_bolt,
      ABILITY_DEFS.chain_bolt,
      ABILITY_DEFS.shadow_bolt,
      ABILITY_DEFS.poison_seed,
      ABILITY_DEFS.transfer_hp_mana,
      ABILITY_DEFS.transfer_mana_stam,
      ABILITY_DEFS.transfer_stam_hp,
      ABILITY_DEFS.quick_dash,
    ]

    expect(computeLoadoutMastery(loadout)).toEqual({ element: undefined, level: 0 })
  })
})
