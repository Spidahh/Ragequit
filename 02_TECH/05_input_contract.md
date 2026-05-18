# Input Contract

This file records the current browser-game input rules so we do not regress the basic play loop.

## Arena Capture

- The in-game canvas must receive focus when entering or resuming gameplay.
- Pointer lock must be requested from a trusted user gesture: loadout confirm, pause resume, or direct canvas click.
- Main-menu launch goes through the loadout screen before the room exists. The launch CTA (`START 1V1` / `START TRAINING`) is the trusted gesture, so it must focus the canvas and request pointer lock before starting the async connect. The standalone Loadout editor still uses `SAVE BUILD`.
- Do not rely on async state callbacks, such as `matchPhase: live`, to request pointer lock. Browsers can reject that because it is no longer inside the user's gesture.
- If pointer lock is rejected, the fallback may keep keyboard and relative mouse-look active, but it is not equivalent to real pointer capture: the mouse can still leave the window.

## Match Phase

- Client gameplay input is allowed only while the local match phase is `live`.
- The client must sync phase from both `matchPhase` messages and Colyseus room state. The message can arrive before client handlers are registered.
- Training must stay `live` after deaths. If the bot can drive Training to `matchEnd`, input will correctly disable and look broken while the player is trying to test controls.
- The current main-menu 1v1 launch uses explicit bot-fill so the local duel reaches countdown/live with one human tester. If 1v1 is left with only one player in `lobby`, Tab/LMB/Space/WASD are expected to be blocked by the phase gate and will look like broken input.

## Wheel Input

- Ability and utility wheels are selectors, not launchers.
- Holding the wheel key opens the wheel; moving the mouse changes the highlighted sector; releasing the key primes the selected slot; LMB fires the primed ability.
- Direct binds still cast immediately unless the selected ability is configured for preview placement.

## Regression Checks

Before changing input, camera, loadout confirm, pause resume, or match phase:

- Enter Training from the main menu.
- Confirm loadout.
- Verify the page is `LIVE`, the active element is `CANVAS`, and pointer lock is requested during the confirm click or a later canvas click.
- Verify `Tab` swaps weapon without browser focus traversal.
- Verify `WASD`, `Space`, LMB, RMB, ability wheel, and utility wheel still respond after swapping Sword, Bow, and Staff.
