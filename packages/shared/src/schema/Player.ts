import { ArraySchema, MapSchema, Schema, type } from '@colyseus/schema'

import { HP_MAX, MANA_MAX, STAMINA_MAX } from '../constants/stats.js'

import { StatusInstance } from './StatusInstance.js'
import { Transform } from './Transform.js'

// Player entity — one per connected client, plus one per Bot in Training mode.
// Replicated player state: movement/prediction fields, resources, weapon/combat
// state, cooldown maps, statuses, current loadout, and class mechanic metadata.
// Scalar fields annotated `: number` explicitly so assignments aren't narrowed
// by `as const` constants used as initialisers.
export class Player extends Schema {
  @type('string') id = ''
  @type('string') name = ''
  @type('string') team = ''
  // Empty string = guest session. Non-empty when an authenticated account is
  // linked. The server sets this from the auth token in onJoin once auth exists;
  // gameplay never gates on it — local sessions work without it.
  @type('string') userId = ''
  @type(Transform) transform = new Transform()

  // Velocity (m/s). Replicated so clients can seed interpolation with vy and
  // so the self-client can reconcile with knowledge of vertical velocity.
  @type('number') vx: number = 0
  @type('number') vy: number = 0
  @type('number') vz: number = 0

  // True when resting on a surface this tick.
  @type('boolean') onGround = true

  // Monotonic per-client input sequence fully simulated by the server.
  @type('number') lastProcessedInputSeq: number = 0

  @type('number') hp: number = HP_MAX
  @type('number') mana: number = MANA_MAX
  @type('number') stamina: number = STAMINA_MAX

  @type('string') activeWeapon = 'sword'

  // Cast state — empty/false means idle.
  // Used for ability windups (Uppercut 0.4 s, Meteor 1.5 s, etc).
  @type('boolean') casting = false
  @type('string') castAbilityId = ''
  @type('number') castEndsAtTick: number = 0

  // Global cooldown between ability casts (does NOT apply to M1 basic attacks).
  @type('number') gcdReadyAtTick: number = 0

  // Sword M1 combo state.
  @type('number') comboIndex: number = 0
  @type('number') swingEndsAtTick: number = 0
  @type('number') lastSwingStartTick: number = 0
  // Tick of the last bow-release / staff-fire (only set when a projectile actually
  // spawned). Remotes edge-detect a change to play Bow_Release / Staff_Cast — the
  // sword arc covers melee, but ranged shots had no replicated shoot trigger.
  @type('number') lastRangedReleaseTick: number = 0

  // Uppercut cooldown mirrored from abilityCooldowns['uppercut'] for HUD compatibility.
  @type('number') uppercutReadyAtTick: number = 0

  // Airborne / knockup state.
  @type('number') airborneUntilTick: number = 0

  // Respawn / invuln.
  @type('boolean') alive = true
  @type('number') invulnUntilTick: number = 0
  @type('number') respawnAtTick: number = 0

  // Regen gating.
  @type('number') lastDamageAtTick: number = 0
  @type('number') lastManaSpendAtTick: number = 0

  // --- Weapon swap + ranged + parry state ---------------------------------

  // Tick at which the weapon-swap animation finishes. During the swap window
  // (now < weaponSwapEndTick) ability casts that require the NEW weapon are
  // blocked. Gives 0.12 s of cinematic feel without penalizing fast swappers.
  @type('number') weaponSwapEndTick: number = 0

  @type('number') bowChargeStartTick: number = 0
  @type('number') staffNextFireTick: number = 0
  @type('boolean') parrying = false
  @type('boolean') parryIsHold = false
  @type('number') parryTapEndsAtTick: number = 0
  @type('number') parryCooldownReadyAtTick: number = 0

  // --- Ability engine + status -------------------------------------------

  // Per-ability cooldown map: ability id -> tick at which it becomes ready
  // again. Missing entries mean ready (or never cast). Engine writes here on
  // a successful cast and reads here when validating a cast attempt.
  @type({ map: 'number' }) abilityCooldowns = new MapSchema<number>()

  // Active conditions on the player (Burn x3, Bleed, Slow 30%, ...). The
  // server's StatusRuntime ticks these every frame and applies DoT damage,
  // movement modifiers, and cast locks.
  @type([StatusInstance]) statuses = new ArraySchema<StatusInstance>()

  // Loadout snapshot — class-aware ability ids in family order. Filled at room
  // join from a default loadout and replaced whenever the client sends loadoutSet.
  @type(['string']) loadout = new ArraySchema<string>()

  @type('string') classId = 'hybrid'

  // --- Class mechanic state ------------------------------------------------
  // Replicated so client HUD can render class identity without extra messages.
  @type('number') furyStacks: number = 0
  @type('boolean') furyNextMeleeIsSurge = false

  @type('number') momentum: number = 0

  @type('string') risonanzaElement = ''
  @type('number') risonanzaArmedUntilTick: number = 0

  @type('number') flowStacks: number = 0
  @type('boolean') flowPendingBonus = false

  // Replicated movement prediction fields
  @type('number') momentumTicks: number = 0
  @type('number') jumpHoldTicksLeft: number = 0
  @type('number') coyoteTicksLeft: number = 0
}
