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
  type ClientTransmuteMessage,
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

  // Validates and applies the transmute. Broadcasts ServerTransmuteResult.
  // Returns true on success, false on rejection.
  handle(sid: string, msg: ClientTransmuteMessage): boolean {
    const player = this.host.state.players.get(sid)
    if (!player) return false
    const reject = (reason: ServerTransmuteResultMessage['reason']): false => {
      const out: ServerTransmuteResultMessage = {
        playerId: sid,
        direction: msg.direction,
        ok: false,
        reason,
        atTick: this.host.state.tick,
      }
      this.host.broadcast(MessageTypes.TransmuteResult, out)
      return false
    }
    if (!TRANSMUTE_DIRECTIONS.includes(msg.direction)) return reject('cost')
    if (!player.alive) return reject('dead')
    if (this.host.state.tick < player.airborneUntilTick) return reject('airborne')
    if (player.parrying) return reject('parrying')
    if (player.casting) return reject('casting')
    const cdReady = player.transmuteCooldowns.get(msg.direction) ?? 0
    if (this.host.state.tick < cdReady) return reject('cooldown')

    let ok = false
    switch (msg.direction) {
      case 'hp_mana':
        // Require at least 1 HP to remain after the cost.
        if (player.hp <= TRANSMUTE_HP_TO_MANA_COST_HP) return reject('cost')
        player.hp -= TRANSMUTE_HP_TO_MANA_COST_HP
        player.mana = Math.min(MANA_MAX, player.mana + TRANSMUTE_HP_TO_MANA_GAIN_MANA)
        ok = true
        break
      case 'mana_stam':
        if (player.mana < TRANSMUTE_MANA_TO_STAM_COST_MANA) return reject('cost')
        player.mana -= TRANSMUTE_MANA_TO_STAM_COST_MANA
        player.stamina = Math.min(STAMINA_MAX, player.stamina + TRANSMUTE_MANA_TO_STAM_GAIN_STAM)
        ok = true
        break
      case 'stam_hp':
        if (player.stamina < TRANSMUTE_STAM_TO_HP_COST_STAM) return reject('cost')
        player.stamina -= TRANSMUTE_STAM_TO_HP_COST_STAM
        player.hp = Math.min(HP_MAX, player.hp + TRANSMUTE_STAM_TO_HP_GAIN_HP)
        ok = true
        break
    }
    if (!ok) return reject('cost')

    player.transmuteCooldowns.set(msg.direction, this.host.state.tick + TRANSMUTE_CD_TICKS)
    if (msg.direction === 'mana_stam' || msg.direction === 'hp_mana') {
      player.lastManaSpendAtTick = this.host.state.tick
    }

    // Cleanse any cleanseable status (Bleed) per M4 Bleed Strike mini-malus.
    for (let i = player.statuses.length - 1; i >= 0; i--) {
      const k = player.statuses[i]!.kind as StatusKind
      if (STATUS_META[k]?.cleansedByTransmute) this.statuses.cleanse(sid, k)
    }

    const out: ServerTransmuteResultMessage = {
      playerId: sid,
      direction: msg.direction,
      ok: true,
      atTick: this.host.state.tick,
    }
    this.host.broadcast(MessageTypes.TransmuteResult, out)
    return true
  }

  // Reset cooldowns on respawn.
  reset(sid: string): void {
    const player = this.host.state.players.get(sid)
    if (!player) return
    for (const d of TRANSMUTE_DIRECTIONS) player.transmuteCooldowns.set(d, 0)
  }
}
