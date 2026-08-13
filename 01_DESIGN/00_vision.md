---
id: vision
title: Vision & Pitch
section: core
tags: [philosophy, pitch, high-level]
provides: [game_pitch, game_feel, differentiators]
deps: []
status: final
---

# Vision & Pitch

> **This document was rewritten on 2026-08-13, and the rewrite is the point.**
>
> The owner's reference games have been recorded since the start — Mordhau,
> Chivalry, Dark Messiah, Vermintide, Hexen, Heretic, Amid Evil, Witchfire,
> Lunacid, Savage Resurrection, and now explicitly **Quake 3, Darkfall and
> Mistfall Hunter**. They were filed under "§4 Direzione artistica" in
> PROGETTO.md, and treated as a description of how the game should LOOK.
>
> They are not. They describe how it should PLAY, and that distinction had never
> been drawn — so every polish pass improved the wrong things, well.
>
> **CORRECTED on 2026-08-13 by the owner, directly.** A first pass at this rewrite
> concluded that build-crafting should be demoted. That was wrong, and he said so:
> the game IS choosing a build out of many combinations of class, abilities and
> specialisations, and then taking it into an arena.
>
> Classes and build-crafting stay, and may be redesigned to work better. What
> comes from the references is everything around them — and he was specific about
> which part each one contributes: Quake 3 gives movement and speed, Darkfall
> gives launch-into-the-air magic and free aim, Mistfall Hunter gives how spells
> and classes are used and presented.
>
> What the old document got wrong was not the build system. It was "Long TTK
> (20-30s), resource management", which fights every reference on the list.

## What RAGEQUIT is

A fast first-person arena fighter for the browser. Dark, gritty, medieval-fantasy.

You build a fighter — class, abilities, specialisations — and take it into an arena
against other people: solo, in squads, or in a tournament where one is left standing.

The build decides what you bring. Movement and aim decide what you do with it.

## What makes it different

1. **The build is the identity, the arena is the test.** Class, abilities and
   specialisations combine into a fighter that is yours; the fight is then decided
   by movement, aim and reads, never by the sheet. Two players on the same build
   are separated entirely by how they play it.
2. **Movement is the skill ceiling.** Acceleration, friction, air control and
   momentum are real and learnable. A better player out-moves you before they
   out-aim you. (See `packages/shared/src/sim/controller.ts` — velocity
   accumulates; it is not assigned.)
3. **Free aim, no lock-on.** You hit what you point at and you miss what you do
   not. No target lock, no auto-aim, no dice.
4. **Short, decisive fights.** Quake's band, not an MMO's. A duel is a handful of
   committed decisions and a mistake costs you the round. The old rule — "Long TTK
   (20-30s), resource management" — is the clearest case of an inherited line that
   fought the references, and it is gone.
5. **Launch, then punish.** Darkfall's moment, which this game already half has: a
   spell knocks the target into the air like a Quake rocket, and if you are good you
   hit them up there with an instant cast. The victim keeps answers — it must never
   become a stun-lock.
6. **The arena is a participant.** Verticality, sightlines, cover. Map knowledge is
   power, the way it is in Quake.
7. **Server-authoritative, zero-trust.** The simulation lives on the server. The
   client predicts; the server decides. No client trust, no RNG in outcomes.
8. **No paywalls.** Nothing bought, nothing gated behind grind.

## Game Feel

- **Weight.** Starting, stopping and turning take time and distance. You feel the
  body you are driving.
- **Commitment.** An attack is a decision with a wind-up you can be punished for
  and a recovery your opponent can read.
- **Readable.** You can tell what your opponent is about to do, from their
  animation and from the world, before it lands.
- **Fast.** Press play, be fighting within seconds. No configuration screen
  between a player and the game.

## What has to change, and what does not

**Stays, and is the point:** classes, abilities, specialisations, the build assembled
before the arena, and the three modes — solo, squads, tournament-until-one-remains.

**Changes, because it fights the references:**

- **TTK.** "20-30 s of resource management" is an MMO duel. The references kill fast.
  This number drives everything else.
- **How a spell is cast and READ.** The owner's central ask, in his words: a simple
  but effective system that makes you understand visually where the spell will go and
  what it will do. Today 53 abilities largely announce themselves the same way. This
  is the main design work.
- **How many abilities are live at once.** A deep build space does not require a wide
  hotbar. What lives on the weapon versus in the build has to be decided.
- **The airborne rules.** Knockups exist and all nine share an identical airtime, so a
  launch reads as one move rather than a family. Launch height, hang time and what the
  victim can still do are what make the Darkfall moment work.

**Already done:** movement accumulates velocity (Quake PM_Accelerate / PM_Friction)
instead of being assigned — 133 ms to full speed, 0.81 m of stopping distance, 183 ms
to reverse. Pressing a mode starts a fight; the Forge is where you build, not a toll
gate in front of the game.
