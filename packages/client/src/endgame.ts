import { ABILITY_DEFS } from '@ragequit/shared'

export interface PlayerSummary {
  name: string
  build: string // e.g. "FIRE 5/5 · SWORD MAIN"
  kills: number
  damageDealt: number
  damageTaken: number
  knockups: number | string
  parries: number
  comboProcs: number
  abilitiesUsed?: Record<string, number>
}

export interface ScoreboardData {
  arena: string // "RING_NORTH"
  matchMs: number // total match duration (ms)
  isWin: boolean // local player won the match (drives the WIN/LOSE header)
  rounds: string // "2-1 rounds"
  league: string // "Bronze III"
  winner: PlayerSummary
  loser: PlayerSummary
  eloBefore: number
  eloDelta: number
}

// Multi-player end screen (FFA ranked table / 5v5 team table).
export interface MultiScoreRow {
  name: string
  build: string
  kills: number
  isSelf: boolean
  team: 'red' | 'blue' | ''
}
export interface MultiScoreboard {
  kind: 'multi'
  arena: string
  matchMs: number
  isWin: boolean
  /** Header line: "TUTTI CONTRO TUTTI" or "ROSSO 12 — 9 BLU". */
  title: string
  /** Hide the kill column when the mode never reported per-player kills. */
  showKills: boolean
  rows: MultiScoreRow[]
}

export interface DeathcamData {
  killer: string
  ability: string // "LIFE DRAIN"
  element: string // "DARK"
  damage: number // last hit dmg
  round: string // "2 / 3"
  yourDamage: number
  yourHits: number
  yourProcs: number
  yourParries: number
  timeToNextMs: number
}

// ── SCOREBOARD ────────────────────────────────────────────────────────
export function renderScoreboard(host: HTMLElement, data: ScoreboardData | MultiScoreboard): void {
  if ('rows' in data) {
    renderMultiScoreboard(host, data)
    return
  }
  const ms = data.matchMs
  const mm = Math.floor(ms / 60_000)
  const ss = Math.floor((ms % 60_000) / 1000)
  const time = `${String(mm).padStart(2, '0')} : ${String(ss).padStart(2, '0')}`

  const headline = data.isWin ? 'VICTORY' : 'DEFEAT'
  const outcome = data.isWin ? 'WIN.' : 'LOSE.'
  host.innerHTML = `
    <div class="scoreboard-shell ${data.isWin ? 'is-win' : 'is-loss'}" id="scoreboard">
      <div class="sb-head">
        <div>
          <div class="sb-winner">${headline} · ${escapeHtml(data.arena)}</div>
          <div class="sb-title">YOU <span class="ele">${outcome}</span></div>
        </div>
        <div class="sb-meta">
          <b>${time}</b>
          Match · ${escapeHtml(data.rounds)}<br>
          League ${escapeHtml(data.league)}
        </div>
      </div>
      <div class="sb-body">
        ${playerBlock(data.winner, false)}
        <div class="sb-vs">VS</div>
        ${playerBlock(data.loser, true)}
      </div>
      <div class="sb-foot">
        <div class="sb-elo">
          ELO · <b>${data.eloBefore}</b> &nbsp;
          ${data.eloDelta >= 0 ? '+' : ''}${data.eloDelta}
          → <b>${data.eloBefore + data.eloDelta}</b>
        </div>
        <div class="sb-actions">
          <span class="sb-chip primary">SPC / ESC · MENU</span>
        </div>
      </div>
    </div>
  `
}

function renderMultiScoreboard(host: HTMLElement, data: MultiScoreboard): void {
  const ms = data.matchMs
  const mm = Math.floor(ms / 60_000)
  const ss = Math.floor((ms % 60_000) / 1000)
  const time = `${String(mm).padStart(2, '0')} : ${String(ss).padStart(2, '0')}`
  const rowsHtml = data.rows
    .map((r, i) => {
      const cls = ['sb-trow', r.isSelf ? 'is-self' : '', r.team ? `team-${r.team}` : '']
        .filter(Boolean)
        .join(' ')
      return `
        <div class="${cls}">
          <span class="sb-rank">${r.team ? (r.team === 'red' ? '🔴' : '🔵') : `#${i + 1}`}</span>
          <span class="sb-tname">${escapeHtml(r.name)}${r.isSelf ? ' · TU' : ''}</span>
          <span class="sb-tbuild">${escapeHtml(r.build)}</span>
          <span class="sb-tkills">${data.showKills ? r.kills : ''}</span>
        </div>`
    })
    .join('')
  host.innerHTML = `
    <div class="scoreboard-shell ${data.isWin ? 'is-win' : 'is-loss'}" id="scoreboard">
      <div class="sb-head">
        <div>
          <div class="sb-winner">${data.isWin ? 'VICTORY' : 'DEFEAT'} · ${escapeHtml(data.arena)}</div>
          <div class="sb-title">${escapeHtml(data.title)}</div>
        </div>
        <div class="sb-meta"><b>${time}</b></div>
      </div>
      <div class="sb-table">
        ${data.showKills ? '<div class="sb-trow head"><span class="sb-rank"></span><span class="sb-tname">GIOCATORE</span><span class="sb-tbuild">BUILD</span><span class="sb-tkills">KILL</span></div>' : ''}
        ${rowsHtml}
      </div>
      <div class="sb-foot">
        <div></div>
        <div class="sb-actions"><span class="sb-chip primary">SPC / ESC · MENU</span></div>
      </div>
    </div>
  `
}

function playerBlock(p: PlayerSummary, lose: boolean): string {
  let abilitiesHtml = ''
  if (p.abilitiesUsed && Object.keys(p.abilitiesUsed).length > 0) {
    abilitiesHtml = `<div class="sb-abilities-header">Abilities Used</div>`
    for (const [id, count] of Object.entries(p.abilitiesUsed)) {
      const name = ABILITY_DEFS[id]?.name ?? id.toUpperCase()
      abilitiesHtml += `<div class="sb-row sub"><span class="l">${escapeHtml(name)}</span><span class="v">x${count}</span></div>`
    }
  }

  return `
    <div class="sb-player${lose ? ' lose' : ''}">
      <div class="sb-nm">${escapeHtml(p.name)}</div>
      <div class="sb-tag">${escapeHtml(p.build)}</div>
      ${row('Kills', p.kills)}
      ${row('Damage dealt', p.damageDealt.toLocaleString())}
      ${row('Damage taken', p.damageTaken.toLocaleString())}
      ${row('Knockups', p.knockups)}
      ${row('Parries', p.parries)}
      ${row('Combo procs', p.comboProcs)}
      ${abilitiesHtml}
    </div>
  `
}
function row(l: string, v: string | number): string {
  return `<div class="sb-row"><span class="l">${l}</span><span class="v">${v}</span></div>`
}

// ── DEATH CAM ─────────────────────────────────────────────────────────
export function renderDeathcam(host: HTMLElement, data: DeathcamData): void {
  host.innerHTML = `
    <div class="deathcam-shell" id="deathcam">
      <div class="dc-killer-silhouette"></div>
      <div class="dc-killer-glow"></div>
      <div class="dc-overlay">
        <div class="dc-banner">
          <div class="dc-eliminated">ELIMINATO</div>
          <div class="dc-by">
            KILLED BY
            <b>${escapeHtml(data.killer.toUpperCase())}</b>
            <div class="dc-tape">${escapeHtml(data.element)} · ${escapeHtml(data.ability)} · ${data.damage} DMG</div>
          </div>
        </div>
        <div class="dc-bottom">
          <div class="dc-card death">
            <div class="l">FINAL HIT</div>
            <div class="v blood">−${data.damage} HP</div>
            <div class="meta">${escapeHtml(data.ability)}</div>
          </div>
          <div class="dc-card">
            <div class="l">ROUND</div>
            <div class="v brass">${escapeHtml(data.round)}</div>
            <div class="meta">Next round in ${Math.ceil(data.timeToNextMs / 1000)}s</div>
          </div>
          <div class="dc-card">
            <div class="l">YOUR DAMAGE</div>
            <div class="v">${data.yourDamage.toLocaleString()}</div>
            <div class="meta">${data.yourHits} hits · ${data.yourProcs} procs · ${data.yourParries} parry</div>
          </div>
        </div>
      </div>
      <div class="dc-replay">
        <span class="k">SPC</span><span>SKIP</span>
      </div>
      <div class="dc-watermark">UNDERGROUND · FIGHT · LEAGUE</div>
    </div>
  `
}

function escapeHtml(s: string | number): string {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c]!,
  )
}
