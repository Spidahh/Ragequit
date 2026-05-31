// Server-side bot controller for TTK calibration and Training mode.
//
// Behavior: orbital strafing, range-aware weapon swapping, retreat on low HP,
// dodge on enemy cast, combo setup (Master), parry window reaction.

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
  // jump is merged into sendInput -- passing true emits a single message that
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
  private retreatUntilTick = -1000
  private dodgeDirTick = -1000
  private dodgeDir = 1

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
    // Yaw facing the enemy
    const yaw = Math.atan2(-dx, -dz)
    // Pitch toward the enemy centre for projectile arcing
    const dy = enemy.transform.y - self.transform.y
    const pitch = Math.atan2(dy, Math.max(dist, 0.1))

    const classId = (self.classId ?? 'hybrid') as ClassId
    const allowedWeapons = TARGET_CLASS_DEFS[classId]?.weapons ?? (['sword', 'bow', 'staff'] as const)
    const hpMax = TARGET_CLASS_DEFS[classId]?.resourceMaxima.hp ?? 200
    const hpFraction = self.hp / hpMax

    // ── Orbital strafe direction ──────────────────────────────────────────
    // Perpendicular to the enemy direction (true orbital movement).
    // strafeDir (+1 or -1) rotates periodically for unpredictability.
    if (tick >= this.strafeChangeTick) {
      this.strafeDir = Math.random() < 0.5 ? 1 : -1
      this.strafeChangeTick = tick + Math.round((0.4 + Math.random() * 0.5) * TICK_RATE_HZ)
    }

    // Unit vector perpendicular to the enemy direction (orbital strafe)
    const len = Math.max(dist, 0.01)
    const perpX = (dz / len) * this.strafeDir   // rotate 90 degrees
    const perpZ = (-dx / len) * this.strafeDir

    // ── Desired engagement range based on active weapon ───────────────────
    let desiredRange = 1.4 // default melee
    if (self.activeWeapon === 'bow')   desiredRange = 14.0
    else if (self.activeWeapon === 'staff') desiredRange = 9.0

    // ── Retreat behavior when critically low HP ───────────────────────────
    const retreatThreshold = this.difficulty === 'master' ? 0.25 : 0.20
    const isRetreating = tick < this.retreatUntilTick
    if (hpFraction < retreatThreshold && !isRetreating) {
      // Trigger a 2-second retreat window to create distance + attempt heal
      this.retreatUntilTick = tick + Math.round(2.0 * TICK_RATE_HZ)
    }

    // ── Dodge on enemy cast ───────────────────────────────────────────────
    // When enemy starts casting, increase strafe speed and lock direction briefly.
    const enemyCasting = enemy.casting
    if (enemyCasting && tick >= this.dodgeDirTick) {
      this.dodgeDir = Math.random() < 0.5 ? 1 : -1
      this.dodgeDirTick = tick + Math.round(0.8 * TICK_RATE_HZ)
    }
    const dodgeActive = enemyCasting && this.difficulty !== 'novice'
    const dodgePerpX = (dz / len) * this.dodgeDir
    const dodgePerpZ = (-dx / len) * this.dodgeDir

    // ── Movement vector ───────────────────────────────────────────────────
    let mz = 0 // forward/back in yaw space (used for approach/retreat)
    if (isRetreating) {
      mz = 1 // run away from enemy
    } else if (dist > desiredRange + 0.8) {
      mz = -1 // close in
    } else if (dist < desiredRange - 0.8) {
      mz = 1 // back off
    }

    // Strafe: orbital if in range, dodge if enemy is casting, 0 if novice
    let strafeMag = this.difficulty === 'novice' ? 0 : 0.55
    if (dist < 3) strafeMag = 0.75 // faster strafe in close quarters
    if (isRetreating) strafeMag = 0.8 // wide retreat arc

    let finalStrafeX = dodgeActive ? dodgePerpX * strafeMag * 1.4 : perpX * strafeMag
    let finalStrafeZ = dodgeActive ? dodgePerpZ * strafeMag * 1.4 : perpZ * strafeMag

    // Convert strafe from world-space perpendicular to bot-relative input axes.
    // The bot faces yaw toward the enemy; input X=strafe, Z=forward.
    // We project the world-space strafe vector onto bot right/forward axes.
    const cosY = Math.cos(yaw)
    const sinY = Math.sin(yaw)
    // Bot forward in world: (-sinY, -cosY) for the current yaw convention
    // Bot right in world:   (cosY, -sinY)
    // Project world-space strafe onto input axes
    const inputX = finalStrafeX * cosY + finalStrafeZ * (-sinY)
    // mz is already in bot-forward space; clamp combined magnitude to 1
    const rawMag = Math.hypot(inputX, mz)
    const scale = rawMag > 1 ? 1 / rawMag : 1
    const mx = inputX * scale
    const finalMz = mz * scale

    // ── Jump occasionally in melee range ─────────────────────────────────
    let doJump = false
    if (dist < 3.5 && tick - this.lastJumpTick > Math.round(1.8 * TICK_RATE_HZ)) {
      const jumpChance = this.difficulty === 'master' ? 0.3 : 0.18
      if (Math.random() < jumpChance) {
        doJump = true
        this.lastJumpTick = tick
      }
    }

    // ── Parry ─────────────────────────────────────────────────────────────
    let doParry = false
    if (this.difficulty === 'competent') {
      if (dist <= 3.5 && enemy.swingEndsAtTick > tick && Math.random() < 0.55) doParry = true
    } else if (this.difficulty === 'master') {
      if (dist <= 4.0 && (enemy.swingEndsAtTick > tick || enemy.casting) && Math.random() < 0.82) doParry = true
    }

    this.host.sendInput(this.botId, mx, finalMz, yaw, doJump, doParry)

    // ── Sword swing ───────────────────────────────────────────────────────
    if (
      self.activeWeapon === 'sword' &&
      dist <= SWORD_M1_RANGE_M &&
      tick - this.lastSwingTick > Math.round(0.45 * TICK_RATE_HZ)
    ) {
      this.host.sendSwing(this.botId, yaw)
      this.lastSwingTick = tick
    }

    if (tick < this.nextDecisionTick) return

    // Novice: only basic movement + swings, no abilities
    if (this.difficulty === 'novice') {
      this.nextDecisionTick = tick + Math.round((0.6 + Math.random() * 0.2) * TICK_RATE_HZ)
      return
    }

    // ── Smart weapon swap (competent + master) ────────────────────────────
    // Prefer ranged weapon at distance, melee at close range.
    const hasRanged = (allowedWeapons as readonly string[]).includes('bow') ||
                      (allowedWeapons as readonly string[]).includes('staff')
    const hasBow    = (allowedWeapons as readonly string[]).includes('bow')
    const hasStaff  = (allowedWeapons as readonly string[]).includes('staff')
    const preferRangedDist = this.difficulty === 'master' ? 7 : 10

    if (hasRanged && dist > preferRangedDist && self.activeWeapon === 'sword') {
      const rangedWeapon: 'bow' | 'staff' = hasBow ? 'bow' : 'staff'
      this.host.sendWeaponSwap(this.botId, rangedWeapon)
      this.nextDecisionTick = tick + Math.round(0.3 * TICK_RATE_HZ)
      return
    }
    if (dist < 4.0 && self.activeWeapon !== 'sword' && (allowedWeapons as readonly string[]).includes('sword')) {
      this.host.sendWeaponSwap(this.botId, 'sword')
      this.nextDecisionTick = tick + Math.round(0.3 * TICK_RATE_HZ)
      return
    }
    // Competent: occasional random weapon swap for variety
    if (
      this.difficulty === 'competent' &&
      Math.random() < 0.04 &&
      allowedWeapons.length > 1 &&
      tick - this.lastSwingTick > Math.round(3.0 * TICK_RATE_HZ)
    ) {
      const randomWeapon = allowedWeapons[Math.floor(Math.random() * allowedWeapons.length)]!
      if (randomWeapon !== self.activeWeapon) {
        this.host.sendWeaponSwap(this.botId, randomWeapon as 'sword' | 'bow' | 'staff')
        this.nextDecisionTick = tick + Math.round(0.4 * TICK_RATE_HZ)
        return
      }
    }

    // ── Priority 1: self-heal when low HP ────────────────────────────────
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
        if (def.weapon && def.weapon !== 'none') {
          if (!(allowedWeapons as readonly string[]).includes(def.weapon)) continue
          if (self.activeWeapon !== def.weapon) {
            if (this.difficulty === 'master') {
              this.host.sendWeaponSwap(this.botId, def.weapon as 'sword' | 'bow' | 'staff')
              this.nextDecisionTick = tick + Math.round(0.12 * TICK_RATE_HZ)
              return
            } else continue
          }
        }
        this.host.sendCast(this.botId, id, yaw, pitch)
        const baseDelay = this.difficulty === 'master' ? 0.2 : 0.6
        this.nextDecisionTick = tick + Math.round(baseDelay * TICK_RATE_HZ)
        return
      }
    }

    // ── Priority 2: Master combo setup (knockup + finisher) ──────────────
    if (this.difficulty === 'master') {
      const isEnemyAirborne = enemy.airborneUntilTick > tick
      if (isEnemyAirborne) {
        const followUps = ['marksman_shot', 'fireball', 'chain_bolt']
        for (const id of followUps) {
          if (!this.loadout.includes(id)) continue
          const def = ABILITY_DEFS[id]
          if (!def) continue
          if (!this.host.cdReady(this.botId, id, tick)) continue
          if (def.costMana > self.mana) continue
          if (def.costStamina > self.stamina) continue
          if (def.weapon && def.weapon !== 'none') {
            if (!(allowedWeapons as readonly string[]).includes(def.weapon)) continue
            if (self.activeWeapon !== def.weapon) {
              this.host.sendWeaponSwap(this.botId, def.weapon as 'sword' | 'bow' | 'staff')
              this.nextDecisionTick = tick + Math.round(0.12 * TICK_RATE_HZ)
              return
            }
          }
          this.host.sendCast(this.botId, id, yaw, pitch)
          this.nextDecisionTick = tick + Math.round(0.15 * TICK_RATE_HZ)
          return
        }
      } else {
        const knockups = ['uppercut', 'eruption', 'arc_lift', 'frost_pillar']
        for (const id of knockups) {
          if (!this.loadout.includes(id)) continue
          const def = ABILITY_DEFS[id]
          if (!def) continue
          if (!this.host.cdReady(this.botId, id, tick)) continue
          if (def.range > 0 && dist > def.range) continue
          if (def.costMana > self.mana) continue
          if (def.costStamina > self.stamina) continue
          if (def.weapon && def.weapon !== 'none') {
            if (!(allowedWeapons as readonly string[]).includes(def.weapon)) continue
            if (self.activeWeapon !== def.weapon) {
              this.host.sendWeaponSwap(this.botId, def.weapon as 'sword' | 'bow' | 'staff')
              this.nextDecisionTick = tick + Math.round(0.12 * TICK_RATE_HZ)
              return
            }
          }
          this.host.sendCast(this.botId, id, yaw, pitch)
          this.nextDecisionTick = tick + Math.round(0.25 * TICK_RATE_HZ)
          return
        }
      }
    }

    // ── Priority 3: cast best available offensive ability ─────────────────
    for (const id of this.loadout) {
      if (!id) continue
      const def = ABILITY_DEFS[id]
      if (!def) continue
      if (!this.host.cdReady(this.botId, id, tick)) continue
      if (def.range > 0 && dist > def.range && def.targeting !== 'self') continue
      if (def.costMana > self.mana) continue
      if (def.costStamina > self.stamina) continue
      if (def.weapon && def.weapon !== 'none') {
        if (!(allowedWeapons as readonly string[]).includes(def.weapon)) continue
        if (self.activeWeapon !== def.weapon) {
          if (this.difficulty === 'master') {
            this.host.sendWeaponSwap(this.botId, def.weapon as 'sword' | 'bow' | 'staff')
            this.nextDecisionTick = tick + Math.round(0.12 * TICK_RATE_HZ)
            return
          } else continue
        }
      }
      const baseDelaySec = this.difficulty === 'master' ? 0.15 : 0.35
      const jitterTicks = Math.round(Math.random() * 0.2 * TICK_RATE_HZ)
      this.host.sendCast(this.botId, id, yaw, pitch)
      this.nextDecisionTick = tick + Math.round(baseDelaySec * TICK_RATE_HZ) + jitterTicks
      return
    }
  }
}
