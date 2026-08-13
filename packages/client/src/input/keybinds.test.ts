import { beforeEach, describe, expect, it } from 'vitest'

import { actionCode, actionLabel, resetKeybinds, setKeybind } from './keybinds.js'

describe('keybind settings', () => {
  beforeEach(() => {
    localStorage.clear()
    resetKeybinds()
  })

  // The wheel actions this used to exercise are deleted. Slots 5 and 6 now sit
  // on the Q/E the wheels occupied, so the swap rule is checked on them.
  it('swaps conflicting bindings instead of creating duplicate actions', () => {
    setKeybind('slot5', 'KeyE')

    expect(actionCode('slot5')).toBe('KeyE')
    // slot6 held KeyE, so it must have taken slot5's old key rather than
    // leaving two actions on one key.
    expect(actionCode('slot6')).toBe('KeyQ')
    expect(actionLabel('slot5')).toBe('E')
    expect(actionLabel('slot6')).toBe('Q')
  })

  it('feeds labels from remappable bindings', () => {
    setKeybind('jump', 'KeyY')

    expect(actionCode('jump')).toBe('KeyY')
    expect(actionLabel('jump')).toBe('Y')
  })
})
