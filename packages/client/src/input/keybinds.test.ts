import { beforeEach, describe, expect, it } from 'vitest'

import {
  actionCode,
  actionLabel,
  resetKeybinds,
  setKeybind,
  slotKeybindEntries,
} from './keybinds.js'

describe('keybind settings', () => {
  beforeEach(() => {
    localStorage.clear()
    resetKeybinds()
  })

  it('swaps conflicting bindings instead of creating duplicate actions', () => {
    setKeybind('wheelAbility', 'KeyQ')

    expect(actionCode('wheelAbility')).toBe('KeyQ')
    expect(actionCode('wheelUtility')).toBe('KeyE')
    expect(actionLabel('wheelAbility')).toBe('Q')
    expect(actionLabel('wheelUtility')).toBe('E')
  })

  it('feeds the loadout slot map from remappable bindings', () => {
    setKeybind('spell1', 'KeyY')

    expect(slotKeybindEntries().find(([, , slotIdx]) => slotIdx === 2)).toEqual(['KeyY', 'Y', 2])
  })
})
