// Server-side bot controller for TTK calibration and Training mode.
//
// Behavior: face nearest enemy, close to melee range, prioritize self-heal
// when low HP, strafe to dodge, jump in close-range melee, fire abilities and
// sword swings.

import {
  ABILITY_DEFS,
  TARGET_CLASS_DEFS,
  type ClassId,
  SWORD_M1_RANGE_M,
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
  sendInput: (
    botId: string,
    moveX: number,
    moveZ: number,
    yaw: number,
    jump?: boolean,
    m2?: boolean,
  ) => void
  sendSwing: (botId: string, yaw: number) => void
  sendWeaponSwap: (botId: string, weapon: 'sword' | 'bow' | 'staff') => void
  cdReady: (botId: string, abilityId: string, atTick: number) => boolean
}

export class BotController {
  private nextDecisionTick = 0
  private strafeDir = 1
  private strafeChangeTick = 0
  private lastJumpTick = -1000
  private lastSwingTick = -1000

  constructor(
    private readonly botId: string,
    private readonly host: BotHostFns,
    private readonly tickRef: () => number,
    private readonly loadout: readonly string[],
    private readonly difficulty: 'novice' | 'competent' | 'master' = 'competent',
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

    // Movement: close into range depending on active weapon.
    // If holding bow or staff, try to stay at range, else close to melee.
    let desiredRange = 1.4
    if (self.activeWeapon === 'bow') {
      desiredRange = 15.0
    } else if (self.activeWeapon === 'staff') {
      desiredRange = 10.0
    }

    let mz = 0
    if (dist > desiredRange + 0.5) {
      mz = -1 // chase
    } else if (dist < desiredRange - 0.5) {
      mz = 1 // back off slightly
    }
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

    // Parrying logic
    let doParry = false
    if (this.difficulty === 'competent') {
      if (dist <= 3.5 && enemy.swingEndsAtTick > tick) {
        if (Math.random() < 0.6) {
          doParry = true
        }
      }
    } else if (this.difficulty === 'master') {
      if (dist <= 4.0 && (enemy.swingEndsAtTick > tick || enemy.casting)) {
        if (Math.random() < 0.85) {
          doParry = true
        }
      }
    }

    this.host.sendInput(this.botId, mx, mz, yaw, doJump, doParry)

    // Sword swing when in range and holding sword — bot swings every ~0.45 s to chain the combo.
    if (
      self.activeWeapon === 'sword' &&
      dist <= SWORD_M1_RANGE_M &&
      tick - this.lastSwingTick > Math.round(0.45 * TICK_RATE_HZ)
    ) {
      this.host.sendSwing(this.botId, yaw)
      this.lastSwingTick = tick
    }

    if (tick < this.nextDecisionTick) return

    // Novice difficulty: only moves and basic attacks (M1), bypass Priority 1 & 2
    if (this.difficulty === 'novice') {
      const jitterTicks = Math.round(Math.random() * 0.2 * TICK_RATE_HZ)
      this.nextDecisionTick = tick + Math.round(0.6 * TICK_RATE_HZ) + jitterTicks
      return
    }

    // Competent occasionally swaps weapons randomly to show off different styles
    if (
      this.difficulty === 'competent' &&
      Math.random() < 0.05 &&
      tick - this.lastSwingTick > Math.round(3.0 * TICK_RATE_HZ)
    ) {
      const weapons: ('sword' | 'bow' | 'staff')[] = ['sword', 'bow', 'staff']
      const randomWeapon = weapons[Math.floor(Math.random() * weapons.length)]!
      if (randomWeapon !== self.activeWeapon) {
        this.host.sendWeaponSwap(this.botId, randomWeapon)
        this.nextDecisionTick = tick + Math.round(0.4 * TICK_RATE_HZ)
        return
      }
    }

    const classId = (self.classId ?? 'hybrid') as ClassId
    const hpMax = TARGET_CLASS_DEFS[classId]?.resourceMaxima.hp ?? 200
    const hpFraction = self.hp / hpMax

    // Priority 1: self-heal if low HP (stop to heal).
    const healThreshold = this.difficulty === 'master' ? 0.4 : 0.35
    if (hpFraction < healThreshold) {
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

        // Weapon check for heals
        if (def.weapon && def.weapon !== 'none' && self.activeWeapon !== def.weapon) {
          if (this.difficulty === 'master') {
            this.host.sendWeaponSwap(this.botId, def.weapon)
            this.nextDecisionTick = tick + Math.round(0.12 * TICK_RATE_HZ)
            return
          } else {
            continue
          }
        }

        this.host.sendCast(this.botId, id, yaw, pitch)
        const baseDelay = this.difficulty === 'master' ? 0.2 : 0.6
        this.nextDecisionTick = tick + Math.round(baseDelay * TICK_RATE_HZ)
        return
      }
    }

    // Priority 2: Master AI combo setup and follow-up
    if (this.difficulty === 'master') {
      const isEnemyAirborne = enemy.airborneUntilTick > tick
      if (isEnemyAirborne) {
        // Enemy is airborne! Let's find an airborne follow-up finisher!
        const followUps = ['marksman_shot', 'fireball', 'chain_bolt']
        for (const id of followUps) {
          if (!this.loadout.includes(id)) continue
          const def = ABILITY_DEFS[id]
          if (!def) continue
          if (!this.host.cdReady(this.botId, id, tick)) continue
          if (def.costMana > self.mana) continue
          if (def.costStamina > self.stamina) continue

          if (def.weapon && def.weapon !== 'none' && self.activeWeapon !== def.weapon) {
            this.host.sendWeaponSwap(this.botId, def.weapon)
            this.nextDecisionTick = tick + Math.round(0.12 * TICK_RATE_HZ)
            return
          }

          this.host.sendCast(this.botId, id, yaw, pitch)
          this.nextDecisionTick = tick + Math.round(0.15 * TICK_RATE_HZ)
          return
        }
      } else {
        // Enemy is NOT airborne. Try to launch them!
        const knockups = ['uppercut', 'eruption', 'arc_lift', 'frost_pillar']
        for (const id of knockups) {
          if (!this.loadout.includes(id)) continue
          const def = ABILITY_DEFS[id]
          if (!def) continue
          if (!this.host.cdReady(this.botId, id, tick)) continue
          if (def.range > 0 && dist > def.range) continue
          if (def.costMana > self.mana) continue
          if (def.costStamina > self.stamina) continue

          if (def.weapon && def.weapon !== 'none' && self.activeWeapon !== def.weapon) {
            this.host.sendWeaponSwap(this.botId, def.weapon)
            this.nextDecisionTick = tick + Math.round(0.12 * TICK_RATE_HZ)
            return
          }

          this.host.sendCast(this.botId, id, yaw, pitch)
          this.nextDecisionTick = tick + Math.round(0.25 * TICK_RATE_HZ)
          return
        }
      }
    }

    // Priority 3: cast best available offensive ability.
    for (const id of this.loadout) {
      if (!id) continue
      const def = ABILITY_DEFS[id]
      if (!def) continue
      if (!this.host.cdReady(this.botId, id, tick)) continue
      if (def.range > 0 && dist > def.range && def.targeting !== 'self') continue
      if (def.costMana > self.mana) continue
      if (def.costStamina > self.stamina) continue

      if (
        this.difficulty === 'master' &&
        def.weapon &&
        def.weapon !== 'none' &&
        self.activeWeapon !== def.weapon
      ) {
        this.host.sendWeaponSwap(this.botId, def.weapon)
        this.nextDecisionTick = tick + Math.round(0.12 * TICK_RATE_HZ)
        return
      }

      if (
        this.difficulty === 'competent' &&
        def.weapon &&
        def.weapon !== 'none' &&
        self.activeWeapon !== def.weapon
      ) {
        continue
      }

      const baseDelaySec = this.difficulty === 'master' ? 0.15 : 0.35
      const jitterTicks = Math.round(Math.random() * 0.2 * TICK_RATE_HZ)
      this.host.sendCast(this.botId, id, yaw, pitch)
      this.nextDecisionTick = tick + Math.round(baseDelaySec * TICK_RATE_HZ) + jitterTicks
      return
    }
  }
}
