# Resource Sustain Contract

RAGEQUIT does not use fixed resource-transfer slots.

## Locked Rules

- No fixed HP -> Mana slot.
- No fixed Mana -> Stamina slot.
- No fixed Stamina -> HP slot.
- No universal hidden Mana -> HP emergency button.
- In-combat self-sustain lives in Recovery utility choices and explicit magic sustain abilities.
- Recovery must pay slot pressure, resource cost, timing, condition, tell, or loss of secondary utility.
- Builds can drop Recovery for aggression, movement or control; the Loadout Forge must make that risk visible.

## Recovery Rows

| Class   | Recovery utility | Core action                                               |
| ------- | ---------------- | --------------------------------------------------------- |
| Tank    | Brace Recovery   | Spend Stamina, recover HP and gain a short readable guard |
| Arciere | Hunter's Flow    | Recover while moving                                      |
| Mago    | Arcane Rebind    | Spend Mana with a visible cast                            |
| Ibrido  | Adaptive Mend    | Fast lower-peak self recovery                             |

## Budget Band

- Plain recovery without hard condition: about `20-30` HP/effective HP on an `18-24s` cooldown.
- Recovery that also moves, cleanses, blinds, shields or resets cooldowns gives back raw heal value.

## Runtime Authority

Exact values live in `packages/shared/src/abilities/registry.ts`.

## Reject

- Do not reintroduce fixed transfer slots.
- Do not hide sustain outside loadout choices.
- Do not stack universal heal, class heal and magic sustain as separate budgets.
