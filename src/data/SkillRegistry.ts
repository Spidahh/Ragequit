/**
 * SKILL REGISTRY
 * 
 * Central data source for all skills in RAGEQUIT 2.
 * Every skill is defined here. NO hardcoded stats in components.
 * Data-driven architecture per _TECH_SPEC.md
 */

export type SkillType = 'MELEE' | 'RANGED' | 'MAGIC' | 'UTILITY'
export type Delivery = 'HITSCAN' | 'PROJECTILE' | 'INSTANT' | 'AREA'

export interface SkillDef {
  // Identity
  id: string
  name: string
  icon: string // Path to assets

  // Logic
  type: SkillType
  delivery: Delivery

  // Balance Stats
  damage: number
  manaCost: number
  cooldown: number // seconds

  // Visual Assets (DUAL RENDERING)
  // WorldModel: Cosa vedono gli altri e tu in 3za persona
  worldModel: string // es. "sword_iron_back.glb"

  // ViewModel: Cosa vedi tu in 1ma persona (braccia + arma)
  viewModel: string // es. "hands_holding_sword.glb"

  // The "Juice" Params (PvP Feel)
  force: number // Knockback force
  hitStop: number // Freeze duration (ms)
  screenShake: number // Tremolo intensity (0-1)
  gibFactor: number // 0 = Ragdoll, 1 = Blood explosion

  // Assets
  soundId?: string
  color: string // Trail/particle color
}

/**
 * TEST SKILLS FOR PVP
 * 
 * These 3 skills cover the full spectrum:
 * - Melee (up close, instant feedback)
 * - Ranged (hitscan, precision)
 * - Magic (projectile, area control)
 */
export const SKILL_REGISTRY: SkillDef[] = [
  {
    id: 'iron_greatsword',
    name: 'Iron Greatsword',
    icon: '/assets/icons/greatsword.png',
    type: 'MELEE',
    delivery: 'INSTANT',
    damage: 45,
    manaCost: 0,
    cooldown: 0.8,
    worldModel: '/assets/models/sword_iron_back.glb',
    viewModel: '/assets/models/hands_holding_sword.glb',
    force: 20,
    hitStop: 150, // HIGH hitstop for melee
    screenShake: 0.8,
    gibFactor: 0.3,
    color: '#888888',
  },
  {
    id: 'railgun_prototype',
    name: 'Railgun Prototype',
    icon: '/assets/icons/railgun.png',
    type: 'RANGED',
    delivery: 'HITSCAN',
    damage: 60,
    manaCost: 0,
    cooldown: 1.2,
    worldModel: '/assets/models/railgun_equipped.glb',
    viewModel: '/assets/models/hands_holding_railgun.glb',
    force: 5,
    hitStop: 80,
    screenShake: 0.5,
    gibFactor: 0.2,
    color: '#0099ff',
  },
  {
    id: 'magma_ball',
    name: 'Magma Ball',
    icon: '/assets/icons/magma.png',
    type: 'MAGIC',
    delivery: 'PROJECTILE',
    damage: 50,
    manaCost: 30,
    cooldown: 2.0,
    worldModel: '/assets/models/orb_magic_glowing.glb',
    viewModel: '/assets/models/hands_casting_magma.glb',
    force: 15,
    hitStop: 120,
    screenShake: 1.0,
    gibFactor: 0.8, // HIGH gibs on magic
    color: '#ff6600',
  },
]

/**
 * Helper: Get skill by ID
 */
export function getSkillById(id: string): SkillDef | undefined {
  return SKILL_REGISTRY.find((skill) => skill.id === id)
}

/**
 * Helper: Get skill by slot (0-9)
 * Used when player has loaded a loadout
 */
export function getSkillByLoadoutSlot(
  loadout: string[], // Array of skill IDs
  slotIndex: number
): SkillDef | undefined {
  const skillId = loadout[slotIndex]
  return skillId ? getSkillById(skillId) : undefined
}
