---
id: tech_assets
title: Asset Contract
section: tech
tags: [assets, runtime]
provides: [runtime_assets]
deps: []
status: current
---

# Asset Contract

## Runtime Assets

Client runtime assets kept in the repository:

- `packages/client/public/arena/gladiators_arena.glb`
- `packages/client/public/characters/UAL1_Standard.glb`
- `packages/client/public/characters/Male_Peasant.gltf`
- `packages/client/public/characters/Female_Peasant.gltf`
- `packages/client/public/characters/Male_Ranger_Head_Hood.gltf`
- `packages/client/public/characters/Female_Ranger_Head_Hood.gltf`
- `packages/client/public/weapons/sword.glb`
- `packages/client/public/weapons/bow.glb`
- `packages/client/public/weapons/staff.glb`
- `packages/client/public/icons-sprite.svg`
- `packages/client/public/ui/ragequit-logo-full.png`
- `packages/client/public/ui/ragequit-logo-small.png`
- `packages/client/public/ui/sfondo.png`

## Rules

- Do not add unused downloaded photos or unapproved generated images to the repo.
- Every asset in `packages/client/public/` must be used by runtime code,
  documented as a live asset, or removed.
- Logo/menu/loadout UI assets must stay in `packages/client/public/ui/`.
