// ---------------------------------------------------------------------------
// Subclasses — the second half of a character's identity.
//
// A class says WHAT YOU DO in a fight: BREAKER creates the opening, TALON
// converts it, WARDEN decides where it happens, DRIFT denies it. A subclass says
// HOW you do it, and there are three per class.
//
// Every one is a trade on the same line. A subclass with no cost is not a
// choice, it is a patch note — so each states its malus next to its bonus and
// the Forge prints both.
//
// WHY THESE LEVERS AND NOT DAMAGE. None of them touches outgoing damage. Damage
// changes how long a fight lasts; these change how a fight FEELS to play — how
// long your launch hangs, how often your kit is back, how fast you move, how
// much you can take. That is the axis worth spending an identity on.
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
  // ── BREAKER — you create the opening ─────────────────────────────────────
  breaker_siege: {
    id: 'breaker_siege',
    classId: 'breaker',
    name: 'SIEGE',
    description: 'You hold the ground you take. Bigger health pool, so trading is your game.',
    miniMalus: 'You move slower — nobody has to run from you, they can walk.',
    ...NEUTRAL,
    maxHpMult: 1.12,
    moveSpeedMult: 0.92,
  },
  breaker_ram: {
    id: 'breaker_ram',
    classId: 'breaker',
    name: 'RAM',
    description: 'You open the fight by arriving. Fastest body in the class.',
    miniMalus: 'You gave up the health that made arriving safe.',
    ...NEUTRAL,
    moveSpeedMult: 1.12,
    maxHpMult: 0.9,
  },
  breaker_anvil: {
    id: 'breaker_anvil',
    classId: 'breaker',
    name: 'ANVIL',
    description: 'Whatever you put in the air stays there. The punish window is yours.',
    miniMalus: 'Your kit comes back slower — you get fewer openings to convert.',
    ...NEUTRAL,
    knockupAirtimeMult: 1.28,
    cooldownMult: 1.1,
  },

  // ── TALON — you convert the opening ──────────────────────────────────────
  talon_spire: {
    id: 'talon_spire',
    classId: 'talon',
    name: 'SPIRE',
    description: 'One committed shot, and a long window to land the next one.',
    miniMalus: 'Everything you own is on a longer leash.',
    ...NEUTRAL,
    knockupAirtimeMult: 1.3,
    cooldownMult: 1.15,
  },
  talon_volley: {
    id: 'talon_volley',
    classId: 'talon',
    name: 'VOLLEY',
    description: "You don't wait for the moment. Your kit is always nearly ready.",
    miniMalus: 'Thinner than anyone else on the field.',
    ...NEUTRAL,
    cooldownMult: 0.82,
    maxHpMult: 0.9,
  },
  talon_tether: {
    id: 'talon_tether',
    classId: 'talon',
    name: 'TETHER',
    description: 'You keep pace with what you hit. Nobody walks away from you.',
    miniMalus: 'You chase instead of juggling — your launches hang less.',
    ...NEUTRAL,
    moveSpeedMult: 1.1,
    knockupAirtimeMult: 0.85,
  },

  // ── WARDEN — you decide where it happens ─────────────────────────────────
  warden_bramble: {
    id: 'warden_bramble',
    classId: 'warden',
    name: 'BRAMBLE',
    description: 'The ground is yours again quickly. You can afford to spend it.',
    miniMalus: 'You are slow to leave the ground you claimed.',
    ...NEUTRAL,
    cooldownMult: 0.85,
    moveSpeedMult: 0.92,
  },
  warden_pyre: {
    id: 'warden_pyre',
    classId: 'warden',
    name: 'PYRE',
    description: 'What you lift stays lifted, long enough for the field to finish it.',
    miniMalus: 'You burn some of your own margin to do it.',
    ...NEUTRAL,
    knockupAirtimeMult: 1.22,
    maxHpMult: 0.94,
  },
  warden_hollow: {
    id: 'warden_hollow',
    classId: 'warden',
    name: 'HOLLOW',
    description: 'You outlast. The longer the fight, the more it is your fight.',
    miniMalus: 'Your kit is deliberate — it comes back slowly.',
    ...NEUTRAL,
    maxHpMult: 1.14,
    cooldownMult: 1.12,
  },

  // ── DRIFT — you deny the opening ─────────────────────────────────────────
  drift_phase: {
    id: 'drift_phase',
    classId: 'drift',
    name: 'PHASE',
    description: 'The hardest body in the game to put a shot on.',
    miniMalus: 'And the least able to survive one.',
    ...NEUTRAL,
    moveSpeedMult: 1.14,
    maxHpMult: 0.88,
  },
  drift_slipstream: {
    id: 'drift_slipstream',
    classId: 'drift',
    name: 'SLIPSTREAM',
    description: 'Faster, and ready again sooner. Movement is the whole plan.',
    miniMalus: 'Nothing left over for taking hits.',
    ...NEUTRAL,
    moveSpeedMult: 1.1,
    cooldownMult: 0.9,
    maxHpMult: 0.9,
  },
  drift_echo: {
    id: 'drift_echo',
    classId: 'drift',
    name: 'ECHO',
    description: 'You always have another answer ready. Your kit barely rests.',
    miniMalus: 'You win on information, not on footspeed.',
    ...NEUTRAL,
    cooldownMult: 0.8,
    moveSpeedMult: 0.95,
  },
})

export const NO_SPECIALIZATION: SpecializationDef = Object.freeze({
  ...NEUTRAL,
  id: '',
  classId: 'breaker',
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
