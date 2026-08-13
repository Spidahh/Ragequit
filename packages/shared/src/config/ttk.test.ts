import { describe, expect, it } from 'vitest'

import { ABILITY_DEFS } from '../abilities/registry.js'
import {
  FFA_KILLS_TO_WIN,
  FINISHER_DAMAGE_MAX,
  FINISHER_DAMAGE_MIN,
  MATCH_TARGET_DURATION_SEC,
  MAX_ABILITY_COOLDOWN_SEC,
  TEAM_KILLS_TO_WIN,
  TTK_MAX_SEC,
  TTK_MIN_SEC,
} from '../constants/combat.js'

import { abilityDamage, allClassTtk } from './ttk.js'

// D1 (00_truth.md). TTK_MIN_SEC/TTK_MAX_SEC said 20-30 against a registry that
// killed in about six, under a comment claiming everything was tuned against
// them — and nothing imported either constant, so being wrong by 3-5x was free.
// These tests are the price of that comment being true.
describe('the TTK band is real', () => {
  for (const t of allClassTtk()) {
    it(`${t.classId} kills the toughest class inside ${TTK_MIN_SEC}-${TTK_MAX_SEC} s`, () => {
      expect(
        t.ttkSec,
        `${t.classId}: ${t.ttkSec.toFixed(2)} s (${t.totalDps.toFixed(1)} DPS vs ${t.targetHp} HP)`,
      ).toBeGreaterThanOrEqual(TTK_MIN_SEC)
      expect(t.ttkSec).toBeLessThanOrEqual(TTK_MAX_SEC)
    })
  }

  // The model must keep charging for cast time. Without it, ability DPS and
  // weapon DPS both count at 100 %, which is two players rather than a rotation
  // and reads ~25 % faster than anything reachable.
  it('never lets a class cast and swing in the same seconds', () => {
    for (const t of allClassTtk()) {
      expect(t.castDuty).toBeGreaterThan(0)
      expect(t.castDuty).toBeLessThanOrEqual(1)
    }
  })
})

describe('cooldowns fit inside the fight', () => {
  it('no ability exceeds the ceiling', () => {
    for (const def of Object.values(ABILITY_DEFS)) {
      expect(def.cooldownSec, `${def.id}`).toBeLessThanOrEqual(MAX_ABILITY_COOLDOWN_SEC)
    }
  })
})

describe('the finisher band', () => {
  const finishers = Object.values(ABILITY_DEFS).filter((d) => d.comboRole === 'finisher')

  it('has finishers to band', () => {
    expect(finishers.length).toBeGreaterThan(0)
  })

  it('puts every finisher in it', () => {
    for (const def of finishers) {
      const dmg = abilityDamage(def)
      expect(dmg, `${def.id}`).toBeGreaterThanOrEqual(FINISHER_DAMAGE_MIN)
      expect(dmg, `${def.id}`).toBeLessThanOrEqual(FINISHER_DAMAGE_MAX)
    }
  })

  // The rationale, not just the range: a finisher's damage is bought with
  // commitment. Without this a zero-windup, short-cooldown ability can sit at
  // the top of the band and quietly become the best sustained button in the
  // game — which is exactly what fireball did at 40 damage on a 5 s cooldown.
  it('makes the harder-hitting finisher the more committed one', () => {
    const ranked = [...finishers].sort((a, b) => abilityDamage(a) - abilityDamage(b))
    for (let i = 1; i < ranked.length; i++) {
      const prev = ranked[i - 1]!
      const cur = ranked[i]!
      if (abilityDamage(cur) === abilityDamage(prev)) continue
      const commitment = (d: (typeof ranked)[number]): number => d.cooldownSec + d.windupSec
      expect(
        commitment(cur),
        `${cur.id} hits harder than ${prev.id} but commits less`,
      ).toBeGreaterThanOrEqual(commitment(prev))
    }
  })
})

// The win condition has to be reachable inside the match, or it is dead code
// and every game ends on the clock. FFA_KILLS_TO_WIN and TEAM_KILLS_TO_WIN were
// derived from a 900 s match while MatchManager independently capped it at
// 600 s, so neither target could ever fire — two numbers describing one thing,
// in two files, disagreeing.
describe('the win conditions are reachable', () => {
  // The same per-kill cycle the counts were derived from, written down so the
  // test fails loudly if the derivation and the constants ever drift again.
  const KILL_CYCLE_SEC = 19
  const TEAM_SIZE = 5
  const TEAM_ENGAGED_FRACTION = 2 / 3

  it('lets an FFA leader actually reach the cap before time runs out', () => {
    const secondsNeeded = FFA_KILLS_TO_WIN * KILL_CYCLE_SEC
    expect(
      secondsNeeded,
      `${FFA_KILLS_TO_WIN} kills needs ${secondsNeeded} s but the match ends at ${MATCH_TARGET_DURATION_SEC} s`,
    ).toBeLessThanOrEqual(MATCH_TARGET_DURATION_SEC)
  })

  it('lets a team actually reach the cap before time runs out', () => {
    const rate = (TEAM_ENGAGED_FRACTION * TEAM_SIZE) / KILL_CYCLE_SEC
    const secondsNeeded = TEAM_KILLS_TO_WIN / rate
    expect(
      secondsNeeded,
      `${TEAM_KILLS_TO_WIN} kills needs ${Math.round(secondsNeeded)} s but the match ends at ${MATCH_TARGET_DURATION_SEC} s`,
    ).toBeLessThanOrEqual(MATCH_TARGET_DURATION_SEC)
  })

  // Not so low that the cap is hit in the first minute either — a win condition
  // reached instantly is as meaningless as one never reached.
  it('does not make the caps trivially reachable', () => {
    expect(FFA_KILLS_TO_WIN * KILL_CYCLE_SEC).toBeGreaterThan(MATCH_TARGET_DURATION_SEC * 0.5)
  })
})
