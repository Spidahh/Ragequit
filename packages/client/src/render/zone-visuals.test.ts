import { describe, expect, it } from 'vitest'

import { zoneProfile } from './zone-visuals.js'

describe('zone visual identity', () => {
  it('separates zones that previously shared the same cylinder', () => {
    expect(zoneProfile('volley', 'none', 'circle')).toBe('volley')
    expect(zoneProfile('snare_trap', 'none', 'circle')).toBe('trap')
    expect(zoneProfile('blizzard', 'ice', 'circle')).toBe('ice')
    expect(zoneProfile('storm_field', 'lightning', 'circle')).toBe('storm')
    expect(zoneProfile('thorn_field', 'nature', 'circle')).toBe('thorns')
    expect(zoneProfile('smoke_screen', 'dark', 'circle')).toBe('smoke')
  })

  it('preserves walls as a separate silhouette', () => {
    expect(zoneProfile('ice_wall', 'ice', 'wall')).toBe('wall')
  })
})
