import { HP_MAX, TICK_RATE_HZ, ROUND_TIMER_SEC, TARGET_CLASS_DEFS } from '@ragequit/shared'
import type { ClassId } from '@ragequit/shared'

export interface CombatOverlaySchema {
  hp: number
  classId?: string
  alive: boolean
  statuses: ReadonlyArray<{ kind: string }>
  parrying: boolean
  parryIsHold: boolean
  invulnUntilTick?: number
}

export interface CombatOverlayHudOptions {
  bowCharge: HTMLElement
  bowChargeFill: HTMLElement
  crosshairEl: HTMLElement
  parryRing: HTMLElement
  roundTimer: HTMLElement
  lowHpVignette: HTMLElement
  blindVignette: HTMLElement
  deathOverlay: HTMLElement
  healFlash: HTMLElement
  /** Called with the HP gained when the local player is healed. */
  onHeal?: (amount: number) => void
}

export interface CombatOverlayUpdateParams {
  now: number
  tickNow: number
  bowChargeRatio: number
  activeWeapon: string
  dead: boolean
  selfBowChargeStartMs: number
  selfBowChargeServerAcked: boolean
  serverCharging: boolean
  selfSchema: CombatOverlaySchema | null
  livePhaseStartTick: number
  isRoundMode: boolean
  clearBowCharge: () => void
}

export interface CombatOverlayHudController {
  update: (params: CombatOverlayUpdateParams) => void
}

export function initCombatOverlayHud({
  bowCharge,
  bowChargeFill,
  crosshairEl,
  parryRing,
  roundTimer,
  lowHpVignette,
  blindVignette,
  deathOverlay,
  healFlash,
  onHeal,
}: CombatOverlayHudOptions): CombatOverlayHudController {
  let prevSelfHp = -1
  let prevSelfAlive = false

  function update({
    now: _now,
    tickNow,
    bowChargeRatio,
    activeWeapon,
    dead,
    selfBowChargeStartMs,
    selfBowChargeServerAcked,
    serverCharging,
    selfSchema,
    livePhaseStartTick,
    isRoundMode,
    clearBowCharge,
  }: CombatOverlayUpdateParams): void {
    // Bow charge bar.
    if (selfBowChargeStartMs > 0 && activeWeapon === 'bow' && !dead) {
      const ratio = bowChargeRatio
      bowCharge.classList.add('active')
      bowCharge.classList.toggle('full', ratio >= 1)
      bowCharge.classList.toggle('mid', ratio >= 0.4 && ratio < 1)
      bowChargeFill.style.width = `${ratio * 100}%`
      if (ratio < 0.4) {
        bowChargeFill.style.background = 'linear-gradient(90deg,#00ff88,#ffd260)'
      } else if (ratio < 0.75) {
        bowChargeFill.style.background = 'linear-gradient(90deg,#ffd260,#ffe600)'
      } else {
        bowChargeFill.style.background = 'linear-gradient(90deg,#ffd260,#ff4500)'
      }
      if (ratio >= 1) {
        crosshairEl.dataset['charge'] = 'full'
      } else if (ratio >= 0.5) {
        crosshairEl.dataset['charge'] = 'high'
      } else if (ratio > 0) {
        crosshairEl.dataset['charge'] = 'low'
      } else {
        delete crosshairEl.dataset['charge']
      }
      if (!serverCharging && selfBowChargeServerAcked) {
        clearBowCharge()
      }
    } else {
      bowCharge.classList.remove('active', 'full', 'mid')
      bowChargeFill.style.width = '0%'
      delete crosshairEl.dataset['charge']
    }

    // Parry ring.
    if (selfSchema?.parrying) {
      parryRing.classList.add('active')
      parryRing.classList.toggle('hold', selfSchema.parryIsHold)
    } else {
      parryRing.classList.remove('active', 'hold')
    }

    // Round live timer — only shown in modes with server-side round logic
    // (duel_arena, blockout, 1v1).  FFA, 5v5 and training are kill-based /
    // continuous — no server round timer, so we hide it entirely.
    if (isRoundMode && livePhaseStartTick >= 0 && tickNow > 0) {
      const elapsed = (tickNow - livePhaseStartTick) / TICK_RATE_HZ
      const secsLeft = Math.max(0, ROUND_TIMER_SEC - elapsed)
      roundTimer.textContent = secsLeft.toFixed(0) + 's'
      roundTimer.classList.toggle('urgent', secsLeft <= 15)
      roundTimer.style.display = ''
    } else if (!isRoundMode) {
      roundTimer.textContent = ''
      roundTimer.style.display = 'none'
    }

    // Low-HP vignette + blind vignette + death overlay + heal flash.
    if (selfSchema) {
      const hpMax = TARGET_CLASS_DEFS[selfSchema.classId as ClassId]?.resourceMaxima.hp ?? HP_MAX
      const hpFrac = selfSchema.hp / hpMax
      lowHpVignette.classList.toggle('active', selfSchema.alive && hpFrac < 0.25)
      const blinded =
        selfSchema.alive && Array.from(selfSchema.statuses).some((s) => s.kind === 'blind')
      blindVignette.classList.toggle('active', blinded)
      deathOverlay.classList.toggle('active', !selfSchema.alive)
      document.body.classList.toggle('player-dead', !selfSchema.alive)
      // Only flash heal if both frames are alive — suppresses false flash at
      // respawn where hp jumps from near-death to full in one frame.
      if (prevSelfHp > 0 && prevSelfAlive && selfSchema.alive && selfSchema.hp > prevSelfHp + 3) {
        healFlash.classList.add('active')
        void healFlash.offsetHeight
        healFlash.classList.remove('active')
        // A number, not just a green wash. The owner asked "come ci si cura?"
        // and the honest answer was that nothing on screen ever confirmed a
        // heal had happened, let alone how big it was — the protocol has no
        // heal event at all, so this HP delta is the only evidence there is.
        onHeal?.(selfSchema.hp - prevSelfHp)
      }
      prevSelfHp = selfSchema.hp
      prevSelfAlive = selfSchema.alive
    }
  }

  return { update }
}
