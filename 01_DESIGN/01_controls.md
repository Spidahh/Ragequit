---
id: controls
title: Input & Controls
section: combat
tags: [input, wheels, binds, mouse, keyboard]
provides: [wheel_Q, wheel_E, M1, M2, custom_binds, auto_swap]
deps: []
status: current
---

# Input & Controls

## Mouse

| Button     | Action                                                                                                                                               |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1 (left)  | Basic attack of currently equipped weapon, unless a wheel-selected ability is primed. If primed, M1 fires that ability toward the current crosshair. |
| M2 (right) | Parry. Tap = 0.5s block window. Hold = continuous block while stamina holds out. See `01_combat_fundamentals.md`.                                    |
| Scroll     | Cycle equipped weapon                                                                                                                                |

## Keyboard — core

| Key      | Action                                                                               |
| -------- | ------------------------------------------------------------------------------------ |
| WASD     | Movement (sprint is always on — no Shift)                                            |
| Space    | Jump (fixed tap-height impulse; hold adds no extra height)                           |
| 1–8      | **Ability binds** — one per hotbar slot. Press shows the shape, release casts it (rebindable) |
| Q (hold) | Open **Q Wheel** — radial alternative for slots 5–8 (see per-class assignment below) |
| E (hold) | Open **E Wheel** — radial alternative for slots 1–4 (see per-class assignment below) |
| Tab      | Cycle equipped weapon (rebindable)                                                   |
| Escape   | Menu                                                                                 |

Every one of the 8 class abilities has its own direct key (default `1`–`8`,
rebindable in Settings). The two wheels are an **alternative** radial way to fire
the same abilities — direct key and wheel sector share the same bind. Slots 1–4
are also on the E wheel, slots 5–8 on the Q wheel.

## Ability keys — press shows, release casts

One rule for all 53 abilities, no exceptions by targeting mode.

- **Press** the slot's key (default `1`–`8`): the ability's shape appears in the
  world — a lane for a forward cast, a circle for an area, a ghost body where a
  dash will land. See `01_DESIGN/00_truth.md` D12.
- **Release**: it casts, with the aim you ended up on. What you saw is what you
  threw.
- **M1** while previewing also casts. **M2 or Escape** cancels.
- A tap is still a tap. Press and release land a frame or two apart, so the cast
  leaves at the speed it always did and the shape flashes on the way out;
  holding buys aim time at the cost of your own hold.
- Pressing an ability key auto-swaps to the ability's weapon when needed (see auto-swap).

Until 2026-08-13 this was split: 7 point-target abilities opened a preview and
the other 46 fired blind on the press edge. That split is the single reason a
spell was an act of faith, and it is gone — along with the `isDirectCast`
predicate that expressed it.

## Wheels — interaction model (alternative)

- Wheel opens when E/Q is pressed and closes on release.
- Mouse direction selects one of the 4 sectors; releasing the key primes that slot.
- Selecting a sector shows that ability's shape, exactly as holding its key does; M1 then casts it.
- Releasing Q/E without selecting a sector cancels without priming.
- Movement is not blocked while holding Q/E (10% speed reduction for readability; does not prevent firing).
- The game does NOT pause while a wheel is open — server clock keeps running.

## Per-class wheel assignment

Every class has exactly 4 abilities on E and 4 on Q, covering all 8 slots with no orphaned abilities.

| Class   | E Wheel (4 slots)             | Q Wheel (4 slots)                         |
| ------- | ----------------------------- | ----------------------------------------- |
| Tank    | 4 melee                       | 1 bow + 3 utility                         |
| Arciere | 4 bow                         | 2 magicBase + 2 utility                   |
| Mago    | 3 magicBase + 1 magicAdvanced | 2 magicAdvanced + 2 utility               |
| Ibrido  | 2 melee + 1 bow + 1 magicBase | 1 magicBase + 1 magicAdvanced + 2 utility |

## Hotbar

The hotbar shows all 8 active slots, each labeled with its direct key (default
`1`–`8`). Slots 1–4 are also reachable on the E wheel, slots 5–8 on the Q wheel.
Abilities are physically grouped in labeled `SWORD`, `BOW`, `STAFF` and
`UTILITY` panels (red, green, blue and gold). The equipped weapon panel is
raised and marked `ACTIVE`; inactive weapon panels show `TAB`. Every ability
stays visible with a short name and key mid-fight.

Priming also changes the reticle by targeting grammar (`forward`, `point`,
`self`). The centre readout distinguishes selected, placement, server request,
windup, released and blocked states; a windup is never called released before
the server-side cast actually resolves.

## Weapon auto-swap

When a primed ability requires a different weapon than the currently equipped one, the server performs an automatic swap before casting:

- The swap completes while the preview is up, so the cast on release is one tick.
- No swap penalty, no stamina/mana cost for the swap.
- GCD applies normally to the ability cast.
- Airborne legality follows `01_arena_fps_air_contract.md`.

## Direct Binds

| Key | Action                                  |
| --- | --------------------------------------- |
| 1–8 | Hold to aim hotbar slots 1–8, release to cast |
| E   | E Wheel (radial alternative, slots 1–4) |
| Q   | Q Wheel (radial alternative, slots 5–8) |
| Tab | Weapon swap                             |

All binds above are rebindable in Settings. `Z`, `X`, `F`, `V`, `R` and `G` are not used.

## Removed from original design

- **No default iframe roll** — evasive play comes from movement and abilities
- **No Shift sprint** — sprint is always default; Shift is unbound

## Accessibility notes

- Rebind support is implemented locally through Settings and saved in browser storage.
