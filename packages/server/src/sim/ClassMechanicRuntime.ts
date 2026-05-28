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
export const MOMENTUM_BOW_CHARGE_FAST_SEC = 1.2
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

export class ClassMechanicRuntime {
  private readonly ps = new Map<string, PlayerMechanicState>()
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
    s.flowLastSwapTick = now
  }

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
      player.risonanzaElement = ''
      player.risonanzaArmedUntilTick = 0
      this.onRisonanzaProc({ element, casterSid: sid, target }, now)
      return
    }

    player.risonanzaElement = element
    player.risonanzaArmedUntilTick = now + RISONANZA_WINDOW_TICKS
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
    if ((player.classId as ClassId) !== 'tank') return 1
    return 1 + player.furyStacks * FURY_STACK_DAMAGE_FRAC
  }

  consumeSurge(player: Player): boolean {
    if (!player.furyNextMeleeIsSurge) return false
    player.furyNextMeleeIsSurge = false
    return true
  }

  getBowChargeTimeSec(baseSec: number, player: Player): number {
    if ((player.classId as ClassId) !== 'archer') return baseSec
    if (player.momentum >= MOMENTUM_BOW_BONUS_THRESHOLD) return MOMENTUM_BOW_CHARGE_FAST_SEC
    return baseSec
  }

  getMomentumCooldownMult(player: Player): number {
    if ((player.classId as ClassId) !== 'archer') return 1
    if (player.momentum >= MOMENTUM_MAX) return 1 - MOMENTUM_MAGIC_CDR_FRAC
    return 1
  }

  getRecoveryHealBonus(sid: string, abilityId: string, now: number): number {
    const player = this.state.players.get(sid)
    if (!player) return 0
    const classId = player.classId as ClassId

    switch (abilityId) {
      case 'brace_recovery':
        if (classId !== 'tank') return 0
        // furyNextMeleeIsSurge is always set together with furyStacks reset in
        // triggerFurySurge(), so this is the only reachable path for a full-fury bonus.
        if (player.furyNextMeleeIsSurge) {
          player.furyNextMeleeIsSurge = false
          return 50
        }
        return 0

      case 'hunters_flow':
        if (classId !== 'archer') return 0
        return player.momentum >= MOMENTUM_BOW_BONUS_THRESHOLD ? 25 : 0

      case 'arcane_rebind':
        if (classId !== 'mage') return 0
        if (player.risonanzaElement && now < player.risonanzaArmedUntilTick) {
          player.risonanzaElement = ''
          player.risonanzaArmedUntilTick = 0
          return 50
        }
        return 0

      case 'adaptive_mend':
        if (classId !== 'hybrid') return 0
        if (player.flowStacks >= FLOW_MAX_STACKS || player.flowPendingBonus) {
          player.flowStacks = 0
          player.flowPendingBonus = false
          this.flowDamagePending.delete(sid)
          return 40
        }
        return 0

      default:
        return 0
    }
  }

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

  forgetPlayer(sid: string): void {
    this.ps.delete(sid)
    this.flowDamagePending.delete(sid)
  }
}
