---
id: visual
title: Visual & Art Direction
section: art
tags: [style, reference, vfx, palette]
provides: [art_direction, vfx_guidelines, palette_rules]
deps: []
status: target
---

# Visual & Art Direction

> **This document is the foundational art direction statement.** For the full design system (color tokens, typography, component rules, performance strategy, and asset pipeline), use `15_visual_strategy.md` as the authoritative source. Where this document and `15_visual_strategy.md` conflict, `15_visual_strategy.md` wins — it is the most recent and complete spec.

Whole-game visual execution extends this base direction through
`../GAME_GRAPHIC_AUDIT.md`, `../VISUAL_STRATEGY.md`,
`13_graphic_redesign_blueprint.md`, `14_visual_redesign_system.md`, and
`../02_TECH/06_visual_performance_contract.md`.

The 2026-05-22 redesign confirms that the whole presentation pass is open:
menu, logo use, HUD, Loadout Station, spell/projectile language, feedback and
loading must be rebuilt as one arena-FPS system around classes. Do not preserve
old fixed-transfer or classless HUD composition just because it exists live.

## Direction

**Low-poly stylized action** — reference: **Risk of Rain 2** for readable chaos, with cleaner arena silhouettes and sharper combat UI.

### Why this direction

- Pragmatic fit with free asset sources: Kenney.nl, Quaternius, and similar libraries produce thousands of low-poly models in a coherent style
- Minimal shader work: flat/toon materials first; reserve expensive lit materials for final assets only when they add clear readability
- VFX feasible with Three.js standard particle systems — no ragdoll, no blood decal system required at launch
- Silhouette-driven: readable in 5v5 chaos
- Browser-performant: 60+ fps on mid-range hardware

## Art rules

### Geometry

- Characters: ~2000-4000 tris each (low-poly, clean silhouette)
- Weapons: ~500-1500 tris each
- Environment props: baked static meshes where possible; instanced for repetition
- No PBR textures — flat colored materials with light baked ambient occlusion

### Palette

The full token set lives in `15_visual_strategy.md § 4 Design system`. Key values (in sync with that document):

- Background deep: `#080B12`
- UI panels: `rgba(15, 17, 26, 0.85)` (≈ `#0F111A` at 85% opacity)
- Environment stone (cold/dark): `#263142` → `#34455C` → `#52667E`
- Metal dark: `#171C25`
- Accent / active selection: `#FFD260`
- HUD resources: HP `#FF3344`, Mana `#00D0FF`, Stamina `#00FF88`
- Character outfits: mid-saturation with element-tinted accents (armor trim color = main element)
- VFX: **saturated element colors** (environment stays under-saturated; VFX goes over-saturated):
  - Fire: `#FF4500`
  - Ice: `#00E5FF`
  - Lightning: `#FFE600`
  - Dark: `#6A0DAD`
  - Nature: `#39FF14`

### Shading

- Toon shader with 2-3 light bands (not fully cel-shaded — softer)
- No heavy dynamic-shadow dependency at launch — prefer baked/static lighting, cheap unlit VFX, and simple blob/contact shadows for gameplay readability

## VFX (combat feedback)

### Hit feedback

- Every hit produces:
  - Small impact flash (element color if infused)
  - 3-5 particles (sparks / blood / frost depending on infusion)
  - Slight screen shake (0.1s, subtle) on your own hits only
  - Sound cue per weapon + per infusion element

### Gore (stylized)

- **Blood splash is always pure saturated red `#FF3344`** on every hit, regardless of element infusion.
- Blood trail particles on **knockup** airborne targets (~0.8s trail following them).
- On death: small burst of red particles (no body dismemberment, no ragdoll — corpse fades over 2s).
- **No smembramento** at launch. Can be added later as modular VFX upgrade.
- **Blood + element VFX do not blend colors.** When a Fire ability hits, the impact shows both the red blood splash AND the fire `#FF4500` element burst — they coexist as separate layers. Ice stays `#00E5FF` even if blood `#FF3344` is also present. No additive color mixing.

### Ability VFX

- Every ability has a distinct visual signature:
  - Windup (if any): building glow around caster in element color
  - Cast: clear directional or target visual (arrow trail, ground circle, beam)
  - Impact: burst with element-specific shape (fire = expanding ring; ice = shattered shards; etc.)
  - Lingering effect: if the ability leaves a zone (poison patch, flame wall), the zone is clearly visible in element color

### Readability > realism

- Element color always dominates VFX hue — if Fire and Ice abilities overlap, Fire stays red, Ice stays blue, no blending
- Projectiles have visible trails
- AoE effects have ground decals so players can see the edges

## UI

### HUD elements

- Font contract: Rajdhani-style condensed HUD for numbers/labels; Inter-style UI text for menus, settings, loadout descriptions, and readable body copy.
- Bottom left: player resources stay compact, class-aware and readable while
  aim remains dominant. Class emphasis may change bar hierarchy; keep bars flat
  rectangular while the HUD redesign resolves exact dimensions.
- Bottom center: combat console remains the primary ability/weapon read, but its
  slot composition must follow class loadout grammar rather than fixed old
  transfer assumptions.
- Top right: kill feed or technical ping only when that mode/surface needs it. A minimap is not part of the current client HUD contract.
- Top center: round/mode state, timer, pips or kill counter when that mode needs it
- Around crosshair: only gameplay-critical state: GCD pip, cast/charge feedback, parry charge/ring, placement preview, hit confirmation, and short failed-action flashes. Do not add persistent explanatory panels in the play view; primed/blocked states should be shown through hotbar/crosshair states or brief contextual pulses.
- Crosshair HUD: parry ring is a 60px circle with 2px stroke; normal parry uses Mana cyan, hold/block uses Stamina green. Bow charge sits 40px below the crosshair, 120x6px, progressing from Stamina green to gold/orange.

### Wheels (Q / E)

- Circular overlay, semi-transparent background dim
- Each sector shows icon + key hint + CD (if applicable)
- Active sector highlighted in yellow
- Releasing Q/E primes the selected sector; M1 fires the primed action or opens its placement preview. Direct hotkeys bypass the wheel: instant abilities fire immediately, placement abilities show a confirm preview.

### Damage numbers

- Optional (toggle) — off by default to keep HUD clean
- If on: small floating numbers, element-tinted, disappear in 1s

## Tone

Game tone: **figo, un po' gore, semplice ma caratterizzato**. Not grim-dark. Not cartoony. A clear stylized arena combat vibe where hits feel impactful (blood splash + screen shake + sound) but the overall look stays approachable.

## Reference anchors

- **Graphic & Aesthetic Target**: The game's graphics must strictly match the style and quality of the visual screenshots provided in the external reference folder: `E:\GIOCHI\ASSET_GRAFICA\esempio` (specifically [esempio1.png](file:///E:/GIOCHI/ASSET_GRAFICA/esempio/esempio1.png), [esempio2.png](file:///E:/GIOCHI/ASSET_GRAFICA/esempio/esempio2.png), and [esempio3.png](file:///E:/GIOCHI/ASSET_GRAFICA/esempio/esempio3.png)). All models, UI designs, lighting setups, and color styling must be aligned with these references to ensure visual premium feel and consistency.
- **Visual pacing similar to**: Risk of Rain 2 (combat chaos), Hades (combat clarity), Totally Accurate Battle Simulator (low-poly cleanliness — without the humor).
