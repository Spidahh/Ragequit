import type { AbilityDef, Player } from '@ragequit/shared'
import { describe, expect, it } from 'vitest'

import { validateCast, type CastValidationCtx } from './cast-validation.js'

// Minimal structural mocks — validateCast only reads the fields below.
function mkPlayer(over: Partial<Player> = {}): Player {
  return {
    alive: true,
    casting: false,
    swingEndsAtTick: 0,
    bowChargeStartTick: 0,
    airborneUntilTick: 0,
    parrying: false,
    gcdReadyAtTick: 0,
    abilityCooldowns: new Map<string, number>(),
    loadout: ['fireball'],
    mana: 100,
    stamina: 100,
    ...over,
  } as unknown as Player
}

function mkDef(over: Partial<AbilityDef> = {}): AbilityDef {
  return {
    id: 'fireball',
    airPolicy: 'any',
    costMana: 10,
    costStamina: 0,
    cooldownSec: 5,
    ...over,
  } as unknown as AbilityDef
}

const ctx = (over: Partial<CastValidationCtx> = {}): CastValidationCtx => ({
  now: 100,
  isCastLocked: false,
  isInvulnerable: false,
  ...over,
})

describe('validateCast', () => {
  it('accepts a valid cast (null)', () => {
    expect(validateCast(mkPlayer(), mkDef(), ctx())).toBeNull()
  })

  it('rejects in priority order', () => {
    expect(validateCast(mkPlayer({ alive: false }), mkDef(), ctx())).toBe('dead')
    expect(validateCast(mkPlayer({ casting: true }), mkDef(), ctx())).toBe('casting')
    expect(validateCast(mkPlayer({ swingEndsAtTick: 200 }), mkDef(), ctx())).toBe('casting')
    expect(validateCast(mkPlayer({ bowChargeStartTick: 5 }), mkDef(), ctx())).toBe('casting')
    expect(
      validateCast(
        mkPlayer({ airborneUntilTick: 200 }),
        mkDef({ airPolicy: 'groundedCaster' }),
        ctx(),
      ),
    ).toBe('grounded_required')
    expect(validateCast(mkPlayer({ parrying: true }), mkDef(), ctx())).toBe('parrying')
    expect(validateCast(mkPlayer(), mkDef(), ctx({ isCastLocked: true }))).toBe('cc')
    expect(validateCast(mkPlayer(), mkDef(), ctx({ isInvulnerable: true }))).toBe('cc')
    expect(validateCast(mkPlayer({ gcdReadyAtTick: 200 }), mkDef(), ctx())).toBe('gcd')
  })

  it('rejects ability on cooldown', () => {
    const p = mkPlayer({ abilityCooldowns: new Map([['fireball', 200]]) })
    expect(validateCast(p, mkDef(), ctx())).toBe('cooldown')
  })

  it('rejects ability not in loadout', () => {
    expect(validateCast(mkPlayer({ loadout: ['ice_lance'] }), mkDef(), ctx())).toBe(
      'not_in_loadout',
    )
  })

  it('rejects insufficient mana then stamina', () => {
    expect(validateCast(mkPlayer({ mana: 5 }), mkDef({ costMana: 10 }), ctx())).toBe('cost')
    expect(
      validateCast(mkPlayer({ stamina: 5 }), mkDef({ costMana: 0, costStamina: 10 }), ctx()),
    ).toBe('cost')
  })

  it('grounded ability is fine when not airborne', () => {
    expect(
      validateCast(
        mkPlayer({ airborneUntilTick: 0 }),
        mkDef({ airPolicy: 'groundedCaster' }),
        ctx(),
      ),
    ).toBeNull()
  })
})
