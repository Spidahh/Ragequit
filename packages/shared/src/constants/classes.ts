import type { WeaponId } from './weapons.js'

// Class vocabulary and slot grammar shared by client and server.

export const CLASS_IDS = ['tank', 'archer', 'mage', 'hybrid'] as const
export type ClassId = (typeof CLASS_IDS)[number]

export const TARGET_ABILITY_SLOT_FAMILIES = [
  'melee',
  'bow',
  'magicBase',
  'magicAdvanced',
  'utility',
] as const
export type TargetAbilitySlotFamily = (typeof TARGET_ABILITY_SLOT_FAMILIES)[number]

export interface ClassResourceMaxima {
  hp: number
  mana: number
  stamina: number
}

export interface ClassSlotGrammar {
  melee: number
  bow: number
  magicBase: number
  magicAdvanced: number
  utility: number
}

export interface ClassTargetDefinition {
  id: ClassId
  label: string
  resourceMaxima: ClassResourceMaxima
  slots: ClassSlotGrammar
  weapons: readonly WeaponId[]
  recoveryId: 'brace_recovery' | 'hunters_flow' | 'arcane_rebind' | 'adaptive_mend'
}

export const TARGET_CLASS_DEFS = {
  tank: {
    id: 'tank',
    label: 'Tank',
    resourceMaxima: { hp: 250, mana: 50, stamina: 150 },
    slots: { melee: 3, bow: 2, magicBase: 0, magicAdvanced: 0, utility: 3 },
    weapons: ['sword', 'bow'],
    recoveryId: 'brace_recovery',
  },
  archer: {
    id: 'archer',
    label: 'Arciere',
    resourceMaxima: { hp: 175, mana: 80, stamina: 110 },
    slots: { melee: 0, bow: 3, magicBase: 3, magicAdvanced: 0, utility: 2 },
    weapons: ['bow', 'staff'],
    recoveryId: 'hunters_flow',
  },
  mage: {
    id: 'mage',
    label: 'Mago',
    resourceMaxima: { hp: 150, mana: 160, stamina: 80 },
    slots: { melee: 0, bow: 0, magicBase: 3, magicAdvanced: 2, utility: 3 },
    weapons: ['staff'],
    recoveryId: 'arcane_rebind',
  },
  hybrid: {
    id: 'hybrid',
    label: 'Ibrido',
    resourceMaxima: { hp: 200, mana: 100, stamina: 100 },
    slots: { melee: 1, bow: 1, magicBase: 2, magicAdvanced: 2, utility: 2 },
    weapons: ['sword', 'bow', 'staff'],
    recoveryId: 'adaptive_mend',
  },
} as const satisfies Readonly<Record<ClassId, ClassTargetDefinition>>

export const TARGET_LOADOUT_SLOT_COUNT = 8 as const

export function targetClassSlotCount(classId: ClassId): number {
  return Object.values(TARGET_CLASS_DEFS[classId].slots).reduce<number>(
    (total, count) => total + count,
    0,
  )
}

const ABILITY_LEGAL_CLASSES: Record<string, readonly ClassId[]> = {
  // Melee
  whirlwind: ['tank', 'hybrid'],
  gap_closer: ['tank', 'hybrid'],
  uppercut: ['tank', 'hybrid'],
  bleed_strike: ['tank', 'hybrid'],
  guard_break: ['tank', 'hybrid'],
  rending_dash: ['tank', 'hybrid'],

  // Bow
  piercing_shot: ['tank', 'archer', 'hybrid'],
  volley: ['tank', 'archer', 'hybrid'],
  pin_shot: ['tank', 'archer', 'hybrid'],
  snare_trap: ['tank', 'archer', 'hybrid'],
  marksman_shot: ['tank', 'archer', 'hybrid'],
  disengage_shot: ['tank', 'archer', 'hybrid'],
  broadhead: ['tank', 'archer', 'hybrid'],
  blast_arrow: ['archer', 'hybrid'],

  // Magic Base
  fireball: ['archer', 'mage', 'hybrid'],
  ignite: ['archer', 'mage', 'hybrid'],
  fire_blink: ['archer', 'mage', 'hybrid'],
  frost_bolt: ['archer', 'mage', 'hybrid'],
  chain_bolt: ['archer', 'mage', 'hybrid'],
  thunder_clap: ['archer', 'mage', 'hybrid'],
  lightning_dash: ['archer', 'mage', 'hybrid'],
  shadow_bolt: ['archer', 'mage', 'hybrid'],
  dark_barrier: ['archer', 'mage', 'hybrid'],
  poison_dart: ['archer', 'mage', 'hybrid'],
  entangle: ['archer', 'mage', 'hybrid'],
  vine_dash: ['archer', 'mage', 'hybrid'],

  // Magic Advanced
  flame_wall: ['mage', 'hybrid'],
  meteor: ['mage', 'hybrid'],
  eruption: ['mage', 'hybrid'],
  ice_wall: ['mage', 'hybrid'],
  blizzard: ['mage', 'hybrid'],
  freeze_target: ['mage', 'hybrid'],
  frost_pillar: ['mage', 'hybrid'],
  storm_field: ['mage', 'hybrid'],
  arc_lift: ['mage', 'hybrid'],
  curse_of_weakness: ['mage', 'hybrid'],
  life_drain: ['mage', 'hybrid'],
  void_spike: ['mage', 'hybrid'],
  thorn_field: ['mage', 'hybrid'],
  healing_totem: ['mage', 'hybrid'],
  root_upthrow: ['mage', 'hybrid'],

  // Utility
  brace_recovery: ['tank'],
  hunters_flow: ['archer'],
  arcane_rebind: ['mage'],
  adaptive_mend: ['hybrid'],
  self_heal: ['tank', 'archer', 'mage', 'hybrid'],
  quick_dash: ['tank', 'archer', 'mage', 'hybrid'],
  ping_mark: ['tank', 'archer', 'mage', 'hybrid'],
  cleanse_surge: ['tank', 'archer', 'mage', 'hybrid'],
  barrier: ['tank', 'archer', 'mage', 'hybrid'],
  energize: ['tank', 'archer', 'mage', 'hybrid'],
  phase_shift: ['tank', 'archer', 'mage', 'hybrid'],
  smoke_screen: ['tank', 'archer', 'mage', 'hybrid'],
}

const ABILITY_SLOT_FAMILIES: Record<string, TargetAbilitySlotFamily> = {
  // Melee
  whirlwind: 'melee',
  gap_closer: 'melee',
  uppercut: 'melee',
  bleed_strike: 'melee',
  guard_break: 'melee',
  rending_dash: 'melee',

  // Bow
  piercing_shot: 'bow',
  volley: 'bow',
  pin_shot: 'bow',
  snare_trap: 'bow',
  marksman_shot: 'bow',
  disengage_shot: 'bow',
  broadhead: 'bow',
  blast_arrow: 'bow',

  // Magic Base
  fireball: 'magicBase',
  ignite: 'magicBase',
  fire_blink: 'magicBase',
  frost_bolt: 'magicBase',
  chain_bolt: 'magicBase',
  thunder_clap: 'magicBase',
  lightning_dash: 'magicBase',
  shadow_bolt: 'magicBase',
  dark_barrier: 'magicBase',
  poison_dart: 'magicBase',
  entangle: 'magicBase',
  vine_dash: 'magicBase',

  // Magic Advanced
  flame_wall: 'magicAdvanced',
  meteor: 'magicAdvanced',
  eruption: 'magicAdvanced',
  ice_wall: 'magicAdvanced',
  blizzard: 'magicAdvanced',
  freeze_target: 'magicAdvanced',
  frost_pillar: 'magicAdvanced',
  storm_field: 'magicAdvanced',
  arc_lift: 'magicAdvanced',
  curse_of_weakness: 'magicAdvanced',
  life_drain: 'magicAdvanced',
  void_spike: 'magicAdvanced',
  thorn_field: 'magicAdvanced',
  healing_totem: 'magicAdvanced',
  root_upthrow: 'magicAdvanced',

  // Utility
  brace_recovery: 'utility',
  hunters_flow: 'utility',
  arcane_rebind: 'utility',
  adaptive_mend: 'utility',
  self_heal: 'utility',
  quick_dash: 'utility',
  ping_mark: 'utility',
  cleanse_surge: 'utility',
  barrier: 'utility',
  energize: 'utility',
  phase_shift: 'utility',
  smoke_screen: 'utility',
}

export function getAbilitySlotFamily(abilityId: string): TargetAbilitySlotFamily {
  return ABILITY_SLOT_FAMILIES[abilityId] || 'utility'
}

export function isAbilityLegalForClass(abilityId: string, classId: ClassId): boolean {
  const allowed = ABILITY_LEGAL_CLASSES[abilityId]
  if (!allowed) return false
  return allowed.includes(classId)
}

export function classLoadoutFitsSlotGrammar(
  classId: ClassId,
  abilityIds: readonly string[],
): boolean {
  const seenIds = new Set<string>()
  const usedFamilies = new Map<TargetAbilitySlotFamily, number>()
  const budget = TARGET_CLASS_DEFS[classId].slots

  for (const id of abilityIds) {
    if (!id) continue
    if (seenIds.has(id) || !isAbilityLegalForClass(id, classId)) return false

    seenIds.add(id)
    const family = getAbilitySlotFamily(id)
    const used = (usedFamilies.get(family) ?? 0) + 1
    if (used > budget[family]) return false
    usedFamilies.set(family, used)
  }

  return true
}

export function inferClassFromLoadout(abilityIds: readonly string[]): ClassId | null {
  const activeIds = abilityIds.filter(Boolean)
  const hybridFits = classLoadoutFitsSlotGrammar('hybrid', activeIds)

  for (const candidate of CLASS_IDS) {
    if (candidate === 'hybrid' || !classLoadoutFitsSlotGrammar(candidate, activeIds)) continue

    const hasClassExclusiveAbility = activeIds.some(
      (id) => isAbilityLegalForClass(id, candidate) && !isAbilityLegalForClass(id, 'hybrid'),
    )
    if (hasClassExclusiveAbility || !hybridFits) return candidate
  }

  return hybridFits ? 'hybrid' : null
}

export function getClassSlotOrder(classId: ClassId): TargetAbilitySlotFamily[] {
  const slots = TARGET_CLASS_DEFS[classId].slots
  const order: TargetAbilitySlotFamily[] = []
  for (const family of TARGET_ABILITY_SLOT_FAMILIES) {
    const count = slots[family]
    for (let i = 0; i < count; i++) {
      order.push(family)
    }
  }
  return order
}
