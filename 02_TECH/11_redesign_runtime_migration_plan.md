---
id: redesign_runtime_migration_plan
title: Redesign Runtime Migration Plan
section: tech
tags: [migration, classes, loadout, movement, abilities]
provides: [redesign_runtime_order, redesign_runtime_risk_map]
deps:
  [
    ../GAME_SYSTEM_MODEL.md,
    ../REDESIGN_MASTER_PLAN.md,
    ../01_DESIGN/01_arena_fps_reference_study.md,
    ../01_DESIGN/05_ability_target_roster_pass1.md,
  ]
status: plan
---

# Redesign Runtime Migration Plan

## Goal

Move the playable classless slice to the class-based arena-FPS target without
repeating the current failure mode where menus, loadout, server validation and
HUD describe different games.

This plan follows the runtime facts already present:

- ability schema has one legacy `magic` slot type;
- `ClientLoadoutMessage` is fixed as one melee, one bow, five magic, four
  utility ids;
- client loadout helpers normalize every build to 11 legacy slot indexes and
  inject fixed transfers;
- server loadout validation and default slots enforce those fixed transfers;
- replicated `Player` still exposes Mastery and transmute state;
- movement and airborne rejection are spread across controller, room and ability
  engine.

## Non-negotiable migration rules

1. Main menu -> Loadout -> Training must stay smoke-testable after each code
   pass.
2. Do not remove a legacy state path until the replacement validation, HUD and
   starter build path exist.
3. Do not tune class balance while old movement still treats airborne as a
   general lockout.
4. Do not redesign presentation around a temporary mixed Mastery/Recovery model.
   Transitional UI must label legacy state as legacy or hide it when the class
   path is active.
5. Server validation owns class legality, slot counts, resources, impulse and
   cast legality. The client can guide and predict; it cannot authorize.

## Target shared model

### Class and slot taxonomy

Add shared target vocabulary before replacing loadout wire shape:

- `ClassId`: `tank`, `archer`, `mage`, `hybrid`;
- target slot family:
  - `melee`;
  - `bow`;
  - `magicBase`;
  - `magicAdvanced`;
  - `utility`;
- class slot grammar from `01_DESIGN/00_classes.md`;
- class weapon access and resource max tables;
- Recovery ability rows and class mechanic identifiers.

Migration note: the existing `magic` slot may remain as a compatibility field
inside the first schema pass, but any new target ability metadata must state
whether it is `magicBase` or `magicAdvanced`.

### Ability metadata needed

The target `AbilityDef` layer needs fields or equivalent validated metadata for:

- legal classes;
- target slot family;
- explicit airborne policy:
  - default legal;
  - grounded caster required;
  - grounded target required;
  - incompatible channel/placement condition;
- self/enemy impulse payload separate from damage;
- Recovery/class mechanic spend interaction where applicable;
- player-facing tooltip text without legacy transfer/Mastery explanations.

Do not overload old `knockup` with all impulse behavior. Launch pressure and
generic impulse need a shared movement path but remain readable effect concepts.

## Loadout protocol target

Replace the fixed classless loadout payload with a class-aware envelope:

```ts
{
  classId: ClassId
  melee: string[]
  bow: string[]
  magicBase: string[]
  magicAdvanced: string[]
  utility: string[]
  instantCast?: Record<string, boolean>
}
```

Server validates:

- exact per-class counts;
- ability ids exist;
- ability target family matches the receiving array;
- class legality;
- no duplicate ability ids where duplication stays forbidden;
- weapon access for the chosen class;
- starter/default fallback build for invalid or missing local storage.

The old tuple payload is removed only after client Loadout Station, send helper,
server default slots and tests use the class-aware envelope.

## Runtime migration order

### Pass 0 - Flow guardrail

- Keep browser smoke for menu -> Loadout -> Training at the front of every pass.
- Record current failing/legacy surfaces: fixed transfer strip, Mastery pills,
  airborne rejects, old slot tuple, current character/visual issues if touched.
- Add or update tests only where they guard the touched pass.

### Pass 1 - Shared target vocabulary

- Add class ids, class slot grammar and class resource max tables in shared.
- Add target slot-family and legal-class metadata lane for ability defs.
- Add target Recovery rows to registry plan or staged definitions without
  switching runtime casting yet.
- Keep old loadout wire/runtime functioning.

Exit:

- code can describe target class legality without inferring it from UI;
- no playable path changed yet.

Implementation note:

- `packages/shared/src/constants/classes.ts` owns the first target class ids,
  slot counts, resource maxima, weapon access, mechanic ids and Recovery ids;
- `AbilityDef.targetSlotFamily` and `AbilityDef.targetLegalClasses` are optional
  migration metadata until the target protocol and registry rows consume them.

### Pass 2 - Movement and air legality foundation

- Refactor controller toward acceleration/friction/preserved air velocity.
- Replace blanket `airborne` cast/parry/sword/staff rejects with explicit
  per-action policy.
- Introduce server-owned impulse path for enemy knockback and self impulse.
- Keep target fall damage and own ability damage at zero.

Exit:

- jump, air aim, all weapon M1 families, parry/shield and approved air casts can
  be smoke tested without the old helpless-air model;
- impulse tests cover collision and reconciliation-critical math.

First runtime slice:

- ability casts are legal in air by default and can opt into
  `AbilityDef.airPolicy = groundedCaster`;
- knockup no longer zeros horizontal movement input in the shared controller;
- Sword, Staff, primed casts, placement confirms and parry are no longer
  cancelled solely by `airborneUntilTick`.

### Pass 3 - Class and loadout wire model ✅ COMPLETE (2026-05-22)

- Add replicated class id and class resource maxima/application. ✅
- Add class-aware loadout protocol and server validation. ✅
- Replace client `normalizeLoadoutSlots`/fixed-transfer injection with
  class-aware slot helpers. ✅ (`normalizeLoadoutSlots` now pads-only, no injection)
- Add target starter builds for all classes. ✅ (all 4 class presets in
  `loadout-station.ts`; server `DEFAULT_LOADOUT` → Ibrido starter)
- Keep Recovery and ability roster narrow enough to enter Training before full
  visual redesign. ✅

Exit:

- client can choose a class and start Training with its starter build; ✅
- server rejects cross-class slot abuse. ✅ (budget-family validation in
  `handleLoadoutSet`; 4 new tests in `classes.test.ts` guard legality)

Implementation notes:
- `FIXED_TRANSFER_SLOTS` kept as deprecated export for legacy `cd-strip.ts` HUD
  rendering; removed from all starter build paths.
- Wire format remains `melee/bow/magic[5]/utility[4]` for Pass 3. Abilities are
  validated by family budget regardless of wire position. Full class-aware
  envelope (`melee[]/bow[]/magicBase[]/magicAdvanced[]/utility[]`) is Pass 4.
- 173 tests green (14 client, 89 shared, 70 server).

### Pass 4 - Ability roster split ✅ COMPLETE (2026-05-22)

- Split Magic runtime into Base and Advanced slot families. ✅
  (Wire protocol updated to class-aware envelope: melee[]/bow[]/magicBase[]/
  magicAdvanced[]/utility[] — old magic[5] tuple removed)
- Add the four Recovery utility rows. ✅ (were already in registry from Pass 1;
  now in all class starter builds and server DEFAULT_LOADOUT)
- Remove fixed transfers from target loadout, client strip, server validation
  and default build path. ✅ (ABILITY_LEGAL_CLASSES sets transfer_*: [] for
  all classes; server rejects them; no starter build references them)
- Remove Bleed counterplay dependency on transmutation. ✅
  (bleed.cleansedByTransmute = false; counterplay is now Cleanse Surge)
- Replace old Mastery-driven build coaching with class mechanic/build coverage. ✅
  (analyzeBuild now checks Recovery presence instead of Mastery level; masteryHint
  function removed; Build Coach Recovery pill replaces Mastery pill)

Exit:

- target starter builds use real target slot families and Recovery; ✅
- no target HUD or Loadout path requires fixed transfers. ✅

Implementation notes:
- `buildLoadoutMessage` now classifies abilities by `getAbilitySlotFamily` into
  the new wire arrays. `LoadoutStationApi.getClassId()` added for callers.
- `FIXED_TRANSFER_SLOTS` deprecated but kept for legacy `cd-strip.ts` HUD;
  removed from all logical paths. Full removal in Pass 6.
- Mastery pills (rebuildMastery) are still rendered as legacy display;
  their surface removal is Pass 6 (after class mechanic state is live).
- 177 tests green (15 client, 92 shared, 70 server).

### Pass 5 - Class mechanic runtime

- Implement Fury, Momentum, Risonanza and Flow server-side.
- Replicate only the class mechanic state HUD needs.
- Make Recovery and class payoffs consume class mechanic state
  authoritatively.
- Revisit resource regen and class max pools against real class runtime.

Exit:

- class labels change gameplay, not only slot availability.

### Pass 6 - HUD, Loadout and visual execution

- Redesign Loadout around class selection, target slot rails, SMART coverage,
  Recovery visibility and cast modes.
- Redesign HUD around class-aware resources, class mechanic indicator, target
  ability/utility bars and world enemy health.
- Execute menu/loading/logo/VFX/projectile work from the visual documents after
  the surfaces point at the target game.

Exit:

- first flow looks and plays like one game from menu to match.

## State removal checklist

Remove or demote only when replacement pass is live:

| Legacy state/path                              | Replacement condition                                                  | Status     |
| ---------------------------------------------- | ---------------------------------------------------------------------- | ---------- |
| `magic[5]` tuple loadout                       | Class-aware `magicBase` / `magicAdvanced` arrays validated server-side | ✅ Pass 4   |
| fixed transfer slot injection                  | Target Utility arrays plus Recovery starter builds                     | ✅ Pass 4   |
| transmute HUD strip                            | No live target cast path references transfer cooldowns                 | Pass 6     |
| Mastery pills/build coach                      | Class mechanic/build coverage surfaces exist                           | Partial ✅ (Build Coach done Pass 4; pills remain as legacy display until Pass 6) |
| `masteryElement` / `masteryTier` UI dependence | Class mechanic state and any deliberate legacy fallback are separated  | Pass 5/6   |
| blanket airborne rejection reasons             | Explicit ability/state air policy and tests cover rejection cases      | ✅ Pass 2   |

## Minimum verification per pass

For code passes touching client/UI/combat:

- `pnpm --filter @ragequit/client test`
- `pnpm --filter @ragequit/client build`
- `pnpm lint`

For shared/server combat passes, add focused tests for:

- class slot validation;
- ability legality by class;
- air action allow/reject policy;
- impulse collision/reconciliation helpers;
- Recovery resource/class mechanic spend;
- default starter builds accepted by server.

For playable passes, browser smoke:

1. main menu opens with no console errors;
2. class/loadout confirm reaches Training;
3. pointer lock/input capture works;
4. Sword/Bow/Staff availability matches class;
5. LMB/RMB, wheel prime/fire, direct casts, Recovery and pause/resume still
   work for the touched class path.

## First implementation target

The first implementation slice should not be "rewrite every ability." It should
be:

1. shared class vocabulary and class-aware starter data;
2. movement/air legality foundation;
3. one end-to-end class-aware Training path with server validation;
4. then the full roster migration.

That creates a real vertical path to verify instead of a half-migrated registry
that cannot be entered from the menu.
