import { describe, expect, it } from 'vitest'

import { HP_MAX, MANA_MAX, STAMINA_MAX, MOVE_SPEED_MPS, HP_REGEN_PER_SEC_OOC } from './stats.js'

describe('base stats match design doc', () => {
  it('HP/Mana/Stamina maxima are the committed values from VERITA.md', () => {
    expect(HP_MAX).toBe(200)
    // Mana bumped 100→120: magic builds were burning dry after 3 casts.
    expect(MANA_MAX).toBe(120)
    expect(STAMINA_MAX).toBe(100)
  })

  it('move speed is 9.0 m/s (sprint-always-on)', () => {
    expect(MOVE_SPEED_MPS).toBe(9.0)
  })

  it('HP regen out-of-combat is 2.0/s (bumped from 0.5 for faster skirmish recovery)', () => {
    expect(HP_REGEN_PER_SEC_OOC).toBe(2.0)
  })
})
