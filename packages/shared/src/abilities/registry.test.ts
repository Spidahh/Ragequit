import { describe, expect, it } from 'vitest'

import { MAX_AIRBORNE_SEC } from '../constants/weapons.js'

import { ABILITY_DEFS, abilityIds, getAbilityDef } from './registry.js'
import type { AbilityComboRole, AbilityDef } from './types.js'

describe('ability registry', () => {
  it('has the full ability library (53 abilities total)', () => {
    expect(abilityIds().length).toBe(53)
  })

  it('has the correct count per slot', () => {
    const ids = abilityIds()
    const bySlot = { melee: 0, bow: 0, magic: 0, utility: 0 }
    for (const id of ids) {
      const def = ABILITY_DEFS[id]!
      bySlot[def.slot] += 1
    }
    expect(bySlot).toEqual({ melee: 6, bow: 8, magic: 27, utility: 12 })
  })

  it('has abilities per element across the magic slots', () => {
    const ids = abilityIds()
    const byEl: Record<string, number> = { fire: 0, ice: 0, lightning: 0, dark: 0, nature: 0 }
    for (const id of ids) {
      const def = ABILITY_DEFS[id]!
      if (def.slot !== 'magic') continue
      if (def.element === 'none') continue
      byEl[def.element] = (byEl[def.element] ?? 0) + 1
    }
    // Each element has at least 5 magic abilities.
    for (const [el, n] of Object.entries(byEl)) {
      expect(n, `element ${el}`).toBeGreaterThanOrEqual(5)
    }
  })

  it('every registered key matches its def id', () => {
    for (const [key, def] of Object.entries(ABILITY_DEFS)) {
      expect(def.id).toBe(key)
    }
  })

  it('getAbilityDef returns null for unknown ids', () => {
    expect(getAbilityDef('does_not_exist')).toBeNull()
  })

  it('every ability has at least one effect and a mini-malus tooltip line', () => {
    for (const def of Object.values(ABILITY_DEFS)) {
      expect(def.effects.length).toBeGreaterThan(0)
      expect(def.miniMalus.length).toBeGreaterThan(4)
    }
  })

  it('every ability declares a valid combo role and the library covers every role family', () => {
    const validRoles: AbilityComboRole[] = [
      'starter',
      'finisher',
      'pressure',
      'survival',
      'counter',
      'mobility',
    ]
    const seen = new Set<AbilityComboRole>()
    for (const def of Object.values(ABILITY_DEFS) as AbilityDef[]) {
      expect(validRoles).toContain(def.comboRole)
      seen.add(def.comboRole)
    }
    for (const role of validRoles) expect(seen.has(role), role).toBe(true)
  })

  it('instant line-of-sight spells stay forward direct hits, not projectiles or point zones', () => {
    // These were the legacy "ray" abilities. After the 6-role consolidation the
    // instant line-of-sight delivery is a property (forward + no projectile/zone),
    // not a comboRole. The delivery contract must still hold.
    const instantLosSpells = ['ignite', 'chain_bolt', 'freeze_target', 'entangle']
    for (const id of instantLosSpells) {
      const def = getAbilityDef(id)
      expect(def, id).toBeDefined()
      expect(def!.targeting, id).toBe('forward')
      expect(
        def!.effects.some((e) => e.kind === 'projectile' || e.kind === 'zone'),
        id,
      ).toBe(false)
    }
  })

  it('starter role abilities apply real control, not only damage', () => {
    for (const def of Object.values(ABILITY_DEFS) as AbilityDef[]) {
      if (def.comboRole !== 'starter') continue
      const hasControl = def.effects.some((e) => {
        if (e.kind === 'knockup') return true
        if (e.kind === 'applyStatus')
          return ['root', 'stun', 'freeze', 'blind', 'slow'].includes(e.status)
        if (e.kind === 'projectile')
          return ['root', 'stun', 'freeze', 'blind', 'slow'].includes(e.onHitStatus?.status ?? '')
        if (e.kind === 'zone')
          return ['root', 'stun', 'freeze', 'blind', 'slow'].includes(e.applyStatus?.status ?? '')
        return false
      })
      expect(hasControl, def.id).toBe(true)
    }
  })

  it('uppercut keeps the melee launcher contract', () => {
    const u = getAbilityDef('uppercut')!
    expect(u.windupSec).toBe(0.4)
    // 10 -> 8.5 with the D1 cooldown ceiling: the whole tail above 8 s was
    // compressed into the 12 s cap, preserving order. See constants/combat.ts.
    expect(u.cooldownSec).toBe(8.5)
    expect(u.costStamina).toBe(40)
    expect(u.range).toBe(2.5)
    expect(u.canParry).toBe(true)
    expect(u.isKnockup).toBe(true)
    const dmg = u.effects.find((e) => e.kind === 'damage')
    expect(dmg && 'amount' in dmg ? dmg.amount : -1).toBe(16)
    const ku = u.effects.find((e) => e.kind === 'knockup')
    expect(ku && 'airborneSec' in ku ? ku.airborneSec : -1).toBeCloseTo(0.7, 5)
  })

  it('fireball is staff/fire/projectile with onHit burn application', () => {
    const f1 = getAbilityDef('fireball')!
    expect(f1.weapon).toBe('staff')
    expect(f1.element).toBe('fire')
    const proj = f1.effects.find((e) => e.kind === 'projectile')
    expect(proj).toBeDefined()
    if (proj && 'onHitStatus' in proj) {
      expect(proj.onHitStatus?.status).toBe('burn')
      expect(proj.onHitStatus?.stacks).toBe(1)
    }
  })

  it('flame wall is a single-data-file ability (DoD probe)', () => {
    const w = getAbilityDef('flame_wall')!
    expect(w.targeting).toBe('point')
    const zone = w.effects.find((e) => e.kind === 'zone')
    expect(zone).toBeDefined()
    if (zone && 'durationSec' in zone) {
      expect(zone.durationSec).toBe(3.5)
      expect(zone.damagePerTick).toBe(6)
      expect(zone.element).toBe('fire')
    }
  })

  it('every projectile-spawning ability declares a damage > 0 (sanity)', () => {
    for (const def of Object.values(ABILITY_DEFS) as AbilityDef[]) {
      for (const e of def.effects) {
        if (e.kind === 'projectile') expect(e.damage).toBeGreaterThan(0)
      }
    }
  })

  it('resource drain effects only target mana or stamina', () => {
    for (const def of Object.values(ABILITY_DEFS) as AbilityDef[]) {
      for (const e of def.effects) {
        if (e.kind !== 'resourceDrain') continue
        expect(['mana', 'stamina']).toContain(e.resource)
        expect(e.amount, def.id).toBeGreaterThan(0)
        expect(e.gainFraction ?? 0, def.id).toBeGreaterThanOrEqual(0)
        expect(e.gainFraction ?? 0, def.id).toBeLessThanOrEqual(1)
      }
    }
  })

  it('every generic slow application declares an explicit slow fraction', () => {
    for (const def of Object.values(ABILITY_DEFS) as AbilityDef[]) {
      for (const e of def.effects) {
        if (e.kind === 'applyStatus' && e.status === 'slow') {
          expect(e.slowFraction, def.id).toBeGreaterThan(0)
        }
        if (e.kind === 'zone' && e.applyStatus?.status === 'slow') {
          expect(e.applyStatus.slowFraction, def.id).toBeGreaterThan(0)
        }
        if (e.kind === 'projectile' && e.onHitStatus?.status === 'slow') {
          expect(e.onHitStatus.slowFraction, def.id).toBeGreaterThan(0)
        }
      }
    }
  })

  it('every damaging/status zone can tick at least once during its lifetime', () => {
    for (const def of Object.values(ABILITY_DEFS) as AbilityDef[]) {
      for (const e of def.effects) {
        if (e.kind !== 'zone') continue
        const hasPayload = (e.damagePerTick ?? 0) > 0 || !!e.applyStatus
        if (!hasPayload) continue
        expect(e.tickEverySec, def.id).toBeLessThanOrEqual(e.durationSec)
      }
    }
  })

  it('movement tooltips match collision and direction flags', () => {
    const quickDash = getAbilityDef('quick_dash')!
    const quickMove = quickDash.effects.find((e) => e.kind === 'move')
    expect(
      quickMove && 'useMovementDirection' in quickMove ? quickMove.useMovementDirection : false,
    ).toBe(true)

    for (const id of ['fire_blink', 'lightning_dash']) {
      const def = getAbilityDef(id)!
      const move = def.effects.find((e) => e.kind === 'move')
      expect(move && 'cancelOnCollision' in move ? move.cancelOnCollision : false, id).toBe(true)
    }
  })
})

// Engine-support invariants: each guards a class of "ships silently broken"
// bug. They encode properties that were verified by hand against the server
// effect handlers (AbilityEngine.tickChannels / GameRoom.tickZones /
// AbilityEngine.effectProjectile) — so a future ability that violates the
// engine's actual support surface fails the gate instead of doing nothing.
describe('ability effect engine-support invariants', () => {
  const defs = Object.values(ABILITY_DEFS) as AbilityDef[]

  it('every zone has a payload — damage or a status (no silently inert zone)', () => {
    // GameRoom.tickZones only acts when damagePerTick > 0 or a status applies.
    // A zone with neither is a no-op that wastes a cast — almost always a typo.
    for (const def of defs) {
      for (const e of def.effects) {
        if (e.kind !== 'zone') continue
        const hasPayload = (e.damagePerTick ?? 0) > 0 || !!e.applyStatus
        expect(hasPayload, `${def.id}: zone has no damage and no status`).toBe(true)
      }
    }
  })

  it('every ticking effect (zone/channel) has tickEverySec > 0', () => {
    // tickEverySec is converted to an integer tick interval; 0 makes
    // AbilityEngine.tickChannels spin (nextTickAtTick never advances).
    for (const def of defs) {
      for (const e of def.effects) {
        if (e.kind === 'zone' || e.kind === 'channel') {
          expect(e.tickEverySec, `${def.id}: ${e.kind}.tickEverySec`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('every projectile moves (speedMps > 0)', () => {
    // effectProjectile derives lifetime as range*2/speed; speed 0 → Infinity →
    // NaN lifetimeTicks, and the projectile would never travel anyway.
    for (const def of defs) {
      for (const e of def.effects) {
        if (e.kind === 'projectile') {
          expect(e.speedMps, `${def.id}: projectile.speedMps`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('every channel has a per-tick effect of a supported kind', () => {
    // tickChannels fires c.perTick through applyEffect each tick; without it
    // the channel occupies the cast but does nothing.
    const supported = new Set(['damage', 'heal', 'applyStatus'])
    for (const def of defs) {
      for (const e of def.effects) {
        if (e.kind !== 'channel') continue
        expect(e.perTick, `${def.id}: channel.perTick`).toBeDefined()
        expect(
          supported.has(e.perTick.kind),
          `${def.id}: channel.perTick.kind '${e.perTick.kind}'`,
        ).toBe(true)
      }
    }
  })

  it('no heal uses the unimplemented overSec HoT path (would apply instantly)', () => {
    // AbilityEngine.effectHeal ignores overSec (TODO) — a heal that sets it
    // would silently apply all at once. HoT must go through a channel instead.
    for (const def of defs) {
      for (const e of def.effects) {
        if (e.kind === 'heal') {
          expect(e.overSec ?? 0, `${def.id}: heal.overSec (use a channel for HoT)`).toBe(0)
        }
        if (e.kind === 'channel' && e.perTick.kind === 'heal') {
          expect(e.perTick.overSec ?? 0, `${def.id}: channel heal.overSec`).toBe(0)
        }
      }
    }
  })
})

// --- 00_truth.md 7.3: airtime is authored, and there are four weights --------
// Nine launchers used to share one value, so a shove, a lift and a sky-toss all
// felt identical. These are the weights, and a launch has to be one of them.
describe('launch weights', () => {
  const AIRTIME: Record<string, number> = {
    guard_break: 0.45,
    thunder_clap: 0.45, // POP — a shove. Below jump height, buys no punish window.
    uppercut: 0.7,
    eruption: 0.7,
    frost_pillar: 0.7,
    arc_lift: 0.7,
    void_spike: 0.7, // LIFT — one instant follow-up
    root_upthrow: 1.0, // LAUNCH — it already refuses airborne targets, so it cannot chain
    meteor: 1.2, // SKY — it already pays with a 1 s windup, 18 s cooldown and a public telegraph
  }

  it('gives every launcher one of the four authored weights', () => {
    for (const [id, expected] of Object.entries(AIRTIME)) {
      const def = ABILITY_DEFS[id]
      expect(def, `${id} missing from the registry`).toBeDefined()
      const ku = def!.effects.find((e) => e.kind === 'knockup')
      expect(ku, `${id} should still launch`).toBeDefined()
      const t = ku && 'airborneSec' in ku ? ku.airborneSec : -1
      expect(t, `${id} airtime`).toBeCloseTo(expected, 5)
    }
  })

  it('has no launcher outside the tested envelope', () => {
    for (const def of Object.values(ABILITY_DEFS)) {
      for (const e of def.effects) {
        if (e.kind !== 'knockup' || !('airborneSec' in e)) continue
        expect(e.airborneSec, `${def.id} exceeds MAX_AIRBORNE_SEC`).toBeLessThanOrEqual(
          MAX_AIRBORNE_SEC,
        )
      }
    }
  })
})
