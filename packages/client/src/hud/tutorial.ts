import { ABILITY_DEFS, TARGET_CLASS_DEFS, type ClassId } from '@ragequit/shared'

import { actionLabel } from '../input/keybinds.js'

type SlotAction = Parameters<typeof actionLabel>[0]

// Tutorial HUD — a sequence of control tips shown once per player, on first
// match entry (gated by a localStorage flag). Pure DOM, no game state.

export interface TutorialContext {
  /** The player's ability ids in slot order. */
  loadout?: readonly string[]
  classId?: string
}

/**
 * Which key heals, for THIS build.
 *
 * Resolved here rather than in main.ts because it is tutorial knowledge — what
 * to teach a new player — and the Recovery sits on a different slot per class,
 * so there is no single correct key to hard-code.
 */
function healTipFor(ctx: TutorialContext): string {
  const recoveryId = TARGET_CLASS_DEFS[(ctx.classId ?? '') as ClassId]?.recoveryId
  const idx = ctx.loadout?.findIndex((id) => id === recoveryId) ?? -1
  const name = idx >= 0 ? ABILITY_DEFS[ctx.loadout![idx]!]?.name : undefined
  const key = idx >= 0 ? actionLabel(`slot${idx + 1}` as SlotAction) : undefined
  return key && name
    ? `${key} = ${name.toUpperCase()} — è così che ti curi`
    : 'Ogni build ha una abilità di RECUPERO: è così che ti curi'
}

/**
 * Four tips, one of which is now the answer to "come ci si cura?".
 *
 * Nothing in the game ever told a player that healing exists. There are four
 * tips, they never mentioned it, and the only heal on a default build is the
 * class Recovery sitting on a slot key you would have to guess. The owner asked
 * the question directly, which means the game failed to answer it.
 *
 * The heal tip is BUILT FROM THE ACTUAL BUILD rather than hard-coded, because
 * the Recovery sits on a different slot per class — hard-coding a key here
 * would teach three classes out of four the wrong one.
 *
 * The old third tip advertised the E/Q radial wheels, which were deleted. A
 * tutorial that teaches controls that no longer exist is worse than none.
 */
export function showTutorialIfFirstTime(ctx: TutorialContext = {}): void {
  if (localStorage.getItem('ragequit.tutorial.done') === 'true') return
  localStorage.setItem('ragequit.tutorial.done', 'true')

  const healTip = healTipFor(ctx)

  const TIPS = [
    { delay: 500, dur: 4500, text: 'WASD per muoverti — SPAZIO per saltare' },
    { delay: 5500, dur: 4000, text: 'LMB = attacco base — RMB = parata' },
    { delay: 10000, dur: 4500, text: 'Abilità: 1-4 e Q E R F — premi e parte' },
    { delay: 15000, dur: 5000, text: healTip },
    { delay: 20500, dur: 4000, text: 'TAB cambia arma — ESC pausa' },
  ]

  const overlay = document.createElement('div')
  overlay.id = 'tutorial-overlay'
  overlay.style.cssText = [
    'position:fixed',
    'bottom:120px',
    'left:50%',
    'transform:translateX(-50%)',
    'pointer-events:none',
    'z-index:500',
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'gap:8px',
  ].join(';')
  document.body.appendChild(overlay)

  for (const tip of TIPS) {
    setTimeout(() => {
      const el = document.createElement('div')
      el.style.cssText = [
        'background:rgba(5,8,18,0.88)',
        'border:1px solid rgba(212,160,74,0.35)',
        'border-radius:4px',
        'padding:7px 18px',
        'font:600 12px/1.3 Rajdhani,ui-monospace,monospace',
        'color:#d4c0a0',
        'letter-spacing:.06em',
        'text-transform:uppercase',
        'opacity:0',
        'transition:opacity .35s',
      ].join(';')
      el.textContent = tip.text
      overlay.appendChild(el)
      requestAnimationFrame(() => {
        el.style.opacity = '1'
      })
      setTimeout(() => {
        el.style.opacity = '0'
        setTimeout(() => el.remove(), 400)
      }, tip.dur - 400)
    }, tip.delay)
  }

  // Remove overlay after all tips
  setTimeout(() => overlay.remove(), 20500)
}
