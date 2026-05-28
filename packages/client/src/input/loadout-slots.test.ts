import { describe, expect, it } from 'vitest'

import { buildLoadoutMessage, normalizeLoadoutSlots } from './loadout-slots.js'

describe('loadout slot helpers', () => {
  it('builds the class-aware envelope by classifying abilities by target family', () => {
    // Hybrid preset build — abilities classified by getAbilitySlotFamily
    const hybridBuild = [
      'uppercut',
      'marksman_shot',
      'fireball',
      'lightning_dash',
      'arc_lift',
      'meteor',
      'adaptive_mend',
      'quick_dash',
    ]
    expect(buildLoadoutMessage(hybridBuild, 'hybrid')).toEqual({
      classId: 'hybrid',
      melee: ['uppercut'],
      bow: ['marksman_shot'],
      magicBase: ['fireball', 'lightning_dash'],
      magicAdvanced: ['arc_lift', 'meteor'],
      utility: ['adaptive_mend', 'quick_dash'],
    })
    // Default classId falls back to 'hybrid'
    expect(buildLoadoutMessage(['quick_dash'])['classId']).toBe('hybrid')
  })

  it('normalizeLoadoutSlots pads to 8 without injecting abilities', () => {
    expect(
      normalizeLoadoutSlots(['m', 'b', 'a', 'b2', 'c', 'd', 'e', 'quick_dash']).slice(
        5,
      ),
    ).toEqual(['d', 'e', 'quick_dash'])
  })
})
