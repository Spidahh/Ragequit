import { getAbilitySlotFamily, type SimInput, type Weapon } from '@ragequit/shared'

import { actionCode, matchesAction, type KeybindAction } from './keybinds.js'
import { type RadialWheelController } from './radial-wheels.js'
import { type MouseSensitivityController } from './sensitivity.js'

// Mutable input state shared with the game loop. main.ts holds the reference
// and reads/writes fields directly; this module owns the event wiring.
export interface GameInputState {
  keys: Set<string>
  mouseYaw: number
  mousePitch: number
  jumpEdgeQueued: boolean
  lmbDown: boolean
  lmbPressEdge: boolean
  lmbReleaseEdge: boolean
  rmbPressEdge: boolean
  rmbReleaseEdge: boolean
  weaponSwapRequest: Weapon | null
  optimisticWeapon: Weapon | null
  pointerLocked: boolean
  canvasInputEngaged: boolean
  pointerLookActive: boolean
  lastPointerClientX: number
  lastPointerClientY: number
}

export function makeGameInputState(): GameInputState {
  return {
    keys: new Set(),
    mouseYaw: 0,
    mousePitch: 0,
    jumpEdgeQueued: false,
    lmbDown: false,
    lmbPressEdge: false,
    lmbReleaseEdge: false,
    rmbPressEdge: false,
    rmbReleaseEdge: false,
    weaponSwapRequest: null,
    optimisticWeapon: null,
    pointerLocked: false,
    canvasInputEngaged: false,
    pointerLookActive: false,
    lastPointerClientX: 0,
    lastPointerClientY: 0,
  }
}

export interface GameInputController {
  engageCanvasInput: () => void
  disengageCanvasInput: () => void
  requestArenaPointerLock: () => void
  sampleInput: (airborne: boolean, dead: boolean) => SimInput
}

export interface GameInputOptions {
  rendererDomElement: HTMLElement
  mouseSensitivity: MouseSensitivityController
  radialWheels: RadialWheelController
  pitchLimits: { up: number; down: number }
  weaponIds: readonly Weapon[]
  hint: HTMLElement
  pingHud: HTMLElement
  settingsOverlay: HTMLElement
  pauseMenu: HTMLElement
  loadoutStation: { open: () => void; close: () => void }
  menu: { showMain: () => void; hideMain: () => void }
  getRoom: () => unknown
  getCurrentMatchPhase: () => string
  getPlacementAbilityId: () => string | null
  getLoadoutReturnsToPause: () => boolean
  setLoadoutReturnsToPause: (v: boolean) => void
  getPing: () => number
  getCurrentWeaponForInput: () => string
  getCurrentLoadout: () => readonly string[]
  isGameplayInputAllowed: () => boolean
  canEngageGameplaySurface: () => boolean
  openPauseMenu: () => void
  closePauseMenu: (lockPointer: boolean) => void
  cancelPlacementPreview: () => void
  activateAbilitySlot: (slotIdx: number, fromWheel: boolean) => void
  onClear: () => void
}

export function initGameInput(
  state: GameInputState,
  {
    rendererDomElement,
    mouseSensitivity,
    radialWheels,
    pitchLimits,
    weaponIds,
    hint,
    pingHud,
    settingsOverlay,
    pauseMenu,
    loadoutStation,
    menu,
    getRoom,
    getCurrentMatchPhase,
    getPlacementAbilityId,
    getLoadoutReturnsToPause,
    setLoadoutReturnsToPause,
    getPing,
    getCurrentWeaponForInput,
    getCurrentLoadout,
    isGameplayInputAllowed,
    canEngageGameplaySurface,
    openPauseMenu,
    closePauseMenu,
    cancelPlacementPreview,
    activateAbilitySlot,
    onClear,
  }: GameInputOptions,
): GameInputController {
  function engageCanvasInput(): void {
    state.canvasInputEngaged = true
    document.body.classList.add('input-locked')
    rendererDomElement.focus({ preventScroll: true })
  }

  function disengageCanvasInput(): void {
    state.canvasInputEngaged = false
    state.pointerLookActive = false
    document.body.classList.remove('input-locked')
  }

  function requestArenaPointerLock(): void {
    if (document.pointerLockElement === rendererDomElement) return
    try {
      const result = rendererDomElement.requestPointerLock?.()
      if (result && typeof result.catch === 'function') {
        void result.catch(() => {
          // Pointer lock denied by browser — enable absolute-mouse fallback.
          // Reset coordinates so the first move delta is 0 (not a stale position).
          state.pointerLookActive = true
          state.lastPointerClientX = 0
          state.lastPointerClientY = 0
        })
      }
    } catch {
      state.pointerLookActive = true
      state.lastPointerClientX = 0
      state.lastPointerClientY = 0
    }
  }

  function isPauseMenuOpen(): boolean {
    return !pauseMenu.classList.contains('hidden')
  }

  function isOverlayOpen(el: HTMLElement): boolean {
    return !el.classList.contains('hidden')
  }

  function loadoutStationHidden(): boolean {
    return document.getElementById('loadout-station')?.classList.contains('hidden') ?? true
  }

  function isTextEditingTarget(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null
    if (!el) return false
    const tag = el.tagName
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
  }

  function isGameplayKeyCode(code: string): boolean {
    if (code === 'Escape' || code === 'Backquote') return true
    const actionCodes = [
      actionCode('moveForward'),
      actionCode('moveBack'),
      actionCode('moveLeft'),
      actionCode('moveRight'),
      actionCode('jump'),
      actionCode('swapWeapon'),
      actionCode('wheelUtility'),
      actionCode('wheelAbility'),
      actionCode('openLoadout'),
      actionCode('spell1'),
      actionCode('spell2'),
      actionCode('spell3'),
      actionCode('spell4'),
      actionCode('spell5'),
      actionCode('sensDown'),
      actionCode('sensUp'),
    ]
    return actionCodes.includes(code)
  }

  function shouldIgnoreGameplayPointerTarget(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null
    if (!el) return false
    return Boolean(
      el.closest(
        'button, input, textarea, select, [contenteditable="true"], #settings-overlay, #loadout-station, #pause-menu, #main-menu, #hud',
      ),
    )
  }

  function closeSettingsOverlayToReturnTarget(): void {
    settingsOverlay.classList.add('hidden')
    if (settingsOverlay.dataset['returnTo'] === 'pause' && getRoom())
      pauseMenu.classList.remove('hidden')
    else if (getRoom()) openPauseMenu()
    else menu.showMain()
    settingsOverlay.dataset['returnTo'] = ''
  }

  function handleCombatPointerDown(button: number): void {
    if (!canEngageGameplaySurface()) return
    engageCanvasInput()
    if (!state.pointerLocked) {
      state.pointerLookActive = true
      state.lastPointerClientX = 0
      state.lastPointerClientY = 0
    }
    if (button === 0 || button === 2) {
      requestArenaPointerLock()
    }
    if (!isGameplayInputAllowed()) return
    if (button === 0) {
      if (!state.lmbDown) state.lmbPressEdge = true
      state.lmbDown = true
    } else if (button === 2) {
      state.rmbPressEdge = true
    }
  }

  function handleCombatPointerUp(button: number): void {
    if (button === 0) {
      if (state.lmbDown) state.lmbReleaseEdge = true
      state.lmbDown = false
    } else if (button === 2) {
      state.rmbReleaseEdge = true
    }
  }

  function handleGameplayPointerMove(e: PointerEvent | MouseEvent): void {
    if (radialWheels.isOpen()) {
      if (state.pointerLocked) radialWheels.relativeMove(e.movementX, e.movementY)
      else radialWheels.pointMove(e.clientX, e.clientY)
      return
    }
    if (state.pointerLocked) {
      state.mouseYaw -= e.movementX * mouseSensitivity.value
      state.mousePitch -= e.movementY * mouseSensitivity.value
    } else if (state.canvasInputEngaged && state.pointerLookActive && canEngageGameplaySurface()) {
      if (state.lastPointerClientX !== 0 || state.lastPointerClientY !== 0) {
        state.mouseYaw -= (e.clientX - state.lastPointerClientX) * mouseSensitivity.value
        state.mousePitch -= (e.clientY - state.lastPointerClientY) * mouseSensitivity.value
      }
      state.lastPointerClientX = e.clientX
      state.lastPointerClientY = e.clientY
    } else {
      return
    }
    if (state.mousePitch > pitchLimits.up) state.mousePitch = pitchLimits.up
    if (state.mousePitch < pitchLimits.down) state.mousePitch = pitchLimits.down
  }

  // ── Keyboard ────────────────────────────────────────────────────────────

  addEventListener(
    'keydown',
    (e) => {
      if (isTextEditingTarget(e.target)) return
      const k = e.code
      const gameplaySurfaceKey =
        canEngageGameplaySurface() && isGameplayKeyCode(k)
      if (gameplaySurfaceKey) {
        e.preventDefault()
        e.stopImmediatePropagation()
        engageCanvasInput()
      }
      const fresh = !state.keys.has(k)
      state.keys.add(k)
      if (!fresh) return

      if (k === 'Escape') {
        e.preventDefault()
        if (getPlacementAbilityId()) {
          cancelPlacementPreview()
          return
        }
        if (radialWheels.isOpen()) {
          radialWheels.close(false)
          return
        }
        if (isOverlayOpen(settingsOverlay)) {
          closeSettingsOverlayToReturnTarget()
          return
        }
        if (!loadoutStationHidden()) {
          loadoutStation.close()
          const lrtp = getLoadoutReturnsToPause()
          if (lrtp && getRoom()) {
            setLoadoutReturnsToPause(false)
            pauseMenu.classList.remove('hidden')
          } else if (getRoom()) {
            openPauseMenu()
          } else if (!state.pointerLocked) {
            menu.showMain()
          }
          return
        }
        if (getRoom()) {
          if (isPauseMenuOpen()) closePauseMenu(true)
          else openPauseMenu()
          return
        }
        if (!state.pointerLocked) menu.showMain()
        return
      }

      if (
        isOverlayOpen(settingsOverlay) ||
        !loadoutStationHidden() ||
        isPauseMenuOpen()
      ) {
        return
      }

      if (matchesAction(k, 'openLoadout')) {
        e.preventDefault()
        onClear()
        if (radialWheels.isOpen()) radialWheels.close(false)
        if (getRoom() && getCurrentMatchPhase() === 'live') {
          openPauseMenu()
          return
        }
        pauseMenu.classList.add('hidden')
        settingsOverlay.classList.add('hidden')
        menu.hideMain()
        if (document.pointerLockElement) document.exitPointerLock()
        setLoadoutReturnsToPause(Boolean(getRoom()))
        loadoutStation.open()
        return
      }

      if (matchesAction(k, 'jump')) {
        state.jumpEdgeQueued = true
        return
      }

      if (k === 'Backquote') {
        document.getElementById('debug')?.classList.toggle('hidden')
        return
      }

      if (matchesAction(k, 'sensDown')) {
        mouseSensitivity.scale(0.9)
        return
      }
      if (matchesAction(k, 'sensUp')) {
        mouseSensitivity.scale(1.1)
        return
      }

      // Gated combat actions — only allowed while match phase is 'live'
      if (!isGameplayInputAllowed()) return

      if (matchesAction(k, 'wheelUtility')) {
        e.preventDefault()
        radialWheels.openUtility(k)
      }
      if (matchesAction(k, 'wheelAbility')) {
        e.preventDefault()
        radialWheels.openAbility(k)
      }

      if (matchesAction(k, 'swapWeapon')) {
        e.preventDefault()
        const cur = getCurrentWeaponForInput() as Weapon
        const idx = weaponIds.indexOf(cur)
        state.weaponSwapRequest = weaponIds[(idx + 1) % weaponIds.length] ?? null
      }

      const spellActions: readonly KeybindAction[] = ['spell1', 'spell2', 'spell3', 'spell4', 'spell5']
      for (let spellIdx = 0; spellIdx < spellActions.length; spellIdx++) {
        const action = spellActions[spellIdx]!
        if (!matchesAction(k, action)) continue
        const targetSlotIdx = nthMagicSlotIndex(getCurrentLoadout(), spellIdx)
        if (targetSlotIdx >= 0) activateAbilitySlot(targetSlotIdx, false)
        break
      }
    },
    { capture: true },
  )

  addEventListener(
    'keyup',
    (e) => {
      if (isTextEditingTarget(e.target)) return
      const gameplaySurfaceKey =
        canEngageGameplaySurface() && isGameplayKeyCode(e.code)
      if (gameplaySurfaceKey) {
        e.preventDefault()
        e.stopImmediatePropagation()
        engageCanvasInput()
      }
      state.keys.delete(e.code)
      if (radialWheels.isOpen() && e.code === radialWheels.activeKey()) {
        radialWheels.close(true)
      }
    },
    { capture: true },
  )

  // ── Pointer ──────────────────────────────────────────────────────────────

  rendererDomElement.addEventListener('contextmenu', (e) => {
    e.preventDefault()
  })

  rendererDomElement.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    handleCombatPointerDown(e.button)
  })
  rendererDomElement.addEventListener('pointerup', (e) => {
    e.preventDefault()
    handleCombatPointerUp(e.button)
  })
  rendererDomElement.addEventListener('mousedown', (e) => {
    e.preventDefault()
    handleCombatPointerDown(e.button)
  })
  rendererDomElement.addEventListener('mouseup', (e) => {
    e.preventDefault()
    handleCombatPointerUp(e.button)
  })

  document.addEventListener(
    'pointerdown',
    (e) => {
      if (!canEngageGameplaySurface() || shouldIgnoreGameplayPointerTarget(e.target)) return
      e.preventDefault()
      handleCombatPointerDown(e.button)
    },
    { capture: true },
  )

  document.addEventListener(
    'pointerup',
    (e) => {
      if (!state.canvasInputEngaged || shouldIgnoreGameplayPointerTarget(e.target)) return
      e.preventDefault()
      handleCombatPointerUp(e.button)
    },
    { capture: true },
  )

  document.addEventListener(
    'pointermove',
    (e) => {
      handleGameplayPointerMove(e)
    },
    { capture: true },
  )

  document.addEventListener('pointerlockchange', () => {
    const wasPointerLocked = state.pointerLocked
    state.pointerLocked = document.pointerLockElement === rendererDomElement
    if (state.pointerLocked) {
      state.canvasInputEngaged = true
      state.pointerLookActive = true
      state.lastPointerClientX = 0
      state.lastPointerClientY = 0
      document.body.classList.add('input-locked')
    } else {
      // Pointer lock lost — disable look input immediately. The player must
      // click again to re-acquire the lock (or trigger the absolute fallback).
      // Without this reset, the fallback path would fire on every pointermove
      // and spin the camera wildly with large clientX/Y deltas.
      state.pointerLookActive = false
      document.body.classList.toggle('input-locked', state.canvasInputEngaged)
    }
    hint.classList.toggle('hidden', state.pointerLocked)
    pingHud.classList.toggle('ingame', state.pointerLocked && getPing() > 0)
    if (wasPointerLocked && !state.pointerLocked) {
      if (state.lmbDown) state.lmbReleaseEdge = true
      state.lmbDown = false
      state.keys.clear()
      if (canEngageGameplaySurface() && getCurrentMatchPhase() === 'live') {
        openPauseMenu()
      }
    }
  })

  addEventListener('blur', () => {
    onClear()
  })

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) onClear()
  })

  // ── Scroll wheel ─────────────────────────────────────────────────────────

  function handleGameplayWheel(e: WheelEvent): void {
    if (!isGameplayInputAllowed()) return
    if (shouldIgnoreGameplayPointerTarget(e.target)) return
    e.preventDefault()
    engageCanvasInput()
    const cur = getCurrentWeaponForInput() as Weapon
    const idx = weaponIds.indexOf(cur)
    const dir = e.deltaY > 0 ? 1 : -1
    const next = weaponIds[(idx + dir + weaponIds.length) % weaponIds.length]
    state.weaponSwapRequest = next ?? null
  }
  document.addEventListener('wheel', handleGameplayWheel, { capture: true, passive: false })

  addEventListener('mousemove', (e) => {
    if ('PointerEvent' in window) return
    handleGameplayPointerMove(e)
  })

  // ── sampleInput ───────────────────────────────────────────────────────────

  function sampleInput(airborne: boolean, dead: boolean): SimInput {
    if (dead) {
      return { moveX: 0, moveZ: 0, yaw: state.mouseYaw, jump: false, jumpHold: false }
    }
    const forward =
      (state.keys.has(actionCode('moveForward')) ? 1 : 0) -
      (state.keys.has(actionCode('moveBack')) ? 1 : 0)
    const strafe =
      (state.keys.has(actionCode('moveRight')) ? 1 : 0) -
      (state.keys.has(actionCode('moveLeft')) ? 1 : 0)
    const input: SimInput = {
      moveX: strafe,
      moveZ: -forward,
      yaw: state.mouseYaw,
      jump: airborne ? false : state.jumpEdgeQueued,
      jumpHold: state.keys.has(actionCode('jump')),
    }
    state.jumpEdgeQueued = false
    return input
  }

  return { engageCanvasInput, disengageCanvasInput, requestArenaPointerLock, sampleInput }
}

function nthMagicSlotIndex(loadout: readonly string[], wantedIdx: number): number {
  let seen = 0
  for (let idx = 0; idx < loadout.length; idx++) {
    const id = loadout[idx]
    if (!id) continue
    const family = getAbilitySlotFamily(id)
    if (family !== 'magicBase' && family !== 'magicAdvanced') continue
    if (seen === wantedIdx) return idx
    seen++
  }
  return -1
}
