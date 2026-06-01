---
id: ability_dsl
title: Ability DSL
section: tech
tags: [abilities, schema, effects, data_driven]
provides: [ability_schema, effect_primitives]
deps: [01_entity_component_model.md]
status: current
---

# Ability DSL

> Current runtime contract. Class-aware loadout legality is owned by
> `packages/shared/src/constants/classes.ts`; exact ability values are owned by
> `packages/shared/src/abilities/registry.ts`.

## Current Contract

All abilities live in `packages/shared/src/abilities/registry.ts` and use the schema in `packages/shared/src/abilities/types.ts`.

Counts:

| Slot    | Count | Notes                                             |
| ------- | ----: | ------------------------------------------------- |
| melee   |     6 | One selected in the loadout                       |
| bow     |     8 | One selected in the loadout                       |
| magic   |    27 | Split by class grammar into Magic Base / Advanced |
| utility |    11 | Class-aware utility and recovery tools            |
| total   |    53 | Class-aware active abilities                      |

The server executes these definitions through `AbilityEngine`. New abilities should be added as data first; engine changes are only for genuinely new primitives.

## AbilityDef Shape

Important fields:

```ts
interface AbilityDef {
  id: string
  name: string
  slot: 'melee' | 'bow' | 'magic' | 'utility'
  element: 'none' | 'fire' | 'ice' | 'lightning' | 'dark' | 'nature'
  weapon: 'sword' | 'bow' | 'staff' | 'none'
  costMana: number
  costStamina: number
  cooldownSec: number
  windupSec: number
  range: number
  targeting: 'self' | 'forward' | 'target' | 'point'
  comboRole: // Standard 6-role taxonomy. See 01_DESIGN/05_abilities_philosophy.md.
    'starter' | 'finisher' | 'pressure' | 'survival' | 'counter' | 'mobility'
  effects: readonly EffectSpec[]
  description: string
  miniMalus: string
  canParry?: boolean
  isKnockup?: boolean
}
```

Targeting notes:

| Targeting | Runtime behavior                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------ |
| `self`    | Effects resolve on caster                                                                        |
| `forward` | Uses current yaw/pitch; direct effects use aimed enemy selection                                 |
| `target`  | Explicit target id when supplied                                                                 |
| `point`   | Uses client-provided ground point, clamped client-side for preview and server-side for authority |

## Effect Primitives

Current primitives:

| Primitive        | Purpose                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------- |
| `damage`         | Direct or radius damage, optional element/lifesteal/excludePrimary                       |
| `applyStatus`    | Burn/chill/bleed/poison/slow/root/stun/freeze/curse/blind/mark/shield/haste/invulnerable |
| `knockup`        | Launch/displacement primitive; airborne is not hard CC                                   |
| `heal`           | Instant or over-time healing                                                             |
| `lifesteal`      | Cast-level lifesteal fraction                                                            |
| `resourceDrain`  | Drain Mana or Stamina from the resolved enemy and optionally refund part to the caster   |
| `projectile`     | Arrow/bolt-like projectile with gravity, splash, on-hit status                           |
| `zone`           | Circle/wall zones with duration, arming delay, damage/status ticks                       |
| `move`           | Dash/teleport with collision cancellation and optional movement direction                |
| `channel`        | Sustained tick effect; can break on movement or damage                                   |
| `cleanse`        | Remove one status or all debuffs                                                         |
| `restoreStamina` | Flat stamina restore                                                                     |

## Combo Role Contract

`comboRole` is mandatory and design-authored. Do not infer it from effects in new ability data. There is no separate `isStarter` flag: starter filtering, tags, and tests read `comboRole` directly.

Standard 6-role taxonomy (design target):

| Role       | Contract                                                                              |
| ---------- | ------------------------------------------------------------------------------------- |
| `starter`  | Applies real control: launch, root, freeze, stun, blind, or meaningful slow           |
| `finisher` | Rewards setup with high-value damage or precision payoff (no airborne multiplier)     |
| `pressure` | Damage/debuff that is not an opener: poke, DoT, zone, space denial, or resource drain |
| `survival` | Heal, shield, sustain, or resource restore                                            |
| `counter`  | Cleanse, phase, disengage, anti-melee, or interrupt answer                            |
| `mobility` | Repositioning tool that changes engage/disengage geometry                             |

Legacy roles were removed from the type. For reference, they mapped as:

| Removed role | Now expressed as                                                            |
| ------------ | --------------------------------------------------------------------------- |
| `extender`   | `pressure` (zone/space-denial is pressure)                                  |
| `drain`      | `pressure` (resource attrition is pressure)                                 |
| `resource`   | `survival` (restoring own resources is sustain)                             |
| `ray`        | a real role + instant-LOS delivery (`windupSec: 0`, `targeting: 'forward'`) |

## Runtime Guarantees

- Ability casts validate alive state, cast lock, swing/charge lock, parry,
  Phase Shift, GCD, per-ability cooldown, weapon requirement and resource cost.
  Airborne alone is not a global rejection reason.
- Windups are interruptible through `AbilityEngine.cancelCast`.
- Channels keep `Player.casting` active and block other casts until finished/interrupted.
- Parryable abilities skip status/knockup followups when the initial hit is parried.
- Point-target abilities use `ClientCastMessage.targetPoint`; the client may preview range, but the server clamps the final point to the ability range.
- "Ray" abilities are implemented with `targeting: 'forward'` plus direct `damage`, `applyStatus`, `knockup`, or `resourceDrain` effects. The server picks the aimed line-of-sight enemy within range, so these are instant but still require crosshair discipline.
- HP drain must stay as `damage` + `lifesteal`; `resourceDrain` is only for Mana/Stamina so shields, parry, invulnerability, damage events, and death credit are not bypassed.
- `comboRole: 'finisher'` carries no damage multiplier on the server. Finisher abilities deal their flat base damage regardless of the victim's airborne state. There is no airborne window multiplier. Knockup creates aim pressure and lower evasion options — the reward is positional, not a server-side bonus.

## Validation Coverage

Core checks live in:

- `packages/shared/src/abilities/registry.test.ts`
- `packages/server/src/sim/AbilityEngine.test.ts`
- `packages/client/src/input/loadout-slots.test.ts`
- `packages/client/src/loadout-station.test.ts`

These tests protect the current runtime counts, slow fractions, targeting,
movement collision contracts, parry followups, channel interruption, and
class-aware loadout payload shape. Tests must change with live contracts rather
than preserving obsolete assertions.
