# RAGEQUIT Project Memory

Ultimo riallineamento: 2026-05-30.

## Fatti Vivi

- Server gia live su Fly.io: app `ragequit-server`, regione `ams`, porta 8080.
- Il 2026-05-27 e stato ripristinato `ClassMechanicRuntime` server-side:
  Fury, Momentum, Risonanza e Flow sono cablati a `GameRoom` e ai campi
  replicati di `Player`.
- Supabase gia configurato come Fly secrets.
- Client destinato a Cloudflare Pages.
- Classi vive: Tank, Arciere, Mago, Ibrido.
- Loadout vivo: `melee[]`, `bow[]`, `magicBase[]`, `magicAdvanced[]`,
  `utility[]`.
- Recovery vive: `Brace Recovery`, `Hunter's Flow`, `Arcane Rebind`,
  `Adaptive Mend`.
- Fall damage sempre zero.
- Self-damage dalle proprie abilita sempre zero.
- Nessun sistema passivo, slot extra fuori loadout o RNG negli output abilita.
- `packages/shared/src/abilities/registry.ts` comanda numeri e comportamento
  delle abilita.
- `packages/client/public/game-ui.css` e l'unico CSS UI vivo.
- Il Loadout Forge non usa piu `#ls-magic`; usa `#ls-magic-base` e
  `#ls-magic-advanced`.
- Il 2026-05-26 il blocco CSS menu+Loadout Forge in `game-ui.css` e stato
  riscritto direttamente: lobby a tre zone bilanciate e Forge a tre
  colonne con build centrale dominante.
- Il 2026-05-26 `.hidden` e stato reso dominante in `game-ui.css`: overlay
  nascosti come Settings/Pause/Scoreboard non devono intercettare click del menu.
- Il 2026-05-26 gli outline skinned non definiscono piu manualmente
  `USE_SKINNING`: Three lo inietta gia per `SkinnedMesh` e il doppio define
  causa shader compile error.
- Il 2026-05-27 la tastiera è stata sfoltita: i tasti diretti "Z, X, F, V, R, G" per slot e utility veloci sono stati disattivati e rimossi dalla UI delle impostazioni. Il layout base era WASD, Space, Tab, LMB/RMB, ruote E/Q (i tasti 1-5 per magie sono stati rimossi il 2026-05-30, vedi sotto).
- Il 2026-05-27 è stata aggiunta la visualizzazione delle armi permesse (⚔️ SWORD, 🏹 BOW, 🔮 STAFF) e il budget degli slot budget delle spell nella Loadout Station.
- Il 2026-05-27 i sistemi rimossi non sono piu fonte di regole.
- Il 2026-05-27 la validazione del blocco weapon swap `player.weaponSwapEndTick` è stata resa autoritativa sul server per tutti i tipi di attacco base, parate e cast.
- Il 2026-05-27 sono stati risolti i disallineamenti del Loadout Forge (correzione del footer pulsanti `.ls-center-footer`, tab classe `.card-icon/title/desc` e pannello `.class-vitals-panel`).
- Il 2026-05-27 è stata abilitata la sincronizzazione del nome giocatore tramite `roomOptions.name` su Colyseus, includendo il salvataggio immediato al `change`/`blur` del campo input.
- Il 2026-05-27 sono stati eliminati tutti i residui fisici dei tasti disattivati Z, X, F, V, R nel file HTML e corretti i refusi negli esempi di documentazione (`01_controls.md`).
- Il 2026-05-27 le 53 abilita vive usano icone PNG in
  `packages/client/public/ability-icons/<ability_id>.png`. Il colore dell'icona
  identifica il tipo/elemento e queste icone sono usate da Loadout Station,
  ruote abilita e hotbar/cooldown.
- Il 2026-05-28 il Loadout Forge non ha piu pannello dettagli separato ne
  toggle/persistenza cast-mode: le card mostrano direttamente le informazioni
  e il flow cast e deterministico dal targeting dell'abilita.
- Il 2026-05-29 il grammar classi vivo e stato chiuso cosi: Tank `4 melee / 1 bow / 3 utility`, Arciere `4 bow / 2 magicBase / 2 utility`, Mago `3 magicBase / 3 magicAdvanced / 2 utility`, Ibrido `2 melee / 1 bow / 2 magicBase / 1 magicAdvanced / 2 utility`.
- Il 2026-05-29 le ruote runtime sono state blindate a 4 settori presi dalla build corrente. (La distribuzione E=weapon/Q=utility con tasti 1-5 magie è stata sostituita il 2026-05-30, vedi sotto.)
- Il 2026-05-29 il feedback melee lato attaccante e stato rinforzato con kick/hit-stop visivo locale all'impatto; non esiste piu solo il feedback sul bersaglio.
- Il 2026-05-29 le spell offensive applicano spinte leggere server-side a bersaglio e, per alcuni proiettili, un piccolo recoil al caster. Le spinte restano deterministiche e contenute.
- Il 2026-05-29 i VFX sprite/proiettili hanno ricevuto fix alpha (`alphaMap`, `premultipliedAlpha`, `alphaTest`, texture premultiply) per rimuovere le particelle nere attorno ai player in arena.
- Il 2026-05-29 le armi runtime sono passate agli asset KayKit in `packages/client/public/weapons/kaykit/` con proporzioni e grip corretti per sword, bow e staff.
- Il 2026-05-29 il menu iniziale usa `frame_button.png` come base dei pulsanti, i testi UI principali sono stati uniformati in italiano e la hotbar in-game usa bordi colore per famiglia abilita: rosso melee, verde bow, blu magic/staff, oro utility.
- Il 2026-05-29 le card del Loadout Forge sono state riordinate con icona grande a destra, danno separato dagli altri parametri e costi risorsa visualmente distinti.
- Il 2026-05-30 il sistema wheel è stato ridisegnato: tutte le 8 abilita di classe sono distribuite su 2 wheel da 4 settori ciascuna. Non esistono piu tasti diretti 1-5 per le magie. Assegnazione per classe: Tank E=4melee / Q=1bow+3utility; Arciere E=4bow / Q=2magicBase+2utility; Mago E=3magicBase+1magicAdvanced / Q=2magicAdvanced+2utility; Ibrido E=2melee+1bow+1magicBase / Q=1magicBase+1magicAdvanced+2utility.
- Il 2026-05-30 rimosso il bonus danno +25% del finisher in aria: il knockup e solo pressione aim/spostamento, nessun moltiplicatore lato server.
- Il 2026-05-30 slot classi definitivi: Tank 4melee/1bow/3utility, Arciere 4bow/2magicBase/2utility, Mago 3magicBase/3magicAdvanced/2utility, Ibrido 2melee/1bow/2magicBase/1magicAdvanced/2utility.
- Il 2026-05-30 aggiunta regola di semplicita in AGENTS.md: prima di proporre una soluzione verificare che non complichi altri sistemi, non appesantisca il motore e non aggiunga complessita percepibile al giocatore.
- Il 2026-05-30 aggiunta regola cast veloci: windup default 0.0-0.2s; sopra 0.5s solo se e il mini-malus dichiarato; nessun cast lento per "sembrare potente".
- Il 2026-05-30 combo role consolidati a 6 ruoli standard MIGRAZIONE CODICE FATTA: `starter`, `finisher`, `pressure`, `survival`, `counter`, `mobility`. `types.ts` ora definisce solo questi 6; `registry.ts` rimappato: flame_wall/ice_wall/blizzard/storm_field/thorn_field/smoke_screen/ignite/chain_bolt/life_drain/ping_mark -> `pressure`, energize -> `survival`, freeze_target/entangle -> `starter`. Aggiornati anche `loadout-station.ts` (tag UI), test `registry.test.ts` (validRoles a 6 + nuovo test delivery instant-LOS). Doc: `05_abilities_philosophy.md`, `02_TECH/02_ability_dsl.md`.
- Il 2026-05-30 regola cast veloci APPLICATA IN registry.ts: pin_shot charge 0.8->0.4s, meteor 1.5->1.0s, frost_pillar 1.0->0.3s, freeze_target 0.5->0.4s, entangle 0.5->0.3s, arcane_rebind 0.5->0.4s. Restano a 1.0s solo le 2 eccezioni signature: meteor e marksman_shot. Aggiornati i tooltip relativi (niente piu "Instant ray"/"Long windup" su cast veloci).
- Il 2026-05-30 bonus air-punish finisher RIMOSSO DAL CODICE: tolto `AIR_PUNISH_DAMAGE_MULT`/`damageWithAirPunish` da `AbilityEngine.ts`, tolto il ramo air-punish su impatto proiettile in `GameRoom.ts`, ripulito il client (`main.ts` `isAirPunishCause` e rami VFX/sound morti). Il finisher fa danno piatto a terra e in aria. Test air-punish invertito in `AbilityEngine.test.ts` (meteor 44 piatto). Verifica: shared 90 + server 69 + client 15 test verdi, typecheck/build/lint puliti.
- Il 2026-05-30 rimossa una contraddizione in `00_classes.md`: la riga Tank vs Mage citava ancora un +0.4s di cast a corto raggio, in conflitto con "Proximity Casting REMOVED" e con la regola cast veloci.


- Il 2026-05-30 (audit) trovato e corretto un REVERT della grammatica classi nel working tree: `classes.ts`, `classes.test.ts`, `loadout-slots.test.ts`, `loadout-station.test.ts`, preset di `loadout-station.ts` e `DEFAULT_LOADOUT` di `GameRoom.ts` erano tornati ai valori vecchi (Mago 3/2/3, Ibrido 1/1/2/2/2). HEAD aveva i valori giusti. Ripristinata la grammatica corretta ovunque (Mago 3 base/3 adv/2 util, Ibrido 2 melee/1 bow/2 base/1 adv/2 util).
- Il 2026-05-30 ALINEAMENTO CLASSI & WEAPON SWAP BOT COMPLETATO:
  - Spostato e condiviso `CLASS_PRESET_BUILDS` in `@ragequit/shared` per eliminare la duplicazione di codice tra client e server.
  - Modificato `BotController.ts` per rendere l'IA a conoscenza delle proprie armi consentite (`TARGET_CLASS_DEFS[classId].weapons`). Inibiti i weapon swap casuali al di fuori del set corretto e disattivati tutti i cast di abilità che richiedono armi non permesse.
  - Modificato `GameRoom.ts` (`spawnBot`) per assegnare le 4 classi deterministiche a rotazione (`tank`, `archer`, `mage`, `hybrid`), popolare il loro inventario con i preset corretti e impostare l'arma attiva iniziale autoritativa.
  - Risolti i bug di strict narrowing in TypeScript e verificate le modifiche: 174 unit tests passed green, build e lint puliti. Preservata la visuale gladiator e il networking Colyseus.
- Il 2026-05-30 MIGRAZIONE CODICE input/wheel al sistema 4+4 FATTA. Regola unica: E wheel = slot 0-3, Q wheel = slot 4-7 (l'ordine grammaticale di `getClassSlotOrder` garantisce che i primi 4 slot siano le famiglie E e gli ultimi 4 le famiglie Q per ogni classe). Rimossi i tasti diretti 1-5: `keybinds.ts` (spell1-6 eliminati), `game-input.ts` (gestore spell + `nthMagicSlotIndex` + `activateAbilitySlot` morto rimossi), `radial-wheels.ts` (`wheelSlotIndices` ora E=[0-3]/Q=[4-7]), `cd-strip.ts` (`getSlotDirectionalLabel` posizionale E🡑..Q🡐), `loadout-station.ts` (slotKeyLabel/slotRouteLabel posizionali), `index.html` (righe keybind spell rimosse). Le magie si castano via wheel-prime + LMB (castDispatcher family-agnostic). Verificato verde: typecheck/lint/build + 174 test. DA FARE: verifica visiva nel gioco locale.

## Audit 2026-05-30 (revisione gioco)

- REGRESSIONE TROVATA E CORRETTA: il working tree aveva REVERTITO la grammatica
  classi ai valori vecchi (Mago `3/2/3`, Ibrido `1/1/2/2/2`) in `classes.ts`,
  `classes.test.ts`, nei preset di `loadout-station.ts` e in `DEFAULT_LOADOUT`
  di `GameRoom.ts`. HEAD aveva quella giusta. Ripristinata a Mago `3/3/2` e
  Ibrido `2/1/2/1/2` ovunque. Preset Mago ora include `frost_pillar` (3° advanced),
  Ibrido include `gap_closer` (2° melee).
- Il sistema personaggi NON e doppio: `render/characters.ts` e una facciata sui
  nuovi `character-loader.ts`/`character-animation.ts`/`character-weapons.ts`;
  `character.ts` (root) resta come modulo costanti (`ELEMENT_COLORS`). Pulito.
- Fase 1 COMPLETATA (2026-05-30). Modello input finale: ogni abilita (8) ha un
  tasto diretto sulla hotbar (default `1`-`8`, rimappabile in Settings) E le 2
  wheel (E=slot 0-3, Q=slot 4-7) sono un'alternativa radiale per le stesse
  abilita. Tasto diretto e settore wheel condividono lo stesso bind.
  Implementazione: `keybinds.ts` (azioni `slot1-8` + `SLOT_ACTIONS`),
  `game-input.ts` (loop slot -> `onActivateSlot` -> `activateAbilitySlot(idx,false)`),
  `cd-strip.ts` (`getSlotKeyLabel` mostra il tasto, listener `onKeybindsChanged`),
  `radial-wheels.ts` (`slotBindLabel` mostra il tasto), `index.html` (8 righe
  keybind slot1-8). NB: il path cast riusa `activateAbilitySlot` (stesso della
  wheel). Verifica live del firing impossibile via automazione headless (richiede
  pointer-lock reale); verificato: hotbar mostra 1-8, wheel E apre, Forge 4+4,
  typecheck/test/lint verdi.
- NB IMPORTANTE: questo REVERTE la regola precedente "niente tasti 1-5". Ora i
  tasti diretti esistono (1-8 per le 8 abilita), perche l'utente ha chiarito che
  "ogni abilita deve avere un tasto sulla hotbar e dalle wheel le richiami in
  alternativa". Z/X/F/V/R/G restano disattivati.
- Gran parte della migrazione wheel 4+4 (keybinds senza spell1-6, radial-wheels
  E=0-3/Q=4-7, hotbar label, Forge) era gia stata fatta dall'utente tra i turni;
  la Fase 1 ha aggiunto lo strato dei tasti diretti 1-8.
- VFX (Fase 2 FATTA): le 10 `packages/client/public/vfx/*.png` erano
  illustrazioni AI COLORATE su sfondo NERO — formato sbagliato per il sistema
  additivo tinted via `instanceColor` (causa storica delle "particelle nere").
  Sostituite le 7 usate con particelle Kenney CC0 bianche-su-trasparente:
  flame_04->vfx_fire, star_04->vfx_ice, spark_04->vfx_lightning,
  circle_05->vfx_dark (anello shockwave), magic_03->vfx_nature,
  slash_01->vfx_slash, circle_04->vfx_shield. Sorgente:
  `E:\GIOCHI\ASSET_GRAFICA\PARTICELLE\kenney_particle-pack\PNG (Transparent)`.
  smoke/muzzle/blood non sono referenziate, lasciate stare.
- Dev preview locale: `.claude/launch.json` usa node con path assoluto +
  `pnpm.cjs` per evitare il PATH issue del launcher. Avviare server e client
  come config SEPARATE (`ragequit-server-dev` porta 2567, `ragequit-client`
  porta 5174) perche il launcher inietta `PORT=<port>` e il server lo legge:
  un'unica config full-dev fa collidere il game server con vite sulla stessa porta.

## Fix Character 2026-05-30

- ARMI INVISIBILI — ROOT CAUSE TROVATA E CORRETTA: i `.gltf` in
  `packages/client/public/weapons/kaykit/` referenziavano `.bin` con i nomi
  originali KayKit (`sword_C.bin`, `bow_B_withString.bin`, `staff_A.bin`) ma i
  file `.bin` erano stati rinominati ai nomi semplici (`sword.bin`, `bow.bin`,
  `staff.bin`). Il GLTFLoader fetchava il `.bin` mancante, Vite serviva
  `index.html` (200 SPA fallback) e il loader leggeva l'HTML come float ->
  vertici-spazzatura ~1e+34 -> triangoli clippati -> arma invisibile. Fix:
  corretta la `buffers[0].uri` in ogni `.gltf` per puntare al `.bin` reale.
  Verificato in-game: la spada ora si vede in mano. Stesso fix vale per bow/staff.
- Diagnostica utile: una mesh con boundingSphere a ~1e+34 = geometria corrotta;
  spesso significa `.bin` non trovato servito come HTML dal dev server.
- VESTITI "a pezzi nel corpo" & POKE-THROUGH — RISOLTO PER TANK/ARCHER (2026-05-30): caricando gli accessori cappuccio (`Male_Ranger_Head_Hood` e `Female_Ranger_Head_Hood`) la regola `outfitCoversHead` in `character-loader.ts` viene attivata automaticamente, nascondendo le mesh del corpo base (testa/pelle) sotto i cappucci ed eliminando ogni z-fighting o poke-through.
- OVERHAUL VISIVO CLASSI CHIUSO (2026-05-30): ogni classe ora possiede un modello unico, bellissimo ed indipendente:
  - **Tank**: Corpo maschio, armatura ranger, spallacci pesanti (`Male_Ranger_Acc_Pauldron`) e cappuccio corazzato (`Male_Ranger_Head_Hood`).
  - **Mago**: Corpo maschio, tunica da scriba (`Male_Peasant`), capelli lunghi (`Hair_Long`) e barba da stregone leggendario (`Hair_Beard`).
  - **Arciere**: Corpo femmina, armatura cacciatrice ranger e cappuccio (`Female_Ranger_Head_Hood`).
  - **Ibrido**: Corpo femmina, vestito leggero (`Female_Peasant`) e capigliatura ordinata (`Hair_SimpleParted`).
  - Il sistema di caricamento in `character-loader.ts` è stato potenziato per supportare array dinamici di accessori, caching ottimizzato e parallelismo. Verificato con typecheck, test e build con esito positivo al 100%.
- REWORK ARMI E SCUDO FISICO DINAMICO CHIUSO (2026-05-30):
  - **Nuova Spada**: Il vecchio modello di spada di base è stato sostituito con la splendida spada lunga a due mani `sword_D` (caricata via `/weapons/kaykit/sword_D.gltf` / `.bin`).
  - **Scudo Fisico**: Aggiunto lo scudo reale `shield_A` (caricato via `/weapons/kaykit/shield_A.gltf` / `.bin`) ospitato in `shieldGroup` dentro ciascun player.
  - **Stance Dinamica dello Scudo**: Implementato in `character-weapons.ts` (`updateShieldAttachment`) l'ancoraggio dello scudo:
    - **In parata (RMB attivo)**: Si sposta sull'osso `LeftHand` (mano sinistra) posizionato in sbarramento frontale.
    - **Idle (RMB inattivo)**: Si sposta sull'osso `Hips` (fianco sinistro), simulando lo scudo riposto.
    - **Weapon swap**: Se l'arma attiva non è la spada (es. arco o bastone), lo scudo si nasconde automaticamente.
  - Verificato con typecheck, tests ed impacchettamento Vite con esito positivo al 100%.

## Regola Documentale

I documenti devono descrivere stato vivo o regole chiuse, non intenzioni
astratte.

## FILE INTOCCABILI — NON modificare mai senza istruzione esplicita

- `packages/shared/src/constants/classes.ts` — slot grammar classi: verificare sempre vs git prima di qualsiasi modifica
- `packages/client/src/input/radial-wheels.ts` — logica wheel E/Q
- `packages/client/src/hud/cd-strip.ts` — limite spell label (attualmente `<= 6`)
- `packages/client/src/input/loadout-slots.test.ts` — test slot
- `packages/shared/src/constants/classes.test.ts` — test classi

## Regola Utente

- Se l'utente dice che un layout/stile fa schifo, va segnato e corretto subito.
- Se l'utente dice di eliminare una cosa, eliminarla dal gioco e dai documenti.
- Le decisioni nuove dell'utente si scrivono come stato vivo, non come piano.
- Menu e Loadout Forge devono essere progettati come UI di gioco pulita,
  proporzionata e posizionata con una sola fonte CSS.
- Menu e Loadout Forge devono nascondere il canvas arena live e usare un
  background statico UI; niente arena che gira dietro alle schermate.
- Home e Loadout Station devono privilegiare leggibilita e proporzioni: dock e
  card grandi, testi leggibili, pannelli larghi e nessuna colonna compressa.
- Il CSS del Loadout Forge deve combaciare con le classi realmente generate da
  `loadout-station.ts`; overlay/glow decorativi devono essere assoluti e non
  partecipare alla griglia dei contenuti.
- La Loadout Forge viva deve seguire solo `loadout-station.ts` e
  `classes.ts`; non tenere riferimenti TS a nodi DOM invisibili o rimossi.
- Le chip abilita del Forge usano `tag-role`, `tag-targeting`, `tag-control`,
  `tag-damage`, `tag-status`, `tag-move`, `tag-resource`; i vecchi tag CSS
  `tag-mobility`/`tag-sustain`/`tag-defense`/`tag-cost` sono rimossi.
- Regola Loadout Forge: leggere prima `TARGET_CLASS_DEFS`,
  `getClassSlotOrder()`, `isAbilityLegalForClass()`, `getAbilitySlotFamily()`,
  `actionLabel()` e `rebuildPool()`. Nessuna arma inventata, nessuna
  riga classi/armi duplicata, nessuna lane a budget zero per la classe attiva.
- Correzione UX utente: la Forge non deve basarsi su "seleziona uno slot" come
  flusso principale. Deve permettere di cambiare tutta la build da una vista
  unica, con lane e alternative compatibili visibili insieme. Le stats classe
  non devono occupare spazio centrale nel Loadout.
- Feedback UX Loadout 2026-05-27: la scelta classe sopra deve essere evidente e
  non piatta. Le lane devono mostrare chiaramente il mapping reale in game con
  i settori E/Q assegnati per classe (vedi contratto wheel 2026-05-30).
- Feedback UX Loadout 2026-05-27: le card abilita devono mostrare descrizione,
  input, elemento, costo, cooldown e tag direttamente nel pool; il nome deve
  stare sotto l'icona e l'icona PNG non deve essere tagliata.
- Regola asset icone 2026-05-27: ogni lista/export per generare icone abilita
  deve includere la natura funzionale oltre all'elemento: damage,
  control/setup, mobility, zone pressure, survival/recovery, drain/lifesteal,
  projectile, status/DoT e tag effetto reali.
- Feedback UX Loadout 2026-05-27: la barra sinistra deve essere piu larga e
  compatta, con slot orizzontali e testi principali su una riga; non deve
  comportarsi come una pagina HTML stretta da leggere a capo.
- Feedback UX Loadout 2026-05-27: non mostrare `FINISHER`, `STARTER`,
  `INSTANT` o `PREVIEW` accanto ai nomi delle abilita nelle card/slot.
  Usare natura funzionale leggibile (`CONTROL`, `PROJECTILE`, `RECOVERY`,
  `ZONE`, `MOBILITY`, `DRAIN`) e tag effetto separati.
- Feedback UX Loadout 2026-05-27: la Forge deve stare in una schermata da
  videogioco; niente pannello dettagli separato che ruba spazio, niente scroll
  del build sinistro, niente filtri `STARTER`/`INSTANT`/`PREVIEW` nel pool.
  Le info necessarie devono stare direttamente nelle card compatte.
- Regola Loadout Forge 2026-05-28: non esiste piu pannello dettagli separato e
  non esistono toggle di cast-mode nel Forge. Le abilita `targeting: 'point'`
  aprono placement, le altre sono dirette/primed dal runtime.
- **Rework Classi & Armi Chiuso (2026-05-30)**: Le 4 classi sono ora entità completamente separate e configurate come moduli indipendenti e riutilizzabili.
  - *Single Source of Truth*: `classes.ts` in `@ragequit/shared` definisce per ogni classe le sue configurazioni visive (base, outfit, hair, accessories), massimali risorsa, armi permesse e recovery spell. `character-loader.ts` risolve i layer GLTF dinamicamente da questo schema.
  - *Restrizione Armi Autoritativa*:
    - **Client**: `game-input.ts` intercetta lo swap armi (Tab/scroll wheel) ciclando dinamicamente solo tra le armi permesse per la classe corrente (`allowedWeapons = TARGET_CLASS_DEFS[activeClassId].weapons`).
    - **Server**: `GameRoom.ts` (`handleWeaponSwap`) valida autoritativamente lo swap sul server, rigettando pacchetti non autorizzati.
  - *ClassMechanicRuntime Modulare*: Riformulato l'engine delle meccaniche server-side con l'interfaccia `IClassMechanic`, scorporando Fury, Momentum, Resonance e Flow in handler separati (`TankMechanic`, `ArcherMechanic`, etc.) per rendere l'aggiunta di nuove classi banalmente estensibile.
- **Posizioni & Grip Fine-Tuning (2026-05-30)**:
  - *Allineamento Dritto*: Ripristinate le rotazioni calibrate Y-axis (`0.18` sword, `-0.08` bow, `-0.14` staff) per allineare le armi perfettamente dritte rispetto alla mano, compensando gli assi inclinati dei modelli 3D.
  - *Scudo Aderente*: Riposizionato lo scudo sheathed sul fianco (`Hips`) a coordinate `[-0.16, -0.06, 0.05]` e inclinazione `[-0.1, Math.PI / 2 + 0.2, Math.PI / 2 - 0.2]`, allineandolo perfettamente e aderente al corpo del giocatore.
- Nella UI Loadout le uniche classi valide sono Tank, Arciere, Mago e Ibrido.
- Conservare nel progetto solo asset runtime e contratti presenti approvati.
- **Filosofia di Sviluppo Connesso Allineata (2026-05-30)**: Qualsiasi modifica a una parte del codice deve considerare tutti i sistemi collegati in rete (grip/allineamenti FPV e TPV, mesh del corpo, netcode Colyseus, simulazione del server, comandi HUD e VFX/audio) per evitare disallineamenti o regressioni visive.
- **Rapporto Visuale Gladiators Arena (2026-05-30)**: Aggiornato `packages/client/src/world/arena.ts` per caricare in modo asincrono l'asset 3D reale `gladiators_arena.glb` per la mappa Gladiators Arena. Ciascun mesh caricato viene cel-shadato con Toon Materials e dotato di outlines (`createOutlineMesh`). Le collisioni server-authoritative sono mantenute mediante box procedurali nascosti per evitare conflitti visivi. La compatibilità con le mappe procedurali `blockout` e `duel_arena` è preservata.
- **Studio Decorazioni Tattiche Paintball (2026-05-30)**: Copiati gli asset `Crate_Wooden`, `Barrel` e `Banner_1` (con relative texture) in `/arena/props/` ed integrato il metodo `spawnDecorativeProps` in `packages/client/src/world/arena.ts`. Spawnerà 8 stendardi da torneo orientati verso il centro sugli 8 pilastri esterni dell'arena, e pile di casse/barili disposti in conformazione tattica nei 4 angoli e a ridosso degli ostacoli centrali per le mappe `blockout` e `duel_arena`. Le decorazioni sono cel-shadate con Toon Materials, dotate di outline e pulite ad ogni cambio mappa.





## Scelte Architetturali Chiuse (2026-06-01)

- **VFX textures**: RGBA bianco-su-trasparente (Kenney CC0). colorSpace=NoColorSpace, premultiplyAlpha=false. MAI sfondo scuro.
- **Personaggi**: caricare come .gltf+.bin, MAI .glb (texture embedded = 15-40MB per classe).
- **Armi**: caricare come .glb da `public/weapons/kaykit/` — 1 HTTP request invece di 3.
- **Bloom**: Three.js layer system. Layer 1 = bloom-eligible. NON mettere geometria normale su layer 1.
- **LOD**: >40m model nascosto, >20m shadow off. Implementato in renderFrame() prima dell'interpolazione.
- **Audio spaziale**: PannerNode HRTF per suoni remoti. updateListener() ogni frame.
- **Match FSM**: singleton `matchSM` in `src/game/match-state-machine.ts`. Unica fonte di verita per la fase partita lato client.
- **Preloader**: `src/preloader.ts`. Preload su joinedRoom, gate su fase 'live'. Loading screen con barra progresso.
- **Camera shake**: decay esponenziale (exp(-rate*dt)) + micro-oscillazione random. NON lineare.
- **Nameplate**: sempre via transform:translate3d(), mai left/top (layout reflow).
- **Sky dome**: ShaderMaterial custom gradient (zenith->orizzonte). NON skybox texture.
- **Props arena**: KayKit Dungeon + Fantasy Props MegaKit (barrel_large, barrel_small, box_large, banner_patternA_red, Torch_Metal, Lantern_Wall).
- **ASSET_GRAFICA**: cartella a `E:\GIOCHI\ASSET_GRAFICA`. Contiene particelle Kenney, props, 104 sprite icone (non mappate), modelli KayKit.
