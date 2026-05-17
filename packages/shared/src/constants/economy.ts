// Transmutation ratios and cooldowns.
// Authority: 01_DESIGN/04_transmutation.md.

// Each direction has its own independent 5 s cooldown. They do not share.
export const TRANSMUTE_COOLDOWN_SEC = 5 as const

// HP -> Mana: pay 20 HP, gain 20 Mana.
export const TRANSMUTE_HP_TO_MANA_COST_HP = 20 as const
export const TRANSMUTE_HP_TO_MANA_GAIN_MANA = 20 as const

// Mana -> Stamina: pay 20 Mana, gain 20 Stamina.
export const TRANSMUTE_MANA_TO_STAM_COST_MANA = 20 as const
export const TRANSMUTE_MANA_TO_STAM_GAIN_STAM = 20 as const

// Stamina -> HP: pay 30 Stamina, gain 20 HP (30:20 penalty — emergency tool only).
export const TRANSMUTE_STAM_TO_HP_COST_STAM = 30 as const
export const TRANSMUTE_STAM_TO_HP_GAIN_HP = 20 as const
