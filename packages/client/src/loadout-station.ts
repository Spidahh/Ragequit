// Loadout Station UI.
//
// Single-purpose build screen: pick 1 melee, 1 bow, 5 magic, 1 flex utility.
// The three resource transfers are fixed utility slots.
// Mastery: 4+ same-element magic abilities = Mastery 1. 5/5 = Mastery 2.

import {
  ABILITY_DEFS,
  MASTERY_BONUSES,
  MessageTypes,
  computeLoadoutMastery,
  type AbilityDef,
  type ElementId,
  type MasteryLevel,
} from '@ragequit/shared'
import type { Room } from 'colyseus.js'

import { abilityIconMarkup } from './icons.js'
import { actionLabel, onKeybindsChanged, slotKeybindEntries } from './input/keybinds.js'
import {
  FIXED_TRANSFER_SLOTS,
  LOADOUT_SLOT_ORDER,
  UTILITY_FLEX_SLOT_INDEX,
  buildLoadoutMessage,
  normalizeLoadoutSlots,
} from './input/loadout-slots.js'

const STORAGE_KEY = 'ragequit.loadout.v6'
const INSTANT_CAST_STORAGE_KEY = 'ragequit.instantCast.v2'

const DEFAULT_SLOTS: string[] = [
  'uppercut',
  'piercing_shot',
  'fireball',
  'flame_wall',
  'frost_bolt',
  'chain_bolt',
  'shadow_bolt',
  FIXED_TRANSFER_SLOTS[7],
  FIXED_TRANSFER_SLOTS[8],
  FIXED_TRANSFER_SLOTS[9],
  'quick_dash',
]

export interface LoadoutStationApi {
  open: () => void
  close: () => void
  getLoadout: () => readonly string[]
  isInstantCast: (abilityId: string) => boolean
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

  const detailsName = document.getElementById('ls-detail-name')
  const detailsMeta = document.getElementById('ls-detail-meta')
  const detailsDesc = document.getElementById('ls-detail-desc')
  const detailsMalus = document.getElementById('ls-detail-malus')
  const detailsInstant = document.getElementById('ls-detail-instant') as HTMLButtonElement | null
  const poolTitle = document.getElementById('ls-pool-title')
  const poolSubtitle = document.getElementById('ls-pool-subtitle')
  const abilityWheelKey = document.getElementById('ls-ability-wheel-key')
  const magicDeckKey = document.getElementById('ls-magic-deck-key')
  const utilityWheelKey = document.getElementById('ls-utility-wheel-key')

  let slots = loadSlots()
  let instantCast = loadInstantCastPrefs()
  let activeIdx = 0
  let poolFilterEl = 'all'
  let poolSearch = ''

  function resetPoolFilters(): void {
    poolFilterEl = 'all'
    poolSearch = ''
    if (searchInput) searchInput.value = ''
  }

  function syncPoolFilterButtons(): void {
    filterBtns.forEach((btn) => btn.classList.toggle('active-filter', btn.dataset['filter'] === poolFilterEl))
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
      if (Array.isArray(parsed.slots) && parsed.slots.length === 11) return normalizeLoadoutSlots(parsed.slots)
    } catch {
      // Fall through to defaults.
    }
    return DEFAULT_SLOTS.slice()
  }

  function save(): void {
    try {
      slots = normalizeLoadoutSlots(slots)
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ slots }))
    } catch {
      // Storage is optional.
    }
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
    const defs = slots.map((id) => (id ? ABILITY_DEFS[id] : undefined)) as Array<AbilityDef | undefined>
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
    const lockedTransfer = idx in FIXED_TRANSFER_SLOTS
    const el = document.createElement('button')
    el.type = 'button'
    el.className = `ls-slot ${idx === activeIdx ? 'active' : ''} ${lockedTransfer ? 'locked-transfer' : ''} el-${def?.element ?? 'none'}`
    el.dataset['idx'] = String(idx)
    el.innerHTML = [
      `<span class="ls-slot-label">${slotKeyLabel(idx)}</span>`,
      `<span class="ls-slot-name">${def?.name ?? '— empty —'}</span>`,
      def ? `<span class="ls-slot-cost">${formatCost(def)} · ${def.cooldownSec}s</span>` : '',
      lockedTransfer ? '<span class="ls-slot-lock">FIXED</span>' : id ? '<button class="ls-slot-clear" title="Clear">×</button>' : '',
    ].join('')
    el.addEventListener('click', (event) => {
      if (lockedTransfer) {
        setActiveSlot(idx)
        rerender()
        return
      }
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
    // Only magic slots count for mastery.
    for (const id of slots.slice(2, 7)) {
      const def = id ? ABILITY_DEFS[id] : undefined
      if (!def || def.element === 'none') continue
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
      empty.textContent = 'Pick a compatible ability. Transfer slots are fixed and always stay on Z, X and F.'
      detailsDesc.appendChild(empty)
      detailsMalus.textContent = ''
      if (detailsInstant) detailsInstant.hidden = true
      return
    }
    if (detailsInstant) {
      const instant = isInstantCast(def)
      detailsInstant.hidden = false
      detailsInstant.textContent = instant ? 'INSTANT' : 'PREVIEW'
      detailsInstant.classList.toggle('on', instant)
      detailsInstant.title = instant
        ? 'Instant cast: the key casts this ability immediately.'
        : 'Preview cast: the key arms placement and LMB confirms.'
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
    detailsDesc.replaceChildren(roleBlock(role), renderEffectTags(def), quickStatBlock(quickStats), textBlock(def.description))
    detailsMalus.textContent = def.miniMalus
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
    if (poolSubtitle) poolSubtitle.textContent = locked ? 'Build editing is locked during live combat' : poolSubtitleFor(targetSlot, activeIdx)
    if (activeIdx in FIXED_TRANSFER_SLOTS) {
      const empty = document.createElement('div')
      empty.className = 'pool-empty transfer-locked-copy'
      empty.textContent = 'This is a fixed resource-conversion slot. Z, X and F cannot be replaced.'
      lsPool.appendChild(empty)
      return
    }
    const defs = (Object.values(ABILITY_DEFS) as AbilityDef[])
      .filter((def) => def.slot === targetSlot)
      .filter((def) => activeIdx !== UTILITY_FLEX_SLOT_INDEX || !def.id.startsWith('transfer_'))
      .filter((def) => !slots.some((id, idx) => idx !== activeIdx && id === def.id))
      .filter((def) => {
        if (poolFilterEl === 'all') return true
        if (poolFilterEl === 'starter') return !!def.isStarter
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
      card.className = `pool-card el-${def.element} ${isActive ? 'equipped' : ''} ${locked ? 'locked' : ''}`
      card.disabled = locked
      card.title = def.description
      card.setAttribute(
        'aria-label',
        `${def.name}. ${role.title}. ${def.element !== 'none' ? def.element : 'physical'}. ${formatCost(def)}. ${formatEffectTags(def).join(', ')}`,
      )
      card.innerHTML = [
        `<span class="pool-icon-box">${abilityIconMarkup(def.id)}</span>`,
        `<span class="pool-topline"><span class="pool-role-icon">${role.icon}</span><span class="pool-role-text">${escapeHtml(role.title)}</span>${def.isStarter ? ' <span class="starter-tag">STARTER</span>' : ''}</span>`,
        `<span class="instant-toggle ${instant ? 'on' : ''}" role="switch" aria-checked="${instant}" title="${instant ? 'Instant cast: key casts immediately' : 'Preview cast: key arms placement, LMB confirms'}">${instant ? 'INSTANT' : 'PREVIEW'}</span>`,
        `<span class="pool-name">${escapeHtml(def.name)}</span>`,
        `<span class="pool-meta">${def.element !== 'none' ? def.element.toUpperCase() : 'PHYSICAL'} · ${formatCost(def)} · ${def.cooldownSec}s CD</span>`,
        `<span class="effect-tags">${formatEffectTags(def).map((tag) => `<span class="${tagClass(tag)}">${escapeHtml(tag)}</span>`).join('')}</span>`,
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

  function rerender(): void {
    refreshSectionKeyLabels()
    rebuildSlots()
    rebuildMastery()
    rebuildDetails()
    rebuildPool()
  }

  btnDefault.addEventListener('click', () => {
    if (buildLocked()) return
    slots = normalizeLoadoutSlots(DEFAULT_SLOTS)
    setActiveSlot(0)
    save()
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
      room.send(MessageTypes.Loadout, buildLoadoutMessage(slots))
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

  rerender()

  return {
    open: () => {
      rerender()
      const locked = buildLocked()
      btnConfirm.textContent = locked
        ? 'LOCKED IN COMBAT'
        : getRoom()
          ? 'CONFIRM BUILD'
          : getLaunchCtaLabel?.() ?? 'SAVE BUILD'
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
    isInstantCast,
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
  starter: { icon: '^', title: 'Combo Starter', line: 'Launches, roots, freezes, blinds or stuns to open a punish window.' },
  extender: { icon: '[]', title: 'Combo Extender', line: 'Controls space so a started combo keeps paying off.' },
  finisher: { icon: '!', title: 'Finisher', line: 'High-value hit that gains +25% damage against airborne targets.' },
  ray: { icon: '|', title: 'Instant Ray', line: 'Instant line-of-sight hit if the target is under the crosshair.' },
  pressure: { icon: '*', title: 'Pressure', line: 'Keeps damage, DoT, or threat active while both players move.' },
  survival: { icon: '+', title: 'Survival Tool', line: 'Keeps you alive through healing, shield, sustain, or recovery.' },
  counter: { icon: '<>', title: 'Counter Tool', line: 'Breaks pressure, cleanses, phases, disengages, or interrupts.' },
  mobility: { icon: '>>', title: 'Mobility', line: 'Moves you in, out, or around a punish window.' },
  drain: { icon: '-', title: 'Resource Drain', line: 'Attacks enemy Mana or Stamina while creating tempo.' },
  resource: { icon: '=', title: 'Resource Tool', line: 'Converts or restores resources on a fixed utility rhythm.' },
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
      hasAreaHit = hasAreaHit || (e.perTick.kind === 'damage' && Boolean(e.perTick.radius && e.perTick.radius > 0))
      hasSustain = hasSustain || e.perTick.kind === 'heal'
      hasHardCc = hasHardCc || (e.perTick.kind === 'applyStatus' && statusControlScore(e.perTick.status) >= 2)
    } else if (e.kind === 'heal' || e.kind === 'cleanse' || e.kind === 'restoreStamina' || e.kind === 'transmute' || e.kind === 'lifesteal' || e.kind === 'resourceDrain') {
      hasSustain = true
    }
  }

  if (def.id.startsWith('transfer_')) return { icon: '↔', title: 'Resource Swap', line: 'Converts one resource into another on a fixed utility key.' }
  if (hasSustain && !hasHardCc && !hasPersistentZone) return { icon: '+', title: 'Survival Tool', line: 'Keeps you alive, cleansed, mobile or stocked on resources.' }
  if (hasMove) return { icon: '↗', title: hasHardCc ? 'Engage Setup' : 'Mobility Hit', line: 'Moves you in, out, or through a punish window.' }
  if (hasHardCc && (hasPersistentZone || hasAreaHit)) return { icon: '⌖', title: 'Area Control', line: 'Controls space and sets up follow-up hits.' }
  if (hasHardCc) return { icon: '↑', title: 'Combo Starter', line: 'Disables or launches the target for a follow-up.' }
  if (hasPersistentZone) return { icon: '□', title: 'Zone Pressure', line: 'Controls an area and punishes bad movement.' }
  if (hasAreaHit || hasChannel) return { icon: '◇', title: 'Area Damage', line: 'Hits a space or repeated window instead of one clean shot.' }
  if (hasProjectile) return { icon: '➤', title: 'Skill Shot', line: 'Ranged aim tool fired toward the crosshair.' }
  if (hasDot) return { icon: '✦', title: 'Status Pressure', line: 'Applies damage or debuffs over time.' }
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
    } else if (e.kind === 'heal' || e.kind === 'cleanse' || e.kind === 'restoreStamina' || e.kind === 'transmute' || e.kind === 'lifesteal' || e.kind === 'resourceDrain') {
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
      if (e.onHitStatus) tags.add(statusTag(e.onHitStatus.status, e.onHitStatus.durationSec, e.onHitStatus.stacks))
    } else if (e.kind === 'applyStatus') {
      tags.add(statusTag(e.status, e.durationSec, e.stacks))
    } else if (e.kind === 'knockup') {
      tags.add(`${e.airborneSec}s AIRBORNE`)
      if (e.knockbackDistance && e.knockbackDistance > 0) tags.add(`${e.knockbackDistance}m KNOCKBACK`)
    } else if (e.kind === 'heal') {
      tags.add(e.overSec && e.overSec > 0 ? `${e.amount} HEAL / ${e.overSec}s` : `${e.amount} HEAL`)
    } else if (e.kind === 'zone') {
      tags.add(`${e.durationSec}s ZONE`)
      if (e.damagePerTick) tags.add(`${e.damagePerTick}/TICK`)
      if (e.applyStatus) tags.add(statusTag(e.applyStatus.status, e.applyStatus.durationSec, e.applyStatus.stacks))
    } else if (e.kind === 'move') {
      tags.add(`${e.distance}m ${e.mode.toUpperCase()}`)
    } else if (e.kind === 'channel') {
      tags.add(`${e.durationSec}s CHANNEL`)
      if (e.perTick.kind === 'damage') tags.add(`${e.perTick.amount}/TICK`)
      if (e.perTick.kind === 'heal') tags.add(`${e.perTick.amount}/TICK HEAL`)
      if (e.perTick.kind === 'applyStatus') tags.add(statusTag(e.perTick.status, e.perTick.durationSec, e.perTick.stacks))
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
  if (/\b(STARTER|EXTENDER|FINISHER|RAY|PRESSURE|SURVIVAL|COUNTER|MOBILITY|DRAIN|RESOURCE)\b/.test(tag)) return 'tag-role'
  if (/\b(SELF|POINT PREVIEW|SKILL SHOT|AIM LOCK|TARGET)\b/.test(tag)) return 'tag-targeting'
  if (/\b(DMG|DAMAGE|PROJECTILE|SPLASH|TICK)\b/.test(tag)) return 'tag-damage'
  if (/\b(AIRBORNE|AIR PUNISH|KNOCKBACK|ROOT|STUN|FREEZE|SLOW|BLIND|MARK|CURSE)\b/.test(tag)) return 'tag-control'
  if (/\b(BURN|BLEED|POISON|CHILL|SHIELD|HASTE|CLEANSE|INVULNERABLE)\b/.test(tag)) return 'tag-status'
  if (/\b(DASH|TELEPORT|MOVE)\b/.test(tag)) return 'tag-move'
  if (/\b(HEAL|STAMINA|MANA|HP|LIFESTEAL|->)\b/.test(tag)) return 'tag-resource'
  return ''
}

function slotPoolTitle(slot: (typeof LOADOUT_SLOT_ORDER)[number], idx: number): string {
  if (idx in FIXED_TRANSFER_SLOTS) return 'Fixed Resource Swap'
  if (slot === 'melee') return 'Melee Ability'
  if (slot === 'bow') return 'Bow Ability'
  if (slot === 'magic') return 'Spell Slot'
  return 'Utility Slot'
}

function poolSubtitleFor(slot: (typeof LOADOUT_SLOT_ORDER)[number], idx: number): string {
  if (idx in FIXED_TRANSFER_SLOTS) return 'Resource conversions are always locked to Z, X and F'
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
  instantCastStorageKey: INSTANT_CAST_STORAGE_KEY,
  slotOrder: LOADOUT_SLOT_ORDER,
  defaultSlots: DEFAULT_SLOTS,
}
