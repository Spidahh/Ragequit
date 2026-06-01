# RAGEQUIT — Asset Audit Tools

This folder contains the current asset audit helpers used before accepting
character assets into the playable client.

Runtime assets live under `packages/client/public/`. This folder is not a second
asset source and does not define UI, loadout, menu, VFX or gameplay direction.

## Current Scripts

- `audit-character-glb.mjs` checks incoming GLB/GLTF character assets.
- `prune-glb-clips.mjs <in> <out> <keep,clip,names>` drops unused animation
  clips from a GLB then resample/dedup/prunes (geometry/skin/skeleton are kept).
  Errors if any keep-name is missing from the GLB. Applied to shrink the two big
  animated assets (verified in-browser after each):
  - **FPV bow** (8.8MB→5.5MB) — keep the 7 clips in `render/fpv-bow.ts`'s
    `ClipName` union:
    `node tools/asset-pipeline/prune-glb-clips.mjs packages/client/public/weapons/animated_fps_bow.glb out.glb "Bow_IDLE,Bow_WALK,Bow_RUN,Bow_AIM,Bow_AIM_IDLE,Bow_FIRE,Bow_RELOAD"`
  - **UAL1_Standard** (7.7MB→5.4MB) — keep the source clips referenced by
    `render/character-animation.ts`'s `ANIM_NAME_MAP`:
    `... UAL1_Standard.glb out.glb "Idle_Loop,Sprint_Loop,Walk_Loop,Sword_Attack,Death01,Punch_Cross,Hit_Chest,Roll,Jump_Start,Jump_Land,Jump_Loop,Sword_Idle,Spell_Simple_Idle_Loop,Spell_Simple_Shoot,Spell_Simple_Enter"`
  - When the rig's clip list changes, update the keep-list to match (the script
    aborts if a kept name is absent, catching drift).

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
