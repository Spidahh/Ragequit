---
name: improvements-2026-05-31
description: Piano di miglioramento eseguito il 2026-05-31 — tutte le fasi 1-4 completate
metadata:
  type: project
---

Lavoro completato il 2026-05-31. 4 fasi eseguite su RAGEQUIT.

**Why:** Il gioco si bloccava all'ingresso partita, le texture VFX erano grigie su sfondo nero, il bot AI era troppo basico, nessun reconnect automatico.

**How to apply:** Tutte le modifiche sono nel working tree. Richiedono solo `pnpm build` per il deploy.

## File nuovi creati
- `packages/client/src/preloader.ts` — loading screen + asset preload (personaggio + armi)

## File principali modificati
- `packages/client/src/main.ts` — error boundary, preload gate su fase 'live', reconnect automatico, tutorial HUD, fpvKeyLight, FPV MeshStandardMaterial
- `packages/client/src/render/vfx-textures.ts` — colorSpace NoColorSpace, rimosse texture inutilizzate (smoke/muzzle/blood)
- `packages/client/src/render/remote-players.ts` — nameplate positioning via transform3d invece di left/top
- `packages/client/src/render/character-weapons.ts` — weapon paths -> .glb (sword_D, bow, staff, shield_A)
- `packages/client/src/world/arena.ts` — dust DynamicDrawUsage
- `packages/client/src/audio/sound-engine.ts` — _pitch() helper, ±8% pitch variation su 9 BufferSource nodes
- `packages/server/src/sim/BotController.ts` — strafing orbitale, retreat, dodge su cast, weapon swap smart
- `packages/client/index.html` — loading screen HTML (#loading-screen)
- `packages/client/public/game-ui.css` — loading screen CSS
- `packages/client/public/vfx/*.png` — 7 texture convertite in RGBA white-on-transparent

## Azione manuale richiesta
Cancellare dall'utente i file GLB erronei in `public/characters/` e `public/arena/props/` (NON UAL1_Standard.glb).
Vedere dettagli in PIANO_MIGLIORAMENTO.md.

## ASSET_GRAFICA
L'utente ha una cartella `E:\GIOCHI\ASSET_GRAFICA` non montata nella sandbox.
Da esplorare nelle sessioni future per asset visivi migliorati.

## FASE 5 aggiunta (2026-06-01)

### Nuovi file creati
- `packages/client/src/game/match-state-machine.ts` — FSM esplicita per fasi partita

### File modificati (Fase 5)
- `main.ts` — bloom pipeline, markBloom(), match state machine, dynamic crosshair, kill confirm, low-HP heartbeat, camera shake esponenziale, audio spatial listener, audio remote hit
- `world/arena.ts` — sky dome gradient ShaderMaterial, torce 3D (Torch_Metal), torch flicker, KayKit props, gltfLoader hoisted
- `render/remote-players.ts` — LOD 40m/20m, getPlayerWorldPos() API
- `audio/sound-engine.ts` — playHeartbeat(), updateListener(), _spatialOut(), playRemoteHit(), playRemoteCast()
- `render/zone-visuals.ts` — tutte le zone mesh su layer 1 bloom
- `render/character-weapons.ts` — cast ring su layer 1 bloom
- `public/game-ui.css` — dynamic crosshair CSS, kill-confirm class

### Asset copiati da ASSET_GRAFICA
- VFX textures (7): flame_04, slash_01, star_04, spark_04, circle_04, magic_03, circle_05 → vfx_fire/slash/ice/lightning/dark/nature/shield
- Arena props: Torch_Metal.gltf, Lantern_Wall.gltf, barrel_large.gltf, barrel_small.gltf, box_large.gltf, banner_patternA_red.gltf

### ASSET_GRAFICA struttura scoperta
- PARTICELLE/kenney_particle-pack/PNG (Transparent)/ — particelle bianche su trasparente
- mappe/Fantasy Props MegaKit[Standard]/Exports/glTF/ — props fantasiosi (Torch, Lantern, ecc.)
- mappe/KayKit_DungeonRemastered_1.1_FREE/ — dungeon assets KayKit
- icone/sprite_XXXX.png — 104 sprite icone (diverso set dalle ability-icons attuali, da mappare)
- menu/ — logo, classi (già usati nel gioco)
