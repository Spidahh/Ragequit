---
id: resolved_ambiguities
title: Resolved Ambiguities
section: meta
tags: [decisions, history, changelog]
provides: [ambiguity_resolutions]
deps: []
status: current
---

# Resolved Ambiguities

Original design docs in `01_Master_Bible/` contained several ambiguous or contradictory points. Each is resolved here against the new system (`2026-04-22` rebuild).

## 1. Healing Totem overheal behavior

**Original**: Not specified whether Healing Totem's ticks could exceed target max HP.
**Resolved**: Totem healing **stops at target max HP**. No overheal shield, no banked healing. Wasted healing beyond full HP is simply lost.
**Why**: Keeps healing math readable. An overheal shield would have been a hidden second HP bar and a debuggability nightmare.
**Reference**: `05_abilities_magic.md` — Nature section, N4.

## 2. Ordine applicazione crit × Element Mastery

**Original**: Unclear whether Mastery bonus applies before or after crit multiplier.
**Resolved**: Order is `base → Mastery % → crit × → mitigation → final`. Mastery is applied first (as a base-damage modifier), crit multiplies the already-Mastery-boosted value.
**Why**: Keeps both bonuses meaningful. Crit after Mastery makes crits more rewarding for specialists (good thing).
**Reference**: `03_mastery_system.md` — "Stacking order".

## 3. Bow charge: projectile trajectory or hitscan?

**Original**: Contradictory signals in design doc.
**Resolved**: **Bow M1 is a projectile with mild gravity arc**, not hitscan. `Marksman Shot` is a near-instant 300 m/s precision projectile with a 1.0s windup, not a separate hitscan path.
**Why**: Projectile preserves skill expression (leading targets) and matches the "meritocracy, no auto-aim" pillar. Keeping Marksman in the projectile pipeline also keeps cover, collision, parry, and server validation consistent.
**Reference**: `02_weapon_bow.md`, `05_abilities_bow.md` — B5.

## 4. Status effect icon layout

**Original**: No specification of where status icons appear on the player or HUD.
**Resolved**: Status effects (buffs/debuffs) appear as **small icon row above the target's health bar** (other players) and as a **right-of-crosshair strip** (your own). Max 4 visible; if more, a "+N" overflow icon. Icon shows remaining duration with a pie-chart overlay.
**Why**: Keeps HUD clean while surfacing critical info. Position-above-healthbar is the established convention (RL2, Overwatch, Dota pattern).
**Reference**: `09_visual.md` — HUD section.

## 5. Guest mode — "Mandatory Phase 3" vs "Not Implemented"

**Original**: Two docs disagreed.
**Resolved**: **Guest/local entry is the target low-friction path**, but account/guest persistence is not implemented in the current local build. Launch target: guests can play Training and FFA 10; Ranked and 5v5 Team require account identity for ELO persistence.
**Why**: Low-friction entry, but rank-competitive modes need identity to prevent smurf exploits.
**Reference**: `00_player_journey.md` — login flow.

## 6. Party system — "design complete but not implemented"

**Original**: Design spec existed but marked as "Not Implemented".
**Resolved**: **Party system is a launch target**, not current local functionality: 5v5 supports parties up to 5, FFA supports duo, 1v1 Ranked stays solo-only. Party queue should be separate from solo queue to prevent party stomp.
**Why**: Team game needs party. Solo-only at launch would cripple the 5v5 experience.
**Reference**: `07_modes.md` — Matchmaking rules section.

## 7. Dodge mechanic — listed in original

**Original**: 0.3s iframe dodge with 1s CD, 20 stamina cost.
**Resolved**: **DODGE REMOVED ENTIRELY**. No iframe mechanic exists in the new system. Parry (M2) is the only active defense.
**Why**: Francesco's decision (2026-04-22). Dodge made knockup less meaningful and was a skill-ceiling reducer. Parry is more readable and couples to stamina economy.
**Reference**: `00_pillars.md` — anti-patterns; `01_controls.md` — removed mechanics.

## 8. Shift sprint — listed in original

**Original**: Shift-hold sprint at 13.5 m/s, costs 5 stam/s.
**Resolved**: **SPRINT IS DEFAULT** (always-on). Shift is unbound. Base move speed = the former sprint speed (9.0 m/s).
**Why**: Francesco's decision. Sprint-as-resource created tedious gameplay; always-on sprint keeps pace high without a pointless toggle.
**Reference**: `01_stats.md` — Movement.

## 9. Element Pentagon counter (considered, rejected)

**Original**: Earlier design iterations considered a rock-paper-scissors counter between the 5 elements.
**Resolved**: **NO PENTAGON COUNTER**. Elements are differentiated by _effect_ (burn / slow / chain / lifesteal / DoT), not by counter-relationships. No element is stronger or weaker against any other on principle.
**Why**: Counter systems create unfair matchups decided at loadout-lock. A Fire build should never lose to an Ice build just because of matchup math.
**Reference**: `03_mastery_system.md` — "No pentagon counter"; `00_pillars.md` — rules.

## 10. Class system (considered, rejected)

**Original**: Earlier iterations considered classes (Knight, Mage, Archer) with different weapon access.
**Resolved**: **CLASSLESS**. All players access all 3 weapons + all abilities they've unlocked. Build identity comes from loadout composition, not class choice.
**Why**: Class-based weapon locks broke the "every tool always available" pillar and constrained build creativity.
**Reference**: `00_pillars.md` — anti-patterns; `06_loadout_build.md`.

## 11. Tank/Glass-cannon/Balanced axis (considered, rejected)

**Original**: Not in original docs — considered during redesign conversation.
**Resolved**: **NO HP/STAT AXIS**. All players have identical HP/Mana/Stamina. Differentiation is entirely via the 11 loadout slots.
**Why**: A stat axis would have made loadout choice partially redundant and added a whole balancing dimension without adding gameplay depth.
**Reference**: `00_pillars.md` — anti-patterns; `01_stats.md`.

## 12. TTK numeric value

**Original**: Not specified numerically.
**Resolved**: **TTK 20-30 seconds** full-HP duel. All damage/CD/cost values tuned against this window.
**Why**: Francesco's target. Long TTK makes positioning, parry, transmutation, and combos all meaningful. Short TTK would make them optional or skippable.
**Reference**: `01_combat_fundamentals.md` — TTK.

## 13. Season pass

**Original**: Some docs referenced a season pass progression.
**Resolved**: **NO SEASON PASS**. Progression is through quests + ELO only.
**Why**: Season pass creates FOMO and is incompatible with the "earn through play, not calendar" philosophy.
**Reference**: `00_pillars.md`; `08_progression.md`.

## 14. Art direction

**Original**: Not pinned — generic "stylized 3D".
**Resolved**: **Low-poly stylized, Risk of Rain 2 direction**. Asset sources: Kenney.nl + Quaternius.
**Why**: Pragmatic fit with free assets, browser performance, and our stack. Also: what Francesco chose.
**Reference**: `09_visual.md`; `10_tech_assets.md`.
