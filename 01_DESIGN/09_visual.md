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

**Low-poly stylized** — reference: **Risk of Rain 2**.

### Why this direction

- Pragmatic fit with free asset sources: Kenney.nl, Quaternius, and similar libraries produce thousands of low-poly models in a coherent style
- Minimal shader work: MeshStandardMaterial + a light toon shader pass, no custom shaders needed
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

- Environment: muted earth tones (grays, browns, deep greens) so VFX pop
- Character outfits: mid-saturation with element-tinted accents (armor trim color = main element)
- VFX: **saturated element colors**:
  - Fire: saturated red-orange
  - Ice: bright cyan / pale blue
  - Lightning: electric yellow / white core
  - Dark: deep purple with black smoke
  - Nature: vivid green

### Shading

- Toon shader with 2-3 light bands (not fully cel-shaded — softer)
- No shadow-per-pixel at launch (performance) — baked shadow maps on static geometry, simple blob shadows on characters

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

- Bottom left: HP (red bar), Mana (blue), Stamina (green) — stacked, compact
- Bottom center: active weapon icon + the 11-slot hotbar reference. The 7 combat slots mirror the E wheel; the 4 utility slots mirror the Q wheel with fixed Z/X/F transfers plus V flex utility.
- Top right: minimap (small, overhead)
- Top center: kill feed + scoreboard ticker (in team modes)
- Around crosshair: GCD pip indicator; cast bar on active abilities; parry charge indicator

### Wheels (Q / E)

- Circular overlay, semi-transparent background dim
- Each sector shows icon + key hint + CD (if applicable)
- Active sector highlighted in yellow
- Releasing Q/E primes the selected sector; M1 fires the primed action. Direct hotkeys still cast immediately.

### Damage numbers

- Optional (toggle) — off by default to keep HUD clean
- If on: small floating numbers, element-tinted, disappear in 1s

## Tone

Game tone: **figo, un po' gore, semplice ma caratterizzato**. Not grim-dark. Not cartoony. A clear stylized arena combat vibe where hits feel impactful (blood splash + screen shake + sound) but the overall look stays approachable.

## Reference anchors

Visual pacing similar to: Risk of Rain 2 (combat chaos), Hades (combat clarity), Totally Accurate Battle Simulator (low-poly cleanliness — without the humor).
