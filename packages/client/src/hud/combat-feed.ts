import type { ServerKillStreakMessage } from '@ragequit/shared'

export interface CombatFeedElements {
  comboFlash: HTMLElement
  comboPopup: HTMLElement
  killFeed: HTMLElement
  streakBonus: HTMLElement
  streakCount: HTMLElement
  streakDisplay: HTMLElement
}

export interface CombatFeedHud {
  addKillFeedEntry: (
    killerName: string,
    victimName: string,
    isSelfKill: boolean,
    isSelfDied: boolean,
  ) => void
  showComboPopupLabel: (text: string) => void
  showComboPopupText: (count: number) => void
  showKillSplash: (text: string, kind: 'kill' | 'died') => void
  triggerComboFlash: () => void
  updateKillStreak: (msg: ServerKillStreakMessage, selfId: string) => void
}

export function createCombatFeedHud({
  comboFlash,
  comboPopup,
  killFeed,
  streakBonus,
  streakCount,
  streakDisplay,
}: CombatFeedElements): CombatFeedHud {
  let comboPopupTimer: ReturnType<typeof setTimeout> | null = null
  let streakHideTimer: ReturnType<typeof setTimeout> | null = null
  let streakCountEl = streakCount

  function addKillFeedEntry(
    killerName: string,
    victimName: string,
    isSelfKill: boolean,
    isSelfDied: boolean,
  ): void {
    const entry = document.createElement('div')
    const cls = ['kill-entry']
    if (isSelfKill) cls.push('self-kill')
    if (isSelfDied) cls.push('self-died')
    entry.className = cls.join(' ')

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
    while (killFeed.children.length > 6) killFeed.removeChild(killFeed.firstChild!)
    setTimeout(() => entry.remove(), 5200)
  }

  function showKillSplash(text: string, kind: 'kill' | 'died'): void {
    const el = document.createElement('div')
    el.className = `kill-splash ${kind}`
    el.textContent = text
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 1600)
  }

  function triggerComboFlash(): void {
    comboFlash.classList.add('active')
    void comboFlash.offsetHeight
    comboFlash.classList.remove('active')
  }

  function showComboPopupLabel(text: string): void {
    if (comboPopupTimer !== null) clearTimeout(comboPopupTimer)
    comboPopup.textContent = text
    comboPopup.classList.remove('pop')
    void comboPopup.offsetHeight
    comboPopup.classList.add('pop')
    comboPopupTimer = setTimeout(() => {
      comboPopup.classList.remove('pop')
      comboPopupTimer = null
    }, 900)
  }

  function updateKillStreak(msg: ServerKillStreakMessage, selfId: string): void {
    if (msg.playerId !== selfId) return

    if (msg.streak === 0) {
      streakDisplay.classList.add('hidden')
      if (streakHideTimer !== null) {
        clearTimeout(streakHideTimer)
        streakHideTimer = null
      }
      return
    }

    const label =
      msg.streak >= 5
        ? `UNSTOPPABLE  ×${msg.streak}`
        : msg.streak === 4
          ? 'DOMINATING   ×4'
          : msg.streak === 3
            ? 'TRIPLE KILL  ×3'
            : msg.streak === 2
              ? 'DOUBLE KILL  ×2'
              : `KILL  ×${msg.streak}`

    streakCountEl.textContent = label
    const fresh = streakCountEl.cloneNode(true) as HTMLElement
    streakCountEl.replaceWith(fresh)
    fresh.id = 'streak-count'
    streakCountEl = fresh

    if (msg.damageBonus > 0) {
      streakBonus.textContent = `+${Math.round(msg.damageBonus * 100)}% damage`
      streakBonus.style.display = ''
    } else {
      streakBonus.style.display = 'none'
    }

    streakDisplay.classList.remove('hidden')

    if (streakHideTimer !== null) clearTimeout(streakHideTimer)
    streakHideTimer = setTimeout(() => {
      streakDisplay.classList.add('hidden')
      streakHideTimer = null
    }, 6000)
  }

  return {
    addKillFeedEntry,
    showComboPopupLabel,
    showComboPopupText: (count: number) => showComboPopupLabel(`COMBO! ×${count}`),
    showKillSplash,
    triggerComboFlash,
    updateKillStreak,
  }
}
