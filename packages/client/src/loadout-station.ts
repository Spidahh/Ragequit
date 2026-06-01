// Loadout Station UI.
//
// Class-aware build screen: the active class (Tank/Arciere/Mago/Ibrido) determines
// which slot families are available, which abilities are legal, and which vitals
// are displayed. Each slot is freely assignable within class slot-family budget.

import {
  ABILITY_DEFS,
  MessageTypes,
  CLASS_IDS,
  TARGET_CLASS_DEFS,
  CLASS_PRESET_BUILDS,
  classLoadoutFitsSlotGrammar,
  getAbilitySlotFamily,
  getClassSlotOrder,
  isAbilityLegalForClass,
  type ClassId,
  type AbilityDef,
  type TargetAbilitySlotFamily,
} from '@ragequit/shared'
import type { Room } from 'colyseus.js'

import { abilityIconMarkup } from './icons.js'
import { actionLabel, onKeybindsChanged } from './input/keybinds.js'
import { buildLoadoutMessage, normalizeLoadoutSlots } from './input/loadout-slots.js'
import {
  formatCost,
  abilityHasControl,
  recommendationTags,
  abilityNatureLabel,
  statusControlScore,
  formatEffectTags,
  escapeHtml,
  formatDesc,
  tagClass,
  typeBadgeClass,
  targetingLabel,
  slotPoolTitle,
} from './loadout/ability-format.js'

const STORAGE_KEY = 'ragequit.loadout.v6'
const CLASS_STORAGE_KEY = 'ragequit.loadout.classId'



// Default build used when no class is selected or no saved build exists.
// Matches the Ibrido (hybrid) preset.
// Server DEFAULT_LOADOUT in GameRoom.ts must stay in sync with this.
const DEFAULT_SLOTS: string[] = [
  'uppercut', // melee
  'gap_closer', // melee
  'marksman_shot', // bow
  'fireball', // magicBase
  'lightning_dash', // magicBase
  'arc_lift', // magicAdvanced
  'adaptive_mend', // utility (Ibrido Recovery)
  'quick_dash', // utility
]

export interface LoadoutStationApi {
  open: () => void
  close: () => void
  getLoadout: () => readonly string[]
  /** Returns the active class id for the current build. Used by sendLoadout. */
  getClassId: () => ClassId
  isDirectCast: (abilityId: string) => boolean
}

export function initLoadoutStation(
  getRoom: () => Room | null,
  getCanvas?: () => HTMLCanvasElement | null,
  onClose?: () => void,
  canApplyBuild?: () => boolean,
  onSaved?: () => void,
  shouldCaptureOnSave?: () => boolean,
  getLaunchCtaLabel?: () => string | null,
): LoadoutStationApi {
  const overlay = document.getElementById('loadout-station')!
  const lsMelee = document.getElementById('ls-melee')!
  const lsBow = document.getElementById('ls-bow')!
  const lsMagicBase = document.getElementById('ls-magic-base')!
  const lsMagicAdvanced = document.getElementById('ls-magic-advanced')!
  const lsUtility = document.getElementById('ls-utility')!
  const lsPool = document.getElementById('ls-pool')!
  const btnBack = document.getElementById('ls-back') as HTMLButtonElement
  const btnDefault = document.getElementById('ls-default') as HTMLButtonElement
  const btnConfirm = document.getElementById('ls-confirm') as HTMLButtonElement
  const searchInput = document.getElementById('ls-search') as HTMLInputElement | null
  const filterBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-filter]'))

  const abilityWheelKey = document.getElementById('ls-ability-wheel-key')
  const utilityWheelKey = document.getElementById('ls-utility-wheel-key')

  // Class selector DOM refs
  const classTabs = Array.from(document.querySelectorAll<HTMLButtonElement>('.class-select-card'))
  // Class vitals DOM refs
  const vitalsClassName = document.getElementById('ls-vitals-class-name')
  const vitalsValHp = document.getElementById('ls-val-hp')
  const vitalsValMana = document.getElementById('ls-val-mana')
  const vitalsValStam = document.getElementById('ls-val-stam')
  const btnPreset = document.getElementById('ls-load-preset') as HTMLButtonElement | null

  let slots = loadSlots()
  let activeIdx = 0
  let poolFilterEl = 'all'
  let poolSearch = ''
  let activeClassId: ClassId = loadClassId()

  function resetPoolFilters(): void {
    poolFilterEl = 'all'
    poolSearch = ''
    if (searchInput) searchInput.value = ''
  }

  function syncPoolFilterButtons(): void {
    filterBtns.forEach((btn) =>
      btn.classList.toggle('active-filter', btn.dataset['filter'] === poolFilterEl),
    )
  }

  function setActiveSlot(idx: number): void {
    if (activeIdx !== idx) resetPoolFilters()
    activeIdx = idx
  }

  function buildLocked(): boolean {
    return !!getRoom() && !!canApplyBuild && !canApplyBuild()
  }

  function loadSlots(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return DEFAULT_SLOTS.slice()
      const parsed = JSON.parse(raw) as { slots?: string[] }
      if (Array.isArray(parsed.slots) && parsed.slots.length >= 6)
        return normalizeLoadoutSlots(parsed.slots)
    } catch {
      // Fall through to defaults.
    }
    return DEFAULT_SLOTS.slice()
  }

  function loadClassId(): ClassId {
    try {
      const raw = localStorage.getItem(CLASS_STORAGE_KEY)
      if (raw && CLASS_IDS.includes(raw as ClassId)) return raw as ClassId
    } catch {
      /* ignore */
    }
    return 'hybrid'
  }

  function saveClassId(id: ClassId): void {
    try {
      localStorage.setItem(CLASS_STORAGE_KEY, id)
    } catch {
      /* ignore */
    }
  }

  function save(): void {
    try {
      slots = normalizeLoadoutSlots(slots)
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ slots }))
    } catch {
      // Storage is optional.
    }
  }

  function resetSlotsForClass(classId: ClassId): void {
    slots = normalizeLoadoutSlots(CLASS_PRESET_BUILDS[classId])
    setActiveSlot(0)
    save()
  }

  function isDirectCast(defOrId: AbilityDef | string): boolean {
    const def = typeof defOrId === 'string' ? ABILITY_DEFS[defOrId] : defOrId
    if (!def) return true
    return def.targeting !== 'point'
  }

  function requestCanvasPointerLock(): void {
    const canvas = getCanvas?.()
    if (!canvas || document.pointerLockElement === canvas) return
    try {
      const result = canvas.requestPointerLock?.()
      if (result && typeof result.catch === 'function') {
        void result.catch(() => {
          // Browsers can reject pointer lock outside trusted gestures.
        })
      }
    } catch {
      // Pointer lock is an enhancement; focus still lets keyboard input work.
    }
  }

  function currentSlotOrder(): TargetAbilitySlotFamily[] {
    return getClassSlotOrder(activeClassId)
  }

  function slotPanel(slot: TargetAbilitySlotFamily): HTMLElement {
    if (slot === 'melee') return lsMelee
    if (slot === 'bow') return lsBow
    if (slot === 'magicBase') return lsMagicBase
    if (slot === 'magicAdvanced') return lsMagicAdvanced
    return lsUtility
  }

  // Slots 0-3 are on the E wheel, 4-7 on the Q wheel — for every class and
  // every family, because the slot grammar order puts the E-wheel families
  // first and the Q-wheel families last.
  function slotKeyLabel(idx: number): string {
    return idx < 4 ? `${actionLabel('wheelAbility')} WHEEL` : `${actionLabel('wheelUtility')} WHEEL`
  }

  function slotRouteLabel(_slot: TargetAbilitySlotFamily, idx: number): string {
    return idx < 4
      ? `${actionLabel('wheelAbility')} wheel · tieni premuto`
      : `${actionLabel('wheelUtility')} wheel · tieni premuto`
  }

  function refreshSectionKeyLabels(): void {
    if (abilityWheelKey) abilityWheelKey.textContent = `${actionLabel('wheelAbility')} HOLD`
    if (utilityWheelKey) utilityWheelKey.textContent = `${actionLabel('wheelUtility')} HOLD`
  }

  function makeSlotEl(idx: number): HTMLElement {
    const id = slots[idx] ?? ''
    const def = id ? ABILITY_DEFS[id] : undefined
    const el = document.createElement('button')
    el.type = 'button'
    el.className = `ls-slot ${idx === activeIdx ? 'active' : ''} el-${def?.element ?? 'none'}`
    el.dataset['idx'] = String(idx)
    const slotKind = currentSlotOrder()[idx] ?? 'utility'
    const SLOT_TYPE_LABELS: Record<string, string> = {
      melee: 'SWORD',
      bow: 'BOW',
      magicBase: 'SPELL',
      magicAdvanced: 'ADV SPELL',
      utility: 'UTILITY',
    }
    const emptyTypeLabel = SLOT_TYPE_LABELS[slotKind] ?? slotKind.toUpperCase()
    el.innerHTML = [
      `<span class="ls-slot-portrait"><span class="ls-slot-icon">${def ? abilityIconMarkup(def.id) : `<span class="ls-slot-empty-type">${emptyTypeLabel}</span>`}</span></span>`,
      `<span class="ls-slot-label">${slotKeyLabel(idx)}</span>`,
      `<span class="ls-slot-main"><span class="ls-slot-name">${def ? escapeHtml(def.name) : emptyTypeLabel}</span><span class="ls-slot-nature">${def ? abilityNatureLabel(def) : slotPoolTitle(slotKind, idx)}</span></span>`,
      `<span class="ls-slot-route">${slotRouteLabel(slotKind, idx)}</span>`,
      def ? `<span class="ls-slot-cost">${formatCost(def)} · ${def.cooldownSec}s</span>` : '',
      id ? '<span class="ls-slot-clear" title="Clear">×</span>' : '',
    ].join('')
    el.addEventListener('click', (event) => {
      if ((event.target as HTMLElement).classList.contains('ls-slot-clear')) {
        if (buildLocked()) return
        slots[idx] = ''
        setActiveSlot(idx)
        save()
        rerender()
        return
      }
      setActiveSlot(idx)
      rerender()
    })
    return el
  }

  function rebuildSlots(): void {
    for (const c of new Set([lsMelee, lsBow, lsMagicBase, lsMagicAdvanced, lsUtility])) {
      while (c.firstChild) c.removeChild(c.firstChild)
    }
    const order = currentSlotOrder()
    for (let i = 0; i < order.length; i++) {
      slotPanel(order[i]!).appendChild(makeSlotEl(i))
    }
  }

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      poolFilterEl = btn.dataset['filter'] ?? 'all'
      filterBtns.forEach((b) => b.classList.toggle('active-filter', b === btn))
      rebuildPool()
    })
  })
  filterBtns.find((b) => b.dataset['filter'] === 'all')?.classList.add('active-filter')

  searchInput?.addEventListener('input', () => {
    poolSearch = searchInput.value.trim().toLowerCase()
    rebuildPool()
  })
  searchInput?.addEventListener('keydown', (e) => e.stopPropagation())

  function rebuildPool(): void {
    while (lsPool.firstChild) lsPool.removeChild(lsPool.firstChild)
    syncPoolFilterButtons()

    const targetSlot = currentSlotOrder()[activeIdx]!
    const locked = buildLocked()
    const defs = (Object.values(ABILITY_DEFS) as AbilityDef[])
      .filter((def) => getAbilitySlotFamily(def.id) === targetSlot)
      .filter((def) => !slots.some((id, idx) => idx !== activeIdx && id === def.id))
      // Class legality filter — only show abilities valid for the active class
      .filter((def) => isAbilityLegalForClass(def.id, activeClassId))
      .filter((def) => {
        if (poolFilterEl === 'all') return true
        if (poolFilterEl === 'recommended')
          return recommendationTags(def, activeIdx, slots).length > 0
        if (poolFilterEl === 'control') return abilityHasControl(def)
        if (poolFilterEl === 'projectile') return abilityNatureLabel(def).includes('PROJECTILE')
        if (poolFilterEl === 'recovery') return abilityNatureLabel(def) === 'RECOVERY'
        if (poolFilterEl === 'zone') return abilityNatureLabel(def).includes('ZONE')
        if (poolFilterEl === 'mobility') return abilityNatureLabel(def).includes('MOBILITY')
        if (poolFilterEl === 'none') return def.element === 'none'
        return def.element === poolFilterEl
      })
      .filter((def) => {
        if (!poolSearch) return true
        return `${def.name} ${def.slot} ${def.element} ${formatEffectTags(def).join(' ')} ${def.description} ${def.miniMalus}`
          .toLowerCase()
          .includes(poolSearch)
      })
      .sort((a, b) => {
        const aRec = recommendationTags(a, activeIdx, slots).length
        const bRec = recommendationTags(b, activeIdx, slots).length
        if (aRec !== bRec) return bRec - aRec
        if (a.element !== b.element) return String(a.element).localeCompare(String(b.element))
        return a.name.localeCompare(b.name)
      })

    for (const def of defs) {
      const card = document.createElement('button')
      card.type = 'button'
      const isActive = slots[activeIdx] === def.id
      const poolInputLabel = slotKeyLabel(activeIdx)
      const recTags = recommendationTags(def, activeIdx, slots)
      const nature = abilityNatureLabel(def)
      card.className = `pool-card el-${def.element} ${isActive ? 'equipped' : ''} ${recTags.length > 0 ? 'recommended' : ''} ${locked ? 'locked' : ''}`
      card.disabled = locked
      card.title = def.description
      card.setAttribute(
        'aria-label',
        `${def.name}. ${nature}. ${def.element !== 'none' ? def.element : 'fisico'}. ${formatCost(def)}. ${formatEffectTags(def).join(', ')}`,
      )
      // Damage values for the footer stat bar
      const allTags = formatEffectTags(def)
      const damageTags = allTags.filter((t) => tagClass(t) === 'tag-damage')

      const badgeClass = typeBadgeClass(nature)
      const elementLabel = def.element !== 'none' ? def.element : 'fisico'

      // Estrai CC/status con durata per il footer (NON ripetuti nella descrizione)
      const ccFooterItems: string[] = []
      for (const e of def.effects) {
        if (e.kind === 'applyStatus' && statusControlScore(e.status) >= 2) {
          const stacks = (e.stacks ?? 1) > 1 ? ` x${e.stacks}` : ''
          ccFooterItems.push(`<span class="pf-cc pf-cc-${e.status}">${e.status.toUpperCase()}${stacks} ${e.durationSec}s</span>`)
        } else if (e.kind === 'knockup') {
          ccFooterItems.push(`<span class="pf-cc pf-cc-airborne">AIRBORNE ${e.airborneSec}s</span>`)
        } else if (e.kind === 'projectile' && e.onHitStatus && statusControlScore(e.onHitStatus.status) >= 2) {
          ccFooterItems.push(`<span class="pf-cc pf-cc-${e.onHitStatus.status}">${e.onHitStatus.status.toUpperCase()} ${e.onHitStatus.durationSec}s</span>`)
        } else if (e.kind === 'zone' && e.applyStatus && statusControlScore(e.applyStatus.status) >= 2) {
          ccFooterItems.push(`<span class="pf-cc pf-cc-${e.applyStatus.status}">${e.applyStatus.status.toUpperCase()} ${e.applyStatus.durationSec}s</span>`)
        }
      }

      // Footer: danno | CC con durata | portata | costo | cast | cooldown
      const footerParts: string[] = []
      for (const t of damageTags)
        footerParts.push(`<span class="pf-dmg">${escapeHtml(t)}</span>`)
      for (const cc of ccFooterItems.slice(0, 2))
        footerParts.push(cc)
      if (def.targeting !== 'self' && def.range > 0 && def.range < 50)
        footerParts.push(`<span class="pf-stat"><span class="pf-val">${def.range}m</span><span class="pf-lbl">portata</span></span>`)
      if (def.costMana > 0)
        footerParts.push(`<span class="pf-stat pf-mana"><span class="pf-val">${def.costMana}</span><span class="pf-lbl">mana</span></span>`)
      if (def.costStamina > 0)
        footerParts.push(`<span class="pf-stat pf-stam"><span class="pf-val">${def.costStamina}</span><span class="pf-lbl">stamina</span></span>`)
      if (def.windupSec > 0)
        footerParts.push(`<span class="pf-stat pf-cast"><span class="pf-val">${def.windupSec}s</span><span class="pf-lbl">cast</span></span>`)
      footerParts.push(`<span class="pf-stat pf-cd"><span class="pf-val">${def.cooldownSec}s</span><span class="pf-lbl">cooldown</span></span>`)

      // Struttura: header (icon+name+badge) → sub (element·targeting·key) → descrizione → footer
      card.innerHTML = `
        <span class="pc-head">
          <span class="pc-icon-sm">${abilityIconMarkup(def.id)}</span>
          <span class="pc-headright">
            <span class="pc-name">${escapeHtml(def.name)}${recTags.length > 0 ? ' <span class="pc-rec">★</span>' : ''}</span>
            <span class="ptype-badge ptype-${badgeClass}">${escapeHtml(nature)}</span>
          </span>
        </span>
        <span class="pc-sub">
          <span class="pc-eldot el-dot-${def.element}"></span>
          <span class="pc-elname">${elementLabel}</span>
          <span class="pc-sep">·</span>
          ${targetingLabel(def)}
          <span class="pc-sep">·</span>
          <span class="pc-key">TASTO ${poolInputLabel}</span>
        </span>
        <span class="pc-desc">${formatDesc(def.description)}</span>
        <span class="pc-footer">${footerParts.join('')}</span>
      `
      card.addEventListener('click', () => {
        if (buildLocked()) return
        slots[activeIdx] = def.id
        const nextIdx = slots.findIndex(
          (value, idx) => idx > activeIdx && !value && currentSlotOrder()[idx] === targetSlot,
        )
        if (nextIdx >= 0) activeIdx = nextIdx
        save()
        rerender()
      })
      lsPool.appendChild(card)
    }

    if (defs.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'pool-empty'
      empty.textContent = poolSearch
        ? `Nessuna abilità corrisponde a "${poolSearch}"`
        : 'Nessuna abilità disponibile per questo slot.'
      lsPool.appendChild(empty)
    }
  }

  // --- Class Selector Logic --------------------------------------------------

  function applyClassId(id: ClassId): void {
    activeClassId = id
    saveClassId(id)
    if (!classLoadoutFitsSlotGrammar(id, slots)) resetSlotsForClass(id)
    // Update active tab UI
    classTabs.forEach((tab) => {
      const isActive = tab.dataset['class'] === id
      tab.classList.toggle('active', isActive)
    })
    // Apply class color token to the overlay
    const CLASS_COLORS: Record<ClassId, string> = {
      tank: '#d4a04a',
      archer: '#2ecc71',
      mage: '#3498db',
      hybrid: '#00f0ff',
    }
    overlay.style.setProperty('--class-color', CLASS_COLORS[id])
    rerender()
  }

  classTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const id = tab.dataset['class'] as ClassId | undefined
      if (id && CLASS_IDS.includes(id)) applyClassId(id)
    })
  })

  // --- Class Vitals Console --------------------------------------------------

  const CLASS_MECHANIC_LABEL: Record<ClassId, string> = {
    tank: '🔥 FURY — subendo colpi accumuli 5 stack. Al massimo, il prossimo colpo melee esplode con danno bonus e lento.',
    archer: '⚡ MOMENTUM — muovendoti carichi ritmo. Più momentum: arco più rapido e magie con recupero ridotto.',
    mage: '🌀 RISONANZA — due spell dello stesso elemento entro 2.5s attivano una proc elementale potenziata.',
    hybrid: '💧 FLOW — cambiare arma genera stack. Al pieno, la prossima cura o spell offensiva viene amplificata.',
  }

  function rebuildClassVitals(): void {
    const classDef = TARGET_CLASS_DEFS[activeClassId]
    const { hp, mana, stamina } = classDef.resourceMaxima
    if (vitalsClassName) vitalsClassName.textContent = classDef.label.toUpperCase()
    const mechanicEl = document.getElementById('ls-vitals-mechanic')
    if (mechanicEl) mechanicEl.textContent = CLASS_MECHANIC_LABEL[activeClassId] ?? ''
    if (vitalsValHp) vitalsValHp.textContent = String(hp)
    if (vitalsValMana) vitalsValMana.textContent = String(mana)
    if (vitalsValStam) vitalsValStam.textContent = String(stamina)

    // Dynamic Resource Bar widths
    const barHp = document.getElementById('ls-bar-hp')
    const barMana = document.getElementById('ls-bar-mana')
    const barStam = document.getElementById('ls-bar-stam')
    if (barHp) barHp.style.width = `${(hp / 250) * 100}%`
    if (barMana) barMana.style.width = `${(mana / 160) * 100}%`
    if (barStam) barStam.style.width = `${(stamina / 150) * 100}%`

  }

  // --- Preset Loader ---------------------------------------------------------

  btnPreset?.addEventListener('click', () => {
    if (buildLocked()) return
    resetSlotsForClass(activeClassId)
    rerender()
  })

  // --- Rerender --------------------------------------------------------------

  function rerender(): void {
    refreshSectionKeyLabels()
    rebuildSlots()
    rebuildClassVitals()
    rebuildPool()
  }

  btnDefault.addEventListener('click', () => {
    if (buildLocked()) return
    resetSlotsForClass(activeClassId)
    rerender()
  })

  btnBack.addEventListener('click', () => {
    document.body.classList.remove('loadout-active')
    overlay.classList.add('hidden')
    onClose?.()
  })

  btnConfirm.addEventListener('click', () => {
    if (getRoom() && canApplyBuild && !canApplyBuild()) {
      btnConfirm.textContent = 'BLOCCATO IN BATTAGLIA'
      btnConfirm.classList.add('locked')
      window.setTimeout(() => {
        btnConfirm.classList.remove('locked')
        btnConfirm.textContent = 'CONFERMA BUILD'
      }, 900)
      return
    }
    save()
    try {
      localStorage.setItem('ragequit.profile.configured', 'true')
    } catch {
      // ignore
    }
    const room = getRoom()
    if (room) {
      room.send(MessageTypes.Loadout, buildLoadoutMessage(slots, activeClassId))
      document.body.classList.remove('loadout-active')
      overlay.classList.add('hidden')
      getCanvas?.()?.focus({ preventScroll: true })
      requestCanvasPointerLock()
    } else {
      const captureOnSave = shouldCaptureOnSave?.() ?? false
      document.body.classList.remove('loadout-active')
      overlay.classList.add('hidden')
      if (captureOnSave) {
        getCanvas?.()?.focus({ preventScroll: true })
        requestCanvasPointerLock()
      }
      onSaved?.()
    }
  })

  onKeybindsChanged(rerender)

  // Apply initial class on mount
  applyClassId(activeClassId)

  return {
    open: () => {
      rerender()
      const locked = buildLocked()
      btnConfirm.textContent = locked
        ? 'BLOCCATO IN BATTAGLIA'
        : getRoom()
          ? 'CONFERMA BUILD'
          : (getLaunchCtaLabel?.() ?? 'SAVE BUILD')
      btnConfirm.classList.toggle('locked', locked)
      overlay.classList.toggle('build-locked', locked)
      document.body.classList.add('loadout-active')
      overlay.classList.remove('hidden')
    },
    close: () => {
      document.body.classList.remove('loadout-active')
      overlay.classList.remove('build-locked')
      overlay.classList.add('hidden')
    },
    getLoadout: () => slots as readonly string[],
    getClassId: () => activeClassId,
    isDirectCast,
  }
}

export const __loadoutStationSmoke = {
  storageKey: STORAGE_KEY,
  classStorageKey: CLASS_STORAGE_KEY,
  defaultSlots: DEFAULT_SLOTS,
}
