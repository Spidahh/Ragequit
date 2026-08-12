import { describe, expect, it } from 'vitest'

import { projectileProfile, damageTier } from './projectile-visuals.js'

describe('projectile visual identity', () => {
  it('uses mechanic-specific silhouettes instead of only element colors', () => {
    expect(projectileProfile('bolt', 'fire', 'fireball')).toBe('orb')
    expect(projectileProfile('bolt', 'ice', 'frost_bolt')).toBe('shard')
    expect(projectileProfile('bolt', 'lightning', 'chain_bolt')).toBe('lance')
    expect(projectileProfile('bolt', 'dark', 'shadow_bolt')).toBe('drain')
    expect(projectileProfile('bolt', 'nature', 'poison_dart')).toBe('thorn')
  })

  it('gives every bow mechanic its own flight silhouette', () => {
    expect(projectileProfile('arrow', 'none', 'piercing_shot')).toBe('piercingArrow')
    expect(projectileProfile('arrow', 'none', 'pin_shot')).toBe('pinArrow')
    expect(projectileProfile('arrow', 'none', 'marksman_shot')).toBe('marksmanArrow')
    expect(projectileProfile('arrow', 'none', 'broadhead')).toBe('broadheadArrow')
    expect(projectileProfile('arrow', 'fire', 'blast_arrow')).toBe('blastArrow')
  })
})

// Regression: `damage` arrives on the wire and was discarded, so an 8-damage
// poke rendered at exactly the same size and brightness as a 38-damage
// finisher — the "a basic attack must not visually rival an ultimate" rule was
// not applied at all.
describe('damageTier', () => {
  it('separates pokes, solid hits and finishers', () => {
    expect(damageTier(8)).toBeLessThan(damageTier(20))
    expect(damageTier(20)).toBeLessThan(damageTier(38))
  })

  it('keeps a poke visibly smaller than a finisher', () => {
    expect(damageTier(38) / damageTier(8)).toBeGreaterThan(1.5)
  })
})
