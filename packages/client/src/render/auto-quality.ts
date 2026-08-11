// Adaptive graphics quality — dependency-free replacement for GPU-tier
// databases (which need a CDN fetch). We watch the REAL frame rate during
// live play and step the quality preset down one tier at a time when the
// machine clearly can't keep up. Only ever steps DOWN, and only until the
// player touches the quality buttons themselves (manual choice wins forever).

const MANUAL_FLAG_KEY = 'ragequit.settings.qualityManual'
const WINDOW_SEC = 8 // sample length per decision
const MIN_FPS = 42 // below this average, drop a tier
const ORDER = ['high', 'med', 'low'] as const
export type AutoQualityTier = (typeof ORDER)[number]

export function markQualityManual(): void {
  try {
    localStorage.setItem(MANUAL_FLAG_KEY, 'true')
  } catch {
    /* storage optional */
  }
}

function isQualityManual(): boolean {
  try {
    return localStorage.getItem(MANUAL_FLAG_KEY) === 'true'
  } catch {
    return false
  }
}

export interface AutoQualityHost {
  getQuality: () => AutoQualityTier
  setQuality: (q: AutoQualityTier) => void
  /** Optional toast so the player knows why the game changed look. */
  notify?: (message: string) => void
}

export interface AutoQuality {
  /** Feed every rendered frame; `live` = match actually running (not menu). */
  frame: (dtSec: number, live: boolean) => void
}

export function createAutoQuality(host: AutoQualityHost): AutoQuality {
  let elapsed = 0
  let frames = 0
  let disabled = isQualityManual()

  return {
    frame(dtSec: number, live: boolean): void {
      if (disabled || !live || dtSec <= 0) return
      // Ignore hitches (tab switch, shader compile) — they aren't "the GPU is slow".
      if (dtSec > 0.25) return
      elapsed += dtSec
      frames += 1
      if (elapsed < WINDOW_SEC) return
      const avgFps = frames / elapsed
      elapsed = 0
      frames = 0
      if (avgFps >= MIN_FPS) return
      const current = host.getQuality()
      const idx = ORDER.indexOf(current)
      const next = ORDER[idx + 1]
      if (!next) {
        disabled = true // already at 'low' — nothing more to do
        return
      }
      host.setQuality(next)
      host.notify?.(`Grafica ridotta a ${next.toUpperCase()} (media ${Math.round(avgFps)} fps)`)
    },
  }
}
