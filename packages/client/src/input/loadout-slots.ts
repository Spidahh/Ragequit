import type { AbilitySlot, ClientLoadoutMessage } from '@ragequit/shared'

export const LOADOUT_SLOT_ORDER: readonly AbilitySlot[] = [
  'melee',
  'bow',
  'magic',
  'magic',
  'magic',
  'magic',
  'magic',
  'utility',
  'utility',
  'utility',
  'utility',
]

export const LOADOUT_SLOT_LABELS = ['R', 'G', '1', '2', '3', '4', '5', 'Z', 'X', 'F', 'V'] as const
export const FIXED_TRANSFER_SLOTS = {
  7: 'transfer_hp_mana',
  8: 'transfer_mana_stam',
  9: 'transfer_stam_hp',
} as const
export const UTILITY_FLEX_SLOT_INDEX = 10

export const KEY_SLOT: ReadonlyArray<readonly [code: string, label: string, slotIdx: number]> = [
  ['KeyR', 'R', 0],
  ['KeyG', 'G', 1],   // bow ability — active slot, same cast path as melee/magic
  ['Digit1', '1', 2],
  ['Digit2', '2', 3],
  ['Digit3', '3', 4],
  ['Digit4', '4', 5],
  ['Digit5', '5', 6],
  ['KeyZ', 'Z', 7],
  ['KeyX', 'X', 8],
  ['KeyF', 'F', 9],
  ['KeyV', 'V', 10],
]

export function normalizeLoadoutSlots(slots: readonly string[]): string[] {
  const out = Array.from({ length: 11 }, (_, idx) => slots[idx] ?? '')
  out[7] = FIXED_TRANSFER_SLOTS[7]
  out[8] = FIXED_TRANSFER_SLOTS[8]
  out[9] = FIXED_TRANSFER_SLOTS[9]
  return out
}

export function buildLoadoutMessage(
  slots: readonly string[],
  instantCast?: Record<string, boolean>,
): ClientLoadoutMessage {
  const normalized = normalizeLoadoutSlots(slots)
  return {
    melee: normalized[0] ?? '',
    bow: normalized[1] ?? '',
    magic: [
      normalized[2] ?? '',
      normalized[3] ?? '',
      normalized[4] ?? '',
      normalized[5] ?? '',
      normalized[6] ?? '',
    ],
    utility: [
      normalized[7] ?? '',
      normalized[8] ?? '',
      normalized[9] ?? '',
      normalized[10] ?? '',
    ],
    ...(instantCast ? { instantCast } : {}),
  }
}
