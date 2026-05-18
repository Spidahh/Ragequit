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

## Current Contract

All 52 abilities live in `packages/shared/src/abilities/registry.ts` and use the schema in `packages/shared/src/abilities/types.ts`.

Counts:

| Slot | Count | Notes |
| --- | ---: | --- |
| melee | 6 | One selected in the loadout |
| bow | 8 | One selected in the loadout |
| magic | 27 | Five selected; only these drive Mastery |
| utility | 11 | Three fixed transfer utilities plus one flex utility |
| total | 52 | No passive/rune system |

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
  effects: readonly EffectSpec[]
  description: string
  miniMalus: string
  canParry?: boolean
  isKnockup?: boolean
  isStarter?: boolean
}
```

Targeting notes:

| Targeting | Runtime behavior |
| --- | --- |
| `self` | Effects resolve on caster |
| `forward` | Uses current yaw/pitch; direct effects use aimed enemy selection |
| `target` | Explicit target id when supplied |
| `point` | Uses client-provided ground point, clamped client-side for preview and server-side for authority |

## Effect Primitives

Current primitives:

| Primitive | Purpose |
| --- | --- |
| `damage` | Direct or radius damage, optional element/lifesteal/excludePrimary |
| `applyStatus` | Burn/chill/bleed/poison/slow/root/stun/freeze/curse/blind/mark/shield/haste/invulnerable |
| `knockup` | Airborne lock; optional grounded-target requirement; optional horizontal knockback distance |
| `heal` | Instant or over-time healing |
| `lifesteal` | Cast-level lifesteal fraction |
| `resourceDrain` | Drain Mana or Stamina from the resolved enemy and optionally refund part to the caster |
| `projectile` | Arrow/bolt-like projectile with gravity, splash, on-hit status |
| `zone` | Circle/wall zones with duration, arming delay, damage/status ticks |
| `move` | Dash/teleport with collision cancellation and optional movement direction |
| `channel` | Sustained tick effect; can break on movement or damage |
| `cleanse` | Remove one status or all debuffs |
| `restoreStamina` | Flat stamina restore |
| `transmute` | Fixed HP/Mana/Stamina transfer utilities |

## Runtime Guarantees

- Ability casts validate alive state, cast lock, swing/charge lock, airborne, parry, Phase Shift, GCD, per-ability cooldown, weapon requirement, and resource cost.
- Windups are interruptible through `AbilityEngine.cancelCast`.
- Channels keep `Player.casting` active and block other casts until finished/interrupted.
- Parryable abilities skip status/knockup followups when the initial hit is parried.
- Point-target abilities use `ClientCastMessage.targetPoint`; the client may preview range, but the server clamps the final point to the ability range.
- Mastery applies through shared constants and is computed from the five magic slots only.
- "Ray" abilities are implemented with `targeting: 'forward'` plus direct `damage`, `applyStatus`, `knockup`, or `resourceDrain` effects. The server picks the aimed line-of-sight enemy within range, so these are instant but still require crosshair discipline.
- HP drain must stay as `damage` + `lifesteal`; `resourceDrain` is only for Mana/Stamina so shields, parry, invulnerability, damage events, and death credit are not bypassed.

## Validation Coverage

Core checks live in:

- `packages/shared/src/abilities/registry.test.ts`
- `packages/server/src/sim/AbilityEngine.test.ts`
- `packages/shared/src/constants/mastery.test.ts`
- `packages/client/src/input/loadout-slots.test.ts`
- `packages/client/src/loadout-station.test.ts`

These tests protect counts, fixed transfers, slow fractions, mastery slot rules, targeting, movement collision contracts, parry followups, channel interruption, and loadout payload shape.
