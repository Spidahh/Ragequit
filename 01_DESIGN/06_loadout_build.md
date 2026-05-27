# Loadout & Build System

The Loadout Forge is class-aware. It edits the complete build for the selected class; it does not ask the player to pick one isolated slot first.

## Class Slot Grammar

Every class has 8 total slots. Slot legality is fixed by class:

| Class   | Melee | Bow | Magic Base | Magic Advanced | Utility |
| ------- | ----- | --- | ---------- | -------------- | ------- |
| Tank    | 3     | 2   | 0          | 0              | 3       |
| Arciere | 0     | 3   | 3          | 0              | 2       |
| Mago    | 0     | 0   | 3          | 3              | 2       |
| Ibrido  | 1     | 1   | 2          | 2              | 2       |

Class weapon access must follow this grammar:

- Tank: sword + bow, no staff spell families.
- Arciere: bow + Magic Base.
- Mago: Magic Base + Magic Advanced.
- Ibrido: sword + bow + Magic Base + Magic Advanced.

Utility slots are legal utility choices. There are no passive systems, extra slots, or fixed resource-transfer slots.

## Recovery

Every starter build includes exactly one class Recovery:

| Class   | Recovery       |
| ------- | -------------- |
| Tank    | Brace Recovery |
| Arciere | Hunter's Flow  |
| Mago    | Arcane Rebind  |
| Ibrido  | Adaptive Mend  |

## Wheels And Direct Input

Wheel behavior is fixed:

- Hold `E` for the ability wheel, select, release to prime, `LMB` to fire or confirm.
- Hold `Q` for the utility wheel, select, release to prime, `LMB` to fire or confirm.
- Number keys `1-5` cast equipped magic/combat slots where the class grammar exposes them.

Both wheels are symmetrical and hold the exact same number of spells/abilities regardless of whether they are utilities or spells:

| Class   | Ability Wheel `E` sectors | Utility Wheel `Q` sectors |
| ------- | ------------------------- | ------------------------- |
| Tank    | 4                         | 4                         |
| Arciere | 4                         | 4                         |
| Mago    | 4                         | 4                         |
| Ibrido  | 4                         | 4                         |

## Loadout Forge UI Contract

The Forge must show the whole build at once:

- class selector with allowed weapons and family budgets visible;
- slot columns grouped by family, not duplicate class/weapon rows;
- search always visible;
- filters `BEST`, `STARTER`, `CONTROL`, `INSTANT`, `PREVIEW`, element filters and `PHYSICAL`;
- key hints, recovery coverage, and vitals visible;
- `#ls-magic-base` and `#ls-magic-advanced` as separate panels;
- no `#ls-magic` fallback panel;
- ability chips using the live `tagClass()` outputs only: `tag-role`, `tag-targeting`, `tag-control`, `tag-damage`, `tag-status`, `tag-move`, `tag-resource`.

The UI must make slot legality obvious before the player reads descriptions. Forbidden families are not shown as selectable dead space.

## Starter Builds

Starter builds are teaching builds, not ranked recommendations.

### Tank

| Slot family | Pick           |
| ----------- | -------------- |
| Melee       | Uppercut       |
| Melee       | Gap Closer     |
| Melee       | Guard Break    |
| Bow         | Piercing Shot  |
| Bow         | Disengage Shot |
| Utility     | Brace Recovery |
| Utility     | Barrier        |
| Utility     | Quick Dash     |

### Arciere

| Slot family | Pick           |
| ----------- | -------------- |
| Bow         | Pin Shot       |
| Bow         | Marksman Shot  |
| Bow         | Disengage Shot |
| Magic Base  | Frost Bolt     |
| Magic Base  | Fireball       |
| Magic Base  | Lightning Dash |
| Utility     | Hunter's Flow  |
| Utility     | Quick Dash     |

### Mago

| Slot family    | Pick          |
| -------------- | ------------- |
| Magic Base     | Fireball      |
| Magic Base     | Frost Bolt    |
| Magic Base     | Dark Barrier  |
| Magic Advanced | Eruption      |
| Magic Advanced | Meteor        |
| Magic Advanced | Frost Pillar  |
| Utility        | Arcane Rebind |
| Utility        | Phase Shift   |

### Ibrido

| Slot family    | Pick           |
| -------------- | -------------- |
| Melee          | Uppercut       |
| Bow            | Marksman Shot  |
| Magic Base     | Fireball       |
| Magic Base     | Lightning Dash |
| Magic Advanced | Arc Lift       |
| Magic Advanced | Meteor         |
| Utility        | Adaptive Mend  |
| Utility        | Quick Dash     |

## Saving

The Forge saves the active build in browser storage and sends the validated loadout to the server before match entry.

Exact ability stats live only in `packages/shared/src/abilities/registry.ts`.
