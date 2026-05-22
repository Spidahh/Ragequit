# RAGEQUIT — Asset pipeline

This folder is the home of asset audit helpers and the future offline processing
pipeline. Runtime assets already exist under `packages/client/public/`; this
folder must not pretend that the playable client is still primitives-only.

The intended production pipeline is decoupled from runtime: assets are
preprocessed offline, the bundle/CDN ships only final optimized files, and the
runtime resolves versioned URLs when that lane exists.

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

Future source assets should land in `in/` with a flat naming convention:

```
in/
  characters/<name>.gltf
  animations/<bone>/<clip>.gltf
  vfx/<element>/<clip>.png
  audio/<category>/<id>.ogg
  ui/<icon>.svg
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
- **Texture** → `KTX2` browser-compressed output with a documented fallback
  path → `<name>.ktx2`
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

## Current status

The current browser client mixes imported runtime assets and procedural fallbacks:

- Character loaders and audits consume active character files from
  `packages/client/public/characters/`.
- Arena, weapon and presentation assets live in client public/runtime folders
  when installed; fallback Three.js geometry still protects loading and smoke
  tests.
- Projectiles, zones and short-lived VFX still rely heavily on cheap code-driven
  geometry/materials for readability and performance.
- `audit-character-glb.mjs`, `audit-legacy-character-fbx.mjs` and
  `measure-fbx-bounds.mjs` are current utility scripts in this folder.

The complete normalize/compress/publish lane is still future work. Character
replacement work must follow `02_TECH/07_character_animation_contract.md` and
`02_TECH/08_character_asset_replacement_plan.md` before being promoted.

## Where this is wired

- `packages/shared/src/sim/map.ts` exports the current `MAPS` registry and
  `getMap(id)`.
- Client world/render code consumes the local map/runtime asset path that exists
  today; server-to-client map selection changes must be documented against the
  active room protocol when they land.
- `tools/asset-pipeline/in/` and `out/` stay offline working folders for the
  future pipeline. Accepted runtime assets still live in the client public tree;
  new source/pipeline lanes need tracked metadata and license review.
