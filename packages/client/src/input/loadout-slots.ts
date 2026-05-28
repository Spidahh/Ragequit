import { getClassSlotOrder } from '@ragequit/shared'
import type { ClientLoadoutMessage, ClassId } from '@ragequit/shared'

/** Pads or trims the slot array to exactly 8 entries. No injection occurs. */
export function normalizeLoadoutSlots(slots: readonly string[]): string[] {
  return Array.from({ length: 8 }, (_, idx) => slots[idx] ?? '')
}

/**
 * Builds the class-aware loadout envelope for the server.
 * Each ability is classified by its target slot family according to the active class's slot order
 * and placed in the corresponding array, preserving index positions (including empty slots as "").
 */
export function buildLoadoutMessage(
  slots: readonly string[],
  classId?: string,
): ClientLoadoutMessage {
  const resolvedClassId = (classId ?? 'hybrid') as ClassId
  const order = getClassSlotOrder(resolvedClassId)

  const melee: string[] = []
  const bow: string[] = []
  const magicBase: string[] = []
  const magicAdvanced: string[] = []
  const utility: string[] = []

  for (let i = 0; i < order.length; i++) {
    const family = order[i]!
    const id = slots[i] ?? ''
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
    classId: resolvedClassId,
    melee,
    bow,
    magicBase,
    magicAdvanced,
    utility,
  }
}
