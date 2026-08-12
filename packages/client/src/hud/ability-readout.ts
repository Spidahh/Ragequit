import { ABILITY_DEFS } from '@ragequit/shared'

import { abilityIconMarkup } from '../icons.js'
import { abilityReadability } from '../loadout/ability-format.js'

export type AbilityReadoutMode =
  | 'primed'
  | 'placement'
  | 'request'
  | 'windup'
  | 'released'
  | 'failed'

export interface AbilityReadoutController {
  show: (abilityId: string, mode: AbilityReadoutMode, detail?: string) => void
  hide: () => void
}

export function initAbilityReadout(root: HTMLElement): AbilityReadoutController {
  let hideTimer = 0

  function hide(): void {
    window.clearTimeout(hideTimer)
    root.classList.remove(
      'visible',
      'mode-primed',
      'mode-placement',
      'mode-request',
      'mode-windup',
      'mode-released',
      'mode-failed',
      'family-sword',
      'family-bow',
      'family-staff',
      'family-utility',
    )
  }

  function show(abilityId: string, mode: AbilityReadoutMode, detail?: string): void {
    const def = ABILITY_DEFS[abilityId]
    if (!def) return
    const readable = abilityReadability(def)
    const family = def.slot === 'utility' ? 'utility' : def.weapon
    const weaponLabel =
      family === 'sword'
        ? 'SPADA'
        : family === 'bow'
          ? 'ARCO'
          : family === 'staff'
            ? 'STAFF'
            : 'UTILITY'
    const state =
      mode === 'primed'
        ? { kicker: 'SELEZIONATA', instruction: 'LMB PER ATTIVARE' }
        : mode === 'placement'
          ? { kicker: 'MIRA IL TERRENO', instruction: 'LMB CONFERMA · RMB ANNULLA' }
          : mode === 'request'
            ? { kicker: 'INPUT RICEVUTO', instruction: 'IN ATTESA DEL SERVER' }
            : mode === 'windup'
              ? {
                  kicker: 'PREPARAZIONE',
                  instruction: `${def.windupSec.toFixed(1)}s · NON INTERROMPERE`,
                }
              : mode === 'released'
                ? { kicker: 'LANCIATA', instruction: readable.outcome }
                : { kicker: 'BLOCCATA', instruction: detail ?? 'AZIONE NON DISPONIBILE' }
    root.innerHTML = `
      <span class="ar-icon">${abilityIconMarkup(def.id)}</span>
      <span class="ar-copy">
        <small>${state.kicker}</small>
        <b>${def.name}</b>
        <span>${state.instruction}</span>
      </span>
      <span class="ar-family"><b>${weaponLabel}</b><small>${def.element === 'none' ? readable.shapeLabel : def.element.toUpperCase()}</small></span>
    `
    hide()
    root.classList.add('visible', `mode-${mode}`, `family-${family}`)
    window.clearTimeout(hideTimer)
    const duration =
      mode === 'placement'
        ? 0
        : mode === 'primed'
          ? 5000
          : mode === 'request'
            ? 700
            : mode === 'windup'
              ? Math.max(900, def.windupSec * 1000)
              : 1400
    if (duration > 0) hideTimer = window.setTimeout(hide, duration)
  }

  return { show, hide }
}
