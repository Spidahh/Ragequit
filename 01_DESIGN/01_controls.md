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
| 1–8      | **Direct ability binds** — one per hotbar slot, fires immediately (rebindable)       |
| Q (hold) | Open **Q Wheel** — radial alternative for slots 5–8 (see per-class assignment below) |
| E (hold) | Open **E Wheel** — radial alternative for slots 1–4 (see per-class assignment below) |
| Tab      | Cycle equipped weapon (rebindable)                                                   |
| Escape   | Menu                                                                                 |

Every one of the 8 class abilities has its own direct key (default `1`–`8`,
rebindable in Settings). The two wheels are an **alternative** radial way to fire
the same abilities — direct key and wheel sector share the same bind. Slots 1–4
are also on the E wheel, slots 5–8 on the Q wheel.

## Direct keys

- Press the slot's key (default `1`–`8`) to fire it immediately.
- Direct-cast abilities fire on keypress; point-target abilities open the
  placement preview on keypress, then M1 confirms the point.
- Pressing a direct key auto-swaps to the ability's weapon when needed (see auto-swap).

## Wheels — interaction model (alternative)

- Wheel opens when E/Q is pressed and closes on release.
- Mouse direction selects one of the 4 sectors; releasing the key primes that slot.
- M1 fires the primed ability (direct cast) or opens placement preview for point-target abilities; a second M1 confirms placement.
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

- Swap and cast happen in the same server tick for direct abilities.
- For point-target abilities, the swap completes first, then placement opens; M1 confirms.
- No swap penalty, no stamina/mana cost for the swap.
- GCD applies normally to the ability cast.
- Airborne legality follows `01_arena_fps_air_contract.md`.

## Direct Binds

| Key | Action                                  |
| --- | --------------------------------------- |
| 1–8 | Fire hotbar ability slots 1–8           |
| E   | E Wheel (radial alternative, slots 1–4) |
| Q   | Q Wheel (radial alternative, slots 5–8) |
| Tab | Weapon swap                             |

All binds above are rebindable in Settings. `Z`, `X`, `F`, `V`, `R` and `G` are not used.

## Removed from original design

- **No default iframe roll** — evasive play comes from movement and abilities
- **No Shift sprint** — sprint is always default; Shift is unbound

## Accessibility notes

- Rebind support is implemented locally through Settings and saved in browser storage.
