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

RAGEQUIT moved off the toon pipeline (STILE.md: "~75% toward realistic" — PBR
materic, desaturated, grounded; the toon-ramp fork was explicitly rejected).

- `MeshStandardMaterial` (PBR) for the live realistic characters (Mixamo GLB —
  `render/characters.ts` keeps the model's OWN authored materials), arena
  shell/floor/props (`world/arena.ts`, `render/factories.ts`), weapons, and
  first-person viewmodels. Roughness/metalness/normal ranges: STILE.md §2.
- `MeshBasicMaterial` for placement previews and short-lived VFX that don't need lighting.
- Zone walls, projectile VFX, zone floors/domes: `MeshBasicMaterial` with bloom layer.
- Never use `MeshPhongMaterial` or `MeshLambertMaterial` — inconsistent with the PBR look.
- `MeshToonMaterial` still exists ONLY in the legacy procedural character path
  (`character.ts`) — the low-poly silhouette that renders as a placeholder
  before a class's GLB finishes loading/validating, never the live in-match
  body. Don't extend the toon path; new character work targets the GLB pipeline.
- Outline policy: rim, team-colored (`render/outlines.ts` `createOutlineMesh`),
  NOT a black toon outline. Weapons/shield carry no outline (STILE.md §6).

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

- PBR realistic-materic, desaturated and grounded (Mordhau/Vermintide/Darkfall
  reference), NOT low-poly/toon. Full spec + palette: STILE.md.
- Environment colors muted; element magic (5 hues, `ELEMENT_COLOR`) is the
  ONE deliberately saturated additive layer — that contrast IS the aesthetic.
- Arena props: KayKit Dungeon + Fantasy Props MegaKit meshes, but re-materialed
  PBR (`MeshStandardMaterial`, roughness/metalness per STILE.md §2) — not
  cel-shaded/outlined as originally authored.
- Arena sky: gradient shader (dusk zenith to warm amber horizon), NOT a skybox texture.
- Use `DynamicDrawUsage` on BufferAttributes updated every frame (dust particles,
  including their per-vertex torch-proximity color).
- Use instancing for repeated scenery when profiling shows measurable cost.

## Audio

- All BufferSource nodes must call `this._pitch(src)` before `.start()` to avoid
  machine-gun repetition (pitch variance +/-8%).
- Remote player sounds (hits, casts) use `PannerNode` (HRTF spatial model).
- Call `soundEngine.updateListener(x, y, z, yaw)` every render frame.
- Low-HP heartbeat: procedural lub-dub below 25% HP, interval proportional to danger.
