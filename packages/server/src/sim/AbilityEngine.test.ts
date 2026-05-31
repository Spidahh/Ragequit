import { ABILITY_DEFS, GameState, Player, type ServerAbilityCastedMessage } from '@ragequit/shared'
import { describe, expect, it, beforeEach } from 'vitest'

import {
  AbilityEngine,
  type EngineHost,
  type ProjectileSpawnRequest,
  type ZoneSpawnRequest,
} from './AbilityEngine.js'
import { StatusRuntime } from './StatusRuntime.js'

// Minimal hostable that wires StatusRuntime + AbilityEngine to a synthetic
// GameState for unit testing. We keep the same `pendingDamage` array shared
// between the two so DoT damage flows correctly.

interface PendingDamageEntry {
  attackerId: string
  victimId: string
  amount: number
  element: string
  cause: string
  canParry: boolean
  lifestealFraction?: number
  onDamageStatus?: { status: string; durationSec: number; stacks?: number; slowFraction?: number }
}

interface RecordedZone {
  abilityId: string
  pos: { x: number; y: number; z: number }
  radius: number
  width: number
  durationSec: number
  damagePerTick: number
}

interface RecordedProjectile {
  ownerId: string
  abilityId: string
  comboRole: string
  damage: number
  splashRadius?: number
  lifestealFraction?: number
  speed: number
}

function makeRoom(hostOverrides: Partial<Pick<EngineHost, 'hasLineOfSight'>> = {}) {
  const state = new GameState()
  const pendingDamage: PendingDamageEntry[] = []
  const broadcasts: { type: string; message: unknown }[] = []
  const zones: RecordedZone[] = []
  const projectiles: RecordedProjectile[] = []
  const failures: { sid: string; abilityId: string; reason: string }[] = []

  // Caster + target player in front (-Z 5 m).
  const caster = new Player()
  caster.id = 'A'
  caster.transform.x = 0
  caster.transform.y = 0
  caster.transform.z = 0
  caster.transform.yaw = 0
  caster.activeWeapon = 'sword'
  for (const id of Object.keys(ABILITY_DEFS)) caster.loadout.push(id)
  state.players.set('A', caster)

  const target = new Player()
  target.id = 'B'
  target.transform.x = 0
  target.transform.y = 0
  target.transform.z = -2 // within sword 2.5 m + AoE radii
  target.activeWeapon = 'sword'
  state.players.set('B', target)

  const sink = {
    push(e: PendingDamageEntry) {
      pendingDamage.push(e)
      return pendingDamage.length
    },
    get length() {
      return pendingDamage.length
    },
  }

  const host: EngineHost = {
    state: state as unknown as { players: Map<string, Player>; tick: number },
    pendingDamage: sink,
    spawnProjectile: (req: ProjectileSpawnRequest) => {
      projectiles.push({
        ownerId: req.ownerId,
        abilityId: req.abilityId,
        comboRole: req.comboRole,
        damage: req.damage,
        splashRadius: req.splashRadius,
        lifestealFraction: req.lifestealFraction,
        speed: Math.hypot(req.vel.x, req.vel.y, req.vel.z),
      })
      return 'p1'
    },
    spawnZone: (req: ZoneSpawnRequest) => {
      zones.push({
        abilityId: req.abilityId,
        pos: req.pos,
        radius: req.radius,
        width: req.width,
        durationSec: req.durationSec,
        damagePerTick: req.damagePerTick,
      })
      return 'z1'
    },
    sendAbilityFailed: (sid, abilityId, reason) => failures.push({ sid, abilityId, reason }),
    broadcast: (type, message) => broadcasts.push({ type, message }),
    computeProjectileOrigin: (player, dir) => ({
      x: player.transform.x + dir.x * 0.6,
      y: player.transform.y + 1.5,
      z: player.transform.z + dir.z * 0.6,
    }),
    forceWeaponSwap: (sid, weapon) => {
      const p = state.players.get(sid)
      if (p) p.activeWeapon = weapon
    },
    applyKnockup: (player, airborneSec, knockback) => {
      if (knockback) {
        player.transform.x += knockback.x * knockback.distance
        player.transform.z += knockback.z * knockback.distance
      }
      player.airborneUntilTick = state.tick + Math.round(airborneSec * 60)
    },
    ...hostOverrides,
  }

  const statuses = new StatusRuntime({
    state: state as unknown as { players: Map<string, Player>; tick: number },
    pendingDamage: sink,
    broadcast: (type, message) => broadcasts.push({ type, message }),
  })
  const engine = new AbilityEngine(host, statuses)

  return {
    state,
    caster,
    target,
    engine,
    statuses,
    pendingDamage,
    broadcasts,
    zones,
    projectiles,
    failures,
  }
}

function makeRoomWithMoveResolver(
  resolveDisplacement: EngineHost['resolveDisplacement'],
): ReturnType<typeof makeRoom> {
  const r = makeRoom()
  const statuses = new StatusRuntime({
    state: r.state as unknown as { players: Map<string, Player>; tick: number },
    pendingDamage: {
      push(e: PendingDamageEntry) {
        r.pendingDamage.push(e)
        return r.pendingDamage.length
      },
    },
    broadcast: (type, message) => r.broadcasts.push({ type, message }),
  })
  r.engine = new AbilityEngine(
    {
      state: r.state as unknown as { players: Map<string, Player>; tick: number },
      pendingDamage: {
        push(e: PendingDamageEntry) {
          r.pendingDamage.push(e)
          return r.pendingDamage.length
        },
      },
      spawnProjectile: (req) => {
        r.projectiles.push({
          ownerId: req.ownerId,
          abilityId: req.abilityId,
          comboRole: req.comboRole,
          damage: req.damage,
          splashRadius: req.splashRadius,
          lifestealFraction: req.lifestealFraction,
          speed: Math.hypot(req.vel.x, req.vel.y, req.vel.z),
        })
        return 'p1'
      },
      spawnZone: (req) => {
        r.zones.push({
          abilityId: req.abilityId,
          pos: req.pos,
          radius: req.radius,
          width: req.width,
          durationSec: req.durationSec,
          damagePerTick: req.damagePerTick,
        })
        return 'z1'
      },
      sendAbilityFailed: (sid, abilityId, reason) => r.failures.push({ sid, abilityId, reason }),
      broadcast: (type, message) => r.broadcasts.push({ type, message }),
      computeProjectileOrigin: (player, dir) => ({
        x: player.transform.x + dir.x * 0.6,
        y: player.transform.y + 1.5,
        z: player.transform.z + dir.z * 0.6,
      }),
      forceWeaponSwap: (sid, weapon) => {
        const p = r.state.players.get(sid)
        if (p) p.activeWeapon = weapon
      },
      applyKnockup: (player, airborneSec, knockback) => {
        if (knockback) {
          player.transform.x += knockback.x * knockback.distance
          player.transform.z += knockback.z * knockback.distance
        }
        player.airborneUntilTick = r.state.tick + Math.round(airborneSec * 60)
      },
      resolveDisplacement,
    },
    statuses,
  )
  return r
}

describe('AbilityEngine - Uppercut numbers', () => {
  it('rejects on cooldown after a successful cast', () => {
    const r = makeRoom()
    expect(r.engine.tryCast('A', 'uppercut', { yaw: Math.PI, pitch: 0 })).toBe(true)
    // Drive windups to apply effects deterministically.
    r.state.tick += Math.round(ABILITY_DEFS.uppercut!.windupSec * 60) + 1
    r.engine.tickWindups()
    // Second cast must hit the per-ability cooldown gate.
    const accepted = r.engine.tryCast('A', 'uppercut', { yaw: Math.PI, pitch: 0 })
    expect(accepted).toBe(false)
    expect(r.failures.find((f) => f.reason === 'cooldown')).toBeDefined()
  })

  it('damages the target in front and applies the launcher knockup', () => {
    const r = makeRoom()
    // Yaw points -Z (yaw=0 is forward).
    r.engine.tryCast('A', 'uppercut', { yaw: 0, pitch: 0 })
    r.state.tick += Math.round(ABILITY_DEFS.uppercut!.windupSec * 60) + 1
    r.engine.tickWindups()
    const dmgEntries = r.pendingDamage.filter((d) => d.victimId === 'B')
    expect(dmgEntries.length).toBeGreaterThan(0)
    expect(dmgEntries[0]!.amount).toBe(16)
    expect(r.target.airborneUntilTick).toBeGreaterThan(0)
    expect(r.target.transform.z).toBeLessThan(-2)
  })
})

describe('AbilityEngine — Whirlwind (channel)', () => {
  it('applies its self-slow to the caster, not the nearest enemy', () => {
    const r = makeRoom()
    expect(r.engine.tryCast('A', 'whirlwind', { yaw: 0, pitch: 0 })).toBe(true)
    const slow = r.caster.statuses.find((s) => s.kind === 'slow')
    expect(slow?.slowFractionOverride).toBeCloseTo(0.2)
    expect(r.target.statuses.some((s) => s.kind === 'slow')).toBe(false)
  })

  it('fires 3 ticks of 7 dmg over 1 s against target inside 4 m', () => {
    const r = makeRoom()
    r.engine.tryCast('A', 'whirlwind', { yaw: 0, pitch: 0 })
    // Drive 1 s of ticks (60 frames). Each frame advance state.tick + tickWindups.
    let total = 0
    for (let i = 0; i < 65; i++) {
      r.state.tick += 1
      r.engine.tickWindups()
    }
    for (const d of r.pendingDamage) {
      if (d.victimId === 'B' && d.amount === 7) total += d.amount
    }
    expect(total).toBeGreaterThanOrEqual(12) // 2-3 ticks
    expect(total).toBeLessThanOrEqual(21)
  })
})

describe('AbilityEngine — Life Drain', () => {
  it('queues Life Drain lifesteal on channel tick damage so drainDamage heals only applied damage', () => {
    const r = makeRoom()
    r.caster.hp = 40
    expect(r.engine.tryCast('A', 'life_drain', { yaw: 0, pitch: 0 })).toBe(true)
    for (let i = 0; i < 65; i++) {
      r.state.tick += 1
      r.engine.tickWindups()
    }
    expect(r.pendingDamage.some((d) => d.victimId === 'B' && d.amount === 6)).toBe(true)
    expect(
      r.pendingDamage.find((d) => d.victimId === 'B' && d.amount === 6)?.lifestealFraction,
    ).toBeCloseTo(0.7)
    expect(r.caster.hp).toBe(40)
  })

  it('keeps the caster locked as casting for the channel duration', () => {
    const r = makeRoom()
    expect(r.engine.tryCast('A', 'life_drain', { yaw: 0, pitch: 0 })).toBe(true)
    expect(r.caster.casting).toBe(true)
    expect(r.caster.castAbilityId).toBe('life_drain')

    expect(r.engine.tryCast('A', 'fireball', { yaw: 0, pitch: 0 })).toBe(false)
    expect(
      r.failures.find((f) => f.abilityId === 'fireball' && f.reason === 'casting'),
    ).toBeDefined()

    for (let i = 0; i < 181; i++) {
      r.state.tick += 1
      r.engine.tickWindups()
    }
    expect(r.caster.casting).toBe(false)
    expect(r.caster.castAbilityId).toBe('')
  })

  it('damage interruption cancels break-on-damage channels', () => {
    const r = makeRoom()
    expect(r.engine.tryCast('A', 'life_drain', { yaw: 0, pitch: 0 })).toBe(true)

    r.engine.cancelCast('A', 'damage')

    expect(r.caster.casting).toBe(false)
    expect(r.broadcasts.find((b) => b.type === 'channelInterrupted')).toBeDefined()
    r.state.tick += 60
    r.engine.tickWindups()
    expect(r.pendingDamage.length).toBe(0)
  })

  it('damage interruption cancels windup casts before they resolve', () => {
    const r = makeRoom()
    expect(
      r.engine.tryCast('A', 'meteor', { yaw: 0, pitch: 0, point: { x: 0, y: 0, z: -4 } }),
    ).toBe(true)

    r.engine.cancelCast('A', 'damage')
    r.state.tick += Math.round(ABILITY_DEFS.meteor!.windupSec * 60) + 1
    r.engine.tickWindups()

    expect(r.caster.casting).toBe(false)
    expect(r.zones.length).toBe(0)
  })
})

describe('AbilityEngine — self utility targeting', () => {
  it('applies Barrier shield to the caster, not the nearest enemy', () => {
    const r = makeRoom()
    expect(r.engine.tryCast('A', 'barrier', { yaw: 0, pitch: 0 })).toBe(true)
    expect(r.caster.statuses.some((s) => s.kind === 'shield' && s.stacks === 42)).toBe(true)
    expect(r.target.statuses.some((s) => s.kind === 'shield')).toBe(false)
  })

  it('blocks offensive casts while Phase Shift invulnerability is active', () => {
    const r = makeRoom()
    expect(r.engine.tryCast('A', 'phase_shift', { yaw: 0, pitch: 0 })).toBe(true)
    expect(r.engine.tryCast('A', 'fireball', { yaw: 0, pitch: 0 })).toBe(false)
    expect(r.failures.find((f) => f.abilityId === 'fireball' && f.reason === 'cc')).toBeDefined()
  })

  it('blocks incoming statuses while Phase Shift invulnerability is active', () => {
    const r = makeRoom()
    r.statuses.applyToPlayer('B', 'invulnerable', 0.6, 1, 'B')
    expect(r.engine.tryCast('A', 'bleed_strike', { yaw: 0, pitch: 0 })).toBe(true)
    expect(r.target.statuses.some((s) => s.kind === 'bleed')).toBe(false)
  })
})

describe('AbilityEngine — parryable followups', () => {
  it('does not apply Guard Break stun through an active parry', () => {
    const r = makeRoom()
    r.target.parrying = true
    r.target.parryIsHold = false

    expect(r.engine.tryCast('A', 'guard_break', { yaw: 0, pitch: 0 })).toBe(true)
    r.state.tick += Math.round(ABILITY_DEFS.guard_break!.windupSec * 60) + 1
    r.engine.tickWindups()

    expect(r.target.statuses.some((s) => s.kind === 'stun')).toBe(false)
    expect(r.pendingDamage.find((d) => d.cause === 'ability:guard_break')?.canParry).toBe(true)
  })

  it('does not apply Freeze Target freeze through an active parry', () => {
    const r = makeRoom()
    r.target.parrying = true
    r.target.parryIsHold = false

    expect(r.engine.tryCast('A', 'freeze_target', { yaw: 0, pitch: 0 })).toBe(true)

    expect(r.target.statuses.some((s) => s.kind === 'freeze')).toBe(false)
  })

  it('does not apply Guard Break shove through an active parry', () => {
    const r = makeRoom()
    r.target.parrying = true
    r.target.parryIsHold = false

    expect(r.engine.tryCast('A', 'guard_break', { yaw: 0, pitch: 0 })).toBe(true)
    r.state.tick += Math.round(ABILITY_DEFS.guard_break!.windupSec * 60) + 1
    r.engine.tickWindups()

    expect(r.target.airborneUntilTick).toBe(0)
    expect(r.target.transform.z).toBe(-2)
  })

  it('keeps airborne parry protection against parryable followups', () => {
    const r = makeRoom()
    r.target.parrying = true
    r.target.parryIsHold = false
    r.target.airborneUntilTick = r.state.tick + 120

    expect(r.engine.tryCast('A', 'freeze_target', { yaw: 0, pitch: 0 })).toBe(true)

    expect(r.target.statuses.some((s) => s.kind === 'freeze')).toBe(false)
  })
})

describe('AbilityEngine — vision control', () => {
  it('Curse of Weakness applies blind as a major vision denial', () => {
    const r = makeRoom()

    expect(r.engine.tryCast('A', 'curse_of_weakness', { yaw: 0, pitch: 0 })).toBe(true)
    r.state.tick += Math.round(ABILITY_DEFS.curse_of_weakness!.windupSec * 60) + 1
    r.engine.tickWindups()

    expect(r.target.statuses.some((s) => s.kind === 'curse')).toBe(true)
    expect(r.target.statuses.some((s) => s.kind === 'blind' && s.remainingSec === 4.0)).toBe(true)
    expect(r.target.mana).toBe(102)
  })
})

describe('AbilityEngine — resource drain', () => {
  it('drains stamina and refunds the caster through Life Drain', () => {
    const r = makeRoom()
    r.caster.stamina = 20
    r.target.stamina = 50

    expect(r.engine.tryCast('A', 'life_drain', { yaw: 0, pitch: 0 })).toBe(true)

    expect(r.target.stamina).toBe(30)
    expect(r.caster.stamina).toBe(30)
  })

  it('does not drain mana from a parrying target with Curse of Weakness (canParry=true)', () => {
    const r = makeRoom()
    r.target.parrying = true
    r.target.parryIsHold = false

    expect(r.engine.tryCast('A', 'curse_of_weakness', { yaw: 0, pitch: 0 })).toBe(true)
    r.state.tick += Math.round(ABILITY_DEFS.curse_of_weakness!.windupSec * 60) + 1
    r.engine.tickWindups()

    // Status effects and resource drain must all be blocked by parry.
    expect(r.target.statuses.some((s) => s.kind === 'curse')).toBe(false)
    expect(r.target.statuses.some((s) => s.kind === 'blind')).toBe(false)
    expect(r.target.mana).toBe(120) // MANA_MAX — no drain went through
  })
})

describe('AbilityEngine — ability-specific target rules', () => {
  it('does not knock up airborne targets with Root Upthrow', () => {
    const r = makeRoom()
    r.target.onGround = false

    expect(r.engine.tryCast('A', 'root_upthrow', { yaw: 0, pitch: 0 })).toBe(true)

    expect(r.pendingDamage.find((d) => d.cause === 'ability:root_upthrow')).toBeDefined()
    expect(r.target.airborneUntilTick).toBe(0)
  })
})

describe('AbilityEngine — Bleed Strike', () => {
  it('damages and applies bleed status', () => {
    const r = makeRoom()
    r.engine.tryCast('A', 'bleed_strike', { yaw: 0, pitch: 0 })
    expect(r.pendingDamage.find((d) => d.amount === 10)).toBeDefined()
    expect(r.target.statuses.length).toBe(1)
    expect(r.target.statuses[0]!.kind).toBe('bleed')
  })

  it('does not hit targets behind the caster with forward melee targeting', () => {
    const r = makeRoom()
    r.target.transform.z = 2
    expect(r.engine.tryCast('A', 'bleed_strike', { yaw: 0, pitch: 0 })).toBe(true)
    expect(r.pendingDamage.find((d) => d.victimId === 'B')).toBeUndefined()
    expect(r.target.statuses.length).toBe(0)
  })
})

describe('AbilityEngine — Fireball (auto-swap to staff + projectile)', () => {
  it('swaps caster to staff and spawns a projectile with onHit burn', () => {
    const r = makeRoom()
    expect(r.engine.tryCast('A', 'fireball', { yaw: 0, pitch: 0 })).toBe(true)
    expect(r.caster.activeWeapon).toBe('staff')
    expect(r.projectiles.length).toBe(1)
    expect(r.projectiles[0]!.abilityId).toBe('fireball')
    expect(r.projectiles[0]!.comboRole).toBe('finisher')
    expect(r.projectiles[0]!.damage).toBe(24)
    expect(r.projectiles[0]!.splashRadius).toBe(2.6)
  })
})

describe('AbilityEngine — finisher deals flat damage (no air bonus)', () => {
  it('does not multiply finisher damage against an airborne target', () => {
    const r = makeRoom()
    r.target.airborneUntilTick = r.state.tick + 200

    expect(
      r.engine.tryCast('A', 'meteor', { yaw: 0, pitch: 0, point: { x: 0, y: 0, z: -2 } }),
    ).toBe(true)
    r.state.tick += Math.round(ABILITY_DEFS.meteor!.windupSec * 60) + 1
    r.engine.tickWindups()

    // Meteor base damage is 44; knockup is just displacement, no damage multiplier.
    expect(r.pendingDamage.find((d) => d.cause === 'ability:meteor')?.amount).toBeCloseTo(44)
  })
})

describe('AbilityEngine — projectile payloads', () => {
  it('carries projectile lifesteal metadata for Shadow Bolt', () => {
    const r = makeRoom()
    expect(r.engine.tryCast('A', 'shadow_bolt', { yaw: 0, pitch: 0 })).toBe(true)
    expect(r.projectiles.length).toBe(1)
    expect(r.projectiles[0]!.damage).toBe(18)
    expect(r.projectiles[0]!.lifestealFraction).toBe(0.25)
  })
})

describe('AbilityEngine — forward aim targeting', () => {
  it('applies single-target forward damage only to the aimed enemy', () => {
    const r = makeRoom()
    const behind = new Player()
    behind.id = 'C'
    behind.transform.x = 0
    behind.transform.y = 0
    behind.transform.z = 2
    r.state.players.set('C', behind)

    expect(r.engine.tryCast('A', 'chain_bolt', { yaw: 0, pitch: 0 })).toBe(true)

    expect(r.pendingDamage.find((d) => d.victimId === 'B' && d.amount === 22)).toBeDefined()
    expect(r.pendingDamage.find((d) => d.victimId === 'C' && d.amount === 22)).toBeUndefined()
  })

  it('does not double-hit Chain Bolt primary with its secondary arc', () => {
    const r = makeRoom()
    const sideTarget = new Player()
    sideTarget.id = 'C'
    sideTarget.transform.x = 2
    sideTarget.transform.y = 0
    sideTarget.transform.z = -2
    r.state.players.set('C', sideTarget)

    expect(r.engine.tryCast('A', 'chain_bolt', { yaw: 0, pitch: 0 })).toBe(true)

    expect(r.pendingDamage.filter((d) => d.victimId === 'B').map((d) => d.amount)).toEqual([22])
    expect(r.pendingDamage.find((d) => d.victimId === 'C' && d.amount === 10)).toBeDefined()
  })

  it('does not target enemies hidden behind line-of-sight blockers', () => {
    const r = makeRoom({ hasLineOfSight: () => false })

    expect(r.engine.tryCast('A', 'chain_bolt', { yaw: 0, pitch: 0 })).toBe(true)

    expect(r.pendingDamage.find((d) => d.victimId === 'B')).toBeUndefined()
  })

  it('centres forward AoE spells on the aimed target instead of the caster', () => {
    const r = makeRoom()
    r.target.transform.z = -9

    expect(r.engine.tryCast('A', 'eruption', { yaw: 0, pitch: 0 })).toBe(true)

    expect(r.pendingDamage.find((d) => d.victimId === 'B' && d.amount === 8)).toBeDefined()
    expect(r.target.airborneUntilTick).toBeGreaterThan(0)
  })
})

describe('StatusRuntime — status ticks', () => {
  it('applies fire element to burn status tick damage', () => {
    const r = makeRoom()
    r.statuses.applyToPlayer('B', 'burn', 3, 1, 'A')

    for (let i = 0; i < 60; i++) {
      r.state.tick += 1
      r.statuses.tick(1 / 60)
    }

    const burnTick = r.pendingDamage.find((d) => d.cause === 'status:burn')
    expect(burnTick?.amount).toBe(2)
    expect(burnTick?.element).toBe('fire')
  })
})

describe('StatusRuntime — status combos', () => {
  it('centres Steam explosion on the combo victim, not the attacker', () => {
    const r = makeRoom()
    r.target.transform.z = -10

    const nearbyVictim = new Player()
    nearbyVictim.id = 'C'
    nearbyVictim.transform.x = 0
    nearbyVictim.transform.y = 0
    nearbyVictim.transform.z = -11
    r.state.players.set('C', nearbyVictim)

    r.statuses.applyToPlayer('B', 'burn', 3, 1, 'A')
    r.statuses.applyToPlayer('B', 'chill', 4, 1, 'A')

    expect(r.pendingDamage.some((d) => d.cause === 'combo:steam' && d.victimId === 'B')).toBe(true)
    expect(r.pendingDamage.some((d) => d.cause === 'combo:steam' && d.victimId === 'C')).toBe(true)
    expect(r.pendingDamage.some((d) => d.cause === 'combo:steam' && d.victimId === 'A')).toBe(false)
  })
})

describe('AbilityEngine — Flame Wall (DoD probe: data-only ability)', () => {
  it('spawns a wall zone with 8 dmg/s for 3 s', () => {
    const r = makeRoom()
    expect(
      r.engine.tryCast('A', 'flame_wall', { yaw: 0, pitch: 0, point: { x: 3, y: 0, z: -4 } }),
    ).toBe(true)
    expect(r.zones.length).toBe(1)
    expect(r.zones[0]!.abilityId).toBe('flame_wall')
    expect(r.zones[0]!.pos.x).toBe(3)
    expect(r.zones[0]!.pos.z).toBe(-4)
    expect(r.zones[0]!.damagePerTick).toBe(6)
    expect(r.zones[0]!.durationSec).toBe(3.5)
    expect(r.zones[0]!.width).toBe(7)
  })
})

describe('AbilityEngine — point targeting', () => {
  it('places point-targeted bow and magic zones at the supplied aim point', () => {
    const r = makeRoom()
    expect(
      r.engine.tryCast('A', 'volley', { yaw: 0, pitch: 0, point: { x: 4, y: 0, z: -6 } }),
    ).toBe(true)
    expect(r.zones[0]!.abilityId).toBe('volley')
    expect(r.zones[0]!.pos.x).toBe(4)
    expect(r.zones[0]!.pos.z).toBe(-6)
  })

  it('clamps supplied point targets to the ability range on the server', () => {
    const r = makeRoom()

    expect(
      r.engine.tryCast('A', 'volley', { yaw: 0, pitch: 0, point: { x: 0, y: 0, z: -300 } }),
    ).toBe(true)

    expect(r.zones[0]!.abilityId).toBe('volley')
    expect(r.zones[0]!.pos.z).toBeCloseTo(-ABILITY_DEFS.volley!.range)
  })
})

describe('AbilityEngine — zone placement', () => {
  it('places self-anchored zones at the caster instead of max range forward', () => {
    const r = makeRoom()
    expect(r.engine.tryCast('A', 'snare_trap', { yaw: 0, pitch: 0 })).toBe(true)
    expect(r.zones.length).toBe(1)
    expect(r.zones[0]!.abilityId).toBe('snare_trap')
    expect(r.zones[0]!.pos.x).toBeCloseTo(r.caster.transform.x)
    expect(r.zones[0]!.pos.z).toBeCloseTo(r.caster.transform.z)
  })
})

describe('AbilityEngine — movement collision contract', () => {
  it('delegates collision-cancel dashes to the room displacement resolver', () => {
    const r = makeRoomWithMoveResolver((player, dx, dz, cancelOnCollision) => {
      expect(cancelOnCollision).toBe(true)
      return { x: player.transform.x + dx * 0.5, z: player.transform.z + dz * 0.5 }
    })

    expect(r.engine.tryCast('A', 'quick_dash', { yaw: 0, pitch: 0 })).toBe(true)

    expect(r.caster.transform.z).toBeCloseTo(-2)
  })

  it('uses current movement direction for Quick Dash instead of always using aim yaw', () => {
    const r = makeRoomWithMoveResolver((player, dx, dz) => ({
      x: player.transform.x + dx,
      z: player.transform.z + dz,
    }))
    r.caster.vx = 6
    r.caster.vz = 0

    expect(r.engine.tryCast('A', 'quick_dash', { yaw: 0, pitch: 0 })).toBe(true)

    expect(r.caster.transform.x).toBeCloseTo(4)
    expect(r.caster.transform.z).toBeCloseTo(0)
  })

  it('treats wall-blocked teleports as collision-cancel movement', () => {
    const r = makeRoomWithMoveResolver((player, dx, dz, cancelOnCollision) => {
      expect(cancelOnCollision).toBe(true)
      return { x: player.transform.x + dx * 0.5, z: player.transform.z + dz * 0.5 }
    })

    expect(r.engine.tryCast('A', 'fire_blink', { yaw: 0, pitch: 0 })).toBe(true)

    expect(r.caster.transform.z).toBeCloseTo(-3.5)
  })
})

describe('AbilityEngine — gating', () => {
  let r: ReturnType<typeof makeRoom>
  beforeEach(() => {
    r = makeRoom()
  })

  it('rejects unknown ability ids', () => {
    expect(r.engine.tryCast('A', 'does_not_exist', { yaw: 0, pitch: 0 })).toBe(false)
    expect(r.failures.find((f) => f.reason === 'unknown_ability')).toBeDefined()
  })

  it('rejects known abilities that are not equipped in the current loadout', () => {
    while (r.caster.loadout.length > 0) r.caster.loadout.pop()
    r.caster.loadout.push('uppercut')

    expect(r.engine.tryCast('A', 'fireball', { yaw: 0, pitch: 0 })).toBe(false)

    expect(
      r.failures.find((f) => f.abilityId === 'fireball' && f.reason === 'not_in_loadout'),
    ).toBeDefined()
  })

  it('allows equipped ability casts while airborne unless the ability says otherwise', () => {
    r.caster.airborneUntilTick = 9999
    expect(r.engine.tryCast('A', 'whirlwind', { yaw: 0, pitch: 0 })).toBe(true)
    expect(r.failures.find((f) => f.reason === 'grounded_required')).toBeUndefined()
  })

  it('rejects when stamina is short', () => {
    r.caster.stamina = 5
    expect(r.engine.tryCast('A', 'uppercut', { yaw: 0, pitch: 0 })).toBe(false)
    expect(r.failures.find((f) => f.reason === 'cost')).toBeDefined()
  })

  it('rejects when mana is short', () => {
    r.caster.mana = 5
    expect(r.engine.tryCast('A', 'fireball', { yaw: 0, pitch: 0 })).toBe(false)
    expect(r.failures.find((f) => f.reason === 'cost')).toBeDefined()
  })

  it('rejects ability casts during a sword swing animation', () => {
    r.caster.swingEndsAtTick = r.state.tick + 10
    expect(r.engine.tryCast('A', 'uppercut', { yaw: 0, pitch: 0 })).toBe(false)
    expect(r.failures.find((f) => f.reason === 'casting')).toBeDefined()
  })

  it('rejects ability casts while bow charge is active', () => {
    r.caster.bowChargeStartTick = r.state.tick + 1
    expect(r.engine.tryCast('A', 'fireball', { yaw: 0, pitch: 0 })).toBe(false)
    expect(r.failures.find((f) => f.reason === 'casting')).toBeDefined()
  })
})

describe('AbilityCasted broadcast', () => {
  it('emits AbilityCasted on a successful start', () => {
    const r = makeRoom()
    r.engine.tryCast('A', 'whirlwind', { yaw: 0, pitch: 0 })
    const cast = r.broadcasts.find((b) => b.type === 'abilityCasted')
    expect(cast).toBeDefined()
    expect((cast!.message as ServerAbilityCastedMessage).abilityId).toBe('whirlwind')
  })
})
