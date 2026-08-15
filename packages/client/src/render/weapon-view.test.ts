import { WEAPON_IDS } from '@ragequit/shared'
import { describe, expect, it } from 'vitest'

import { WEAPON_VIEW, getWeaponView } from './weapon-view.js'

// This file used to lock the OPPOSITE contract: that the camera perspective was
// a per-weapon property, that the sword orbited 5.5 m behind the player and that
// each first-person weapon named a viewmodel. That contract is gone. RAGEQUIT is
// first person for every weapon, which is what STILE.md §8 and the reference
// list in STILE.md said all along.
//
// What is left here is the guarantee that nothing weapon-specific can creep back
// into the view except how the FOV reacts.
describe('weapon-view config', () => {
  it('exposes nothing per-weapon except the FOV response', () => {
    for (const w of WEAPON_IDS) {
      expect(Object.keys(WEAPON_VIEW[w])).toEqual(['fovDelta'])
    }
  })

  it('covers every weapon, so no weapon can fall back by accident', () => {
    for (const w of WEAPON_IDS) {
      expect(getWeaponView(w)).toBe(WEAPON_VIEW[w])
    }
  })

  // The bow's draw is the one honest aim-down-sights cue in the game: the longer
  // you hold, the tighter the shot.
  it('narrows the bow further the longer it is drawn', () => {
    expect(WEAPON_VIEW.bow.fovDelta(0)).toBeLessThan(0)
    expect(WEAPON_VIEW.bow.fovDelta(1)).toBeLessThan(WEAPON_VIEW.bow.fovDelta(0))
  })

  it('keeps the staff slightly narrow and the sword neutral', () => {
    expect(WEAPON_VIEW.staff.fovDelta(0)).toBeLessThan(0)
    expect(WEAPON_VIEW.sword.fovDelta(0)).toBe(0)
  })

  it('resolves a missing or unknown weapon instead of throwing', () => {
    for (const bad of [undefined, null, 'garbage']) {
      expect(typeof getWeaponView(bad).fovDelta(0)).toBe('number')
    }
  })
})
