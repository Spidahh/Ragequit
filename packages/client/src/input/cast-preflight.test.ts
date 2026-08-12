import { ABILITY_DEFS } from '@ragequit/shared'
import { describe, expect, it } from 'vitest'

import { castBlockLabel, castBlockReason } from './cast-preflight.js'

const fireball = ABILITY_DEFS.fireball!
const ready = {
  tickNow: 100,
  abilityReadyAtTick: 0,
  gcdReadyAtTick: 0,
  mana: 999,
  stamina: 999,
}

describe('castBlockReason', () => {
  it('lets a legal cast through', () => {
    expect(castBlockReason(fireball, ready)).toBeNull()
  })

  it('reports the per-ability cooldown first', () => {
    expect(castBlockReason(fireball, { ...ready, abilityReadyAtTick: 140 })).toBe('cooldown')
  })

  it('reports the global cooldown', () => {
    expect(castBlockReason(fireball, { ...ready, gcdReadyAtTick: 110 })).toBe('gcd')
  })

  it('reports missing resources', () => {
    expect(castBlockReason(fireball, { ...ready, mana: fireball.costMana - 1 })).toBe('cost')
    expect(castBlockReason(fireball, { ...ready, mana: fireball.costMana })).toBeNull()
  })

  // The server auto-swaps for a weapon-bound cast, so pressing a bow ability
  // with the sword out is legal — predicting a failure there would suppress
  // the flash on a cast that actually succeeds.
  it('never blocks for the equipped weapon', () => {
    const bowAbility = ABILITY_DEFS.piercing_shot!
    expect(castBlockReason(bowAbility, ready)).toBeNull()
  })

  it('is a no-op for an unknown ability', () => {
    expect(castBlockReason(undefined, { ...ready, mana: 0, stamina: 0 })).toBeNull()
  })
})

describe('castBlockLabel', () => {
  it('names the resource the player is actually short of', () => {
    expect(castBlockLabel('cost', fireball)).toBe('MANA INSUFFICIENTE')
    expect(castBlockLabel('cost', ABILITY_DEFS.whirlwind!)).toBe('STAMINA INSUFFICIENTE')
    expect(castBlockLabel('cooldown', fireball)).toBe('IN RICARICA')
    expect(castBlockLabel('gcd', fireball)).toBe('ATTENDI IL RECUPERO')
  })
})
