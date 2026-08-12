// Music player — menu and combat loops with a soft crossfade.
//
// Tracks (public/audio/music/, both CC0 from OpenGameArt):
//   menu.ogg   — "Loopable Dungeon Ambience" by JaggedStone
//   combat.mp3 — "Battle Theme A" by cynicmusic (pixelsphere.org)
//
// Uses HTMLAudioElement (streams, no big decode) and respects the browser
// autoplay policy: play() attempts before the first user gesture fail
// silently and are retried by userGesture() (wired to the same pointerdown
// that unlocks the SFX engine).

type TrackId = 'menu' | 'combat'

const TRACK_SRC: Record<TrackId, string> = {
  menu: '/audio/music/menu.ogg',
  combat: '/audio/music/combat.mp3',
}
// Per-track gain trim (combat track is mastered much hotter than the ambience).
const TRACK_TRIM: Record<TrackId, number> = { menu: 1.0, combat: 0.55 }

const FADE_MS = 900
const FADE_STEPS = 18

export class MusicPlayer {
  private els = new Map<TrackId, HTMLAudioElement>()
  private current: TrackId | null = null
  private fadeTimer: ReturnType<typeof setInterval> | null = null
  private _volume = 0.3

  private el(track: TrackId): HTMLAudioElement {
    let el = this.els.get(track)
    if (!el) {
      el = new Audio(TRACK_SRC[track])
      el.loop = true
      el.preload = 'auto'
      this.els.set(track, el)
    }
    return el
  }

  get volume(): number {
    return this._volume
  }

  set volume(v: number) {
    this._volume = Math.max(0, Math.min(1, v))
    if (this.current) {
      this.el(this.current).volume = this._volume * TRACK_TRIM[this.current]
    }
  }

  /** Crossfade to `track` (no-op if already playing it). */
  play(track: TrackId): void {
    if (this.current === track) return
    const from = this.current ? this.el(this.current) : null
    const to = this.el(track)
    this.current = track
    if (this.fadeTimer) clearInterval(this.fadeTimer)

    to.volume = 0
    void to.play().catch(() => {
      /* pre-gesture autoplay block — userGesture() retries */
    })
    const target = this._volume * TRACK_TRIM[track]
    const fromStart = from?.volume ?? 0
    let step = 0
    this.fadeTimer = setInterval(() => {
      step++
      const t = step / FADE_STEPS
      to.volume = target * t
      if (from) from.volume = fromStart * (1 - t)
      if (step >= FADE_STEPS) {
        if (this.fadeTimer) clearInterval(this.fadeTimer)
        this.fadeTimer = null
        if (from && from !== to) {
          from.pause()
          from.currentTime = 0
        }
      }
    }, FADE_MS / FADE_STEPS)
  }

  /** Retry playback after the first user gesture (autoplay policy). */
  userGesture(): void {
    if (!this.current) return
    const el = this.el(this.current)
    if (el.paused) {
      el.volume = this._volume * TRACK_TRIM[this.current]
      void el.play().catch(() => {
        /* still blocked — next gesture retries */
      })
    }
  }
}
