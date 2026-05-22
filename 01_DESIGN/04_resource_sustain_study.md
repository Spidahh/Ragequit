---
id: resource_sustain_study
title: Resource Sustain Study
section: systems
tags: [resources, healing, transfers, study]
provides: [sustain_target_contract, recovery_budget_band]
deps: [00_classes.md, 01_stats.md, 01_combat_fundamentals.md]
status: target-decision
---

# Resource Sustain Decision

## Decision locked on 2026-05-22

The target class redesign removes fixed resource transfers.

- No fixed HP -> Mana, Mana -> Stamina or Stamina -> HP slots.
- No universal Mana -> HP replacement button hidden outside loadout choices.
- In-combat self-sustain lives in **Recovery** utility choices and in magic
  abilities that explicitly spend their own magic slot, cost, timing and
  counterplay budget.
- Every class must have at least one legal Recovery utility option and its
  first-session starter build must include one.
- A build may deliberately drop Recovery for aggression, movement or control;
  the Loadout Station must expose that risk.

This decision keeps sustain inside class/loadout pressure instead of taxing
every player with the same conversion strip.

## Why this exists

The previous fixed transfer package is not the approved target anymore:

- HP -> Mana
- Mana -> Stamina
- Stamina -> HP

The class redesign gives Tank, Arciere, Mago and Ibrido different resource
profiles. A leftover transfer rule that is excellent for one class and nonsense
for another will break the loadout, HUD and healing economy.

## Locked inputs

- RAGEQUIT is an active arena FPS, not a slow attrition RPG.
- Fall damage is always zero.
- Own ability damage is always zero so spell movement tech can exist.
- Classes are confirmed and use different resource emphases.
- Basic M1 pressure must not dominate the ability game.
- Sustain must not erase aim, movement, spacing or combo conversion.

## Runtime facts that constrain the study

The current runtime already has enough defensive recovery that a new transfer
cannot be added casually:

| Runtime tool               | Current output        | Cooldown         | Average budget note                           |
| -------------------------- | --------------------- | ---------------- | --------------------------------------------- |
| Healing Potion utility     | 40 HP over 2 s        | 20 s             | 2.0 HP/s across cooldown                      |
| Barrier utility            | 42 shield HP          | 18 s             | 2.33 effective HP/s if the shield is consumed |
| Healing Totem magic        | 40 HP over 5 s        | 20 s             | Nature/staff slot and Mana cost gate it       |
| Dark Life Drain            | Damage plus lifesteal | ability-specific | Requires offensive contact                    |
| Old Stamina -> HP transfer | 20 HP                 | 5 s              | 4.0 HP/s in the old direct runtime path       |

Also note that live runtime tuning has already drifted from the older stat
snapshot: `packages/shared/src/constants/stats.ts` currently has `MANA_MAX =
120`, Mana regen `8/s` after a `0.5s` delay, and out-of-combat HP regen `2/s`.
That makes a Mana-based repeatable heal especially dangerous until the class
resource pass is implemented.

## Questions resolved by the decision

1. Is any universal conversion still fun once class resource pools diverge?
2. Should emergency self-heal be a universal action, a utility choice, a
   class mechanic, map interaction, or some controlled mix?
3. Which resource should healing compete with for each class?
4. Can a sustain choice create clutch arena decisions without rewarding hiding
   and passive reset loops?
5. How much healing is allowed inside the 20-30 second duel target before burst,
   movement and pressure lose meaning?
6. What HUD footprint is justified for the final system?

## Acceptance criteria

The final sustain system must:

- work for all four classes without a fake exception that makes one class ignore
  the system;
- create an interesting spend decision under pressure;
- be readable to the opponent when it changes duel tempo;
- avoid mandatory three-slot tax in every build unless the gameplay value is
  strong enough to justify it;
- preserve active movement and combat pacing;
- fit the class-aware Loadout Station and FPS HUD without clutter.

## Lanes compared

These are lanes to compare, not approved rules:

1. Universal emergency heal action with class-scaled resource cost.
2. Class sustain abilities only, balanced by slot pressure and tells.
3. Hybrid model: one universal low-output emergency option plus stronger
   class-specific sustain.
4. No transfer button at all; sustain comes from utility, spell schools and map
   tempo.

## Lane comparison

| Lane                              | Good                                                       | Bad                                                                                 | Abuse risk                                               | Fit for new HUD/loadout                                |
| --------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------ |
| Universal transfer action         | One rule for everyone; easy tutorial                       | Feels like a system tax; classes with deep Mana exploit it; duplicates heal utility | Mage/Ibrido can turn high regen into repeated HP         | Adds permanent resource-conversion UI again            |
| Class recovery only               | Sustain expresses class identity; no dead transfer buttons | Must guarantee every class has at least one sane option                             | Best class recovery could become mandatory if overloaded | Strong fit: utility and class indicator already exist  |
| Hybrid universal + class recovery | New players always have emergency button                   | Two sustain layers stack; hard to read TTK                                          | Universal heal plus class heal plus Dark/Nature sustain  | HUD and loadout carry too much sustain state           |
| Map/tempo only                    | Very arena-FPS; movement controls recovery                 | Duel/training maps need pickup logic and spawn rules first                          | Pickup control can snowball badly in class matchups      | Good later for FFA/5v5 maps, weak as only baseline now |

## Numerical pressure test

The duel target is still 20-30 seconds. A heal that averages roughly `2 HP/s`
over its cooldown already contributes about 40-60 HP of fight extension if it is
used on cadence. That is close to a quarter of the old 200 HP baseline and much
larger on a 150 HP Mago. The current Healing Potion and Barrier already sit near
that band.

Design implication:

- a universal emergency heal should be weaker than the current Healing Potion or
  it becomes a mandatory background button;
- a class recovery can reach the Potion/Barrier band only if the class pays a
  readable condition, resource cost, cast window or slot pressure;
- Dark/Nature sustain and recovery utilities must be counted together during
  balance. They cannot stack as if each subsystem owned a separate TTK budget.

## Chosen target model

Chosen model: **remove transfers from the target sustain system**.

Use this model instead:

1. Keep low out-of-combat reset recovery as a separate tuning knob so players do
   not spend a whole match hiding at 12 HP.
2. Put in-combat sustain in a `Recovery` utility family plus selected magic
   schools that pay their own ability budget.
3. Give every class at least one recovery option in its legal utility pool and
   include one recovery option in each first-session starter build.
4. Allow greedy builds to drop recovery for aggression/movement/control, but
   that loss must be visible in the Loadout Station.
5. Reserve map pickups for a later arena/map-economy study; do not depend on them
   as the first class baseline.

This removes the permanent three-transfer tax, avoids a Mana-to-HP loophole on
classes with deep Mana, and makes sustain a combat decision attached to class
identity and loadout pressure.

## Recovery grammar

These are the first target Recovery rows. Numbers are first-pass balance bands
for registry migration, not final live tuning:

| Class   | Recovery utility | Core action                                                                 | Class payoff                                                                                   |
| ------- | ---------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Tank    | Brace Recovery   | Spend Stamina, recover a small HP amount and gain a short readable guard HP | At 3+ Fury, consume 3 Fury for a stronger HP recovery while guard value stays modest           |
| Arciere | Hunter's Flow    | Recover only while moving and take a short lateral movement push            | At 60+ Momentum, spend Momentum for a larger moving recovery without adding invulnerability    |
| Mago    | Arcane Rebind    | Spend Mana with a visible short cast, then recover HP over a brief pulse    | If a Risonanza window is armed, consume it for stronger recovery instead of offensive sequence |
| Ibrido  | Adaptive Mend    | Fast low-peak self recovery                                                 | At 2+ Flow, consume 2 Flow for a stronger heal; still lower peak than specialist payoff        |

### First target Recovery specs

| Utility        | First-pass target spec                                                                                                                                              | Counterplay / why not free                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Brace Recovery | `25` Stamina, `22` HP over `1.0s`, `18` temporary guard HP for `2.0s`, `22s` CD. At 3+ Fury consume 3 Fury and raise heal to `36` HP.                               | Tank trades sword/parry/jump Stamina and Fury cashout. Guard is visible and short; the stronger version costs offensive class tempo.           |
| Hunter's Flow  | Requires movement input during its `1.5s` heal. Baseline `20` HP, lateral push about `2m`, `22s` CD. At 60+ Momentum consume 60 Momentum and raise heal to `34` HP. | Standing still wastes the heal window; the payoff spends the same Momentum that powers bow tempo. Movement push has no iframe and may collide. |
| Arcane Rebind  | `35` Mana, `0.45s` visible cast, then `28` HP over `1.2s`, `24s` CD. If Risonanza is armed, consume that window and raise heal to `40` HP.                          | Incoming pressure can punish the cast. Mana and Risonanza spent on survival are not available for spell sequencing or Advanced pressure.       |
| Adaptive Mend  | `24` HP over `0.8s`, `20s` CD. At 2+ Flow consume 2 Flow and raise heal to `32` HP.                                                                                 | Easy to use, lower ceiling. Consuming Flow delays the Hybrid's next boosted ability and 0-GCD payoff.                                          |

Recovery rule: specialist payoff should read on the class indicator at the
moment of cast. A player must know whether they spent Fury, Momentum, Risonanza
or Flow to survive.

## First budget target

Use this as the first comparison band before implementation:

- plain recovery without hard condition: about `20-30` HP/effective HP on
  `18-24s` cooldown;
- conditional class recovery: about `35-45` HP/effective HP only when the class
  condition is met and readable;
- recovery that also moves, cleanses, blinds, shields or resets cooldowns must
  give back raw heal value.

This is a target budget band, not a final registry number.

## Rejected target directions

- Do not keep three fixed transfer slots just because the runtime has them.
- Do not make one universal Mana -> HP button the answer; resource pools and
  live Mana regen make that too easy to skew by class.
- Do not give every class a no-slot heal and also healing utilities; that hides a
  large sustain layer outside build decisions.

## Implementation evaluation pass

For each lane, document:

- time-to-heal under pressure;
- input burden;
- counterplay tell;
- class that benefits most and least;
- abuse case in duel, FFA and 5v5;
- HUD/loadout cost;
- server validation and prediction implications.

The transfer decision is now closed. The ability rewrite still owns exact
registry implementation and tuning tests.
