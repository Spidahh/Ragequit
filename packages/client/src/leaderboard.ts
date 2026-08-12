// Global 1v1 ELO leaderboard panel — fetched from the server's plain HTTP
// /leaderboard route (not per-match state, so no Colyseus room needed).
// Reuses the existing .sb-table/.sb-trow scoreboard styling (endgame.ts) so
// this introduces zero new visual style.

import { escapeHtml } from './loadout/ability-format.js'

interface LeaderboardEntry {
  username: string
  elo_rating: number
  wins: number
  losses: number
}

function toHttpUrl(serverUrl: string): string {
  return serverUrl.replace(/^ws/, 'http')
}

function renderRows(entries: LeaderboardEntry[]): string {
  if (entries.length === 0) {
    return `<div class="leaderboard-empty">Nessun giocatore in classifica ancora — gioca la prima 1v1!</div>`
  }
  const header = `<div class="sb-trow head"><span class="sb-rank"></span><span class="sb-tname">GIOCATORE</span><span class="sb-tbuild">V / S</span><span class="sb-tkills">ELO</span></div>`
  const rows = entries
    .map(
      (e, i) => `
        <div class="sb-trow">
          <span class="sb-rank">#${i + 1}</span>
          <span class="sb-tname">${escapeHtml(e.username || 'Player')}</span>
          <span class="sb-tbuild">${e.wins} / ${e.losses}</span>
          <span class="sb-tkills">${e.elo_rating}</span>
        </div>`,
    )
    .join('')
  return `<div class="sb-table">${header}${rows}</div>`
}

export function initLeaderboard(serverUrl: string): void {
  const overlay = document.getElementById('leaderboard-overlay')
  const body = document.getElementById('leaderboard-body')
  const openBtn = document.getElementById('menu-leaderboard')
  const backBtn = document.getElementById('leaderboard-back-btn')
  if (!overlay || !body || !openBtn || !backBtn) return

  openBtn.addEventListener('click', () => {
    overlay.classList.remove('hidden')
    body.innerHTML = `<div class="leaderboard-empty">Caricamento...</div>`
    fetch(`${toHttpUrl(serverUrl)}/leaderboard`)
      .then((res) => res.json())
      .then((data: { entries?: LeaderboardEntry[] }) => {
        body.innerHTML = renderRows(data.entries ?? [])
      })
      .catch(() => {
        body.innerHTML = `<div class="leaderboard-empty">Classifica non disponibile al momento.</div>`
      })
  })
  backBtn.addEventListener('click', () => overlay.classList.add('hidden'))
}
