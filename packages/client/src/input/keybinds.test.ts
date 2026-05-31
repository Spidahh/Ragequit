import { beforeEach, describe, expect, it } from 'vitest'

import {
  actionCode,
  actionLabel,
  resetKeybinds,
  setKeybind,
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

  it('feeds labels from remappable bindings', () => {
    setKeybind('jump', 'KeyY')

    expect(actionCode('jump')).toBe('KeyY')
    expect(actionLabel('jump')).toBe('Y')
  })
})
