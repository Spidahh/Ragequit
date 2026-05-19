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

- Environment muted base: `#2A2A35`, `#4B4D58`, `#3D3D33`
- UI panels: `#0F111A` at roughly 85% opacity, small blur only where it helps legibility
- Accent / active selection: `#FFD260`
- HUD resources: HP `#FF3344`, Mana `#00D0FF`, Stamina `#00FF88`
- Character outfits: mid-saturation with element-tinted accents (armor trim color = main element)
- VFX: **saturated element colors**:
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

- **Sangue rosso saturo** splash on hit (all hits, regardless of infusion)
- Blood trail particles on **knockup** airborne targets (~0.8s trail following them)
- On death: small burst of red particles (no body dismemberment, no ragdoll — corpse fades over 2s)
- **No smembramento** at launch. Can be added later as modular VFX upgrade.

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
- Bottom left: HP (red), Mana (cyan), Stamina (green) — stacked, compact, draggable/resizable, **flat rectangular bars only**. No skew/trapezoid treatment for resource bars.
- Bottom center: weapon strip, 60x60 slots, active slot scales up and lifts slightly with a gold bottom border. The 7 combat slots mirror the E wheel; the 4 utility slots mirror the Q wheel with fixed Z/X/F transfers plus V flex utility.
- Top right: minimap (small, overhead)
- Top center: kill feed + scoreboard ticker (in team modes)
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

Visual pacing similar to: Risk of Rain 2 (combat chaos), Hades (combat clarity), Totally Accurate Battle Simulator (low-poly cleanliness — without the humor).
