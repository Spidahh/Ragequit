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
> They are not. They describe how it should PLAY. And the previous version of
> this document said the opposite of every one of them:
>
> - _"Build-crafting IS the gameplay"_ — Quake 3 has no build. Darkfall has no
>   loadout screen. Mordhau's identity is the weapon in your hands.
> - _"Class identity plus build diversity"_ — none of the references has classes.
> - _"Long TTK (20-30s) ... resource management"_ — Quake 3 kills in 1-3 seconds.
>
> The code obeyed this document, faithfully: 4 classes, 53 cooldown abilities, a
> Loadout Forge you had to fill in before you were allowed to fight, mana bars and
> a global cooldown. Every polish pass since has been improving the wrong game,
> which is exactly why none of them moved the needle.

## What RAGEQUIT is

A fast first-person arena fighter for the browser. Dark, gritty, medieval-fantasy.
You move, you aim, you swing and you cast — with your own hands, in real time,
against another person.

Movement and aim ARE the game. Everything else serves them.

## What makes it different

1. **The weapon in your hands is your identity.** Not a class, not a build. What
   you can do right now is determined by what you are holding and where you are
   standing — readable to you and to your opponent, instantly, without a menu.
2. **Movement is the skill ceiling.** Acceleration, friction, air control and
   momentum are real and learnable. A better player out-moves you before they
   out-aim you. (See `packages/shared/src/sim/controller.ts` — velocity
   accumulates; it is not assigned.)
3. **Free aim, no lock-on.** You hit what you point at and you miss what you do
   not. No target lock, no auto-aim, no dice.
4. **Short, decisive fights.** Seconds, not half a minute. A duel is a handful of
   committed decisions, and a mistake costs you the round.
5. **The arena is a participant.** Verticality, sightlines, cover, pickups. Map
   knowledge is power, the way it is in Quake.
6. **Server-authoritative, zero-trust.** The simulation lives on the server. The
   client predicts; the server decides. No client trust, no RNG in outcomes.
7. **No paywalls.** Nothing bought, nothing gated behind grind.

## Game Feel

- **Weight.** Starting, stopping and turning take time and distance. You feel the
  body you are driving.
- **Commitment.** An attack is a decision with a wind-up you can be punished for
  and a recovery your opponent can read.
- **Readable.** You can tell what your opponent is about to do, from their
  animation and from the world, before it lands.
- **Fast.** Press play, be fighting within seconds. No configuration screen
  between a player and the game.

## What this costs — the honest list

Adopting the references means the following stop being the game. They are not
deleted from the repository blindly; they are demoted from "the point of the
game" to "systems that exist", and cut where they fight the pillars above:

- **Build-crafting as the core loop.** The Loadout Forge is no longer a gate in
  front of playing (`main.ts launchModeOrForge`). Whether it survives at all is
  an open decision.
- **53 cooldown abilities.** A weapon-identity game needs a small number of
  deeply distinct actions, not a spreadsheet where most entries are a stat line.
- **Long TTK and resource management.** Mana pools and a 20-30 s duel belong to
  the design this document used to describe.
- **Class mechanics** (Fury / Momentum / Risonanza / Flow) — they exist and are
  now visible in the HUD, but they are a class-game idea in a weapon game.

None of the above is a small change, and none of it should be done in one pass.
The order that respects the pillars: movement first (done), then the weapon in
frame and what it can do, then the arena, then subtract everything that is still
asking the player to read instead of fight.
