import { describe, expect, it } from 'vitest'

import { CLASS_IDS, TARGET_CLASS_DEFS, type ClassId } from './classes.js'
import { TTK_MAX_SEC, TTK_MIN_SEC } from './combat.js'
import {
  SPECIALIZATION_DEFS,
  getSpecialization,
  isLegalSpecialization,
  maxHpForBuild,
  slowFractionWithSpecialization,
  specializationsForClass,
} from './specializations.js'

describe('the specialisation roster', () => {
  it('offers a real choice to every class', () => {
    for (const classId of CLASS_IDS) {
      expect(specializationsForClass(classId).length, classId).toBeGreaterThanOrEqual(3)
    }
  })

  it('names its class correctly on every entry', () => {
    for (const [id, def] of Object.entries(SPECIALIZATION_DEFS)) {
      expect(def.id, id).toBe(id)
      expect(CLASS_IDS).toContain(def.classId)
    }
  })

  // A specialisation with no cost is not a choice, it is a patch note.
  it('charges for every bonus', () => {
    for (const def of Object.values(SPECIALIZATION_DEFS)) {
      const mods = [def.knockupAirtimeMult, def.cooldownMult, def.moveSpeedMult, def.maxHpMult]
      const better = mods.filter((m, i) => (i === 1 ? m < 1 : m > 1))
      const worse = mods.filter((m, i) => (i === 1 ? m > 1 : m < 1))
      expect(better.length, `${def.id} grants nothing`).toBeGreaterThan(0)
      expect(worse.length, `${def.id} costs nothing`).toBeGreaterThan(0)
      expect(def.miniMalus.length, `${def.id} has no stated malus`).toBeGreaterThan(0)
    }
  })

  // D1's band is enforced against the base registry. A specialisation that
  // moved flat damage would slip past that test and undo it silently, so none
  // of them touch damage at all — see the header of specializations.ts.
  it('never touches outgoing damage, so the TTK band still means something', () => {
    expect(TTK_MIN_SEC).toBeLessThan(TTK_MAX_SEC)
    for (const def of Object.values(SPECIALIZATION_DEFS)) {
      expect(Object.keys(def)).not.toContain('damageMult')
    }
  })
})

describe('legality', () => {
  it('accepts a specialisation only for its own class', () => {
    for (const def of Object.values(SPECIALIZATION_DEFS)) {
      expect(isLegalSpecialization(def.id, def.classId)).toBe(true)
      for (const other of CLASS_IDS.filter((c) => c !== def.classId)) {
        expect(isLegalSpecialization(def.id, other), `${def.id} on ${other}`).toBe(false)
      }
    }
  })

  it('treats "none" as legal everywhere', () => {
    for (const classId of CLASS_IDS) {
      expect(isLegalSpecialization('', classId)).toBe(true)
      expect(isLegalSpecialization(undefined, classId)).toBe(true)
    }
  })

  // This runs on the server against whatever a client sent. An unrecognised
  // string must mean "no bonus", never "crash the room".
  it('resolves garbage to the neutral set instead of throwing', () => {
    const spec = getSpecialization('not_a_specialisation')
    expect(spec.maxHpMult).toBe(1)
    expect(spec.cooldownMult).toBe(1)
    expect(getSpecialization(null).moveSpeedMult).toBe(1)
  })
})

describe('maxHpForBuild', () => {
  it('returns the class pool when nothing is picked', () => {
    for (const classId of CLASS_IDS) {
      expect(maxHpForBuild(classId, '')).toBe(TARGET_CLASS_DEFS[classId].resourceMaxima.hp)
    }
  })

  it('applies the pick, rounded to a whole point of HP', () => {
    const def = Object.values(SPECIALIZATION_DEFS).find((s) => s.maxHpMult !== 1)!
    const base = TARGET_CLASS_DEFS[def.classId].resourceMaxima.hp
    const hp = maxHpForBuild(def.classId, def.id)
    expect(hp).toBe(Math.round(base * def.maxHpMult))
    expect(Number.isInteger(hp)).toBe(true)
  })

  it('ignores a specialisation belonging to another class', () => {
    const def = Object.values(SPECIALIZATION_DEFS).find((s) => s.maxHpMult !== 1)!
    const other = CLASS_IDS.find((c) => c !== def.classId) as ClassId
    // getSpecialization does not check legality — that is validateLoadoutMessage's
    // job — so this documents that the two are separate concerns.
    expect(maxHpForBuild(other, '')).toBe(TARGET_CLASS_DEFS[other].resourceMaxima.hp)
  })
})

describe('slowFractionWithSpecialization', () => {
  it('leaves a neutral build untouched', () => {
    expect(slowFractionWithSpecialization(0.3, '')).toBe(0.3)
  })

  it('turns a speed bonus into negative slow (haste)', () => {
    const fast = Object.values(SPECIALIZATION_DEFS).find((s) => s.moveSpeedMult > 1)!
    expect(slowFractionWithSpecialization(0, fast.id)).toBeCloseTo(1 - fast.moveSpeedMult, 6)
    expect(slowFractionWithSpecialization(0, fast.id)).toBeLessThan(0)
  })

  it('compounds with an existing slow instead of replacing it', () => {
    const slow = Object.values(SPECIALIZATION_DEFS).find((s) => s.moveSpeedMult < 1)!
    // Half speed from a status, then the specialisation's own multiplier on top.
    const out = slowFractionWithSpecialization(0.5, slow.id)
    expect(1 - out).toBeCloseTo(0.5 * slow.moveSpeedMult, 6)
  })
})
