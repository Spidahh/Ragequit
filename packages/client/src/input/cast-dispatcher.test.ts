import { describe, expect, it, vi } from 'vitest'

import { initCastDispatcher, type CastDispatchParams } from './cast-dispatcher.js'
import type { GameInputState } from './game-input.js'

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

// D12. Before this, 46 of 53 abilities were fired on the press edge with
// nothing drawn — you learned a spell's shape by dying to it. Press now shows
// the shape and release commits it, uniformly, for the whole roster.
describe('press shows, release casts', () => {
  it('does not cast on the press edge alone', () => {
    const { d, sendCast, tick } = setup()
    d.activateAbilitySlot(0, false)
    tick()
    expect(sendCast).not.toHaveBeenCalled()
    expect(d.getPlacementAbilityId()).toBe('fireball')
  })

  it('casts on release, for a forward ability that used to cast blind', () => {
    const { d, sendCast, tick } = setup()
    d.activateAbilitySlot(0, false)
    d.releaseAbilitySlot(0)
    tick()
    expect(sendCast).toHaveBeenCalledWith('fireball', 101)
    expect(d.getPlacementAbilityId()).toBeNull()
  })

  it('treats a point ability exactly the same', () => {
    const { d, sendCast, tick } = setup()
    d.activateAbilitySlot(1, false)
    expect(d.getPlacementAbilityId()).toBe('meteor')
    d.releaseAbilitySlot(1)
    tick()
    expect(sendCast).toHaveBeenCalledWith('meteor', 101)
  })

  // Roll your fingers across 1 and 2 and you must not fire ability 1 with
  // ability 2's aim, nor fire twice.
  it('matches the release to the key that was pressed', () => {
    const { d, sendCast, tick } = setup()
    d.activateAbilitySlot(0, false)
    d.activateAbilitySlot(2, false)
    d.releaseAbilitySlot(0)
    tick()
    expect(sendCast).not.toHaveBeenCalled()
    expect(d.getPlacementAbilityId()).toBe('uppercut')
    d.releaseAbilitySlot(2)
    tick()
    expect(sendCast).toHaveBeenCalledTimes(1)
    expect(sendCast).toHaveBeenCalledWith('uppercut', 101)
  })

  it('ignores a release for a key that was never held', () => {
    const { d, sendCast, tick } = setup()
    d.releaseAbilitySlot(3)
    tick()
    expect(sendCast).not.toHaveBeenCalled()
  })

  it('does not cast after the preview was cancelled', () => {
    const { d, sendCast, tick } = setup()
    d.activateAbilitySlot(0, false)
    d.cancelPlacementPreview()
    d.releaseAbilitySlot(0)
    tick()
    expect(sendCast).not.toHaveBeenCalled()
  })

  it('hides the visual when the preview ends', () => {
    const { d, hide } = setup()
    d.activateAbilitySlot(0, false)
    d.releaseAbilitySlot(0)
    expect(hide).toHaveBeenCalled()
  })
})

describe('LMB confirms whatever is being previewed', () => {
  it('fires the previewed ability and clears the preview', () => {
    const { d, sendCast, tick, inp } = setup()
    d.activateAbilitySlot(0, false)
    inp.lmbPressEdge = true
    tick()
    expect(sendCast).toHaveBeenCalledWith('fireball', 101)
    expect(d.getPlacementAbilityId()).toBeNull()
  })

  // The wheel is the deliberate route in; it shows the shape too now, so the
  // careful path no longer teaches less than the fast one.
  it('previews a wheel selection instead of priming a blind cast', () => {
    const { d, sendCast, tick, inp } = setup()
    d.activateAbilitySlot(2, true)
    expect(d.getPlacementAbilityId()).toBe('uppercut')
    expect(d.getPrimedSlotIdx()).toBe(2)
    tick()
    expect(sendCast).not.toHaveBeenCalled()
    inp.lmbPressEdge = true
    tick()
    expect(sendCast).toHaveBeenCalledWith('uppercut', 101)
    expect(d.getPrimedSlotIdx()).toBeNull()
  })

  // A wheel pick is not a held key, so letting go of nothing must not fire.
  it('does not let a stale slot release fire a wheel selection', () => {
    const { d, sendCast, tick } = setup()
    d.activateAbilitySlot(2, false)
    d.activateAbilitySlot(2, true)
    d.releaseAbilitySlot(2)
    tick()
    expect(sendCast).not.toHaveBeenCalled()
  })
})

describe('a queued cast never survives losing control of the character', () => {
  it('drops the queue when combat is not live', () => {
    const { d, sendCast, tick } = setup()
    d.activateAbilitySlot(0, false)
    d.releaseAbilitySlot(0)
    tick({ combatLive: false })
    expect(sendCast).not.toHaveBeenCalled()
  })

  it('drops the queue while dead, so respawn does not auto-fire it', () => {
    const { d, sendCast, tick } = setup()
    d.activateAbilitySlot(0, false)
    d.releaseAbilitySlot(0)
    tick({ dead: true })
    tick()
    expect(sendCast).not.toHaveBeenCalled()
  })
})
