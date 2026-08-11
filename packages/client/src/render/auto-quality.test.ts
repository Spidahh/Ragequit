import { beforeEach, describe, expect, it } from 'vitest'

import { createAutoQuality, markQualityManual, type AutoQualityTier } from './auto-quality.js'

// Locks the FPS auto-tuner rules: step down one tier per bad window, only
// while live, never after a manual pick, ignore hitches, stop at 'low'.

function makeHost(start: AutoQualityTier) {
  let quality: AutoQualityTier = start
  const changes: AutoQualityTier[] = []
  return {
    host: {
      getQuality: () => quality,
      setQuality: (q: AutoQualityTier) => {
        quality = q
        changes.push(q)
      },
    },
    changes,
  }
}

/** Feed `seconds` of uniform frames at `fps`. */
function feed(aq: ReturnType<typeof createAutoQuality>, fps: number, seconds: number, live = true) {
  const dt = 1 / fps
  for (let t = 0; t < seconds; t += dt) aq.frame(dt, live)
}

describe('auto-quality', () => {
  beforeEach(() => localStorage.clear())

  it('steps down one tier after a sustained low-FPS window', () => {
    const { host, changes } = makeHost('high')
    const aq = createAutoQuality(host)
    feed(aq, 30, 9)
    expect(changes).toEqual(['med'])
  })

  it('keeps stepping on further bad windows, stopping at low', () => {
    const { host, changes } = makeHost('high')
    const aq = createAutoQuality(host)
    feed(aq, 25, 30)
    expect(changes).toEqual(['med', 'low'])
  })

  it('does nothing when the frame rate is fine', () => {
    const { host, changes } = makeHost('med')
    const aq = createAutoQuality(host)
    feed(aq, 60, 20)
    expect(changes).toEqual([])
  })

  it('ignores frames while not live (menu, loadout)', () => {
    const { host, changes } = makeHost('med')
    const aq = createAutoQuality(host)
    feed(aq, 20, 20, false)
    expect(changes).toEqual([])
  })

  it('ignores one-off hitches (shader compile, tab switch)', () => {
    const { host, changes } = makeHost('med')
    const aq = createAutoQuality(host)
    for (let i = 0; i < 100; i++) {
      aq.frame(1 / 60, true)
      aq.frame(0.5, true) // hitch — must not poison the average
    }
    expect(changes).toEqual([])
  })

  it('never runs after the player picked a quality manually', () => {
    markQualityManual()
    const { host, changes } = makeHost('high')
    const aq = createAutoQuality(host)
    feed(aq, 20, 20)
    expect(changes).toEqual([])
  })
})
