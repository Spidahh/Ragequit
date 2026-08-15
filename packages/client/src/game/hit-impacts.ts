// Where a hit is drawn, and what it looks like.
//
// Extracted from main.ts's onHit (file-budget: AGENTS.md). The important rule
// lives here: an impact must read as "the hit landed HERE", so it is placed on
// the VICTIM. This used to be the attacker↔victim midpoint, which drew a bow
// impact ~10 m short of the target it actually hit.

import type { ServerHitMessage } from '@ragequit/shared'
import * as THREE from 'three'

import type { ImpactProfile } from '../vfx/impact-pool.js'

import { elementToImpactColor, rawCauseId } from './hitstop.js'

/** Causes whose impact should read as a physical melee strike. */
const MELEE_CAUSES = new Set([
  'sword_m1',
  'uppercut',
  'gap_closer',
  'bleed_strike',
  'guard_break',
  'rending_dash',
  'whirlwind',
])

/** Causes whose impact should read as an arrow. */
const BOW_CAUSES = new Set([
  'bow',
  'piercing_shot',
  'pin_shot',
  'marksman_shot',
  'broadhead',
  'blast_arrow',
  'volley',
  'disengage_shot',
  'snare_trap',
])

export interface HitImpactDeps {
  spawnImpact: (pos: THREE.Vector3, color: number, profile?: ImpactProfile) => void
  /** Element-tinted spark burst (three.quarks); skipped for element 'none'. */
  burstElement: (pos: THREE.Vector3, element: string) => void
}

/**
 * The contact point for a hit: chest height on the victim, nudged slightly
 * toward the attacker so melee/parry sparks sit on the victim's guard rather
 * than inside their chest. Returns null when the victim is not on screen.
 */
export function hitContactPoint(
  vicPos: { x: number; y: number; z: number } | null,
  attPos: { x: number; y: number; z: number } | null,
): THREE.Vector3 | null {
  if (!vicPos) return null
  const contact = new THREE.Vector3(vicPos.x, vicPos.y + 1.0, vicPos.z)
  if (attPos) {
    const dx = attPos.x - vicPos.x
    const dz = attPos.z - vicPos.z
    const len = Math.hypot(dx, dz)
    if (len > 0.001) {
      contact.x += (dx / len) * 0.35
      contact.z += (dz / len) * 0.35
    }
  }
  return contact
}

export function spawnHitImpacts(
  deps: HitImpactDeps,
  msg: ServerHitMessage,
  ctx: {
    vicPos: { x: number; y: number; z: number } | null
    attPos: { x: number; y: number; z: number } | null
    isAirPunish: boolean
  },
): void {
  const { vicPos, attPos, isAirPunish } = ctx
  const contact = hitContactPoint(vicPos, attPos)
  if (!contact) return

  const cause = msg.cause
  // Strip 'ability:' prefix so melee/bow abilities match their VFX category.
  const rawC = rawCauseId(cause)

  if (msg.didParry) {
    deps.spawnImpact(contact, 0xddeeff, 'parry')
    return
  }
  if (msg.damage <= 0) return

  // Air punish — extra burst directly at victim height.
  if (isAirPunish && vicPos) {
    deps.spawnImpact(new THREE.Vector3(vicPos.x, vicPos.y + 0.3, vicPos.z), 0xff8844, 'melee')
    deps.spawnImpact(new THREE.Vector3(vicPos.x, vicPos.y + 0.6, vicPos.z), 0xff4422, 'magic')
  }

  if (MELEE_CAUSES.has(rawC)) {
    // Melee — gold spark + secondary red burst for hard hits.
    deps.spawnImpact(contact, 0xffcc44, 'melee')
    if (msg.damage >= 10 && vicPos) {
      deps.spawnImpact(new THREE.Vector3(vicPos.x, vicPos.y + 0.4, vicPos.z), 0xff6622, 'melee')
    }
  } else if (BOW_CAUSES.has(rawC)) {
    deps.spawnImpact(contact, 0xf08020, 'pierce')
  } else if (cause.startsWith('zone:') || cause.startsWith('dot:') || cause.startsWith('status:')) {
    // Zone / DoT ticks — small element-coloured pulse at the victim.
    if (vicPos) {
      deps.spawnImpact(
        new THREE.Vector3(vicPos.x, vicPos.y + 0.5, vicPos.z),
        elementToImpactColor(msg.element, cause),
        'tick',
      )
    }
  } else {
    // Combo reactions and every other magic/ability hit — element-coloured.
    deps.spawnImpact(contact, elementToImpactColor(msg.element, cause))
  }

  // Element spark burst on top of the pooled impact. The per-element particle
  // library already existed but was wired ONLY to projectiles, so the ~33
  // instant abilities (rays, melee-range magic, combos) landed with no
  // element-specific effect and every element looked identical on impact.
  if (msg.element && msg.element !== 'none') deps.burstElement(contact, msg.element)
}
