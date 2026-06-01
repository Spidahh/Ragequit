import { ABILITY_DEFS, getAbilitySlotFamily, TICK_RATE_HZ } from '@ragequit/shared'
import type { ClassId } from '@ragequit/shared'

import { abilityIconMarkup } from '../icons.js'
import { actionCode, codeToLabel, onKeybindsChanged, SLOT_ACTIONS } from '../input/keybinds.js'

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
  rebuild: (loadout: ReadonlyArray<string>, classId: ClassId) => void
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

type HotbarSectionKind = 'weapon' | 'spell' | 'utility'

interface HotbarSlotMeta {
  kind: HotbarSectionKind
  label: string
  pipClass: string
}

// Every hotbar slot has its own direct key (default 1-8, rebindable). Slots 0-3
// are also reachable on the E wheel and 4-7 on the Q wheel, but the printed bind
// on the hotbar is the direct key — every ability has a key.
export function getSlotKeyLabel(slotIdx: number): string {
  if (slotIdx < 0 || slotIdx >= SLOT_ACTIONS.length) return ''
  return codeToLabel(actionCode(SLOT_ACTIONS[slotIdx]!))
}

function slotMeta(loadout: ReadonlyArray<string>, slotIdx: number): HotbarSlotMeta | null {
  const id = loadout[slotIdx]
  if (!id) return null
  const family = getAbilitySlotFamily(id)
  const label = getSlotKeyLabel(slotIdx)
  if (family === 'utility') return { kind: 'utility', label, pipClass: 'utility-pip pip-utility' }
  if (family === 'magicBase') return { kind: 'spell', label, pipClass: 'spell-pip pip-magic' }
  if (family === 'magicAdvanced')
    return { kind: 'spell', label, pipClass: 'spell-pip pip-magic-adv' }
  if (family === 'melee') return { kind: 'weapon', label, pipClass: 'ability-pip pip-sword' }
  if (family === 'bow') return { kind: 'weapon', label, pipClass: 'ability-pip pip-bow' }
  return null
}

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

  function rebuild(loadout: ReadonlyArray<string>, _classId: ClassId): void {
    loadoutRef = Array.from(loadout)
    loadoutSig = signature(loadoutRef)
    root.replaceChildren()
    pipEls.clear()

    const weaponSection = document.createElement('div')
    weaponSection.className = 'hotbar-section ability-section'
    const weaponRail = document.createElement('div')
    weaponRail.className = 'hotbar-rail'
    weaponSection.appendChild(weaponRail)

    const spellSection = document.createElement('div')
    spellSection.className = 'hotbar-section spell-section'
    const spellRail = document.createElement('div')
    spellRail.className = 'hotbar-rail'
    spellSection.appendChild(spellRail)

    const utilitySection = document.createElement('div')
    utilitySection.className = 'hotbar-section utility-section'
    const utilityRail = document.createElement('div')
    utilityRail.className = 'hotbar-rail'
    utilitySection.appendChild(utilityRail)

    for (let slotIdx = 0; slotIdx < loadout.length; slotIdx++) {
      const id = loadout[slotIdx] ?? ''
      if (!id) continue
      const def = ABILITY_DEFS[id]
      const meta = slotMeta(loadout, slotIdx)
      if (!meta) continue
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
      pip.className = `cd-pip ready ${meta.pipClass}`
      pip.dataset['abilityId'] = id
      pip.dataset['slotIdx'] = String(slotIdx)
      pip.title = tooltip
      pip.style.setProperty('--elem-color', elemColor)

      const icon = abilityIconMarkup(id)
      pip.innerHTML = `
        <span class="ability-icon">${icon}</span>
        <span class="label">${meta.label}</span>
        <svg class="cd-arc" viewBox="0 0 44 44" width="44" height="44">
          <circle class="cd-arc-bg" cx="22" cy="22" r="${CD_ARC_R}" fill="none"/>
          <circle class="cd-arc-fill" cx="22" cy="22" r="${CD_ARC_R}" fill="none"
            stroke-dasharray="${CD_ARC_CIRC}" stroke-dashoffset="${CD_ARC_CIRC}"
            transform="rotate(-90 22 22)"/>
        </svg>
        <span class="cd-timer"></span>
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
      ;(meta.kind === 'utility'
        ? utilityRail
        : meta.kind === 'spell'
          ? spellRail
          : weaponRail
      ).appendChild(pip)
      pipEls.set(id, pip)
    }
    if (weaponRail.children.length > 0) root.appendChild(weaponSection)
    if (spellRail.children.length > 0) root.appendChild(spellSection)
    if (utilityRail.children.length > 0) root.appendChild(utilitySection)
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
    for (let slotIdx = 0; slotIdx < loadoutRef.length; slotIdx++) {
      const id = loadoutRef[slotIdx] ?? ''
      const pip = pipEls.get(id)
      if (!pip) continue
      const meta = slotMeta(loadoutRef, slotIdx)
      if (!meta) continue
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
        if (labelEl) labelEl.textContent = meta.label
        if (timerEl) timerEl.textContent = left < 1 ? left.toFixed(1) : left.toFixed(0)
        if (arcEl) arcEl.style.strokeDashoffset = String(CD_ARC_CIRC * ratio)
      } else {
        const wasCooling = pip.classList.contains('cooling')
        pip.classList.add('ready')
        pip.classList.remove('cooling', 'pending')
        if (labelEl) labelEl.textContent = meta.label
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

  // Keep hotbar key labels in sync when the player rebinds an ability key.
  onKeybindsChanged(() => {
    for (const [, pip] of pipEls) {
      const slotIdx = Number(pip.dataset['slotIdx'] ?? '-1')
      const labelEl = pip.querySelector<HTMLElement>('.label')
      if (labelEl && slotIdx >= 0) labelEl.textContent = getSlotKeyLabel(slotIdx)
    }
  })

  // Start empty; rebuild() is called by self-hud when the real loadout arrives.
  rebuild([], 'hybrid')

  return {
    currentSignature: () => loadoutSig,
    flashFailed,
    markPending,
    rebuild,
    signature,
    updateAbilityCooldowns,
  }
}
