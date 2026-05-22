// mastery.ts — Mastery system (01_DESIGN/03_mastery_system.md).
//
// Mastery activates when the player has 4 or more magic abilities of the same
// element in their 5 magic slots.
//   4/5 same element → Mastery ACTIVE
//   5/5 same element → Mastery ACTIVE + per-element extra perk (see design doc)
//   ≤ 3/5            → no mastery; abilities fire at full individual strength

import type { AbilityDef } from '../abilities/types.js'

import type { ElementId } from './elements.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** 0 = not active, 1 = mastery (4/5), 2 = perfect mastery (5/5) */
export type MasteryLevel = 0 | 1 | 2

export interface MasteryBonusDef {
  element: ElementId
  /** Multiplier on outgoing damage of all abilities of this element. 1 = no bonus. */
  damageMult: number
  /** Multiplier on cooldown seconds for all abilities of this element. 1 = no bonus. */
  cooldownMult: number
  /** Multiplier on CC-status durations applied by this element. 1 = no bonus. */
  ccDurationMult: number
  /** Multiplier on DoT tick values of this element. 1 = no bonus. */
  dotTickMult: number
  /** Additive lifesteal fraction on all hits of this element. 0 = no bonus. */
  lifestealAdd: number
  /** Description of the level 2 (5/5) exclusive perk. */
  level2Desc: string
  /** Colour used in UI for this element. */
  color: string
}

// ---------------------------------------------------------------------------
// Per-element bonus table (from 03_mastery_system.md)
// ---------------------------------------------------------------------------

// Per-element mastery bonuses (03_mastery_system.md).
// Applied at Mastery Level 1 (4+/5 same element in magic slots).
export const MASTERY_BONUSES: Readonly<Record<ElementId, MasteryBonusDef>> = {
  fire: {
    element: 'fire',
    damageMult: 1.15, // +15% damage on all fire abilities
    cooldownMult: 1.0,
    ccDurationMult: 1.0,
    dotTickMult: 1.0, // Burn duration +50% handled separately in StatusRuntime
    lifestealAdd: 0,
    level2Desc: 'Burn stacks detonate on hit — 1 extra AoE tick per consumed stack.',
    color: '#ff6a2a',
  },
  ice: {
    element: 'ice',
    damageMult: 1.0,
    cooldownMult: 1.0,
    ccDurationMult: 1.1, // +10% CC duration on all ice abilities
    dotTickMult: 1.0,
    lifestealAdd: 0,
    level2Desc: 'Chill→Freeze threshold reduced from 5 to 4 stacks.',
    color: '#9adfff',
  },
  lightning: {
    element: 'lightning',
    damageMult: 1.0,
    cooldownMult: 0.85, // -15% cooldown on all lightning abilities
    ccDurationMult: 1.0,
    dotTickMult: 1.0,
    lifestealAdd: 0,
    level2Desc: 'Chain jumps reach 2 targets instead of 1.',
    color: '#fff066',
  },
  dark: {
    element: 'dark',
    damageMult: 1.0,
    cooldownMult: 1.0,
    ccDurationMult: 1.0,
    dotTickMult: 1.0,
    lifestealAdd: 0.2, // +20% lifesteal on all dark hits
    level2Desc: 'Lifesteal also heals nearby allies for 20% of the amount.',
    color: '#c890ff',
  },
  nature: {
    element: 'nature',
    damageMult: 1.0,
    cooldownMult: 1.0,
    ccDurationMult: 1.0,
    dotTickMult: 1.25, // +25% DoT tick damage on all nature abilities
    lifestealAdd: 0,
    level2Desc: 'Poison stacks decay 2× slower.',
    color: '#aef090',
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute mastery level from an already-filtered list of magic-slot abilities. */
export function computeMastery(loadout: readonly AbilityDef[]): {
  element: ElementId | undefined
  level: MasteryLevel
} {
  // Count occurrences of each element (skip 'none').
  const counts = new Map<ElementId, number>()
  for (const def of loadout) {
    if (def.element !== 'none') {
      counts.set(def.element as ElementId, (counts.get(def.element as ElementId) ?? 0) + 1)
    }
  }

  // Find highest-count element.
  let bestElem: ElementId | undefined
  let bestCount = 0
  for (const [elem, count] of counts) {
    if (count > bestCount) {
      bestElem = elem
      bestCount = count
    }
  }

  if (!bestElem || bestCount < 4) return { element: undefined, level: 0 }
  if (bestCount >= 5) return { element: bestElem, level: 2 }
  return { element: bestElem, level: 1 }
}

/** Compute mastery from the canonical 11-slot loadout layout. */
export function computeLoadoutMastery(loadout: readonly (AbilityDef | null | undefined)[]): {
  element: ElementId | undefined
  level: MasteryLevel
} {
  const magicDefs = loadout.filter((def): def is AbilityDef => !!def && def.slot === 'magic')
  return computeMastery(magicDefs)
}

/** Return the bonus def for a given element, or null if element is 'none'. */
export function getMasteryBonus(element: string): MasteryBonusDef | null {
  return (MASTERY_BONUSES as Record<string, MasteryBonusDef>)[element] ?? null
}
