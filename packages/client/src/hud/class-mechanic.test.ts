import {
  FLOW_MAX_STACKS,
  FURY_MAX_STACKS,
  MOMENTUM_BOW_BONUS_THRESHOLD,
  MOMENTUM_MAX,
} from '@ragequit/shared'
import { describe, expect, it } from 'vitest'

import {
  classMechanicView,
  renderClassMechanic,
  type ClassMechanicState,
} from './class-mechanic.js'

const state = (over: Partial<ClassMechanicState> = {}): ClassMechanicState => ({
  classId: 'tank',
  furyStacks: 0,
  furyNextMeleeIsSurge: false,
  momentum: 0,
  risonanzaElement: '',
  risonanzaArmedUntilTick: 0,
  flowStacks: 0,
  flowPendingBonus: false,
  tickNow: 1000,
  ...over,
})

describe('classMechanicView', () => {
  it('draws Fury as pips out of the server maximum', () => {
    const v = classMechanicView(state({ classId: 'tank', furyStacks: 3 }))
    expect(v).toMatchObject({ kind: 'pips', label: 'FURY', filled: 3, total: FURY_MAX_STACKS })
  })

  it('flags the surge, which is the thing the tank is actually waiting for', () => {
    const v = classMechanicView(state({ classId: 'tank', furyNextMeleeIsSurge: true }))
    expect(v).toMatchObject({ flag: 'SURGE' })
  })

  it('never shows more pips than exist, whatever the server sends', () => {
    const v = classMechanicView(state({ classId: 'tank', furyStacks: 99 }))
    expect(v).toMatchObject({ filled: FURY_MAX_STACKS })
    expect(classMechanicView(state({ classId: 'hybrid', flowStacks: -4 }))).toMatchObject({
      filled: 0,
      total: FLOW_MAX_STACKS,
    })
  })

  // The mark is the whole point of the bar: the archer plays toward a threshold,
  // not toward "more".
  it('puts the momentum mark at the real bow-bonus threshold', () => {
    const v = classMechanicView(state({ classId: 'archer', momentum: 30 }))
    expect(v).toMatchObject({ kind: 'bar', markFrac: MOMENTUM_BOW_BONUS_THRESHOLD / MOMENTUM_MAX })
    expect((v as { frac: number }).frac).toBeCloseTo(0.3, 5)
  })

  it('calls out momentum only once the threshold is actually reached', () => {
    expect(
      classMechanicView(state({ classId: 'archer', momentum: MOMENTUM_BOW_BONUS_THRESHOLD - 1 })),
    ).toMatchObject({ flag: '' })
    expect(
      classMechanicView(state({ classId: 'archer', momentum: MOMENTUM_BOW_BONUS_THRESHOLD })),
    ).toMatchObject({ flag: 'RAPIDO' })
  })

  // Risonanza is a window. A stale element left over from a lapsed window must
  // not keep the light on, or the mage commits to a proc that is not there.
  it('treats risonanza as armed only while its window is open', () => {
    const armed = state({
      classId: 'mage',
      risonanzaElement: 'fire',
      risonanzaArmedUntilTick: 1001,
      tickNow: 1000,
    })
    expect(classMechanicView(armed)).toMatchObject({ kind: 'armed', armed: true, element: 'fire' })
    expect(classMechanicView({ ...armed, risonanzaArmedUntilTick: 1000 })).toMatchObject({
      armed: false,
    })
  })

  it('is not armed with no element at all', () => {
    expect(
      classMechanicView(
        state({ classId: 'mage', risonanzaElement: '', risonanzaArmedUntilTick: 9999 }),
      ),
    ).toMatchObject({ armed: false })
  })

  it('shows nothing for a class it does not know', () => {
    expect(classMechanicView(state({ classId: 'druid' }))).toEqual({ kind: 'none' })
  })
})

describe('renderClassMechanic', () => {
  const el = (): HTMLElement => document.createElement('div')

  it('renders one dot per stack, filled and empty', () => {
    const host = el()
    renderClassMechanic(host, classMechanicView(state({ classId: 'tank', furyStacks: 2 })))
    expect(host.querySelectorAll('.mech-dot.fury')).toHaveLength(2)
    expect(host.querySelectorAll('.mech-dot.empty')).toHaveLength(FURY_MAX_STACKS - 2)
  })

  it('hides itself rather than leaving a stale strip on screen', () => {
    const host = el()
    renderClassMechanic(host, classMechanicView(state({ classId: 'tank', furyStacks: 4 })))
    renderClassMechanic(host, { kind: 'none' })
    expect(host.classList.contains('hidden')).toBe(true)
    expect(host.innerHTML).toBe('')
  })

  it('tints the armed dot with the element palette', () => {
    const host = el()
    renderClassMechanic(
      host,
      classMechanicView(
        state({
          classId: 'mage',
          risonanzaElement: 'ice',
          risonanzaArmedUntilTick: 2000,
          tickNow: 1,
        }),
      ),
    )
    expect(host.querySelector('.mech-dot.armed.elem-ice')).not.toBeNull()
  })

  // An unknown element has no palette entry, so tagging it would produce a class
  // with no rule and an invisible dot.
  it('does not invent a palette class for an unknown element', () => {
    const host = el()
    renderClassMechanic(host, {
      kind: 'armed',
      label: 'RISONANZA',
      element: 'plasma',
      armed: true,
    })
    expect(host.innerHTML).not.toContain('elem-plasma')
  })

  it('fills the momentum bar to the right width', () => {
    const host = el()
    renderClassMechanic(host, classMechanicView(state({ classId: 'archer', momentum: 50 })))
    // Assert the value, not the string: the DOM normalises "50.0%" to "50%".
    const width = host.querySelector<HTMLElement>('.mech-bar-fill')!.style.width
    expect(parseFloat(width)).toBeCloseTo(50, 1)
    expect(width.endsWith('%')).toBe(true)
  })
})

describe('momentum threshold notch', () => {
  // markFrac existed but was never drawn, which made the bar answer "how much?"
  // instead of "how far to the bonus?".
  it('paints the notch at the threshold, not at the fill', () => {
    const host = document.createElement('div')
    renderClassMechanic(host, classMechanicView(state({ classId: 'archer', momentum: 20 })))
    const bg = host.querySelector<HTMLElement>('.mech-bar')!.style.backgroundImage
    const pct = ((MOMENTUM_BOW_BONUS_THRESHOLD / MOMENTUM_MAX) * 100).toFixed(1)
    expect(bg).toContain(`${pct}%`)
    expect(bg).toContain('linear-gradient')
  })
})
