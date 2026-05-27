// Event-channel message types (see 02_TECH/03_network_protocol.md).
// Colyseus state-sync handles structural state; these are one-shot events.

export type Weapon = 'sword' | 'bow' | 'staff'

// --- Client -> Server --------------------------------------------------

export interface ClientInputMessage {
  // Client-estimated server tick the input is meant for. Informational in
  // Queued by arrival order and echoed for prediction cleanup.
  tick: number
  // Monotonic per-client counter. The server echoes the highest processed
  // value back via Player.lastProcessedInputSeq so the client can discard
  // replayed predictions.
  seq: number
  // Movement — normalised [-1, 1] in the camera's local frame.
  moveX: number
  moveZ: number
  // Look — radians, world-space yaw/pitch. Yaw rotates the move vector.
  yaw: number
  pitch: number
  // Buttons.
  jump: boolean // edge: true only on the tick jump was pressed
  jumpHold: boolean // continuous: true while the key is held
  m1: boolean // left-click: basic attack
  m2: boolean // right-click: parry hold (tap detected by server from edge)
}

export interface ClientCastMessage {
  abilityId: string
  atTick: number
  targetYaw?: number
  targetPitch?: number
  targetPoint?: { x: number; y: number; z: number }
}

// Explicit swing request. Sent on every M1 rising edge — the server decides
// whether it's combo-continue, combo-reset or rejected by live combat state.
// We use a dedicated message instead of the m1 boolean inside ClientInputMessage
// so the swing dispatch is atomic and carries the firing tick for lag-comp.
export interface ClientSwingMessage {
  atTick: number
  // Attacker's yaw at the moment of the click — server uses this for cone
  // direction so the hit matches what the player saw.
  yaw: number
}

export interface ClientWeaponSwapMessage {
  weapon: Weapon
  atTick: number
}

// --- Ranged + parry --------------------------------------------------------

// Bow charge press. Client sends on M1 rising edge while bow is equipped.
// Server stores the starting tick; release / interrupt / swap / damage close
// the draw.
export interface ClientChargeStartMessage {
  atTick: number
}

// Bow charge release. Server computes charge ratio from
// (atTick - bowChargeStartTick) and spawns the arrow with scaled damage/speed.
// If the charge is under BOW_CHARGE_MIN_SEC the shot is cancelled (no cost).
export interface ClientChargeReleaseMessage {
  atTick: number
  // Release yaw/pitch — arrow direction is computed from these.
  yaw: number
  pitch: number
}

// Staff bolt fire. Sent on every M1 press while staff is equipped; server
// rejects if cadence not ready or mana insufficient. Direction is the shooter's
// yaw/pitch at the firing tick (for lag-comp spawn direction).
export interface ClientFireStaffMessage {
  atTick: number
  yaw: number
  pitch: number
}

// Parry press/release. The server decides tap vs hold from the duration:
// a release within PARRY_TAP_WINDOW_SEC of press completes the tap
// (100% block during the window); otherwise the hold window is active for as
// long as the key is held and stamina lasts.
export interface ClientParryPressMessage {
  atTick: number
}

export interface ClientParryReleaseMessage {
  atTick: number
}

/**
 * Class-aware loadout envelope.
 * Each array contains ability ids for that slot family; length is determined
 * by the class slot grammar. Server validates family, class-legality, budget
 * and uniqueness — not wire array positions.
 */
export interface ClientLoadoutMessage {
  /** Class id the player is building for. Required; defaults to 'hybrid' if absent or invalid. */
  classId: string
  melee: string[]
  bow: string[]
  magicBase: string[]
  magicAdvanced: string[]
  utility: string[]
  /** Per-ability instant-cast flags. Included when sending from loadout station. */
  instantCast?: Record<string, boolean>
}

export interface ClientHeartbeatMessage {
  clientTime: number
}

// --- Server -> Client --------------------------------------------------

export interface ServerHitMessage {
  attackerId: string
  victimId: string
  damage: number
  element: string
  didParry: boolean
  atTick: number
  // Source of the damage — raw value from PendingDamage.cause.
  // Common values: 'sword_m1', 'uppercut', 'bow', 'staff', 'zone:<abilityId>',
  // 'combo:<kind>', ability ids from the engine. Client maps these to broad
  // categories (swing/projectile/zone/ability) for VFX and sound dispatch.
  cause: string
}

export interface ServerDeathMessage {
  victimId: string
  killerId: string
  assistIds: string[]
  cause: string
  atTick: number
}

export interface ServerAbilityCastedMessage {
  casterId: string
  abilityId: string
  atTick: number
}

export interface ServerAbilityFailedMessage {
  abilityId: string
  reason:
    | 'cooldown'
    | 'cost'
    | 'range'
    | 'cc'
    | 'unreachable'
    | 'wrong_weapon'
    | 'gcd'
    | 'dead'
    | 'casting'
    | 'grounded_required'
    | 'parrying'
    | 'unknown_ability'
    | 'not_in_loadout'
    | 'swapping'
}

// Status apply / expire / DoT damage tick events for HUD.
export interface ServerStatusAppliedMessage {
  playerId: string
  status: string // StatusKind
  stacks: number
  durationSec: number
  sourceId: string
  atTick: number
}

export interface ServerStatusExpiredMessage {
  playerId: string
  status: string
  atTick: number
}

// Zone spawn / expire (Flame Wall, Thorn Field, ...). Per-tick state
// is via the replicated Zone schema map; these one-shots drive VFX.
export interface ServerZoneSpawnedMessage {
  id: string
  ownerId: string
  abilityId: string
  element: string
  shape: 'circle' | 'wall'
  pos: { x: number; y: number; z: number }
  radius: number
  width: number
  yaw: number
  durationSec: number
  atTick: number
}

export interface ServerZoneExpiredMessage {
  id: string
  atTick: number
}

export interface ServerReconcileMessage {
  tick: number
  pos: { x: number; y: number; z: number }
  vel: { x: number; y: number; z: number }
}

export interface ServerMatchPhaseMessage {
  phase: 'lobby' | 'countdown' | 'live' | 'roundEnd' | 'matchEnd'
  countdownMs?: number
}

export interface ServerScoreMessage {
  team?: Record<string, number>
  solo?: Record<string, number>
  roundWins?: Record<string, number>
}

export interface ServerPongAckMessage {
  clientTime: number
  serverTime: number
}

export interface ServerNoteMessage {
  kind: 'warn' | 'info'
  text: string
}

// Spawn/expire events for projectiles (state sync handles the per-tick
// integration; these one-shots carry kind + damage for HUD hints and VFX).
export interface ServerProjectileSpawnedMessage {
  id: string
  ownerId: string
  kind: 'arrow' | 'bolt'
  atTick: number
  origin: { x: number; y: number; z: number }
  velocity: { x: number; y: number; z: number }
  damage: number
  element?: string
}

export interface ServerProjectileExpiredMessage {
  id: string
  atTick: number
  // `reason = 'terrain'` on ground/world impact, `'victim'` on player hit,
  // `'timeout'` when TTL elapsed.
  reason: 'terrain' | 'victim' | 'timeout'
  // Position at expiry — used by client for impact VFX placement.
  pos: { x: number; y: number; z: number }
  // Element of the projectile, for elemental-tinted impact VFX.
  element?: string
}

// Weapon swap ack. Emitted so
// the client can clear any pending charge cleanly.
export interface ServerWeaponSwappedMessage {
  playerId: string
  weapon: Weapon
  atTick: number
}

// Parry event — on tap success, on hold start, on release, on expiry.
export interface ServerParryEventMessage {
  playerId: string
  kind: 'tapStart' | 'tapEnd' | 'holdStart' | 'holdEnd'
  atTick: number
}

// Channel interrupted — sent to all when breakOnMove fires mid-channel.
export interface ServerChannelInterruptedMessage {
  casterId: string
  abilityId: string
  reason: 'move' | 'damage' | 'death'
  atTick: number
}

// Kill streak event — broadcast when a player's streak changes.
// streak = 0 means the streak was broken (victim died).
export interface ServerKillStreakMessage {
  playerId: string
  streak: number // current consecutive kills (0 = streak broken)
  damageBonus: number // e.g. 0.10 → +10% outgoing damage
  atTick: number
}

// String-keyed registry for type-safe room.send / onMessage.
export const MessageTypes = {
  // Client -> Server
  Input: 'input',
  Swing: 'swing',
  Cast: 'cast',
  WeaponSwap: 'weaponSwap',
  Loadout: 'loadoutSet',
  Heartbeat: 'heartbeat',
  ChargeStart: 'chargeStart',
  ChargeRelease: 'chargeRelease',
  FireStaff: 'fireStaff',
  ParryPress: 'parryPress',
  ParryRelease: 'parryRelease',

  // Server -> Client
  Hit: 'hit',
  Death: 'death',
  AbilityCasted: 'abilityCasted',
  AbilityFailed: 'abilityFailed',
  Reconcile: 'reconcile',
  MatchPhase: 'matchPhase',
  Score: 'score',
  PongAck: 'pongAck',
  ServerNote: 'serverNote',
  ProjectileSpawned: 'projectileSpawned',
  ProjectileExpired: 'projectileExpired',
  WeaponSwapped: 'weaponSwapped',
  ParryEvent: 'parryEvent',
  // Ability / status / zone messages
  StatusApplied: 'statusApplied',
  StatusExpired: 'statusExpired',
  ZoneSpawned: 'zoneSpawned',
  ZoneExpired: 'zoneExpired',
  // Kill streaks
  KillStreak: 'killStreak',
  // Channel interrupt
  ChannelInterrupted: 'channelInterrupted',
} as const
