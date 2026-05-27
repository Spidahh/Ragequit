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

| Key      | Action                                                         |
| -------- | -------------------------------------------------------------- |
| WASD     | Movement (sprint is always on — no Shift)                      |
| Space    | Jump (tap = short, hold = higher)                              |
| Q (hold) | Open **Utility Wheel** — utility/recovery slots from the chosen class build |
| E (hold) | Open **Weapon Wheel** — melee/bow ability slots from the chosen class build |
| Tab      | Cycle equipped weapon (rebindable)                             |
| Escape   | Menu                                                           |

## Wheels — interaction model

- Wheel opens when the key is pressed and closes on release
- Mouse direction selects the sector; releasing the key primes that action
- Releasing the wheel key primes the selected action; M1 fires the primed ability (instant → casts immediately; preview → opens placement preview and then M1 confirms)
- For placement abilities primed via wheel: the preview ground circle appears on the FIRST M1 press after priming; a SECOND M1 press confirms the cast. Releasing Q/E alone does not show the preview — it only primes.
- Direct hotkeys `1-5` are for magic slots (`magicBase`/`magicAdvanced`) only
  and bypass the wheel prime step. Instant abilities cast immediately on
  keypress; placement abilities open the preview immediately on keypress, then
  M1 confirms.
- Movement is not blocked while holding Q/E (10% speed reduction while any key is held for readability; does not prevent ability firing)
- The game does NOT pause while a wheel is open — server clock keeps running. Visual UI dims the world for focus.
- This is a hard input contract for the current wheel interaction: a wheel is a
  prime/select surface, not a direct launcher. Sector counts follow the selected
  class loadout.

## Direct Binds

The consolidated keyboard layout is:

| Key | Slot                      |
| --- | ------------------------- |
| 1-5 | equipped magic slots |
| Q   | utility wheel             |
| E   | weapon ability wheel      |
| Tab | weapon swap               |

`Z`, `X`, `F`, `V`, `R` and `G` are not bindable ability/transfer keys.

### Auto-swap on direct ability use

If a magic direct bind needs Staff and another weapon is currently equipped, pressing the direct bind performs two sequential actions:

1. Switch weapon to the ability's required weapon
2. Cast the ability immediately (instant) or open its placement preview (non-instant)

For **instant abilities** the swap and cast happen in the same server tick — imperceptible to the player. For **preview abilities** the swap completes first, then the placement preview opens; M1 confirms.

**Example**: sword equipped. Press `2` for an instant staff spell → staff is equipped and the ability casts in the same frame if all server checks pass. Press `2` for a non-instant placement spell → staff equips first, then the preview circle appears; M1 confirms placement.

- No swap penalty (no cast delay from the swap itself)
- No stamina/mana cost from the swap
- GCD applies normally to the ability cast
- Airborne legality follows `01_arena_fps_air_contract.md`: no blanket
  `airborne-locked` rejection. Only explicit ability/state rules may block an
  airborne action.

## Removed from original design

- **No default iframe roll** — evasive play comes from movement and abilities
- **No Shift sprint** — sprint is always default; Shift is unbound

## Accessibility notes

- Rebind support is implemented locally through Settings and saved in browser storage.
