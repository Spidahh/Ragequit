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
  comboRole: 'pressure',
  effects: [
    {
      at: 'onCast',
      kind: 'channel',
      durationSec: 1.0,
      tickEverySec: 1.0 / 3,
      perTick: { at: 'onTick', kind: 'damage', amount: 7, radius: 4 },
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
    'Spin for 1.0s. Three 4m cleave ticks for 7 damage each. Self Slow 20% while spinning.',
  miniMalus: 'Committed channel; movement is reduced during the spin.',
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
  description: '6m engage dash. Landing hit deals 18 damage in 1.5m and applies Slow 50% for 3.0s.',
  miniMalus: 'Linear engage; collision stops the dash and contact is parryable.',
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
  comboRole: 'starter',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 16 },
    { at: 'onCast', kind: 'knockup', airborneSec: 1.0, knockbackDistance: 0.8 },
  ],
  description: '16 damage. Launches the target Airborne 1.0s with a small 0.8m pop.',
  miniMalus: '0.4s windup. Parryable.',
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
  cooldownSec: 10,
  windupSec: 0.25,
  range: 2.2,
  targeting: 'forward',
  comboRole: 'starter',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 10 },
    { at: 'onCast', kind: 'applyStatus', status: 'stun', durationSec: 1.5, stacks: 1 },
    { at: 'onCast', kind: 'knockup', airborneSec: 0.45, knockbackDistance: 1.2 },
  ],
  description: '10 damage. Applies Stun 1.5s plus a short 0.45s pop.',
  miniMalus: 'Very short 2.2m reach and fully parryable.',
  canParry: true,
}

export const ABILITY_M6_RENDING_DASH: AbilityDef = {
  id: 'rending_dash',
  name: 'Rending Dash',
  slot: 'melee',
  element: 'none',
  weapon: 'sword',
  costMana: 0,
  costStamina: 35,
  cooldownSec: 10,
  windupSec: 0,
  range: 5,
  targeting: 'forward',
  comboRole: 'mobility',
  effects: [
    { at: 'onCast', kind: 'move', mode: 'dash', distance: 5, cancelOnCollision: true },
    { at: 'onLand', kind: 'damage', amount: 14, radius: 1.6 },
    { at: 'onLand', kind: 'applyStatus', status: 'bleed', durationSec: 4, stacks: 1, radius: 1.6 },
  ],
  description:
    '5m slash-through dash. Landing hit deals 14 damage in 1.6m and applies Bleed for 4.0s.',
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
      damage: 28,
    },
  ],
  description: 'Fast line shot. 28 damage with 150 m/s projectile speed.',
  miniMalus: 'Narrow shot; misses hard against lateral movement.',
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
  comboRole: 'finisher',
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
    'Arcing arrow rain on a 3.5m point zone. Three waves deal 11 damage and Slow 45% for 3.0s.',
  miniMalus: 'Telegraphed landing zone; targets can leave before waves land.',
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
  description: 'Control arrow. 14 damage and Root 2.8s on hit.',
  miniMalus: '0.8s windup. Requires clear aim and line of sight.',
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
    'Self zone trap, 1.5m radius. Arms after 2.0s. First trigger deals 10 damage and Root 3.0s.',
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
  comboRole: 'finisher',
  effects: [
    {
      at: 'onCast',
      kind: 'projectile',
      speedMps: 500,
      gravityMps2: 0,
      damage: 38,
    },
  ],
  description: 'Precision shot. 38 damage at 500 m/s after a 1.0s windup.',
  miniMalus: '1.0s exposed aim; damage can interrupt before release.',
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
  description: 'Heavy arrow. 14 damage and Bleed for 4.0s on hit.',
  miniMalus: 'Arc drop makes long shots require lead.',
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
  comboRole: 'finisher',
  effects: [
    {
      at: 'onCast',
      kind: 'projectile',
      speedMps: 44,
      gravityMps2: 5,
      damage: 22,
      splashRadius: 3,
      element: 'fire',
      onHitStatus: { status: 'burn', durationSec: 3, stacks: 2 },
    },
  ],
  description: 'Palombella explosive arrow. 22 splash damage in 3m and Burn x2 on impact.',
  miniMalus: 'Slow heavy arc; distant targets can dodge the impact point.',
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
  comboRole: 'finisher',
  effects: [
    {
      at: 'onCast',
      kind: 'projectile',
      speedMps: 30,
      gravityMps2: 5,
      damage: 24,
      splashRadius: 2.6,
      element: 'fire',
      onHitStatus: { status: 'burn', durationSec: 3, stacks: 1 },
    },
  ],
  description: 'Arcing fire orb. 24 splash damage in 2.6m and Burn x1 on impact.',
  miniMalus: 'Visible travel arc; lateral movement can dodge it.',
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
  comboRole: 'extender',
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
  description: 'Point wall, 7m wide for 3.5s. Ticks 6 damage and applies Burn x1.',
  miniMalus: 'Visible wall. No instant burst on cast.',
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
  comboRole: 'ray',
  effects: [{ at: 'onCast', kind: 'applyStatus', status: 'burn', durationSec: 3, stacks: 3 }],
  description:
    'Instant ray within 12m. Applies Burn x3 if the enemy is in the crosshair and line of sight.',
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
  comboRole: 'finisher',
  effects: [
    { at: 'onLand', kind: 'damage', amount: 44, radius: 3.5, element: 'fire' },
    {
      at: 'onLand',
      kind: 'applyStatus',
      status: 'burn',
      durationSec: 3,
      stacks: 1,
      radius: 3.5,
    },
  ],
  description: 'Heavy palombella impact. 44 damage in 3.5m and Burn x1 after a visible windup.',
  miniMalus: 'Long windup and visible impact point.',
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
  comboRole: 'starter',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 8, radius: 2.4, element: 'fire' },
    { at: 'onCast', kind: 'knockup', airborneSec: 0.9, radius: 2.4, knockbackDistance: 1.0 },
  ],
  description: 'Instant ray detonates under the aimed enemy. 8 damage in 2.4m and Airborne 0.9s.',
  miniMalus: 'Low direct damage and short detonation range.',
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
    '7m teleport. Leaves a 1.5m fire zone at origin for 1.2s, 6 damage per tick and Burn x1.',
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
      onHitStatus: { status: 'chill', durationSec: 6, stacks: 1 },
    },
  ],
  description:
    'Fast frost projectile. 16 damage and Chill x1 (6.0s); repeated hits build toward Freeze.',
  miniMalus: 'Lower direct damage than fire or bow finishers.',
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
  comboRole: 'extender',
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
  description: '6m ice strip for 4.5s. Repeatedly applies Root 1.5s to deny a lane.',
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
  comboRole: 'extender',
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
  description: 'Large 7m storm for 5.0s. Ticks 4 damage and applies Slow 60% for 3.5s.',
  miniMalus: 'No hard lock; enemies can still shoot or dash out.',
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
  comboRole: 'ray',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 8, element: 'ice' },
    { at: 'onCast', kind: 'applyStatus', status: 'freeze', durationSec: 2.5, stacks: 1 },
  ],
  description: 'Instant ray within 12m. 8 damage and Freeze 2.5s.',
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
  comboRole: 'starter',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 12, element: 'ice' },
    { at: 'onCast', kind: 'knockup', airborneSec: 1.0, knockbackDistance: 0.6 },
  ],
  description: 'Ray pillar within 10m. 12 damage and Airborne 1.0s with minimal shove.',
  miniMalus: '1.0s windup gives enemies time to dodge or interrupt.',
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
  comboRole: 'ray',
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
    'Instant ray within 15m. 22 damage to the aimed target and 10 damage arcs to nearby enemies.',
  miniMalus: 'Arc requires nearby secondary targets.',
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
  comboRole: 'counter',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 16, radius: 3.2, element: 'lightning' },
    { at: 'onCast', kind: 'applyStatus', status: 'stun', durationSec: 1.8, stacks: 1, radius: 3.2 },
  ],
  description: 'Self shockwave in 3.2m. 16 damage and Stun 1.8s.',
  miniMalus: 'Short range; whiffs if used before contact.',
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
  comboRole: 'extender',
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
  description: '4.5m storm field for 3.2s. Ticks 4 damage and applies Slow 45% for 2.0s.',
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
  comboRole: 'mobility',
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
  comboRole: 'starter',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 8, element: 'lightning' },
    { at: 'onCast', kind: 'knockup', airborneSec: 0.8, knockbackDistance: 1.4 },
  ],
  description: 'Instant ray within 15m. 8 damage, Airborne 0.8s and backward jolt.',
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
    },
  ],
  description: 'Dark projectile. 18 damage and 25% lifesteal on hit.',
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
  cooldownSec: 14,
  windupSec: 0.35,
  range: 15,
  targeting: 'forward',
  comboRole: 'starter',
  effects: [
    { at: 'onCast', kind: 'applyStatus', status: 'curse', durationSec: 5, stacks: 1 },
    { at: 'onCast', kind: 'applyStatus', status: 'blind', durationSec: 4.0, stacks: 1 },
    { at: 'onCast', kind: 'resourceDrain', resource: 'mana', amount: 18, gainFraction: 0.5 },
  ],
  description: 'Ray hex within 15m. Curse 5.0s, Blind 4.0s and drains 18 Mana, refunding half.',
  miniMalus: 'Short windup and line of sight required; parryable.',
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
  comboRole: 'drain',
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
    'Drain beam. Drains 20 Stamina, then channels 4 ticks of 6 damage with 70% lifesteal.',
  miniMalus: 'Movement or damage interrupts the beam.',
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
  description: 'Self barrier. Absorbs 38 damage for up to 5.0s.',
  miniMalus: 'No damage, cleanse or movement.',
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
  comboRole: 'starter',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 14, element: 'dark' },
    { at: 'onCast', kind: 'knockup', airborneSec: 0.9, knockbackDistance: 1.0 },
    { at: 'onCast', kind: 'resourceDrain', resource: 'mana', amount: 12, gainFraction: 0.5 },
  ],
  description: 'Void ray within 10m. 14 damage, Airborne 0.9s and drains 12 Mana.',
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
  description: 'Fast dart. 8 damage and Poison for 4.0s on hit.',
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
  cooldownSec: 16,
  windupSec: 0,
  range: 12,
  targeting: 'point',
  comboRole: 'extender',
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
  description: '3.5m thorn zone for 5.0s. Ticks 4 damage and applies Slow 50% for 3.0s.',
  miniMalus: 'Visible zone; no instant burst.',
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
  comboRole: 'ray',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 4, element: 'nature' },
    { at: 'onCast', kind: 'applyStatus', status: 'root', durationSec: 3.2, stacks: 1 },
  ],
  description: 'Instant root ray within 10m. 4 damage and Root 3.2s.',
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
  comboRole: 'starter',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 8, element: 'nature' },
    { at: 'onCast', kind: 'knockup', airborneSec: 1.1, requiresGroundedTarget: true },
  ],
  description: 'Grounded target ray. 8 damage and Airborne 1.1s.',
  miniMalus: 'Fails against already airborne targets.',
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
  description: '5m dash. Leaves 2m zone for 2.5s that applies Root 2.8s on contact.',
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
  description: 'Self heal over 2.0s. Restores 40 HP total.',
  miniMalus: 'Healing is delayed over time.',
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
  description: '4m dash in movement direction.',
  miniMalus: 'No invulnerability.',
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
  comboRole: 'drain',
  effects: [
    { at: 'onCast', kind: 'damage', amount: 6 },
    { at: 'onCast', kind: 'applyStatus', status: 'mark', durationSec: 5, stacks: 1 },
    { at: 'onCast', kind: 'resourceDrain', resource: 'stamina', amount: 12, gainFraction: 0 },
  ],
  description: 'Utility ray within 30m. Marks for 5.0s, deals 6 damage and drains 12 Stamina.',
  miniMalus: 'Low direct damage and clear line of sight required.',
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
  comboRole: 'counter',
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
  comboRole: 'survival',
  effects: [{ at: 'onCast', kind: 'applyStatus', status: 'shield', durationSec: 8, stacks: 42 }],
  description: 'Self shield. Absorbs 42 damage for up to 8.0s.',
  miniMalus: 'No cleanse or heal.',
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
  comboRole: 'resource',
  effects: [{ at: 'onCast', kind: 'restoreStamina', amount: 35 }],
  description: 'Restores 35 Stamina instantly.',
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
  cooldownSec: 22,
  windupSec: 0,
  range: 0,
  targeting: 'self',
  comboRole: 'counter',
  effects: [
    { at: 'onCast', kind: 'applyStatus', status: 'invulnerable', durationSec: 0.6, stacks: 1 },
  ],
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
  comboRole: 'extender',
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
  description: 'Forward smoke zone, 3.5m radius for 3.5s. Repeatedly applies Blind 3.0s.',
  miniMalus: 'No damage.',
}

export const ABILITY_U_BRACE_RECOVERY: AbilityDef = {
  id: 'brace_recovery',
  name: 'Brace Recovery',
  slot: 'utility',
  targetSlotFamily: 'utility',
  targetLegalClasses: ['tank'],
  element: 'none',
  weapon: 'none',
  costMana: 0,
  costStamina: 40,
  cooldownSec: 15,
  windupSec: 0,
  range: 0,
  targeting: 'self',
  comboRole: 'survival',
  effects: [
    { at: 'onCast', kind: 'heal', amount: 50 },
    { at: 'onCast', kind: 'applyStatus', status: 'shield', durationSec: 3, stacks: 20 },
  ],
  description:
    'Spend 40 Stamina to restore 50 HP and gain a 20 damage shield for 3.0s. If Fury is at 5, consumes it to heal 100 HP instead.',
  miniMalus: 'High Stamina cost leaves you vulnerable to pressure.',
}

export const ABILITY_U_HUNTERS_FLOW: AbilityDef = {
  id: 'hunters_flow',
  name: "Hunter's Flow",
  slot: 'utility',
  targetSlotFamily: 'utility',
  targetLegalClasses: ['archer'],
  element: 'none',
  weapon: 'none',
  costMana: 20,
  costStamina: 10,
  cooldownSec: 14,
  windupSec: 0,
  range: 0,
  targeting: 'self',
  comboRole: 'survival',
  effects: [
    { at: 'onCast', kind: 'heal', amount: 35 },
    { at: 'onCast', kind: 'move', mode: 'dash', distance: 3, useMovementDirection: true },
  ],
  description:
    'Spend 20 Mana and 10 Stamina to restore 35 HP while performing a quick 3m dash in your movement direction. Gains +25 HP extra healing if Momentum is above 60.',
  miniMalus: 'Dash has no invulnerability frames.',
}

export const ABILITY_U_ARCANE_REBIND: AbilityDef = {
  id: 'arcane_rebind',
  name: 'Arcane Rebind',
  slot: 'utility',
  targetSlotFamily: 'utility',
  targetLegalClasses: ['mage'],
  element: 'none',
  weapon: 'none',
  costMana: 45,
  costStamina: 0,
  cooldownSec: 16,
  windupSec: 0.5,
  range: 0,
  targeting: 'self',
  comboRole: 'survival',
  effects: [{ at: 'onCast', kind: 'heal', amount: 60 }],
  description:
    'Spend 45 Mana to channel arcana for 0.5s, restoring 60 HP. If a Risonanza elemental window is active, consumes it to heal 110 HP instead.',
  miniMalus: '0.5s windup leaves you vulnerable to interrupts.',
}

export const ABILITY_U_ADAPTIVE_MEND: AbilityDef = {
  id: 'adaptive_mend',
  name: 'Adaptive Mend',
  slot: 'utility',
  targetSlotFamily: 'utility',
  targetLegalClasses: ['hybrid'],
  element: 'none',
  weapon: 'none',
  costMana: 15,
  costStamina: 15,
  cooldownSec: 12,
  windupSec: 0,
  range: 0,
  targeting: 'self',
  comboRole: 'survival',
  effects: [{ at: 'onCast', kind: 'heal', amount: 30 }],
  description:
    'Spend 15 Mana and 15 Stamina to restore 30 HP. If Flow stacks are at 3, consumes them to heal 70 HP instead.',
  miniMalus: 'Low base healing if not amplified by weapon swaps.',
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
