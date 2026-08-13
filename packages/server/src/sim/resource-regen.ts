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

// ---------------------------------------------------------------------------
// One player's per-tick regeneration. Moved out of GameRoom, which sits on its
// line ceiling, and it belongs next to the maths it drives anyway.
// ---------------------------------------------------------------------------
import {
  HP_MAX,
  HP_REGEN_PER_SEC_OOC,
  HP_REGEN_OOC_DELAY_SEC,
  MANA_MAX,
  MANA_REGEN_DELAY_SEC,
  MANA_REGEN_PER_SEC,
  STAMINA_MAX,
  STAMINA_REGEN_PER_SEC_IDLE,
  STAMINA_REGEN_PER_SEC_MOVING,
  TARGET_CLASS_DEFS,
  TICK_MS,
  TICK_RATE_HZ,
  type ClassId,
  type Player,
} from '@ragequit/shared'

/**
 * Regenerate hp / mana / stamina for one player on one tick.
 *
 * `setSimStamina` mirrors the new stamina onto the movement sim, which owns the
 * authoritative copy — without it the next tick overwrites the regenerated value.
 */
const OOC_DELAY_TICKS = Math.round(HP_REGEN_OOC_DELAY_SEC * TICK_RATE_HZ)
const MANA_DELAY_TICKS = Math.round(MANA_REGEN_DELAY_SEC * TICK_RATE_HZ)

export function tickPlayerRegen(
  player: Player,
  now: number,
  setSimStamina: (stamina: number) => void,
): void {
  const dt = TICK_MS / 1000
  const maxima = TARGET_CLASS_DEFS[player.classId as ClassId]?.resourceMaxima ?? {
    hp: HP_MAX,
    mana: MANA_MAX,
    stamina: STAMINA_MAX,
  }

  player.hp = regenResource(
    player.hp,
    maxima.hp,
    now - player.lastDamageAtTick,
    OOC_DELAY_TICKS,
    HP_REGEN_PER_SEC_OOC,
    dt,
  )
  player.mana = regenResource(
    player.mana,
    maxima.mana,
    now - player.lastManaSpendAtTick,
    MANA_DELAY_TICKS,
    MANA_REGEN_PER_SEC,
    dt,
  )

  // Hold-parry drains stamina continuously; regenerating at the same time would
  // give the drain zero net effect. The drain itself runs in tickParry.
  if (player.parrying && player.parryIsHold) return

  const moving = player.vx * player.vx + player.vz * player.vz > 0.25
  const rate = moving ? STAMINA_REGEN_PER_SEC_MOVING : STAMINA_REGEN_PER_SEC_IDLE
  // No delay gate for stamina — it regenerates whenever not hold-parrying.
  player.stamina = regenResource(player.stamina, maxima.stamina, 0, 0, rate, dt)
  setSimStamina(player.stamina)
}
