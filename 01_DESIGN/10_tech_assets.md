---
id: tech_assets
title: Asset Pipeline
section: tech
tags: [assets, sources, compression, pipeline]
provides: [asset_sources, asset_pipeline, asset_targets]
deps: [09_visual.md]
status: active
---

# Asset Pipeline

## Current document role

This is the asset pipeline contract. Whole-game visual decisions come from:

1. `../GAME_GRAPHIC_AUDIT.md`
2. `../VISUAL_STRATEGY.md`
3. `12_game_graphic_audit.md`
4. `15_visual_strategy.md`
5. `13_graphic_redesign_blueprint.md`

Do not use this file as a substitute for the visual audit or blueprint.

## Asset sources

| Source                                            | Content                                                                                     | License                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **Local asset library** `E:\GIOCHI\ASSET_GRAFICA` | Existing candidate models, VFX sprites, logos and archived assets already available on disk | verify per source asset                       |
| **Kenney.nl**                                     | Low-poly props, UI, particles and audio candidates                                          | verify official pack license, prefer CC0      |
| **Quaternius**                                    | Low-poly characters, props and animation-library candidates                                 | verify pack license, prefer CC0               |
| **Poly Haven**                                    | CC0 textures/models when a source texture or prop is truly needed                           | CC0                                           |
| **OpenGameArt / Freesound**                       | Gap-fill candidates only after per-asset license check                                      | prefer CC0; use attribution only when tracked |

## Current runtime assets

Runtime assets currently present in the client:

- `packages/client/public/arena/gladiators_arena.glb`
- `packages/client/public/characters/player.glb`
- `packages/client/public/characters/legacy/player_base.fbx`
- `packages/client/public/characters/legacy/animations/*.fbx`
- `packages/client/public/weapons/sword.glb`
- `packages/client/public/weapons/bow.glb`
- `packages/client/public/weapons/staff.glb`
- `packages/client/public/icons-sprite.svg`
- `packages/client/public/ui/ragequit-logo-full.png`
- `packages/client/public/ui/ragequit-logo-small.png`

The visual audit and the character animation contracts decide whether a runtime
asset is primary, fallback or replacement candidate. Asset presence alone is not
acceptance.

## Build pipeline

### Model optimization

```
source .glb/.fbx
  → gltf-transform optimize
    → weld vertices
    → meshopt compression (90%+ size reduction)
    → LOD generation (3 levels: 100%, 50%, 25% tri count)
  → output: model.glb (optimized, meshopt-encoded)
```

### Texture optimization

```
source .png
  → texture-tool
    → resize to target (1024 max for characters, 512 for props, 256 for UI)
    → KTX2 encoding (Basis Universal) with WebP fallback for older browsers
  → output: texture.ktx2 + texture.webp
```

## Compression targets

| Asset type                   | Size budget       | Notes                                      |
| ---------------------------- | ----------------- | ------------------------------------------ |
| Character model (all LODs)   | < 500 KB          | meshopt + draco fallback                   |
| Weapon model                 | < 80 KB           |                                            |
| Environment prop (instanced) | < 50 KB           |                                            |
| Character texture atlas      | < 400 KB (KTX2)   | 1024×1024 max                              |
| Single-match total download  | < 15 MB (initial) | after cache: <1 MB/match                   |
| Single map geometry          | < 3 MB            | vs. original 50 MB `gladiators_arena.gltf` |

## Delivery

- **CDN**: Cloudflare R2 (zero egress, global POPs)
- **Client cache**: IndexedDB with content hash versioning — assets redownload only on content change
- **Progressive loading**: critical assets (player model, core weapons, HUD) load first; props stream in parallel with match countdown
- **Preload at match queue**: once matchmaking locks, the specific map + both teams' loadout models preload

## Audio pipeline

```
source .wav
  → ffmpeg encode
    → Opus (primary, 64kbps mono for SFX, 96kbps stereo for music)
    → AAC fallback for Safari
  → output: audio.opus + audio.m4a
```

Audio is small (~50-200 KB per SFX) — budget is not a concern.

## Content delivery summary

Target: a **cold-cache first match** downloads < 15 MB total. Subsequent matches hit cache and download < 1 MB of delta (only match-specific variations like player cosmetics not previously seen).

This is aggressive but achievable via:

- Shared base mesh for all characters (skin swap via material only)
- Shared animation library (all characters use the same rig)
- Instanced environment props
- Aggressive texture atlasing (one atlas per element set)

## Pipeline tool direction

- `gltf-transform` / mesh optimization tools where already available in the repo workflow
- texture resize/compression tools only when the runtime actually adds external textures
- audio compression tools only when file-based audio replaces or complements procedural WebAudio

The current pass should prefer existing repo tools, browser verification and
lightweight runtime assets over introducing a new manual tool chain.
