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
  TARGET_CLASS_DEFS,
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
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

import { SoundEngine } from './audio/sound-engine.js'
import { type DeathcamData } from './endgame.js'
import { type ComboState, victimShakeIntensity, COMBO_RESET_MS } from './game/combat-feedback.js'
import { accumulateHitStats } from './game/hit-stats.js'
import {
  rawCauseId,
  isAirPunishCause,
  hitstopAttacker,
  hitstopVictim,
  elementToImpactColor,
} from './game/hitstop.js'
import { matchSM } from './game/match-state-machine.js'
import { reconcilePrediction } from './game/prediction.js'
import { createSchemaAccessors } from './game/schema-helpers.js'
import { buildScoreboardData } from './game/scoreboard-data.js'
import {
  type MatchStats,
  emptyMatchStats,
  recordAbilityCast,
  computeEloDelta,
} from './game/stats-tracker.js'
import {
  disposeObject3D,
  applyDirectionalShake as _applyDirectionalShake,
} from './game/visual-helpers.js'
import { initAbilityFailHud } from './hud/ability-fail-hud.js'
import { initCooldownStrip, ELEMENT_COLOR } from './hud/cd-strip.js'
import { createCombatFeedHud } from './hud/combat-feed.js'
import { initCombatOverlayHud } from './hud/combat-overlay-hud.js'
import { createHudFlash } from './hud/flash.js'
import { initHitFeedback } from './hud/hit-feedback.js'
import { initDraggableHud } from './hud/hud-drag.js'
import { initSelfHud } from './hud/self-hud.js'
import { initStatusOverlay } from './hud/status-overlay.js'
import { showTutorialIfFirstTime } from './hud/tutorial.js'
import { ensureIconSprite, weaponIcon } from './icons.js'
import { initCastDispatcher } from './input/cast-dispatcher.js'
import { initGameInput, makeGameInputState } from './input/game-input.js'
import { actionLabel, onKeybindsChanged } from './input/keybinds.js'
import { initRadialWheels } from './input/radial-wheels.js'
import { initMouseSensitivity } from './input/sensitivity.js'
import { initLoadoutStation } from './loadout-station.js'
import { createAccountUi } from './menu/account-ui.js'
import { initMenu } from './menu.js'
import { sendLoadout } from './net/loadout-sync.js'
import { createSchemaReaders } from './net/schema-readers.js'
import { initSupabaseAuth, getAccessToken, getCurrentUserEmail } from './net/supabase-auth.js'
import {
  showLoadingScreen,
  hideLoadingScreen,
  preloadMatchAssets,
  preloadOtherClassesBackground,
} from './preloader.js'
import {
  makeCharacter,
  applyWeaponProp,
  loadCharacterGlb,
  tickCharacterMixer,
  setCharAnimState,
  disposeCharacterMixer,
  makeParryShieldVisual,
  setParryShieldState,
  applyParryArmPose,
} from './render/characters.js'
import { makeSwingArcMesh, makeToonGradient, SWING_ARC_YAW_OFFSET } from './render/factories.js'
import { createFpvBow } from './render/fpv-bow.js'
import { createFpvStaticViewmodel } from './render/fpv-static-viewmodel.js'
import { initPlacementPreview } from './render/placement-preview.js'
import { initProjectileVisuals, type SchemaProjectile } from './render/projectile-visuals.js'
import { initRemotePlayers, type RemotePlayerSchema } from './render/remote-players.js'
import { initSelfEmissive, STATUS_EMISSIVE } from './render/self-emissive.js'
import { VfxTextures } from './render/vfx-textures.js'
import { getWeaponView } from './render/weapon-view.js'
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

const dbgPanel = document.getElementById('debug')!
/** True only while the debug overlay (backtick key) is actually visible. Used
 *  to skip ~4 per-frame DOM writes to hidden debug fields in production. */
const isDebugVisible = (): boolean => !dbgPanel.classList.contains('hidden')
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

// Colyseus room (reassigned on connect) + schema read helpers. Declared early so
// the readers are available to every call site (no temporal-dead-zone).
let room: Room | null = null
const {
  getSchemaPlayers,
  getSchemaProjectiles,
  getSelfSchemaPlayer,
  getSchemaTick,
  getSchemaMapId,
  getSchemaMode,
} = createSchemaReaders(() => room)

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
const rsDmgDealtEl = document.getElementById('rs-dmg-dealt-val')
const rsHitsEl = document.getElementById('rs-hits-val')
const rsKillsEl = document.getElementById('rs-kills-val')
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
  // Immediately show the swing arc + start attack animation on the local character
  // without waiting for the server schema echo (~16 ms). Makes the weapon
  // animation feel perfectly in sync with the click.
  onSwingSent: () => {
    // Audible whoosh on every swing so the attack reads instantly (the hit
    // sound only plays on contact — without this a missed/short swing was silent).
    soundEngine.playSwing()
    if (selfArc) {
      selfArc.visible = true
      selfArcExpiresAt = performance.now() + 400
    }
  },
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
// Background + fog match the sky dome's warm dusk horizon so the arena wall
// tops blend into atmosphere rather than a hard black void. Lower density
// keeps the coliseum walls (~25 m) clearly readable.
scene.background = new THREE.Color(0x241e26)
scene.fog = new THREE.FogExp2(0x2a2230, 0.011)

const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 400)

// First-person weapon "viewmodel" pass. The arms+weapon live in their OWN scene
// rendered after the world with a fresh depth buffer (see render loop), so the
// weapon never clips into walls and its on-screen size is driven by this camera's
// FOV — independent of the world camera's dynamic FOV (sprint/charge pulse). The
// viewmodel camera stays at the origin/identity forever; viewmodels are parented
// to it so they stay locked to the screen wherever the player looks. Standard FPS
// technique — see https://discourse.threejs.org/t/rendering-a-gun-on-another-layer/80805
const viewmodelScene = new THREE.Scene()
const VIEWMODEL_FOV = 58
const viewmodelCamera = new THREE.PerspectiveCamera(
  VIEWMODEL_FOV,
  window.innerWidth / window.innerHeight,
  0.01,
  10,
)
viewmodelScene.add(viewmodelCamera)
// The viewmodel scene has its own lights (the world's lights live in `scene`).
// Hemisphere fill matches the world's ambient so the weapon isn't dark; the
// per-weapon key light (fpvKeyLight) is added to viewmodelCamera below.
viewmodelScene.add(new THREE.HemisphereLight(0xc4d8ff, 0x182238, 1.2))

// -----------------------------------------------------------------------
// Post-processing: selective bloom on emissive elements
// Layer 0 = normal objects, Layer 1 = bloom-eligible emissive objects
// -----------------------------------------------------------------------
const BLOOM_LAYER = new THREE.Layers()
BLOOM_LAYER.set(1)

const bloomComposer = new EffectComposer(renderer)
bloomComposer.renderToScreen = false
const bloomRenderPass = new RenderPass(scene, camera)
bloomComposer.addPass(bloomRenderPass)
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.45, // strength — subtle, not blown out
  0.55, // radius
  0.75, // threshold — only bright emissive gets bloomed
)
bloomComposer.addPass(bloomPass)
// Final composer: full scene render → additive bloom mix → output. The mix pass
// adds the bloom composer's result (selective: only emissive layer-1 meshes
// survive the per-frame black-out) onto the base scene. WITHOUT it the bloom was
// computed and discarded every frame.
const finalComposer = new EffectComposer(renderer)
const finalRenderPass = new RenderPass(scene, camera)
finalComposer.addPass(finalRenderPass)
const bloomMixPass = new ShaderPass(
  new THREE.ShaderMaterial({
    uniforms: {
      baseTexture: { value: null },
      bloomTexture: { value: bloomComposer.renderTarget2.texture },
    },
    vertexShader:
      'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader:
      'uniform sampler2D baseTexture; uniform sampler2D bloomTexture; varying vec2 vUv; void main() { gl_FragColor = texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv); }',
  }),
  'baseTexture',
)
bloomMixPass.needsSwap = true
finalComposer.addPass(bloomMixPass)
finalComposer.addPass(new OutputPass())

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
// Ground bounce — warm amber fill simulating light reflecting off the sand
// floor. Kept low-radius and modest so it warms the lower body / nearby cover
// without hazing the whole screen when the camera is elevated (jumping).
const bounce = new THREE.PointLight(0xffb060, 0.14, 22, 2)
bounce.position.set(0, 0.4, 0)
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
// Black material used during the bloom selective render pass.
const _blackMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
// Scratch list of meshes darkened during the bloom pass — refilled every frame
// by traversing the scene, so dynamically added meshes (remote players,
// projectiles, zones) are always handled and despawned ones never linger.
const _bloomDarkened: Array<{ mesh: THREE.Mesh; mat: THREE.Material | THREE.Material[] }> = []

// First-person viewmodels are parented to the dedicated viewmodelCamera (not the
// world camera) so they render in the separate viewmodel pass with their own
// depth buffer and FOV. Visibility toggles in the render loop reference these
// objects directly, so they keep working regardless of parent.
const fpvStatic = createFpvStaticViewmodel()
viewmodelCamera.add(fpvStatic.root)
// Animated FPS bow viewmodel (arms + bow + real draw/fire/reload clips).
// Used for the bow weapon; fpvStatic above is the staff (and other static FPV).
const fpvBow = createFpvBow()
viewmodelCamera.add(fpvBow.root)
// Subtle key light for first-person weapon — gives shape/depth without clipping.
// Positioned top-left of camera so shadow falls naturally on the grip.
const fpvKeyLight = new THREE.PointLight(0xd8e8ff, 1.4, 3, 1)
fpvKeyLight.position.set(-0.4, 0.6, -0.5)
viewmodelCamera.add(fpvKeyLight)
const firstPersonParryShield = makeParryShieldVisual(0.42)
firstPersonParryShield.position.set(0, -0.03, -0.8)
firstPersonParryShield.userData['parryShield'] = firstPersonParryShield
viewmodelCamera.add(firstPersonParryShield)
scene.add(camera)
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

// elementToImpactColor imported from ./game/hitstop.js

const impactVfx = new ImpactPool()
scene.add(impactVfx.mesh)
scene.add(impactVfx.ringMesh)
scene.add(impactVfx.accentMesh)
// Mark VFX meshes as bloom-eligible
impactVfx.mesh.layers.enable(1)
impactVfx.ringMesh.layers.enable(1)
impactVfx.accentMesh.layers.enable(1)

const deathBurstVfx = new DeathBurst()
scene.add(deathBurstVfx.mesh)
deathBurstVfx.mesh.layers.enable(1) // bloom

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
// Track previous casting state to detect cast COMPLETION (windup resolved without
// interruption). Used to trigger sound + VFX feedback at resolution.
let prevSelfCasting = false
let lastCastAbilityId = ''
// Last target point sent with the most recent cast (for resolution VFX).
let lastCastTargetPoint: { x: number; y: number; z: number } | null = null

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
  inp.rmbDown = false
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
  pauseLoadoutBtn.textContent = loadoutLocked ? 'Build Bloccata' : 'Forge Build'
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

// First-person bow: tracks charge-held state to fire the shoot animation on release.
let _prevBowCharging = false

// Roll animation — triggered on dash ability cast confirmation.
let selfRollingUntilMs = 0

// Directional screen shake — offset the camera toward/away from attacker.
// attackerWorldPos: world-space position of whoever dealt damage. Use null
// for a random-direction fallback (e.g. death from zone damage).
// applyDirectionalShake: wraps _applyDirectionalShake from visual-helpers.js
// Kept here because it closes over the module-level shakeOffset/shakeDecay vars.
function applyDirectionalShake(attackerWorldPos: THREE.Vector3 | null, intensity = 1): void {
  shakeDecay = _applyDirectionalShake(
    shakeOffset,
    self?.sim.pos ?? null,
    attackerWorldPos,
    intensity,
  )
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
let activeRoomMode = 'duel_arena'
// Schema accessors — exported for use by sub-modules via createSchemaAccessors(getRoom)
// The functions below (getSchemaPlayers, etc.) are wrappers kept in main.ts for
// backward compat; the typed versions live in game/schema-helpers.ts.
const _schemaAccessors = createSchemaAccessors(() => room)
// Asset preload -- kicked off when we join a room (background, parallel to loadout).
// When 'live' phase starts, we wait for this promise before engaging gameplay.
let _matchPreloadPromise: Promise<void> | null = null
// Reconnect state — tracks if we should attempt a single automatic reconnect
let _reconnectAttempted = false
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null
// Room whose leave() we initiated to show an end screen — its onLeave must NOT
// bounce to the menu and destroy the scoreboard.
let _scoreboardLeaveRoom: Room | null = null
export function getRoomMode(): string {
  return activeRoomMode
}
let connectSeq = 0
let ping = 0
let matchStartMs = 0

// MatchStats interface imported from ./game/stats-tracker.js
let selfStats: MatchStats = emptyMatchStats()
let opponentStats: MatchStats = emptyMatchStats()

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
  const prevPhase = currentMatchPhase
  currentMatchPhase = msg.phase
  // Keep matchSM in sync with the Colyseus phase
  matchSM.transition(msg.phase as import('./game/match-state-machine.js').MatchState)
  menu.onMatchPhase(msg, selfId)
  if (msg.phase === 'live') {
    livePhaseStartTick = getSchemaTick()
    roundTimer.textContent = ''
    requestAnimationFrame(() => draggableHud.refreshBounds())
    // Wait for asset preload before engaging gameplay.
    // If preload is already done this resolves immediately.
    const engage = (): void => {
      hideLoadingScreen()
      if (canEngageGameplaySurface()) {
        engageCanvasInput()
        showTutorialIfFirstTime()
        soundEngine.startArenaAmbient()
      }
    }
    if (_matchPreloadPromise) {
      showLoadingScreen('Entrando in arena...')
      _matchPreloadPromise.then(engage).catch((err: unknown) => {
        console.error('[preloader] preload failed, engaging anyway:', err)
        engage()
      })
    } else {
      engage()
    }
  } else {
    livePhaseStartTick = -1
    roundTimer.textContent = ''
    roundTimer.classList.remove('urgent')
  }
  // Reset per-match stats only at a real MATCH boundary — NOT on the inter-round
  // countdown (live → roundEnd → countdown → live), or the end-of-match
  // scoreboard would reflect only the final round. A match starts at 'lobby' or
  // a 'countdown' that does NOT follow a round.
  const isNewMatch =
    msg.phase === 'lobby' ||
    (msg.phase === 'countdown' && prevPhase !== 'live' && prevPhase !== 'roundEnd')
  if (isNewMatch) {
    lastMatchEloDeltas = {}
    selfStats = emptyMatchStats()
    opponentStats = emptyMatchStats()
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

    // Determine winner using server ELO deltas (authoritative) or round wins,
    // falling back to kill count only when neither is available.
    const selfEloDelta = lastMatchEloDeltas[selfId]
    const oppEloDelta = otherId ? lastMatchEloDeltas[otherId] : undefined
    const isWin =
      selfEloDelta !== undefined
        ? selfEloDelta > 0
        : oppEloDelta !== undefined
          ? oppEloDelta < 0
          : selfStats.kills > opponentStats.kills

    const eloBefore = ELO_STARTING // real per-player ELO from Supabase — TODO when auth is complete
    const eloDelta =
      selfEloDelta !== undefined ? selfEloDelta : computeEloDelta(eloBefore, ELO_STARTING, isWin)

    const scoreboardData = buildScoreboardData({
      selfName,
      opponentName,
      selfBuild,
      oppBuild,
      selfStats,
      opponentStats,
      isWin,
      arena: getSchemaMapId(),
      matchMs: performance.now() - matchStartMs,
      mode: getRoomMode(),
      eloBefore,
      eloDelta,
    })

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

// hitstop functions/constants imported from ./game/hitstop.js

// Client-side combo tracking — uses ComboState from game/combat-feedback.ts
const _comboState: ComboState = { count: 0, lastHitMs: 0 }
// Legacy aliases for code that still uses these directly (gradually migrating)
let localComboCount = 0
let lastHitAsAttackerMs = 0

// Kill confirm crosshair flash timestamp
let _killConfirmUntilMs = 0
// Low-HP audio heartbeat — tracks last beat time
let _lastHeartbeatMs = 0
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
    const ratio = Math.min(window.devicePixelRatio, pixelRatioMap[quality])
    renderer.setPixelRatio(ratio)
    // EffectComposer caches the pixel ratio at construction — push it through
    // both composers or the quality setting silently never applies on-screen.
    bloomComposer.setPixelRatio(ratio)
    finalComposer.setPixelRatio(ratio)
  },
})

// Account / profile menu UI (auth panel, profile card, display name).
const accountUi = createAccountUi({
  loadoutStation,
  menu,
  setPlayerProfile: (p) => {
    playerProfile = p
  },
})

// Call on startup — menu is now initialized, safe to call
accountUi.initPlayerProfile()

// Re-run profile init once auth resolves (updates auth UI + stats from Supabase)
_supabaseAuthReady
  .then(() => {
    accountUi.initPlayerProfile()
  })
  .catch((e: unknown) => console.warn('[supabase] auth init failed:', e))
setStatus('offline', 'rgba(200,200,200,0.35)')

// Register all keyboard/mouse/pointer event handlers now that loadoutStation,
// radialWheels, and menu are fully initialised.
const gameInput = initGameInput(inp, {
  rendererDomElement: renderer.domElement,
  mouseSensitivity,
  radialWheels,
  pitchLimits: { up: PITCH_UP_LIMIT, down: PITCH_DOWN_LIMIT },
  getCurrentClassId,
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
  onActivateSlot: (idx: number) => castDispatcher.activateAbilitySlot(idx, false),
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
    _reconnectAttempted = false
    if (_reconnectTimer) {
      clearTimeout(_reconnectTimer)
      _reconnectTimer = null
    }

    // Kick off asset preload in background while the player configures loadout.
    const selfClass = loadoutStation.getClassId() || 'hybrid'
    _matchPreloadPromise = preloadMatchAssets(selfClass).then(() => {
      preloadOtherClassesBackground(selfClass)
    })
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
        if (msg.casterId === self?.sessionId) {
          soundEngine.playCast(def?.element ?? 'none')
          trackAbilityCast(msg.abilityId, def?.element ?? 'none')
          // Anchor cast bar to server ack time — eliminates RTT-induced desync.
          if (def && def.windupSec > 0) castStartedAtMs = performance.now()
          // Play Roll animation on dash abilities.
          if (isDash) selfRollingUntilMs = performance.now() + 400
        } else {
          // Remote caster — spatial cast audio (was silent) + roll for dashes.
          const pos = remotePlayerSystem.getPlayerWorldPos?.(msg.casterId)
          if (pos) soundEngine.playRemoteCast(pos.x, pos.y, pos.z, def?.element ?? 'none')
          if (isDash) remotePlayerSystem.triggerRoll(msg.casterId, performance.now() + 400)
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

    joinedRoom.onLeave((code?: number) => {
      if (room && room !== joinedRoom) return
      // A leave WE initiated to show an end screen keeps the scoreboard up
      // (room is already null here, so the guard above can't catch it).
      if (joinedRoom === _scoreboardLeaveRoom) {
        _scoreboardLeaveRoom = null
        _reconnectAttempted = false
        setStatus('offline', 'rgba(200,200,200,0.35)')
        return
      }
      // code 4000 = intentional kick/leave; anything else = unexpected drop
      const intentional = code === 4000 || code === 1000
      if (!intentional && !_reconnectAttempted && matchSM.isLive) {
        // Single automatic reconnect attempt after 2 s
        _reconnectAttempted = true
        setStatus('connecting', '#e4c05a')
        serverToast.textContent = 'Connessione persa. Riconnessione...'
        serverToast.classList.remove('hidden')
        if (_reconnectTimer) clearTimeout(_reconnectTimer)
        _reconnectTimer = setTimeout(async () => {
          serverToast.classList.add('hidden')
          // Tear down the dropped session (a stale self.sessionId breaks every
          // identity check); null room so the post-connect check below is true.
          room = null
          self = null
          clearLocalMatchState()
          try {
            await connect(activeRoomMode, false)
          } catch {
            /* connect() swallows its own errors; stay defensive anyway. */
          }
          _reconnectAttempted = false
          // connect() never throws on failure, so detect it via room presence.
          if (!room) {
            setStatus('disconnected', '#e87070')
            returnToMainMenu({ leaveRoom: false, statusText: 'disconnected' })
          }
        }, 2000)
        return
      }
      _reconnectAttempted = false
      // Intentional leave (back to menu, normal match end) → neutral "offline".
      // Only an unexpected drop deserves the alarming red "disconnected".
      if (intentional) {
        setStatus('offline', 'rgba(200,200,200,0.35)')
        returnToMainMenu({ leaveRoom: false })
      } else {
        setStatus('disconnected', '#e87070')
        returnToMainMenu({ leaveRoom: false, statusText: 'disconnected' })
      }
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
  // Spatial audio for remote player impacts (not self-hits — those have their own sounds)
  if (!amISelf && !amIAttacker) {
    const attackerPos = remotePlayerSystem.getPlayerWorldPos?.(msg.attackerId)
    if (attackerPos) {
      const power = Math.min(1, (msg.damage ?? 20) / 60)
      soundEngine.playRemoteHit(attackerPos.x, attackerPos.y, attackerPos.z, power)
    }
  }
  const now = performance.now()
  const isAirPunish = isAirPunishCause(msg.cause)
  // Normalise power 0–1 against typical hit ceiling (~40 damage = full power).
  const power = Math.min(1, msg.damage / (isAirPunish ? 55 : 40))

  // Accumulate match stats (pure folding — see game/hit-stats.ts).
  {
    const players = getSchemaPlayers()
    const tickNow = getSchemaTick()
    const selfId = self?.sessionId || ''
    const victimSchema = players?.get(msg.victimId)
    const selfSchema = players?.get(selfId)
    const details = accumulateHitStats(selfStats, opponentStats, msg, {
      amISelf,
      amIAttacker,
      isAirPunish,
      selfId,
      victimAirborne: !!(victimSchema && victimSchema.airborneUntilTick > tickNow),
      selfAirborne: !!(selfSchema && selfSchema.airborneUntilTick > tickNow),
      attackerName: players?.get(msg.attackerId)?.name || msg.attackerId.slice(0, 6),
      abilityName: ABILITY_DEFS[msg.cause]?.name || msg.cause.toUpperCase(),
    })
    if (details) lastHitDetails = details
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
      combatFeedHud.showComboPopupLabel('AIR PUNISH ✈')
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
      // Play element-specific impact sound for ability hits
      if (
        msg.cause.startsWith('ability:') ||
        msg.cause.startsWith('zone:') ||
        msg.cause.startsWith('combo:')
      ) {
        soundEngine.playElementImpact(msg.element ?? 'none', Math.min(1, power * 0.8))
      }
      hitStopUntilMs = now + hitstopAttacker(msg.cause)
      applyDirectionalShake(getPlayerWorldPos(msg.victimId), 0.3)
    }
  }

  // --- Victim (self): receive-damage sound + freeze + shake ---
  if (amISelf && msg.damage > 0 && !msg.didParry) {
    soundEngine.playHurtByType(msg.cause, power)
    victimHitStopUntilMs = now + hitstopVictim(msg.cause)
    selfHitReactUntilMs = now + 650
    // Victim camera shake — melee hits harder, felt directly on screen.
    const _victimShakeI = victimShakeIntensity(msg.cause, msg.damage)
    applyDirectionalShake(getPlayerWorldPos(msg.attackerId), _victimShakeI)
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
      const rawCause = rawCauseId(msg.cause)
      const shakeIntensity =
        rawCause === 'sword_m1' || rawCause === 'uppercut'
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
      // Strip 'ability:' prefix so melee/bow abilities match their VFX category.
      const rawC = rawCauseId(cause)
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
          rawC === 'sword_m1' ||
          rawC === 'uppercut' ||
          rawC === 'gap_closer' ||
          rawC === 'bleed_strike' ||
          rawC === 'guard_break' ||
          rawC === 'rending_dash' ||
          rawC === 'whirlwind'
        ) {
          // Melee — gold spark + secondary red burst for hard hits.
          spawnImpact(midpoint, 0xffcc44, 'melee')
          if (msg.damage >= 10 && vicPos) {
            spawnImpact(new THREE.Vector3(vicPos.x, vicPos.y + 0.4, vicPos.z), 0xff6622, 'melee')
          }
        } else if (
          rawC === 'bow' ||
          rawC === 'piercing_shot' ||
          rawC === 'pin_shot' ||
          rawC === 'marksman_shot' ||
          rawC === 'broadhead' ||
          rawC === 'blast_arrow' ||
          rawC === 'volley' ||
          rawC === 'disengage_shot' ||
          rawC === 'snare_trap'
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

  if (isSelfKill && !isSelfDied) {
    trackKill(msg.cause ?? 'unknown')
    _killConfirmUntilMs = performance.now() + 200
  }
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
    else if (streak === 3) combatFeedHud.showKillSplash('TRIPLA KILL!', 'kill')
    else if (streak === 2) combatFeedHud.showKillSplash('DOPPIA KILL!', 'kill')
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
  castBarLabel.textContent = 'INTERROTTO'
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

// disposeObject3D imported from ./game/visual-helpers.js

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
  inp.rmbDown = false
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
  // Sync the FSM — keeps matchSM.isLive() consistent for reconnect guard
  matchSM.transition('lobby')
  livePhaseStartTick = -1
  ping = 0
  localComboCount = 0
  lastHitAsAttackerMs = 0
  hitStopUntilMs = 0
  victimHitStopUntilMs = 0
  shakeOffset.set(0, 0, 0)
  shakeDecay = 0
  // Kill timestamps reset so the previous match's streak doesn't bleed into the next.
  recentKillTimes.length = 0
  clearGameplayInputState()
  clearGameplayUi()
  projectileVfx.clear()
  zoneVfx.clear()
  remotePlayerSystem.clear()
  clearSelfVisuals()
}

function returnToMainMenu(opts: { leaveRoom: boolean; statusText?: string }): void {
  soundEngine.stopArenaAmbient()
  connectSeq++
  _reconnectAttempted = false
  if (_reconnectTimer) {
    clearTimeout(_reconnectTimer)
    _reconnectTimer = null
  }
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

  const isWin = selfStats.kills > opponentStats.kills

  const scoreboardData = buildScoreboardData({
    selfName,
    opponentName,
    selfBuild,
    oppBuild,
    selfStats,
    opponentStats,
    isWin,
    arena: getSchemaMapId(),
    matchMs: performance.now() - matchStartMs,
    mode: 'training',
    eloBefore: ELO_STARTING,
    eloDelta: 0,
  })

  menu.showScoreboard(selfId, scoreboardData)

  const leavingRoom = room
  // Mark this leave as scoreboard-driven so its onLeave keeps the results up
  // instead of bouncing to the main menu (which destroyed the screen before).
  _scoreboardLeaveRoom = leavingRoom
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

// Schema read helpers (getSchemaPlayers/…) are created near the top via
// createSchemaReaders — see the room declaration.

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
  // Remember the target for resolution VFX (shown when windup completes).
  lastCastTargetPoint = msg.targetPoint ?? null

  recordAbilityCast(selfStats, abilityId)
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
  // Block movement while an overlay is open (else a held key keeps walking on
  // the server behind the pause/settings/loadout menu).
  const overlayBlockingInput =
    isOverlayOpen(settingsOverlay) || !loadoutStationHidden() || isPauseMenuOpen()
  const input = sampleInput(airborne, dead, overlayBlockingInput)

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
    m1: inp.lmbDown,
    // m2 = RMB held. The server maintains the parry hold from this flag
    // (GameRoom drainInput); it was hardcoded false, so every input tick
    // released the parry instantly — hold-parries never worked.
    m2: inp.rmbDown,
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
  const serverState: PlayerSimState = {
    pos: { x: p.transform.x, y: p.transform.y, z: p.transform.z },
    vel: { x: p.vx, y: p.vy, z: p.vz },
    onGround: p.onGround,
    jumpHoldTicksLeft: p.jumpHoldTicksLeft ?? 0,
    stamina: p.stamina,
    coyoteTicksLeft: p.coyoteTicksLeft ?? 0,
    momentumTicks: p.momentumTicks ?? 0,
  }
  // Replay each in-flight input with the caps active at send time so root/slow/
  // stun match the server's computation.
  const activeMap = getMap(getActiveMapId() || 'blockout')
  const result = reconcilePrediction(self, serverState, ackSeq, (sim, input, dt, caps) =>
    simulatePlayer(sim, input, dt, activeMap, caps),
  )
  if (!result) return
  self.sim = result.sim
  self.lastPredictionDelta = result.delta
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

let _renderErrorCount = 0
const _MAX_RENDER_ERRORS = 5

function render(now: number): void {
  // Once suspended (too many consecutive errors) actually STOP — don't schedule
  // another frame or keep re-running the failing inner loop every frame.
  if (_renderErrorCount >= _MAX_RENDER_ERRORS) return
  // Schedule next frame first so a mid-frame error never kills the loop.
  requestAnimationFrame(render)
  try {
    _renderInner(now)
  } catch (err) {
    _renderErrorCount++
    console.error(`[render] frame error #${_renderErrorCount}:`, err)
    if (_renderErrorCount >= _MAX_RENDER_ERRORS) {
      console.error('[render] too many errors -- suspending render loop')
      serverToast.textContent = 'Errore grafico. Ricaricare la pagina.'
      serverToast.classList.remove('hidden')
    }
  }
}

function _renderInner(now: number): void {
  const dt = (now - lastFrame) / 1000
  lastFrame = now
  frameCount += 1
  fpsAccum += dt
  if (fpsAccum >= 0.5) {
    if (isDebugVisible()) dbgFps.textContent = (frameCount / fpsAccum).toFixed(0)
    fpsAccum = 0
    frameCount = 0
  }

  // Skip 3D render entirely while the menu/loadout overlay is visible. The
  // canvas is CSS-hidden there (visibility:hidden), so the only effect of
  // rendering would be wasted GPU work (full scene + double bloom pass) behind
  // an invisible surface — the old "arena spinning behind the menu" cost. We
  // skip even when a room is connected (matchmaking/loadout), since nothing on
  // screen comes from the 3D canvas until the match actually starts.
  const inMenu =
    document.body.classList.contains('main-menu-active') ||
    document.body.classList.contains('loadout-active')
  if (inMenu) return

  // Swap map geometry when the server schema reports a different mapId.
  loadMapGeometry(getSchemaMapId())
  placementPreview.update(now)

  // Hit-stop flag — particle animation and camera lerp are frozen during it.
  // Covers both attacker-side (landed a hit) and victim-side (received a hit).
  const inHitStop = now < hitStopUntilMs || now < victimHitStopUntilMs
  // Brief exposure boost during hit-stop for impactful "crunch" feel.
  const targetExposure = inHitStop ? 1.45 : 1.1
  renderer.toneMappingExposure +=
    (targetExposure - renderer.toneMappingExposure) * Math.min(1, 16.8 * dt)

  animateArena(now, dt, inHitStop)
  // Update 3D audio listener position every frame
  if (self) {
    soundEngine.updateListener(
      camera.position.x,
      camera.position.y,
      camera.position.z,
      camera.rotation.y,
    )
  }

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
    // selfMesh.visible is set authoritatively below from the weapon view config
    // (hidden when dead, or in first person so the body is never shown).

    const distToSim = Math.hypot(
      self.sim.pos.x - renderPos.x,
      self.sim.pos.y - renderPos.y,
      self.sim.pos.z - renderPos.z,
    )
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

    // Resolve the active weapon. If the schema's weapon is briefly missing/invalid
    // (right after spawn or mid weapon-swap), fall back to the LAST known-good
    // weapon rather than snapping to 'sword' — snapping to sword would flip a
    // first-person player into third person and flash their body for a frame.
    const wSchema: Weapon =
      selfSchema && isWeapon(selfSchema.activeWeapon)
        ? selfSchema.activeWeapon
        : isWeapon(selfLastWeapon)
          ? selfLastWeapon
          : 'sword'

    // Detect windup cast COMPLETION: casting was true last frame, now false,
    // and no interruption fired (interruptions clear castStartedAtMs to 0).
    // Trigger: cast-release sound + impact VFX at the stored target point.
    const nowCasting = !!(selfSchema?.casting && selfSchema.castEndsAtTick > tickNow)
    if (prevSelfCasting && !nowCasting && castStartedAtMs > 0 && lastCastAbilityId) {
      const def = ABILITY_DEFS[lastCastAbilityId]
      if (def && def.windupSec > 0) {
        // Second sound at resolution so the player knows the spell fired.
        soundEngine.playCast(def.element ?? 'none')
        // VFX at target point for point-targeted spells (meteor, zone placement, etc.)
        if (lastCastTargetPoint) {
          const elemColor = (ELEMENT_COLOR[def.element] ?? '#4a90d8').replace('#', '')
          const col = parseInt(elemColor, 16) || 0x4a90d8
          spawnImpact(
            new THREE.Vector3(lastCastTargetPoint.x, lastCastTargetPoint.y, lastCastTargetPoint.z),
            col,
            'magic',
          )
          lastCastTargetPoint = null
        }
      }
    }
    prevSelfCasting = nowCasting
    if (nowCasting && selfSchema?.castAbilityId) {
      lastCastAbilityId = selfSchema.castAbilityId
    }

    const selfSpeed = Math.hypot(self.sim.vel.x, self.sim.vel.z)
    // Drive character animations — skip entirely when the body isn't drawn
    // (first-person bow/staff): the full 65-bone mixer eval would be wasted on a
    // model that is never rendered. selfMesh.visible lags one frame, which is
    // invisible across a weapon swap.
    if (selfMesh.visible) {
      tickCharacterMixer(selfMesh, dt)
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
      // Procedural shield-block arm raise (TPV sword users) — must run AFTER the
      // mixer update inside tickCharacterMixer so it isn't overwritten this frame.
      applyParryArmPose(selfMesh, !dead && !!selfSchema?.parrying, dt)
    }

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
    // Per-weapon view config (camera mode, offsets, FOV, viewmodel) — single
    // source of truth in render/weapon-view.ts.
    const cfg = getWeaponView(wSchema)
    const firstPerson = cfg.view === 'first'
    const wBackTarget = cfg.camBack
    const wUpTarget = cfg.camUp
    const wFovTarget = settingsFovBase + cfg.fovDelta(bowChargeRatio)
    // Frame-rate-independent smoothing (same pattern as the renderPos lerp):
    // ~0.12/frame at 60 fps, but equal convergence in wall-clock at any refresh.
    const CAM_LERP = inHitStop ? 0 : Math.min(1, 7.2 * dt)
    camBack += (wBackTarget - camBack) * CAM_LERP
    camUp += (wUpTarget - camUp) * CAM_LERP
    camFovBase += (wFovTarget - camFovBase) * CAM_LERP

    // Self body hidden in first person — derived from view mode alone, so the
    // character model can never be shown while a viewmodel is active.
    selfMesh.visible = !dead && !firstPerson
    fpvBow.setVisible(!dead && cfg.viewModel === 'fpvBow')
    fpvStatic.root.visible = !dead && cfg.viewModel === 'staticViewmodel'
    setParryShieldState(selfMesh, !dead && !!selfSchema?.parrying, !!selfSchema?.parryIsHold, now)
    setParryShieldState(
      firstPersonParryShield,
      !dead && firstPerson && !!selfSchema?.parrying,
      !!selfSchema?.parryIsHold,
      now,
    )
    if (cfg.viewModel === 'staticViewmodel' && fpvStatic.getCurrentWeapon() !== wSchema)
      fpvStatic.rebuild(wSchema)

    // ── Animated first-person bow ──────────────────────────────────────────
    // Real arms+bow rig: drive its clips from gameplay state and fire the
    // shoot→reload one-shot when a charged shot is released.
    if (cfg.viewModel === 'fpvBow') {
      const charging = self.bowChargeStartMs > 0 || (selfSchema?.bowChargeStartTick ?? 0) > 0
      fpvBow.update(dt, { moving: selfSpeed > 0.3, speed: selfSpeed, charging })
      if (_prevBowCharging && !charging) fpvBow.fire()
      _prevBowCharging = charging
    } else {
      _prevBowCharging = false
    }

    if (firstPerson) {
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

    if (!firstPerson) {
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
      // Exponential decay — feels snappier than linear, especially for big hits
      const decay = Math.exp(-SHAKE_DECAY_RATE * dt)
      shakeOffset.multiplyScalar(decay)
      shakeDecay *= decay
      // Add micro-oscillation on top for organic feel
      const microAmp = shakeDecay * 0.18
      const mOff = new THREE.Vector3(
        (Math.random() - 0.5) * microAmp,
        (Math.random() - 0.5) * microAmp * 0.5,
        (Math.random() - 0.5) * microAmp,
      )
      camera.position.add(shakeOffset).add(mOff)
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
    // Dynamic crosshair: expand when moving, contract when still
    // Check movement via WASD keys (moveX/moveZ are local to simStep)
    const selfMoving =
      self !== null &&
      (inp.keys.has('KeyW') ||
        inp.keys.has('KeyS') ||
        inp.keys.has('KeyA') ||
        inp.keys.has('KeyD') ||
        inp.keys.has('ArrowUp') ||
        inp.keys.has('ArrowDown') ||
        inp.keys.has('ArrowLeft') ||
        inp.keys.has('ArrowRight'))
    crosshairEl.dataset['moving'] = selfMoving ? 'true' : 'false'
    if (now < _killConfirmUntilMs) crosshairEl.classList.add('kill-confirm')
    else crosshairEl.classList.remove('kill-confirm')
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
  }

  remotePlayerSystem.renderFrame(now, camera, renderer.domElement)

  const proj = getSchemaProjectiles()
  if (proj)
    projectileVfx.renderFrame(
      proj as Map<string, SchemaProjectile>,
      now,
      isDebugVisible() ? dbgProj : null,
    )

  impactVfx.update(now)
  deathBurstVfx.update(now)

  // HUD + debug. Skip the debug-field DOM writes unless the overlay is open.
  if (isDebugVisible()) {
    dbgTick.textContent = String(tickNow)
    dbgPlayers.textContent = String(getSchemaPlayers()?.size ?? 0)
    dbgPing.textContent = ping > 0 ? ping.toFixed(0) : '-'
  }
  // Persistent ping HUD (always-visible coloured indicator)
  if (ping > 0) {
    pingValEl.textContent = ping.toFixed(0)
    pingHud.className = ping < 60 ? 'ingame good' : ping < 120 ? 'ingame ok' : 'ingame bad'
  }
  if (self && isDebugVisible()) {
    dbgPred.textContent = self.lastPredictionDelta.toFixed(3)
    dbgGround.textContent = self.sim.onGround ? 'yes' : 'no'
    dbgGround.style.color = self.sim.onGround ? '#9be39b' : '#e4c05a'
    dbgSeq.textContent = String(seqCounter)
  }

  // Weapon wheel highlight + debug.
  if (inp.optimisticWeapon && selfSchema?.activeWeapon === inp.optimisticWeapon)
    inp.optimisticWeapon = null
  const activeWeapon: Weapon = currentWeaponForInput()
  if (isDebugVisible()) dbgWeapon.textContent = activeWeapon
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

  // Low-HP audio heartbeat — plays at ~0.65 Hz when critically low
  if (self && currentMatchPhase === 'live') {
    const selfSch = getSelfSchemaPlayer()
    if (selfSch && selfSch.alive) {
      const classId = (selfSch.classId || 'hybrid') as ClassId
      const hpMax = TARGET_CLASS_DEFS[classId]?.resourceMaxima?.hp ?? 200
      const hpFrac = Math.max(0, selfSch.hp / hpMax)
      if (hpFrac < 0.25) {
        // Heartbeat interval: 1200ms at full danger, speeds up as HP drops
        const intervalMs = 600 + hpFrac * 2400
        if (now - _lastHeartbeatMs > intervalMs) {
          _lastHeartbeatMs = now
          soundEngine.playHeartbeat(1 - hpFrac * 3.5)
        }
      }
    }
  }

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
  // Update respawn stats strip while dead
  if (selfSchema && !selfSchema.alive) {
    if (rsDmgDealtEl) rsDmgDealtEl.textContent = String(selfStats.damageDealt)
    if (rsHitsEl) rsHitsEl.textContent = String(selfStats.yourHits)
    if (rsKillsEl) rsKillsEl.textContent = `${selfStats.kills}-${opponentStats.kills}`
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

  // Selective bloom: black out non-emissive meshes, render bloom (emissive only),
  // restore, then finalComposer mixes it in. Traverse every frame so dynamically
  // added/removed meshes are always handled. Skipped during hit-stop.
  if (!inHitStop) {
    _bloomDarkened.length = 0
    scene.traverse((obj) => {
      const m = obj as THREE.Mesh
      if (m.isMesh && !m.layers.test(BLOOM_LAYER)) {
        _bloomDarkened.push({ mesh: m, mat: m.material })
        m.material = _blackMat
      }
    })
    bloomComposer.render()
    for (const e of _bloomDarkened) e.mesh.material = e.mat
    finalComposer.render()
  } else {
    // Composers leave renderer.autoClear=false; force a clean world clear here.
    renderer.autoClear = true
    renderer.render(scene, camera)
  }
  // First-person viewmodel pass: the world (colour + depth) is already on screen.
  // Clear ONLY the depth buffer and draw the weapon on top in its own scene, so it
  // never clips into walls. autoClear=false keeps the world colour we just drew.
  renderer.autoClear = false
  renderer.clearDepth()
  renderer.render(viewmodelScene, viewmodelCamera)
  // Update draw call counter (shown in debug panel, ` key) — only when open.
  if (isDebugVisible()) dbgDraws.textContent = String(renderer.info.render.calls)
  _renderErrorCount = 0 // reset error counter on successful frame
}

addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  viewmodelCamera.aspect = window.innerWidth / window.innerHeight
  viewmodelCamera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  bloomComposer.setSize(window.innerWidth, window.innerHeight)
  finalComposer.setSize(window.innerWidth, window.innerHeight)
  draggableHud.refreshBounds()
})

addEventListener('beforeunload', () => {
  clearInterval(simTimer)
  room?.leave()
})

requestAnimationFrame(render)
