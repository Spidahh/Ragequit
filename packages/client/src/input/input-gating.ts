// "Is the player actually driving the game right now?"
//
// Extracted out of main.ts (file-budget: AGENTS.md). These predicates decide
// whether a key press is a game input or a UI input, so getting one wrong means
// either the pause menu eats your movement or your movement eats the menu.
//
// Two distinct questions, deliberately kept apart:
//  • canEngage — the pointer may be locked and the world clicked on. True in the
//    warmup and between rounds; you can look around before the bell.
//  • inputAllowed — combat input counts. Additionally requires a live match.

export interface InputGatingDeps {
  /** Null until the room is joined. */
  isConnected: () => boolean
  /** The replicated match phase; only 'live' accepts combat input. */
  matchPhase: () => string
  pauseMenu: HTMLElement
  settingsOverlay: HTMLElement
}

export interface InputGating {
  isPauseMenuOpen: () => boolean
  isOverlayOpen: (el: HTMLElement) => boolean
  loadoutStationHidden: () => boolean
  /** Pointer lock / world clicks are allowed. */
  canEngageGameplaySurface: () => boolean
  /** Movement and combat keys count. */
  isGameplayInputAllowed: () => boolean
}

const isHidden = (el: HTMLElement | null): boolean => el?.classList.contains('hidden') ?? true

export function createInputGating(deps: InputGatingDeps): InputGating {
  const isPauseMenuOpen = (): boolean => !deps.pauseMenu.classList.contains('hidden')
  const isOverlayOpen = (el: HTMLElement): boolean => !el.classList.contains('hidden')
  // Looked up per call: the station is built lazily, so a reference captured at
  // boot would be null forever.
  const loadoutStationHidden = (): boolean => isHidden(document.getElementById('loadout-station'))

  const noBlockingSurface = (): boolean =>
    loadoutStationHidden() &&
    !isPauseMenuOpen() &&
    !isOverlayOpen(deps.settingsOverlay) &&
    !document.body.classList.contains('main-menu-active') &&
    !document.body.classList.contains('loadout-active')

  const canEngageGameplaySurface = (): boolean => deps.isConnected() && noBlockingSurface()

  return {
    isPauseMenuOpen,
    isOverlayOpen,
    loadoutStationHidden,
    canEngageGameplaySurface,
    isGameplayInputAllowed: () => canEngageGameplaySurface() && deps.matchPhase() === 'live',
  }
}
