import { Room, type Client } from '@colyseus/core'
import {
  type ClientTransmuteMessage,
  type AbilityComboRole,
  type ServerZoneExpiredMessage,
  type ServerZoneSpawnedMessage,
  ABILITY_DEFS,
  type StatusKind,
  Zone,
  movementCapsFromStatuses,
  BOW_CHARGE_FULL_SEC,
  BOW_DAMAGE_FULL,
  BOW_DAMAGE_MIN,
  BOW_GRAVITY_MPS2,
  BOW_PROJECTILE_LIFETIME_SEC,
  BOW_SPEED_FULL_MPS,
  BOW_SPEED_MIN_MPS,
  GameState,
  HP_MAX,
  HP_REGEN_OOC_DELAY_SEC,
  HP_REGEN_PER_SEC_OOC,
  LAG_COMP_BUFFER_MS,
  LAG_COMP_MAX_COMPENSATE_MS,
  MANA_MAX,
  MANA_REGEN_DELAY_SEC,
  MANA_REGEN_PER_SEC,
  MessageTypes,
  PARRY_HOLD_BLOCK_FRAC,
  PARRY_HOLD_DRAIN_PER_SEC,
  PARRY_TAP_BLOCK_FRAC,
  PARRY_TAP_COOLDOWN_SEC,
  PARRY_TAP_COST_STAMINA,
  PARRY_TAP_WINDOW_SEC,
  PLAYER_CAPSULE_HEIGHT_M,
  PLAYER_CAPSULE_RADIUS_M,
  PROJECTILE_MUZZLE_Y_OFFSET_M,
  Player,
  Projectile,
  RESPAWN_SEC,
  SPAWN_INVULN_SEC,
  STAFF_M1_CADENCE_SEC,
  STAFF_M1_DAMAGE,
  STAFF_M1_GRAVITY_MPS2,
  STAFF_M1_LIFETIME_SEC,
  STAFF_M1_MANA_COST,
  STAFF_M1_SPEED_MPS,
  CURSE_OUTGOING_DAMAGE_MULT,
  STAMINA_MAX,
  STAMINA_REGEN_PER_SEC_IDLE,
  STAMINA_REGEN_PER_SEC_MOVING,
  STATIC_MAP,
  getMap,
  type StaticMap,
  SWORD_M1_HIT_FRACTION,
  SWORD_M1_SWING_SEC,
  TERRAIN_GROUND_Y,
  TICK_MS,
  TICK_RATE_HZ,
  UPPERCUT_AIRBORNE_SEC,
  WEAPON_IDS,
  WEAPON_SWAP_LOCK_SEC,
  advanceSwordCombo,
  applyParryReduction,
  bowChargeRatio,
  bowLerp,
  directionFromYawPitch,
  isInSwordM1Cone,
  makePlayerSimState,
  segmentVsAabb,
  segmentVsCapsule,
  segmentVsGround,
  simulatePlayer,
  stepProjectile,
  uppercutInitialVy,
  type CapsuleTarget,
  type ClientCastMessage,
  type ClientChargeReleaseMessage,
  type ClientChargeStartMessage,
  type ClientFireStaffMessage,
  type ClientInputMessage,
  type ClientParryPressMessage,
  type ClientParryReleaseMessage,
  type ClientSwingMessage,
  type ClientLoadoutMessage,
  type ClientWeaponSwapMessage,
  type PlayerSimState,
  type ProjectileState,
  type ServerAbilityFailedMessage,
  type ServerDeathMessage,
  type ServerKillStreakMessage,
  type ServerHitMessage,
  type ServerParryEventMessage,
  type ServerProjectileExpiredMessage,
  type ServerProjectileSpawnedMessage,
  type ServerWeaponSwappedMessage,
  type SimInput,
  type Weapon,
  computeLoadoutMastery,
} from '@ragequit/shared'

import {
  AbilityEngine,
  AIR_PUNISH_DAMAGE_MULT,
  BotController,
  MatchManager,
  RateLimiter,
  ReplayRecorder,
  StatusRuntime,
  TransmuteHandler,
  type ProjectileSpawnRequest,
  type ZoneSpawnRequest,
} from '../sim/index.js'

// Fase 3 GameRoom — three weapons (sword / bow / staff), parry, projectiles.
//
// New vs Fase 2:
//   - Weapon swap is atomic, no delay, no cost. Active charge/bolt cadence
//     is reset on swap.
//   - Bow M1: M1-held charge -> release spawns a Projectile. Damage + speed
//     scale linearly from min charge (0.3 s) to full (2.0 s). Charge cancels
//     on damage taken.
//   - Staff M1: rate-limited bolt (0.5 s cadence), 5 mana per bolt, 8 dmg,
//     50 m/s, flat-ish trajectory.
//   - Parry M2: tap (0.5 s window, 100% block, 20 stamina, 3 s CD) vs hold
//     (70% block, 15 stam/s drain). Tap triggers if press+release happens
//     inside the window; otherwise it enters hold.
//   - Projectiles: server-integrated per tick via shared stepProjectile.
//     Collision against player capsules, static boxes, ground plane. One hit
//     kills the projectile. Friendly fire on for Fase 3 (1v1 only).

const LAG_COMP_BUFFER_TICKS = Math.round(LAG_COMP_BUFFER_MS / TICK_MS) // ~24
const LAG_COMP_MAX_TICKS = Math.floor(LAG_COMP_MAX_COMPENSATE_MS / TICK_MS) // ~12
const RESPAWN_TICKS = Math.round(RESPAWN_SEC * TICK_RATE_HZ)
const SPAWN_INVULN_TICKS = Math.round(SPAWN_INVULN_SEC * TICK_RATE_HZ)
const UPPERCUT_AIRBORNE_TICKS = Math.round(UPPERCUT_AIRBORNE_SEC * TICK_RATE_HZ)
const SWORD_SWING_TICKS = Math.round(SWORD_M1_SWING_SEC * TICK_RATE_HZ)
const SWORD_HIT_OFFSET_TICKS = Math.round(SWORD_SWING_TICKS * SWORD_M1_HIT_FRACTION)
const OOC_DELAY_TICKS = Math.round(HP_REGEN_OOC_DELAY_SEC * TICK_RATE_HZ)
const MANA_DELAY_TICKS = Math.round(MANA_REGEN_DELAY_SEC * TICK_RATE_HZ)
const PARRY_TAP_WINDOW_TICKS = Math.round(PARRY_TAP_WINDOW_SEC * TICK_RATE_HZ)
const PARRY_TAP_COOLDOWN_TICKS = Math.round(PARRY_TAP_COOLDOWN_SEC * TICK_RATE_HZ)
const STAFF_CADENCE_TICKS = Math.round(STAFF_M1_CADENCE_SEC * TICK_RATE_HZ)
const BOW_LIFETIME_TICKS = Math.round(BOW_PROJECTILE_LIFETIME_SEC * TICK_RATE_HZ)
const STAFF_LIFETIME_TICKS = Math.max(1, Math.round(STAFF_M1_LIFETIME_SEC * TICK_RATE_HZ))
// Must be > PLAYER_CAPSULE_RADIUS_M (0.65) so the projectile spawns outside
// the shooter's own capsule and avoids an immediate self-collision.
const PROJECTILE_SPAWN_FORWARD_OFFSET_M = 0.8
// Eye/muzzle height above capsule centre. Must match the client FPS camera.
const PROJECTILE_SPAWN_Y_OFFSET_M = PROJECTILE_MUZZLE_Y_OFFSET_M

interface PendingSwing {
  attackerId: string
  startTick: number
  hitTick: number
  fromAtTick: number // client-estimated server tick at fire time (for rewind)
  yaw: number
  damage: number
  originX: number
  originY: number
  originZ: number
  resolved: boolean
}

interface PositionSnapshot {
  tick: number
  x: number
  y: number
  z: number
}

interface PendingDamage {
  attackerId: string
  victimId: string
  damage: number
  knockup: boolean
  cause: string
  canParry: boolean
  element: string // '' = physical; 'fire'/'ice'/etc. for elemental hits
  lifestealFraction?: number
  onDamageStatus?: { kind: StatusKind; durationSec: number; stacks: number; slowFraction?: number }
}

interface ProjectileMeta {
  ownerId: string
  abilityId?: string
  comboRole?: AbilityComboRole
  kind: 'arrow' | 'bolt'
  damage: number
  element: string
  splashRadius: number
  lifestealFraction?: number
  onHitStatus?: { kind: StatusKind; durationSec: number; stacks: number; slowFraction?: number }
  chainTargets?: number
  chainRadius?: number
  chainDamage?: number
  chainChance?: number
}

interface WeaponInfusion {
  element: string
  speedMult?: number
  splashRadius?: number
  lifestealFraction?: number
  onHitStatus?: { kind: StatusKind; durationSec: number; stacks: number; slowFraction?: number }
  chainTargets?: number
  chainRadius?: number
  chainDamage?: number
  chainChance?: number
}

export class GameRoom extends Room<GameState> {
  override maxClients = Number(process.env['MAX_CLIENTS'] ?? 2)

  private tickTimer: NodeJS.Timeout | null = null

  private readonly sim = new Map<string, PlayerSimState>()
  private readonly inputQueues = new Map<string, ClientInputMessage[]>()
  private readonly swingQueues = new Map<string, ClientSwingMessage[]>()
  private readonly castQueues = new Map<string, ClientCastMessage[]>()
  private readonly lastSeqSeen = new Map<string, number>()
  private readonly prevJumpHeld = new Map<string, boolean>()

  // Ring buffer of last LAG_COMP_BUFFER_TICKS position snapshots per player.
  // Used to rewind victim positions when resolving melee hits.
  private readonly positionHistory = new Map<string, PositionSnapshot[]>()

  // Active sword swings — resolved on their hit tick.
  private pendingSwings: PendingSwing[] = []

  // Damage queued during a tick by swings/casts/projectiles; drained at end.
  private damageQueue: PendingDamage[] = []

  // Fase 3: projectile integration state. Keyed by projectile id; the schema
  // object holds replicated fields but we keep a companion `Vec3` sim state
  // to avoid reading/writing Colyseus primitives every substep.
  private readonly projectileSim = new Map<string, ProjectileState>()
  private readonly projectileMeta = new Map<string, ProjectileMeta>()

  // Fase 3: press-tick for parry, needed to decide tap vs hold at release.
  private readonly parryPressTick = new Map<string, number>()

  private projectileIdCounter = 0
  private zoneIdCounter = 0

  // Fase 4 transmute queue + engine + status runtime + transmute handler.
  private readonly transmuteQueues = new Map<string, ClientTransmuteMessage[]>()
  private engine!: AbilityEngine
  private statuses!: StatusRuntime
  private transmute!: TransmuteHandler
  // Fase 7: BO5 round flow + ELO + scoreboard.
  private match!: MatchManager
  // Fase 9b: anti-cheat rate limiter + replay recorder.
  private readonly rateLimiter = new RateLimiter()
  private replay!: ReplayRecorder
  // Fase 5: in-process bots for TTK calibration / training mode.
  private readonly bots = new Map<string, BotController>()
  private botSpawnAtMatchStart = Number(process.env['BOTS'] ?? 0)
  // Active map — set from room options in onCreate; defaults to blockout.
  private activeMap: StaticMap = STATIC_MAP
  // Track per-player kill count + match start for TTK logging.
  private matchStartTick: number = 0
  // (zoneTickAccs / zoneApplyAccs removed — zone scheduling uses z.nextTickAtTick on schema)

  // Kill streak tracking. Key = sessionId, value = consecutive kill count.
  // Resets to 0 when the player dies. Applies an outgoing damage multiplier:
  //   1 kill  → +0%   (just a streak counter, no bonus yet)
  //   2 kills → +10%
  //   3 kills → +20%
  //   4+ kills→ +30%  (capped to discourage snowballing)
  private readonly killStreaks = new Map<string, number>()

  private streakDamageBonus(streak: number): number {
    if (streak <= 1) return 0
    if (streak === 2) return 0.1
    if (streak === 3) return 0.2
    return 0.3
  }

  private static readonly MAX_INPUTS_PER_TICK = 4
  private static readonly MAX_SWING_QUEUE = 8
  private static readonly MAX_CAST_QUEUE = 8

  // Fase 9b: shared helper that gates a message via the rate limiter and
  // kicks the offending client. Returns true if the message should proceed.
  private gateRate(client: Client, channel: string): boolean {
    if (this.rateLimiter.allow(client.sessionId, channel, performance.now())) return true
    console.warn(`[GameRoom ${this.roomId}] rate limit hit ${client.sessionId} ${channel} — kick`)
    client.leave(4001)
    return false
  }

  private canAcceptCombatAction(): boolean {
    return this.state.phase === 'live'
  }

  // Fase 9b: wrap broadcast to feed the replay recorder + perform the actual send.
  private record(type: string, message: unknown): void {
    if (this.replay) this.replay.record(this.state.tick, type, message)
    this.broadcast(type, message)
  }

  override onCreate(options: { mode?: string; mapId?: string; botFill?: boolean } = {}): void {
    this.setState(new GameState())

    // Resolve map and mode from options. Defaults: duel_arena for 1v1/training,
    // gladiators_arena for 5v5/ffa, blockout for explicit 'blockout' or unknown.
    const resolvedMode = options.mode ?? 'duel_arena'
    const resolvedMapId =
      options.mapId ??
      (resolvedMode === '5v5' || resolvedMode === 'ffa'
        ? 'gladiators_arena'
        : resolvedMode === 'blockout'
          ? 'blockout'
          : 'duel_arena')
    this.activeMap = getMap(resolvedMapId)
    this.state.mapId = resolvedMapId
    this.state.mode = resolvedMode

    // FFA supports up to 8 players; 5v5 up to 10; others cap at MAX_CLIENTS (default 2).
    if (resolvedMode === 'ffa') this.maxClients = Number(process.env['MAX_CLIENTS_FFA'] ?? 8)
    else if (resolvedMode === '5v5') this.maxClients = Number(process.env['MAX_CLIENTS_5V5'] ?? 10)

    if (resolvedMode === 'training' || options.botFill === true) {
      this.botSpawnAtMatchStart = Math.max(1, this.botSpawnAtMatchStart)
    }

    this.onMessage<ClientInputMessage>(MessageTypes.Input, (client, message) => {
      if (!this.gateRate(client, 'input')) return
      const queue = this.inputQueues.get(client.sessionId)
      if (!queue) return
      if (queue.length < 64) queue.push(message)
    })

    this.onMessage<ClientSwingMessage>(MessageTypes.Swing, (client, message) => {
      if (!this.gateRate(client, 'swing')) return
      if (!this.canAcceptCombatAction()) return
      const queue = this.swingQueues.get(client.sessionId)
      if (!queue) return
      if (queue.length < GameRoom.MAX_SWING_QUEUE) queue.push(message)
    })

    this.onMessage<ClientCastMessage>(MessageTypes.Cast, (client, message) => {
      if (!this.gateRate(client, 'cast')) return
      if (!this.canAcceptCombatAction()) return
      const queue = this.castQueues.get(client.sessionId)
      if (!queue) return
      if (queue.length < GameRoom.MAX_CAST_QUEUE) queue.push(message)
    })

    this.onMessage<ClientWeaponSwapMessage>(MessageTypes.WeaponSwap, (client, message) => {
      if (!this.gateRate(client, 'weaponSwap')) return
      if (!this.canAcceptCombatAction()) return
      this.handleWeaponSwap(client.sessionId, message)
    })

    this.onMessage<ClientChargeStartMessage>(MessageTypes.ChargeStart, (client, message) => {
      if (!this.gateRate(client, 'charge')) return
      if (!this.canAcceptCombatAction()) return
      this.handleChargeStart(client.sessionId, message)
    })

    this.onMessage<ClientChargeReleaseMessage>(MessageTypes.ChargeRelease, (client, message) => {
      if (!this.gateRate(client, 'charge')) return
      if (!this.canAcceptCombatAction()) return
      this.handleChargeRelease(client.sessionId, message)
    })

    this.onMessage<ClientFireStaffMessage>(MessageTypes.FireStaff, (client, message) => {
      if (!this.gateRate(client, 'fireStaff')) return
      if (!this.canAcceptCombatAction()) return
      this.handleFireStaff(client.sessionId, message)
    })

    this.onMessage<ClientParryPressMessage>(MessageTypes.ParryPress, (client, message) => {
      if (!this.gateRate(client, 'parry')) return
      if (!this.canAcceptCombatAction()) return
      this.handleParryPress(client.sessionId, message)
    })

    this.onMessage<ClientParryReleaseMessage>(MessageTypes.ParryRelease, (client, message) => {
      if (!this.gateRate(client, 'parry')) return
      if (!this.canAcceptCombatAction()) return
      this.handleParryRelease(client.sessionId, message)
    })

    this.onMessage(MessageTypes.Heartbeat, (client, message: { clientTime: number }) => {
      client.send(MessageTypes.PongAck, {
        clientTime: message.clientTime,
        serverTime: Date.now(),
      })
    })

    // Fase 4: instantiate status runtime, ability engine, transmute handler.
    // Bridge maps the engine's {amount, element, ...} shape into PendingDamage.
    const pendingDamageBridge = makePendingDamageBridge(this.damageQueue)
    this.statuses = new StatusRuntime({
      state: this.state,
      pendingDamage: pendingDamageBridge,
      broadcast: (type, message) => this.broadcast(type, message),
    })
    this.engine = new AbilityEngine(
      {
        state: this.state,
        pendingDamage: pendingDamageBridge,
        spawnProjectile: (req) => this.spawnProjectileFromEngine(req),
        spawnZone: (req) => this.spawnZoneFromEngine(req),
        sendAbilityFailed: (sid, abilityId, reason) =>
          this.sendAbilityFailed(sid, abilityId, reason),
        broadcast: (type, message) => this.broadcast(type, message),
        computeProjectileOrigin: (player, dir) => computeProjectileOrigin(player, dir),
        forceWeaponSwap: (sid, weapon) => this.forceWeaponSwap(sid, weapon),
        applyKnockup: (player, airborneSec, knockback) => this.applyKnockupToPlayer(player, airborneSec, knockback),
        hasLineOfSight: (from, to) => this.hasLineOfSight(from, to),
        resolveDisplacement: (player, dx, dz, cancelOnCollision) =>
          this.resolveAbilityDisplacement(player, dx, dz, cancelOnCollision),
      },
      this.statuses,
    )
    this.transmute = new TransmuteHandler(
      { state: this.state, broadcast: (t, m) => this.broadcast(t, m) },
      this.statuses,
    )
    // Fase 7: match manager — drives BO5 round flow + ELO + scoreboard.
    // Fase 9b: replay recorder. Records every broadcast tagged with state.tick.
    this.replay = new ReplayRecorder(this.roomId)

    this.match = new MatchManager({
      state: this.state,
      resetAllPlayers: () => this.resetAllPlayersForRound(),
      broadcast: (t, m) => this.broadcast(t, m),
    })
    this.onMessage<ClientTransmuteMessage>(MessageTypes.Transmute, (client, message) => {
      if (!this.gateRate(client, 'transmute')) return
      if (!this.canAcceptCombatAction()) return
      const queue = this.transmuteQueues.get(client.sessionId)
      if (!queue) return
      if (queue.length < 8) queue.push(message)
    })

    // Fase 6: loadout set / change. Validates ability ids against the registry,
    // applies to the Player.loadout array, recomputes Mastery + clears CDs.
    this.onMessage<ClientLoadoutMessage>(MessageTypes.Loadout, (client, message) => {
      if (!this.gateRate(client, 'loadoutSet')) return
      this.handleLoadoutSet(client.sessionId, message)
    })

    // Spawn N bots at match start if BOTS env var set (used for TTK calibration).
    for (let i = 0; i < this.botSpawnAtMatchStart; i++) {
      this.spawnBot(`bot-${i}`)
    }
    this.matchStartTick = this.state.tick

    // Sync patch rate to tick rate so clients receive state updates every tick
    // (16.67 ms) instead of the Colyseus default 50 ms. Eliminates remote-player
    // position jitter caused by large between-patch gaps.
    this.setPatchRate(TICK_MS)

    this.startTickLoop()
    console.info(
      `[GameRoom ${this.roomId}] created (tick ${TICK_RATE_HZ} Hz, maxClients=${this.maxClients}, bots=${this.botSpawnAtMatchStart})`,
    )
  }

  // Spawn an in-process bot. The bot occupies a player slot just like a real
  // client — same Player schema, same StatusRuntime/AbilityEngine path. The
  // bot's input + cast decisions are produced by BotController each tick.
  private spawnBot(botId: string): void {
    if (this.state.players.size >= this.maxClients) return
    if (this.state.players.has(botId)) return
    const player = new Player()
    player.id = botId
    player.name = BOT_NAMES[Number(botId.replace('bot-', '')) % BOT_NAMES.length] ?? 'Bot'
    player.team = ''
    const spawnIndex = this.state.players.size % this.activeMap.spawns.length
    const spawn = this.activeMap.spawns[spawnIndex]!
    player.transform.x = spawn.x
    player.transform.y = spawn.y
    player.transform.z = spawn.z
    player.invulnUntilTick = this.state.tick + SPAWN_INVULN_TICKS
    for (const id of DEFAULT_LOADOUT) player.loadout.push(id)
    {
      const defs = DEFAULT_LOADOUT.map((id) => ABILITY_DEFS[id])
      const m = computeLoadoutMastery(defs)
      player.masteryElement = m.element ?? ''
      player.masteryLevel = m.level
      player.masteryTier = m.level
    }
    this.state.players.set(botId, player)
    this.sim.set(botId, makePlayerSimState(spawn))
    this.inputQueues.set(botId, [])
    this.swingQueues.set(botId, [])
    this.castQueues.set(botId, [])
    this.transmuteQueues.set(botId, [])
    this.lastSeqSeen.set(botId, 0)
    this.prevJumpHeld.set(botId, false)
    this.positionHistory.set(botId, [])

    const bot = new BotController(
      botId,
      {
        getSelf: (id) => this.state.players.get(id) ?? null,
        getOpponent: (id) => {
          let other: Player | null = null
          this.state.players.forEach((p, pid) => {
            if (pid !== id && p.alive) other = p
          })
          return other
        },
        sendCast: (id, abilityId, yaw, pitch) => {
          const queue = this.castQueues.get(id)
          if (queue && queue.length < GameRoom.MAX_CAST_QUEUE) {
            queue.push({
              abilityId,
              atTick: this.state.tick + 1,
              targetYaw: yaw,
              targetPitch: pitch,
            })
          }
        },
        sendInput: (id, moveX, moveZ, yaw, jump = false) => {
          const queue = this.inputQueues.get(id)
          if (queue && queue.length < 64) {
            queue.push({
              tick: this.state.tick + 1,
              seq: (this.lastSeqSeen.get(id) ?? 0) + 1,
              moveX,
              moveZ,
              yaw,
              pitch: 0,
              jump,
              jumpHold: false,
              m1: false,
              m2: false,
            })
          }
        },
        sendSwing: (id, yaw) => {
          const queue = this.swingQueues.get(id)
          if (queue && queue.length < GameRoom.MAX_SWING_QUEUE) {
            queue.push({ atTick: this.state.tick + 1, yaw })
          }
        },
        cdReady: (id, abilityId, atTick) => {
          const p = this.state.players.get(id)
          if (!p) return false
          const ready = p.abilityCooldowns.get(abilityId) ?? 0
          return atTick >= ready
        },
      },
      () => this.state.tick,
      // Pass the canonical default loadout so the bot AI uses the same
      // ability set as the bot's player schema (prevents stale hardcoded list
      // in BotController from diverging when DEFAULT_LOADOUT changes).
      DEFAULT_LOADOUT,
    )
    this.bots.set(botId, bot)
    console.info(`[GameRoom ${this.roomId}] spawned bot ${botId} at spawn ${spawnIndex}`)
  }

  override onJoin(client: Client, options: { name?: string } = {}): void {
    const player = new Player()
    player.id = client.sessionId
    player.name = options.name ?? `player-${client.sessionId.slice(0, 4)}`
    player.team = this.state.mode === '5v5' ? (this.state.players.size % 2 === 0 ? 'red' : 'blue') : ''

    const spawnIndex = this.state.players.size % this.activeMap.spawns.length
    const spawn = this.activeMap.spawns[spawnIndex]!
    player.transform.x = spawn.x
    player.transform.y = spawn.y
    player.transform.z = spawn.z
    player.invulnUntilTick = this.state.tick + SPAWN_INVULN_TICKS

    // Assign default loadout + compute Mastery activation. Fase 6 replaces
    // the default at login with the persisted player loadout.
    for (const id of DEFAULT_LOADOUT) player.loadout.push(id)
    {
      const defs = DEFAULT_LOADOUT.map((id) => ABILITY_DEFS[id])
      const mastery = computeLoadoutMastery(defs)
      player.masteryElement = mastery.element ?? ''
      player.masteryLevel = mastery.level
      player.masteryTier = mastery.level
    }
    this.state.players.set(client.sessionId, player)
    this.sim.set(client.sessionId, makePlayerSimState(spawn))
    this.inputQueues.set(client.sessionId, [])
    this.swingQueues.set(client.sessionId, [])
    this.castQueues.set(client.sessionId, [])
    this.transmuteQueues.set(client.sessionId, [])
    this.lastSeqSeen.set(client.sessionId, 0)
    this.prevJumpHeld.set(client.sessionId, false)
    this.positionHistory.set(client.sessionId, [])

    console.info(
      `[GameRoom ${this.roomId}] join ${client.sessionId} (${player.name}) at spawn ${spawnIndex}`,
    )
  }

  override onLeave(client: Client, _consented?: boolean): void {
    const sid = client.sessionId
    this.state.players.delete(sid)
    this.sim.delete(sid)
    this.inputQueues.delete(sid)
    this.swingQueues.delete(sid)
    this.castQueues.delete(sid)
    this.transmuteQueues.delete(sid)
    this.rateLimiter.forgetClient(sid)
    this.lastSeqSeen.delete(sid)
    this.prevJumpHeld.delete(sid)
    this.positionHistory.delete(sid)
    this.parryPressTick.delete(sid)
    this.killStreaks.delete(sid)
    this.bots.delete(sid)
    this.pendingSwings = this.pendingSwings.filter((s) => s.attackerId !== sid)

    // Clean up projectiles owned by the leaver.
    const toRemove: string[] = []
    for (const [pid, meta] of this.projectileMeta) {
      if (meta.ownerId === sid) toRemove.push(pid)
    }
    for (const pid of toRemove) this.removeProjectile(pid)
    console.info(`[GameRoom ${this.roomId}] leave ${sid}`)
  }

  override onDispose(): void {
    if (this.tickTimer) clearInterval(this.tickTimer)
    if (this.replay) {
      const path = this.replay.finalize()
      if (path) console.info(`[GameRoom ${this.roomId}] replay → ${path}`)
    }
    console.info(`[GameRoom ${this.roomId}] disposed`)
  }

  // --- tick loop ----------------------------------------------------------

  private startTickLoop(): void {
    const dt = TICK_MS / 1000
    this.tickTimer = setInterval(() => {
      this.state.tick += 1
      const now = this.state.tick

      // 1. Handle respawns that come due this tick.
      for (const [sid, player] of this.state.players) {
        if (!player.alive && player.respawnAtTick > 0 && now >= player.respawnAtTick) {
          this.respawn(sid, player)
        }
      }

      // Drive bots first so their input/cast queues are populated this tick.
      this.bots.forEach((bot) => bot.step())

      // 2. Close expired parry tap windows + hold-drain stamina.
      this.tickParry(now, dt)

      // 2b. Drain queued transmute messages.
      this.drainTransmuteQueue()

      // 2c. Resolve windups that completed this tick (engine-driven).
      this.engine.tickWindups()

      // 2d. Tick active statuses (DoT damage flows into damageQueue).
      this.statuses.tick(dt)

      // 2e. Tick zones (Flame Wall, etc.) — apply damage / status to occupants.
      this.tickZones()

      // 3. Simulate movement per player.
      for (const [sid, simState] of this.sim) {
        const player = this.state.players.get(sid)
        if (!player) continue
        this.stepPlayerMovement(sid, player, simState, dt, now)
      }

      // 4. Start new swings / casts from this-tick messages.
      for (const [sid] of this.sim) {
        this.startPendingActions(sid, now)
      }

      // 5. Resolve sword swings whose hit-tick is now.
      this.resolveSwings(now)

      // 6. Integrate projectiles and resolve their collisions.
      this.stepProjectiles(dt, now)

      // 7. Drain damage queue -> HP updates / deaths.
      this.drainDamage(now)

      // 8. Regen.
      for (const [sid, player] of this.state.players) {
        if (!player.alive) continue
        this.tickRegen(sid, player, now)
      }

      // 9. Push position history snapshots for lag comp.
      for (const [sid, simState] of this.sim) {
        this.pushHistory(sid, now, simState)
      }

      // 10. Fase 7: drive match phase state machine (countdown → live → roundEnd → matchEnd).
      this.match.tick()
      this.clearCombatStateOutsideLive(now)
    }, TICK_MS)
  }

  private clearCombatStateOutsideLive(now: number): void {
    if (this.state.phase === 'live') return

    this.pendingSwings = []
    this.damageQueue = []
    this.swingQueues.forEach((queue) => queue.splice(0))
    this.castQueues.forEach((queue) => queue.splice(0))
    this.transmuteQueues.forEach((queue) => queue.splice(0))

    this.state.players.forEach((player, sid) => {
      player.bowChargeStartTick = 0
      player.staffNextFireTick = 0
      if (player.parrying) {
        player.parrying = false
        player.parryIsHold = false
        player.parryTapEndsAtTick = 0
        this.parryPressTick.delete(sid)
      }
      if (player.casting) this.engine.cancelCast(sid, 'death')
    })

    const projectileIds: string[] = []
    this.state.projectiles.forEach((_p, id) => projectileIds.push(id))
    for (const id of projectileIds) this.removeProjectile(id, 'timeout', { x: 0, y: 0, z: 0 }, now)

    const zoneIds: string[] = []
    this.state.zones.forEach((_z, id) => zoneIds.push(id))
    for (const id of zoneIds) {
      const z = this.state.zones.get(id)
      if (z) z.expired = true
      this.state.zones.delete(id)
      const msg: ServerZoneExpiredMessage = { id, atTick: now }
      this.broadcast(MessageTypes.ZoneExpired, msg)
    }
  }

  private stepPlayerMovement(
    sid: string,
    player: Player,
    simState: PlayerSimState,
    dt: number,
    now: number,
  ): void {
    const queue = this.inputQueues.get(sid)
    if (!queue) return

    const airborne = now < player.airborneUntilTick
    const dead = !player.alive

    if (simState.onGround) simState.stamina = player.stamina

    // Fase 4: status-derived movement caps + airborne knockup lock. Same
    // derivation runs on the client for prediction so the kinematic step is
    // identical authoritatively + locally.
    const capsFromStatus = movementCapsFromStatuses(
      Array.from(player.statuses).map((i) => ({
        kind: i.kind as StatusKind,
        stacks: i.stacks,
        remainingSec: i.remainingSec,
        slowFractionOverride: i.slowFractionOverride > 0 ? i.slowFractionOverride : undefined,
      })),
    )
    const movementCaps = {
      slowFraction: capsFromStatus.slowFraction,
      movementLocked: capsFromStatus.movementLocked,
      castLocked: capsFromStatus.castLocked,
      airborneLocked: now < player.airborneUntilTick,
    }

    const lastSeq = this.lastSeqSeen.get(sid) ?? 0
    let inputsThisTick = 0
    let effective: SimInput | null = null
    let lastProcessedSeq = lastSeq
    // prevHeld is used only to carry the jumpHold state into the idle-tick
    // simulation (so the hold-apex gravity reduction continues when no input
    // arrives this tick). It is NOT used for edge detection — the client
    // already sends msg.jump=true for exactly one tick per key-press, and
    // using !prevHeld to gate it incorrectly drops valid jumps whenever the
    // player was holding jump in the previous tick (land + re-jump pattern).
    let prevHeld = this.prevJumpHeld.get(sid) ?? false

    while (queue.length > 0 && inputsThisTick < GameRoom.MAX_INPUTS_PER_TICK) {
      const msg = queue.shift()!
      if (msg.seq <= lastSeq) continue

      const input: SimInput =
        dead || airborne
          ? {
              moveX: 0,
              moveZ: 0,
              yaw: msg.yaw,
              jump: false,
              jumpHold: false,
            }
          : {
              moveX: clamp(msg.moveX, -1, 1),
              moveZ: clamp(msg.moveZ, -1, 1),
              yaw: msg.yaw,
              jump: !!msg.jump, // client already does edge detection
              jumpHold: !!msg.jumpHold,
            }

      simulatePlayer(simState, input, dt, this.activeMap, movementCaps)

      effective = input
      lastProcessedSeq = msg.seq
      prevHeld = msg.jumpHold
      inputsThisTick += 1
    }

    if (inputsThisTick === 0) {
      const yawNow = player.transform.yaw
      const input: SimInput = {
        moveX: 0,
        moveZ: 0,
        yaw: yawNow,
        jump: false,
        jumpHold: !dead && !airborne && prevHeld,
      }
      simulatePlayer(simState, input, dt, this.activeMap, movementCaps)
      effective = input
    }

    this.lastSeqSeen.set(sid, lastProcessedSeq)
    this.prevJumpHeld.set(sid, prevHeld)

    const t = player.transform
    if (t.x !== simState.pos.x) t.x = simState.pos.x
    if (t.y !== simState.pos.y) t.y = simState.pos.y
    if (t.z !== simState.pos.z) t.z = simState.pos.z
    if (effective && t.yaw !== effective.yaw) t.yaw = effective.yaw
    if (player.vx !== simState.vel.x) player.vx = simState.vel.x
    if (player.vy !== simState.vel.y) player.vy = simState.vel.y
    if (player.vz !== simState.vel.z) player.vz = simState.vel.z
    if (player.onGround !== simState.onGround) player.onGround = simState.onGround
    if (player.stamina !== simState.stamina) player.stamina = simState.stamina
    if (player.lastProcessedInputSeq !== lastProcessedSeq) {
      player.lastProcessedInputSeq = lastProcessedSeq
    }
  }

  private startPendingActions(sid: string, now: number): void {
    const player = this.state.players.get(sid)
    if (!player) return
    if (!this.canAcceptCombatAction()) {
      this.swingQueues.get(sid)?.splice(0)
      this.castQueues.get(sid)?.splice(0)
      return
    }

    const swings = this.swingQueues.get(sid)
    if (swings && swings.length > 0) {
      const msg = swings.shift()!
      this.tryStartSwing(sid, player, msg, now)
    }

    const casts = this.castQueues.get(sid)
    if (casts && casts.length > 0) {
      const msg = casts.shift()!
      this.tryStartCast(sid, player, msg)
    }
  }

  private tryStartSwing(sid: string, player: Player, msg: ClientSwingMessage, now: number): void {
    if (!player.alive) return
    if (now < player.airborneUntilTick) return
    if (this.statuses.hasStatus(player, 'invulnerable')) return
    if (player.activeWeapon !== 'sword') return
    // Can't swing while a cast windup is in progress.
    if (player.casting) return
    // Can't start a new swing while the previous is still animating.
    if (now < player.swingEndsAtTick) return
    // Note: onGround check removed — it was blocking swings due to minor
    // ground-detection lag even when the player looks and feels grounded.
    // The airborneUntilTick guard above already prevents swinging during knockup.

    const combo = advanceSwordCombo(player.comboIndex, player.lastSwingStartTick, now)

    const startTick = now
    const hitTick = startTick + SWORD_HIT_OFFSET_TICKS
    const endTick = startTick + SWORD_SWING_TICKS

    player.comboIndex = combo.nextStoredIndex
    player.lastSwingStartTick = startTick
    player.swingEndsAtTick = endTick

    this.pendingSwings.push({
      attackerId: sid,
      startTick,
      hitTick,
      fromAtTick: msg.atTick,
      yaw: msg.yaw,
      damage: combo.damage,
      originX: player.transform.x,
      originY: player.transform.y,
      originZ: player.transform.z,
      resolved: false,
    })
  }

  private tryStartCast(sid: string, player: Player, msg: ClientCastMessage): void {
    // Every data-driven ability, including Uppercut, uses the same engine path
    // so cost, cooldown, weapon, parry, Phase Shift and aim rules cannot drift.
    this.engine.tryCast(sid, msg.abilityId, {
      yaw: msg.targetYaw ?? player.transform.yaw,
      pitch: msg.targetPitch ?? player.transform.pitch,
      point: msg.targetPoint,
    })
  }

  private resolveSwings(now: number): void {
    const keep: PendingSwing[] = []
    for (const swing of this.pendingSwings) {
      if (swing.resolved) continue
      if (now < swing.hitTick) {
        keep.push(swing)
        continue
      }
      swing.resolved = true
      const attacker = this.state.players.get(swing.attackerId)
      if (!attacker || !attacker.alive) continue

      const rewindTicks = clamp(
        now - swing.fromAtTick,
        0,
        Math.min(LAG_COMP_BUFFER_TICKS, LAG_COMP_MAX_TICKS),
      )
      const rewindTargetTick = now - rewindTicks
      const origin = { x: swing.originX, y: swing.originY, z: swing.originZ }

      for (const [vid, victim] of this.state.players) {
        if (vid === swing.attackerId) continue
        if (!victim.alive) continue
        if (now < victim.invulnUntilTick) continue
        const victimPos = this.lookupHistory(vid, rewindTargetTick) ?? {
          x: victim.transform.x,
          y: victim.transform.y,
          z: victim.transform.z,
        }
        if (isInSwordM1Cone(origin, swing.yaw, victimPos)) {
          this.damageQueue.push({
            attackerId: swing.attackerId,
            victimId: vid,
            damage: swing.damage,
            knockup: false,
            cause: 'sword_m1',
            canParry: true,
            element: '',
          })
          break
        }
      }
    }
    this.pendingSwings = keep
  }

  private drainDamage(now: number): void {
    if (this.damageQueue.length === 0) return
    const pending = this.damageQueue
    this.damageQueue = []
    for (const d of pending) {
      const attacker = this.state.players.get(d.attackerId)
      const victim = this.state.players.get(d.victimId)
      if (!victim || !victim.alive) continue
      if (now < victim.invulnUntilTick) continue
      // Phase Shift invulnerability: skip all damage while the status is active.
      if (this.statuses.hasStatus(victim, 'invulnerable')) continue

      // Parry absorbs / reduces. Only active parries on non-airborne victims
      // count — airborne victims can't parry per combat fundamentals.
      let didParry = false
      let applied = d.damage
      // Curse of Weakness: attacker's outgoing damage is reduced.
      if (attacker && this.statuses.hasStatus(attacker, 'curse')) {
        applied = Math.round(applied * CURSE_OUTGOING_DAMAGE_MULT)
      }
      // Kill streak damage bonus — attacker gets +10/20/30% at 2/3/4+ kills.
      const attackerStreak = this.killStreaks.get(d.attackerId) ?? 0
      const streakBonus = this.streakDamageBonus(attackerStreak)
      if (streakBonus > 0) {
        applied = Math.round(applied * (1 + streakBonus))
      }
      if (d.canParry && victim.parrying && now >= victim.airborneUntilTick) {
        const before = applied
        applied = applyParryReduction(
          applied,
          true,
          victim.parryIsHold,
          PARRY_TAP_BLOCK_FRAC,
          PARRY_HOLD_BLOCK_FRAC,
        )
        didParry = applied < before
      }

      // Shield absorption — consumes shield stacks before applying to HP.
      if (applied > 0 && this.statuses.hasStatus(victim, 'shield')) {
        applied = this.statuses.absorbWithShield(d.victimId, applied)
      }

      if (applied > 0) {
        victim.hp = Math.max(0, victim.hp - applied)
        victim.lastDamageAtTick = now
        if (attacker) attacker.lastDamageAtTick = now
        if (attacker && d.lifestealFraction && d.lifestealFraction > 0) {
          attacker.hp = Math.min(HP_MAX, attacker.hp + applied * d.lifestealFraction)
        }
        if (d.onDamageStatus && victim.hp > 0) {
          this.statuses.applyToPlayer(
            d.victimId,
            d.onDamageStatus.kind,
            d.onDamageStatus.durationSec,
            d.onDamageStatus.stacks,
            d.attackerId,
            d.onDamageStatus.slowFraction,
          )
        }
        // Charge interrupt: any damage taken cancels an in-progress bow draw.
        if (victim.bowChargeStartTick > 0) {
          victim.bowChargeStartTick = 0
        }
        if (victim.casting) {
          this.engine.cancelCast(d.victimId, 'damage')
        }
      } else if (didParry && attacker) {
        // Tap parry with zero damage taken still counts as being in combat
        // for OOC purposes on the attacker (they swung), but not the victim —
        // a perfect block lets them stay "out of combat" and regen.
        attacker.lastDamageAtTick = now
      }

      if (d.knockup && applied > 0) {
        const simState = this.sim.get(d.victimId)
        if (simState) {
          simState.vel.y = uppercutInitialVy()
          simState.vel.x = 0
          simState.vel.z = 0
          simState.onGround = false
          victim.onGround = false
          victim.vy = simState.vel.y
          victim.vx = 0
          victim.vz = 0
        }
        victim.airborneUntilTick = now + UPPERCUT_AIRBORNE_TICKS
        // Knockup interrupts parry and any active cast.
        victim.parrying = false
        victim.parryIsHold = false
        victim.parryTapEndsAtTick = 0
        if (victim.casting) {
          this.engine.cancelCast(d.victimId, 'damage')
        }
      }

      const hitMsg: ServerHitMessage = {
        attackerId: d.attackerId,
        victimId: d.victimId,
        damage: applied,
        element: d.element,
        didParry,
        atTick: now,
        cause: d.cause,
      }
      this.broadcast(MessageTypes.Hit, hitMsg)

      if (victim.hp <= 0) {
        victim.alive = false
        victim.respawnAtTick = now + RESPAWN_TICKS
        this.engine.cancelCast(d.victimId, 'death')
        victim.casting = false
        victim.castAbilityId = ''
        victim.castEndsAtTick = 0
        victim.airborneUntilTick = 0
        victim.parrying = false
        victim.parryIsHold = false
        victim.parryTapEndsAtTick = 0
        victim.bowChargeStartTick = 0
        const ttkSec = (now - this.matchStartTick) / TICK_RATE_HZ
        console.info(
          `[GameRoom ${this.roomId}] TTK ${ttkSec.toFixed(1)}s victim=${d.victimId} killer=${d.attackerId} cause=${d.cause}`,
        )
        // Reset match start for the next round so TTK is always per-life.
        this.matchStartTick = now

        // --- Kill streak update ------------------------------------------
        // Victim's streak resets to 0.
        const prevVictimStreak = this.killStreaks.get(d.victimId) ?? 0
        this.killStreaks.set(d.victimId, 0)
        if (prevVictimStreak > 0) {
          const brokenMsg: ServerKillStreakMessage = {
            playerId: d.victimId,
            streak: 0,
            damageBonus: 0,
            atTick: now,
          }
          this.broadcast(MessageTypes.KillStreak, brokenMsg)
        }

        // Killer's streak increases (only if killed by another player, not self).
        if (d.attackerId && d.attackerId !== d.victimId) {
          const prev = this.killStreaks.get(d.attackerId) ?? 0
          const next = prev + 1
          this.killStreaks.set(d.attackerId, next)
          const bonus = this.streakDamageBonus(next)
          const streakMsg: ServerKillStreakMessage = {
            playerId: d.attackerId,
            streak: next,
            damageBonus: bonus,
            atTick: now,
          }
          this.broadcast(MessageTypes.KillStreak, streakMsg)
          console.info(
            `[GameRoom ${this.roomId}] STREAK ${d.attackerId} streak=${next} bonus=+${Math.round(bonus * 100)}%`,
          )
        }
        // -----------------------------------------------------------------

        const deathMsg: ServerDeathMessage = {
          victimId: d.victimId,
          killerId: d.attackerId,
          assistIds: [],
          cause: d.cause,
          atTick: now,
        }
        this.broadcast(MessageTypes.Death, deathMsg)
        // Fase 7: notify match manager so it can award the round + transition.
        this.match.notifyDeath(d.victimId, d.attackerId)
      }
    }
  }

  private tickRegen(_sid: string, player: Player, now: number): void {
    const dt = TICK_MS / 1000
    if (player.hp < HP_MAX && now - player.lastDamageAtTick >= OOC_DELAY_TICKS) {
      player.hp = Math.min(HP_MAX, player.hp + HP_REGEN_PER_SEC_OOC * dt)
    }
    if (player.mana < MANA_MAX && now - player.lastManaSpendAtTick >= MANA_DELAY_TICKS) {
      player.mana = Math.min(MANA_MAX, player.mana + MANA_REGEN_PER_SEC * dt)
    }
    const vxz2 = player.vx * player.vx + player.vz * player.vz
    const moving = vxz2 > 0.25
    const rate = moving ? STAMINA_REGEN_PER_SEC_MOVING : STAMINA_REGEN_PER_SEC_IDLE
    // Hold-parry drains stamina continuously; don't regen at the same time or
    // the drain has zero net effect. The drain itself runs in tickParry.
    if (player.stamina < STAMINA_MAX && !(player.parrying && player.parryIsHold)) {
      player.stamina = Math.min(STAMINA_MAX, player.stamina + rate * dt)
      const simState = this.sim.get(_sid)
      if (simState) simState.stamina = player.stamina
    }
  }

  // Picks the spawn point that is farthest from all living opponents — the
  // standard arena-shooter approach to prevent spawn-camping. With only one
  // living enemy the safest spawn is simply the opposite corner; with many
  // players the point that maximises minimum-distance to any enemy wins.
  // Falls back to the join-order index when no living opponents exist (round
  // start, bot-only lobby) so the first reset is still symmetric.
  private bestSpawnIndex(sid: string): number {
    const spawns = this.activeMap.spawns
    if (spawns.length === 1) return 0

    let bestIdx = indexOfSid(this.state.players, sid) % spawns.length
    let bestDist = -1
    let hasEnemy = false

    for (let i = 0; i < spawns.length; i++) {
      const sp = spawns[i]!
      let minDistToEnemy = Infinity
      for (const [otherId, other] of this.state.players) {
        if (otherId === sid || !other.alive) continue
        hasEnemy = true
        const dx = other.transform.x - sp.x
        const dz = other.transform.z - sp.z
        const d = Math.hypot(dx, dz)
        if (d < minDistToEnemy) minDistToEnemy = d
      }
      if (isFinite(minDistToEnemy) && minDistToEnemy > bestDist) {
        bestDist = minDistToEnemy
        bestIdx = i
      }
    }

    // No living enemies — keep symmetric join-order assignment.
    if (!hasEnemy) return indexOfSid(this.state.players, sid) % spawns.length
    return bestIdx
  }

  private respawn(sid: string, player: Player): void {
    const spawnIndex = this.bestSpawnIndex(sid)
    const spawn = this.activeMap.spawns[spawnIndex]!
    const now = this.state.tick

    player.transform.x = spawn.x
    player.transform.y = spawn.y
    player.transform.z = spawn.z
    player.vx = 0
    player.vy = 0
    player.vz = 0
    player.onGround = true
    player.hp = HP_MAX
    player.mana = MANA_MAX
    player.stamina = STAMINA_MAX
    player.alive = true
    player.respawnAtTick = 0
    player.invulnUntilTick = now + SPAWN_INVULN_TICKS
    player.airborneUntilTick = 0
    player.casting = false
    player.castAbilityId = ''
    player.castEndsAtTick = 0
    player.comboIndex = 0
    player.swingEndsAtTick = 0
    player.lastSwingStartTick = 0
    player.gcdReadyAtTick = 0
    player.uppercutReadyAtTick = 0
    player.lastDamageAtTick = 0
    player.lastManaSpendAtTick = 0
    player.bowChargeStartTick = 0
    player.staffNextFireTick = 0
    player.parrying = false
    player.parryIsHold = false
    player.parryTapEndsAtTick = 0
    player.parryCooldownReadyAtTick = 0

    // Fase 4: clear all statuses + per-ability CDs + transmute CDs on respawn.
    this.statuses.clearAll(sid)
    player.abilityCooldowns.clear()
    this.transmute.reset(sid)

    const simState = this.sim.get(sid)
    if (simState) {
      simState.pos = { x: spawn.x, y: spawn.y, z: spawn.z }
      simState.vel = { x: 0, y: 0, z: 0 }
      simState.onGround = true
      simState.stamina = STAMINA_MAX
      simState.jumpHoldTicksLeft = 0
      simState.coyoteTicksLeft = 0
      simState.momentumTicks = 0
    }
  }

  private pushHistory(sid: string, tick: number, simState: PlayerSimState): void {
    const buf = this.positionHistory.get(sid)
    if (!buf) return
    buf.push({ tick, x: simState.pos.x, y: simState.pos.y, z: simState.pos.z })
    const cutoff = tick - LAG_COMP_BUFFER_TICKS
    while (buf.length > 0 && buf[0]!.tick < cutoff) buf.shift()
  }

  // Fase 7: reset every player for a new round — full HP/Mana/Stamina,
  // clear cooldowns / statuses / projectiles / zones, return to spawn, grant
  // brief invuln. Reuses the per-player respawn helper to avoid divergence.
  private resetAllPlayersForRound(): void {
    this.state.players.forEach((player, sid) => {
      player.alive = true
      player.respawnAtTick = 0
      this.respawn(sid, player)
    })
    // Drop all in-flight projectiles + zones from previous round.
    const projIds: string[] = []
    this.state.projectiles.forEach((_p, id) => projIds.push(id))
    for (const id of projIds) {
      this.removeProjectile(id, 'timeout', { x: 0, y: 0, z: 0 }, this.state.tick)
    }
    const zoneIds: string[] = []
    this.state.zones.forEach((_z, id) => zoneIds.push(id))
    for (const id of zoneIds) {
      const z = this.state.zones.get(id)
      if (z) z.expired = true
      this.state.zones.delete(id)
    }
    this.pendingSwings = []
    this.damageQueue = []
  }

  private lookupHistory(sid: string, targetTick: number): PositionSnapshot | null {
    const buf = this.positionHistory.get(sid)
    if (!buf || buf.length === 0) return null
    let best: PositionSnapshot | null = null
    for (const snap of buf) {
      if (snap.tick <= targetTick) {
        if (!best || snap.tick > best.tick) best = snap
      }
    }
    return best
  }

  private sendAbilityFailed(
    sid: string,
    abilityId: string,
    reason: ServerAbilityFailedMessage['reason'],
  ): void {
    const client = this.clients.find((c) => c.sessionId === sid)
    if (!client) return
    const msg: ServerAbilityFailedMessage = { abilityId, reason }
    client.send(MessageTypes.AbilityFailed, msg)
  }

  // --- Fase 3 handlers ------------------------------------------------------

  private handleWeaponSwap(sid: string, msg: ClientWeaponSwapMessage): void {
    const player = this.state.players.get(sid)
    if (!player || !player.alive) return
    if (!isValidWeaponId(msg.weapon)) return
    if (player.activeWeapon === msg.weapon) return

    player.activeWeapon = msg.weapon
    // Brief swap lock: ability casts requiring the NEW weapon are blocked until
    // this tick passes. WEAPON_SWAP_LOCK_SEC ≈ 0.12 s — enough for the swap
    // VFX to play without punishing fast players.
    player.weaponSwapEndTick = this.state.tick + Math.round(WEAPON_SWAP_LOCK_SEC * TICK_RATE_HZ)
    // Swap cancels any pending weapon commitment. Without this, a client can
    // start a sword swing, swap before the hit frame, then still land a ghost
    // melee hit while already shooting another weapon under latency.
    this.pendingSwings = this.pendingSwings.filter((s) => s.attackerId !== sid)
    player.swingEndsAtTick = 0
    // Swap cancels any pending charge / bolt cadence.
    player.bowChargeStartTick = 0
    player.staffNextFireTick = 0

    const serverMsg: ServerWeaponSwappedMessage = {
      playerId: sid,
      weapon: msg.weapon,
      atTick: this.state.tick,
    }
    this.broadcast(MessageTypes.WeaponSwapped, serverMsg)
  }

  private handleChargeStart(sid: string, _msg: ClientChargeStartMessage): void {
    const player = this.state.players.get(sid)
    if (!player || !player.alive) return
    if (player.activeWeapon !== 'bow') {
      this.sendAbilityFailed(sid, 'bow_m1', 'wrong_weapon')
      return
    }
    if (player.parrying) {
      this.sendAbilityFailed(sid, 'bow_m1', 'parrying')
      return
    }
    if (this.statuses.hasStatus(player, 'invulnerable')) {
      this.sendAbilityFailed(sid, 'bow_m1', 'cc')
      return
    }
    // airborne is allowed — bow can fire during airborne per 02_weapon_bow.md.
    if (player.bowChargeStartTick > 0) return
    // Bow cannot fire while parrying — already covered above; also disallow
    // while a casting windup is active.
    if (player.casting) {
      this.sendAbilityFailed(sid, 'bow_m1', 'casting')
      return
    }
    // Anchor charge start to the server tick at time of receipt — eliminates
    // RTT bias where client's reported atTick is always N ticks behind server.
    player.bowChargeStartTick = this.state.tick
  }

  private handleChargeRelease(sid: string, msg: ClientChargeReleaseMessage): void {
    const player = this.state.players.get(sid)
    if (!player || !player.alive) return
    if (player.parrying || player.casting) {
      player.bowChargeStartTick = 0
      return
    }
    if (this.statuses.hasStatus(player, 'invulnerable')) {
      player.bowChargeStartTick = 0
      return
    }
    if (player.activeWeapon !== 'bow') {
      player.bowChargeStartTick = 0
      return
    }
    if (player.bowChargeStartTick === 0) return

    const startTick = player.bowChargeStartTick
    player.bowChargeStartTick = 0

    // Use server tick at release time — eliminates RTT bias in both directions.
    const chargeTicks = Math.max(0, this.state.tick - startTick)
    const chargeSec = chargeTicks * (TICK_MS / 1000)
    // No minimum gate — any tap fires an arrow (at reduced damage).
    // ratio clamps from 0.15 (instant tap) to 1.0 (full 2 s charge).
    const ratio = Math.max(0.15, bowChargeRatio(chargeSec, 0, BOW_CHARGE_FULL_SEC))
    const infusion = this.weaponInfusionFor(player, 'bow')
    const damage = bowLerp(BOW_DAMAGE_MIN, BOW_DAMAGE_FULL, ratio)
    const speed = bowLerp(BOW_SPEED_MIN_MPS, BOW_SPEED_FULL_MPS, ratio) * (infusion.speedMult ?? 1)

    const dir = directionFromYawPitch(msg.yaw, msg.pitch)
    const origin = computeProjectileOrigin(player, dir)
    const vel = { x: dir.x * speed, y: dir.y * speed, z: dir.z * speed }

    this.spawnProjectile({
      ownerId: sid,
      kind: 'arrow',
      origin,
      vel,
      gravity: BOW_GRAVITY_MPS2,
      damage,
      lifetimeTicks: BOW_LIFETIME_TICKS,
      spawnedAtTick: this.state.tick,
      ...infusion,
    })
  }

  private handleFireStaff(sid: string, msg: ClientFireStaffMessage): void {
    const player = this.state.players.get(sid)
    if (!player || !player.alive) return
    if (player.activeWeapon !== 'staff') {
      this.sendAbilityFailed(sid, 'staff_m1', 'wrong_weapon')
      return
    }
    if (this.state.tick < player.airborneUntilTick) {
      this.sendAbilityFailed(sid, 'staff_m1', 'airborne')
      return
    }
    if (player.casting) {
      this.sendAbilityFailed(sid, 'staff_m1', 'casting')
      return
    }
    if (player.parrying) {
      this.sendAbilityFailed(sid, 'staff_m1', 'parrying')
      return
    }
    if (this.statuses.hasStatus(player, 'invulnerable')) {
      this.sendAbilityFailed(sid, 'staff_m1', 'cc')
      return
    }
    const now = this.state.tick
    if (now < player.staffNextFireTick) {
      this.sendAbilityFailed(sid, 'staff_m1', 'cooldown')
      return
    }
    if (player.mana < STAFF_M1_MANA_COST) {
      this.sendAbilityFailed(sid, 'staff_m1', 'cost')
      return
    }

    player.mana = Math.max(0, player.mana - STAFF_M1_MANA_COST)
    player.lastManaSpendAtTick = now
    player.staffNextFireTick = now + STAFF_CADENCE_TICKS

    const dir = directionFromYawPitch(msg.yaw, msg.pitch)
    const origin = computeProjectileOrigin(player, dir)
    const infusion = this.weaponInfusionFor(player, 'staff')
    const speed = STAFF_M1_SPEED_MPS * (infusion.speedMult ?? 1)
    const vel = {
      x: dir.x * speed,
      y: dir.y * speed,
      z: dir.z * speed,
    }
    this.spawnProjectile({
      ownerId: sid,
      kind: 'bolt',
      origin,
      vel,
      gravity: STAFF_M1_GRAVITY_MPS2,
      damage: STAFF_M1_DAMAGE,
      lifetimeTicks: STAFF_LIFETIME_TICKS,
      spawnedAtTick: now,
      ...infusion,
    })
  }

  private weaponInfusionFor(player: Player, weapon: 'bow' | 'staff'): WeaponInfusion {
    if (!player.masteryElement || player.masteryLevel <= 0) return { element: 'none' }

    const element = player.masteryElement
    if (weapon === 'bow') {
      switch (element) {
        case 'fire':
          return { element, onHitStatus: { kind: 'burn', durationSec: 3, stacks: 1 } }
        case 'ice':
          return { element, onHitStatus: { kind: 'chill', durationSec: 4, stacks: 1 } }
        case 'lightning':
          return { element, speedMult: 1.3, chainTargets: 1, chainRadius: 6, chainDamage: 8, chainChance: 0.2 }
        case 'dark':
          return { element, lifestealFraction: 0.08 }
        case 'nature':
          return { element, onHitStatus: { kind: 'poison', durationSec: 4, stacks: 1 } }
        default:
          return { element: 'none' }
      }
    }

    switch (element) {
      case 'fire':
        return { element, splashRadius: 1.5, onHitStatus: { kind: 'burn', durationSec: 3, stacks: 2 } }
      case 'ice':
        return {
          element,
          splashRadius: 1.5,
          onHitStatus: { kind: 'chill', durationSec: 4, stacks: 1, slowFraction: 0.3 },
        }
      case 'lightning':
        return { element, speedMult: 1.6, chainTargets: 1, chainRadius: 6, chainDamage: STAFF_M1_DAMAGE, chainChance: 1 }
      case 'dark':
        return { element, lifestealFraction: 0.15 }
      case 'nature':
        return { element, splashRadius: 2, onHitStatus: { kind: 'poison', durationSec: 4, stacks: 1 } }
      default:
        return { element: 'none' }
    }
  }

  private handleParryPress(sid: string, _msg: ClientParryPressMessage): void {
    const player = this.state.players.get(sid)
    if (!player || !player.alive) return
    if (player.casting) {
      this.sendAbilityFailed(sid, 'parry', 'casting')
      return
    }
    if (this.state.tick < player.airborneUntilTick) {
      this.sendAbilityFailed(sid, 'parry', 'airborne')
      return
    }
    // Can't open a new parry while one is already in progress.
    if (player.parrying) {
      this.sendAbilityFailed(sid, 'parry', 'parrying')
      return
    }
    // Tap CD only gates NEW taps; hold requires no CD. At press-time we
    // don't know yet if it'll be a tap, so gate by CD up front. If stamina is
    // too low even for a tap, the press is a no-op.
    if (this.state.tick < player.parryCooldownReadyAtTick) {
      this.sendAbilityFailed(sid, 'parry', 'cooldown')
      return
    }
    if (player.stamina < PARRY_TAP_COST_STAMINA) {
      this.sendAbilityFailed(sid, 'parry', 'cost')
      return
    }

    const now = this.state.tick
    // Parry is a defensive commitment. Starting it cancels a bow draw so the
    // player cannot hold a charged shot and block/release at the same time.
    player.bowChargeStartTick = 0
    // Enter tap mode; on release inside the window we finalise tap + burn
    // stamina + start CD. If release comes after the window, we slide into
    // hold mode.
    player.parrying = true
    player.parryIsHold = false
    player.parryTapEndsAtTick = now + PARRY_TAP_WINDOW_TICKS
    this.parryPressTick.set(sid, now)

    const ev: ServerParryEventMessage = {
      playerId: sid,
      kind: 'tapStart',
      atTick: now,
    }
    this.broadcast(MessageTypes.ParryEvent, ev)
  }

  private handleParryRelease(sid: string, _msg: ClientParryReleaseMessage): void {
    const player = this.state.players.get(sid)
    if (!player) return
    if (!player.parrying) return
    const now = this.state.tick
    const pressTick = this.parryPressTick.get(sid) ?? now
    const heldTicks = now - pressTick

    if (heldTicks <= PARRY_TAP_WINDOW_TICKS && !player.parryIsHold) {
      // Tap completed inside window. Burn stamina + CD.
      player.stamina = Math.max(0, player.stamina - PARRY_TAP_COST_STAMINA)
      const simState = this.sim.get(sid)
      if (simState) simState.stamina = player.stamina
      player.parryCooldownReadyAtTick = now + PARRY_TAP_COOLDOWN_TICKS
      this.emitParry(sid, 'tapEnd', now)
    } else if (player.parryIsHold) {
      this.emitParry(sid, 'holdEnd', now)
    } else {
      // Released after tap window without having converted to hold — still
      // treat as tap end (but tick loop should already have emitted it).
      this.emitParry(sid, 'tapEnd', now)
    }

    player.parrying = false
    player.parryIsHold = false
    player.parryTapEndsAtTick = 0
    this.parryPressTick.delete(sid)
  }

  private tickParry(now: number, dt: number): void {
    for (const [sid, player] of this.state.players) {
      if (!player.parrying) continue
      // If tap window elapsed and the key is still held, transition to hold.
      if (!player.parryIsHold && now >= player.parryTapEndsAtTick) {
        player.parryIsHold = true
        player.parryTapEndsAtTick = 0
        this.emitParry(sid, 'holdStart', now)
      }

      if (player.parryIsHold) {
        // Drain stamina; cancel if empty.
        const drained = player.stamina - PARRY_HOLD_DRAIN_PER_SEC * dt
        if (drained <= 0) {
          player.stamina = 0
          player.parrying = false
          player.parryIsHold = false
          this.parryPressTick.delete(sid)
          this.emitParry(sid, 'holdEnd', now)
        } else {
          player.stamina = drained
          const simState = this.sim.get(sid)
          if (simState) simState.stamina = player.stamina
        }
      }

      // Airborne or dead cancels parry immediately.
      if (!player.alive || now < player.airborneUntilTick) {
        const wasHold = player.parryIsHold
        player.parrying = false
        player.parryIsHold = false
        this.parryPressTick.delete(sid)
        this.emitParry(sid, wasHold ? 'holdEnd' : 'tapEnd', now)
      }
    }
  }

  private emitParry(sid: string, kind: ServerParryEventMessage['kind'], atTick: number): void {
    const msg: ServerParryEventMessage = { playerId: sid, kind, atTick }
    this.broadcast(MessageTypes.ParryEvent, msg)
  }

  // --- Fase 3 projectile integration ---------------------------------------

  private spawnProjectile(params: {
    ownerId: string
    abilityId?: string
    comboRole?: AbilityComboRole
    kind: 'arrow' | 'bolt'
    origin: { x: number; y: number; z: number }
    vel: { x: number; y: number; z: number }
    gravity: number
    damage: number
    lifetimeTicks: number
    spawnedAtTick: number
    element?: string
    splashRadius?: number
    lifestealFraction?: number
    onHitStatus?: { kind: StatusKind; durationSec: number; stacks: number; slowFraction?: number }
    chainTargets?: number
    chainRadius?: number
    chainDamage?: number
    chainChance?: number
  }): void {
    this.projectileIdCounter += 1
    const pid = `p${this.projectileIdCounter}`
    const p = new Projectile()
    p.id = pid
    p.ownerId = params.ownerId
    p.kind = params.kind
    p.originX = params.origin.x
    p.originY = params.origin.y
    p.originZ = params.origin.z
    p.x = params.origin.x
    p.y = params.origin.y
    p.z = params.origin.z
    p.vx = params.vel.x
    p.vy = params.vel.y
    p.vz = params.vel.z
    p.gravity = params.gravity
    p.damage = params.damage
    p.element = params.element ?? 'none'
    p.spawnedAtTick = params.spawnedAtTick
    p.despawnAtTick = params.spawnedAtTick + params.lifetimeTicks
    p.expired = false
    this.state.projectiles.set(pid, p)

    this.projectileSim.set(pid, {
      pos: { x: params.origin.x, y: params.origin.y, z: params.origin.z },
      vel: { x: params.vel.x, y: params.vel.y, z: params.vel.z },
      gravity: params.gravity,
    })
    this.projectileMeta.set(pid, {
      ownerId: params.ownerId,
      abilityId: params.abilityId,
      comboRole: params.comboRole,
      kind: params.kind,
      damage: params.damage,
      element: params.element ?? 'none',
      splashRadius: params.splashRadius ?? 0,
      lifestealFraction: params.lifestealFraction,
      onHitStatus: params.onHitStatus,
      chainTargets: params.chainTargets,
      chainRadius: params.chainRadius,
      chainDamage: params.chainDamage,
      chainChance: params.chainChance,
    })

    const spawnedMsg: ServerProjectileSpawnedMessage = {
      id: pid,
      ownerId: params.ownerId,
      kind: params.kind,
      atTick: params.spawnedAtTick,
      origin: { ...params.origin },
      velocity: { ...params.vel },
      damage: params.damage,
      element: params.element ?? 'none',
    }
    this.broadcast(MessageTypes.ProjectileSpawned, spawnedMsg)
  }

  private stepProjectiles(dt: number, now: number): void {
    if (this.projectileSim.size === 0) return

    const toRemove: {
      id: string
      reason: 'terrain' | 'victim' | 'timeout'
      pos: { x: number; y: number; z: number }
    }[] = []

    for (const [pid, state] of this.projectileSim) {
      const schema = this.state.projectiles.get(pid)
      const meta = this.projectileMeta.get(pid)
      if (!schema || !meta) {
        toRemove.push({
          id: pid,
          reason: 'timeout',
          pos: { x: state.pos.x, y: state.pos.y, z: state.pos.z },
        })
        continue
      }
      if (now >= schema.despawnAtTick) {
        toRemove.push({
          id: pid,
          reason: 'timeout',
          pos: { x: state.pos.x, y: state.pos.y, z: state.pos.z },
        })
        continue
      }

      const prev = { x: state.pos.x, y: state.pos.y, z: state.pos.z }
      stepProjectile(state, dt)
      const to = { x: state.pos.x, y: state.pos.y, z: state.pos.z }

      // Resolve collisions: nearest t across players, boxes, ground.
      let bestT: number | null = null
      let bestKind: 'victim' | 'terrain' | null = null
      let bestVictim: string | null = null

      // Players.
      for (const [vid, player] of this.state.players) {
        if (vid === meta.ownerId) continue
        if (!player.alive) continue
        if (now < player.invulnUntilTick) continue
        // transform.y is the capsule CENTRE; segmentVsCapsule expects the FOOT.
        // Subtract half-height to convert: foot = centre - H/2.
        const capsule: CapsuleTarget = {
          id: vid,
          pos: { x: player.transform.x, y: player.transform.y - PLAYER_CAPSULE_HEIGHT_M / 2, z: player.transform.z },
          radius: PLAYER_CAPSULE_RADIUS_M,
          height: PLAYER_CAPSULE_HEIGHT_M,
        }
        const t = segmentVsCapsule(prev, to, capsule)
        if (t !== null && (bestT === null || t < bestT)) {
          bestT = t
          bestKind = 'victim'
          bestVictim = vid
        }
      }

      // Static boxes.
      for (const box of this.activeMap.boxes) {
        const t = segmentVsAabb(prev, to, box)
        if (t !== null && (bestT === null || t < bestT)) {
          bestT = t
          bestKind = 'terrain'
          bestVictim = null
        }
      }

      // Ground.
      const tGround = segmentVsGround(prev, to, TERRAIN_GROUND_Y)
      if (tGround !== null && (bestT === null || tGround < bestT)) {
        bestT = tGround
        bestKind = 'terrain'
        bestVictim = null
      }

      if (bestT !== null && bestKind !== null) {
        const hitPos = {
          x: prev.x + (to.x - prev.x) * bestT,
          y: prev.y + (to.y - prev.y) * bestT,
          z: prev.z + (to.z - prev.z) * bestT,
        }
        // Snap schema pos to the impact point before removal for client VFX.
        schema.x = hitPos.x
        schema.y = hitPos.y
        schema.z = hitPos.z

        if (bestKind === 'victim' && bestVictim) {
          this.applyProjectileImpact(meta, hitPos, bestVictim)
          toRemove.push({ id: pid, reason: 'victim', pos: hitPos })
        } else {
          if (meta.splashRadius > 0) this.applyProjectileImpact(meta, hitPos, null)
          toRemove.push({ id: pid, reason: 'terrain', pos: hitPos })
        }
      } else {
        // No hit — persist the integrated position to the schema for replication.
        schema.x = state.pos.x
        schema.y = state.pos.y
        schema.z = state.pos.z
        schema.vx = state.vel.x
        schema.vy = state.vel.y
        schema.vz = state.vel.z
      }
    }

    for (const { id, reason, pos } of toRemove) {
      this.removeProjectile(id, reason, pos, now)
    }
  }

  private removeProjectile(
    id: string,
    reason: ServerProjectileExpiredMessage['reason'] = 'timeout',
    pos?: { x: number; y: number; z: number },
    atTick?: number,
  ): void {
    const p = this.state.projectiles.get(id)
    const state = this.projectileSim.get(id)
    const tick = atTick ?? this.state.tick
    const finalPos =
      pos ??
      (p
        ? { x: p.x, y: p.y, z: p.z }
        : state
          ? { x: state.pos.x, y: state.pos.y, z: state.pos.z }
          : { x: 0, y: 0, z: 0 })
    // Save meta before deleting — used for element in the expired message.
    const meta = this.projectileMeta.get(id)
    if (p) {
      p.expired = true
      this.state.projectiles.delete(id)
    }
    this.projectileSim.delete(id)
    this.projectileMeta.delete(id)
    const msg: ServerProjectileExpiredMessage = {
      id,
      atTick: tick,
      reason,
      pos: finalPos,
      element: meta?.element,
    }
    this.broadcast(MessageTypes.ProjectileExpired, msg)
  }

  private applyProjectileImpact(
    meta: ProjectileMeta,
    hitPos: { x: number; y: number; z: number },
    directVictimId: string | null,
  ): void {
    const baseCause = meta.abilityId ? `ability:${meta.abilityId}` : meta.kind === 'arrow' ? 'bow' : 'staff'
    const victimIds: string[] = []
    if (meta.splashRadius > 0) {
      this.state.players.forEach((player, pid) => {
        if (pid === meta.ownerId) return
        if (!player.alive) return
        if (this.state.tick < player.invulnUntilTick) return
        const dx = player.transform.x - hitPos.x
        const dy = player.transform.y - hitPos.y
        const dz = player.transform.z - hitPos.z
        if (Math.hypot(dx, dy, dz) <= meta.splashRadius) victimIds.push(pid)
      })
    } else if (directVictimId) {
      victimIds.push(directVictimId)
    }

    for (const victimId of victimIds) {
      const victim = this.state.players.get(victimId)
      if (!victim) continue
      const airPunish = meta.comboRole === 'finisher' && this.state.tick < victim.airborneUntilTick
      this.damageQueue.push({
        attackerId: meta.ownerId,
        victimId,
        damage: airPunish ? meta.damage * AIR_PUNISH_DAMAGE_MULT : meta.damage,
        knockup: false,
        cause: airPunish ? `${baseCause}:air_punish` : baseCause,
        canParry: meta.splashRadius <= 0,
        element: meta.element,
        lifestealFraction: meta.lifestealFraction,
        onDamageStatus: meta.onHitStatus,
      })
    }

    const shouldChain =
      (meta.chainTargets ?? 0) > 0 &&
      (meta.chainDamage ?? 0) > 0 &&
      Math.random() <= (meta.chainChance ?? 1)
    if (shouldChain) {
      const chained = this.findChainVictims(meta.ownerId, victimIds, hitPos, meta.chainRadius ?? 0, meta.chainTargets ?? 0)
      for (const victimId of chained) {
        this.damageQueue.push({
          attackerId: meta.ownerId,
          victimId,
          damage: meta.chainDamage ?? 0,
          knockup: false,
          cause: `${baseCause}:chain`,
          canParry: false,
          element: meta.element,
          lifestealFraction: meta.lifestealFraction,
          onDamageStatus: meta.onHitStatus,
        })
      }
    }
  }

  private findChainVictims(
    ownerId: string,
    excluded: readonly string[],
    origin: { x: number; y: number; z: number },
    radius: number,
    maxTargets: number,
  ): string[] {
    if (radius <= 0 || maxTargets <= 0) return []
    const excludedSet = new Set(excluded)
    excludedSet.add(ownerId)
    const candidates: { id: string; dist2: number }[] = []
    this.state.players.forEach((player, pid) => {
      if (excludedSet.has(pid)) return
      if (!player.alive) return
      if (this.state.tick < player.invulnUntilTick) return
      const dx = player.transform.x - origin.x
      const dy = player.transform.y - origin.y
      const dz = player.transform.z - origin.z
      const dist2 = dx * dx + dy * dy + dz * dz
      if (dist2 <= radius * radius) candidates.push({ id: pid, dist2 })
    })
    candidates.sort((a, b) => a.dist2 - b.dist2)
    return candidates.slice(0, maxTargets).map((c) => c.id)
  }
  // Fase 6 loadout handler — validates 11 slot ids against the registry, then
  // applies + recomputes Mastery and clears all per-ability cooldowns + active
  // statuses (a fresh build deserves a clean slate at match start).
  private handleLoadoutSet(sid: string, msg: ClientLoadoutMessage): void {
    const player = this.state.players.get(sid)
    if (!player) return
    if (this.state.phase === 'live') {
      const client = this.clients.find((c) => c.sessionId === sid)
      client?.send(MessageTypes.ServerNote, {
        kind: 'warn',
        text: 'loadout changes are locked during live combat',
      })
      return
    }
    // Build the canonical 11-slot array from the message + validate ids.
    const slots: string[] = [
      msg.melee ?? '',
      msg.bow ?? '',
      msg.magic?.[0] ?? '',
      msg.magic?.[1] ?? '',
      msg.magic?.[2] ?? '',
      msg.magic?.[3] ?? '',
      msg.magic?.[4] ?? '',
      msg.utility?.[0] ?? '',
      msg.utility?.[1] ?? '',
      msg.utility?.[2] ?? '',
      msg.utility?.[3] ?? '',
    ]
    slots[7] = 'transfer_hp_mana'
    slots[8] = 'transfer_mana_stam'
    slots[9] = 'transfer_stam_hp'
    // Validate: every non-empty slot must be a known id with the matching slot
    // taxonomy. Reject silently with a server note when invalid (no partial
    // commit — keep prior loadout intact).
    const expectedSlot = [
      'melee',
      'bow',
      'magic',
      'magic',
      'magic',
      'magic',
      'magic',
      'utility',
      'utility',
      'utility',
      'utility',
    ]
    for (let i = 0; i < slots.length; i++) {
      const id = slots[i]!
      if (id === '') continue
      const def = ABILITY_DEFS[id]
      if (!def || def.slot !== expectedSlot[i]) {
        const client = this.clients.find((c) => c.sessionId === sid)
        client?.send(MessageTypes.ServerNote, {
          kind: 'warn',
          text: `loadout rejected: slot ${i} expected ${expectedSlot[i]}, got "${id}"`,
        })
        return
      }
      if (i === 10 && id.startsWith('transfer_')) {
        const client = this.clients.find((c) => c.sessionId === sid)
        client?.send(MessageTypes.ServerNote, {
          kind: 'warn',
          text: 'loadout rejected: V is the flex utility slot; transfers are fixed on Z/X/F',
        })
        return
      }
      if (slots.findIndex((other) => other === id) !== i) {
        const client = this.clients.find((c) => c.sessionId === sid)
        client?.send(MessageTypes.ServerNote, {
          kind: 'warn',
          text: `loadout rejected: duplicate ability "${id}"`,
        })
        return
      }
    }
    // Commit.
    while (player.loadout.length > 0) player.loadout.pop()
    for (const id of slots) player.loadout.push(id)

    // Mastery is magic-only: exactly the 5 magic slots in the 11-slot loadout.
    const allDefs = slots.map((id) => (id ? ABILITY_DEFS[id] : undefined))
    const newMastery = computeLoadoutMastery(allDefs)
    player.masteryElement = newMastery.element ?? ''
    player.masteryLevel = newMastery.level
    player.masteryTier = newMastery.level

    // Clean slate — clear cooldowns + statuses on loadout change.
    player.abilityCooldowns.clear()
    this.statuses.clearAll(sid)
    console.info(
      `[GameRoom ${this.roomId}] loadoutSet ${sid} mastery=${player.masteryElement || 'none'}/level${newMastery.level}`,
    )
  }

  // --- Fase 4 engine glue ---------------------------------------------------

  // Adapter from the engine's projectile request (with optional element /
  // splash / onHitStatus) to the room's existing spawnProjectile pipeline.
  private spawnProjectileFromEngine(req: ProjectileSpawnRequest): string {
    this.projectileIdCounter += 1
    const pid = `p${this.projectileIdCounter}`
    const p = new Projectile()
    p.id = pid
    p.ownerId = req.ownerId
    p.kind = req.kind
    p.originX = req.origin.x
    p.originY = req.origin.y
    p.originZ = req.origin.z
    p.x = req.origin.x
    p.y = req.origin.y
    p.z = req.origin.z
    p.vx = req.vel.x
    p.vy = req.vel.y
    p.vz = req.vel.z
    p.gravity = req.gravity
    p.damage = req.damage
    p.spawnedAtTick = req.spawnedAtTick
    p.despawnAtTick = req.spawnedAtTick + req.lifetimeTicks
    p.expired = false
    this.state.projectiles.set(pid, p)
    this.projectileSim.set(pid, {
      pos: { x: req.origin.x, y: req.origin.y, z: req.origin.z },
      vel: { x: req.vel.x, y: req.vel.y, z: req.vel.z },
      gravity: req.gravity,
    })
    const elementStr = req.element ?? 'none'
    p.element = elementStr
    this.projectileMeta.set(pid, {
      ownerId: req.ownerId,
      abilityId: req.abilityId,
      comboRole: req.comboRole,
      kind: req.kind,
      damage: req.damage,
      element: elementStr,
      splashRadius: req.splashRadius ?? 0,
      lifestealFraction: req.lifestealFraction,
      onHitStatus: req.onHitStatus,
    })
    const spawnedMsg: ServerProjectileSpawnedMessage = {
      id: pid,
      ownerId: req.ownerId,
      kind: req.kind,
      atTick: req.spawnedAtTick,
      origin: { ...req.origin },
      velocity: { ...req.vel },
      damage: req.damage,
      element: elementStr,
    }
    this.broadcast(MessageTypes.ProjectileSpawned, spawnedMsg)
    return pid
  }

  // Spawn a Zone (Flame Wall, Thorn Field, ...).
  private spawnZoneFromEngine(req: ZoneSpawnRequest): string {
    this.zoneIdCounter += 1
    const zid = `z${this.zoneIdCounter}`
    const z = new Zone()
    z.id = zid
    z.ownerId = req.ownerId
    z.abilityId = req.abilityId
    z.element = req.element
    z.shape = req.shape
    z.x = req.pos.x
    z.y = req.pos.y
    z.z = req.pos.z
    z.yaw = req.yaw
    z.radius = req.radius
    z.width = req.width
    z.spawnedAtTick = this.state.tick
    z.armedAtTick = this.state.tick + Math.round((req.armDelaySec ?? 0) * TICK_RATE_HZ)
    z.despawnAtTick = this.state.tick + Math.round(req.durationSec * TICK_RATE_HZ)
    z.tickEveryTicks = Math.max(1, Math.round(req.tickEverySec * TICK_RATE_HZ))
    z.nextTickAtTick = Math.max(this.state.tick + z.tickEveryTicks, z.armedAtTick)
    z.damagePerTick = req.damagePerTick
    z.expiresOnTrigger = !!req.expiresOnTrigger
    if (req.applyStatus) {
      z.applyStatusKind = req.applyStatus.kind
      z.applyStatusDurationSec = req.applyStatus.durationSec
      z.applyStatusStacks = req.applyStatus.stacks
      z.applyStatusSlowFraction = req.applyStatus.slowFraction ?? 0
    }
    z.expired = false
    this.state.zones.set(zid, z)
    const msg: ServerZoneSpawnedMessage = {
      id: zid,
      ownerId: req.ownerId,
      abilityId: req.abilityId,
      element: req.element,
      shape: req.shape,
      pos: { x: req.pos.x, y: req.pos.y, z: req.pos.z },
      radius: req.radius,
      width: req.width,
      yaw: req.yaw,
      durationSec: req.durationSec,
      atTick: this.state.tick,
    }
    this.broadcast(MessageTypes.ZoneSpawned, msg)
    return zid
  }

  // Per-tick zone driver.
  private tickZones(): void {
    if (this.state.zones.size === 0) return
    const now = this.state.tick
    const removed: string[] = []
    this.state.zones.forEach((z, zid) => {
      if (z.expired) {
        removed.push(zid)
        return
      }
      if (now >= z.despawnAtTick) {
        z.expired = true
        removed.push(zid)
        return
      }
      if (now < z.armedAtTick) return
      if (now < z.nextTickAtTick) return
      z.nextTickAtTick = now + z.tickEveryTicks
      let triggered = false
      this.state.players.forEach((player: Player, pid: string) => {
        if (z.expiresOnTrigger && triggered) return
        if (!player.alive) return
        if (pid === z.ownerId) return
        if (now < player.invulnUntilTick) return
        const dx = player.transform.x - z.x
        const dz = player.transform.z - z.z
        const inside =
          z.shape === 'wall'
            ? this.pointInsideWall(dx, dz, z.yaw, z.width)
            : Math.hypot(dx, dz) <= z.radius
        if (!inside) return
        triggered = true
        if (z.damagePerTick > 0) {
          this.damageQueue.push({
            attackerId: z.ownerId,
            victimId: pid,
            damage: z.damagePerTick,
            knockup: false,
            cause: `zone:${z.abilityId}`,
            canParry: false,
            element: z.element,
          })
        }
        if (z.applyStatusKind && z.applyStatusDurationSec > 0) {
          this.statuses.applyToPlayer(
            pid,
            z.applyStatusKind as StatusKind,
            z.applyStatusDurationSec,
            z.applyStatusStacks || 1,
            z.ownerId,
            z.applyStatusSlowFraction > 0 ? z.applyStatusSlowFraction : undefined,
          )
        }
      })
      if (z.expiresOnTrigger && triggered) {
        z.expired = true
        removed.push(zid)
      }
    })
    for (const zid of removed) {
      this.state.zones.delete(zid)
      const msg: ServerZoneExpiredMessage = { id: zid, atTick: now }
      this.broadcast(MessageTypes.ZoneExpired, msg)
    }
  }

  private pointInsideWall(dx: number, dz: number, yaw: number, width: number): boolean {
    const c = Math.cos(yaw)
    const s = Math.sin(yaw)
    const along = dx * -s + dz * -c
    const perp = dx * c + dz * -s
    return Math.abs(perp) <= 0.6 && Math.abs(along) <= width / 2
  }

  private resolveAbilityDisplacement(
    player: Player,
    dx: number,
    dz: number,
    cancelOnCollision: boolean,
  ): { x: number; z: number } {
    const startX = player.transform.x
    const startZ = player.transform.z
    const targetX = startX + dx
    const targetZ = startZ + dz
    if (!cancelOnCollision) return { x: targetX, z: targetZ }

    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.25))
    let lastX = startX
    let lastZ = startZ
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      const nx = startX + dx * t
      const nz = startZ + dz * t
      if (this.isCapsuleBlocked2D(nx, player.transform.y, nz)) break
      lastX = nx
      lastZ = nz
    }
    return { x: lastX, z: lastZ }
  }

  private isCapsuleBlocked2D(x: number, y: number, z: number): boolean {
    const r = PLAYER_CAPSULE_RADIUS_M
    const minY = y - PLAYER_CAPSULE_HEIGHT_M / 2
    const maxY = y + PLAYER_CAPSULE_HEIGHT_M / 2
    for (const box of this.activeMap.boxes) {
      if (maxY < box.minY || minY > box.maxY) continue
      if (
        x + r >= box.minX &&
        x - r <= box.maxX &&
        z + r >= box.minZ &&
        z - r <= box.maxZ
      ) {
        return true
      }
    }
    return false
  }

  // Engine-driven atomic weapon swap.
  private forceWeaponSwap(sid: string, weapon: 'sword' | 'bow' | 'staff'): void {
    const player = this.state.players.get(sid)
    if (!player || !player.alive) return
    if (player.activeWeapon === weapon) return
    player.activeWeapon = weapon
    this.pendingSwings = this.pendingSwings.filter((s) => s.attackerId !== sid)
    player.swingEndsAtTick = 0
    player.bowChargeStartTick = 0
    player.staffNextFireTick = 0
    const msg: ServerWeaponSwappedMessage = {
      playerId: sid,
      weapon,
      atTick: this.state.tick,
    }
    this.broadcast(MessageTypes.WeaponSwapped, msg)
  }

  private hasLineOfSight(
    from: { x: number; y: number; z: number },
    to: { x: number; y: number; z: number },
  ): boolean {
    for (const box of this.activeMap.boxes) {
      if (segmentVsAabb(from, to, box) !== null) return false
    }
    return true
  }

  // Engine-driven knockup.
  private applyKnockupToPlayer(
    player: Player,
    airborneSec: number,
    knockback?: { x: number; z: number; distance: number },
  ): void {
    const sid = player.id
    const simState = this.sim.get(sid)
    // Knockup is a hard combo state: it must cancel defensive/offensive
    // commitments so the airborne punish window is deterministic.
    player.parrying = false
    player.parryIsHold = false
    player.parryTapEndsAtTick = 0
    player.bowChargeStartTick = 0
    if (player.casting) this.engine.cancelCast(sid, 'damage')
    if (knockback && knockback.distance > 0) {
      const resolved = this.resolveAbilityDisplacement(
        player,
        knockback.x * knockback.distance,
        knockback.z * knockback.distance,
        true,
      )
      player.transform.x = resolved.x
      player.transform.z = resolved.z
      if (simState) {
        simState.pos.x = resolved.x
        simState.pos.z = resolved.z
      }
    }
    if (simState) {
      simState.vel.y = uppercutInitialVy()
      simState.vel.x = 0
      simState.vel.z = 0
      simState.onGround = false
    }
    player.vy = simState?.vel.y ?? 0
    player.vx = 0
    player.vz = 0
    player.onGround = false
    player.airborneUntilTick = this.state.tick + Math.max(1, Math.round(airborneSec * TICK_RATE_HZ))
  }

  // Drain queued transmute messages (one per tick max per player).
  private drainTransmuteQueue(): void {
    if (this.transmuteQueues.size === 0) return
    this.transmuteQueues.forEach((queue, sid) => {
      if (queue.length === 0) return
      if (!this.canAcceptCombatAction()) {
        queue.splice(0)
        return
      }
      const msg = queue.shift()!
      this.transmute.handle(sid, msg)
    })
  }
}

// --- Fase 4 helpers --------------------------------------------------------

// Bridge from the engine's push-shape into the room's PendingDamage queue.
function makePendingDamageBridge(target: PendingDamage[]): {
  push: (entry: {
    attackerId: string
    victimId: string
    amount: number
    element: string
    cause: string
    canParry: boolean
    lifestealFraction?: number
    onDamageStatus?: { status: StatusKind; durationSec: number; stacks?: number; slowFraction?: number }
  }) => number
  length: number
} {
  return {
    get length() {
      return target.length
    },
    push(entry) {
      target.push({
        attackerId: entry.attackerId,
        victimId: entry.victimId,
        damage: entry.amount,
        knockup: false,
        cause: entry.cause,
        canParry: entry.canParry,
        element: entry.element ?? '',
        lifestealFraction: entry.lifestealFraction,
        onDamageStatus: entry.onDamageStatus
          ? {
              kind: entry.onDamageStatus.status,
              durationSec: entry.onDamageStatus.durationSec,
              stacks: entry.onDamageStatus.stacks ?? 1,
              slowFraction: entry.onDamageStatus.slowFraction,
            }
          : undefined,
      })
      return target.length
    },
  }
}

function clamp(v: number, lo: number, hi: number): number {
  if (Number.isNaN(v)) return 0
  return v < lo ? lo : v > hi ? hi : v
}

function indexOfSid(map: { keys(): IterableIterator<string> }, target: string): number {
  let i = 0
  for (const k of map.keys()) {
    if (k === target) return i
    i++
  }
  return 0
}

function isValidWeaponId(w: string): w is Weapon {
  return (WEAPON_IDS as readonly string[]).includes(w)
}

export function computeProjectileOrigin(
  player: Player,
  dir: { x: number; y: number; z: number },
): { x: number; y: number; z: number } {
  return {
    x: player.transform.x + dir.x * PROJECTILE_SPAWN_FORWARD_OFFSET_M,
    y: player.transform.y + PROJECTILE_SPAWN_Y_OFFSET_M + dir.y * PROJECTILE_SPAWN_FORWARD_OFFSET_M,
    z: player.transform.z + dir.z * PROJECTILE_SPAWN_FORWARD_OFFSET_M,
  }
}

const BOT_NAMES = ['Shadow', 'Ember', 'Frost', 'Storm', 'Void', 'Blaze', 'Riven', 'Dusk'] as const

// Default loadout applied at onJoin (and to bots). Matches the client's
// DEFAULT_SLOTS in loadout-station.ts so new players start with the same
// 11 starter slots on server and client.
// Slot order: melee, bow, magic[5], fixed transfer utilities[3], flex utility[1].
const DEFAULT_LOADOUT: readonly string[] = Object.freeze([
  'uppercut',       // melee
  'piercing_shot',  // bow
  'fireball',       // magic 1
  'flame_wall',     // magic 2
  'frost_bolt',     // magic 3
  'chain_bolt',     // magic 4
  'shadow_bolt',    // magic 5
  'transfer_hp_mana',   // fixed transfer Z
  'transfer_mana_stam', // fixed transfer X
  'transfer_stam_hp',   // fixed transfer F
  'quick_dash',         // flex utility V
])
