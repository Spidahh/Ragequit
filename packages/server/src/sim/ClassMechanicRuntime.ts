// Class mechanic runtime.
//
// Authoritative server-side logic for the four class identity mechanics:
//
//   Tank    → FURY       (melee damage stacks + surge burst)
//   Archer  → MOMENTUM   (movement-based bow charge & CDR bonus)
//   Mago    → RISONANZA  (same-element spell combo proc)
//   Ibrido  → FLOW       (weapon-swap stack, GCD skip + damage burst)
//
// Fields the HUD needs are replicated directly on the Player schema
// additions). Non-replicated tracking (sword-hit counters, decay timers) lives
// in per-player Maps here so the schema stays lean.
//
// Consumed exclusively by GameRoom. Tests use Player instances directly.

import { TICK_RATE_HZ, type ClassId, type Player } from '@ragequit/shared'

// ---------------------------------------------------------------------------
// Public constants (used by GameRoom for damage application)
// ---------------------------------------------------------------------------

/** Fury: each stack adds this fraction to melee damage (+8% per stack). */
export const FURY_STACK_DAMAGE_FRAC = 0.08
/** Fury: surge burst adds this additional fraction (+40%) on top of stack bonus. */
export const FURY_SURGE_DAMAGE_BONUS = 0.4
/** Flow: pending damage bonus fraction (+20%). */
export const FLOW_DAMAGE_BONUS_FRAC = 0.2

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const FURY_MAX_STACKS = 5
const FURY_DECAY_DELAY_SEC = 4.0 // idle seconds before decay starts
const FURY_DECAY_PER_SEC = 0.5 // stacks lost per second during decay
const FURY_HITS_PER_STACK = 3 // sword M1 hits between Fury stack gains

const MOMENTUM_MAX = 100
const MOMENTUM_GAIN_PER_SEC = 12
/** Momentum threshold for reduced bow charge time (2.0 s → 1.2 s). */
export const MOMENTUM_BOW_BONUS_THRESHOLD = 60
/** Bow full-charge time when Momentum ≥ threshold. */
export const MOMENTUM_BOW_CHARGE_FAST_SEC = 1.2
/** Fraction of magic ability CD removed at Momentum 100. */
const MOMENTUM_MAGIC_CDR_FRAC = 0.15

const RISONANZA_WINDOW_TICKS = Math.round(2.5 * TICK_RATE_HZ)

const FLOW_MAX_STACKS = 3
const FLOW_DECAY_DELAY_SEC = 8.0 // seconds without swap before -1 stack

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlayerMechanicState {
  // Fury
  furySwordHitCount: number
  furyLastCombatTick: number
  // Flow
  flowLastSwapTick: number
}

/** Describes a Risonanza proc that GameRoom must resolve. */
export interface RisonanzaProcRequest {
  element: string
  casterSid: string
  target: {
    yaw: number
    pitch: number
    point?: { x: number; y: number; z: number }
    targetId?: string
  }
}

// ---------------------------------------------------------------------------
// ClassMechanicRuntime
// ---------------------------------------------------------------------------

export class ClassMechanicRuntime {
  private readonly ps = new Map<string, PlayerMechanicState>()
  /**
   * Set of player sids whose current in-flight ability cast carries a Flow
   * +20% damage amplification. Cleared when the first matching damage lands
   * in drainDamage, or on respawn.
   */
  private readonly flowDamagePending = new Set<string>()

  constructor(
    private readonly state: { players: Map<string, Player>; tick: number },
    private readonly onRisonanzaProc: (req: RisonanzaProcRequest, now: number) => void,
  ) {}

  private getPs(sid: string): PlayerMechanicState {
    let s = this.ps.get(sid)
    if (!s) {
      s = { furySwordHitCount: 0, furyLastCombatTick: 0, flowLastSwapTick: 0 }
      this.ps.set(sid, s)
    }
    return s
  }

  // --------------------------------------------------------------------------
  // Per-tick decay (call once per alive player per server tick)
  // --------------------------------------------------------------------------

  tick(sid: string, player: Player, dt: number, now: number): void {
    switch (player.classId as ClassId) {
      case 'tank':
        this.tickFury(sid, player, dt, now)
        break
      case 'archer':
        this.tickMomentum(player, dt)
        break
      case 'hybrid':
        this.tickFlow(sid, player, now)
        break
      // 'mage': Risonanza window expiry is passive — checked at read time via risonanzaArmedUntilTick
    }
  }

  private tickFury(sid: string, player: Player, dt: number, now: number): void {
    if (player.furyStacks <= 0) return
    const s = this.getPs(sid)
    if (s.furyLastCombatTick === 0) return
    const idleSec = (now - s.furyLastCombatTick) / TICK_RATE_HZ
    if (idleSec < FURY_DECAY_DELAY_SEC) return
    player.furyStacks = Math.max(0, player.furyStacks - FURY_DECAY_PER_SEC * dt)
    if (player.furyStacks < 0.01) player.furyStacks = 0
  }

  private tickMomentum(player: Player, dt: number): void {
    // Gain while the player is moving (vx/vz replicated for this purpose).
    const vxz2 = player.vx * player.vx + player.vz * player.vz
    if (vxz2 > 0.25) {
      player.momentum = Math.min(MOMENTUM_MAX, player.momentum + MOMENTUM_GAIN_PER_SEC * dt)
    }
  }

  private tickFlow(sid: string, player: Player, now: number): void {
    if (player.flowStacks <= 0) return
    const s = this.getPs(sid)
    if (s.flowLastSwapTick === 0) return
    const noSwapSec = (now - s.flowLastSwapTick) / TICK_RATE_HZ
    if (noSwapSec < FLOW_DECAY_DELAY_SEC) return
    player.flowStacks = Math.max(0, player.flowStacks - 1)
    // Reset decay reference so each subsequent 8 s without swap loses another stack.
    s.flowLastSwapTick = now
  }

  // --------------------------------------------------------------------------
  // Event hooks
  // --------------------------------------------------------------------------

  /**
   * Call when the player takes actual damage (applied > 0).
   * Drives Fury accumulation (Tank) and Momentum reset (Archer).
   */
  onHitTaken(sid: string, now: number): void {
    const player = this.state.players.get(sid)
    if (!player) return
    const s = this.getPs(sid)
    switch (player.classId as ClassId) {
      case 'tank': {
        const prev = Math.floor(player.furyStacks)
        player.furyStacks = Math.min(FURY_MAX_STACKS, prev + 1)
        s.furyLastCombatTick = now
        if (prev < FURY_MAX_STACKS && player.furyStacks >= FURY_MAX_STACKS) {
          this.triggerFurySurge(player)
        }
        break
      }
      case 'archer':
        player.momentum = 0
        break
    }
  }

  /**
   * Call when a Tank's sword M1 lands on any victim.
   * Every Nth hit (FURY_HITS_PER_STACK) grants +1 Fury stack.
   */
  onSwordHitLanded(sid: string, now: number): void {
    const player = this.state.players.get(sid)
    if (!player || (player.classId as ClassId) !== 'tank') return
    const s = this.getPs(sid)
    s.furyLastCombatTick = now
    s.furySwordHitCount = (s.furySwordHitCount + 1) % FURY_HITS_PER_STACK
    if (s.furySwordHitCount === 0) {
      const prev = Math.floor(player.furyStacks)
      player.furyStacks = Math.min(FURY_MAX_STACKS, prev + 1)
      if (prev < FURY_MAX_STACKS && player.furyStacks >= FURY_MAX_STACKS) {
        this.triggerFurySurge(player)
      }
    }
  }

  private triggerFurySurge(player: Player): void {
    player.furyStacks = 0
    player.furyNextMeleeIsSurge = true
  }

  /**
   * Call on manual (player-initiated) weapon swaps for Hybrid.
   * Auto-swaps triggered by the ability engine should NOT call this.
   */
  onWeaponSwap(sid: string, now: number): void {
    const player = this.state.players.get(sid)
    if (!player || (player.classId as ClassId) !== 'hybrid') return
    const s = this.getPs(sid)
    player.flowStacks = Math.min(FLOW_MAX_STACKS, player.flowStacks + 1)
    s.flowLastSwapTick = now
    if (player.flowStacks >= FLOW_MAX_STACKS) {
      player.flowPendingBonus = true
    }
  }

  /**
   * Call after a successful ability cast.
   * Handles Risonanza window arm / proc for Mago.
   * Flow state is managed by GameRoom (tryStartCast) not here.
   */
  onAbilityCast(
    sid: string,
    _abilityId: string,
    element: string | undefined,
    target: {
      yaw: number
      pitch: number
      point?: { x: number; y: number; z: number }
      targetId?: string
    },
    now: number,
  ): void {
    const player = this.state.players.get(sid)
    if (!player) return
    if ((player.classId as ClassId) === 'mage' && element && element !== 'none') {
      this.handleRisonanzaCast(player, sid, element, target, now)
    }
  }

  private handleRisonanzaCast(
    player: Player,
    sid: string,
    element: string,
    target: {
      yaw: number
      pitch: number
      point?: { x: number; y: number; z: number }
      targetId?: string
    },
    now: number,
  ): void {
    const windowActive = now < player.risonanzaArmedUntilTick
    const sameElement = player.risonanzaElement === element

    if (windowActive && sameElement) {
      // Proc: fire the bonus effect and clear the window.
      player.risonanzaElement = ''
      player.risonanzaArmedUntilTick = 0
      this.onRisonanzaProc({ element, casterSid: sid, target }, now)
    } else {
      // Arm a new window, overwriting any differing or expired element.
      player.risonanzaElement = element
      player.risonanzaArmedUntilTick = now + RISONANZA_WINDOW_TICKS
    }
  }

  // --------------------------------------------------------------------------
  // Flow damage amplification (managed separately from GCD skip)
  // --------------------------------------------------------------------------

  /**
   * Mark that the current ability cast for `sid` carries Flow +20% damage.
   * Called by GameRoom when a flow-bonus cast fires and the bonus was not
   * consumed by a Recovery heal inside the ability.
   */
  markFlowDamagePending(sid: string): void {
    this.flowDamagePending.add(sid)
  }

  /**
   * Consume the pending Flow damage bonus for the given attacker sid.
   * Returns true (and clears the flag) if a bonus was pending.
   * Called by GameRoom in drainDamage for ability-sourced hits.
   */
  consumeFlowDamagePending(sid: string): boolean {
    if (!this.flowDamagePending.has(sid)) return false
    this.flowDamagePending.delete(sid)
    return true
  }

  // --------------------------------------------------------------------------
  // Damage modifier helpers
  // --------------------------------------------------------------------------

  /**
   * Returns the outgoing melee damage multiplier for a Tank based on Fury stacks.
   * Does NOT consume stacks; surge is separate (consumeSurge).
   */
  getMeleeDamageMult(player: Player): number {
    if ((player.classId as ClassId) !== 'tank') return 1
    return 1 + player.furyStacks * FURY_STACK_DAMAGE_FRAC
  }

  /**
   * Checks and consumes the surge flag for the next Tank melee hit.
   * Returns true if a surge was pending and has been consumed.
   */
  consumeSurge(player: Player): boolean {
    if (!player.furyNextMeleeIsSurge) return false
    player.furyNextMeleeIsSurge = false
    return true
  }

  /**
   * Returns the effective bow full-charge time for an Archer.
   * At Momentum ≥ 60 the full charge is MOMENTUM_BOW_CHARGE_FAST_SEC.
   */
  getBowChargeTimeSec(baseSec: number, player: Player): number {
    if ((player.classId as ClassId) !== 'archer') return baseSec
    if (player.momentum >= MOMENTUM_BOW_BONUS_THRESHOLD) return MOMENTUM_BOW_CHARGE_FAST_SEC
    return baseSec
  }

  /**
   * Returns the cooldown multiplier for ability casts (Momentum CDR at 100).
   * 1.0 normally; 0.85 when Archer is at max Momentum.
   */
  getMomentumCooldownMult(player: Player): number {
    if ((player.classId as ClassId) !== 'archer') return 1
    if (player.momentum >= MOMENTUM_MAX) return 1 - MOMENTUM_MAGIC_CDR_FRAC
    return 1
  }

  // --------------------------------------------------------------------------
  // Recovery mechanic interactions
  // --------------------------------------------------------------------------

  /**
   * Returns bonus HP granted to the caster by a class Recovery ability.
   * Side-effects: consumes the relevant mechanic state if it qualifies.
   * Called from AbilityEngine effectHeal via the EngineHost.
   */
  getRecoveryHealBonus(sid: string, abilityId: string, now: number): number {
    const player = this.state.players.get(sid)
    if (!player) return 0
    const classId = player.classId as ClassId
    switch (abilityId) {
      case 'brace_recovery':
        if (classId !== 'tank') return 0
        // Consume surge-pending or full Fury stacks for the enhanced heal.
        if (player.furyNextMeleeIsSurge) {
          player.furyNextMeleeIsSurge = false
          return 50 // base 50 + 50 bonus = 100 HP total
        }
        if (player.furyStacks >= FURY_MAX_STACKS) {
          player.furyStacks = 0
          return 50
        }
        return 0

      case 'hunters_flow':
        if (classId !== 'archer') return 0
        // Conditional bonus — does NOT consume Momentum.
        return player.momentum >= MOMENTUM_BOW_BONUS_THRESHOLD ? 25 : 0 // +25 HP

      case 'arcane_rebind':
        if (classId !== 'mage') return 0
        // Consume active Risonanza window.
        if (player.risonanzaElement && now < player.risonanzaArmedUntilTick) {
          player.risonanzaElement = ''
          player.risonanzaArmedUntilTick = 0
          // Also prevent any pending Risonanza proc from double-firing.
          return 50 // base 60 + 50 bonus = 110 HP total
        }
        return 0

      case 'adaptive_mend':
        if (classId !== 'hybrid') return 0
        // Consume max Flow stacks (or pending bonus).
        if (player.flowStacks >= FLOW_MAX_STACKS || player.flowPendingBonus) {
          player.flowStacks = 0
          player.flowPendingBonus = false
          // Also cancel any flow damage pending (bonus was spent on heal instead).
          this.flowDamagePending.delete(sid)
          return 40 // base 30 + 40 bonus = 70 HP total
        }
        return 0

      default:
        return 0
    }
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  /**
   * Reset all mechanic state for a player (call on respawn or round reset).
   * Clears both replicated schema fields and non-replicated tracking data.
   */
  reset(sid: string): void {
    const player = this.state.players.get(sid)
    if (player) {
      player.furyStacks = 0
      player.furyNextMeleeIsSurge = false
      player.momentum = 0
      player.risonanzaElement = ''
      player.risonanzaArmedUntilTick = 0
      player.flowStacks = 0
      player.flowPendingBonus = false
    }
    this.ps.delete(sid)
    this.flowDamagePending.delete(sid)
  }

  /**
   * Remove per-player tracking when a player leaves the room.
   * Does NOT touch the Player schema (already removed from state).
   */
  forgetPlayer(sid: string): void {
    this.ps.delete(sid)
    this.flowDamagePending.delete(sid)
  }
}
