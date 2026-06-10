import { TICK_RATE_HZ, type ClassId, type Player } from '@ragequit/shared'

export const FURY_STACK_DAMAGE_FRAC = 0.08
export const FURY_SURGE_DAMAGE_BONUS = 0.4
export const FLOW_DAMAGE_BONUS_FRAC = 0.2

const FURY_MAX_STACKS = 5
const FURY_DECAY_DELAY_SEC = 4
const FURY_DECAY_PER_SEC = 0.5
const FURY_HITS_PER_STACK = 3

const MOMENTUM_MAX = 100
const MOMENTUM_GAIN_PER_SEC = 12
export const MOMENTUM_BOW_BONUS_THRESHOLD = 60
// Full-charge time once Momentum >= threshold. MUST be below the base
// BOW_CHARGE_FULL_SEC (0.65 s) or the passive would SLOW the charge instead of
// speeding it. 0.45 s ≈ 30% faster full charge as the momentum reward.
export const MOMENTUM_BOW_CHARGE_FAST_SEC = 0.45
const MOMENTUM_MAGIC_CDR_FRAC = 0.15

const RISONANZA_WINDOW_TICKS = Math.round(2.5 * TICK_RATE_HZ)

const FLOW_MAX_STACKS = 3
const FLOW_DECAY_DELAY_SEC = 8

interface PlayerMechanicState {
  furySwordHitCount: number
  furyLastCombatTick: number
  flowLastSwapTick: number
}

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
// Unified Class Mechanic Interface & Implementations
// ---------------------------------------------------------------------------

export interface IClassMechanic {
  readonly classId: ClassId
  tick?(sid: string, player: Player, dt: number, now: number, runtime: ClassMechanicRuntime): void
  onHitTaken?(sid: string, now: number, runtime: ClassMechanicRuntime): void
  onSwordHitLanded?(sid: string, now: number, runtime: ClassMechanicRuntime): void
  onWeaponSwap?(sid: string, now: number, runtime: ClassMechanicRuntime): void
  onAbilityCast?(
    sid: string,
    abilityId: string,
    element: string | undefined,
    target: {
      yaw: number
      pitch: number
      point?: { x: number; y: number; z: number }
      targetId?: string
    },
    now: number,
    runtime: ClassMechanicRuntime,
  ): void
  getMeleeDamageMult?(player: Player): number
  consumeSurge?(player: Player): boolean
  getBowChargeTimeSec?(baseSec: number, player: Player): number
  getMomentumCooldownMult?(player: Player): number
  getRecoveryHealBonus?(
    sid: string,
    abilityId: string,
    now: number,
    runtime: ClassMechanicRuntime,
  ): number
}

export class TankMechanic implements IClassMechanic {
  readonly classId = 'tank'

  tick(sid: string, player: Player, dt: number, now: number, runtime: ClassMechanicRuntime): void {
    if (player.furyStacks <= 0) return
    const s = runtime.getPs(sid)
    if (s.furyLastCombatTick === 0) return
    const idleSec = (now - s.furyLastCombatTick) / TICK_RATE_HZ
    if (idleSec < FURY_DECAY_DELAY_SEC) return
    player.furyStacks = Math.max(0, player.furyStacks - FURY_DECAY_PER_SEC * dt)
    if (player.furyStacks < 0.01) player.furyStacks = 0
  }

  onHitTaken(sid: string, now: number, runtime: ClassMechanicRuntime): void {
    const player = runtime.getPlayer(sid)
    if (!player) return
    const s = runtime.getPs(sid)
    const prev = Math.floor(player.furyStacks)
    player.furyStacks = Math.min(FURY_MAX_STACKS, prev + 1)
    s.furyLastCombatTick = now
    if (prev < FURY_MAX_STACKS && player.furyStacks >= FURY_MAX_STACKS) {
      this.triggerFurySurge(player)
    }
  }

  onSwordHitLanded(sid: string, now: number, runtime: ClassMechanicRuntime): void {
    const player = runtime.getPlayer(sid)
    if (!player) return
    const s = runtime.getPs(sid)
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

  getMeleeDamageMult(player: Player): number {
    return 1 + player.furyStacks * FURY_STACK_DAMAGE_FRAC
  }

  consumeSurge(player: Player): boolean {
    if (!player.furyNextMeleeIsSurge) return false
    player.furyNextMeleeIsSurge = false
    return true
  }

  getRecoveryHealBonus(
    sid: string,
    abilityId: string,
    now: number,
    runtime: ClassMechanicRuntime,
  ): number {
    if (abilityId !== 'brace_recovery') return 0
    const player = runtime.getPlayer(sid)
    if (!player) return 0
    if (player.furyNextMeleeIsSurge) {
      player.furyNextMeleeIsSurge = false
      return 50
    }
    return 0
  }
}

export class ArcherMechanic implements IClassMechanic {
  readonly classId = 'archer'

  tick(
    _sid: string,
    player: Player,
    dt: number,
    _now: number,
    _runtime: ClassMechanicRuntime,
  ): void {
    const vxz2 = player.vx * player.vx + player.vz * player.vz
    if (vxz2 > 0.25) {
      player.momentum = Math.min(MOMENTUM_MAX, player.momentum + MOMENTUM_GAIN_PER_SEC * dt)
    }
  }

  onHitTaken(sid: string, now: number, runtime: ClassMechanicRuntime): void {
    const player = runtime.getPlayer(sid)
    if (player) player.momentum = 0
  }

  getBowChargeTimeSec(baseSec: number, player: Player): number {
    if (player.momentum >= MOMENTUM_BOW_BONUS_THRESHOLD) return MOMENTUM_BOW_CHARGE_FAST_SEC
    return baseSec
  }

  getMomentumCooldownMult(player: Player): number {
    if (player.momentum >= MOMENTUM_MAX) return 1 - MOMENTUM_MAGIC_CDR_FRAC
    return 1
  }

  getRecoveryHealBonus(
    sid: string,
    abilityId: string,
    now: number,
    runtime: ClassMechanicRuntime,
  ): number {
    if (abilityId !== 'hunters_flow') return 0
    const player = runtime.getPlayer(sid)
    if (!player) return 0
    return player.momentum >= MOMENTUM_BOW_BONUS_THRESHOLD ? 25 : 0
  }
}

export class MageMechanic implements IClassMechanic {
  readonly classId = 'mage'

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
    runtime: ClassMechanicRuntime,
  ): void {
    const player = runtime.getPlayer(sid)
    if (!player) return
    if (element && element !== 'none') {
      this.handleRisonanzaCast(player, sid, element, target, now, runtime)
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
    runtime: ClassMechanicRuntime,
  ): void {
    const windowActive = now < player.risonanzaArmedUntilTick
    const sameElement = player.risonanzaElement === element

    if (windowActive && sameElement) {
      player.risonanzaElement = ''
      player.risonanzaArmedUntilTick = 0
      runtime.triggerRisonanzaProc({ element, casterSid: sid, target }, now)
      return
    }

    player.risonanzaElement = element
    player.risonanzaArmedUntilTick = now + RISONANZA_WINDOW_TICKS
  }

  getRecoveryHealBonus(
    sid: string,
    abilityId: string,
    now: number,
    runtime: ClassMechanicRuntime,
  ): number {
    if (abilityId !== 'arcane_rebind') return 0
    const player = runtime.getPlayer(sid)
    if (!player) return 0
    if (player.risonanzaElement && now < player.risonanzaArmedUntilTick) {
      player.risonanzaElement = ''
      player.risonanzaArmedUntilTick = 0
      return 50
    }
    return 0
  }
}

export class HybridMechanic implements IClassMechanic {
  readonly classId = 'hybrid'

  tick(sid: string, player: Player, _dt: number, now: number, runtime: ClassMechanicRuntime): void {
    if (player.flowStacks <= 0) return
    const s = runtime.getPs(sid)
    if (s.flowLastSwapTick === 0) return
    const noSwapSec = (now - s.flowLastSwapTick) / TICK_RATE_HZ
    if (noSwapSec < FLOW_DECAY_DELAY_SEC) return
    player.flowStacks = Math.max(0, player.flowStacks - 1)
    s.flowLastSwapTick = now
  }

  onWeaponSwap(sid: string, now: number, runtime: ClassMechanicRuntime): void {
    const player = runtime.getPlayer(sid)
    if (!player) return
    const s = runtime.getPs(sid)
    player.flowStacks = Math.min(FLOW_MAX_STACKS, player.flowStacks + 1)
    s.flowLastSwapTick = now
    if (player.flowStacks >= FLOW_MAX_STACKS) {
      player.flowPendingBonus = true
    }
  }

  getRecoveryHealBonus(
    sid: string,
    abilityId: string,
    _now: number,
    runtime: ClassMechanicRuntime,
  ): number {
    if (abilityId !== 'adaptive_mend') return 0
    const player = runtime.getPlayer(sid)
    if (!player) return 0
    if (player.flowStacks >= FLOW_MAX_STACKS || player.flowPendingBonus) {
      player.flowStacks = 0
      player.flowPendingBonus = false
      runtime.consumeFlowDamagePending(sid)
      return 40
    }
    return 0
  }
}

// ---------------------------------------------------------------------------
// Orchestrator Engine Class
// ---------------------------------------------------------------------------

export class ClassMechanicRuntime {
  private readonly ps = new Map<string, PlayerMechanicState>()
  private readonly flowDamagePending = new Set<string>()

  private readonly mechanicsRegistry: Record<ClassId, IClassMechanic> = {
    tank: new TankMechanic(),
    archer: new ArcherMechanic(),
    mage: new MageMechanic(),
    hybrid: new HybridMechanic(),
  }

  constructor(
    private readonly state: { players: Map<string, Player>; tick: number },
    private readonly onRisonanzaProc: (req: RisonanzaProcRequest, now: number) => void,
  ) {}

  getPlayer(sid: string): Player | undefined {
    return this.state.players.get(sid)
  }

  getPs(sid: string): PlayerMechanicState {
    let s = this.ps.get(sid)
    if (!s) {
      s = { furySwordHitCount: 0, furyLastCombatTick: 0, flowLastSwapTick: 0 }
      this.ps.set(sid, s)
    }
    return s
  }

  private getMechanic(classId: string): IClassMechanic | undefined {
    return this.mechanicsRegistry[classId as ClassId]
  }

  triggerRisonanzaProc(req: RisonanzaProcRequest, now: number): void {
    this.onRisonanzaProc(req, now)
  }

  tick(sid: string, player: Player, dt: number, now: number): void {
    const mech = this.getMechanic(player.classId)
    if (mech && mech.tick) {
      mech.tick(sid, player, dt, now, this)
    }
  }

  onHitTaken(sid: string, now: number): void {
    const player = this.getPlayer(sid)
    if (!player) return
    const mech = this.getMechanic(player.classId)
    if (mech && mech.onHitTaken) {
      mech.onHitTaken(sid, now, this)
    }
  }

  onSwordHitLanded(sid: string, now: number): void {
    const player = this.getPlayer(sid)
    if (!player) return
    const mech = this.getMechanic(player.classId)
    if (mech && mech.onSwordHitLanded) {
      mech.onSwordHitLanded(sid, now, this)
    }
  }

  onWeaponSwap(sid: string, now: number): void {
    const player = this.getPlayer(sid)
    if (!player) return
    const mech = this.getMechanic(player.classId)
    if (mech && mech.onWeaponSwap) {
      mech.onWeaponSwap(sid, now, this)
    }
  }

  onAbilityCast(
    sid: string,
    abilityId: string,
    element: string | undefined,
    target: {
      yaw: number
      pitch: number
      point?: { x: number; y: number; z: number }
      targetId?: string
    },
    now: number,
  ): void {
    const player = this.getPlayer(sid)
    if (!player) return
    const mech = this.getMechanic(player.classId)
    if (mech && mech.onAbilityCast) {
      mech.onAbilityCast(sid, abilityId, element, target, now, this)
    }
  }

  markFlowDamagePending(sid: string): void {
    this.flowDamagePending.add(sid)
  }

  consumeFlowDamagePending(sid: string): boolean {
    if (!this.flowDamagePending.has(sid)) return false
    this.flowDamagePending.delete(sid)
    return true
  }

  getMeleeDamageMult(player: Player): number {
    const mech = this.getMechanic(player.classId)
    return mech && mech.getMeleeDamageMult ? mech.getMeleeDamageMult(player) : 1
  }

  consumeSurge(player: Player): boolean {
    const mech = this.getMechanic(player.classId)
    return mech && mech.consumeSurge ? mech.consumeSurge(player) : false
  }

  getBowChargeTimeSec(baseSec: number, player: Player): number {
    const mech = this.getMechanic(player.classId)
    return mech && mech.getBowChargeTimeSec ? mech.getBowChargeTimeSec(baseSec, player) : baseSec
  }

  getMomentumCooldownMult(player: Player): number {
    const mech = this.getMechanic(player.classId)
    return mech && mech.getMomentumCooldownMult ? mech.getMomentumCooldownMult(player) : 1
  }

  getRecoveryHealBonus(sid: string, abilityId: string, now: number): number {
    const player = this.getPlayer(sid)
    if (!player) return 0
    const mech = this.getMechanic(player.classId)
    return mech && mech.getRecoveryHealBonus
      ? mech.getRecoveryHealBonus(sid, abilityId, now, this)
      : 0
  }

  reset(sid: string): void {
    const player = this.getPlayer(sid)
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

  forgetPlayer(sid: string): void {
    this.ps.delete(sid)
    this.flowDamagePending.delete(sid)
  }
}
