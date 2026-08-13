import { MessageTypes } from '@ragequit/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { __loadoutStationSmoke, initLoadoutStation } from './loadout-station.js'

function mountLoadoutDom(): void {
  document.body.innerHTML = `
      <div id="loadout-station" class="hidden">
      <div id="ls-melee"></div>
      <div id="ls-bow"></div>
      <div id="ls-magic-base"></div>
      <div id="ls-magic-advanced"></div>
      <div id="ls-utility"></div>
      <input id="ls-search" />
      <button data-filter="recommended"></button>
      <button data-filter="control"></button>
      <button data-filter="projectile"></button>
      <button data-filter="recovery"></button>
      <button data-filter="zone"></button>
      <button data-filter="mobility"></button>
      <button data-filter="all"></button>
      <div id="ls-pool"></div>
      <button id="ls-back"></button>
      <button id="ls-default"></button>
      <button id="ls-confirm"></button>
    </div>
  `
}

describe('loadout station smoke', () => {
  beforeEach(() => {
    localStorage.clear()
    mountLoadoutDom()
  })

  it('keeps the default build at 8 class-aware slots', () => {
    expect(__loadoutStationSmoke.defaultSlots).toHaveLength(8)
  })

  it('sends a class-aware loadout message', () => {
    const send = vi.fn()
    const room = { send } as never
    const api = initLoadoutStation(() => room)

    api.open()
    document.getElementById('ls-confirm')?.click()

    expect(send).toHaveBeenCalledOnce()
    expect(send.mock.calls[0]?.[0]).toBe(MessageTypes.Loadout)
    const msg = send.mock.calls[0]?.[1] as Record<string, unknown>
    // classId must always be sent for server-side class validation
    expect(msg['classId']).toBe('hybrid')
    // class-aware envelope: arrays classified by target slot family
    // Hybrid now: 2 melee + 1 bow + 2 magicBase + 1 magicAdvanced + 2 utility = 8
    expect(msg['melee']).toEqual(['uppercut', 'gap_closer'])
    expect(msg['bow']).toEqual(['marksman_shot'])
    expect(msg['magicBase']).toEqual(['fireball', 'lightning_dash'])
    expect(msg['magicAdvanced']).toEqual(['arc_lift'])
    expect(msg['utility']).toEqual(['adaptive_mend', 'quick_dash'])
    // Locked as an exact set on purpose: the server validates what it is sent,
    // so an extra field going out unnoticed is a build the player did not make.
    expect(Object.keys(msg).sort()).toEqual([
      'bow',
      'classId',
      'magicAdvanced',
      'magicBase',
      'melee',
      'specializationId',
      'utility',
    ])
    expect(api.getLoadout()).toHaveLength(8)
  })

  it('resets an incompatible saved build before sending the active class loadout', () => {
    localStorage.setItem(__loadoutStationSmoke.classStorageKey, 'hybrid')
    localStorage.setItem(
      __loadoutStationSmoke.storageKey,
      JSON.stringify({
        slots: [
          'uppercut',
          'marksman_shot',
          'fireball',
          'lightning_dash',
          'chain_bolt',
          'arc_lift',
          'meteor',
          'adaptive_mend',
        ],
      }),
    )

    const send = vi.fn()
    const room = { send } as never
    const api = initLoadoutStation(() => room)

    api.open()
    document.getElementById('ls-confirm')?.click()

    const msg = send.mock.calls[0]?.[1] as Record<string, unknown>
    // Incompatible saved build is reset to the hybrid preset (2m+1b+2mb+1ma+2u)
    expect(msg['melee']).toEqual(['uppercut', 'gap_closer'])
    expect(msg['magicBase']).toEqual(['fireball', 'lightning_dash'])
    expect(msg['magicAdvanced']).toEqual(['arc_lift'])
    expect(msg['utility']).toEqual(['adaptive_mend', 'quick_dash'])
    expect(api.getLoadout()).not.toContain('chain_bolt')
  })

  it('saves local builds before connecting without treating it as a back action', () => {
    const onClose = vi.fn()
    const onSaved = vi.fn()
    const api = initLoadoutStation(() => undefined, undefined, onClose, undefined, onSaved)

    api.open()
    document.getElementById('ls-confirm')?.click()

    expect(onSaved).toHaveBeenCalledOnce()
    expect(onClose).not.toHaveBeenCalled()
    expect(document.getElementById('loadout-station')?.classList.contains('hidden')).toBe(true)
  })

  it('uses launch-specific confirm copy when opening from a play flow', () => {
    const api = initLoadoutStation(
      () => undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      () => 'START TRAINING',
    )

    api.open()

    expect(document.getElementById('ls-confirm')?.textContent).toBe('START TRAINING')
  })

  it('does not send or close when build changes are locked', () => {
    const send = vi.fn()
    const room = { send } as never
    const api = initLoadoutStation(
      () => room,
      undefined,
      undefined,
      () => false,
    )

    api.open()
    document.getElementById('ls-confirm')?.click()

    expect(send).not.toHaveBeenCalled()
    expect(document.getElementById('loadout-station')?.classList.contains('hidden')).toBe(false)
    expect(document.getElementById('ls-confirm')?.textContent).toBe('BLOCCATO IN BATTAGLIA')
  })

  it('keeps build editing read-only while locked', () => {
    const room = { send: vi.fn() } as never
    const api = initLoadoutStation(
      () => room,
      undefined,
      undefined,
      () => false,
    )

    api.open()
    const before = api.getLoadout().join('|')
    document.querySelector<HTMLButtonElement>('.pool-card:not(.equipped)')?.click()
    document.getElementById('ls-default')?.click()

    expect(api.getLoadout().join('|')).toBe(before)
    expect(localStorage.getItem(__loadoutStationSmoke.storageKey)).toBeNull()
    expect(document.querySelector<HTMLButtonElement>('.pool-card')?.disabled).toBe(true)
  })

  it('resets pool filters when selecting another loadout slot', () => {
    const api = initLoadoutStation(() => undefined)

    api.open()
    document.querySelector<HTMLButtonElement>('[data-filter="control"]')?.click()
    expect(
      document
        .querySelector<HTMLButtonElement>('[data-filter="control"]')
        ?.classList.contains('active-filter'),
    ).toBe(true)

    document.querySelectorAll<HTMLButtonElement>('.ls-slot')[1]?.click()

    expect(document.querySelector<HTMLInputElement>('#ls-search')?.value).toBe('')
    expect(
      document
        .querySelector<HTMLButtonElement>('[data-filter="all"]')
        ?.classList.contains('active-filter'),
    ).toBe(true)
    expect(
      document
        .querySelector<HTMLButtonElement>('[data-filter="control"]')
        ?.classList.contains('active-filter'),
    ).toBe(false)
  })

  it('supports functional filters in the ability pool', () => {
    const api = initLoadoutStation(() => undefined)

    api.open()
    document.querySelectorAll<HTMLButtonElement>('.ls-slot')[2]?.click()

    document.querySelector<HTMLButtonElement>('[data-filter="projectile"]')?.click()
    expect(
      document
        .querySelector<HTMLButtonElement>('[data-filter="projectile"]')
        ?.classList.contains('active-filter'),
    ).toBe(true)

    document.querySelector<HTMLButtonElement>('[data-filter="mobility"]')?.click()
    expect(
      document
        .querySelector<HTMLButtonElement>('[data-filter="mobility"]')
        ?.classList.contains('active-filter'),
    ).toBe(true)
  })

  it('uses the selected class slot family when building the ability pool', () => {
    localStorage.setItem(__loadoutStationSmoke.classStorageKey, 'mage')
    const api = initLoadoutStation(() => undefined)

    api.open()

    expect(document.getElementById('ls-pool')?.textContent).toContain('Fireball')
    expect(document.getElementById('ls-pool')?.textContent).not.toContain(
      'No abilities available for this slot.',
    )
    expect(document.getElementById('ls-melee')?.children).toHaveLength(0)
    expect(document.getElementById('ls-magic-base')?.children.length).toBeGreaterThan(0)
    expect(document.getElementById('ls-magic-advanced')?.children.length).toBeGreaterThan(0)
  })
})
