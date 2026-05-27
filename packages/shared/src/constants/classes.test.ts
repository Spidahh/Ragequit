import { describe, expect, it } from 'vitest'

import {
  CLASS_IDS,
  TARGET_CLASS_DEFS,
  TARGET_LOADOUT_SLOT_COUNT,
  classLoadoutFitsSlotGrammar,
  getAbilitySlotFamily,
  inferClassFromLoadout,
  isAbilityLegalForClass,
  targetClassSlotCount,
} from './classes.js'

describe('target class definitions', () => {
  it('keeps every target class on the agreed 8-slot grammar', () => {
    for (const classId of CLASS_IDS) {
      expect(targetClassSlotCount(classId), classId).toBe(TARGET_LOADOUT_SLOT_COUNT)
    }
  })

  it('keeps the physical tank and staff-only mage weapon contracts explicit', () => {
    expect(TARGET_CLASS_DEFS.tank.weapons).toEqual(['sword', 'bow'])
    expect(TARGET_CLASS_DEFS.mage.weapons).toEqual(['staff'])
  })

  it('keeps each class resource emphasis visible in shared data', () => {
    expect(TARGET_CLASS_DEFS.tank.resourceMaxima).toEqual({ hp: 250, mana: 50, stamina: 150 })
    expect(TARGET_CLASS_DEFS.archer.resourceMaxima).toEqual({ hp: 175, mana: 80, stamina: 110 })
    expect(TARGET_CLASS_DEFS.mage.resourceMaxima).toEqual({ hp: 150, mana: 160, stamina: 80 })
    expect(TARGET_CLASS_DEFS.hybrid.resourceMaxima).toEqual({ hp: 200, mana: 100, stamina: 100 })
  })
})

describe('ability slot family and class legality', () => {
  it('maps selected abilities to their correct target slot families', () => {
    expect(getAbilitySlotFamily('uppercut')).toBe('melee')
    expect(getAbilitySlotFamily('piercing_shot')).toBe('bow')
    expect(getAbilitySlotFamily('fireball')).toBe('magicBase')
    expect(getAbilitySlotFamily('lightning_dash')).toBe('magicBase')
    expect(getAbilitySlotFamily('meteor')).toBe('magicAdvanced')
    expect(getAbilitySlotFamily('arc_lift')).toBe('magicAdvanced')
    expect(getAbilitySlotFamily('brace_recovery')).toBe('utility')
    expect(getAbilitySlotFamily('adaptive_mend')).toBe('utility')
    expect(getAbilitySlotFamily('quick_dash')).toBe('utility')
  })

  it('gates class-exclusive Recovery utilities to their respective class only', () => {
    // Each Recovery is legal only for its own class
    expect(isAbilityLegalForClass('brace_recovery', 'tank')).toBe(true)
    expect(isAbilityLegalForClass('brace_recovery', 'archer')).toBe(false)
    expect(isAbilityLegalForClass('brace_recovery', 'mage')).toBe(false)
    expect(isAbilityLegalForClass('brace_recovery', 'hybrid')).toBe(false)

    expect(isAbilityLegalForClass('hunters_flow', 'archer')).toBe(true)
    expect(isAbilityLegalForClass('hunters_flow', 'tank')).toBe(false)

    expect(isAbilityLegalForClass('arcane_rebind', 'mage')).toBe(true)
    expect(isAbilityLegalForClass('arcane_rebind', 'tank')).toBe(false)

    expect(isAbilityLegalForClass('adaptive_mend', 'hybrid')).toBe(true)
    expect(isAbilityLegalForClass('adaptive_mend', 'tank')).toBe(false)
  })

  it('rejects cross-class slot abuse: mage cannot use melee, tank cannot use magicBase', () => {
    // Melee abilities are not legal for mage or archer
    expect(isAbilityLegalForClass('uppercut', 'mage')).toBe(false)
    expect(isAbilityLegalForClass('uppercut', 'archer')).toBe(false)
    expect(isAbilityLegalForClass('uppercut', 'tank')).toBe(true)
    expect(isAbilityLegalForClass('uppercut', 'hybrid')).toBe(true)

    // magicBase abilities are not legal for tank
    expect(isAbilityLegalForClass('fireball', 'tank')).toBe(false)
    expect(isAbilityLegalForClass('fireball', 'archer')).toBe(true)
    expect(isAbilityLegalForClass('fireball', 'mage')).toBe(true)
    expect(isAbilityLegalForClass('fireball', 'hybrid')).toBe(true)

    // magicAdvanced abilities are not legal for tank or archer
    expect(isAbilityLegalForClass('meteor', 'tank')).toBe(false)
    expect(isAbilityLegalForClass('meteor', 'archer')).toBe(false)
    expect(isAbilityLegalForClass('meteor', 'mage')).toBe(true)
    expect(isAbilityLegalForClass('meteor', 'hybrid')).toBe(true)
  })

  it('rejects duplicate, cross-class and over-budget loadouts with one shared rule', () => {
    expect(
      classLoadoutFitsSlotGrammar('hybrid', [
        'uppercut',
        'marksman_shot',
        'fireball',
        'lightning_dash',
        'arc_lift',
        'meteor',
      ]),
    ).toBe(true)
    expect(classLoadoutFitsSlotGrammar('hybrid', ['uppercut', 'uppercut'])).toBe(false)
    expect(classLoadoutFitsSlotGrammar('tank', ['fireball'])).toBe(false)
    expect(
      classLoadoutFitsSlotGrammar('hybrid', ['fireball', 'lightning_dash', 'chain_bolt']),
    ).toBe(false)
  })

  it('infers a persisted class only when the loadout still fits a class grammar', () => {
    expect(inferClassFromLoadout(['brace_recovery', 'uppercut'])).toBe('tank')
    expect(
      inferClassFromLoadout(['pin_shot', 'marksman_shot', 'frost_bolt', 'fireball', 'chain_bolt']),
    ).toBe('archer')
    expect(inferClassFromLoadout(['uppercut', 'fireball', 'arc_lift', 'adaptive_mend'])).toBe(
      'hybrid',
    )
    expect(inferClassFromLoadout(['uppercut', 'fireball', 'lightning_dash', 'chain_bolt'])).toBe(
      null,
    )
  })

  it('validates the starter build family budgets for all four classes', () => {
    // Verify each starter build satisfies its class slot budget.
    // These are the same builds used in CLASS_STARTER_PRESETS and DEFAULT_LOADOUT.
    const starters: Record<string, string[]> = {
      tank: [
        'uppercut',
        'gap_closer',
        'guard_break',
        'piercing_shot',
        'disengage_shot',
        'brace_recovery',
        'barrier',
        'quick_dash',
      ],
      archer: [
        'pin_shot',
        'marksman_shot',
        'disengage_shot',
        'frost_bolt',
        'fireball',
        'lightning_dash',
        'hunters_flow',
        'quick_dash',
      ],
      mage: [
        'fireball',
        'frost_bolt',
        'dark_barrier',
        'eruption',
        'meteor',
        'frost_pillar',
        'arcane_rebind',
        'phase_shift',
      ],
      hybrid: [
        'uppercut',
        'marksman_shot',
        'fireball',
        'lightning_dash',
        'arc_lift',
        'meteor',
        'adaptive_mend',
        'quick_dash',
      ],
    }

    for (const [classId, build] of Object.entries(starters)) {
      // 1. All abilities are legal for this class
      for (const id of build) {
        expect(
          isAbilityLegalForClass(id, classId as Parameters<typeof isAbilityLegalForClass>[1]),
          `${id} should be legal for ${classId}`,
        ).toBe(true)
      }

      // 2. Family counts must stay within class slot budget
      const classDef = TARGET_CLASS_DEFS[classId as keyof typeof TARGET_CLASS_DEFS]
      const budget = classDef.slots
      const used: Record<string, number> = {}
      for (const id of build) {
        const family = getAbilitySlotFamily(id)
        used[family] = (used[family] ?? 0) + 1
      }
      for (const [family, count] of Object.entries(used)) {
        expect(
          count,
          `${classId} uses ${count} ${family} slots but budget is ${budget[family as keyof typeof budget]}`,
        ).toBeLessThanOrEqual(budget[family as keyof typeof budget] ?? 0)
      }

      // 3. Exactly 8 slots (no duplicates counted, but length matters)
      expect(build.length, `${classId} starter must be 8 slots`).toBe(TARGET_LOADOUT_SLOT_COUNT)
    }
  })
})
