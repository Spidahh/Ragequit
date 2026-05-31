# Visual Performance Contract

This file records the UI/VFX rules that keep RAGEQUIT readable and browser-friendly.

Every visual rule serves a class-aware active arena FPS cockpit. Keep aim,
projectiles and enemy silhouettes dominant.

## CSS / HUD

- Animate `transform` and `opacity` first. Avoid long-running animations on `filter`,
  `border-color`, `box-shadow`, or large backdrop blurs.
- Keep HUD panel blur subtle. Heavy blur over the full game canvas is expensive and
  makes fast combat harder to read.
- Resource bars are flat rectangular bars. Draggable and resizable; never skewed.
- Central combat indicators must stay small and stable: crosshair, parry ring, bow
  charge, cast bar, GCD.
- Nameplate positioning: always via `transform: translate3d()` — never `left`/`top`.
  Changing layout properties triggers full layout reflow every frame.

## Materials

- `MeshToonMaterial` for characters, weapons, blockout geometry, and arena props.
- `MeshStandardMaterial` for first-person weapons only (responds to fpvKeyLight for depth).
- `MeshBasicMaterial` for placement previews and short-lived VFX that don't need lighting.
- Zone walls, projectile VFX, zone floors/domes: `MeshBasicMaterial` with bloom layer.
- Never use `MeshPhongMaterial` or `MeshLambertMaterial` — inconsistent with toon look.

## VFX Textures

- All textures in `public/vfx/` must be RGBA **white-on-transparent**.
- The system uses `instanceColor` tinting (additive blend) — any dark background or
  colored pixels will produce black outlines or incorrect tints.
- `colorSpace`: always `THREE.NoColorSpace` for VFX textures (they are alpha masks,
  not color data).
- `premultiplyAlpha`: false for VFX textures.

## Post-Processing Bloom

- Use Three.js layer system: layer 0 = normal, layer 1 = bloom-eligible.
- Enable layer 1 only on: sigil, border ring, zone VFX meshes, cast rings, torches,
  impact pool meshes, death burst, and other emissive/glowing objects.
- DO NOT enable layer 1 on regular geometry, character meshes, or nameplates.
- Bloom pass: strength 0.45, radius 0.55, threshold 0.75 (only bright emissive glows).
- During hit-stop the bloom pass is skipped (renderer.render used instead) for perf.

## Lighting

- Scene lights: HemisphereLight (sky/ground), DirectionalLight (key, shadow), 2x
  DirectionalLight (rim + fill), PointLight (ground bounce), PointLight (player follow).
- FPV only: `fpvKeyLight` (PointLight inside camera group) for weapon depth.
- Arena only: 4x PointLight torch lights (flicker animation, no shadow casting).
- Torch lights and fpvKeyLight do NOT cast shadows (performance).
- Shadow map: DirectionalLight only, 2048x2048 PCF soft.
- Do not add shadow-casting lights without explicit performance budget approval.

## LOD (Level of Detail)

- Remote players beyond 40m: model hidden, nameplate and status update only.
- Remote players 20-40m: `castShadow = false` on all child meshes.
- Remote players under 20m: full quality.
- Implement LOD in `renderFrame()` before the interpolation/animation block.

## Asset Direction

- Low-poly stylized with clean silhouettes (toon shader).
- Environment colors muted; element VFX carry the saturated color language.
- Arena props: KayKit Dungeon + Fantasy Props MegaKit (cel-shaded, outlined).
- Arena sky: gradient shader (dark zenith to lighter horizon), NOT a skybox texture.
- Use `DynamicDrawUsage` on BufferAttributes updated every frame (dust particles).
- Use instancing for repeated scenery when profiling shows measurable cost.

## Audio

- All BufferSource nodes must call `this._pitch(src)` before `.start()` to avoid
  machine-gun repetition (pitch variance +/-8%).
- Remote player sounds (hits, casts) use `PannerNode` (HRTF spatial model).
- Call `soundEngine.updateListener(x, y, z, yaw)` every render frame.
- Low-HP heartbeat: procedural lub-dub below 25% HP, interval proportional to danger.
