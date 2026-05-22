# Character And Animation Contract

This file defines the technical contract for playable character assets in the
Three.js client. It exists so a character model is never accepted only because it
loads; it must support the gameplay states RAGEQUIT actually exposes.

## Current Runtime

- Primary character asset path: `packages/client/public/characters/legacy/player_base.fbx`
- Placeholder fallback asset path: `packages/client/public/characters/player.glb`
- Loader/runtime: `packages/client/src/render/characters.ts`
- Local player creation: `packages/client/src/main.ts`
- Remote player rendering: `packages/client/src/render/remote-players.ts`

The runtime uses a hybrid path:

- `makeCharacter()` creates a procedural low-poly silhouette immediately.
- `loadCharacterGlb()` first loads and validates the full legacy FBX
  character/animation set.
- If the legacy FBX path fails, `loadCharacterGlb()` falls back to `player.glb`.
- After a validated imported asset is installed, the procedural silhouette is
  hidden so the animated character is the single authoritative visual body.
- Each character instance gets its own skeleton clone and `AnimationMixer`.
- Local first-person bow/staff hides only the local `selfMesh`; remote players
  must remain visible regardless of their active weapon.

## Required Asset Structure

A playable replacement character model must contain:

- At least one renderable `SkinnedMesh`.
- A skeleton/skin that survives `SkeletonUtils.clone`.
- Materials that can be converted to `MeshToonMaterial`.
- A valid world-space bounding box after import.
- A forward orientation compatible with the game yaw convention.

Texture maps are optional. Flat-color materials are acceptable and preferred for
the current low-poly stylized direction.

## Required Animation Coverage

These states are required by gameplay. A production-ready asset should include
distinct clips for each row.

| Gameplay state         | Required clip intent                | Active legacy FBX support |
| ---------------------- | ----------------------------------- | ------------------------- |
| Idle                   | Relaxed standing combat idle        | `idle_combat.fbx`         |
| Run                    | Full-speed movement                 | `run_forward.fbx`         |
| Walk                   | Slow/interpolated movement, if used | `walk_forward.fbx`        |
| Jump start             | Voluntary jump launch               | `jump.fbx`                |
| Fall / airborne        | Falling, knockup, or airborne lock  | `airborne.fbx`            |
| Land                   | Ground contact after jump/fall      | `land.fbx`                |
| Sword attack 1         | Primary melee swing                 | `melee_attack_01.fbx`     |
| Sword attack 2 / combo | Alternate melee swing               | `melee_attack_02.fbx`     |
| Parry / block          | Defensive weapon pose               | `parry_block.fbx`         |
| Bow draw / aim         | Held bow charge                     | `bow_draw.fbx`            |
| Bow release            | Shot release                        | `bow_release.fbx`         |
| Staff cast             | Magic cast gesture                  | `staff_cast.fbx`          |
| Channel                | Held cast/beam/totem style action   | `channel.fbx`             |
| Hit reaction           | Damage response                     | `hit_react.fbx`           |
| Dash / roll            | Utility movement burst              | `dash_roll.fbx`           |
| Death                  | Death pose/fall                     | `death.fbx`               |
| Respawn                | Return to controllable idle         | `respawn.fbx`             |

If a new asset lacks required clips, it can be used only as a temporary visual
placeholder. The missing states must be documented before integration.

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
- Legacy FBX animation retargeting converts bone rotations from each source
  FBX rest pose into the base skin rest pose and discards imported bone-position
  tracks; gameplay/network transforms own world movement and the current base
  skin does not share the animation FBXs' Mixamo-scale hip space.

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
- Keep `player_base.fbx` as the mesh/skin source. A legacy animation FBX with
  its own clip is not an acceptable base asset.
- Keep character materials toon/flat and browser-cheap.

## Current Gaps

The active legacy FBX character set satisfies the animation coverage contract
and drives the runtime `AnimationMixer`. It is the current primary runtime
character until a replacement asset is found that is both animation-complete and
visually stronger.

The older `player.glb` is still valid only as a visual fallback/placeholder. It
lacks dedicated bow, staff, parry, jump, fall, land, channel, and respawn clips.

Before replacing the asset, audit the candidate against this file and run the
local character audit script.

```bash
pnpm audit:character
node tools/asset-pipeline/audit-character-glb.mjs <candidate.glb>
node tools/asset-pipeline/audit-character-glb.mjs <candidate.gltf>
```
