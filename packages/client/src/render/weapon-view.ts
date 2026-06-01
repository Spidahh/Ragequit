// ---------------------------------------------------------------------------
// Per-weapon view configuration — the single source of truth for how each
// weapon frames the player.
//
// Every weapon declares its camera view (first vs third person), camera
// offsets, FOV delta, and which first-person viewmodel to show. The render
// loop reads this table instead of scattered inline ternaries, so tuning a
// weapon's feel happens in ONE place.
//
// Invariant: `view: 'first'` weapons hide the player's own character model and
// show a viewmodel; `view: 'third'` weapons show the character (over-shoulder).
// The render loop derives self-visibility from `view` alone, so the body can
// never be shown in first person.
// ---------------------------------------------------------------------------
import { PROJECTILE_MUZZLE_Y_OFFSET_M } from '@ragequit/shared'
import type { Weapon } from '@ragequit/shared'

export type ViewMode = 'first' | 'third'

/** Which first-person viewmodel object the render loop should reveal. */
export type ViewModelKind = 'fpvBow' | 'staticViewmodel' | 'none'

export interface WeaponViewConfig {
  /** First person = camera at the eye, body hidden, viewmodel shown. */
  view: ViewMode
  /** Camera orbit distance behind the player (0 in first person). */
  camBack: number
  /** Camera height above the player origin (eye height vs shoulder). */
  camUp: number
  /**
   * World-camera FOV delta vs the player's base FOV. A function so the bow can
   * narrow further as the shot charges. `charge` is the bow draw ratio 0..1.
   */
  fovDelta: (charge: number) => number
  /** Which viewmodel to reveal in first person. */
  viewModel: ViewModelKind
}

export const WEAPON_VIEW: Record<Weapon, WeaponViewConfig> = {
  // Melee — third-person over-shoulder so the swing arcs read clearly.
  sword: {
    view: 'third',
    camBack: 5.5,
    camUp: 1.3,
    fovDelta: () => 0,
    viewModel: 'none',
  },
  // Bow — first-person, narrows while drawn for an aim-down-sights feel.
  bow: {
    view: 'first',
    camBack: 0,
    camUp: PROJECTILE_MUZZLE_Y_OFFSET_M,
    fovDelta: (charge) => -7 - charge * 5,
    viewModel: 'fpvBow',
  },
  // Staff — first-person, a fixed crisp FOV.
  staff: {
    view: 'first',
    camBack: 0,
    camUp: PROJECTILE_MUZZLE_Y_OFFSET_M,
    fovDelta: () => -3,
    viewModel: 'staticViewmodel',
  },
}

/**
 * Look up a weapon's view config. Falls back to the bow config (first-person,
 * body hidden) for an unknown/in-flight weapon key, so a transient bad value
 * can never flash the player's body in first person — it stays hidden until the
 * real weapon resolves.
 */
export function getWeaponView(weapon: Weapon | string | null | undefined): WeaponViewConfig {
  return (
    (weapon !== null &&
      weapon !== undefined &&
      (WEAPON_VIEW as Record<string, WeaponViewConfig>)[weapon]) ||
    WEAPON_VIEW.bow
  )
}
