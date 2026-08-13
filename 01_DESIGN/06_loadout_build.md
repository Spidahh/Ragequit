# Loadout & Build System

The Loadout Forge is class-aware. It edits the complete build for the selected class; it does not ask the player to pick one isolated slot first.

## Class Slot Grammar

Every class has 8 total slots. Slot legality is fixed by class:

| Class   | Melee | Bow | Magic Base | Magic Advanced | Utility |
| ------- | ----- | --- | ---------- | -------------- | ------- |
| Tank    | 4     | 1   | 0          | 0              | 3       |
| Arciere | 0     | 4   | 2          | 0              | 2       |
| Mago    | 0     | 0   | 3          | 3              | 2       |
| Ibrido  | 2     | 1   | 2          | 1              | 2       |

Class weapon access must follow this grammar:

- Tank: sword + bow, no staff spell families.
- Arciere: bow + Magic Base.
- Mago: Magic Base + Magic Advanced.
- Ibrido: sword + bow + Magic Base + Magic Advanced.

Utility slots are legal utility choices. There are no extra ability slots and no
fixed resource-transfer slots.

> **Corrected 2026-08-13 (D16, `00_truth.md`).** This line used to end "there are
> no passive systems, extra slots, or fixed resource-transfer slots" — which
> directly forbade specialisations, one of the three things `00_vision.md` says
> the game IS. The ban on extra ability slots and resource-transfer slots
> stands; the blanket ban on passives does not. See
> `01_DESIGN/08_specializations.md`.

## Recovery

Every preset build includes exactly one class Recovery:

| Class   | Recovery       |
| ------- | -------------- |
| Tank    | Brace Recovery |
| Arciere | Hunter's Flow  |
| Mago    | Arcane Rebind  |
| Ibrido  | Adaptive Mend  |

## Wheels

Every ability has a direct key on the hotbar (default `1`-`8`, rebindable). The two wheels are a radial **alternative**: 4 sectors each, E = slots 1-4, Q = slots 5-8, sharing the same bind as the direct key.

- Hold `E`, select sector, release to prime, `LMB` to fire or confirm.
- Hold `Q`, select sector, release to prime, `LMB` to fire or confirm.

Per-class assignment (4 slots per wheel, all 8 covered):

| Class   | E Wheel (4)                   | Q Wheel (4)                               |
| ------- | ----------------------------- | ----------------------------------------- |
| Tank    | 4 melee                       | 1 bow + 3 utility                         |
| Arciere | 4 bow                         | 2 magicBase + 2 utility                   |
| Mago    | 3 magicBase + 1 magicAdvanced | 2 magicAdvanced + 2 utility               |
| Ibrido  | 2 melee + 1 bow + 1 magicBase | 1 magicBase + 1 magicAdvanced + 2 utility |

## Loadout Forge UI Contract

The Forge must show the whole build at once:

- class selector with allowed weapons and family budgets visible;
- slot columns grouped by family, not duplicate class/weapon rows;
- E wheel lane and Q wheel lane labeled per class (each shows 4 slots);
- search always visible;
- filters `SMART`, `CONTROL`, `PROJECTILE`, `RECOVERY`, `ZONE`, `MOBILITY`, `ALL`;
- key hints, recovery coverage, and vitals visible;
- `#ls-magic-base` and `#ls-magic-advanced` as separate panels;
- no `#ls-magic` fallback panel;
- ability chips using the live `tagClass()` outputs only: `tag-role`, `tag-targeting`, `tag-control`, `tag-damage`, `tag-status`, `tag-move`, `tag-resource`.

The UI must make slot legality obvious before the player reads descriptions. Forbidden families are not shown as selectable dead space. Each slot shows which wheel it ends up on (E or Q) as a visual hint.

## Preset Builds

Preset builds are teaching builds, not ranked recommendations.

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
| Magic Advanced | Frost Pillar  |
| Utility        | Arcane Rebind |
| Utility        | Phase Shift   |

### Ibrido

| Slot family    | Pick           |
| -------------- | -------------- |
| Melee          | Uppercut       |
| Melee          | Gap Closer     |
| Bow            | Marksman Shot  |
| Magic Base     | Fireball       |
| Magic Base     | Lightning Dash |
| Magic Advanced | Arc Lift       |
| Utility        | Adaptive Mend  |
| Utility        | Quick Dash     |

## Saving

The Forge saves the active build in browser storage and sends the validated loadout to the server before match entry.

Exact ability stats live only in `packages/shared/src/abilities/registry.ts`.
