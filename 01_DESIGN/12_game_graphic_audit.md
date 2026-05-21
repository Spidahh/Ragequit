# GAME GRAPHIC AUDIT

Audit tecnico del progetto Three.js in `E:\GIOCHI\RAGEQUIT`.

Questa analisi è basata sulla repository letta localmente. Quando un dato non è ricavabile da codice o documentazione presente nel progetto, viene indicato come “non deducibile dal codice”.

## 1. Sintesi reale del gioco

RAGEQUIT è un browser game PvP arena 3D con client Three.js, server Colyseus autoritativo e logica condivisa in TypeScript.

Il gioco reale implementato è una vertical slice giocabile centrata su duelli arena, Training con bot, movimento custom, tre armi, abilità data-driven, HUD, menu, Loadout Station, status effect, proiettili, zone AoE, match flow e feedback VFX/audio base.

La struttura monorepo è:

- `packages/client`: client browser Vite + Three.js.
- `packages/server`: server Node.js + Colyseus.
- `packages/shared`: schema Colyseus, costanti, protocollo, ability registry, simulazione condivisa.
- `packages/client/public`: asset GLB e sprite SVG già usati dal client.
- `apps/web`: target di output statico.
- `tools`: validatori / asset pipeline documentale.

Entry point principali:

- Client HTML: `packages/client/index.html`.
- Client TS: `packages/client/src/main.ts`.
- Server: `packages/server/src/main.ts`.
- Room autoritativa: `packages/server/src/rooms/GameRoom.ts`.
- Ability data: `packages/shared/src/abilities/registry.ts`.
- Mappe statiche: `packages/shared/src/sim/map.ts`.

Build system:

- Package manager: `pnpm`.
- Client: Vite.
- Server/shared: TypeScript compiler.
- Test: Vitest.
- Lint: ESLint.

Librerie usate:

- `three` per rendering 3D.
- `colyseus.js` lato client.
- `@colyseus/core`, `colyseus`, `@colyseus/schema`, `@colyseus/ws-transport` lato server.
- `@supabase/supabase-js` per auth anonima/loadout persistence quando configurato.
- `posthog-js` / `posthog-node` per telemetry opzionale.
- `vite`, `typescript`, `vitest`, `eslint`.

## 2. Core loop

Loop di gioco dedotto dal codice:

1. Il giocatore apre il menu principale.
2. Sceglie `Play 1v1` o `Training`.
3. Prima della connessione entra nella Loadout Station.
4. Conferma il build.
5. Il client richiede pointer lock/focus canvas e si connette a una room Colyseus.
6. Il server crea/usa una room `game`, assegna modalità e mappa.
7. Il match passa attraverso `lobby`, `countdown`, `live`, `roundEnd`, `matchEnd`, salvo Training che resta live per testare input e combat.
8. Durante `live`, il client campiona input, predice il movimento locale e manda messaggi al server.
9. Il server valida movimento, swing, cast, parry, weapon swap, transmute, proiettili, zone, status, danni e morte.
10. Il client riconcilia il player locale con lo schema server, interpola i player remoti e renderizza scena/HUD/VFX.
11. Hit, death, projectile, zone, status, parry, score e phase arrivano come messaggi evento.
12. Il round termina per morte o timer, poi riparte o arriva a `matchEnd`.

Loop render client:

- `setInterval(simStep, TICK_MS)` per simulazione/input a 60 Hz.
- `requestAnimationFrame(render)` per rendering indipendente.
- Scene update: mappa, placement preview, arena animation, camera, player, remote players, projectile visuals, impact pool, zone visuals, HUD, debug.

## 3. Funzioni individuate

Funzioni di gioco implementate:

- Menu principale con `Play 1v1`, `Training`, `Loadout`, `Settings`.
- `Free For All` visibile ma disabilitato nel menu.
- Connessione Colyseus a server configurabile.
- Training con bot-fill.
- Match flow con round BO5 per modalità round.
- Scoring per round, FFA e team presente lato server/menu HUD, ma FFA è disabilitato lato client e 5v5 non appare come scelta di menu.
- Movimento WASD, jump tap/hold, always sprint.
- Mouse look con pointer lock o fallback pointer-look.
- Weapon swap via Tab/scroll.
- Armi: sword, bow, staff.
- Sword M1 con combo/arc visuale.
- Bow M1 con charge/release.
- Staff M1 con bolt cadenzato.
- Parry RMB tap/hold.
- Ability wheel E con 7 slot.
- Utility wheel Q con 4 slot.
- Direct hotkeys per 11 slot loadout.
- Placement preview per abilità `targeting: point`.
- 52 abilità data-driven.
- 11 slot loadout: melee, bow, 5 magic, 3 transfer fissi, 1 utility flex.
- Mastery sui 5 slot magic.
- Loadout Station con slot, dettaglio abilità, build coach, mastery pills, pool, search/filter, cast mode toggle.
- Persistenza locale di settings, keybind, loadout e instant-cast preferences.
- Supabase auth anonima/persistenza loadout solo se env configurate.
- HUD risorse HP/Mana/Stamina draggable/resizable.
- Combat console con weapon strip e cooldown strip.
- Crosshair, parry ring, bow charge bar, cast bar, round HUD, ping HUD, kill feed, respawn overlay, scoreboard, pause menu, settings overlay.
- Feedback hit: hitmarker, damage popup, directional hit, screen shake, hit-stop, impact VFX, audio procedurale.
- Feedback status: status strip, vignette blind/low HP/death, emissive su player.
- Projectile visuals per arrow/bolt con trail.
- Zone visuals per circle/wall.
- Arena GLB decorativa con fallback procedurale.
- Character GLB con animazioni e fallback procedurale.
- Weapon GLB con fallback procedurale.

## 4. Stati del gioco

Stati server principali in `GameState.phase`:

- `lobby`
- `countdown`
- `live`
- `roundEnd`
- `matchEnd`

Stati/mode server:

- `duel_arena`
- `blockout`
- `training`
- `ffa`
- `5v5`

Stati client/UI deducibili:

- main menu attivo tramite classe `main-menu-active`.
- loadout attivo tramite classe `loadout-active`.
- pause menu aperto/chiuso.
- settings overlay aperto/chiuso.
- scoreboard visibile/nascosto.
- respawn/death overlay visibile/nascosto.
- canvas input engaged.
- pointer lock attivo/non attivo.
- placement preview attivo/non attivo.
- radial wheel utility/ability aperta/non aperta.
- player alive/dead.
- player casting/non casting.
- player parrying/non parrying.
- bow charging/non charging.
- weapon attiva: `sword`, `bow`, `staff`.

## 5. Schermate esistenti

Schermate/superfici presenti in `packages/client/index.html` e moduli client:

- Main menu: titolo `RAGEQUIT`, Play 1v1, Free For All disabilitato, Training, Loadout, Settings, riepilogo controlli.
- Settings overlay: graphics quality, FOV, mouse sensitivity, volume, keybinds.
- Loadout Station: header, build flow, mastery pills, slot column, selected ability panel, filter/search, ability pool, confirm/back/reset.
- Pause menu: Resume, Loadout, Settings, Return to Lobby, riepilogo controlli.
- HUD combat: risorse, transmute bar, weapon strip, combat slots/cooldowns.
- Radial wheels: utility wheel Q, ability wheel E.
- Crosshair layer: crosshair, GCD ring, parry ring, bow charge.
- Cast/status layer: cast bar, status strip, server toast, damage/parry/heal/combo flashes.
- Round HUD: pips, phase, countdown, timer, kill counter.
- Scoreboard / match end.
- Respawn overlay / KO.
- Debug panel.

## 6. Schermate necessarie, solo se deducibili

Per la vertical slice attuale, non emerge dal codice una schermata obbligatoria mancante per entrare in Training o 1v1: il flusso main menu -> loadout -> room è implementato.

Schermate future deducibili solo come necessità parziale:

- Una vera schermata/selezione per FFA non è attiva: il bottone esiste ma è disabilitato.
- Una vera schermata/selezione per 5v5 non è presente nel menu, anche se il server e lo score HUD hanno scaffolding.
- Un account/profile UI non è deducibile dal codice come schermata esistente; Supabase auth è anonima e opzionale.
- Matchmaking/ELO UI non deducibile dal codice.
- Minimap non presente nel DOM letto; la documentazione visual la cita, ma il codice client non mostra una minimap implementata.

## 7. Informazioni che il giocatore deve vedere

Informazioni già mostrate o previste da superfici esistenti:

- HP, Mana, Stamina correnti.
- Cooldown e readiness degli slot.
- Arma attiva.
- Slot combat e utility equipaggiati.
- Transfer fissi HP -> Mana, Mana -> Stamina, Stamina -> HP.
- Primed ability tramite crosshair/slot.
- Cast mode `INSTANT` / `PREVIEW` nella Loadout Station e marker `I/P` sulle wheel.
- Placement preview e punto di conferma per abilità a punto.
- Bow charge.
- Parry state.
- Cast bar.
- Status attivi nel status strip.
- Low HP/death/blind tramite overlay/vignette.
- Match phase, countdown, round pips, timer.
- Scoreboard/match result.
- Ping.
- Hit confirmation, damage popup, directional hit, kill/KO feedback.
- Nome e HP dei player remoti tramite nameplate.
- Mastery active/none nel loadout e HUD.

Informazioni deducibili come importanti ma non chiaramente complete:

- Line-of-sight o validità target per ray/forward abilities: non deducibile come preview dedicata dal codice.
- Differenza visiva precisa tra ogni singola abilità della stessa categoria: non completamente deducibile dal codice, perché molte abilità condividono projectile/zone/impact visual generici.
- Stato “trap armed / not armed” per Snare Trap: non deducibile come visual specifica lato client; le zone hanno visual generica.
- Feedback specifico per resource drain/lifesteal/cleanse oltre status/HUD/audio: non deducibile dal codice.

## 8. Feedback visivi mancanti

Mancanze dedotte dal codice, non da preferenze estetiche:

- Molte abilità non hanno VFX unici per ID. Il client visualizza soprattutto categorie: arrow, bolt, zone circle/wall, impact color, status emissive.
- Non è deducibile un telegraph separato per ogni windup server-side; il cast bar esiste, ma la silhouette/caster windup specifica per abilità non è evidente nel codice.
- Non è deducibile una visualizzazione specifica per trap arm delay.
- Non è deducibile una visualizzazione specifica per resource drain.
- Non è deducibile una visualizzazione specifica per lifesteal come flusso/beam dedicato.
- Non è deducibile una visualizzazione specifica per cleanse oltre messaggi/status.
- Non è deducibile un VFX world distinto per freeze/root/stun/curse/mark per ogni status; il codice mostra emissive/status overlay generici.
- Non è deducibile un feedback per validità/invalidezza placement rispetto a collisioni o superficie, oltre la posizione/range del preview.
- Non è deducibile un minimap renderizzato.

## 9. Asset attuali

Asset reali in `packages/client/public`:

- `arena/gladiators_arena.glb` circa 171 KB.
- `characters/player.glb` circa 660 KB.
- `weapons/sword.glb` circa 47 KB.
- `weapons/bow.glb` circa 39 KB.
- `weapons/staff.glb` circa 13 KB.
- `icons-sprite.svg` circa 45 KB.

Asset procedurali/codice:

- Arena fallback: ground plane, tile texture canvas, rings, grid, colosseum procedural, pillars, walls, torches, plinths, floor crest, particles.
- Character fallback: mesh low-poly costruito con primitive Three.js.
- Weapon fallback: primitive per sword/bow/staff.
- Projectiles: arrow cylinder e bolt sphere creati da codice.
- Trails: `THREE.Line`.
- Zones: cylinder/wall/ring mesh creati da codice.
- Placement preview: circle/ring/wall/line creati da codice.
- Impact VFX: instanced sphere + torus shockwave.
- Audio: procedural WebAudio, nessun file audio esterno deducibile.
- Texture: canvas texture procedurale per pavimento; eventuali texture interne ai GLB vengono riusate se presenti, ma il contenuto esatto dei GLB non è descritto dal codice.

## 10. Problemi grafici dedotti

Problemi deducibili dal codice:

- Il client usa una combinazione di GLB e fallback procedurale. Se i GLB falliscono, il gioco torna a un look blockout/procedurale.
- I proiettili sono visualmente ridotti a due archetipi principali: arrow e bolt. L’elemento influenza soprattutto impatto/zone color, non necessariamente la forma del proiettile.
- Le zone condividono geometrie generiche circle/wall; la differenza è soprattutto colore/ritmo di pulse.
- Gli status sono comunicati più da UI/emissive/vignette che da effetti world distinti per ogni stato.
- La Loadout Station è molto ricca di testo e superfici DOM; il codice la rende funzionale, ma il rischio “tool/catalogue UI” è reale e già riconosciuto nei documenti.
- Il main menu/settings/pause sono DOM/CSS sopra canvas, non scene 3D dedicate.
- Il visual del player locale sparisce in first-person per bow/staff; le weapon viewmodel in prima persona non sono deducibili come presenti.
- Non è deducibile una distinzione visiva forte tra player team/ruolo oltre colore self blu, remote rosso, nameplate e emissive.
- Non è deducibile un sistema di decal persistenti, impronte, scorch mark o blood trail runtime.
- Non è deducibile un sistema particle dedicato per ogni elemento/abilità oltre ambient particles, impact pool e zone/projectile generici.

## 11. Problemi performance potenziali

Problemi o rischi dedotti dal codice:

- `renderer.shadowMap.enabled = true`, shadow type `PCFSoftShadowMap`, directional shadow map 2048x2048: buono per qualità, ma potenziale costo su hardware debole.
- La scena include molte luci: hemisphere, directional shadow-casting, rim directional, bounce point, player point, torches, overhead spots, wall accent lights. Non tutte castano shadow, ma il numero di luci può pesare su materiali lit.
- `MeshStandardMaterial` è usato per projectile arrow/bolt e staff orb; il contratto performance suggerisce materiali economici per projectiles/VFX.
- Character GLB usa `frustumCulled = false` sui mesh skinned per evitare culling errato: corretto funzionalmente, ma può aumentare costo con molti player.
- Ogni remote player crea anche nameplate DOM aggiornato ogni frame con proiezione camera; in 5v5 è probabilmente accettabile, ma scala peggio di una soluzione batch/canvas.
- Projectiles creano mesh, line, geometry e material per visual quando appaiono; non risultano pooled come l’impact VFX.
- Zones creano/dispose mesh/material a spawn/expire; non risultano pooled.
- Ambient particles e magic particles aggiornano BufferAttribute CPU ogni frame. Il numero attuale è basso, ma resta lavoro CPU per frame.
- `renderer.info.render.calls` è esposto nel debug, ma non è deducibile un budget automatico o throttling dinamico oltre pixel ratio quality.
- Pixel ratio è limitato a 1.5 e quality setting usa 1.0/1.25/1.5: mitigazione già presente.
- Vite separa `vendor-three` e imposta chunk warning 700 KB: il vendor Three.js resta isolato e non deve produrre warning su build pulita.
- GLB loading non mostra uso di DRACO/KTX/compression pipeline: non deducibile dal codice.
- La grossa CSS UI è in `index.html`; non è un problema GPU diretto, ma overlay DOM complessi possono pesare durante gameplay se molte superfici sono visibili.

## 12. Tecnologie già usate

Rendering:

- Three.js `WebGLRenderer`.
- `Scene`, `PerspectiveCamera`.
- `HemisphereLight`, `DirectionalLight`, `PointLight`.
- `FogExp2`.
- `MeshToonMaterial`, `MeshBasicMaterial`, `MeshStandardMaterial`.
- `GLTFLoader`.
- `SkeletonUtils.clone`.
- `AnimationMixer`.
- `InstancedMesh`.
- `CanvasTexture`.
- `DataTexture` toon gradient.
- Primitive geometry: box, sphere, cylinder, torus, ring, circle, plane, grid, line.

Client app:

- Vite.
- TypeScript modules.
- DOM/CSS HUD.
- LocalStorage.
- WebAudio procedural sound.
- Colyseus client.
- Supabase optional auth.
- PostHog optional telemetry.

Server/simulation:

- Colyseus authoritative room.
- Colyseus schema sync.
- Custom movement/collision/projectile sim.
- Tick server 60 Hz.
- Rate limiter.
- ReplayRecorder scaffold.
- BotController.
- MatchManager.
- Supabase optional DB persistence.

## 13. Vincoli tecnici reali

Vincoli dedotti:

- Il server è autoritativo: danni, cooldown, costi, status, loadout validation, hit decisions e match flow non devono dipendere dal client.
- Il client predice movimento locale e riconcilia usando `lastProcessedInputSeq`.
- Il server tick è 60 Hz.
- Il client render loop è indipendente dal tick server.
- Il client deve preservare pointer lock e input gating durante `live`.
- Bow/staff usano camera first-person per allineare mira/crosshair; sword usa camera third-person over-shoulder.
- Spawn projectile server e camera/muzzle devono restare allineati tramite offset condiviso.
- Le mappe sono AABB statiche custom, non fisica Rapier/Ammo/Cannon.
- Placement abilities inviano `targetPoint`; il preview deve essere coerente con range/ground/crosshair.
- Loadout ha 11 slot con transfer fissi in 7/8/9.
- Nessun sistema passive/rune.
- Ability data vive nel registry condiviso; client e server leggono gli stessi ID/definizioni.
- Gli asset pubblici sono serviti da path statici `/arena/...`, `/characters/...`, `/weapons/...`.
- Il gioco deve funzionare anche senza Supabase env vars.
- Telemetry è opzionale via env.
- Graphics quality regola pixel ratio, non una pipeline LOD completa.
- Le superfici UI sono DOM/CSS sopra canvas, non UI mesh Three.js.

## 14. Cose non deducibili dal codice

- Target hardware minimo reale: non deducibile dal codice.
- FPS reali su macchine target: non deducibile dal codice.
- Numero massimo effettivo di player testato in browser: non deducibile dal codice.
- Qualità visiva reale dei GLB senza aprirli/renderizzarli: non deducibile dal codice.
- Contenuto preciso delle texture/material map interne ai GLB: non deducibile dal codice.
- Origine/licenza degli asset GLB attuali: non deducibile dal codice.
- Stile grafico finale da scegliere: non deducibile dal codice.
- Asset futuri da usare: non deducibile dal codice.
- Se il progetto vuole mantenere menu puramente DOM o spostarli in scene 3D: non deducibile dal codice.
- Se FFA/5v5 sono ancora priorità immediate o solo scaffolding: non deducibile dal codice.
- Se il gioco userà account visibile, profilo, ranked UI o lobby social: non deducibile dal codice.
- Se il minimap citato nei documenti sia ancora desiderato: non deducibile dal codice.
- Se i VFX devono essere unici per ogni abilità o solo per archetipo/elemento: non deducibile dal codice.
- Se audio procedurale è temporaneo o definitivo: non deducibile dal codice.
- Se il player GLB attuale è placeholder o final: non deducibile dal codice.
- Se `tools/asset-pipeline` è operativo oltre la documentazione: non deducibile dal codice.

## 15. Domande da fare al developer prima di decidere la grafica

1. Qual è il target hardware/browser minimo reale per la vertical slice?
2. La priorità grafica immediata è migliorare il gameplay readability in arena o il presentation layer dei menu?
3. Gli asset GLB attuali sono placeholder, direzione provvisoria o base da mantenere?
4. Il gioco deve restare low-poly stylized come da documenti, o quella direzione va rivalutata?
5. Ogni abilità deve avere un VFX unico, o basta differenziare per elemento + categoria?
6. Quanti player simultanei devono essere supportati nel prossimo pass grafico: 1v1, Training, FFA o 5v5?
7. Il player locale in bow/staff deve avere viewmodel/mani/arma in prima persona, o può restare senza corpo visibile?
8. Il minimap documentato è ancora richiesto?
9. I menu devono restare DOM/CSS o devono diventare superfici integrate nella scena?
10. L’audio procedurale è intenzionale o è solo provvisorio?
11. Serve mantenere compatibilità piena senza Supabase e senza asset remoti?
12. Quali feedback combat sono più critici ora: hit/parry, status, cooldown/cost fail, placement, death, o readability dei proiettili?
13. Qual è il budget massimo accettabile per draw calls, triangoli, texture memory e dimensione bundle?
14. Ci sono vincoli di accessibilità colore oltre quelli già citati nei documenti?
15. FFA e 5v5 devono influenzare subito la grafica/HUD o restano fuori scope?
