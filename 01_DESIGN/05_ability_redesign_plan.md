---
id: ability_redesign_plan
title: Ability Redesign Plan
section: abilities
tags: [abilities, classes, magic_base, magic_advanced, plan]
provides: [ability_redesign_sequence, ability_acceptance_matrix]
deps: [00_classes.md, 01_arena_fps_reference_study.md, 04_resource_sustain_study.md]
status: plan
---

# Ability Redesign Plan

## Goal

Rebuild the ability layer around the confirmed game instead of polishing the old
classless catalog.

The final roster must support:

- Tank, Arciere, Mago and Ibrido slot grammar;
- Magic Base and Magic Advanced;
- active arena-FPS movement and air answers;
- recovery/counter/mobility coverage without fixed-transfer tax;
- player-facing descriptions that explain play, not internal design notes.

## Current runtime facts

The runtime has a useful data-driven base:

- 6 melee definitions;
- 8 bow definitions;
- 27 magic definitions;
- 11 utility definitions, including old fixed transfer abilities.

These counts are inventory, not the target class roster.

## Redesign order

1. Carry the closed sustain/Recovery decision into utility rows.
2. Carry the closed movement/air contract into weapon, ability and impulse rows.
3. Freeze remaining class slot/proximity questions that change roster legality.
4. Audit every runtime ability against the new matrix.
5. Decide for each ability: keep, retune, reclassify, merge, replace or delete.
6. Rewrite descriptions and mini-malus text after mechanics are stable.
7. Update registry/schema/tests only after target rows are approved.

## Ability audit matrix

Every ability row needs these decisions:

| Field            | Question                                                                     |
| ---------------- | ---------------------------------------------------------------------------- |
| Class legality   | Which classes can slot it?                                                   |
| Slot family      | Melee, Bow, Magic Base, Magic Advanced, Utility/Recovery?                    |
| Weapon relation  | Requires sword/bow/staff/none, or is weapon-agnostic?                        |
| Arena role       | Setup, pressure, burst, movement, counter, recovery, zone, deny?             |
| Air behavior     | Castable in air? Useful against air? Creates self/enemy impulse?             |
| Counterplay      | Aim dodge, line of sight, cast tell, resource cost, parry/shield, interrupt? |
| Visual archetype | Bolt, shard, orb, beam, wall, field, dash, trap, shield, recovery?           |
| Text             | Can the tooltip explain it in one player-facing sentence?                    |

## Minimum kit coverage by class

No class pool is accepted until its legal roster can build:

| Coverage                 | Tank | Arciere | Mago | Ibrido |
| ------------------------ | ---- | ------- | ---- | ------ |
| Reliable pressure        | yes  | yes     | yes  | yes    |
| Engage/disengage         | yes  | yes     | yes  | yes    |
| Air answer               | yes  | yes     | yes  | yes    |
| Recovery option          | yes  | yes     | yes  | yes    |
| Defensive/counter option | yes  | yes     | yes  | yes    |
| Skill-shot cashout       | yes  | yes     | yes  | yes    |

Coverage does not mean every build has every answer. It means each class pool
offers choices that can produce a sane build.

## Magic split rule

Use this starting split:

- **Magic Base**: direct, readable, lower cognitive load, frequent cast lane,
  useful for pressure or simple setup.
- **Magic Advanced**: higher commitment or higher ceiling, larger zone,
  sequence/combo payoff, stronger displacement/counter/recovery, or spell that
  materially changes space.

Magic Advanced should not mean "always more damage." It means more commitment,
more leverage or more build weight.

## M1 relationship rule

Ability redesign must keep M1 in the correct place:

- basic attacks create baseline pressure and combo connective tissue;
- abilities create the interesting setup, denial, movement, recovery and cashout;
- a player who only spams M1 should lose to an equally skilled player using the
  class kit well.

Sword M1 needs explicit landed-hit chain rules before melee ability tuning is
trusted.

## Utility / recovery rule

The sustain decision is closed:

- delete fixed transfers from the target roster;
- make `Recovery` a class-legal utility family;
- count Recovery utility, class condition and Dark/Nature magic sustain inside
  the same TTK budget;
- expose a missing Recovery choice in starter-build/loadout guidance without
  forcing every final player build to carry one.

## Description rule

Player-facing text should state:

1. what happens;
2. relevant state applied;
3. cost/cooldown surface when needed;
4. real tradeoff.

Do not put:

- "design target" commentary inside runtime tooltip text;
- comparison notes to other abilities;
- internal combo-role essays;
- obsolete Mastery/fixed-transfer explanation in the player sentence.

## Output artifacts

The next ability pass must produce:

1. class legality table for the target roster;
2. Magic Base / Advanced classification table;
3. utility/recovery classification from the closed sustain decision;
4. keep/retune/replace/delete decision per current runtime ability;
5. starter build per class;
6. registry migration order and tests to rewrite.
