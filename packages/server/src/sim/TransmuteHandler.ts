// Transmute handler (Fase 4).
//
// Authority: 01_DESIGN/04_transmutation.md.
//
// Three directions, each with an independent 5 s cooldown:
//   HP   → Mana    : 20 HP   → 20 Mana    (1:1)
//   Mana → Stamina : 20 Mana → 20 Stamina (1:1)
//   Stam → HP      : 30 Stam → 20 HP      (3:2 emergency penalty)
//
// Activation rules (from design):
//   - cannot transmute during parry (M2) or mid-ability cast
//   - cannot transmute when dead / airborne (status lock)
//   - input pool must cover the cost
//
// Side effect: a successful transmute cleanses any status with
// `cleansedByTransmute = true` (Bleed) on the caster — `05_abilities_melee.md`
// M4 mini-malus.

import {
  HP_MAX,
  MANA_MAX,
  MessageTypes,
  STAMINA_MAX,
  STATUS_META,
  TICK_RATE_HZ,
  TRANSMUTE_COOLDOWN_SEC,
  TRANSMUTE_HP_TO_MANA_COST_HP,
  TRANSMUTE_HP_TO_MANA_GAIN_MANA,
  TRANSMUTE_MANA_TO_STAM_COST_MANA,
  TRANSMUTE_MANA_TO_STAM_GAIN_STAM,
  TRANSMUTE_STAM_TO_HP_COST_STAM,
  TRANSMUTE_STAM_TO_HP_GAIN_HP,
  TARGET_CLASS_DEFS,
  type ClassId,
  type Player,
  type ServerTransmuteResultMessage,
  type StatusKind,
  type TransmuteDirection,
} from '@ragequit/shared'

import type { StatusRuntime } from './StatusRuntime.js'

const TRANSMUTE_CD_TICKS = Math.round(TRANSMUTE_COOLDOWN_SEC * TICK_RATE_HZ)

const TRANSMUTE_DIRECTIONS: readonly TransmuteDirection[] = ['hp_mana', 'mana_stam', 'stam_hp']

export interface TransmuteHost {
  state: { players: Map<string, Player>; tick: number }
  broadcast: (type: string, message: unknown) => void
}

export class TransmuteHandler {
  constructor(
    private readonly host: TransmuteHost,
    private readonly statuses: StatusRuntime,
  ) {}

  // Validates a player's transmutation request and returns a failure reason, or null if valid.
  getFailureReason(
    player: Player,
    direction: TransmuteDirection,
    skipLocks = false,
  ): ServerTransmuteResultMessage['reason'] | null {
    if (!TRANSMUTE_DIRECTIONS.includes(direction)) return 'cost'
    if (!player.alive) return 'dead'

    if (!skipLocks) {
      if (this.host.state.tick < player.airborneUntilTick) return 'airborne'
      if (player.parrying) return 'parrying'
      if (player.casting) return 'casting'
    }

    const cdReady = player.transmuteCooldowns.get(direction) ?? 0
    if (this.host.state.tick < cdReady) return 'cooldown'

    switch (direction) {
      case 'hp_mana':
        if (player.hp <= TRANSMUTE_HP_TO_MANA_COST_HP) return 'cost'
        break
      case 'mana_stam':
        if (player.mana < TRANSMUTE_MANA_TO_STAM_COST_MANA) return 'cost'
        break
      case 'stam_hp':
        if (player.stamina < TRANSMUTE_STAM_TO_HP_COST_STAM) return 'cost'
        break
    }
    return null
  }

  // Authoritatively applies the transmutation effect and broadcasts a success message.
  apply(sid: string, player: Player, direction: TransmuteDirection): void {
    const classId = (player.classId ?? 'hybrid') as ClassId
    const maxima = TARGET_CLASS_DEFS[classId]?.resourceMaxima
    const hpMax = maxima?.hp ?? HP_MAX
    const manaMax = maxima?.mana ?? MANA_MAX
    const staminaMax = maxima?.stamina ?? STAMINA_MAX
    switch (direction) {
      case 'hp_mana':
        player.hp -= TRANSMUTE_HP_TO_MANA_COST_HP
        player.mana = Math.min(manaMax, player.mana + TRANSMUTE_HP_TO_MANA_GAIN_MANA)
        break
      case 'mana_stam':
        player.mana -= TRANSMUTE_MANA_TO_STAM_COST_MANA
        player.stamina = Math.min(staminaMax, player.stamina + TRANSMUTE_MANA_TO_STAM_GAIN_STAM)
        break
      case 'stam_hp':
        player.stamina -= TRANSMUTE_STAM_TO_HP_COST_STAM
        player.hp = Math.min(hpMax, player.hp + TRANSMUTE_STAM_TO_HP_GAIN_HP)
        break
    }

    player.transmuteCooldowns.set(direction, this.host.state.tick + TRANSMUTE_CD_TICKS)
    if (direction === 'mana_stam' || direction === 'hp_mana') {
      player.lastManaSpendAtTick = this.host.state.tick
    }

    // Cleanse any cleanseable status (Bleed) per M4 Bleed Strike mini-malus.
    for (let i = player.statuses.length - 1; i >= 0; i--) {
      const k = player.statuses[i]!.kind as StatusKind
      if (STATUS_META[k]?.cleansedByTransmute) this.statuses.cleanse(sid, k)
    }

    const out: ServerTransmuteResultMessage = {
      playerId: sid,
      direction,
      ok: true,
      atTick: this.host.state.tick,
    }
    this.host.broadcast(MessageTypes.TransmuteResult, out)
  }

  // Broadcasts a failed transmutation result.
  broadcastFailure(
    sid: string,
    direction: TransmuteDirection,
    reason: ServerTransmuteResultMessage['reason'],
  ): void {
    const out: ServerTransmuteResultMessage = {
      playerId: sid,
      direction,
      ok: false,
      reason,
      atTick: this.host.state.tick,
    }
    this.host.broadcast(MessageTypes.TransmuteResult, out)
  }

  // Reset cooldowns on respawn.
  reset(sid: string): void {
    const player = this.host.state.players.get(sid)
    if (!player) return
    for (const d of TRANSMUTE_DIRECTIONS) player.transmuteCooldowns.set(d, 0)
  }
}
