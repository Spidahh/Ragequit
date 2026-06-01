import type { ServerHitMessage } from '@ragequit/shared'
import { describe, expect, it } from 'vitest'

import { accumulateHitStats, type HitStatsContext } from './hit-stats.js'
import { emptyMatchStats } from './stats-tracker.js'

function hit(over: Partial<ServerHitMessage> = {}): ServerHitMessage {
  return {
    attackerId: 'A',
    victimId: 'B',
    damage: 20,
    element: 'fire',
    didParry: false,
    atTick: 0,
    cause: 'sword_m1',
    ...over,
  }
}

function ctx(over: Partial<HitStatsContext> = {}): HitStatsContext {
  return {
    amISelf: false,
    amIAttacker: false,
    isAirPunish: false,
    selfId: 'A',
    victimAirborne: false,
    selfAirborne: false,
    attackerName: 'ENEMY',
    abilityName: 'Sword',
    ...over,
  }
}

describe('accumulateHitStats', () => {
  it('ignores zero/negative damage and returns null', () => {
    const self = emptyMatchStats()
    const opp = emptyMatchStats()
    expect(accumulateHitStats(self, opp, hit({ damage: 0 }), ctx())).toBeNull()
    expect(self).toEqual(emptyMatchStats())
    expect(opp).toEqual(emptyMatchStats())
  })

  it('credits a parry to the right side', () => {
    const self = emptyMatchStats()
    const opp = emptyMatchStats()
    accumulateHitStats(self, opp, hit({ didParry: true }), ctx({ amISelf: true }))
    expect(self.parries).toBe(1)
    expect(opp.parries).toBe(0)

    accumulateHitStats(self, opp, hit({ didParry: true }), ctx({ amISelf: false }))
    expect(opp.parries).toBe(1)
  })

  it('attacker self: accrues damageDealt, hits, combo + knockup conversion', () => {
    const self = emptyMatchStats()
    const opp = emptyMatchStats()
    const res = accumulateHitStats(
      self,
      opp,
      hit({ damage: 30, cause: 'uppercut' }),
      ctx({ amIAttacker: true, amISelf: false, victimAirborne: true }),
    )
    expect(res).toBeNull()
    expect(self.damageDealt).toBe(30)
    expect(self.yourHits).toBe(1)
    expect(self.knockups).toBe(1)
    expect(self.knockupConversions).toBe(1)
    expect(self.comboProcs).toBe(0)
  })

  it('victim self: accrues damageTaken, returns deathcam details, opp gets airborne conversion', () => {
    const self = emptyMatchStats()
    const opp = emptyMatchStats()
    const res = accumulateHitStats(
      self,
      opp,
      hit({ damage: 25, element: 'ice' }),
      ctx({
        amISelf: true,
        amIAttacker: false,
        selfAirborne: true,
        attackerName: 'BOT',
        abilityName: 'Frost',
      }),
    )
    expect(self.damageTaken).toBe(25)
    expect(opp.knockupConversions).toBe(1)
    expect(res).toEqual({ killer: 'BOT', ability: 'Frost', element: 'ice', damage: 25 })
  })

  it('victim self with no element falls back to PHYSICAL', () => {
    const self = emptyMatchStats()
    const opp = emptyMatchStats()
    const res = accumulateHitStats(
      self,
      opp,
      hit({ element: '' }),
      ctx({ amISelf: true, amIAttacker: false }),
    )
    expect(res?.element).toBe('PHYSICAL')
  })

  it('other players: folds into opponent stats, skips empty/own attacker', () => {
    const self = emptyMatchStats()
    const opp = emptyMatchStats()
    accumulateHitStats(
      self,
      opp,
      hit({ attackerId: 'C', victimId: 'D', damage: 10, cause: 'combo:x' }),
      ctx({ selfId: 'A' }),
    )
    expect(opp.damageDealt).toBe(10)
    expect(opp.yourHits).toBe(1)
    expect(opp.comboProcs).toBe(1)
    expect(opp.damageTaken).toBe(10)
    expect(self).toEqual(emptyMatchStats())
  })
})
