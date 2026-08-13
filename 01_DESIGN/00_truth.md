---
id: truth
title: The Design Truth
section: core
tags: [non-negotiable, cast_grammar, ttk, airborne, specialisations, dissent]
provides:
  [
    non_negotiables,
    cast_grammar,
    visual_vocabulary,
    ttk_target,
    live_ability_budget,
    weapon_vs_build,
    specialisation_contract,
    airborne_contract,
    dissent_register,
  ]
deps: [00_vision.md, 00_pillars.md, 01_arena_fps_air_contract.md]
status: final
---

# The Design Truth

This document exists to end the guessing. `00_vision.md` says what the game is;
this says how it works, with numbers, and names everything in the repository that
currently says otherwise.

Every claim below was checked against the live tree (`main`, `3a165a7`). Where a
reference game is quoted, the quote is either verifiable from released source or
it is flagged as unverified. Where a number is ours rather than inherited, it says
so. **A design document that quotes a number it cannot source is how this project
spent six months polishing the wrong things.**

---

## 1 · Non-negotiable

These are not open. They are the frame every other decision is fitted into.

**1.1 — Classes stay.** Tank, Arciere, Mago and Ibrido are permanent. They may be
redesigned — slot grammar, resources, class mechanic, launch weight — but they are
never reduced to labels on the same build, and they are never removed to simplify
something else.

**1.2 — The game is build-based.** You choose a class, then abilities, then
specialisations, and only then you enter the arena. The build decides what you
bring. Movement and aim decide what you do with it. No proposal that shrinks the
build space is accepted on the grounds that it makes the fight tidier; if a
proposal costs build space, it must state the cost in combinations and justify it.

**1.3 — Three modes.** Solo, squads, and a tournament that runs until one player
remains. All three ship. The tournament does not exist in any form today (see
§9, entry D22) and that is a gap, not a decision.

**1.4 — The three references, and what each one contributes.** Recorded by the
owner on 2026-08-13 and not reinterpretable:

| Reference           | Contributes                                   |
| ------------------- | --------------------------------------------- |
| **Quake 3**         | Movement and speed                            |
| **Darkfall**        | Launch-into-the-air magic, and free aim       |
| **Mistfall Hunter** | How spells and classes are used and presented |

They describe how RAGEQUIT should **play**, not how it should look. Filing them
under art direction is the original error this document exists to correct.

**1.5 — Evidence honesty.** Quake 3 is fully verifiable: id released `bg_pmove.c`
and `g_combat.c` under GPL. Darkfall Online and Unholy Wars are both shut down
with no source release and no authoritative spec archive — every specific Darkfall
mechanic in circulation is recollection, and the only authoritative statement about
Darkfall for this project is the owner's own line above. **Mistfall Hunter is the
thinnest evidence of the three** and is treated as such throughout: see §3.6.

---

## 2 · How you cast a spell

There are two ways to cast, and only two. Every one of the 53 abilities is one or
the other, declared on the def, and the player learns the distinction once.

### 2.1 TAP — the punish tier

Press the key. The ability resolves on the key-down. `windupSec: 0`, no charge, no
movement penalty. This is what you hit an airborne body with.

### 2.2 HOLD — the commitment tier

The key **is** the cast. The ability charges while the key is held and fires on
release. **Releasing early fires a weaker, shorter version** — it is not a wasted
input.

| Parameter                  | Value                              | Why                                                                                                                                                |
| -------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CHARGE_MIN_SEC`           | 0.12                               | Below this nothing fires and nothing is spent — a fumbled hold never throws a minimum-power spell                                                  |
| `CHARGE_FULL_SEC`          | 0.55                               | Under the bow's 0.65 s full draw (a spell must not be slower to prepare than an arrow); well above the 0.3 s GCD, so a charge is a real commitment |
| Damage at charge ratio `r` | × (0.55 + 0.45 r)                  | Early release is a choice, not a punishment                                                                                                        |
| Range at `r`               | × (0.60 + 0.40 r)                  | Reach is the thing you visibly lose by rushing                                                                                                     |
| Launch airtime at `r`      | × (0.70 + 0.30 r)                  | A rushed launcher still lifts; it just buys a smaller window                                                                                       |
| Move speed while charging  | × 0.60 of `MOVE_SPEED_MPS` (9 m/s) | Slowed, **never rooted**. New optional `moveMultDuringCharge?: number` on `AbilityDef`, default 1 — so all TAP abilities are untouched             |

**How many are HOLD:** the launchers and the area spells, roughly 10 of 53.
Everything else is TAP. The Forge validator enforces **at least one TAP pick per
build**, the same way it already enforces one Recovery, so no build can lock itself
out of its own punish window.

**Why this grammar and not Mistfall's two-mouse-button caster.** RMB is parry
(`weapons.ts:114-119` — tap 0.5 s / 100 % block / 20 stamina / 3 s CD, hold 70 %
at 15 stam/s), and displacing parry to make room for a second cast button fights
pillar "parry/shield must be visible when it protects". More importantly: **this
game already ships the mechanic.** The bow is an analogue charge with meaningful
early release — `BOW_CHARGE_MIN_SEC 0.05` → `BOW_CHARGE_FULL_SEC 0.65`, damage
4 → 22, speed 35 → 60 m/s (`weapons.ts:64-69`), with a three-tier crosshair state
already wired (`hud/combat-overlay-hud.ts:87-95`). Generalising a grammar the
player has already learned costs nothing. This is also the one part of the Mistfall
reference that is corroborated in its own tutorial text ("release the skill early
to recover Energy and fire a weaker bolt with reduced maximum range"); the rest
is not, and is not used.

---

## 3 · How you SEE where it will go and what it will do

This is the owner's central ask, and it is answered as a **rule**, not a feature
list. The rule has three parts: four marks, one colour law, one timing law. Nothing
else is allowed to appear on screen to explain a cast.

### 3.1 The rule of one shape

> **Every ability is drawn exactly once, at exactly the size the server checks, in
> the colour of its element. What varies between abilities is not whether it is
> drawn — it is WHEN each side sees it.**

The drawn shape _is_ the hitbox. If the circle and the hitbox ever disagree, the
circle is a lie and the whole grammar is worthless. `insideAoe`
(`server/sim/aoe-shape.ts`) is already one bounded disc; the client already sizes
its footprint from real effect radii (`client/render/placement-preview.ts:29-62`).
The law is enforceable today.

### 3.2 The four marks — fixed vocabulary, one meaning each

| Mark          | Shape                                                              | Says **exactly** one thing  | Who sees it                                   |
| ------------- | ------------------------------------------------------------------ | --------------------------- | --------------------------------------------- |
| **PATH**      | Dotted line, ~28 samples spaced by **time**, not by distance       | _Where it goes_             | **Caster only**, always                       |
| **FOOTPRINT** | Flat disc (or rectangle for a wall) at the true server radius      | _How wide it hits_          | **Caster** before commit; **victim** per §3.4 |
| **GHOST**     | Translucent copy of your own capsule, plus a 2-segment ground line | _Where **you** end up_      | **Caster only**, always                       |
| **CLOCK**     | Ring anchored on the casting body that fills as the cast runs      | _How long until it happens_ | **Both**                                      |

Four marks. Nothing else. A number on screen is not a mark; a text warning is not
a mark; an icon is not a mark.

Read together they answer the four questions the owner asked, without a word of
text:

| Question             | Answered by                                                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Where?**           | PATH's trajectory; for a self-centred spell, the FOOTPRINT under your own feet                                                |
| **How far?**         | PATH **terminates** where the shot terminates. Distance is not a number to read, it is a place to look                        |
| **How wide?**        | FOOTPRINT radius. **Its absence is the statement "single target"** — that is why no ring is drawn for a single-target ability |
| **What will it do?** | Colour (§3.3) plus the FOOTPRINT's fill state                                                                                 |

Two details that are load-bearing rather than decorative:

- **PATH dots are spaced by time.** A slow lobbed shell shows widely-spaced dots; a
  fast bolt shows a dense near-line. Dot density therefore reads as speed, and the
  player feels travel time before committing — which is precisely the read a
  launch-then-punish loop needs.
- **PATH is produced by the real integrator.** `stepProjectile`
  (`shared/src/sim/projectile.ts:37`) is already deterministic and already shared
  between client and server; the preview calls it with the def's own `speedMps` and
  `gravityMps2`. **A preview that lies once is worse than no preview**, so an
  approximation is not acceptable here. The same applies to the GHOST: the server
  resolves a dash by stepping the segment at 0.25 m increments and taking the last
  clear sample (`GameRoom.ts:1788-1798`), so the ghost ports that loop verbatim, not
  a raycast.

### 3.3 The colour law

**Colour carries element and nothing else.** Five elements, five colours, one
palette — `ELEMENT_COLOR` (`client/src/hud/cd-strip.ts:12-19`) — used identically
in PATH, FOOTPRINT, projectile, trail, impact, zone decal, CLOCK and status icon.
Learn a colour once, know it everywhere.

Exactly two exceptions, and this list is exhaustive:

1. **The GHOST turns red** when the move will be cut short by geometry. Red on the
   ghost means "this dash will not complete", and nothing else in the game is ever
   red for validity. (`hunters_flow` has no `cancelOnCollision`, so its ghost is
   never red.)
2. **The AIR mark is one dedicated non-element colour** for all nine launchers,
   because being airborne is a **state**, not an element. See §7.4.

### 3.4 The timing law — who sees what, and when

This is the whole asymmetry, in three lines.

| Ability                                | Caster sees                                                        | Victim sees                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **HOLD** (`windupSec > 0` or charging) | PATH + FOOTPRINT + CLOCK, live, from the first frame of the charge | **The same FOOTPRINT and CLOCK, from the first frame.** A committed cast is public — dodging it is the intended counterplay |
| **TAP** (`windupSec: 0`)               | PATH + FOOTPRINT flashed for ~200 ms on key-down                   | **Nothing before.** The FOOTPRINT appears at the true radius **at resolution**, holds ~220 ms, fades                        |
| **Any move effect**                    | GHOST                                                              | **Never.** A telegraphed dash is a dead dash                                                                                |

The TAP after-image is not consolation. It is the cheapest teaching device
available: it costs the victim nothing in the moment (they are already hit) and it
converts every death into a lesson about a shape, so the second time that circle
lands they already know it. The alternative — an instant area attack that is never
drawn at all — is indistinguishable from being randomly damaged, which is what 14
of the current abilities do today (§9, D11).

### 3.5 Delivery classes — RAY and BOLT

Free aim is a non-negotiable (`00_vision.md`: _"You hit what you point at and you
miss what you do not"_). The server's ±10° soft-lock cone is the single sharpest
contradiction in the repository (§9, D9). The resolution is not to advertise the
assist — it is to shrink it and give the launcher a real projectile.

| Class    | Delivery                                                                                            | Range   | Aim tolerance                                                         | Role in the loop   |
| -------- | --------------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------- | ------------------ |
| **RAY**  | Instant, hitscan                                                                                    | ≤ 10 m  | 3° cone (`tan(π/60)`) → **0.97 m capture at 10 m**, about one capsule | The follow-up      |
| **BOLT** | Real `ProjectileEffect`, `gravityMps2: 0` (spells ignore gravity; the bow keeps its 2.0), 26–34 m/s | 15–30 m | None. You lead it or you miss                                         | The launcher       |
| **CONE** | Melee-range forward, 10° retained                                                                   | ≤ 2.5 m | 0.89 m at uppercut range, about one body                              | The melee launcher |

At 30 m/s a 10 m bolt flies 0.33 s, so a 9 m/s strafing target needs ~3.0 m of
lead. That is a real aim problem and it is the point.

**Sequencing warning, and it is not optional.** `findForwardEnemy` measures lateral
offset in **3D, including Y** (`AbilityEngine.ts:855-862`). A victim at today's
2.0 m apex sits 2.0 m off a level crosshair and is captured for free by the current
2.21 m radius at 10 m. **Tightening the cone before the airborne work in §7 ships
makes the launch loop strictly worse.** The cone shrinks last.

Two engine capabilities are missing and must be added before a BOLT can launch:
`at: 'onLand'` effects on a projectile-bearing ability are skipped at cast
(`AbilityEngine.ts:243-247`, "deferred to impact") and never resolved, and
`ProjectileSystem.ts:425-437` handles knockback and on-hit status at impact but has
no knockup path at all. No shipped ability combines the two today, so this is a
missing capability rather than a live bug.

### 3.6 What we are NOT taking from Mistfall Hunter, and why

Required disclosure. Mistfall Hunter (Bellring Games, launched 29 Jul 2026) is
**third-person**, not first-person. Sources are fan wikis and aggregators
reproducing in-game tutorial text.

**Corroborated, and used:** the bindable actions (Attack, Secondary Attack, Major
Skill, Minor Skill); "hold to chant"; "hold Major/Minor Skill to switch between
spells equipped to Attack or Secondary Attack"; early-release-for-a-weaker-shot;
an instant tier that requires no chant; a Breakaway escape whose readiness is
displayed above enemies.

**Not verifiable, and therefore not used as a number anywhere in this document:**
cast times ("0.5–2.5 s") and energy costs ("5–40"), which are fan-DB aggregation;
"chanting slows but never roots" and the "Flexible Casting" talent, which could not
be corroborated at all; **Breakaway's cooldown**, where the canonical reference
states flatly that no figure has been published and that there cannot be a fixed
one because the timer shortens as you deal and take damage. Any second-value quoted
for Breakaway is invented. Ours (§7.5) is ours, and is labelled as such.

**Also corrected:** the Withered Knight loop is three light strikes → Judgment →
the next attack applies the Wither mark → a heavy consumes it. The commonly-repeated
"restores energy and reduces cooldowns" is folklore and is dropped.

What we take from Mistfall is therefore **one idea, not a spec**: the class resource
and the punish state should be legible **on the body they belong to**, not in a
corner of the HUD. See §7.4 and §9, D23.

---

## 4 · TTK

**Target: 6–9 seconds of landed damage against a 200 HP pool.** That is not a new
number — it is what the game already does, measured from the shipped registry:

| Preset  | Sustained ability DPS | Weapon M1 DPS | 200 HP falls in       |
| ------- | --------------------- | ------------- | --------------------- |
| Mago    | 14.3                  | staff 20.0    | 5.8 s                 |
| Ibrido  | 14.1                  | staff 20.0    | ~5.9 s                |
| Arciere | 13.3                  | bow ~33.8     | faster                |
| Tank    | 9.2                   | sword 15.0    | 7.3 s (250 HP: ~10 s) |

`TTK_MIN_SEC = 20` / `TTK_MAX_SEC = 30` (`constants/combat.ts:10-11`) is wrong by
3–5×, and the comment above it — _"all ability damage/CD/cost values are tuned
against this"_ — is false. **The document changes, not the damage table.** This is
the cheapest correct move: the 53 abilities keep their relative balance exactly,
and no heal, shield or resource pool is disturbed.

**Rejected: a flat 3.0× damage rescale.** It preserves damage-vs-damage and
destroys damage-vs-everything-else. Heals are flat (50, 60), shields are flat
(`stacks: 20`), and the resource pools (mana 50–160, stamina 80–150) are all off
the multiplier. Three of the top five `amount:` values in the registry are heals.
Tripling damage while leaving a 50 HP heal alone does not preserve balance — it
deletes healing.

**The one damage change that is required: the conversion ceiling.** One clean
launch → punish must take **30–35 % of a bar**: launcher ~15 + follow-up ~50 = 65
against 200 HP, so **three clean conversions kill**. The largest single hit in the
whole 53-ability registry is currently 44 (`registry.ts:506`) and the typical hit
is 12–22, so the five `comboRole: 'finisher'` abilities rise into a **40–55 band**.
That is five numbers, not 53, and it is bisectable.

**Cooldowns move with TTK or the change is worthless.** Registry cooldowns run
4–22 s, median 12. At a 6–9 s TTK a 12 s cooldown fires **once** per fight and a
22 s cooldown fires once per **three** fights — a six-slot build then expresses two
or three slots and the rest is decoration. **Rule: no ability in a live build may
exceed a 12 s cooldown.** Every slot is up in every engagement, and the fight is
decided by aim rather than by which button happened to be off cooldown.

**Respawn: `RESPAWN_SEC` 5 → 1.5 s, with fire-to-respawn accepted from 1.0 s.**
Quake's exact shape. Five seconds is three times Quake's and it is a fixed wait
with no click-to-respawn. `SPAWN_INVULN_SEC = 2` (`stats.ts:39`) already exists and
stays — it is what makes a fast respawn safe. This change has zero build surface
and zero balance surface and can ship alone.

**Consequence to re-derive:** `07_modes.md:109-111` sizes the 75-kill and 40-kill
win conditions explicitly on _"with TTK 20-30s"_. Those counts are now wrong.

**Why short TTK, stated once so it is not relitigated:** short TTK is what makes
speed matter. If a mistake costs the round in seconds, every metre of positioning
is load-bearing. Long TTK actively _hurts_ build diversity — it lets every build
grind out the same attrition win, so the differences average away. And it makes
movement decorative: nobody can be caught out of position when the punish takes
twenty seconds.

---

## 5 · How many abilities are live at once

**The build authors 8. The hand holds 4.**

The measured problem is not the number 8. It is that on **every class, eight live
cooldowns carry less damage than the one free weapon** (see the table in §4). Eight
buttons buy attention cost without buying damage share, and in a 9 m/s free-aim
fight every extra live cooldown is read with the same eye that is tracking the
target.

**Rejected: cutting the build to 4 slots.** Today's legal Mago space is
C(12,3) × C(15,3) × 8 = **800,800 nominal builds**. A four-slot grammar takes that
to roughly 540 — a **1,483× reduction on the exact axis that non-negotiable 1.2
says IS the game.** That is an amputation, and no amount of "the surviving builds
are more meaningful" makes it a free one.

**The rule:**

- The Forge authors **8** slots under the existing class slot grammar. Unchanged.
- **Band A** — 4 slots — is live on keys `1`–`4` at all times.
- **Band B** — 4 slots — is one hold away.
- The band split is a **Forge decision**, saved with the build.
- Mid-fight, hold `E` (Band A) or `Q` (Band B) and flick: releasing on a sector
  **assigns** that ability to the key and **it stays there**. One hold + one flick,
  roughly 250–350 ms, and then it is a direct key again. No LMB confirm, no timeout.

**The price, stated:** a player who liked eight direct keys loses four of them.
That is the cost of the change and it is deliberate — the attention budget in a
fight becomes 4 cooldowns instead of 8, while the build space stays at 800,800.

This also gives the radial wheel a job. It exists and is well built
(`client/src/input/radial-wheels.ts` — E = slots 0-3, Q = slots 4-7, live cooldown
badges per sector), but its output today is a **one-shot prime**: the next LMB
fires it and nulls it (`cast-dispatcher.ts:96-98, 138-148`) and the prime
self-expires after 5000 ms (`hud/ability-readout.ts:83-85`). It costs hold + flick

- LMB **for every cast**, and leaves nothing behind — which makes it strictly worse
  than a keypress on the hotbar, i.e. dead weight. Sticky assignment is what makes
  it the mechanism instead of an alternative nobody uses.

---

## 6 · What lives on the weapon, and what lives in the build

**The weapon is free. The build is costed.** Two sentences, and every constant
follows from them.

### 6.1 On the weapon — universal, free, identical for every build, never in a slot

| Verb            | Rule                                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| **M1 attack**   | **Free on all three weapons.** `SWORD_M1_COST_STAMINA` 8 → 0, `STAFF_M1_MANA_COST` 2 → 0. Bow M1 is already free |
| **M2 parry**    | Unchanged. Not displaced, not overloaded, not shared with any cast grammar                                       |
| **Jump**        | **Free.** `JUMP_COST_STAMINA` 10 → 0                                                                             |
| **Weapon swap** | Tab, unchanged                                                                                                   |
| **Air tech**    | `F`. One universal escape, no slot, no build cost. See §7.5                                                      |

Why M1 is free: 100 % uptime on the basic attack is what makes aim feel like the
game rather than a filler activity. Today there are three weapons with three
incompatible economies — sword M1 costs 20 stamina/s against 5/s moving regen on a
150 pool, so **the Tank cannot sustain its own preset build for more than about
4.5 seconds**, which is shorter than the TTK. Staff M1 is sustainable only because
mana regen was already bumped 2.5 → 8. Bow M1 is free. A melee class whose basic
attack runs dry is the one economy that had to go.

Why jumping is free: `controller.ts:143` gates the jump on
`state.stamina >= JUMP_COST_STAMINA`, so **below 10 stamina the character cannot
jump at all**. A movement game does not gate movement on a combat resource. This
one line contradicts vision pillar 2 outright.

### 6.2 In the build — chosen in the Forge, costed in the arena

Everything with a cooldown or a mana cost: the 8 abilities under the class slot
grammar, and the 3 specialisations.

### 6.3 The two-bar law

- **Stamina is the defensive and mobility budget** — parry tap 20, parry hold 15/s,
  the air tech, ability stamina costs. The bar reads "how much defence do I have
  left" and nothing else.
- **Mana is the magic-ability budget.** Nothing else.

Resource emphasis stays a real class-identity axis (Tank 150 stamina / Mago 160
mana / Arciere 80+110 / Ibrido 100+100) — it now governs the build actives, which
is where build-crafting lives, instead of taxing the universal weapon every build
already has.

---

## 7 · The airborne rules

This is the Darkfall moment and it is the mechanic the game half has. Six rules.

### 7.1 A launch is an impulse. Added, never assigned, never a teleport.

```
vel.y  = max(vel.y, launchVy)
vel.x += dir.x * impulse
vel.z += dir.z * impulse
```

Delete `simState.vel.x = 0; simState.vel.z = 0` (`GameRoom.ts:1875-1876`) — and
delete `player.vx = 0; player.vz = 0` alongside them (`:1880-1881`), or replicated
velocity lies to remote interpolation. Delete the position teleport through
`resolveAbilityDisplacement` (`GameRoom.ts:1859-1871`); `knockbackDistance` in
metres becomes `knockupImpulseMps` in m/s, and travel becomes an emergent
consequence (`impulse × airtime`) rather than a second authored number.

Three reasons, in order of weight:

1. **It is already a locked rule.** `01_arena_fps_air_contract.md:38`: _"external
   impulse and self impulse are explicit velocity events."_ The shipped code does
   the opposite. This is a contract violation, not a design gap.
2. **It is the cheaper implementation.** The client reconciles by replaying inputs
   through the same `simulatePlayer` (`client/src/game/prediction.ts:42-70`) and
   `vx/vy/vz` are already replicated (`schema/Player.ts:25-27`), so a velocity
   impulse reproduces itself through prediction for free. A one-tick position snap
   is precisely the event reconciliation **cannot** predict — so today every launch
   costs a visible correction.
3. **A body that carries is legible.** A parabola that starts where the victim
   already was, going where they were already going, can be led by the attacker and
   aimed at by the victim. A body that stops dead in mid-air is not a punish window,
   it is a piñata — and it is the anti-Quake move, because it hands the victim a
   clean stop in a game where momentum is the most valuable currency.

The air speed cap must be **suppressed during the knockback window**, not only
friction. Quake needs `PMF_TIME_KNOCKBACK` to kill friction only because Quake has
no air cap; RAGEQUIT's hard per-tick rescale (`controller.ts:132-138`) would bleed
the impulse on every airborne tick.

Two more position-snap push paths must converge on the same impulse model or the
game ships two contradictory physics: `GameRoom.ts:1103-1111`
(`spellImpactPushDistance` on every landed spell hit) and
`ProjectileSystem.ts:409-443` (0.4–0.5 m teleport push on direct hits).

### 7.2 A knockback window, and it does not refresh

`knockbackTicks = 6` (100 ms at 60 Hz — Quake's window, exactly) on
`PlayerSimState`, decremented per tick, replicated as `knockbackUntilTick`. While
it runs: friction is skipped and the air cap is suppressed.

**It is set only when it is not already running** — Quake sets the timer inside
`if (!ps.pm_time)`, so chained hits do not extend the window. That is a deliberate
copy, not an oversight.

Do **not** scale the window from damage. The nine launchers deal 8, 8, 8, 10, 12,
14, 16, 16 and 44; any damage-derived formula clamps all nine to the floor and the
"window scales with the hit" property — the whole reason the mechanic is legible
without UI — does not exist. If a launcher wants a longer slide, it authors
`knockbackTicks` on its own effect.

### 7.3 Airtime is authored per ability. Four weights.

Delete `void airborneSec` (`GameRoom.ts:1890`). Derive from the def:
`v0 = GRAVITY_MPS2 × airborneSec / 2`, apex `= g·T²/8`. This is the owner's own
named defect: _"all nine share an identical airtime, so a launch reads as one move
rather than a family."_

| Weight     | T (s) | v0 (m/s) | Apex (m) | Punish window¹                         | Abilities                                                        |
| ---------- | ----- | -------- | -------- | -------------------------------------- | ---------------------------------------------------------------- |
| **POP**    | 0.45  | 5.63     | 0.63     | none (0.09 s)                          | `guard_break`, `thunder_clap`                                    |
| **LIFT**   | 0.70  | 8.75     | 1.53     | 0.34 s — one instant                   | `uppercut`, `eruption`, `frost_pillar`, `arc_lift`, `void_spike` |
| **LAUNCH** | 1.00  | 12.50    | 3.13     | 0.64 s — one instant plus a reposition | `root_upthrow`                                                   |
| **SKY**    | 1.20  | 15.00    | 4.50     | 0.84 s — two instants                  | `meteor`                                                         |

¹ `airtime − GCD_SEC (0.3) − RTT (~0.06)`.

`MAX_AIRBORNE_SEC = 1.20` as a hard ceiling, so no future def can exceed the tested
envelope.

Three things this table says on purpose:

- **POP is below jump height (1.5 m) and buys no window.** `guard_break` and
  `thunder_clap` already carry a 1.5 s and a 1.8 s stun; they must not also buy a
  punish window. A POP is a shove. Nobody should later "fix" its apex.
- **`root_upthrow` gets the heavyweight** because it already refuses airborne
  targets (`requiresGroundedTarget`), so it can never chain.
- **`meteor` gets the top tier** because it already pays for it: 1.0 s windup,
  18 s cooldown, and a ground telegraph that is visible to everyone.

**Rejected: asymmetric gravity (a heavier descent to front-load the window).** It
is a real technique, but under it `T = (v0/g)(1 + 1/√k)`, so `v0 ≠ g·T/2` and
**every apex in the table above becomes wrong**. One formula, one table, readable
by whoever tunes it next. Simple beats clever here.

**Consequence that must ship in the same commit:** `GameRoom.ts:1013-1014` decides
`victimWasAirborne` using the single global `UPPERCUT_AIRBORNE_TICKS` derived from
`UPPERCUT_AIRBORNE_SEC = 0.8`. The moment airtimes become per-ability, that window
desynchronises — and on any launch longer than 0.8 s the opening follow-ups are
**not** flagged `airPunish`, silently killing the 100 ms attacker hitstop, the
75 ms victim hitstop, the teal "AIR n" popup and the `knockupConversions` stat, for
exactly the launchers designed to be the biggest.

**And the invariant that has to exist in code**, because the documented signature
chain is currently unexecutable: `05_abilities_philosophy.md:85` names
_"Launch → precision punish: Uppercut / Frost Pillar / Arc Lift → Marksman Shot or
Piercing Shot."_ Marksman Shot is `windupSec: 1.0` (`registry.ts:304`); against
today's 0.44 s usable window it misses by more than double. **Test:** for every
ability the design calls a punish, `windupSec + GCD_SEC ≤ the shortest launcher's
airtime`. At LIFT that caps a finisher's windup at 0.40 s — so Marksman Shot either
comes down to ~0.35 s (and its damage down with it) or it stops being called a
punish and Piercing Shot (0.35 s) takes the role.

### 7.4 What the victim can still do — capped, never zeroed

Air steering is currently **unbounded and applied from a standstill**: air accel is
`AIR_ACCEL_COEF (1.0) × wishSpeed (9)` = 9 m/s², so a launched victim drifts
`4.5·T²` metres — 2.21 m at T = 0.70, 2.88 m at today's 0.80, and **6.48 m at
T = 1.20**. Under the current numbers a _heavier_ launch makes the target _harder_
to hit, which is exactly backwards and is why §7.3 cannot ship alone.

**Rule: `airControlFraction` on `MovementCaps`** (`controller.ts:33-37` — the
existing shared client+server channel, so prediction cannot desync), set to **0.35
while launched**, 1.0 otherwise. Drift becomes `1.575·T²`: **0.77 m at LIFT, 2.27 m
at SKY**. Heavier launches now genuinely commit the victim, and drift stays
non-zero so landing choice survives.

Everything else in `01_arena_fps_air_contract.md:18-27` is already right and is
protected: airborne is not hard CC, M1s and abilities and parry stay legal in air,
fall damage is 0, self-damage is 0, and the melee cone ignores Y so grounded swings
still reach an airborne body. **No slot-strip, no silence, no forced animation.**

Note for tuning: `guard_break` and `thunder_clap` apply stun in the same effect
list, and stun → `movementLocked` → `speedMul = 0` (`controller.ts:66-72`), so
**their victims already drift zero**. The two POP launchers are the two that
already fully commit the victim.

**The state must be drawn on the body.** One dedicated non-element colour (§3.3):
a rim on the airborne enemy plus a ring at their feet that shrinks to zero exactly
as the window closes — one mark answering both "who is punishable" and "for how
long", in the world, not in the HUD. This is the one thing taken from Mistfall
Hunter: the payoff lives where your eyes already are.

### 7.5 One universal air tech, and it is public

Bound to **`F`** — its own key, not parry's.
`01_arena_fps_air_contract.md:24` reserves parry in air (_"Parry/protection can act
in air when resources and state allow it"_) and there is a test defending it
(`AbilityEngine.test.ts:413`); overloading M2 would remove the victim's currently
guaranteed air defence in order to add an air defence. `Z`, `X`, `F`, `V`, `R` and
`G` are explicitly unused (`01_controls.md:98`), and a `Roll` clip already exists
unused in `AnimName` / `ANIM_NAMES` (`client/render/character-animation.ts:27`).

| Parameter   | Value                                                                          | Note                                                     |
| ----------- | ------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Legal from  | 0.25 s into the launch                                                         | The first quarter-second is always a clean punish window |
| Cost        | 35 stamina                                                                     | Priced by class pool automatically: Tank 150, Mago 80    |
| Cooldown    | 8 s, its own timer                                                             | **Once per juggle, not once per launch in a chain**      |
| Effect      | `vel.y` clamped to ≤ 0, airborne flag ends, 0.25 s invulnerability on recovery |                                                          |
| Public tell | A chevron over the head **at the moment it becomes available**                 |                                                          |

All five numbers are **ours**. Mistfall's Breakaway is the inspiration and its
readiness icon is the corroborated part; its cooldown is explicitly unpublished
(§3.6).

Making the readiness public is the half almost every game misses: it turns a
defensive resource into a shared object, which is what turns launch-and-punish from
frustrating into a mind game. The attacker knows whether to commit.

### 7.6 The brake is a ladder, not a wall — and the bookkeeping is fixed first

**Fix first, because it is a live lie.** `airborneUntilTick` is cleared only on
death (`GameRoom.ts:1120`) and respawn (`:1257`) — **never when the capsule
actually grounds**. So the 2 s post-land immunity outruns the physics, and a victim
who landed early on a box still triggers the attacker's 100 ms hitstop
(`client/game/hitstop.ts:39`) and the "✈ AIR" nameplate
(`client/render/remote-players.ts`) **on a grounded body**. The game lies about its
own signature moment, which lands directly on the owner's central ask. Clear the
flag the tick the capsule grounds.

**Then replace the wall.** Today: `tickNow < airborneUntilTick +
KNOCKUP_IMMUNITY_TICKS` (`AbilityEngine.ts:431-437, 443-449`;
`KNOCKUP_IMMUNITY_AFTER_LAND_SEC = 2`) = **2.8 s of binary, all-or-nothing
immunity with no memory of how many hits landed in between.**

Replace with a diminishing ladder per victim over a rolling **10 s**:

| Launch in window | Airtime granted                                            |
| ---------------- | ---------------------------------------------------------- |
| 1st              | 100 %                                                      |
| 2nd              | 55 %                                                       |
| 3rd              | 25 %                                                       |
| 4th+             | 0 % — damage and impulse still land, the **lift** does not |

The counter decays over ~1.5–2 s of grounded time; it does **not** clear the
instant the victim touches the floor, or the ladder protects nothing across
launches. This kills lockdown without ever printing "immune" at a player who is
being hit, and the arc visibly flattens launch by launch — so the moment the victim
gets their turn back is telegraphed to both players at once, with nobody counting
frames.

The value family (gravity scaling per hit, untechable-time decay, damage proration)
is documented in the Guilty Gear / BlazBlue lineage. **The specific numbers above
are ours.**

**The anti-stun-lock guarantee, stated as a number because the owner asked for
it:** worst case, with the victim spending nothing, the longest legal chain is
SKY at 100 % + 55 % + 25 % = **2.16 s of cumulative air**, and the air tech is legal
from 0.25 s into the first launch. With the tech spent, it is 0.25–0.6 s. **No
player is ever removed from the game for longer than 2.16 seconds.**

**Deferred:** a juggle _extension_ mechanic (+airtime per landed air hit). It stacks
a second airtime authority on top of the tier table and cannot be tuned until §7.1
– §7.4 have shipped and the base window has been measured in a real fight.

---

## 8 · What a specialisation changes

**Definition, and it is a hard boundary:**

> **A specialisation is a passive modifier that retunes something the build already
> has. It is never a new castable, and it never adds a button.**

3 specialisation slots per build, class-gated pool, each with a stated malus
(pillar 6). Motor memory transfers across builds — the player keeps four keys while
the fight genuinely changes underneath — and the number of things the player
**presses** stays frozen while the number of things the player **chooses** grows.
That is the whole reason the axis exists.

Illustrations of the shape, not a ratified list:

| Specialisation   | Changes                                                  | Costs                                |
| ---------------- | -------------------------------------------------------- | ------------------------------------ |
| **Heavy Lift**   | Launcher moves up one weight tier (LIFT → LAUNCH)        | +4 s on that launcher's cooldown     |
| **Air Frame**    | Your own `airControlFraction` while launched 0.35 → 0.60 | −15 % of your stamina pool           |
| **Bolt Cadence** | Staff M1 cadence 0.40 → 0.28 s                           | Staff M1 damage 8 → 6                |
| **Snap Draw**    | Charge band `CHARGE_FULL_SEC` 0.55 → 0.38 s              | Full-charge output scalar 1.0 → 0.85 |

Three things must be settled before a line of code is written:

1. **A doc contradiction must be retired.** `06_loadout_build.md:23` states flatly:
   _"There are no passive systems, extra slots, or fixed resource-transfer slots."_
   `00_vision.md` files specialisations under "Stays, and is the point". One of the
   two is wrong; `06_loadout_build.md` is the older document and it is the one that
   goes.
2. **This ground is not virgin.** `packages/shared/dist/constants/mastery.d.ts`
   survives as stale build output from a **deleted** source file — `MASTERY_BONUSES`
   per element with `damageMult`, `cooldownMult`, `ccDurationMult`, `dotTickMult`,
   `lifestealAdd`, plus `computeMastery` / `computeLoadoutMastery` over an
   **11-slot** loadout. Deleted in commit `6a7839a`. **The project already built a
   modifier layer once and removed it.** Whatever killed it will kill this one
   unless someone finds out what it was. Delete the dist artefact either way — it
   references a slot count that no longer exists.
3. **Specialisations obey pillar 5.** No elemental counter-relationship may enter
   through the modifier layer. A Fire specialisation is never strong against an Ice
   build on principle.

The four class mechanics that already exist and are already simulated — Fury,
Momentum, Risonanza, Flow (`server/src/sim/ClassMechanicRuntime.ts`) — are the
natural first pool: they become things a player chooses to build around rather than
silent passives. Note for accuracy: they are **not** invisible. They are drawn on
the caster's own HUD (`client/src/hud/class-mechanic.ts`, with tests). What is
missing is the enemy-side mirror (§9, D23).

---

## 9 · What now dissents from this

Every entry is a live rule, document line or system that contradicts something
above. Ordered by how much damage it does. Each is specific enough to act on.

### Tier 1 — contradicts a non-negotiable, or drives every other number

**D1 · `TTK_MIN_SEC = 20` / `TTK_MAX_SEC = 30`** — `packages/shared/src/constants/combat.ts:10-11`.
The comment above them, _"Calibration target — all ability damage/CD/cost values
are tuned against this"_, is false: the shipped registry kills a 200 HP pool in
5.8–7.3 s. Left in place, every future ability gets tuned downward to fit a number
nothing obeys. Replace with the 6–9 s target of §4.
Echoed in three more places that must move with it: `constants/weapons.ts:3`
(_"damages are raw HP numbers tuned to the 20-30 s TTK window"_),
`constants/stats.ts:17` (_"Balance rationale (TTK target 20-30 s)"_), and
`05_abilities_philosophy.md:47` (_"TTK alignment — all damage values align with the
20-30 s TTK window"_).

**SHIPPED 2026-08-13.** The band is 6–9 s, and it is **enforced**:
`shared/config/ttk.ts` measures every class preset against the shipped registry
and a test fails when the roster leaves it. That is the actual fix — the old
pair was wrong by 3–5× for the life of the project precisely because nothing
imported it, so nothing could notice.

Getting an honest number required correcting the model first. Summing full
ability DPS and full weapon DPS assumes you cast everything AND swing
continuously in the same seconds, which is two players rather than a rotation
and read about 25 % faster than anything reachable. Charging each ability its
cast time and letting the weapon fill only what is left gives 6.53 / 6.31 /
7.88 / 6.63 s for tank / archer / mage / hybrid — **the registry was already in
band before any damage moved.** The document was the only thing that was wrong.

Three of the prescribed changes landed with it:

– **Cooldown ceiling 12 s.** 24 abilities were over it, up to 22 s. The tail
above 8 s is compressed into the ceiling rather than clamped flat, so relative
ordering survives instead of 24 abilities becoming identical at 12. Median 12 →
9, max 22 → 12. Notably this did **not** shorten TTK: more ability uptime buys
more casting, and casting is time you are not attacking.
– **Finisher band 40–55**, ordered by commitment (windup + cooldown), not five
equal numbers.
– **The win conditions**, re-derived on a stated per-kill cycle model. FFA 40 →
45; team 75 → 150. Recorded honestly: the team number rests on an engagement
fraction that only playtest data can settle, and at the OLD cycle 40 FFA kills
was a 27-minute match, so `07_modes.md`'s "15-minute matches" was wrong before
the TTK correction as well as after it.

**What the work exposed that the diagnosis did not predict.** `fireball` at 40
damage obeyed the band's letter and broke its rationale: with no windup and a
5 s cooldown it became the highest-DPS button in the game at 7.55, in three of
four preset builds, and pushed the archer and hybrid straight out of the bottom
of the TTK band. The band is a CONVERSION ceiling — a punish after a launch —
so damage inside it has to be bought with commitment. Its cooldown is 8.5,
matching `marksman_shot`'s DPS at the same damage tier, and a test now asserts
the ordering: a finisher that hits harder must commit more.

**D2 · `01_combat_fundamentals.md:15-29`** — _"Real window: 20-30 seconds"_ plus
_"Long TTK is deliberate"_ and its four justifications. This is the document the
code cites as authority. Its own supporting figure is also wrong: line 20 says
_"Sword M1 at 17.5 DPS"_; the constants give **15.0** ((5+5+8)/3 ÷ 0.4 s).

**D3 · `07_modes.md:109-111`** — _"Kill counts are high (75 / 40) on purpose — with
TTK 20-30s, this creates 15-minute matches."_ Both win conditions were sized on the
fiction and must be re-derived against 6–9 s.

**D4 · `GameRoom.ts:1890` — `void airborneSec`**, with the comment at `:1883-1889`
stating the discard as intent. All nine launchers resolve to one fixed
`uppercutBallisticAirtimeSec()` = 0.800 s, 2.00 m apex. The registry authors 0.35 /
0.5 / 0.65 at `registry.ts:96, 142, 515, 538, 711, 768, 842, 980, 1114` and none of
it reaches the physics. **This is the defect the owner named in his own words.**
Contradicts §7.3.

**D5 · `GameRoom.ts:1874-1876` and `:1880-1881`** — `vel.y = uppercutInitialVy();
vel.x = 0; vel.z = 0` and `player.vx = 0; player.vz = 0`. A launch **deletes** the
victim's momentum instead of adding to it. Contradicts §7.1 and, more seriously,
contradicts a **locked rule**: `01_arena_fps_air_contract.md:38`, _"external impulse
and self impulse are explicit velocity events."_

**D6 · `constants/weapons.ts:34`** — _"Lateral velocity is zeroed by the knockup;
only vertical impulse matters."_ States the anti-Quake behaviour as design intent,
so anyone fixing D5 will read this and revert.

**D7 · `GameRoom.ts:1859-1871`** — `knockbackDistance` applied as a one-tick
position teleport through `resolveAbilityDisplacement`. Two sibling paths do the
same and must converge on the impulse model: `GameRoom.ts:1103-1111`
(`spellImpactPushDistance`, 0.16 m zones / 0.1 m DoTs) and
`ProjectileSystem.ts:409-443` (0.4–0.5 m on direct hits). Three separate
displacement systems, all position-snap, none predictable by reconciliation.

**D8 · Air steering is unbounded while launched** — `AIR_ACCEL_COEF = 1.0`
(`world.ts:60`) × `MOVE_SPEED_MPS = 9.0`, applied from the standstill D5 creates.
Drift `4.5·T²` = 2.88 m today and 6.48 m at a 1.2 s airtime: **a heavier launch
would make the target harder to hit.** Contradicts §7.4, and blocks D4 from
shipping alone.

**D9 · The soft-lock cone contradicts the free-aim pillar** —
`AbilityEngine.ts:862`: `aimRadius = PLAYER_CAPSULE_HEIGHT_M * 0.25 + along *
tan(π/18)` = 0.45 + along × 0.1763. That is a **3.09 m lateral capture at 15 m**
and 2.21 m at 10 m, nearest-first, on **32 of 53 abilities**. Against
`00_vision.md`: _"Free aim, no lock-on. You hit what you point at and you miss what
you do not. No target lock, no auto-aim, no dice."_ And `00_pillars.md`: _"No
auto-aim, no aim assist… Aim assist undermines the meritocracy pillar."_
Resolution in §3.5, and it ships **last** — tightening the cone before the airborne
work makes the launch loop strictly worse, because the cone measures lateral offset
in 3D and a 2 m apex is currently captured for free.

**SHIPPED 2026-08-13, last, after the airborne work.** The delivery class is
**derived, not authored**: a projectile makes it a BOLT, melee reach makes it a
CONE, everything else is a RAY. That matters more than it sounds — a 53-entry
table would have to be kept in sync with the registry by hand, and an ability
added without an entry would quietly have no class.

| Class | Abilities                               | Half-angle | Capture                                                        |
| ----- | --------------------------------------- | ---------- | -------------------------------------------------------------- |
| CONE  | 3 (uppercut, bleed_strike, guard_break) | 10°        | 0.89 m at 2.5 m — one body, which is what a swing should catch |
| RAY   | 19 instant ranged                       | 3°         | 0.97 m at 10 m, 1.24 m at 15 m                                 |
| BOLT  | 10 with real projectiles                | none       | 0.45 m flat: the projectile IS the aim test                    |

Measured in the live client, not asserted: the preview reads the same function
as the hit test, so `tools/verify/aimpreview.mjs` now prints the drawn capture
radius per ability. `chain_bolt` at 15 m reads **1.24 m** where it captured
3.09 m; `eruption` and `frost_pillar` read **0.97 m** where they captured
2.21 m; `fireball` and `frost_bolt` read **0.45 m**.

**Not done, and deliberately:** the BOLT half of §3.5 — converting the ranged
launchers from instant to real projectiles you have to lead — needs two engine
capabilities that do not exist (`at: 'onLand'` effects on a projectile-bearing
ability are skipped at cast and never resolved; `ProjectileSystem` has no
knockup path at impact). Those are additive and safe; the retune that follows
them is not, and it belongs after the owner has played the tightened cone.

Seven RAY abilities exceed §3.5's intended 10 m ceiling (`ignite`,
`freeze_target`, `chain_bolt`, `arc_lift`, `curse_of_weakness`, `life_drain` at
12-15 m, `ping_mark` at 30 m). Their ranges were left alone: the aim tolerance
is the D9 fix, and shortening ranges is a balance change with no measurement
behind it yet.

### Tier 2 — makes the signature mechanic unreadable, unfair, or untrue

**D10 · `airborneUntilTick` is never cleared on landing** — set in
`GameRoom.ts:1892`, cleared only at `:1120` (death) and `:1257` (respawn). The 2.8 s
immunity outruns the physics, and `GameRoom.ts:1013-1014` flags `airPunish` across
the whole _declared_ window, so the doubled hitstop (`client/game/hitstop.ts:39,48`)
and the "✈ AIR" nameplate fire **on a grounded body**. Fix before D4 or the new
airtimes inherit the bug.

**D11 · The telegraph fires for one ability out of 53** —
`AbilityEngine.ts:137-145` broadcasts only inside `if (def.windupSec > 0)`, and of
the 13 windup abilities **only `meteor` has an area radius**, so the branch that
looks like it works, works once. Meanwhile 14 windup-0 abilities _do_ have an area
and no victim ever sees their shape: `eruption` (2.4 m), `thunder_clap` (3.2 m),
`whirlwind` (4 m), and eleven more. Contradicts §3.4.
Two bugs block the fix and must land in the same change:
– `abilityAreaRadius` (`server/sim/cast-telegraph.ts:9-16`) reads only top-level
`e.radius`, so `whirlwind`'s radius 4 inside `channel.perTick` computes **0** and
no channel AoE can ever be telegraphed;
– `client/render/cast-telegraph.ts:50` does `group.position.set(msg.pos.x, 0.03,
  msg.pos.z)` — **`msg.pos.y` is discarded** and the ring always draws at floor
level, while `insideAoe` measures from `center.y`, which for `forward` targeting
is the victim's mid-capsule height. Harmless today because the only telegraphed
ability is ground-targeted; the moment forward and self AoEs are telegraphed on
the maps' 2–3 m boxes, the circle draws on the floor while the hitbox resolves at
chest height. That is exactly the "I was clearly outside that" failure the rule
of one shape exists to prevent.

**SHIPPED 2026-08-13.** One telegraph path instead of two. A committed cast
publishes its shape for the whole charge; an instant publishes the same shape AT
resolution and holds it 220 ms. The after-image costs the victim nothing in the
moment — they are already hit — and turns a death into a lesson about a shape.
Both blockers died in the same change: `abilityAreaRadius` now reads nested
`perTick.radius`, and the client uses `msg.pos.y`.

**D12 · 46 of 53 abilities show nothing before commit** —
`client/render/placement-preview.ts:143` returns `undefined` unless
`def.targeting === 'point'`, and `client/src/loadout-station.ts:175-178`
(`isDirectCast`) routes everything that is not `'point'` straight to a blind cast.
The split is 7 `point` / 32 `forward` / 14 `self`. The machinery is built and good —
`placementFootprint` already sizes from real effect radii — it is simply gated off
for 87 % of the roster. Contradicts §3.2 and §3.4.
Includes the 8 move abilities, which have **no preview of any kind**: `gap_closer`,
`rending_dash`, `disengage_shot`, `fire_blink`, `lightning_dash`, `vine_dash`,
`quick_dash`, `hunters_flow`. `disengage_shot` is `distance: -3` **plus** a forward
projectile — two opposite directions, previewed as nothing. Blocker for the GHOST:
`isCapsuleBlocked2D` lives at `server/src/sim/combat-geometry.ts:43`, **server-only**,
and must move to `shared` first; it is a pure function over AABBs and the client
already loads the same map, so after the move the ghost can be exact rather than
approximate.

**SHIPPED 2026-08-13.** The shape is a value now: `shared/abilities/aim.ts`
turns an AbilityDef plus an aim into a list of AimShapes — lane, disc, wall,
dash — and both sides read it, so the preview and the hitbox are the same
numbers rather than two formulas that agree today. `isCapsuleBlocked2D` moved to
`shared/sim/collision.ts`, so the dash ghost samples the same 0.25 m steps the
body will and stands exactly where it will stop.

Three things the work changed that the diagnosis had not anticipated:

– **`isDirectCast` is gone entirely**, from the dispatcher and from the loadout
station. It named a concept — "this ability casts blind" — that no longer
exists. Press shows the shape, release commits it, for all 53. A tap is still a
tap, and the cast now carries the aim you had on RELEASE, so what you saw is
what you threw.
– **`hunters_flow` is `targeting: 'self'` and dashes 3 m.** Keying the ghost off
the targeting mode would have left it, and anything like it, with no preview —
the same class of assumption that caused the original bug. The dash shape is
solved independently of targeting.
– **The first lane drawing was correct and unusable.** It painted the lane's real
volume, a tapered tube from the muzzle; the muzzle is the camera, so it was a
30 m cone seen from its apex, filling ~60° of screen. The width moved to a ring
at the impact point, where it is small and where you are already looking.

Proven rendered, not just tested: `tools/verify/aimpreview.mjs` holds each
hotbar key and reads both the solver's output and the framebuffer. 8/8 for the
mage and 8/8 for the hybrid, including all three dash types, with every lane
endpoint projecting to NDC (0.000, 0.000) — the crosshair.

That harness cost five wrong runs first, and the reason is worth keeping: under
SwiftShader the render loop runs at **1-4 fps**, so waiting 220 ms waits for
roughly zero frames. The harness was reading a preview that had not been
computed yet and reporting a working feature as broken. It now waits on a frame
counter. **Never sample this renderer on a clock.**

**D13 · `RESPAWN_SEC = 5`** — `constants/weapons.ts:42`, used `GameRoom.ts:135`.
Three times Quake's, a fixed wait, no fire-to-respawn. Contradicts §4. Zero build
surface, zero balance surface — this can ship alone, today.

**D14 · `JUMP_COST_STAMINA = 10`** — `constants/stats.ts:36`, gated at
`controller.ts:143`. **Below 10 stamina the character cannot jump.** Movement gated
on a combat resource, in the game whose second pillar is _"Movement is the skill
ceiling."_ Contradicts §6.1.

**D15 · `SWORD_M1_COST_STAMINA = 8`** — `constants/weapons.ts:14`. 20 stamina/s
against `STAMINA_REGEN_PER_SEC_MOVING = 5` on a 150 pool, while the Tank's own
preset abilities amortise to ~18.65 stamina/s and a parry tap costs 20. **The Tank
runs dry in about 4.5 s — shorter than the TTK.** With `STAFF_M1_MANA_COST = 2`
(`weapons.ts:85`) and a free bow, that is three weapons with three incompatible
economies. Contradicts §6.1 and §6.3.

**D16 · `06_loadout_build.md:23`** — _"There are no passive systems, extra slots, or
fixed resource-transfer slots."_ Directly forbids specialisations, which
`00_vision.md` calls part of what the game **is**. Contradicts §8 and
non-negotiable 1.2. The older line goes.

**SHIPPED 2026-08-13.** The blanket ban on passives is gone; the bans on extra
ability slots and resource-transfer slots stand, because those were never the
problem.

**D17 · Specialisations have zero implementation** — `specializ|specialis|talent|
perk|rune|augment` across `packages/` returns nothing but an unrelated identifier
and a stale build artefact. One third of the stated soul of the game has no code,
no schema and no doc. And `packages/shared/dist/constants/mastery.d.ts` proves the
layer was built once over an 11-slot loadout and deleted (`6a7839a`) — understand
that before rebuilding it, and delete the artefact either way.

**SHIPPED 2026-08-13**, and understanding the deleted one first is what shaped
it. Mastery activated when 4 of your 5 magic slots shared an element. It died
because it was **inferred, not chosen**: a player never picked a Mastery, they
discovered they had one — or discovered they had lost it by taking the spell they
wanted. It did not express a decision, it taxed you for mixing elements. So the
first rule of the replacement is that it is PICKED, in the Forge, next to the
class cards, and derived from nothing.

Twelve specialisations, four archetypes, three per class, each one bonus and one
cost with both on the card face. Validated server-side like the rest of the
build and rejected with a reason rather than silently dropped, because a build
that is quietly corrected is a build the player finds out about in the arena.

**None of them touches damage, and the constraint improved the design.** D1's
band test runs against the base registry, so a +15 % damage specialisation would
have slipped past it and pushed the archer out of the bottom of the 6-9 s band —
undoing step 9 invisibly. What is left is better anyway: knockup airtime,
cooldowns, move speed, max HP. "Your launches hang 25 % longer" is a more
interesting decision than "+15 % damage", and it points at the game's own
signature moment instead of away from it.

Two implementation notes worth keeping. The airtime multiplier is read from the
CASTER, not the victim — "your launches hang longer" is a property of who cast.
And the speed modifier folds into `slowFraction` through one shared function
that the server runs for authority and the client runs for prediction: two
copies of that line is a permanent rubber-band waiting for the day one of them
is edited.

Proven end to end by `tools/verify/spec.mjs`, which opens the Forge, reads the
cards, picks one, starts a match and compares the HP **the server gave** against
`maxHpForBuild` — 168 for a Baluardo mage, against a 150 base. A specialisation
that only exists in a registry is not a feature.

The stale `dist/constants/mastery.*` artefact is deleted.

### Tier 3 — contradicts a pillar in a smaller way, or is documented drift

**D18 · `AIR_SPEED_CAP_MPS = 11.7`** — `world.ts:62`. 1.30× the 9 m/s base, so the
entire movement skill ceiling is +30 %; Quake's is unbounded and defrag runs reach
5×+. It is also a **hard per-tick rescale** (`controller.ts:132-138`) that scrubs
any knockback impulse on the frame it lands (see §7.1). Raise to a **hard 14–15
(≈1.6×) that can be measured**; do **not** ship the widely-circulated "soft cap at
18 bleeding 2 m/s per second" — simulated, it does not converge (20.59 m/s at 5
hops, 31.03 at 20 and still climbing; the required bleed is ~4.5 m/s²).

**SHIPPED 2026-08-13 at 14.5 (1.61×), after D20.** Measured, not chosen:
simulating the real controller through chained strafe jumps reaches 14.50
exactly on the fifth hop at a tight turn rate, and 11.06 at a sloppy one — so
technique is now worth **+3.44 m/s**, where at 11.7 the sloppy rate already
saturated the cap and there was nothing above "adequate" to aim at. Four tests
lock all three properties: reachable, never exceeded at any turn rate, and
strictly better for a tighter turn. The knockback window still passes an impulse
through at 2× the cap. `tools/verify/feel.mjs` prints the whole profile.

**D19 · Friction ordering, and no jump buffer** — `controller.ts:88-138` runs
friction-then-accelerate first and the jump block is section 2 at `:139-152`, so
friction is applied on the landing tick before the jump can fire: **13.33 % lost per
landing tick** (`GROUND_FRICTION 8 × 1/60`) against Quake's 4.8 %, because Q3's
`PM_WalkMove` calls `PM_CheckJump` and returns into `PM_AirMove` **before** reaching
`PM_Friction`. And there is no jump input buffer, so a jump pressed 1–2 ticks before
touchdown is dropped — although `COYOTE_TICKS = 5` (`world.ts:75`) already exists
for the symmetric leaving-ground case. Roughly five lines, and it is the
prerequisite for D18: raising a cap the player cannot reach changes nothing.
**Worth stating, because it is the strongest argument in the movement set:** the
acceleration rate and the hang time are **already Quake-equivalent** — 1.0 × 9 =
9.0 m/s² against Q3's 8.13, and a 1.5 m jump at g = 25 is 0.693 s against Q3's
0.675 s. The cap and the friction ordering are literally the only two things
standing between this controller and Quake movement.

**D20 · The arena has no bounds** — no perimeter boxes in `DUEL_BOXES` or `G_BOXES`
(`shared/src/sim/map.ts:71, 117`), no position clamp anywhere in `GameRoom.ts`,
`groundY` an infinite plane. At 11.7 m/s a player can already run to infinity;
**this is a hard blocker for D18.** Related: `LAG_COMP_MAX_COMPENSATE_MS = 200`
(`weapons.ts:48`) is 6.2 m of rewind at 31 m/s in a 28.6 m arena — 22 % of map
length — so top speed and hit registration are coupled and neither can be raised in
isolation.

**SHIPPED 2026-08-13.** The arena is a CIRCLE, so the boundary is a radius, not
four AABB walls — a square perimeter would either cut the corners off the sand
or let you stand outside the barrier wall on the diagonals.
`ARENA_BOUNDS_RADIUS_M = 24.5` is derived from the art (shell scale 1.5 × inner
wall r 16.7 = 25.05; sand ends at 24.75), because a boundary the player cannot
see feels like a bug. Only the OUTWARD velocity component is removed, so you run
along the wall instead of sticking to it.

**Giving the arena an edge exposed a defect it had been hiding.** The FFA layout
did not fit inside its own building: at `FFA_SPREAD = 1.45` the corner platforms
reached r = 27.4 — hanging over the void past the sand — and four of the ten
spawns sat at r = 24.6 to 28.7, i.e. players spawning outside the coliseum. Two
changes, both reversible and both flagged as spacing decisions the owner owns:
the spread is 1.27 (the largest value whose furthest geometry still fits), and
the spawns are placed on a RING by angle and radius instead of ten hand-written
coordinates with no rule. A test now asserts, per map, that every spawn and
every box corner is inside the declared bound.

Proven end to end, not just in a unit test: `tools/verify/bounds.mjs` joins a
real match and holds a direction for 12 s — over four arena radii — in all four
directions. Both reachable directions stop at exactly 24.10 m, and the
client-predicted position equals the server's to the centimetre. That equality
is the actual claim: a boundary the client does not predict is not a wall, it is
a rubber-band, and the two photograph identically.

**D21 · The speed cue is clipped below the interesting range** —
`client/src/main.ts:2380`: `camFovBase + Math.min(horizSpeed * 1.4, 6)` **saturates
at 4.29 m/s**, so 4.3, 9.0 and 11.7 m/s all render at exactly 96°. Every
metre-per-second the player can actually earn is visually identical, and there is
no strafe roll, no landing view kick and no speed streaks anywhere in the client.
Default FOV is 90 (`index.html:438`; the 60–120 slider range is fine, the default is
not). Remap the cue to start where skill starts — `clamp((v−9)/9, 0, 1) × 14` — and
raise the default to 100. Pure client, zero desync risk, and without it D18 and D19
are invisible improvements.
_Correction to a figure in circulation:_ 110° reads about **1.43×** as fast as 90°
(`tan 55° / tan 45°`), not 1.6×. And the camera-shake setting defaults to **100, i.e.
fully on** (`index.html:473`) — anything gated "the way shake is" ships on, which is
the opposite of an accessibility guarantee.

**D22 · The tournament mode does not exist** — `07_modes.md` lists Team Battle 5v5,
1v1 Ranked BO5, FFA 10 and Training. `00_vision.md` names
tournament-until-one-remains as one of three modes that **stay**. Contradicts
non-negotiable 1.3. Everything else about how the mode should be balanced is
speculation until the mode exists; the one design question worth carrying now is
what it inherits from FFA-10's 40-kill, 3-second-respawn economy — which is the
exact opposite of an economy where a won fight costs something.
Adjacent, and real: a four-defensive-pick build is legal today. (The commonly-cited
`barrier + brace_recovery + cleanse_surge + phase_shift` is **not** — all four are
`utility` and no class has four utility slots — but `survival` and `counter` also
live outside utility, so a Mago can legally field `arcane_rebind + phase_shift +
dark_barrier + healing_totem` and a Tank `brace_recovery + barrier + phase_shift +
disengage_shot`.) A cap of **one** `survival`/`counter` pick among the four in hand
is the right instrument in tournament.

**SHIPPED 2026-08-13.** The mode is three rules: no respawn, the match ends when
one is left, and the clock falls to the healthiest survivor (an exact tie has no
winner rather than an arbitrary one). Everything else about tournament balance
stays speculation until it is played, which is why the implementation is
deliberately small.

The carried design question is answered: it inherits **none** of FFA's economy.
`respawnTickFor` returns 0 for tournament, so `alive` stays false for good.

The defensive cap is in, counting ROLES rather than slots — the stall build the
diagnosis names is spread across `magicAdvanced` and `utility` precisely to slip
past a slot rule. It has a consequence worth stating: every build must carry a
Recovery and every Recovery is `survival`, so **in tournament your Recovery is
your one defensive pick** and everything else has to fight.

Two things the live run found that no unit test could:

– **The lobby never started.** `botFillTarget` returns 0 unless the client asks
for a fill, and the client's list of modes that ask was a hand-written `||`
chain that did not include tournament. 40 samples, all in `lobby`. The mode set
is shared now, so client and server cannot disagree about it again.
– **A real crash in the particle system**, unrelated to this mode and live for
anyone whose ability element is `'none'`: `element as SpellStyle` let a non-style
through, `STYLE_RGB['none']` is undefined, and `const [r, g, b] = undefined`
throws on every impact burst. Five separate casts made the same unchecked
promise; there is one resolver now and no casts.

Proven by `tools/verify/tournament.mjs`, which watches the whole lobby rather
than the probe: 8 players, alive 7 → 4 over the match, **never up**. The first
version depended on a bot choosing to kill the probe and reported
"inconclusive" half the time — a harness whose verdict is a coin flip proves
nothing.

**D23 · Class mechanics are drawn on the caster and nowhere on the enemy** —
`client/src/hud/class-mechanic.ts` renders all four (Fury pips with a surge flag,
Momentum bar with its threshold notch, Risonanza sigil, Flow pips), with tests. But
`client/render/remote-players.ts` and `remote-nameplate.ts` render **no** mechanic
state at all, so nothing about an opponent's class is legible from their body.
Contradicts §3 and pillar 2 (_"legible in the fight, to both players"_).
_Correction to a widely-repeated claim:_ these are **not** invisible to their owner.
That was true before commit `04bbfda` and is not true now.

**D24 · Doc-vs-registry drift on two abilities** —
`05_abilities_bow.md:41-48` specifies _"B3 Pin Shot [KNOCKUP] — launches target
airborne for 0.5 s, Damage 15"_; `registry.ts:237-259` ships 14 damage plus a 2.8 s
root and **no knockup**. `05_abilities_magic.md:113` describes Thunder Clap as
_"20 damage + 0.5 s stun"_ with no knockup; the registry ships 16 damage, a **1.8 s**
stun and a 0.35 s knockup. Reconcile to whatever ships, in both directions.

**D25 · Ranged launchers are locked behind two classes** — `eruption`,
`frost_pillar`, `arc_lift`, `void_spike` and `root_upthrow` are **all
`magicAdvanced`** (`constants/classes.ts:303-317`), so only Mago (3 slots) and
Ibrido (1) can take one. The Tank's launchers are melee-range and the Arciere's only
access is `thunder_clap`, a self-centred 3.2 m shockwave — it must abandon its class
identity to launch. Two of four classes have no launcher at their own range, in the
game whose fifth differentiator is launch-then-punish.

**D26 · The elements ship the same launcher five times** — `eruption`,
`frost_pillar`, `arc_lift`, `void_spike`, `root_upthrow` are 10–15 m, 30 mana,
12–14 s, all `comboRole: 'starter'`, all resolving to the same 0.80 s / 2.00 m arc,
and **none applies its own element's status** — eruption does not burn, frost_pillar
does not chill. Elemental identity today is the damage tag and the VFX colour. §7.3
gives them different weights; they still need different verbs (multi-target vs
lowest-arc-but-guaranteed vs longest-reach vs escape-denial vs heavyweight).

### Tier 4 — dead code, and one process blocker

**D27 · `airPolicy` is dead** — declared at `shared/src/abilities/types.ts:225` and
set by **zero** abilities, so the airborne gate at
`server/src/sim/cast-validation.ts:38` never fires. Any design that assumes launched
players are restricted from casting is assuming something the engine does not do.

**D28 · `momentumTicks` is dead and costs bandwidth every tick** —
`controller.ts:80` hard-sets it to 0 on every tick, yet it is declared in
`PlayerSimState` (`sim/types.ts:37`), replicated in the Colyseus schema
(`schema/Player.ts:120`) and diffed every tick (`GameRoom.ts:920-921`). It is always
zero.

**D29 · `01_controls.md:102` vs `00_pillars.md`** — the controls doc says flatly
_"No default iframe roll"_; the pillars, rewritten later, softened it to _"No default
iframe roll **as the whole defense model**"_ and added _"parry/shield must be visible
when it protects."_ The air tech in §7.5 is legal under the pillars and illegal under
the older absolute. The controls doc follows the pillars.
Same document, `01_controls.md:51`: the 10 % movement slow while a wheel is open is
**specced and not implemented** — no wheel-related movement multiplier exists
anywhere in the codebase. "Keep it" is actually "build it."

**D30 · The file-budget ratchet blocks additive work on day one** —
`tools/check-file-budget.mjs` grandfathers `GameRoom.ts` at **1927**,
`AbilityEngine.ts` at **906** and `registry.ts` at **1508** — their exact current
sizes — and they may only **shrink**. `pnpm check` and CI fail on a single net added
line. Almost everything in §7 touches `GameRoom.ts` and `AbilityEngine.ts`, and §3.5
and §7.3 touch `registry.ts`. **Sequencing must be extract-then-change, never
append.** This is not a rule to weaken; it is a constraint to plan around.

---

## 10 · Order of work

Each step unlocks the next. Shipping several of these alone makes the game worse,
which is stated where it applies.

1. **D13** — respawn 5 → 1.5 s. Standalone, zero surface, ship it first.
2. **D19** — friction ordering + jump buffer. ~5 lines. Prerequisite for D18.
3. **D21** — the FOV remap. Pure client, no desync risk; without it steps 2 and 8
   are invisible.
4. **D5 + D7 + D2/D6 comments** — the launch becomes an additive impulse. Fixes a
   locked-rule violation _and_ removes a per-launch prediction correction.
5. **D10** — clear `airborneUntilTick` on landing. Must precede D4.
6. **D4 + D8** — per-ability airtime and the air-control cap, together, plus the
   `victimWasAirborne` window and the punish-window invariant test.
7. ~~**D11 + D12**~~ — **DONE 2026-08-13.** The telegraph for windup-0 areas, and
   the aim solver for `forward` and move abilities. The owner's central ask made
   real: every ability draws where it goes and what it does, `isDirectCast` is
   retired, and the shape lives in `shared` so it cannot drift from the hitbox.
8. ~~**D18**~~ — **DONE 2026-08-13**, with **D20** (bounds) shipped first as its
   prerequisite. The air cap is 14.5 (1.61×), measured: reachable on the fifth
   strafe hop, never exceeded, and worth +3.44 m/s over a sloppy turn.
9. ~~**D1/D2/D3 + the finisher band**~~ — **DONE 2026-08-13.** The band is 6–9 s
   and enforced by a measurement, not a comment; 37 cooldowns compressed under a
   12 s ceiling; the five finishers banded by commitment; the win conditions
   re-derived. All four classes measure inside the band.
10. ~~**D16 + D17**~~ — **DONE 2026-08-13.** The passive-systems ban is retired and
    the specialisation layer is live: twelve picks, four archetypes, validated
    server-side, applied to airtime / cooldowns / speed / HP, and visible in the
    Forge. The third of the three things the owner says the game IS.
11. ~~**D22**~~ — **DONE 2026-08-13.** Torneo: no respawn, last one standing, one
    defensive pick. The third of the three modes `00_vision.md` says stay.
12. ~~**D9 + D3.5**~~ — **the cone is tightened (DONE 2026-08-13)**; the BOLT
    conversion is not, because it needs two engine capabilities that do not
    exist and a retune that should follow a playtest, not precede one.
