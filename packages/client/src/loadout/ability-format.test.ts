import { describe, expect, it } from 'vitest'

import {
  formatCost,
  statusControlScore,
  statusTag,
  escapeHtml,
  formatDesc,
  tagClass,
  typeBadgeClass,
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
})
