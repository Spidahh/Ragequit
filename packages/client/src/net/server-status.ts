// What the connection indicator is allowed to claim, and when.
//
// The Fly machine runs with scale-to-zero (02_TECH/10_deploy_status.md), so the
// first visitor after an idle period pays a cold start and the health probe can
// take seconds — its timeout is 20 s. Booting the menu straight into "offline"
// told every one of those visitors the game was dead while the server was in
// fact waking up for them. The indicator must not claim a verdict it has not
// reached yet: unknown is its own state, not a synonym for down.

export type ServerProbe = 'checking' | 'online' | 'offline'

/**
 * Keyword for the status indicator. It doubles as a CSS class
 * (`status-<keyword with dashes>`), so these strings are styled in game-ui.css
 * and must not be changed without changing the stylesheet too.
 */
export function serverStatusKeyword(probe: ServerProbe): string {
  if (probe === 'checking') return 'checking server'
  return probe === 'online' ? 'server online' : 'server offline'
}
