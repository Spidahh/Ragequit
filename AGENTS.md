# RAGEQUIT Agent Rules

These rules are mandatory for any AI/coding agent working on this repository.

## Read Before Editing

Before changing gameplay, UI, VFX, input, loadout, networking, or docs, read:

- `README.md`
- `ROADMAP.md`
- `01_DESIGN/README.md`
- `01_DESIGN/01_controls.md`
- `01_DESIGN/04_transmutation.md`
- `01_DESIGN/05_abilities_philosophy.md`
- `01_DESIGN/05_abilities_melee.md`
- `01_DESIGN/05_abilities_bow.md`
- `01_DESIGN/05_abilities_magic.md`
- `01_DESIGN/05_abilities_utility.md`
- `01_DESIGN/06_loadout_build.md`
- `01_DESIGN/09_visual.md`
- `02_TECH/05_input_contract.md`
- `02_TECH/06_visual_performance_contract.md`

## Non-Negotiable Game Rules

- The game is a browser PvP arena with authoritative multiplayer in mind. Do not add mechanics that only work locally or rely on client trust.
- There are no passive abilities, passive slots, runes, rune systems, or passive mechanics. Do not reintroduce them.
- Utility slots include fixed resource transfers. Keep the fixed transfers clear, always available on their intended utility keys, and visible in loadout/HUD.
- The ability wheel and utility wheel are selection palettes, not launchers:
  - Hold the wheel key to open.
  - Move the mouse to select a sector.
  - Release the wheel key to prime that ability/utility.
  - LMB fires or confirms the primed action toward the current crosshair/preview.
  - Direct hotkeys still cast immediately when intended by their cast mode.
- Placement abilities must show a preview first unless they are explicitly configured as instant cast.
- Ability descriptions must be player-facing: explain what the ability does, what state it applies, and what it costs. Do not write comparison notes, internal suggestions, or design commentary inside ability descriptions.

## Visual / UI Rules

- Follow `01_DESIGN/09_visual.md` and `02_TECH/06_visual_performance_contract.md`.
- Visual direction is low-poly stylized action with clear silhouettes and saturated element VFX.
- Use the project palette:
  - UI panel: `#0F111A` around 85% opacity
  - Accent/active: `#FFD260`
  - HP: `#FF3344`
  - Mana: `#00D0FF`
  - Stamina: `#00FF88`
  - Fire: `#FF4500`
  - Ice: `#00E5FF`
  - Lightning: `#FFE600`
  - Dark: `#6A0DAD`
  - Nature: `#39FF14`
- Resource HUD bars are flat rectangles, draggable and resizable. Do not use skew/trapezoid styling for resource bars.
- Weapon strip uses readable 60x60-style slots, clear active state, and must not overlap the hotbar.
- Avoid HTML-page-looking menus. Menus, loadout, pause, and settings must feel like game UI.
- Prefer `transform` and `opacity` animations. Avoid long-running animation of `filter`, `border-color`, heavy `box-shadow`, or large `backdrop-filter` blur.
- Use cheap materials for projectiles, previews, zone walls, and short-lived VFX. Do not add heavier lit materials unless they clearly improve gameplay readability.

## Input / Combat Safety

- Do not casually edit pointer lock, keyboard capture, mouse capture, weapon swap, LMB/RMB, wheel, or first-person aiming logic.
- If touching input, read `02_TECH/05_input_contract.md` first and verify in browser.
- Preserve first-person staff/bow/spell aiming: projectiles and previews must align with the crosshair, not spawn from above the player head.
- Combat changes must consider multiplayer authority, prediction, and server validation.

## Verification

For client/UI/combat changes, run at minimum:

- `pnpm --filter @ragequit/client test`
- `pnpm --filter @ragequit/client build`
- `pnpm lint`

When the change affects the playable browser client, also smoke test locally in the browser:

- Main menu opens with no console errors.
- Training can be entered.
- Mouse/keyboard input works after click/pointer lock.
- LMB/RMB, Tab/weapon swap, wheel keys, and hotbar still behave correctly for the touched area.
- HUD, hotbar, weapon strip, and previews do not overlap incoherently.

## Documentation

- If code changes gameplay, controls, UI contracts, ability semantics, visual rules, or architecture, update the matching docs in the same work pass.
- Do not leave docs describing old bootstrap/prototype behavior when the code already implements a later state.
- Keep local scratch notes out of commits unless they are intentionally promoted into project docs.
