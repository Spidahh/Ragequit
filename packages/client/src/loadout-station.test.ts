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
      <div id="ls-detail-name"></div>
      <div id="ls-detail-meta"></div>
      <div id="ls-detail-desc"></div>
      <div id="ls-detail-malus"></div>
      <button id="ls-detail-instant"></button>
      <input id="ls-search" />
      <button data-filter="all"></button>
      <button data-filter="instant"></button>
      <button data-filter="preview"></button>
      <button data-filter="fire"></button>
      <button data-filter="ice"></button>
      <button data-filter="lightning"></button>
      <button data-filter="dark"></button>
      <button data-filter="nature"></button>
      <button data-filter="none"></button>
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

  it('keeps the expected 11-slot keyboard layout', () => {
    expect(__loadoutStationSmoke.slotOrder).toEqual([
      'melee',
      'bow',
      'magic',
      'magic',
      'magic',
      'magic',
      'magic',
      'utility',
      'utility',
      'utility',
      'utility',
    ])
    expect(__loadoutStationSmoke.defaultSlots).toHaveLength(11)
  })

  it('sends a loadout message including classId and instantCast', () => {
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
    expect(msg['melee']).toEqual(['uppercut'])
    expect(msg['bow']).toEqual(['marksman_shot'])
    expect(msg['magicBase']).toEqual(['fireball', 'lightning_dash'])
    expect(msg['magicAdvanced']).toEqual(['arc_lift', 'meteor'])
    expect(msg['utility']).toEqual([
      'adaptive_mend',
      'quick_dash',
      'cleanse_surge',
      'barrier',
      'smoke_screen',
    ])
    // Wire payload stays class-aware; there is no generic magic bucket.
    expect(msg['magic']).toBeUndefined()
    expect(api.getLoadout()).toHaveLength(11)
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
          'quick_dash',
          'cleanse_surge',
          'barrier',
        ],
      }),
    )

    const send = vi.fn()
    const room = { send } as never
    const api = initLoadoutStation(() => room)

    api.open()
    document.getElementById('ls-confirm')?.click()

    const msg = send.mock.calls[0]?.[1] as Record<string, unknown>
    expect(msg['magicBase']).toEqual(['fireball', 'lightning_dash'])
    expect(msg['magicAdvanced']).toEqual(['arc_lift', 'meteor'])
    expect(msg['utility']).toEqual([
      'adaptive_mend',
      'quick_dash',
      'cleanse_surge',
      'barrier',
      'smoke_screen',
    ])
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

  it('defaults placed spells to preview and persists explicit instant-cast overrides', () => {
    const api = initLoadoutStation(() => undefined)

    expect(api.isInstantCast('flame_wall')).toBe(false)
    expect(api.isInstantCast('fireball')).toBe(true)

    api.open()
    document.getElementById('ls-detail-instant')?.click()

    const stored = JSON.parse(
      localStorage.getItem(__loadoutStationSmoke.instantCastStorageKey) ?? '{}',
    ) as Record<string, boolean>
    expect(stored['uppercut']).toBe(false)
    expect(api.isInstantCast('uppercut')).toBe(false)
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
    expect(document.getElementById('ls-confirm')?.textContent).toBe('LOCKED IN COMBAT')
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
    document.getElementById('ls-detail-instant')?.click()

    expect(api.getLoadout().join('|')).toBe(before)
    expect(localStorage.getItem(__loadoutStationSmoke.storageKey)).toBeNull()
    expect(document.querySelector<HTMLButtonElement>('.pool-card')?.disabled).toBe(true)
  })

  it('resets pool filters when selecting another loadout slot', () => {
    const api = initLoadoutStation(() => undefined)

    api.open()
    document.querySelector<HTMLButtonElement>('[data-filter="instant"]')?.click()
    expect(
      document
        .querySelector<HTMLButtonElement>('[data-filter="instant"]')
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
        .querySelector<HTMLButtonElement>('[data-filter="instant"]')
        ?.classList.contains('active-filter'),
    ).toBe(false)
  })

  it('supports cast-mode filters in the ability pool', () => {
    const api = initLoadoutStation(() => undefined)

    api.open()
    document.querySelectorAll<HTMLButtonElement>('.ls-slot')[2]?.click()

    document.querySelector<HTMLButtonElement>('[data-filter="preview"]')?.click()
    expect(
      document
        .querySelector<HTMLButtonElement>('[data-filter="preview"]')
        ?.classList.contains('active-filter'),
    ).toBe(true)

    document.querySelector<HTMLButtonElement>('[data-filter="instant"]')?.click()
    expect(
      document
        .querySelector<HTMLButtonElement>('[data-filter="instant"]')
        ?.classList.contains('active-filter'),
    ).toBe(true)
  })

  it('uses the selected class slot family when building the ability pool', () => {
    localStorage.setItem(__loadoutStationSmoke.classStorageKey, 'mage')
    const api = initLoadoutStation(() => undefined)

    api.open()

    expect(document.getElementById('ls-pool-title')?.textContent).toBeFalsy()
    expect(document.getElementById('ls-pool')?.textContent).toContain('Fireball')
    expect(document.getElementById('ls-pool')?.textContent).not.toContain(
      'No abilities available for this slot.',
    )
    expect(document.getElementById('ls-melee')?.children).toHaveLength(0)
    expect(document.getElementById('ls-magic-base')?.children.length).toBeGreaterThan(0)
    expect(document.getElementById('ls-magic-advanced')?.children.length).toBeGreaterThan(0)
  })
})
