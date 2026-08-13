import { beforeEach, describe, expect, it } from 'vitest'

import { createInputGating } from './input-gating.js'

function setup(over: { connected?: boolean; phase?: string } = {}) {
  document.body.className = ''
  document.body.innerHTML = `
    <div id="pause-menu" class="hidden"></div>
    <div id="settings" class="hidden"></div>
    <div id="loadout-station" class="hidden"></div>`
  const pauseMenu = document.getElementById('pause-menu')!
  const settingsOverlay = document.getElementById('settings')!
  const gating = createInputGating({
    isConnected: () => over.connected ?? true,
    matchPhase: () => over.phase ?? 'live',
    pauseMenu,
    settingsOverlay,
  })
  return { gating, pauseMenu, settingsOverlay }
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('createInputGating', () => {
  it('lets combat input through in a live match with nothing in the way', () => {
    const { gating } = setup()
    expect(gating.canEngageGameplaySurface()).toBe(true)
    expect(gating.isGameplayInputAllowed()).toBe(true)
  })

  // The whole point of the split: you can look around before the bell, but your
  // attacks must not count.
  it('allows engaging the surface but not fighting outside a live match', () => {
    const { gating } = setup({ phase: 'warmup' })
    expect(gating.canEngageGameplaySurface()).toBe(true)
    expect(gating.isGameplayInputAllowed()).toBe(false)
  })

  it.each([
    ['pause menu', () => document.getElementById('pause-menu')!.classList.remove('hidden')],
    ['settings overlay', () => document.getElementById('settings')!.classList.remove('hidden')],
    [
      'loadout station',
      () => document.getElementById('loadout-station')!.classList.remove('hidden'),
    ],
    ['main menu body class', () => document.body.classList.add('main-menu-active')],
    ['loadout body class', () => document.body.classList.add('loadout-active')],
  ])('blocks gameplay input while the %s is up', (_name, open) => {
    const { gating } = setup()
    open()
    expect(gating.isGameplayInputAllowed()).toBe(false)
    expect(gating.canEngageGameplaySurface()).toBe(false)
  })

  it('blocks everything before the room exists', () => {
    const { gating } = setup({ connected: false })
    expect(gating.canEngageGameplaySurface()).toBe(false)
    expect(gating.isGameplayInputAllowed()).toBe(false)
  })

  // The station is built lazily, so a reference captured at boot is null forever
  // and the gate would silently pass while the Forge is open.
  it('treats a missing loadout station as hidden, not as an error', () => {
    const { gating } = setup()
    document.getElementById('loadout-station')!.remove()
    expect(gating.loadoutStationHidden()).toBe(true)
  })
})
