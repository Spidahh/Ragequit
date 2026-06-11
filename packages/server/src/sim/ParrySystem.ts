// ---------------------------------------------------------------------------
// Server-side parry subsystem.
//
// Owns the tap/hold parry state machine: press opens a tap window, release
// inside it finalises a tap (stamina + cooldown), holding past the window
// slides into hold mode (per-tick stamina drain until empty), and death cancels
// it. Emits ParryEvent broadcasts for client VFX/animation. The block fraction
// applied to incoming damage lives in the damage drain (applyParryReduction) —
// this class only drives the parry *state*.
//
// Extracted from GameRoom behind a host interface (same pattern as Projectile/
// Zone/Melee systems). GameRoom implements `ParrySystemHost`.
// ---------------------------------------------------------------------------
import {
  MessageTypes,
  PARRY_HOLD_DRAIN_PER_SEC,
  PARRY_TAP_COOLDOWN_SEC,
  PARRY_TAP_COST_STAMINA,
  PARRY_TAP_WINDOW_SEC,
  TICK_RATE_HZ,
  type GameState,
  type ServerAbilityFailedMessage,
  type ServerParryEventMessage,
} from '@ragequit/shared'

const PARRY_TAP_WINDOW_TICKS = Math.round(PARRY_TAP_WINDOW_SEC * TICK_RATE_HZ)
const PARRY_TAP_COOLDOWN_TICKS = Math.round(PARRY_TAP_COOLDOWN_SEC * TICK_RATE_HZ)

/** The slice of GameRoom the parry subsystem needs. */
export interface ParrySystemHost {
  readonly state: GameState
  sendAbilityFailed(
    sid: string,
    abilityId: string,
    reason: ServerAbilityFailedMessage['reason'],
  ): void
  syncSimStamina(playerId: string, stamina: number): void
  broadcast(type: string, message: unknown): void
}

export class ParrySystem {
  // Press-tick per player, needed to decide tap vs hold at release.
  private readonly pressTick = new Map<string, number>()

  constructor(private readonly host: ParrySystemHost) {}

  press(sid: string): void {
    const player = this.host.state.players.get(sid)
    if (!player || !player.alive) return
    if (this.host.state.tick < player.weaponSwapEndTick) {
      this.host.sendAbilityFailed(sid, 'parry', 'swapping')
      return
    }
    if (player.casting) {
      this.host.sendAbilityFailed(sid, 'parry', 'casting')
      return
    }
    // Can't open a new parry while one is already in progress.
    if (player.parrying) {
      this.host.sendAbilityFailed(sid, 'parry', 'parrying')
      return
    }
    // Tap CD only gates NEW taps; hold requires no CD. At press-time we
    // don't know yet if it'll be a tap, so gate by CD up front. If stamina is
    // too low even for a tap, the press is a no-op.
    if (this.host.state.tick < player.parryCooldownReadyAtTick) {
      this.host.sendAbilityFailed(sid, 'parry', 'cooldown')
      return
    }
    if (player.stamina < PARRY_TAP_COST_STAMINA) {
      this.host.sendAbilityFailed(sid, 'parry', 'cost')
      return
    }

    const now = this.host.state.tick
    // Parry is a defensive commitment. Starting it cancels a bow draw so the
    // player cannot hold a charged shot and block/release at the same time.
    player.bowChargeStartTick = 0
    // Enter tap mode; on release inside the window we finalise tap + burn
    // stamina + start CD. If release comes after the window, we slide into
    // hold mode.
    player.parrying = true
    player.parryIsHold = false
    player.parryTapEndsAtTick = now + PARRY_TAP_WINDOW_TICKS
    this.pressTick.set(sid, now)

    const ev: ServerParryEventMessage = {
      playerId: sid,
      kind: 'tapStart',
      atTick: now,
    }
    this.host.broadcast(MessageTypes.ParryEvent, ev)
  }

  release(sid: string): void {
    const player = this.host.state.players.get(sid)
    if (!player) return
    if (!player.parrying) return
    const now = this.host.state.tick
    const pressTick = this.pressTick.get(sid) ?? now
    const heldTicks = now - pressTick

    if (heldTicks <= PARRY_TAP_WINDOW_TICKS && !player.parryIsHold) {
      // Tap completed inside window. Burn stamina + CD.
      player.stamina = Math.max(0, player.stamina - PARRY_TAP_COST_STAMINA)
      this.host.syncSimStamina(sid, player.stamina)
      player.parryCooldownReadyAtTick = now + PARRY_TAP_COOLDOWN_TICKS
      this.emit(sid, 'tapEnd', now)
    } else if (player.parryIsHold) {
      this.emit(sid, 'holdEnd', now)
    } else {
      // Released the same tick the window expired, before tick() converted it to
      // hold: still a completed tap, so burn stamina + CD like the tap case above
      // (closes a 1-tick free-parry bypass).
      player.stamina = Math.max(0, player.stamina - PARRY_TAP_COST_STAMINA)
      this.host.syncSimStamina(sid, player.stamina)
      player.parryCooldownReadyAtTick = now + PARRY_TAP_COOLDOWN_TICKS
      this.emit(sid, 'tapEnd', now)
    }

    player.parrying = false
    player.parryIsHold = false
    player.parryTapEndsAtTick = 0
    this.pressTick.delete(sid)
  }

  tick(now: number, dt: number): void {
    for (const [sid, player] of this.host.state.players) {
      if (!player.parrying) continue
      // If tap window elapsed and the key is still held, transition to hold.
      if (!player.parryIsHold && now >= player.parryTapEndsAtTick) {
        player.parryIsHold = true
        player.parryTapEndsAtTick = 0
        this.emit(sid, 'holdStart', now)
      }

      if (player.parryIsHold) {
        // Drain stamina; cancel if empty.
        const drained = player.stamina - PARRY_HOLD_DRAIN_PER_SEC * dt
        if (drained <= 0) {
          player.stamina = 0
          player.parrying = false
          player.parryIsHold = false
          this.pressTick.delete(sid)
          this.emit(sid, 'holdEnd', now)
        } else {
          player.stamina = drained
          this.host.syncSimStamina(sid, player.stamina)
        }
      }

      // Death cancels parry immediately.
      if (!player.alive) {
        const wasHold = player.parryIsHold
        player.parrying = false
        player.parryIsHold = false
        this.pressTick.delete(sid)
        this.emit(sid, wasHold ? 'holdEnd' : 'tapEnd', now)
      }
    }
  }

  /** Forget a player's press state (leave / phase reset). */
  forget(sid: string): void {
    this.pressTick.delete(sid)
  }

  private emit(sid: string, kind: ServerParryEventMessage['kind'], atTick: number): void {
    const msg: ServerParryEventMessage = { playerId: sid, kind, atTick }
    this.host.broadcast(MessageTypes.ParryEvent, msg)
  }
}
