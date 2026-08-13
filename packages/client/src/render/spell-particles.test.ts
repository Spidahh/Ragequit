import { describe, expect, it } from 'vitest'

import { toSpellStyle } from './spell-particles.js'

// A live tournament run crashed here: `element as SpellStyle` let 'none' — a
// legal AbilityDef element — reach STYLE_RGB, which returned undefined, and
// `const [r, g, b] = undefined` threw "undefined is not iterable" on every
// impact burst. Five separate casts made the same unchecked promise.
describe('toSpellStyle', () => {
  it('passes the six real styles through', () => {
    for (const s of ['fire', 'ice', 'lightning', 'dark', 'nature', 'neutral'] as const) {
      expect(toSpellStyle(s)).toBe(s)
    }
  })

  it("maps 'none' to neutral instead of crashing the frame", () => {
    expect(toSpellStyle('none')).toBe('neutral')
  })

  it('maps anything else it is handed to neutral', () => {
    expect(toSpellStyle('arrow')).toBe('neutral')
    expect(toSpellStyle('')).toBe('neutral')
    expect(toSpellStyle(undefined)).toBe('neutral')
    expect(toSpellStyle(null)).toBe('neutral')
  })
})
