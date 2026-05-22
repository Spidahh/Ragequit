# RAGEQUIT Redesign Master Plan

Ultimo riallineamento: 2026-05-22.

Questo piano trasforma le decisioni confermate dal developer in ordine di lavoro.
Non e un changelog del runtime vecchio: e il percorso per portare RAGEQUIT dal
vertical slice classless corrente al nuovo arena FPS class-based.

## North Star

RAGEQUIT deve essere un arena FPS attivo:

- aim e movement sono sempre centrali;
- air combat resta giocabile, non una lunga disabilitazione;
- spell e proiettili propri non fanno self-damage e possono aprire movement tech;
- classi, build e ability creano identita senza spegnere il ritmo;
- HUD, menu, Loadout, VFX e asset parlano la stessa lingua.

Reference anchors quando il feel e dubbio:

- Quake 3 per ritmo arena, movimento aereo, projectile pressure e weapon/movement
  interplay;
- Darkfall per first-person spell combat, armi/magia e pressione da kit attivo.

Gli anchor servono a fare domande migliori, non a copiare codice o feature.

## Decisioni bloccate

- Classi target: Tank, Arciere, Mago, Ibrido.
- Classi con slot, risorse, accesso armi e meccanica distinti.
- Magic divisa in Base e Advanced.
- Fall damage target zero.
- Self-damage dalle proprie ability target zero.
- Tutte le famiglie arma devono avere comportamento target in aria.
- Parry/protezione deve avere scudo visivo leggibile.
- Sword M1 va rifatta: spam basic non puo battere le ability e miss resetta la
  chain.
- Vecchia Mastery 4/5 e tre transfer fissi sono runtime ereditato, non asse
  target.
- Whole-game visual pass riaperto.
- **Direzione visiva e grafica**: La grafica del gioco deve rispecchiare ed ispirarsi direttamente agli screenshot di esempio in `E:\GIOCHI\ASSET_GRAFICA\esempio` (specificamente [esempio1.png](file:///E:/GIOCHI/ASSET_GRAFICA/esempio/esempio1.png), [esempio2.png](file:///E:/GIOCHI/ASSET_GRAFICA/esempio/esempio2.png) e [esempio3.png](file:///E:/GIOCHI/ASSET_GRAFICA/esempio/esempio3.png)) come sorgente di verità estetica non negoziabile per tutti i modelli low-poly, illuminazione, e design dell'interfaccia.

## Decisioni ancora aperte

| Gate                   | Documento                    | Perche blocca il lavoro dopo                          |
| ---------------------- | ---------------------------- | ----------------------------------------------------- |
| Class grammar final    | `01_DESIGN/00_classes.md`    | Slot schema, resources, class indicators              |
| Ability roster rewrite | ability docs + registry plan | Base/Advanced, utility, descriptions, combo roles     |
| Visual acceptance      | visual strategy/blueprint    | UI, logo shell, projectiles, spell signatures, assets |

Closed gate:

- Sustain/transfer direction is fixed by
  `01_DESIGN/04_resource_sustain_study.md`: fixed transfers are removed from the
  target and Recovery becomes a class-legal utility/magic sustain problem.
- Movement/air direction is fixed by
  `01_DESIGN/01_arena_fps_reference_study.md`: airborne is not hard CC,
  knockup is pressure not silence, and impulses need a server-owned path.

## Critical path

### 1. Freeze the paper model

- Keep `GAME_SYSTEM_MODEL.md` as runtime-vs-target truth.
- Carry the closed sustain/healing direction into ability and Loadout specs.
- Carry the closed arena movement/air contract into runtime design.
- Remove any remaining docs that protect old classless assumptions as target.

Exit:

- class doc, sustain doc and arena-FPS contract agree;
- old runtime docs are marked current/runtime or superseded.

### 2. Rebuild the gameplay grammar

- Finalize class resources and slot schema.
- Decide weapon access and air behavior per class/weapon.
- Split Magic into Base and Advanced.
- Reclassify melee/bow/magic/utility pool by class legality.
- Rewrite ability descriptions player-facing.
- Decide which ability effects survive, which are replaced and which become class
  recovery/counter/mobility tools.

Exit:

- one target ability roster with class legality;
- no tooltip text carries internal design commentary;
- starter build exists per class.

### 3. Redesign combat runtime

- Replace hard airborne lock assumptions.
- Design impulse/movement API for self movement tech and enemy knockback.
- Rework Sword M1 chain on landed hits.
- Rework self-damage/fall damage paths.
- Add visible shield/parry feedback path.
- Recalibrate TTK after class HP and recovery settle.

Exit:

- target combat rules have server validation and browser smoke paths;
- no old transfer/mastery rule survives by accident.

### 4. Rebuild Loadout and HUD around the new game

- Loadout starts from class selection and legal slot grammar.
- Ability pool filters know Base/Advanced, class legality and recovery/counter
  coverage.
- HUD resources are class-aware.
- Floating enemy health sits in world view.
- Bottom combat console and class indicator replace legacy transfer/mastery
  assumptions.

Exit:

- build choices are clear without reading docs;
- HUD feels like FPS combat cockpit, not web panels.

### 5. Execute whole-game visual system

- Unify menu shell, loading, pause, settings, scoreboard and Loadout.
- Make spell/projectile archetypes differ by shape, motion, trail and impact.
- Re-audit character, skin, skeleton, weapon and arena assets against the visual
  system.
- Keep VFX cheap enough for browser combat.

Exit:

- screenshot/browser acceptance pass for first menu -> loadout -> match -> pause
  -> post-match loop;
- no visual patch is accepted only because it swaps one asset.

## Workstreams

| Workstream     | Owns                                              | Must not do alone                             |
| -------------- | ------------------------------------------------- | --------------------------------------------- |
| Design         | class rules, sustain, air rules, ability grammar  | ship unverified code assumptions              |
| Combat runtime | movement, abilities, validation, prediction       | invent new target rules                       |
| UI/UX          | HUD, Loadout, menus, feedback                     | preserve legacy transfer panels by inertia    |
| Technical art  | characters, VFX, projectile language, asset QA    | add incoherent random packs                   |
| Verification   | tests, browser smoke, screenshots, issue register | mark pass complete without first-flow testing |

## Immediate next documents

1. Rewrite `00_classes.md` only where open ability/proximity gates settle.
2. Use `01_DESIGN/05_ability_redesign_plan.md` and
   `01_DESIGN/05_ability_target_roster_pass1.md` before editing
   registry/runtime.
3. Rewrite target utility/Recovery roster from the closed sustain decision.
4. Specify movement controller, impulse and airborne legality runtime changes
   from the closed arena-FPS contract.
5. Use `02_TECH/11_redesign_runtime_migration_plan.md` to keep menu, loadout,
   schema, protocol and combat changes enterable after each pass.
6. Update visual blueprint after HUD/loadout grammar is no longer moving.

## Do not do yet

- Do not implement a new Recovery roster before class legality and ability
  grammar are written from the closed sustain decision.
- Do not rebuild the Loadout layout before class slot grammar and recovery
  surfaces are fixed.
- Do not tune TTK against the old M1/mastery/fixed-transfer slice.
- Do not accept menu/HUD graphics while the layout still serves the old game.
- Do not claim Quake-like movement while the controller still rewrites
  horizontal velocity and airborne lockout remains a general gameplay rule.
