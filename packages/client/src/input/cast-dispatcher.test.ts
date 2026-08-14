import { describe, expect, it, vi } from 'vitest'

import { initCastDispatcher, type CastDispatchParams } from './cast-dispatcher.js'
import type { GameInputState } from './game-input.js'

// fireball/uppercut/quick_dash aim with the crosshair; meteor is ground-targeted.
const LOADOUT = ['fireball', 'meteor', 'uppercut', 'quick_dash']

function setup(): {
  d: ReturnType<typeof initCastDispatcher>
  sendCast: ReturnType<typeof vi.fn>
  hide: ReturnType<typeof vi.fn>
  tick: (over?: Partial<CastDispatchParams>) => void
  inp: GameInputState
} {
  const sendCast = vi.fn()
  const hide = vi.fn()
  const d = initCastDispatcher({
    getLoadout: () => LOADOUT,
    hidePlacementVisual: hide,
    sendCast,
    showShootFlash: () => {},
  })
  const inp = {
    lmbDown: false,
    lmbPressEdge: false,
    lmbReleaseEdge: false,
    rmbDown: false,
    rmbPressEdge: false,
    rmbReleaseEdge: false,
  } as unknown as GameInputState
  const tick = (over: Partial<CastDispatchParams> = {}): void => {
    d.dispatch({
      inp,
      bowCharge: { bowChargeStartMs: 0, bowChargeServerAcked: false },
      room: { send: () => {} },
      schemaTick: 100,
      combatLive: true,
      dead: false,
      activeWeapon: 'sword',
      ...over,
    })
  }
  return { d, sendCast, hide, tick, inp }
}

// The model before this fired every ability on key-UP after showing a shape on
// key-DOWN. The owner's three reports were all that model: the shape flashed for
// two frames on a tap ("you can't tell where you're aiming, it disappears"), the
// cast had already left so a following click hit with the weapon ("left click
// doesn't do it"), and "armed" had no persistent indicator at all.
//
// Only 7 of 53 abilities are `point`. The other 46 aim with the crosshair, so a
// modal aim state bought them nothing.
describe('crosshair-aimed abilities fire on the press edge', () => {
  it('casts immediately, with no aiming step', () => {
    const { d, sendCast, tick } = setup()
    d.activateAbilitySlot(0)
    tick()
    expect(sendCast).toHaveBeenCalledWith('fireball', 101)
    expect(d.getPlacementAbilityId()).toBeNull()
  })

  it('does not wait for, or react to, the key coming back up', () => {
    const { d, sendCast, tick } = setup()
    d.activateAbilitySlot(2)
    tick()
    expect(sendCast).toHaveBeenCalledTimes(1)
    d.releaseAbilitySlot(2)
    tick()
    expect(sendCast).toHaveBeenCalledTimes(1)
  })

  it('leaves the left click meaning "weapon" afterwards', () => {
    const { d, sendCast, tick, inp } = setup()
    d.activateAbilitySlot(0)
    tick()
    expect(sendCast).toHaveBeenCalledTimes(1)
    inp.lmbPressEdge = true
    tick()
    // Still one: the click was the weapon, not a leftover spell.
    expect(sendCast).toHaveBeenCalledTimes(1)
  })

  it('lets two abilities fire in sequence', () => {
    const { d, sendCast, tick } = setup()
    d.activateAbilitySlot(0)
    tick()
    d.activateAbilitySlot(2)
    tick()
    expect(sendCast).toHaveBeenNthCalledWith(1, 'fireball', 101)
    expect(sendCast).toHaveBeenNthCalledWith(2, 'uppercut', 101)
  })
})

describe('ground-targeted abilities wait for a click', () => {
  it('arms instead of casting, and stays armed', () => {
    const { d, sendCast, tick } = setup()
    d.activateAbilitySlot(1)
    expect(d.getPlacementAbilityId()).toBe('meteor')
    // Many frames later it is STILL armed — no timeout. A state that expires on
    // its own is a state you cannot trust.
    for (let i = 0; i < 50; i++) tick()
    expect(d.getPlacementAbilityId()).toBe('meteor')
    expect(sendCast).not.toHaveBeenCalled()
  })

  it('casts on the confirming click', () => {
    const { d, sendCast, tick, inp } = setup()
    d.activateAbilitySlot(1)
    inp.lmbPressEdge = true
    tick()
    expect(sendCast).toHaveBeenCalledWith('meteor', 101)
    expect(d.getPlacementAbilityId()).toBeNull()
  })

  it('cancels on right click without casting', () => {
    const { d, sendCast, tick, inp } = setup()
    d.activateAbilitySlot(1)
    inp.rmbPressEdge = true
    tick()
    expect(sendCast).not.toHaveBeenCalled()
    expect(d.getPlacementAbilityId()).toBeNull()
  })

  it('replaces the armed ability when another ground ability is pressed', () => {
    const { d, tick } = setup()
    d.activateAbilitySlot(1)
    d.activateAbilitySlot(1)
    tick()
    expect(d.getPlacementAbilityId()).toBe('meteor')
  })

  // Pressing a crosshair-aimed ability while placing should do the obvious
  // thing: fire it and drop the placement, not leave two armed states.
  it('a crosshair ability clears the placement and fires', () => {
    const { d, sendCast, tick } = setup()
    d.activateAbilitySlot(1)
    d.activateAbilitySlot(0)
    tick()
    expect(sendCast).toHaveBeenCalledWith('fireball', 101)
    expect(d.getPlacementAbilityId()).toBeNull()
  })

  it('hides the visual when the placement ends', () => {
    const { d, hide, tick, inp } = setup()
    d.activateAbilitySlot(1)
    inp.lmbPressEdge = true
    tick()
    expect(hide).toHaveBeenCalled()
  })
})

describe('a queued cast never survives losing control of the character', () => {
  it('drops the queue when combat is not live', () => {
    const { d, sendCast, tick } = setup()
    d.activateAbilitySlot(0)
    tick({ combatLive: false })
    expect(sendCast).not.toHaveBeenCalled()
  })

  it('drops the queue while dead, so respawn does not auto-fire it', () => {
    const { d, sendCast, tick } = setup()
    d.activateAbilitySlot(0)
    tick({ dead: true })
    tick()
    expect(sendCast).not.toHaveBeenCalled()
  })

  it('disarms a placement when the round ends', () => {
    const { d, tick } = setup()
    d.activateAbilitySlot(1)
    tick({ combatLive: false })
    expect(d.getPlacementAbilityId()).toBeNull()
  })
})
