# Loadout & Build System

The Loadout Forge is class-aware. It edits the complete build for the selected class; it does not ask the player to pick one isolated slot first.

## Class Slot Grammar

Every class has 8 total slots. Slot legality is fixed by class:

| Class   | Melee | Bow | Magic Base | Magic Advanced | Utility |
| ------- | ----- | --- | ---------- | -------------- | ------- |
| Tank    | 4     | 1   | 0          | 0              | 3       |
| Arciere | 0     | 4   | 2          | 0              | 2       |
| Mago    | 0     | 0   | 3          | 2              | 3       |
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

- Hold `E` for the weapon ability wheel, select, release to prime, `LMB` to fire or confirm.
- Hold `Q` for the utility wheel, select, release to prime, `LMB` to fire or confirm.
- Number keys `1-5` cast equipped magic slots. No class may expose more than five
  `magicBase` + `magicAdvanced` slots.

The `E` wheel is for weapon abilities only (`melee`/`bow`). The `Q` wheel is for
utility/recovery only. Magic slots are direct keys:

| Class   | Weapon Wheel `E` abilities | Spell keys `1-5` | Utility Wheel `Q` |
| ------- | -------------------------- | ---------------- | ----------------- |
| Tank    | 5                          | 0                | 3                 |
| Arciere | 4                          | 2                | 2                 |
| Mago    | 0                          | 5                | 3                 |
| Ibrido  | 2                          | 4                | 2                 |

## Loadout Forge UI Contract

The Forge must show the whole build at once:

- class selector with allowed weapons and family budgets visible;
- slot columns grouped by family, not duplicate class/weapon rows;
- search always visible;
- filters `SMART`, `CONTROL`, `PROJECTILE`, `RECOVERY`, `ZONE`, `MOBILITY`, `ALL`;
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
| Melee       | Whirlwind      |
| Bow         | Piercing Shot  |
| Utility     | Brace Recovery |
| Utility     | Barrier        |
| Utility     | Quick Dash     |

### Arciere

| Slot family | Pick           |
| ----------- | -------------- |
| Bow         | Pin Shot       |
| Bow         | Marksman Shot  |
| Bow         | Disengage Shot |
| Bow         | Volley         |
| Magic Base  | Frost Bolt     |
| Magic Base  | Fireball       |
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
| Utility        | Arcane Rebind |
| Utility        | Phase Shift   |
| Utility        | Smoke Screen  |

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
