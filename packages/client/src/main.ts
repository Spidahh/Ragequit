// RAGEQUIT browser client: input, local prediction, Three.js render, HUD,
// loadout station, wheels, VFX, and Colyseus room sync.

import {
  ABILITY_DEFS,
  MASTERY_BONUSES,
  BOW_CHARGE_FULL_SEC,
  BOW_CHARGE_MIN_SEC,
  CAPSULE_HALF_HEIGHT_M,
  CAPSULE_HEIGHT_M,
  CAPSULE_RADIUS_M,
  HP_MAX,
  INTERPOLATION_DELAY_MS,
  MANA_MAX,
  MessageTypes,
  ROUND_TIMER_SEC,
  STAFF_M1_CADENCE_SEC,
  STAMINA_MAX,
  getMap,
  TICK_MS,
  TICK_RATE_HZ,
  WEAPON_IDS,
  makePlayerSimState,
  movementCapsFromStatuses,
  simulatePlayer,
  type AABB,
  type ClientCastMessage,
  type MovementCaps,
  type ServerMatchPhaseMessage,
  type ServerNoteMessage,
  type ServerScoreMessage,
  type ServerStatusAppliedMessage,
  type ServerStatusExpiredMessage,
  type ServerTransmuteResultMessage,
  type ServerZoneExpiredMessage,
  type ServerZoneSpawnedMessage,
  type StatusKind,
  type ClientChargeReleaseMessage,
  type ClientChargeStartMessage,
  type ClientFireStaffMessage,
  type ClientInputMessage,
  type ClientParryPressMessage,
  type ClientParryReleaseMessage,
  type ClientSwingMessage,
  type ClientWeaponSwapMessage,
  type PlayerSimState,
  type ServerAbilityFailedMessage,
  type ServerChannelInterruptedMessage,
  type ServerDeathMessage,
  type ServerKillStreakMessage,
  type ServerHitMessage,
  type ServerParryEventMessage,
  type ServerProjectileExpiredMessage,
  type ServerProjectileSpawnedMessage,
  type ServerWeaponSwappedMessage,
  type SimInput,
  type Weapon,
} from '@ragequit/shared'
import { Client, type Room } from 'colyseus.js'
import * as THREE from 'three'

import { createHudFlash } from './hud/flash.js'
import {
  actionCode,
  actionLabel,
  matchesAction,
  onKeybindsChanged,
  slotKeybindEntries,
} from './input/keybinds.js'
import { FIXED_TRANSFER_SLOTS, normalizeLoadoutSlots } from './input/loadout-slots.js'
import { initLoadoutStation } from './loadout-station.js'
import { initMenu } from './menu.js'
import { sendLoadout } from './net/loadout-sync.js'
import { makeProjectileMesh, makeSwingArcMesh, makeToonGradient, SWING_ARC_YAW_OFFSET } from './render/factories.js'
import { ImpactPool } from './vfx/impact-pool.js'

// -----------------------------------------------------------------------
// DOM refs
// -----------------------------------------------------------------------

const app = document.getElementById('app')
if (!app) throw new Error('#app element missing in index.html')

const dbgStatus = document.getElementById('dbg-status')!
const dbgTick = document.getElementById('dbg-tick')!
const dbgPlayers = document.getElementById('dbg-players')!
const dbgFps = document.getElementById('dbg-fps')!
const dbgPing = document.getElementById('dbg-ping')!
const dbgPred = document.getElementById('dbg-pred')!
const dbgGround = document.getElementById('dbg-ground')!
const dbgWeapon = document.getElementById('dbg-weapon')!
const dbgProj = document.getElementById('dbg-proj')!
const dbgSeq = document.getElementById('dbg-seq')!
const dbgDraws = document.getElementById('dbg-draws')!
const hint = document.getElementById('hint')!
const crosshairEl = document.getElementById('crosshair')!
const killFeed = document.getElementById('kill-feed')!
const streakDisplay = document.getElementById('streak-display')!
const streakCountEl = document.getElementById('streak-count')!
const streakBonusEl = document.getElementById('streak-bonus')!
const roundTimer = document.getElementById('round-timer')!

const hudHpFill = document.querySelector<HTMLElement>('#hud-hp .fill')!
const hudHpNum = document.getElementById('hud-hp-num')!
const hudManaFill = document.querySelector<HTMLElement>('#hud-mana .fill')!
const hudManaNum = document.getElementById('hud-mana-num')!
const hudStamFill = document.querySelector<HTMLElement>('#hud-stam .fill')!
const hudStamNum = document.getElementById('hud-stam-num')!
const hudPanel = document.getElementById('hud')!
const hudDragHandle = document.getElementById('hud-drag-handle')!
const hudResizeHandle = document.getElementById('hud-resize-handle')!
const comboDots = [0, 1, 2].map((i) => document.getElementById(`combo-${i}`)!)
const hudComboEl = document.getElementById('hud-combo')!
const serverToast = document.getElementById('server-toast')!
const damageFlash = document.getElementById('damage-flash')!
const parryFlash = document.getElementById('parry-flash')!
const healFlash = document.getElementById('heal-flash')!
const comboFlash = document.getElementById('combo-flash')!
const comboPopup = document.getElementById('combo-popup')!
const hitDirEls: Record<string, HTMLElement> = {
  top:    document.querySelector<HTMLElement>('.hit-dir[data-dir="top"]')!,
  bottom: document.querySelector<HTMLElement>('.hit-dir[data-dir="bottom"]')!,
  left:   document.querySelector<HTMLElement>('.hit-dir[data-dir="left"]')!,
  right:  document.querySelector<HTMLElement>('.hit-dir[data-dir="right"]')!,
}
const parryRing = document.getElementById('parry-ring')!
const bowCharge = document.getElementById('bow-charge')!
const bowChargeFill = document.querySelector<HTMLElement>('#bow-charge .fill')!
const popupsLayer = document.getElementById('popups')!
const respawnOverlay = document.getElementById('respawn')!
const respawnSec = document.getElementById('respawn-sec')!
const castBar = document.getElementById('cast-bar')!
const castBarFill = document.querySelector<HTMLElement>('#cast-bar .fill')!
const castBarLabel = document.querySelector<HTMLElement>('#cast-bar .label')!
const masteryBadge = document.getElementById('mastery-badge')!
const respawnKillerEl = document.getElementById('respawn-killer')!
const lowHpVignette = document.getElementById('low-hp-vignette')!
const blindVignette = document.getElementById('blind-vignette')!
const deathOverlay = document.getElementById('death-overlay')!
const statusStrip = document.getElementById('status-strip')!
const cdStrip = document.getElementById('cd-strip')!
const gcdRingEl = document.getElementById('gcd-ring')
const pingHud = document.getElementById('ping-hud')!
const pingValEl = document.getElementById('ping-val')!
const respawnTipEl = document.getElementById('respawn-tip')
const weaponSlots: Record<Weapon, HTMLElement> = {
  sword: document.getElementById('wslot-sword')!,
  bow: document.getElementById('wslot-bow')!,
  staff: document.getElementById('wslot-staff')!,
}
const shootFlashEl = document.getElementById('shoot-flash')!
const weaponBannerEl = document.getElementById('weapon-banner')!
const utilityWheelEl = document.getElementById('utility-wheel')!
const abilityWheelEl = document.getElementById('ability-wheel')!
const pauseMenu = document.getElementById('pause-menu')!
const pauseResumeBtn = document.getElementById('pause-resume') as HTMLButtonElement
const pauseLoadoutBtn = document.getElementById('pause-loadout') as HTMLButtonElement
const pauseSettingsBtn = document.getElementById('pause-settings') as HTMLButtonElement
const pauseLobbyBtn = document.getElementById('pause-lobby') as HTMLButtonElement
const settingsOverlay = document.getElementById('settings-overlay')!

// Transmute bar elements.
const transmuteSlotEls: Record<string, HTMLElement> = {
  hp_mana:   document.getElementById('t-hp-mana')!,
  mana_stam: document.getElementById('t-mana-stam')!,
  stam_hp:   document.getElementById('t-stam-hp')!,
}
function refreshKeybindHudLabels(): void {
  transmuteSlotEls['hp_mana']!.querySelector<HTMLElement>('.t-key')!.textContent = actionLabel('transferHpMana')
  transmuteSlotEls['mana_stam']!.querySelector<HTMLElement>('.t-key')!.textContent = actionLabel('transferManaStam')
  transmuteSlotEls['stam_hp']!.querySelector<HTMLElement>('.t-key')!.textContent = actionLabel('transferStamHp')
  weaponSlots.sword.querySelector<HTMLElement>('.key')!.textContent = actionLabel('swapWeapon')
  weaponSlots.bow.querySelector<HTMLElement>('.key')!.textContent = actionLabel('swapWeapon')
  weaponSlots.staff.querySelector<HTMLElement>('.key')!.textContent = actionLabel('swapWeapon')
}
// Client-side transmute cooldown tracking (ms timestamp when CD expires).
const transmuteCdExpiry: Record<string, number> = { hp_mana: 0, mana_stam: 0, stam_hp: 0 }
const TRANSMUTE_CD_MS = 5000
refreshKeybindHudLabels()

// -----------------------------------------------------------------------
// HUD feedback helpers
// -----------------------------------------------------------------------

const hudFlash = createHudFlash(shootFlashEl, weaponBannerEl)
const showShootFlash = hudFlash.showShootFlash
const showWeaponBanner = hudFlash.showWeaponBanner

// -----------------------------------------------------------------------
// Radial wheels — Q for fixed transfers/flex utility, E for combat abilities
// -----------------------------------------------------------------------

interface WheelSector {
  dir: string
  angleDeg: number
  slotIdx: number
  label: string
}

interface RadialWheel {
  id: 'utility' | 'ability'
  el: HTMLElement
  sectors: readonly WheelSector[]
}

const utilityWheel: RadialWheel = {
  id: 'utility',
  el: utilityWheelEl,
  sectors: [
    { dir: 'top', angleDeg: -90, slotIdx: 7, label: 'Z' },
    { dir: 'right', angleDeg: 0, slotIdx: 8, label: 'X' },
    { dir: 'bottom', angleDeg: 90, slotIdx: 9, label: 'F' },
    { dir: 'left', angleDeg: 180, slotIdx: 10, label: 'V' },
  ],
}

const abilityWheel: RadialWheel = {
  id: 'ability',
  el: abilityWheelEl,
  sectors: [
    { dir: 'top', angleDeg: -90, slotIdx: 0, label: 'R' },
    { dir: 'top-right', angleDeg: -45, slotIdx: 1, label: 'G' },
    { dir: 'right', angleDeg: 0, slotIdx: 2, label: '1' },
    { dir: 'bottom-right', angleDeg: 45, slotIdx: 3, label: '2' },
    { dir: 'bottom', angleDeg: 90, slotIdx: 4, label: '3' },
    { dir: 'bottom-left', angleDeg: 135, slotIdx: 5, label: '4' },
    { dir: 'left', angleDeg: 180, slotIdx: 6, label: '5' },
  ],
}

let radialOpen = false
let radialDx = 0
let radialDy = 0
let activeWheel: RadialWheel | null = null
let activeWheelKey: string | null = null
let radialSelectedDir: string | null = null

function slotBindLabel(slotIdx: number): string {
  return slotKeybindEntries().find(([, , idx]) => idx === slotIdx)?.[1] ?? '?'
}

/** Refresh radial slot labels from the current loadout. */
function radialRefresh(wheel: RadialWheel): void {
  const schemaLoadout = getSelfSchemaPlayer?.()?.loadout
  // Convert Colyseus ArraySchema to plain array so numeric bracket access
  // works reliably across all Colyseus versions.
  const loadout: string[] = schemaLoadout
    ? Array.from(schemaLoadout as unknown as Iterable<string>)
    : Array.from(loadoutStation.getLoadout() as Iterable<string>)
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
    if (def) {
      // AbilityDef has no icon field — derive one from element or slot.
      const elemIcons: Record<string, string> = {
        fire: '🔥', ice: '❄️', lightning: '⚡', dark: '🌑', nature: '🌿', none: '✨',
      }
      iconEl.textContent = ABILITY_ICON[id] ?? elemIcons[def.element] ?? '✨'
      nameEl.textContent = def.name
      nameEl.classList.remove('r-empty')
      keyEl.textContent = slotBindLabel(idx)
    } else {
      iconEl.textContent = '·'
      nameEl.textContent = 'empty'
      nameEl.classList.add('r-empty')
      keyEl.textContent = slotBindLabel(idx)
    }
    // Mark the currently primed slot so the player can see which one is armed.
    slotEl.classList.toggle('r-primed', idx === primedSlotIdx)
  }
}

function radialOpen_(wheel: RadialWheel, keyCode: string): void {
  if (radialOpen) return
  radialOpen = true
  activeWheel = wheel
  activeWheelKey = keyCode
  radialDx = 0
  radialDy = 0
  radialSelectedDir = null
  radialRefresh(wheel)
  wheel.el.classList.add('open')
  wheel.el.classList.remove('has-selection')
  for (const s of Array.from(wheel.el.querySelectorAll<HTMLElement>('.radial-slot'))) s.classList.remove('selected')
}

function radialClose(cast: boolean): void {
  if (!radialOpen) return
  const wheel = activeWheel
  radialOpen = false
  activeWheel = null
  activeWheelKey = null
  if (!wheel) return
  wheel.el.classList.remove('open', 'has-selection')
  for (const s of Array.from(wheel.el.querySelectorAll<HTMLElement>('.radial-slot'))) s.classList.remove('selected')

  if (cast && radialSelectedDir) {
    const sector = wheel.sectors.find((s) => s.dir === radialSelectedDir)
    if (sector) activateAbilitySlot(sector.slotIdx, true)
  }
  radialSelectedDir = null
}

// Currently primed ability slot (selected via radial wheel).
// Fires on LMB instead of the weapon attack; cleared after firing or on death.
// null means no ability is primed — LMB does weapon attack normally.
let primedSlotIdx: number | null = null

function currentLoadoutArray(): string[] {
  const schemaLoadout = getSelfSchemaPlayer?.()?.loadout
  return schemaLoadout
    ? Array.from(schemaLoadout as unknown as Iterable<string>)
    : Array.from(loadoutStation.getLoadout() as Iterable<string>)
}

function activateAbilitySlot(slotIdx: number, fromWheel: boolean): void {
  const id = currentLoadoutArray()[slotIdx] ?? ''
  if (!id) return
  const def = ABILITY_DEFS[id]
  if (!def) return
  if (loadoutStation.isInstantCast(id)) {
    cancelPlacementPreview()
    if (fromWheel) {
      primedSlotIdx = slotIdx
    } else {
      abilityCastQueue.push(id)
    }
    return
  }
  beginPlacementPreview(id)
  primedSlotIdx = null
}

function radialMouseMove(dx: number, dy: number): void {
  if (!radialOpen || !activeWheel) return
  radialDx += dx
  radialDy += dy
  radialSelectVector(radialDx, radialDy)
}

function radialPointMove(clientX: number, clientY: number): void {
  if (!radialOpen || !activeWheel) return
  const rect = activeWheel.el.getBoundingClientRect()
  radialSelectVector(clientX - (rect.left + rect.width / 2), clientY - (rect.top + rect.height / 2))
}

function radialSelectVector(dx: number, dy: number): void {
  if (!radialOpen || !activeWheel) return
  const dist = Math.hypot(dx, dy)
  if (dist < 18) {
    // Below threshold: no sector selected yet
    radialSelectedDir = null
    activeWheel.el.classList.remove('has-selection')
    for (const s of Array.from(activeWheel.el.querySelectorAll<HTMLElement>('.radial-slot'))) s.classList.remove('selected')
    return
  }
  const angle = Math.atan2(dy, dx) * (180 / Math.PI) // -180..180
  const sector = nearestWheelSector(activeWheel, angle)
  const dir = sector.dir

  if (dir !== radialSelectedDir) {
    radialSelectedDir = dir
    activeWheel.el.classList.add('has-selection')
    for (const s of Array.from(activeWheel.el.querySelectorAll<HTMLElement>('.radial-slot'))) {
      s.classList.toggle('selected', s.dataset['dir'] === dir)
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

// -----------------------------------------------------------------------
// Mouse sensitivity — persisted to localStorage, adjustable in-game
// -----------------------------------------------------------------------

const SENS_KEY = 'ragequit.sensitivity.v1'
const SENS_DEFAULT = 0.0022
const SENS_MIN = 0.0004
const SENS_MAX = 0.008

function loadSens(): number {
  try {
    const v = parseFloat(localStorage.getItem(SENS_KEY) ?? '')
    return isFinite(v) && v >= SENS_MIN && v <= SENS_MAX ? v : SENS_DEFAULT
  } catch { return SENS_DEFAULT }
}
function saveSens(v: number): void {
  try { localStorage.setItem(SENS_KEY, String(v)) } catch { /* ignore */ }
}
let mouseSens = loadSens()

// Transient overlay that flashes current sensitivity when adjusted.
const sensOverlay = document.createElement('div')
sensOverlay.style.cssText = [
  'position:fixed', 'top:50%', 'left:50%',
  'transform:translate(-50%,-50%) translateY(-80px)',
  'background:rgba(0,0,0,0.78)', 'color:#ffd260',
  'padding:6px 16px', 'border-radius:6px',
  'font:bold 13px/1.4 ui-monospace,monospace',
  'pointer-events:none', 'opacity:0',
  'transition:opacity 0.2s', 'z-index:900',
].join(';')
document.body.appendChild(sensOverlay)
let sensOverlayTimer = 0
function showSensOverlay(): void {
  sensOverlay.textContent = `🖱 SENS  ${mouseSens.toFixed(4)}`
  sensOverlay.style.opacity = '1'
  clearTimeout(sensOverlayTimer)
  sensOverlayTimer = setTimeout(() => { sensOverlay.style.opacity = '0' }, 1600) as unknown as number
}

// -----------------------------------------------------------------------
// Camera pitch limits — asymmetric for 3rd-person feel
// -----------------------------------------------------------------------

// Positive mousePitch → camera.rotation.x > 0 → looking UP (Three.js convention).
// Mouse-up increments mousePitch; mouse-down decrements it.
// Cap looking UP at 75° and looking DOWN at 65° to avoid ground/sky clipping.
const PITCH_UP_LIMIT   =  Math.PI * 0.415 //  +75° — max look-up angle
const PITCH_DOWN_LIMIT = -Math.PI * 0.360 //  -65° — max look-down angle

// --- HUD helpers -----------------------------------------------------------

const STATUS_ICON: Record<string, string> = {
  burn: '🔥',
  bleed: '🩸',
  chill: '❄️',
  poison: '☠️',
  slow: '🐢',
  root: '🪢',
  stun: '💫',
  freeze: '🧊',
  curse: '👁️',
  blind: '◉',
  mark: '📍',
  shield: '🛡️',
  haste: '⚡',
}

// Tips shown on the respawn screen — rotated randomly on each death.
const RESPAWN_TIPS: readonly string[] = [
  'RMB: tap for a parry window, hold to block repeated hits.',
  'Coyote time: jump remains valid for 83 ms after leaving a ledge.',
  'Mastery: 4+ magic abilities of one element activates elemental bonuses.',
  'Burn + Chill: Steam explosion combo.',
  'Poison + Bleed: Festering doubles damage-over-time effects.',
  'Space: hold for a higher jump, release early for a short hop.',
  'Sprint momentum: sustained running grants a small speed boost.',
  'Staff M1: instant low-cost projectile pressure.',
  'Airborne targets cannot parry or cast until they recover.',
  'Collision stops dash abilities; walls are hard cover.',
]

// Emoji icons for ability pips — gives instant visual recognition in the hotbar.
const ABILITY_ICON: Record<string, string> = {
  // Melee
  uppercut: '👊', whirlwind: '🌀', gap_closer: '💨', bleed_strike: '🗡️',
  guard_break: '🔨', rending_dash: '🗡️',
  // Bow
  piercing_shot: '🏹', volley: '🎯', pin_shot: '📌', snare_trap: '🪤',
  marksman_shot: '🎯', disengage_shot: '💨', broadhead: '🩸', blast_arrow: '💥',
  // Fire
  fireball: '🔥', flame_wall: '🧱', meteor: '☄️', eruption: '🌋', fire_blink: '🔥',
  // Ice
  frost_bolt: '❄️', freeze_target: '🧊', blizzard: '🌨️', frost_pillar: '🧊', ice_wall: '🧊',
  // Lightning
  chain_bolt: '⚡', storm_field: '⛈️', lightning_dash: '⚡', arc_lift: '⚡',
  // Dark
  shadow_bolt: '🌑', life_drain: '🩸', dark_barrier: '🛡️', void_spike: '🕳️', curse_of_weakness: '👁️',
  // Nature
  poison_dart: '☠️', thorn_field: '🌿', entangle: '🪢', healing_totem: '💚', root_upthrow: '🌱', vine_dash: '🌿',
  // Utility
  self_heal: '💊', quick_dash: '💨', ping_mark: '📍', cleanse_surge: '✨',
  barrier: '🛡️', energize: '⚡', phase_shift: '👻', smoke_screen: '💨',
  transfer_hp_mana: '♥→◆', transfer_mana_stam: '◆→⚡', transfer_stam_hp: '⚡→♥',
}

// Element accent colours used for ability pip backgrounds and status borders.
const ELEMENT_COLOR: Record<string, string> = {
  fire:      '#ff6a2a',
  ice:       '#6dd6ff',
  lightning: '#ffe244',
  dark:      '#b870ff',
  nature:    '#80e860',
  none:      '#9ba0b4',
}

// Keyed by abilityId so CD lookup is O(1). Rebuilt whenever loadout changes.
const cdPipEls = new Map<string, HTMLElement>()
let cdStripLoadoutRef: ReadonlyArray<string> = []
let cdStripLoadoutSig = ''

// SVG arc circumference for the cooldown ring (r=18 px).
const CD_ARC_R = 18
const CD_ARC_CIRC = 2 * Math.PI * CD_ARC_R // ≈113.1

function rebuildCdStrip(loadout: ReadonlyArray<string>): void {
  cdStripLoadoutRef = Array.from(loadout)
  cdStripLoadoutSig = loadoutSignature(cdStripLoadoutRef)
  while (cdStrip.firstChild) cdStrip.removeChild(cdStrip.firstChild)
  cdPipEls.clear()

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
    const hasMana    = (def?.costMana ?? 0) > 0
    const hasStamina = (def?.costStamina ?? 0) > 0

    // Tooltip content: name + cooldown + costs.
    const costParts: string[] = []
    if (hasMana)    costParts.push(`${def!.costMana}mp`)
    if (hasStamina) costParts.push(`${def!.costStamina}sp`)
    const costStr = costParts.length > 0 ? `  · ${costParts.join(' ')}` : ''
    const tooltip = def
      ? `${def.name}\nCD ${def.cooldownSec}s${costStr}\n${def.miniMalus ?? ''}`
      : id

    const elemLabel = (def?.element && def.element !== 'none') ? def.element.toUpperCase() : def?.slot.toUpperCase() ?? ''
    const cdLabel   = def ? `${def.cooldownSec}s CD` : ''
    const costLabel = costParts.length > 0 ? costParts.join(' · ') : 'free'
    const malusHtml = def?.miniMalus ? `<div class="tt-malus">${def.miniMalus}</div>` : ''

    const pip = document.createElement('div')
    const isUtility = slotIdx >= 7
    const isFixedTransfer = slotIdx in FIXED_TRANSFER_SLOTS
    pip.className = `cd-pip ready ${isUtility ? 'utility-pip' : 'ability-pip'} ${isFixedTransfer ? 'transfer-pip' : ''}`
    pip.dataset['abilityId'] = id
    pip.dataset['slotIdx'] = String(slotIdx)
    pip.title = tooltip
    // Colour accent driven by element.
    pip.style.setProperty('--elem-color', elemColor)
    // SVG ring + rich hover tooltip.
    const icon = ABILITY_ICON[id] ?? '✦'
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
      ${hasMana    ? `<span class="cost-dot mana"></span>` : ''}
      ${hasStamina ? `<span class="cost-dot stam"></span>` : ''}
      <div class="ability-tooltip">
        <div class="tt-name">${icon} ${def?.name ?? id}</div>
        <div class="tt-el">${elemLabel}${cdLabel ? ' · ' + cdLabel : ''}</div>
        <div class="tt-cost">${costLabel}</div>
        ${malusHtml}
      </div>
    `
    pip.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      activateAbilitySlot(slotIdx, true)
    })
    ;(isUtility ? utilityRail : abilityRail).appendChild(pip)
    cdPipEls.set(id, pip)
  }
  cdStrip.appendChild(abilitySection)
  cdStrip.appendChild(utilitySection)
}

function loadoutSignature(loadout: ReadonlyArray<string>): string {
  return Array.from(loadout).join('|')
}
// Seed with default loadout until server schema arrives.
rebuildCdStrip(normalizeLoadoutSlots([
  'uppercut',
  'piercing_shot',
  'fireball',
  'flame_wall',
  'frost_bolt',
  'chain_bolt',
  'shadow_bolt',
  '',
  '',
  '',
  'quick_dash',
]))

onKeybindsChanged(() => {
  radialRefresh(utilityWheel)
  radialRefresh(abilityWheel)
  rebuildCdStrip(currentLoadoutArray())
  refreshKeybindHudLabels()
})

// -----------------------------------------------------------------------
// Sound Engine — WebAudio API, procedural, zero external files.
// AudioContext is created lazily on the first call so we satisfy the
// "must be triggered by a user gesture" browser requirement.
// -----------------------------------------------------------------------

class SoundEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private _muted = false

  /** Lazily initialise (and resume) the AudioContext. */
  private get ac(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = this._volume
      this.masterGain.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }
  private get out(): AudioNode {
    void this.ac
    return this.masterGain!
  }

  get muted(): boolean { return this._muted }
  set muted(v: boolean) {
    this._muted = v
    if (this.masterGain) this.masterGain.gain.value = v ? 0 : this._volume
  }

  private _volume = 0.55
  get volume(): number { return this._volume }
  set volume(v: number) {
    this._volume = Math.max(0, Math.min(1, v))
    if (this.masterGain && !this._muted) this.masterGain.gain.value = this._volume
  }

  /** Short noise burst — sword/arrow/melee impact. power 0‒1. */
  playHit(power = 1): void {
    if (this._muted) return
    const ac = this.ac, out = this.out
    const len = Math.floor(ac.sampleRate * 0.06)
    const buf = ac.createBuffer(1, len, ac.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = ac.createBufferSource()
    src.buffer = buf
    const filt = ac.createBiquadFilter()
    filt.type = 'bandpass'
    filt.frequency.value = 700 + power * 500
    filt.Q.value = 0.5
    const gain = ac.createGain()
    gain.gain.setValueAtTime(0.3 + power * 0.45, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.09)
    src.connect(filt)
    filt.connect(gain)
    gain.connect(out)
    src.start()
  }

  // ─── Impact sounds ───────────────────────────────────────────────────────

  /** Attacker: physical melee thud — low sine body + high metallic click. */
  playMeleeThud(power = 1): void {
    if (this._muted) return
    const ac = this.ac, out = this.out
    // Body: low-frequency sine punch.
    const osc = ac.createOscillator()
    const oscGain = ac.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(90 + power * 30, ac.currentTime)
    osc.frequency.exponentialRampToValueAtTime(40, ac.currentTime + 0.08)
    oscGain.gain.setValueAtTime(0.5 * power, ac.currentTime)
    oscGain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.1)
    osc.connect(oscGain); oscGain.connect(out)
    osc.start(); osc.stop(ac.currentTime + 0.12)
    // Metallic click: short hi-freq noise burst.
    const len = Math.floor(ac.sampleRate * 0.022)
    const buf = ac.createBuffer(1, len, ac.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.18))
    const src = ac.createBufferSource(); src.buffer = buf
    const filt = ac.createBiquadFilter(); filt.type = 'bandpass'
    filt.frequency.value = 2200; filt.Q.value = 1.5
    const ng = ac.createGain(); ng.gain.value = 0.18 * power
    src.connect(filt); filt.connect(ng); ng.connect(out); src.start()
  }

  /** Attacker: heavy melee thud — amplified for combo hit 2. */
  playHeavyHit(power = 1): void {
    if (this._muted) return
    const ac = this.ac, out = this.out
    const osc = ac.createOscillator()
    const oscGain = ac.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(100 + power * 40, ac.currentTime)
    osc.frequency.exponentialRampToValueAtTime(38, ac.currentTime + 0.11)
    oscGain.gain.setValueAtTime(0.75 * power, ac.currentTime)
    oscGain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.14)
    osc.connect(oscGain); oscGain.connect(out)
    osc.start(); osc.stop(ac.currentTime + 0.16)
    // Sub bass reinforcement.
    const osc2 = ac.createOscillator(); const g2 = ac.createGain()
    osc2.type = 'sine'; osc2.frequency.value = 180
    g2.gain.setValueAtTime(0.28 * power, ac.currentTime)
    g2.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.08)
    osc2.connect(g2); g2.connect(out); osc2.start(); osc2.stop(ac.currentTime + 0.10)
    // Metallic click.
    const len = Math.floor(ac.sampleRate * 0.028)
    const buf = ac.createBuffer(1, len, ac.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.16))
    const src = ac.createBufferSource(); src.buffer = buf
    const filt = ac.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 2400; filt.Q.value = 1.2
    const ng = ac.createGain(); ng.gain.value = 0.28 * power
    src.connect(filt); filt.connect(ng); ng.connect(out); src.start()
  }

  /** Attacker: CRACK — combo hit 3 — hard transient + distorted punch. */
  playCrack(power = 1): void {
    if (this._muted) return
    const ac = this.ac, out = this.out
    // Distorted oscillator punch.
    const osc = ac.createOscillator(); const oscGain = ac.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(110, ac.currentTime)
    osc.frequency.exponentialRampToValueAtTime(55, ac.currentTime + 0.045)
    // WaveShaper for hard distortion.
    const ws = ac.createWaveShaper()
    const curve = new Float32Array(256)
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1
      curve[i] = Math.max(-1, Math.min(1, x * 3.5))
    }
    ws.curve = curve
    oscGain.gain.setValueAtTime(0.9 * power, ac.currentTime)
    oscGain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.07)
    osc.connect(ws); ws.connect(oscGain); oscGain.connect(out)
    osc.start(); osc.stop(ac.currentTime + 0.08)
    // Noise transient.
    const len = Math.floor(ac.sampleRate * 0.04)
    const buf = ac.createBuffer(1, len, ac.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.25))
    const src = ac.createBufferSource(); src.buffer = buf
    const filt = ac.createBiquadFilter(); filt.type = 'allpass'; filt.frequency.value = 600
    const ng = ac.createGain(); ng.gain.value = 0.65 * power
    src.connect(filt); filt.connect(ng); ng.connect(out); src.start()
  }

  /** Attacker: projectile (arrow/bolt) impact — thwack noise + body resonance. */
  playProjectileImpact(power = 1): void {
    if (this._muted) return
    const ac = this.ac, out = this.out
    // Noise burst BPF — sharp "thwack".
    const len = Math.floor(ac.sampleRate * 0.065)
    const buf = ac.createBuffer(1, len, ac.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = ac.createBufferSource(); src.buffer = buf
    const filt = ac.createBiquadFilter(); filt.type = 'bandpass'
    filt.frequency.value = 800 + power * 400; filt.Q.value = 2
    const ng = ac.createGain()
    ng.gain.setValueAtTime(0.4 * power, ac.currentTime)
    ng.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.07)
    src.connect(filt); filt.connect(ng); ng.connect(out); src.start()
    // Body resonance.
    const osc = ac.createOscillator(); const og = ac.createGain()
    osc.type = 'sine'; osc.frequency.value = 140
    og.gain.setValueAtTime(0.22 * power, ac.currentTime)
    og.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.06)
    osc.connect(og); og.connect(out); osc.start(); osc.stop(ac.currentTime + 0.07)
  }

  /** Attacker: AoE zone impact — low boom + rumble. */
  playAoeImpact(power = 1): void {
    if (this._muted) return
    const ac = this.ac, out = this.out
    const osc = ac.createOscillator(); const og = ac.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(55, ac.currentTime)
    osc.frequency.exponentialRampToValueAtTime(30, ac.currentTime + 0.22)
    og.gain.setValueAtTime(0.45 * power, ac.currentTime)
    og.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.32)
    const lpf = ac.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 400
    osc.connect(lpf); lpf.connect(og); og.connect(out)
    osc.start(); osc.stop(ac.currentTime + 0.35)
  }

  /** Renamed original — used as fallback for unknown ability hits. */
  playAbilityHit(power = 1): void {
    this.playHit(power)
  }

  // ─── Dispatcher: attacker side ───────────────────────────────────────────

  /**
   * Play the attacker-side impact sound for a given PendingDamage cause string.
   * Call this INSTEAD of playHit() for combo hit 1 (hits 2 and 3 are handled
   * by the combo escalation path which calls playHeavyHit / playCrack directly).
   */
  playHitByType(cause: string, power = 1): void {
    if (cause === 'sword_m1' || cause === 'uppercut') return this.playMeleeThud(power)
    if (cause === 'bow' || cause === 'staff') return this.playProjectileImpact(power)
    if (cause.startsWith('zone:') || cause.startsWith('combo:')) return this.playAoeImpact(power)
    return this.playAbilityHit(power)
  }

  // ─── Victim-side impact sounds ───────────────────────────────────────────

  /** Victim: received melee — dull grunt + low thud. */
  playHurtMelee(power = 1): void {
    if (this._muted) return
    const ac = this.ac, out = this.out
    const osc = ac.createOscillator(); const og = ac.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(120, ac.currentTime)
    osc.frequency.exponentialRampToValueAtTime(60, ac.currentTime + 0.065)
    og.gain.setValueAtTime(0.45 * power, ac.currentTime)
    og.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.09)
    osc.connect(og); og.connect(out); osc.start(); osc.stop(ac.currentTime + 0.1)
    // Noise body thump.
    const len = Math.floor(ac.sampleRate * 0.04)
    const buf = ac.createBuffer(1, len, ac.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.3))
    const src = ac.createBufferSource(); src.buffer = buf
    const lpf = ac.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 350
    const ng = ac.createGain(); ng.gain.value = 0.3 * power
    src.connect(lpf); lpf.connect(ng); ng.connect(out); src.start()
  }

  /** Victim: received arrow/bolt — sharp "thwack" at point of impact. */
  playHurtProjectile(power = 1): void {
    if (this._muted) return
    const ac = this.ac, out = this.out
    const len = Math.floor(ac.sampleRate * 0.055)
    const buf = ac.createBuffer(1, len, ac.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.22))
    const src = ac.createBufferSource(); src.buffer = buf
    const filt = ac.createBiquadFilter(); filt.type = 'bandpass'
    filt.frequency.value = 1200; filt.Q.value = 4
    const ng = ac.createGain()
    ng.gain.setValueAtTime(0.38 * power, ac.currentTime)
    ng.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.06)
    src.connect(filt); filt.connect(ng); ng.connect(out); src.start()
    // Soft resonance.
    const osc = ac.createOscillator(); const og = ac.createGain()
    osc.type = 'sine'; osc.frequency.value = 220
    og.gain.setValueAtTime(0.18 * power, ac.currentTime)
    og.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.035)
    osc.connect(og); og.connect(out); osc.start(); osc.stop(ac.currentTime + 0.04)
  }

  /** Victim: received zone/AoE — muffled explosion boom. */
  playHurtAoe(power = 1): void {
    if (this._muted) return
    const ac = this.ac, out = this.out
    const len = Math.floor(ac.sampleRate * 0.20)
    const buf = ac.createBuffer(1, len, ac.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.55))
    const src = ac.createBufferSource(); src.buffer = buf
    const lpf = ac.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 500
    const ng = ac.createGain(); ng.gain.value = 0.55 * power
    src.connect(lpf); lpf.connect(ng); ng.connect(out); src.start()
  }

  /** Victim: received ability hit — magic "zap" sweep. */
  playHurtAbility(power = 1): void {
    if (this._muted) return
    const ac = this.ac, out = this.out
    const osc = ac.createOscillator(); const og = ac.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(880, ac.currentTime)
    osc.frequency.exponentialRampToValueAtTime(220, ac.currentTime + 0.085)
    og.gain.setValueAtTime(0.28 * power, ac.currentTime)
    og.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.10)
    const lpf = ac.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 3000
    osc.connect(lpf); lpf.connect(og); og.connect(out); osc.start(); osc.stop(ac.currentTime + 0.12)
  }

  // ─── Dispatcher: victim side ─────────────────────────────────────────────

  /** Play the victim-side "received damage" sound based on damage source. */
  playHurtByType(cause: string, power = 1): void {
    if (cause === 'sword_m1' || cause === 'uppercut') return this.playHurtMelee(power)
    if (cause === 'bow' || cause === 'staff') return this.playHurtProjectile(power)
    if (cause.startsWith('zone:') || cause.startsWith('combo:')) return this.playHurtAoe(power)
    return this.playHurtAbility(power)
  }

  /** Element-themed tone sweep on ability cast. */
  playCast(element = 'none'): void {
    if (this._muted) return
    const ac = this.ac, out = this.out
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    const freqMap: Record<string, [number, number]> = {
      fire:      [310, 700],
      ice:       [600, 1100],
      lightning: [900, 2400],
      dark:      [200, 80],
      nature:    [440, 660],
      none:      [280, 480],
    }
    const [f0, f1] = freqMap[element] ?? freqMap['none']!
    osc.type = element === 'lightning' ? 'sawtooth' : element === 'dark' ? 'sine' : 'triangle'
    osc.frequency.setValueAtTime(f0, ac.currentTime)
    osc.frequency.linearRampToValueAtTime(f1, ac.currentTime + 0.18)
    gain.gain.setValueAtTime(0.16, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.22)
    osc.connect(gain)
    gain.connect(out)
    osc.start()
    osc.stop(ac.currentTime + 0.25)
  }

  /** Ascending arpeggio — kill confirm. */
  playKill(): void {
    if (this._muted) return
    const ac = this.ac, out = this.out
    for (const [i, freq] of ([523, 659, 784] as const).entries()) {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      const t = ac.currentTime + i * 0.065
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.22, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
      osc.connect(gain)
      gain.connect(out)
      osc.start(t)
      osc.stop(t + 0.22)
    }
  }

  /** Descending whomp — self death. */
  playDeath(): void {
    if (this._muted) return
    const ac = this.ac, out = this.out
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(220, ac.currentTime)
    osc.frequency.exponentialRampToValueAtTime(38, ac.currentTime + 0.7)
    gain.gain.setValueAtTime(0.42, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.75)
    osc.connect(gain)
    gain.connect(out)
    osc.start()
    osc.stop(ac.currentTime + 0.8)
  }

  /** Short upward frequency sweep — jump. */
  playJump(): void {
    if (this._muted) return
    const ac = this.ac, out = this.out
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(170, ac.currentTime)
    osc.frequency.linearRampToValueAtTime(360, ac.currentTime + 0.11)
    gain.gain.setValueAtTime(0.11, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.13)
    osc.connect(gain)
    gain.connect(out)
    osc.start()
    osc.stop(ac.currentTime + 0.14)
  }

  /** Mechanical click — weapon swap. */
  playSwap(): void {
    if (this._muted) return
    const ac = this.ac, out = this.out
    const len = Math.floor(ac.sampleRate * 0.028)
    const buf = ac.createBuffer(1, len, ac.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.22))
    const src = ac.createBufferSource()
    src.buffer = buf
    const filt = ac.createBiquadFilter()
    filt.type = 'highpass'
    filt.frequency.value = 1100
    const gain = ac.createGain()
    gain.gain.value = 0.3
    src.connect(filt)
    filt.connect(gain)
    gain.connect(out)
    src.start()
  }

  /** Metallic ring — parry / block. */
  playParry(): void {
    if (this._muted) return
    const ac = this.ac, out = this.out
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'triangle'
    osc.frequency.value = 1380
    gain.gain.setValueAtTime(0.32, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.38)
    osc.connect(gain)
    gain.connect(out)
    osc.start()
    osc.stop(ac.currentTime + 0.42)
  }

  /** Short tone — status applied notification. */
  playStatus(element = 'none'): void {
    if (this._muted) return
    const ac = this.ac, out = this.out
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'sine'
    osc.frequency.value =
      element === 'fire'      ? 440 :
      element === 'ice'       ? 900 :
      element === 'lightning' ? 1200 :
      element === 'dark'      ? 220 :
      element === 'nature'    ? 550 : 360
    gain.gain.setValueAtTime(0.12, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.18)
    osc.connect(gain)
    gain.connect(out)
    osc.start()
    osc.stop(ac.currentTime + 0.2)
  }
}

const soundEngine = new SoundEngine()
soundEngine.muted = true

// -----------------------------------------------------------------------
// Three.js scene
// -----------------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setClearColor(0x141c28, 1)
// Shadow maps — PCFSoft gives smooth shadow edges at low perf cost.
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
// ACES filmic tone mapping makes the scene colours pop without over-exposing.
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.1
app.appendChild(renderer.domElement)

// Nameplate container — absolutely positioned over the canvas for HP bars /
// name labels above remote players. Updated each render frame via 3D projection.
const nameplateContainer = document.createElement('div')
nameplateContainer.id = 'nameplate-container'
nameplateContainer.style.cssText =
  'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:10'
app.appendChild(nameplateContainer)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0d1520)
// Lighter near-fog so the arena feels enclosed; clears before edge of geometry.
scene.fog = new THREE.FogExp2(0x0d1520, 0.015)

const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 400)

// Sky-dome hemisphere: cool blue-white from above, warm purple from ground.
scene.add(new THREE.HemisphereLight(0xb0ceff, 0x3a1060, 1.8))
// Key light — warm golden directional, casts soft shadows.
const dir = new THREE.DirectionalLight(0xffe8c0, 1.8)
dir.position.set(12, 28, 14)
dir.castShadow = true
dir.shadow.mapSize.width  = 2048
dir.shadow.mapSize.height = 2048
dir.shadow.camera.near   = 1
dir.shadow.camera.far    = 120
dir.shadow.camera.left   = -40
dir.shadow.camera.right  = 40
dir.shadow.camera.top    = 40
dir.shadow.camera.bottom = -40
dir.shadow.bias = -0.0008
scene.add(dir)
// Fill / rim light — cool teal from opposite side for readable silhouettes.
const rim = new THREE.DirectionalLight(0x40c8ff, 0.55)
rim.position.set(-12, 8, -14)
scene.add(rim)
// Ground bounce — very warm, simulates hot arena floor glow.
const bounce = new THREE.PointLight(0xff6030, 0.6, 30, 2)
bounce.position.set(0, 0.5, 0)
scene.add(bounce)
// Player follow-light — soft blue-white halo around the self character,
// giving ground and nearby objects contact-shadow depth.
const playerLight = new THREE.PointLight(0xaaccff, 0.45, 8, 2)
scene.add(playerLight)

const placementPreviewGroup = new THREE.Group()
placementPreviewGroup.visible = false
scene.add(placementPreviewGroup)
const placementDiscMat = new THREE.MeshBasicMaterial({
  color: 0xffd260,
  transparent: true,
  opacity: 0.24,
  depthWrite: false,
  side: THREE.DoubleSide,
})
const placementRingMat = new THREE.MeshBasicMaterial({
  color: 0xffd260,
  transparent: true,
  opacity: 0.92,
  depthWrite: false,
  side: THREE.DoubleSide,
})
const placementDisc = new THREE.Mesh(new THREE.CircleGeometry(1, 64), placementDiscMat)
placementDisc.rotation.x = -Math.PI / 2
placementPreviewGroup.add(placementDisc)
const placementRing = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 64), placementRingMat)
placementRing.rotation.x = -Math.PI / 2
placementPreviewGroup.add(placementRing)
const placementWall = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({ color: 0xff8a30, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide }),
)
placementWall.rotation.x = -Math.PI / 2
placementPreviewGroup.add(placementWall)
const placementLineGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])
const placementLine = new THREE.Line(
  placementLineGeom,
  new THREE.LineBasicMaterial({ color: 0xffd260, transparent: true, opacity: 0.78 }),
)
placementPreviewGroup.add(placementLine)

const toonGradient = makeToonGradient()

// -----------------------------------------------------------------------
// Map geometry — swapped at runtime when server schema reports mapId change
// -----------------------------------------------------------------------

const GROUND_SIZE = 80
// Arena floor — two-tone stone with a subtle grid inset.
const groundMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE, 1, 1),
  new THREE.MeshToonMaterial({ color: 0x1e2838, gradientMap: toonGradient }),
)
groundMesh.rotation.x = -Math.PI / 2
groundMesh.receiveShadow = true
scene.add(groundMesh)

// Inner play-zone marker — a subtle darker inset circle.
const innerFloor = new THREE.Mesh(
  new THREE.CircleGeometry(30, 40),
  new THREE.MeshBasicMaterial({ color: 0x232e40, transparent: true, opacity: 0.70 }),
)
innerFloor.rotation.x = -Math.PI / 2
innerFloor.position.y = 0.003
scene.add(innerFloor)

// Glowing arena border ring — red kill-zone edge.
const arenaRing = new THREE.Mesh(
  new THREE.TorusGeometry(GROUND_SIZE / 2 - 1, 0.38, 8, 72),
  new THREE.MeshBasicMaterial({ color: 0xff3310, transparent: true, opacity: 0.75 }),
)
arenaRing.rotation.x = Math.PI / 2
arenaRing.position.y = 0.06
scene.add(arenaRing)
// Soft outer halo ring — wider torus slightly outside the main ring.
const arenaRingHaloMat = new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.18 })
const arenaRingHalo = new THREE.Mesh(
  new THREE.TorusGeometry(GROUND_SIZE / 2 - 0.2, 1.20, 6, 72),
  arenaRingHaloMat,
)
arenaRingHalo.rotation.x = Math.PI / 2
arenaRingHalo.position.y = 0.04
scene.add(arenaRingHalo)

// Secondary inner ring — decorative at 30 m, matches the inner floor.
const innerRing = new THREE.Mesh(
  new THREE.TorusGeometry(30, 0.15, 6, 60),
  new THREE.MeshBasicMaterial({ color: 0x3a5080, transparent: true, opacity: 0.50 }),
)
innerRing.rotation.x = Math.PI / 2
innerRing.position.y = 0.004
scene.add(innerRing)

// Mid-radius accent ring — subtle azure, halfway between centre and colosseum wall.
const midRing = new THREE.Mesh(
  new THREE.TorusGeometry(15, 0.10, 6, 48),
  new THREE.MeshBasicMaterial({ color: 0x2a4880, transparent: true, opacity: 0.42 }),
)
midRing.rotation.x = Math.PI / 2
midRing.position.y = 0.004
scene.add(midRing)

// Centre floor glow disc — subtle pulse drives the arena atmosphere.
const centreGlowMat = new THREE.MeshBasicMaterial({ color: 0x1028a0, transparent: true, opacity: 0.20, side: THREE.DoubleSide })
const centreGlow = new THREE.Mesh(new THREE.CircleGeometry(6.0, 48), centreGlowMat)
centreGlow.rotation.x = -Math.PI / 2
centreGlow.position.y = 0.005
scene.add(centreGlow)

// 8 spawn-pad markers — small diamond chevrons on the floor at ~22 m radius.
// Placed between the mid ring and colosseum wall so players have clear spawn indicators.
{
  const spawnMat  = new THREE.MeshBasicMaterial({ color: 0x406090, transparent: true, opacity: 0.55 })
  const spawnMat2 = new THREE.MeshBasicMaterial({ color: 0x2a4870, transparent: true, opacity: 0.38 })
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2
    const r2 = 22
    const cx = Math.sin(angle) * r2, cz = Math.cos(angle) * r2
    // Outer diamond ring (1.2 m across).
    const outer = new THREE.Mesh(
      new THREE.RingGeometry(0.48, 0.60, 4),
      spawnMat,
    )
    outer.rotation.x = -Math.PI / 2
    outer.rotation.z = angle + Math.PI / 4
    outer.position.set(cx, 0.008, cz)
    scene.add(outer)
    // Inner solid diamond.
    const inner = new THREE.Mesh(
      new THREE.CircleGeometry(0.30, 4),
      spawnMat2,
    )
    inner.rotation.x = -Math.PI / 2
    inner.rotation.z = angle + Math.PI / 4
    inner.position.set(cx, 0.009, cz)
    scene.add(inner)
  }
}

const grid = new THREE.GridHelper(GROUND_SIZE - 4, 24, 0x2a3a58, 0x1a2438)
;(grid.material as THREE.Material).transparent = true
;(grid.material as THREE.Material).opacity = 0.38
scene.add(grid)

// ═══════════════════════════════════════════════════════════════════════════
// Arena colosseum — pillars + battlemented walls + torch lights + combat floor crest
// ═══════════════════════════════════════════════════════════════════════════
const ARENA_R   = 30   // inner ring radius (matches inner ring torus)
const ARENA_N   = 8    // number of pillar/wall segments
const torchLights: THREE.PointLight[] = []

{
  const pillarMat   = new THREE.MeshToonMaterial({ color: 0x28384e, gradientMap: toonGradient })
  const wallMat     = new THREE.MeshToonMaterial({ color: 0x1c2a3a, gradientMap: toonGradient })
  const capMat      = new THREE.MeshToonMaterial({ color: 0x374d66, gradientMap: toonGradient })
  const pillarGeo   = new THREE.CylinderGeometry(0.40, 0.46, 7.0, 12)
  const capGeo      = new THREE.CylinderGeometry(0.60, 0.40, 0.40, 12)
  const baseGeo     = new THREE.CylinderGeometry(0.62, 0.70, 0.32, 12)
  const bandMat     = new THREE.MeshBasicMaterial({ color: 0x2090b8, transparent: true, opacity: 0.75 })

  for (let i = 0; i < ARENA_N; i++) {
    const a1 = (i       / ARENA_N) * Math.PI * 2
    const a2 = ((i + 1) / ARENA_N) * Math.PI * 2
    const px = Math.sin(a1) * ARENA_R,  pz = Math.cos(a1) * ARENA_R
    const qx = Math.sin(a2) * ARENA_R,  qz = Math.cos(a2) * ARENA_R
    const mx = (px + qx) / 2,           mz = (pz + qz) / 2
    const wallLen = Math.hypot(qx - px, qz - pz) - 1.1
    const wallYaw = Math.atan2(qx - px, qz - pz)

    // ── Pillar shaft + cap + base ────────────────────────────────────────
    const shaft = new THREE.Mesh(pillarGeo, pillarMat)
    shaft.position.set(px, 3.5, pz)
    shaft.castShadow = true; shaft.receiveShadow = true
    scene.add(shaft)
    const cap = new THREE.Mesh(capGeo, capMat)
    cap.position.set(px, 7.20, pz)
    scene.add(cap)
    const base = new THREE.Mesh(baseGeo, capMat)
    base.position.set(px, 0.16, pz)
    scene.add(base)
    // Glowing band at mid-height
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.048, 6, 26), bandMat)
    band.position.set(px, 3.2, pz)
    band.rotation.x = Math.PI / 2
    scene.add(band)

    // ── Battlement wall ──────────────────────────────────────────────────
    const wall = new THREE.Mesh(new THREE.BoxGeometry(wallLen, 2.2, 0.52), wallMat)
    wall.position.set(mx, 1.1, mz)
    wall.rotation.y = wallYaw
    wall.castShadow = true; wall.receiveShadow = true
    scene.add(wall)
    // Crenels (3 per wall segment)
    for (let c = -1; c <= 1; c++) {
      const cOff = c * wallLen * 0.28
      const crenel = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.45, 0.58), capMat)
      crenel.position.set(
        mx + Math.sin(wallYaw) * cOff,
        2.42,
        mz + Math.cos(wallYaw) * cOff,
      )
      crenel.rotation.y = wallYaw
      scene.add(crenel)
    }

    // ── Torch flame + point light atop each pillar ───────────────────────
    // Flame mesh (cone + inner glow cone)
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff9930, transparent: true, opacity: 0.9 })
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.35, 8), flameMat)
    flame.position.set(px, 7.65, pz)
    scene.add(flame)
    const innerFlameMat = new THREE.MeshBasicMaterial({ color: 0xffee80, transparent: true, opacity: 0.8 })
    const innerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 8), innerFlameMat)
    innerFlame.position.set(px, 7.72, pz)
    scene.add(innerFlame)
    // Bowl
    const bowlMat = new THREE.MeshToonMaterial({ color: 0x5a3a1a, gradientMap: toonGradient })
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.18, 8), bowlMat)
    bowl.position.set(px, 7.47, pz)
    scene.add(bowl)
    // Flickering point light
    const torch = new THREE.PointLight(0xff8830, 0.55, 14, 2)
    torch.position.set(px, 7.80, pz)
    scene.add(torch)
    torchLights.push(torch)
  }
}

// ── Cardinal floor compass rose ───────────────────────────────────────────
{
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x3a5070, transparent: true, opacity: 0.38 })
  for (let i = 0; i < 4; i++) {
    const lineMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 28), lineMat)
    lineMesh.rotation.x = -Math.PI / 2
    lineMesh.rotation.z = (i / 4) * Math.PI * 2
    lineMesh.position.y = 0.006
    scene.add(lineMesh)
  }
}

// ── Central combat crest — subtle rotating floor marker ───────────────────
const floorCrestGroup = new THREE.Group()
floorCrestGroup.position.y = 0.007
scene.add(floorCrestGroup)
{
  // Inner disc glow
  const discMat = new THREE.MeshBasicMaterial({ color: 0x1830a0, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
  const disc = new THREE.Mesh(new THREE.CircleGeometry(5.5, 48), discMat)
  disc.rotation.x = -Math.PI / 2
  floorCrestGroup.add(disc)
  // Concentric glowing rings
  const rings: [number, number, number, number][] = [
    [5.2, 0.12, 0x4060d8, 0.55],
    [3.8, 0.08, 0x3050c0, 0.45],
    [2.2, 0.07, 0x5070e0, 0.42],
    [0.8, 0.06, 0x6080f0, 0.50],
  ]
  for (const [r, w, col, op] of rings) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r - w / 2, r + w / 2, 52),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, side: THREE.DoubleSide }),
    )
    ring.rotation.x = -Math.PI / 2
    floorCrestGroup.add(ring)
  }
  // 6 crest spoke lines
  const spokeMat = new THREE.MeshBasicMaterial({ color: 0x4060d0, transparent: true, opacity: 0.38, side: THREE.DoubleSide })
  for (let i = 0; i < 6; i++) {
    const spoke = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 5.0), spokeMat)
    spoke.rotation.x = -Math.PI / 2
    spoke.rotation.z = (i / 6) * Math.PI * 2
    floorCrestGroup.add(spoke)
  }
  // 6 outer diamond marks on the outer ring
  const markMat = new THREE.MeshBasicMaterial({ color: 0x6090ff, transparent: true, opacity: 0.60 })
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), markMat)
    mark.rotation.x = -Math.PI / 2
    mark.rotation.z = angle + Math.PI / 4  // 45° diamond
    mark.position.set(Math.sin(angle) * 5.2, 0, Math.cos(angle) * 5.2)
    floorCrestGroup.add(mark)
  }
}

// ── Ceiling canopy ring + overhead accent lights ──────────────────────────
{
  const ceilingRing = new THREE.Mesh(
    new THREE.TorusGeometry(24, 0.22, 6, 64),
    new THREE.MeshBasicMaterial({ color: 0x2a4060, transparent: true, opacity: 0.50 }),
  )
  ceilingRing.rotation.x = Math.PI / 2
  ceilingRing.position.y = 15
  scene.add(ceilingRing)
  // Inner ceiling ring
  const ceilingRing2 = new THREE.Mesh(
    new THREE.TorusGeometry(12, 0.12, 6, 48),
    new THREE.MeshBasicMaterial({ color: 0x3050a0, transparent: true, opacity: 0.38 }),
  )
  ceilingRing2.rotation.x = Math.PI / 2
  ceilingRing2.position.y = 15
  scene.add(ceilingRing2)
  // Coloured overhead spots per quadrant
  const spotCols = [0x2050a0, 0x901818, 0x2050a0, 0x901818]
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2
    const spot = new THREE.PointLight(spotCols[i]!, 0.35, 28, 2)
    spot.position.set(Math.sin(angle) * 20, 13, Math.cos(angle) * 20)
    scene.add(spot)
  }
}

// Ambient arena particles — magical upward motes in two layers for depth.
const PARTICLE_COUNT = 260
const particlePositions = new Float32Array(PARTICLE_COUNT * 3)
const particleVels = new Float32Array(PARTICLE_COUNT * 3)
for (let i = 0; i < PARTICLE_COUNT; i++) {
  const ring = i < 140   // inner ring: small embers near ground
  const spread = ring ? 28 : 52
  particlePositions[i * 3]     = (Math.random() - 0.5) * spread
  particlePositions[i * 3 + 1] = Math.random() * (ring ? 8 : 22)
  particlePositions[i * 3 + 2] = (Math.random() - 0.5) * spread
  particleVels[i * 3]     = (Math.random() - 0.5) * 0.003
  particleVels[i * 3 + 1] = (ring ? 0.006 : 0.003) + Math.random() * 0.007
  particleVels[i * 3 + 2] = (Math.random() - 0.5) * 0.003
}
const particleGeo = new THREE.BufferGeometry()
particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
const particleMat = new THREE.PointsMaterial({
  color: 0xff8866, size: 0.09, transparent: true, opacity: 0.42, sizeAttenuation: true,
})
const ambientParticles = new THREE.Points(particleGeo, particleMat)
scene.add(ambientParticles)

// Wall-mounted ground accent lights — 4 dim blue-violet glows at the colosseum base.
// These create ambient fill between torch columns for more atmospheric depth.
for (let i = 0; i < 4; i++) {
  const angle = (i / 4) * Math.PI * 2 + Math.PI / 8
  const wl = new THREE.PointLight(0x3040c0, 0.22, 20, 2)
  wl.position.set(Math.sin(angle) * 28, 0.8, Math.cos(angle) * 28)
  scene.add(wl)
}

// Second particle layer: blue/violet magic dust — slower, higher, smaller.
const MAGIC_COUNT = 110
const magicPositions = new Float32Array(MAGIC_COUNT * 3)
const magicVels      = new Float32Array(MAGIC_COUNT * 3)
for (let i = 0; i < MAGIC_COUNT; i++) {
  const r = 8 + Math.random() * 28
  const a = Math.random() * Math.PI * 2
  magicPositions[i * 3]     = Math.cos(a) * r
  magicPositions[i * 3 + 1] = Math.random() * 20
  magicPositions[i * 3 + 2] = Math.sin(a) * r
  // Swirl: tangential velocity + upward drift
  magicVels[i * 3]     = -Math.sin(a) * 0.0018 + (Math.random() - 0.5) * 0.001
  magicVels[i * 3 + 1] = 0.0015 + Math.random() * 0.003
  magicVels[i * 3 + 2] =  Math.cos(a) * 0.0018 + (Math.random() - 0.5) * 0.001
}
const magicGeo = new THREE.BufferGeometry()
magicGeo.setAttribute('position', new THREE.BufferAttribute(magicPositions, 3))
const magicMat = new THREE.PointsMaterial({
  color: 0x60a8ff, size: 0.065, transparent: true, opacity: 0.32, sizeAttenuation: true,
})
const magicParticles = new THREE.Points(magicGeo, magicMat)
scene.add(magicParticles)

function makeBoxMesh(box: AABB, color: number): THREE.Mesh {
  const sx = box.maxX - box.minX
  const sy = box.maxY - box.minY
  const sz = box.maxZ - box.minZ
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz),
    new THREE.MeshToonMaterial({ color, gradientMap: toonGradient }),
  )
  m.position.set((box.minX + box.maxX) / 2, (box.minY + box.maxY) / 2, (box.minZ + box.maxZ) / 2)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

let activeMapId = ''
const mapBoxMeshes: THREE.Mesh[] = []

function loadMapGeometry(mapId: string): void {
  if (mapId === activeMapId) return
  activeMapId = mapId
  for (const m of mapBoxMeshes) {
    scene.remove(m)
    m.geometry.dispose()
    ;(m.material as THREE.Material).dispose()
  }
  mapBoxMeshes.length = 0
  const map = getMap(mapId)
  groundMesh.position.y = map.groundY
  grid.position.y = map.groundY + 0.001
  for (const b of map.boxes) {
    // Taller boxes (height > 1.5) get a slightly lighter accent so they read as
    // cover/pillars at a glance; low cover is darker stone.
    const height = b.maxY - b.minY
    const color = height > 2.5 ? 0x4a78b0 : height > 1.4 ? 0x385e8a : 0x2e4a70
    const m = makeBoxMesh(b, color)
    scene.add(m)
    mapBoxMeshes.push(m)
  }
}

// Seed with blockout (default) until server schema arrives.
loadMapGeometry('blockout')

// -----------------------------------------------------------------------
// Character factory — humanoid figure that fills the capsule hitbox.
// Group origin = capsule centre (transform.y = CAPSULE_HALF_HEIGHT_M above ground).
// All child mesh positions are relative to that centre.
// userData['armorMat'] → the primary team-colour material (used for emissive).
// -----------------------------------------------------------------------

function makeCharacter(teamColor: number): THREE.Group {
  const g = new THREE.Group()

  const armorMat = new THREE.MeshToonMaterial({ color: teamColor, gradientMap: toonGradient })
  const darkMat  = new THREE.MeshToonMaterial({ color: 0x1a1e2e, gradientMap: toonGradient })
  const visorMat = new THREE.MeshBasicMaterial({ color: 0x50d8ff, transparent: true, opacity: 0.92, side: THREE.DoubleSide })

  g.userData['armorMat'] = armorMat
  g.userData['darkMat']  = darkMat

  const addPart = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    px: number, py: number, pz: number,
    rx = 0, ry = 0, rz = 0,
  ): THREE.Mesh => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(px, py, pz)
    if (rx || ry || rz) m.rotation.set(rx, ry, rz)
    m.castShadow = true
    g.add(m)
    return m
  }

  // Head
  addPart(new THREE.SphereGeometry(0.195, 14, 10),    armorMat, 0, 0.71, 0)
  // Visor — two eye-lens discs on the front face (-Z), showing facing direction.
  addPart(new THREE.CircleGeometry(0.068, 10),  visorMat, -0.072, 0.73, -0.19)
  addPart(new THREE.CircleGeometry(0.068, 10),  visorMat,  0.072, 0.73, -0.19)
  // Neck
  addPart(new THREE.CylinderGeometry(0.068, 0.068, 0.12, 8), darkMat, 0, 0.53, 0)
  // Torso
  addPart(new THREE.BoxGeometry(0.50, 0.58, 0.26), armorMat, 0, 0.16, 0)
  // Shoulder guards (team-colour pauldrons)
  addPart(new THREE.BoxGeometry(0.14, 0.08, 0.20), armorMat, -0.34, 0.46, 0)
  addPart(new THREE.BoxGeometry(0.14, 0.08, 0.20), armorMat,  0.34, 0.46, 0)
  // Upper arms
  addPart(new THREE.CylinderGeometry(0.072, 0.065, 0.30, 8), darkMat, -0.32, 0.22, 0, 0, 0,  0.24)
  addPart(new THREE.CylinderGeometry(0.072, 0.065, 0.30, 8), darkMat,  0.32, 0.22, 0, 0, 0, -0.24)
  // Forearms
  addPart(new THREE.CylinderGeometry(0.062, 0.056, 0.26, 8), darkMat, -0.34, -0.07, 0.03, 0.22, 0,  0.10)
  addPart(new THREE.CylinderGeometry(0.062, 0.056, 0.26, 8), darkMat,  0.34, -0.07, 0.03, 0.22, 0, -0.10)
  // Belt/waist detail
  addPart(new THREE.BoxGeometry(0.46, 0.09, 0.23), armorMat, 0, -0.12, 0)
  // Upper legs
  addPart(new THREE.CylinderGeometry(0.093, 0.082, 0.35, 8), darkMat, -0.13, -0.38, 0)
  addPart(new THREE.CylinderGeometry(0.093, 0.082, 0.35, 8), darkMat,  0.13, -0.38, 0)
  // Lower legs (slight forward lean)
  addPart(new THREE.CylinderGeometry(0.080, 0.068, 0.30, 8), darkMat, -0.12, -0.70, 0.02, 0.07, 0, 0)
  addPart(new THREE.CylinderGeometry(0.080, 0.068, 0.30, 8), darkMat,  0.12, -0.70, 0.02, 0.07, 0, 0)
  // Boots
  addPart(new THREE.BoxGeometry(0.17, 0.10, 0.30), darkMat, -0.12, -0.88, 0.04)
  addPart(new THREE.BoxGeometry(0.17, 0.10, 0.30), darkMat,  0.12, -0.88, 0.04)

  // Blob shadow (always-on, hardware shadows may not reach flat ground)
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(CAPSULE_RADIUS_M * 1.10, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false }),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = -CAPSULE_HEIGHT_M / 2 + 0.015
  g.add(shadow)

  // Weapon prop group — attached at right-hand position.
  // applyWeaponProp() swaps mesh children when the active weapon changes.
  const weaponGroup = new THREE.Group()
  weaponGroup.position.set(0.38, -0.22, -0.08)
  weaponGroup.rotation.set(0.25, 0, -0.18) // slight forward/inward tilt
  g.userData['weaponGroup'] = weaponGroup
  g.add(weaponGroup)

  return g
}

// Alias retained so any future code can call makeCapsule without searching.
const makeCapsule = makeCharacter

// -----------------------------------------------------------------------
// Weapon prop — builds and swaps the visible weapon mesh inside the
// weaponGroup attached to the character.  Call whenever activeWeapon changes.
// -----------------------------------------------------------------------
function applyWeaponProp(charGroup: THREE.Group, weapon: string): void {
  const wg = charGroup.userData['weaponGroup'] as THREE.Group | undefined
  if (!wg) return
  // Dispose old props — geometry AND material must both be released to avoid GPU leak.
  while (wg.children.length > 0) {
    const child = wg.children[0] as THREE.Mesh
    child.geometry?.dispose()
    const mat = child.material as THREE.Material | THREE.Material[] | undefined
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
    else mat?.dispose()
    wg.remove(child)
  }
  const addProp = (geo: THREE.BufferGeometry, mat: THREE.Material, px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(px, py, pz); m.rotation.set(rx, ry, rz)
    m.castShadow = true; wg.add(m)
  }
  if (weapon === 'sword') {
    const bladeMat  = new THREE.MeshToonMaterial({ color: 0xc8daf0, gradientMap: toonGradient })
    const edgeMat   = new THREE.MeshBasicMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.85 })
    const guardMat  = new THREE.MeshToonMaterial({ color: 0x9a8c38, gradientMap: toonGradient })
    const handleMat = new THREE.MeshToonMaterial({ color: 0x4a2c10, gradientMap: toonGradient })
    addProp(new THREE.BoxGeometry(0.042, 0.74, 0.060), bladeMat,  0, 0.48, 0)   // blade
    addProp(new THREE.BoxGeometry(0.010, 0.74, 0.014), edgeMat,   0, 0.48, 0.034)  // edge highlight
    addProp(new THREE.BoxGeometry(0.24,  0.046, 0.060), guardMat, 0, 0.10, 0)   // cross-guard
    addProp(new THREE.CylinderGeometry(0.028, 0.024, 0.22, 8), handleMat, 0, -0.06, 0)  // handle
    addProp(new THREE.SphereGeometry(0.038, 8, 6), guardMat, 0, -0.18, 0)       // pommel
  } else if (weapon === 'bow') {
    const woodMat   = new THREE.MeshToonMaterial({ color: 0x7a5428, gradientMap: toonGradient })
    const stringMat = new THREE.MeshBasicMaterial({ color: 0xc8c090 })
    // Arc — open torus, rotated so the opening faces forward
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.024, 8, 22, Math.PI * 1.48), woodMat)
    arc.rotation.set(-Math.PI * 0.25, 0, 0)
    arc.castShadow = true; wg.add(arc)
    addProp(new THREE.CylinderGeometry(0.005, 0.005, 0.68, 4), stringMat, 0, 0, 0)  // string
  } else if (weapon === 'staff') {
    const woodMat = new THREE.MeshToonMaterial({ color: 0x2e2048, gradientMap: toonGradient })
    const orbMat  = new THREE.MeshStandardMaterial({
      color: 0x80c8ff, emissive: 0x3090ff, emissiveIntensity: 4.5, roughness: 0.05,
    })
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x60a8ff, transparent: true, opacity: 0.75 })
    addProp(new THREE.CylinderGeometry(0.028, 0.022, 1.20, 8), woodMat, 0, 0.60, 0)  // shaft
    addProp(new THREE.SphereGeometry(0.078, 12, 8), orbMat, 0, 1.28, 0)               // orb
    // Orbiting ring around the orb
    const orbRing = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 6, 20), ringMat)
    orbRing.position.set(0, 1.28, 0)
    orbRing.rotation.x = Math.PI / 3
    orbRing.castShadow = false; wg.add(orbRing)
  }
}

function spawnImpact(pos: THREE.Vector3, color: number): void {
  impactVfx.spawn(pos, color)
}

// Flat ring hovering over a remote player's head to signal they are casting.
function makeCastRing(): THREE.Mesh {
  const geo = new THREE.RingGeometry(0.28, 0.38, 24)
  geo.rotateX(-Math.PI / 2)
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffd060,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  })
  const m = new THREE.Mesh(geo, mat)
  m.visible = false
  return m
}

const impactVfx = new ImpactPool()
scene.add(impactVfx.mesh)

// -----------------------------------------------------------------------
// Input capture — keyboard + mouse
// -----------------------------------------------------------------------

const keys = new Set<string>()
let mouseYaw = 0
let mousePitch = 0
let jumpEdgeQueued = false
// LMB edges — the handler decides what to do based on the active weapon.
let lmbPressEdge = false
let lmbReleaseEdge = false
let lmbDown = false
// RMB edges — parry press/release.
let rmbPressEdge = false
let rmbReleaseEdge = false
// Weapon swap queue — processed inside simStep so it's tick-aligned with other
// input. Null when no swap queued this tick.
let weaponSwapRequest: Weapon | null = null
let optimisticWeapon: Weapon | null = null
let pointerLocked = false
let loadoutReturnsToPause = false
// Local cast-bar start timestamp — set when casting becomes true, cleared on reset.
let castStartedAtMs = 0
// Queue of ability id casts requested via direct binds or LMB-fired primed wheel slots.
const abilityCastQueue: string[] = []
let placementAbilityId: string | null = null

// Staff auto-fire throttle — cadence enforced locally so we don't spam the
// server. The server also enforces cadence authoritatively.
let lastStaffFireMs = 0
// Cooldown on staff clicks while LMB is held: send one on edge + auto at cadence.
const STAFF_FIRE_THROTTLE_MS = STAFF_M1_CADENCE_SEC * 1000

function clearCombatInputEdges(): void {
  keys.clear()
  jumpEdgeQueued = false
  lmbPressEdge = false
  lmbReleaseEdge = false
  lmbDown = false
  rmbPressEdge = false
  rmbReleaseEdge = false
  weaponSwapRequest = null
  optimisticWeapon = null
  cancelPlacementPreview()
}

function isPauseMenuOpen(): boolean {
  return !pauseMenu.classList.contains('hidden')
}

function requestPointerLockSafely(): void {
  try {
    const result = renderer.domElement.requestPointerLock?.()
    if (result && typeof result.catch === 'function') {
      void result.catch(() => {})
    }
  } catch {
    // Browser may reject pointer lock outside trusted gestures or automation.
  }
}

function openPauseMenu(): void {
  if (!room || isPauseMenuOpen()) return
  if (radialOpen) radialClose(false)
  clearCombatInputEdges()
  loadoutStation.close()
  menu.hideMain()
  menu.hideScoreboard()
  settingsOverlay.classList.add('hidden')
  const loadoutLocked = currentMatchPhase === 'live'
  pauseLoadoutBtn.disabled = loadoutLocked
  pauseLoadoutBtn.textContent = loadoutLocked ? 'Loadout Locked' : 'Loadout'
  pauseMenu.classList.remove('hidden')
  if (document.pointerLockElement) document.exitPointerLock()
}

function closePauseMenu(lockPointer: boolean): void {
  pauseMenu.classList.add('hidden')
  clearCombatInputEdges()
  if (lockPointer && room && document.pointerLockElement !== renderer.domElement) {
    requestPointerLockSafely()
  }
}

pauseResumeBtn.addEventListener('click', () => closePauseMenu(true))
pauseLoadoutBtn.addEventListener('click', () => {
  if (currentMatchPhase === 'live') return
  loadoutReturnsToPause = true
  closePauseMenu(false)
  if (room) loadoutStation.open()
})
pauseSettingsBtn.addEventListener('click', () => {
  pauseMenu.classList.add('hidden')
  settingsOverlay.dataset['returnTo'] = 'pause'
  settingsOverlay.classList.remove('hidden')
})
pauseLobbyBtn.addEventListener('click', () => {
  closePauseMenu(false)
  returnToMainMenu({ leaveRoom: true, statusText: 'left match' })
})

function isWeapon(w: string): w is Weapon {
  return (WEAPON_IDS as readonly string[]).includes(w)
}

function currentWeaponFromSchema(): Weapon {
  const schemaWeapon = getSelfSchemaPlayer()?.activeWeapon
  return schemaWeapon && isWeapon(schemaWeapon) ? schemaWeapon : 'sword'
}

function currentWeaponForInput(): Weapon {
  return optimisticWeapon ?? currentWeaponFromSchema()
}

function isOverlayOpen(el: HTMLElement): boolean {
  return !el.classList.contains('hidden')
}

function loadoutStationHidden(): boolean {
  return document.getElementById('loadout-station')?.classList.contains('hidden') ?? true
}

function isGameplayInputAllowed(): boolean {
  return Boolean(room)
    && currentMatchPhase === 'live'
    && loadoutStationHidden()
    && !isPauseMenuOpen()
    && !isOverlayOpen(settingsOverlay)
    && !document.body.classList.contains('main-menu-active')
    && !document.body.classList.contains('loadout-active')
}

function isTextEditingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

function closeSettingsOverlayToReturnTarget(): void {
  settingsOverlay.classList.add('hidden')
  if (settingsOverlay.dataset['returnTo'] === 'pause' && room) pauseMenu.classList.remove('hidden')
  else if (room) openPauseMenu()
  else menu.showMain()
  settingsOverlay.dataset['returnTo'] = ''
}

addEventListener('keydown', (e) => {
  const k = e.code
  const fresh = !keys.has(k)
  keys.add(k)
  if (!fresh) return

  if (k === 'Escape') {
    e.preventDefault()
    if (placementAbilityId) { cancelPlacementPreview(); return }
    if (radialOpen) { radialClose(false); return }
    if (isOverlayOpen(settingsOverlay)) { closeSettingsOverlayToReturnTarget(); return }
    if (!loadoutStationHidden()) {
      loadoutStation.close()
      if (loadoutReturnsToPause && room) {
        loadoutReturnsToPause = false
        pauseMenu.classList.remove('hidden')
      } else if (room) {
        openPauseMenu()
      } else if (!pointerLocked) {
        menu.showMain()
      }
      return
    }
    if (room) {
      if (isPauseMenuOpen()) closePauseMenu(true)
      else openPauseMenu()
      return
    }
    if (!pointerLocked) menu.showMain()
    return
  }

  if (isTextEditingTarget(e.target) || isOverlayOpen(settingsOverlay) || !loadoutStationHidden() || isPauseMenuOpen()) {
    return
  }

  if (matchesAction(k, 'openLoadout')) {
    e.preventDefault()
    clearCombatInputEdges()
    if (radialOpen) radialClose(false)
    if (room && currentMatchPhase === 'live') {
      openPauseMenu()
      return
    }
    pauseMenu.classList.add('hidden')
    settingsOverlay.classList.add('hidden')
    menu.hideMain()
    if (document.pointerLockElement) document.exitPointerLock()
    loadoutReturnsToPause = Boolean(room)
    loadoutStation.open()
    return
  }

  const gameplayInputActive = isGameplayInputAllowed()
  if (!gameplayInputActive) return

  if (matchesAction(k, 'jump')) jumpEdgeQueued = true

  // Q — open utility/transfer wheel. E — open combat ability wheel.
  if (matchesAction(k, 'wheelUtility')) {
    e.preventDefault()
    radialOpen_(utilityWheel, k)
  }
  if (matchesAction(k, 'wheelAbility')) {
    e.preventDefault()
    radialOpen_(abilityWheel, k)
  }
  if (k === 'Backquote') {
    document.getElementById('debug')?.classList.toggle('hidden')
  }

  // Weapon swap — Tab cycles sword→bow→staff→sword. Scroll also works.
  if (matchesAction(k, 'swapWeapon')) {
    e.preventDefault()
    const cur = currentWeaponForInput()
    const idx = (WEAPON_IDS as readonly string[]).indexOf(cur)
    weaponSwapRequest = WEAPON_IDS[(idx + 1) % WEAPON_IDS.length]!
  }

  // Ability binds — resolve ID from current loadout at press time.
  // Slot map: R=melee, 1-5=magic, Z/X/F=fixed transfers, V=flex utility.
  for (const [code, , slotIdx] of slotKeybindEntries()) {
    if (k === code) {
      activateAbilitySlot(slotIdx, false)
      break
    }
  }


  // Sensitivity — [ to lower, ] to raise (10 % steps, min/max clamped).
  if (matchesAction(k, 'sensDown')) {
    mouseSens = Math.max(SENS_MIN, parseFloat((mouseSens * 0.9).toFixed(4)))
    saveSens(mouseSens)
    showSensOverlay()
  }
  if (matchesAction(k, 'sensUp')) {
    mouseSens = Math.min(SENS_MAX, parseFloat((mouseSens * 1.1).toFixed(4)))
    saveSens(mouseSens)
    showSensOverlay()
  }
})
addEventListener('keyup', (e) => {
  keys.delete(e.code)
  // Wheel key release: close the radial menu and prime the selected slot.
  // It does not cast. LMB fires the primed ability with the current crosshair.
  if (radialOpen && e.code === activeWheelKey) {
    radialClose(true)
  }
})

renderer.domElement.addEventListener('contextmenu', (e) => {
  // Suppress browser menu so RMB is ours for parry.
  e.preventDefault()
})

function handleCombatPointerDown(button: number): void {
  if (!pointerLocked) {
    if (button === 0) requestPointerLockSafely()
    if (!isGameplayInputAllowed()) return
  }
  if (button === 0) {
    if (!lmbDown) lmbPressEdge = true
    lmbDown = true
  } else if (button === 2) {
    rmbPressEdge = true
  }
}

function handleCombatPointerUp(button: number): void {
  if (button === 0) {
    if (lmbDown) lmbReleaseEdge = true
    lmbDown = false
  } else if (button === 2) {
    rmbReleaseEdge = true
  }
}

renderer.domElement.addEventListener('pointerdown', (e) => {
  handleCombatPointerDown(e.button)
})
renderer.domElement.addEventListener('pointerup', (e) => {
  handleCombatPointerUp(e.button)
})
renderer.domElement.addEventListener('mousedown', (e) => {
  handleCombatPointerDown(e.button)
})
renderer.domElement.addEventListener('mouseup', (e) => {
  handleCombatPointerUp(e.button)
})

document.addEventListener('pointerlockchange', () => {
  pointerLocked = document.pointerLockElement === renderer.domElement
  hint.classList.toggle('hidden', pointerLocked)
  pingHud.classList.toggle('ingame', pointerLocked && ping > 0)
  if (!pointerLocked) {
    if (lmbDown) lmbReleaseEdge = true
    lmbDown = false
    // Clear held keys so the character stops moving when pointer lock is released
    // (tab-out, ESC, loadout open). Without this, WASD stay "pressed" and the
    // player keeps moving until each key is physically re-pressed and released.
    keys.clear()
  }
})

addEventListener('blur', () => {
  clearCombatInputEdges()
})

document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearCombatInputEdges()
})

// Scroll wheel — cycle through weapons (standard arena-game convention).
// Wheel down = next weapon (sword→bow→staff→sword), wheel up = prev.
renderer.domElement.addEventListener('wheel', (e: WheelEvent) => {
  if (!isGameplayInputAllowed()) return
  const idx = (WEAPON_IDS as readonly string[]).indexOf(currentWeaponForInput())
  const dir = e.deltaY > 0 ? 1 : -1
  const next = WEAPON_IDS[(idx + dir + WEAPON_IDS.length) % WEAPON_IDS.length]!
  weaponSwapRequest = next
}, { passive: true })

addEventListener('mousemove', (e) => {
  // While a radial wheel is open, mouse movement keeps updating the highlighted
  // sector until the wheel key is released. The wheel is a selector, not a cast.
  if (radialOpen) {
    if (pointerLocked) radialMouseMove(e.movementX, e.movementY)
    else radialPointMove(e.clientX, e.clientY)
    return
  }
  if (!pointerLocked) return
  mouseYaw   -= e.movementX * mouseSens
  mousePitch -= e.movementY * mouseSens
  if (mousePitch > PITCH_UP_LIMIT)   mousePitch = PITCH_UP_LIMIT
  if (mousePitch < PITCH_DOWN_LIMIT) mousePitch = PITCH_DOWN_LIMIT
})

function sampleInput(airborne: boolean, dead: boolean): SimInput {
  if (dead) {
    return { moveX: 0, moveZ: 0, yaw: mouseYaw, jump: false, jumpHold: false }
  }
  const forward = (keys.has(actionCode('moveForward')) ? 1 : 0) - (keys.has(actionCode('moveBack')) ? 1 : 0)
  const strafe = (keys.has(actionCode('moveRight')) ? 1 : 0) - (keys.has(actionCode('moveLeft')) ? 1 : 0)
  // Airborne: full directional control (standard arena-game air-strafing).
  // Jump edge only fires if not already airborne (coyote window handled in
  // shared controller). JumpHold is always forwarded so hold-apex is respected.
  const input: SimInput = {
    moveX: strafe,
    moveZ: -forward,
    yaw: mouseYaw,
    jump: airborne ? false : jumpEdgeQueued,
    jumpHold: keys.has(actionCode('jump')),
  }
  jumpEdgeQueued = false
  return input
}

// -----------------------------------------------------------------------
// Networking
// -----------------------------------------------------------------------

const SERVER_URL =
  (import.meta.env['VITE_SERVER_URL'] as string | undefined) ?? 'ws://localhost:2567'

interface SelfState {
  sessionId: string
  sim: PlayerSimState
  pending: Array<{ seq: number; input: SimInput; dt: number; caps: MovementCaps }>
  lastPredictionDelta: number
  lastAckSeq: number
  // Tick at which the most recent bow charge was started locally. 0 when not
  // charging. We track it locally for the HUD bar — the authoritative value
  // is in schema too but the per-frame HUD benefits from the local copy
  // starting at the moment of LMB down (no RTT delay).
  bowChargeStartMs: number
  // True after the server schema has confirmed this local draw. Until then,
  // schema bowChargeStartTick can still be 0 because of normal replication
  // delay and must not cancel the pending local draw.
  bowChargeServerAcked: boolean
}

interface RemoteSnapshot {
  at: number
  x: number
  y: number
  z: number
  yaw: number
}

interface RemoteState {
  mesh: THREE.Group
  snapshots: RemoteSnapshot[]
  arc: THREE.Mesh
  arcExpiresAt: number
  lastSwingStartTick: number
  castRing: THREE.Mesh
  nameplate: HTMLDivElement
  hpFill: HTMLDivElement
  hp: number
  alive: boolean
  lastWeapon: string
}

interface ProjectileVisual {
  mesh: THREE.Mesh
  lastPos: THREE.Vector3
  lastAt: number
  kind: 'arrow' | 'bolt'
}

const remotePlayers = new Map<string, RemoteState>()
const projectileVisuals = new Map<string, ProjectileVisual>()
let self: SelfState | null = null

// Kill feed helper — adds a floating line that fades after 5.2 s.
function addKillFeedEntry(killerName: string, victimName: string, isSelfKill: boolean, isSelfDied: boolean): void {
  const entry = document.createElement('div')
  const cls = ['kill-entry']
  if (isSelfKill) cls.push('self-kill')
  if (isSelfDied) cls.push('self-died')
  entry.className = cls.join(' ')
  // Weapon icon pill
  const iconSpan = document.createElement('span')
  iconSpan.className = 'k-icon'
  iconSpan.textContent = isSelfKill ? '⚔️' : isSelfDied ? '💀' : '⚔️'
  const killerSpan = document.createElement('span')
  killerSpan.className = `kname${isSelfKill ? ' you' : ' enemy'}`
  killerSpan.textContent = killerName
  const arrow = document.createElement('span')
  arrow.style.cssText = 'color:#50587a;margin:0 2px'
  arrow.textContent = '›'
  const victimSpan = document.createElement('span')
  victimSpan.className = `kname${isSelfDied ? ' you' : ' enemy'}`
  victimSpan.textContent = victimName
  entry.appendChild(iconSpan)
  entry.appendChild(killerSpan)
  entry.appendChild(arrow)
  entry.appendChild(victimSpan)
  killFeed.appendChild(entry)
  // Keep at most 6 entries visible; remove oldest.
  while (killFeed.children.length > 6) killFeed.removeChild(killFeed.firstChild!)
  setTimeout(() => entry.remove(), 5200)
}

// Big centred kill / death splash text.
function showKillSplash(text: string, kind: 'kill' | 'died'): void {
  const el = document.createElement('div')
  el.className = `kill-splash ${kind}`
  el.textContent = text
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 1600)
}

// Hitmarker — briefly flashes the crosshair red when a hit lands.
let hitmarkerTimeout = 0
function showHitmarker(): void {
  clearTimeout(hitmarkerTimeout)
  crosshairEl.classList.add('hit')
  hitmarkerTimeout = setTimeout(() => crosshairEl.classList.remove('hit'), 130) as unknown as number
}

// Damage blink — classic white-flash on the self character when taking a hit.
// Stored as a timestamp; the render loop ramps emissive up to white then back.
let selfDamageBlinkUntilMs = 0
function triggerDamageBlink(): void {
  selfDamageBlinkUntilMs = performance.now() + 160
}

// Remote character damage blink — same effect driven per remote player sid.
const remoteDamageBlinkUntil = new Map<string, number>()

// Flash one of the 4 directional hit indicators based on the attacker's screen
// direction relative to the player's current facing yaw.
// Determines which screen quadrant the attacker is in and pulses that wedge.
function showDirectionalHit(attackerWorldPos: THREE.Vector3 | null): void {
  let dir: string
  if (!attackerWorldPos || !self?.sim.pos) {
    dir = (['top', 'bottom', 'left', 'right'] as const)[Math.floor(Math.random() * 4)]!
  } else {
    const dx = attackerWorldPos.x - self.sim.pos.x
    const dz = attackerWorldPos.z - self.sim.pos.z
    // Camera yaw = facing direction (negative Z = forward by convention).
    // We project the attacker offset onto the 2-D screen plane.
    const camYaw = camera.rotation.y
    // Rotate attacker delta into camera space.
    const cos = Math.cos(-camYaw), sin = Math.sin(-camYaw)
    const camX =  cos * dx + sin * dz  // positive = right on screen
    const camZ = -sin * dx + cos * dz  // positive = behind camera = upper screen
    if (Math.abs(camX) > Math.abs(camZ)) {
      dir = camX > 0 ? 'right' : 'left'
    } else {
      dir = camZ < 0 ? 'top' : 'bottom'
    }
  }
  const el = hitDirEls[dir]
  if (!el) return
  el.classList.remove('flash')
  void el.offsetWidth
  el.classList.add('flash')
}

// Directional screen shake — offset the camera toward/away from attacker.
// attackerWorldPos: world-space position of whoever dealt damage. Pass null
// for a random-direction fallback (e.g. death from zone damage).
function applyDirectionalShake(attackerWorldPos: THREE.Vector3 | null, intensity = 1): void {
  const selfPos = self?.sim.pos
  if (selfPos && attackerWorldPos) {
    // Push camera away from attacker (recoil feel).
    const dir = new THREE.Vector3(
      selfPos.x - attackerWorldPos.x,
      0,
      selfPos.z - attackerWorldPos.z,
    ).normalize()
    shakeOffset.set(dir.x * 0.28 * intensity, 0.1 * intensity, dir.z * 0.28 * intensity)
  } else {
    const angle = Math.random() * Math.PI * 2
    shakeOffset.set(
      Math.cos(angle) * 0.22 * intensity,
      0.08 * intensity,
      Math.sin(angle) * 0.22 * intensity,
    )
  }
  shakeDecay = shakeOffset.length()
}

// Live round phase start tick — set when MatchPhase 'live' arrives.
let livePhaseStartTick = -1
let currentMatchPhase = 'lobby'
let lastKillerName = ''
// Previous self HP — used to detect heals for the green edge flash.
let prevSelfHp = -1
// Timestamps of self kills for streak detection (ms).
const recentKillTimes: number[] = []
let selfMesh: THREE.Group | null = null
let selfArc: THREE.Mesh | null = null
let selfArcExpiresAt = 0
let selfLastWeapon = ''
let room: Room | null = null
let connectSeq = 0
let ping = 0

// Hit-stop — briefly freeze visual updates when a landed hit is confirmed.
// The sim still runs; only the camera lerp and particle animation pause.
let hitStopUntilMs = 0
// Victim-side hit-stop — receiving a hit triggers a brief visual freeze for self.
let victimHitStopUntilMs = 0

// Hit-stop durations by damage source category (milliseconds).
const HITSTOP_ATTACKER: Record<string, number> = { sword_m1: 65, uppercut: 65, bow: 35, staff: 35 }
const HITSTOP_VICTIM: Record<string, number>   = { sword_m1: 45, uppercut: 45, bow: 30, staff: 30 }
function hitstopAttacker(cause: string): number {
  return HITSTOP_ATTACKER[cause] ?? (cause.startsWith('zone:') || cause.startsWith('combo:') ? 20 : 45)
}
function hitstopVictim(cause: string): number {
  return HITSTOP_VICTIM[cause] ?? (cause.startsWith('zone:') || cause.startsWith('combo:') ? 25 : 35)
}

// Client-side combo tracking for the attacker (independent of server combo state).
// Counts consecutive hits landed; resets after COMBO_RESET_MS idle or on death.
let localComboCount = 0
let lastHitAsAttackerMs = 0
const COMBO_RESET_MS = 2500

// Directional screen shake — camera displacement decays each frame toward zero.
// Magnitude and direction are set by applyDirectionalShake(); decay is per-frame.
const shakeOffset = new THREE.Vector3()
let shakeDecay = 0  // current magnitude (metres), decays at shakeDecayRate/s
const SHAKE_DECAY_RATE = 9 // m/s — shake disappears in ~1/SHAKE_DECAY_RATE seconds

// Per-weapon camera — smoothly lerped so swapping weapons doesn't snap.
// bow: ADS zoom (less back, lower FOV); melee: wide; staff: default.
// FOV default is 90° (industry standard for TPS; Overwatch, Battlerite, Apex).
let camBack = 5.5
let camUp = 1.3
let camFovBase = 90
// Settings-driven FOV offset applied on top of camFovBase. Set by the
// settings panel; persisted by menu.ts via localStorage.
let settingsFovBase = 90
let pendingLaunchMode: string | null = null
const HUD_POS_KEY = 'ragequit.hud.position.v1'
const HUD_SIZE_KEY = 'ragequit.hud.size.v1'
const HUD_MIN_WIDTH = 250
const HUD_MAX_WIDTH = 520
const HUD_MIN_BAR_H = 18
const HUD_MAX_BAR_H = 26

function clampHudPosition(left: number, top: number): { left: number; top: number } {
  const rect = hudPanel.getBoundingClientRect()
  const margin = 8
  const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin)
  const maxTop = Math.max(margin, window.innerHeight - rect.height - margin)
  return {
    left: Math.max(margin, Math.min(maxLeft, left)),
    top: Math.max(margin, Math.min(maxTop, top)),
  }
}

function clampHudSize(width: number, barHeight: number): { width: number; barHeight: number } {
  const margin = 12
  const maxWidth = Math.min(HUD_MAX_WIDTH, Math.max(HUD_MIN_WIDTH, window.innerWidth - margin * 2))
  return {
    width: Math.max(HUD_MIN_WIDTH, Math.min(maxWidth, width)),
    barHeight: Math.max(HUD_MIN_BAR_H, Math.min(HUD_MAX_BAR_H, barHeight)),
  }
}

function setHudSize(width: number, barHeight: number, persist = true): void {
  const size = clampHudSize(width, barHeight)
  hudPanel.style.width = `${size.width}px`
  hudPanel.style.setProperty('--hud-bar-h', `${size.barHeight}px`)
  if (persist) {
    try {
      localStorage.setItem(HUD_SIZE_KEY, JSON.stringify(size))
    } catch {
      // Local storage can be disabled by privacy settings.
    }
  }
  if (hudPanel.style.left && hudPanel.style.top) {
    setHudPosition(parseFloat(hudPanel.style.left), parseFloat(hudPanel.style.top), false)
  }
}

function setHudPosition(left: number, top: number, persist = true): void {
  const pos = clampHudPosition(left, top)
  hudPanel.style.left = `${pos.left}px`
  hudPanel.style.top = `${pos.top}px`
  hudPanel.style.right = 'auto'
  hudPanel.style.bottom = 'auto'
  if (persist) {
    try {
      localStorage.setItem(HUD_POS_KEY, JSON.stringify(pos))
    } catch {
      // Local storage can be disabled by privacy settings.
    }
  }
}

function resetHudPosition(): void {
  hudPanel.style.left = ''
  hudPanel.style.top = ''
  hudPanel.style.right = ''
  hudPanel.style.bottom = ''
  hudPanel.style.width = ''
  hudPanel.style.removeProperty('--hud-bar-h')
  try {
    localStorage.removeItem(HUD_POS_KEY)
    localStorage.removeItem(HUD_SIZE_KEY)
  } catch {
    // Storage is optional.
  }
}

function initDraggableHud(): void {
  try {
    const raw = localStorage.getItem(HUD_POS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { left?: number; top?: number }
      if (Number.isFinite(parsed.left) && Number.isFinite(parsed.top)) {
        setHudPosition(parsed.left!, parsed.top!, false)
      }
    }
    const rawSize = localStorage.getItem(HUD_SIZE_KEY)
    if (rawSize) {
      const parsed = JSON.parse(rawSize) as { width?: number; barHeight?: number }
      if (Number.isFinite(parsed.width) && Number.isFinite(parsed.barHeight)) {
        setHudSize(parsed.width!, parsed.barHeight!, false)
      }
    }
  } catch {
    resetHudPosition()
  }

  let dragging = false
  let resizing = false
  let offsetX = 0
  let offsetY = 0
  let resizeStartX = 0
  let resizeStartY = 0
  let resizeStartWidth = 0
  let resizeStartBarH = 0
  let activePointer = -1
  let resizePointer = -1

  const beginDrag = (clientX: number, clientY: number): void => {
    if (resizing) return
    dragging = true
    const rect = hudPanel.getBoundingClientRect()
    offsetX = clientX - rect.left
    offsetY = clientY - rect.top
    hudPanel.classList.add('dragging')
  }

  const moveDrag = (clientX: number, clientY: number): void => {
    if (!dragging) return
    setHudPosition(clientX - offsetX, clientY - offsetY)
  }

  const endDrag = (): void => {
    if (!dragging) return
    dragging = false
    activePointer = -1
    hudPanel.classList.remove('dragging')
  }

  const beginResize = (clientX: number, clientY: number): void => {
    resizing = true
    const rect = hudPanel.getBoundingClientRect()
    resizeStartX = clientX
    resizeStartY = clientY
    resizeStartWidth = rect.width
    resizeStartBarH = parseFloat(getComputedStyle(hudPanel).getPropertyValue('--hud-bar-h')) || 22
    hudPanel.classList.add('resizing')
  }

  const moveResize = (clientX: number, clientY: number): void => {
    if (!resizing) return
    setHudSize(
      resizeStartWidth + (clientX - resizeStartX),
      resizeStartBarH + (clientY - resizeStartY) / 3,
    )
  }

  const endResize = (): void => {
    if (!resizing) return
    resizing = false
    resizePointer = -1
    hudPanel.classList.remove('resizing')
  }

  hudDragHandle.addEventListener('pointerdown', (e) => {
    activePointer = e.pointerId
    beginDrag(e.clientX, e.clientY)
    hudDragHandle.setPointerCapture(e.pointerId)
    e.preventDefault()
  })

  hudDragHandle.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== activePointer) return
    moveDrag(e.clientX, e.clientY)
  })

  const stopDrag = (e: PointerEvent): void => {
    if (!dragging || e.pointerId !== activePointer) return
    endDrag()
    hudDragHandle.releasePointerCapture(e.pointerId)
  }
  hudDragHandle.addEventListener('pointerup', stopDrag)
  hudDragHandle.addEventListener('pointercancel', stopDrag)
  hudDragHandle.addEventListener('mousedown', (e) => {
    if (dragging) return
    beginDrag(e.clientX, e.clientY)
    e.preventDefault()
  })

  hudResizeHandle.addEventListener('pointerdown', (e) => {
    resizePointer = e.pointerId
    beginResize(e.clientX, e.clientY)
    hudResizeHandle.setPointerCapture(e.pointerId)
    e.preventDefault()
    e.stopPropagation()
  })
  hudResizeHandle.addEventListener('pointermove', (e) => {
    if (!resizing || e.pointerId !== resizePointer) return
    moveResize(e.clientX, e.clientY)
  })
  const stopResize = (e: PointerEvent): void => {
    if (!resizing || e.pointerId !== resizePointer) return
    endResize()
    hudResizeHandle.releasePointerCapture(e.pointerId)
  }
  hudResizeHandle.addEventListener('pointerup', stopResize)
  hudResizeHandle.addEventListener('pointercancel', stopResize)

  document.addEventListener('mousemove', (e) => {
    if (activePointer !== -1) return
    moveDrag(e.clientX, e.clientY)
  })
  document.addEventListener('mouseup', () => {
    if (activePointer !== -1) return
    endDrag()
  })
  document.addEventListener('pointermove', (e) => {
    if (resizePointer === -1 || e.pointerId !== resizePointer) return
    moveResize(e.clientX, e.clientY)
  })
  document.addEventListener('pointerup', (e) => {
    if (resizePointer === -1 || e.pointerId !== resizePointer) return
    endResize()
  })
  document.addEventListener('pointercancel', (e) => {
    if (resizePointer === -1 || e.pointerId !== resizePointer) return
    endResize()
  })
  hudDragHandle.addEventListener('dblclick', (e) => {
    e.preventDefault()
    resetHudPosition()
  })
}

initDraggableHud()

function setStatus(text: string, color: string): void {
  dbgStatus.textContent = text
  dbgStatus.style.color = color
}

const loadoutStation = initLoadoutStation(
  () => room,
  () => renderer.domElement,
  () => {
    if (pendingLaunchMode) pendingLaunchMode = null
    if (!room) {
      loadoutReturnsToPause = false
      menu.showMain()
      return
    }
    if (loadoutReturnsToPause) {
      loadoutReturnsToPause = false
      pauseMenu.classList.remove('hidden')
    } else {
      openPauseMenu()
    }
  },
  () => currentMatchPhase !== 'live',
  () => {
    const mode = pendingLaunchMode
    pendingLaunchMode = null
    if (mode) {
      void connectWithMode(mode, false)
      requestPointerLockSafely()
    } else if (!room) {
      menu.showMain()
    }
  },
)

async function connectWithMode(mode: string, reopenLoadout = true): Promise<void> {
  if (!room) {
    await connect(mode, reopenLoadout)
    // If connect() threw (server unreachable, room full, etc.) the catch inside
    // connect() sets the status but leaves the UI in limbo — loadout station is
    // open but there is no room. Return the player to the main menu so they can
    // retry rather than being stuck on a blank screen.
    if (!room) {
      loadoutStation.close()
      menu.showMain()
    }
  } else {
    // Already in a room — push loadout and continue. Leaving and rejoining
    // with a different mode would reset the match; deferred to Fase 7 lobby.
    pushPersistedLoadout()
  }
}

const menu = initMenu({
  onPlay: () => {
    loadoutReturnsToPause = false
    pendingLaunchMode = 'duel_arena'
    menu.hideMain()
    loadoutStation.open()
  },
  onTraining: () => {
    loadoutReturnsToPause = false
    pendingLaunchMode = 'training'
    menu.hideMain()
    loadoutStation.open()
  },
  onLoadout: () => {
    loadoutReturnsToPause = false
    pendingLaunchMode = null
    menu.hideMain()
    loadoutStation.open()
  },
  onScoreboardBack: () => {
    returnToMainMenu({ leaveRoom: true, statusText: 'left match' })
  },
  onFovChange: (fov) => {
    settingsFovBase = fov
    camFovBase = fov // snap immediately when changed from settings
  },
  onSensChange: (sens) => {
    mouseSens = sens
    saveSens(sens)
  },
  onVolumeChange: (vol) => {
    soundEngine.volume = vol
  },
  onGraphicsChange: (quality) => {
    const pixelRatioMap = { low: 1.0, med: 1.25, high: 1.5 }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioMap[quality]))
  },
})

async function connect(mode = 'duel_arena', reopenLoadout = true): Promise<void> {
  const seq = ++connectSeq
  setStatus('connecting', '#e4c05a')
  try {
    const client = new Client(SERVER_URL)
    const joinedRoom = await client.joinOrCreate('game', { mode })
    const mainMenuHidden = document.getElementById('main-menu')?.classList.contains('hidden') ?? false
    if (seq !== connectSeq || !mainMenuHidden) {
      void joinedRoom.leave()
      return
    }
    room = joinedRoom
    soundEngine.muted = false
    setStatus('connected', '#9be39b')
    console.info(
      `[ragequit-client] connected ${SERVER_URL} room=${joinedRoom.roomId} session=${joinedRoom.sessionId} mode=${mode}`,
    )
    // Push the persisted loadout immediately so server-side Mastery/cooldowns
    // reflect the build even before the user clicks CONFIRM.
    pushPersistedLoadout()
    // Re-open the station only when the main menu is still hidden, meaning the
    // user is still waiting for the connection and hasn't pressed Back. If they
    // navigated back to the menu while we were connecting we must NOT force the
    // loadout station back open — that would leave them in the broken half-game
    // state this whole set of fixes is designed to prevent.
    if (mainMenuHidden && reopenLoadout) {
      loadoutStation.open()
    }

    const isCurrentRoom = () => room === joinedRoom

    joinedRoom.onMessage(MessageTypes.PongAck, (msg: { clientTime: number; serverTime: number }) => {
      if (!isCurrentRoom()) return
      ping = performance.now() - msg.clientTime
    })

    joinedRoom.onMessage(MessageTypes.Hit, (msg: ServerHitMessage) => {
      if (isCurrentRoom()) onHit(msg)
    })
    joinedRoom.onMessage(MessageTypes.Death, (msg: ServerDeathMessage) => {
      if (isCurrentRoom()) onDeath(msg)
    })
    joinedRoom.onMessage(MessageTypes.ProjectileSpawned, (msg: ServerProjectileSpawnedMessage) => {
      if (isCurrentRoom()) onProjectileSpawned(msg)
    },
    )
    joinedRoom.onMessage(MessageTypes.ProjectileExpired, (msg: ServerProjectileExpiredMessage) => {
      if (isCurrentRoom()) onProjectileExpired(msg)
    },
    )
    joinedRoom.onMessage(MessageTypes.WeaponSwapped, (msg: ServerWeaponSwappedMessage) => {
      if (isCurrentRoom()) onWeaponSwapped(msg)
    },
    )
    joinedRoom.onMessage(MessageTypes.ParryEvent, (msg: ServerParryEventMessage) => {
      if (!isCurrentRoom()) return
      // parry HUD is driven from schema (player.parrying / parryIsHold).
      // Play the metallic ring for the parrying player (self). Attackers and
      // bystanders hear it via onHit (didParry && !amISelf guard there).
      if (msg.playerId === self?.sessionId) soundEngine.playParry()
    })

    // Status / transmute / zone event listeners.
    joinedRoom.onMessage(MessageTypes.StatusApplied, (msg: ServerStatusAppliedMessage) => {
      if (isCurrentRoom()) onStatusApplied(msg)
    },
    )
    joinedRoom.onMessage(MessageTypes.StatusExpired, (msg: ServerStatusExpiredMessage) => {
      if (isCurrentRoom()) onStatusExpired(msg)
    },
    )
    joinedRoom.onMessage(MessageTypes.TransmuteResult, (msg: ServerTransmuteResultMessage) => {
      if (isCurrentRoom()) onTransmuteResult(msg)
    },
    )
    joinedRoom.onMessage(MessageTypes.ZoneSpawned, (msg: ServerZoneSpawnedMessage) => {
      if (isCurrentRoom()) onZoneSpawned(msg)
    })
    joinedRoom.onMessage(MessageTypes.ZoneExpired, (msg: ServerZoneExpiredMessage) => {
      if (isCurrentRoom()) onZoneExpired(msg)
    })
    joinedRoom.onMessage(MessageTypes.AbilityCasted, (msg: { casterId: string; abilityId: string; atTick: number }) => {
      if (!isCurrentRoom()) return
      // Play cast sound for self only; remote cast VFX can be expanded in a later polish pass.
      if (msg.casterId === self?.sessionId) {
        const def = ABILITY_DEFS[msg.abilityId]
        soundEngine.playCast(def?.element ?? 'none')
        // Anchor cast bar to server ack time — eliminates RTT-induced desync.
        if (def && def.windupSec > 0) castStartedAtMs = performance.now()
      }
    })

    // Server notices — loadout rejections, room warnings, info toasts.
    joinedRoom.onMessage(MessageTypes.ServerNote, (msg: ServerNoteMessage) => {
      if (isCurrentRoom()) showServerNote(msg)
    })

    // Ability failed — visual feedback on rejection
    joinedRoom.onMessage(MessageTypes.AbilityFailed, (msg: ServerAbilityFailedMessage) => {
      if (isCurrentRoom()) onAbilityFailed(msg)
    })
    // Channel interrupted — clear cast bar immediately
    joinedRoom.onMessage(MessageTypes.ChannelInterrupted, (msg: ServerChannelInterruptedMessage) => {
      if (isCurrentRoom()) onChannelInterrupted(msg)
    })

    // Kill streak events.
    joinedRoom.onMessage(MessageTypes.KillStreak, (msg: ServerKillStreakMessage) => {
      if (isCurrentRoom()) onKillStreak(msg)
    })

    // Fase 7 — match flow events
    joinedRoom.onMessage(MessageTypes.MatchPhase, (msg: ServerMatchPhaseMessage) => {
      if (!isCurrentRoom()) return
      currentMatchPhase = msg.phase
      menu.onMatchPhase(msg, joinedRoom.sessionId)
      if (msg.phase === 'live') {
        livePhaseStartTick = getSchemaTick()
        roundTimer.textContent = ''
      } else {
        livePhaseStartTick = -1
        roundTimer.textContent = ''
        roundTimer.classList.remove('urgent')
      }
      if (msg.phase === 'matchEnd') {
        // Release pointer lock so the cursor is visible and the scoreboard
        // buttons (BACK TO MENU) are clickable.
        if (document.pointerLockElement) document.exitPointerLock()
        menu.showScoreboard(joinedRoom.sessionId)
      }
    })
    joinedRoom.onMessage(MessageTypes.Score, (msg: ServerScoreMessage) => {
      if (!isCurrentRoom()) return
      const selfId = joinedRoom.sessionId
      let otherId = ''
      const players = getSchemaPlayers()
      players?.forEach((_p, sid) => {
        if (sid !== selfId) otherId = sid
      })
      menu.onScore(msg, selfId, otherId)
    })

    joinedRoom.onLeave(() => {
      if (room && room !== joinedRoom) return
      setStatus('disconnected', '#e87070')
      returnToMainMenu({ leaveRoom: false, statusText: 'disconnected' })
    })
  } catch (err) {
    setStatus('offline', '#e87070')
    console.warn('[ragequit-client] connection failed', err)
  }
}

function pushPersistedLoadout(): void {
  sendLoadout(room, loadoutStation.getLoadout())
}

// -----------------------------------------------------------------------
// Hit / death feedback + projectile events
// -----------------------------------------------------------------------

function triggerComboFlash(): void {
  comboFlash.classList.add('active')
  void comboFlash.offsetHeight
  comboFlash.classList.remove('active')
}

let comboPopupTimer: ReturnType<typeof setTimeout> | null = null
function showComboPopupText(count: number): void {
  if (comboPopupTimer !== null) clearTimeout(comboPopupTimer)
  comboPopup.textContent = `COMBO! ×${count}`
  comboPopup.classList.remove('pop')
  void comboPopup.offsetHeight
  comboPopup.classList.add('pop')
  comboPopupTimer = setTimeout(() => {
    comboPopup.classList.remove('pop')
    comboPopupTimer = null
  }, 900)
}

function onHit(msg: ServerHitMessage): void {
  const amISelf = msg.victimId === self?.sessionId
  const amIAttacker = msg.attackerId === self?.sessionId
  const now = performance.now()
  // Normalise power 0–1 against typical hit ceiling (~40 damage = full power).
  const power = Math.min(1, msg.damage / 40)

  // --- Parry sound: victim side already handled by ParryEvent; play for others. ---
  if (msg.didParry && !amISelf) {
    soundEngine.playParry()
  }

  // --- Attacker: combo tracking + escalated feedback ---
  if (amIAttacker && !amISelf && msg.damage > 0 && !msg.didParry) {
    // Reset combo if too much time has passed since last hit.
    if (now - lastHitAsAttackerMs > COMBO_RESET_MS) localComboCount = 0
    localComboCount++
    lastHitAsAttackerMs = now

    if (localComboCount >= 3) {
      // ── CRACK ── strong hit, golden flash, COMBO popup, max shake.
      soundEngine.playCrack(power)
      triggerComboFlash()
      showComboPopupText(localComboCount)
      hitStopUntilMs = now + 80  // longer stop for crack
      applyDirectionalShake(getPlayerWorldPos(msg.victimId), 0.9)
      localComboCount = 0  // reset after crack
    } else if (localComboCount === 2) {
      // ── Heavy hit ── escalated sound + stronger shake.
      soundEngine.playHeavyHit(power)
      hitStopUntilMs = now + hitstopAttacker(msg.cause)
      applyDirectionalShake(getPlayerWorldPos(msg.victimId), 0.55)
    } else {
      // ── Normal hit 1 ──
      soundEngine.playHitByType(msg.cause, power)
      hitStopUntilMs = now + hitstopAttacker(msg.cause)
      applyDirectionalShake(getPlayerWorldPos(msg.victimId), 0.3)
    }
  }

  // --- Victim (self): receive-damage sound + freeze + shake ---
  if (amISelf && msg.damage > 0 && !msg.didParry) {
    soundEngine.playHurtByType(msg.cause, power)
    victimHitStopUntilMs = now + hitstopVictim(msg.cause)
  }

  // --- Observer: world-space impact sound (attenuated) ---
  if (!amIAttacker && !amISelf && msg.damage > 0 && !msg.didParry) {
    soundEngine.playHitByType(msg.cause, power * 0.7)
  }

  // --- Hitmarker ---
  if (amIAttacker && !amISelf && msg.damage > 0) showHitmarker()

  // --- Victim: flash + directional shake ---
  if (amISelf) {
    if (msg.didParry) {
      parryFlash.classList.add('active')
      void parryFlash.offsetHeight
      parryFlash.classList.remove('active')
    } else if (msg.damage > 0) {
      damageFlash.classList.add('active')
      void damageFlash.offsetHeight
      damageFlash.classList.remove('active')
      // Shake toward attacker.
      const attackerPos = getPlayerWorldPos(msg.attackerId)
      const shakeIntensity = msg.cause === 'sword_m1' || msg.cause === 'uppercut'
        ? Math.min(1.2, msg.damage / 25)   // melee hits harder
        : Math.min(1, msg.damage / 30)
      applyDirectionalShake(attackerPos, shakeIntensity)
      showDirectionalHit(attackerPos)
      triggerDamageBlink()
    }
  }

  // --- Melee VFX — spawn impact spark between attacker and victim ---
  if ((msg.cause === 'sword_m1' || msg.cause === 'uppercut') && msg.damage > 0 && !msg.didParry) {
    const attPos = getPlayerWorldPos(msg.attackerId)
    const vicPos = getPlayerWorldPos(msg.victimId)
    if (attPos && vicPos) {
      const mx = (attPos.x + vicPos.x) * 0.5
      const my = (attPos.y + vicPos.y) * 0.5
      const mz = (attPos.z + vicPos.z) * 0.5
      spawnImpact(new THREE.Vector3(mx, my, mz), 0xffcc44)
    } else if (vicPos) {
      // Fallback: impact at victim position.
      spawnImpact(new THREE.Vector3(vicPos.x, vicPos.y, vicPos.z), 0xffcc44)
    }
  }

  const victimPos = getPlayerWorldPos(msg.victimId)
  if (victimPos) showDamagePopup(victimPos, msg.damage, amISelf, msg.didParry, msg.element)
  // Trigger white blink on the victim's remote character mesh so hits feel impactful.
  if (!amISelf && msg.damage > 0 && !msg.didParry) {
    remoteDamageBlinkUntil.set(msg.victimId, performance.now() + 160)
  }
}

function onDeath(msg: ServerDeathMessage): void {
  const selfId = self?.sessionId ?? ''
  const isSelfDied = msg.victimId === selfId
  const isSelfKill = msg.killerId === selfId

  // Resolve display names from schema (fall back to truncated session id).
  const players = getSchemaPlayers()
  const killerName = players?.get(msg.killerId)?.name || msg.killerId.slice(0, 6)
  const victimName = players?.get(msg.victimId)?.name || msg.victimId.slice(0, 6)

  addKillFeedEntry(killerName, victimName, isSelfKill, isSelfDied)

  if (isSelfDied) {
    lastKillerName = killerName
    soundEngine.playDeath()
    applyDirectionalShake(null, 1.4) // max intensity on death
    showDirectionalHit(null)
    showKillSplash('ELIMINATO', 'died')
    damageFlash.classList.add('active')
    void damageFlash.offsetHeight
    damageFlash.classList.remove('active')
    // Reset cast bar — if dying during a windup the bar would otherwise
    // persist on the respawn screen and reappear incorrectly after respawn.
    castStartedAtMs = 0
    castBar.classList.remove('active')
    castBarFill.style.width = '0%'
    // Reset local combo counter so a kill doesn't carry over to next life.
    localComboCount = 0
    // Clear any primed ability — it would fire on the wrong tick after respawn.
    primedSlotIdx = null
  } else if (isSelfKill) {
    soundEngine.playKill()
    const now = performance.now()
    recentKillTimes.push(now)
    // Keep only kills within the last 8 seconds.
    while (recentKillTimes.length > 0 && now - recentKillTimes[0]! > 8000) recentKillTimes.shift()
    const streak = recentKillTimes.length
    if (streak >= 4) showKillSplash('ULTRA KILL!', 'kill')
    else if (streak === 3) showKillSplash('TRIPLE KILL!', 'kill')
    else if (streak === 2) showKillSplash('DOUBLE KILL!', 'kill')
    else showKillSplash('KILL!', 'kill')
  }
}

let streakHideTimer: ReturnType<typeof setTimeout> | null = null

function onKillStreak(msg: ServerKillStreakMessage): void {
  const selfId = self?.sessionId ?? ''
  if (msg.playerId !== selfId) return // only self streak shown

  if (msg.streak === 0) {
    // Streak broken — hide counter
    streakDisplay.classList.add('hidden')
    return
  }

  // Update counter
  const label =
    msg.streak >= 5 ? `UNSTOPPABLE  ×${msg.streak}` :
    msg.streak === 4 ? `DOMINATING   ×4` :
    msg.streak === 3 ? `TRIPLE KILL  ×3` :
    msg.streak === 2 ? `DOUBLE KILL  ×2` :
    `KILL  ×${msg.streak}`

  streakCountEl.textContent = label
  // Re-trigger CSS pulse by cloning the node trick
  const fresh = streakCountEl.cloneNode(true) as HTMLElement
  streakCountEl.replaceWith(fresh)
  fresh.id = 'streak-count'
  // Update bonus label
  if (msg.damageBonus > 0) {
    streakBonusEl.textContent = `+${Math.round(msg.damageBonus * 100)}% damage`
    streakBonusEl.style.display = ''
  } else {
    streakBonusEl.style.display = 'none'
  }

  streakDisplay.classList.remove('hidden')

  // Auto-hide after 6 s if no further kills
  if (streakHideTimer !== null) clearTimeout(streakHideTimer)
  streakHideTimer = setTimeout(() => {
    streakDisplay.classList.add('hidden')
    streakHideTimer = null
  }, 6000)
}

function onAbilityFailed(msg: ServerAbilityFailedMessage): void {
  const pip = cdPipEls.get(msg.abilityId)
  if (pip) {
    // Flash the pip red to signal rejection.
    pip.classList.remove('pending')
    pip.classList.add('fail-flash')
    setTimeout(() => pip.classList.remove('fail-flash'), 400)
  }

  // Extra feedback per rejection reason.
  if (msg.reason === 'cost') {
    // Flash the relevant resource bar (mana or stamina).
    const def = ABILITY_DEFS[msg.abilityId]
    if (def) {
      if (def.costMana > 0) flashResourceBar('mana')
      if (def.costStamina > 0) flashResourceBar('stam')
    }
  }

  if (msg.reason === 'cc') {
    // Highlight the status icons strip to draw attention to the CC source.
    statusStrip.classList.add('cc-locked')
    setTimeout(() => statusStrip.classList.remove('cc-locked'), 500)
  }

  if (msg.reason === 'gcd') {
    // Pulse the GCD ring indicator if visible.
    gcdRingEl?.classList.add('pulse')
    setTimeout(() => gcdRingEl?.classList.remove('pulse'), 300)
  }
}

function flashResourceBar(which: 'mana' | 'stam'): void {
  const el = document.getElementById(`hud-${which}`)
  if (!el) return
  el.classList.add('flash-cost')
  setTimeout(() => el.classList.remove('flash-cost'), 400)
}

// Server notices (loadout rejection warnings, info messages from the room).
let serverToastTimer: ReturnType<typeof setTimeout> | null = null
function showServerNote(msg: ServerNoteMessage): void {
  serverToast.textContent = msg.text
  serverToast.className = msg.kind // 'warn' or 'info'
  if (serverToastTimer !== null) clearTimeout(serverToastTimer)
  const duration = msg.kind === 'warn' ? 5000 : 3000
  serverToastTimer = setTimeout(() => {
    serverToast.classList.add('hidden')
    serverToastTimer = null
  }, duration)
}

function onChannelInterrupted(msg: ServerChannelInterruptedMessage): void {
  const selfId = self?.sessionId ?? ''
  if (msg.casterId !== selfId) return
  // Immediately collapse the cast bar and show a brief "INTERRUPTED" label.
  castStartedAtMs = 0
  castBar.classList.remove('active')
  castBarFill.style.width = '0%'
  castBarLabel.textContent = 'INTERRUPTED'
  castBar.classList.add('interrupted')
  setTimeout(() => castBar.classList.remove('interrupted'), 600)
}

function onProjectileSpawned(msg: ServerProjectileSpawnedMessage): void {
  // The schema map also carries the projectile, but we spawn the mesh eagerly
  // here so the origin->origin+vel*dt segment starts rendering immediately
  // without waiting for the first state patch.
  if (projectileVisuals.has(msg.id)) return
  const mesh = makeProjectileMesh(msg.kind)
  mesh.position.set(msg.origin.x, msg.origin.y, msg.origin.z)
  scene.add(mesh)
  projectileVisuals.set(msg.id, {
    mesh,
    lastPos: new THREE.Vector3(msg.origin.x, msg.origin.y, msg.origin.z),
    lastAt: performance.now(),
    kind: msg.kind,
  })
}

function onProjectileExpired(msg: ServerProjectileExpiredMessage): void {
  const vis = projectileVisuals.get(msg.id)
  if (vis) {
    scene.remove(vis.mesh)
    vis.mesh.geometry.dispose()
    ;(vis.mesh.material as THREE.Material).dispose()
    projectileVisuals.delete(msg.id)
  }
  // Element-tinted impact: prefer projectile element, fall back to reason-based.
  const elemColor = msg.element ? zoneColorForElement(msg.element) : null
  const color =
    elemColor ??
    (msg.reason === 'victim' ? 0xff6060 : msg.reason === 'terrain' ? 0xaabbcc : 0x80d0ff)
  spawnImpact(new THREE.Vector3(msg.pos.x, msg.pos.y, msg.pos.z), color)
}

function onWeaponSwapped(msg: ServerWeaponSwappedMessage): void {
  if (msg.playerId !== self?.sessionId) return
  if (optimisticWeapon === msg.weapon) optimisticWeapon = null
  // Highlight is driven from schema in render(), but we reset local input
  // state here so a charge straddling a swap is cleaned up.
  if (self) {
    self.bowChargeStartMs = 0
    self.bowChargeServerAcked = false
  }
  lastStaffFireMs = 0

  soundEngine.playSwap()

  // Flash the new weapon slot to signal the swap was accepted by the server.
  const slot = weaponSlots[msg.weapon]
  if (slot) {
    slot.classList.add('swap-flash')
    setTimeout(() => slot.classList.remove('swap-flash'), 220)
  }

  // Show centred weapon name banner so it's always clear what you switched to.
  showWeaponBanner(msg.weapon)
}

// --- Event handlers --------------------------------------------------------

interface ZoneVisual {
  mesh: THREE.Mesh
  extra?: THREE.Mesh // secondary decal mesh (floor ring for circle zones)
}
const zoneVisuals = new Map<string, ZoneVisual>()

function disposeObject3D(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose()
      if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose())
      else (child.material as THREE.Material).dispose()
    }
  })
}

function clearProjectileVisuals(): void {
  projectileVisuals.forEach((vis) => {
    scene.remove(vis.mesh)
    vis.mesh.geometry.dispose()
    ;(vis.mesh.material as THREE.Material).dispose()
  })
  projectileVisuals.clear()
}

function clearZoneVisuals(): void {
  zoneVisuals.forEach((vis) => {
    scene.remove(vis.mesh)
    vis.mesh.geometry.dispose()
    ;(vis.mesh.material as THREE.Material).dispose()
    if (vis.extra) {
      scene.remove(vis.extra)
      vis.extra.geometry.dispose()
      ;(vis.extra.material as THREE.Material).dispose()
    }
  })
  zoneVisuals.clear()
}

function clearRemotePlayers(): void {
  remotePlayers.forEach((r) => {
    scene.remove(r.mesh)
    disposeObject3D(r.mesh)
    scene.remove(r.arc)
    r.arc.geometry.dispose()
    ;(r.arc.material as THREE.Material).dispose()
    scene.remove(r.castRing)
    r.castRing.geometry.dispose()
    ;(r.castRing.material as THREE.Material).dispose()
    r.nameplate.remove()
  })
  remotePlayers.clear()
}

function clearSelfVisuals(): void {
  if (selfMesh) {
    scene.remove(selfMesh)
    disposeObject3D(selfMesh)
    selfMesh = null
  }
  if (selfArc) {
    scene.remove(selfArc)
    selfArc.geometry.dispose()
    ;(selfArc.material as THREE.Material).dispose()
    selfArc = null
  }
  selfArcExpiresAt = 0
  selfLastWeapon = ''
}

function clearGameplayUi(): void {
  castStartedAtMs = 0
  castBar.classList.remove('active', 'interrupted')
  castBarFill.style.width = '0%'
  castBarFill.style.background = ''
  castBarFill.style.boxShadow = ''
  castBarLabel.textContent = ''
  damageFlash.classList.remove('active', 'death')
  comboFlash.classList.remove('active')
  comboPopup.classList.remove('show')
  blindVignette.classList.remove('active')
  deathOverlay.classList.remove('active')
  respawnOverlay.classList.remove('active')
  document.body.classList.remove('player-dead')
  crosshairEl.classList.remove('hit')
  roundTimer.textContent = ''
  roundTimer.classList.remove('urgent')
  pingHud.className = ''
  popupsLayer.replaceChildren()
  killFeed.replaceChildren()
}

function clearGameplayInputState(): void {
  if (radialOpen) radialClose(false)
  keys.clear()
  jumpEdgeQueued = false
  lmbPressEdge = false
  lmbReleaseEdge = false
  lmbDown = false
  rmbPressEdge = false
  rmbReleaseEdge = false
  weaponSwapRequest = null
  optimisticWeapon = null
  abilityCastQueue.length = 0
  primedSlotIdx = null
  radialRefresh(utilityWheel)
  radialRefresh(abilityWheel)
  lastStaffFireMs = 0
}

function clearLocalMatchState(): void {
  soundEngine.muted = true
  currentMatchPhase = 'lobby'
  livePhaseStartTick = -1
  ping = 0
  localComboCount = 0
  lastHitAsAttackerMs = 0
  hitStopUntilMs = 0
  victimHitStopUntilMs = 0
  shakeOffset.set(0, 0, 0)
  shakeDecay = 0
  for (const dir of ['hp_mana', 'mana_stam', 'stam_hp'] as const) transmuteCdExpiry[dir] = 0
  clearGameplayInputState()
  clearGameplayUi()
  clearProjectileVisuals()
  clearZoneVisuals()
  clearRemotePlayers()
  clearSelfVisuals()
}

function returnToMainMenu(opts: { leaveRoom: boolean; statusText?: string }): void {
  connectSeq++
  const leavingRoom = room
  room = null
  self = null
  clearLocalMatchState()
  if (document.pointerLockElement) document.exitPointerLock()
  pauseMenu.classList.add('hidden')
  settingsOverlay.classList.add('hidden')
  settingsOverlay.dataset['returnTo'] = ''
  loadoutStation.close()
  menu.hideScoreboard()
  menu.showMain()
  if (opts.statusText) setStatus(opts.statusText, opts.statusText === 'disconnected' ? '#e87070' : '#e4c05a')
  if (opts.leaveRoom && leavingRoom) void leavingRoom.leave()
}

// Status emissive colours — lerped onto the capsule MeshToonMaterial.emissive
// while a status is active. Values are Three.js hex integers (not CSS).
const STATUS_EMISSIVE: Record<string, number> = {
  burn:    0xff2800,
  bleed:   0x880000,
  chill:   0x0055ff,
  poison:  0x00bb33,
  slow:    0x5500cc,
  root:    0x663300,
  stun:    0xeedd00,
  freeze:  0x22aaff,
  curse:   0xaa00ff,
  blind:   0x050505,
  mark:    0xff0044,
  shield:  0x3377ff,
  haste:   0xffcc00,
}

// Status effect colors for the flash overlay.
const STATUS_FLASH_COLOR: Record<string, string> = {
  burn: 'rgba(255,100,30,0.3)',
  bleed: 'rgba(180,30,30,0.3)',
  chill: 'rgba(80,180,255,0.25)',
  poison: 'rgba(80,220,60,0.25)',
  slow: 'rgba(120,60,220,0.2)',
  root: 'rgba(120,80,0,0.3)',
  stun: 'rgba(255,230,60,0.3)',
  freeze: 'rgba(120,220,255,0.35)',
  curse: 'rgba(160,60,255,0.25)',
  blind: 'rgba(0,0,0,0.45)',
  mark: 'rgba(255,60,60,0.2)',
}

function onStatusApplied(msg: ServerStatusAppliedMessage): void {
  if (msg.playerId !== self?.sessionId) return
  // Infer element from the status kind for the tone.
  const statusElementMap: Record<string, string> = {
    burn: 'fire', bleed: 'none', chill: 'ice', poison: 'nature',
    slow: 'dark', root: 'nature', stun: 'lightning', freeze: 'ice',
    curse: 'dark', blind: 'dark', mark: 'none', shield: 'none', haste: 'lightning',
  }
  soundEngine.playStatus(statusElementMap[msg.status] ?? 'none')
  // Brief coloured screen-edge vignette matching the status element.
  const color = STATUS_FLASH_COLOR[msg.status]
  if (!color) return
  const flash = document.createElement('div')
  flash.style.cssText = `position:fixed;inset:0;background:radial-gradient(circle at center,transparent 40%,${color} 100%);pointer-events:none;z-index:800;animation:kill-fade 0.7s forwards`
  document.body.appendChild(flash)
  setTimeout(() => flash.remove(), 700)
}

function onStatusExpired(_msg: ServerStatusExpiredMessage): void {
  // No-op — render() reads the schema each frame.
}

function onTransmuteResult(msg: ServerTransmuteResultMessage): void {
  if (msg.playerId !== self?.sessionId) return
  // Briefly flash the targeted bar by adding a CSS class.
  const target =
    msg.direction === 'hp_mana'
      ? hudHpFill
      : msg.direction === 'mana_stam'
        ? hudManaFill
        : hudStamFill
  if (msg.ok) {
    target.classList.add('pulse')
    setTimeout(() => target.classList.remove('pulse'), 350)
    // Start client-side cooldown tracking.
    transmuteCdExpiry[msg.direction] = performance.now() + TRANSMUTE_CD_MS
    updateTransmuteBar()
  } else {
    // Shake the slot to indicate failure.
    const el = transmuteSlotEls[msg.direction]
    if (el) {
      el.style.animation = 'none'
      void el.offsetWidth
      el.style.animation = 'shake 0.25s ease'
    }
  }
}

/** Refresh transmute bar — call every frame while in-game. */
function updateTransmuteBar(): void {
  const now = performance.now()
  for (const dir of ['hp_mana', 'mana_stam', 'stam_hp'] as const) {
    const el = transmuteSlotEls[dir]
    const abilityId =
      dir === 'hp_mana'
        ? 'transfer_hp_mana'
        : dir === 'mana_stam'
          ? 'transfer_mana_stam'
          : 'transfer_stam_hp'
    const pip = cdPipEls.get(abilityId)
    const expiry = transmuteCdExpiry[dir] ?? 0
    const remaining = expiry - now
    if (remaining > 0) {
      el?.classList.remove('ready')
      el?.classList.add('cooling')
      const cdTextEl = el?.querySelector<HTMLElement>('.t-cd-text')
      if (cdTextEl) cdTextEl.textContent = `${(remaining / 1000).toFixed(1)}s`
      pip?.classList.remove('ready')
      pip?.classList.add('cooling')
      const timerEl = pip?.querySelector<HTMLElement>('.cd-timer')
      if (timerEl) timerEl.textContent = (remaining / 1000).toFixed(1)
    } else {
      el?.classList.remove('cooling')
      el?.classList.add('ready')
      const cdTextEl = el?.querySelector<HTMLElement>('.t-cd-text')
      if (cdTextEl) cdTextEl.textContent = ''
      if (pip?.classList.contains('transfer-pip')) {
        pip.classList.remove('cooling')
        pip.classList.add('ready')
        const timerEl = pip.querySelector<HTMLElement>('.cd-timer')
        if (timerEl) timerEl.textContent = ''
      }
    }
  }
}

function onZoneSpawned(msg: ServerZoneSpawnedMessage): void {
  if (zoneVisuals.has(msg.id)) return
  let mesh: THREE.Mesh
  if (msg.shape === 'wall' && msg.width > 0) {
    // A simple wall: a tall box centered on the placement point, oriented
    // along the caster's yaw. Length = width (designer's term), thickness
    // is fixed and visual only — server geometry uses a 0.6 m perp range.
    const geo = new THREE.BoxGeometry(msg.width, 1.6, 0.4)
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff6a32,
      emissive: 0x803010,
      transparent: true,
      opacity: 0.7,
      roughness: 0.5,
    })
    mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(msg.pos.x, msg.pos.y + 0.8, msg.pos.z)
    mesh.rotation.y = msg.yaw
  } else {
    // Circle zone — open cylinder + floor disc so the zone reads in 3D.
    const zColor = zoneColorForElement(msg.element)
    const cylinderGeo = new THREE.CylinderGeometry(msg.radius, msg.radius, 1.8, 28, 1, true)
    const cylinderMat = new THREE.MeshBasicMaterial({
      color: zColor, transparent: true, opacity: 0.28, side: THREE.DoubleSide,
    })
    mesh = new THREE.Mesh(cylinderGeo, cylinderMat)
    mesh.position.set(msg.pos.x, msg.pos.y + 0.9, msg.pos.z)
    scene.add(mesh)

    // Floor decal ring inside the cylinder — bolder colour.
    const floorGeo = new THREE.RingGeometry(Math.max(0.1, msg.radius - 0.18), msg.radius, 28)
    floorGeo.rotateX(-Math.PI / 2)
    const floorMat = new THREE.MeshBasicMaterial({ color: zColor, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
    const floorMesh = new THREE.Mesh(floorGeo, floorMat)
    floorMesh.position.set(msg.pos.x, msg.pos.y + 0.018, msg.pos.z)
    scene.add(floorMesh)
    zoneVisuals.set(msg.id, { mesh, extra: floorMesh })
    return
  }
  scene.add(mesh)
  zoneVisuals.set(msg.id, { mesh })
}

function onZoneExpired(msg: ServerZoneExpiredMessage): void {
  const vis = zoneVisuals.get(msg.id)
  if (!vis) return
  scene.remove(vis.mesh)
  vis.mesh.geometry.dispose()
  ;(vis.mesh.material as THREE.Material).dispose()
  if (vis.extra) {
    scene.remove(vis.extra)
    vis.extra.geometry.dispose()
    ;(vis.extra.material as THREE.Material).dispose()
  }
  zoneVisuals.delete(msg.id)
}

function zoneColorForElement(element: string): number {
  switch (element) {
    case 'fire':
      return 0xff6a32
    case 'ice':
      return 0x9adfff
    case 'lightning':
      return 0xfff066
    case 'dark':
      return 0x9060c0
    case 'nature':
      return 0x7adf6a
    default:
      return 0xc0c0c0
  }
}

function getPlayerWorldPos(sid: string): THREE.Vector3 | null {
  if (sid === self?.sessionId && selfMesh) {
    return selfMesh.position.clone().add(new THREE.Vector3(0, CAPSULE_HALF_HEIGHT_M, 0))
  }
  const r = remotePlayers.get(sid)
  if (r) return r.mesh.position.clone().add(new THREE.Vector3(0, CAPSULE_HALF_HEIGHT_M, 0))
  return null
}

// Element → popup accent colour (outbound hits only).
const ELEMENT_POPUP_COLOR: Record<string, string> = {
  fire:      '#ff8a4a',
  ice:       '#9adfff',
  lightning: '#ffe566',
  dark:      '#c890ff',
  nature:    '#aef090',
  steam:     '#ccddff',
}

function showDamagePopup(
  worldPos: THREE.Vector3,
  damage: number,
  inbound: boolean,
  parried: boolean,
  element?: string,
): void {
  const v = worldPos.clone().project(camera)
  const sx = (v.x * 0.5 + 0.5) * window.innerWidth
  const sy = (-v.y * 0.5 + 0.5) * window.innerHeight
  if (v.z > 1) return
  const el = document.createElement('span')
  const cls = ['popup']
  if (inbound) cls.push('inbound')
  if (parried) cls.push('parried')
  // Big-hit class: damage ≥ 40 outbound gets a larger, more dramatic popup.
  if (!inbound && !parried && damage >= 40) cls.push('big')
  el.className = cls.join(' ')
  const jitter = (Math.random() - 0.5) * 30
  el.style.left = `${sx + jitter}px`
  el.style.top = `${sy}px`
  // Elemental colour for outbound hits (attacker sees coloured numbers).
  if (!inbound && !parried && element && ELEMENT_POPUP_COLOR[element]) {
    el.style.color = ELEMENT_POPUP_COLOR[element]!
  }
  if (parried && damage === 0) {
    el.textContent = 'PARRY'
  } else if (parried) {
    el.textContent = `PARRY -${damage}`
  } else {
    el.textContent = String(damage)
  }
  popupsLayer.appendChild(el)
  setTimeout(() => el.remove(), 900)
}

// -----------------------------------------------------------------------
// Self init
// -----------------------------------------------------------------------

function initSelfIfNeeded(): void {
  if (self || !room) return
  const p = getSelfSchemaPlayer()
  if (!p) return
  const sim = makePlayerSimState({ x: p.transform.x, y: p.transform.y, z: p.transform.z })
  sim.vel.x = p.vx
  sim.vel.y = p.vy
  sim.vel.z = p.vz
  sim.onGround = p.onGround
  sim.stamina = p.stamina
  self = {
    sessionId: room.sessionId,
    sim,
    pending: [],
    lastPredictionDelta: 0,
    lastAckSeq: p.lastProcessedInputSeq,
    bowChargeStartMs: 0,
    bowChargeServerAcked: false,
  }
  selfMesh = makeCapsule(0x3a8fde) // self = blue (standard: I am blue)
  scene.add(selfMesh)
  selfArc = makeSwingArcMesh()
  scene.add(selfArc)
  mouseYaw = p.transform.yaw
}

// -----------------------------------------------------------------------
// State reading
// -----------------------------------------------------------------------

interface SchemaPlayer {
  id: string
  name: string
  team: string
  transform: { x: number; y: number; z: number; yaw: number; pitch: number }
  vx: number
  vy: number
  vz: number
  onGround: boolean
  hp: number
  mana: number
  stamina: number
  activeWeapon: string
  alive: boolean
  airborneUntilTick: number
  respawnAtTick: number
  comboIndex: number
  swingEndsAtTick: number
  lastSwingStartTick: number
  invulnUntilTick: number
  casting: boolean
  castAbilityId: string
  castEndsAtTick: number
  lastProcessedInputSeq: number
  bowChargeStartTick: number
  parrying: boolean
  parryIsHold: boolean
  parryTapEndsAtTick: number
  statuses: ReadonlyArray<{
    kind: string
    stacks: number
    remainingSec: number
    slowFractionOverride: number
  }>
  abilityCooldowns: Map<string, number>
  loadout: ReadonlyArray<string>
  masteryElement: string
  masteryLevel: number
  masteryTier: number
  gcdReadyAtTick: number
}

interface SchemaProjectile {
  id: string
  ownerId: string
  kind: string
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  expired: boolean
}

function getSchemaPlayers(): Map<string, SchemaPlayer> | null {
  if (!room?.state) return null
  const s = room.state as { players?: Map<string, SchemaPlayer> }
  return s.players ?? null
}

function getSchemaProjectiles(): Map<string, SchemaProjectile> | null {
  if (!room?.state) return null
  const s = room.state as { projectiles?: Map<string, SchemaProjectile> }
  return s.projectiles ?? null
}

function getSelfSchemaPlayer(): SchemaPlayer | null {
  if (!room) return null
  const players = getSchemaPlayers()
  return players?.get(room.sessionId) ?? null
}

function getSchemaTick(): number {
  if (!room?.state) return 0
  return (room.state as { tick?: number }).tick ?? 0
}

function getSchemaMapId(): string {
  if (!room?.state) return 'blockout'
  return (room.state as { mapId?: string }).mapId ?? 'blockout'
}

function aimPointForAbility(abilityId: string): { x: number; y: number; z: number } | undefined {
  const def = ABILITY_DEFS[abilityId]
  if (!def || def.targeting !== 'point') return undefined

  const selfPos = self?.sim.pos
  if (!selfPos) return undefined

  const map = getMap(activeMapId || getSchemaMapId())
  const groundY = map.groundY
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize()
  const point = new THREE.Vector3()

  if (Math.abs(dir.y) > 1e-5) {
    const t = (groundY - camera.position.y) / dir.y
    if (t > 0) point.copy(camera.position).addScaledVector(dir, t)
  }

  if (point.lengthSq() === 0) {
    point.set(
      selfPos.x - Math.sin(mouseYaw) * def.range,
      groundY,
      selfPos.z - Math.cos(mouseYaw) * def.range,
    )
  }

  const dx = point.x - selfPos.x
  const dz = point.z - selfPos.z
  const dist = Math.hypot(dx, dz)
  if (dist > def.range && dist > 1e-5) {
    const scale = def.range / dist
    point.x = selfPos.x + dx * scale
    point.z = selfPos.z + dz * scale
  }
  point.y = groundY
  return { x: point.x, y: point.y, z: point.z }
}

function previewPointForAbility(abilityId: string): { x: number; y: number; z: number } | undefined {
  const point = aimPointForAbility(abilityId)
  if (point) return point
  const def = ABILITY_DEFS[abilityId]
  const selfPos = self?.sim.pos
  if (!def || !selfPos) return undefined
  const map = getMap(activeMapId || getSchemaMapId())
  const dist = Math.max(1.5, Math.min(def.range || 6, 10))
  return {
    x: selfPos.x - Math.sin(mouseYaw) * dist,
    y: map.groundY,
    z: selfPos.z - Math.cos(mouseYaw) * dist,
  }
}

function sendAbilityCast(abilityId: string, tick: number): void {
  if (!room) return
  const msg: ClientCastMessage = {
    abilityId,
    atTick: tick,
    targetYaw: mouseYaw,
    targetPitch: mousePitch,
    targetPoint: aimPointForAbility(abilityId),
  }
  room.send(MessageTypes.Cast, msg)
  const pip = cdPipEls.get(abilityId)
  if (pip) {
    pip.classList.add('pending')
    setTimeout(() => pip.classList.remove('pending'), 400)
  }
  showShootFlash()
}

function beginPlacementPreview(abilityId: string): void {
  const def = ABILITY_DEFS[abilityId]
  if (!def) return
  placementAbilityId = abilityId
  abilityCastQueue.length = 0
}

function cancelPlacementPreview(): void {
  placementAbilityId = null
  placementPreviewGroup.visible = false
}

function placementFootprint(abilityId: string): { radius: number; width: number; depth: number; wall: boolean } {
  const def = ABILITY_DEFS[abilityId]
  let radius = 0.85
  let width = 0
  let depth = 0
  let wall = false
  if (!def) return { radius, width, depth, wall }

  for (const e of def.effects) {
    if (e.kind === 'zone') {
      if (e.width && e.width > 0) {
        wall = true
        width = Math.max(width, e.width)
        depth = Math.max(depth, Math.max(0.55, e.radius || 0.8))
      } else {
        radius = Math.max(radius, e.radius)
      }
    } else if (e.kind === 'damage') {
      radius = Math.max(radius, e.radius ?? 0)
    } else if (e.kind === 'projectile') {
      radius = Math.max(radius, e.splashRadius ?? 0)
    } else if (e.kind === 'knockup') {
      radius = Math.max(radius, e.radius ?? 0)
    } else if (e.kind === 'applyStatus') {
      radius = Math.max(radius, e.radius ?? 0)
    }
  }
  return { radius: Math.max(0.65, radius), width, depth, wall }
}

function updatePlacementPreview(now: number): void {
  if (!placementAbilityId || !self) {
    placementPreviewGroup.visible = false
    return
  }
  const def = ABILITY_DEFS[placementAbilityId]
  const point = previewPointForAbility(placementAbilityId)
  if (!def || !point) {
    placementPreviewGroup.visible = false
    return
  }
  const footprint = placementFootprint(placementAbilityId)
  const pulse = 0.5 + 0.5 * Math.sin(now * 0.008)
  placementPreviewGroup.visible = true
  placementPreviewGroup.position.set(point.x, point.y + 0.035, point.z)
  placementPreviewGroup.rotation.y = mouseYaw
  placementDisc.visible = !footprint.wall
  placementRing.visible = !footprint.wall
  placementWall.visible = footprint.wall
  if (footprint.wall) {
    placementWall.scale.set(footprint.width, footprint.depth, 1)
    ;(placementWall.material as THREE.MeshBasicMaterial).opacity = 0.32 + pulse * 0.14
  } else {
    placementDisc.scale.setScalar(footprint.radius)
    placementRing.scale.setScalar(footprint.radius)
    placementDiscMat.opacity = 0.18 + pulse * 0.10
    placementRingMat.opacity = 0.72 + pulse * 0.22
  }
  const attr = placementLineGeom.attributes['position'] as THREE.BufferAttribute
  attr.setXYZ(0, self.sim.pos.x, point.y + 0.08, self.sim.pos.z)
  attr.setXYZ(1, point.x, point.y + 0.08, point.z)
  attr.needsUpdate = true
}

// -----------------------------------------------------------------------
// Sim loop — 60 Hz
// -----------------------------------------------------------------------

const DT = TICK_MS / 1000
let seqCounter = 0
let heartbeatAccum = 0

function simStep(): void {
  initSelfIfNeeded()
  if (!self || !room) return

  const selfSchema = getSelfSchemaPlayer()
  const schemaTick = getSchemaTick()
  const airborne = !!selfSchema && selfSchema.airborneUntilTick > schemaTick
  const dead = !!selfSchema && !selfSchema.alive
  if ((dead || airborne) && placementAbilityId) cancelPlacementPreview()
  if (optimisticWeapon && selfSchema?.activeWeapon === optimisticWeapon) optimisticWeapon = null
  const activeWeapon: Weapon = currentWeaponForInput()
  const combatLive = currentMatchPhase === 'live'
  if (!combatLive) {
    abilityCastQueue.length = 0
    primedSlotIdx = null
    if (placementAbilityId) cancelPlacementPreview()
    if (self.bowChargeStartMs > 0) {
      self.bowChargeStartMs = 0
      self.bowChargeServerAcked = false
    }
  }

  // Sync bow-charge state with server authority. A just-started local draw must
  // survive normal schema RTT: bowChargeStartTick can still be 0 for a few
  // frames after ChargeStart. Once schema has acknowledged the draw, a later 0
  // means the server cancelled it (damage, swap, parry, etc.) and local HUD /
  // release state should be cleared.
  if (selfSchema && selfSchema.bowChargeStartTick > 0) {
    self.bowChargeServerAcked = true
  } else if (self.bowChargeStartMs > 0 && self.bowChargeServerAcked) {
    self.bowChargeStartMs = 0
    self.bowChargeServerAcked = false
  }

  seqCounter += 1
  const input = sampleInput(airborne, dead)

  // Build movement caps from the last-known server status state. The schema
  // lags by ~RTT/2 but this is still far more accurate than ignoring caps
  // entirely — root/stun prediction matches the server within one round-trip.
  const statusList = selfSchema
    ? Array.from(selfSchema.statuses).map((s) => ({
        kind: s.kind as StatusKind,
        stacks: s.stacks,
        remainingSec: s.remainingSec,
        slowFractionOverride: s.slowFractionOverride > 0 ? s.slowFractionOverride : undefined,
      }))
    : []
  const capsFromStatus = movementCapsFromStatuses(statusList)
  const caps: MovementCaps = {
    slowFraction: capsFromStatus.slowFraction,
    movementLocked: capsFromStatus.movementLocked,
    castLocked: capsFromStatus.castLocked,
    airborneLocked: airborne,
  }

  // Jump sound — fire exactly once per jump edge (not every tick).
  if (input.jump) soundEngine.playJump()

  simulatePlayer(self.sim, input, DT, getMap(activeMapId || 'blockout'), caps)

  self.pending.push({ seq: seqCounter, input, dt: DT, caps })
  if (self.pending.length > 240) self.pending.splice(0, self.pending.length - 240)

  // --- Weapon swap (tick-aligned) -----------------------------------------
  if (weaponSwapRequest && combatLive && !dead) {
    const msg: ClientWeaponSwapMessage = {
      weapon: weaponSwapRequest,
      atTick: schemaTick + 1,
    }
    room.send(MessageTypes.WeaponSwap, msg)
    optimisticWeapon = weaponSwapRequest
    // If we swapped away from bow mid-charge, close the local HUD draw so
    // the bar disappears immediately.
    if (weaponSwapRequest !== 'bow') {
      self.bowChargeStartMs = 0
      self.bowChargeServerAcked = false
    }
  }
  weaponSwapRequest = null

  // --- Primed ability fire -------------------------------------------------
  // Radial wheels are palettes: Q/E only select a slot. The next LMB press
  // fires that primed ability with the current crosshair and suppresses the
  // weapon's normal LMB action for this click.
  if (combatLive && lmbPressEdge && placementAbilityId && !dead && !airborne) {
    sendAbilityCast(placementAbilityId, schemaTick + 1)
    cancelPlacementPreview()
    lmbPressEdge = false
    lmbDown = false
  }

  if (combatLive && lmbPressEdge && primedSlotIdx !== null && !dead && !airborne) {
    const loadout = currentLoadoutArray()
    const id = loadout[primedSlotIdx] ?? ''
    primedSlotIdx = null
    if (id) {
      if (loadoutStation.isInstantCast(id)) sendAbilityCast(id, schemaTick + 1)
      else beginPlacementPreview(id)
    }
    lmbPressEdge = false
    lmbDown = false
  }

  // --- LMB behaviour by weapon --------------------------------------------
  // Bow charge release is allowed even while airborne (design: bow can fire mid-air).
  // Only dead players cannot act.
  if (combatLive && !dead && activeWeapon === 'bow') {
    if (lmbPressEdge) {
      const msg: ClientChargeStartMessage = { atTick: schemaTick + 1 }
      room.send(MessageTypes.ChargeStart, msg)
      self.bowChargeStartMs = performance.now()
      self.bowChargeServerAcked = false
    }
    // Release is always sent regardless of airborne state.
    if (lmbReleaseEdge && self.bowChargeStartMs > 0) {
      const msg: ClientChargeReleaseMessage = {
        atTick: schemaTick + 1,
        yaw: mouseYaw,
        pitch: mousePitch,
      }
      room.send(MessageTypes.ChargeRelease, msg)
      self.bowChargeStartMs = 0
      self.bowChargeServerAcked = false
      showShootFlash()
    }
  }

  if (combatLive && !dead && !airborne) {
    if (activeWeapon === 'sword') {
      if (lmbPressEdge) {
        // Swing yaw: use mouseYaw directly — it is the horizontal facing direction
        // and equals the forward direction of both the character mesh and the server
        // hit cone. Deriving from camera.quaternion in TPS mode gave incorrect pitch
        // contamination when the camera orbited at an angle.
        const msg: ClientSwingMessage = { atTick: schemaTick + 1, yaw: mouseYaw }
        room.send(MessageTypes.Swing, msg)
        showShootFlash()
      }
    } else if (activeWeapon === 'staff') {
      const now = performance.now()
      const canFire = now - lastStaffFireMs >= STAFF_FIRE_THROTTLE_MS
      if ((lmbPressEdge || (lmbDown && canFire)) && canFire) {
        const msg: ClientFireStaffMessage = {
          atTick: schemaTick + 1,
          yaw: mouseYaw,
          pitch: mousePitch,
        }
        room.send(MessageTypes.FireStaff, msg)
        lastStaffFireMs = now
        showShootFlash()
      }
    }
  } else if (dead) {
    // Dead: drop any bow HUD charge.
    if (self.bowChargeStartMs > 0) {
      self.bowChargeStartMs = 0
      self.bowChargeServerAcked = false
    }
  }

  // --- Parry (RMB) --------------------------------------------------------
  if (combatLive && rmbPressEdge && placementAbilityId) {
    cancelPlacementPreview()
    rmbPressEdge = false
    rmbReleaseEdge = false
  }

  if (combatLive && !dead && !airborne) {
    if (rmbPressEdge) {
      const msg: ClientParryPressMessage = { atTick: schemaTick + 1 }
      room.send(MessageTypes.ParryPress, msg)
    }
    if (rmbReleaseEdge) {
      const msg: ClientParryReleaseMessage = { atTick: schemaTick + 1 }
      room.send(MessageTypes.ParryRelease, msg)
    }
  }

  // --- Drain queued ability casts (one per tick, max 2 queued).
  // Capping to 1/tick prevents macro-spam; cap 2 lets a "queue next cast"
  // feel responsive during short windups (standard arena-game practice).
  // Airborne here means knockup/launch lock, not a normal jump. A launched
  // player cannot activate abilities; clear queued attempts so they do not
  // fire late after landing.
  if (airborne || !combatLive) abilityCastQueue.length = 0
  if (abilityCastQueue.length > 0 && combatLive && !dead && !airborne) {
    const id = abilityCastQueue.shift()!
    sendAbilityCast(id, schemaTick + 1)
  }
  // Hard cap: discard oldest if more than 2 are queued (lag buildup).
  while (abilityCastQueue.length > 2) abilityCastQueue.shift()

  // Clear per-tick edges.
  lmbPressEdge = false
  lmbReleaseEdge = false
  rmbPressEdge = false
  rmbReleaseEdge = false

  // --- Input message ------------------------------------------------------
  const inMsg: ClientInputMessage = {
    tick: schemaTick + 1,
    seq: seqCounter,
    moveX: input.moveX,
    moveZ: input.moveZ,
    yaw: input.yaw,
    pitch: mousePitch,
    jump: input.jump,
    jumpHold: input.jumpHold,
    m1: false,
    m2: false,
  }
  room.send(MessageTypes.Input, inMsg)

  reconcileSelf()

  // Remote snapshot capture + swing VFX trigger.
  const now = performance.now()
  const players = getSchemaPlayers()
  if (players) {
    players.forEach((p, sid) => {
      if (sid === self?.sessionId) {
        if (selfArc && p.lastSwingStartTick > 0 && p.lastSwingStartTick !== cachedSelfSwingTick) {
          cachedSelfSwingTick = p.lastSwingStartTick
          selfArc.visible = true
          selfArcExpiresAt = now + 400
        }
        return
      }
      let r = remotePlayers.get(sid)
      if (!r) {
        const mesh = makeCapsule(0xe04a4a) // enemy = red
        scene.add(mesh)
        const arc = makeSwingArcMesh()
        scene.add(arc)
        const castRing = makeCastRing()
        scene.add(castRing)
        const nameplate = document.createElement('div')
        nameplate.style.cssText = [
          'position:absolute',
          'transform:translate(-50%,-100%)',
          'text-align:center',
          'pointer-events:none',
          'padding:4px 8px 5px',
          'background:rgba(8,10,18,0.72)',
          'border:1px solid rgba(255,255,255,0.10)',
          'border-radius:6px',
          'backdrop-filter:blur(2px)',
        ].join(';')
        const nameLabel = document.createElement('div')
        nameLabel.textContent = p.name || `#${sid.slice(0, 4)}`
        nameLabel.style.cssText = [
          'color:#ffb0b0',
          'font:700 12px/1 ui-monospace,monospace',
          'text-shadow:0 1px 4px #000,0 0 6px rgba(255,60,60,0.5)',
          'margin-bottom:4px',
          'letter-spacing:0.06em',
          'white-space:nowrap',
        ].join(';')
        const barRow = document.createElement('div')
        barRow.style.cssText = 'display:flex;align-items:center;gap:5px'
        const barBg = document.createElement('div')
        barBg.style.cssText = [
          'width:80px',
          'height:7px',
          'background:rgba(0,0,0,0.75)',
          'border-radius:4px',
          'overflow:hidden',
          'border:1px solid rgba(255,255,255,0.12)',
          'flex-shrink:0',
        ].join(';')
        const hpFill = document.createElement('div')
        hpFill.style.cssText = [
          'height:100%',
          'width:100%',
          'background:linear-gradient(90deg,#c82020,#f04040,#ff7070)',
          'transition:width 0.12s linear,background 0.25s',
          'border-radius:4px',
        ].join(';')
        barBg.appendChild(hpFill)
        barRow.appendChild(barBg)
        nameplate.appendChild(nameLabel)
        nameplate.appendChild(barRow)
        nameplateContainer.appendChild(nameplate)
        r = {
          mesh, snapshots: [], arc, arcExpiresAt: 0, lastSwingStartTick: 0,
          castRing, nameplate, hpFill, hp: HP_MAX, alive: true, lastWeapon: '',
        }
        remotePlayers.set(sid, r)
      }
      r.hp = p.hp
      // When a player respawns (alive flips false → true), clear stale
      // snapshots so they don't teleport from their death position to spawn.
      if (!r.alive && p.alive) {
        r.snapshots.length = 0
      }
      r.alive = p.alive
      // Update weapon prop if it changed.
      const remoteWeapon = isWeapon(p.activeWeapon) ? p.activeWeapon : 'sword'
      if (r.lastWeapon !== remoteWeapon) {
        r.lastWeapon = remoteWeapon
        applyWeaponProp(r.mesh, remoteWeapon)
      }
      r.snapshots.push({
        at: now,
        x: p.transform.x,
        y: p.transform.y,
        z: p.transform.z,
        yaw: p.transform.yaw,
      })
      if (r.snapshots.length > 60) r.snapshots.shift()

      if (p.lastSwingStartTick > 0 && p.lastSwingStartTick !== r.lastSwingStartTick) {
        r.lastSwingStartTick = p.lastSwingStartTick
        r.arc.visible = true
        r.arcExpiresAt = now + 400
      }
      // Cast ring follows the player; visibility driven by schema.casting.
      r.castRing.visible = !!p.casting && p.castEndsAtTick > schemaTick
    })
    remotePlayers.forEach((r, sid) => {
      if (!players.has(sid)) {
        scene.remove(r.mesh)
        // Capsule is a Group — traverse to dispose every child mesh.
        r.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose()
            if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose())
            else (child.material as THREE.Material).dispose()
          }
        })
        scene.remove(r.arc)
        r.arc.geometry.dispose()
        ;(r.arc.material as THREE.Material).dispose()
        scene.remove(r.castRing)
        r.castRing.geometry.dispose()
        ;(r.castRing.material as THREE.Material).dispose()
        r.nameplate.remove()
        remotePlayers.delete(sid)
      }
    })
  }

  heartbeatAccum += TICK_MS
  if (heartbeatAccum >= 500) {
    heartbeatAccum = 0
    room.send(MessageTypes.Heartbeat, { clientTime: performance.now() })
  }
}

let cachedSelfSwingTick = 0

function reconcileSelf(): void {
  if (!self) return
  const p = getSelfSchemaPlayer()
  if (!p) return

  const ackSeq = p.lastProcessedInputSeq
  if (ackSeq <= self.lastAckSeq) return

  // Drop all inputs the server has already processed — only replay the ones
  // that are still "in flight" (seq > ackSeq). Without this, every reconcile
  // re-applies hundreds of stale inputs on top of the server position, causing
  // the predicted position to diverge wildly (the teleport / desync bug).
  let droppedInputs = 0
  while (self.pending.length > 0 && self.pending[0]!.seq <= ackSeq) {
    self.pending.shift()
    droppedInputs++
  }
  void droppedInputs // used only for debug if needed

  const serverState: PlayerSimState = {
    pos: { x: p.transform.x, y: p.transform.y, z: p.transform.z },
    vel: { x: p.vx, y: p.vy, z: p.vz },
    onGround: p.onGround,
    jumpHoldTicksLeft: 0,
    stamina: p.stamina,
    coyoteTicksLeft: 0,
    // Momentum is not replicated — reset to 0 on reconcile. The bonus
    // re-accrues after ~0.5 s of continued input, imperceptible in play.
    momentumTicks: 0,
  }

  const predictedBefore = { x: self.sim.pos.x, y: self.sim.pos.y, z: self.sim.pos.z }
  self.sim = serverState
  // Replay only the unacknowledged in-flight inputs, each with the caps that
  // were active at send time so root/slow/stun match the server's computation.
  for (const e of self.pending) simulatePlayer(self.sim, e.input, e.dt, getMap(activeMapId || 'blockout'), e.caps)

  const dx = self.sim.pos.x - predictedBefore.x
  const dy = self.sim.pos.y - predictedBefore.y
  const dz = self.sim.pos.z - predictedBefore.z
  self.lastPredictionDelta = Math.hypot(dx, dy, dz)
  self.lastAckSeq = ackSeq
}

const simTimer = setInterval(simStep, TICK_MS)

// -----------------------------------------------------------------------
// Render loop
// -----------------------------------------------------------------------

let lastFrame = performance.now()
let frameCount = 0
let fpsAccum = 0

function render(now: number): void {
  const dt = (now - lastFrame) / 1000
  lastFrame = now
  frameCount += 1
  fpsAccum += dt
  if (fpsAccum >= 0.5) {
    dbgFps.textContent = (frameCount / fpsAccum).toFixed(0)
    fpsAccum = 0
    frameCount = 0
  }

  // Swap map geometry when the server schema reports a different mapId.
  loadMapGeometry(getSchemaMapId())
  updatePlacementPreview(now)

  // Arena ring slow pulse — opacity and slight colour shift for dramatic boundary.
  const ringPulse = 0.5 + 0.5 * Math.sin(now * 0.001)
  const arenaRingMat = arenaRing.material as THREE.MeshBasicMaterial
  arenaRingMat.opacity = 0.32 + ringPulse * 0.40
  // Shift from deep red at low pulse to orange-red at peak.
  arenaRingMat.color.setRGB(1.0, 0.12 + ringPulse * 0.18, 0.03 + ringPulse * 0.08)
  // Halo ring pulses slightly out-of-phase for a breathing "danger zone" feel.
  const haloPulse = 0.5 + 0.5 * Math.sin(now * 0.001 + 1.2)
  arenaRingHaloMat.opacity = 0.08 + haloPulse * 0.16

  // Hit-stop flag — particle animation and camera lerp are frozen during it.
  // Covers both attacker-side (landed a hit) and victim-side (received a hit).
  const inHitStop = now < hitStopUntilMs || now < victimHitStopUntilMs
  // Brief exposure boost during hit-stop for impactful "crunch" feel.
  const targetExposure = inHitStop ? 1.45 : 1.1
  renderer.toneMappingExposure += (targetExposure - renderer.toneMappingExposure) * 0.28

  // Animate ambient particles — skip during hit-stop for "weight" feel.
  if (!inHitStop) {
    const pAttr = ambientParticles.geometry.attributes['position'] as THREE.BufferAttribute
    const pArr = pAttr.array as Float32Array
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i0 = i * 3
      const i1 = i0 + 1
      const i2 = i0 + 2
      pArr[i0] = (pArr[i0] ?? 0) + (particleVels[i0] ?? 0)
      pArr[i1] = (pArr[i1] ?? 0) + (particleVels[i1] ?? 0)
      pArr[i2] = (pArr[i2] ?? 0) + (particleVels[i2] ?? 0)
      if ((pArr[i1] ?? 0) > 18) {
        pArr[i1] = 0
        pArr[i0] = (Math.random() - 0.5) * 56
        pArr[i2] = (Math.random() - 0.5) * 56
      }
    }
    ;(ambientParticles.geometry.attributes['position'] as THREE.BufferAttribute).needsUpdate = true

    // ── Torch flicker — organic multi-frequency modulation ───────────────
    for (let i = 0; i < torchLights.length; i++) {
      const t = torchLights[i]!
      const f = 0.44 + 0.30 * Math.sin(now * 0.0024 + i * 1.57)
              + 0.14 * Math.sin(now * 0.0097 + i * 0.82)
              + 0.06 * Math.sin(now * 0.0213 + i * 2.10)
      t.intensity = Math.max(0.08, f)
    }

    // ── Magic dust particles — swirl and drift upward ────────────────────
    const mAttr = magicParticles.geometry.attributes['position'] as THREE.BufferAttribute
    const mArr = mAttr.array as Float32Array
    for (let i = 0; i < MAGIC_COUNT; i++) {
      const i0 = i * 3, i1 = i0 + 1, i2 = i0 + 2
      mArr[i0] = (mArr[i0] ?? 0) + (magicVels[i0] ?? 0)
      mArr[i1] = (mArr[i1] ?? 0) + (magicVels[i1] ?? 0)
      mArr[i2] = (mArr[i2] ?? 0) + (magicVels[i2] ?? 0)
      if ((mArr[i1] ?? 0) > 22) {
        const r2 = 8 + Math.random() * 28, a2 = Math.random() * Math.PI * 2
        mArr[i0] = Math.cos(a2) * r2; mArr[i1] = 0; mArr[i2] = Math.sin(a2) * r2
      }
    }
    ;(magicParticles.geometry.attributes['position'] as THREE.BufferAttribute).needsUpdate = true

    // ── Combat floor crest — very slow clockwise drift ───────────────────
    floorCrestGroup.rotation.y += 0.00012 * dt

    // ── Centre glow pulse — gentle sine breath ────────────────────────────
    centreGlowMat.opacity = 0.12 + 0.10 * Math.sin(now * 0.0012)
  }

  const selfSchema = getSelfSchemaPlayer()
  const tickNow = getSchemaTick()
  const airborne = !!selfSchema && selfSchema.airborneUntilTick > tickNow
  const dead = !!selfSchema && !selfSchema.alive

  // Bow charge ratio — computed here (outer scope) so both the camera FOV
  // zoom and the charge HUD bar can consume it without duplicating the math.
  let bowChargeRatio = 0
  if (self && self.bowChargeStartMs > 0) {
    const wSchemaOuter = selfSchema && isWeapon(selfSchema.activeWeapon) ? selfSchema.activeWeapon : 'sword'
    if (wSchemaOuter === 'bow') {
      const elapsed = (now - self.bowChargeStartMs) / 1000
      bowChargeRatio = elapsed <= BOW_CHARGE_MIN_SEC
        ? 0
        : Math.min(1, (elapsed - BOW_CHARGE_MIN_SEC) / (BOW_CHARGE_FULL_SEC - BOW_CHARGE_MIN_SEC))
    }
  }

  // Self render.
  if (self && selfMesh) {
    // Hide own capsule when dead (you see the respawn overlay instead) and
    // when the camera is very close so you never clip through your own head.
    selfMesh.visible = !dead

    let x = self.sim.pos.x
    let y = self.sim.pos.y
    let z = self.sim.pos.z
    if ((dead || airborne) && selfSchema) {
      x = selfSchema.transform.x
      y = selfSchema.transform.y
      z = selfSchema.transform.z
    }
    // Idle breathing bob — tiny vertical sine when grounded, skipped airborne.
    const idleBob = (!airborne && !dead) ? Math.sin(now * 0.0028) * 0.014 : 0
    selfMesh.position.set(x, y + idleBob, z)
    selfMesh.rotation.y = mouseYaw
    // Follow-light tracks the player's torso level.
    playerLight.position.set(x, y + 0.5 + idleBob, z)

    // Per-weapon camera:
    // Keep every weapon in the same over-shoulder camera family. Earlier builds
    // blended bow/staff into first-person, which made auto-swaps from spells
    // feel like the view dipped toward the floor.
    const wSchema = selfSchema && isWeapon(selfSchema.activeWeapon) ? selfSchema.activeWeapon : 'sword'
    // Update weapon prop if weapon changed.
    if (wSchema !== selfLastWeapon) {
      selfLastWeapon = wSchema
      applyWeaponProp(selfMesh, wSchema)
    }
    const wBackTarget = wSchema === 'bow' ? 4.45 : wSchema === 'staff' ? 4.9 : 5.5
    const wUpTarget   = wSchema === 'bow' ? 1.45 : wSchema === 'staff' ? 1.4 : 1.3

    // Bow: very slight FOV narrow when charged — tactile draw-back feel.
    const wFovTarget = wSchema === 'bow'
      ? settingsFovBase - 5 - bowChargeRatio * 4
      : settingsFovBase
    const CAM_LERP = inHitStop ? 0 : 0.12
    camBack    += (wBackTarget - camBack)    * CAM_LERP
    camUp      += (wUpTarget   - camUp)      * CAM_LERP
    camFovBase += (wFovTarget  - camFovBase) * CAM_LERP

    selfMesh.visible = !dead

    // Stable third-person orbit. Yaw controls the shoulder/back position; pitch
    // controls only the look target. This avoids the old "camera dives down"
    // feeling when pitch was also rotating the camera's height offset.
    const back = new THREE.Vector3(Math.sin(mouseYaw) * camBack, 0, Math.cos(mouseYaw) * camBack)
    camera.position.set(x + back.x, y + camUp, z + back.z)

    // Clamp camera above ground so it never clips underground.
    const groundFloor = getMap(activeMapId || 'blockout').groundY
    if (camera.position.y < groundFloor + 0.4) camera.position.y = groundFloor + 0.4

    const aimForward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(mousePitch, mouseYaw, 0, 'YXZ'))
    const lookDistance = wSchema === 'bow' ? 18 : wSchema === 'staff' ? 15 : 10
    const lookY = y + CAPSULE_HALF_HEIGHT_M * 0.85
    camera.lookAt(
      x + aimForward.x * lookDistance,
      lookY + aimForward.y * lookDistance,
      z + aimForward.z * lookDistance,
    )

    // --- Directional shake — apply current offset to camera, then decay. ---
    if (shakeDecay > 0.001) {
      camera.position.add(shakeOffset)
      const decayed = Math.max(0, shakeDecay - SHAKE_DECAY_RATE * dt)
      const scale = shakeDecay > 0 ? decayed / shakeDecay : 0
      shakeOffset.multiplyScalar(scale)
      shakeDecay = decayed
    } else {
      shakeDecay = 0
      shakeOffset.set(0, 0, 0)
    }

    // FOV speed pulse — widens slightly when sprinting for kinetic feel.
    // Also narrows slightly during hit-stop for a "crunch" effect.
    const horizSpeed = Math.hypot(self.sim.vel.x, self.sim.vel.z)
    const hitStopFovNarrow = inHitStop ? -3 : 0
    const targetFov = camFovBase + Math.min(horizSpeed * 1.4, 6) + hitStopFovNarrow
    camera.fov += (targetFov - camera.fov) * (inHitStop ? 0.35 : 0.08)
    camera.updateProjectionMatrix()

    // Weapon-specific crosshair — drives CSS via data attribute.
    crosshairEl.dataset['weapon'] = wSchema

    if (selfArc) {
      if (selfArc.visible && now < selfArcExpiresAt) {
        const life = 1 - (selfArcExpiresAt - now) / 400
        selfArc.position.set(x, y, z)
        // SWING_ARC_YAW_OFFSET = π/2 + halfConeAngle centres the TorusGeometry
        // arc on the player's forward direction (−sin(yaw), 0, −cos(yaw)).
        // Derivation: arc centre at thetaLength/2 in local XY → after
        // rotation.set(PI/2, ry, 'YXZ') lands at (cos(ry−half), 0, −sin(ry−half)).
        // ry = yaw + π/2 + half makes that equal to forward. ✓
        selfArc.rotation.set(Math.PI / 2, mouseYaw + SWING_ARC_YAW_OFFSET, 0, 'YXZ')
        ;(selfArc.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - life)
      } else {
        selfArc.visible = false
      }
    }
  }

  // Remote players — interpolated render.
  const renderAt = now - INTERPOLATION_DELAY_MS
  remotePlayers.forEach((r) => {
    // Hide dead players entirely — no capsule, no nameplate.
    if (!r.alive) {
      r.mesh.visible = false
      r.arc.visible = false
      r.castRing.visible = false
      r.nameplate.style.display = 'none'
      return
    }
    r.mesh.visible = true

    const snaps = r.snapshots
    if (snaps.length === 0) return
    let a = snaps[0]!
    let b = snaps[snaps.length - 1]!
    for (let i = 0; i < snaps.length - 1; i++) {
      const s1 = snaps[i]!
      const s2 = snaps[i + 1]!
      if (s1.at <= renderAt && s2.at >= renderAt) {
        a = s1
        b = s2
        break
      }
    }
    const span = b.at - a.at
    const t = span <= 0 ? 1 : Math.max(0, Math.min(1, (renderAt - a.at) / span))
    const x = a.x + (b.x - a.x) * t
    const y = a.y + (b.y - a.y) * t
    const z = a.z + (b.z - a.z) * t
    // Idle breathing bob — unique phase per player via mesh.id (golden ratio).
    const rIdleBob = Math.sin(now * 0.0028 + r.mesh.id * 0.618) * 0.014
    r.mesh.position.set(x, y + rIdleBob, z)
    let dyaw = b.yaw - a.yaw
    if (dyaw > Math.PI) dyaw -= 2 * Math.PI
    if (dyaw < -Math.PI) dyaw += 2 * Math.PI
    const yawNow = a.yaw + dyaw * t
    r.mesh.rotation.y = yawNow

    if (r.arc.visible && now < r.arcExpiresAt) {
      const life = 1 - (r.arcExpiresAt - now) / 400
      r.arc.position.set(x, y, z)
      r.arc.rotation.set(Math.PI / 2, yawNow + SWING_ARC_YAW_OFFSET, 0, 'YXZ')
      ;(r.arc.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - life)
    } else {
      r.arc.visible = false
    }
    // Cast ring hovers above the capsule head when casting.
    if (r.castRing.visible) {
      r.castRing.position.set(x, y + CAPSULE_HEIGHT_M + 0.1, z)
    }

    // Nameplate — project head position to screen coords.
    const npWorld = new THREE.Vector3(x, y + CAPSULE_HEIGHT_M + 0.4, z)
    npWorld.project(camera)
    if (npWorld.z <= 1) {
      const sx = (npWorld.x * 0.5 + 0.5) * renderer.domElement.clientWidth
      const sy = (-npWorld.y * 0.5 + 0.5) * renderer.domElement.clientHeight
      r.nameplate.style.left = `${sx}px`
      r.nameplate.style.top = `${sy}px`
      r.nameplate.style.display = ''
      const pct = Math.max(0, Math.min(1, r.hp / HP_MAX))
      r.hpFill.style.width = `${pct * 100}%`
      if (pct > 0.55) {
        r.hpFill.style.background = 'linear-gradient(90deg,#1a8a3a,#2ec850,#70f090)'
        r.nameplate.style.boxShadow = ''
      } else if (pct > 0.28) {
        r.hpFill.style.background = 'linear-gradient(90deg,#a87010,#d4a020,#f0c840)'
        r.nameplate.style.boxShadow = ''
      } else {
        r.hpFill.style.background = 'linear-gradient(90deg,#c82020,#f04040,#ff7070)'
        // Low-HP nameplate gets a pulsing red glow to draw attention.
        const pulse = 0.5 + 0.5 * Math.sin(now * 0.007)
        const gAlpha = (0.25 + pulse * 0.35).toFixed(2)
        r.nameplate.style.boxShadow = `0 0 ${10 + pulse * 14}px rgba(220,30,30,${gAlpha}), 0 2px 12px rgba(0,0,0,0.6)`
      }
    } else {
      r.nameplate.style.display = 'none'
    }
  })

  // Projectiles — read schema map; snap mesh to replicated (x,y,z) and orient
  // arrows along their velocity. Any visual whose id isn't in the schema map
  // is cleaned up (covers disconnect / state resets).
  const proj = getSchemaProjectiles()
  if (proj) {
    proj.forEach((p, id) => {
      let vis = projectileVisuals.get(id)
      if (!vis) {
        const kind: 'arrow' | 'bolt' = p.kind === 'bolt' ? 'bolt' : 'arrow'
        const mesh = makeProjectileMesh(kind)
        mesh.position.set(p.x, p.y, p.z)
        scene.add(mesh)
        vis = {
          mesh,
          lastPos: new THREE.Vector3(p.x, p.y, p.z),
          lastAt: now,
          kind,
        }
        projectileVisuals.set(id, vis)
      }
      vis.mesh.position.set(p.x, p.y, p.z)
      const sp = Math.hypot(p.vx, p.vy, p.vz)
      if (vis.kind === 'arrow' && sp > 0.01) {
        // Aim the cylinder along the velocity. Cylinder axis is +Z after
        // rotateX in factory; lookAt(x,y,z) makes local +Z face the target.
        // Pass scalars directly to avoid allocating a Vector3 per frame.
        vis.mesh.lookAt(p.x + p.vx, p.y + p.vy, p.z + p.vz)
      } else if (vis.kind === 'bolt') {
        // Pulse emissive intensity for a living magic-bolt feel.
        const boltMat = vis.mesh.material as THREE.MeshStandardMaterial
        boltMat.emissiveIntensity = 5.0 + 2.0 * Math.sin(now * 0.018 + p.x * 0.5)
        vis.mesh.rotation.y += 0.06
        vis.mesh.scale.setScalar(1.0 + 0.08 * Math.sin(now * 0.022))
      }
      vis.lastPos.set(p.x, p.y, p.z)
      vis.lastAt = now
    })
    // Drop meshes for ids no longer present (state snapshot / reset).
    projectileVisuals.forEach((vis, id) => {
      if (!proj.has(id)) {
        scene.remove(vis.mesh)
        vis.mesh.geometry.dispose()
        ;(vis.mesh.material as THREE.Material).dispose()
        projectileVisuals.delete(id)
      }
    })
  }
  dbgProj.textContent = String(projectileVisuals.size)

  impactVfx.update(now)

  // HUD + debug.
  dbgTick.textContent = String(tickNow)
  const players = getSchemaPlayers()
  dbgPlayers.textContent = String(players?.size ?? 0)
  dbgPing.textContent = ping > 0 ? ping.toFixed(0) : '-'
  // Persistent ping HUD (always-visible coloured indicator)
  if (ping > 0) {
    pingValEl.textContent = ping.toFixed(0)
    pingHud.className = ping < 60 ? 'ingame good' : ping < 120 ? 'ingame ok' : 'ingame bad'
  }
  if (self) {
    dbgPred.textContent = self.lastPredictionDelta.toFixed(3)
    dbgGround.textContent = self.sim.onGround ? 'yes' : 'no'
    dbgGround.style.color = self.sim.onGround ? '#9be39b' : '#e4c05a'
    dbgSeq.textContent = String(seqCounter)
  }

  // Weapon wheel highlight + debug.
  if (optimisticWeapon && selfSchema?.activeWeapon === optimisticWeapon) optimisticWeapon = null
  const activeWeapon: Weapon = currentWeaponForInput()
  dbgWeapon.textContent = activeWeapon
  for (const w of WEAPON_IDS) {
    weaponSlots[w].classList.toggle('active', w === activeWeapon)
  }

  // Bow charge bar — driven by local press time so it starts immediately on
  // LMB down, then validated against schema (server cancels on damage).
  const serverCharging = !!selfSchema && selfSchema.bowChargeStartTick > 0
  if (self && self.bowChargeStartMs > 0 && activeWeapon === 'bow' && !dead) {
    const ratio = bowChargeRatio // pre-computed in outer scope
    bowCharge.classList.add('active')
    bowCharge.classList.toggle('full', ratio >= 1)
    bowCharge.classList.toggle('mid', ratio >= 0.4 && ratio < 1)
    bowChargeFill.style.width = `${ratio * 100}%`
    // Tint the charge fill dynamically: green→yellow→orange→red.
    if (ratio < 0.4) {
      bowChargeFill.style.background = 'linear-gradient(90deg,#3a8a3a,#80d040)'
    } else if (ratio < 0.75) {
      bowChargeFill.style.background = 'linear-gradient(90deg,#8a7e3a,#f0c86a)'
    } else {
      bowChargeFill.style.background = 'linear-gradient(90deg,#c84020,#ff7030)'
    }
    // Crosshair charge tint — drives CSS via data-charge attribute.
    if (ratio >= 1) {
      crosshairEl.dataset['charge'] = 'full'
    } else if (ratio >= 0.5) {
      crosshairEl.dataset['charge'] = 'high'
    } else if (ratio > 0) {
      crosshairEl.dataset['charge'] = 'low'
    } else {
      delete crosshairEl.dataset['charge']
    }
    // If the server cancelled an already-acknowledged charge (e.g. damage),
    // clear locally. Do not clear a pending draw before the schema ack arrives:
    // that drops the later LMB release and makes bow feel locked for ~1s.
    if (!serverCharging && self.bowChargeServerAcked) {
      self.bowChargeStartMs = 0
      self.bowChargeServerAcked = false
    }
  } else {
    bowCharge.classList.remove('active', 'full', 'mid')
    bowChargeFill.style.width = '0%'
    delete crosshairEl.dataset['charge']
  }

  // Parry ring — visible while schema says we're parrying.
  if (selfSchema && selfSchema.parrying) {
    parryRing.classList.add('active')
    parryRing.classList.toggle('hold', selfSchema.parryIsHold)
  } else {
    parryRing.classList.remove('active')
    parryRing.classList.remove('hold')
  }

  // Round live timer (duel modes only — hidden for FFA/5v5 which use kill counter).
  if (livePhaseStartTick >= 0 && tickNow > 0) {
    const elapsed = (tickNow - livePhaseStartTick) / TICK_RATE_HZ
    const secsLeft = Math.max(0, ROUND_TIMER_SEC - elapsed)
    roundTimer.textContent = secsLeft.toFixed(0) + 's'
    roundTimer.classList.toggle('urgent', secsLeft <= 15)
  }

  // Low-HP vignette + death overlay + heal flash + body death class.
  if (selfSchema) {
    const hpFrac = selfSchema.hp / HP_MAX
    lowHpVignette.classList.toggle('active', selfSchema.alive && hpFrac < 0.25)
    const blinded = selfSchema.alive && Array.from(selfSchema.statuses).some((s) => s.kind === 'blind')
    blindVignette.classList.toggle('active', blinded)
    deathOverlay.classList.toggle('active', !selfSchema.alive)
    document.body.classList.toggle('player-dead', !selfSchema.alive)
    // Heal flash: green edge glow when HP increases noticeably (not on respawn).
    if (prevSelfHp > 0 && selfSchema.hp > prevSelfHp + 3 && selfSchema.alive) {
      healFlash.classList.add('active')
      void healFlash.offsetHeight
      healFlash.classList.remove('active')
    }
    prevSelfHp = selfSchema.hp
  }

  // Animate zone visuals — cylinder rotates slowly, opacity pulses.
  zoneVisuals.forEach((vis) => {
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.0035)
    const mat = vis.mesh.material as THREE.MeshBasicMaterial | THREE.MeshStandardMaterial
    if ('opacity' in mat) mat.opacity = 0.18 + pulse * 0.18
    // Slowly rotate the cylinder for a magical "field" feel.
    vis.mesh.rotation.y += 0.006
    if (vis.extra) {
      const eMat = vis.extra.material as THREE.MeshBasicMaterial
      if ('opacity' in eMat) eMat.opacity = 0.35 + pulse * 0.22
    }
  })

  // Self character — colour + emissive effects driven by HP / status / invuln.
  if (selfMesh && selfSchema) {
    const hpFrac = selfSchema.hp / HP_MAX
    const mat = selfMesh.userData['armorMat'] as THREE.MeshToonMaterial | undefined
    if (mat) {
      if (hpFrac < 0.25) {
        const pulse = 0.5 + 0.5 * Math.sin(now * 0.007)
        mat.color.setHex(pulse > 0.5 ? 0x80c8ff : 0x3a8fde)
      } else {
        mat.color.setHex(0x3a8fde)
      }

      // Build target emissive from status tints.
      const statuses = Array.from(selfSchema.statuses ?? [])
      let tR = 0, tG = 0, tB = 0
      for (const st of statuses) {
        const hex = STATUS_EMISSIVE[st.kind]
        if (hex !== undefined) {
          tR = Math.max(tR, ((hex >> 16) & 0xff) / 255)
          tG = Math.max(tG, ((hex >> 8)  & 0xff) / 255)
          tB = Math.max(tB, ( hex        & 0xff) / 255)
        }
      }
      // Spawn invulnerability — gold pulse (~4 Hz).
      if (selfSchema.invulnUntilTick > tickNow) {
        const pulse = 0.45 + 0.45 * Math.sin(now * 0.025)
        tR = Math.max(tR, pulse * 1.0)
        tG = Math.max(tG, pulse * 0.85)
        tB = Math.max(tB, pulse * 0.2)
      }
      // Damage blink — brief white flash on hit.
      if (now < selfDamageBlinkUntilMs) {
        const blinkFrac = 1 - (selfDamageBlinkUntilMs - now) / 160
        const blinkStrength = blinkFrac < 0.5 ? blinkFrac * 2 : (1 - blinkFrac) * 2
        tR = Math.max(tR, blinkStrength * 0.95)
        tG = Math.max(tG, blinkStrength * 0.95)
        tB = Math.max(tB, blinkStrength * 0.95)
      }
      const LERP = 0.12
      mat.emissive.r += (tR - mat.emissive.r) * LERP
      mat.emissive.g += (tG - mat.emissive.g) * LERP
      mat.emissive.b += (tB - mat.emissive.b) * LERP
      mat.emissiveIntensity = 0.70
      // Drive the follow-light hue: low HP → red, shield → bright blue,
      // haste → amber, normal → soft blue-white.
      const hasShield = statuses.some((s) => s.kind === 'shield')
      const hasHaste  = statuses.some((s) => s.kind === 'haste')
      if (hpFrac < 0.28) {
        const redPulse = 0.5 + 0.5 * Math.sin(now * 0.008)
        playerLight.color.setRGB(0.8 + redPulse * 0.2, 0.1, 0.05 + redPulse * 0.05)
        playerLight.intensity = 0.55 + redPulse * 0.25
      } else if (hasShield) {
        const shieldPulse = 0.5 + 0.5 * Math.sin(now * 0.005)
        playerLight.color.setRGB(0.2, 0.5, 0.9 + shieldPulse * 0.1)
        playerLight.intensity = 0.55 + shieldPulse * 0.20
      } else if (hasHaste) {
        const hastePulse = 0.5 + 0.5 * Math.sin(now * 0.012)
        playerLight.color.setRGB(0.95 + hastePulse * 0.05, 0.80, 0.15)
        playerLight.intensity = 0.50 + hastePulse * 0.20
      } else {
        playerLight.color.setRGB(0.67, 0.80, 1.0)
        playerLight.intensity = 0.45
      }
    }
  }

  // Remote player status emissive tints + spawn-invuln gold pulse.
  remotePlayers.forEach((r, sid) => {
    const p = getSchemaPlayers()?.get(sid)
    if (!p || !r.alive) return
    const mat = r.mesh.userData['armorMat'] as THREE.MeshToonMaterial | undefined
    if (!mat?.emissive) return
    let tR = 0, tG = 0, tB = 0
    for (const st of Array.from(p.statuses ?? [])) {
      const hex = STATUS_EMISSIVE[st.kind]
      if (hex !== undefined) {
        tR = Math.max(tR, ((hex >> 16) & 0xff) / 255)
        tG = Math.max(tG, ((hex >> 8)  & 0xff) / 255)
        tB = Math.max(tB, ( hex        & 0xff) / 255)
      }
    }
    if (p.invulnUntilTick > tickNow) {
      const pulse = 0.45 + 0.45 * Math.sin(now * 0.025)
      tR = Math.max(tR, pulse * 1.0)
      tG = Math.max(tG, pulse * 0.85)
      tB = Math.max(tB, pulse * 0.2)
    }
    // Remote damage blink — white flash on hit.
    const rBlinkUntil = remoteDamageBlinkUntil.get(sid) ?? 0
    if (now < rBlinkUntil) {
      const bf = 1 - (rBlinkUntil - now) / 160
      const bs = bf < 0.5 ? bf * 2 : (1 - bf) * 2
      tR = Math.max(tR, bs * 0.95)
      tG = Math.max(tG, bs * 0.95)
      tB = Math.max(tB, bs * 0.95)
    } else if (rBlinkUntil > 0) {
      remoteDamageBlinkUntil.delete(sid)
    }
    const LERP = 0.12
    mat.emissive.r += (tR - mat.emissive.r) * LERP
    mat.emissive.g += (tG - mat.emissive.g) * LERP
    mat.emissive.b += (tB - mat.emissive.b) * LERP
    mat.emissiveIntensity = 0.70
  })

  if (selfSchema) {
    const hpPct = Math.max(0, Math.min(1, selfSchema.hp / HP_MAX))
    const mpPct = Math.max(0, Math.min(1, selfSchema.mana / MANA_MAX))
    const spPct = Math.max(0, Math.min(1, selfSchema.stamina / STAMINA_MAX))
    hudHpFill.style.width = `${(hpPct * 100).toFixed(1)}%`
    hudManaFill.style.width = `${(mpPct * 100).toFixed(1)}%`
    hudStamFill.style.width = `${(spPct * 100).toFixed(1)}%`
    hudHpNum.textContent = `${Math.round(selfSchema.hp)} / ${HP_MAX}`
    hudManaNum.textContent = `${Math.round(selfSchema.mana)} / ${MANA_MAX}`
    hudStamNum.textContent = `${Math.round(selfSchema.stamina)} / ${STAMINA_MAX}`
    // Low-resource pulsing warnings.
    document.getElementById('hud-hp')?.classList.toggle('warn', hpPct < 0.25)
    document.getElementById('hud-mana')?.classList.toggle('warn', mpPct < 0.2)
    document.getElementById('hud-stam')?.classList.toggle('warn', spPct < 0.15)

    // Transmute bar cooldown ticks.
    updateTransmuteBar()

    const nextIdx = selfSchema.comboIndex
    const elapsedSec = (tickNow - selfSchema.lastSwingStartTick) / TICK_RATE_HZ
    const live = elapsedSec < 1.0 && selfSchema.lastSwingStartTick > 0
    // comboIndex wraps 0→1→2→0. When live and nextIdx===0 the 3rd swing just
    // completed (index wrapped back to start), so all 3 dots should light up.
    // When not live and nextIdx===0 no combo is active — 0 dots.
    const delivered = live && nextIdx === 0 ? 3 : nextIdx
    for (let i = 0; i < 3; i++) {
      comboDots[i]?.classList.toggle('on', live && i < delivered)
    }
    // Full combo accent — all 3 dots active.
    hudComboEl.classList.toggle('full', live && delivered === 3)

    if (!selfSchema.alive && selfSchema.respawnAtTick > 0) {
      const secLeft = Math.max(0, (selfSchema.respawnAtTick - tickNow) / TICK_RATE_HZ)
      if (!respawnOverlay.classList.contains('active')) {
        // Show a new random tip each time you die
        if (respawnTipEl) respawnTipEl.textContent = RESPAWN_TIPS[Math.floor(Math.random() * RESPAWN_TIPS.length)] ?? ''
      }
      respawnOverlay.classList.add('active')
      respawnSec.textContent = secLeft.toFixed(1)
      respawnKillerEl.textContent = lastKillerName ? `⚔ killed by ${lastKillerName}` : ''
    } else {
      respawnOverlay.classList.remove('active')
    }

    // Mastery badge — show active level + element.
    const mLevel = selfSchema.masteryLevel ?? 0
    const mel    = selfSchema.masteryElement
    if (mLevel > 0 && mel && mel !== 'none' && mel !== '') {
      const bonus  = MASTERY_BONUSES[mel as keyof typeof MASTERY_BONUSES]
      const label  = mLevel >= 2 ? 'PERFECT MASTERY' : 'MASTERY'
      masteryBadge.textContent = `✦ ${mel.toUpperCase()} · ${label} ✦`
      masteryBadge.style.color = bonus?.color ?? (ELEMENT_COLOR[mel] ?? '#ffd260')
    } else {
      masteryBadge.textContent = ''
    }

    // --- Status icons HUD ----------------------------------------------
    const liveStatuses = Array.from(selfSchema.statuses ?? [])
    while (statusStrip.firstChild) statusStrip.removeChild(statusStrip.firstChild)
    for (const st of liveStatuses) {
      const icon = document.createElement('div')
      icon.className = 'status-icon'
      icon.dataset['kind'] = st.kind
      icon.textContent = STATUS_ICON[st.kind] ?? '?'
      icon.title = `${st.kind} x${st.stacks} (${st.remainingSec.toFixed(1)}s)`
      const stack = document.createElement('span')
      stack.className = 'stack'
      stack.textContent = st.stacks > 1 ? String(st.stacks) : ''
      if (st.stacks > 1) icon.appendChild(stack)
      const tm = document.createElement('div')
      tm.className = 'timer'
      const fill = document.createElement('div')
      fill.className = 'fill'
      const total = Math.max(0.1, st.remainingSec)
      // Visual: full bar then drains; we don't know the original duration so cap
      // at a sensible max for display (5 s → 100%, scales linearly above).
      const ratio = Math.min(1, total / 5)
      fill.style.width = `${ratio * 100}%`
      tm.appendChild(fill)
      icon.appendChild(tm)
      statusStrip.appendChild(icon)
    }

    // --- Rebuild CD strip if loadout changed ------------------------------
    // Colyseus ArraySchema can update in place, so reference comparison misses
    // loadout edits. Compare the slot contents instead.
    const currentLoadout = currentLoadoutArray()
    const currentLoadoutSig = loadoutSignature(currentLoadout)
    if (currentLoadoutSig !== cdStripLoadoutSig) rebuildCdStrip(currentLoadout)

    // --- Cast bar during windup -------------------------------------------
    if (selfSchema.casting && selfSchema.castEndsAtTick > tickNow) {
      if (castStartedAtMs === 0) castStartedAtMs = now // fallback if ack missed
      const secLeft = (selfSchema.castEndsAtTick - tickNow) / TICK_RATE_HZ
      const elapsed = (now - castStartedAtMs) / 1000
      const total = elapsed + secLeft
      const ratio = total > 0 ? Math.max(0, Math.min(1, elapsed / total)) : 0
      castBar.classList.add('active')
      castBarFill.style.width = `${(ratio * 100).toFixed(1)}%`
      const castDef = ABILITY_DEFS[selfSchema.castAbilityId]
      const castName = castDef?.name ?? selfSchema.castAbilityId.toUpperCase()
      castBarLabel.textContent = `${castName}  ${secLeft.toFixed(1)}s`
      // Tint the fill to the ability's element colour.
      const castElemColor = ELEMENT_COLOR[castDef?.element ?? 'none'] ?? '#4a90d8'
      const castElemDim   = castElemColor + '44' // ~27% alpha
      castBarFill.style.background = `linear-gradient(90deg, ${castElemDim} 0%, ${castElemColor} 80%, #fff 100%)`
      castBarFill.style.boxShadow = `2px 0 14px ${castElemColor}88`

      // Caster emissive glow — character glows with element colour during windup.
      if (selfMesh) {
        const mat = selfMesh.userData['armorMat'] as THREE.MeshToonMaterial | undefined
        if (mat) {
          const elemHex = parseInt((ELEMENT_COLOR[castDef?.element ?? 'none'] ?? '#9ba0b4').replace('#', ''), 16)
          const pulse = 0.5 + 0.5 * Math.sin(now * 0.012)
          mat.emissiveIntensity = 0.70 + pulse * 1.1
          mat.emissive.setHex(elemHex)
        }
      }
    } else {
      castStartedAtMs = 0
      castBar.classList.remove('active', 'interrupted')
      castBarFill.style.width = '0%'
      castBarFill.style.background = ''
      castBarFill.style.boxShadow = ''
      castBarLabel.textContent = 'CAST'
    }

    // --- Cooldown rings ---------------------------------------------------
    for (const [, label, slotIdx] of slotKeybindEntries()) {
      const id = cdStripLoadoutRef[slotIdx] ?? ''
      const pip = cdPipEls.get(id)
      if (!pip) continue
      const readyTick = (selfSchema.abilityCooldowns?.get?.(id) ?? 0) as number
      const arcEl    = pip.querySelector<SVGCircleElement>('.cd-arc-fill')
      const labelEl  = pip.querySelector<HTMLElement>('.label')
      const timerEl  = pip.querySelector<HTMLElement>('.cd-timer')
      if (readyTick > tickNow) {
        const left = (readyTick - tickNow) / TICK_RATE_HZ
        const def = ABILITY_DEFS[id]
        const totalSec = def?.cooldownSec ?? 1
        const ratio = Math.min(1, left / totalSec) // 1 = full CD, 0 = ready
        pip.classList.remove('ready', 'pending')
        pip.classList.add('cooling')
        if (labelEl) labelEl.textContent = label
        // Big countdown number front-and-center.
        if (timerEl) timerEl.textContent = left < 1 ? left.toFixed(1) : left.toFixed(0)
        if (arcEl) arcEl.style.strokeDashoffset = String(CD_ARC_CIRC * ratio)
      } else {
        const wasCooling = pip.classList.contains('cooling')
        pip.classList.add('ready')
        pip.classList.remove('cooling', 'pending')
        if (labelEl) labelEl.textContent = label
        if (timerEl) timerEl.textContent = ''
        if (arcEl) arcEl.style.strokeDashoffset = String(CD_ARC_CIRC)
        // Flash burst when CD just came off cooldown this frame.
        if (wasCooling) {
          pip.classList.remove('cd-ready-flash')
          void (pip as HTMLElement).offsetWidth // reflow for re-trigger
          pip.classList.add('cd-ready-flash')
          setTimeout(() => pip.classList.remove('cd-ready-flash'), 500)
        }
      }
      // Primed highlight — the ability selected via radial wheel, fires on LMB.
      pip.classList.toggle('primed', slotIdx === primedSlotIdx)
      pip.classList.toggle('placing', id === placementAbilityId)
    }

    // --- GCD ring — small arc at crosshair base ---------------------------
    if (gcdRingEl) {
      const gcdReady = selfSchema.gcdReadyAtTick ?? 0
      if (gcdReady > tickNow) {
        gcdRingEl.classList.add('active')
      } else {
        gcdRingEl.classList.remove('active')
      }
    }
  }

  renderer.render(scene, camera)
  // Update draw call counter every frame (shown in debug panel, ` key).
  dbgDraws.textContent = String(renderer.info.render.calls)
  requestAnimationFrame(render)
}

addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  const currentHudWidth = parseFloat(hudPanel.style.width)
  if (Number.isFinite(currentHudWidth)) {
    const currentBarHeight = parseFloat(getComputedStyle(hudPanel).getPropertyValue('--hud-bar-h')) || 22
    setHudSize(currentHudWidth, currentBarHeight, false)
  }
  if (hudPanel.style.left && hudPanel.style.top) {
    setHudPosition(parseFloat(hudPanel.style.left), parseFloat(hudPanel.style.top), false)
  }
})

addEventListener('beforeunload', () => {
  clearInterval(simTimer)
  room?.leave()
})

requestAnimationFrame(render)
