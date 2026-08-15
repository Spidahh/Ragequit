// Ability registry. Adding an ability is adding an entry — zero engine code.
// Second batches live in melee-extended.ts / bow-extended.ts (budget ratchet).

import { BOW_EXTENDED } from './bow-extended.js'
import { MELEE_EXTENDED } from './melee-extended.js'
import type { AbilityDef, AbilityRegistry } from './types.js'

// ============================================================================
// MELEE — first batch (sword). Second batch: abilities/melee-extended.ts
// ============================================================================

export const ABILITY_M1_WHIRLWIND: AbilityDef = {
  id: 'whirlwind',
  name: 'Whirlwind Slash',
  slot: 'melee',
  element: 'none',
  weapon: 'sword',
  costMana: 0,
  costStamina: 30,
  cooldownSec: 8,
  windupSec: 0,
  range: 4,
  targeting: 'self',
  comboRole: 'pressure',
  effects: [
    {
      at: 'onCast',
      kind: 'channel',
      durationSec: 1.0,
      tickEverySec: 1.0 / 3,
      perTick: { at: 'onTick', kind: 'damage', amount: 11, radius: 4 },
      breakOnMove: false,
    },
    {
      at: 'onCast',
      kind: 'applyStatus',
      status: 'slow',
      durationSec: 1.0,
      stacks: 1,
      slowFraction: 0.2,
    },
  ],
  description:
    'Sustained spin that cleaves all nearby enemies repeatedly. Movement is reduced while channeling.',
  miniMalus: 'Committed channel — you cannot freely reposition while spinning.',
}

export const ABILITY_M2_GAP_CLOSER: AbilityDef = {
  id: 'gap_closer',
  name: 'Gap Closer',
  slot: 'melee',
  element: 'none',
  weapon: 'sword',
  costMana: 0,
  costStamina: 25,
  cooldownSec: 7,
  windupSec: 0,
  range: 6,
  targeting: 'forward',
  comboRole: 'mobility',
  effects: [
    { at: 'onCast', kind: 'move', mode: 'dash', distance: 6, cancelOnCollision: true },
    { at: 'onLand', kind: 'damage', amount: 18, radius: 1.5 },
    {
      at: 'onLand',
      kind: 'applyStatus',
      status: 'slow',
      durationSec: 3.0,
      stacks: 1,
      radius: 1.5,
      slowFraction: 0.5,
    },
  ],
  description:
    'Engage dash that closes distance rapidly. The landing impact hits nearby enemies and Slows them.',
  miniMalus: 'Linear path — collision stops the dash. The landing blow is parryable.',
  canParry: true,
}

export const ABILITY_M3_UPPERCUT: AbilityDef = {
  id: 'uppercut',
  name: 'Uppercut',
  slot: 'melee',
  element: 'none',
  weapon: 'sword',
  costMana: 0,
  costStamina: 40,
  cooldownSec: 8.5,
  windupSec: 0.4,
  range: 2.5,
  targeting: 'forward',
  comboRole: 'starter',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 16 },
    { at: 'onCast', kind: 'knockup', airborneSec: 0.7, knockbackDistance: 0.8 },
  ],
  description: 'Rising strike that launches the target briefly Airborne. Strong combo starter.',
  miniMalus: 'Requires a windup — opponents can interrupt or parry.',
  canParry: true,
  isKnockup: true,
}

export const ABILITY_M4_BLEED_STRIKE: AbilityDef = {
  id: 'bleed_strike',
  name: 'Bleed Strike',
  slot: 'melee',
  element: 'none',
  weapon: 'sword',
  costMana: 0,
  costStamina: 20,
  cooldownSec: 7,
  windupSec: 0,
  range: 2.5,
  targeting: 'forward',
  comboRole: 'pressure',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 10 },
    { at: 'onCast', kind: 'applyStatus', status: 'bleed', durationSec: 3, stacks: 1 },
  ],
  description: 'Quick slash that leaves the target Bleeding over time.',
  miniMalus: 'Bleed can be cleansed by the opponent.',
  canParry: true,
}

export const ABILITY_M5_GUARD_BREAK: AbilityDef = {
  id: 'guard_break',
  name: 'Guard Break',
  slot: 'melee',
  element: 'none',
  weapon: 'sword',
  costMana: 0,
  costStamina: 30,
  cooldownSec: 8.5,
  windupSec: 0.25,
  range: 2.2,
  targeting: 'forward',
  comboRole: 'starter',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 10 },
    { at: 'onCast', kind: 'applyStatus', status: 'stun', durationSec: 1.5, stacks: 1 },
    { at: 'onCast', kind: 'knockup', airborneSec: 0.45, knockbackDistance: 1.2 },
  ],
  description:
    'Crushing blow that Stuns the target and briefly launches them Airborne. Hard CC setup.',
  miniMalus: 'Very short reach and fully parryable.',
  canParry: true,
}

export const ABILITY_M6_RENDING_DASH: AbilityDef = {
  id: 'rending_dash',
  name: 'Rending Dash',
  slot: 'melee',
  element: 'none',
  weapon: 'sword',
  costMana: 0,
  costStamina: 28, // cheaper than Gap Closer's burst model; trade-off is DoT vs instant
  cooldownSec: 8, // was 10 — now competitive but with different payoff profile
  windupSec: 0,
  range: 5,
  targeting: 'forward',
  comboRole: 'mobility',
  effects: [
    { at: 'onCast', kind: 'move', mode: 'dash', distance: 5, cancelOnCollision: true },
    { at: 'onLand', kind: 'damage', amount: 12, radius: 2.0 }, // wider radius than Gap Closer (1.5m)
    // Long bleed: 5s × 6 dmg/s = 30 DoT on top of 12 immediate = 42 total.
    // Gap Closer: 18 burst + 50% slow. Rending Dash: 42 over 5s, wider AoE.
    // Identity: bleed+DoT option vs Gap Closer's burst+CC option.
    { at: 'onLand', kind: 'applyStatus', status: 'bleed', durationSec: 5, stacks: 1, radius: 2.0 },
  ],
  description:
    "Slashing dash with wide landing arc. The impact applies a long Bleed — 42 total damage over 5 s versus Gap Closer's burst CC. Different tools for different fights.",
  miniMalus: 'Damage is delayed via Bleed — vulnerable to cleanse. Collision stops the dash.',
  canParry: true,
}

// ============================================================================
// BOW — 8 abilities
// ============================================================================

export const ABILITY_B1_PIERCING_SHOT: AbilityDef = {
  id: 'piercing_shot',
  name: 'Piercing Shot',
  slot: 'bow',
  element: 'none',
  weapon: 'bow',
  costMana: 0,
  costStamina: 0,
  cooldownSec: 7,
  windupSec: 0.35,
  range: 20,
  targeting: 'forward',
  comboRole: 'finisher',
  effects: [
    {
      at: 'onCast',
      kind: 'projectile',
      speedMps: 150,
      gravityMps2: 0,
      damage: 40,
    },
  ],
  description: 'Fast, straight shot with no arc. Maximum velocity and precision at long range.',
  miniMalus: 'Narrow hitbox — misses hard against lateral movement.',
}

export const ABILITY_B2_VOLLEY: AbilityDef = {
  id: 'volley',
  name: 'Volley',
  slot: 'bow',
  element: 'none',
  weapon: 'bow',
  costMana: 0,
  costStamina: 0,
  cooldownSec: 8.5,
  windupSec: 0,
  range: 30,
  targeting: 'point',
  comboRole: 'pressure',
  effects: [
    {
      at: 'onLand',
      kind: 'zone',
      radius: 3.5,
      durationSec: 1.5,
      tickEverySec: 0.5,
      damagePerTick: 11,
      applyStatus: { status: 'slow', durationSec: 3.0, stacks: 1, slowFraction: 0.45 },
    },
  ],
  description:
    'Arcing arrow rain that creates a damage zone. Enemies caught inside are repeatedly Slowed.',
  miniMalus: 'Landing zone is telegraphed — targets can walk out before waves hit.',
}

export const ABILITY_B3_PIN_SHOT: AbilityDef = {
  id: 'pin_shot',
  name: 'Pin Shot',
  slot: 'bow',
  element: 'none',
  weapon: 'bow',
  costMana: 0,
  costStamina: 0,
  cooldownSec: 8.5,
  windupSec: 0.4,
  range: 25,
  targeting: 'forward',
  comboRole: 'starter',
  effects: [
    {
      at: 'onCast',
      kind: 'projectile',
      speedMps: 90,
      gravityMps2: 2,
      damage: 14,
      onHitStatus: { status: 'root', durationSec: 2.8, stacks: 1 },
    },
  ],
  description: 'Aimed arrow that Roots the target on hit. Strong setup for follow-up attacks.',
  miniMalus: 'Short charge — requires clear aim and line of sight.',
}

export const ABILITY_B4_SNARE_TRAP: AbilityDef = {
  id: 'snare_trap',
  name: 'Snare Trap',
  slot: 'bow',
  element: 'none',
  weapon: 'bow',
  costMana: 0,
  costStamina: 0,
  cooldownSec: 9,
  windupSec: 0,
  range: 5,
  targeting: 'self',
  comboRole: 'starter',
  effects: [
    {
      at: 'onCast',
      kind: 'zone',
      radius: 1.5,
      placement: 'self',
      durationSec: 20,
      tickEverySec: 1,
      armDelaySec: 2,
      expiresOnTrigger: true,
      damagePerTick: 10,
      applyStatus: { status: 'root', durationSec: 3.0, stacks: 1 },
    },
  ],
  description:
    'Place a trap at your feet that arms after a short delay. First enemy to trigger it is damaged and Rooted.',
  miniMalus: 'No effect before the arm delay — place it preemptively.',
}

export const ABILITY_B5_MARKSMAN_SHOT: AbilityDef = {
  id: 'marksman_shot',
  name: 'Marksman Shot',
  slot: 'bow',
  element: 'none',
  weapon: 'bow',
  costMana: 20,
  costStamina: 0,
  cooldownSec: 10,
  windupSec: 1.0,
  range: 100,
  targeting: 'forward',
  comboRole: 'finisher',
  effects: [
    {
      at: 'onCast',
      kind: 'projectile',
      speedMps: 500,
      gravityMps2: 0,
      damage: 50,
    },
  ],
  description: 'Extreme-range precision shot. Highest single-target damage in the bow arsenal.',
  miniMalus: 'Long aim window — you are exposed and can be interrupted before release.',
}

export const ABILITY_B6_DISENGAGE_SHOT: AbilityDef = {
  id: 'disengage_shot',
  name: 'Disengage Shot',
  slot: 'bow',
  element: 'none',
  weapon: 'bow',
  costMana: 0,
  costStamina: 15,
  cooldownSec: 8,
  windupSec: 0,
  range: 15,
  targeting: 'forward',
  comboRole: 'counter',
  effects: [
    { at: 'onCast', kind: 'move', mode: 'dash', distance: -3, cancelOnCollision: true },
    {
      at: 'onCast',
      kind: 'projectile',
      speedMps: 60,
      gravityMps2: 1,
      damage: 12,
    },
  ],
  description:
    'Step backward while simultaneously firing a shot forward. Creates distance from the target.',
  miniMalus: 'Low damage — primarily a repositioning tool.',
}

export const ABILITY_B7_BROADHEAD: AbilityDef = {
  id: 'broadhead',
  name: 'Broadhead',
  slot: 'bow',
  element: 'none',
  weapon: 'bow',
  costMana: 0,
  costStamina: 10,
  cooldownSec: 7,
  windupSec: 0.25,
  range: 24,
  targeting: 'forward',
  comboRole: 'pressure',
  effects: [
    {
      at: 'onCast',
      kind: 'projectile',
      speedMps: 80,
      gravityMps2: 2.5,
      damage: 14,
      onHitStatus: { status: 'bleed', durationSec: 4, stacks: 1 },
    },
  ],
  description: 'Heavy arrow that Bleeds the target on hit. Good for sustained pressure.',
  miniMalus: 'Arc drop — long shots require leading the target.',
}

export const ABILITY_B8_BLAST_ARROW: AbilityDef = {
  id: 'blast_arrow',
  name: 'Blast Arrow',
  slot: 'bow',
  element: 'fire',
  weapon: 'bow',
  costMana: 15,
  costStamina: 0,
  cooldownSec: 9,
  windupSec: 0.45,
  range: 22,
  targeting: 'forward',
  comboRole: 'finisher',
  effects: [
    {
      at: 'onCast',
      kind: 'projectile',
      speedMps: 44,
      gravityMps2: 5,
      damage: 45,
      splashRadius: 3,
      element: 'fire',
      knockbackDistance: 1.4,
      onHitStatus: { status: 'burn', durationSec: 3, stacks: 2 },
    },
  ],
  description:
    'Explosive fire arrow that detonates on impact, blasting and Burning all targets in the area.',
  miniMalus: 'Slow heavy arc — distant targets can dodge the impact point.',
}

// ============================================================================
// MAGIC — Fire (5 + 1 movement)
// ============================================================================

export const ABILITY_F1_FIREBALL: AbilityDef = {
  id: 'fireball',
  name: 'Fireball',
  slot: 'magic',
  element: 'fire',
  weapon: 'staff',
  costMana: 20,
  costStamina: 0,
  cooldownSec: 8.5,
  windupSec: 0,
  range: 20,
  targeting: 'forward',
  comboRole: 'finisher',
  effects: [
    {
      at: 'onCast',
      kind: 'projectile',
      speedMps: 30,
      gravityMps2: 5,
      damage: 40,
      splashRadius: 2.6,
      element: 'fire',
      knockbackDistance: 1.8,
      onHitStatus: { status: 'burn', durationSec: 3, stacks: 1 },
    },
  ],
  description:
    'Arcing fire orb that explodes on impact, dealing AoE fire damage, applying Burn, and blasting targets away.',
  miniMalus: 'Visible travel arc — lateral movement can dodge it.',
}

export const ABILITY_F2_FLAME_WALL: AbilityDef = {
  id: 'flame_wall',
  name: 'Flame Wall',
  slot: 'magic',
  element: 'fire',
  weapon: 'staff',
  costMana: 30,
  costStamina: 0,
  cooldownSec: 9,
  windupSec: 0,
  range: 10,
  targeting: 'point',
  comboRole: 'pressure',
  effects: [
    {
      at: 'onLand',
      kind: 'zone',
      radius: 0,
      width: 7,
      durationSec: 3.5,
      tickEverySec: 0.7,
      damagePerTick: 6,
      element: 'fire',
      applyStatus: { status: 'burn', durationSec: 3, stacks: 1 },
    },
  ],
  description:
    'Conjure a wide wall of fire at a target point. Enemies who cross it take damage and Burn.',
  miniMalus: 'Wall is visible — no instant burst, enemies can choose to avoid it.',
}

export const ABILITY_F3_IGNITE: AbilityDef = {
  id: 'ignite',
  name: 'Ignite',
  slot: 'magic',
  element: 'fire',
  weapon: 'staff',
  costMana: 20,
  costStamina: 0,
  cooldownSec: 8,
  windupSec: 0,
  range: 12,
  targeting: 'forward',
  comboRole: 'pressure',
  effects: [{ at: 'onCast', kind: 'applyStatus', status: 'burn', durationSec: 3, stacks: 3 }],
  description:
    'Instant cast that applies multiple Burn stacks to the target. Pure status tool with no direct damage.',
  miniMalus: 'No direct damage — requires clear line of sight.',
}

export const ABILITY_F4_METEOR: AbilityDef = {
  id: 'meteor',
  name: 'Meteor',
  slot: 'magic',
  element: 'fire',
  weapon: 'staff',
  costMana: 40,
  costStamina: 0,
  cooldownSec: 11,
  windupSec: 1.0,
  range: 25,
  targeting: 'point',
  comboRole: 'finisher',
  effects: [
    { at: 'onLand', kind: 'damage', amount: 55, radius: 3.5, element: 'fire' },
    {
      at: 'onLand',
      kind: 'applyStatus',
      status: 'burn',
      durationSec: 3,
      stacks: 1,
      radius: 3.5,
    },
    { at: 'onLand', kind: 'knockup', airborneSec: 1.2, radius: 3.5, knockbackDistance: 2.8 },
  ],
  description:
    'Massive delayed impact that launches all nearby targets Airborne and applies Burn. Highest AoE damage in fire.',
  miniMalus: 'Long windup and visible impact point — easily dodged if spotted.',
  isKnockup: true,
}

export const ABILITY_F5_ERUPTION: AbilityDef = {
  id: 'eruption',
  name: 'Eruption',
  slot: 'magic',
  element: 'fire',
  weapon: 'staff',
  costMana: 30,
  costStamina: 0,
  cooldownSec: 9.5,
  windupSec: 0,
  range: 10,
  targeting: 'forward',
  comboRole: 'starter',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 8, radius: 2.4, element: 'fire' },
    { at: 'onCast', kind: 'knockup', airborneSec: 0.7, radius: 2.4, knockbackDistance: 1.0 },
  ],
  description:
    'Instant detonation under the aimed enemy. Launches nearby targets Airborne. Reliable fire combo starter.',
  miniMalus: 'Short detonation range — needs to be close.',
  isKnockup: true,
}

export const ABILITY_F6_FIRE_BLINK: AbilityDef = {
  id: 'fire_blink',
  name: 'Fire Blink',
  slot: 'magic',
  element: 'fire',
  weapon: 'staff',
  costMana: 30,
  costStamina: 0,
  cooldownSec: 8.5,
  windupSec: 0,
  range: 7,
  targeting: 'forward',
  comboRole: 'mobility',
  effects: [
    {
      at: 'onCast',
      kind: 'zone',
      radius: 1.5,
      placement: 'self',
      durationSec: 1.2,
      tickEverySec: 0.4,
      damagePerTick: 6,
      element: 'fire',
      applyStatus: { status: 'burn', durationSec: 2, stacks: 1 },
    },
    { at: 'onCast', kind: 'move', mode: 'teleport', distance: 7, cancelOnCollision: true },
  ],
  description:
    'Teleport forward, leaving a burning fire zone at your origin. Good for repositioning while pressuring.',
  miniMalus: 'Blocked if destination is occupied.',
}

// ============================================================================
// MAGIC — Ice (5)
// ============================================================================

export const ABILITY_I1_FROST_BOLT: AbilityDef = {
  id: 'frost_bolt',
  name: 'Frost Bolt',
  slot: 'magic',
  element: 'ice',
  weapon: 'staff',
  costMana: 20,
  costStamina: 0,
  cooldownSec: 8,
  windupSec: 0,
  range: 20,
  targeting: 'forward',
  comboRole: 'pressure',
  effects: [
    {
      at: 'onCast',
      kind: 'projectile',
      speedMps: 55,
      gravityMps2: 1.5,
      damage: 16,
      element: 'ice',
      knockbackDistance: 0.6,
      onHitStatus: { status: 'chill', durationSec: 6, stacks: 1 },
    },
  ],
  description:
    'Fast frost projectile that Chills on hit and pushes the target back. Repeated Chills build toward a full Freeze.',
  miniMalus: 'Lower direct damage than fire or bow finishers — value is in CC buildup.',
}

export const ABILITY_I2_ICE_WALL: AbilityDef = {
  id: 'ice_wall',
  name: 'Ice Wall',
  slot: 'magic',
  element: 'ice',
  weapon: 'staff',
  costMana: 30,
  costStamina: 0,
  cooldownSec: 10,
  windupSec: 0,
  range: 8,
  targeting: 'point',
  comboRole: 'pressure',
  effects: [
    {
      at: 'onLand',
      kind: 'zone',
      radius: 0,
      width: 6,
      durationSec: 4.5,
      tickEverySec: 0.25,
      damagePerTick: 0,
      element: 'ice',
      applyStatus: { status: 'root', durationSec: 1.5, stacks: 1 },
    },
  ],
  description:
    'Creates an ice strip that repeatedly Roots any enemy who steps on it. Strong zone denial.',
  miniMalus: 'No damage — purely crowd control.',
}

export const ABILITY_I3_BLIZZARD: AbilityDef = {
  id: 'blizzard',
  name: 'Blizzard',
  slot: 'magic',
  element: 'ice',
  weapon: 'staff',
  costMana: 30,
  costStamina: 0,
  cooldownSec: 10,
  windupSec: 0,
  range: 20,
  targeting: 'point',
  comboRole: 'pressure',
  effects: [
    {
      at: 'onLand',
      kind: 'zone',
      radius: 7,
      durationSec: 5,
      tickEverySec: 1,
      damagePerTick: 4,
      element: 'ice',
      applyStatus: { status: 'slow', durationSec: 3.5, stacks: 1, slowFraction: 0.6 },
    },
  ],
  description:
    'Large slow-moving storm zone that repeatedly Slows enemies inside and deals periodic damage.',
  miniMalus: 'No hard lock — enemies can dash out or still shoot while inside.',
}

export const ABILITY_I4_FREEZE_TARGET: AbilityDef = {
  id: 'freeze_target',
  name: 'Freeze Target',
  slot: 'magic',
  element: 'ice',
  weapon: 'staff',
  costMana: 35,
  costStamina: 0,
  cooldownSec: 10.5,
  windupSec: 0.4,
  range: 12,
  targeting: 'forward',
  comboRole: 'starter',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 8, element: 'ice' },
    { at: 'onCast', kind: 'applyStatus', status: 'freeze', durationSec: 2.5, stacks: 1 },
  ],
  description:
    'Quick cast that Freezes the target completely. Hard lockdown for follow-up attacks.',
  miniMalus: 'Short windup — parryable and requires line of sight.',
  canParry: true,
}

export const ABILITY_I5_FROST_PILLAR: AbilityDef = {
  id: 'frost_pillar',
  name: 'Frost Pillar',
  slot: 'magic',
  element: 'ice',
  weapon: 'staff',
  costMana: 30,
  costStamina: 0,
  cooldownSec: 9.5,
  windupSec: 0.3,
  range: 10,
  targeting: 'forward',
  comboRole: 'starter',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 12, element: 'ice' },
    { at: 'onCast', kind: 'knockup', airborneSec: 0.7, knockbackDistance: 0.6 },
  ],
  description:
    'Frost pillar that erupts under the target, launching them briefly Airborne. Ice combo starter.',
  miniMalus: 'Erupts at a fixed point — sidestep before it lands and it misses.',
  isKnockup: true,
}

// ============================================================================
// MAGIC — Lightning (5)
// ============================================================================

export const ABILITY_L1_CHAIN_BOLT: AbilityDef = {
  id: 'chain_bolt',
  name: 'Chain Bolt',
  slot: 'magic',
  element: 'lightning',
  weapon: 'staff',
  costMana: 25,
  costStamina: 0,
  cooldownSec: 6,
  windupSec: 0,
  range: 15,
  targeting: 'forward',
  comboRole: 'pressure',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 22, element: 'lightning' },
    {
      at: 'onCast',
      kind: 'damage',
      amount: 10,
      radius: 6,
      element: 'lightning',
      excludePrimary: true,
    },
  ],
  description:
    'Instant cast that deals heavy damage to the primary target, then arcs electricity to nearby enemies.',
  miniMalus: 'Chain damage requires a secondary target nearby.',
}

export const ABILITY_L2_THUNDER_CLAP: AbilityDef = {
  id: 'thunder_clap',
  name: 'Thunder Clap',
  slot: 'magic',
  element: 'lightning',
  weapon: 'staff',
  costMana: 30,
  costStamina: 0,
  cooldownSec: 9,
  windupSec: 0,
  range: 3,
  targeting: 'self',
  comboRole: 'counter',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 16, radius: 3.2, element: 'lightning' },
    { at: 'onCast', kind: 'applyStatus', status: 'stun', durationSec: 1.8, stacks: 1, radius: 3.2 },
    { at: 'onCast', kind: 'knockup', airborneSec: 0.45, radius: 3.2, knockbackDistance: 2.5 },
  ],
  description:
    'Release a shockwave around you that Stuns nearby enemies and blasts them away. Devastating in close range.',
  miniMalus: 'Short range — must be in melee contact to connect.',
}

export const ABILITY_L3_STORM_FIELD: AbilityDef = {
  id: 'storm_field',
  name: 'Storm Field',
  slot: 'magic',
  element: 'lightning',
  weapon: 'staff',
  costMana: 35,
  costStamina: 0,
  cooldownSec: 11,
  windupSec: 0,
  range: 20,
  targeting: 'point',
  comboRole: 'pressure',
  effects: [
    {
      at: 'onLand',
      kind: 'zone',
      radius: 4.5,
      durationSec: 3.2,
      tickEverySec: 0.4,
      damagePerTick: 4,
      element: 'lightning',
      applyStatus: { status: 'slow', durationSec: 2.0, stacks: 1, slowFraction: 0.45 },
    },
  ],
  description:
    'Create an electric storm zone that Slows enemies inside and deals periodic lightning damage.',
  miniMalus: 'Zone is visible — enemies can choose to avoid it.',
}

export const ABILITY_L4_LIGHTNING_DASH: AbilityDef = {
  id: 'lightning_dash',
  name: 'Lightning Dash',
  slot: 'magic',
  element: 'lightning',
  weapon: 'staff',
  costMana: 25,
  costStamina: 0,
  cooldownSec: 8,
  windupSec: 0,
  range: 5,
  targeting: 'forward',
  comboRole: 'mobility',
  effects: [
    { at: 'onCast', kind: 'move', mode: 'teleport', distance: 5, cancelOnCollision: true },
    { at: 'onCast', kind: 'damage', amount: 15, radius: 1, element: 'lightning' },
  ],
  description:
    'Instant teleport that deals AoE lightning damage at the destination. High-speed repositioning.',
  miniMalus: 'Damage only at the destination — no area at origin.',
}

export const ABILITY_L5_ARC_LIFT: AbilityDef = {
  id: 'arc_lift',
  name: 'Arc Lift',
  slot: 'magic',
  element: 'lightning',
  weapon: 'staff',
  costMana: 30,
  costStamina: 0,
  cooldownSec: 9,
  windupSec: 0,
  range: 15,
  targeting: 'forward',
  comboRole: 'starter',
  effects: [
    { at: 'onCast', kind: 'projectile', speedMps: 30, gravityMps2: 0, damage: 8 },
    { at: 'onLand', kind: 'knockup', airborneSec: 0.7, knockbackDistance: 1.4 },
  ],
  description:
    'Lightning bolt at 30 m/s that launches whoever it hits Airborne. Lightning combo starter.',
  miniMalus: 'Travels — you have to lead a moving target.',
  isKnockup: true,
}

// ============================================================================
// MAGIC — Dark (5)
// ============================================================================

export const ABILITY_D1_SHADOW_BOLT: AbilityDef = {
  id: 'shadow_bolt',
  name: 'Shadow Bolt',
  slot: 'magic',
  element: 'dark',
  weapon: 'staff',
  costMana: 25,
  costStamina: 0,
  cooldownSec: 5,
  windupSec: 0,
  range: 20,
  targeting: 'forward',
  comboRole: 'pressure',
  effects: [
    {
      at: 'onCast',
      kind: 'projectile',
      speedMps: 42,
      gravityMps2: 2,
      damage: 18,
      element: 'dark',
      lifestealFraction: 0.25,
      knockbackDistance: 0.8,
    },
  ],
  description: 'Dark projectile that steals life on hit. Sustain tool that works at range.',
  miniMalus: 'Projectile can be dodged or blocked by cover.',
}

export const ABILITY_D2_CURSE_OF_WEAKNESS: AbilityDef = {
  id: 'curse_of_weakness',
  name: 'Curse of Weakness',
  slot: 'magic',
  element: 'dark',
  weapon: 'staff',
  costMana: 30,
  costStamina: 0,
  cooldownSec: 9.5,
  windupSec: 0.35,
  range: 15,
  targeting: 'forward',
  comboRole: 'starter',
  effects: [
    { at: 'onCast', kind: 'applyStatus', status: 'curse', durationSec: 5, stacks: 1 },
    { at: 'onCast', kind: 'applyStatus', status: 'blind', durationSec: 4.0, stacks: 1 },
    { at: 'onCast', kind: 'resourceDrain', resource: 'mana', amount: 18, gainFraction: 0.5 },
  ],
  description:
    'Ray that Curses, Blinds, and drains Mana from the target. Refunds half the drained Mana to you.',
  miniMalus: 'Windup required — parryable and needs line of sight.',
  canParry: true,
}

export const ABILITY_D3_LIFE_DRAIN: AbilityDef = {
  id: 'life_drain',
  name: 'Life Drain',
  slot: 'magic',
  element: 'dark',
  weapon: 'staff',
  costMana: 35,
  costStamina: 0,
  cooldownSec: 9.5,
  windupSec: 0,
  range: 12,
  targeting: 'forward',
  comboRole: 'pressure',
  effects: [
    {
      at: 'onCast',
      kind: 'channel',
      durationSec: 2.4,
      tickEverySec: 0.6,
      perTick: { at: 'onTick', kind: 'damage', amount: 6, element: 'dark' },
      lifestealFraction: 0.7,
      breakOnMove: true,
      breakOnDamage: true,
    },
    { at: 'onCast', kind: 'resourceDrain', resource: 'stamina', amount: 20, gainFraction: 0.5 },
  ],
  description:
    'Channel a drain beam that first rips Stamina from the target, then leeches their HP back to you each tick.',
  miniMalus: 'Movement or taking damage interrupts the beam immediately.',
}

export const ABILITY_D4_DARK_BARRIER: AbilityDef = {
  id: 'dark_barrier',
  name: 'Dark Barrier',
  slot: 'magic',
  element: 'dark',
  weapon: 'staff',
  costMana: 30,
  costStamina: 0,
  cooldownSec: 10.5,
  windupSec: 0,
  range: 0,
  targeting: 'self',
  comboRole: 'survival',
  effects: [
    {
      at: 'onCast',
      kind: 'applyStatus',
      status: 'shield',
      durationSec: 5,
      stacks: 38,
    },
  ],
  description:
    'Instantly conjure a dark barrier that absorbs incoming damage. Pure defensive tool.',
  miniMalus: 'No offensive component — no damage, cleanse, or mobility.',
}

export const ABILITY_D5_VOID_SPIKE: AbilityDef = {
  id: 'void_spike',
  name: 'Void Spike',
  slot: 'magic',
  element: 'dark',
  weapon: 'staff',
  costMana: 30,
  costStamina: 0,
  cooldownSec: 9.5,
  windupSec: 0,
  range: 10,
  targeting: 'forward',
  comboRole: 'starter',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 14, element: 'dark' },
    { at: 'onCast', kind: 'knockup', airborneSec: 0.7, knockbackDistance: 1.0 },
    { at: 'onCast', kind: 'resourceDrain', resource: 'mana', amount: 12, gainFraction: 0.5 },
  ],
  description:
    'Dark ray that launches the target Airborne and drains their Mana. Combo starter with resource pressure.',
  miniMalus: 'Short range and clear line of sight required.',
  isKnockup: true,
}

// ============================================================================
// MAGIC — Nature (5 + 1 movement)
// ============================================================================

export const ABILITY_N1_POISON_DART: AbilityDef = {
  id: 'poison_dart',
  name: 'Poison Dart',
  slot: 'magic',
  element: 'nature',
  weapon: 'staff',
  costMana: 20,
  costStamina: 0,
  cooldownSec: 5,
  windupSec: 0,
  range: 18,
  targeting: 'forward',
  comboRole: 'pressure',
  effects: [
    {
      at: 'onCast',
      kind: 'projectile',
      speedMps: 58,
      gravityMps2: 1,
      damage: 8,
      element: 'nature',
      onHitStatus: { status: 'poison', durationSec: 4, stacks: 1 },
    },
  ],
  description: 'Fast dart that Poisons the target on hit. Good for sustained pressure at range.',
  miniMalus: 'Poison damage is delayed and can be cleansed.',
}

export const ABILITY_N2_THORN_FIELD: AbilityDef = {
  id: 'thorn_field',
  name: 'Thorn Field',
  slot: 'magic',
  element: 'nature',
  weapon: 'staff',
  costMana: 35,
  costStamina: 0,
  cooldownSec: 10.5,
  windupSec: 0,
  range: 12,
  targeting: 'point',
  comboRole: 'pressure',
  effects: [
    {
      at: 'onLand',
      kind: 'zone',
      radius: 3.5,
      durationSec: 5,
      tickEverySec: 0.75,
      damagePerTick: 4,
      element: 'nature',
      applyStatus: { status: 'slow', durationSec: 3.0, stacks: 1, slowFraction: 0.5 },
    },
  ],
  description:
    'Summon a thorn zone that Slows and deals periodic damage to enemies who stay inside.',
  miniMalus: 'Visible zone — enemies can walk out to avoid it.',
}

export const ABILITY_N3_ENTANGLE: AbilityDef = {
  id: 'entangle',
  name: 'Entangle',
  slot: 'magic',
  element: 'nature',
  weapon: 'staff',
  costMana: 25,
  costStamina: 0,
  cooldownSec: 9.5,
  windupSec: 0.3,
  range: 10,
  targeting: 'forward',
  comboRole: 'starter',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 4, element: 'nature' },
    { at: 'onCast', kind: 'applyStatus', status: 'root', durationSec: 3.2, stacks: 1 },
  ],
  description: 'Quick cast that Roots the target in place. Hard CC for setting up combos.',
  miniMalus: 'Short windup — needs clear line of sight.',
}

export const ABILITY_N4_HEALING_TOTEM: AbilityDef = {
  id: 'healing_totem',
  name: 'Healing Totem',
  slot: 'magic',
  element: 'nature',
  weapon: 'staff',
  costMana: 30,
  costStamina: 0,
  cooldownSec: 11.5,
  windupSec: 0,
  range: 0,
  targeting: 'self',
  comboRole: 'survival',
  effects: [
    {
      at: 'onCast',
      kind: 'channel',
      durationSec: 5,
      tickEverySec: 1,
      perTick: { at: 'onTick', kind: 'heal', amount: 8 },
      breakOnMove: false,
    },
  ],
  description: 'Channel nature energy to heal yourself over time. Best used safely between fights.',
  miniMalus: 'No burst heal — requires multiple ticks to recover significant HP.',
}

export const ABILITY_N5_ROOT_UPTHROW: AbilityDef = {
  id: 'root_upthrow',
  name: 'Root Upthrow',
  slot: 'magic',
  element: 'nature',
  weapon: 'staff',
  costMana: 30,
  costStamina: 0,
  cooldownSec: 9.5,
  windupSec: 0,
  range: 10,
  targeting: 'forward',
  comboRole: 'starter',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 8, element: 'nature' },
    { at: 'onCast', kind: 'knockup', airborneSec: 1.0, requiresGroundedTarget: true },
  ],
  description:
    'Erupting vines that launch a grounded target Airborne. Fails if they are already in the air.',
  miniMalus: 'Cannot be used on airborne targets — time it before a knockup, not after.',
  isKnockup: true,
}

export const ABILITY_N6_VINE_DASH: AbilityDef = {
  id: 'vine_dash',
  name: 'Vine Dash',
  slot: 'magic',
  element: 'nature',
  weapon: 'staff',
  costMana: 25,
  costStamina: 0,
  cooldownSec: 9,
  windupSec: 0,
  range: 5,
  targeting: 'forward',
  comboRole: 'mobility',
  effects: [
    { at: 'onCast', kind: 'move', mode: 'dash', distance: 5, cancelOnCollision: true },
    {
      at: 'onLand',
      kind: 'zone',
      radius: 2,
      placement: 'self',
      durationSec: 2.5,
      tickEverySec: 0.25,
      damagePerTick: 0,
      element: 'nature',
      applyStatus: { status: 'root', durationSec: 2.8, stacks: 1 },
    },
  ],
  description:
    'Dash forward and leave a Root zone at your landing point. Traps enemies who follow you.',
  miniMalus: 'Collision stops the dash early.',
}

// ============================================================================
// UTILITY — active tools (no element, no weapon swap)
// ============================================================================

export const ABILITY_U1_SELF_HEAL_POTION: AbilityDef = {
  id: 'self_heal',
  name: 'Healing Potion',
  slot: 'utility',
  element: 'none',
  weapon: 'none',
  costMana: 0,
  costStamina: 0,
  cooldownSec: 11.5,
  windupSec: 0,
  range: 0,
  targeting: 'self',
  comboRole: 'survival',
  effects: [
    {
      at: 'onCast',
      kind: 'channel',
      durationSec: 2,
      tickEverySec: 1,
      perTick: { at: 'onTick', kind: 'heal', amount: 20 },
      breakOnMove: true,
    },
  ],
  description:
    'Drink a healing potion that restores HP over time. Must stand still to benefit fully.',
  miniMalus: 'Movement cancels the channel — cannot fight and heal simultaneously.',
}

export const ABILITY_U2_QUICK_DASH: AbilityDef = {
  id: 'quick_dash',
  name: 'Quick Dash',
  slot: 'utility',
  element: 'none',
  weapon: 'none',
  costMana: 0,
  costStamina: 10,
  cooldownSec: 6,
  windupSec: 0,
  range: 4,
  targeting: 'forward',
  comboRole: 'mobility',
  effects: [
    {
      at: 'onCast',
      kind: 'move',
      mode: 'dash',
      distance: 4,
      useMovementDirection: true,
      cancelOnCollision: true,
    },
  ],
  description: 'Quick dash in your current movement direction. Universal repositioning tool.',
  miniMalus: 'No invulnerability frames — you can still be hit mid-dash.',
}

export const ABILITY_U3_PING_MARK: AbilityDef = {
  id: 'ping_mark',
  name: 'Mark Target',
  slot: 'utility',
  element: 'none',
  weapon: 'none',
  costMana: 0,
  costStamina: 0,
  cooldownSec: 4,
  windupSec: 0,
  range: 30,
  targeting: 'forward',
  comboRole: 'pressure',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 6 },
    { at: 'onCast', kind: 'applyStatus', status: 'mark', durationSec: 5, stacks: 1 },
    { at: 'onCast', kind: 'resourceDrain', resource: 'stamina', amount: 12, gainFraction: 0 },
  ],
  description: 'Long-range ray that Marks the target and drains their Stamina, refunding nothing.',
  miniMalus: 'Low direct damage — requires line of sight.',
}

export const ABILITY_U4_CLEANSE_SURGE: AbilityDef = {
  id: 'cleanse_surge',
  name: 'Cleanse Surge',
  slot: 'utility',
  element: 'none',
  weapon: 'none',
  costMana: 0,
  costStamina: 20,
  cooldownSec: 11,
  windupSec: 0,
  range: 0,
  targeting: 'self',
  comboRole: 'counter',
  effects: [
    { at: 'onCast', kind: 'cleanse' },
    { at: 'onCast', kind: 'applyStatus', status: 'haste', durationSec: 2, stacks: 1 },
  ],
  description:
    'Instantly cleanse all debuffs, then surge forward with Haste. Best used when CC breaks your momentum.',
  miniMalus: 'No healing — purely removes debuffs and boosts movement.',
}

export const ABILITY_U5_BARRIER: AbilityDef = {
  id: 'barrier',
  name: 'Barrier',
  slot: 'utility',
  element: 'none',
  weapon: 'none',
  costMana: 0,
  costStamina: 0,
  cooldownSec: 11,
  windupSec: 0,
  range: 0,
  targeting: 'self',
  comboRole: 'survival',
  effects: [{ at: 'onCast', kind: 'applyStatus', status: 'shield', durationSec: 8, stacks: 42 }],
  description:
    'Instantly conjure a personal shield that absorbs incoming damage. Long-duration defensive cooldown.',
  miniMalus: 'No cleanse or heal — only absorbs damage.',
}

export const ABILITY_U6_ENERGIZE: AbilityDef = {
  id: 'energize',
  name: 'Energize',
  slot: 'utility',
  element: 'none',
  weapon: 'none',
  costMana: 0,
  costStamina: 0,
  cooldownSec: 9,
  windupSec: 0,
  range: 0,
  targeting: 'self',
  comboRole: 'survival',
  effects: [{ at: 'onCast', kind: 'restoreStamina', amount: 35 }],
  description:
    'Instantly restore a large chunk of Stamina. Enables more dashes, parries, and melee abilities.',
  miniMalus: 'No Mana restore.',
}

export const ABILITY_U7_PHASE_SHIFT: AbilityDef = {
  id: 'phase_shift',
  name: 'Phase Shift',
  slot: 'utility',
  element: 'none',
  weapon: 'none',
  costMana: 0,
  costStamina: 15,
  cooldownSec: 12,
  windupSec: 0,
  range: 0,
  targeting: 'self',
  comboRole: 'counter',
  effects: [
    { at: 'onCast', kind: 'applyStatus', status: 'invulnerable', durationSec: 0.6, stacks: 1 },
  ],
  description:
    'Brief invulnerability window — immune to all damage and crowd control. Use to dodge a critical hit.',
  miniMalus: 'Cannot attack or cast during the phase — purely defensive.',
}

export const ABILITY_U8_SMOKE_SCREEN: AbilityDef = {
  id: 'smoke_screen',
  name: 'Smoke Screen',
  slot: 'utility',
  element: 'none',
  weapon: 'none',
  costMana: 20,
  costStamina: 0,
  cooldownSec: 10.5,
  windupSec: 0,
  range: 8,
  targeting: 'forward',
  comboRole: 'pressure',
  effects: [
    {
      at: 'onCast',
      kind: 'zone',
      radius: 3.5,
      durationSec: 3.5,
      tickEverySec: 0.5,
      applyStatus: { status: 'blind', durationSec: 3.0, stacks: 1 },
    },
  ],
  description:
    'Throw a smoke bomb that creates a zone repeatedly Blinding enemies inside. Strong area denial.',
  miniMalus: 'No damage — purely crowd control.',
}

export const ABILITY_U_BRACE_RECOVERY: AbilityDef = {
  id: 'brace_recovery',
  name: 'Brace Recovery',
  slot: 'utility',
  targetSlotFamily: 'utility',
  targetLegalClasses: ['breaker'],
  element: 'none',
  weapon: 'none',
  costMana: 0,
  costStamina: 40,
  cooldownSec: 10,
  windupSec: 0,
  range: 0,
  targeting: 'self',
  comboRole: 'survival',
  effects: [
    { at: 'onCast', kind: 'heal', amount: 50 },
    { at: 'onCast', kind: 'applyStatus', status: 'shield', durationSec: 3, stacks: 20 },
  ],
  description:
    'Breaker exclusive. Plant your feet, restore a large chunk of HP and raise a damage shield on top of it.',
  miniMalus: 'High Stamina cost — for a moment you can neither parry nor dash.',
}

export const ABILITY_U_HUNTERS_FLOW: AbilityDef = {
  id: 'hunters_flow',
  name: "Hunter's Flow",
  slot: 'utility',
  targetSlotFamily: 'utility',
  targetLegalClasses: ['talon'],
  element: 'none',
  weapon: 'none',
  costMana: 20,
  costStamina: 10,
  cooldownSec: 9.5,
  windupSec: 0,
  range: 0,
  targeting: 'self',
  comboRole: 'survival',
  effects: [
    { at: 'onCast', kind: 'heal', amount: 35 },
    { at: 'onCast', kind: 'move', mode: 'dash', distance: 3, useMovementDirection: true },
  ],
  description:
    'Talon exclusive. Restore HP while performing a quick repositioning dash. Heals less than the others because it heals while you move.',
  miniMalus: 'Dash has no invulnerability frames — can be hit mid-dash.',
}

export const ABILITY_U_ARCANE_REBIND: AbilityDef = {
  id: 'arcane_rebind',
  name: 'Arcane Rebind',
  slot: 'utility',
  targetSlotFamily: 'utility',
  targetLegalClasses: ['warden'],
  element: 'none',
  weapon: 'none',
  costMana: 45,
  costStamina: 0,
  cooldownSec: 10.5,
  windupSec: 0.4,
  range: 0,
  targeting: 'self',
  comboRole: 'survival',
  effects: [{ at: 'onCast', kind: 'heal', amount: 60 }],
  description:
    'Warden exclusive. Channel arcane energy to restore HP. The largest heal in the game.',
  miniMalus: 'Windup required — vulnerable to interrupts during the cast.',
}

export const ABILITY_U_ADAPTIVE_MEND: AbilityDef = {
  id: 'adaptive_mend',
  name: 'Adaptive Mend',
  slot: 'utility',
  targetSlotFamily: 'utility',
  targetLegalClasses: ['drift'],
  element: 'none',
  weapon: 'none',
  costMana: 15,
  costStamina: 15,
  cooldownSec: 9,
  windupSec: 0,
  range: 0,
  targeting: 'self',
  comboRole: 'survival',
  effects: [{ at: 'onCast', kind: 'heal', amount: 30 }],
  description:
    'Drift exclusive. Restore HP at dual resource cost, on the shortest cooldown of the four. You do not come back in one go — you come back often.',
  miniMalus: 'Lowest healing of the four recoveries — one cast will not save you.',
}

// ============================================================================
// REGISTRY
// ============================================================================

export const ABILITY_DEFS: AbilityRegistry = Object.freeze({
  ...MELEE_EXTENDED,
  ...BOW_EXTENDED,
  whirlwind: ABILITY_M1_WHIRLWIND,
  gap_closer: ABILITY_M2_GAP_CLOSER,
  uppercut: ABILITY_M3_UPPERCUT,
  bleed_strike: ABILITY_M4_BLEED_STRIKE,
  guard_break: ABILITY_M5_GUARD_BREAK,
  rending_dash: ABILITY_M6_RENDING_DASH,
  // Bow
  piercing_shot: ABILITY_B1_PIERCING_SHOT,
  volley: ABILITY_B2_VOLLEY,
  pin_shot: ABILITY_B3_PIN_SHOT,
  snare_trap: ABILITY_B4_SNARE_TRAP,
  marksman_shot: ABILITY_B5_MARKSMAN_SHOT,
  disengage_shot: ABILITY_B6_DISENGAGE_SHOT,
  broadhead: ABILITY_B7_BROADHEAD,
  blast_arrow: ABILITY_B8_BLAST_ARROW,
  // Fire (6: +fire_blink)
  fireball: ABILITY_F1_FIREBALL,
  flame_wall: ABILITY_F2_FLAME_WALL,
  ignite: ABILITY_F3_IGNITE,
  meteor: ABILITY_F4_METEOR,
  eruption: ABILITY_F5_ERUPTION,
  fire_blink: ABILITY_F6_FIRE_BLINK,
  // Ice
  frost_bolt: ABILITY_I1_FROST_BOLT,
  ice_wall: ABILITY_I2_ICE_WALL,
  blizzard: ABILITY_I3_BLIZZARD,
  freeze_target: ABILITY_I4_FREEZE_TARGET,
  frost_pillar: ABILITY_I5_FROST_PILLAR,
  // Lightning
  chain_bolt: ABILITY_L1_CHAIN_BOLT,
  thunder_clap: ABILITY_L2_THUNDER_CLAP,
  storm_field: ABILITY_L3_STORM_FIELD,
  lightning_dash: ABILITY_L4_LIGHTNING_DASH,
  arc_lift: ABILITY_L5_ARC_LIFT,
  // Dark
  shadow_bolt: ABILITY_D1_SHADOW_BOLT,
  curse_of_weakness: ABILITY_D2_CURSE_OF_WEAKNESS,
  life_drain: ABILITY_D3_LIFE_DRAIN,
  dark_barrier: ABILITY_D4_DARK_BARRIER,
  void_spike: ABILITY_D5_VOID_SPIKE,
  // Nature (6: +vine_dash)
  poison_dart: ABILITY_N1_POISON_DART,
  thorn_field: ABILITY_N2_THORN_FIELD,
  entangle: ABILITY_N3_ENTANGLE,
  healing_totem: ABILITY_N4_HEALING_TOTEM,
  root_upthrow: ABILITY_N5_ROOT_UPTHROW,
  vine_dash: ABILITY_N6_VINE_DASH,
  // Utility
  self_heal: ABILITY_U1_SELF_HEAL_POTION,
  quick_dash: ABILITY_U2_QUICK_DASH,
  ping_mark: ABILITY_U3_PING_MARK,
  cleanse_surge: ABILITY_U4_CLEANSE_SURGE,
  barrier: ABILITY_U5_BARRIER,
  energize: ABILITY_U6_ENERGIZE,
  phase_shift: ABILITY_U7_PHASE_SHIFT,
  smoke_screen: ABILITY_U8_SMOKE_SCREEN,
  brace_recovery: ABILITY_U_BRACE_RECOVERY,
  hunters_flow: ABILITY_U_HUNTERS_FLOW,
  arcane_rebind: ABILITY_U_ARCANE_REBIND,
  adaptive_mend: ABILITY_U_ADAPTIVE_MEND,
})

export function getAbilityDef(id: string): AbilityDef | null {
  return ABILITY_DEFS[id] ?? null
}

export function abilityIds(): readonly string[] {
  return Object.keys(ABILITY_DEFS)
}
