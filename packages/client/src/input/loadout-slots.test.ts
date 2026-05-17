import { describe, expect, it } from 'vitest'

import {
  FIXED_TRANSFER_SLOTS,
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
    expect(FIXED_TRANSFER_SLOTS).toEqual({
      7: 'transfer_hp_mana',
      8: 'transfer_mana_stam',
      9: 'transfer_stam_hp',
    })
  })

  it('builds the network payload with fixed transfers for the server loadout channel', () => {
    expect(buildLoadoutMessage(['m', 'b', 'a', 'b2', 'c', 'd', 'e', 'u1', 'u2', 'u3', 'u4'])).toEqual({
      melee: 'm',
      bow: 'b',
      magic: ['a', 'b2', 'c', 'd', 'e'],
      utility: ['transfer_hp_mana', 'transfer_mana_stam', 'transfer_stam_hp', 'u4'],
    })
    expect(normalizeLoadoutSlots(['m', 'b', 'a', 'b2', 'c', 'd', 'e', '', '', '', 'quick_dash']).slice(7)).toEqual([
      'transfer_hp_mana',
      'transfer_mana_stam',
      'transfer_stam_hp',
      'quick_dash',
    ])
  })
})
