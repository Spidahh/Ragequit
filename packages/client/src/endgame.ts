// drop-in/src/endgame.ts
// ──────────────────────────────────────────────────────────────────────
// Drop-in for end-of-match surfaces:
//   • Scoreboard (1v1 ranked match end)
//   • Death cam (between rounds — killed-by overlay)
//
// Both render into a host container you provide. Style hooks are
// already in drop-in/css/endgame.css.
// ──────────────────────────────────────────────────────────────────────

export interface PlayerSummary {
  name:         string;
  build:        string;          // e.g. "FIRE 5/5 · SWORD MAIN"
  kills:        number;
  damageDealt:  number;
  damageTaken:  number;
  knockups:     number;
  parries:      number;
  masteryProcs: number;
}

export interface ScoreboardData {
  arena:    string;              // "RING_NORTH"
  matchMs:  number;              // total match duration (ms)
  rounds:   string;              // "2-1 rounds"
  league:   string;              // "Bronze III"
  winner:   PlayerSummary;
  loser:    PlayerSummary;
  eloBefore: number;
  eloDelta:  number;
}

export interface DeathcamData {
  killer:       string;
  ability:      string;          // "LIFE DRAIN"
  element:      string;          // "DARK"
  damage:       number;          // last hit dmg
  round:        string;          // "2 / 3"
  yourDamage:   number;
  yourHits:     number;
  yourProcs:    number;
  yourParries:  number;
  timeToNextMs: number;
}

// ── SCOREBOARD ────────────────────────────────────────────────────────
export function renderScoreboard(host: HTMLElement, data: ScoreboardData): void {
  const ms = data.matchMs;
  const mm = Math.floor(ms / 60_000);
  const ss = Math.floor((ms % 60_000) / 1000);
  const time = `${String(mm).padStart(2, '0')} : ${String(ss).padStart(2, '0')}`;

  host.innerHTML = `
    <div class="sb-mock" id="scoreboard">
      <div class="sb-head">
        <div>
          <div class="sb-winner">VICTORY · ${escape(data.arena)}</div>
          <div class="sb-title">YOU <span class="ele">WIN.</span></div>
        </div>
        <div class="sb-meta">
          <b>${time}</b>
          Match · ${escape(data.rounds)}<br>
          League ${escape(data.league)}
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
          <span class="sb-chip primary">SPC · NEXT MATCH</span>
          <span class="sb-chip">L · LOADOUT</span>
          <span class="sb-chip">ESC · MENU</span>
        </div>
      </div>
    </div>
  `;
}

function playerBlock(p: PlayerSummary, lose: boolean): string {
  return `
    <div class="sb-player${lose ? ' lose' : ''}">
      <div class="sb-nm">${escape(p.name)}</div>
      <div class="sb-tag">${escape(p.build)}</div>
      ${row('Kills',         p.kills)}
      ${row('Damage dealt',  p.damageDealt.toLocaleString())}
      ${row('Damage taken',  p.damageTaken.toLocaleString())}
      ${row('Knockups',      p.knockups)}
      ${row('Parries',       p.parries)}
      ${row('Mastery procs', p.masteryProcs)}
    </div>
  `;
}
function row(l: string, v: string | number): string {
  return `<div class="sb-row"><span class="l">${l}</span><span class="v">${v}</span></div>`;
}

// ── DEATH CAM ─────────────────────────────────────────────────────────
export function renderDeathcam(host: HTMLElement, data: DeathcamData): void {
  host.innerHTML = `
    <div class="dc-mock" id="deathcam">
      <div class="dc-killer-silhouette"></div>
      <div class="dc-killer-glow"></div>
      <div class="dc-overlay">
        <div class="dc-banner">
          <div class="dc-eliminated">ELIMINATED</div>
          <div class="dc-by">
            KILLED BY
            <b>${escape(data.killer.toUpperCase())}</b>
            <div class="dc-tape">${escape(data.element)} · ${escape(data.ability)} · ${data.damage} DMG</div>
          </div>
        </div>
        <div class="dc-bottom">
          <div class="dc-card death">
            <div class="l">FINAL HIT</div>
            <div class="v blood">−${data.damage} HP</div>
            <div class="meta">${escape(data.ability)}</div>
          </div>
          <div class="dc-card">
            <div class="l">ROUND</div>
            <div class="v brass">${escape(data.round)}</div>
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
        <span class="k">R</span><span>REPLAY ANGLE</span>
      </div>
      <div class="dc-watermark">UNDERGROUND · FIGHT · LEAGUE</div>
    </div>
  `;
}

function escape(s: string | number): string {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]!);
}
