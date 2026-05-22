# 02_TECH — Technical Architecture

This folder describes the current code contracts that support the gameplay docs in `01_DESIGN/`.

The current classless vertical slice is being redesigned. Read
[`../REDESIGN_MASTER_PLAN.md`](../REDESIGN_MASTER_PLAN.md) and
[`../01_DESIGN/01_arena_fps_reference_study.md`](../01_DESIGN/01_arena_fps_reference_study.md)
before treating a current runtime contract as the future design.

## Read order

1. [`00_architecture_overview.md`](00_architecture_overview.md) — current packages, runtime split, server tick flow
2. [`01_entity_component_model.md`](01_entity_component_model.md) — replicated schemas and server-only state
3. [`02_ability_dsl.md`](02_ability_dsl.md) — current 52-ability data schema and effect primitives
4. [`03_network_protocol.md`](03_network_protocol.md) — message and state protocol
5. [`04_code_conventions.md`](04_code_conventions.md) — layout, naming, imports, tests
6. [`05_input_contract.md`](05_input_contract.md) — browser focus, pointer lock, wheel, and input regression rules
7. [`06_visual_performance_contract.md`](06_visual_performance_contract.md) — HUD/VFX performance and visual consistency rules
8. [`07_character_animation_contract.md`](07_character_animation_contract.md) — playable character GLB, skeleton, animation, and visibility rules
9. [`08_character_asset_replacement_plan.md`](08_character_asset_replacement_plan.md) — practical asset replacement path for the active character set
10. [`09_client_debug_map.md`](09_client_debug_map.md) — client module order, flow smoke matrix, and current stabilization register
11. [`10_deploy_status.md`](10_deploy_status.md) — **LEGGERE SEMPRE PRIMA DI SUGGERIRE DEPLOY** — stato live Fly.io, Supabase, asset esistenti
12. [`11_redesign_runtime_migration_plan.md`](11_redesign_runtime_migration_plan.md) — class/loadout/movement/ability migration order

## Status

These docs are treated as living implementation docs. When code changes the architecture, protocol, or ability schema, update this folder in the same work pass.
