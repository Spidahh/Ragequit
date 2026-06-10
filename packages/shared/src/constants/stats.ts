// Base character stats at spawn / full reset.
// Authority: 01_DESIGN/01_stats.md.
// Any magic number in sim code referencing player stats MUST come from here.

export const HP_MAX = 200 as const
// Mana bumped 100→120: magic builds were burning dry after 3 casts.
// With 2.5/s regen this gives ~12 s to a full refill from 0 — still
// resource-managed but not punishing enough to make magic unplayable.
export const MANA_MAX = 120 as const
export const STAMINA_MAX = 100 as const

// Regen rates per second. Applied each tick at TICK_RATE_HZ.
// HP regen only triggers when out of combat (5 s since last damage dealt/taken).
// Mana regen only triggers after a 2 s pause from last mana spend.
// Stamina regen differs standing vs moving.
//
// Balance rationale (TTK target 20-30 s):
//   OOC HP regen: 0.5→2.0/s — 0.5 was invisible noise; 2/s = 100s to full,
//   still slow but means being at 180 HP after a skirmish recovery break.
//   Mana regen: 8.0/s + 0.5 s delay — sustainable casting; a mage can
//   cast Fireball (20 mp) and recover in ~3 s.
export const HP_REGEN_PER_SEC_OOC = 2.0 as const
export const HP_REGEN_OOC_DELAY_SEC = 5 as const

export const MANA_REGEN_PER_SEC = 8.0 as const // bumped 2.5→8: felt impossible to sustain a fight
export const MANA_REGEN_DELAY_SEC = 0.5 as const // bumped 2→0.5: shorter pause before regen kicks in

export const STAMINA_REGEN_PER_SEC_IDLE = 10 as const
export const STAMINA_REGEN_PER_SEC_MOVING = 5 as const

// Movement.
export const MOVE_SPEED_MPS = 9.0 as const

// Jump.
export const JUMP_HEIGHT_TAP_M = 1.5 as const
export const JUMP_COST_STAMINA = 10 as const

// Spawn protection.
export const SPAWN_INVULN_SEC = 2 as const

// Curse of Weakness: fraction by which the cursed player's outgoing damage is
// multiplied. 0.6 → 40 % reduction, lasting 5 s per cast.
export const CURSE_OUTGOING_DAMAGE_MULT = 0.6 as const
