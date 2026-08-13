// The class mechanic, finally visible while you play.
//
// Fury, Momentum, Risonanza and Flow are simulated on the server and replicated
// on every Player — and until now nothing on the client read any of it. The
// mechanic that is supposed to make each class feel different was invisible
// during the one activity where it matters, so the four classes played like one
// generic kit with different numbers.
//
// Shape follows Guild Wars 2's profession-mechanic strip: a dedicated readout
// next to the vitals, with staged marks so you read the THRESHOLD you are
// playing toward and not just a number. Discrete charges are pips (WoW combo
// points) because a count you can grasp at a glance beats a bar you must
// measure.

import {
  FLOW_MAX_STACKS,
  FURY_MAX_STACKS,
  MOMENTUM_BOW_BONUS_THRESHOLD,
  MOMENTUM_MAX,
} from '@ragequit/shared'

export interface ClassMechanicState {
  classId: string
  furyStacks: number
  furyNextMeleeIsSurge: boolean
  momentum: number
  risonanzaElement: string
  risonanzaArmedUntilTick: number
  flowStacks: number
  flowPendingBonus: boolean
  /** Server tick the client currently believes it is on. */
  tickNow: number
}

export type MechanicView =
  | { kind: 'pips'; label: string; dotClass: string; filled: number; total: number; flag: string }
  | { kind: 'bar'; label: string; frac: number; markFrac: number; flag: string }
  | { kind: 'armed'; label: string; element: string; armed: boolean }
  | { kind: 'none' }

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n)
const pipCount = (n: number, max: number): number =>
  Math.max(0, Math.min(max, Math.floor(Number.isFinite(n) ? n : 0)))

/** Translate the replicated mechanic fields into what the strip should show. */
export function classMechanicView(s: ClassMechanicState): MechanicView {
  switch (s.classId) {
    case 'tank':
      return {
        kind: 'pips',
        label: 'FURY',
        dotClass: 'fury',
        filled: pipCount(s.furyStacks, FURY_MAX_STACKS),
        total: FURY_MAX_STACKS,
        // The payoff is a single empowered melee, so the flag is the thing to
        // watch, not the stack count.
        flag: s.furyNextMeleeIsSurge ? 'SURGE' : '',
      }
    case 'archer':
      return {
        kind: 'bar',
        label: 'MOMENTUM',
        frac: clamp01((Number.isFinite(s.momentum) ? s.momentum : 0) / MOMENTUM_MAX),
        markFrac: MOMENTUM_BOW_BONUS_THRESHOLD / MOMENTUM_MAX,
        flag: s.momentum >= MOMENTUM_BOW_BONUS_THRESHOLD ? 'RAPIDO' : '',
      }
    case 'mage':
      return {
        kind: 'armed',
        label: 'RISONANZA',
        element: s.risonanzaElement,
        // Armed is a window, not a state: it expires on a tick, so an element
        // left over from a lapsed window must not keep the light on.
        armed: Boolean(s.risonanzaElement) && s.risonanzaArmedUntilTick > s.tickNow,
      }
    case 'hybrid':
      return {
        kind: 'pips',
        label: 'FLOW',
        dotClass: 'flow',
        filled: pipCount(s.flowStacks, FLOW_MAX_STACKS),
        total: FLOW_MAX_STACKS,
        flag: s.flowPendingBonus ? 'AMPED' : '',
      }
    default:
      return { kind: 'none' }
  }
}

const ELEMENTS = new Set(['fire', 'ice', 'lightning', 'dark', 'nature'])
/** Only the five elements have a palette entry; anything else gets no class. */
const elementClass = (el: string): string => (ELEMENTS.has(el) ? ` elem-${el}` : '')

export function renderClassMechanic(el: HTMLElement, view: MechanicView): void {
  if (view.kind === 'none') {
    el.replaceChildren()
    el.classList.add('hidden')
    return
  }
  el.classList.remove('hidden')

  let html = `<span class="mech-label">${view.label}</span>`
  if (view.kind === 'pips') {
    for (let i = 0; i < view.total; i++) {
      html += `<span class="mech-dot ${i < view.filled ? view.dotClass : 'empty'}"></span>`
    }
    if (view.flag) html += `<span class="mech-surge">${view.flag}</span>`
  } else if (view.kind === 'bar') {
    // The threshold is drawn as a notch in the track, so the bar answers "how
    // far to the bonus?" and not merely "how much?". Painted as a background
    // gradient because the track clips its children; once the fill passes the
    // notch it covers it, which is exactly the right message.
    // Width in percent rather than px so this does not have to know how wide the
    // track is, and so the gradient stays parseable everywhere.
    const a = (view.markFrac * 100).toFixed(1)
    const b = (view.markFrac * 100 + 2.5).toFixed(1)
    const mark =
      `background-image:linear-gradient(90deg,transparent ${a}%,` +
      `rgba(255,255,255,0.55) ${a}%,rgba(255,255,255,0.55) ${b}%,transparent ${b}%)`
    html +=
      `<span class="mech-bar" style="${mark}"><span class="mech-bar-fill" style="width:${(view.frac * 100).toFixed(1)}%"></span></span>` +
      `<span class="mech-val">${Math.round(view.frac * MOMENTUM_MAX)}</span>`
    if (view.flag) html += `<span class="mech-surge">${view.flag}</span>`
  } else {
    const cls = elementClass(view.element)
    html +=
      `<span class="mech-dot${view.armed ? ` armed${cls}` : ' empty'}"></span>` +
      (view.armed ? `<span class="mech-elem${cls}">${view.element.toUpperCase()}</span>` : '')
  }
  el.innerHTML = html
}
