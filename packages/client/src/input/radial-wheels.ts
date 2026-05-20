import { ABILITY_DEFS } from '@ragequit/shared'

import { abilityIcon } from '../icons.js'

import { slotKeybindEntries } from './keybinds.js'

interface WheelSector {
  angleDeg: number
  dir: string
  slotIdx: number
}

interface RadialWheel {
  el: HTMLElement
  sectors: readonly WheelSector[]
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
  /** Returns true when the ability is set to instant-cast mode. */
  isInstantCast?: (abilityId: string) => boolean
}

const utilitySectors: readonly WheelSector[] = [
  { dir: 'top', angleDeg: -90, slotIdx: 7 },
  { dir: 'right', angleDeg: 0, slotIdx: 8 },
  { dir: 'bottom', angleDeg: 90, slotIdx: 9 },
  { dir: 'left', angleDeg: 180, slotIdx: 10 },
]

const abilitySectors: readonly WheelSector[] = [
  { dir: 'top', angleDeg: -90, slotIdx: 0 },
  { dir: 'top-right', angleDeg: -45, slotIdx: 1 },
  { dir: 'right', angleDeg: 0, slotIdx: 2 },
  { dir: 'bottom-right', angleDeg: 45, slotIdx: 3 },
  { dir: 'bottom', angleDeg: 90, slotIdx: 4 },
  { dir: 'bottom-left', angleDeg: 135, slotIdx: 5 },
  { dir: 'left', angleDeg: 180, slotIdx: 6 },
]

export function initRadialWheels({
  abilityWheelEl,
  getLoadout,
  getPrimedSlot,
  onPrimeSlot,
  utilityWheelEl,
  getCooldownSec,
  isInstantCast,
}: RadialWheelControllerOptions): RadialWheelController {
  const utilityWheel: RadialWheel = { el: utilityWheelEl, sectors: utilitySectors }
  const abilityWheel: RadialWheel = { el: abilityWheelEl, sectors: abilitySectors }

  let open = false
  let dxTotal = 0
  let dyTotal = 0
  let activeWheel: RadialWheel | null = null
  let activeKey: string | null = null
  let selectedDir: string | null = null

  function slotBindLabel(slotIdx: number): string {
    return slotKeybindEntries().find(([, , idx]) => idx === slotIdx)?.[1] ?? '?'
  }

  function refresh(wheel: RadialWheel): void {
    const loadout = getLoadout()
    for (const slotEl of Array.from(wheel.el.querySelectorAll<HTMLElement>('.radial-slot'))) {
      const dir = slotEl.dataset['dir']!
      const sector = wheel.sectors.find((s) => s.dir === dir)
      if (!sector) continue
      const idx = sector.slotIdx
      const id = loadout[idx] ?? ''
      const def = id ? ABILITY_DEFS[id] : null
      const nameEl = slotEl.querySelector<HTMLElement>('.r-name')!
      const iconEl = slotEl.querySelector<HTMLElement>('.r-icon')!
      const keyEl  = slotEl.querySelector<HTMLElement>('.r-key')!
      const cdEl   = slotEl.querySelector<HTMLElement>('.r-cd')
      const modeEl = slotEl.querySelector<HTMLElement>('.r-mode')

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

        // Cast-mode badge: I = instant, P = preview.
        if (modeEl && isInstantCast) {
          const instant = isInstantCast(id)
          modeEl.textContent = instant ? 'I' : 'P'
          modeEl.classList.toggle('r-mode-instant', instant)
          modeEl.classList.toggle('r-mode-preview', !instant)
        }
      } else {
        iconEl.replaceChildren()
        iconEl.textContent = '·'
        nameEl.textContent = 'empty'
        nameEl.classList.add('r-empty')
        keyEl.textContent = slotBindLabel(idx)
        if (cdEl) { cdEl.textContent = ''; cdEl.classList.remove('r-cd-active') }
        slotEl.classList.remove('r-on-cd')
        if (modeEl) { modeEl.textContent = '' }
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
      if (sector) onPrimeSlot(sector.slotIdx)
    }
    selectedDir = null
  }

  function selectVector(dx: number, dy: number): void {
    if (!open || !activeWheel) return
    const dist = Math.hypot(dx, dy)
    if (dist < 18) {
      selectedDir = null
      activeWheel.el.classList.remove('has-selection')
      for (const slotEl of Array.from(activeWheel.el.querySelectorAll<HTMLElement>('.radial-slot'))) {
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
      for (const slotEl of Array.from(activeWheel.el.querySelectorAll<HTMLElement>('.radial-slot'))) {
        slotEl.classList.toggle('selected', slotEl.dataset['dir'] === dir)
      }
    }
  }

  function nearestWheelSector(wheel: RadialWheel, angleDeg: number): WheelSector {
    let best = wheel.sectors[0]!
    let bestDelta = Number.POSITIVE_INFINITY
    for (const sector of wheel.sectors) {
      const delta = Math.abs((((angleDeg - sector.angleDeg + 540) % 360) - 180))
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
