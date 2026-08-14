// ---------------------------------------------------------------------------
// Melee, second batch.
//
// WHY THIS FILE EXISTS
//
// Measured on the shipped registry: 27 of 53 abilities were staff, 8 bow, and
// only 6 melee. That is not a balance opinion, it is where the work went over
// the years — and it had a hard consequence. Under the class slot grammar the
// melee class must fill 4 melee slots from a pool of 6, which is C(6,4) = 15
// possible melee builds, while the caster picks 3 from 12 and 3 from 15. Counted
// end to end, one class had 26,460 builds and another 12,830,400: a 485x gap on
// the exact axis the game's pitch is built on.
//
// The fix is not fewer spells. It is more melee. Eight more takes the pool from
// 6 to 14 and the melee class's own axis from 15 combinations to C(14,4) = 1001.
//
// Every one of these is DATA. They use only effect primitives the server engine
// already resolves — damage, applyStatus, knockup, move, lifesteal,
// restoreStamina — so nothing here needs engine work, which is the whole point
// of the registry being declarative.
//
// They live outside `registry.ts` because that file is a ratchet-capped data
// table (see tools/check-file-budget.mjs); this keeps both files honest.
//
// DESIGN INTENT. Each one answers a question the existing six left open:
//   - a counter that rewards reading the opponent (Riposte)
//   - a reach option, so melee is not purely a 2.2 m game (Skewer)
//   - a crowd answer that trades damage for coverage (Cleave)
//   - a slow that is not a launch, for chasing (Hamstring)
//   - a heavy commit with a real punish window (Executioner)
//   - a self-sustain that must be earned in contact (Bloodthirst)
//   - a ground answer to airborne opponents (Ground Slam)
//   - a stamina refund for staying aggressive (Momentum Strike)
// ---------------------------------------------------------------------------
import type { AbilityDef } from './types.js'

/** Punish window. Short reach, heavy payoff, and it launches — a read, not a poke. */
export const ABILITY_M7_RIPOSTE: AbilityDef = {
  id: 'riposte',
  name: 'Riposte',
  slot: 'melee',
  element: 'none',
  weapon: 'sword',
  costMana: 0,
  costStamina: 25,
  cooldownSec: 7,
  windupSec: 0,
  range: 2.2,
  targeting: 'forward',
  comboRole: 'counter',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 22 },
    { at: 'onCast', kind: 'knockup', airborneSec: 0.4, knockbackDistance: 0.6 },
  ],
  description: 'Instant counter-cut that lifts the target off their feet. No wind-up to read.',
  miniMalus: 'Shortest reach in the kit — you must already be inside their swing.',
  canParry: true,
  isKnockup: true,
}

/** Reach. Melee that answers someone stepping back, instead of only someone in your face. */
export const ABILITY_M8_SKEWER: AbilityDef = {
  id: 'skewer',
  name: 'Skewer',
  slot: 'melee',
  element: 'none',
  weapon: 'sword',
  costMana: 0,
  costStamina: 22,
  cooldownSec: 6,
  windupSec: 0.2,
  range: 4.2,
  targeting: 'forward',
  comboRole: 'pressure',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 20 },
    { at: 'onCast', kind: 'applyStatus', status: 'bleed', durationSec: 3, stacks: 1 },
  ],
  description: 'Long lunging thrust that opens a bleeding wound. Reaches where a swing cannot.',
  miniMalus: 'Committed and straight — a strafing target simply is not there.',
  canParry: true,
}

/** Coverage. Wide, cheap, low per-target damage: the answer to being surrounded. */
export const ABILITY_M9_CLEAVE: AbilityDef = {
  id: 'cleave',
  name: 'Cleave',
  slot: 'melee',
  element: 'none',
  weapon: 'sword',
  costMana: 0,
  costStamina: 18,
  cooldownSec: 5,
  windupSec: 0.15,
  range: 3,
  targeting: 'forward',
  comboRole: 'pressure',
  effects: [{ at: 'onCast', kind: 'damage', amount: 14, radius: 3 }],
  description: 'Wide horizontal arc that catches everyone in front of you.',
  miniMalus: 'Spread thin — it hits many for little, and one target for less.',
  canParry: true,
}

/** The chase tool. No launch, no burst: it just makes leaving impossible. */
export const ABILITY_M10_HAMSTRING: AbilityDef = {
  id: 'hamstring',
  name: 'Hamstring',
  slot: 'melee',
  element: 'none',
  weapon: 'sword',
  costMana: 0,
  costStamina: 20,
  cooldownSec: 8,
  windupSec: 0,
  range: 2.5,
  targeting: 'forward',
  comboRole: 'starter',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 12 },
    {
      at: 'onCast',
      kind: 'applyStatus',
      status: 'slow',
      durationSec: 3,
      stacks: 1,
      slowFraction: 0.45,
    },
  ],
  description: 'Low cut across the legs. They keep every option except running away.',
  miniMalus: 'Barely damages — this buys you position, not a kill.',
  canParry: true,
}

/** The heavy commit. Biggest melee number in the game, and the longest tell. */
export const ABILITY_M11_EXECUTIONER: AbilityDef = {
  id: 'executioner',
  name: "Executioner's Blow",
  slot: 'melee',
  element: 'none',
  weapon: 'sword',
  costMana: 0,
  costStamina: 40,
  cooldownSec: 11,
  windupSec: 0.55,
  range: 2.6,
  targeting: 'forward',
  comboRole: 'finisher',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 52 },
    { at: 'onCast', kind: 'knockup', airborneSec: 0.35, knockbackDistance: 2.2 },
  ],
  description: 'Overhead swing with everything behind it. Lands like a wall.',
  miniMalus: 'The longest wind-up in the game — everyone sees it coming.',
  canParry: true,
  isKnockup: true,
}

/** Sustain that has to be earned in contact, not from range. */
export const ABILITY_M12_BLOODTHIRST: AbilityDef = {
  id: 'bloodthirst',
  name: 'Bloodthirst',
  slot: 'melee',
  element: 'none',
  weapon: 'sword',
  costMana: 0,
  costStamina: 26,
  cooldownSec: 9,
  windupSec: 0.1,
  range: 2.4,
  targeting: 'forward',
  comboRole: 'survival',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 18 },
    { at: 'onCast', kind: 'lifesteal', fraction: 0.9 },
  ],
  description: 'Savage bite of a swing that returns almost everything it takes.',
  miniMalus: 'Heals nothing if it misses — your sustain depends on your aim.',
  canParry: true,
}

/** The ground answer to an air game: it hits around you, hard, and pins them down. */
export const ABILITY_M13_GROUND_SLAM: AbilityDef = {
  id: 'ground_slam',
  name: 'Ground Slam',
  slot: 'melee',
  element: 'none',
  weapon: 'sword',
  costMana: 0,
  costStamina: 32,
  cooldownSec: 9.5,
  windupSec: 0.3,
  range: 4,
  targeting: 'self',
  comboRole: 'counter',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 24, radius: 4 },
    { at: 'onCast', kind: 'applyStatus', status: 'root', durationSec: 1.2, stacks: 1, radius: 4 },
  ],
  description: 'Drive the blade into the ground. Everything around you is pinned where it stands.',
  miniMalus: 'Centred on you — it cannot reach anyone who kept their distance.',
  canParry: false,
}

/** Aggression pays for itself: cheap, fast, and it gives stamina back on contact. */
export const ABILITY_M14_MOMENTUM_STRIKE: AbilityDef = {
  id: 'momentum_strike',
  name: 'Momentum Strike',
  slot: 'melee',
  element: 'none',
  weapon: 'sword',
  costMana: 0,
  costStamina: 12,
  cooldownSec: 4,
  windupSec: 0,
  range: 2.3,
  targeting: 'forward',
  comboRole: 'pressure',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 15 },
    { at: 'onCast', kind: 'restoreStamina', amount: 18 },
  ],
  description: 'Quick committed cut that pays its own stamina back when it connects.',
  miniMalus: 'Refunds nothing on a miss — whiffing it costs you the fight.',
  canParry: true,
}

/** Everything in this file, in registry order. */
export const MELEE_EXTENDED = {
  riposte: ABILITY_M7_RIPOSTE,
  skewer: ABILITY_M8_SKEWER,
  cleave: ABILITY_M9_CLEAVE,
  hamstring: ABILITY_M10_HAMSTRING,
  executioner: ABILITY_M11_EXECUTIONER,
  bloodthirst: ABILITY_M12_BLOODTHIRST,
  ground_slam: ABILITY_M13_GROUND_SLAM,
  momentum_strike: ABILITY_M14_MOMENTUM_STRIKE,
} as const
