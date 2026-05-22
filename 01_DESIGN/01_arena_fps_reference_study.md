---
id: arena_fps_reference_study
title: Arena FPS Reference Study
section: combat
tags: [movement, air_combat, quake, darkfall, contract]
provides: [arena_movement_contract, air_action_policy, impulse_contract]
deps: [00_classes.md, 01_controls.md, 01_combat_fundamentals.md]
status: target-decision
---

# Arena FPS Movement And Air Contract

## Decision locked on 2026-05-22

RAGEQUIT's target movement/combat model is an active arena-FPS contract:

- `airborne` is not hard CC;
- weapon M1 families remain legal in air by default;
- ability/parry/recovery air legality is explicit per state or ability, never a
  blanket airborne reject;
- knockup is launch/displacement/aim pressure, not universal silence;
- self-damage stays zero while self-impulse becomes a server-owned ability
  payload with caps, collision and prediction rules;
- the shared movement controller must move toward acceleration, friction and
  preserved air velocity before the project claims arena-FPS movement feel.

## Why this exists

The confirmed redesign says RAGEQUIT should feel like an active arena FPS when
movement, air combat and spell pressure are in doubt. That conflicts with the
current slice in important places:

- the shared controller rewrites horizontal velocity directly from input each
  tick;
- knockup can zero horizontal movement through `airborneLocked`;
- server ability/parry/staff/sword paths reject airborne actions in several
  places;
- projectile runtime excludes projectile owner hits, so target self-damage is
  already absent while self-impulse is not yet a formal system.

This contract prevents a fake "arena pass" that only changes speed constants.

## Reference anchors

### Quake 3

Use as anchor for:

- separate ground and air movement questions;
- momentum, acceleration, friction and jump timing as feel drivers;
- projectile splash/knockback as aim and movement pressure;
- weapon pressure while players are airborne.

### Darkfall

Use as anchor for:

- first-person magic and ranged pressure sharing a combat space;
- active spell choice under movement pressure;
- magic schools and utility/recovery choices without turning combat into
  passive lockout.

## Current code facts

| Surface                                 | Current fact                                                 | Redesign implication                                                      |
| --------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `packages/shared/src/sim/controller.ts` | Horizontal `vel.x/z` are assigned from move input every tick | Momentum/air-control cannot emerge only from old constants                |
| Movement caps                           | `airborneLocked` participates in full horizontal lock        | Remove blanket lock assumption                                            |
| `AbilityEngine.tryCast`                 | airborne casts can fail with reason `airborne`               | Need action allow rules, not one global reject                            |
| `GameRoom`                              | Sword, Staff and parry have airborne guards                  | Target all-weapon air behavior needs runtime rewrite                      |
| Projectile resolution                   | owner projectiles are skipped for hit damage                 | Self-damage zero direction is compatible; self-impulse needs explicit API |

## Questions answered by the contract

1. Does target movement use preserved horizontal velocity with acceleration and
   friction, or a lighter custom model that only borrows arena readability?
2. Which movement tech is intentional:
   - strafe/circle gain;
   - jump chaining;
   - self-impulse from spell/projectile splash;
   - knockback surf/recovery;
   - movement ability chaining?
3. Which actions are legal in air by default:
   - M1 per weapon;
   - class abilities;
   - parry/shield;
   - utility recovery;
   - placement previews?
4. How does knockup pressure without becoming an unplayable stun?
5. Which self-impulse tools belong to everyone and which are class/ability
   identity?
6. How do server prediction, reconciliation and anti-cheat validate impulse
   without trusting the client?

## Target direction

1. Replace `airborneLocked` as a general gameplay rule with specific statuses
   and action restrictions. A root/freeze/stun can disable; being airborne alone
   should not.
2. Separate **air state** from **hard CC state** in docs, schema and HUD.
3. Keep all weapon M1 families legal in air unless a specific ability/weapon
   state has a clear reason not to be.
4. Make knockup a displacement/aim-pressure state, not a full ability silence.
5. Add a server-owned impulse concept for ability splash/knockback/self movement
   tech. Self impulse and self damage are separate decisions.
6. Evaluate whether the controller needs acceleration/friction/air-control
   refactor before class tuning; if old direct-velocity movement remains, call it
   an explicit simplified model rather than claiming Quake-like physics.

## Target movement and air model

### Movement base

Use an arena movement model with server-owned velocity state:

- ground movement uses acceleration and friction instead of rewriting horizontal
  velocity to the exact input wish vector every tick;
- air movement keeps horizontal velocity and lets input steer/accelerate within a
  bounded air-control budget;
- jump preserves readable momentum;
- movement abilities and impulses add velocity through the same server-owned
  impulse lane rather than teleporting by exception unless the ability is
  explicitly a teleport.

Do not copy Quake constants directly. Start with RAGEQUIT-sized values and tune
against browser feel, map scale and class kits.

### State vocabulary

Split state names before implementation:

| State                | Meaning                                       | Default action rule                             |
| -------------------- | --------------------------------------------- | ----------------------------------------------- |
| `airborne`           | Not grounded: jump, fall, launch, impulse     | Weapons and eligible abilities still work       |
| `displaced`          | Current motion includes external/self impulse | Steering may be limited by physics, not silence |
| `hardCC`             | Root/freeze/stun/specific silence             | Explicitly blocks the actions it owns           |
| `channeling/casting` | Ability commitment                            | Existing interruption rules apply per ability   |

Being `airborne` is not itself `hardCC`.

### Air action policy

Target default:

- Sword M1: legal in air; hit shape/timing may differ if needed for fairness.
- Bow M1: legal in air.
- Staff M1: legal in air.
- Class abilities: legal in air unless the ability definition says it requires
  ground placement, grounded caster or a committed channel incompatible with air.
- Parry/shield: legal in air by default if resources/state allow it.
- Recovery: ability-specific; a grounded brace can require ground, a moving heal
  can work in air only if designed for it.

This moves legality into explicit ability/weapon rules instead of a blanket
airborne rejection.

### Knockup target

Knockup becomes a strong launch impulse with combo readability:

- applies vertical launch and optional horizontal impulse;
- does not zero every X/Z velocity by default;
- does not automatically silence all abilities;
- may interrupt the specific action it hits if that action is interruptible;
- creates a visible air-punish opportunity because the victim trajectory is
  pressured and easier to read for a short moment.

Hard control should be a different tag/state. A spell that **stuns then launches**
must pay for both effects and say both effects.

### Self impulse target

Own ability damage stays zero. Impulse is a separate payload:

- some splash/movement abilities can apply self impulse;
- self impulse has server-authored direction, magnitude, caps and collision
  behavior;
- not every projectile automatically launches the caster;
- self impulse should have visible tell and ability budget cost;
- classes can differ in how often they access it through legal ability pools.

This allows spell-under-feet movement tech without making every ground cast a
free escape.

### Collision and prediction target

- Client predicts local movement and any local impulse event it is allowed to
  predict from server-confirmed/self-cast data.
- Server owns final impulse, collision, speed caps and reconciliation.
- Movement refactor must add tests for impulse/collision/replay determinism, not
  only visual smoke.
- If latency makes a predicted self-impulse feel wrong, prefer short cast tells
  and effect timing that hide confirmation without moving authority client-side.

## Rules to reject

- Airborne state that blanks movement input, all abilities, parry and weapon M1
  just to guarantee a combo conversion.
- Teleporting knockback as the default answer for every launch when velocity and
  collision should own the motion.
- M1/ability balance tuned before the new movement/impulse model exists.
- Visual AIR feedback that implies helplessness when the player still has legal
  air answers.

## Open tuning questions for prototype

1. Which abilities in the first target roster create self impulse?
2. Does Sword air M1 use the same arc/range as grounded M1?
3. Does parry in air preserve the same Stamina cost and shield duration?
4. Do hard CC effects need separate anti-chain rules once knockup is no longer
   the silence state?
5. Which maps need ceiling/edge rules so self impulse is fun instead of broken?

## Minimum prototype matrix

Any movement prototype should be tested in browser for:

| Scenario                      | What must be observed                                |
| ----------------------------- | ---------------------------------------------------- |
| Ground run -> jump -> air aim | aim and firing stay active                           |
| Self spell under feet         | no HP damage; impulse/readability decided            |
| Enemy knockup                 | victim can answer with legal air actions             |
| Wall/ceiling collision        | impulse cannot tunnel or stick                       |
| Prediction/reconcile          | server correction is readable, not constant snapping |
| Duel combo                    | knockup remains useful after lockout removal         |

## Out of scope until prototype pass

- Copying Quake constants directly.
- Calling every self-impulse "rocket jump" if the actual ability shape does not
  support it.
- Tuning class HP, recovery and finisher damage before air rules settle.
