import { getAbilitySlotFamily } from '@ragequit/shared'
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

export const KEY_SLOT: ReadonlyArray<readonly [code: string, label: string, slotIdx: number]> = [
  ['KeyR', 'R', 0],
  ['KeyG', 'G', 1], // bow ability — active slot, same cast path as melee/magic
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

/** Pads or trims the slot array to exactly 11 entries. No injection occurs. */
export function normalizeLoadoutSlots(slots: readonly string[]): string[] {
  return Array.from({ length: 11 }, (_, idx) => slots[idx] ?? '')
}

/**
 * Builds the class-aware loadout envelope for the server.
 * Each ability is classified by its target slot family (via getAbilitySlotFamily)
 * and placed in the corresponding array. The server validates by family budget,
 * not wire position, so abilities may come from any slot in the flat array.
 */
export function buildLoadoutMessage(
  slots: readonly string[],
  instantCast?: Record<string, boolean>,
  classId?: string,
): ClientLoadoutMessage {
  const melee: string[] = []
  const bow: string[] = []
  const magicBase: string[] = []
  const magicAdvanced: string[] = []
  const utility: string[] = []

  for (const id of slots) {
    if (!id) continue
    const family = getAbilitySlotFamily(id)
    switch (family) {
      case 'melee':
        melee.push(id)
        break
      case 'bow':
        bow.push(id)
        break
      case 'magicBase':
        magicBase.push(id)
        break
      case 'magicAdvanced':
        magicAdvanced.push(id)
        break
      default:
        utility.push(id)
        break
    }
  }

  return {
    classId: classId ?? 'hybrid',
    melee,
    bow,
    magicBase,
    magicAdvanced,
    utility,
    ...(instantCast ? { instantCast } : {}),
  }
}
