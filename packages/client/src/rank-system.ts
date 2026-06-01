/**
 * Rank System — RAGEQUIT
 * Progressione basata su vittorie. 12 gradi con nomi dark-humor.
 */

export interface Rank {
  id: string
  /** Nome del grado — dark humor, non infantile */
  name: string
  /** Tagline ironica mostrata sotto il nome */
  subtitle: string
  /** Vittorie minime per raggiungere questo grado */
  minWins: number
  /** Colore principale del badge */
  color: string
  /** Colore del glow/shadow */
  glowColor: string
  /** Emoji identificativo */
  icon: string
}

export const RANKS: readonly Rank[] = [
  {
    id: 'fresh_meat',
    name: 'Fresh Meat',
    subtitle: 'Statisticamente già morto, carne da macello',
    minWins: 0,
    color: '#8a8a9a',
    glowColor: 'rgba(138,138,154,0.25)',
    icon: '🪣',
  },
  {
    id: 'bone_collector',
    name: 'Bone Collector',
    subtitle: 'Raccoglie frammenti scheletrici dai nemici caduti',
    minWins: 5,
    color: '#aaaabc',
    glowColor: 'rgba(170,170,188,0.25)',
    icon: '🦴',
  },
  {
    id: 'headhunter',
    name: 'Headhunter',
    subtitle: 'Taglie in aumento, cacciatore spietato ed efficiente',
    minWins: 15,
    color: '#7eb8d4',
    glowColor: 'rgba(126,184,212,0.3)',
    icon: '💀',
  },
  {
    id: 'bloodbath_gladiator',
    name: 'Bloodbath Gladiator',
    subtitle: 'Adora il caos puro e banchetta nelle arene più feroci',
    minWins: 35,
    color: '#e67e22',
    glowColor: 'rgba(230,126,34,0.36)',
    icon: '🩸',
  },
  {
    id: 'soul_harvester',
    name: 'Soul Harvester',
    subtitle: 'Nessun testimone vivente rimasto a raccontare',
    minWins: 65,
    color: '#9b59b6',
    glowColor: 'rgba(155,89,182,0.35)',
    icon: '⚰️',
  },
  {
    id: 'apex_reaper',
    name: 'Apex Reaper',
    subtitle: "Il predatore perfetto all'apice delle competitive",
    minWins: 110,
    color: '#ff6b35',
    glowColor: 'rgba(255,107,53,0.45)',
    icon: '☠️',
  },
  {
    id: 'ragequit_legend',
    name: 'Ragequit Legend',
    subtitle: 'Così dominante da spingere gli avversari ad arrendersi',
    minWins: 180,
    color: '#ffd260',
    glowColor: 'rgba(255,210,96,0.5)',
    icon: '👑',
  },
] as const

/** Ritorna il grado corrente per il numero di vittorie dato. */
export function getRank(wins: number): Rank {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    const rank = RANKS[i]
    if (rank && wins >= rank.minWins) return rank
  }
  return RANKS[0]!
}

/** Ritorna il prossimo grado, o null se al massimo. */
export function getNextRank(wins: number): Rank | null {
  const current = getRank(wins)
  const idx = RANKS.findIndex((r) => r.id === current.id)
  return idx >= 0 && idx < RANKS.length - 1 ? (RANKS[idx + 1] ?? null) : null
}

/**
 * Aggiorna il badge del grado nel pannello profilo.
 * @param wins - numero di vittorie del giocatore
 */
export function updateRankBadge(wins: number): void {
  const badge = document.getElementById('profile-rank-badge')
  if (!badge) return

  const rank = getRank(wins)
  const next = getNextRank(wins)
  const winsToNext = next ? next.minWins - wins : 0
  const progressPct = next ? ((wins - rank.minWins) / (next.minWins - rank.minWins)) * 100 : 100

  badge.style.setProperty('--rank-color', rank.color)
  badge.style.setProperty('--rank-glow', rank.glowColor)

  const iconEl = badge.querySelector('.rank-icon')
  const nameEl = badge.querySelector('.rank-name')
  const subEl = badge.querySelector('.rank-subtitle')
  const barEl = badge.querySelector<HTMLElement>('.rank-progress-fill')
  const nextEl = badge.querySelector('.rank-next-label')

  if (iconEl) iconEl.textContent = rank.icon
  if (nameEl) nameEl.textContent = rank.name
  if (subEl) subEl.textContent = rank.subtitle
  if (barEl) barEl.style.width = `${Math.min(100, progressPct).toFixed(1)}%`
  if (nextEl) {
    nextEl.textContent = next ? `${winsToNext} vitt. → ${next.name}` : '★ Grado Massimo'
  }
}
