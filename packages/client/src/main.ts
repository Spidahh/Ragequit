// RAGEQUIT browser client: input, local prediction, Three.js render, HUD,
// loadout station, wheels, VFX, and Colyseus room sync.

import {
  ABILITY_DEFS,
  CLASS_IDS,
  BOW_CHARGE_FULL_SEC,
  ELO_STARTING,
  BOW_CHARGE_MIN_SEC,
  CAPSULE_HALF_HEIGHT_M,
  CAPSULE_HEIGHT_M,
  MessageTypes,
  PROJECTILE_MUZZLE_Y_OFFSET_M,
  getMap,
  TICK_MS,
  TICK_RATE_HZ,
  WEAPON_IDS,
  makePlayerSimState,
  movementCapsFromStatuses,
  simulatePlayer,
  type ClientCastMessage,
  type MovementCaps,
  type ServerMatchPhaseMessage,
  type ServerNoteMessage,
  type ServerScoreMessage,
  type ServerStatusAppliedMessage,
  type ServerStatusExpiredMessage,
  type ServerZoneExpiredMessage,
  type ServerZoneSpawnedMessage,
  type StatusKind,
  type ClientInputMessage,
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
  type ClassId,
} from '@ragequit/shared'
import { Client, type Room } from 'colyseus.js'
import * as THREE from 'three'

import { SoundEngine } from './audio/sound-engine.js'
import { type DeathcamData, type ScoreboardData } from './endgame.js'
import { initAbilityFailHud } from './hud/ability-fail-hud.js'
import { initCooldownStrip } from './hud/cd-strip.js'
import { createCombatFeedHud } from './hud/combat-feed.js'
import { initCombatOverlayHud } from './hud/combat-overlay-hud.js'
import { createHudFlash } from './hud/flash.js'
import { initHitFeedback } from './hud/hit-feedback.js'
import { initDraggableHud } from './hud/hud-drag.js'
import { initSelfHud } from './hud/self-hud.js'
import { initStatusOverlay } from './hud/status-overlay.js'
import { ensureIconSprite, weaponIcon } from './icons.js'
import { initCastDispatcher } from './input/cast-dispatcher.js'
import { initGameInput, makeGameInputState } from './input/game-input.js'
import { actionLabel, onKeybindsChanged } from './input/keybinds.js'
import { initRadialWheels } from './input/radial-wheels.js'
import { initMouseSensitivity } from './input/sensitivity.js'
import { initLoadoutStation } from './loadout-station.js'
import { initMenu } from './menu.js'
import { sendLoadout } from './net/loadout-sync.js'
import {
  initSupabaseAuth,
  getAccessToken,
  signIn,
  signUp,
  logOut,
  getCurrentUserEmail,
  getCurrentUserId,
  getPlayerStats,
  signInWithGoogle,
  isSupabaseConfigured,
} from './net/supabase-auth.js'
import { updateRankBadge } from './rank-system.js'
import {
  makeCharacter,
  applyWeaponProp,
  loadCharacterGlb,
  tickCharacterMixer,
  setCharAnimState,
  disposeCharacterMixer,
  makeParryShieldVisual,
  setParryShieldState,
  fetchWeaponGlb,
} from './render/characters.js'
import { makeSwingArcMesh, makeToonGradient, SWING_ARC_YAW_OFFSET } from './render/factories.js'
import { createOutlineMesh } from './render/outlines.js'
import { initPlacementPreview } from './render/placement-preview.js'
import { initProjectileVisuals, type SchemaProjectile } from './render/projectile-visuals.js'
import { initRemotePlayers, type RemotePlayerSchema } from './render/remote-players.js'
import { initSelfEmissive, STATUS_EMISSIVE } from './render/self-emissive.js'
import { VfxTextures } from './render/vfx-textures.js'
import { initZoneVisuals, zoneColorForElement } from './render/zone-visuals.js'
import {
  initTelemetry,
  trackMatchJoined,
  trackMatchLeft,
  trackKill,
  trackDeath,
  trackAbilityCast,
} from './telemetry.js'
import { DeathBurst } from './vfx/death-burst.js'
import { ImpactPool, type ImpactProfile } from './vfx/impact-pool.js'
import { buildArena } from './world/arena.js'

// -----------------------------------------------------------------------
// DOM refs
// -----------------------------------------------------------------------

const app = document.getElementById('app')
if (!app) throw new Error('#app element missing in index.html')
void ensureIconSprite()

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
  top: document.querySelector<HTMLElement>('.hit-dir[data-dir="top"]')!,
  bottom: document.querySelector<HTMLElement>('.hit-dir[data-dir="bottom"]')!,
  left: document.querySelector<HTMLElement>('.hit-dir[data-dir="left"]')!,
  right: document.querySelector<HTMLElement>('.hit-dir[data-dir="right"]')!,
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
for (const [weapon, slot] of Object.entries(weaponSlots) as Array<[Weapon, HTMLElement]>) {
  slot.querySelector<HTMLElement>('.icon')?.replaceChildren(weaponIcon(weapon, 30))
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

function refreshKeybindHudLabels(): void {
  weaponSlots.sword.querySelector<HTMLElement>('.key')!.textContent = actionLabel('swapWeapon')
  weaponSlots.bow.querySelector<HTMLElement>('.key')!.textContent = actionLabel('swapWeapon')
  weaponSlots.staff.querySelector<HTMLElement>('.key')!.textContent = actionLabel('swapWeapon')
}
refreshKeybindHudLabels()

// -----------------------------------------------------------------------
// HUD feedback helpers
// -----------------------------------------------------------------------

const hudFlash = createHudFlash(shootFlashEl, weaponBannerEl)
const showShootFlash = hudFlash.showShootFlash
const showWeaponBanner = hudFlash.showWeaponBanner
const combatFeedHud = createCombatFeedHud({
  comboFlash,
  comboPopup,
  killFeed,
  streakBonus: streakBonusEl,
  streakCount: streakCountEl,
  streakDisplay,
})

// -----------------------------------------------------------------------
// Radial wheels — Q for utility loadout slots, E for combat abilities.
// -----------------------------------------------------------------------

function currentLoadoutArray(): string[] {
  const schemaLoadout = getSelfSchemaPlayer?.()?.loadout
  return schemaLoadout
    ? Array.from(schemaLoadout as unknown as Iterable<string>)
    : Array.from(loadoutStation.getLoadout() as Iterable<string>)
}

const mouseSensitivity = initMouseSensitivity()

// -----------------------------------------------------------------------
// Camera pitch limits — asymmetric for 3rd-person feel
// -----------------------------------------------------------------------

// Positive inp.mousePitch → camera.rotation.x > 0 → looking UP (Three.js convention).
// Mouse-up increments inp.mousePitch; mouse-down decrements it.
// Cap looking UP at 75° and looking DOWN at 65° to avoid ground/sky clipping.
const PITCH_UP_LIMIT = Math.PI * 0.415 //  +75° — max look-up angle
const PITCH_DOWN_LIMIT = -Math.PI * 0.36 //  -65° — max look-down angle

// Cast / fire / weapon input dispatcher — owns primedSlotIdx, abilityCastQueue,
// placementAbilityId, lastStaffFireMs and dispatches combat actions each sim tick.
const castDispatcher = initCastDispatcher({
  getLoadout: currentLoadoutArray,
  isDirectCast: (id) => loadoutStation.isDirectCast(id),
  hidePlacementVisual: () => {
    placementPreview.group.visible = false
  },
  sendCast: (id, tick) => sendAbilityCast(id, tick),
  showShootFlash,
})

// --- HUD helpers -----------------------------------------------------------

const cooldownStrip = initCooldownStrip(cdStrip, (slotIdx) =>
  castDispatcher.activateAbilitySlot(slotIdx, true),
)

const selfHud = initSelfHud({
  hudHpFill,
  hudManaFill,
  hudStamFill,
  hudHpNum,
  hudManaNum,
  hudStamNum,
  comboDots,
  hudComboEl,
  respawnOverlay,
  respawnSec,
  respawnKillerEl,
  respawnTipEl,
  statusStrip,
  castBar,
  castBarFill,
  castBarLabel,
  gcdRingEl,
  cooldownStrip,
})

const abilityFailHud = initAbilityFailHud({ statusStrip, gcdRingEl, serverToast, cooldownStrip })

onKeybindsChanged(() => {
  radialWheels.refreshAll()
  cooldownStrip.rebuild(currentLoadoutArray(), getCurrentClassId())
  refreshKeybindHudLabels()
})

const soundEngine = new SoundEngine()
soundEngine.muted = true
window.addEventListener('pointerdown', () => soundEngine.unlock(), { capture: true, passive: true })
window.addEventListener('keydown', () => soundEngine.unlock(), { capture: true })
initTelemetry()
// Boot Supabase auth in the background — store the promise, wire up after menu is ready
const _supabaseAuthReady = initSupabaseAuth()
const statusOverlay = initStatusOverlay({
  getSelfId: () => self?.sessionId,
  playStatus: (el) => soundEngine.playStatus(el),
})

// -----------------------------------------------------------------------
// Three.js scene
// -----------------------------------------------------------------------

VfxTextures.init()

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
renderer.domElement.tabIndex = 0
renderer.domElement.style.outline = 'none'
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

// Sky-dome hemisphere: neutral/cool so jumping never washes the screen yellow.
scene.add(new THREE.HemisphereLight(0xc4d8ff, 0x182238, 1.2))
// Key light — neutral, not golden; gameplay readability beats warm ambience.
const dir = new THREE.DirectionalLight(0xf0f6ff, 1.15)
dir.position.set(12, 28, 14)
dir.castShadow = true
dir.shadow.mapSize.width = 2048
dir.shadow.mapSize.height = 2048
dir.shadow.camera.near = 1
dir.shadow.camera.far = 120
dir.shadow.camera.left = -40
dir.shadow.camera.right = 40
dir.shadow.camera.top = 40
dir.shadow.camera.bottom = -40
dir.shadow.bias = -0.0008
scene.add(dir)
// Fill / rim light — cool teal from opposite side for readable silhouettes.
const rim = new THREE.DirectionalLight(0x40c8ff, 0.55)
rim.position.set(-12, 8, -14)
scene.add(rim)
// Ground bounce — subtle warm fill; intentionally low so it doesn't
// create a visible orange haze when the camera is elevated (jumping).
const bounce = new THREE.PointLight(0x80a8ff, 0.06, 16, 2)
bounce.position.set(0, 0.5, 0)
scene.add(bounce)
// Player follow-light — soft blue-white halo around the self character,
// giving ground and nearby objects contact-shadow depth.
const playerLight = new THREE.PointLight(0xaaccff, 0.45, 8, 2)
scene.add(playerLight)

const selfEmissive = initSelfEmissive({
  getSelfMesh: () => selfMesh,
  playerLight,
})

const toonGradient = makeToonGradient()

const firstPersonViewModel = new THREE.Group()
camera.add(firstPersonViewModel)
const firstPersonParryShield = makeParryShieldVisual(0.42)
firstPersonParryShield.position.set(0, -0.03, -0.8)
firstPersonParryShield.userData['parryShield'] = firstPersonParryShield
camera.add(firstPersonParryShield)
scene.add(camera)
let firstPersonViewWeapon: Weapon | null = null

function clearFirstPersonViewModel(): void {
  while (firstPersonViewModel.children.length > 0) {
    const child = firstPersonViewModel.children[0]!
    child.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return
      node.geometry.dispose()
      const material = node.material
      if (Array.isArray(material)) material.forEach((mat) => mat.dispose())
      else material.dispose()
    })
    firstPersonViewModel.remove(child)
  }
}

function rebuildFirstPersonViewModel(weapon: Weapon): void {
  clearFirstPersonViewModel()
  firstPersonViewWeapon = weapon

  // Re-use the same weapon GLB cache as third-person props.
  fetchWeaponGlb(weapon)
    .then((scene) => {
      // Guard against race conditions (if player swapped weapons while loading)
      if (firstPersonViewWeapon !== weapon) return

      clearFirstPersonViewModel()
      const model = scene.clone()

      // Reset firstPersonViewModel base transforms to avoid double offsets
      firstPersonViewModel.position.set(0, 0, 0)
      firstPersonViewModel.rotation.set(0, 0, 0)

      // Use overlay-safe materials so first-person weapons never clip into arena walls.
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.renderOrder = 999 // render on top of environment
          const src = child.material as THREE.MeshStandardMaterial | THREE.MeshToonMaterial | undefined
          const hasMap = !!(src && 'map' in src && src.map && !(src.map instanceof Function))
          const color = src?.color?.clone() ?? new THREE.Color(0xffffff)

          const nameLower = child.name.toLowerCase()
          const isGlowing =
            nameLower.includes('glow') ||
            nameLower.includes('glyph') ||
            nameLower.includes('orb') ||
            nameLower.includes('element')

          child.material = new THREE.MeshBasicMaterial({
            color: isGlowing ? new THREE.Color(0x00d0ff) : color,
            map: hasMap ? src.map : null,
            transparent: src?.transparent ?? false,
            opacity: src?.opacity ?? 1.0,
            depthTest: false, // first person weapon shouldn't clip into walls
            depthWrite: false,
          })
        }
      })

      // Add outlines to keep weapon silhouettes readable in dark arenas.
      const outlines: THREE.Mesh[] = []
      model.traverse((child) => {
        if (child instanceof THREE.Mesh && !child.name.endsWith('_outline')) {
          const outline = createOutlineMesh(child, 0.016, 0x0a0a0f)
          outline.renderOrder = 999
          if (outline.material instanceof THREE.Material) {
            outline.material.depthTest = false
            outline.material.depthWrite = false
          }
          outlines.push(outline)
        }
      })
      for (const outline of outlines) {
        outline.parent?.add(outline)
      }

      // Weapon-specific first-person positions and orientations.
      if (weapon === 'sword') {
        model.position.set(0.18, -0.25, -0.5)
        model.rotation.set(-0.25, -0.4, 0.1)
        model.scale.setScalar(0.55)
      } else if (weapon === 'bow') {
        model.position.set(0.16, -0.22, -0.5)
        model.rotation.set(-0.1, -0.2, -0.2)
        model.scale.setScalar(0.5)
      } else if (weapon === 'staff') {
        model.position.set(0.19, -0.25, -0.5)
        model.rotation.set(-0.15, -0.3, -0.05)
        model.scale.setScalar(0.52)
      }

      firstPersonViewModel.add(model)
    })
    .catch((err) => {
      console.error(`[first-person] Failed to load weapon model ${weapon}:`, err)
    })
}

const { loadMapGeometry, getActiveMapId, animateArena } = buildArena(scene, toonGradient)

const placementPreview = initPlacementPreview({
  camera,
  getMouseYaw: () => inp.mouseYaw,
  getSelfPos: () => self?.sim.pos ?? null,
  getPlacementAbilityId: () => castDispatcher.getPlacementAbilityId(),
  getMapGroundY: (mapId) => getMap(mapId || 'blockout').groundY,
  getActiveMapId,
  getSchemaMapId,
})
scene.add(placementPreview.group)

function spawnImpact(pos: THREE.Vector3, color: number, profile: ImpactProfile = 'magic'): void {
  impactVfx.spawn(pos, color, profile)
}

/** Map element → world-space impact tint. */
function elementToImpactColor(element: string | undefined, cause: string): number {
  // Combo reactions get distinctive colours regardless of element.
  if (cause === 'combo:steam') return 0x88eeff // cyan steam burst
  if (cause === 'combo:combustion') return 0xff8822 // orange-fire explosion
  if (cause === 'combo:festering') return 0xaaff44 // sickly green DoT
  if (cause === 'combo:entrapment') return 0x60bb40 // darker nature green
  // Element-mapped colours for projectile / zone hits.
  switch (element) {
    case 'fire':
      return 0xff6622
    case 'ice':
      return 0x88ddff
    case 'lightning':
      return 0xffee44
    case 'dark':
      return 0xaa55ff
    case 'nature':
      return 0x77ee55
    default:
      return 0xd0d8ff // neutral pale-blue
  }
}

const impactVfx = new ImpactPool()
scene.add(impactVfx.mesh)
scene.add(impactVfx.ringMesh)
scene.add(impactVfx.accentMesh)

const deathBurstVfx = new DeathBurst()
scene.add(deathBurstVfx.mesh)

const zoneVfx = initZoneVisuals({ scene })
const projectileVfx = initProjectileVisuals({
  scene,
  spawnImpact,
  zoneColorForElement,
})
const remotePlayerSystem = initRemotePlayers({
  scene,
  toonGradient,
  nameplateContainer,
  isWeapon,
  capsuleHeightM: CAPSULE_HEIGHT_M,
  capsuleHalfHeightM: CAPSULE_HALF_HEIGHT_M,
  getSelfTeam: () => getSelfSchemaPlayer()?.team ?? '',
})

const hitFeedback = initHitFeedback({
  crosshairEl,
  hitDirEls,
  popupsLayer,
  camera,
  getSelfPos: () => self?.sim.pos ?? null,
  getCamYaw: () => camera.rotation.y,
})

const combatOverlayHud = initCombatOverlayHud({
  bowCharge,
  bowChargeFill,
  crosshairEl,
  parryRing,
  roundTimer,
  lowHpVignette,
  blindVignette,
  deathOverlay,
  healFlash,
})

// -----------------------------------------------------------------------
// Input capture — keyboard + mouse
// -----------------------------------------------------------------------

// Pure input state — owned by initGameInput; main.ts reads/writes directly.
const inp = makeGameInputState()

// Game / UI state that lives here (cleared alongside input edges).
let loadoutReturnsToPause = false
// Local cast-bar start timestamp — set when casting becomes true, cleared on reset.
let castStartedAtMs = 0

function isPauseMenuOpen(): boolean {
  return !pauseMenu.classList.contains('hidden')
}

function isOverlayOpen(el: HTMLElement): boolean {
  return !el.classList.contains('hidden')
}

function loadoutStationHidden(): boolean {
  return document.getElementById('loadout-station')?.classList.contains('hidden') ?? true
}

function isGameplayInputAllowed(): boolean {
  return (
    Boolean(room) &&
    currentMatchPhase === 'live' &&
    loadoutStationHidden() &&
    !isPauseMenuOpen() &&
    !isOverlayOpen(settingsOverlay) &&
    !document.body.classList.contains('main-menu-active') &&
    !document.body.classList.contains('loadout-active')
  )
}

function canEngageGameplaySurface(): boolean {
  return (
    Boolean(room) &&
    loadoutStationHidden() &&
    !isPauseMenuOpen() &&
    !isOverlayOpen(settingsOverlay) &&
    !document.body.classList.contains('main-menu-active') &&
    !document.body.classList.contains('loadout-active')
  )
}

function isWeapon(w: string): w is Weapon {
  return (WEAPON_IDS as readonly string[]).includes(w)
}

function currentWeaponFromSchema(): Weapon {
  const schemaWeapon = getSelfSchemaPlayer()?.activeWeapon
  return schemaWeapon && isWeapon(schemaWeapon) ? schemaWeapon : 'sword'
}

function currentWeaponForInput(): Weapon {
  return (
    (inp.optimisticWeapon && isWeapon(inp.optimisticWeapon) ? inp.optimisticWeapon : null) ??
    currentWeaponFromSchema()
  )
}

function clearCombatInputEdges(): void {
  inp.keys.clear()
  inp.jumpEdgeQueued = false
  inp.lmbPressEdge = false
  inp.lmbReleaseEdge = false
  inp.lmbDown = false
  inp.rmbPressEdge = false
  inp.rmbReleaseEdge = false
  inp.weaponSwapRequest = null
  inp.optimisticWeapon = null
  castDispatcher.clearQueue()
  radialWheels.refreshAll()
  castDispatcher.cancelPlacementPreview()
}

function openPauseMenu(): void {
  if (!room || isPauseMenuOpen()) return
  if (radialWheels.isOpen()) radialWheels.close(false)
  gameInput.disengageCanvasInput()
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
  if (lockPointer && room) {
    gameInput.engageCanvasInput()
    gameInput.requestArenaPointerLock()
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
  if (getRoomMode() === 'training') {
    returnToTrainingScoreboard()
  } else {
    returnToMainMenu({ leaveRoom: true, statusText: 'left match' })
  }
})

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

let self: SelfState | null = null

// Damage blink — classic white-flash on the self character when taking a hit.
// Stored as a timestamp; the render loop ramps emissive up to white then back.
let selfDamageBlinkUntilMs = 0
function triggerDamageBlink(): void {
  selfDamageBlinkUntilMs = performance.now() + 160
}

// Hit-react animation window — self character plays RecieveHit clip for 600 ms.
let selfHitReactUntilMs = 0

// Respawn animation — plays for 1500 ms after self transitions dead → alive.
let selfRespawnUntilMs = 0
let selfPrevDead = false

// Jump/Land animation windows — triggered by onGround transitions.
let selfJumpUntilMs = 0
let selfLandUntilMs = 0
let selfPrevOnGround = true

// Roll animation — triggered on dash ability cast confirmation.
let selfRollingUntilMs = 0

// Directional screen shake — offset the camera toward/away from attacker.
// attackerWorldPos: world-space position of whoever dealt damage. Use null
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
let currentMatchPhase: ServerMatchPhaseMessage['phase'] = 'lobby'
// ELO deltas from the last matchEnd score broadcast (session ID → delta).
let lastMatchEloDeltas: Record<string, number> = {}
let lastKillerName = ''
// Timestamps of self kills for streak detection (ms).
const recentKillTimes: number[] = []
let selfMesh: THREE.Group | null = null
let selfArc: THREE.Mesh | null = null
let selfArcExpiresAt = 0
let selfLastWeapon = ''
let room: Room | null = null
let activeRoomMode = 'duel_arena'
export function getRoomMode(): string {
  return activeRoomMode
}
let connectSeq = 0
let ping = 0
let matchStartMs = 0

// Cumulative match stats
interface MatchStats {
  kills: number
  yourHits: number
  damageDealt: number
  damageTaken: number
  knockups: number
  parries: number
  comboProcs: number
  knockupAttempts: number
  knockupConversions: number
  abilitiesUsed: Record<string, number>
}
let selfStats: MatchStats = {
  kills: 0,
  yourHits: 0,
  damageDealt: 0,
  damageTaken: 0,
  knockups: 0,
  parries: 0,
  comboProcs: 0,
  knockupAttempts: 0,
  knockupConversions: 0,
  abilitiesUsed: {},
}
let opponentStats: MatchStats = {
  kills: 0,
  yourHits: 0,
  damageDealt: 0,
  damageTaken: 0,
  knockups: 0,
  parries: 0,
  comboProcs: 0,
  knockupAttempts: 0,
  knockupConversions: 0,
  abilitiesUsed: {},
}

let lastHitDetails = {
  killer: '',
  ability: '',
  element: '',
  damage: 0,
}

function isMatchPhase(value: unknown): value is ServerMatchPhaseMessage['phase'] {
  return (
    value === 'lobby' ||
    value === 'countdown' ||
    value === 'live' ||
    value === 'roundEnd' ||
    value === 'matchEnd'
  )
}

function applyMatchPhase(msg: ServerMatchPhaseMessage, selfId: string): void {
  currentMatchPhase = msg.phase
  menu.onMatchPhase(msg, selfId)
  if (msg.phase === 'live') {
    livePhaseStartTick = getSchemaTick()
    roundTimer.textContent = ''
    requestAnimationFrame(() => draggableHud.refreshBounds())
    if (canEngageGameplaySurface()) {
      engageCanvasInput()
    }
  } else {
    livePhaseStartTick = -1
    roundTimer.textContent = ''
    roundTimer.classList.remove('urgent')
  }
  if (msg.phase === 'lobby' || msg.phase === 'countdown') {
    lastMatchEloDeltas = {}
    selfStats = {
      kills: 0,
      yourHits: 0,
      damageDealt: 0,
      damageTaken: 0,
      knockups: 0,
      parries: 0,
      comboProcs: 0,
      knockupAttempts: 0,
      knockupConversions: 0,
      abilitiesUsed: {},
    }
    opponentStats = {
      kills: 0,
      yourHits: 0,
      damageDealt: 0,
      damageTaken: 0,
      knockups: 0,
      parries: 0,
      comboProcs: 0,
      knockupAttempts: 0,
      knockupConversions: 0,
      abilitiesUsed: {},
    }
    lastHitDetails = { killer: '', ability: '', element: '', damage: 0 }
    matchStartMs = performance.now()
  }
  if (msg.phase === 'matchEnd') {
    // Release pointer lock so the cursor is visible and the scoreboard
    // buttons (BACK TO MENU) are clickable.
    if (document.pointerLockElement) document.exitPointerLock()

    // Construct ScoreboardData dynamically
    const players = getSchemaPlayers()
    const selfSchema = players?.get(selfId)

    let otherId = ''
    players?.forEach((_p, sid) => {
      if (sid !== selfId) otherId = sid
    })
    const otherSchema = otherId ? players?.get(otherId) : null

    const selfName = selfSchema?.name || 'Player'
    const opponentName = otherSchema?.name || 'Opponent'

    // Build label: class + active weapon
    const selfClassId = selfSchema?.classId || 'hybrid'
    const selfBuild = `${selfClassId.toUpperCase()} · ${selfSchema?.activeWeapon?.toUpperCase() || 'SWORD'}`

    const oppClassId = otherSchema?.classId || 'hybrid'
    const oppBuild = `${oppClassId.toUpperCase()} · ${otherSchema?.activeWeapon?.toUpperCase() || 'SWORD'}`

    // Determine winner based on score or kills
    const isWin = selfStats.kills >= opponentStats.kills
    // Use real server-computed ELO delta when available (from matchEnd score msg);
    // fall back to K-factor estimate if the server didn't send deltas.
    const selfEloDelta = lastMatchEloDeltas[selfId]
    const eloDelta = selfEloDelta !== undefined ? selfEloDelta : isWin ? 25 : -18
    const eloBefore = ELO_STARTING

    const arenaName = getSchemaMapId()
    const matchMs = performance.now() - matchStartMs

    const scoreboardData: ScoreboardData = {
      arena: arenaName.toUpperCase(),
      matchMs: matchMs > 0 ? matchMs : 120000,
      rounds:
        getRoomMode() === 'training'
          ? 'PRACTICE'
          : `${selfStats.kills}-${opponentStats.kills} rounds`,
      league: getRoomMode() === 'training' ? 'NO RANKED ELO' : 'Gold III',
      winner: isWin
        ? {
            name: selfName,
            build: selfBuild,
            kills: selfStats.kills,
            damageDealt: selfStats.damageDealt,
            damageTaken: selfStats.damageTaken,
            knockups: `${selfStats.knockupConversions} / ${selfStats.knockupAttempts}`,
            parries: selfStats.parries,
            comboProcs: selfStats.comboProcs,
            abilitiesUsed: selfStats.abilitiesUsed,
          }
        : {
            name: opponentName,
            build: oppBuild,
            kills: opponentStats.kills,
            damageDealt: opponentStats.damageDealt,
            damageTaken: opponentStats.damageTaken,
            knockups: `${opponentStats.knockupConversions} / ${opponentStats.knockupAttempts}`,
            parries: opponentStats.parries,
            comboProcs: opponentStats.comboProcs,
            abilitiesUsed: opponentStats.abilitiesUsed,
          },
      loser: isWin
        ? {
            name: opponentName,
            build: oppBuild,
            kills: opponentStats.kills,
            damageDealt: opponentStats.damageDealt,
            damageTaken: opponentStats.damageTaken,
            knockups: `${opponentStats.knockupConversions} / ${opponentStats.knockupAttempts}`,
            parries: opponentStats.parries,
            comboProcs: opponentStats.comboProcs,
            abilitiesUsed: opponentStats.abilitiesUsed,
          }
        : {
            name: selfName,
            build: selfBuild,
            kills: selfStats.kills,
            damageDealt: selfStats.damageDealt,
            damageTaken: selfStats.damageTaken,
            knockups: `${selfStats.knockupConversions} / ${selfStats.knockupAttempts}`,
            parries: selfStats.parries,
            comboProcs: selfStats.comboProcs,
            abilitiesUsed: selfStats.abilitiesUsed,
          },
      eloBefore,
      eloDelta: getRoomMode() === 'training' ? 0 : eloDelta,
    }

    menu.showScoreboard(selfId, scoreboardData)
  }
}

function syncMatchPhaseFromState(joinedRoom: Room): void {
  if (room !== joinedRoom) return
  const phase = (joinedRoom.state as { phase?: unknown }).phase
  if (!isMatchPhase(phase) || phase === currentMatchPhase) return
  applyMatchPhase({ phase }, joinedRoom.sessionId)
}

// Hit-stop — briefly freeze visual updates when a landed hit is confirmed.
// The sim still runs; only the camera lerp and particle animation pause.
let hitStopUntilMs = 0
// Victim-side hit-stop — receiving a hit triggers a brief visual freeze for self.
let victimHitStopUntilMs = 0

// Hit-stop durations by damage source category (milliseconds).
const HITSTOP_ATTACKER: Record<string, number> = { sword_m1: 65, uppercut: 65, bow: 35, staff: 35 }
const HITSTOP_VICTIM: Record<string, number> = { sword_m1: 45, uppercut: 45, bow: 30, staff: 30 }
function isAirPunishCause(cause: string): boolean {
  return cause.includes(':air_punish')
}
function hitstopAttacker(cause: string): number {
  if (isAirPunishCause(cause)) return 95
  return (
    HITSTOP_ATTACKER[cause] ?? (cause.startsWith('zone:') || cause.startsWith('combo:') ? 20 : 45)
  )
}
function hitstopVictim(cause: string): number {
  if (isAirPunishCause(cause)) return 70
  return (
    HITSTOP_VICTIM[cause] ?? (cause.startsWith('zone:') || cause.startsWith('combo:') ? 25 : 35)
  )
}

// Client-side combo tracking for the attacker (independent of server combo state).
// Counts consecutive hits landed; resets after COMBO_RESET_MS idle or on death.
let localComboCount = 0
let lastHitAsAttackerMs = 0
const COMBO_RESET_MS = 2500

// Directional screen shake — camera displacement decays each frame toward zero.
// Magnitude and direction are set by applyDirectionalShake(); decay is per-frame.
const shakeOffset = new THREE.Vector3()
let shakeDecay = 0 // current magnitude (metres), decays at shakeDecayRate/s
const SHAKE_DECAY_RATE = 9 // m/s — shake disappears in ~1/SHAKE_DECAY_RATE seconds

// Per-weapon camera — smoothly lerped so swapping weapons doesn't snap.
// sword: third-person melee readability; bow/staff: first-person precision.
// FOV default is 90°.
let camBack = 5.5
let camUp = 1.3
let camFovBase = 90
// Settings-driven FOV offset applied on top of camFovBase. Set by the
// settings panel; persisted by menu.ts via localStorage.
let settingsFovBase = 90
let pendingLaunchMode: string | null = null
const draggableHud = initDraggableHud({
  panel: hudPanel,
  dragHandle: hudDragHandle,
  resizeHandle: hudResizeHandle,
})

function setStatus(text: string, _color: string): void {
  const statusClass = `status-${text.replace(/\s+/g, '-').toLowerCase()}`
  dbgStatus.textContent = text
  dbgStatus.className = statusClass
  const footerEl = document.getElementById('menu-server-status')
  if (footerEl) {
    footerEl.replaceChildren()
    footerEl.className = statusClass
    const dot = document.createElement('span')
    dot.className = 'server-status-dot'
    dot.textContent = '●'
    footerEl.append(dot, text)
  }
}

let playerProfile = {
  currentClass: null as ClassId | null,
  equippedSpells: [] as string[],
}

function updateAuthUI(): void {
  const container = document.getElementById('profile-auth-section')
  if (!container) return

  const email = getCurrentUserEmail()
  if (email) {
    container.innerHTML = `
      <div class="auth-logged-in-status">
        <span>Acceduto come: <b>${email}</b></span>
        <button class="auth-logout-btn" id="btn-auth-logout">LOGOUT</button>
      </div>
    `
    const btnLogout = document.getElementById('btn-auth-logout') as HTMLButtonElement | null
    if (btnLogout) {
      btnLogout.addEventListener('click', async () => {
        btnLogout.disabled = true
        await logOut()
        updateAuthUI()
        initPlayerProfile()
      })
    }
  } else if (!isSupabaseConfigured()) {
    container.innerHTML = `
      <div class="auth-logged-in-status">
        <span>GUEST (OFFLINE)</span>
      </div>
    `
  } else {
    container.innerHTML = `
      <div class="auth-logged-out-form">
        <input type="email" id="auth-email-input" aria-label="Email" class="auth-input" autocomplete="username" placeholder="Email">
        <input type="password" id="auth-pass-input" aria-label="Password" class="auth-input" autocomplete="current-password" placeholder="Password">
        <div class="auth-buttons-row">
          <button class="auth-btn btn-accedi" id="btn-auth-signin">ACCEDI</button>
          <button class="auth-btn btn-registrati" id="btn-auth-signup">REGISTRATI</button>
        </div>
        <div class="auth-oauth-divider"><span>oppure</span></div>
        <button class="auth-btn btn-google-oauth" id="btn-auth-google">
          <svg class="google-icon" viewBox="0 0 24 24" width="16" height="16">
            <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.227C18.32 1.258 15.535 0 12.24 0 5.58 0 0 5.58 0 12.24s5.58 12.24 12.24 12.24c6.96 0 11.58-4.887 11.58-11.76 0-.792-.084-1.396-.188-1.935H12.24z"/>
          </svg>
          ACCEDI CON GOOGLE
        </button>
        <div id="auth-status" class="auth-status-message"></div>
      </div>
    `
    const btnSignin = document.getElementById('btn-auth-signin') as HTMLButtonElement | null
    const btnSignup = document.getElementById('btn-auth-signup') as HTMLButtonElement | null
    const btnGoogle = document.getElementById('btn-auth-google') as HTMLButtonElement | null
    const emailInput = document.getElementById('auth-email-input') as HTMLInputElement
    const passInput = document.getElementById('auth-pass-input') as HTMLInputElement
    const statusEl = document.getElementById('auth-status')

    if (btnGoogle && statusEl) {
      btnGoogle.addEventListener('click', async () => {
        statusEl.textContent = 'Reindirizzamento a Google...'
        statusEl.className = 'auth-status-message'
        if (btnSignin) btnSignin.disabled = true
        if (btnSignup) btnSignup.disabled = true
        btnGoogle.disabled = true

        try {
          const { error } = await signInWithGoogle()
          if (error) {
            statusEl.textContent = error
            statusEl.className = 'auth-status-message error'
            if (btnSignin) btnSignin.disabled = false
            if (btnSignup) btnSignup.disabled = false
            btnGoogle.disabled = false
          }
        } catch (e: unknown) {
          const errMsg = e instanceof Error ? e.message : String(e)
          statusEl.textContent = errMsg || 'Errore OAuth'
          statusEl.className = 'auth-status-message error'
          if (btnSignin) btnSignin.disabled = false
          if (btnSignup) btnSignup.disabled = false
          btnGoogle.disabled = false
        }
      })
    }

    if (btnSignin && emailInput && passInput && statusEl) {
      btnSignin.addEventListener('click', async () => {
        const mail = emailInput.value.trim()
        const pass = passInput.value
        if (!mail || !pass) {
          statusEl.textContent = 'Inserisci email e password'
          statusEl.className = 'auth-status-message error'
          return
        }
        statusEl.textContent = 'Accesso in corso...'
        statusEl.className = 'auth-status-message'
        btnSignin.disabled = true
        if (btnSignup) btnSignup.disabled = true
        if (btnGoogle) btnGoogle.disabled = true

        try {
          const { error } = await signIn(mail, pass)
          if (error) {
            statusEl.textContent = error
            statusEl.className = 'auth-status-message error'
            btnSignin.disabled = false
            if (btnSignup) btnSignup.disabled = false
            if (btnGoogle) btnGoogle.disabled = false
          } else {
            statusEl.textContent = 'Accesso eseguito!'
            statusEl.className = 'auth-status-message success'
            setTimeout(() => {
              updateAuthUI()
              initPlayerProfile()
            }, 800)
          }
        } catch (e: unknown) {
          const errMsg = e instanceof Error ? e.message : String(e)
          statusEl.textContent = errMsg || 'Errore imprevisto'
          statusEl.className = 'auth-status-message error'
          btnSignin.disabled = false
          if (btnSignup) btnSignup.disabled = false
          if (btnGoogle) btnGoogle.disabled = false
        }
      })
    }

    if (btnSignup && emailInput && passInput && statusEl) {
      btnSignup.addEventListener('click', async () => {
        const mail = emailInput.value.trim()
        const pass = passInput.value
        if (!mail || !pass) {
          statusEl.textContent = 'Inserisci email e password'
          statusEl.className = 'auth-status-message error'
          return
         }
        if (pass.length < 6) {
          statusEl.textContent = 'Password deve essere almeno 6 caratteri'
          statusEl.className = 'auth-status-message error'
          return
        }
        statusEl.textContent = 'Registrazione in corso...'
        statusEl.className = 'auth-status-message'
        btnSignin!.disabled = true
        btnSignup.disabled = true
        if (btnGoogle) btnGoogle.disabled = true

        try {
          const { error } = await signUp(mail, pass)
          if (error) {
            statusEl.textContent = error
            statusEl.className = 'auth-status-message error'
            btnSignin!.disabled = false
            btnSignup.disabled = false
            if (btnGoogle) btnGoogle.disabled = false
          } else {
            // Save display name into localStorage on registration
            const prefix = mail.split('@')[0] || 'PLAYER'
            localStorage.setItem('ragequit.profile.displayName', prefix)
            statusEl.textContent = 'Registrazione completata! Controlla la tua email.'
            statusEl.className = 'auth-status-message success'
            setTimeout(() => {
              updateAuthUI()
              initPlayerProfile()
            }, 1500)
          }
        } catch (e: unknown) {
          const errMsg = e instanceof Error ? e.message : String(e)
          statusEl.textContent = errMsg || 'Errore imprevisto'
          statusEl.className = 'auth-status-message error'
          btnSignin!.disabled = false
          btnSignup.disabled = false
          if (btnGoogle) btnGoogle.disabled = false
        }
      })
    }
  }
}

function initPlayerProfile(): void {
  let isConfigured = localStorage.getItem('ragequit.profile.configured') === 'true'
  if (!isConfigured) {
    const savedClass = localStorage.getItem('ragequit.loadout.classId')
    const savedSlotsRaw = localStorage.getItem('ragequit.loadout.v6')
    if (savedClass && savedSlotsRaw) {
      try {
        const parsed = JSON.parse(savedSlotsRaw) as { slots?: string[] }
        if (parsed.slots && parsed.slots.length === 8 && parsed.slots.some(Boolean)) {
          localStorage.setItem('ragequit.profile.configured', 'true')
          isConfigured = true
        }
      } catch {
        // ignore
      }
    }
  }

  if (isConfigured) {
    playerProfile = {
      currentClass: loadoutStation.getClassId(),
      equippedSpells: Array.from(loadoutStation.getLoadout() as Iterable<string>),
    }
  } else {
    playerProfile = {
      currentClass: null,
      equippedSpells: [],
    }
  }
  menu.updateProfile(playerProfile)

  // Load ELO/stats from Supabase or set defaults
  const eloEl = document.getElementById('profile-stat-elo')
  const winsEl = document.getElementById('profile-stat-wins')
  const lossesEl = document.getElementById('profile-stat-losses')
  const userId = getCurrentUserId()

  if (userId) {
    getPlayerStats(userId)
      .then((stats) => {
        if (stats) {
          if (eloEl) eloEl.textContent = String(stats.elo_rating ?? 1000)
          const wins = stats.wins ?? 0
          const losses = stats.losses ?? 0
          if (winsEl) winsEl.textContent = String(wins)
          if (lossesEl) lossesEl.textContent = String(losses)
          updateRankBadge(wins)
        }
      })
      .catch((err: unknown) => console.warn('[supabase] failed to fetch player stats:', err))
  } else {
    if (eloEl) eloEl.textContent = '1000'
    if (winsEl) winsEl.textContent = '0'
    if (lossesEl) lossesEl.textContent = '0'
    updateRankBadge(0)
  }

  updateAuthUI()
  initDisplayName()
}

function initDisplayName(): void {
  const nameInput = document.getElementById('pc-display-name') as HTMLInputElement | null
  const savedTick = document.getElementById('pc-name-saved')
  const avatarEl = document.getElementById('pc-avatar')

  const email = getCurrentUserEmail()

  // Determine initial name
  let initialName: string
  if (email) {
    initialName = email.split('@')[0]?.toUpperCase() ?? 'USER'
  } else {
    const stored = localStorage.getItem('ragequit.profile.displayName')
    initialName = stored ? stored.trim().toUpperCase() : ''
  }

  if (nameInput) {
    nameInput.value = initialName
    // Lock input when logged in (name comes from account)
    nameInput.readOnly = Boolean(email)
  }

  if (avatarEl) avatarEl.textContent = initialName[0] ?? '?'

  // Autosave on input (only when not logged in)
  if (nameInput && !email) {
    let saveTimer: ReturnType<typeof setTimeout> | null = null
    const saveImmediately = () => {
      const val = nameInput.value.trim().toUpperCase()
      if (val) {
        nameInput.value = val
        localStorage.setItem('ragequit.profile.displayName', val)
        if (avatarEl) avatarEl.textContent = val[0] ?? '?'
        if (savedTick) {
          savedTick.classList.add('visible')
          setTimeout(() => savedTick.classList.remove('visible'), 1500)
        }
      }
    }

    nameInput.addEventListener('input', () => {
      const val = nameInput.value.trim().toUpperCase()
      if (val) nameInput.value = val
      if (avatarEl) avatarEl.textContent = val[0] ?? '?'
      if (saveTimer) clearTimeout(saveTimer)
      saveTimer = setTimeout(saveImmediately, 600)
    })

    nameInput.addEventListener('change', () => {
      if (saveTimer) clearTimeout(saveTimer)
      saveImmediately()
    })

    nameInput.addEventListener('blur', () => {
      if (saveTimer) clearTimeout(saveTimer)
      saveImmediately()
    })
  }
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
    // Update player profile
    playerProfile = {
      currentClass: loadoutStation.getClassId(),
      equippedSpells: Array.from(loadoutStation.getLoadout() as Iterable<string>),
    }
    menu.updateProfile(playerProfile)

    const mode = pendingLaunchMode
    pendingLaunchMode = null
    if (mode) {
      engageCanvasInput()
      requestArenaPointerLock()
      void connectWithMode(mode, false)
    } else if (!room) {
      menu.showMain()
    }
  },
  () => Boolean(pendingLaunchMode),
  () =>
    pendingLaunchMode === 'training'
      ? 'START TRAINING'
      : pendingLaunchMode === 'duel_arena'
        ? 'START 1V1'
        : pendingLaunchMode === 'ffa'
          ? 'START FFA'
          : null,
)
function getCurrentClassId(): ClassId {
  const schemaPlayer = getSelfSchemaPlayer?.()
  if (schemaPlayer?.classId && (CLASS_IDS as readonly string[]).includes(schemaPlayer.classId)) {
    return schemaPlayer.classId as ClassId
  }
  return loadoutStation.getClassId()
}

const radialWheels = initRadialWheels({
  abilityWheelEl,
  getLoadout: currentLoadoutArray,
  getPrimedSlot: () => castDispatcher.getPrimedSlotIdx(),
  onPrimeSlot: (slotIdx) => castDispatcher.activateAbilitySlot(slotIdx, true),
  utilityWheelEl,
  getCooldownSec: (abilityId) => {
    const players = getSchemaPlayers()
    const selfId = self?.sessionId
    if (!selfId || !players) return 0
    const schema = players.get(selfId)
    if (!schema) return 0
    const readyAtTick = schema.abilityCooldowns.get(abilityId) ?? 0
    const currentTick = (room?.state as { tick?: number })?.tick ?? 0
    const remaining = (readyAtTick - currentTick) / TICK_RATE_HZ
    return Math.max(0, remaining)
  },
  getClassId: getCurrentClassId,
})

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
    // with a different mode would reset the match; keep the lobby state stable.
    pushPersistedLoadout()
  }
}

const menu = initMenu({
  onPlay: () => {
    loadoutReturnsToPause = false
    const isConfigured = localStorage.getItem('ragequit.profile.configured') === 'true'
    if (isConfigured) {
      pendingLaunchMode = null
      menu.hideMain()
      engageCanvasInput()
      requestArenaPointerLock()
      void connectWithMode('duel_arena', false)
    } else {
      pendingLaunchMode = 'duel_arena'
      menu.hideMain()
      loadoutStation.open()
    }
  },
  onFfa: () => {
    loadoutReturnsToPause = false
    const isConfigured = localStorage.getItem('ragequit.profile.configured') === 'true'
    if (isConfigured) {
      pendingLaunchMode = null
      menu.hideMain()
      engageCanvasInput()
      requestArenaPointerLock()
      void connectWithMode('ffa', false)
    } else {
      pendingLaunchMode = 'ffa'
      menu.hideMain()
      loadoutStation.open()
    }
  },
  onTraining: (difficulty) => {
    loadoutReturnsToPause = false
    const isConfigured = localStorage.getItem('ragequit.profile.configured') === 'true'
    if (isConfigured) {
      pendingLaunchMode = null
      menu.hideMain()
      engageCanvasInput()
      requestArenaPointerLock()
      void connectWithMode(`training_${difficulty}`, false)
    } else {
      pendingLaunchMode = `training_${difficulty}`
      menu.hideMain()
      loadoutStation.open()
    }
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
    mouseSensitivity.set(sens)
  },
  onVolumeChange: (vol) => {
    soundEngine.volume = vol
  },
  onGraphicsChange: (quality) => {
    const pixelRatioMap = { low: 1.0, med: 1.25, high: 1.5 }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioMap[quality]))
  },
})

// Call on startup — menu is now initialized, safe to call
initPlayerProfile()

// Re-run profile init once auth resolves (updates auth UI + stats from Supabase)
_supabaseAuthReady
  .then(() => { initPlayerProfile() })
  .catch((e: unknown) => console.warn('[supabase] auth init failed:', e))
setStatus('offline', 'rgba(200,200,200,0.35)')

// Register all keyboard/mouse/pointer event handlers now that loadoutStation,
// radialWheels, and menu are fully initialised.
const gameInput = initGameInput(inp, {
  rendererDomElement: renderer.domElement,
  mouseSensitivity,
  radialWheels,
  pitchLimits: { up: PITCH_UP_LIMIT, down: PITCH_DOWN_LIMIT },
  weaponIds: WEAPON_IDS,
  hint,
  pingHud,
  settingsOverlay,
  pauseMenu,
  loadoutStation,
  menu,
  getRoom: () => room,
  getCurrentMatchPhase: () => currentMatchPhase,
  getPlacementAbilityId: () => castDispatcher.getPlacementAbilityId(),
  getLoadoutReturnsToPause: () => loadoutReturnsToPause,
  setLoadoutReturnsToPause: (v) => {
    loadoutReturnsToPause = v
  },
  getPing: () => ping,
  getCurrentWeaponForInput: () => currentWeaponForInput(),
  getCurrentLoadout: () => currentLoadoutArray(),
  isGameplayInputAllowed: () => isGameplayInputAllowed(),
  canEngageGameplaySurface: () => canEngageGameplaySurface(),
  openPauseMenu: () => openPauseMenu(),
  closePauseMenu: (lock) => closePauseMenu(lock),
  cancelPlacementPreview: () => castDispatcher.cancelPlacementPreview(),
  activateAbilitySlot: (idx, fromWheel) => castDispatcher.activateAbilitySlot(idx, fromWheel),
  onClear: () => clearCombatInputEdges(),
})
const { engageCanvasInput, requestArenaPointerLock, sampleInput } = gameInput

async function connect(mode = 'duel_arena', reopenLoadout = true): Promise<void> {
  const seq = ++connectSeq
  setStatus('connecting', '#e4c05a')
  try {
    const client = new Client(SERVER_URL)
    const token = await getAccessToken().catch(() => null)
    // botFill=true → server spawns a bot opponent at match start.
    // 1v1 always gets a bot (no matchmaking yet). Training: server handles bot
    // via mode check. FFA: no bots — it's a multiplayer free-for-all.
    let resolvedMode = mode
    let difficulty = 'competent'
    if (mode.startsWith('training_')) {
      resolvedMode = 'training'
      difficulty = mode.replace('training_', '')
    }
    const email = getCurrentUserEmail()
    let initialName = ''
    if (email) {
      initialName = email.split('@')[0]?.toUpperCase() ?? 'USER'
    } else {
      const stored = localStorage.getItem('ragequit.profile.displayName')
      initialName = stored ? stored.trim().toUpperCase() : ''
    }
    const roomOptions: Record<string, unknown> = {
      mode: resolvedMode,
      difficulty,
      botFill: resolvedMode === 'duel_arena',
    }
    roomOptions['name'] = initialName || 'PLAYER'
    if (token) roomOptions['token'] = token
    const joinedRoom = await client.joinOrCreate('game', roomOptions)
    const mainMenuHidden =
      document.getElementById('main-menu')?.classList.contains('hidden') ?? false
    if (seq !== connectSeq || !mainMenuHidden) {
      void joinedRoom.leave()
      return
    }
    room = joinedRoom
    activeRoomMode = resolvedMode
    matchStartMs = performance.now()
    soundEngine.muted = false
    setStatus('connected', '#9be39b')
    trackMatchJoined(mode)
    console.info(
      `[ragequit-client] connected ${SERVER_URL} room=${joinedRoom.roomId} session=${joinedRoom.sessionId} mode=${mode}`,
    )
    // Push the persisted loadout immediately so server-side cooldowns
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

    joinedRoom.onMessage(
      MessageTypes.PongAck,
      (msg: { clientTime: number; serverTime: number }) => {
        if (!isCurrentRoom()) return
        ping = performance.now() - msg.clientTime
      },
    )

    joinedRoom.onMessage(MessageTypes.Hit, (msg: ServerHitMessage) => {
      if (isCurrentRoom()) onHit(msg)
    })
    joinedRoom.onMessage(MessageTypes.Death, (msg: ServerDeathMessage) => {
      if (isCurrentRoom()) onDeath(msg)
    })
    joinedRoom.onMessage(MessageTypes.ProjectileSpawned, (msg: ServerProjectileSpawnedMessage) => {
      if (isCurrentRoom()) projectileVfx.onSpawned(msg)
    })
    joinedRoom.onMessage(MessageTypes.ProjectileExpired, (msg: ServerProjectileExpiredMessage) => {
      if (isCurrentRoom()) projectileVfx.onExpired(msg)
    })
    joinedRoom.onMessage(MessageTypes.WeaponSwapped, (msg: ServerWeaponSwappedMessage) => {
      if (isCurrentRoom()) onWeaponSwapped(msg)
    })
    joinedRoom.onMessage(MessageTypes.ParryEvent, (msg: ServerParryEventMessage) => {
      if (!isCurrentRoom()) return
      // parry HUD is driven from schema (player.parrying / parryIsHold).
      // Play the metallic ring for the parrying player (self). Attackers and
      // bystanders hear it via onHit (didParry && !amISelf guard there).
      if (msg.playerId === self?.sessionId) soundEngine.playParry()
    })

    // Status / zone event listeners.
    joinedRoom.onMessage(MessageTypes.StatusApplied, (msg: ServerStatusAppliedMessage) => {
      if (isCurrentRoom()) statusOverlay.onStatusApplied(msg)
    })
    joinedRoom.onMessage(MessageTypes.StatusExpired, (msg: ServerStatusExpiredMessage) => {
      if (isCurrentRoom()) statusOverlay.onStatusExpired(msg)
    })
    joinedRoom.onMessage(MessageTypes.ZoneSpawned, (msg: ServerZoneSpawnedMessage) => {
      if (isCurrentRoom()) zoneVfx.onSpawned(msg)
    })
    joinedRoom.onMessage(MessageTypes.ZoneExpired, (msg: ServerZoneExpiredMessage) => {
      if (isCurrentRoom()) zoneVfx.onExpired(msg)
    })
    joinedRoom.onMessage(
      MessageTypes.AbilityCasted,
      (msg: { casterId: string; abilityId: string; atTick: number }) => {
        if (!isCurrentRoom()) return
        const def = ABILITY_DEFS[msg.abilityId]
        const isDash =
          def?.effects?.some(
            (e) => e.kind === 'move' && (e as { mode?: string }).mode === 'dash',
          ) ?? false
        // Play cast sound for self only; remote cast VFX stays driven by replicated events.
        if (msg.casterId === self?.sessionId) {
          soundEngine.playCast(def?.element ?? 'none')
          trackAbilityCast(msg.abilityId, def?.element ?? 'none')
          // Anchor cast bar to server ack time — eliminates RTT-induced desync.
          if (def && def.windupSec > 0) castStartedAtMs = performance.now()
          // Play Roll animation on dash abilities.
          if (isDash) selfRollingUntilMs = performance.now() + 400
        } else if (isDash) {
          // Trigger roll animation on the remote character that dashed.
          remotePlayerSystem.triggerRoll(msg.casterId, performance.now() + 400)
        }
      },
    )

    // Server notices — loadout rejections, room warnings, info toasts.
    joinedRoom.onMessage(MessageTypes.ServerNote, (msg: ServerNoteMessage) => {
      if (isCurrentRoom()) abilityFailHud.onServerNote(msg)
    })

    // Ability failed — visual feedback on rejection
    joinedRoom.onMessage(MessageTypes.AbilityFailed, (msg: ServerAbilityFailedMessage) => {
      if (isCurrentRoom()) abilityFailHud.onAbilityFailed(msg)
    })
    // Channel interrupted — clear cast bar immediately
    joinedRoom.onMessage(
      MessageTypes.ChannelInterrupted,
      (msg: ServerChannelInterruptedMessage) => {
        if (isCurrentRoom()) onChannelInterrupted(msg)
      },
    )

    // Kill streak events.
    joinedRoom.onMessage(MessageTypes.KillStreak, (msg: ServerKillStreakMessage) => {
      if (isCurrentRoom()) onKillStreak(msg)
    })

    // Match flow events
    joinedRoom.onMessage(MessageTypes.MatchPhase, (msg: ServerMatchPhaseMessage) => {
      if (!isCurrentRoom()) return
      applyMatchPhase(msg, joinedRoom.sessionId)
    })
    joinedRoom.onStateChange(() => syncMatchPhaseFromState(joinedRoom))
    syncMatchPhaseFromState(joinedRoom)
    joinedRoom.onMessage(MessageTypes.Score, (msg: ServerScoreMessage) => {
      if (!isCurrentRoom()) return
      const selfId = joinedRoom.sessionId
      let otherId = ''
      const players = getSchemaPlayers()
      players?.forEach((_p, sid) => {
        if (sid !== selfId) otherId = sid
      })
      if (msg.eloDeltas) lastMatchEloDeltas = msg.eloDeltas
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
  sendLoadout(room, loadoutStation.getLoadout(), loadoutStation.getClassId())
}

// -----------------------------------------------------------------------
// Hit / death feedback + projectile events
// -----------------------------------------------------------------------

function onHit(msg: ServerHitMessage): void {
  const amISelf = msg.victimId === self?.sessionId
  const amIAttacker = msg.attackerId === self?.sessionId
  const now = performance.now()
  const isAirPunish = isAirPunishCause(msg.cause)
  // Normalise power 0–1 against typical hit ceiling (~40 damage = full power).
  const power = Math.min(1, msg.damage / (isAirPunish ? 55 : 40))

  // Accumulate stats
  if (msg.damage > 0) {
    if (msg.didParry) {
      if (amISelf) {
        selfStats.parries++
      } else {
        opponentStats.parries++
      }
    } else {
      if (amIAttacker && !amISelf) {
        selfStats.damageDealt += msg.damage
        selfStats.yourHits++
        if (msg.cause === 'uppercut' || isAirPunish) {
          selfStats.knockups++
        }
        if (msg.cause.startsWith('combo:')) {
          selfStats.comboProcs++
        }
        const players = getSchemaPlayers()
        const opponent = players?.get(msg.victimId)
        const tickNow = getSchemaTick()
        if (opponent && opponent.airborneUntilTick > tickNow) {
          selfStats.knockupConversions++
        }
      } else if (amISelf && !amIAttacker) {
        selfStats.damageTaken += msg.damage
        const tickNow = getSchemaTick()
        const players = getSchemaPlayers()
        const selfSchema = players?.get(self?.sessionId || '')
        if (selfSchema && selfSchema.airborneUntilTick > tickNow) {
          opponentStats.knockupConversions++
        }

        // Cache victim hit details for deathcam
        const killerName = players?.get(msg.attackerId)?.name || msg.attackerId.slice(0, 6)
        lastHitDetails = {
          killer: killerName,
          ability: ABILITY_DEFS[msg.cause]?.name || msg.cause.toUpperCase(),
          element: msg.element || 'PHYSICAL',
          damage: msg.damage,
        }
      } else {
        // Opponent or other players
        if (msg.attackerId !== self?.sessionId && msg.attackerId !== '') {
          opponentStats.damageDealt += msg.damage
          opponentStats.yourHits++
          if (msg.cause === 'uppercut' || isAirPunish) {
            opponentStats.knockups++
          }
          if (msg.cause.startsWith('combo:')) {
            opponentStats.comboProcs++
          }
        }
        if (msg.victimId !== self?.sessionId) {
          opponentStats.damageTaken += msg.damage
        }
      }
    }
  }

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

    if (isAirPunish) {
      soundEngine.playCrack(Math.max(power, 0.85))
      combatFeedHud.triggerComboFlash()
      combatFeedHud.showComboPopupLabel('AIR PUNISH')
      hitStopUntilMs = now + hitstopAttacker(msg.cause)
      applyDirectionalShake(getPlayerWorldPos(msg.victimId), 1.0)
      localComboCount = 0
    } else if (localComboCount >= 3) {
      // ── CRACK ── strong hit, golden flash, COMBO popup, max shake.
      soundEngine.playCrack(power)
      combatFeedHud.triggerComboFlash()
      combatFeedHud.showComboPopupText(localComboCount)
      hitStopUntilMs = now + 80 // longer stop for crack
      applyDirectionalShake(getPlayerWorldPos(msg.victimId), 0.9)
      localComboCount = 0 // reset after crack
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
    selfHitReactUntilMs = now + 600 // trigger hit-react animation for 600 ms
  }

  // --- Observer: world-space impact sound (attenuated) ---
  if (!amIAttacker && !amISelf && msg.damage > 0 && !msg.didParry) {
    soundEngine.playHitByType(msg.cause, power * 0.7)
  }

  // --- Hitmarker ---
  if (amIAttacker && !amISelf && msg.damage > 0) hitFeedback.showHitmarker()

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
      const shakeIntensity =
        msg.cause === 'sword_m1' || msg.cause === 'uppercut'
          ? Math.min(1.2, msg.damage / 25) // melee hits harder
          : Math.min(1, msg.damage / 30)
      applyDirectionalShake(attackerPos, shakeIntensity)
      hitFeedback.showDirectionalHit(attackerPos)
      triggerDamageBlink()
    }
  }

  // --- World-space impact VFX — melee, projectile, combo, parry ---
  {
    const vicPos = getPlayerWorldPos(msg.victimId)
    const attPos = getPlayerWorldPos(msg.attackerId)
    const midpoint =
      attPos && vicPos
        ? new THREE.Vector3(
            (attPos.x + vicPos.x) * 0.5,
            (attPos.y + vicPos.y) * 0.5,
            (attPos.z + vicPos.z) * 0.5,
          )
        : vicPos
          ? new THREE.Vector3(vicPos.x, vicPos.y, vicPos.z)
          : null

    if (midpoint) {
      const cause = msg.cause
      if (msg.didParry) {
        // Parry spark — bright silver flash at contact midpoint.
        spawnImpact(midpoint, 0xddeeff, 'parry')
      } else if (msg.damage > 0) {
        // Air punish — extra burst directly at victim height.
        if (isAirPunish && vicPos) {
          spawnImpact(new THREE.Vector3(vicPos.x, vicPos.y + 0.3, vicPos.z), 0xff8844, 'melee')
          spawnImpact(new THREE.Vector3(vicPos.x, vicPos.y + 0.6, vicPos.z), 0xff4422, 'magic')
        }
        if (
          cause === 'sword_m1' ||
          cause === 'uppercut' ||
          cause === 'gap_closer' ||
          cause === 'bleed_strike' ||
          cause === 'guard_break' ||
          cause === 'rending_dash' ||
          cause === 'whirlwind'
        ) {
          // Melee — gold spark.
          spawnImpact(midpoint, 0xffcc44, 'melee')
        } else if (
          cause === 'bow_m1' ||
          cause === 'piercing_shot' ||
          cause === 'pin_shot' ||
          cause === 'marksman_shot' ||
          cause === 'broadhead' ||
          cause === 'blast_arrow' ||
          cause === 'volley' ||
          cause === 'disengage_shot' ||
          cause === 'snare_trap'
        ) {
          // Bow / arrow — amber.
          spawnImpact(midpoint, 0xf08020, 'pierce')
        } else if (cause.startsWith('combo:')) {
          // Status combo reactions — element-specific colour.
          spawnImpact(midpoint, elementToImpactColor(msg.element, cause))
        } else if (
          cause.startsWith('zone:') ||
          cause.startsWith('dot:') ||
          cause.startsWith('status:')
        ) {
          // Zone / DoT ticks — small element-coloured pulse at victim.
          if (vicPos)
            spawnImpact(
              new THREE.Vector3(vicPos.x, vicPos.y + 0.5, vicPos.z),
              elementToImpactColor(msg.element, cause),
              'tick',
            )
        } else {
          // All other magic / ability hits — element-coloured impact.
          spawnImpact(midpoint, elementToImpactColor(msg.element, cause))
        }
      }
    }
  }

  const victimPos = getPlayerWorldPos(msg.victimId)
  if (victimPos) {
    hitFeedback.showDamagePopup(victimPos, msg.damage, amISelf, msg.didParry, msg.element, {
      airPunish: isAirPunish && amIAttacker && !amISelf,
    })
  }
  // Trigger white blink on the victim's remote character mesh so hits feel impactful.
  if (!amISelf && msg.damage > 0 && !msg.didParry) {
    remotePlayerSystem.setDamageBlink(msg.victimId, performance.now() + 160)
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

  combatFeedHud.addKillFeedEntry(killerName, victimName, isSelfKill, isSelfDied)

  // Track match score stats
  if (isSelfKill) {
    selfStats.kills++
  } else if (msg.killerId !== '' && msg.killerId !== selfId) {
    opponentStats.kills++
  }

  // World-space death burst — red particle explosion at victim position.
  const deathPos = getPlayerWorldPos(msg.victimId)
  if (deathPos) deathBurstVfx.spawn(deathPos, isSelfKill && !isSelfDied)

  if (isSelfKill && !isSelfDied) trackKill(msg.cause ?? 'unknown')
  if (isSelfDied) {
    trackDeath(msg.cause ?? 'unknown')
    lastKillerName = killerName
    soundEngine.playDeath()
    applyDirectionalShake(null, 1.4) // max intensity on death
    hitFeedback.showDirectionalHit(null)
    combatFeedHud.showKillSplash('ELIMINATO', 'died')
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
    castDispatcher.clearQueue()
  } else if (isSelfKill) {
    soundEngine.playKill()
    const now = performance.now()
    recentKillTimes.push(now)
    // Keep only kills within the last 8 seconds.
    while (recentKillTimes.length > 0 && now - recentKillTimes[0]! > 8000) recentKillTimes.shift()
    const streak = recentKillTimes.length
    if (streak >= 4) combatFeedHud.showKillSplash('ULTRA KILL!', 'kill')
    else if (streak === 3) combatFeedHud.showKillSplash('TRIPLE KILL!', 'kill')
    else if (streak === 2) combatFeedHud.showKillSplash('DOUBLE KILL!', 'kill')
    else combatFeedHud.showKillSplash('KILL!', 'kill')
  }
}

function onKillStreak(msg: ServerKillStreakMessage): void {
  const selfId = self?.sessionId ?? ''
  combatFeedHud.updateKillStreak(msg, selfId)
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

function onWeaponSwapped(msg: ServerWeaponSwappedMessage): void {
  if (msg.playerId !== self?.sessionId) return
  if (inp.optimisticWeapon === msg.weapon) inp.optimisticWeapon = null
  // Highlight is driven from schema in render(), but we reset local input
  // state here so a charge straddling a swap is cleaned up.
  if (self) {
    self.bowChargeStartMs = 0
    self.bowChargeServerAcked = false
  }
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

function disposeObject3D(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose()
      if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose())
      else (child.material as THREE.Material).dispose()
    }
  })
}

function clearSelfVisuals(): void {
  if (selfMesh) {
    disposeCharacterMixer(selfMesh) // stop AnimationMixer before geo dispose
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
  comboPopup.classList.remove('pop')
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
  if (radialWheels.isOpen()) radialWheels.close(false)
  inp.keys.clear()
  inp.jumpEdgeQueued = false
  inp.lmbPressEdge = false
  inp.lmbReleaseEdge = false
  inp.lmbDown = false
  inp.rmbPressEdge = false
  inp.rmbReleaseEdge = false
  inp.weaponSwapRequest = null
  inp.optimisticWeapon = null
  castDispatcher.clearQueue()
  radialWheels.refreshAll()
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
  clearGameplayInputState()
  clearGameplayUi()
  projectileVfx.clear()
  zoneVfx.clear()
  remotePlayerSystem.clear()
  clearSelfVisuals()
}

function returnToMainMenu(opts: { leaveRoom: boolean; statusText?: string }): void {
  connectSeq++
  const leavingRoom = room
  if (leavingRoom)
    trackMatchLeft(
      (leavingRoom.state?.['mode'] as string) ?? 'unknown',
      (performance.now() - matchStartMs) / 1000,
    )
  room = null
  activeRoomMode = 'duel_arena'
  self = null
  clearLocalMatchState()
  if (document.pointerLockElement) document.exitPointerLock()
  pauseMenu.classList.add('hidden')
  settingsOverlay.classList.add('hidden')
  settingsOverlay.dataset['returnTo'] = ''
  loadoutStation.close()
  menu.hideScoreboard()
  menu.showMain()
  if (opts.statusText)
    setStatus(opts.statusText, opts.statusText === 'disconnected' ? '#e87070' : '#e4c05a')
  if (opts.leaveRoom && leavingRoom) void leavingRoom.leave()
}

function returnToTrainingScoreboard(): void {
  if (!room) return
  const selfId = room.sessionId

  if (document.pointerLockElement) document.exitPointerLock()

  pauseMenu.classList.add('hidden')
  settingsOverlay.classList.add('hidden')
  settingsOverlay.dataset['returnTo'] = ''
  loadoutStation.close()

  const players = getSchemaPlayers()
  const selfSchema = players?.get(selfId)

  let otherId = ''
  players?.forEach((_p, sid) => {
    if (sid !== selfId) otherId = sid
  })
  const otherSchema = otherId ? players?.get(otherId) : null

  const selfName = selfSchema?.name || 'Player'
  const opponentName = otherSchema?.name || 'Opponent'

  const selfClassId = selfSchema?.classId || 'hybrid'
  const selfBuild = `${selfClassId.toUpperCase()} · ${selfSchema?.activeWeapon?.toUpperCase() || 'SWORD'}`

  const oppClassId = otherSchema?.classId || 'hybrid'
  const oppBuild = `${oppClassId.toUpperCase()} · ${otherSchema?.activeWeapon?.toUpperCase() || 'SWORD'}`

  const isWin = selfStats.kills >= opponentStats.kills
  const eloDelta = 0
  const eloBefore = ELO_STARTING

  const arenaName = getSchemaMapId()
  const matchMs = performance.now() - matchStartMs

  const scoreboardData: ScoreboardData = {
    arena: arenaName.toUpperCase(),
    matchMs: matchMs > 0 ? matchMs : 120000,
    rounds: 'PRACTICE',
    league: 'NO RANKED ELO',
    winner: isWin
      ? {
          name: selfName,
          build: selfBuild,
          kills: selfStats.kills,
          damageDealt: selfStats.damageDealt,
          damageTaken: selfStats.damageTaken,
          knockups: `${selfStats.knockupConversions} / ${selfStats.knockupAttempts}`,
          parries: selfStats.parries,
          comboProcs: selfStats.comboProcs,
          abilitiesUsed: selfStats.abilitiesUsed,
        }
      : {
          name: opponentName,
          build: oppBuild,
          kills: opponentStats.kills,
          damageDealt: opponentStats.damageDealt,
          damageTaken: opponentStats.damageTaken,
          knockups: `${opponentStats.knockupConversions} / ${opponentStats.knockupAttempts}`,
          parries: opponentStats.parries,
          comboProcs: opponentStats.comboProcs,
          abilitiesUsed: opponentStats.abilitiesUsed,
        },
    loser: isWin
      ? {
          name: opponentName,
          build: oppBuild,
          kills: opponentStats.kills,
          damageDealt: opponentStats.damageDealt,
          damageTaken: opponentStats.damageTaken,
          knockups: `${opponentStats.knockupConversions} / ${opponentStats.knockupAttempts}`,
          parries: opponentStats.parries,
          comboProcs: opponentStats.comboProcs,
          abilitiesUsed: opponentStats.abilitiesUsed,
        }
      : {
          name: selfName,
          build: selfBuild,
          kills: selfStats.kills,
          damageDealt: selfStats.damageDealt,
          damageTaken: selfStats.damageTaken,
          knockups: `${selfStats.knockupConversions} / ${selfStats.knockupAttempts}`,
          parries: selfStats.parries,
          comboProcs: selfStats.comboProcs,
          abilitiesUsed: selfStats.abilitiesUsed,
        },
    eloBefore,
    eloDelta,
  }

  menu.showScoreboard(selfId, scoreboardData)

  const leavingRoom = room
  room = null
  activeRoomMode = 'duel_arena'
  self = null
  clearLocalMatchState()
  if (leavingRoom) void leavingRoom.leave()
}

function getPlayerWorldPos(sid: string): THREE.Vector3 | null {
  if (sid === self?.sessionId && selfMesh) {
    return selfMesh.position.clone().add(new THREE.Vector3(0, CAPSULE_HALF_HEIGHT_M, 0))
  }
  return remotePlayerSystem.getWorldPos(sid)
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
  selfMesh = makeCharacter(0x3a8fde, toonGradient) // self = blue (standard: I am blue)
  scene.add(selfMesh)
  loadCharacterGlb(selfMesh, 0x3a8fde, toonGradient, p.classId)
  selfArc = makeSwingArcMesh()
  scene.add(selfArc)
  inp.mouseYaw = p.transform.yaw
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
  classId: string
  furyStacks: number
  furyNextMeleeIsSurge: boolean
  momentum: number
  risonanzaElement: string
  risonanzaArmedUntilTick: number
  flowStacks: number
  flowPendingBonus: boolean
  gcdReadyAtTick: number
  momentumTicks: number
  jumpHoldTicksLeft: number
  coyoteTicksLeft: number
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

function getSchemaMode(): string {
  if (!room?.state) return 'duel_arena'
  return (room.state as { mode?: string }).mode ?? 'duel_arena'
}

function sendAbilityCast(abilityId: string, tick: number): void {
  if (!room) return
  const msg: ClientCastMessage = {
    abilityId,
    atTick: tick,
    targetYaw: inp.mouseYaw,
    targetPitch: inp.mousePitch,
    targetPoint: placementPreview.aimPoint(abilityId),
  }
  room.send(MessageTypes.Cast, msg)
  cooldownStrip.markPending(abilityId)
  showShootFlash()

  selfStats.abilitiesUsed[abilityId] = (selfStats.abilitiesUsed[abilityId] ?? 0) + 1
  if (['uppercut', 'eruption', 'arc_lift', 'frost_pillar'].includes(abilityId)) {
    selfStats.knockupAttempts++
  }
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
  if (dead && castDispatcher.getPlacementAbilityId()) castDispatcher.cancelPlacementPreview()
  if (inp.optimisticWeapon && selfSchema?.activeWeapon === inp.optimisticWeapon)
    inp.optimisticWeapon = null
  const activeWeapon: Weapon = currentWeaponForInput()
  const combatLive = currentMatchPhase === 'live'
  if (!combatLive && self.bowChargeStartMs > 0) {
    self.bowChargeStartMs = 0
    self.bowChargeServerAcked = false
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
  }

  // Jump sound — fire exactly once per jump edge (not every tick).
  if (input.jump) soundEngine.playJump()

  simulatePlayer(self.sim, input, DT, getMap(getActiveMapId() || 'blockout'), caps)

  self.pending.push({ seq: seqCounter, input, dt: DT, caps })
  if (self.pending.length > 240) self.pending.splice(0, self.pending.length - 240)

  // --- Weapon swap (tick-aligned) -----------------------------------------
  if (inp.weaponSwapRequest && combatLive && !dead) {
    const msg: ClientWeaponSwapMessage = {
      weapon: inp.weaponSwapRequest,
      atTick: schemaTick + 1,
    }
    room.send(MessageTypes.WeaponSwap, msg)
    inp.optimisticWeapon = inp.weaponSwapRequest
    // If we swapped away from bow mid-charge, close the local HUD draw so
    // the bar disappears immediately.
    if (inp.weaponSwapRequest !== 'bow') {
      self.bowChargeStartMs = 0
      self.bowChargeServerAcked = false
    }
  }
  inp.weaponSwapRequest = null

  castDispatcher.dispatch({
    inp,
    bowCharge: self,
    room,
    schemaTick,
    combatLive,
    dead,
    activeWeapon,
  })

  // --- Input message ------------------------------------------------------
  const inMsg: ClientInputMessage = {
    tick: schemaTick + 1,
    seq: seqCounter,
    moveX: input.moveX,
    moveZ: input.moveZ,
    yaw: input.yaw,
    pitch: inp.mousePitch,
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
    remotePlayerSystem.updateFromSchema(
      players as unknown as Map<string, RemotePlayerSchema>,
      self.sessionId,
      now,
      schemaTick,
      (tick) => {
        if (selfArc && tick !== cachedSelfSwingTick) {
          cachedSelfSwingTick = tick
          selfArc.visible = true
          selfArcExpiresAt = now + 400
        }
      },
    )
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
    jumpHoldTicksLeft: p.jumpHoldTicksLeft ?? 0,
    stamina: p.stamina,
    coyoteTicksLeft: p.coyoteTicksLeft ?? 0,
    momentumTicks: p.momentumTicks ?? 0,
  }

  const predictedBefore = { x: self.sim.pos.x, y: self.sim.pos.y, z: self.sim.pos.z }
  self.sim = serverState
  // Replay only the unacknowledged in-flight inputs, each with the caps that
  // were active at send time so root/slow/stun match the server's computation.
  for (const e of self.pending)
    simulatePlayer(self.sim, e.input, e.dt, getMap(getActiveMapId() || 'blockout'), e.caps)

  const dx = self.sim.pos.x - predictedBefore.x
  const dy = self.sim.pos.y - predictedBefore.y
  const dz = self.sim.pos.z - predictedBefore.z
  self.lastPredictionDelta = Math.hypot(dx, dy, dz)
  self.lastAckSeq = ackSeq
}

const simTimer = setInterval(simStep, TICK_MS)

const renderPos = new THREE.Vector3()
let renderPosInitialized = false

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
  placementPreview.update(now)

  // Hit-stop flag — particle animation and camera lerp are frozen during it.
  // Covers both attacker-side (landed a hit) and victim-side (received a hit).
  const inHitStop = now < hitStopUntilMs || now < victimHitStopUntilMs
  // Brief exposure boost during hit-stop for impactful "crunch" feel.
  const targetExposure = inHitStop ? 1.45 : 1.1
  renderer.toneMappingExposure += (targetExposure - renderer.toneMappingExposure) * 0.28

  animateArena(now, dt, inHitStop)

  const selfSchema = getSelfSchemaPlayer()
  const tickNow = getSchemaTick()
  const airborne = !!selfSchema && selfSchema.airborneUntilTick > tickNow
  const dead = !!selfSchema && !selfSchema.alive

  if (getRoomMode() === 'training' && dead && !selfPrevDead) {
    returnToTrainingScoreboard()
    selfPrevDead = dead
    return
  }

  // Detect dead → alive transition to trigger the Respawn animation.
  if (selfPrevDead && !dead) selfRespawnUntilMs = now + 1500
  selfPrevDead = dead

  // Detect onGround transitions for jump take-off and landing animations.
  // Use the client-predicted onGround (self.sim.onGround) for instant response.
  // Treat dead/uninitialised self as grounded for camera stability.
  const selfOnGround = dead || !self || self.sim.onGround
  if (!dead) {
    if (selfPrevOnGround && !selfOnGround) selfJumpUntilMs = now + 500 // left ground
    if (!selfPrevOnGround && selfOnGround) selfLandUntilMs = now + 400 // landed
  }
  selfPrevOnGround = selfOnGround

  // Bow charge ratio — computed here (outer scope) so both the camera FOV
  // zoom and the charge HUD bar can consume it without duplicating the math.
  let bowChargeRatio = 0
  if (self && self.bowChargeStartMs > 0) {
    const wSchemaOuter =
      selfSchema && isWeapon(selfSchema.activeWeapon) ? selfSchema.activeWeapon : 'sword'
    if (wSchemaOuter === 'bow') {
      const elapsed = (now - self.bowChargeStartMs) / 1000
      bowChargeRatio =
        elapsed <= BOW_CHARGE_MIN_SEC
          ? 0
          : Math.min(1, (elapsed - BOW_CHARGE_MIN_SEC) / (BOW_CHARGE_FULL_SEC - BOW_CHARGE_MIN_SEC))
    }
  }

  // Self render.
  if (self && selfMesh) {
    if (selfSchema) {
      const currentClassId = selfSchema.classId || 'hybrid'
      if (selfMesh.userData['loadedClassId'] !== currentClassId) {
        loadCharacterGlb(selfMesh, 0x3a8fde, toonGradient, currentClassId)
      }
    }
    // Hide own capsule when dead (you see the respawn overlay instead) and
    // when the camera is very close so you never clip through your own head.
    selfMesh.visible = !dead

    const distToSim = Math.hypot(self.sim.pos.x - renderPos.x, self.sim.pos.y - renderPos.y, self.sim.pos.z - renderPos.z)
    if (dead && selfSchema) {
      renderPos.set(selfSchema.transform.x, selfSchema.transform.y, selfSchema.transform.z)
      renderPosInitialized = true
    } else if (!renderPosInitialized || distToSim > 10) {
      renderPos.set(self.sim.pos.x, self.sim.pos.y, self.sim.pos.z)
      renderPosInitialized = true
    } else {
      const lerpSpeed = 50
      const lerpFactor = Math.min(1, lerpSpeed * dt)
      renderPos.x += (self.sim.pos.x - renderPos.x) * lerpFactor
      renderPos.y += (self.sim.pos.y - renderPos.y) * lerpFactor
      renderPos.z += (self.sim.pos.z - renderPos.z) * lerpFactor
    }

    const x = renderPos.x
    const y = renderPos.y
    const z = renderPos.z
    // Idle breathing bob — tiny vertical sine when grounded, skipped airborne.
    const idleBob = !airborne && !dead ? Math.sin(now * 0.0028) * 0.014 : 0
    selfMesh.position.set(x, y + idleBob, z)
    selfMesh.rotation.y = inp.mouseYaw

    const wSchema =
      selfSchema && isWeapon(selfSchema.activeWeapon) ? selfSchema.activeWeapon : 'sword'

    // Drive character animations
    tickCharacterMixer(selfMesh, dt)
    const selfSpeed = Math.hypot(self.sim.vel.x, self.sim.vel.z)
    setCharAnimState(selfMesh, {
      moving: selfSpeed > 0.3,
      speed: selfSpeed,
      activeWeapon: wSchema,
      attacking: !!(selfArc?.visible && now < selfArcExpiresAt),
      attackVariant: selfSchema?.comboIndex ?? 0,
      airborne,
      bowCharging:
        wSchema === 'bow' &&
        (self.bowChargeStartMs > 0 || (selfSchema?.bowChargeStartTick ?? 0) > 0),
      casting: !!selfSchema?.casting && selfSchema.castEndsAtTick > tickNow,
      channeling:
        !!selfSchema?.casting &&
        selfSchema.castEndsAtTick > tickNow &&
        (ABILITY_DEFS[selfSchema.castAbilityId]?.effects?.some((e) => e.kind === 'channel') ??
          false),
      alive: !dead,
      parrying: !!selfSchema?.parrying,
      hitReact: !dead && now < selfHitReactUntilMs,
      respawning: now < selfRespawnUntilMs,
      jumping: !dead && now < selfJumpUntilMs,
      landing: !dead && now < selfLandUntilMs,
      rolling: !dead && now < selfRollingUntilMs,
    })

    // Follow-light tracks the player's torso level.
    playerLight.position.set(x, y + 0.5 + idleBob, z)

    // Per-weapon camera:
    // Sword keeps an over-shoulder view for melee spacing. Bow and staff are
    // first-person precision weapons, so their aim must match the crosshair.
    // Update weapon prop if weapon changed.
    if (wSchema !== selfLastWeapon) {
      selfLastWeapon = wSchema
      applyWeaponProp(selfMesh, wSchema, toonGradient)
    }
    const firstPersonWeapon = wSchema === 'bow' || wSchema === 'staff'
    const wBackTarget = firstPersonWeapon ? 0 : 5.5
    const wUpTarget = firstPersonWeapon ? PROJECTILE_MUZZLE_Y_OFFSET_M : 1.3

    // Bow ADS narrows more while drawn; staff keeps a crisp FPS FOV.
    const wFovTarget =
      wSchema === 'bow'
        ? settingsFovBase - 7 - bowChargeRatio * 5
        : wSchema === 'staff'
          ? settingsFovBase - 3
          : settingsFovBase
    const CAM_LERP = inHitStop ? 0 : 0.12
    camBack += (wBackTarget - camBack) * CAM_LERP
    camUp += (wUpTarget - camUp) * CAM_LERP
    camFovBase += (wFovTarget - camFovBase) * CAM_LERP

    selfMesh.visible = !dead && !firstPersonWeapon
    firstPersonViewModel.visible = !dead && firstPersonWeapon
    setParryShieldState(selfMesh, !dead && !!selfSchema?.parrying, !!selfSchema?.parryIsHold, now)
    setParryShieldState(
      firstPersonParryShield,
      !dead && firstPersonWeapon && !!selfSchema?.parrying,
      !!selfSchema?.parryIsHold,
      now,
    )
    if (firstPersonWeapon && firstPersonViewWeapon !== wSchema) rebuildFirstPersonViewModel(wSchema)
    if (!firstPersonWeapon && firstPersonViewModel.visible) firstPersonViewModel.visible = false

    if (firstPersonWeapon) {
      camera.position.set(x, y + camUp, z)
      camera.rotation.set(inp.mousePitch, inp.mouseYaw, 0, 'YXZ')
    } else {
      // Stable third-person orbit. Yaw controls the shoulder/back position;
      // pitch controls only the look target so the camera never dives down.
      const back = new THREE.Vector3(
        Math.sin(inp.mouseYaw) * camBack,
        0,
        Math.cos(inp.mouseYaw) * camBack,
      )
      camera.position.set(x + back.x, y + camUp, z + back.z)
    }

    // Clamp camera above ground so it never clips underground.
    const groundFloor = getMap(getActiveMapId() || 'blockout').groundY
    if (camera.position.y < groundFloor + 0.4) camera.position.y = groundFloor + 0.4

    if (!firstPersonWeapon) {
      const aimForward = new THREE.Vector3(0, 0, -1).applyEuler(
        new THREE.Euler(inp.mousePitch, inp.mouseYaw, 0, 'YXZ'),
      )
      const lookDistance = 10
      const lookY = y + CAPSULE_HALF_HEIGHT_M * 0.85
      camera.lookAt(
        x + aimForward.x * lookDistance,
        lookY + aimForward.y * lookDistance,
        z + aimForward.z * lookDistance,
      )
    }

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
    // Primed crosshair accent — subtle gold ring when an ability is ready to fire on LMB.
    const primedIdx = castDispatcher.getPrimedSlotIdx()
    if (primedIdx !== null) crosshairEl.setAttribute('data-primed', 'true')
    else crosshairEl.removeAttribute('data-primed')

    if (selfArc) {
      if (selfArc.visible && now < selfArcExpiresAt) {
        const life = 1 - (selfArcExpiresAt - now) / 400
        selfArc.position.set(x, y, z)
        // SWING_ARC_YAW_OFFSET = π/2 + halfConeAngle centres the TorusGeometry
        // arc on the player's forward direction (−sin(yaw), 0, −cos(yaw)).
        // Derivation: arc centre at thetaLength/2 in local XY → after
        // rotation.set(PI/2, ry, 'YXZ') lands at (cos(ry−half), 0, −sin(ry−half)).
        // ry = yaw + π/2 + half makes that equal to forward. ✓
        selfArc.rotation.set(Math.PI / 2, inp.mouseYaw + SWING_ARC_YAW_OFFSET, 0, 'YXZ')
        ;(selfArc.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - life)
      } else {
        selfArc.visible = false
      }
    }
  } else if (
    document.body.classList.contains('main-menu-active') ||
    document.body.classList.contains('loadout-active')
  ) {
    // Before a room exists there is no player camera to frame the menu canvas.
    // Keep the arena readable instead of leaving the camera at ground origin.
    const orbit = now * 0.00008
    camera.position.set(Math.cos(orbit) * 38, 17, Math.sin(orbit) * 38)
    camera.lookAt(0, 2.4, 0)
    if (camera.fov !== 72) {
      camera.fov = 72
      camera.updateProjectionMatrix()
    }
  }

  remotePlayerSystem.renderFrame(now, camera, renderer.domElement)

  const proj = getSchemaProjectiles()
  if (proj) projectileVfx.renderFrame(proj as Map<string, SchemaProjectile>, now, dbgProj)

  impactVfx.update(now)
  deathBurstVfx.update(now)

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
  if (inp.optimisticWeapon && selfSchema?.activeWeapon === inp.optimisticWeapon)
    inp.optimisticWeapon = null
  const activeWeapon: Weapon = currentWeaponForInput()
  dbgWeapon.textContent = activeWeapon
  for (const w of WEAPON_IDS) {
    weaponSlots[w].classList.toggle('active', w === activeWeapon)
  }

  combatOverlayHud.update({
    now,
    tickNow,
    bowChargeRatio,
    activeWeapon,
    dead,
    selfBowChargeStartMs: self?.bowChargeStartMs ?? 0,
    selfBowChargeServerAcked: self?.bowChargeServerAcked ?? false,
    serverCharging: !!selfSchema && selfSchema.bowChargeStartTick > 0,
    selfSchema: selfSchema ?? null,
    livePhaseStartTick,
    // Round timer shown only for modes with server-side round logic (duel_arena, blockout, 1v1).
    // Training and kill-based modes (ffa, 5v5) have no server round timer.
    isRoundMode: ['duel_arena', 'blockout', '1v1'].includes(getSchemaMode()),
    clearBowCharge: () => {
      if (self) {
        self.bowChargeStartMs = 0
        self.bowChargeServerAcked = false
      }
    },
  })

  zoneVfx.animateFrame(now)

  selfEmissive.update(now, tickNow, selfSchema ?? null, selfDamageBlinkUntilMs)

  remotePlayerSystem.renderEmissives(
    now,
    tickNow,
    STATUS_EMISSIVE,
    () => getSchemaPlayers() as unknown as Map<string, RemotePlayerSchema> | null,
  )

  const deathcamData: DeathcamData = {
    killer: lastHitDetails.killer || lastKillerName || 'ANONYMOUS',
    ability: lastHitDetails.ability || 'PHYSICAL',
    element: lastHitDetails.element || 'PHYSICAL',
    damage: lastHitDetails.damage || 0,
    round: `${selfStats.kills + opponentStats.kills + 1} / 3`,
    yourDamage: selfStats.damageDealt,
    yourHits: selfStats.yourHits,
    yourProcs: selfStats.comboProcs,
    yourParries: selfStats.parries,
    timeToNextMs: 5000,
  }

  selfHud.update({
    selfSchema,
    now,
    tickNow,
    castStartedAtMs,
    placementAbilityId: castDispatcher.getPlacementAbilityId(),
    primedSlotIdx: castDispatcher.getPrimedSlotIdx(),
    lastKillerName,
    selfMesh,
    getCurrentLoadout: currentLoadoutArray,
    getCurrentClassId,
    setCastStartedAt: (ms) => {
      castStartedAtMs = ms
    },
    clearPrimedSlot: () => {
      castDispatcher.clearQueue()
    },
    cancelPlacementPreview: () => castDispatcher.cancelPlacementPreview(),
    deathcamData,
  })

  renderer.render(scene, camera)
  // Update draw call counter every frame (shown in debug panel, ` key).
  dbgDraws.textContent = String(renderer.info.render.calls)
  requestAnimationFrame(render)
}

addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  draggableHud.refreshBounds()
})

addEventListener('beforeunload', () => {
  clearInterval(simTimer)
  room?.leave()
})

requestAnimationFrame(render)
