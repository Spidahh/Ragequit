import { describe, expect, it } from 'vitest'

import { abilityIds } from '../abilities/registry.js'

import {
  CLASS_IDS,
  TARGET_CLASS_DEFS,
  TARGET_LOADOUT_SLOT_COUNT,
  classLoadoutFitsSlotGrammar,
  ensureLoadoutHasRecovery,
  getAbilitySlotFamily,
  inferClassFromLoadout,
  isAbilityLegalForClass,
  loadoutHasRecovery,
  type ClassId,
  targetClassSlotCount,
  CLASS_PRESET_BUILDS,
} from './classes.js'

describe('target class definitions', () => {
  it('keeps every target class on the agreed 8-slot grammar', () => {
    for (const classId of CLASS_IDS) {
      expect(targetClassSlotCount(classId), classId).toBe(TARGET_LOADOUT_SLOT_COUNT)
    }
  })

  it('keeps BREAKER physical and WARDEN staff-only in shared data', () => {
    expect(TARGET_CLASS_DEFS.breaker.weapons).toEqual(['sword', 'bow'])
    expect(TARGET_CLASS_DEFS.warden.weapons).toEqual(['staff'])
  })

  it('keeps each class resource emphasis visible in shared data', () => {
    expect(TARGET_CLASS_DEFS.breaker.resourceMaxima).toEqual({ hp: 280, mana: 60, stamina: 160 })
    expect(TARGET_CLASS_DEFS.talon.resourceMaxima).toEqual({ hp: 200, mana: 90, stamina: 120 })
    expect(TARGET_CLASS_DEFS.warden.resourceMaxima).toEqual({ hp: 250, mana: 160, stamina: 90 })
    expect(TARGET_CLASS_DEFS.drift.resourceMaxima).toEqual({ hp: 250, mana: 110, stamina: 120 })
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
    expect(isAbilityLegalForClass('brace_recovery', 'breaker')).toBe(true)
    expect(isAbilityLegalForClass('brace_recovery', 'talon')).toBe(false)
    expect(isAbilityLegalForClass('brace_recovery', 'warden')).toBe(false)
    expect(isAbilityLegalForClass('brace_recovery', 'drift')).toBe(false)

    expect(isAbilityLegalForClass('hunters_flow', 'talon')).toBe(true)
    expect(isAbilityLegalForClass('hunters_flow', 'breaker')).toBe(false)

    expect(isAbilityLegalForClass('arcane_rebind', 'warden')).toBe(true)
    expect(isAbilityLegalForClass('arcane_rebind', 'breaker')).toBe(false)

    expect(isAbilityLegalForClass('adaptive_mend', 'drift')).toBe(true)
    expect(isAbilityLegalForClass('adaptive_mend', 'breaker')).toBe(false)
  })

  // Le regole del kit, non un elenco di abilità. Un test che elenca membri
  // diventa vecchio a ogni curatela del pool e non protegge niente; questi
  // cadono solo se l'identità di una classe si rompe davvero.
  it('keeps every class kit closed: nobody reaches into another class identity', () => {
    const famOf = (id: string) => getAbilitySlotFamily(id)
    const legalFor = (c: ClassId) => abilityIds().filter((id) => isAbilityLegalForClass(id, c))
    const famsOf = (c: ClassId) => new Set(legalFor(c).map(famOf))

    // WARDEN è la classe di magia: niente mischia, niente arco.
    expect(famsOf('warden').has('melee')).toBe(false)
    expect(famsOf('warden').has('bow')).toBe(false)
    // BREAKER è la classe fisica: niente magia, di nessun tipo.
    expect(famsOf('breaker').has('magicBase')).toBe(false)
    expect(famsOf('breaker').has('magicAdvanced')).toBe(false)
    // TALON tira, non mena.
    expect(famsOf('talon').has('melee')).toBe(false)
  })

  it('DRIFT is a cross-section, never the union of the other classes', () => {
    const famOf = (id: string) => getAbilitySlotFamily(id)
    const legalFor = (c: ClassId) => abilityIds().filter((id) => isAbilityLegalForClass(id, c))
    const drift = new Set(legalFor('drift'))

    // Prende un po' di tutto — è il suo carattere.
    for (const fam of ['melee', 'bow', 'magicBase', 'magicAdvanced'])
      expect([...drift].some((id) => famOf(id) === fam)).toBe(true)

    // Ma NON tutto: era legale per 58 abilità su 61, cioè il 95% del gioco, e
    // una classe che può prendere quasi tutto non è una classe. Nessuna
    // quantità di contenuto nuovo può pareggiarla, perché ogni abilità
    // aggiunta finisce anche a lei.
    expect(drift.size).toBeLessThan(abilityIds().length * 0.6)
    for (const fam of ['melee', 'bow', 'magicBase', 'magicAdvanced']) {
      const inFam = abilityIds().filter((id) => famOf(id) === fam)
      const driftHas = inFam.filter((id) => drift.has(id)).length
      expect(driftHas).toBeLessThan(inFam.length)
    }
  })

  it('no class has a slot that is not a choice', () => {
    const famOf = (id: string) => getAbilitySlotFamily(id)
    for (const c of CLASS_IDS) {
      const pool: Record<string, number> = {}
      for (const id of abilityIds())
        if (isAbilityLegalForClass(id, c)) pool[famOf(id)] = (pool[famOf(id)] ?? 0) + 1
      for (const [fam, need] of Object.entries(TARGET_CLASS_DEFS[c].slots)) {
        if (need <= 0) continue
        // Scegliere 1 fra 1 è un'abilità fissa travestita da slot di build.
        expect(
          pool[fam] ?? 0,
          `${c}.${fam}: chiede ${need}, ne ha ${pool[fam] ?? 0}`,
        ).toBeGreaterThan(need)
      }
    }
  })

  it('each Recovery belongs to exactly one class', () => {
    const recoveries = CLASS_IDS.map((c) => TARGET_CLASS_DEFS[c].recoveryId)
    for (const c of CLASS_IDS) {
      const mine = TARGET_CLASS_DEFS[c].recoveryId
      for (const r of recoveries) expect(isAbilityLegalForClass(r, c)).toBe(r === mine)
    }
  })

  it('rejects duplicate, cross-class and over-budget loadouts with one shared rule', () => {
    // La build legale è COSTRUITA dai dati, non scritta a mano: così il test
    // segue la curatela dei pool invece di rompersi a ogni cambio.
    const famOf = (id: string) => getAbilitySlotFamily(id)
    const buildFor = (c: ClassId): string[] => {
      const out: string[] = []
      for (const [fam, need] of Object.entries(TARGET_CLASS_DEFS[c].slots)) {
        const pick = abilityIds()
          .filter((id) => isAbilityLegalForClass(id, c) && famOf(id) === fam)
          .slice(0, need)
        out.push(...pick)
      }
      return out
    }

    for (const c of CLASS_IDS) expect(classLoadoutFitsSlotGrammar(c, buildFor(c))).toBe(true)

    // Duplicati: mai.
    const first = buildFor('drift')[0]!
    expect(classLoadoutFitsSlotGrammar('drift', [first, first])).toBe(false)

    // Fuori classe: un'abilità del WARDEN non entra nel BREAKER.
    const wardenOnly = abilityIds().find(
      (id) => isAbilityLegalForClass(id, 'warden') && !isAbilityLegalForClass(id, 'breaker'),
    )!
    expect(classLoadoutFitsSlotGrammar('breaker', [wardenOnly])).toBe(false)

    // Oltre budget: una famiglia riempita più di quanto la classe consenta.
    const overFam = Object.entries(TARGET_CLASS_DEFS['warden'].slots).find(([, n]) => n > 0)!
    const tooMany = abilityIds()
      .filter((id) => isAbilityLegalForClass(id, 'warden') && famOf(id) === overFam[0])
      .slice(0, overFam[1] + 1)
    expect(classLoadoutFitsSlotGrammar('warden', tooMany)).toBe(false)
  })

  it('infers a persisted class only when the loadout still fits a class grammar', () => {
    // Una Recovery identifica la sua classe da sola.
    for (const c of CLASS_IDS)
      expect(inferClassFromLoadout([TARGET_CLASS_DEFS[c].recoveryId])).toBe(c)

    // Un miscuglio che nessuna grammatica accetta non infer nulla.
    expect(inferClassFromLoadout(['__nope__', '__also_nope__'])).toBe(null)
  })

  it('detects when a build is missing its class Recovery ability', () => {
    expect(loadoutHasRecovery('breaker', ['uppercut', 'brace_recovery'])).toBe(true)
    expect(loadoutHasRecovery('breaker', ['uppercut', 'quick_dash'])).toBe(false)
  })

  it('ensureLoadoutHasRecovery swaps the last utility slot deterministically', () => {
    const withoutRecovery = ['uppercut', 'gap_closer', 'quick_dash', 'ping_mark']
    const fixed = ensureLoadoutHasRecovery('breaker', withoutRecovery)
    expect(fixed).toEqual(['uppercut', 'gap_closer', 'quick_dash', 'brace_recovery'])
    expect(loadoutHasRecovery('breaker', fixed)).toBe(true)
    // Already-correct loadouts are returned unchanged (same reference).
    expect(ensureLoadoutHasRecovery('breaker', fixed)).toBe(fixed)
  })

  it('ensureLoadoutHasRecovery appends when no utility slot is in use', () => {
    const noUtility = ['uppercut', 'gap_closer']
    expect(ensureLoadoutHasRecovery('breaker', noUtility)).toEqual([
      'uppercut',
      'gap_closer',
      'brace_recovery',
    ])
  })

  it('validates the preset build family budgets for all four classes', () => {
    // Read the REAL presets, never a copy.
    //
    // This test used to hold its own hard-coded duplicate of all four builds,
    // which meant it could not detect drift — only become stale, which it did
    // the moment the Arciere traded a base spell for the ranged launcher it did
    // not have. A test that copies the data it validates validates the copy.
    for (const [classId, build] of Object.entries(CLASS_PRESET_BUILDS)) {
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
      expect(build.length, `${classId} preset must be 8 slots`).toBe(TARGET_LOADOUT_SLOT_COUNT)
    }
  })
})
