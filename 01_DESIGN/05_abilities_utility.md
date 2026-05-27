# Utility Abilities

Utility is a class-legal slot family. It contains recovery, movement, protection, cleanse/counter and pressure tools. It does not contain passive systems, extra slots, or fixed resource-transfer slots.

## Class Recovery

| Class   | Utility        | Role                                                                   |
| ------- | -------------- | ---------------------------------------------------------------------- |
| Tank    | Brace Recovery | Spend Stamina to brace and recover                                     |
| Arciere | Hunter's Flow  | Recover while moving                                                   |
| Mago    | Arcane Rebind  | Spend Mana and cast a visible heal                                     |
| Ibrido  | Adaptive Mend  | Fast lower-peak heal                                                   |

Every starter build includes its class Recovery.

## Utility Pool

Exact runtime values live in `packages/shared/src/abilities/registry.ts`.

| Name           | Role                   | Constraint                                 |
| -------------- | ---------------------- | ------------------------------------------ |
| Healing Potion | Slow generic recovery  | Slow heal gives opponent time to pressure  |
| Quick Dash     | Movement               | No iframes, walls stop the dash            |
| Mark Target    | Pressure/resource deny | Requires line of sight; low damage         |
| Cleanse Surge  | Cleanse/counter        | Does not heal by itself                    |
| Barrier        | Protection             | Defensive only; no damage or crowd control |
| Energize       | Stamina restore        | Does not restore HP or Mana                |
| Phase Shift    | Timed survival         | Cannot attack or cast while phased         |
| Smoke Screen   | Aim denial/line break  | Visible to both sides; no damage           |
| Brace Recovery | Tank recovery          | Tank legal Recovery                        |
| Hunter's Flow  | Arciere recovery       | Arciere legal Recovery                     |
| Arcane Rebind  | Mago recovery          | Mago legal Recovery                        |
| Adaptive Mend  | Ibrido recovery        | Ibrido legal Recovery                      |

## Rules

- Quick Dash is positional movement, not a dodge; it has no iframes.
- Phase Shift is defensive; the server blocks attacks and casts while phased.
- Mark Target drains the enemy target's resource pool, not the caster's.
- Drain abilities reduce the target's resource unless the description explicitly says the cost is paid by the caster.
- Dark lifesteal and Nature healing are magic sustain, not permission to inflate Utility Recovery budgets.
