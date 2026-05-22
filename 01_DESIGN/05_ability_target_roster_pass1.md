---
id: ability_target_roster_pass1
title: Ability Target Roster Pass 1
section: abilities
tags: [abilities, roster, classes, magic_base, magic_advanced]
provides: [ability_target_inventory, magic_split_pass1, utility_target_pass1]
deps:
  [
    00_classes.md,
    01_arena_fps_reference_study.md,
    04_resource_sustain_study.md,
    05_ability_redesign_plan.md,
  ]
status: target-pass
---

# Ability Target Roster Pass 1

This pass gives the current registry a target map before code changes. It is not
the final tuning table. Exact damage, costs, cast timing, descriptions and
visual archetypes are written after these target lanes are accepted by the
runtime rewrite. Class starter builds now live in `06_loadout_build.md`.

## Rules used

- Tank slots only Melee, Bow and Utility.
- Arciere slots Bow, Magic Base and Utility.
- Mago slots Magic Base, Magic Advanced and Utility.
- Ibrido can slot Melee, Bow, Magic Base, Magic Advanced and Utility.
- Fixed transfers are deleted from the target roster.
- `Recovery` is a Utility family, not a fixed resource-conversion strip.
- `airborne` is not hard CC. Rows with launch, movement or recovery must follow
  the explicit air/impulse contract.
- Bleed cleanse wording cannot depend on transmutation after transfers leave the
  target roster; bleed counterplay must move to explicit cleanse rules.

## Current Melee inventory -> target lane

| Current ability | Target family           | Legal classes | Pass 1 decision | Note                                                                 |
| --------------- | ----------------------- | ------------- | --------------- | -------------------------------------------------------------------- |
| Whirlwind Slash | Melee pressure          | Tank, Ibrido  | Retune          | Multi-target melee pressure; keep commitment tell.                   |
| Gap Closer      | Melee engage            | Tank, Ibrido  | Keep/retune     | Engage must use movement/impulse path instead of bespoke drift.      |
| Uppercut        | Melee starter           | Tank, Ibrido  | Keep/retune     | Launch remains important; remove old helpless-air implication.       |
| Bleed Strike    | Melee pressure          | Tank, Ibrido  | Retune          | Keep bleed lane only with explicit non-transfer cleanse counterplay. |
| Guard Break     | Melee counter/setup     | Tank, Ibrido  | Retune          | Stun plus pop must pay for hard CC and launch separately.            |
| Rending Dash    | Melee mobility pressure | Tank, Ibrido  | Retune          | Dash/slash survives if Sword M1 no longer dominates its job.         |

## Current Bow inventory -> target lane

| Current ability | Target family           | Legal classes         | Pass 1 decision | Note                                                                   |
| --------------- | ----------------------- | --------------------- | --------------- | ---------------------------------------------------------------------- |
| Piercing Shot   | Bow cashout             | Tank, Arciere, Ibrido | Keep            | Precision physical cashout.                                            |
| Volley          | Bow zone/cashout        | Tank, Arciere, Ibrido | Keep/retune     | Preview and telegraph remain essential.                                |
| Pin Shot        | Bow setup               | Tank, Arciere, Ibrido | Retune          | Root/launch choice must match final bow combo grammar.                 |
| Snare Trap      | Bow deny                | Tank, Arciere, Ibrido | Keep/retune     | Visible trap lane fits archer space control.                           |
| Marksman Shot   | Bow high-commit cashout | Tank, Arciere, Ibrido | Keep            | Long windup earns precision payoff.                                    |
| Disengage Shot  | Bow movement/counter    | Tank, Arciere, Ibrido | Keep/retune     | Backward impulse must follow movement authority.                       |
| Broadhead       | Bow pressure            | Tank, Arciere, Ibrido | Retune          | Bleed counterplay cannot cite transfers.                               |
| Blast Arrow     | Bow elemental splash    | Arciere, Ibrido       | Retune          | Elemental bow splash stays outside the Tank physical starter identity. |

## Magic Base pass

Magic Base is direct, frequent and readable enough for Arciere as well as Mago
and Ibrido.

| Current ability | Element   | Target lane                   | Legal classes         | Pass 1 decision | Note                                                      |
| --------------- | --------- | ----------------------------- | --------------------- | --------------- | --------------------------------------------------------- |
| Fireball        | Fire      | Magic Base projectile         | Arciere, Mago, Ibrido | Keep/retune     | Splash/self-impulse is explicit, not automatic.           |
| Ignite          | Fire      | Magic Base short ray          | Arciere, Mago, Ibrido | Keep            | Pressure without screen-filling VFX.                      |
| Fire Blink      | Fire      | Magic Base movement           | Arciere, Mago, Ibrido | Retune          | Teleport remains explicit movement, not impulse.          |
| Frost Bolt      | Ice       | Magic Base projectile         | Arciere, Mago, Ibrido | Keep            | Simple Chill pressure.                                    |
| Chain Bolt      | Lightning | Magic Base ray                | Arciere, Mago, Ibrido | Keep/retune     | Secondary chain cost counted for FFA/team.                |
| Thunder Clap    | Lightning | Magic Base close counter      | Arciere, Mago, Ibrido | Retune          | Hard CC budget and point-blank counter role need review.  |
| Lightning Dash  | Lightning | Magic Base movement           | Arciere, Mago, Ibrido | Retune          | Movement legal; exit damage cannot be free escape damage. |
| Shadow Bolt     | Dark      | Magic Base projectile sustain | Arciere, Mago, Ibrido | Keep/retune     | Lifesteal belongs to magic sustain budget.                |
| Dark Barrier    | Dark      | Magic Base protection         | Arciere, Mago, Ibrido | Keep/retune     | A magic shield is not a Recovery heal.                    |
| Poison Dart     | Nature    | Magic Base projectile         | Arciere, Mago, Ibrido | Keep            | DoT pressure, low direct burst.                           |
| Entangle        | Nature    | Magic Base setup ray          | Arciere, Mago, Ibrido | Retune          | Root tell must stay readable.                             |
| Vine Dash       | Nature    | Magic Base movement/deny      | Arciere, Mago, Ibrido | Retune          | Movement plus landing root zone pays both budgets.        |

## Magic Advanced pass

Magic Advanced carries larger commitment, higher space leverage, launch payoff,
hard control or stronger sustain.

| Current ability   | Element   | Target lane                | Legal classes | Pass 1 decision | Note                                                   |
| ----------------- | --------- | -------------------------- | ------------- | --------------- | ------------------------------------------------------ |
| Flame Wall        | Fire      | Advanced wall              | Mago, Ibrido  | Keep            | Large readable denial shape.                           |
| Meteor            | Fire      | Advanced cashout           | Mago, Ibrido  | Keep            | High commitment visible punish.                        |
| Eruption          | Fire      | Advanced launch            | Mago, Ibrido  | Retune          | Launch follows knockup contract.                       |
| Ice Wall          | Ice       | Advanced wall              | Mago, Ibrido  | Retune          | Repeated root must not become lane-sized hard lock.    |
| Blizzard          | Ice       | Advanced field             | Mago, Ibrido  | Keep/retune     | Large space control.                                   |
| Freeze Target     | Ice       | Advanced hard setup        | Mago, Ibrido  | Retune          | Freeze is explicit hard CC with real tell/counterplay. |
| Frost Pillar      | Ice       | Advanced launch            | Mago, Ibrido  | Retune          | Windup launch fits advanced commitment.                |
| Storm Field       | Lightning | Advanced field             | Mago, Ibrido  | Keep/retune     | Repeated field pressure.                               |
| Arc Lift          | Lightning | Advanced launch            | Mago, Ibrido  | Retune          | High-readability air setup.                            |
| Curse of Weakness | Dark      | Advanced blind/setup       | Mago, Ibrido  | Retune          | Blind plus resource drain cannot be tooltip clutter.   |
| Life Drain        | Dark      | Advanced offensive sustain | Mago, Ibrido  | Keep/retune     | Contact sustain only while channel risk stays real.    |
| Void Spike        | Dark      | Advanced launch/drain      | Mago, Ibrido  | Retune          | Two effects must earn their cost.                      |
| Thorn Field       | Nature    | Advanced field             | Mago, Ibrido  | Keep/retune     | Area denial.                                           |
| Healing Totem     | Nature    | Advanced magic sustain     | Mago, Ibrido  | Retune          | Counts against Recovery budget; no free stacking.      |
| Root Upthrow      | Nature    | Advanced grounded launch   | Mago, Ibrido  | Retune          | Grounded-target clause is explicit counterplay.        |

## Utility target pass

| Current ability | Target family         | Legal classes | Pass 1 decision | Note                                                                               |
| --------------- | --------------------- | ------------- | --------------- | ---------------------------------------------------------------------------------- |
| Healing Potion  | Recovery seed         | All           | Replace         | Current generic heal becomes four class Recovery rows, not one flat potion answer. |
| Quick Dash      | Utility movement      | All           | Keep/retune     | No iframe. Air behavior must be explicit.                                          |
| Mark Target     | Utility pressure/info | All           | Retune          | Keep readable in duel as Stamina pressure; team reveal polish stays later.         |
| Cleanse Surge   | Utility counter       | All           | Keep/retune     | Primary answer for debuff/bleed cleanse after transfers leave.                     |
| Barrier         | Utility protection    | All           | Keep/retune     | Shield family, not raw healing.                                                    |
| Energize        | Utility resource      | All           | Retune          | Legal for all; exact Stamina restore/CD must not erase physical-resource tension.  |
| Phase Shift     | Utility counter       | All           | Keep/retune     | Invulnerability cannot become attack tech.                                         |
| Smoke Screen    | Utility deny          | All           | Retune          | Legal for all; blind readability and line-of-sight value must carry the cost.      |
| HP -> Mana      | Deleted transfer      | None          | Delete          | Fixed transfer target rejected.                                                    |
| Mana -> Stamina | Deleted transfer      | None          | Delete          | Fixed transfer target rejected.                                                    |
| Stamina -> HP   | Deleted transfer      | None          | Delete          | Fixed transfer target rejected.                                                    |

## Required new Recovery rows

The roster rewrite adds these explicit target Recovery entries before starter
builds are implemented:

| Recovery row   | Class   | Utility family | First target job                                                           |
| -------------- | ------- | -------------- | -------------------------------------------------------------------------- |
| Brace Recovery | Tank    | Recovery       | Spend Stamina; gain modest guard plus heal; spend 3 Fury for stronger heal |
| Hunter's Flow  | Arciere | Recovery       | Heal while moving with lateral push; spend Momentum for stronger heal      |
| Arcane Rebind  | Mago    | Recovery       | Mana-cast heal with tell; spend armed Risonanza window for stronger heal   |
| Adaptive Mend  | Ibrido  | Recovery       | Lower-peak fast heal; spend Flow for stronger flexible survival            |

These rows replace the fixed-transfer expectation in Utility. They do not make
all final player builds mandatory-heal builds.

## Next pass

1. Rewrite all target tooltip sentences without legacy Mastery/transfer text.
2. Derive registry/schema/tests migration order from the starter builds in
   `06_loadout_build.md`.
3. Only then migrate registry/schema/tests.
