import { ABILITY_DEFS } from '@ragequit/shared'

import { abilityIconMarkup } from '../icons.js'
import { abilityReadability } from '../loadout/ability-format.js'

export type AbilityReadoutMode = 'primed' | 'placement' | 'cast'

export interface AbilityReadoutController {
  show: (abilityId: string, mode: AbilityReadoutMode) => void
  hide: () => void
}

export function initAbilityReadout(root: HTMLElement): AbilityReadoutController {
  let hideTimer = 0

  function hide(): void {
    window.clearTimeout(hideTimer)
    root.classList.remove('visible', 'mode-primed', 'mode-placement', 'mode-cast')
  }

  function show(abilityId: string, mode: AbilityReadoutMode): void {
    const def = ABILITY_DEFS[abilityId]
    if (!def) return
    const readable = abilityReadability(def)
    const kicker =
      mode === 'primed'
        ? 'PRONTA · LMB PER USARE'
        : mode === 'placement'
          ? 'POSIZIONAMENTO'
          : 'ATTIVATA'
    root.innerHTML = `
      <span class="ar-icon">${abilityIconMarkup(def.id)}</span>
      <span class="ar-copy">
        <small>${kicker}</small>
        <b>${def.name}</b>
        <span>${readable.shapeLabel} · ${readable.outcome}</span>
      </span>
    `
    root.classList.remove('mode-primed', 'mode-placement', 'mode-cast')
    root.classList.add('visible', `mode-${mode}`)
    window.clearTimeout(hideTimer)
    hideTimer = window.setTimeout(hide, mode === 'placement' ? 2200 : 1250)
  }

  return { show, hide }
}
