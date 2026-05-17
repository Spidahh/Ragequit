// Ability registry — the **only** place ability data lives. Server engine
// reads from here; client HUD reads from here. Adding a new ability is
// adding a new entry to ABILITY_DEFS — zero engine code touches.
//
// Authority: 01_DESIGN/05_abilities_*.md (philosophy, melee, bow, magic, utility).

import type { AbilityDef, AbilityRegistry } from './types.js'

// ============================================================================
// MELEE — 6 abilities (sword)
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
  effects: [
    {
      at: 'onCast',
      kind: 'channel',
      durationSec: 1.0,
      tickEverySec: 1.0 / 3,
      perTick: { at: 'onTick', kind: 'damage', amount: 6, radius: 4 },
      breakOnMove: false,
    },
    {
      at: 'onCast',
      kind: 'applyStatus',
      status: 'slow',
      durationSec: 1.0,
      stacks: 1,
      slowFraction: 0.3,
    },
  ],
  description: '1.0s channel. Three 4m AoE hits, 6 damage each. Applies self Slow 30% for 1.0s.',
  miniMalus: 'Self Slow 30% while channeling.',
}

export const ABILITY_M2_GAP_CLOSER: AbilityDef = {
  id: 'gap_closer',
  name: 'Gap Closer',
  slot: 'melee',
  element: 'none',
  weapon: 'sword',
  costMana: 0,
  costStamina: 25,
  cooldownSec: 6,
  windupSec: 0,
  range: 6,
  targeting: 'forward',
  effects: [
    { at: 'onCast', kind: 'move', mode: 'dash', distance: 6, cancelOnCollision: true },
    { at: 'onLand', kind: 'damage', amount: 20, radius: 1.3 },
  ],
  description: '6m forward dash. Landing hit deals 20 damage in a 1.3m arc.',
  miniMalus: 'Collision stops dash. Contact hit is parryable.',
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
  cooldownSec: 10,
  windupSec: 0.4,
  range: 2.5,
  targeting: 'forward',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 15 },
    { at: 'onCast', kind: 'knockup', airborneSec: 0.8, knockbackDistance: 1.4 },
  ],
  description: '15 damage. Applies Airborne 0.8s and 1.4m knockback. Airborne disables abilities and parry.',
  miniMalus: '0.4s windup. Parryable.',
  canParry: true,
  isKnockup: true,
  isStarter: true,
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
  effects: [
    { at: 'onCast', kind: 'damage', amount: 10 },
    { at: 'onCast', kind: 'applyStatus', status: 'bleed', durationSec: 3, stacks: 1 },
  ],
  description: '10 damage. Applies Bleed x1 for 3.0s.',
  miniMalus: 'Bleed can be cleansed.',
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
  cooldownSec: 9,
  windupSec: 0.25,
  range: 2.2,
  targeting: 'forward',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 12 },
    { at: 'onCast', kind: 'applyStatus', status: 'stun', durationSec: 0.45, stacks: 1 },
    { at: 'onCast', kind: 'knockup', airborneSec: 0.35, knockbackDistance: 2.0 },
  ],
  description: '12 damage. Applies Stun 0.45s, Airborne 0.35s and 2.0m knockback.',
  miniMalus: '2.2m range. Parryable.',
  canParry: true,
  isStarter: true,
}

export const ABILITY_M6_RENDING_DASH: AbilityDef = {
  id: 'rending_dash',
  name: 'Rending Dash',
  slot: 'melee',
  element: 'none',
  weapon: 'sword',
  costMana: 0,
  costStamina: 35,
  cooldownSec: 11,
  windupSec: 0,
  range: 5,
  targeting: 'forward',
  effects: [
    { at: 'onCast', kind: 'move', mode: 'dash', distance: 5, cancelOnCollision: true },
    { at: 'onLand', kind: 'damage', amount: 16, radius: 1.4 },
    { at: 'onLand', kind: 'applyStatus', status: 'bleed', durationSec: 3, stacks: 1, radius: 1.4 },
  ],
  description: '5m forward dash. Landing hit deals 16 damage in 1.4m AoE and applies Bleed x1 for 3.0s.',
  miniMalus: 'Collision stops dash. Bleed can be cleansed.',
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
  cooldownSec: 6,
  windupSec: 0.5,
  range: 20,
  targeting: 'forward',
  effects: [
    {
      at: 'onCast',
      kind: 'projectile',
      speedMps: 70,
      gravityMps2: 0,
      damage: 25,
    },
  ],
  description: 'Flat projectile. 25 damage to first enemy hit.',
  miniMalus: '0.5s windup.',
  isStarter: true,
}

export const ABILITY_B2_VOLLEY: AbilityDef = {
  id: 'volley',
  name: 'Volley',
  slot: 'bow',
  element: 'none',
  weapon: 'bow',
  costMana: 0,
  costStamina: 0,
  cooldownSec: 10,
  windupSec: 0,
  range: 30,
  targeting: 'point',
  effects: [
    {
      at: 'onLand',
      kind: 'zone',
      radius: 4,
      durationSec: 1.2,
      tickEverySec: 0.4,
      damagePerTick: 12,
    },
  ],
  description: 'Point zone, 4m radius. Three waves over 1.2s, 12 damage per wave.',
  miniMalus: 'Zone is visible before damage.',
}

export const ABILITY_B3_PIN_SHOT: AbilityDef = {
  id: 'pin_shot',
  name: 'Pin Shot',
  slot: 'bow',
  element: 'none',
  weapon: 'bow',
  costMana: 0,
  costStamina: 0,
  cooldownSec: 10,
  windupSec: 0.8,
  range: 25,
  targeting: 'forward',
  effects: [
    {
      at: 'onCast',
      kind: 'projectile',
      speedMps: 65,
      gravityMps2: 2,
      damage: 15,
      onHitStatus: { status: 'root', durationSec: 0.8, stacks: 1 },
    },
  ],
  description: 'Projectile. 15 damage and Root 0.8s on hit.',
  miniMalus: '0.8s windup.',
}

export const ABILITY_B4_SNARE_TRAP: AbilityDef = {
  id: 'snare_trap',
  name: 'Snare Trap',
  slot: 'bow',
  element: 'none',
  weapon: 'bow',
  costMana: 0,
  costStamina: 0,
  cooldownSec: 12,
  windupSec: 0,
  range: 5,
  targeting: 'self',
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
      applyStatus: { status: 'root', durationSec: 1.0, stacks: 1 },
    },
  ],
  description: 'Self zone trap, 1.5m radius. Arms after 2.0s. First trigger deals 10 damage and Root 1.0s.',
  miniMalus: 'No effect before arm delay.',
}

export const ABILITY_B5_MARKSMAN_SHOT: AbilityDef = {
  id: 'marksman_shot',
  name: 'Marksman Shot',
  slot: 'bow',
  element: 'none',
  weapon: 'bow',
  costMana: 20,
  costStamina: 0,
  cooldownSec: 15,
  windupSec: 1.0,
  range: 100,
  targeting: 'forward',
  effects: [
    {
      at: 'onCast',
      kind: 'projectile',
      speedMps: 300,
      gravityMps2: 0,
      damage: 32,
    },
  ],
  description: 'Fast projectile. 32 damage. Costs 20 Mana.',
  miniMalus: '1.0s channel. Movement or damage interrupts.',
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
  description: '3m backward move and forward projectile for 12 damage.',
  miniMalus: 'Low damage.',
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
  effects: [
    {
      at: 'onCast',
      kind: 'projectile',
      speedMps: 62,
      gravityMps2: 2,
      damage: 14,
      onHitStatus: { status: 'bleed', durationSec: 4, stacks: 1 },
    },
  ],
  description: 'Projectile. 14 damage and Bleed x1 for 4.0s.',
  miniMalus: 'Projectile has gravity drop.',
  isStarter: true,
}

export const ABILITY_B8_BLAST_ARROW: AbilityDef = {
  id: 'blast_arrow',
  name: 'Blast Arrow',
  slot: 'bow',
  element: 'fire',
  weapon: 'bow',
  costMana: 15,
  costStamina: 0,
  cooldownSec: 12,
  windupSec: 0.45,
  range: 22,
  targeting: 'forward',
  effects: [
    {
      at: 'onCast',
      kind: 'projectile',
      speedMps: 52,
      gravityMps2: 3,
      damage: 18,
      splashRadius: 2.4,
      element: 'fire',
      onHitStatus: { status: 'burn', durationSec: 3, stacks: 1 },
    },
  ],
  description: 'Projectile splash, 2.4m radius. 18 damage and Burn x1 on hit.',
  miniMalus: 'Projectile has gravity drop.',
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
  cooldownSec: 5,
  windupSec: 0,
  range: 20,
  targeting: 'forward',
  effects: [
    {
      at: 'onCast',
      kind: 'projectile',
      speedMps: 25,
      gravityMps2: 4,
      damage: 22,
      splashRadius: 2,
      element: 'fire',
      onHitStatus: { status: 'burn', durationSec: 3, stacks: 1 },
    },
  ],
  description: 'Projectile splash, 2m radius. 22 damage and Burn x1 on hit.',
  miniMalus: '25 m/s projectile speed.',
  isStarter: true,
}

export const ABILITY_F2_FLAME_WALL: AbilityDef = {
  id: 'flame_wall',
  name: 'Flame Wall',
  slot: 'magic',
  element: 'fire',
  weapon: 'staff',
  costMana: 30,
  costStamina: 0,
  cooldownSec: 12,
  windupSec: 0,
  range: 10,
  targeting: 'point',
  effects: [
    {
      at: 'onLand',
      kind: 'zone',
      radius: 0,
      width: 6,
      durationSec: 3,
      tickEverySec: 1,
      damagePerTick: 8,
      element: 'fire',
      applyStatus: { status: 'burn', durationSec: 3, stacks: 1 },
    },
  ],
  description: 'Forward wall zone, 6m wide, 3.0s duration. Deals 8 damage per tick and applies Burn x1.',
  miniMalus: 'Fixed placement.',
  isStarter: true,
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
  effects: [{ at: 'onCast', kind: 'applyStatus', status: 'burn', durationSec: 3, stacks: 3 }],
  description: 'Aim-lock hit within 12m. Applies Burn x3 for 3.0s.',
  miniMalus: 'No direct damage. Requires clear line of sight.',
}

export const ABILITY_F4_METEOR: AbilityDef = {
  id: 'meteor',
  name: 'Meteor',
  slot: 'magic',
  element: 'fire',
  weapon: 'staff',
  costMana: 40,
  costStamina: 0,
  cooldownSec: 18,
  windupSec: 1.5,
  range: 25,
  targeting: 'point',
  effects: [
    { at: 'onLand', kind: 'damage', amount: 40, radius: 3, element: 'fire' },
    {
      at: 'onLand',
      kind: 'applyStatus',
      status: 'burn',
      durationSec: 3,
      stacks: 1,
      radius: 3,
    },
  ],
  description: 'Point AoE, 3m radius. 40 damage and Burn x1 after 1.5s windup.',
  miniMalus: 'Impact area is visible during windup.',
}

export const ABILITY_F5_ERUPTION: AbilityDef = {
  id: 'eruption',
  name: 'Eruption',
  slot: 'magic',
  element: 'fire',
  weapon: 'staff',
  costMana: 30,
  costStamina: 0,
  cooldownSec: 14,
  windupSec: 0,
  range: 10,
  targeting: 'forward',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 10, radius: 2, element: 'fire' },
    { at: 'onCast', kind: 'knockup', airborneSec: 0.8, radius: 2, knockbackDistance: 1.2 },
  ],
  description: 'Aim-lock AoE, 2m radius. 10 damage, Airborne 0.8s and knockback.',
  miniMalus: 'Low direct damage.',
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
  cooldownSec: 10,
  windupSec: 0,
  range: 7,
  targeting: 'forward',
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
  description: '7m teleport. Leaves a 1.5m fire zone at origin for 1.2s, 6 damage per tick and Burn x1.',
  miniMalus: 'Blocked by occupied destination.',
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
  cooldownSec: 4,
  windupSec: 0,
  range: 20,
  targeting: 'forward',
  effects: [
    {
      at: 'onCast',
      kind: 'projectile',
      speedMps: 35,
      gravityMps2: 2,
      damage: 18,
      element: 'ice',
      onHitStatus: { status: 'chill', durationSec: 4, stacks: 1 },
    },
  ],
  description: 'Projectile. 18 damage and Chill x1 on hit. Chill x5 triggers Freeze.',
  miniMalus: 'Lower direct damage.',
  isStarter: true,
}

export const ABILITY_I2_ICE_WALL: AbilityDef = {
  id: 'ice_wall',
  name: 'Ice Wall',
  slot: 'magic',
  element: 'ice',
  weapon: 'staff',
  costMana: 30,
  costStamina: 0,
  cooldownSec: 15,
  windupSec: 0,
  range: 8,
  targeting: 'point',
  effects: [
    {
      at: 'onLand',
      kind: 'zone',
      radius: 0,
      width: 5,
      durationSec: 4,
      tickEverySec: 0.25,
      damagePerTick: 0,
      element: 'ice',
      applyStatus: { status: 'root', durationSec: 0.35, stacks: 1 },
    },
  ],
  description: '5m strip zone, 4.0s duration. Applies Root 0.35s on contact.',
  miniMalus: 'No damage.',
}

export const ABILITY_I3_BLIZZARD: AbilityDef = {
  id: 'blizzard',
  name: 'Blizzard',
  slot: 'magic',
  element: 'ice',
  weapon: 'staff',
  costMana: 30,
  costStamina: 0,
  cooldownSec: 15,
  windupSec: 0,
  range: 20,
  targeting: 'point',
  effects: [
    {
      at: 'onLand',
      kind: 'zone',
      radius: 7,
      durationSec: 5,
      tickEverySec: 1,
      damagePerTick: 5,
      element: 'ice',
      applyStatus: { status: 'slow', durationSec: 1.5, stacks: 1, slowFraction: 0.3 },
    },
  ],
  description: 'Point zone, 7m radius, 5.0s duration. Deals 5 damage per tick and Slow 30% for 1.5s.',
  miniMalus: 'No hard crowd control.',
}

export const ABILITY_I4_FREEZE_TARGET: AbilityDef = {
  id: 'freeze_target',
  name: 'Freeze Target',
  slot: 'magic',
  element: 'ice',
  weapon: 'staff',
  costMana: 35,
  costStamina: 0,
  cooldownSec: 16,
  windupSec: 0.5,
  range: 12,
  targeting: 'forward',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 8, element: 'ice' },
    { at: 'onCast', kind: 'applyStatus', status: 'freeze', durationSec: 1.2, stacks: 1 },
  ],
  description: 'Aim-lock hit within 12m. 8 damage and Freeze 1.2s.',
  miniMalus: '0.5s windup. Parryable. Requires clear line of sight.',
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
  cooldownSec: 14,
  windupSec: 1.0,
  range: 10,
  targeting: 'forward',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 12, element: 'ice' },
    { at: 'onCast', kind: 'knockup', airborneSec: 0.8, knockbackDistance: 1.0 },
  ],
  description: 'Aim-lock hit within 10m. 12 damage and Airborne 0.8s.',
  miniMalus: '1.0s windup.',
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
  effects: [
    { at: 'onCast', kind: 'damage', amount: 20, element: 'lightning' },
    { at: 'onCast', kind: 'damage', amount: 12, radius: 6, element: 'lightning', excludePrimary: true },
  ],
  description: 'Aim-lock hit within 15m. 20 damage to primary target and 12 damage arcs to enemies within 6m.',
  miniMalus: 'Arc requires nearby secondary targets.',
  isStarter: true,
}

export const ABILITY_L2_THUNDER_CLAP: AbilityDef = {
  id: 'thunder_clap',
  name: 'Thunder Clap',
  slot: 'magic',
  element: 'lightning',
  weapon: 'staff',
  costMana: 30,
  costStamina: 0,
  cooldownSec: 12,
  windupSec: 0,
  range: 3,
  targeting: 'self',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 20, radius: 3, element: 'lightning' },
    { at: 'onCast', kind: 'applyStatus', status: 'stun', durationSec: 0.5, stacks: 1, radius: 3 },
  ],
  description: 'Self AoE, 3m radius. 20 damage and Stun 0.5s.',
  miniMalus: 'Short range.',
}

export const ABILITY_L3_STORM_FIELD: AbilityDef = {
  id: 'storm_field',
  name: 'Storm Field',
  slot: 'magic',
  element: 'lightning',
  weapon: 'staff',
  costMana: 35,
  costStamina: 0,
  cooldownSec: 18,
  windupSec: 0,
  range: 20,
  targeting: 'point',
  effects: [
    {
      at: 'onLand',
      kind: 'zone',
      radius: 4,
      durationSec: 3,
      tickEverySec: 1.0 / 3,
      damagePerTick: 3,
      element: 'lightning',
    },
  ],
  description: 'Point zone, 4m radius, 3.0s duration. Deals 3 damage per tick.',
  miniMalus: 'Zone is visible.',
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
  effects: [
    { at: 'onCast', kind: 'move', mode: 'teleport', distance: 5, cancelOnCollision: true },
    { at: 'onCast', kind: 'damage', amount: 15, radius: 1, element: 'lightning' },
  ],
  description: '5m teleport. Exit AoE deals 15 damage in 1m radius.',
  miniMalus: 'Damage only at destination.',
}

export const ABILITY_L5_ARC_LIFT: AbilityDef = {
  id: 'arc_lift',
  name: 'Arc Lift',
  slot: 'magic',
  element: 'lightning',
  weapon: 'staff',
  costMana: 30,
  costStamina: 0,
  cooldownSec: 12,
  windupSec: 0,
  range: 15,
  targeting: 'forward',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 10, element: 'lightning' },
    { at: 'onCast', kind: 'knockup', airborneSec: 0.7, knockbackDistance: 1.6 },
  ],
  description: 'Aim-lock hit within 15m. 10 damage, Airborne 0.7s and knockback.',
  miniMalus: 'Requires line of sight.',
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
  effects: [
    {
      at: 'onCast',
      kind: 'projectile',
      speedMps: 28,
      gravityMps2: 3,
      damage: 20,
      element: 'dark',
      lifestealFraction: 0.1,
    },
  ],
  description: 'Projectile. 20 damage and 10% lifesteal.',
  miniMalus: '28 m/s projectile speed.',
  isStarter: true,
}

export const ABILITY_D2_CURSE_OF_WEAKNESS: AbilityDef = {
  id: 'curse_of_weakness',
  name: 'Curse of Weakness',
  slot: 'magic',
  element: 'dark',
  weapon: 'staff',
  costMana: 30,
  costStamina: 0,
  cooldownSec: 15,
  windupSec: 1.2,
  range: 15,
  targeting: 'forward',
  effects: [
    { at: 'onCast', kind: 'applyStatus', status: 'curse', durationSec: 5, stacks: 1 },
    { at: 'onCast', kind: 'applyStatus', status: 'blind', durationSec: 2, stacks: 1 },
  ],
  description: 'Aim-lock hit within 15m. Applies Curse 5.0s and Blind 2.0s.',
  miniMalus: '1.2s windup. Parryable. Requires clear line of sight.',
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
  cooldownSec: 14,
  windupSec: 0,
  range: 12,
  targeting: 'forward',
  effects: [
    {
      at: 'onCast',
      kind: 'channel',
      durationSec: 3,
      tickEverySec: 1,
      perTick: { at: 'onTick', kind: 'damage', amount: 8, element: 'dark' },
      lifestealFraction: 0.65,
      breakOnMove: true,
      breakOnDamage: true,
    },
  ],
  description: '3.0s channel. Deals 8 damage per tick and heals for 65% of damage dealt.',
  miniMalus: 'Movement or damage interrupts.',
}

export const ABILITY_D4_DARK_BARRIER: AbilityDef = {
  id: 'dark_barrier',
  name: 'Dark Barrier',
  slot: 'magic',
  element: 'dark',
  weapon: 'staff',
  costMana: 30,
  costStamina: 0,
  cooldownSec: 16,
  windupSec: 0,
  range: 0,
  targeting: 'self',
  effects: [
    {
      at: 'onCast',
      kind: 'applyStatus',
      status: 'shield',
      durationSec: 5,
      stacks: 30,
    },
  ],
  description: 'Self shield. Absorbs 30 damage for up to 5.0s.',
  miniMalus: 'No damage or movement effect.',
}

export const ABILITY_D5_VOID_SPIKE: AbilityDef = {
  id: 'void_spike',
  name: 'Void Spike',
  slot: 'magic',
  element: 'dark',
  weapon: 'staff',
  costMana: 30,
  costStamina: 0,
  cooldownSec: 13,
  windupSec: 0,
  range: 10,
  targeting: 'forward',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 18, element: 'dark' },
    { at: 'onCast', kind: 'knockup', airborneSec: 0.7, knockbackDistance: 1.8 },
  ],
  description: 'Aim-lock hit within 10m. 18 damage, Airborne 0.7s and knockback.',
  miniMalus: '10m range.',
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
  effects: [
    {
      at: 'onCast',
      kind: 'projectile',
      speedMps: 40,
      gravityMps2: 1.5,
      damage: 4,
      element: 'nature',
      onHitStatus: { status: 'poison', durationSec: 4, stacks: 1 },
    },
  ],
  description: 'Projectile. 4 damage and Poison x1 for 4.0s.',
  miniMalus: 'Low direct damage. Poison can be cleansed.',
}

export const ABILITY_N2_THORN_FIELD: AbilityDef = {
  id: 'thorn_field',
  name: 'Thorn Field',
  slot: 'magic',
  element: 'nature',
  weapon: 'staff',
  costMana: 35,
  costStamina: 0,
  cooldownSec: 16,
  windupSec: 0,
  range: 12,
  targeting: 'point',
  effects: [
    {
      at: 'onLand',
      kind: 'zone',
      radius: 3,
      durationSec: 5,
      tickEverySec: 1,
      damagePerTick: 5,
      element: 'nature',
    },
  ],
  description: 'Point zone, 3m radius, 5.0s duration. Deals 5 damage per tick.',
  miniMalus: 'No slow or root.',
}

export const ABILITY_N3_ENTANGLE: AbilityDef = {
  id: 'entangle',
  name: 'Entangle',
  slot: 'magic',
  element: 'nature',
  weapon: 'staff',
  costMana: 25,
  costStamina: 0,
  cooldownSec: 13,
  windupSec: 0.5,
  range: 10,
  targeting: 'forward',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 5, element: 'nature' },
    { at: 'onCast', kind: 'applyStatus', status: 'root', durationSec: 1.5, stacks: 1 },
  ],
  description: 'Aim-lock hit within 10m. 5 damage and Root 1.5s.',
  miniMalus: '0.5s windup. Requires clear line of sight.',
}

export const ABILITY_N4_HEALING_TOTEM: AbilityDef = {
  id: 'healing_totem',
  name: 'Healing Totem',
  slot: 'magic',
  element: 'nature',
  weapon: 'staff',
  costMana: 30,
  costStamina: 0,
  cooldownSec: 20,
  windupSec: 0,
  range: 0,
  targeting: 'self',
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
  description: '5.0s channel. Heals 8 HP per tick.',
  miniMalus: 'No burst heal.',
}

export const ABILITY_N5_ROOT_UPTHROW: AbilityDef = {
  id: 'root_upthrow',
  name: 'Root Upthrow',
  slot: 'magic',
  element: 'nature',
  weapon: 'staff',
  costMana: 30,
  costStamina: 0,
  cooldownSec: 14,
  windupSec: 0,
  range: 10,
  targeting: 'forward',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 8, element: 'nature' },
    { at: 'onCast', kind: 'knockup', airborneSec: 0.9, requiresGroundedTarget: true },
  ],
  description: 'Aim-lock hit within 10m. 8 damage and Airborne 0.9s.',
  miniMalus: 'Requires grounded target.',
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
  cooldownSec: 12,
  windupSec: 0,
  range: 5,
  targeting: 'forward',
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
      applyStatus: { status: 'root', durationSec: 1.2, stacks: 1 },
    },
  ],
  description: '5m dash. Leaves 2m zone for 2.5s that applies Root on contact.',
  miniMalus: 'Collision stops dash.',
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
  cooldownSec: 20,
  windupSec: 0,
  range: 0,
  targeting: 'self',
  effects: [
    {
      at: 'onCast',
      kind: 'channel',
      durationSec: 2,
      tickEverySec: 1,
      perTick: { at: 'onTick', kind: 'heal', amount: 20 },
      breakOnMove: false,
    },
  ],
  description: 'Self heal over 2.0s. Restores 40 HP total.',
  miniMalus: 'Healing is delayed over time.',
  isStarter: true,
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
  effects: [{ at: 'onCast', kind: 'move', mode: 'dash', distance: 4, useMovementDirection: true, cancelOnCollision: true }],
  description: '4m dash in movement direction.',
  miniMalus: 'No invulnerability.',
  isStarter: true,
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
  effects: [
    { at: 'onCast', kind: 'damage', amount: 8 },
    { at: 'onCast', kind: 'applyStatus', status: 'mark', durationSec: 5, stacks: 1 },
  ],
  description: 'Aim-lock hit within 30m. 8 damage and Mark 5.0s.',
  miniMalus: 'Low damage. Requires clear line of sight.',
}

export const ABILITY_U4_CLEANSE_SURGE: AbilityDef = {
  id: 'cleanse_surge',
  name: 'Cleanse Surge',
  slot: 'utility',
  element: 'none',
  weapon: 'none',
  costMana: 0,
  costStamina: 20,
  cooldownSec: 18,
  windupSec: 0,
  range: 0,
  targeting: 'self',
  effects: [
    { at: 'onCast', kind: 'cleanse' },
    { at: 'onCast', kind: 'applyStatus', status: 'haste', durationSec: 2, stacks: 1 },
  ],
  description: 'Full cleanse. Applies Haste 2.0s.',
  miniMalus: 'No healing.',
}

export const ABILITY_U5_BARRIER: AbilityDef = {
  id: 'barrier',
  name: 'Barrier',
  slot: 'utility',
  element: 'none',
  weapon: 'none',
  costMana: 0,
  costStamina: 0,
  cooldownSec: 18,
  windupSec: 0,
  range: 0,
  targeting: 'self',
  effects: [{ at: 'onCast', kind: 'applyStatus', status: 'shield', durationSec: 8, stacks: 35 }],
  description: 'Self shield. Absorbs 35 damage for up to 8.0s.',
  miniMalus: 'No cleanse or heal.',
  isStarter: true,
}

export const ABILITY_U6_ENERGIZE: AbilityDef = {
  id: 'energize',
  name: 'Energize',
  slot: 'utility',
  element: 'none',
  weapon: 'none',
  costMana: 0,
  costStamina: 0,
  cooldownSec: 12,
  windupSec: 0,
  range: 0,
  targeting: 'self',
  effects: [{ at: 'onCast', kind: 'restoreStamina', amount: 35 }],
  description: 'Restores 35 Stamina instantly.',
  miniMalus: 'No Mana restore.',
  isStarter: true,
}

export const ABILITY_U7_PHASE_SHIFT: AbilityDef = {
  id: 'phase_shift',
  name: 'Phase Shift',
  slot: 'utility',
  element: 'none',
  weapon: 'none',
  costMana: 0,
  costStamina: 15,
  cooldownSec: 22,
  windupSec: 0,
  range: 0,
  targeting: 'self',
  effects: [{ at: 'onCast', kind: 'applyStatus', status: 'invulnerable', durationSec: 0.6, stacks: 1 }],
  description: 'Invulnerable 0.6s. Prevents damage and crowd control.',
  miniMalus: 'Cannot attack or cast during phase.',
}

export const ABILITY_U8_SMOKE_SCREEN: AbilityDef = {
  id: 'smoke_screen',
  name: 'Smoke Screen',
  slot: 'utility',
  element: 'none',
  weapon: 'none',
  costMana: 20,
  costStamina: 0,
  cooldownSec: 16,
  windupSec: 0,
  range: 8,
  targeting: 'forward',
  effects: [
    {
      at: 'onCast',
      kind: 'zone',
      radius: 3.5,
      durationSec: 3,
      tickEverySec: 0.5,
      applyStatus: { status: 'blind', durationSec: 0.8, stacks: 1 },
    },
  ],
  description: 'Forward smoke zone, 3.5m radius, 3.0s duration. Applies Blind repeatedly.',
  miniMalus: 'No damage.',
}

// ── Transfer (Transmutation) utilities ───────────────────────────────────────
// These convert one resource to another at the ratios defined in
// 04_transmutation.md. They occupy fixed utility slots and are cast via Z/X/F.

export const ABILITY_U9_TRANSFER_HP_MANA: AbilityDef = {
  id: 'transfer_hp_mana',
  name: 'HP → Mana',
  slot: 'utility',
  element: 'none',
  weapon: 'none',
  costMana: 0,
  costStamina: 0,
  cooldownSec: 5,
  windupSec: 0,
  range: 0,
  targeting: 'self',
  effects: [{ at: 'onCast', kind: 'transmute', direction: 'hp_mana' }],
  description: 'Spend 20 HP to gain 20 Mana.',
  miniMalus: 'Requires more than 20 HP.',
}

export const ABILITY_U10_TRANSFER_MANA_STAM: AbilityDef = {
  id: 'transfer_mana_stam',
  name: 'Mana → Stamina',
  slot: 'utility',
  element: 'none',
  weapon: 'none',
  costMana: 0,
  costStamina: 0,
  cooldownSec: 5,
  windupSec: 0,
  range: 0,
  targeting: 'self',
  effects: [{ at: 'onCast', kind: 'transmute', direction: 'mana_stam' }],
  description: 'Spend 20 Mana to gain 20 Stamina.',
  miniMalus: 'Requires 20 Mana.',
}

export const ABILITY_U11_TRANSFER_STAM_HP: AbilityDef = {
  id: 'transfer_stam_hp',
  name: 'Stamina → HP',
  slot: 'utility',
  element: 'none',
  weapon: 'none',
  costMana: 0,
  costStamina: 0,
  cooldownSec: 5,
  windupSec: 0,
  range: 0,
  targeting: 'self',
  effects: [{ at: 'onCast', kind: 'transmute', direction: 'stam_hp' }],
  description: 'Spend 30 Stamina to gain 20 HP.',
  miniMalus: 'Requires 30 Stamina.',
}

// ============================================================================
// REGISTRY
// ============================================================================

export const ABILITY_DEFS: AbilityRegistry = Object.freeze({
  // Melee
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
  // Transfers (Transmutation as utility)
  transfer_hp_mana: ABILITY_U9_TRANSFER_HP_MANA,
  transfer_mana_stam: ABILITY_U10_TRANSFER_MANA_STAM,
  transfer_stam_hp: ABILITY_U11_TRANSFER_STAM_HP,
})

export function getAbilityDef(id: string): AbilityDef | null {
  return ABILITY_DEFS[id] ?? null
}

export function abilityIds(): readonly string[] {
  return Object.keys(ABILITY_DEFS)
}
