// ---------------------------------------------------------------------------
// Server-side melee (sword M1) subsystem.
//
// Owns the swing lifecycle: validation + windup scheduling (tryStartSwing) and
// lag-compensated hit resolution on the swing's hit tick (resolveSwings) —
// rewinds victims via the host's position history, tests the sword cone
// (isInSwordM1Cone, pure), queues damage, applies the stagger push, and
// advances the combo counter. The pending-swing list lives here; GameRoom
// keeps the lag-comp ring buffer and exposes it via the host.
//
// Extracted from GameRoom behind a host interface (same pattern as
// ProjectileSystem / ZoneSystem). GameRoom implements `MeleeSystemHost`.
// ---------------------------------------------------------------------------
import {
  LAG_COMP_BUFFER_MS,
  LAG_COMP_MAX_COMPENSATE_MS,
  SWORD_M1_COST_STAMINA,
  SWORD_M1_HIT_FRACTION,
  SWORD_M1_SWING_SEC,
  TICK_MS,
  TICK_RATE_HZ,
  advanceSwordCombo,
  finishSwordCombo,
  isInSwordM1Cone,
  type ClientSwingMessage,
  type GameState,
  type Player,
  type ServerAbilityFailedMessage,
  type StatusKind,
} from '@ragequit/shared'

import type { PendingDamage } from './damage-types.js'

const LAG_COMP_BUFFER_TICKS = Math.round(LAG_COMP_BUFFER_MS / TICK_MS)
const LAG_COMP_MAX_TICKS = Math.floor(LAG_COMP_MAX_COMPENSATE_MS / TICK_MS)
const SWORD_SWING_TICKS = Math.round(SWORD_M1_SWING_SEC * TICK_RATE_HZ)
const SWORD_HIT_OFFSET_TICKS = Math.round(SWORD_SWING_TICKS * SWORD_M1_HIT_FRACTION)

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

interface PendingSwing {
  attackerId: string
  startTick: number
  hitTick: number
  fromAtTick: number // client-estimated server tick at fire time (for rewind)
  yaw: number
  damage: number
  comboIndex: number
  originX: number
  originY: number
  originZ: number
  resolved: boolean
}

/** The slice of GameRoom the melee subsystem needs. */
export interface MeleeSystemHost {
  readonly state: GameState
  enqueueDamage(d: PendingDamage): void
  resolveDisplacement(
    player: Player,
    dx: number,
    dz: number,
    cancelOnCollision: boolean,
  ): { x: number; z: number }
  syncSimPos(playerId: string, x: number, z: number): void
  syncSimStamina(playerId: string, stamina: number): void
  /** Rewound position from the lag-comp ring buffer, or null if unavailable. */
  lookupHistory(playerId: string, tick: number): { x: number; y: number; z: number } | null
  sendAbilityFailed(
    sid: string,
    abilityId: string,
    reason: ServerAbilityFailedMessage['reason'],
  ): void
  hasStatus(player: Player, kind: StatusKind): boolean
  /** Class-mechanic hook: a sword hit from `attackerId` landed at tick `now`. */
  onSwordHitLanded(attackerId: string, now: number): void
}

export class MeleeSystem {
  // Active sword swings — resolved on their hit tick.
  private pending: PendingSwing[] = []

  constructor(private readonly host: MeleeSystemHost) {}

  tryStartSwing(sid: string, player: Player, msg: ClientSwingMessage, now: number): void {
    if (!player.alive) return
    if (this.host.state.tick < player.weaponSwapEndTick) {
      this.host.sendAbilityFailed(sid, 'sword_m1', 'swapping')
      return
    }
    if (this.host.hasStatus(player, 'invulnerable')) return
    if (player.activeWeapon !== 'sword') return
    // Can't swing while a cast windup is in progress.
    if (player.casting) return
    // Can't start a new swing while the previous is still animating.
    if (now < player.swingEndsAtTick) return
    if (player.stamina < SWORD_M1_COST_STAMINA) {
      this.host.sendAbilityFailed(sid, 'sword_m1', 'cost')
      return
    }
    // Note: onGround is deliberately not a gate. Target air combat keeps sword
    // input legal during a launch; actual reach and server hit tests decide it.

    const combo = advanceSwordCombo(player.comboIndex, player.lastSwingStartTick, now)

    const startTick = now
    const hitTick = startTick + SWORD_HIT_OFFSET_TICKS
    const endTick = startTick + SWORD_SWING_TICKS

    player.stamina = Math.max(0, player.stamina - SWORD_M1_COST_STAMINA)
    this.host.syncSimStamina(sid, player.stamina)
    player.lastSwingStartTick = startTick
    player.swingEndsAtTick = endTick

    this.pending.push({
      attackerId: sid,
      startTick,
      hitTick,
      fromAtTick: msg.atTick,
      yaw: msg.yaw,
      damage: combo.damage,
      comboIndex: combo.indexJustPlayed,
      originX: player.transform.x,
      originY: player.transform.y,
      originZ: player.transform.z,
      resolved: false,
    })
  }

  resolveSwings(now: number): void {
    const keep: PendingSwing[] = []
    for (const swing of this.pending) {
      if (swing.resolved) continue
      if (now < swing.hitTick) {
        keep.push(swing)
        continue
      }
      swing.resolved = true
      const attacker = this.host.state.players.get(swing.attackerId)
      if (!attacker || !attacker.alive) continue

      const rewindTicks = clamp(
        now - swing.fromAtTick,
        0,
        Math.min(LAG_COMP_BUFFER_TICKS, LAG_COMP_MAX_TICKS),
      )
      const rewindTargetTick = now - rewindTicks
      const origin = { x: swing.originX, y: swing.originY, z: swing.originZ }
      let landed = false

      const swingAttacker = this.host.state.players.get(swing.attackerId)
      for (const [vid, victim] of this.host.state.players) {
        if (vid === swing.attackerId) continue
        // No friendly fire in team modes.
        if (swingAttacker?.team && victim.team && swingAttacker.team === victim.team) continue
        if (!victim.alive) continue
        if (now < victim.invulnUntilTick) continue
        const victimPos = this.host.lookupHistory(vid, rewindTargetTick) ?? {
          x: victim.transform.x,
          y: victim.transform.y,
          z: victim.transform.z,
        }
        if (isInSwordM1Cone(origin, swing.yaw, victimPos)) {
          this.host.enqueueDamage({
            attackerId: swing.attackerId,
            victimId: vid,
            damage: swing.damage,
            knockup: false,
            cause: 'sword_m1',
            canParry: true,
            element: '',
          })
          // Horizontal stagger push — gives the hit physical weight.
          // Skip when victim is parrying (they hold their ground).
          if (!victim.parrying) {
            const pvx = victim.transform.x - origin.x
            const pvz = victim.transform.z - origin.z
            const pd = Math.hypot(pvx, pvz) || 0.001
            const pushDist = swing.comboIndex >= 2 ? 0.7 : 0.45
            const resolved = this.host.resolveDisplacement(
              victim,
              (pvx / pd) * pushDist,
              (pvz / pd) * pushDist,
              true,
            )
            victim.transform.x = resolved.x
            victim.transform.z = resolved.z
            this.host.syncSimPos(vid, resolved.x, resolved.z)
          }
          landed = true
          break
        }
      }

      if (landed) {
        // Fury stack gain for Tank on every 3rd sword hit.
        this.host.onSwordHitLanded(swing.attackerId, now)
      }
      attacker.comboIndex = finishSwordCombo(swing.comboIndex, landed)
      if (!landed) attacker.lastSwingStartTick = 0
    }
    this.pending = keep
  }

  /** Drop all pending swings by an attacker (e.g. on leave). */
  removeByAttacker(attackerId: string): void {
    this.pending = this.pending.filter((s) => s.attackerId !== attackerId)
  }

  /** Drop every pending swing (round reset / phase change). */
  clear(): void {
    this.pending = []
  }
}
