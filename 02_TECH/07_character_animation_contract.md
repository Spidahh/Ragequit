# Character And Animation Contract

This file defines the technical contract for playable character assets in the
Three.js client. It exists so a character model is never accepted only because it
loads; it must support the gameplay states RAGEQUIT actually exposes.

## Current Runtime

- Class model asset paths:
  - `packages/client/public/characters/Male_Ranger.gltf`
  - `packages/client/public/characters/Female_Ranger.gltf`
  - `packages/client/public/characters/Male_Peasant.gltf`
  - `packages/client/public/characters/Female_Peasant.gltf`
- Shared animation asset path: `packages/client/public/characters/UAL1_Standard.glb`
- Loader/runtime: `packages/client/src/render/characters.ts`
- Local player creation: `packages/client/src/main.ts`
- Remote player rendering: `packages/client/src/render/remote-players.ts`

The runtime uses the current class-based GLTF path:

- `makeCharacter()` creates a procedural low-poly silhouette immediately.
- `loadCharacterGlb()` loads a class model plus `UAL1_Standard.glb`.
- Class model selection is driven by the replicated class id.
- After a validated imported asset is installed, the procedural silhouette is
  hidden so the animated character is the single authoritative visual body.
- Each character instance gets its own skeleton clone and `AnimationMixer`.
- Local first-person bow/staff hides only the local `selfMesh`; remote players
  must remain visible regardless of their active weapon.

## Required Asset Structure

A playable character model must contain:

- At least one renderable `SkinnedMesh`.
- A skeleton/skin that survives `SkeletonUtils.clone`.
- Materials that can be converted to `MeshToonMaterial`.
- A valid world-space bounding box after import.
- A forward orientation compatible with the game yaw convention.

Texture maps are optional. Flat-color materials are acceptable and preferred for
the current low-poly stylized direction.

## Required Animation Coverage

These states are required by gameplay. The active playable asset includes
distinct clips for each row.

| Gameplay state         | Required clip intent                | Current runtime clip     |
| ---------------------- | ----------------------------------- | ------------------------ |
| Idle                   | Relaxed standing combat idle        | `Idle_Loop`              |
| Run                    | Full-speed movement                 | `Sprint_Loop`            |
| Walk                   | Slow/interpolated movement, if used | `Walk_Loop`              |
| Jump start             | Voluntary jump launch               | `Jump_Start`             |
| Fall / airborne        | Falling, knockup, or airborne lock  | `Jump_Loop`              |
| Land                   | Ground contact after jump/fall      | `Jump_Land`              |
| Sword attack 1         | Primary melee swing                 | `Sword_Attack`           |
| Sword attack 2 / combo | Alternate melee swing               | `Sword_Attack`           |
| Parry / block          | Defensive weapon pose               | `Sword_Idle`             |
| Bow draw / aim         | Held bow charge                     | `Spell_Simple_Idle_Loop` |
| Bow release            | Shot release                        | `Spell_Simple_Shoot`     |
| Staff cast             | Magic cast gesture                  | `Spell_Simple_Shoot`     |
| Channel                | Held cast/beam/totem style action   | `Spell_Simple_Idle_Loop` |
| Hit reaction           | Damage response                     | `Hit_Chest`              |
| Dash / roll            | Utility movement burst              | `Roll`                   |
| Death                  | Death pose/fall                     | `Death01`                |
| Respawn                | Return to controllable idle         | `Spell_Simple_Enter`     |

## Runtime Mapping Rules

The animation state machine must be driven by replicated/player state, not by
client-only guesses where authoritative state exists.

- `alive=false` maps to `Death`.
- `activeWeapon=sword` plus melee swing maps to sword attack clips.
- Bow charge maps to bow draw/aim when a clip exists.
- Staff casting maps to staff cast/channel when clips exist.
- `airborneUntilTick > schemaTick` maps to jump/fall/airborne.
- `parrying=true` maps to parry/block.
- Damage feedback should map to hit reaction when available.
- Runtime clip mapping lives in `packages/client/src/render/characters.ts`.

Fallbacks are allowed, but they must be intentional and cheap:

- Missing bow draw -> `Attacking_Idle`
- Missing staff cast -> `Punch`
- Missing airborne -> `RecieveHit`
- Missing parry -> `Attacking_Idle`

## Visibility Rules

- Local first-person bow/staff may hide only the local `selfMesh` to avoid camera
  clipping.
- Remote players must remain visible with every weapon.
- A dead remote may stay visible briefly to play the death animation, then hide.
- Imported asset load failure must keep the procedural silhouette visible.
- Imported asset validation failure must keep the procedural silhouette visible.

## Three.js Safety Rules

- Use `SkeletonUtils.clone` for every skinned character instance.
- Disable `frustumCulled` on skinned character meshes unless a tested custom
  bounding strategy is added.
- Do not hide imported meshes by name unless the asset has been audited and the
  mesh is proven to be a non-render helper.
- Do not hardcode character scale when a valid renderable bounding box is
  available.
- Keep character materials toon/flat and browser-cheap.

## Current Asset State

The active character set is the class-based GLTF set plus `UAL1_Standard.glb`.
The procedural silhouette is the runtime fallback when imported assets fail.

Character asset acceptance uses this file plus the local audit scripts.

```bash
pnpm audit:character
node tools/asset-pipeline/audit-character-glb.mjs <character.glb>
node tools/asset-pipeline/audit-character-glb.mjs <character.gltf>
```
