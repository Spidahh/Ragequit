---
id: tech_assets
title: Asset Pipeline
section: tech
tags: [assets, sources, compression, pipeline]
provides: [asset_sources, asset_pipeline, asset_targets]
deps: [09_visual.md]
status: final
---

# Asset Pipeline

## Asset sources (free, 2026)

| Source                       | Content                                                          | License                                 |
| ---------------------------- | ---------------------------------------------------------------- | --------------------------------------- |
| **Kenney.nl**                | ~40k CC0 low-poly assets (characters, weapons, props, UI, audio) | CC0                                     |
| **Quaternius**               | Low-poly rigged characters, animations                           | CC0                                     |
| **Meshy AI** (free tier)     | Text-to-3D generation for gap-fills                              | Commercial use allowed within free tier |
| **Mesh2Motion**              | Open-source Mixamo alternative for character rigging             | MIT                                     |
| **Sonniss GameAudioGDC**     | Annual free AAA-quality SFX packs                                | Royalty-free for games                  |
| **Freesound** (CC0 filtered) | SFX gap-fills                                                    | CC0 filter only                         |

## Existing assets

**499 models** exist in `04_CDN_ASSETS/` from the original project. **6 weapons are missing / broken**. Per Francesco's decision (2026-04-22), assets will be **rebuilt from Kenney/Quaternius sources** rather than audited one-by-one — faster, produces uniform style, and the new art direction (Risk of Rain 2) is easier to reach with fresh coherent assets than by patching 493 mismatched ones.

The old `04_CDN_ASSETS/` folder is kept as archive/reference during the rebuild and removed post-launch.

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

## Tools installed on dev side

- `gltf-transform` (CLI + programmatic)
- `@gltf-transform/meshopt` plugin
- `basisu` CLI (for KTX2 encoding)
- Blender (for source editing when needed; headless bake scripts)
- FFmpeg (for audio)

All free, all CLI-scriptable for CI automation.
