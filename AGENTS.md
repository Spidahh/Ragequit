# RAGEQUIT Agent Rules

Regole vive per lavorare su questo repository. Non usare documenti cancellati o
assunzioni precedenti come autorita.

## Fatti Stabiliti

- Server online su Fly.io: app `ragequit-server`, regione `ams`. In produzione
  ascolta su `PORT=8080` (Fly); in locale il default è `2567` (`server/src/main.ts`).
- Supabase gia configurato come Fly secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Client: build vite con output in `packages/client/dist/` (NON `apps/web/`); da lì
  si deploya lo statico (Cloudflare Pages).
- Unico CSS UI vivo: `packages/client/public/game-ui.css`.
- **Asset sorgente** in `E:\GIOCHI\ASSET_GRAFICA` (cartella FUORI dal repo — prendere
  SEMPRE i nuovi asset grafici da qui, poi copiarli in `packages/client/public/`):
  - `PARTICELLE/kenney_particle-pack/` — particelle bianco-su-trasparente per i VFX.
  - `PERSONAGGI/` — modelli personaggio (corpo/outfit/capelli).
  - `icone/sprite_XXXX.png` — 104 sprite icone abilita.
  - `menu/` — logo + immagini classe.
  - `mappe/` — **arene e moduli per costruire le mappe** (usare questi per le arene):
    - `gladiators_arena.glb` — coliseo ovale ~50×57m (shell visivo dell'arena, gia in uso).
    - `KayKit_DungeonRemastered_1.1_FREE/` — barili, casse, banner, barriere, pilastri.
    - `Fantasy Props MegaKit[Standard]/` — torce, lanterne, props ambientazione.
    - `modular_village_collection/` + `Free 3D Modular Game Assets/` — moduli (muri,
      pavimenti, rampe, recinzioni) per comporre arene modulari.
- Arena: la vecchia arena procedurale "blockout" (cubi blu piatti) e stata ELIMINATA.
  L'arena visiva e ora il coliseo `gladiators_arena.glb` caricato come shell permanente
  in `world/arena.ts` (sempre visibile per ogni mappa); le AABB di collisione per-mappa
  restano in `shared/sim/map.ts` e sono renderizzate come blocchi di pietra (cover).
- Texture VFX (`public/vfx/*.png`): devono essere RGBA bianco-su-trasparente per il
  sistema additivo tintato via `instanceColor`. Mai sfondo scuro o colorato.
- Armi caricate come `.glb` auto-contenuti da `public/weapons/kaykit/` (sword, bow,
  staff, shield_A). I sorgenti legacy `.gltf`/`.bin`/`.png` sono stati rimossi: solo i
  `.glb` vengono spediti.
- Personaggi: caricati come `.gltf` + `.bin` da `public/characters/`. NON usare `.glb`
  per i personaggi: le texture embedded producono file 15-40 MB ciascuno.
- Post-processing bloom: Three.js layer 1 = bloom-eligible. Layer 0 = default.
  Non aggiungere mesh al layer 1 a meno che non siano emissive/glowing.
- LOD remote players: oltre 40m modello nascosto (solo nameplate), oltre 20m shadow off.
- Audio spaziale: usare `SoundEngine.playRemoteHit()` / `playRemoteCast()` per i suoni
  dei giocatori remoti. `updateListener()` va chiamato ogni frame con la posizione camera.
- Match state machine: `src/game/match-state-machine.ts` (singleton `matchSM`) e la
  fonte autorevole per la fase corrente lato client. Sincronizzata in `applyMatchPhase()`.
- Loading screen: `src/preloader.ts` gestisce il preload degli asset prima dell'arena.
  Chiamare `preloadMatchAssets(classId)` quando si entra in una room.
- Asset esistenti chiave:
  - `packages/client/public/ui/ragequit-logo-full.png`
  - `packages/client/public/ui/ragequit-logo-small.png`
  - `packages/client/public/ui/sfondo.png`
  - `packages/client/public/icons-sprite.svg`
  - `packages/client/public/arena/gladiators_arena.glb`
  - `packages/client/public/characters/UAL1_Standard.glb` (animazioni — non rimuovere)
  - `packages/client/public/arena/props/Torch_Metal.gltf` + `.bin`
  - `packages/client/public/arena/props/Lantern_Wall.gltf` + `.bin`
  - `packages/client/public/arena/props/barrel_large.gltf`, `barrel_small.gltf`, `box_large.gltf`
  - `packages/client/public/arena/props/banner_patternA_red.gltf`

## Regola di Semplicità

Prima di proporre o implementare qualsiasi meccanica, fix o funzionalita, verificare:

1. Non complica altri sistemi gia esistenti del gioco.
2. Non appesantisce il motore (no calcoli extra per casi rari o edge case improbabili).
3. Non aggiunge complessita percepibile al giocatore durante la partita.

Se una soluzione tocca piu di 2 sistemi separati, cercare prima un'alternativa piu semplice.
Non aggiungere bonus condizionali lato server (es. +X% danno se Y) a meno che non sia strettamente necessario per il bilanciamento — complicano il motore e rendono il gioco meno leggibile.

## Filosofia di Sviluppo Connesso

Qualsiasi intervento su una singola parte del codice deve essere progettato e implementato pensando a **tutti i sistemi collegati** (la "Rete di Sistemi"). Non agire mai con fretta o con fix isolati. Prima di modificare qualsiasi elemento, verifica e allinea l'intera catena di dipendenze visive, fisiche e logiche:
1. **Visuale & Telecamera (FPV/TPV)**: Quando si modifica un'arma o un accessorio, assicurarsi che l'allineamento, il grip e le animazioni funzionino perfettamente sia in prima persona (First-Person View / ViewModels) sia in terza persona (Third-Person View / Character Skeleton), evitando clipping, torsioni innaturali o disallineamenti del mirino.
2. **Replicazione & Stato Multiplayer**: Ogni stato visivo locale (es. parata attiva, scudo sul fianco, swap dell'arma) deve essere perfettamente sincronizzato con lo stato autoritativo del server e replicato correttamente sulle schermate degli altri giocatori (bystanders) senza lag o anomalie di posizionamento.
3. **Fisica del Server & Feedback Client**: I vettori di impatto delle abilità e i segmenti di collisione (hitbox) lato server devono corrispondere al pixel con il feedback visivo sul client (es. la traiettoria del fendente della spada, il crosshair delle armi a distanza, e le direzioni delle spinte fisiche).
4. **Coerenza tra UI, Audio & VFX**: Nuovi stati o azioni di gioco (come il combat, il parry, lo swap, o l'uso di abilità) devono avere riscontri audio (SFX puliti), VFX fluidi (senza contorni neri o difetti di alpha) e aggiornamenti dell'HUD (tasti, risorse, cooldown) immediati e ottimizzati per evitare micro-stutters nel game loop.

Se una modifica rompe o ignora anche solo uno dei sistemi collegati, la soluzione è incompleta e va rifiutata.

## Gameplay Non Negoziabile

- Arena FPS attivo.
- Fall damage sempre zero.
- Self-damage dalle proprie abilita sempre zero.
- Tutte le armi possono agire in aria.
- Airborne non e hard CC.
- Parry/protezione deve avere scudo leggibile sul personaggio.
- Nessun sistema passivo o slot extra fuori loadout.
- Classi vive: Tank, Arciere, Mago, Ibrido.
- Sprint e movimento base, non toggle e non costa Stamina di default.
- Wheel abilita/utility: hold, seleziona, rilascia per primare, LMB per
  sparare/confermare.
- Output abilita deterministico. Zero RNG.
- Sangue fisico rosso `#FF3344`.
- TTK reale desiderato: 20-30s con difesa attiva.
- Nessun bonus danno condizionale in aria: il knockup e una meccanica di spostamento
  e pressione aim, non apre moltiplicatori di danno lato server.
- Cast veloci: windup default 0.0-0.2s. Sopra 0.5s solo se il ritardo e il mini-malus
  dichiarato dell'abilita. Mai rallentare un cast "per farlo sembrare potente".
- Le meccaniche classe server-side (`ClassMechanicRuntime`) sono attive:
  Fury, Momentum, Risonanza e Flow devono restare cablate a `GameRoom` e ai
  campi replicati di `Player`.

## Loadout

- Il Loadout Forge e class-aware.
- Famiglie vive: `melee`, `bow`, `magicBase`, `magicAdvanced`, `utility`.
- Recovery vive:
  - Tank: `Brace Recovery`
  - Arciere: `Hunter's Flow`
  - Mago: `Arcane Rebind`
  - Ibrido: `Adaptive Mend`
- Il Forge usa `#ls-magic-base` e `#ls-magic-advanced`.
- Il Forge non usa `#ls-magic`.
- Il Forge usa solo classi, slot family e Recovery.
- Allowed Weapons e Spell budgets sono evidenziati visivamente nella console della Loadout Station (⚔️ SWORD, 🏹 BOW, 🔮 STAFF con stato active/disabled e badge di budget per ogni family).
- Contratto slot classi vivo:
  - Tank: `4 melee`, `1 bow`, `3 utility`
  - Arciere: `4 bow`, `2 magicBase`, `2 utility`
  - Mago: `3 magicBase`, `3 magicAdvanced`, `2 utility`
  - Ibrido: `2 melee`, `1 bow`, `2 magicBase`, `1 magicAdvanced`, `2 utility`
- Ogni abilita (tutte e 8) ha un tasto diretto sulla hotbar (default `1`-`8`,
  rimappabili in Impostazioni). Le 2 wheel (4 settori ciascuna) sono un modo
  radiale ALTERNATIVO per richiamare le stesse abilita: hold E/Q, seleziona,
  rilascia. Stesso bind condiviso tra tasto diretto e settore wheel.
- Split wheel come funzione pura dell'ordine slot: `E` = slot 0-3 (primi 4),
  `Q` = slot 4-7 (ultimi 4). La grammatica classi garantisce che i primi 4 slot
  siano le famiglie E e gli ultimi 4 le famiglie Q. Assegnazione per classe:
  - Tank: `E` = 4 melee | `Q` = 1 bow + 3 utility
  - Arciere: `E` = 4 bow | `Q` = 2 magicBase + 2 utility
  - Mago: `E` = 3 magicBase + 1 magicAdvanced | `Q` = 2 magicAdvanced + 2 utility
  - Ibrido: `E` = 2 melee + 1 bow + 1 magicBase | `Q` = 1 magicBase + 1 magicAdvanced + 2 utility

## UI / Visual

- Menu, Loadout, Pause, Settings e HUD devono sembrare UI di gioco, non pagine
  HTML.
- I bottoni mode-tile del menu iniziale (1v1, FFA, Training) usano
  `packages/client/public/ui/frame_but.png` come cornice grafica viva.
  Il forge-tile (Loadout) non usa cornice per ora.
- Menu e Loadout Forge non devono mostrare il canvas arena live dietro:
  nascondono il canvas con `body.main-menu-active` / `body.loadout-active` e
  usano background statico da asset UI.
- Home page e Loadout Station devono essere leggibili a colpo d'occhio:
  bottoni grandi, testi leggibili, pannelli proporzionati e nessuna colonna
  compressa che schiaccia nomi o descrizioni.
- Il CSS del Loadout Forge deve seguire le classi generate da
  `packages/client/src/loadout-station.ts`; non lasciare stili morti per markup
  vecchio e non usare overlay decorativi come celle di griglia.
- La Loadout Forge deve seguire solo il runtime vivo in
  `packages/client/src/loadout-station.ts` e
  `packages/shared/src/constants/classes.ts`.
- Le chip abilita del Forge usano le classi vive generate da `tagClass()`:
  `tag-role`, `tag-targeting`, `tag-control`, `tag-damage`, `tag-status`,
  `tag-move`, `tag-resource`. Non ripristinare tag CSS vecchi come
  `tag-mobility`, `tag-sustain`, `tag-defense`, `tag-cost`.
- Prima di modificare la Loadout Forge leggere il codice vivo:
  `TARGET_CLASS_DEFS`, `getClassSlotOrder()`, `isAbilityLegalForClass()`,
  `getAbilitySlotFamily()`, `actionLabel()` e `rebuildPool()`.
- Correzione UX Loadout Forge: non progettare intorno a "scegli uno slot" come
  azione primaria. Il giocatore deve poter modificare tutta la build in una
  vista unica, con lane editabili e pool/alternative per famiglia visibili
  insieme. Le stats/vitals della classe non sono il centro della schermata e non
  devono rubare spazio al cambio build.
- La scelta classe nella Loadout Forge deve essere visivamente evidente sopra
  al build, non una riga piatta di tab. Ogni lane deve dichiarare su quale wheel
  (`E` o `Q`) e in quale settore finisce in game, secondo il contratto wheel 4+4
  per classe.
- Le card abilita del Loadout Forge mostrano direttamente descrizione, input,
  elemento, costo, cooldown e tag; non nascondere queste informazioni in un
  dettaglio separato o in una micro-riga.
- Gli export/liste per icone abilita devono includere sempre la natura
  funzionale dell'abilita oltre all'elemento: damage, control/setup,
  mobility, zone pressure, survival/recovery, drain/lifesteal, projectile,
  status/DoT e tag effetto reali.
- Nelle card Loadout il nome dell'abilita sta sotto l'icona. L'icona PNG non
  deve essere croppata, stirata o coperta dal nome.
- La barra sinistra del Loadout Forge deve essere larga e compatta: gli slot
  devono leggere su righe orizzontali da UI di gioco, senza testi principali
  spezzati a capo per mancanza di spazio.
- Non mostrare badge `FINISHER`, `STARTER`, `INSTANT` o `PREVIEW` accanto al
  nome delle abilita nelle card/slot del Loadout. Per la lettura rapida usare
  la natura funzionale (`CONTROL`, `PROJECTILE`, `RECOVERY`, `ZONE`,
  `MOBILITY`, `DRAIN`, ecc.) e i tag effetto separati.
- La Loadout Forge deve stare in una schermata da videogioco: niente pannello
  dettagli separato che ruba spazio, niente scroll del build sinistro, niente
  filtri `STARTER`/`INSTANT`/`PREVIEW` nel pool. Le informazioni necessarie
  stanno direttamente nelle card compatte.
- La Loadout Forge non ha pannello dettagli separato e non salva toggle
  cast-mode: il cast e deterministico dal targeting dell'abilita (`point`
  apre placement, gli altri targeting sono diretti).
- Mapping runtime wheel: tutte le 8 abilita di classe sono distribuite su 2 wheel
  da 4 settori ciascuna (E = slot 0-3, Q = slot 4-7). Ogni abilita ha anche un
  tasto diretto (default `1`-`8`): tasto diretto e settore wheel condividono lo
  stesso bind.
- La hotbar in-game mostra tutti e 8 gli slot con il tasto diretto (default
  `1`-`8`, rimappabile). Le abilita restano richiamabili anche dalla wheel E/Q.
- Non reintrodurre la distinzione
  E=weapon / Q=utility: le wheel sono assegnate per famiglia-classe, non per ruolo
  generico.
- Classi consentite nella UI: solo Tank, Arciere, Mago, Ibrido.
- Conservare nel progetto solo asset runtime e contratti presenti approvati.
- Le icone abilita vive sono PNG in `packages/client/public/ability-icons/`
  con nome file uguale all'ability id (`<ability_id>.png`). Il colore
  identifica il tipo/elemento: fire, ice, lightning, dark, nature, melee/bow
  fisico e utility.
- Le armi runtime vive usano gli asset KayKit in
  `packages/client/public/weapons/kaykit/` come `.glb` (`sword.glb`, `bow.glb`,
  `staff.glb`, `shield_A.glb`) con grip/scala corretti per personaggio e vista first-person.
  NB: il loader carica `sword.glb` (lama slim); `sword_D.glb` è il vecchio modello tozzo, non usato.
- Le card abilita del Forge hanno copy a sinistra e icona grande a destra; il
  danno ha una riga dedicata separata da costi/cooldown.
- Hotbar in-game: bordo rosso `melee`, verde `bow`, blu `staff/magic`, oro
  `utility`.
- Le texture VFX (`public/vfx/*.png`) devono essere RGBA bianco-su-trasparente.
  `colorSpace = NoColorSpace`, `premultiplyAlpha = false`. MAI sfondo scuro o colorato.
  Il sistema usa `instanceColor` tinting additivo — il colore white e il canale alpha
  determinano forma e intensita. I file sono Kenney Particle Pack CC0.
- Se l'utente dice che un layout/stile fa schifo, va trattato come feedback
  vincolante: aggiornare subito UI e memoria, poi verificare.
- Quando l'utente ordina di eliminare una cosa, eliminarla dal gioco e dai
  documenti nella stessa passata.
- Nuove decisioni dell'utente vanno scritte come stato vivo, non come proposta.
- Palette:
  - Panel: `#0F111A`
  - Accent: `#FFD260`
  - HP: `#FF3344`
  - Mana: `#00D0FF`
  - Stamina: `#00FF88`
  - Fire: `#FF4500`
  - Ice: `#00E5FF`
  - Lightning: `#FFE600`
  - Dark: `#6A0DAD`
  - Nature: `#39FF14`
- Barre risorse: rettangolari, leggibili, draggable/resizable.
- Weapon strip: slot leggibili stile 60x60, nessun overlap con hotbar.
- Quando rifai o aggiorni una regola CSS, cancella quella vecchia nello stesso
  commit — nessun duplicato, nessun override inutile.
- Preferisci rimozione e consolidamento invece di aggiungere pannelli.
- Animazioni UI preferite: `transform` e `opacity`.
- `.hidden` deve vincere su regole ID come `#settings-overlay { display: grid }`:
  overlay nascosti non devono mai intercettare click o input.
- Outline su `SkinnedMesh`: non definire manualmente `USE_SKINNING` nei
  `ShaderMaterial`; Three lo inietta gia e il doppio define rompe il shader.

## Input / Combat Safety

- Non toccare casualmente pointer lock, keyboard capture, mouse capture,
  weapon swap, LMB/RMB, wheel o aiming first-person.
- Se tocchi input, leggi `02_TECH/05_input_contract.md` e verifica in browser.
- Bow/staff/spell devono allinearsi al crosshair.
- Combat server-authoritative: non fidarti del client.
- I colpi melee devono dare feedback anche a chi attacca:
  kick/hit-stop visivo locale all'impatto; non solo sul bersaglio.

## Dimensione File / Code Split

**Soglia**: un file sorgente TypeScript non deve superare **~500 righe** come target; oltre **800 righe** è obbligatorio splitlarlo.

**Regola derivata dall'esperienza su `main.ts`**: quando `main.ts` è diventato
troppo grande, è stato spezzato in moduli separati per responsabilità:
- logica arena → `world/arena.ts`
- caricamento personaggi → `render/character-loader.ts`, `character-animation.ts`, `character-weapons.ts`
- HUD separati → `hud/cd-strip.ts`, `hud/self-hud.ts`, `hud/combat-feed.ts`, `hud/hit-feedback.ts`, ecc.
- input → `input/game-input.ts`, `input/cast-dispatcher.ts`, `input/radial-wheels.ts`
- fasi partita → `game/match-state-machine.ts`
- effetti visivi → `game/visual-helpers.ts`, `game/combat-feedback.ts`, `game/hitstop.ts`
- scene setup → `game/scene-builder.ts`
- asset preload → `preloader.ts`

**Pattern da seguire quando un file supera la soglia:**
1. Identificare le responsabilità distinte nel file.
2. Creare un nuovo file nella sottocartella appropriata (es. `game/`, `hud/`, `render/`).
3. Spostare la responsabilità nel nuovo file con export named.
4. Aggiornare le importazioni nel file originale.
5. Aggiornare `02_TECH/00_architecture_overview.md` con il nuovo file nella tabella "Main Code Surfaces".

**File attualmente grandi da monitorare** (oltre il limite "obbligatorio" di 800 righe — vanno spezzati):
- `packages/client/src/main.ts` — ~3321 righe (PRIORITÀ split: god-file, ~58 `let` di modulo)
- `packages/server/src/rooms/GameRoom.ts` — ~2867 righe (god-object: input+fisica+danno+abilità)
- `packages/server/src/sim/AbilityEngine.ts` — ~1063 righe (split effetti per tipo)
- `packages/client/src/loadout-station.ts` — ~804 righe (oltre soglia 500, monitorare)