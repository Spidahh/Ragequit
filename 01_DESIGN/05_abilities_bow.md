---
id: abilities_bow
title: Bow Abilities
section: abilities
tags: [bow, ranged, list]
provides: [bow_ability_list]
deps: [05_abilities_philosophy.md, 02_weapon_bow.md]
status: current
---

# Bow Abilities

Bow abilities live in class-legal Bow slots. Auto-swap applies: using a bow
ability from another weapon swaps to bow and casts through the same input frame
when validation allows it (`01_controls.md`).

Live tuning is currently in the Combo Combat 2.0 pass. `packages/shared/src/abilities/registry.ts` is the authoritative source for exact projectile speed, gravity, splash, setup duration, cast data, and tooltip text. Numeric bullets below are design snapshots for role/readability review, not a second runtime registry.

## Pool — 8 abilities

### B1 · Piercing Shot

- **Effect**: Arrow pierces up to 3 targets in a 20 m line
- **Damage**: 25 first target · 15 second · 10 third
- **Windup**: 0.25 s draw
- **Cost**: 0
- **Cooldown**: 6 s
- **Range**: 20 m straight line
- **Mini-malus**: Lower per-target damage than a full-charge M1 (22) if only one target is hit

### B2 · Volley

- **Effect**: Rain of arrows on a 4 m radius target zone; 3 waves × 12 damage each
- **Total damage**: 36 over 1.2 s (spread across anyone in the zone)
- **Delay before landing**: 1.2 s telegraph from cast
- **Cost**: 0
- **Cooldown**: 10 s
- **Range**: 30 m (target-circle cast)
- **Mini-malus**: Visible impact markers appear before the first wave lands

### B3 · Pin Shot [KNOCKUP]

- **Effect**: Hit launches target airborne for 0.5 s
- **Damage**: 15
- **Charge**: 0.4 s required (shot won't fire below charge threshold)
- **Cost**: 0
- **Cooldown**: 10 s
- **Range**: 25 m
- **Mini-malus**: 0.4 s charge is interruptible by damage

### B4 · Snare Trap

- **Effect**: Place trap on ground; triggers on enemy proximity → 1.0 s root + 10 damage
- **Arm time**: 2.0 s after placement (visible trap glow during arming)
- **Cost**: 0
- **Cooldown**: 12 s
- **Trigger radius**: 1.5 m
- **Duration**: up to 20 s on ground, consumed on trigger
- **Mini-malus**: 2 s arming delay + visible telegraph — a careful opponent sees and avoids

### B5 · Marksman Shot

- **Effect**: 500 m/s fast-travel projectile, no gravity arc (not hitscan — a 30 m shot takes ~0.06 s of travel time)
- **Damage**: 38
- **Windup**: 1.0 s aim (laser-sight line visible to target during windup)
- **Cost**: 20 mana
- **Cooldown**: 15 s
- **Range**: 100 m; projectile collides with terrain
- **Mini-malus**: Signature big-swing cast (one of only two casts above 0.5 s); 1.0 s windup is interruptible by any damage taken and the laser-sight reveals the angle to the target

### B6 · Disengage Shot

- **Effect**: Small backward leap (3 m) + quick shot forward for 12 damage
- **Duration**: 0.3 s leap + 0.2 s shot
- **Cost**: 15 stamina
- **Cooldown**: 8 s
- **Range**: 15 m
- **Mini-malus**: Reduced hit damage; most of the budget is spent on displacement

### B7 · Broadhead

- **Effect**: Wide-head arrow for 14 damage plus Bleed for 4 s
- **Cost**: 0
- **Cooldown**: 9 s
- **Range**: 22 m arcing projectile
- **Mini-malus**: Gravity arc increases travel error against lateral movement
- **Cleanse counter-play**: Broadhead Bleed needs visible cleanse counterplay.
  Counterplay uses explicit cleanse rules.

### B8 · Blast Arrow

- **Effect**: Explosive fire arrow for 18 damage in a 2.4 m radius plus Burn
- **Cost**: 10 mana
- **Cooldown**: 12 s
- **Range**: 24 m arcing projectile
- **Mini-malus**: Heavy projectile drop and 52 m/s travel speed reduce long-range reliability

## Pool design rationale

- Covers single-target (Piercing, Marksman), AoE (Volley, Blast Arrow), zone control (Trap), root setup (Pin), mobility (Disengage), and bleed pressure (Broadhead)
- **Marksman** is the near-hitscan specialist shot, but it still uses the server projectile pipeline so cover, travel, and projectile collision stay consistent.
- No ability is optimal in all scenarios — every pick makes the player give something up
