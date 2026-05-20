// Server-side status runtime (Fase 4).
//
// Authority on damage, decay, locks, and broadcast for every active
// StatusInstance on every Player. Pure-ish — depends only on the shared
// status helpers + the room's `pendingDamage` queue; the GameRoom calls
// `tick()` once per frame after movement and before final damage drain.
//
// The DoT damage path goes through the room's existing `pendingDamage` queue
// (the same one swing/uppercut/projectile use) so a status kill triggers the
// normal Death broadcast + respawn flow with `cause = 'status:<kind>'`.

import { type ArraySchema } from '@colyseus/schema'
import {
  MessageTypes,
  STATUS_META,
  StatusInstance,
  applyStatus as pureApply,
  getMasteryBonus,
  isCastLocked as pureIsCastLocked,
  isMovementLocked as pureIsMovementLocked,
  totalSlowFraction as pureTotalSlow,
  type Player,
  type ServerStatusAppliedMessage,
  type ServerStatusExpiredMessage,
  type StatusEffect,
  type StatusInstanceShape,
  type StatusKind,
} from '@ragequit/shared'

// Shape of the room's damage queue entry — we mirror the discriminated cause
// so DoT lethal hits attribute correctly.
export interface PendingDamageEntry {
  attackerId: string
  victimId: string
  amount: number
  element: string
  cause: string
  canParry: boolean
  lifestealFraction?: number
  onDamageStatus?: Pick<StatusEffect, 'status' | 'durationSec' | 'stacks' | 'slowFraction'>
}

export interface StatusRuntimeHost {
  state: { players: Map<string, Player>; tick: number }
  pendingDamage: { push: (e: PendingDamageEntry) => number | unknown }
  broadcast: (type: string, message: unknown) => void
}

export class StatusRuntime {
  // Per-player, per-status-kind tick accumulators (so 1-second DoTs fire
  // exactly once per real second across 60 Hz frames).
  private readonly accs: Map<string, Map<StatusKind, number>> = new Map()

  constructor(private readonly host: StatusRuntimeHost) {}

  // Apply a new status (or refresh / stack an existing one). `sourceId` is
  // attributed for lethal-hit kill credit. Broadcasts `StatusApplied`.
  applyToPlayer(
    sid: string,
    kind: StatusKind,
    durationSec: number,
    stacks: number,
    sourceId: string,
    slowFractionOverride?: number,
  ): void {
    const player = this.host.state.players.get(sid)
    if (!player || !player.alive) return
    if (sourceId !== sid && this.findIndex(player.statuses, 'invulnerable') >= 0) return

    // Reduce the current ArraySchema into a plain shape for the pure helper.
    const idx = this.findIndex(player.statuses, kind)
    const prevShape: StatusInstanceShape | null = idx >= 0 ? toShape(player.statuses[idx]!) : null
    const next = pureApply(
      prevShape,
      { stacks, durationSec, slowFractionOverride: slowFractionOverride },
      kind,
    )
    if (idx >= 0) {
      const inst = player.statuses[idx]!
      inst.kind = next.kind
      inst.stacks = next.stacks
      inst.remainingSec = next.remainingSec
      inst.slowFractionOverride = next.slowFractionOverride ?? 0
      inst.sourceId = sourceId || inst.sourceId
    } else {
      const inst = new StatusInstance()
      inst.kind = next.kind
      inst.stacks = next.stacks
      inst.remainingSec = next.remainingSec
      inst.slowFractionOverride = next.slowFractionOverride ?? 0
      inst.sourceId = sourceId
      player.statuses.push(inst)
    }

    const msg: ServerStatusAppliedMessage = {
      playerId: sid,
      status: kind,
      stacks: next.stacks,
      durationSec: next.remainingSec,
      sourceId,
      atTick: this.host.state.tick,
    }
    this.host.broadcast(MessageTypes.StatusApplied, msg)

    // --- Status combo reactions -------------------------------------------
    this.checkCombos(sid, kind, sourceId)
  }

  /**
   * Check for reactive status combos after a new status is applied.
   *
   *  burn  + chill  → STEAM:      remove both, deal burst AoE (radius 3.5 m).
   *  poison + bleed → FESTERING:  both remain, flagged for 2× DoT (tick()).
   *  stun  + burn   → COMBUSTION: remove stun, deal 12 AoE dmg in 3 m.
   *  root  + poison → ENTRAPMENT: both remain, poison ticks at 2× rate (tick()).
   */
  private checkCombos(sid: string, triggerKind: StatusKind, sourceId: string): void {
    const player = this.host.state.players.get(sid)
    if (!player || !player.alive) return

    // STEAM: burn meets chill (or vice versa)
    if (triggerKind === 'burn' || triggerKind === 'chill') {
      const burnIdx = this.findIndex(player.statuses, 'burn')
      const chillIdx = this.findIndex(player.statuses, 'chill')
      if (burnIdx >= 0 && chillIdx >= 0) {
        const burnStacks = player.statuses[burnIdx]!.stacks
        const chillStacks = player.statuses[chillIdx]!.stacks
        const burstDamage = 6 + (burnStacks + chillStacks) * 4 // 14–34 dmg range
        const cx = player.transform.x
        const cz = player.transform.z
        const STEAM_RADIUS = 3.5

        // Remove the two comboing statuses.
        const higherIdx = Math.max(burnIdx, chillIdx)
        const lowerIdx = Math.min(burnIdx, chillIdx)
        player.statuses.splice(higherIdx, 1)
        player.statuses.splice(lowerIdx, 1)
        this.accs.get(sid)?.delete('burn')
        this.accs.get(sid)?.delete('chill')
        this.broadcastExpired(sid, 'burn')
        this.broadcastExpired(sid, 'chill')

        // AoE burst centred on victim — hits anyone (including the combo victim)
        // within STEAM_RADIUS.
        this.host.state.players.forEach((p, vid) => {
          if (!p.alive) return
          const dx = p.transform.x - cx
          const dz = p.transform.z - cz
          if (Math.hypot(dx, dz) > STEAM_RADIUS) return
          this.host.pendingDamage.push({
            attackerId: sourceId,
            victimId: vid,
            amount: burstDamage,
            element: 'steam',
            cause: 'combo:steam',
            canParry: false,
          })
        })
      }
    }

    // FESTERING: both poison and bleed now present — no immediate action;
    // tick() detects co-presence and multiplies DoT damage.

    // COMBUSTION: stun applied on a burning target → consume the stun,
    // deal flat 12 AoE damage to everyone within 3 m of the victim.
    // The burn REMAINS so the attacker can still ride the fire damage.
    if (triggerKind === 'stun') {
      const stunIdx = this.findIndex(player.statuses, 'stun')
      const burnIdx = this.findIndex(player.statuses, 'burn')
      if (stunIdx >= 0 && burnIdx >= 0) {
        // Remove only the stun — burn stays.
        player.statuses.splice(stunIdx, 1)
        this.accs.get(sid)?.delete('stun')
        this.broadcastExpired(sid, 'stun')

        const COMBUSTION_RADIUS = 3.0
        this.host.state.players.forEach((p, vid) => {
          if (!p.alive) return
          const dx = p.transform.x - player.transform.x
          const dz = p.transform.z - player.transform.z
          if (Math.hypot(dx, dz) > COMBUSTION_RADIUS) return
          this.host.pendingDamage.push({
            attackerId: sourceId,
            victimId: vid,
            amount: 12,
            element: 'fire',
            cause: 'combo:combustion',
            canParry: false,
          })
        })
      }
    }

    // ENTRAPMENT: root applied on a poisoned target (or poison on a rooted
    // target) — both statuses remain. tick() detects co-presence and halves
    // poison tickEverySec (effectively 2× poison tick rate).
    // No immediate action required here — tick() handles it via entrapment flag.
  }

  // Cleanse a status from a player (used by transmute → Bleed). Broadcast.
  cleanse(sid: string, kind: StatusKind): boolean {
    const player = this.host.state.players.get(sid)
    if (!player) return false
    const idx = this.findIndex(player.statuses, kind)
    if (idx < 0) return false
    player.statuses.splice(idx, 1)
    const acc = this.accs.get(sid)
    acc?.delete(kind)
    const msg: ServerStatusExpiredMessage = {
      playerId: sid,
      status: kind,
      atTick: this.host.state.tick,
    }
    this.host.broadcast(MessageTypes.StatusExpired, msg)
    return true
  }

  // Absorb incoming damage with the victim's shield status (if any).
  // Returns the remaining damage after shield absorption. If the shield
  // is fully depleted it is removed and StatusExpired is broadcast.
  absorbWithShield(sid: string, damage: number): number {
    if (damage <= 0) return 0
    const player = this.host.state.players.get(sid)
    if (!player) return damage
    const idx = this.findIndex(player.statuses, 'shield')
    if (idx < 0) return damage
    const inst = player.statuses[idx]!
    if (inst.stacks >= damage) {
      inst.stacks -= damage
      if (inst.stacks <= 0) this.cleanse(sid, 'shield')
      return 0 // fully absorbed
    } else {
      const remaining = damage - inst.stacks
      this.cleanse(sid, 'shield')
      return remaining // partially absorbed
    }
  }

  // Cleanse all negative debuffs from a player (used by cleanse_surge).
  // Does NOT remove shield, haste, or mark.
  cleanseDebuffs(sid: string): void {
    const NEGATIVE: ReadonlyArray<StatusKind> = [
      'burn',
      'bleed',
      'poison',
      'chill',
      'slow',
      'root',
      'stun',
      'freeze',
      'curse',
      'blind',
    ]
    for (const kind of NEGATIVE) this.cleanse(sid, kind)
  }

  // Drop ALL statuses (called on respawn).
  clearAll(sid: string): void {
    const player = this.host.state.players.get(sid)
    if (!player) return
    while (player.statuses.length > 0) {
      const kind = player.statuses[0]!.kind as StatusKind
      player.statuses.splice(0, 1)
      const msg: ServerStatusExpiredMessage = {
        playerId: sid,
        status: kind,
        atTick: this.host.state.tick,
      }
      this.host.broadcast(MessageTypes.StatusExpired, msg)
    }
    this.accs.delete(sid)
  }

  // Drive every status one frame. Emits DoT damage into pendingDamage and
  // expires reached-zero statuses. dtSec is one tick (TICK_MS / 1000).
  tick(dtSec: number): void {
    this.host.state.players.forEach((player, sid) => {
      if (!player.alive) {
        if (player.statuses.length > 0) this.clearAll(sid)
        return
      }
      if (player.statuses.length === 0) return

      let acc = this.accs.get(sid)
      if (!acc) {
        acc = new Map<StatusKind, number>()
        this.accs.set(sid, acc)
      }

      // FESTERING combo: poison + bleed co-present → 2× DoT tick damage.
      const festering =
        this.findIndex(player.statuses, 'poison') >= 0 &&
        this.findIndex(player.statuses, 'bleed') >= 0

      // ENTRAPMENT combo: root + poison co-present → poison ticks at 2× rate.
      const entrapment =
        this.findIndex(player.statuses, 'root') >= 0 &&
        this.findIndex(player.statuses, 'poison') >= 0

      // Walk in reverse so we can splice expired entries safely.
      for (let i = player.statuses.length - 1; i >= 0; i--) {
        const inst = player.statuses[i]!
        const kind = inst.kind as StatusKind
        const meta = STATUS_META[kind]
        // ENTRAPMENT halves the poison tick period (2× effective tick rate).
        const effectiveTickPeriod =
          entrapment && kind === 'poison' ? meta.tickEverySec * 0.5 : meta.tickEverySec
        const newAcc = (acc.get(kind) ?? 0) + dtSec
        if (newAcc >= effectiveTickPeriod) {
          if (meta.damagePerTick > 0) {
            const festerMul = festering && (kind === 'poison' || kind === 'bleed') ? 2 : 1
            const source = this.host.state.players.get(inst.sourceId)
            const natureDotMul =
              kind === 'poison' && source?.masteryElement === 'nature' && source.masteryLevel >= 1
                ? (getMasteryBonus('nature')?.dotTickMult ?? 1)
                : 1
            this.host.pendingDamage.push({
              attackerId: inst.sourceId,
              victimId: sid,
              amount: meta.damagePerTick * inst.stacks * festerMul * natureDotMul,
              element: '',
              cause:
                festering && festerMul > 1
                  ? 'combo:festering'
                  : entrapment && kind === 'poison'
                    ? 'combo:entrapment'
                    : `status:${kind}`,
              canParry: false,
            })
          }
          acc.set(kind, newAcc - effectiveTickPeriod)
        } else {
          acc.set(kind, newAcc)
        }
        const remaining = inst.remainingSec - dtSec
        if (remaining <= 0) {
          player.statuses.splice(i, 1)
          acc.delete(kind)
          const msg: ServerStatusExpiredMessage = {
            playerId: sid,
            status: kind,
            atTick: this.host.state.tick,
          }
          this.host.broadcast(MessageTypes.StatusExpired, msg)
        } else {
          inst.remainingSec = remaining
        }
      }
    })
  }

  // Read-only queries the GameRoom uses for movement / cast gating.
  totalSlowFraction(player: Player): number {
    return pureTotalSlow(this.toShapes(player.statuses))
  }
  isMovementLocked(player: Player): boolean {
    return pureIsMovementLocked(this.toShapes(player.statuses))
  }
  isCastLocked(player: Player): boolean {
    return pureIsCastLocked(this.toShapes(player.statuses))
  }
  hasStatus(player: Player, kind: StatusKind): boolean {
    return this.findIndex(player.statuses, kind) >= 0
  }

  // --- helpers --------------------------------------------------------------

  private findIndex(arr: ArraySchema<StatusInstance>, kind: StatusKind): number {
    for (let i = 0; i < arr.length; i++) {
      if (arr[i]!.kind === kind) return i
    }
    return -1
  }

  private toShapes(arr: ArraySchema<StatusInstance>): StatusInstanceShape[] {
    const out: StatusInstanceShape[] = new Array(arr.length)
    for (let i = 0; i < arr.length; i++) out[i] = toShape(arr[i]!)
    return out
  }

  private broadcastExpired(sid: string, kind: StatusKind): void {
    const msg: ServerStatusExpiredMessage = {
      playerId: sid,
      status: kind,
      atTick: this.host.state.tick,
    }
    this.host.broadcast(MessageTypes.StatusExpired, msg)
  }
}

function toShape(i: StatusInstance): StatusInstanceShape {
  return {
    kind: i.kind as StatusKind,
    stacks: i.stacks,
    remainingSec: i.remainingSec,
    slowFractionOverride: i.slowFractionOverride > 0 ? i.slowFractionOverride : undefined,
  }
}
