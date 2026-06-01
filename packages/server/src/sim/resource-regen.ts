// ---------------------------------------------------------------------------
// Resource regeneration math (HP / mana / stamina).
//
// Pure helper: a resource regenerates toward its max at `ratePerSec`, but only
// after `delayTicks` have elapsed since the last relevant event (e.g. taking
// damage, spending mana). Extracted from GameRoom.tickRegen for testability.
// ---------------------------------------------------------------------------
export function regenResource(
  current: number,
  max: number,
  sinceEventTicks: number,
  delayTicks: number,
  ratePerSec: number,
  dtSec: number,
): number {
  if (current >= max) return current
  if (sinceEventTicks < delayTicks) return current
  return Math.min(max, current + ratePerSec * dtSec)
}
