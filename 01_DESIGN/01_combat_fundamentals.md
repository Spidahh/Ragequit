---
id: combat_fundamentals
title: Combat Fundamentals
section: combat
tags: [ttk, gcd, parry, knockup, respawn]
provides: [ttk_window, gcd, parry_rules, knockup_rules, respawn_rules]
deps: [01_stats.md]
status: final
---

# Combat Fundamentals

## TTK (time to kill)

**Target window: 20-30 seconds** full-HP duel between two skill-matched players. All damage, cooldown, and cost values across every ability and M1 are tuned against this window during the calibration pass.

Long TTK is deliberate — it:

- Rewards positioning and resource management over burst-and-pray
- Makes Element Mastery bonuses meaningful over a fight
- Gives parry and transmutation room to affect the fight
- Lets combo execution (knockup → follow-up) be impactful without being instant-kill

## Global Cooldown (GCD)

**0.3s between ability casts.** This floor prevents macro-chain spam. M1 basic attacks are not bound by the GCD. Ability casts from direct binds, primed wheel fire, and utility transfer abilities go through the server ability path.

## Parry (M2)

- **Tap M2** → 0.5s perfect block window. Blocks 100% of incoming damage during the window. Cost: 20 stamina. CD: 3s.
- **Hold M2** → continuous block while stamina holds out (drains ~15 stamina/s while active). Reduces incoming damage by 70% (not 100%). No CD on release but you can't parry-tap if stamina is exhausted.
- **No perfect-timing bonus**. Parry is binary (blocked or not) — no riposte window, no stamina refund on "perfect" timing. Keeps parry readable and avoids skill gap extremes.

Parry works against melee, projectile, and parryable direct ability damage. It does NOT counter abilities tagged [KNOCKUP] during the airborne period — you can parry the initial hit but not the follow-up while airborne.

## Knockup (signature mechanic)

Abilities tagged `[KNOCKUP]` send the target airborne for **0.6-1.0s** (ability-specific). Some knockups also apply a short horizontal shove so the victim is popped up and away, creating a readable aim challenge instead of a static stun. During the airborne period, the target:

- Cannot move horizontally (trajectory is locked by the knockup force)
- Cannot activate abilities (all 7 slots grayed out)
- Cannot parry
- Can still be hit by all follow-up damage (from the attacker or teammates)

This creates the **knockup → follow-up combo window** that is RAGEQUIT's signature. Skilled players queue an instant spell, projectile, bow shot, or precise M1 follow-up to land during airborne frames.

## Vision Control

`Blind` is a short debuff that heavily narrows the victim's screen vision without changing movement speed. It is used by dark/smoke tools as a setup or escape mechanic. Blind is intentionally short: it should force panic/positioning mistakes, not delete the opponent's ability to play.

### Counter-play

- Knockup abilities have cooldowns long enough that spamming is not viable
- A second knockup during airborne does NOT extend the airtime (knockup-immunity for 2s after landing)
- Positioning away from predictable knockup angles defeats the setup

## Respawn

| Mode            | Respawn time      | Spawn invulnerability |
| --------------- | ----------------- | --------------------- |
| Team Battle 5v5 | 5 s               | 2 s                   |
| FFA 10          | 3 s               | 2 s                   |
| 1v1 Ranked      | N/A (round-based) | 2 s at round start    |
| Training        | 0 s               | 2 s                   |

See `07_modes.md` for mode details.

## Damage types

All damage is **physical** or **elemental**. There is no armor/resist attribute system. Element Mastery adds an _effect_ (burn, slow, chain, lifesteal, DoT) on top of base damage — it does not multiply damage against some enemies and reduce against others. See `03_mastery_system.md`.
