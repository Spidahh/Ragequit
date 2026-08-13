import { describe, expect, it } from 'vitest'

import { validateLoadoutMessage, TOURNAMENT_MAX_DEFENSIVE_PICKS } from '../rooms/loadout-validate.js'

import { highestHpSurvivor, survivors, tournamentOutcome } from './tournament.js'

const lobby = (...players: Array<[string, boolean, number]>): Map<
  string,
  { alive: boolean; hp: number }
> => new Map(players.map(([id, alive, hp]) => [id, { alive, hp }]))

describe('until one remains', () => {
  it('ends when a single player is left alive', () => {
    const out = tournamentOutcome(lobby(['a', false, 0], ['b', true, 40], ['c', false, 0]), 3)
    expect(out.over).toBe(true)
    expect(out.winnerId).toBe('b')
  })

  it('keeps going while two are alive', () => {
    expect(tournamentOutcome(lobby(['a', true, 10], ['b', true, 200]), 2).over).toBe(false)
  })

  // The naive check — "one survivor left" — declares the first player to join an
  // empty lobby the champion of a tournament that never started.
  it('does not crown the first player to walk into an empty room', () => {
    expect(tournamentOutcome(lobby(['a', true, 250]), 1).over).toBe(false)
    expect(tournamentOutcome(lobby(['a', true, 250]), 0).over).toBe(false)
  })

  // A shared AoE or a simultaneous trade is a real outcome, not a hang.
  it('ends with no winner when everyone dies at once', () => {
    const out = tournamentOutcome(lobby(['a', false, 0], ['b', false, 0]), 2)
    expect(out.over).toBe(true)
    expect(out.winnerId).toBe('')
  })

  it('lists survivors', () => {
    expect(survivors(lobby(['a', true, 1], ['b', false, 0], ['c', true, 2])).sort()).toEqual([
      'a',
      'c',
    ])
  })
})

describe('timeout resolution', () => {
  it('gives it to the healthiest survivor', () => {
    expect(highestHpSurvivor(lobby(['a', true, 90], ['b', true, 140], ['c', false, 0]))).toBe('b')
  })

  it('ignores the dead, however healthy they were', () => {
    expect(highestHpSurvivor(lobby(['a', false, 250], ['b', true, 10]))).toBe('b')
  })

  // Better to admit nobody won than to hand it to whoever the iterator reached
  // first.
  it('returns no winner on an exact tie', () => {
    expect(highestHpSurvivor(lobby(['a', true, 100], ['b', true, 100]))).toBe('')
  })
})

describe('the defensive-pick cap', () => {
  // A Mago can legally field four defensive picks. Everywhere else that is
  // merely slow; where death is final, refusing to lose is the same as winning.
  const stallBuild = {
    classId: 'mage',
    melee: [],
    bow: [],
    magicBase: ['fireball', 'frost_bolt'],
    magicAdvanced: ['dark_barrier', 'healing_totem'],
    utility: ['arcane_rebind', 'phase_shift'],
  }

  it('accepts the stall build outside tournament', () => {
    expect(validateLoadoutMessage(stallBuild).ok).toBe(true)
  })

  it('rejects a second defensive pick even when it is not utility', () => {
    // dark_barrier and healing_totem are magicAdvanced, not utility — the cap
    // counts ROLES, because the stall build the doc names is spread across
    // families precisely to slip past a slot-based rule.
    const v = validateLoadoutMessage(
      { ...stallBuild, utility: ['arcane_rebind', 'quick_dash'] },
      'tournament',
    )
    expect(v.ok).toBe(false)
  })

  it('rejects it in tournament, and says why', () => {
    const v = validateLoadoutMessage(stallBuild, 'tournament')
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.reason).toContain('difensiva')
  })

  // The cap has a consequence worth stating: every build must carry a Recovery
  // (loadoutHasRecovery), and every Recovery is `survival`. So in tournament,
  // your Recovery IS your one defensive pick and everything else must fight.
  it('allows a build at the cap, where the one pick is the Recovery', () => {
    const v = validateLoadoutMessage(
      {
        ...stallBuild,
        magicAdvanced: ['meteor', 'frost_pillar'],
        utility: ['arcane_rebind', 'quick_dash'],
      },
      'tournament',
    )
    expect(TOURNAMENT_MAX_DEFENSIVE_PICKS).toBe(1)
    expect(v.ok, v.ok ? '' : v.reason).toBe(true)
  })
})
