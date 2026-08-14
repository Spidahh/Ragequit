// ---------------------------------------------------------------------------
// Per-weapon view configuration.
//
// RAGEQUIT is a first-person game. Every weapon. That was decided long ago
// (STILE.md §8: "l'utente vuole 1ª persona per tutte — direzione FPS-only
// intenzionale, stato attuale mixto") and derived from the reference list in
// STILE.md — Mordhau, Chivalry, Vermintide, Dark Messiah, Hexen, Lunacid,
// Witchfire — every one of them first-person melee-and-magic. The decision was
// made and never executed.
//
// What used to be here: the camera PERSPECTIVE was a column in this table. The
// sword was third person, 5.5 m behind the player; bow and staff were first
// person. Weapon swap is a key press in the middle of a fight, and it moved the
// camera 5.5 metres and made the player's own body appear and disappear. No
// shipped action game does that, and nothing else in the game could be designed
// coherently while the player's relationship to the world depended on which
// weapon they were holding.
//
// The sword was third person for one reason: a 2.3 s Mixamo swing crushed into a
// 0.4 s window is unreadable, so the camera was pulled back to hide it. That is
// a presentation bug that grew a camera. It is fixed where it lives, not here.
//
// So this table now holds only what genuinely differs per weapon: how the FOV
// reacts. Everything else about the view is the same for all of them, because
// the player is one person with one body.
// ---------------------------------------------------------------------------
import type { Weapon } from '@ragequit/shared'

export interface WeaponViewConfig {
  /**
   * World-camera FOV delta vs the player's base FOV. A function so the bow can
   * narrow further as the shot charges — the one honest aim-down-sights cue in
   * the game. `charge` is the bow draw ratio 0..1.
   */
  fovDelta: (charge: number) => number
}

export const WEAPON_VIEW: Record<Weapon, WeaponViewConfig> = {
  sword: { fovDelta: () => 0 },
  // Narrows while drawn: the shot gets tighter as you hold it.
  bow: { fovDelta: (charge) => -7 - charge * 5 },
  staff: { fovDelta: () => -3 },
}

/** Look up a weapon's view config; unknown/in-flight weapon keys read as sword. */
export function getWeaponView(weapon: Weapon | string | null | undefined): WeaponViewConfig {
  return (
    (weapon !== null &&
      weapon !== undefined &&
      (WEAPON_VIEW as Record<string, WeaponViewConfig>)[weapon]) ||
    WEAPON_VIEW.sword
  )
}
