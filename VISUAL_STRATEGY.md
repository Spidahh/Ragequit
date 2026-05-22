# VISUAL STRATEGY

Root entrypoint for whole-game visual execution.

Canonical strategy and execution documents:

- [`01_DESIGN/15_visual_strategy.md`](01_DESIGN/15_visual_strategy.md)
- [`01_DESIGN/13_graphic_redesign_blueprint.md`](01_DESIGN/13_graphic_redesign_blueprint.md)
- [`01_DESIGN/14_visual_redesign_system.md`](01_DESIGN/14_visual_redesign_system.md)

This root document exists so visual work does not get reduced to asset shopping
or isolated CSS patches.

## Execution Order

1. Read [`GAME_GRAPHIC_AUDIT.md`](GAME_GRAPHIC_AUDIT.md) and its canonical audit.
2. Read the canonical strategy for direction, design system, performance and asset rules.
3. Execute from the blueprint for logo, menu shell, HUD, Loadout Forge, spell/VFX language and acceptance criteria.
4. Check the visual system and UI redesign plan before moving or adding HUD/menu surfaces.
5. Check the visual performance contract before changing Three.js materials, lights, projectiles, previews, zones or short-lived VFX.

## Current Visual Decision

The project direction is:

**Stylized low-poly fantasy arena combat with an arcane war-console UI.**
The visual style and aesthetic quality must strictly match the screenshots in `E:\GIOCHI\ASSET_GRAFICA\esempio` (specifically `esempio1.png`, `esempio2.png`, and `esempio3.png`).

The work is whole-game presentation work:

- logo and brand presence;
- main menu, pause, settings, scoreboard and loading shell;
- Loadout Forge hierarchy and positioning;
- live HUD and combat console;
- spell/projectile shape language by archetype and element;
- arena, character, weapon and viewmodel coherence;
- VFX readability and browser performance.

Target platform for this pass: **desktop browser**.

## Non-Negotiable Visual Rules

- **Strict Aesthetic Alignment**: The game's graphics, materials, scene lighting, and UI styling must strictly match the style and quality of the visual screenshots in `E:\GIOCHI\ASSET_GRAFICA\esempio` (specifically [esempio1.png](file:///E:/GIOCHI/ASSET_GRAFICA/esempio/esempio1.png), [esempio2.png](file:///E:/GIOCHI/ASSET_GRAFICA/esempio/esempio2.png), and [esempio3.png](file:///E:/GIOCHI/ASSET_GRAFICA/esempio/esempio3.png)) as the absolute visual anchor. Any visual choice or asset selection must conform to this style.
- Do not treat random assets as a visual strategy.
- Do not make the live combat view read like an HTML page.
- Do not solve spell readability with color alone: use form, movement, trail,
  impact and ground/readability markers.
- Do not add center-screen persistent explanation panels.
- Keep HUD bars rectangular, draggable and resizable.
- Preserve input, loadout, wheel, placement-preview and multiplayer-authority contracts.

## Superseded Notes

`consigli.md` is not an executable visual plan. If it conflicts with this
entrypoint, the canonical documents above, `AGENTS.md`, or the visual
performance contract, ignore it.
