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

const STORAGE_KEY = 'ragequit.loadout.v6'
const CLASS_STORAGE_KEY = 'ragequit.loadout.classId'



// Preset builds per class — full 8-slot class-aware builds.
// Slot positions are packed by family regardless of wire-field name; the server
// validates by family budget (not position). See 01_DESIGN/06_loadout_build.md for rationale.
// Each preset includes the class Recovery utility.
const CLASS_PRESET_BUILDS: Record<ClassId, string[]> = {
  // Tank: 4 melee + 1 bow + 3 utility = 8
  tank: [
    'uppercut', // slot 0 — melee (Uppercut: knockup setup)
    'gap_closer', // slot 1 — melee (Gap Closer: engage dash)
    'guard_break', // slot 2 — melee (Guard Break: short-range setup)
    'whirlwind', // slot 3 — melee (Whirlwind: physical spinning pressure)
    'piercing_shot', // slot 4 — bow (Piercing Shot: physical cashout)
    'brace_recovery', // slot 5 — utility (Recovery)
    'barrier', // slot 6 — utility
    'quick_dash', // slot 7 — utility
  ],
  // Arciere: 4 bow + 2 magicBase + 2 utility = 8
  archer: [
    'pin_shot', // slot 0 — bow (ranged setup)
    'marksman_shot', // slot 1 — bow (precision cashout)
    'disengage_shot', // slot 2 — bow (spacing response)
    'volley', // slot 3 — bow (volley of arrows)
    'frost_bolt', // slot 4 — magicBase (control projectile)
    'fireball', // slot 5 — magicBase (splash projectile)
    'hunters_flow', // slot 6 — utility (Recovery)
    'quick_dash', // slot 7 — utility
  ],
  // Mago: 3 magicBase + 3 magicAdvanced + 2 utility = 8
  mage: [
    'fireball', // slot 0 — magicBase (Fire projectile pressure)
    'frost_bolt', // slot 1 — magicBase (Ice pressure)
    'chain_bolt', // slot 2 — magicBase (Lightning chain)
    'eruption', // slot 3 — magicAdvanced (launch setup)
    'meteor', // slot 4 — magicAdvanced (high-commit Fire cashout)
    'frost_pillar', // slot 5 — magicAdvanced (Ice knockup)
    'arcane_rebind', // slot 6 — utility (Recovery)
    'phase_shift', // slot 7 — utility (timed survival counter)
  ],
  // Ibrido: 2 melee + 1 bow + 2 magicBase + 1 magicAdvanced + 2 utility = 8
  hybrid: [
    'uppercut', // slot 0 — melee (knockup setup)
    'gap_closer', // slot 1 — melee (engage dash)
    'marksman_shot', // slot 2 — bow (precision cashout)
    'fireball', // slot 3 — magicBase (staff pressure)
    'lightning_dash', // slot 4 — magicBase (staff movement)
    'arc_lift', // slot 5 — magicAdvanced (launch cashout)
    'adaptive_mend', // slot 6 — utility (Recovery)
    'quick_dash', // slot 7 — utility
  ],
}

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

  function slotKeyLabel(idx: number): string {
    const order = currentSlotOrder()
    const family = order[idx] ?? 'utility'
    if (family === 'utility') return `${actionLabel('wheelUtility')} WHEEL`
    if (family === 'magicBase' || family === 'magicAdvanced') {
      const spellIdx = order
        .slice(0, idx + 1)
        .filter((slot) => slot === 'magicBase' || slot === 'magicAdvanced').length
      return spellIdx <= 5 ? actionLabel(`spell${spellIdx}` as Parameters<typeof actionLabel>[0]) : 'SPELL'
    }
    return `${actionLabel('wheelAbility')} WHEEL`
  }

  function slotRouteLabel(slot: TargetAbilitySlotFamily, idx: number): string {
    if (slot === 'utility') return `${actionLabel('wheelUtility')} wheel · release primes`
    if (slot === 'magicBase' || slot === 'magicAdvanced') return `direct key ${slotKeyLabel(idx)}`
    return `${actionLabel('wheelAbility')} wheel · release primes`
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
      const quickStats = abilityQuickStats(def)
      const poolInputLabel = slotKeyLabel(activeIdx)
      const recTags = recommendationTags(def, activeIdx, slots)
      const nature = abilityNatureLabel(def)
      card.className = `pool-card el-${def.element} ${isActive ? 'equipped' : ''} ${recTags.length > 0 ? 'recommended' : ''} ${locked ? 'locked' : ''}`
      card.disabled = locked
      card.title = def.description
      card.setAttribute(
        'aria-label',
        `${def.name}. ${nature}. ${def.element !== 'none' ? def.element : 'physical'}. ${formatCost(def)}. ${formatEffectTags(def).join(', ')}`,
      )
      // Split effect tags: damage tags (with numbers) separate from status/control tags.
      const allTags = formatEffectTags(def)
      const damageTags = allTags.filter((t) => tagClass(t) === 'tag-damage')
      const otherTags = allTags.filter((t) => tagClass(t) !== 'tag-damage').slice(0, 4)

      // Cost chips: mana and stamina shown as separate colored badges.
      const costChips: string[] = []
      if (def.costMana > 0) costChips.push(`<span class="cost-chip cost-mp">${def.costMana}<span class="cc-unit">MP</span></span>`)
      if (def.costStamina > 0) costChips.push(`<span class="cost-chip cost-sp">${def.costStamina}<span class="cc-unit">SP</span></span>`)
      if (def.windupSec > 0) costChips.push(`<span class="cost-chip cost-windup">${def.windupSec}s</span>`)
      costChips.push(`<span class="cost-chip cost-cd">${def.cooldownSec}s CD</span>`)

      card.innerHTML = [
        `<span class="pool-visual"><span class="pool-icon-box">${abilityIconMarkup(def.id)}</span></span>`,
        `<span class="pool-nature"><span class="pool-name">${escapeHtml(def.name)}</span><span class="pool-category">${escapeHtml(nature)}${recTags.length > 0 ? ` <span class="recommend-tag">${escapeHtml(recTags[0]!)}</span>` : ''}</span></span>`,
        `<span class="pool-meta"><b>${poolInputLabel}</b> · ${def.element !== 'none' ? def.element.toUpperCase() : 'PHYSICAL'}</span>`,
        `<span class="pool-summary">${formatDesc(def.description)}</span>`,
        // Damage tags: prominent visual with numbers (e.g. "24 DMG", "0.5s AIRBORNE")
        damageTags.length > 0
          ? `<span class="pool-dmg-row">${damageTags.map((t) => `<span class="tag-dmg-pill">${escapeHtml(t)}</span>`).join('')}</span>`
          : '',
        // Status / control / move tags: smaller chips
        otherTags.length > 0
          ? `<span class="effect-tags">${otherTags.map((t) => `<span class="${tagClass(t)}">${escapeHtml(t)}</span>`).join('')}</span>`
          : '',
        // Resource cost row: separated and color-coded
        `<span class="pool-cost-row">${costChips.join('')}</span>`,
      ].join('')
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
        ? `No abilities match "${poolSearch}"`
        : 'No abilities available for this slot.'
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
    tank:   '🔥 FURY — ricevi colpi per accumulare stack, scatena la Surge per danno esplosivo',
    archer: '⚡ MOMENTUM — muoviti per accelerare i cast e ridurre i CD delle magie',
    mage:   '🌀 RISONANZA — lancia lo stesso elemento due volte in 2.5s per un bonus elementale',
    hybrid: '💧 FLOW — cambia arma per accumulare stack e potenziare heal e danno',
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

function formatCost(def: AbilityDef): string {
  if (def.costMana > 0 && def.costStamina > 0) return `${def.costMana}MP + ${def.costStamina}SP`
  if (def.costMana > 0) return `${def.costMana} MP`
  if (def.costStamina > 0) return `${def.costStamina} SP`
  return 'FREE'
}

interface AbilityQuickStat {
  key: string
  label: string
  value: number
  className: string
}



function abilityHasControl(def: AbilityDef): boolean {
  if (['starter', 'extender', 'counter'].includes(def.comboRole)) return true
  return def.effects.some((effect) => {
    if (effect.kind === 'knockup') return true
    if (effect.kind === 'applyStatus') return statusControlScore(effect.status) >= 2
    if (effect.kind === 'projectile' && effect.onHitStatus)
      return statusControlScore(effect.onHitStatus.status) >= 2
    if (effect.kind === 'zone' && effect.applyStatus)
      return statusControlScore(effect.applyStatus.status) >= 2
    if (effect.kind === 'channel' && effect.perTick.kind === 'applyStatus')
      return statusControlScore(effect.perTick.status) >= 2
    return false
  })
}

function recommendationTags(
  candidate: AbilityDef,
  activeIdx: number,
  slotIds: readonly string[],
): string[] {
  const otherDefs = slotIds
    .map((id, idx) => (idx === activeIdx ? undefined : ABILITY_DEFS[id]))
    .filter((def): def is AbilityDef => Boolean(def))
  const tags: string[] = []
  const hasStarter = otherDefs.some((def) => def.comboRole === 'starter' || abilityHasControl(def))
  const hasFinisher = otherDefs.some(
    (def) => def.comboRole === 'finisher' || def.comboRole === 'ray',
  )
  const hasReset = otherDefs.some((def) =>
    ['survival', 'counter', 'mobility'].includes(def.comboRole),
  )
  const hasPointPreview = otherDefs.some((def) => def.targeting === 'point')
  const hasInstantHit = otherDefs.some(
    (def) => def.targeting === 'forward' || def.comboRole === 'ray',
  )

  if (!hasStarter && (candidate.comboRole === 'starter' || abilityHasControl(candidate)))
    tags.push('OPENER')
  if (!hasFinisher && (candidate.comboRole === 'finisher' || candidate.comboRole === 'ray'))
    tags.push('CASHOUT')
  if (!hasReset && ['survival', 'counter', 'mobility'].includes(candidate.comboRole))
    tags.push('RESET')
  if (
    hasPointPreview &&
    !hasInstantHit &&
    (candidate.targeting === 'forward' || candidate.comboRole === 'ray')
  )
    tags.push('FOLLOWUP')
  return Array.from(new Set(tags)).slice(0, 2)
}

function abilityNatureLabel(def: AbilityDef): string {
  const kinds = new Set(def.effects.map((effect) => effect.kind))
  const statuses: string[] = []

  for (const effect of def.effects) {
    if (effect.kind === 'applyStatus') statuses.push(effect.status)
    if (effect.kind === 'projectile' && effect.onHitStatus) statuses.push(effect.onHitStatus.status)
    if (effect.kind === 'zone' && effect.applyStatus) statuses.push(effect.applyStatus.status)
    if (effect.kind === 'channel' && effect.perTick.kind === 'applyStatus')
      statuses.push(effect.perTick.status)
  }

  const hasControl = statuses.some((status) => statusControlScore(status) >= 2) || kinds.has('knockup')
  const hasDot = statuses.some((status) => ['burn', 'bleed', 'poison', 'chill'].includes(status))

  if (
    def.comboRole === 'survival' ||
    kinds.has('heal') ||
    kinds.has('cleanse') ||
    kinds.has('restoreStamina') ||
    statuses.some((status) => status === 'shield')
  )
    return 'RECOVERY'
  if (def.comboRole === 'mobility' || kinds.has('move')) return hasControl ? 'MOVE + CONTROL' : 'MOBILITY'
  if (def.comboRole === 'drain' || kinds.has('resourceDrain') || kinds.has('lifesteal'))
    return 'DRAIN'
  if (hasControl) return kinds.has('zone') ? 'AREA CONTROL' : 'CONTROL'
  if (kinds.has('zone')) return 'ZONE'
  if (kinds.has('projectile')) return hasDot ? 'PROJECTILE + STATUS' : 'PROJECTILE'
  if (hasDot) return 'STATUS DOT'
  if (kinds.has('damage')) return 'DAMAGE'
  return 'UTILITY'
}

function abilityQuickStats(def: AbilityDef): AbilityQuickStat[] {
  let damage = 0
  let control = 0
  let mobility = 0
  let sustain = 0

  for (const e of def.effects) {
    if (e.kind === 'damage') damage += e.amount >= 30 ? 3 : e.amount >= 15 ? 2 : 1
    else if (e.kind === 'projectile') damage += e.damage >= 30 ? 3 : e.damage >= 15 ? 2 : 1
    else if (e.kind === 'zone') {
      damage += e.damagePerTick && e.damagePerTick > 0 ? 2 : 0
      if (e.applyStatus) control += statusControlScore(e.applyStatus.status)
    } else if (e.kind === 'channel') {
      if (e.perTick.kind === 'damage') damage += 3
      if (e.perTick.kind === 'heal') sustain += 3
      if (e.perTick.kind === 'applyStatus') control += statusControlScore(e.perTick.status)
    } else if (e.kind === 'applyStatus') {
      const selfOnly = def.targeting === 'self' && !(e.radius && e.radius > 0)
      if (!selfOnly) control += statusControlScore(e.status)
      sustain += ['shield', 'haste'].includes(e.status) ? 2 : 0
    } else if (e.kind === 'knockup') {
      control += e.airborneSec >= 0.8 ? 3 : 2
    } else if (e.kind === 'move') {
      mobility += e.distance >= 6 ? 3 : 2
    } else if (
      e.kind === 'heal' ||
      e.kind === 'cleanse' ||
      e.kind === 'restoreStamina' ||
      e.kind === 'lifesteal' ||
      e.kind === 'resourceDrain'
    ) {
      sustain += 2
    }
  }

  return [
    { key: 'damage', label: 'Damage', value: clampStat(damage), className: 'stat-damage' },
    { key: 'control', label: 'Control', value: clampStat(control), className: 'stat-control' },
    { key: 'mobility', label: 'Mobility', value: clampStat(mobility), className: 'stat-move' },
    { key: 'sustain', label: 'Utility', value: clampStat(sustain), className: 'stat-resource' },
  ]
}

function statusControlScore(status: string): number {
  if (['stun', 'freeze', 'airborne', 'root', 'blind'].includes(status)) return 3
  if (['slow', 'chill', 'curse', 'mark'].includes(status)) return 2
  if (['burn', 'bleed', 'poison'].includes(status)) return 1
  return 1
}

function clampStat(value: number): number {
  return Math.max(0, Math.min(5, value))
}

function formatEffectTags(def: AbilityDef): string[] {
  const tags = new Set<string>()
  for (const tag of targetingTags(def)) tags.add(tag)
  if (def.windupSec > 0) tags.add(`${def.windupSec}s WINDUP`)
  for (const e of def.effects) {
    if (e.kind === 'damage') {
      tags.add(e.radius && e.radius > 0 ? `${e.amount} AOE DMG` : `${e.amount} DMG`)
    } else if (e.kind === 'projectile') {
      tags.add(`${e.damage} PROJECTILE DMG`)
      if (e.splashRadius && e.splashRadius > 0) tags.add(`${e.splashRadius}m SPLASH`)
      if (e.onHitStatus)
        tags.add(statusTag(e.onHitStatus.status, e.onHitStatus.durationSec, e.onHitStatus.stacks))
    } else if (e.kind === 'applyStatus') {
      tags.add(statusTag(e.status, e.durationSec, e.stacks))
    } else if (e.kind === 'knockup') {
      tags.add(`${e.airborneSec}s AIRBORNE`)
      if (e.knockbackDistance && e.knockbackDistance > 0)
        tags.add(`${e.knockbackDistance}m KNOCKBACK`)
    } else if (e.kind === 'heal') {
      tags.add(e.overSec && e.overSec > 0 ? `${e.amount} HEAL / ${e.overSec}s` : `${e.amount} HEAL`)
    } else if (e.kind === 'zone') {
      tags.add(`${e.durationSec}s ZONE`)
      if (e.damagePerTick) tags.add(`${e.damagePerTick}/TICK`)
      if (e.applyStatus)
        tags.add(statusTag(e.applyStatus.status, e.applyStatus.durationSec, e.applyStatus.stacks))
    } else if (e.kind === 'move') {
      tags.add(`${e.distance}m ${e.mode.toUpperCase()}`)
    } else if (e.kind === 'channel') {
      tags.add(`${e.durationSec}s CHANNEL`)
      if (e.perTick.kind === 'damage') tags.add(`${e.perTick.amount}/TICK`)
      if (e.perTick.kind === 'heal') tags.add(`${e.perTick.amount}/TICK HEAL`)
      if (e.perTick.kind === 'applyStatus')
        tags.add(statusTag(e.perTick.status, e.perTick.durationSec, e.perTick.stacks))
    } else if (e.kind === 'cleanse') {
      tags.add(e.status ? `CLEANSE ${e.status.toUpperCase()}` : 'FULL CLEANSE')
    } else if (e.kind === 'restoreStamina') {
      tags.add(`+${e.amount} STAMINA`)
    } else if (e.kind === 'lifesteal') {
      tags.add(`${Math.round(e.fraction * 100)}% LIFESTEAL`)
    } else if (e.kind === 'resourceDrain') {
      tags.add(`-${e.amount} ${e.resource.toUpperCase()}`)
    }
  }
  return Array.from(tags).slice(0, 6)
}

function targetingTags(def: AbilityDef): string[] {
  if (def.targeting === 'self') return ['SELF']
  if (def.targeting === 'point') return ['POINT AREA']
  if (def.effects.some((effect) => effect.kind === 'projectile')) return ['SKILL SHOT']
  if (def.targeting === 'forward') return ['AIM LOCK']
  if (def.targeting === 'target') return ['TARGET']
  return []
}

function statusTag(status: string, durationSec: number, stacks?: number): string {
  const stackText = stacks && stacks > 1 ? ` x${stacks}` : ''
  return `${status.toUpperCase()}${stackText} ${durationSec}s`
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/** Formats an ability description with highlighted status names and bold numbers. */
function formatDesc(text: string): string {
  let s = escapeHtml(text)
  // Bold numbers: damage amounts, distances (m), durations (s)
  s = s.replace(/\b(\d+(?:\.\d+)?[ms]?)\b/g, '<b>$1</b>')
  // Status effects — color-coded
  const STATUS_MAP: [RegExp, string][] = [
    [/\b(Burn(?:ing)?)\b/gi, 'ds-fire'],
    [/\b(Chill(?:ed)?|Freeze|Frozen)\b/gi, 'ds-ice'],
    [/\b(Bleed(?:ing)?)\b/gi, 'ds-bleed'],
    [/\b(Stun(?:ned)?)\b/gi, 'ds-stun'],
    [/\b(Root(?:ed)?)\b/gi, 'ds-root'],
    [/\b(Slow(?:ed)?)\b/gi, 'ds-slow'],
    [/\b(Poison(?:ed)?)\b/gi, 'ds-nature'],
    [/\b(Blind(?:ed)?)\b/gi, 'ds-dark'],
    [/\b(Shield)\b/gi, 'ds-shield'],
    [/\b(Heal(?:ing)?|Lifesteal)\b/gi, 'ds-heal'],
    [/\b(Airborne|Knockback|Knockup)\b/gi, 'ds-cc'],
    [/\b(Curse)\b/gi, 'ds-dark'],
    [/\b(Teleport|Blink)\b/gi, 'ds-move'],
    [/\b(Dash)\b/gi, 'ds-move'],
  ]
  for (const [re, cls] of STATUS_MAP) {
    s = s.replace(re, `<span class="${cls}">$1</span>`)
  }
  return s
}

function tagClass(tag: string): string {
  if (
    /\b(OPENER|EXTENDER|CASHOUT|RAY|PRESSURE|SURVIVAL|COUNTER|MOBILITY|DRAIN|RESOURCE)\b/.test(tag)
  )
    return 'tag-role'
  if (/\b(SELF|POINT AREA|SKILL SHOT|AIM LOCK|TARGET)\b/.test(tag)) return 'tag-targeting'
  if (/\b(DMG|DAMAGE|PROJECTILE|SPLASH|TICK|ZONE)\b/.test(tag)) return 'tag-damage'
  if (/\b(AIRBORNE|KNOCKBACK|ROOT|STUN|FREEZE|SLOW|BLIND|MARK|CURSE)\b/.test(tag))
    return 'tag-control'
  if (/\b(BURN|BLEED|POISON|CHILL|SHIELD|HASTE|CLEANSE|INVULNERABLE)\b/.test(tag))
    return 'tag-status'
  if (/\b(DASH|TELEPORT|MOVE)\b/.test(tag)) return 'tag-move'
  if (/\b(HEAL|STAMINA|MANA|HP|LIFESTEAL|->)\b/.test(tag)) return 'tag-resource'
  if (/\b(WINDUP|CHANNEL|TICK)\b/.test(tag)) return 'tag-timing'
  return ''
}

function slotPoolTitle(slot: TargetAbilitySlotFamily, _idx: number): string {
  if (slot === 'melee') return 'Melee Ability'
  if (slot === 'bow') return 'Bow Ability'
  if (slot === 'magicBase') return 'Magic Base'
  if (slot === 'magicAdvanced') return 'Magic Advanced'
  return 'Utility Slot'
}

export const __loadoutStationSmoke = {
  storageKey: STORAGE_KEY,
  classStorageKey: CLASS_STORAGE_KEY,
  defaultSlots: DEFAULT_SLOTS,
}
