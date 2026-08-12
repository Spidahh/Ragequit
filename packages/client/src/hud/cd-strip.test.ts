import { describe, expect, it } from 'vitest'

import { hotbarSectionForAbility } from './cd-strip.js'

describe('hotbarSectionForAbility', () => {
  it('keeps every combat family in a separate visible section', () => {
    expect(hotbarSectionForAbility('uppercut')).toBe('melee')
    expect(hotbarSectionForAbility('pin_shot')).toBe('bow')
    expect(hotbarSectionForAbility('fireball')).toBe('staff')
    expect(hotbarSectionForAbility('arcane_rebind')).toBe('utility')
  })

  it('does not invent a section for an unknown ability', () => {
    expect(hotbarSectionForAbility('missing_ability')).toBeNull()
  })
})
