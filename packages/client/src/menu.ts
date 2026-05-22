// Main menu + round HUD + scoreboard (Fase 7).
//
// Three small overlays driven from server MatchPhase + Score events:
//   - main-menu: shown pre-connect; PLAY routes through the loadout station
//     to confirm the build, then focuses the in-game canvas.
//   - round-hud: per-round phase + countdown + win pips. Shown during
//     'countdown' / 'live' / 'roundEnd'; hidden in 'lobby' / 'matchEnd'.
//   - scoreboard: shown on 'matchEnd', dismissed by BACK TO MENU.
//
// Settings is live: video/audio/input values and keybinds persist locally.

import {
  MATCH_ROUNDS_TO_WIN,
  FFA_KILLS_TO_WIN,
  TEAM_KILLS_TO_WIN,
  type ServerMatchPhaseMessage,
  type ServerScoreMessage,
} from '@ragequit/shared'

import { initKeybindLabels, initKeybindSettings } from './input/keybinds.js'
import { renderScoreboard, type ScoreboardData } from './endgame.js'

export type MenuChoice = 'play1v1' | 'training' | 'loadout' | 'stats' | 'settings'
export type GraphicsQuality = 'low' | 'med' | 'high'

const SETTINGS_STORAGE_KEY = 'ragequit.settings.v1'
interface SettingsData {
  quality: GraphicsQuality
  fov: number
  sens: number // raw value (0.0004..0.008)
  volume: number // 0..1
}
function loadSettings(): SettingsData {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (raw)
      return {
        quality: 'med',
        fov: 90,
        sens: 0.0022,
        volume: 0.55,
        ...JSON.parse(raw),
      } as SettingsData
  } catch {
    /* ignore */
  }
  return { quality: 'med', fov: 90, sens: 0.0022, volume: 0.55 }
}
function saveSettings(s: SettingsData): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

export interface MenuApi {
  showMain: () => void
  hideMain: () => void
  showScoreboard: (selfId: string, scoreboardData?: ScoreboardData) => void
  hideScoreboard: () => void
  onMatchPhase: (msg: ServerMatchPhaseMessage, selfId: string) => void
  onScore: (msg: ServerScoreMessage, selfId: string, otherId: string) => void
  getSettings: () => SettingsData
}

export function initMenu(handlers: {
  onPlay: () => void
  onFfa: () => void
  onTraining: () => void
  onLoadout: () => void
  onScoreboardBack: () => void
  onFovChange: (fov: number) => void
  onSensChange: (sens: number) => void
  onVolumeChange: (vol: number) => void
  onGraphicsChange: (quality: GraphicsQuality) => void
}): MenuApi {
  const mainMenu = document.getElementById('main-menu')!
  const roundHud = document.getElementById('round-hud')!
  const roundPhase = document.getElementById('round-phase')!
  const roundCountdown = document.getElementById('round-countdown')!
  const killCounter = document.getElementById('kill-counter')!
  const pipsSelf = document.getElementById('round-pips-self')!
  const pipsOther = document.getElementById('round-pips-other')!
  const scoreboard = document.getElementById('scoreboard')!
  const sbWinner = document.getElementById('scoreboard-winner')!
  const sbSelf = document.getElementById('scoreboard-self')!
  const sbOther = document.getElementById('scoreboard-other')!
  const sbBack = document.getElementById('scoreboard-back') as HTMLButtonElement
  const settingsOverlay = document.getElementById('settings-overlay')!
  initKeybindLabels()
  document.body.classList.add('main-menu-active')

  document.getElementById('menu-play')?.addEventListener('click', () => handlers.onPlay())
  document.getElementById('menu-ffa')?.addEventListener('click', () => handlers.onFfa())
  document.getElementById('menu-train')?.addEventListener('click', () => handlers.onTraining())
  document.getElementById('menu-loadout')?.addEventListener('click', () => handlers.onLoadout())
  // Delegated click listener on scoreboard to support dynamic scoreboard templates
  scoreboard.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null
    if (!target) return
    const isChip = target.closest('.sb-chip')
    const isMenuButton = target.closest('#scoreboard-back')
    const hasMenuText = target.textContent?.toUpperCase().includes('MENU')
    if (isChip || isMenuButton || hasMenuText) {
      handlers.onScoreboardBack()
    }
  })

  // ---- Settings panel ---------------------------------------------------
  const settings = loadSettings()

  // Sensitivity slider: map raw (0.0004..0.008) → slider units (4..80)
  // by multiplying by 10 000. Displayed as a 1–80 integer for clarity.
  const fovSlider = document.getElementById('setting-fov') as HTMLInputElement
  const fovVal = document.getElementById('setting-fov-val')!
  const sensSlider = document.getElementById('setting-sens') as HTMLInputElement
  const sensVal = document.getElementById('setting-sens-val')!
  const volSlider = document.getElementById('setting-vol') as HTMLInputElement
  const volVal = document.getElementById('setting-vol-val')!
  const qualityBtns = document.querySelectorAll<HTMLButtonElement>('.quality-btn')
  initKeybindSettings(settingsOverlay)

  /** Display sensitivity as integer 1-80 so players understand it naturally. */
  function sensToDisplay(raw: number): string {
    return String(Math.round(raw * 10000))
  }

  function applySettings(): void {
    // FOV
    fovVal.textContent = `${settings.fov}°`
    fovSlider.value = String(settings.fov)
    handlers.onFovChange(settings.fov)
    // Sensitivity — show as integer (4–80), not the raw decimal
    sensVal.textContent = sensToDisplay(settings.sens)
    sensSlider.value = String(Math.round(settings.sens * 10000))
    handlers.onSensChange(settings.sens)
    // Volume
    volVal.textContent = `${Math.round(settings.volume * 100)}%`
    volSlider.value = String(Math.round(settings.volume * 100))
    handlers.onVolumeChange(settings.volume)
    // Graphics
    qualityBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset['quality'] === settings.quality)
    })
    handlers.onGraphicsChange(settings.quality)
    saveSettings(settings)
  }

  // Initialise UI from persisted data.
  applySettings()

  // FOV slider
  fovSlider.addEventListener('input', () => {
    settings.fov = parseInt(fovSlider.value)
    fovVal.textContent = `${settings.fov}°`
    handlers.onFovChange(settings.fov)
    saveSettings(settings)
  })

  // Sensitivity slider
  sensSlider.addEventListener('input', () => {
    settings.sens = parseInt(sensSlider.value) / 10000
    sensVal.textContent = sensToDisplay(settings.sens)
    handlers.onSensChange(settings.sens)
    saveSettings(settings)
  })

  // Volume slider
  volSlider.addEventListener('input', () => {
    settings.volume = parseInt(volSlider.value) / 100
    volVal.textContent = `${Math.round(settings.volume * 100)}%`
    handlers.onVolumeChange(settings.volume)
    saveSettings(settings)
  })

  // Graphics quality buttons
  qualityBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      settings.quality = (btn.dataset['quality'] ?? 'med') as GraphicsQuality
      qualityBtns.forEach((b) => b.classList.toggle('active', b === btn))
      handlers.onGraphicsChange(settings.quality)
      saveSettings(settings)
    })
  })

  // Open / close settings overlay
  document.getElementById('menu-settings')?.addEventListener('click', () => {
    settingsOverlay.dataset['returnTo'] = 'main'
    mainMenu.classList.add('hidden')
    settingsOverlay.classList.remove('hidden')
  })
  document.getElementById('settings-back-btn')?.addEventListener('click', () => {
    settingsOverlay.classList.add('hidden')
    if (settingsOverlay.dataset['returnTo'] === 'pause') {
      document.getElementById('pause-menu')?.classList.remove('hidden')
    } else {
      mainMenu.classList.remove('hidden')
    }
    settingsOverlay.dataset['returnTo'] = ''
  })

  function rebuildPips(container: HTMLElement, wins: number): void {
    while (container.firstChild) container.removeChild(container.firstChild)
    for (let i = 0; i < MATCH_ROUNDS_TO_WIN; i++) {
      const pip = document.createElement('div')
      pip.className = i < wins ? 'pip win' : 'pip'
      container.appendChild(pip)
    }
  }
  rebuildPips(pipsSelf, 0)
  rebuildPips(pipsOther, 0)

  // Drive a 1 Hz countdown ticker for the 'countdown' / 'roundEnd' phases.
  let countdownEndsAt = 0
  let countdownTimer: number | null = null
  function startCountdown(ms: number): void {
    countdownEndsAt = performance.now() + ms
    if (countdownTimer === null) {
      countdownTimer = window.setInterval(() => {
        const left = Math.max(0, countdownEndsAt - performance.now())
        if (left <= 0) {
          roundCountdown.textContent = ''
          if (countdownTimer !== null) {
            clearInterval(countdownTimer)
            countdownTimer = null
          }
        } else {
          roundCountdown.textContent = (left / 1000).toFixed(1)
        }
      }, 100) as unknown as number
    }
  }

  function stopCountdown(): void {
    countdownEndsAt = 0
    roundCountdown.textContent = ''
    if (countdownTimer !== null) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }

  function setPhase(phase: ServerMatchPhaseMessage['phase'], ms?: number): void {
    roundPhase.textContent = phase.toUpperCase()
    switch (phase) {
      case 'lobby':
        stopCountdown()
        roundHud.classList.add('hidden')
        killCounter.classList.add('hidden')
        break
      case 'countdown':
        roundHud.classList.remove('hidden')
        if (ms) startCountdown(ms)
        break
      case 'live':
        roundHud.classList.remove('hidden')
        roundCountdown.textContent = ''
        break
      case 'roundEnd':
        roundHud.classList.remove('hidden')
        if (ms) startCountdown(ms)
        break
      case 'matchEnd':
        stopCountdown()
        roundHud.classList.add('hidden')
        break
    }
  }

  return {
    showMain: () => {
      setPhase('lobby')
      document.body.classList.add('main-menu-active')
      mainMenu.classList.remove('hidden')
    },
    hideMain: () => {
      document.body.classList.remove('main-menu-active')
      mainMenu.classList.add('hidden')
    },
    showScoreboard: (_selfId, scoreboardData) => {
      if (scoreboardData) {
        renderScoreboard(scoreboard, scoreboardData)
      }
      scoreboard.classList.remove('hidden')
    },
    hideScoreboard: () => scoreboard.classList.add('hidden'),
    getSettings: () => settings,
    onMatchPhase: (msg, _selfId) => {
      setPhase(msg.phase, msg.countdownMs)
    },
    onScore: (msg, selfId, otherId) => {
      if (msg.roundWins) {
        // 1v1 round mode — show pips, hide kill counter
        const wins = msg.roundWins
        const selfWins = wins[selfId] ?? 0
        const otherWins = wins[otherId] ?? 0
        rebuildPips(pipsSelf, selfWins)
        rebuildPips(pipsOther, otherWins)
        pipsSelf.style.display = ''
        pipsOther.style.display = ''
        killCounter.classList.add('hidden')
        sbSelf.textContent = String(selfWins)
        sbOther.textContent = String(otherWins)
        if (selfWins >= MATCH_ROUNDS_TO_WIN) sbWinner.textContent = 'YOU WIN'
        else if (otherWins >= MATCH_ROUNDS_TO_WIN) sbWinner.textContent = 'YOU LOSE'
        else sbWinner.textContent = 'DRAW'
      } else if (msg.solo) {
        // FFA mode — live kill counter in the round HUD; no pips needed
        const solo = msg.solo
        const selfKills = solo[selfId] ?? 0
        const topKills = Math.max(0, ...Object.values(solo))
        const isLeading = selfKills === topKills && selfKills > 0
        killCounter.textContent = `${selfKills} / ${FFA_KILLS_TO_WIN} kills${isLeading ? ' 👑 LEADING' : ` · leader: ${topKills}`}`
        killCounter.classList.remove('hidden')
        pipsSelf.style.display = 'none'
        pipsOther.style.display = 'none'
        sbSelf.textContent = `${selfKills} kills`
        sbOther.textContent = `top: ${topKills}`
        sbWinner.textContent =
          selfKills >= FFA_KILLS_TO_WIN
            ? 'YOU WIN'
            : topKills >= FFA_KILLS_TO_WIN
              ? 'GAME OVER'
              : 'ONGOING'
      } else if (msg.team) {
        // 5v5 team mode — live team kill counter; no round pips needed
        const team = msg.team
        const red = team['red'] ?? 0
        const blue = team['blue'] ?? 0
        killCounter.textContent = `🔴 ${red}  ·  🔵 ${blue} / ${TEAM_KILLS_TO_WIN}`
        killCounter.classList.remove('hidden')
        pipsSelf.style.display = 'none'
        pipsOther.style.display = 'none'
        sbSelf.textContent = `Red ${red}`
        sbOther.textContent = `Blue ${blue}`
        sbWinner.textContent =
          red >= TEAM_KILLS_TO_WIN ? 'RED WINS' : blue >= TEAM_KILLS_TO_WIN ? 'BLUE WINS' : ''
      }
    },
  }
}
