// Ground telegraph for wind-up AoE abilities.
//
// There was no telegraph of any kind: Meteor has a 1 s wind-up but its target
// point was never replicated, so the first thing a victim saw was the damage.

import { TICK_RATE_HZ, type AbilityDef, type ServerCastTelegraphMessage } from '@ragequit/shared'

/** Largest ground radius the ability affects; 0 when it has no area at all. */
export function abilityAreaRadius(def: AbilityDef): number {
  let radius = 0
  for (const e of def.effects) {
    const r = (e as { radius?: number }).radius ?? 0
    if (r > radius) radius = r
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
