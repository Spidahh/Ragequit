import { describe, expect, it } from 'vitest'

import { projectileProfile } from './projectile-visuals.js'

describe('projectile visual identity', () => {
  it('uses mechanic-specific silhouettes instead of only element colors', () => {
    expect(projectileProfile('bolt', 'fire', 'fireball')).toBe('orb')
    expect(projectileProfile('bolt', 'ice', 'frost_bolt')).toBe('shard')
    expect(projectileProfile('bolt', 'lightning', 'chain_bolt')).toBe('lance')
    expect(projectileProfile('bolt', 'dark', 'shadow_bolt')).toBe('drain')
    expect(projectileProfile('bolt', 'nature', 'poison_dart')).toBe('thorn')
  })

  it('makes high-impact arrows larger without changing ordinary arrows', () => {
    expect(projectileProfile('arrow', 'none', 'marksman_shot')).toBe('heavyArrow')
    expect(projectileProfile('arrow', 'none', 'piercing_shot')).toBe('arrow')
  })
})
