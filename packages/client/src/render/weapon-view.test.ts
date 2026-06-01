import { describe, expect, it } from 'vitest'

import { WEAPON_VIEW, getWeaponView } from './weapon-view.js'

// Locks the per-weapon view invariants. The critical one: first-person weapons
// MUST hide the player's own body (view === 'first'), and an unknown weapon must
// default to a first-person config so a transient bad value never flashes the
// character model in first person.
describe('weapon-view config', () => {
  it('bow and staff are first-person, sword is third-person', () => {
    expect(WEAPON_VIEW.bow.view).toBe('first')
    expect(WEAPON_VIEW.staff.view).toBe('first')
    expect(WEAPON_VIEW.sword.view).toBe('third')
  })

  it('first-person weapons sit at the eye (camBack 0); sword orbits back', () => {
    expect(WEAPON_VIEW.bow.camBack).toBe(0)
    expect(WEAPON_VIEW.staff.camBack).toBe(0)
    expect(WEAPON_VIEW.sword.camBack).toBeGreaterThan(0)
  })

  it('first-person weapons declare a viewmodel; sword declares none', () => {
    expect(WEAPON_VIEW.bow.viewModel).toBe('fpvBow')
    expect(WEAPON_VIEW.staff.viewModel).toBe('staticViewmodel')
    expect(WEAPON_VIEW.sword.viewModel).toBe('none')
  })

  it('fov deltas: bow narrows (more while drawn), staff fixed narrow, sword neutral', () => {
    expect(WEAPON_VIEW.bow.fovDelta(0)).toBeLessThan(0)
    expect(WEAPON_VIEW.bow.fovDelta(1)).toBeLessThan(WEAPON_VIEW.bow.fovDelta(0))
    expect(WEAPON_VIEW.staff.fovDelta(0)).toBeLessThan(0)
    expect(WEAPON_VIEW.sword.fovDelta(0)).toBe(0)
  })

  it('getWeaponView defaults an unknown/missing weapon to a first-person config', () => {
    // Guarantees the body is never shown for a stray key (the body-flash fix).
    expect(getWeaponView(undefined).view).toBe('first')
    expect(getWeaponView(null).view).toBe('first')
    expect(getWeaponView('garbage').view).toBe('first')
  })

  it('returns the exact config for a known weapon', () => {
    expect(getWeaponView('sword')).toBe(WEAPON_VIEW.sword)
    expect(getWeaponView('bow')).toBe(WEAPON_VIEW.bow)
  })
})
