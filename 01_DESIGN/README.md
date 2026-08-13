# RAGEQUIT Design Docs

Questa cartella contiene solo contratti vivi o decisioni chiuse. Non usare file
cancellati o materiale non approvato come autorita.

## Lettura Minima

- `MANIFEST.yaml`
- `../GAME_SYSTEM_MODEL.md`
- `00_vision.md`
- `00_truth.md`
- `00_pillars.md`
- `00_classes.md`
- `01_controls.md`
- `01_arena_fps_air_contract.md`
- `01_combat_fundamentals.md`
- `04_resource_sustain_study.md`
- `05_abilities_philosophy.md`
- `06_loadout_build.md`
- `07_modes.md`
- `08_specializations.md` — the third axis of a build (class + abilities + specialisation)
- `99_resolved_ambiguities.md`

## Autorita Runtime

- Ability numeri/comportamento: `../packages/shared/src/abilities/registry.ts`
- Classi/loadout grammar: `../packages/shared/src/constants/classes.ts`
- Loadout Forge UI runtime: `../packages/client/src/loadout-station.ts`
- CSS UI vivo: `../packages/client/public/game-ui.css`

## Regola

Se un documento non descrive stato vivo, va rimosso o riscritto come contratto
presente prima di essere usato.
