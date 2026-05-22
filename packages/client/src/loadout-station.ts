// Loadout Station UI.
//
// Class-aware build screen: the active class (Tank/Arciere/Mago/Ibrido) determines
// which slot families are available, which abilities are legal, and which vitals
// are displayed. 11 total slots; each slot is freely assignable within class
// slot-family budget (no slot is ever locked). Fixed transfers are no longer
// injected — they exist in the registry as legacy abilities for the current
// runtime but are not part of any target starter build.

import {
  ABILITY_DEFS,
  MASTERY_BONUSES,
  MessageTypes,
  computeLoadoutMastery,
  CLASS_IDS,
  TARGET_CLASS_DEFS,
  classLoadoutFitsSlotGrammar,
  isAbilityLegalForClass,
  type ClassId,
  type AbilityDef,
  type ElementId,
  type MasteryLevel,
} from '@ragequit/shared'
import type { Room } from 'colyseus.js'

import { abilityIconMarkup } from './icons.js'
import { actionLabel, onKeybindsChanged, slotKeybindEntries } from './input/keybinds.js'
import {
  LOADOUT_SLOT_ORDER,
  UTILITY_FLEX_SLOT_INDEX,
  buildLoadoutMessage,
  normalizeLoadoutSlots,
} from './input/loadout-slots.js'

const STORAGE_KEY = 'ragequit.loadout.v6'
const INSTANT_CAST_STORAGE_KEY = 'ragequit.instantCast.v2'
const CLASS_STORAGE_KEY = 'ragequit.loadout.classId'

// Class-specific mechanic descriptions shown in the vitals console.
const CLASS_MECHANIC_DESC: Record<ClassId, string> = {
  tank: 'FURY — Ogni colpo subito senza parare accumula Fury. A 100 Fury scatta uno scudo automatico e il prossimo attacco Melee ignora il 30% di riduzione danni.',
  archer:
    'MOMENTUM — Ogni tiro in movimento senza fermarsi aumenta il Momentum. A 5 stack il prossimo attacco ottiene +40% velocità freccia e ignora lo scudo nemico.',
  mage: 'RISONANZA — Incantesimi dello stesso elemento cast in sequenza aumentano la Risonanza. A 3 stack il prossimo cast è potenziato: +25% danno e costo mana dimezzato.',
  hybrid:
    'FLOW — Ogni abilità cast da una famiglia diversa dalla precedente aumenta il Flow. A 4 stack le prossime 2 abilità ignoreranno il GCD globale.',
}

// Starter preset builds per class — full 11-slot class-aware builds.
// Slot positions are packed by family regardless of wire-field name; the server
// validates by family budget (not position), so melee abilities may sit in
// "magic" wire positions etc. See 01_DESIGN/06_loadout_build.md for rationale.
// Each starter includes the class Recovery utility and no fixed transfers.
const CLASS_STARTER_PRESETS: Record<ClassId, string[]> = {
  // Tank: 3 melee + 2 bow + 6 utility = 11
  tank: [
    'uppercut', // slot 0 — melee (Uppercut: knockup setup)
    'piercing_shot', // slot 1 — bow   (Piercing Shot: physical cashout)
    'gap_closer', // slot 2 — melee (Gap Closer: engage dash)
    'guard_break', // slot 3 — melee (Guard Break: short-range setup)
    'disengage_shot', // slot 4 — bow   (Disengage Shot: spacing tool)
    'brace_recovery', // slot 5 — utility (Recovery — always first in build)
    'barrier', // slot 6 — utility
    'cleanse_surge', // slot 7 — utility
    'quick_dash', // slot 8 — utility
    'energize', // slot 9 — utility (Stamina economy)
    'smoke_screen', // slot 10 — utility
  ],
  // Arciere: 3 bow + 4 magicBase + 4 utility = 11
  archer: [
    'dark_barrier', // slot 0 — magicBase (protection without stopping ranged play)
    'pin_shot', // slot 1 — bow   (ranged setup)
    'marksman_shot', // slot 2 — bow   (precision cashout)
    'disengage_shot', // slot 3 — bow   (spacing response)
    'frost_bolt', // slot 4 — magicBase (control projectile)
    'fireball', // slot 5 — magicBase (splash projectile)
    'lightning_dash', // slot 6 — magicBase (magic movement)
    'hunters_flow', // slot 7 — utility (Recovery + Momentum spend)
    'quick_dash', // slot 8 — utility
    'cleanse_surge', // slot 9 — utility
    'smoke_screen', // slot 10 — utility
  ],
  // Mago: 4 magicBase + 4 magicAdvanced + 3 utility = 11
  mage: [
    'fireball', // slot 0 — magicBase (Fire projectile pressure)
    'ignite', // slot 1 — magicBase (Fast Fire follow-up for Risonanza)
    'frost_bolt', // slot 2 — magicBase (Ice pressure)
    'dark_barrier', // slot 3 — magicBase (Magic protection)
    'eruption', // slot 4 — magicAdvanced (launch setup)
    'meteor', // slot 5 — magicAdvanced (high-commit Fire cashout)
    'frost_pillar', // slot 6 — magicAdvanced (windup launch path)
    'blizzard', // slot 7 — magicAdvanced (large control field)
    'arcane_rebind', // slot 8 — utility (Recovery — Mana/Risonanza survival)
    'phase_shift', // slot 9 — utility (timed survival counter)
    'cleanse_surge', // slot 10 — utility
  ],
  // Ibrido: 1 melee + 1 bow + 2 magicBase + 2 magicAdvanced + 5 utility = 11
  hybrid: [
    'uppercut', // slot 0 — melee (sword setup)
    'marksman_shot', // slot 1 — bow   (bow cashout)
    'fireball', // slot 2 — magicBase (staff projectile pressure)
    'lightning_dash', // slot 3 — magicBase (staff movement + weapon-swap reward)
    'arc_lift', // slot 4 — magicAdvanced (spell launch path)
    'meteor', // slot 5 — magicAdvanced (advanced cashout)
    'adaptive_mend', // slot 6 — utility (Recovery — Flow-spend)
    'quick_dash', // slot 7 — utility
    'cleanse_surge', // slot 8 — utility
    'barrier', // slot 9 — utility
    'smoke_screen', // slot 10 — utility
  ],
}

// Default build used when no class is selected or no saved build exists.
// Matches the Ibrido (hybrid) starter from 01_DESIGN/06_loadout_build.md.
// Server DEFAULT_LOADOUT in GameRoom.ts must stay in sync with this.
const DEFAULT_SLOTS: string[] = [
  'uppercut', // melee
  'marksman_shot', // bow
  'fireball', // magicBase
  'lightning_dash', // magicBase
  'arc_lift', // magicAdvanced
  'meteor', // magicAdvanced
  'adaptive_mend', // utility (Ibrido Recovery)
  'quick_dash', // utility
  'cleanse_surge', // utility
  'barrier', // utility
  'smoke_screen', // utility
]

export interface LoadoutStationApi {
  open: () => void
  close: () => void
  getLoadout: () => readonly string[]
  /** Returns the active class id for the current build. Used by sendLoadout. */
  getClassId: () => ClassId
  isInstantCast: (abilityId: string) => boolean
  /** Merge server-persisted instant-cast flags into local state and save to localStorage. */
  applyPersistedInstantCast: (flags: Record<string, boolean>) => void
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
  const lsMagic = document.getElementById('ls-magic')!
  const lsUtility = document.getElementById('ls-utility')!
  const lsPool = document.getElementById('ls-pool')!
  const masteryBadge = document.getElementById('ls-mastery-badge')!
  const masteryPills = Array.from(document.querySelectorAll<HTMLElement>('#mastery-pills .mpill'))
  const btnBack = document.getElementById('ls-back') as HTMLButtonElement
  const btnDefault = document.getElementById('ls-default') as HTMLButtonElement
  const btnConfirm = document.getElementById('ls-confirm') as HTMLButtonElement
  const searchInput = document.getElementById('ls-search') as HTMLInputElement | null
  const filterBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-filter]'))
  const filterToggle = document.getElementById('ls-filter-toggle') as HTMLButtonElement | null
  const filterDrawer = document.getElementById('ls-filter-drawer')

  const detailsName = document.getElementById('ls-detail-name')
  const detailsMeta = document.getElementById('ls-detail-meta')
  const detailsDesc = document.getElementById('ls-detail-desc')
  const buildCoach = document.getElementById('ls-build-coach')
  const detailsMalus = document.getElementById('ls-detail-malus')
  const detailsInstant = document.getElementById('ls-detail-instant') as HTMLButtonElement | null
  const poolTitle = document.getElementById('ls-pool-title')
  const poolSubtitle = document.getElementById('ls-pool-subtitle')
  const abilityWheelKey = document.getElementById('ls-ability-wheel-key')
  const magicDeckKey = document.getElementById('ls-magic-deck-key')
  const utilityWheelKey = document.getElementById('ls-utility-wheel-key')

  // Class selector DOM refs
  const classTabs = Array.from(document.querySelectorAll<HTMLButtonElement>('.ls-class-tab'))
  // Class vitals DOM refs
  const vitalsClassName = document.getElementById('ls-vitals-class-name')
  const vitalsMechanicName = document.getElementById('ls-mechanic-name')
  const vitalsMechanicDesc = document.getElementById('ls-mechanic-desc')
  const vitalsBarHp = document.getElementById('ls-bar-hp') as HTMLElement | null
  const vitalsBarMana = document.getElementById('ls-bar-mana') as HTMLElement | null
  const vitalsBarStam = document.getElementById('ls-bar-stam') as HTMLElement | null
  const vitalsValHp = document.getElementById('ls-val-hp')
  const vitalsValMana = document.getElementById('ls-val-mana')
  const vitalsValStam = document.getElementById('ls-val-stam')
  const btnPreset = document.getElementById('ls-load-preset') as HTMLButtonElement | null

  let slots = loadSlots()
  let instantCast = loadInstantCastPrefs()
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
      if (Array.isArray(parsed.slots) && parsed.slots.length === 11)
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
    slots = normalizeLoadoutSlots(CLASS_STARTER_PRESETS[classId])
    setActiveSlot(0)
    save()
  }

  function loadInstantCastPrefs(): Record<string, boolean> {
    try {
      const raw = localStorage.getItem(INSTANT_CAST_STORAGE_KEY)
      if (!raw) return {}
      const parsed = JSON.parse(raw) as Record<string, boolean>
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }

  function saveInstantCastPrefs(): void {
    try {
      localStorage.setItem(INSTANT_CAST_STORAGE_KEY, JSON.stringify(instantCast))
    } catch {
      // Storage is optional.
    }
  }

  function defaultInstantCast(def: AbilityDef): boolean {
    return def.targeting !== 'point'
  }

  function isInstantCast(defOrId: AbilityDef | string): boolean {
    const def = typeof defOrId === 'string' ? ABILITY_DEFS[defOrId] : defOrId
    if (!def) return true
    return instantCast[def.id] ?? defaultInstantCast(def)
  }

  function toggleInstantCast(def: AbilityDef): void {
    if (buildLocked()) return
    instantCast = { ...instantCast, [def.id]: !isInstantCast(def) }
    saveInstantCastPrefs()
    rerender()
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

  function currentMastery(): { level: MasteryLevel; element: ElementId | undefined } {
    const defs = slots.map((id) => (id ? ABILITY_DEFS[id] : undefined)) as Array<
      AbilityDef | undefined
    >
    return computeLoadoutMastery(defs)
  }

  function slotPanel(slot: (typeof LOADOUT_SLOT_ORDER)[number]): HTMLElement {
    if (slot === 'melee') return lsMelee
    if (slot === 'bow') return lsBow
    if (slot === 'magic') return lsMagic
    return lsUtility
  }

  function slotKeyLabel(idx: number): string {
    return slotKeybindEntries().find(([, , slotIdx]) => slotIdx === idx)?.[1] ?? ''
  }

  function refreshSectionKeyLabels(): void {
    if (abilityWheelKey) abilityWheelKey.textContent = `${actionLabel('wheelAbility')} HOLD`
    if (magicDeckKey) {
      magicDeckKey.textContent = [
        actionLabel('spell1'),
        actionLabel('spell2'),
        actionLabel('spell3'),
        actionLabel('spell4'),
        actionLabel('spell5'),
      ].join(' ')
    }
    if (utilityWheelKey) utilityWheelKey.textContent = `${actionLabel('wheelUtility')} HOLD`
  }

  function makeSlotEl(idx: number): HTMLElement {
    const id = slots[idx] ?? ''
    const def = id ? ABILITY_DEFS[id] : undefined
    const el = document.createElement('button')
    el.type = 'button'
    el.className = `ls-slot ${idx === activeIdx ? 'active' : ''} el-${def?.element ?? 'none'}`
    el.dataset['idx'] = String(idx)
    const role = def ? abilityRole(def) : undefined
    const slotKind = LOADOUT_SLOT_ORDER[idx] ?? 'utility'
    el.innerHTML = [
      `<span class="ls-slot-icon">${def ? abilityIconMarkup(def.id) : slotKind.slice(0, 1).toUpperCase()}</span>`,
      `<span class="ls-slot-label">${slotKeyLabel(idx)}</span>`,
      `<span class="ls-slot-main"><span class="ls-slot-name">${def?.name ?? '— empty —'}</span><span class="ls-slot-role">${role?.title ?? slotPoolTitle(slotKind, idx)}</span></span>`,
      def ? `<span class="ls-slot-cost">${formatCost(def)} · ${def.cooldownSec}s</span>` : '',
      def
        ? `<span class="ls-slot-mode ${isInstantCast(def) ? 'instant' : 'preview'}">${isInstantCast(def) ? 'INSTANT' : 'PREVIEW'}</span>`
        : '',
      id ? '<button class="ls-slot-clear" title="Clear">×</button>' : '',
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
    for (const c of [lsMelee, lsBow, lsMagic, lsUtility]) {
      while (c.firstChild) c.removeChild(c.firstChild)
    }
    for (let i = 0; i < LOADOUT_SLOT_ORDER.length; i++) {
      slotPanel(LOADOUT_SLOT_ORDER[i]!).appendChild(makeSlotEl(i))
    }
  }

  function rebuildMastery(): void {
    const counts: Partial<Record<ElementId, number>> = {}
    // Only magic abilities count for mastery — filter by def.slot, not hardcoded indices.
    for (const id of slots) {
      const def = id ? ABILITY_DEFS[id] : undefined
      if (!def || def.slot !== 'magic' || def.element === 'none') continue
      counts[def.element as ElementId] = (counts[def.element as ElementId] ?? 0) + 1
    }
    const elements: ElementId[] = ['fire', 'ice', 'lightning', 'dark', 'nature']
    for (const pill of masteryPills) {
      const el = pill.dataset['el'] as ElementId
      if (!elements.includes(el)) continue
      const n = counts[el] ?? 0
      pill.textContent = `${capitalize(el)} ${n}/5`
      pill.className = `mpill el-${el} ${n >= 4 ? 'active' : n >= 2 ? 'partial' : ''}`
    }
    const { level, element } = currentMastery()
    const bonus = element ? MASTERY_BONUSES[element] : null
    if (level === 0 || !bonus || !element) {
      masteryBadge.textContent = 'NO MASTERY'
      masteryBadge.className = 'mastery-badge tier-0'
    } else {
      const label = level === 2 ? 'PERFECT MASTERY' : 'MASTERY ACTIVE'
      masteryBadge.textContent = `${label} · ${element.toUpperCase()}`
      masteryBadge.className = `mastery-badge el-${element} tier-${level}`
      masteryBadge.style.color = bonus.color
      masteryBadge.style.borderColor = bonus.color + '66'
    }
  }

  function rebuildDetails(): void {
    const def = ABILITY_DEFS[slots[activeIdx] ?? '']
    if (!detailsName || !detailsMeta || !detailsDesc || !detailsMalus) return
    if (!def) {
      detailsName.textContent = 'Select an ability'
      detailsMeta.textContent = (LOADOUT_SLOT_ORDER[activeIdx] ?? 'utility').toUpperCase() + ' SLOT'
      detailsDesc.replaceChildren()
      const empty = document.createElement('p')
      empty.textContent = 'Pick a compatible ability from the pool below.'
      detailsDesc.appendChild(empty)
      rebuildBuildCoach()
      detailsMalus.textContent = ''
      if (detailsInstant) detailsInstant.hidden = true
      return
    }
    if (detailsInstant) {
      const instant = isInstantCast(def)
      detailsInstant.hidden = false
      detailsInstant.setAttribute('aria-pressed', String(instant))
      detailsInstant.innerHTML = [
        '<span class="mode-kicker">Cast mode</span>',
        `<span class="mode-state">${instant ? 'Instant' : 'Preview'}</span>`,
        `<span class="mode-help">${instant ? 'Key casts now' : 'Key primes · LMB confirms'}</span>`,
      ].join('')
      detailsInstant.classList.toggle('on', instant)
      detailsInstant.title = instant
        ? 'Click to switch to preview placement: key primes, LMB confirms.'
        : 'Click to switch to instant cast: direct key casts immediately.'
    }
    detailsName.textContent = def.name
    const role = abilityRole(def)
    const quickStats = abilityQuickStats(def)
    detailsMeta.textContent = [
      def.slot.toUpperCase(),
      def.element !== 'none' ? def.element.toUpperCase() : 'PHYSICAL',
      formatCost(def),
      `${def.cooldownSec}s CD`,
      def.range > 0 ? `${def.range}m` : 'self',
    ].join(' · ')
    detailsDesc.replaceChildren(
      roleBlock(role),
      castModeBlock(def, isInstantCast(def)),
      renderEffectTags(def),
      quickStatBlock(quickStats),
      textBlock(def.description),
    )
    rebuildBuildCoach()
    detailsMalus.textContent = def.miniMalus
  }

  function rebuildBuildCoach(): void {
    if (!buildCoach) return
    const report = analyzeBuild(slots, activeClassId)
    buildCoach.replaceChildren()

    const head = document.createElement('div')
    head.className = 'coach-head'
    const title = document.createElement('div')
    title.className = 'coach-title'
    title.textContent = 'Build Coach'
    const rating = document.createElement('div')
    rating.className = 'coach-rating'
    rating.textContent = `${report.score}/6`
    head.append(title, rating)

    const grid = document.createElement('div')
    grid.className = 'coach-grid'
    for (const item of report.pills) {
      const pill = document.createElement('div')
      pill.className = `coach-pill ${item.ok ? 'good' : 'warn'}`
      const label = document.createElement('span')
      label.textContent = item.label
      const value = document.createElement('b')
      value.textContent = item.value
      pill.append(label, value)
      grid.appendChild(pill)
    }

    const lines = document.createElement('div')
    lines.className = 'coach-lines'
    for (const item of report.lines) {
      const line = document.createElement('div')
      line.className = `coach-line ${item.kind}`
      line.textContent = item.text
      lines.appendChild(line)
    }

    buildCoach.append(head, grid, lines)
    rebuildFlowStrip(report)
  }

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      poolFilterEl = btn.dataset['filter'] ?? 'all'
      filterBtns.forEach((b) => b.classList.toggle('active-filter', b === btn))
      rebuildPool()
    })
  })
  filterBtns.find((b) => b.dataset['filter'] === 'all')?.classList.add('active-filter')

  filterToggle?.addEventListener('click', () => {
    const open = filterDrawer?.classList.toggle('open') ?? false
    filterToggle.setAttribute('aria-expanded', String(open))
    filterToggle.textContent = open ? 'FILTERS' : 'FILTERS ↓'
  })

  searchInput?.addEventListener('input', () => {
    poolSearch = searchInput.value.trim().toLowerCase()
    rebuildPool()
  })
  searchInput?.addEventListener('keydown', (e) => e.stopPropagation())
  detailsInstant?.addEventListener('click', () => {
    const def = ABILITY_DEFS[slots[activeIdx] ?? '']
    if (def) toggleInstantCast(def)
  })

  function rebuildPool(): void {
    while (lsPool.firstChild) lsPool.removeChild(lsPool.firstChild)
    syncPoolFilterButtons()

    const targetSlot = LOADOUT_SLOT_ORDER[activeIdx]!
    const locked = buildLocked()
    const targetLabel = slotPoolTitle(targetSlot, activeIdx)
    if (poolTitle) poolTitle.textContent = targetLabel
    if (poolSubtitle)
      poolSubtitle.textContent = locked
        ? 'Build editing is locked during live combat'
        : poolSubtitleFor(targetSlot, activeIdx)
    const defs = (Object.values(ABILITY_DEFS) as AbilityDef[])
      .filter((def) => def.slot === targetSlot)
      .filter((def) => activeIdx !== UTILITY_FLEX_SLOT_INDEX || !def.id.startsWith('transfer_'))
      .filter((def) => !slots.some((id, idx) => idx !== activeIdx && id === def.id))
      // Class legality filter — only show abilities valid for the active class
      .filter((def) => isAbilityLegalForClass(def.id, activeClassId))
      .filter((def) => {
        if (poolFilterEl === 'all') return true
        if (poolFilterEl === 'recommended')
          return recommendationTags(def, activeIdx, slots).length > 0
        if (poolFilterEl === 'starter') return def.comboRole === 'starter'
        if (poolFilterEl === 'control') return abilityHasControl(def)
        if (poolFilterEl === 'instant') return isInstantCast(def)
        if (poolFilterEl === 'preview') return !isInstantCast(def)
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
      const role = abilityRole(def)
      const quickStats = abilityQuickStats(def)
      const instant = isInstantCast(def)
      const recTags = recommendationTags(def, activeIdx, slots)
      card.className = `pool-card el-${def.element} ${isActive ? 'equipped' : ''} ${recTags.length > 0 ? 'recommended' : ''} ${locked ? 'locked' : ''}`
      card.disabled = locked
      card.title = def.description
      card.setAttribute(
        'aria-label',
        `${def.name}. ${role.title}. ${def.element !== 'none' ? def.element : 'physical'}. ${formatCost(def)}. ${formatEffectTags(def).join(', ')}`,
      )
      card.innerHTML = [
        `<span class="pool-icon-box">${abilityIconMarkup(def.id)}</span>`,
        `<span class="pool-topline"><span class="pool-role-icon">${role.icon}</span><span class="pool-role-text">${escapeHtml(role.title)}</span>${recTags.length > 0 ? ` <span class="recommend-tag">${escapeHtml(recTags[0]!)}</span>` : def.comboRole === 'starter' ? ' <span class="starter-tag">STARTER</span>' : ''}</span>`,
        `<span class="instant-toggle ${instant ? 'on' : ''}" role="switch" aria-checked="${instant}" title="${instant ? 'Click: switch to Preview placement' : 'Click: switch to Instant cast'}"><span>${instant ? 'Instant' : 'Preview'}</span><small>${instant ? 'key casts' : 'LMB confirms'}</small></span>`,
        `<span class="pool-name">${escapeHtml(def.name)}</span>`,
        `<span class="pool-meta">${def.element !== 'none' ? def.element.toUpperCase() : 'PHYSICAL'} · ${formatCost(def)} · ${def.cooldownSec}s CD</span>`,
        `<span class="pool-summary">${escapeHtml(def.description)}</span>`,
        `<span class="effect-tags">${formatEffectTags(def)
          .map((tag) => `<span class="${tagClass(tag)}">${escapeHtml(tag)}</span>`)
          .join('')}</span>`,
        `<span class="pool-bars">${quickStats.map((s) => `<span class="pool-bar ${s.className}" title="${escapeHtml(s.label)}"><i style="width:${s.value * 20}%"></i></span>`).join('')}</span>`,
      ].join('')
      card.addEventListener('click', () => {
        if (buildLocked()) return
        slots[activeIdx] = def.id
        const nextIdx = slots.findIndex(
          (value, idx) => idx > activeIdx && !value && LOADOUT_SLOT_ORDER[idx] === targetSlot,
        )
        if (nextIdx >= 0) activeIdx = nextIdx
        save()
        rerender()
      })
      card.querySelector('.instant-toggle')?.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        toggleInstantCast(def)
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

  function rebuildClassVitals(): void {
    const classDef = TARGET_CLASS_DEFS[activeClassId]
    const { hp, mana, stamina } = classDef.resourceMaxima
    const HP_REF = 250,
      MANA_REF = 160,
      STAM_REF = 150
    if (vitalsClassName) vitalsClassName.textContent = classDef.label.toUpperCase()
    if (vitalsMechanicName) vitalsMechanicName.textContent = classDef.mechanicId.toUpperCase()
    if (vitalsMechanicDesc) vitalsMechanicDesc.textContent = CLASS_MECHANIC_DESC[activeClassId]
    if (vitalsValHp) vitalsValHp.textContent = String(hp)
    if (vitalsValMana) vitalsValMana.textContent = String(mana)
    if (vitalsValStam) vitalsValStam.textContent = String(stamina)
    if (vitalsBarHp) vitalsBarHp.style.width = `${Math.round((hp / HP_REF) * 100)}%`
    if (vitalsBarMana) vitalsBarMana.style.width = `${Math.round((mana / MANA_REF) * 100)}%`
    if (vitalsBarStam) vitalsBarStam.style.width = `${Math.round((stamina / STAM_REF) * 100)}%`
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
    rebuildMastery()
    rebuildClassVitals()
    rebuildDetails()
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
      btnConfirm.textContent = 'LOCKED IN COMBAT'
      btnConfirm.classList.add('locked')
      window.setTimeout(() => {
        btnConfirm.classList.remove('locked')
        btnConfirm.textContent = 'CONFIRM BUILD'
      }, 900)
      return
    }
    save()
    const room = getRoom()
    if (room) {
      room.send(MessageTypes.Loadout, buildLoadoutMessage(slots, instantCast, activeClassId))
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
        ? 'LOCKED IN COMBAT'
        : getRoom()
          ? 'CONFIRM BUILD'
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
    isInstantCast,
    applyPersistedInstantCast: (flags: Record<string, boolean>) => {
      // Server flags win only for keys the server explicitly sent; local prefs
      // for other abilities are preserved.
      instantCast = { ...instantCast, ...flags }
      saveInstantCastPrefs()
      rerender()
    },
  }
}

function formatCost(def: AbilityDef): string {
  if (def.costMana > 0 && def.costStamina > 0) return `${def.costMana}MP + ${def.costStamina}SP`
  if (def.costMana > 0) return `${def.costMana} MP`
  if (def.costStamina > 0) return `${def.costStamina} SP`
  return 'FREE'
}

function textBlock(text: string): HTMLParagraphElement {
  const p = document.createElement('p')
  p.textContent = text
  return p
}

function castModeBlock(def: AbilityDef, instant: boolean): HTMLDivElement {
  const block = document.createElement('div')
  block.className = `cast-mode-card ${instant ? 'instant' : 'preview'}`

  const label = document.createElement('b')
  label.textContent = instant ? 'Instant cast' : 'Preview placement'

  const copy = document.createElement('span')
  if (instant) {
    copy.textContent =
      def.targeting === 'forward'
        ? 'Direct key press fires toward the current crosshair.'
        : 'Direct key press activates immediately.'
  } else {
    copy.textContent = 'Key press primes the spell, shows the placement preview, then LMB confirms.'
  }

  block.append(label, copy)
  return block
}

interface AbilityRoleInfo {
  icon: string
  title: string
  line: string
}

interface AbilityQuickStat {
  key: string
  label: string
  value: number
  className: string
}

interface BuildCoachReport {
  score: number
  pills: Array<{ label: string; value: string; ok: boolean }>
  lines: Array<{ text: string; kind: 'good' | 'warn' }>
}

function analyzeBuild(slotIds: readonly string[], classId: ClassId): BuildCoachReport {
  const defs = slotIds
    .map((id) => ABILITY_DEFS[id])
    .filter((def): def is AbilityDef => Boolean(def))
  const roleCount = (role: AbilityDef['comboRole']): number =>
    defs.filter((def) => def.comboRole === role).length
  const starters = roleCount('starter')
  const extenders = roleCount('extender')
  const finishers = roleCount('finisher') + roleCount('ray')
  const survival = roleCount('survival') + roleCount('counter') + roleCount('mobility')
  const controls = defs.filter((def) => abilityHasControl(def)).length
  const pointPreviews = defs.filter((def) => def.targeting === 'point').length
  const instantHits = defs.filter(
    (def) => def.targeting === 'forward' || def.comboRole === 'ray',
  ).length
  const hasAirPunish = defs.some((def) => def.comboRole === 'finisher')

  // Pass 4: Recovery check replaces Mastery as the build health indicator.
  const recoveryId = TARGET_CLASS_DEFS[classId].recoveryId
  const hasRecovery = slotIds.includes(recoveryId)

  let score = 0
  if (starters > 0) score++
  if (extenders > 0 || controls >= 2) score++
  if (finishers > 0) score++
  if (survival > 0) score++
  if (hasRecovery) score++
  if (pointPreviews > 0 && instantHits > 0) score++

  const lines: BuildCoachReport['lines'] = []
  if (starters === 0)
    lines.push({
      kind: 'warn',
      text: 'Missing opener: add a launch, root, freeze, stun, or blind to start real combos.',
    })
  else
    lines.push({
      kind: 'good',
      text: 'Opener online: use the wheel to prime a setup, then confirm with LMB.',
    })
  if (finishers === 0)
    lines.push({
      kind: 'warn',
      text: 'Missing finisher: add an air punish, instant ray, or precision shot to cash out CC.',
    })
  else
    lines.push({
      kind: 'good',
      text: hasAirPunish
        ? 'Air punish available: launch into finisher for the damage bonus.'
        : 'Direct punish available: ray/projectile can cash out roots and freezes.',
    })
  if (pointPreviews > 0 && instantHits === 0)
    lines.push({
      kind: 'warn',
      text: 'You have placed previews but few instant hits; add a ray or fast shot for follow-up speed.',
    })
  if (!hasRecovery)
    lines.push({
      kind: 'warn',
      text: `Add your class Recovery (${recoveryId.replace(/_/g, ' ')}) to sustain in fights.`,
    })
  else
    lines.push({
      kind: 'good',
      text: 'Recovery slotted: your class sustain is covered.',
    })
  if (survival === 0)
    lines.push({
      kind: 'warn',
      text: 'No reset tool: consider shield, cleanse, dash, phase, or heal in the utility slot.',
    })

  return {
    score,
    pills: [
      { label: 'Opener', value: starters > 0 ? String(starters) : 'MISS', ok: starters > 0 },
      { label: 'Control', value: controls > 0 ? String(controls) : 'LOW', ok: controls > 0 },
      { label: 'Cashout', value: finishers > 0 ? String(finishers) : 'MISS', ok: finishers > 0 },
      { label: 'Reset', value: survival > 0 ? String(survival) : 'MISS', ok: survival > 0 },
      {
        label: 'Preview',
        value: pointPreviews > 0 ? String(pointPreviews) : 'NONE',
        ok: pointPreviews > 0,
      },
      {
        label: 'Recovery',
        value: hasRecovery ? 'YES' : 'MISS',
        ok: hasRecovery,
      },
    ],
    lines: lines.slice(0, 5),
  }
}

function rebuildFlowStrip(report: BuildCoachReport): void {
  const state = new Map(report.pills.map((pill) => [pill.label.toLowerCase(), pill.ok]))
  for (const step of flowStepsGlobal()) {
    const key = step.dataset['flow'] ?? ''
    const lookup = key === 'cashout' ? 'cashout' : key
    const ok = state.get(lookup) ?? false
    step.classList.toggle('online', ok)
    step.classList.toggle('missing', !ok)
    step.title = ok
      ? `${step.textContent ?? lookup} ready`
      : `${step.textContent ?? lookup} missing`
  }
}

function flowStepsGlobal(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('#ls-flow-strip [data-flow]'))
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
  const masteryTarget = closestMasteryElement(slotIds, activeIdx)

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
  if (masteryTarget && candidate.slot === 'magic' && candidate.element === masteryTarget)
    tags.push('MASTERY')
  return Array.from(new Set(tags)).slice(0, 2)
}

function closestMasteryElement(
  slotIds: readonly string[],
  activeIdx: number,
): ElementId | undefined {
  // Only suggest mastery when the active slot is a magic slot.
  const activeDef = slotIds[activeIdx] ? ABILITY_DEFS[slotIds[activeIdx]!] : undefined
  const isActiveMagic =
    activeDef?.slot === 'magic' || (!activeDef && LOADOUT_SLOT_ORDER[activeIdx] === 'magic')
  if (!isActiveMagic) return undefined
  const counts: Partial<Record<ElementId, number>> = {}
  // Count magic abilities across all slots dynamically (not hardcoded 2..7)
  for (let idx = 0; idx < slotIds.length; idx++) {
    if (idx === activeIdx) continue
    const def = ABILITY_DEFS[slotIds[idx] ?? '']
    if (!def || def.slot !== 'magic' || def.element === 'none') continue
    counts[def.element as ElementId] = (counts[def.element as ElementId] ?? 0) + 1
  }
  const best = (Object.entries(counts) as Array<[ElementId, number]>).sort((a, b) => b[1] - a[1])[0]
  if (!best || best[1] < 1) return undefined
  return best[0]
}

function roleBlock(role: AbilityRoleInfo): HTMLDivElement {
  const block = document.createElement('div')
  block.className = 'ability-role'
  const icon = document.createElement('span')
  icon.className = 'ability-role-icon'
  icon.textContent = role.icon
  const copy = document.createElement('span')
  copy.className = 'ability-role-copy'
  const title = document.createElement('b')
  title.textContent = role.title
  const line = document.createElement('small')
  line.textContent = role.line
  copy.append(title, line)
  block.append(icon, copy)
  return block
}

function quickStatBlock(stats: AbilityQuickStat[]): HTMLDivElement {
  const block = document.createElement('div')
  block.className = 'ability-quickstats'
  for (const stat of stats) {
    const row = document.createElement('div')
    row.className = `ability-quickstat ${stat.className}`
    const label = document.createElement('span')
    label.textContent = stat.label
    const meter = document.createElement('i')
    meter.style.width = `${stat.value * 20}%`
    row.append(label, meter)
    block.appendChild(row)
  }
  return block
}

function renderEffectTags(def: AbilityDef): HTMLDivElement {
  const wrap = document.createElement('div')
  wrap.className = 'effect-tags detail-tags'
  for (const tag of formatEffectTags(def)) {
    const chip = document.createElement('span')
    chip.className = tagClass(tag)
    chip.textContent = tag
    wrap.appendChild(chip)
  }
  return wrap
}

const COMBO_ROLE_INFO: Record<AbilityDef['comboRole'], AbilityRoleInfo> = {
  starter: {
    icon: '^',
    title: 'Combo Starter',
    line: 'Applies launch, root, freeze, blind or stun.',
  },
  extender: {
    icon: '[]',
    title: 'Combo Extender',
    line: 'Controls space with zones, slows or repeated ticks.',
  },
  finisher: {
    icon: '!',
    title: 'Finisher',
    line: 'High-value hit that gains +25% damage against airborne targets.',
  },
  ray: {
    icon: '|',
    title: 'Instant Ray',
    line: 'Instant line-of-sight hit if the target is under the crosshair.',
  },
  pressure: {
    icon: '*',
    title: 'Pressure',
    line: 'Applies direct damage, bleed, burn, poison or fast threat.',
  },
  survival: {
    icon: '+',
    title: 'Survival Tool',
    line: 'Keeps you alive through healing, shield, sustain, or recovery.',
  },
  counter: {
    icon: '<>',
    title: 'Counter Tool',
    line: 'Breaks pressure, cleanses, phases, disengages, or interrupts.',
  },
  mobility: {
    icon: '>>',
    title: 'Mobility',
    line: 'Moves, dashes, teleports or repositions the player.',
  },
  drain: {
    icon: '-',
    title: 'Resource Drain',
    line: 'Attacks enemy Mana or Stamina while creating tempo.',
  },
  resource: {
    icon: '=',
    title: 'Resource Tool',
    line: 'Converts or restores resources on a fixed utility rhythm.',
  },
}

function abilityRole(def: AbilityDef): AbilityRoleInfo {
  if (def.comboRole) return COMBO_ROLE_INFO[def.comboRole]

  let hasMove = false
  let hasHardCc = false
  let hasPersistentZone = false
  let hasAreaHit = false
  let hasSustain = false
  let hasDot = false
  let hasProjectile = false
  let hasChannel = false

  for (const e of def.effects) {
    if (e.kind === 'move') hasMove = true
    else if (e.kind === 'knockup') hasHardCc = true
    else if (e.kind === 'zone') {
      hasPersistentZone = true
      if (e.applyStatus) {
        hasHardCc = hasHardCc || statusControlScore(e.applyStatus.status) >= 2
        hasDot = hasDot || statusControlScore(e.applyStatus.status) === 1
      }
    } else if (e.kind === 'damage') {
      hasAreaHit = hasAreaHit || Boolean(e.radius && e.radius > 0)
    } else if (e.kind === 'projectile') {
      hasProjectile = true
      hasAreaHit = hasAreaHit || Boolean(e.splashRadius && e.splashRadius > 0)
      if (e.onHitStatus) {
        hasHardCc = hasHardCc || statusControlScore(e.onHitStatus.status) >= 2
        hasDot = hasDot || statusControlScore(e.onHitStatus.status) === 1
      }
    } else if (e.kind === 'applyStatus') {
      const selfOnly = def.targeting === 'self' && !(e.radius && e.radius > 0)
      hasHardCc = hasHardCc || (!selfOnly && statusControlScore(e.status) >= 2)
      hasDot = hasDot || (!selfOnly && statusControlScore(e.status) === 1)
      hasSustain = hasSustain || ['shield', 'haste'].includes(e.status)
    } else if (e.kind === 'channel') {
      hasChannel = true
      hasAreaHit =
        hasAreaHit ||
        (e.perTick.kind === 'damage' && Boolean(e.perTick.radius && e.perTick.radius > 0))
      hasSustain = hasSustain || e.perTick.kind === 'heal'
      hasHardCc =
        hasHardCc || (e.perTick.kind === 'applyStatus' && statusControlScore(e.perTick.status) >= 2)
    } else if (
      e.kind === 'heal' ||
      e.kind === 'cleanse' ||
      e.kind === 'restoreStamina' ||
      e.kind === 'transmute' ||
      e.kind === 'lifesteal' ||
      e.kind === 'resourceDrain'
    ) {
      hasSustain = true
    }
  }

  if (def.id.startsWith('transfer_'))
    return {
      icon: '↔',
      title: 'Resource Swap',
      line: 'Converts one resource into another on a fixed utility key.',
    }
  if (hasSustain && !hasHardCc && !hasPersistentZone)
    return {
      icon: '+',
      title: 'Survival Tool',
      line: 'Keeps you alive, cleansed, mobile or stocked on resources.',
    }
  if (hasMove)
    return {
      icon: '↗',
      title: hasHardCc ? 'Engage Setup' : 'Mobility Hit',
      line: 'Moves the player and may apply control or damage.',
    }
  if (hasHardCc && (hasPersistentZone || hasAreaHit))
    return { icon: '⌖', title: 'Area Control', line: 'Controls space with AoE and status effects.' }
  if (hasHardCc)
    return { icon: '↑', title: 'Combo Starter', line: 'Applies a disabling or airborne status.' }
  if (hasPersistentZone)
    return {
      icon: '□',
      title: 'Zone Pressure',
      line: 'Controls an area with damage or status ticks.',
    }
  if (hasAreaHit || hasChannel)
    return {
      icon: '◇',
      title: 'Area Damage',
      line: 'Hits a space or repeated window instead of one clean shot.',
    }
  if (hasProjectile)
    return { icon: '➤', title: 'Skill Shot', line: 'Ranged aim tool fired toward the crosshair.' }
  if (hasDot)
    return { icon: '✦', title: 'Status Pressure', line: 'Applies damage or debuffs over time.' }
  return { icon: '◆', title: 'Direct Hit', line: 'Straightforward damage or utility effect.' }
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
      e.kind === 'transmute' ||
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
  tags.add(def.comboRole.toUpperCase())
  if (def.comboRole === 'finisher') tags.add('AIR PUNISH')
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
    } else if (e.kind === 'transmute') {
      tags.add(e.direction.replaceAll('_', ' -> ').toUpperCase())
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
  if (def.targeting === 'point') return ['POINT PREVIEW']
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

function tagClass(tag: string): string {
  if (
    /\b(STARTER|EXTENDER|FINISHER|RAY|PRESSURE|SURVIVAL|COUNTER|MOBILITY|DRAIN|RESOURCE)\b/.test(
      tag,
    )
  )
    return 'tag-role'
  if (/\b(SELF|POINT PREVIEW|SKILL SHOT|AIM LOCK|TARGET)\b/.test(tag)) return 'tag-targeting'
  if (/\b(DMG|DAMAGE|PROJECTILE|SPLASH|TICK)\b/.test(tag)) return 'tag-damage'
  if (/\b(AIRBORNE|AIR PUNISH|KNOCKBACK|ROOT|STUN|FREEZE|SLOW|BLIND|MARK|CURSE)\b/.test(tag))
    return 'tag-control'
  if (/\b(BURN|BLEED|POISON|CHILL|SHIELD|HASTE|CLEANSE|INVULNERABLE)\b/.test(tag))
    return 'tag-status'
  if (/\b(DASH|TELEPORT|MOVE)\b/.test(tag)) return 'tag-move'
  if (/\b(HEAL|STAMINA|MANA|HP|LIFESTEAL|->)\b/.test(tag)) return 'tag-resource'
  return ''
}

function slotPoolTitle(slot: (typeof LOADOUT_SLOT_ORDER)[number], _idx: number): string {
  if (slot === 'melee') return 'Melee Ability'
  if (slot === 'bow') return 'Bow Ability'
  if (slot === 'magic') return 'Spell Slot'
  return 'Utility Slot'
}

function poolSubtitleFor(slot: (typeof LOADOUT_SLOT_ORDER)[number], _idx: number): string {
  if (slot === 'melee') return 'Close range pressure, launches, stuns and bleed'
  if (slot === 'bow') return 'Skill shots, roots, traps and ranged pressure'
  if (slot === 'magic') return 'Damage, status effects, zones and combo setup'
  return 'Survival, cleanse, mobility and resource tools'
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export const __loadoutStationSmoke = {
  storageKey: STORAGE_KEY,
  classStorageKey: CLASS_STORAGE_KEY,
  instantCastStorageKey: INSTANT_CAST_STORAGE_KEY,
  slotOrder: LOADOUT_SLOT_ORDER,
  defaultSlots: DEFAULT_SLOTS,
}
