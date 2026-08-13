import { describe, expect, it } from 'vitest'

import { serverStatusKeyword } from './server-status.js'

describe('serverStatusKeyword', () => {
  // Regression: the menu booted into "offline" and only corrected itself once
  // the health probe resolved. With scale-to-zero on the server that window is
  // seconds long (probe timeout: 20 s), so the first thing a new player read on
  // a perfectly healthy game was that it was offline.
  it('does not claim the server is down before the probe has answered', () => {
    expect(serverStatusKeyword('checking')).not.toContain('offline')
  })

  it('reports the verdict once the probe answers', () => {
    expect(serverStatusKeyword('online')).toBe('server online')
    expect(serverStatusKeyword('offline')).toBe('server offline')
  })

  // The keyword is turned into a CSS class by createStatusSetter, so a keyword
  // with no matching rule in game-ui.css renders unstyled.
  it('produces keywords that map to the styled class names', () => {
    for (const probe of ['checking', 'online', 'offline'] as const) {
      const cls = `status-${serverStatusKeyword(probe).replace(/\s+/g, '-')}`
      expect(cls).toMatch(/^status-[a-z-]+$/)
    }
  })
})
