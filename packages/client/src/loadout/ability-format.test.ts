import { describe, expect, it } from 'vitest'

import {
  formatCost,
  statusControlScore,
  statusTag,
  escapeHtml,
  formatDesc,
  tagClass,
  typeBadgeClass,
  abilityReadability,
} from './ability-format.js'

const def = (over: Record<string, unknown>) => ({ costMana: 0, costStamina: 0, ...over }) as never

describe('ability-format', () => {
  describe('formatCost', () => {
    it('formats mana, stamina, both, and free', () => {
      expect(formatCost(def({ costMana: 5 }))).toBe('5 MP')
      expect(formatCost(def({ costStamina: 8 }))).toBe('8 SP')
      expect(formatCost(def({ costMana: 5, costStamina: 8 }))).toBe('5MP + 8SP')
      expect(formatCost(def({}))).toBe('GRATIS')
    })
  })

  describe('statusControlScore', () => {
    it('hard CC scores 3, soft 2, dots 1, unknown 1', () => {
      expect(statusControlScore('stun')).toBe(3)
      expect(statusControlScore('slow')).toBe(2)
      expect(statusControlScore('burn')).toBe(1)
      expect(statusControlScore('whatever')).toBe(1)
    })
  })

  describe('statusTag', () => {
    it('uppercases, appends duration, and shows stacks > 1', () => {
      expect(statusTag('burn', 3)).toBe('BURN 3s')
      expect(statusTag('bleed', 4, 2)).toBe('BLEED x2 4s')
      expect(statusTag('chill', 2, 1)).toBe('CHILL 2s') // single stack not shown
    })
  })

  describe('escapeHtml', () => {
    it('escapes the dangerous characters', () => {
      expect(escapeHtml('<b>"a"&\'b\'</b>')).toBe(
        '&lt;b&gt;&quot;a&quot;&amp;&#39;b&#39;&lt;/b&gt;',
      )
    })
  })

  describe('formatDesc', () => {
    it('bolds numbers and color-codes status words (after escaping)', () => {
      const out = formatDesc('Deal 12 Burn damage')
      expect(out).toContain('<b>12</b>')
      expect(out).toContain('ds-fire')
    })
  })

  describe('tagClass / typeBadgeClass', () => {
    it('maps tags and natures to css classes', () => {
      expect(tagClass('25 DMG')).toBe('tag-damage')
      expect(tagClass('STUN 2s')).toBe('tag-control')
      expect(typeBadgeClass('CONTROLLO AREA')).toBe('cc-area')
      expect(typeBadgeClass('UTILITY')).toBe('utility')
    })
  })

  describe('abilityReadability', () => {
    it('explains a point zone with its real placement and effect', () => {
      const readable = abilityReadability(
        def({
          slot: 'magic',
          targeting: 'point',
          range: 18,
          effects: [
            {
              at: 'onCast',
              kind: 'zone',
              radius: 4,
              durationSec: 6,
              tickEverySec: 1,
              damagePerTick: 5,
            },
          ],
        }),
      )
      expect(readable.shape).toBe('area')
      expect(readable.shapeLabel).toBe('AREA 4 M')
      expect(readable.instruction).toContain('LMB CONFERMA')
      expect(readable.outcome).toContain('5 danni/impulso')
    })

    it('distinguishes projectile aim from self effects', () => {
      const projectile = abilityReadability(
        def({
          slot: 'magic',
          targeting: 'forward',
          range: 30,
          effects: [{ at: 'onCast', kind: 'projectile', speedMps: 20, gravityMps2: 0, damage: 16 }],
        }),
      )
      expect(projectile.shape).toBe('line')
      expect(projectile.instruction).toContain('MIRA E SPARA')
      expect(projectile.outcome).toBe('16 danni')
    })
  })
})
