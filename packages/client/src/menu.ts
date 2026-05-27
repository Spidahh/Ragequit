// Main menu + round HUD + scoreboard.
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
  type ClassId,
} from '@ragequit/shared'

import { renderScoreboard, type ScoreboardData } from './endgame.js'
import { initKeybindLabels, initKeybindSettings } from './input/keybinds.js'
import { initMenuBackground } from './menu-bg.js'

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
  updateProfile: (profile: { currentClass: ClassId | null; equippedSpells: string[] }) => void
}

export function initMenu(handlers: {
  onPlay: () => void
  onFfa: () => void
  onTraining: (difficulty: 'novice' | 'competent' | 'master') => void
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
  const settingsOverlay = document.getElementById('settings-overlay')!
  initKeybindLabels()
  document.body.classList.add('main-menu-active')

  // Initialize live 3D menu background
  const menuBg = initMenuBackground()
  menuBg.start()

  document.getElementById('menu-play')?.addEventListener('click', () => handlers.onPlay())
  document.getElementById('menu-ffa')?.addEventListener('click', () => handlers.onFfa())

  // Toggle the training options sub-menu container
  const menuTrain = document.getElementById('menu-train')!
  const menuTrainOptions = document.getElementById('menu-train-options')!
  menuTrain.addEventListener('click', () => {
    menuTrainOptions.classList.toggle('hidden')
  })

  document
    .getElementById('menu-train-novice')
    ?.addEventListener('click', () => handlers.onTraining('novice'))
  document
    .getElementById('menu-train-competent')
    ?.addEventListener('click', () => handlers.onTraining('competent'))
  document
    .getElementById('menu-train-master')
    ?.addEventListener('click', () => handlers.onTraining('master'))

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
      menuBg.start()
    },
    hideMain: () => {
      document.body.classList.remove('main-menu-active')
      mainMenu.classList.add('hidden')
      menuBg.stop()
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
    updateProfile: (profile) => {
      const playBtn = document.getElementById('menu-play') as HTMLButtonElement
      const ffaBtn = document.getElementById('menu-ffa') as HTMLButtonElement
      const trainBtn = document.getElementById('menu-train') as HTMLButtonElement
      const noviceBtn = document.getElementById('menu-train-novice') as HTMLButtonElement
      const competentBtn = document.getElementById('menu-train-competent') as HTMLButtonElement
      const masterBtn = document.getElementById('menu-train-master') as HTMLButtonElement
      const forgeBtn = document.getElementById('menu-loadout') as HTMLButtonElement | null
      const statusEl = document.getElementById('pc-loadout-status')
      const statusTextEl = document.getElementById('pc-loadout-text')

      const isValid =
        !!profile.currentClass &&
        Array.isArray(profile.equippedSpells) &&
        profile.equippedSpells.some(Boolean)

      if (!isValid) {
        const previewEl = document.getElementById('menu-loadout-preview')
        if (previewEl) previewEl.style.removeProperty('--class-color')

        if (statusEl) statusEl.className = 'pc-loadout-status pc-loadout-status--unconfigured'
        const iconEl = statusEl?.querySelector('.pc-loadout-icon')
        if (iconEl) iconEl.textContent = '⚠'
        if (statusTextEl) statusTextEl.textContent = 'Configura il loadout nel Forge'

        // Forge pulses to guide the user towards configuring their loadout
        forgeBtn?.classList.add('forge-tile--cta')

        // Lock competitive modes only — training redirects to Forge by itself
        ;[playBtn, ffaBtn].forEach((btn) => {
          if (btn) {
            btn.disabled = true
            btn.classList.add('locked')
            if (!btn.querySelector('.lock-icon')) {
              const lock = document.createElement('span')
              lock.className = 'lock-icon'
              lock.textContent = '🔒'
              btn.appendChild(lock)
            }
            btn.title = 'Configura il tuo Loadout Forge prima di giocare'
          }
        })
        // Training is always accessible — handler redirects to Forge if needed
        ;[trainBtn, noviceBtn, competentBtn, masterBtn].forEach((btn) => {
          if (btn) {
            btn.disabled = false
            btn.classList.remove('locked')
            btn.classList.add('mode-tile--available')
            btn.querySelector('.lock-icon')?.remove()
            btn.title = ''
          }
        })
      } else {
        const classId = profile.currentClass as ClassId
        const CLASS_COLORS: Record<ClassId, string> = {
          tank: '#d4a04a',
          archer: '#2ecc71',
          mage: '#3498db',
          hybrid: '#00f0ff',
        }
        const previewEl = document.getElementById('menu-loadout-preview')
        if (previewEl) previewEl.style.setProperty('--class-color', CLASS_COLORS[classId] || '#ffd260')

        menuBg.updateClass(classId)

        // Loadout ready — stop forge pulse
        forgeBtn?.classList.remove('forge-tile--cta')

        if (statusEl) statusEl.className = 'pc-loadout-status pc-loadout-status--ready'
        const iconEl = statusEl?.querySelector('.pc-loadout-icon')
        if (iconEl) iconEl.textContent = '✓'
        if (statusTextEl) statusTextEl.textContent = 'Loadout pronto'

        ;[playBtn, ffaBtn, trainBtn, noviceBtn, competentBtn, masterBtn].forEach((btn) => {
          if (btn) {
            btn.disabled = false
            btn.classList.remove('locked', 'mode-tile--available')
            btn.querySelector('.lock-icon')?.remove()
            btn.title = ''
          }
        })
      }
    },
  }
}
