# RAGEQUIT — Asset Audit Tools

This folder contains the current asset audit helpers used before accepting
character assets into the playable client.

Runtime assets live under `packages/client/public/`. This folder is not a second
asset source and does not define UI, loadout, menu, VFX or gameplay direction.

## Current Scripts

- `audit-character-glb.mjs` checks incoming GLB/GLTF character assets.

## Current Runtime

- Character loaders consume active class GLTF files and `UAL1_Standard.glb` from
  `packages/client/public/characters/`.
- Arena, weapon and presentation assets live in client public/runtime folders
  when installed; fallback Three.js geometry still protects loading and smoke
  tests.
- Projectiles, zones and short-lived VFX still rely heavily on cheap code-driven
  geometry/materials for readability and performance.
- Character acceptance follows `02_TECH/07_character_animation_contract.md`.

## Where this is wired

- `packages/shared/src/sim/map.ts` exports the current `MAPS` registry and
  `getMap(id)`.
- Client world/render code consumes the local map/runtime asset path that exists
  today; server-to-client map selection changes must be documented against the
  active room protocol when they land.
- Accepted runtime assets live in the client public tree and need tracked
  metadata/license review before promotion.
