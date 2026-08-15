// Remote-player nameplates: the HP fill and the status-badge row.
//
// Extracted out of remote-players.ts, which sits on the 800-line hard limit
// (file-budget: AGENTS.md). Both functions were already module-level and take everything
// they need as arguments, so they are typed against the narrow shape they
// actually touch rather than the whole RemoteState.

/** Ordered by priority: the first CC_STATUS_MAX_BADGES matches are shown. */
export const CC_STATUS_META: ReadonlyArray<{
  kind: string
  icon: string
  color: string
  hardCC: boolean
}> = [
  { kind: 'freeze', icon: '❄', color: '#00E5FF', hardCC: true },
  { kind: 'stun', icon: '⚡', color: '#FFE600', hardCC: true },
  { kind: 'blind', icon: '◉', color: '#AA55FF', hardCC: true },
  { kind: 'root', icon: '⬡', color: '#39FF14', hardCC: true },
  { kind: 'slow', icon: '↓', color: '#AA77FF', hardCC: false },
  { kind: 'chill', icon: '❄', color: '#80EEFF', hardCC: false },
  { kind: 'curse', icon: '✦', color: '#6A0DAD', hardCC: false },
  { kind: 'burn', icon: '🔥', color: '#FF4500', hardCC: false },
  { kind: 'bleed', icon: '◆', color: '#FF3344', hardCC: false },
  { kind: 'poison', icon: '◆', color: '#39FF14', hardCC: false },
]

export const CC_STATUS_MAX_BADGES = 4

export interface NameplateHpTarget {
  hp: number
  hpMax: number
  hpFill: HTMLElement
  nameplate: HTMLElement
}

export interface NameplateStatusTarget {
  lastStatusKey: string
  statusRow: HTMLElement
  statusBadges: Map<string, HTMLElement>
}

/** Paint the HP fill width + colour and the low-HP glow on a remote nameplate. */
export function paintNameplateHp(r: NameplateHpTarget, now: number): void {
  const pct = Math.max(0, Math.min(1, r.hp / r.hpMax))
  r.hpFill.style.width = `${pct * 100}%`
  if (pct > 0.55) {
    r.hpFill.style.background = 'linear-gradient(90deg,#1a8a3a,#2ec850,#70f090)'
    r.nameplate.style.boxShadow = ''
  } else if (pct > 0.28) {
    r.hpFill.style.background = 'linear-gradient(90deg,#a87010,#d4a020,#f0c840)'
    r.nameplate.style.boxShadow = ''
  } else {
    r.hpFill.style.background = 'linear-gradient(90deg,#c82020,#f04040,#ff7070)'
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.007)
    const gAlpha = (0.25 + pulse * 0.35).toFixed(2)
    r.nameplate.style.boxShadow = `0 0 ${10 + pulse * 14}px rgba(220,30,30,${gAlpha}), 0 2px 12px rgba(0,0,0,0.6)`
  }
}

/**
 * Update the status icon row.
 *
 * The DOM is rebuilt only when the SET of active kinds changes; hard-CC
 * countdowns are then written in place every frame, so a stunned opponent does
 * not cost a full re-layout per frame.
 */
export function updateStatusRow(
  r: NameplateStatusTarget,
  statuses: ReadonlyArray<{ kind: string; stacks: number; remainingSec: number }>,
): void {
  const active: Array<{ meta: (typeof CC_STATUS_META)[0]; remainingSec: number }> = []
  for (const meta of CC_STATUS_META) {
    if (active.length >= CC_STATUS_MAX_BADGES) break
    const found = statuses.find((s) => s.kind === meta.kind)
    if (found) active.push({ meta, remainingSec: found.remainingSec })
  }

  const newKey = active.map((a) => a.meta.kind).join(',')
  if (newKey !== r.lastStatusKey) {
    r.lastStatusKey = newKey
    r.statusRow.innerHTML = ''
    r.statusBadges.clear()
    for (const { meta } of active) {
      const badge = document.createElement('span')
      badge.dataset['kind'] = meta.kind
      badge.style.cssText = [
        'display:inline-flex',
        'align-items:center',
        'gap:2px',
        'font:700 9px/1 ui-monospace,monospace',
        `color:${meta.color}`,
        `text-shadow:0 0 5px ${meta.color}80`,
        'background:rgba(0,0,0,0.65)',
        `border:1px solid ${meta.color}55`,
        'border-radius:3px',
        'padding:1px 3px',
        'white-space:nowrap',
        'letter-spacing:0.03em',
      ].join(';')
      badge.textContent = meta.icon
      r.statusRow.appendChild(badge)
      r.statusBadges.set(meta.kind, badge)
    }
  }

  for (const { meta, remainingSec } of active) {
    if (!meta.hardCC) continue
    const badge = r.statusBadges.get(meta.kind)
    if (!badge) continue
    const secStr = remainingSec > 0 ? ` ${remainingSec.toFixed(1)}s` : ''
    badge.textContent = meta.icon + secStr
  }
}
