import { ABILITY_DEFS, TICK_RATE_HZ } from '@ragequit/shared'

import { abilityIconMarkup } from '../icons.js'
import { slotKeybindEntries } from '../input/keybinds.js'

export const ELEMENT_COLOR: Record<string, string> = {
  fire: '#ff6a2a',
  ice: '#6dd6ff',
  lightning: '#ffe244',
  dark: '#b870ff',
  nature: '#80e860',
  none: '#9ba0b4',
}

export interface CooldownLookup {
  get?: (key: string) => number | undefined
}

export interface CooldownStripController {
  currentSignature: () => string
  flashFailed: (abilityId: string) => void
  markPending: (abilityId: string) => void
  rebuild: (loadout: ReadonlyArray<string>) => void
  signature: (loadout: ReadonlyArray<string>) => string
  updateAbilityCooldowns: (options: {
    abilityCooldowns: CooldownLookup | undefined
    placementAbilityId: string | null
    primedSlotIdx: number | null
    tickNow: number
  }) => void
}

// SVG arc circumference for the cooldown ring (r=18 px).
const CD_ARC_R = 18
const CD_ARC_CIRC = 2 * Math.PI * CD_ARC_R

export function initCooldownStrip(
  root: HTMLElement,
  onSlotClick: (slotIdx: number) => void,
): CooldownStripController {
  const pipEls = new Map<string, HTMLElement>()
  let loadoutRef: ReadonlyArray<string> = []
  let loadoutSig = ''

  function signature(loadout: ReadonlyArray<string>): string {
    return Array.from(loadout).join('|')
  }

  function rebuild(loadout: ReadonlyArray<string>): void {
    loadoutRef = Array.from(loadout)
    loadoutSig = signature(loadoutRef)
    root.replaceChildren()
    pipEls.clear()

    const abilitySection = document.createElement('div')
    abilitySection.className = 'hotbar-section ability-section'
    abilitySection.innerHTML = '<div class="hotbar-title"><span>E</span><b>Ability Wheel</b></div>'
    const abilityRail = document.createElement('div')
    abilityRail.className = 'hotbar-rail'
    abilitySection.appendChild(abilityRail)

    const utilitySection = document.createElement('div')
    utilitySection.className = 'hotbar-section utility-section'
    utilitySection.innerHTML = '<div class="hotbar-title"><span>Q</span><b>Utility Wheel</b></div>'
    const utilityRail = document.createElement('div')
    utilityRail.className = 'hotbar-rail'
    utilitySection.appendChild(utilityRail)

    for (const [, label, slotIdx] of slotKeybindEntries()) {
      const id = loadout[slotIdx] ?? ''
      if (!id) continue
      const def = ABILITY_DEFS[id]
      const elemColor = ELEMENT_COLOR[def?.element ?? 'none'] ?? ELEMENT_COLOR['none']!
      const hasMana = (def?.costMana ?? 0) > 0
      const hasStamina = (def?.costStamina ?? 0) > 0

      const costParts: string[] = []
      if (hasMana) costParts.push(`${def!.costMana}mp`)
      if (hasStamina) costParts.push(`${def!.costStamina}sp`)
      const costStr = costParts.length > 0 ? `  · ${costParts.join(' ')}` : ''
      const tooltip = def
        ? `${def.name}\nCD ${def.cooldownSec}s${costStr}\n${def.miniMalus ?? ''}`
        : id

      const elemLabel =
        def?.element && def.element !== 'none'
          ? def.element.toUpperCase()
          : (def?.slot.toUpperCase() ?? '')
      const cdLabel = def ? `${def.cooldownSec}s CD` : ''
      const costLabel = costParts.length > 0 ? costParts.join(' · ') : 'free'
      const malusHtml = def?.miniMalus ? `<div class="tt-malus">${def.miniMalus}</div>` : ''

      const pip = document.createElement('div')
      const isUtility = slotIdx >= 7
      pip.className = `cd-pip ready ${isUtility ? 'utility-pip' : 'ability-pip'}`
      pip.dataset['abilityId'] = id
      pip.dataset['slotIdx'] = String(slotIdx)
      pip.title = tooltip
      pip.style.setProperty('--elem-color', elemColor)

      const icon = abilityIconMarkup(id)
      pip.innerHTML = `
        <svg class="cd-arc" viewBox="0 0 44 44" width="44" height="44">
          <circle class="cd-arc-bg" cx="22" cy="22" r="${CD_ARC_R}"/>
          <circle class="cd-arc-fill" cx="22" cy="22" r="${CD_ARC_R}"
            stroke-dasharray="${CD_ARC_CIRC}" stroke-dashoffset="${CD_ARC_CIRC}"
            transform="rotate(-90 22 22)"/>
        </svg>
        <span class="label">${label}</span>
        <span class="ability-icon">${icon}</span>
        <span class="ability-name">${def?.name ?? id}</span>
        <span class="cd-timer">-</span>
        ${hasMana ? '<span class="cost-dot mana"></span>' : ''}
        ${hasStamina ? '<span class="cost-dot stam"></span>' : ''}
        <div class="ability-tooltip">
          <div class="tt-name">${icon} <span>${def?.name ?? id}</span></div>
          <div class="tt-el">${elemLabel}${cdLabel ? ' · ' + cdLabel : ''}</div>
          <div class="tt-cost">${costLabel}</div>
          ${malusHtml}
        </div>
      `
      pip.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        onSlotClick(slotIdx)
      })
      ;(isUtility ? utilityRail : abilityRail).appendChild(pip)
      pipEls.set(id, pip)
    }
    root.appendChild(abilitySection)
    root.appendChild(utilitySection)
  }

  function markPending(abilityId: string): void {
    const pip = pipEls.get(abilityId)
    if (!pip) return
    pip.classList.add('pending')
    setTimeout(() => pip.classList.remove('pending'), 400)
  }

  function flashFailed(abilityId: string): void {
    const pip = pipEls.get(abilityId)
    if (!pip) return
    pip.classList.remove('pending')
    pip.classList.add('fail-flash')
    setTimeout(() => pip.classList.remove('fail-flash'), 400)
  }

  function updateAbilityCooldowns({
    abilityCooldowns,
    placementAbilityId,
    primedSlotIdx,
    tickNow,
  }: {
    abilityCooldowns: CooldownLookup | undefined
    placementAbilityId: string | null
    primedSlotIdx: number | null
    tickNow: number
  }): void {
    for (const [, label, slotIdx] of slotKeybindEntries()) {
      const id = loadoutRef[slotIdx] ?? ''
      const pip = pipEls.get(id)
      if (!pip) continue
      const readyTick = (abilityCooldowns?.get?.(id) ?? 0) as number
      const arcEl = pip.querySelector<SVGCircleElement>('.cd-arc-fill')
      const labelEl = pip.querySelector<HTMLElement>('.label')
      const timerEl = pip.querySelector<HTMLElement>('.cd-timer')
      if (readyTick > tickNow) {
        const left = (readyTick - tickNow) / TICK_RATE_HZ
        const def = ABILITY_DEFS[id]
        const totalSec = def?.cooldownSec ?? 1
        const ratio = Math.min(1, left / totalSec)
        pip.classList.remove('ready', 'pending')
        pip.classList.add('cooling')
        if (labelEl) labelEl.textContent = label
        if (timerEl) timerEl.textContent = left < 1 ? left.toFixed(1) : left.toFixed(0)
        if (arcEl) arcEl.style.strokeDashoffset = String(CD_ARC_CIRC * ratio)
      } else {
        const wasCooling = pip.classList.contains('cooling')
        pip.classList.add('ready')
        pip.classList.remove('cooling', 'pending')
        if (labelEl) labelEl.textContent = label
        if (timerEl) timerEl.textContent = ''
        if (arcEl) arcEl.style.strokeDashoffset = String(CD_ARC_CIRC)
        if (wasCooling) {
          pip.classList.remove('cd-ready-flash')
          void pip.offsetWidth
          pip.classList.add('cd-ready-flash')
          setTimeout(() => pip.classList.remove('cd-ready-flash'), 500)
        }
      }
      pip.classList.toggle('primed', slotIdx === primedSlotIdx)
      pip.classList.toggle('placing', id === placementAbilityId)
    }
  }

  // Start empty; rebuild() is called by self-hud when the real loadout arrives.
  rebuild([])

  return {
    currentSignature: () => loadoutSig,
    flashFailed,
    markPending,
    rebuild,
    signature,
    updateAbilityCooldowns,
  }
}
