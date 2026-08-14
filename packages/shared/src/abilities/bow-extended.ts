// ---------------------------------------------------------------------------
// Bow, second batch.
//
// WHY THIS FILE EXISTS
//
// Same defect the melee pool had, one family over. Measured: the bow pool was 8
// abilities and TALON must fill 4 bow slots from it — C(8,4) = 70 possible
// choices on the axis that IS the class. Counted end to end that left TALON at
// 226,800 builds against WARDEN's 10,810,800, and no amount of curation fixes a
// pool that is simply too small: you cannot pick four interesting arrows out of
// eight when four of them are already the obvious ones.
//
// Six more takes the pool from 8 to 14 and TALON's own axis from 70 to
// C(14,4) = 1001.
//
// All DATA. Only effect primitives the engine already resolves — projectile,
// damage, applyStatus, move, zone, heal — so nothing here needs engine work.
//
// DESIGN INTENT. The existing eight were four finishers and four setups, all
// resolving the same way: point, fire, hit. These six add the verbs a ranged
// class was missing:
//   - an answer to someone already on top of you (Point Blank)
//   - a shot that rewards holding an angle instead of tracking (Steady Aim)
//   - vertical play, so the bow participates in the air game (Skyfall)
//   - a chase tool that does not need a hit to work (Bola)
//   - sustain that must be earned at range (Siphon Arrow)
//   - a shot that punishes a group instead of a body (Split Shot)
// ---------------------------------------------------------------------------
import type { AbilityDef } from './types.js'

/** The panic button a ranged class never had: heavy damage, but only in your face. */
export const ABILITY_B9_POINT_BLANK: AbilityDef = {
  id: 'point_blank',
  name: 'Point Blank',
  slot: 'bow',
  element: 'none',
  weapon: 'bow',
  costMana: 0,
  costStamina: 24,
  cooldownSec: 7.5,
  windupSec: 0,
  range: 4,
  targeting: 'forward',
  comboRole: 'counter',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 38 },
    { at: 'onCast', kind: 'knockup', airborneSec: 0.3, knockbackDistance: 3.2 },
  ],
  description: 'Arrow loosed into someone already on top of you, and the shove that follows it.',
  miniMalus: 'Four metres of reach — useless at the range you are supposed to fight at.',
  canParry: true,
  isKnockup: true,
}

/** Rewards holding an angle rather than tracking: slow, exact, and it goes through. */
export const ABILITY_B10_STEADY_AIM: AbilityDef = {
  id: 'steady_aim',
  name: 'Steady Aim',
  slot: 'bow',
  element: 'none',
  weapon: 'bow',
  costMana: 0,
  costStamina: 20,
  cooldownSec: 9,
  windupSec: 0.5,
  range: 30,
  targeting: 'forward',
  comboRole: 'finisher',
  effects: [{ at: 'onCast', kind: 'projectile', damage: 48, speedMps: 70, gravityMps2: 0 }],
  description: 'A drawn, flat, fast shot that crosses the arena without dropping.',
  miniMalus: 'Half a second rooted to the draw — you are a target while you hold it.',
  canParry: true,
}

/** The bow's entry into the air game: it lobs, so cover stops mattering. */
export const ABILITY_B11_SKYFALL: AbilityDef = {
  id: 'skyfall',
  name: 'Skyfall',
  slot: 'bow',
  element: 'none',
  weapon: 'bow',
  costMana: 0,
  costStamina: 26,
  cooldownSec: 8,
  windupSec: 0.2,
  range: 22,
  targeting: 'point',
  comboRole: 'pressure',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 26, radius: 3 },
    {
      at: 'onCast',
      kind: 'applyStatus',
      status: 'slow',
      durationSec: 2,
      stacks: 1,
      radius: 3,
      slowFraction: 0.3,
    },
  ],
  description: 'Arrows arced high to fall on a spot. Walls do not help them.',
  miniMalus: 'Placed, not aimed — a moving target simply walks out of it.',
  canParry: false,
}

/** Chase without needing damage: it takes the legs, nothing else. */
export const ABILITY_B12_BOLA: AbilityDef = {
  id: 'bola',
  name: 'Bola',
  slot: 'bow',
  element: 'none',
  weapon: 'bow',
  costMana: 0,
  costStamina: 18,
  cooldownSec: 7,
  windupSec: 0,
  range: 18,
  targeting: 'forward',
  comboRole: 'starter',
  effects: [
    { at: 'onCast', kind: 'projectile', damage: 6, speedMps: 34, gravityMps2: 2 },
    { at: 'onLand', kind: 'applyStatus', status: 'root', durationSec: 1.1, stacks: 1 },
  ],
  description: 'Weighted cord that wraps the legs. They can still fight — they cannot leave.',
  miniMalus: 'Almost no damage, and slow enough in flight to be read.',
  canParry: true,
}

/** Sustain at range, and it costs you the damage you would rather have dealt. */
export const ABILITY_B13_SIPHON_ARROW: AbilityDef = {
  id: 'siphon_arrow',
  name: 'Siphon Arrow',
  slot: 'bow',
  element: 'dark',
  weapon: 'bow',
  costMana: 0,
  costStamina: 22,
  cooldownSec: 9.5,
  windupSec: 0.15,
  range: 20,
  targeting: 'forward',
  comboRole: 'survival',
  effects: [
    { at: 'onCast', kind: 'projectile', damage: 16, speedMps: 48, gravityMps2: 1 },
    { at: 'onLand', kind: 'lifesteal', fraction: 1.2 },
  ],
  description: 'Barbed shaft that drags some of them back to you along its own flight.',
  miniMalus: 'Hits softly, and heals you nothing at all if you miss.',
  canParry: true,
}

/** The answer to a group instead of a body: three shafts, spread. */
export const ABILITY_B14_SPLIT_SHOT: AbilityDef = {
  id: 'split_shot',
  name: 'Split Shot',
  slot: 'bow',
  element: 'none',
  weapon: 'bow',
  costMana: 0,
  costStamina: 20,
  cooldownSec: 6.5,
  windupSec: 0.1,
  range: 16,
  targeting: 'forward',
  comboRole: 'pressure',
  effects: [{ at: 'onCast', kind: 'damage', amount: 18, radius: 2.6 }],
  description: 'Three shafts loosed at once across a shallow fan.',
  miniMalus: 'Spread wide — one target catches a fraction of what one arrow would do.',
  canParry: true,
}

/** Everything in this file, in registry order. */
export const BOW_EXTENDED = {
  point_blank: ABILITY_B9_POINT_BLANK,
  steady_aim: ABILITY_B10_STEADY_AIM,
  skyfall: ABILITY_B11_SKYFALL,
  bola: ABILITY_B12_BOLA,
  siphon_arrow: ABILITY_B13_SIPHON_ARROW,
  split_shot: ABILITY_B14_SPLIT_SHOT,
} as const
