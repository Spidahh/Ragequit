// Elemental tag taxonomy. Drives Mastery bonuses (03_mastery_system.md), M1
// infusion (per-weapon table), and per-element status defaults. Kept separate
// from `stats.ts` so the type can be imported without pulling regen knobs.

export const ELEMENT_IDS = ['fire', 'ice', 'lightning', 'dark', 'nature'] as const
export type ElementId = (typeof ELEMENT_IDS)[number]

export function isElementId(s: string): s is ElementId {
  return (ELEMENT_IDS as readonly string[]).includes(s)
}

// Mastery activation threshold — 4 of 5 magic slots same element.
// Full mastery data lives in constants/mastery.ts.
export const MASTERY_ACTIVATION_COUNT = 4 as const
export const MAGIC_SLOT_COUNT = 5 as const
