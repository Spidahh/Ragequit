// Is this loadout message a legal build?
//
// Lifted out of GameRoom.handleLoadoutSet, which was 155 lines of which 119 were
// validation interleaved with `client.send` rejection notices — so none of it
// could be unit-tested without a room, a client and a socket. It is a pure
// function over the message now: a build goes in, an acceptance or a reason
// comes out, and the room's job shrinks to sending the reason and committing
// the result.
//
// Every rejection returns a REASON rather than silently dropping a field. A
// build that is quietly corrected is a build the player did not make, and they
// find out in the arena.
import {
  ABILITY_DEFS,
  CLASS_IDS,
  TARGET_CLASS_DEFS,
  getAbilitySlotFamily,
  isAbilityLegalForClass,
  isLegalSpecialization,
  type ClassId,
  type ClientLoadoutMessage,
} from '@ragequit/shared'

/**
 * How many `survival` / `counter` abilities a build may bring to a TOURNAMENT.
 *
 * A four-defensive build is legal everywhere else and merely slow. In a mode
 * where death is final it is the dominant strategy, because refusing to lose is
 * the same as winning: a Mago can field `arcane_rebind + phase_shift +
 * dark_barrier + healing_totem`, a Tank `brace_recovery + barrier + phase_shift
 * + disengage_shot`. 00_truth.md D22 names this as the right instrument, and
 * this is the one mode that needs it.
 */
export const TOURNAMENT_MAX_DEFENSIVE_PICKS = 1

export type LoadoutValidation =
  | { ok: true; classId: ClassId; slots: string[]; specializationId: string }
  | { ok: false; reason: string }

export function validateLoadoutMessage(msg: ClientLoadoutMessage, mode = ''): LoadoutValidation {
  // Dynamic Class Validation
  const classId: ClassId =
    msg.classId && CLASS_IDS.includes(msg.classId as ClassId) ? (msg.classId as ClassId) : 'hybrid'

  // Reject malformed / oversized payloads before any per-element work. A
  // legit client sends <= 8 ids total; without this an array of millions of
  // empty strings would be spread + iterated (the `id === ''` skip below has
  // no length bound), stalling the single-threaded room tick (event-loop DoS).
  const MAX_SLOT_IDS = 32
  const fields = [msg.melee, msg.bow, msg.magicBase, msg.magicAdvanced, msg.utility]
  let totalIds = 0
  for (const f of fields) {
    if (f !== undefined && !Array.isArray(f)) {
      return { ok: false, reason: 'loadout rejected: malformed payload' }
    }
    totalIds += f?.length ?? 0
  }
  if (totalIds > MAX_SLOT_IDS) {
    return { ok: false, reason: 'loadout rejected: too many slots' }
  }

  // Build the canonical flat ability list from the class-aware envelope.
  // Each array contains ids for one slot family; order within arrays is
  // preserved but the server validates by family budget, not position.
  const slots: string[] = [
    ...(msg.melee ?? []),
    ...(msg.bow ?? []),
    ...(msg.magicBase ?? []),
    ...(msg.magicAdvanced ?? []),
    ...(msg.utility ?? []),
  ]

  // --- Budget-based family validation ---
  // Instead of positional slot matching (which breaks for Tank that has 3 melee
  // but the wire sends them all in different fields), we validate that the
  // abilities provided fit within the class's declared family budget.
  //
  // E.g., Tank: { melee:3, bow:2, magicBase:0, magicAdvanced:0, utility:6 }
  // We count how many of each family are in the submitted slots and ensure
  // the class has enough room for each.
  const classDef = TARGET_CLASS_DEFS[classId]
  const budget = {
    melee: classDef.slots.melee,
    bow: classDef.slots.bow,
    magicBase: classDef.slots.magicBase,
    magicAdvanced: classDef.slots.magicAdvanced,
    utility: classDef.slots.utility,
  }
  const used: Record<string, number> = {}
  const seenIds = new Set<string>()

  for (let i = 0; i < slots.length; i++) {
    const id = slots[i]!
    if (id === '') continue

    // 1. Known ability?
    const def = ABILITY_DEFS[id]
    if (!def) {
      return { ok: false, reason: `loadout rejected: unknown ability "${id}"` }
    }

    // 2. Duplicate?
    if (seenIds.has(id)) {
      return { ok: false, reason: `loadout rejected: duplicate ability "${id}"` }
    }
    seenIds.add(id)

    // 3. Legal for this class?
    if (!isAbilityLegalForClass(id, classId)) {
      return {
        ok: false,
        reason: `loadout rejected: ability "${id}" is not legal for class ${classId}`,
      }
    }

    // 4. Family budget check — does the class have room for one more of this family?
    const family = getAbilitySlotFamily(id)
    used[family] = (used[family] ?? 0) + 1
    if ((used[family] ?? 0) > (budget[family] ?? 0)) {
      return {
        ok: false,
        reason: `loadout rejected: class ${classId} has no ${family} slot for "${id}" (budget ${budget[family] ?? 0})`,
      }
    }
  }

  // The third axis is validated exactly like the other two: a specialisation
  // that does not belong to the chosen class is rejected, not silently
  // dropped, because silently dropping it means the player fights a build
  // they did not build.
  const specId = msg.specializationId ?? ''
  if (!isLegalSpecialization(specId, classId)) {
    return {
      ok: false,
      reason: `loadout rejected: specialisation "${specId}" is not legal for ${classId}`,
    }
  }

  if (mode === 'tournament') {
    const defensive = slots.filter((id) => {
      const role = ABILITY_DEFS[id]?.comboRole
      return role === 'survival' || role === 'counter'
    })
    if (defensive.length > TOURNAMENT_MAX_DEFENSIVE_PICKS) {
      return {
        ok: false,
        reason:
          `loadout rejected: in torneo puoi portare al massimo ${TOURNAMENT_MAX_DEFENSIVE_PICKS} ` +
          `abilità difensiva (survival/counter), ne hai ${defensive.length}`,
      }
    }
  }

  return { ok: true, classId, slots, specializationId: specId }
}
