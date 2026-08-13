// Ground telegraph for wind-up AoE abilities.
//
// There was no telegraph of any kind: Meteor has a 1 s wind-up but its target
// point was never replicated, so the first thing a victim saw was the damage.

import { TICK_RATE_HZ, type AbilityDef, type ServerCastTelegraphMessage } from '@ragequit/shared'

/**
 * Largest ground radius the ability affects; 0 when it has no area at all.
 *
 * A channel carries its shape on `perTick`, not on the effect itself, so reading
 * only the top level reported 0 for every channel — whirlwind's 4 m area included,
 * which meant no channel AoE could ever be telegraphed no matter what else was
 * fixed. The nested case has to be read or the telegraph lies by omission.
 */
export function abilityAreaRadius(def: AbilityDef): number {
  let radius = 0
  for (const e of def.effects) {
    const direct = (e as { radius?: number }).radius ?? 0
    if (direct > radius) radius = direct
    const perTick = (e as { perTick?: { radius?: number } }).perTick?.radius ?? 0
    if (perTick > radius) radius = perTick
  }
  return radius
}

/**
 * Builds the telegraph broadcast, or null when the ability has no ground area
 * (a single-target wind-up has nothing meaningful to draw).
 */
export function castTelegraphMessage(
  casterId: string,
  def: AbilityDef,
  center: { x: number; y: number; z: number },
  windupTicks: number,
): ServerCastTelegraphMessage | null {
  const radius = abilityAreaRadius(def)
  if (radius <= 0) return null
  return {
    casterId,
    abilityId: def.id,
    element: def.element ?? 'none',
    pos: center,
    radius,
    durationMs: (windupTicks / TICK_RATE_HZ) * 1000,
  }
}

/**
 * How long an instant (windup 0) area holds its shape after it resolves.
 *
 * An instant area is private BEFORE it lands — telegraphing it would make it
 * dodgeable and it is not meant to be — but it is drawn at its true radius AT
 * resolution and held briefly. 00_truth.md 3.4.
 *
 * This is not consolation for the victim. It is the cheapest teaching device
 * available: it costs them nothing in the moment, since they are already hit, and
 * it turns a death into a lesson about a shape, so the second time that circle
 * lands they know it. The alternative is what 14 abilities did until now — an area
 * attack never drawn at all, which is indistinguishable from being randomly
 * damaged.
 */
export const TAP_AFTERIMAGE_TICKS = Math.round(0.22 * TICK_RATE_HZ)
