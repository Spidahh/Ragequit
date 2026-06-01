import { ABILITY_DEFS } from '@ragequit/shared'
import type { ClassId } from '@ragequit/shared'

import { abilityIcon } from '../icons.js'

import { actionCode, codeToLabel, SLOT_ACTIONS } from './keybinds.js'

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
}: RadialWheelControllerOptions): RadialWheelController {
  const utilityWheel: RadialWheel = { el: utilityWheelEl, sectors: utilitySectors, kind: 'utility' }
  const abilityWheel: RadialWheel = { el: abilityWheelEl, sectors: abilitySectors, kind: 'ability' }

  let open = false
  let dxTotal = 0
  let dyTotal = 0
  let activeWheel: RadialWheel | null = null
  let activeKey: string | null = null
  let selectedDir: string | null = null

  function wheelSlotIndices(wheel: RadialWheel): number[] {
    // E (ability) wheel = first 4 slots, Q (utility) wheel = last 4 slots.
    // The class slot grammar order guarantees the first four slots are the
    // E-wheel families and the last four are the Q-wheel families for every
    // class, so the split is a pure function of the slot index.
    return wheel.kind === 'ability' ? [0, 1, 2, 3] : [4, 5, 6, 7]
  }

  function sectorSlotIdx(wheel: RadialWheel, sector: WheelSector): number {
    const position = wheel.sectors.indexOf(sector)
    return wheelSlotIndices(wheel)[position] ?? -1
  }

  function slotBindLabel(slotIdx: number): string {
    // Each slot shows its direct key (default 1-8): the wheel sector and the
    // hotbar share the same bind, so the player can fire it either way.
    const action = SLOT_ACTIONS[slotIdx]
    return action ? codeToLabel(actionCode(action)) : ''
  }

  function refresh(wheel: RadialWheel): void {
    const loadout = getLoadout()
    for (const slotEl of Array.from(wheel.el.querySelectorAll<HTMLElement>('.radial-slot'))) {
      const dir = slotEl.dataset['dir']!
      const sector = wheel.sectors.find((s) => s.dir === dir)
      if (!sector) continue
      const idx = sectorSlotIdx(wheel, sector)
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
        keyEl.textContent = slotBindLabel(idx)

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
        keyEl.textContent = slotBindLabel(idx)
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
        const idx = sectorSlotIdx(wheel, sector)
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
