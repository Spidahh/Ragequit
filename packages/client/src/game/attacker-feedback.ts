// Escalating feedback when YOU land a hit: confirm tick, combo tier, hit-stop,
// camera kick. Extracted from main.ts's onHit (file-budget: AGENTS.md).
//
// The tiers exist so a poke and a combo finisher do not feel the same: hit 1 is
// the plain impact, hit 2 escalates, hit 3 cracks, and an air punish jumps
// straight to the top.

import type { ServerHitMessage } from '@ragequit/shared'

import { COMBO_RESET_MS, type ComboState } from './combat-feedback.js'

export interface AttackerFeedbackDeps {
  /** Short high-band tick that says "that hit was MINE". */
  playHitConfirm: (tier: 'normal' | 'heavy' | 'kill') => void
  playCrack: (power: number) => void
  playHeavyHit: (power: number) => void
  playHitByType: (cause: string, power: number) => void
  playElementImpact: (element: string, power: number) => void
  triggerComboFlash: () => void
  showComboPopupLabel: (label: string) => void
  showComboPopupText: (count: number) => void
  /** ms of animation freeze, measured from `now`. */
  setHitStop: (untilMs: number) => void
  shake: (intensity: number) => void
  hitstopFor: (cause: string, airPunish?: boolean) => number
}

/**
 * Folds one landed hit into the combo state and fires the matching feedback.
 * Mutates `combo` in place (it is the caller's rolling state).
 */
export function attackerHitFeedback(
  deps: AttackerFeedbackDeps,
  msg: ServerHitMessage,
  combo: ComboState,
  ctx: { now: number; power: number; isAirPunish: boolean },
): void {
  const { now, power, isAirPunish } = ctx

  deps.playHitConfirm(isAirPunish || combo.count >= 2 ? 'heavy' : 'normal')

  if (now - combo.lastHitMs > COMBO_RESET_MS) combo.count = 0
  combo.count++
  combo.lastHitMs = now

  if (isAirPunish) {
    deps.playCrack(Math.max(power, 0.85))
    deps.triggerComboFlash()
    deps.showComboPopupLabel('AIR PUNISH ✈')
    deps.setHitStop(now + deps.hitstopFor(msg.cause, true))
    deps.shake(1.0)
    combo.count = 0
    return
  }
  if (combo.count >= 3) {
    // CRACK — strong hit, golden flash, COMBO popup, max shake.
    deps.playCrack(power)
    deps.triggerComboFlash()
    deps.showComboPopupText(combo.count)
    deps.setHitStop(now + 80) // longer stop for crack
    deps.shake(0.9)
    combo.count = 0
    return
  }
  if (combo.count === 2) {
    deps.playHeavyHit(power)
    deps.setHitStop(now + deps.hitstopFor(msg.cause))
    deps.shake(0.55)
    return
  }
  deps.playHitByType(msg.cause, power)
  if (
    msg.cause.startsWith('ability:') ||
    msg.cause.startsWith('zone:') ||
    msg.cause.startsWith('combo:')
  ) {
    deps.playElementImpact(msg.element ?? 'none', Math.min(1, power * 0.8))
  }
  deps.setHitStop(now + deps.hitstopFor(msg.cause))
  deps.shake(0.3)
}
