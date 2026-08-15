import type { WeaponId } from './weapons.js'

// Class vocabulary and slot grammar shared by client and server.

export const CLASS_IDS = ['breaker', 'talon', 'warden', 'drift'] as const
export type ClassId = (typeof CLASS_IDS)[number]

// ── Class-mechanic scale ────────────────────────────────────────────────────
// The server owns the mechanics; these are the numbers the HUD needs in order
// to draw them (how many pips, where the threshold mark goes). They live here
// so the bar cannot drift out of step with the simulation — a client-side copy
// would silently start lying the day one of them is retuned.
export const FURY_MAX_STACKS = 5
export const MOMENTUM_MAX = 100
/** Above this, the bow charges faster — the mark the archer is playing toward. */
export const MOMENTUM_BOW_BONUS_THRESHOLD = 60
export const FLOW_MAX_STACKS = 3

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

export interface ClassVisualDefinition {
  base: string
  outfit: string
  hair: string
  accessories: readonly string[]
  /**
   * Optional single-GLB Mixamo character (file in /characters/<name>.glb). When
   * set, the loader uses this rigged model directly with its OWN embedded clips +
   * the shared Mixamo library, bypassing the layered base/outfit/hair system. This
   * is the realistic-character path (Tank = Knight_Met). base/outfit/hair stay as a
   * fallback for classes still on the modular system.
   */
  mixamoGlb?: string
  /**
   * Optional external animation FBX files (under /characters/anims/) applied
   * DIRECTLY to the single-GLB model's skeleton — same rig family, no retargeting;
   * track bone names are remapped by numeric-suffix stripping (CC_Base_Hip ↔
   * CC_Base_Hip_03). Keys are internal AnimName states.
   */
  ccAnims?: Readonly<Record<string, string>>
}

export interface ClassTargetDefinition {
  id: ClassId
  label: string
  resourceMaxima: ClassResourceMaxima
  slots: ClassSlotGrammar
  weapons: readonly WeaponId[]
  recoveryId: 'brace_recovery' | 'hunters_flow' | 'arcane_rebind' | 'adaptive_mend'
  visuals: ClassVisualDefinition
}

export const TARGET_CLASS_DEFS = {
  breaker: {
    id: 'breaker',
    label: 'BREAKER',
    resourceMaxima: { hp: 280, mana: 60, stamina: 160 },
    slots: { melee: 4, bow: 1, magicBase: 0, magicAdvanced: 0, utility: 3 },
    weapons: ['sword', 'bow'],
    recoveryId: 'brace_recovery',
    visuals: {
      // Mixamo stock Paladin fused with the full Pro Sword and Shield Pack
      // (29 embedded clips: idle/run/walk/strafe/jump/attacks/blocks/impacts/
      // deaths/casting) via tools/asset-pipeline/mixamo-to-glb.mjs. COMPLETE —
      // the old "no locomotion clips" blocker is gone.
      mixamoGlb: 'paladin',
      base: 'Superhero_Male_FullBody',
      outfit: 'Male_Ranger',
      hair: 'Hair_Buzzed',
      accessories: ['Male_Ranger_Acc_Pauldron'],
    },
  },
  talon: {
    id: 'talon',
    label: 'TALON',
    resourceMaxima: { hp: 200, mana: 90, stamina: 120 },
    // magicAdvanced 0 -> 1, taken from magicBase, so the total stays 8.
    //
    // The Arciere could only launch with thunder_clap: `self`, range 3, a panic
    // button for when someone is already on top of you. At BOW range it had no
    // access to the game's signature mechanic at all, which is a whole class
    // locked out of the fifth pillar. One advanced slot fixes that without
    // touching any ability's family or any other class's preset.
    slots: { melee: 0, bow: 4, magicBase: 1, magicAdvanced: 1, utility: 2 },
    weapons: ['bow', 'staff'],
    recoveryId: 'hunters_flow',
    visuals: {
      // Mixamo Erika Archer (with animated bow) + Pro Longbow Pack, 20 clips.
      mixamoGlb: 'erika',
      base: 'Superhero_Female_FullBody',
      outfit: 'Female_Ranger',
      hair: 'Hair_Buns',
      accessories: [],
    },
  },
  warden: {
    id: 'warden',
    label: 'WARDEN',
    resourceMaxima: { hp: 250, mana: 160, stamina: 90 },
    slots: { melee: 0, bow: 0, magicBase: 3, magicAdvanced: 3, utility: 2 },
    weapons: ['staff'],
    recoveryId: 'arcane_rebind',
    visuals: {
      // Mixamo Vampire A Lusth (pale blood-warlock) + Pro Magic Pack, 17 clips
      // (magic attacks, cast, area, heal, full locomotion, deaths, blocks).
      mixamoGlb: 'vampire',
      base: 'Superhero_Male_FullBody',
      outfit: 'Male_Peasant',
      hair: 'Hair_Long',
      accessories: ['Hair_Beard'],
    },
  },
  drift: {
    id: 'drift',
    label: 'DRIFT',
    resourceMaxima: { hp: 250, mana: 110, stamina: 120 },
    slots: { melee: 2, bow: 1, magicBase: 2, magicAdvanced: 1, utility: 2 },
    weapons: ['sword', 'bow', 'staff'],
    recoveryId: 'adaptive_mend',
    visuals: {
      // Mixamo Ninja + Great Sword Pack, 23 clips (two-handed sword set).
      mixamoGlb: 'ninja',
      base: 'Superhero_Female_FullBody',
      outfit: 'Female_Peasant',
      hair: 'Hair_SimpleParted',
      accessories: [],
    },
  },
} as const satisfies Readonly<Record<ClassId, ClassTargetDefinition>>

// Preset builds per class — full 8-slot class-aware builds.
// Slot positions are packed by family regardless of wire-field name; the server
// validates by family budget (not position). See VERITA.md for rationale.
// Each preset includes the class Recovery utility.
// Le build di partenza. GENERATE dai pool curati, mai scritte a mano.
//
// Un preset elencato a mano diventa illegale in silenzio la prima volta che il
// pool della sua classe cambia: è successo con frost_bolt, rimasto nel preset
// del TALON dopo che la curatela lo aveva tolto dal suo kit. Un test lo ha
// preso, ma solo perché esisteva — la generazione rende il bug impossibile.
// Le build di partenza. GENERATE dai pool curati, mai scritte a mano.
//
// Un preset elencato a mano diventa illegale in silenzio la prima volta che il
// pool della sua classe cambia: è successo con frost_bolt, rimasto nel preset
// del TALON dopo che la curatela lo aveva tolto dal suo kit. Un test lo ha
// preso, ma solo perché esisteva — la generazione rende il bug impossibile.
// Le build di partenza. GENERATE dai pool curati, mai scritte a mano.
//
// Un preset elencato a mano diventa illegale in silenzio la prima volta che il
// pool della sua classe cambia: è successo con frost_bolt, rimasto nel preset
// del TALON dopo che la curatela lo aveva tolto dal suo kit. Un test lo ha
// preso, ma solo perché esisteva — la generazione rende il bug impossibile.
// Le build di partenza. GENERATE dai pool curati, mai scritte a mano.
//
// Un preset elencato a mano diventa illegale in silenzio la prima volta che il
// pool della sua classe cambia: è successo con frost_bolt, rimasto nel preset
// del TALON dopo che la curatela lo aveva tolto dal suo kit. Un test lo ha
// preso, ma solo perché esisteva — la generazione rende il bug impossibile.
// Le build di partenza. GENERATE dai pool curati, mai scritte a mano.
//
// Un preset elencato a mano diventa illegale in silenzio la prima volta che il
// pool della sua classe cambia: è successo con frost_bolt, rimasto nel preset
// del TALON dopo che la curatela lo aveva tolto dal suo kit. Un test lo ha
// preso, ma solo perché esisteva — la generazione rende il bug impossibile.
// Le build di partenza. GENERATE dai pool curati, mai scritte a mano.
//
// Un preset elencato a mano diventa illegale in silenzio la prima volta che il
// pool della sua classe cambia: è successo con frost_bolt, rimasto nel preset
// del TALON dopo che la curatela lo aveva tolto dal suo kit. Un test lo ha
// preso, ma solo perché esisteva — la generazione rende il bug impossibile.
export const CLASS_PRESET_BUILDS: Record<ClassId, readonly string[]> = {
  // BREAKER — generato dal suo pool curato (slots: {"melee":4,"bow":1,"magicBase":0,"magicAdvanced":0,"utility":3})
  breaker: Object.freeze([
    'uppercut', // melee
    'gap_closer', // melee
    'guard_break', // melee
    'whirlwind', // melee
    'steady_aim', // bow
    'brace_recovery', // utility
    'barrier', // utility
    'quick_dash', // utility
  ]),
  // TALON — generato dal suo pool curato (slots: {"melee":0,"bow":4,"magicBase":1,"magicAdvanced":1,"utility":2})
  talon: Object.freeze([
    'pin_shot', // bow
    'marksman_shot', // bow
    'disengage_shot', // bow
    'volley', // bow
    'fire_blink', // magicBase
    'arc_lift', // magicAdvanced
    'hunters_flow', // utility
    'quick_dash', // utility
  ]),
  // WARDEN — generato dal suo pool curato (slots: {"melee":0,"bow":0,"magicBase":3,"magicAdvanced":3,"utility":2})
  warden: Object.freeze([
    'fireball', // magicBase
    'frost_bolt', // magicBase
    'chain_bolt', // magicBase
    'eruption', // magicAdvanced
    'meteor', // magicAdvanced
    'storm_field', // magicAdvanced
    'arcane_rebind', // utility
    'phase_shift', // utility
  ]),
  // DRIFT — generato dal suo pool curato (slots: {"melee":2,"bow":1,"magicBase":2,"magicAdvanced":1,"utility":2})
  drift: Object.freeze([
    'gap_closer', // melee
    'riposte', // melee
    'point_blank', // bow
    'lightning_dash', // magicBase
    'fire_blink', // magicBase
    'arc_lift', // magicAdvanced
    'adaptive_mend', // utility
    'quick_dash', // utility
  ]),
}

export const TARGET_LOADOUT_SLOT_COUNT = 8 as const

export function targetClassSlotCount(classId: ClassId): number {
  return Object.values(TARGET_CLASS_DEFS[classId].slots).reduce<number>(
    (total, count) => total + count,
    0,
  )
}

// Chi puo prendere cosa. CURATO, non ereditato.
//
// Misurato prima di questa passata: DRIFT era legale per 58 abilita su 61 —
// l'unione di tutte le altre classi. Una classe che puo prendere il 95% del
// gioco non e una classe, e un superinsieme, e nessuna quantita di contenuto
// nuovo puo pareggiarla: ogni abilita aggiunta finiva anche a lei.
// TALON aveva inoltre uno slot 'magicAdvanced' con UNA sola opzione legale —
// uno slot di build che non era una scelta.
//
// Regola, presa dai giochi che reggono: un kit di classe e CHIUSO e
// riconoscibile. Guardando un'abilita devi sapere chi la lancia.
//   BREAKER — tutta la mischia; l'arco solo nei tre pezzi piu pesanti.
//   TALON   — tutto l'arco, piu magia scelta per la distanza.
//   WARDEN  — tutta la magia. E l'unica che la possiede davvero.
//   DRIFT   — sezione trasversale sul suo verbo, il movimento: le piu rapide di
//             ogni famiglia, niente pesantezza. NON piu l'unione di tutti.
// Le quattro recovery restano una per classe.
//
// Generato da una regola meccanica sui dati (comboRole + cooldown), non a gusto.
const ABILITY_LEGAL_CLASSES: Record<string, readonly ClassId[]> = {
  bleed_strike: ['breaker', 'drift'],
  bloodthirst: ['breaker'],
  cleave: ['breaker', 'drift'],
  executioner: ['breaker'],
  gap_closer: ['breaker', 'drift'],
  ground_slam: ['breaker', 'drift'],
  guard_break: ['breaker'],
  hamstring: ['breaker'],
  momentum_strike: ['breaker', 'drift'],
  rending_dash: ['breaker', 'drift'],
  riposte: ['breaker', 'drift'],
  skewer: ['breaker', 'drift'],
  uppercut: ['breaker'],
  whirlwind: ['breaker'],
  blast_arrow: ['breaker', 'talon'],
  bola: ['talon', 'drift'],
  broadhead: ['talon', 'drift'],
  disengage_shot: ['talon', 'drift'],
  marksman_shot: ['breaker', 'talon'],
  piercing_shot: ['breaker', 'talon', 'drift'],
  pin_shot: ['talon'],
  point_blank: ['talon', 'drift'],
  siphon_arrow: ['breaker', 'talon'],
  skyfall: ['talon'],
  snare_trap: ['talon'],
  split_shot: ['talon', 'drift'],
  steady_aim: ['breaker', 'talon'],
  volley: ['talon'],
  chain_bolt: ['warden', 'drift'],
  dark_barrier: ['warden'],
  entangle: ['warden'],
  fire_blink: ['talon', 'warden', 'drift'],
  fireball: ['warden'],
  frost_bolt: ['warden', 'drift'],
  ignite: ['warden'],
  lightning_dash: ['talon', 'warden', 'drift'],
  poison_dart: ['talon', 'warden', 'drift'],
  shadow_bolt: ['talon', 'warden', 'drift'],
  thunder_clap: ['talon', 'warden', 'drift'],
  vine_dash: ['talon', 'warden', 'drift'],
  arc_lift: ['talon', 'warden', 'drift'],
  blizzard: ['warden'],
  curse_of_weakness: ['talon', 'warden', 'drift'],
  eruption: ['talon', 'warden', 'drift'],
  flame_wall: ['talon', 'warden', 'drift'],
  freeze_target: ['warden'],
  frost_pillar: ['talon', 'warden', 'drift'],
  healing_totem: ['warden'],
  ice_wall: ['warden'],
  life_drain: ['warden', 'drift'],
  meteor: ['warden'],
  root_upthrow: ['warden'],
  storm_field: ['warden'],
  thorn_field: ['warden'],
  void_spike: ['warden'],
  adaptive_mend: ['drift'],
  arcane_rebind: ['warden'],
  barrier: ['breaker', 'talon', 'warden', 'drift'],
  brace_recovery: ['breaker'],
  cleanse_surge: ['breaker', 'talon', 'warden', 'drift'],
  energize: ['breaker', 'talon', 'warden', 'drift'],
  hunters_flow: ['talon'],
  phase_shift: ['breaker', 'talon', 'warden', 'drift'],
  ping_mark: ['breaker', 'talon', 'warden', 'drift'],
  quick_dash: ['breaker', 'talon', 'warden', 'drift'],
  self_heal: ['breaker', 'talon', 'warden', 'drift'],
  smoke_screen: ['breaker', 'talon', 'warden', 'drift'],
}

const ABILITY_SLOT_FAMILIES: Record<string, TargetAbilitySlotFamily> = {
  // Bow (second batch — see abilities/bow-extended.ts)
  point_blank: 'bow',
  steady_aim: 'bow',
  skyfall: 'bow',
  bola: 'bow',
  siphon_arrow: 'bow',
  split_shot: 'bow',
  // Melee (second batch — see abilities/melee-extended.ts)
  riposte: 'melee',
  skewer: 'melee',
  cleave: 'melee',
  hamstring: 'melee',
  executioner: 'melee',
  bloodthirst: 'melee',
  ground_slam: 'melee',
  momentum_strike: 'melee',
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

export function loadoutHasRecovery(classId: ClassId, abilityIds: readonly string[]): boolean {
  return abilityIds.includes(TARGET_CLASS_DEFS[classId].recoveryId)
}

// Deterministically guarantees a resolved build always carries its class's
// Recovery ability — the slot grammar alone allows a legal build with zero
// self-sustain (lacuna nota). Swaps the LAST utility-family slot for
// it (position is not gameplay-significant — validation is by family budget,
// not slot index), or appends it when no utility slot is in use.
export function ensureLoadoutHasRecovery(
  classId: ClassId,
  abilityIds: readonly string[],
): readonly string[] {
  if (loadoutHasRecovery(classId, abilityIds)) return abilityIds
  const recoveryId = TARGET_CLASS_DEFS[classId].recoveryId
  const lastUtilityIndex = abilityIds.reduce(
    (found, id, i) => (getAbilitySlotFamily(id) === 'utility' ? i : found),
    -1,
  )
  if (lastUtilityIndex === -1) return [...abilityIds, recoveryId]
  const next = [...abilityIds]
  next[lastUtilityIndex] = recoveryId
  return next
}

export function inferClassFromLoadout(abilityIds: readonly string[]): ClassId | null {
  const activeIds = abilityIds.filter(Boolean)
  const hybridFits = classLoadoutFitsSlotGrammar('drift', activeIds)

  for (const candidate of CLASS_IDS) {
    if (candidate === 'drift' || !classLoadoutFitsSlotGrammar(candidate, activeIds)) continue

    const hasClassExclusiveAbility = activeIds.some(
      (id) => isAbilityLegalForClass(id, candidate) && !isAbilityLegalForClass(id, 'drift'),
    )
    if (hasClassExclusiveAbility || !hybridFits) return candidate
  }

  return hybridFits ? 'drift' : null
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
