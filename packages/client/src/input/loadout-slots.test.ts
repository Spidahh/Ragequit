import { describe, expect, it } from 'vitest'

import {
  KEY_SLOT,
  LOADOUT_SLOT_ORDER,
  buildLoadoutMessage,
  normalizeLoadoutSlots,
} from './loadout-slots.js'

describe('loadout slot helpers', () => {
  it('maps combat keys to the expected loadout indexes', () => {
    expect(KEY_SLOT.map(([code, label, slotIdx]) => ({ code, label, slotIdx }))).toEqual([
      { code: 'KeyR', label: 'R', slotIdx: 0 },
      { code: 'KeyG', label: 'G', slotIdx: 1 },
      { code: 'Digit1', label: '1', slotIdx: 2 },
      { code: 'Digit2', label: '2', slotIdx: 3 },
      { code: 'Digit3', label: '3', slotIdx: 4 },
      { code: 'Digit4', label: '4', slotIdx: 5 },
      { code: 'Digit5', label: '5', slotIdx: 6 },
      { code: 'KeyZ', label: 'Z', slotIdx: 7 },
      { code: 'KeyX', label: 'X', slotIdx: 8 },
      { code: 'KeyF', label: 'F', slotIdx: 9 },
      { code: 'KeyV', label: 'V', slotIdx: 10 },
    ])
    expect(LOADOUT_SLOT_ORDER).toHaveLength(11)
  })

  it('builds the class-aware envelope by classifying abilities by target family', () => {
    // Hybrid starter build — abilities classified by getAbilitySlotFamily
    const hybridBuild = [
      'uppercut',
      'marksman_shot',
      'fireball',
      'lightning_dash',
      'arc_lift',
      'meteor',
      'adaptive_mend',
      'quick_dash',
      'cleanse_surge',
      'barrier',
      'smoke_screen',
    ]
    expect(buildLoadoutMessage(hybridBuild, undefined, 'hybrid')).toEqual({
      classId: 'hybrid',
      melee: ['uppercut'],
      bow: ['marksman_shot'],
      magicBase: ['fireball', 'lightning_dash'],
      magicAdvanced: ['arc_lift', 'meteor'],
      utility: ['adaptive_mend', 'quick_dash', 'cleanse_surge', 'barrier', 'smoke_screen'],
    })
    // Default classId falls back to 'hybrid'
    expect(buildLoadoutMessage(['quick_dash'], undefined, undefined)['classId']).toBe('hybrid')
  })

  it('normalizeLoadoutSlots pads to 11 without injecting transfers', () => {
    expect(
      normalizeLoadoutSlots(['m', 'b', 'a', 'b2', 'c', 'd', 'e', '', '', '', 'quick_dash']).slice(
        7,
      ),
    ).toEqual(['', '', '', 'quick_dash'])
  })
})
