# RAGEQUIT — Asset pipeline (Fase 8)

This folder is the home of the asset processing pipeline that ships with the
client bundle. It is intentionally **decoupled** from the runtime — assets are
preprocessed offline, the bundle ships only the final optimized files, and the
runtime fetches them via versioned URL (Cloudflare R2 in Fase 9).

The pipeline runs in three stages:

```
[ source assets — gltf, png, ogg, json ]
                |
                v   1. validate / normalize
[ tools/asset-pipeline/in/ ]
                |
                v   2. compress / optimize
[ tools/asset-pipeline/out/ ]
                |
                v   3. publish to CDN
[ Cloudflare R2 — content-hash URLs ]
```

## Stage 1 — validate / normalize

Source assets land in `in/` with a flat naming convention:

```
in/
  characters/<name>.gltf            # Quaternius character meshes
  animations/<bone>/<clip>.gltf     # Mixamo / shared animation library
  vfx/<element>/<clip>.png          # 2-band toon spritesheets
  audio/<category>/<id>.ogg         # Sonniss GameAudioGDC + Kenney UI
  ui/<icon>.svg                     # Lucide / heroicons
```

Each asset has a `<asset>.meta.json` next to it with min metadata:

```json
{
  "license": "CC0",
  "source": "https://quaternius.com/...",
  "tags": ["character", "humanoid"]
}
```

A validator (`validate.ts`, NOT YET WRITTEN) checks every `*.meta.json` is
present + license is one of `CC0|CC-BY|MIT|owned` + source URL resolves.

## Stage 2 — compress / optimize

For each asset type the pipeline runs the following tools (deferred to host
because they need GPU/native binaries the sandbox can't run):

- **glTF mesh** → `gltf-transform optimize` + `meshopt` quantization →
  `<name>.glb`
- **Texture** → `KTX2` BC7 (desktop) + ETC1S (mobile) → `<name>.ktx2`
- **Audio** → `ffmpeg` to mono OGG @ 96 kbps for SFX, stereo @ 128 kbps for music
- **Animation** → `gltf-transform retarget` to the shared bone library
- **UI icons** → `svgo` minify

Output lands in `out/` mirroring the input layout but with the final formats.
Total cold-download budget per the design doc: **< 15 MB**, with
content-hashed filenames so successive matches only fetch the diff (< 1 MB).

## Stage 3 — publish to CDN

`pnpm asset:publish` (NOT YET WRITTEN) walks `out/`, computes a sha256 hash
per file, renames to `<name>.<hash8>.<ext>`, and uploads to Cloudflare R2 with
public-read ACL + cache-control = 1 year. A `manifest.json` mapping logical
ids → versioned URLs is produced and bundled with the client.

## Current status (Fase 8 v0.1)

The shared layer references the pipeline output via the map registry
(`packages/shared/src/sim/map.ts → MAPS`), but the **runtime currently uses
procedural geometry** (Three.js primitives) for every asset:

- Characters → capsule (`THREE.CapsuleGeometry`)
- Maps → AABB boxes (`THREE.BoxGeometry`)
- Projectiles → cylinder / sphere
- Zones → torus / plane
- VFX → coloured sphere flash + ring decal

The full pipeline ships with **Fase 8b** when Francesco runs the offline
processing on the host (sandbox can't host Blender + KTX2 + ffmpeg toolchain).

## Where this is wired

- `packages/shared/src/sim/map.ts` exports `MAPS` registry + `getMap(id)`.
  Server reads this in Fase 9 to pick a map per match mode (`duel_arena`,
  `gladiators_arena`, `blockout`).
- `packages/client/src/main.ts` reads `STATIC_MAP` for now; Fase 8b switches
  to `getMap(roomId)` once the room broadcasts which map is in use.
- `tools/asset-pipeline/in/` and `out/` are gitignored — only sources land
  in the repo, and only via PRs that include `*.meta.json`.
