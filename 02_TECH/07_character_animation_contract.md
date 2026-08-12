# Character And Animation Contract

This file defines the technical contract for playable character assets in the
Three.js client. It exists so a character model is never accepted only because it
loads; it must support the gameplay states RAGEQUIT actually exposes.

## Current Runtime

RAGEQUIT ships realistic Mixamo-rig characters (STILE.md: PBR materic, NOT
toon/low-poly) as single self-contained GLBs with their own embedded clips,
built offline by `tools/asset-pipeline/mixamo-to-glb.mjs` from
`character-sources/mixamo/` FBX packs (FBX2glTF + gltf-transform merge/retarget-
by-bone-name/optimize — retargeting NEVER happens at runtime).

- Class model asset paths (`packages/client/public/characters/`):
  `paladin.glb` (tank), `erika.glb` (archer), `vampire.glb` (mage), `ninja.glb`
  (hybrid) — declared per class as `mixamoGlb` in
  `packages/shared/src/constants/classes.ts`.
- Shared fallback animation asset: `characters/UAL1_Standard.glb` (used by
  `ANIM_NAME_MAP` when a class has no `mixamoGlb`, and by the legacy modular path).
- Loader/runtime split by responsibility:
  - `render/character-loader.ts` — fetch/install the GLB, `mapCharacterClips()`
    (name/regex candidate matching per pack — see below).
  - `render/character-animation.ts` — `AnimName` vocabulary, mixer store, crossfade
    state machine (`selectCharacterAnimation`, `_crossfade`).
  - `render/character-weapons.ts` — per-rig weapon grip/socket.
  - `render/characters.ts` — team-rim outline, brightness boost, shared install helpers.
- Local player creation: `main.ts`. Remote player rendering: `render/remote-players.ts`.
- The runtime uses the class-based single-GLB path:
  - `makeCharacter()` creates a procedural low-poly silhouette immediately
    (toon-shaded, `character.ts` — placeholder only, see Materials below).
  - The class's GLB (`mixamoGlb`) loads and installs in place of the silhouette;
    on load/validation failure the silhouette stays up (never a broken model).
  - Each character instance gets its own skeleton clone and `AnimationMixer`.
  - Local first-person bow/staff hides only the local `selfMesh`; remote players
    must remain visible regardless of their active weapon.

## Required Asset Structure

A playable character model must contain:

- At least one renderable `SkinnedMesh`.
- A skeleton/skin that survives `SkeletonUtils.clone`.
- The model's own authored PBR materials (`MeshStandardMaterial` — roughness/
  metalness/normal ranges per STILE.md §2). Do NOT convert to `MeshToonMaterial`.
- A valid world-space bounding box after import.
- A forward orientation compatible with the game yaw convention.
- Mixamo rig (`mixamorig...` bone names) for zero-retarget animation sharing
  across stock characters. Budget: 15k–30k tris (STILE.md §6).

Texture maps are optional. Flat-color materials are acceptable but the
realistic direction expects a baked PBR texture set (BaseColor/Normal/ORM) —
flat color is a placeholder state, not the target.

## Required Animation Coverage

These states are required by gameplay (`AnimName` in `render/character-animation.ts`,
23 entries: `Idle`, `Attacking_Idle`, `Sword_Idle`, `Bow_Idle`, `Staff_Idle`, `Run`,
`Walk`, `Dagger_Attack`, `Dagger_Attack2`, `Death`, `Punch`, `RecieveHit`,
`RecieveHit_Attacking`, `Roll`, `Jump`, `Land`, `Airborne`, `Parry_Block`, `Bow_Draw`,
`Bow_Release`, `Staff_Cast`, `Channel`, `Respawn`). `ANIM_NAME_MAP` gives the
`UAL1_Standard.glb` fallback clip per state; a class's own `mixamoGlb` overrides
whatever `mapCharacterClips()` finds in its embedded clip library.

Every Mixamo pack ships differently-named clips. `mapCharacterClips()` maps
embedded clip names to `AnimName` by an ordered exact-name candidate list per
pack, falling back to a regex (e.g. `/(^|_)idle(_|$)/`) — **never by array
index**. When wiring a new character/pack, extend the candidate lists; do not
assign idle/run/attack/death positionally.

## Runtime Mapping Rules

The animation state machine must be driven by replicated/player state, not by
client-only guesses where authoritative state exists.

- `alive=false` maps to `Death`.
- `activeWeapon=sword` plus melee swing maps to sword attack clips (`Dagger_Attack`/`Dagger_Attack2`).
- Bow charge maps to `Bow_Draw`/`Bow_Idle` when a clip exists.
- Staff casting maps to `Staff_Cast`/`Channel` when clips exist.
- `airborneUntilTick > schemaTick` maps to `Jump`/`Land`/`Airborne`.
- `parrying=true` maps to `Parry_Block`.
- Damage feedback maps to `RecieveHit`/`RecieveHit_Attacking` when available.
- Runtime clip resolution lives in `render/character-loader.ts` (`mapCharacterClips`)
  and `render/character-animation.ts` (state → clip selection, crossfade).
- Crossfade is a single active-clip machine (no separate locomotion/action
  layers): a fresh state always cancels the in-progress one, with per-state
  fade durations tuned for snappiness (e.g. `RecieveHit` 0.05s, `Run`/`Walk` 0.14s).

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
  mesh is proven to be a non-render helper (exception: prop meshes like
  `Bow`/`Arrow` embedded in a character GLB are shown/hidden by weapon state —
  see `character-weapons.ts`).
- Do not hardcode character scale when a valid renderable bounding box is
  available. Render height is locked via `CHARACTER_RENDER_HEIGHT_M` (STILE.md §6).
- Keep the model's own PBR materials; stay within the tris budget (browser-cheap).
- Outline: team-colored rim only (`render/outlines.ts`), never a black toon outline.

## Current Asset State

The active character set is the four class GLBs (`paladin.glb`, `erika.glb`,
`vampire.glb`, `ninja.glb`) plus `UAL1_Standard.glb` as the shared fallback clip
source. The legacy modular `.gltf`+`.bin` character set and the toon-shaded
procedural silhouette (`character.ts`) remain as the load-failure fallback path,
not the live in-match body.

Character asset acceptance uses this file plus the local audit scripts.

```bash
pnpm audit:character
node tools/asset-pipeline/audit-character-glb.mjs <character.glb>
node tools/asset-pipeline/audit-character-glb.mjs <character.gltf>
```
