// Server-side bot controller for TTK calibration and Training mode (Fase 5).
//
// Behavior: face nearest enemy, close to melee range, prioritize self-heal
// when low HP, strafe to dodge, jump in close-range melee, fire abilities and
// sword swings.

import {
  ABILITY_DEFS,
  HP_MAX,
  SWORD_M1_RANGE_M,
  TICK_MS,
  TICK_RATE_HZ,
  type Player,
} from '@ragequit/shared'

export interface BotHostFns {
  getOpponent: (botId: string) => Player | null
  getSelf: (botId: string) => Player | null
  sendCast: (botId: string, abilityId: string, targetYaw: number, targetPitch: number) => void
  // jump is merged into sendInput — passing true emits a single message that
  // carries both movement and the jump edge, preventing the double-message /
  // same-seq bug that caused the bot's jump to be silently dropped.
  sendInput: (botId: string, moveX: number, moveZ: number, yaw: number, jump?: boolean) => void
  sendSwing: (botId: string, yaw: number) => void
  cdReady: (botId: string, abilityId: string, atTick: number) => boolean
}

export class BotController {
  private nextDecisionTick = 0
  private strafeDir = 1
  private strafeChangeTick = 0
  private lastJumpTick = 0
  private lastSwingTick = 0

  constructor(
    private readonly botId: string,
    private readonly host: BotHostFns,
    private readonly tickRef: () => number,
    private readonly loadout: readonly string[],
  ) {}

  step(): void {
    const self = this.host.getSelf(this.botId)
    if (!self || !self.alive) return
    const enemy = this.host.getOpponent(this.botId)
    if (!enemy || !enemy.alive) return

    const tick = this.tickRef()
    const dx = enemy.transform.x - self.transform.x
    const dz = enemy.transform.z - self.transform.z
    const dist = Math.hypot(dx, dz)
    const yaw = Math.atan2(-dx, -dz)
    // Pitch toward the enemy's centre so projectile abilities arc correctly when
    // the target is airborne. dy uses capsule centres (transform.y = centre).
    const dy = enemy.transform.y - self.transform.y
    const pitch = Math.atan2(dy, Math.max(dist, 0.1))

    // Strafe direction changes every 0.3–0.7 s to be less predictable.
    if (tick >= this.strafeChangeTick) {
      this.strafeDir = Math.random() < 0.5 ? 1 : -1
      this.strafeChangeTick = tick + Math.round((0.3 + Math.random() * 0.4) * TICK_RATE_HZ)
    }

    // Movement: close to melee range so sword swings land, strafe around enemy.
    // Bot stays at ~2m — within SWORD_M1_RANGE_M (3.5m) — so both parties can
    // trade melee hits and test damage numbers easily.
    const desiredRange = 2.0
    let mz = 0
    if (dist > desiredRange + 0.5)
      mz = -1 // chase
    else if (dist < desiredRange - 0.5) mz = 1 // back off slightly
    const strafeMag = 0.4 + (dist < 3 ? 0.4 : 0)
    const mx = this.strafeDir * strafeMag

    // Jump occasionally in melee range to look dynamic.
    let doJump = false
    if (dist < 3 && tick - this.lastJumpTick > Math.round(1.5 * TICK_RATE_HZ)) {
      if (Math.random() < 0.25) {
        doJump = true
        this.lastJumpTick = tick
      }
    }

    this.host.sendInput(this.botId, mx, mz, yaw, doJump)

    // Sword swing when in range — bot swings every ~0.45 s to chain the combo.
    if (dist <= SWORD_M1_RANGE_M && tick - this.lastSwingTick > Math.round(0.45 * TICK_RATE_HZ)) {
      this.host.sendSwing(this.botId, yaw)
      this.lastSwingTick = tick
    }

    if (tick < this.nextDecisionTick) return

    const hpFraction = self.hp / HP_MAX

    // Priority 1: self-heal if low HP and not in melee range (stop to heal).
    if (hpFraction < 0.35) {
      for (const id of this.loadout) {
        if (!id) continue
        const def = ABILITY_DEFS[id]
        if (!def) continue
        const isSelfHeal =
          def.targeting === 'self' &&
          def.effects.some((e) => e.kind === 'heal' || e.kind === 'lifesteal')
        if (!isSelfHeal) continue
        if (!this.host.cdReady(this.botId, id, tick)) continue
        if (def.costMana > self.mana) continue
        if (def.costStamina > self.stamina) continue
        this.host.sendCast(this.botId, id, yaw, pitch)
        this.nextDecisionTick = tick + Math.round(0.6 * TICK_RATE_HZ)
        return
      }
    }

    // Priority 2: cast best available offensive ability.
    for (const id of this.loadout) {
      if (!id) continue
      const def = ABILITY_DEFS[id]
      if (!def) continue
      if (!this.host.cdReady(this.botId, id, tick)) continue
      if (def.range > 0 && dist > def.range && def.targeting !== 'self') continue
      if (def.costMana > self.mana) continue
      if (def.costStamina > self.stamina) continue

      // Slight randomised delay so the bot doesn't always fire the instant CD
      // resets — makes it feel less robotic.
      const jitterTicks = Math.round(Math.random() * 0.2 * TICK_RATE_HZ)
      this.host.sendCast(this.botId, id, yaw, pitch)
      this.nextDecisionTick = tick + Math.round(0.35 * TICK_RATE_HZ) + jitterTicks
      return
    }
  }
}

void TICK_MS // imported for TICK_RATE_HZ; keep to suppress unused-import lint
