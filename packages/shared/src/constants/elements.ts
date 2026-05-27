// Elemental tag taxonomy for abilities, VFX and status defaults. Kept separate
// from `stats.ts` so the type can be imported without pulling regen knobs.

export const ELEMENT_IDS = ['fire', 'ice', 'lightning', 'dark', 'nature'] as const
export type ElementId = (typeof ELEMENT_IDS)[number]

export function isElementId(s: string): s is ElementId {
  return (ELEMENT_IDS as readonly string[]).includes(s)
}

export const MAGIC_SLOT_COUNT = 5 as const
