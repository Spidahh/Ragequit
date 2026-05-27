import { Player } from '@ragequit/shared'
import { describe, expect, it, beforeEach } from 'vitest'

import { BotController, type BotHostFns } from './BotController.js'

function makeTestHost() {
  const self = new Player()
  self.id = 'bot-1'
  self.hp = 200
  self.mana = 200
  self.stamina = 200
  self.classId = 'hybrid'
  self.activeWeapon = 'sword'

  const opponent = new Player()
  opponent.id = 'player-1'
  opponent.hp = 200
  opponent.mana = 200
  opponent.stamina = 200
  opponent.classId = 'hybrid'
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

    const originalRandom = Math.random
    Math.random = () => 0 // Force success in random checks and selection

    try {
      // Cast should trigger
      bot.step()
      expect(r.casts.length).toBe(1)
      expect(r.casts[0]?.abilityId).toBe('uppercut')
    } finally {
      Math.random = originalRandom
    }
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

    // In our test, self is hybrid, holding a sword.
    // Master AI parry check checks if dist <= 4.0 and (opponent.swingEndsAtTick > tick || opponent.casting).
    // Let's force Math.random() in BotController to return 0 inside the test so parry is guaranteed 100% of the time,
    // Simulate enough steps to guarantee at least one parry branch.
    const originalRandom = Math.random
    Math.random = () => 0 // Force success in random checks

    try {
      bot.step()
      const parryInput = r.inputs.find((i) => i.m2 === true)
      expect(parryInput).toBeDefined()
    } finally {
      Math.random = originalRandom
    }
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
})
