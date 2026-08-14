import { ABILITY_DEFS } from '@ragequit/shared'
import { describe, expect, it } from 'vitest'

import { hotbarSectionForAbility, initCooldownStrip } from './cd-strip.js'

describe('hotbarSectionForAbility', () => {
  it('keeps every combat family in a separate visible section', () => {
    expect(hotbarSectionForAbility('uppercut')).toBe('melee')
    expect(hotbarSectionForAbility('pin_shot')).toBe('bow')
    expect(hotbarSectionForAbility('fireball')).toBe('staff')
    expect(hotbarSectionForAbility('arcane_rebind')).toBe('utility')
  })

  it('does not invent a section for an unknown ability', () => {
    expect(hotbarSectionForAbility('missing_ability')).toBeNull()
  })
})

// "Ready" used to mean "off cooldown" only, so a pip stayed lit while the
// ability was unaffordable or the global cooldown was running — the player
// pressed a READY key and nothing happened, with no explanation on screen.
describe('cooldown strip castability states', () => {
  const build = () => {
    const root = document.createElement('div')
    document.body.appendChild(root)
    const strip = initCooldownStrip(root, () => {})
    strip.rebuild(['fireball'], 'warden')
    const pip = root.querySelector<HTMLElement>('.cd-pip')!
    return { root, strip, pip }
  }

  const update = (
    strip: ReturnType<typeof initCooldownStrip>,
    over: Partial<Parameters<typeof strip.updateAbilityCooldowns>[0]> = {},
  ) =>
    strip.updateAbilityCooldowns({
      activeWeapon: 'staff',
      abilityCooldowns: undefined,
      placementAbilityId: null,
      primedSlotIdx: null,
      tickNow: 100,
      mana: 999,
      stamina: 999,
      gcdReadyAtTick: 0,
      ...over,
    })

  it('flags an ability the player cannot pay for', () => {
    const { strip, pip } = build()
    const cost = ABILITY_DEFS.fireball!.costMana

    update(strip, { mana: cost })
    expect(pip.classList.contains('unaffordable')).toBe(false)

    update(strip, { mana: cost - 1 })
    expect(pip.classList.contains('unaffordable')).toBe(true)
  })

  it('flags the global cooldown separately from the per-ability cooldown', () => {
    const { strip, pip } = build()

    update(strip, { gcdReadyAtTick: 140 })
    expect(pip.classList.contains('gcd-locked')).toBe(true)

    update(strip, { gcdReadyAtTick: 0 })
    expect(pip.classList.contains('gcd-locked')).toBe(false)
  })

  // Regression: markPending added a class that the per-frame cooldown refresh
  // stripped ~16 ms later, so the "input received" state was never seen.
  it('keeps the pending state alive across a refresh', () => {
    const { strip, pip } = build()
    strip.markPending('fireball')
    expect(pip.classList.contains('pending')).toBe(true)
    update(strip)
    expect(pip.classList.contains('pending')).toBe(true)
  })
})
