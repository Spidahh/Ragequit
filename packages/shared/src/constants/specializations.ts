// ---------------------------------------------------------------------------
// Specialisations — the third axis of a build.
//
// The owner's definition of what this game IS, in his words: you pick a build
// out of many combinations of CLASS, ABILITIES and SPECIALISATIONS, and take it
// into an arena. Two of those three shipped. This is the third.
//
// LEARNING FROM THE ONE THAT WAS DELETED. There was a Mastery system once
// (`03_mastery_system.md` and `constants/mastery.ts`, removed in 6a7839a). It
// activated when 4 of your 5 magic slots shared an element, and granted an
// element bonus. It died because it was INFERRED, not chosen: it did not
// express a decision, it taxed you for mixing elements. A player never picked
// Mastery — they discovered they had one.
//
// So a specialisation here is an explicit pick, made in the Forge, visible on
// the build, and legal only for its class. It is not derived from anything.
//
// WHY THESE MODIFIERS AND NOT DAMAGE. Every specialisation deliberately avoids
// touching flat outgoing damage. The TTK band is 6-9 s and the classes measure
// 6.3-7.9 s (config/ttk.ts), so a +15 % damage specialisation would push the
// archer straight out of the bottom of the band and quietly undo D1. What is
// left is more interesting anyway: how long your launch hangs, how often your
// kit is available, how fast you move, how much you can take. Those change how
// a build PLAYS without changing how long a fight lasts.
//
// Every one has a real malus on the same line as its bonus. A specialisation
// with no cost is not a choice, it is a patch note.
// ---------------------------------------------------------------------------
import { TARGET_CLASS_DEFS, type ClassId } from './classes.js'

export interface SpecializationDef {
  id: string
  classId: ClassId
  name: string
  /** What it gives you — shown as the primary line in the Forge. */
  description: string
  /** What it costs you. Same convention as AbilityDef.miniMalus. */
  miniMalus: string
  /** Multiplier on knockup airtime. Still clamped by MAX_AIRBORNE_SEC. */
  knockupAirtimeMult: number
  /** Multiplier on every ability cooldown. */
  cooldownMult: number
  /** Multiplier on base move speed. */
  moveSpeedMult: number
  /** Multiplier on the class HP pool. */
  maxHpMult: number
}

const NEUTRAL = {
  knockupAirtimeMult: 1,
  cooldownMult: 1,
  moveSpeedMult: 1,
  maxHpMult: 1,
} as const

/**
 * Four archetypes, three offered per class.
 *
 * The archetypes repeat across classes on purpose — what differs is the class
 * they sit on. "Bulwark on a tank" and "Bulwark on a mage" are different builds
 * because the tank and the mage are different, and inventing twelve unrelated
 * mechanics would make the choice unlearnable rather than deep.
 */
export const SPECIALIZATION_DEFS: Readonly<Record<string, SpecializationDef>> = Object.freeze({
  // --- Impact: the launch hangs longer, so the punish window is real --------
  tank_impact: {
    ...NEUTRAL,
    id: 'tank_impact',
    classId: 'tank',
    name: 'Impatto',
    description: 'I tuoi lanci in aria durano il 25% in più: hai tempo di punire.',
    miniMalus: '-8% vita massima.',
    knockupAirtimeMult: 1.25,
    maxHpMult: 0.92,
  },
  hybrid_impact: {
    ...NEUTRAL,
    id: 'hybrid_impact',
    classId: 'hybrid',
    name: 'Impatto',
    description: 'I tuoi lanci in aria durano il 25% in più: hai tempo di punire.',
    miniMalus: '-8% vita massima.',
    knockupAirtimeMult: 1.25,
    maxHpMult: 0.92,
  },
  mage_impact: {
    ...NEUTRAL,
    id: 'mage_impact',
    classId: 'mage',
    name: 'Impatto',
    description: 'I tuoi lanci in aria durano il 25% in più: hai tempo di punire.',
    miniMalus: '-8% vita massima.',
    knockupAirtimeMult: 1.25,
    maxHpMult: 0.92,
  },

  // --- Bulwark: you take more before you break -----------------------------
  tank_bulwark: {
    ...NEUTRAL,
    id: 'tank_bulwark',
    classId: 'tank',
    name: 'Baluardo',
    description: '+12% vita massima. Reggi uno scambio in più di chiunque altro.',
    miniMalus: '-6% velocità di movimento.',
    moveSpeedMult: 0.94,
    maxHpMult: 1.12,
  },
  mage_bulwark: {
    ...NEUTRAL,
    id: 'mage_bulwark',
    classId: 'mage',
    name: 'Baluardo',
    description: '+12% vita massima. Sopravvivi al primo che ti arriva addosso.',
    miniMalus: '-6% velocità di movimento.',
    moveSpeedMult: 0.94,
    maxHpMult: 1.12,
  },

  // --- Cadence: the whole kit comes back sooner ----------------------------
  tank_cadence: {
    ...NEUTRAL,
    id: 'tank_cadence',
    classId: 'tank',
    name: 'Cadenza',
    description: '-15% su tutti i cooldown: la build intera è disponibile più spesso.',
    miniMalus: '-10% vita massima.',
    cooldownMult: 0.85,
    maxHpMult: 0.9,
  },
  archer_cadence: {
    ...NEUTRAL,
    id: 'archer_cadence',
    classId: 'archer',
    name: 'Cadenza',
    description: '-15% su tutti i cooldown: la build intera è disponibile più spesso.',
    miniMalus: '-10% vita massima.',
    cooldownMult: 0.85,
    maxHpMult: 0.9,
  },
  mage_cadence: {
    ...NEUTRAL,
    id: 'mage_cadence',
    classId: 'mage',
    name: 'Cadenza',
    description: '-15% su tutti i cooldown: la build intera è disponibile più spesso.',
    miniMalus: '-10% vita massima.',
    cooldownMult: 0.85,
    maxHpMult: 0.9,
  },
  hybrid_cadence: {
    ...NEUTRAL,
    id: 'hybrid_cadence',
    classId: 'hybrid',
    name: 'Cadenza',
    description: '-15% su tutti i cooldown: la build intera è disponibile più spesso.',
    miniMalus: '-10% vita massima.',
    cooldownMult: 0.85,
    maxHpMult: 0.9,
  },

  // --- Momentum: you are simply harder to catch ----------------------------
  archer_momentum: {
    ...NEUTRAL,
    id: 'archer_momentum',
    classId: 'archer',
    name: 'Slancio',
    description: '+8% velocità di movimento. Detti tu la distanza dello scontro.',
    miniMalus: '-10% vita massima.',
    moveSpeedMult: 1.08,
    maxHpMult: 0.9,
  },
  hybrid_momentum: {
    ...NEUTRAL,
    id: 'hybrid_momentum',
    classId: 'hybrid',
    name: 'Slancio',
    description: '+8% velocità di movimento. Detti tu la distanza dello scontro.',
    miniMalus: '-10% vita massima.',
    moveSpeedMult: 1.08,
    maxHpMult: 0.9,
  },
  archer_impact: {
    ...NEUTRAL,
    id: 'archer_impact',
    classId: 'archer',
    name: 'Impatto',
    description: 'I tuoi lanci in aria durano il 25% in più: hai tempo di punire.',
    miniMalus: '-8% vita massima.',
    knockupAirtimeMult: 1.25,
    maxHpMult: 0.92,
  },
})

/** The neutral build: no specialisation picked. Never null at the sim layer. */
export const NO_SPECIALIZATION: SpecializationDef = Object.freeze({
  ...NEUTRAL,
  id: '',
  classId: 'tank',
  name: 'Nessuna',
  description: 'Nessuna specializzazione.',
  miniMalus: '',
})

/** Every specialisation legal for a class, in display order. */
export function specializationsForClass(classId: ClassId): SpecializationDef[] {
  return Object.values(SPECIALIZATION_DEFS)
    .filter((s) => s.classId === classId)
    .sort((a, b) => a.id.localeCompare(b.id))
}

/**
 * Resolve an id to its modifiers.
 *
 * Returns the neutral set for an unknown id rather than throwing: this runs on
 * the server against whatever a client sent, and an unrecognised string must
 * mean "no bonus", never "crash the room".
 */
export function getSpecialization(id: string | undefined | null): SpecializationDef {
  if (!id) return NO_SPECIALIZATION
  return SPECIALIZATION_DEFS[id] ?? NO_SPECIALIZATION
}

/** Is this specialisation legal for this class? Empty (none) always is. */
export function isLegalSpecialization(id: string | undefined | null, classId: ClassId): boolean {
  if (!id) return true
  return SPECIALIZATION_DEFS[id]?.classId === classId
}

/**
 * The HP pool a build actually fights with.
 *
 * SINGLE SOURCE OF TRUTH. The class pool was read straight from
 * `TARGET_CLASS_DEFS[...].resourceMaxima.hp` in five separate places (spawn,
 * respawn, loadout commit, lifesteal clamp, heal clamp). A specialisation that
 * changes the pool has to change it in all five or the player spawns at one
 * number and heals to another, so there is one function now and the call sites
 * ask it rather than the table.
 */
export function maxHpForBuild(
  classId: ClassId,
  specializationId: string | undefined | null,
): number {
  const base = TARGET_CLASS_DEFS[classId]?.resourceMaxima.hp
  if (base === undefined) return 0
  return Math.round(base * getSpecialization(specializationId).maxHpMult)
}

/**
 * Fold a specialisation's move-speed modifier into a status-derived slow.
 *
 * The controller only understands `slowFraction` (negative = haste), so a
 * speed multiplier has to become one. Shared rather than written twice,
 * because the server runs this for authority and the client runs it for
 * prediction: two copies of this line is a permanent rubber-band waiting for
 * the day one of them is edited.
 */
export function slowFractionWithSpecialization(
  slowFraction: number,
  specializationId: string | undefined | null,
): number {
  const mult = getSpecialization(specializationId).moveSpeedMult
  if (mult === 1) return slowFraction
  return 1 - (1 - slowFraction) * mult
}
