---
id: combat_fundamentals
title: Combat Fundamentals
section: combat
tags: [ttk, gcd, parry, knockup, respawn]
provides: [ttk_window, gcd, parry_rules, knockup_rules, respawn_rules]
deps: [01_stats.md]
status: current
---

# Combat Fundamentals

## TTK (time to kill)

**Real window: 20-30 seconds** full-HP duel between two skill-matched players
who are actively defending through aim, movement, aerial responses, parry/shield
windows, ability choices and sustain.

This is the _effective_ TTK in real play — not the theoretical minimum. An
inactive target can be killed faster (Sword M1 at 17.5 DPS = ~11s theoretical
minimum), but any competent player parries, evades, and heals. The 20-30s window
emerges from the friction of defense, not from low damage numbers.

Long TTK is deliberate — it:

- Rewards positioning and resource management over burst-and-pray
- Gives class mechanics, resources and sustain room to matter
- Gives parry/shield and movement responses room to affect the fight
- Lets combo execution (knockup → follow-up) be impactful without being instant-kill

## Global Cooldown (GCD)

**0.3s between ability casts.** This floor prevents macro-chain spam.

GCD rules:

- **M1 basic attacks**: NOT bound by GCD
- **Recovery utility and magic sustain casts**: share the ability GCD
- **Combat ability slots** (Melee, Bow, Magic): ALL trigger and share the 0.3 s GCD

Ability casts from direct binds and primed wheel fire go through the server ability path.

## Parry (M2)

- **Tap M2** → 0.5s perfect block window. Blocks 100% of incoming damage during the window. Cost: 20 stamina. CD: 3s.
- **Hold M2** → continuous block while stamina holds out (drains ~15 stamina/s while active). Reduces incoming damage by 70% (not 100%). No CD on release but you can't parry-tap if stamina is exhausted.
- **No perfect-timing bonus**. Parry is binary (blocked or not) — no riposte window, no stamina refund on "perfect" timing. Keeps parry readable and avoids skill gap extremes.
- **Efficiency**: Tap costs 20 stamina for a 0.5 s window. Hold costs 15/s, meaning after 1.33 s it becomes more expensive than a tap. Use tap for reactive blocks against a single known hit; use hold only when you need to absorb a sustained burst and can afford the bleed. The design intentionally favors tap parry to reward read-and-react over holding block.

Parry/shield must show a readable visible protection state. Airborne state alone
does not remove defensive answers.

## Knockup (signature mechanic)

Abilities tagged `[KNOCKUP]` create air pressure and aim challenges. The
launched player keeps meaningful arena-FPS answers through allowed weapons,
abilities, movement tech or disruption. The contract in
`01_arena_fps_air_contract.md` treats knockup as displacement/aim pressure
rather than a universal airborne silence.

## Knockup combo feedback (UI spec)

The knockup mechanic is RAGEQUIT's signature. The UI must make it legible and satisfying every time it succeeds.

### During the airborne window

- The launched target gets world/camera/velocity feedback for displacement
  without a blanket slot-strip shutdown; any actual disabled action must come
  from a specific status or ability rule.
- The attacker sees a **brief arc indicator** above the target (a small rising arc VFX, 0.2s) to signal airborne state and telegraph the follow-up window.
- A subtle **AIR tag** appears near the target's health bar on the attacker's HUD for the duration of the window. Small, not intrusive — confirms state without cluttering aim.

### On successful conversion (follow-up hits during airborne)

When the attacker lands at least one ability hit during the knockup window:

- **Impact confirmation**: the landing hit triggers a slightly more exaggerated impact flash (same red `#FF3344`, slightly brighter for 1 frame) — no new panel, just hit-confirm intensity.
- **Combo audio cue**: a short distinct sound marker on follow-up hit during air state (different from a ground hit). Not a VO, just a distinguishable impact tick.

### End-of-match stat tracking

Track per player per match:

- `knockup_attempts`: times a KNOCKUP ability hit a grounded target
- `knockup_conversions`: times the attacker landed ≥1 ability during the subsequent airborne window
- `conversion_rate`: conversions / attempts (displayed as % on end screen)

These stats are **end-screen only** — no mid-match counter or running combo pop-up. The feedback loop is: play → feel the window → see how often you converted → improve.

## Vision Control

`Blind` is a short debuff that heavily narrows the victim's screen vision without changing movement speed. It is used by dark/smoke tools as a setup or escape mechanic. Blind is intentionally short: it should force panic/positioning mistakes, not delete the opponent's ability to play.

### Counter-play

- Knockup abilities have cooldowns long enough that spamming is not viable
- A second knockup while already airborne does NOT extend the airtime — anti-chain protection, not a hard-CC immunity window. The target still retains skill-based arena responses (aim, movement abilities, disruption) per `01_arena_fps_air_contract.md`.
- Positioning away from predictable knockup angles defeats the setup
- Parry (M2) during the knockup windup blocks the launch entirely

## Respawn

| Mode            | Respawn time      | Spawn invulnerability |
| --------------- | ----------------- | --------------------- |
| Team Battle 5v5 | 5 s               | 2 s                   |
| FFA 10          | 3 s               | 2 s                   |
| 1v1 Ranked      | N/A (round-based) | 2 s at round start    |
| Training        | 0 s               | 2 s                   |

See `07_modes.md` for mode details.

## Damage types

All damage is **physical** or **elemental**. There is no armor/resist attribute
system. Each element has a distinct effect (burn, slow, chain, lifesteal, DoT)
on top of base damage; no element is strong or weak against another. See
`00_vision.md`.
