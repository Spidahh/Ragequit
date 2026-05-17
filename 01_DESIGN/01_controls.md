---
id: controls
title: Input & Controls
section: combat
tags: [input, wheels, binds, mouse, keyboard]
provides: [wheel_Q, wheel_E, M1, M2, custom_binds, auto_swap]
deps: []
status: final
---

# Input & Controls

## Mouse

| Button     | Action                                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| M1 (left)  | Basic attack of currently equipped weapon, unless a wheel-selected ability is primed. If primed, M1 fires that ability toward the current crosshair. |
| M2 (right) | Parry. Tap = 0.5s block window. Hold = continuous block while stamina holds out. See `01_combat_fundamentals.md`.                           |
| Scroll     | Cycle equipped weapon                                                                                                                       |

## Keyboard — core

| Key      | Action                                                       |
| -------- | ------------------------------------------------------------ |
| WASD     | Movement (sprint is always on — no Shift)                    |
| Space    | Jump (tap = short, hold = higher)                            |
| Q (hold) | Open **Utility Wheel** — fixed transfers Z/X/F + flex utility V |
| E (hold) | Open **Ability Wheel** — melee, bow, and 5 magic abilities       |
| Tab      | Cycle equipped weapon (rebindable)                           |
| Escape   | Menu                                                         |

## Wheels — interaction model

- Wheel opens when the key is pressed and closes on release
- Mouse direction selects the sector; releasing the key primes that action
- M1 fires the primed ability toward the current crosshair and then clears the prime
- Direct hotkeys (`R`, `G`, `1-5`, `Z/X/F/V`) bypass the wheel prime step. Instant abilities cast immediately; placement abilities show their preview and confirm with M1.
- Movement is not blocked while holding Q/E (slight slow during hold for readability)
- The game does NOT pause while a wheel is open — server clock keeps running. Visual UI dims the world for focus.
- This is a hard input contract: there are always two wheels, one for utilities/transfers and one for spells/combat abilities. Do not collapse them into direct hotkeys only.

## Direct Binds

The current default direct binds mirror the 11-slot loadout:

| Key | Slot |
| --- | --- |
| R | melee ability |
| G | bow ability |
| 1-5 | five magic abilities |
| Z/X/F | fixed transfers |
| V | flex utility |

Custom rebinds are live in the Settings menu and persist locally. Any ability slot can be remapped to a free key; if a chosen key is already used, the two actions swap bindings instead of creating duplicates.

### Auto-swap on direct ability use

If the ability belongs to a **different weapon** than the one currently equipped, pressing the direct bind performs two atomic actions in the same input frame for instant casts, or before opening the placement preview for preview casts:

1. Switch weapon to the ability's required weapon
2. Cast the ability immediately, or arm its placement preview if it is not instant

**Example**: sword equipped. Press `G` for an instant bow ability -> bow is equipped and the ability casts if all server checks pass. Press a non-instant placement spell -> the preview appears first, then M1 confirms.

Rules:

- No swap penalty (no cast delay from the swap itself)
- No stamina/mana cost from the swap
- GCD applies normally to the ability cast
- If the player is mid-parry, mid-swing, charging bow, phased, airborne-locked, or mid-ability, the server rejects or delays according to the authoritative action rules

## Removed from original design

- **No dodge** — the 0.3s iframe roll from the original is gone
- **No Shift sprint** — sprint is always default; Shift is unbound

## Accessibility notes

- Rebind support is implemented locally through Settings and saved in browser storage
- Toggle-hold wheel mode is planned accessibility work
- Color-blind-friendly palette for element VFX (deuteranopia/protanopia variants)
