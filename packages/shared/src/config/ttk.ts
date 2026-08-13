// ---------------------------------------------------------------------------
// Time to kill, measured off the shipped registry.
//
// WHY THIS EXISTS
//
// `TTK_MIN_SEC` / `TTK_MAX_SEC` carried the comment "Calibration target — all
// ability damage/CD/cost values are tuned against this" while saying 20-30 s
// against a registry that killed a 200 HP pool in about six. Nothing imported
// them. They were documentation wearing a constant's clothes, and being wrong
// by 3-5x cost nothing because nothing could notice.
//
// So the target is computed now. A number that claims to calibrate the roster
// has to be able to fail when the roster leaves it.
//
// The model is deliberately simple and stated rather than clever: the preset
// build's abilities on cooldown, and the class weapon filling the time left
// over. That last clause is load-bearing. Summing full ability DPS and full
// weapon DPS assumes you cast everything AND swing continuously in the same
// seconds, which is not a rotation, it is two players — and it produced a TTK
// about 25 % shorter than anything reachable.
//
// It still ignores movement, misses, heals and cover, all of which make a real
// fight longer, so read it as the FLOOR of a fight's length against the
// TOUGHEST class. That is exactly the quantity a TTK band is about.
// ---------------------------------------------------------------------------
import { ABILITY_DEFS } from '../abilities/registry.js'
import type { AbilityDef } from '../abilities/types.js'
import { CLASS_PRESET_BUILDS, TARGET_CLASS_DEFS, type ClassId } from '../constants/classes.js'
import { GCD_SEC } from '../constants/combat.js'
import {
  BOW_CHARGE_FULL_SEC,
  BOW_DAMAGE_FULL,
  STAFF_M1_CADENCE_SEC,
  STAFF_M1_DAMAGE,
  SWORD_M1_SWING_SEC,
  SWORD_M1_DAMAGE,
} from '../constants/weapons.js'

/** Total HP an ability deals to one target across its whole resolution. */
export function abilityDamage(def: AbilityDef): number {
  let total = 0
  for (const e of def.effects) {
    if (e.kind === 'damage') total += e.amount
    else if (e.kind === 'projectile') total += e.damage
    else if (e.kind === 'channel' && e.perTick.kind === 'damage') {
      total += e.perTick.amount * Math.floor(e.durationSec / e.tickEverySec)
    } else if (e.kind === 'zone' && e.damagePerTick) {
      total += e.damagePerTick * Math.floor(e.durationSec / e.tickEverySec)
    }
  }
  return total
}

/**
 * Sustained damage per second an ability contributes on cooldown.
 *
 * The denominator is cooldown plus the time the cast itself occupies (windup,
 * floored at the GCD): an ability is not "free damage every cooldown", it also
 * costs you the seconds you spend casting it.
 */
export function abilityDps(def: AbilityDef): number {
  const damage = abilityDamage(def)
  if (damage <= 0) return 0
  return damage / (def.cooldownSec + Math.max(GCD_SEC, def.windupSec))
}

/** Basic-attack DPS for a weapon, from the weapon constants. */
export function weaponDps(weapon: string): number {
  if (weapon === 'sword') {
    // Mean of the three combo steps over one swing each — the 15.0 DPS figure
    // that 01_combat_fundamentals.md misquoted as 17.5.
    const mean = SWORD_M1_DAMAGE.reduce((a, b) => a + b, 0) / SWORD_M1_DAMAGE.length
    return mean / SWORD_M1_SWING_SEC
  }
  if (weapon === 'staff') return STAFF_M1_DAMAGE / STAFF_M1_CADENCE_SEC
  if (weapon === 'bow') return BOW_DAMAGE_FULL / BOW_CHARGE_FULL_SEC
  return 0
}

export interface ClassTtk {
  classId: ClassId
  targetHp: number
  abilityDps: number
  /** Weapon DPS AFTER the share of the fight spent casting is removed. */
  weaponDps: number
  /** Fraction of the fight spent casting rather than attacking, 0..1. */
  castDuty: number
  totalDps: number
  ttkSec: number
}

/**
 * How long this class's preset build takes to kill the TOUGHEST class.
 *
 * Against the toughest on purpose: a TTK band has to hold for the slowest kill
 * in the game, or the band is describing the easy half of the matchup table.
 */
export function classTtk(classId: ClassId): ClassTtk {
  const build = CLASS_PRESET_BUILDS[classId] ?? []
  const abilities = build
    .map((id) => ABILITY_DEFS[id])
    .filter((d): d is AbilityDef => d !== undefined)
  const abilitySum = abilities.reduce((sum, d) => sum + abilityDps(d), 0)
  // Fraction of the fight spent casting rather than attacking. Each ability
  // occupies its cast time once per cooldown; the weapon only fills what is
  // left, because a caster is not also swinging.
  const castDuty = Math.min(
    1,
    abilities.reduce((sum, d) => {
      const cast = Math.max(GCD_SEC, d.windupSec)
      return sum + cast / (d.cooldownSec + cast)
    }, 0),
  )
  const weapons = TARGET_CLASS_DEFS[classId]?.weapons ?? []
  const weapon = weapons.reduce((best, w) => Math.max(best, weaponDps(w)), 0) * (1 - castDuty)
  const total = abilitySum + weapon
  const targetHp = Math.max(...Object.values(TARGET_CLASS_DEFS).map((c) => c.resourceMaxima.hp))
  return {
    classId,
    targetHp,
    abilityDps: abilitySum,
    weaponDps: weapon,
    castDuty,
    totalDps: total,
    ttkSec: total > 0 ? targetHp / total : Infinity,
  }
}

/** Every class's TTK, for the balance test and tools/verify. */
export function allClassTtk(): ClassTtk[] {
  return (Object.keys(TARGET_CLASS_DEFS) as ClassId[]).map(classTtk)
}
