import { ABILITY_DEFS, getAbilitySlotFamily, getClassSlotOrder } from '@ragequit/shared'
import type { ClassId } from '@ragequit/shared'

import { abilityIcon } from '../icons.js'

import { actionLabel } from './keybinds.js'

interface WheelSector {
  angleDeg: number
  dir: string
}

interface RadialWheel {
  el: HTMLElement
  sectors: readonly WheelSector[]
  kind: 'ability' | 'utility'
}

export interface RadialWheelController {
  activeKey: () => string | null
  close: (primeSelection: boolean) => void
  isOpen: () => boolean
  openAbility: (keyCode: string) => void
  openUtility: (keyCode: string) => void
  pointMove: (clientX: number, clientY: number) => void
  refreshAll: () => void
  relativeMove: (dx: number, dy: number) => void
}

export interface RadialWheelControllerOptions {
  abilityWheelEl: HTMLElement
  getLoadout: () => readonly string[]
  getPrimedSlot: () => number | null
  onPrimeSlot: (slotIdx: number) => void
  utilityWheelEl: HTMLElement
  /** Returns remaining cooldown in seconds (0 = ready). */
  getCooldownSec?: (abilityId: string) => number
  getClassId: () => ClassId
}

const utilitySectors: readonly WheelSector[] = [
  { dir: 'top', angleDeg: -90 },
  { dir: 'right', angleDeg: 0 },
  { dir: 'bottom', angleDeg: 90 },
  { dir: 'left', angleDeg: 180 },
]

const abilitySectors: readonly WheelSector[] = [
  { dir: 'top', angleDeg: -90 },
  { dir: 'right', angleDeg: 0 },
  { dir: 'bottom', angleDeg: 90 },
  { dir: 'left', angleDeg: 180 },
]

export function initRadialWheels({
  abilityWheelEl,
  getLoadout,
  getPrimedSlot,
  onPrimeSlot,
  utilityWheelEl,
  getCooldownSec,
  getClassId,
}: RadialWheelControllerOptions): RadialWheelController {
  const utilityWheel: RadialWheel = { el: utilityWheelEl, sectors: utilitySectors, kind: 'utility' }
  const abilityWheel: RadialWheel = { el: abilityWheelEl, sectors: abilitySectors, kind: 'ability' }

  let open = false
  let dxTotal = 0
  let dyTotal = 0
  let activeWheel: RadialWheel | null = null
  let activeKey: string | null = null
  let selectedDir: string | null = null

  function wheelSlotIndices(wheel: RadialWheel, _loadout: readonly string[]): number[] {
    const classId = getClassId()
    const order = getClassSlotOrder(classId)

    if (wheel.kind === 'utility') {
      // Q-wheel: utility slots only
      const indices: number[] = []
      for (let idx = 0; idx < order.length; idx++) {
        if (order[idx] === 'utility') indices.push(idx)
      }
      return indices.slice(0, wheel.sectors.length)
    }

    // E-wheel: melee + bow if the class has any; otherwise magicAdvanced.
    // When total weapon slots exceed the 4 sectors, BOW takes priority over
    // the last melee slot so ranged access is always available.
    const hasMeleeBow = order.some((f) => f === 'melee' || f === 'bow')
    const allIndices: number[] = []
    for (let idx = 0; idx < order.length; idx++) {
      const family = order[idx]!
      const matches = hasMeleeBow
        ? family === 'melee' || family === 'bow'
        : family === 'magicAdvanced'
      if (matches) allIndices.push(idx)
    }
    if (allIndices.length <= wheel.sectors.length) return allIndices
    // More weapon slots than sectors: keep all bow slots, fill remaining with melee.
    const bowIndices = allIndices.filter((i) => order[i] === 'bow' || order[i] === 'magicAdvanced')
    const meleeIndices = allIndices.filter((i) => order[i] === 'melee')
    const remaining = wheel.sectors.length - bowIndices.length
    return [...meleeIndices.slice(0, Math.max(0, remaining)), ...bowIndices]
  }

  function sectorSlotIdx(wheel: RadialWheel, sector: WheelSector, loadout: readonly string[]): number {
    const position = wheel.sectors.indexOf(sector)
    return wheelSlotIndices(wheel, loadout)[position] ?? -1
  }

  function slotBindLabel(slotIdx: number, loadout: readonly string[]): string {
    const id = loadout[slotIdx]
    if (!id) return ''
    const family = getAbilitySlotFamily(id)
    if (family === 'utility') return `${actionLabel('wheelUtility')}`
    // magicAdvanced slots on mage's E-wheel show E key label.
    // magicBase and magicAdvanced on direct keys show spell number.
    if (family === 'magicAdvanced') {
      const classId = getClassId()
      const hasMeleeBow = getClassSlotOrder(classId).some((f) => f === 'melee' || f === 'bow')
      if (!hasMeleeBow) return `${actionLabel('wheelAbility')}`
    }
    if (family === 'magicBase' || family === 'magicAdvanced') {
      let spellIdx = 0
      for (let idx = 0; idx <= slotIdx; idx++) {
        const other = loadout[idx]
        if (!other) continue
        const otherFamily = getAbilitySlotFamily(other)
        if (otherFamily === 'magicBase' || otherFamily === 'magicAdvanced') spellIdx++
      }
      return spellIdx > 0 && spellIdx <= 6 ? actionLabel(`spell${spellIdx}` as Parameters<typeof actionLabel>[0]) : ''
    }
    return `${actionLabel('wheelAbility')}`
  }

  function refresh(wheel: RadialWheel): void {
    const loadout = getLoadout()
    for (const slotEl of Array.from(wheel.el.querySelectorAll<HTMLElement>('.radial-slot'))) {
      const dir = slotEl.dataset['dir']!
      const sector = wheel.sectors.find((s) => s.dir === dir)
      if (!sector) continue
      const idx = sectorSlotIdx(wheel, sector, loadout)
      const id = loadout[idx] ?? ''
      const def = id ? ABILITY_DEFS[id] : null
      const nameEl = slotEl.querySelector<HTMLElement>('.r-name')!
      const iconEl = slotEl.querySelector<HTMLElement>('.r-icon')!
      const keyEl = slotEl.querySelector<HTMLElement>('.r-key')!
      const cdEl = slotEl.querySelector<HTMLElement>('.r-cd')

      if (def) {
        iconEl.replaceChildren(abilityIcon(id, 25))
        nameEl.textContent = def.name
        nameEl.classList.remove('r-empty')
        keyEl.textContent = slotBindLabel(idx, loadout)

        // Cooldown badge — shows remaining seconds; hidden when ready.
        const cdSec = getCooldownSec ? getCooldownSec(id) : 0
        if (cdEl) {
          if (cdSec > 0.4) {
            cdEl.textContent = cdSec < 10 ? cdSec.toFixed(1) : String(Math.ceil(cdSec))
            cdEl.classList.add('r-cd-active')
          } else {
            cdEl.textContent = ''
            cdEl.classList.remove('r-cd-active')
          }
        }
        slotEl.classList.toggle('r-on-cd', cdSec > 0.4)

      } else {
        iconEl.replaceChildren()
        nameEl.textContent = 'empty'
        nameEl.classList.add('r-empty')
        keyEl.textContent = slotBindLabel(idx, loadout)
        if (cdEl) {
          cdEl.textContent = ''
          cdEl.classList.remove('r-cd-active')
        }
        slotEl.classList.remove('r-on-cd')
      }
      slotEl.classList.toggle('r-primed', idx === getPrimedSlot())
    }
  }

  function openWheel(wheel: RadialWheel, keyCode: string): void {
    if (open) return
    open = true
    activeWheel = wheel
    activeKey = keyCode
    dxTotal = 0
    dyTotal = 0
    selectedDir = null
    refresh(wheel)
    wheel.el.classList.add('open')
    wheel.el.classList.remove('has-selection')
    for (const slotEl of Array.from(wheel.el.querySelectorAll<HTMLElement>('.radial-slot'))) {
      slotEl.classList.remove('selected')
    }
  }

  function close(primeSelection: boolean): void {
    if (!open) return
    const wheel = activeWheel
    open = false
    activeWheel = null
    activeKey = null
    if (!wheel) return
    wheel.el.classList.remove('open', 'has-selection')
    for (const slotEl of Array.from(wheel.el.querySelectorAll<HTMLElement>('.radial-slot'))) {
      slotEl.classList.remove('selected')
    }

    if (primeSelection && selectedDir) {
      const sector = wheel.sectors.find((s) => s.dir === selectedDir)
      if (sector) {
        const idx = sectorSlotIdx(wheel, sector, getLoadout())
        if (idx >= 0) onPrimeSlot(idx)
      }
    }
    selectedDir = null
  }

  function selectVector(dx: number, dy: number): void {
    if (!open || !activeWheel) return
    const dist = Math.hypot(dx, dy)
    if (dist < 18) {
      selectedDir = null
      activeWheel.el.classList.remove('has-selection')
      for (const slotEl of Array.from(
        activeWheel.el.querySelectorAll<HTMLElement>('.radial-slot'),
      )) {
        slotEl.classList.remove('selected')
      }
      return
    }
    const angle = Math.atan2(dy, dx) * (180 / Math.PI)
    const sector = nearestWheelSector(activeWheel, angle)
    const dir = sector.dir

    if (dir !== selectedDir) {
      selectedDir = dir
      activeWheel.el.classList.add('has-selection')
      for (const slotEl of Array.from(
        activeWheel.el.querySelectorAll<HTMLElement>('.radial-slot'),
      )) {
        slotEl.classList.toggle('selected', slotEl.dataset['dir'] === dir)
      }
    }
  }

  function nearestWheelSector(wheel: RadialWheel, angleDeg: number): WheelSector {
    let best = wheel.sectors[0]!
    let bestDelta = Number.POSITIVE_INFINITY
    for (const sector of wheel.sectors) {
      const delta = Math.abs(((angleDeg - sector.angleDeg + 540) % 360) - 180)
      if (delta < bestDelta) {
        best = sector
        bestDelta = delta
      }
    }
    return best
  }

  return {
    activeKey: () => activeKey,
    close,
    isOpen: () => open,
    openAbility: (keyCode: string) => openWheel(abilityWheel, keyCode),
    openUtility: (keyCode: string) => openWheel(utilityWheel, keyCode),
    pointMove: (clientX: number, clientY: number) => {
      if (!open || !activeWheel) return
      const rect = activeWheel.el.getBoundingClientRect()
      selectVector(clientX - (rect.left + rect.width / 2), clientY - (rect.top + rect.height / 2))
    },
    refreshAll: () => {
      refresh(utilityWheel)
      refresh(abilityWheel)
    },
    relativeMove: (dx: number, dy: number) => {
      if (!open) return
      dxTotal += dx
      dyTotal += dy
      selectVector(dxTotal, dyTotal)
    },
  }
}
