// Resolves a joining player's persisted loadout + class, server-authoritative.
// Extracted out of GameRoom.onJoin (file-budget: AGENTS.md).

import {
  type ClassId,
  ensureLoadoutHasRecovery,
  inferClassFromLoadout,
  loadoutHasRecovery,
  ABILITY_DEFS,
  TARGET_CLASS_DEFS,
} from '@ragequit/shared'

import { loadLoadout } from '../db/supabase.js'

export interface ResolvedPlayerLoadout {
  loadout: readonly string[]
  classId: ClassId
}

// Default loadout applied at onJoin. Matches the client's DEFAULT_SLOTS in
// loadout-station.ts (Ibrido preset build).
// Slots: melee×2, bow×1, magicBase×2, magicAdvanced×1, utility×2 = 8.
// Server validates by family budget, not position.
export const DEFAULT_LOADOUT: readonly string[] = Object.freeze([
  'uppercut', // melee
  'gap_closer', // melee
  'marksman_shot', // bow
  'fireball', // magicBase
  'lightning_dash', // magicBase
  'arc_lift', // magicAdvanced
  'adaptive_mend', // utility — Ibrido Recovery
  'quick_dash', // utility
])

/** notify() surfaces a ServerNote to the joining client when the persisted
 * build had to be auto-corrected (invalid class, missing Recovery). */
export async function resolvePlayerLoadout(
  verifiedUserId: string,
  notify: (text: string) => void,
): Promise<ResolvedPlayerLoadout> {
  let loadout: readonly string[] = DEFAULT_LOADOUT
  if (verifiedUserId) {
    const saved = await loadLoadout(verifiedUserId).catch(() => null)
    if (saved?.loadout_data?.length) loadout = saved.loadout_data
  }

  let classId = inferClassFromLoadout(loadout)
  if (!classId) {
    // Saved loadout cannot be classified — reset to hybrid default and notify.
    loadout = DEFAULT_LOADOUT
    classId = 'drift'
    notify(
      'Il tuo loadout salvato non era compatibile con nessuna classe — ripristinato al preset Ibrido.',
    )
  }

  // Server-authoritative safety net: the slot grammar alone allows a legal
  // build with zero self-sustain (no build should ever go into a match with
  // zero Recovery — client-side choice can't be trusted to enforce this).
  if (!loadoutHasRecovery(classId, loadout)) {
    loadout = ensureLoadoutHasRecovery(classId, loadout)
    const recoveryName = ABILITY_DEFS[TARGET_CLASS_DEFS[classId].recoveryId]?.name
    notify(
      `Il tuo loadout non aveva un'abilità di recupero — ${recoveryName ?? 'una Recovery'} aggiunta automaticamente.`,
    )
  }

  return { loadout, classId }
}
