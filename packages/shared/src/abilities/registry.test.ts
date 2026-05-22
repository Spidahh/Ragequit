import { describe, expect, it } from 'vitest'

import { ABILITY_DEFS, abilityIds, getAbilityDef } from './registry.js'
import type { AbilityComboRole, AbilityDef } from './types.js'

describe('ability registry', () => {
  it('has the full ability library (56 abilities total, including fixed transfers)', () => {
    expect(abilityIds().length).toBe(56)
  })

  it('has the correct count per slot', () => {
    const ids = abilityIds()
    const bySlot = { melee: 0, bow: 0, magic: 0, utility: 0 }
    for (const id of ids) {
      const def = ABILITY_DEFS[id]!
      bySlot[def.slot] += 1
    }
    expect(bySlot).toEqual({ melee: 6, bow: 8, magic: 27, utility: 15 })
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
      'extender',
      'finisher',
      'ray',
      'pressure',
      'survival',
      'counter',
      'mobility',
      'drain',
      'resource',
    ]
    const seen = new Set<AbilityComboRole>()
    for (const def of Object.values(ABILITY_DEFS) as AbilityDef[]) {
      expect(validRoles).toContain(def.comboRole)
      seen.add(def.comboRole)
    }
    for (const role of validRoles) expect(seen.has(role), role).toBe(true)
  })

  it('ray role abilities are direct forward line-of-sight tools, not projectiles or point zones', () => {
    for (const def of Object.values(ABILITY_DEFS) as AbilityDef[]) {
      if (def.comboRole !== 'ray') continue
      expect(def.targeting, def.id).toBe('forward')
      expect(
        def.effects.some((e) => e.kind === 'projectile' || e.kind === 'zone'),
        def.id,
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
    expect(u.cooldownSec).toBe(10)
    expect(u.costStamina).toBe(40)
    expect(u.range).toBe(2.5)
    expect(u.canParry).toBe(true)
    expect(u.isKnockup).toBe(true)
    const dmg = u.effects.find((e) => e.kind === 'damage')
    expect(dmg && 'amount' in dmg ? dmg.amount : -1).toBe(16)
    const ku = u.effects.find((e) => e.kind === 'knockup')
    expect(ku && 'airborneSec' in ku ? ku.airborneSec : -1).toBeCloseTo(1.0, 5)
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
