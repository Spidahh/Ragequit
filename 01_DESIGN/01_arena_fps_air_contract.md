---
id: arena_fps_air_contract
title: Arena FPS Air Contract
section: combat
tags: [movement, air_combat, contract]
provides: [arena_movement_contract, air_action_policy, impulse_contract]
deps: [00_classes.md, 01_controls.md, 01_combat_fundamentals.md]
status: current
---

# Arena FPS Air Contract

RAGEQUIT is an active arena FPS. Air state is playable, readable and
server-authoritative.

## Locked Rules

- `airborne` is not hard CC.
- Fall damage is always `0`.
- Self-damage from own abilities is always `0`.
- Sword M1, Bow M1 and Staff M1 can act in air.
- Abilities can act in air unless their own definition requires ground,
  placement, or a specific channel state.
- Parry/protection can act in air when resources and state allow it.
- Knockup is launch/displacement/aim pressure, not a universal silence.
- Root, freeze, stun and explicit silence are hard-control states; airborne is
  not one of them.

## Movement Model

The server owns velocity, collision, impulse, caps and reconciliation. Client
prediction can only mirror allowed local movement and confirmed self-cast
events.

Movement must preserve arena readability:

- jump and fall keep aim active;
- external impulse and self impulse are explicit velocity events;
- wall/ceiling collision cannot tunnel or stick;
- movement abilities and impulses use the same server-owned validation lane.

## Self Impulse

Own ability damage stays zero. Self impulse is separate:

- only abilities that define self impulse can apply it;
- direction, magnitude and caps are authored by the server;
- impulse has visible tell and ability budget cost;
- not every projectile or ground cast becomes a free escape.

## Knockup

Knockup applies launch and optional horizontal impulse. It does not
automatically remove every legal answer from the victim.

A spell that stuns then launches must say both effects and pay both budgets.

## Reject

- Do not reject all attacks because the player is airborne.
- Do not describe airborne as helpless.
- Do not tune M1, ability or recovery rules around a silent blanket air lock.
