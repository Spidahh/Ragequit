import { Player } from '@ragequit/shared'
import { describe, expect, it, beforeEach } from 'vitest'

import { BotController, type BotHostFns } from './BotController.js'

function makeTestHost() {
  const self = new Player()
  self.id = 'bot-1'
  self.hp = 200
  self.mana = 200
  self.stamina = 200
  self.classId = 'drift'
  self.activeWeapon = 'sword'

  const opponent = new Player()
  opponent.id = 'player-1'
  opponent.hp = 200
  opponent.mana = 200
  opponent.stamina = 200
  opponent.classId = 'drift'
  opponent.activeWeapon = 'sword'

  let currentTick = 0

  const casts: { id: string; abilityId: string; yaw: number; pitch: number }[] = []
  const inputs: {
    id: string
    mx: number
    mz: number
    yaw: number
    jump?: boolean
    m2?: boolean
  }[] = []
  const swings: { id: string; yaw: number }[] = []
  const swaps: { id: string; weapon: 'sword' | 'bow' | 'staff' }[] = []

  const host: BotHostFns = {
    getSelf: () => self,
    getOpponent: () => opponent,
    sendCast: (id, abilityId, yaw, pitch) => {
      casts.push({ id, abilityId, yaw, pitch })
    },
    sendInput: (id, mx, mz, yaw, jump, m2) => {
      inputs.push({ id, mx, mz, yaw, jump, m2 })
    },
    sendSwing: (id, yaw) => {
      swings.push({ id, yaw })
    },
    sendWeaponSwap: (id, weapon) => {
      self.activeWeapon = weapon // simulate immediate active weapon change in test helper
      swaps.push({ id, weapon })
    },
    cdReady: () => true,
  }

  return {
    self,
    opponent,
    currentTick: () => currentTick,
    setTick: (t: number) => {
      currentTick = t
    },
    host,
    casts,
    inputs,
    swings,
    swaps,
  }
}

describe('BotController', () => {
  let r: ReturnType<typeof makeTestHost>

  beforeEach(() => {
    r = makeTestHost()
  })

  it('Novice AI: moves and basic swings, never casts spells', () => {
    const loadout = ['uppercut', 'marksman_shot', 'fireball', 'adaptive_mend']
    const bot = new BotController('bot-1', r.host, r.currentTick, loadout, 'novice')

    // Position bot close to opponent so it's in melee range (dist < 1.4)
    r.self.transform.x = 0
    r.self.transform.z = 0
    r.opponent.transform.x = 1
    r.opponent.transform.z = 0

    bot.step()

    expect(r.inputs.length).toBeGreaterThan(0)
    // Basic swing should trigger because we are in melee range
    expect(r.swings.length).toBe(1)
    // Novice should never cast spells
    expect(r.casts.length).toBe(0)
  })

  it('Competent AI: casts general abilities, occasionally parries', () => {
    const loadout = ['uppercut', 'marksman_shot', 'fireball', 'adaptive_mend']
    const bot = new BotController('bot-1', r.host, r.currentTick, loadout, 'competent')

    r.self.transform.x = 0
    r.self.transform.z = 0
    r.opponent.transform.x = 2
    r.opponent.transform.z = 0

    // Bot RNG is now seeded from botId (deterministic) — no Math.random mock needed.
    bot.step()
    expect(r.casts.length).toBe(1)
    expect(r.casts[0]?.abilityId).toBe('uppercut')
  })

  it('Master AI: parries predictably when opponent is swinging', () => {
    const loadout = ['uppercut', 'marksman_shot', 'fireball', 'adaptive_mend']
    const bot = new BotController('bot-1', r.host, r.currentTick, loadout, 'master')

    r.self.transform.x = 0
    r.self.transform.z = 0
    r.opponent.transform.x = 2
    r.opponent.transform.z = 0

    // Opponent is swinging
    r.opponent.swingEndsAtTick = 100
    r.setTick(10)

    // Self is hybrid holding a sword; Master parry check fires when dist <= 4.0
    // and the opponent is swinging. Bot RNG is seeded deterministically from the
    // botId, so the parry roll is reproducible — no Math.random mock needed.
    bot.step()
    const parryInput = r.inputs.find((i) => i.m2 === true)
    expect(parryInput).toBeDefined()
  })

  it('Master AI: swaps weapon and executes combo when opponent is airborne', () => {
    const loadout = ['uppercut', 'marksman_shot', 'fireball', 'adaptive_mend']
    const bot = new BotController('bot-1', r.host, r.currentTick, loadout, 'master')

    r.self.transform.x = 0
    r.self.transform.z = 0
    r.opponent.transform.x = 5
    r.opponent.transform.z = 0

    // Enemy is airborne!
    r.opponent.airborneUntilTick = 100
    r.setTick(10)

    // First step: Bot is holding 'sword', needs to cast 'marksman_shot' (weapon: bow) or 'fireball' (weapon: staff).
    // It should trigger a weapon swap to 'bow' first.
    bot.step()

    expect(r.swaps).toContainEqual({ id: 'bot-1', weapon: 'bow' })
    // The active weapon was set to 'bow' in our helper. On the next decision tick, it can cast the bow spell.
    r.setTick(20)
    bot.step()

    expect(r.casts).toContainEqual(expect.objectContaining({ abilityId: 'marksman_shot' }))
  })

  it('is deterministic — same botId + inputs produce identical decisions', () => {
    const loadout = ['uppercut', 'marksman_shot', 'fireball', 'adaptive_mend']
    const run = (botId: string): string => {
      const h = makeTestHost()
      h.self.transform.x = 0
      h.self.transform.z = 0
      h.opponent.transform.x = 6
      h.opponent.transform.z = 0
      h.opponent.casting = true // exercises the rng-gated dodge branch
      const bot = new BotController(botId, h.host, h.currentTick, loadout, 'competent')
      for (let t = 0; t < 40; t++) {
        h.setTick(t)
        bot.step()
      }
      return JSON.stringify({ inputs: h.inputs, swings: h.swings, casts: h.casts })
    }
    // Same seed (botId) → bit-identical decision stream (replay fidelity).
    expect(run('bot-1')).toBe(run('bot-1'))
    // Different seed → behaviour may differ (variety preserved across bots).
    expect(run('bot-1')).not.toBe(run('bot-2'))
  })
})
