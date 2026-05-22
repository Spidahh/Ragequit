# Visual Performance Contract

This file records the UI/VFX rules that keep RAGEQUIT readable and browser-friendly.

Confirmed redesign note: every visual rule now serves a class-aware active arena
FPS cockpit. Whole-game menu/HUD/loadout/VFX work remains open; keep aim,
projectiles and enemy silhouettes dominant while replacing legacy transfer and
Mastery surfaces.

## CSS / HUD

- Animate `transform` and `opacity` first. Avoid long-running animations on `filter`, `border-color`, `box-shadow`, or large backdrop blurs.
- Keep HUD panel blur subtle. Heavy blur over the full game canvas is expensive and makes fast combat harder to read.
- Resource bars are flat rectangular bars. They can be dragged and resized, but they must not use skew/trapezoid styling.
- Central combat indicators must stay small and stable: crosshair, parry ring, bow charge, cast bar, GCD.

## Materials

- Use `MeshBasicMaterial` for projectiles, placement previews, zone walls, and short-lived VFX.
- Use toon/flat materials for characters, weapons, and blockout geometry.
- Use `MeshStandardMaterial` or heavier lit materials only for final assets where lighting materially improves silhouette/readability.

## Lighting

- Do not add more dynamic shadow-casting lights by default.
- Prefer baked/static lighting, simple rim/fill lights, and blob/contact shadows for combat readability.

## Asset Direction

- Target low-poly stylized action assets with clean silhouettes.
- Keep environment colors muted so element VFX carry the saturated color language.
- Repeated scenery and repeated particle meshes should use instancing when they become a measurable cost.
