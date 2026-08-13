---
id: specializations
title: Specialisations — the third axis of a build
section: systems
tags: [build, specialisation, passives, identity]
provides: [specialization_rules, specialization_roster]
deps: [06_loadout_build.md, 00_vision.md]
status: live
---

# Specialisations

> **The owner's definition of the game, in his words:** you pick a build out of
> many combinations of **class, abilities and specialisations**, and then you go
> into an arena and fight. Two of those three shipped years ago. This is the
> third, added 2026-08-13 (D17, `00_truth.md`).

## The rule

A build is `class + abilities + ONE specialisation`. The specialisation is:

- **picked**, in the Forge, next to the class cards — never derived from anything;
- **legal for exactly one class**, validated server-side like every other part of
  the build, and rejected with a reason rather than silently dropped;
- **one bonus and one cost**, both on the card face;
- optional. "Nessuna" is a real build and is always offered.

## Why not inferred — the system this replaces

There was a Mastery system once (`03_mastery_system.md`, `constants/mastery.ts`,
deleted in `6a7839a`). It activated when 4 of your 5 magic slots shared an
element and granted an element bonus.

It died because it was **inferred, not chosen**. A player never picked Mastery;
they discovered they had one, or discovered they had lost it by taking the spell
they wanted. It did not express a decision — it taxed you for mixing elements.

That is the whole reason the rule above starts with "picked".

## Why no specialisation touches damage

The TTK band is 6–9 s and the four classes measure 6.3–7.9 s
(`packages/shared/src/config/ttk.ts`, enforced by a test). A +15 % damage
specialisation would push the archer straight out of the bottom of the band and
quietly undo D1 — and it would slip past the band test, because that test runs
against the base registry.

So the modifier set is deliberately: **knockup airtime, cooldowns, move speed,
max HP**. None of them change how long a fight lasts; all of them change how it
is fought. That constraint made the system better, not smaller — "your launches
hang 25 % longer" is a more interesting build decision than "+15 % damage", and
it points at the game's own signature moment.

## The roster

Four archetypes, three offered per class. The archetypes repeat across classes
on purpose: what differs is the class underneath. Bulwark on a tank and Bulwark
on a mage are different builds because a tank and a mage are different, and
inventing twelve unrelated mechanics would make the choice unlearnable rather
than deep.

| Archetype    | Gives                 | Costs            |
| ------------ | --------------------- | ---------------- |
| **Impatto**  | knockup airtime ×1.25 | max HP ×0.92     |
| **Baluardo** | max HP ×1.12          | move speed ×0.94 |
| **Cadenza**  | cooldowns ×0.85       | max HP ×0.90     |
| **Slancio**  | move speed ×1.08      | max HP ×0.90     |

Authoritative source: `packages/shared/src/constants/specializations.ts`. The
Forge builds its cards from that registry, so adding one is a data change.

## Where it applies

| Modifier             | Applied in                                                                                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maxHpMult`          | `maxHpForBuild()` — the single source for spawn, respawn, loadout commit, lifesteal and heal clamps                                                                   |
| `cooldownMult`       | `GameRoom.getAbilityCooldownMult`, composed with Momentum                                                                                                             |
| `knockupAirtimeMult` | `AbilityEngine.effectKnockup`, read from the **caster** — "your launches hang longer" is a property of who cast, not who was hit. Still clamped by `MAX_AIRBORNE_SEC` |
| `moveSpeedMult`      | `slowFractionWithSpecialization()`, run identically on the server for authority and on the client for prediction                                                      |

That last row is load-bearing: a speed modifier the client does not predict is a
permanent rubber-band, so the fold-in is one shared function rather than two
copies waiting for one of them to be edited.

## Verification

`tools/verify/spec.mjs` opens the Forge, reads the cards, clicks one, starts a
match, and compares the HP **the server gave** against `maxHpForBuild`. A
specialisation that only exists in a registry is not a feature; the harness
exists to prove the pick crosses the wire, not merely that it can be clicked.
