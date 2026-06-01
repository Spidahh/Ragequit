// ---------------------------------------------------------------------------
// Ability cast validation.
//
// The gate every cast passes before the engine pays costs and resolves effects:
// alive / not-already-acting / air policy / parry / crowd-control / GCD /
// cooldown / loadout / resource cost. Extracted from AbilityEngine.tryCast as a
// pure function returning the rejection reason (or null to proceed), so the
// ordering and the reason codes are unit-tested in isolation. Status queries
// that need the StatusRuntime are resolved by the caller and passed in.
// ---------------------------------------------------------------------------
import type { AbilityDef, Player, ServerAbilityFailedMessage } from '@ragequit/shared'

export type CastRejectReason = ServerAbilityFailedMessage['reason']

export interface CastValidationCtx {
  /** Current server tick. */
  now: number
  /** StatusRuntime.isCastLocked(player) — stun/freeze/etc. */
  isCastLocked: boolean
  /** StatusRuntime.hasStatus(player, 'invulnerable') — Phase Shift. */
  isInvulnerable: boolean
}

/**
 * Returns the first failing rejection reason, or null if the cast may proceed.
 * Order matters — it is the priority of the failure message shown to the caster.
 * Cost uses the ability's base mana/stamina (cooldown multipliers never change
 * cost), matching the engine.
 */
export function validateCast(
  player: Player,
  def: AbilityDef,
  ctx: CastValidationCtx,
): CastRejectReason | null {
  if (!player.alive) return 'dead'
  if (player.casting) return 'casting'
  if (ctx.now < player.swingEndsAtTick || player.bowChargeStartTick > 0) return 'casting'
  if (def.airPolicy === 'groundedCaster' && ctx.now < player.airborneUntilTick) {
    return 'grounded_required'
  }
  if (player.parrying) return 'parrying'
  if (ctx.isCastLocked) return 'cc'
  if (ctx.isInvulnerable) return 'cc'
  if (ctx.now < player.gcdReadyAtTick) return 'gcd'
  const cdReady = player.abilityCooldowns.get(def.id) ?? 0
  if (ctx.now < cdReady) return 'cooldown'
  if (!Array.from(player.loadout).includes(def.id)) return 'not_in_loadout'
  if (def.costMana > player.mana) return 'cost'
  if (def.costStamina > player.stamina) return 'cost'
  return null
}
