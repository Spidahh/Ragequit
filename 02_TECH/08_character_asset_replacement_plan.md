# Character Asset Replacement Plan

This file records the practical replacement path for the current placeholder
player character.

## Problem

`packages/client/public/characters/player.glb` is a valid rigged placeholder, but
it does not satisfy the gameplay animation contract in
`02_TECH/07_character_animation_contract.md`.

The active runtime has been moved to the legacy FBX character set copied from:

`E:\GIOCHI\ASSET_GRAFICA\asset_vecchi\characters\player`

Old `player.glb` missing states:

- `jump_start`
- `fall_airborne`
- `land`
- `parry_block`
- `bow_draw`
- `bow_release`
- `channel`
- `respawn`

The old GLB remains a temporary fallback, but it must not be treated as the final
character solution.

## Active Local Solution

The active character set is now:

- `packages/client/public/characters/legacy/player_base.fbx`
- `packages/client/public/characters/legacy/animations/*.fbx`

It is audited by:

```bash
pnpm audit:character
```

Current result: PASS.

The set covers idle, run, walk, jump, airborne, land, sword attack 1/2, parry,
bow draw/release, staff cast, channel, hit reaction, dash/roll, death, and
respawn.

Visual note: the legacy Mixamo-compatible set is animation-complete and is the
current primary runtime character. A future replacement must beat it on both
axes: full animation coverage and a clearer standalone silhouette.

## Recommended Source Direction

Use a coherent humanoid character + animation-library pair instead of mixing
random assets.

Recommended candidate:

- Quaternius Universal Base Characters
- Quaternius Universal Animation Library
- Quaternius Universal Animation Library 2

Why this is the strongest current path:

- CC0 license.
- Browser-friendly stylized/low-poly direction.
- glTF/GLB formats available.
- Universal humanoid rig intended for retargeting.
- Base Characters are explicitly compatible with the Universal Animation Library.
- Animation Library 1 covers locomotion and general character actions.
- Animation Library 2 adds armed/melee combos and broader action coverage.

Sources checked:

- `https://quaternius.com/packs/universalbasecharacters.html`
- `https://quaternius.com/packs/universalanimationlibrary.html`
- `https://quaternius.com/packs/universalanimationlibrary2.html`

## Why Not Continue With The Current Player GLB

The current GLB has useful clips:

- `Idle`
- `Attacking_Idle`
- `Run`
- `Walk`
- `Dagger_Attack`
- `Dagger_Attack2`
- `Death`
- `Punch`
- `RecieveHit`
- `RecieveHit_Attacking`
- `Roll`

But it does not contain dedicated bow/staff/parry/jump/channel coverage. Faking
those forever would make combat readability worse, especially against remote
players.

## Integration Rules

Do not replace `player.glb` directly until the candidate asset passes:

```bash
node tools/asset-pipeline/audit-character-glb.mjs <candidate.glb>
```

If the asset is split into a character file plus animation library files, build a
combined runtime plan first:

- one stable character rig;
- one clip registry;
- named animation mapping from gameplay states to clip names;
- explicit fallback for any missing clip;
- no global invisibility for weapon changes;
- remote player visibility preserved for all weapons.

## Target Animation Map

The replacement should provide these final mappings:

| Gameplay state  | Target animation           |
| --------------- | -------------------------- |
| Idle            | combat idle                |
| Run             | forward run                |
| Walk            | slow move / interpolation  |
| Jump start      | jump start                 |
| Fall / airborne | fall or airborne loop      |
| Land            | landing                    |
| Sword attack 1  | melee slash 1              |
| Sword attack 2  | melee slash 2              |
| Parry / block   | guard or block pose        |
| Bow draw        | bow aim / draw hold        |
| Bow release     | bow shoot / release        |
| Staff cast      | one-hand or two-hand cast  |
| Channel         | casting/channel loop       |
| Hit reaction    | hit reaction front         |
| Dash / roll     | dash or roll               |
| Death           | death                      |
| Respawn         | spawn/get-up or idle reset |

## Current Decision

Keep the fixed runtime safety patches already made in `characters.ts`,
`main.ts`, and `remote-players.ts`.

Future implementation pass can still test Quaternius as a cleaner long-term
visual candidate, but it must beat the local legacy FBX set on both animation
coverage and visual quality before replacing it.
