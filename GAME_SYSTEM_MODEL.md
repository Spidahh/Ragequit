# RAGEQUIT Game System Model

Ultimo riallineamento: 2026-05-22.

Questo documento e il quadro su carta del progetto prima di fare altri pass
grossi su codice, asset o UI. Serve a separare tre cose che nei documenti
vecchi si erano mischiate:

- quello che il runtime locale fa oggi;
- quello che il design del prodotto vuole raggiungere;
- quale documento o file di codice decide quando due descrizioni divergono.

## Gerarchia delle fonti

Quando due fonti non coincidono, leggere in questo ordine:

1. Contratti non negoziabili: `AGENTS.md` (inclusa sezione FATTI STABILITI), `01_DESIGN/00_pillars.md`,
   `02_TECH/05_input_contract.md`, `02_TECH/06_visual_performance_contract.md`.
2. Stato deploy e produzione: `02_TECH/10_deploy_status.md` — stato live Fly.io, Supabase, asset esistenti.
   **Leggerlo prima di fare domande su deploy, configurazione o asset già presenti.**
3. Runtime e dati live: codice in `packages/`, in particolare
   `packages/shared/src/abilities/registry.ts` per numeri, tooltip e cast delle
   abilita, e `packages/shared/src/sim/map.ts` per mappe registrate.
4. Stato reale e debug map: `ROADMAP.md`, `02_TECH/00_architecture_overview.md`,
   `02_TECH/09_client_debug_map.md`.
5. Design target: `01_DESIGN/` quando il testo dichiara target, roadmap o feature
   non ancora implementata.
6. Documenti visuali: `GAME_GRAPHIC_AUDIT.md` -> `VISUAL_STRATEGY.md` ->
   `01_DESIGN/13_graphic_redesign_blueprint.md`, sempre sotto i contratti UI e
   performance.

Regola pratica: una tabella numerica in un documento di design non batte il
registry runtime. Se un documento parla di ELO, replay, matchmaking, asset CDN,
M1 infusion, class redesign o pipeline offline deve dire se sta descrivendo il
target o il codice attuale.

## Gioco attuale

RAGEQUIT oggi e una vertical slice desktop browser di arena PvP 3D con server
Colyseus autoritativo, client Three.js e una pipeline di loadout prima del match.
La slice locale permette di entrare da menu in 1v1, Training e FFA passando dalla
Loadout Station; 5v5, matchmaking, ladder e persistenza account restano target.

Il giocatore ha sempre tre armi disponibili:

- Sword per pressione melee.
- Bow per mira a proiettile e follow-up.
- Staff per magic M1 e cast magic.

Il build live usa ancora 11 slot leggibili:

- 1 melee;
- 1 bow;
- 5 magic;
- 3 transfer utility fissi;
- 1 flex utility.

Non esistono classi, rune, passive, asse tank/glass o dodge con iframe.

Questa frase descrive il runtime locale ereditato. Il design confermato dal
developer il 2026-05-22 supera il modello classless per il prossimo redesign:
Tank, Arciere, Mago e Ibrido diventano classi vere con slot, risorse e meccaniche
diverse. Vedi `01_DESIGN/00_classes.md`.

## Redesign confermato

Il prossimo modello di gioco non e un RPG difensivo con blocchi rigidi. Il
riferimento di feel e un arena FPS attivo: fisica, aim, weapon/spell movement,
rimbalzi e risposte in aria devono essere studiati con Quake 3 e Darkfall come
anchor di sensazione, non come copia cieca.

Decisioni gia confermate:

- Fall damage sempre zero.
- Self-damage dalle proprie abilita sempre zero; sparare sotto i piedi deve
  poter essere movement tech.
- Tutte le armi possono agire in aria.
- Knockup e air combat non devono togliere al bersaglio il diritto di giocare:
  armi, spell, movement e counterplay aerei vanno ridisegnati.
- Parry deve mostrare uno scudo leggibile quando protegge.
- Gli M1 non devono battere le ability come output dominante; Sword M1 richiede
  un rework dove missare rompe la combo.
- Classi confermate: Tank, Arciere, Mago, Ibrido.
- Magic da dividere in Base e Advanced.
- Loadout Station, HUD e grafica intera da rifare attorno a classi e combat
  cockpit FPS.

Decisione sustain chiusa:

- il target rimuove i transfer fissi e non introduce un transfer universale
  nascosto fuori dal loadout;
- self-sustain in combat passa da Recovery utility legali per classe e da magic
  sustain che paga slot/costo/counterplay;
- ogni starter build deve includere una Recovery option visibile.

Vedi `01_DESIGN/04_resource_sustain_study.md`.

## Loop attuale

1. Boot del client e menu principale.
2. Scelta di 1v1, Training o FFA.
3. Loadout Station con build, cast mode e slot utility fissi.
4. Avvio room/percorso training dalla CTA della Loadout Station.
5. Countdown e fase live.
6. Movimento, mira, weapon swap, M1/M2, wheel E/Q o hotkey dirette.
7. Server valida input, cast, danni, status, zone, death e phase.
8. HUD/VFX/audio/UI rendono feedback e stato del match.
9. Pause/return lobby o fine flow supportata dalla modalita attuale.

## Loop target

Il prodotto vuole aggiungere sopra quel loop:

- login/guest e persistenza account;
- tutorial/onboarding;
- code matchmaking ed ELO separate;
- 5v5 pieno oltre a duel/FFA/training;
- end screen, quest progress, unlock e replay retention coerenti.

Questi obiettivi non devono essere descritti come gia presenti nel client locale.

## Sistemi e stato

| Sistema                | Stato da trattare come attuale                                      | Target o debito                                             |
| ---------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------- |
| Menu e Loadout Station | Menu, settings, pause, loadout flow locali                          | Redesign class-aware e visuale totale ancora aperto         |
| Input                  | Pointer lock, weapon swap, LMB/RMB, E/Q wheel, hotkey dirette       | Ogni modifica richiede browser smoke                        |
| Combat                 | Sim server, M1, parry, ability registry, status, projectile/zone    | Tuning feel e regressioni da verificare per feature         |
| Mastery                | Mastery calcolata dai 5 slot magic; bonus magic attivi              | Superata come asse target dal redesign classi               |
| Modes                  | 1v1, Training e FFA hanno percorso locale                           | 5v5, queue e ladder persistenti                             |
| Character              | Runtime character importato con fallback/contratti espliciti        | Replacement solo con skeleton, skin e animazioni verificati |
| Visual                 | HUD/VFX/UI gia presenti e documenti visuali attivi                  | Coerenza finale menu/HUD/spell/projectile/arena da eseguire |
| Asset                  | Asset runtime in `packages/client/public/` piu fallback procedurali | Pipeline offline/CDN/compressione completa                  |
| Progression            | Local settings/loadout persistence                                  | Auth, quests, unlock, DB persistence                        |

## Ordine logico dei documenti

Per gameplay:

1. `AGENTS.md`
2. `REDESIGN_MASTER_PLAN.md`
3. `ROADMAP.md`
4. `01_DESIGN/MANIFEST.yaml`
5. design docs richiesti dal sottosistema
6. tech contract del sottosistema

Per visual/UI/VFX:

1. `AGENTS.md`
2. `GAME_SYSTEM_MODEL.md`
3. `REDESIGN_MASTER_PLAN.md`
4. `GAME_GRAPHIC_AUDIT.md`
5. `VISUAL_STRATEGY.md`
6. `01_DESIGN/13_graphic_redesign_blueprint.md`
7. `01_DESIGN/11_ui_redesign_plan.md`
8. `02_TECH/06_visual_performance_contract.md`

Per asset personaggio:

1. `02_TECH/07_character_animation_contract.md`
2. `02_TECH/08_character_asset_replacement_plan.md`
3. audit script e runtime loader attivi

## Errori documentali da evitare

- Non presentare una feature target come se fosse gia testata nel runtime locale.
- Non lasciare documenti setup o pipeline che contraddicono `ROADMAP.md`.
- Non copiare numeri ability in piu punti senza dichiarare il registry come
  fonte live.
- Non cambiare visual direction con singoli swap asset fuori dalla gerarchia
  audit -> strategy -> blueprint -> contracts.
- Non descrivere modalita mobile come requisito corrente: lo scope visuale
  attuale e desktop browser.

## Domande ancora aperte

Restano decisioni da chiudere prima di chiamare "perfetto" il prodotto, non il
modello documentale:

- quale acceptance visiva chiude menu, HUD, Loadout e loading shell;
- quale asset set finale sostituisce i fallback runtime senza rompere skeleton,
  skin, animazioni e performance;
- quale ordine di consegna porta da slice locale a matchmaking/persistence/5v5;
- quali numeri combat vengono ritoccati dopo test reali del TTK e dei combo loop.
