# RIFONDAZIONE — revisione globale 2026-08-11 (ricerca aggiornata + piano esecutivo)

> Risposta alla richiesta: «il gioco ha problemi su tutti i fronti… voglio una revisione
> completa globale fatta da un super esperto aggiornato, rifondarlo evitando gli errori
> attuali e finirlo completamente». Qui: (1) il prompt riscritto, (2) la diagnosi,
> (3) cosa dice la ricerca 2026, (4) il piano in fasi con i punti-decisione dell'utente.
> Il piano operativo vivo resta `PROGETTO.md`; lo stato-gap resta `COMPLETEZZA.md`.

---

## 1. IL PROMPT RISCRITTO (cosa stiamo davvero facendo)

**Obiettivo.** Portare RAGEQUIT da "ottimo fight, scheletro di gioco" a **gioco completo,
coerente e pubblicabile**: 4 classi realistiche animate e distinte, spell leggibili e
spettacolari, tutte le modalità raggiungibili dal menu, audio vero, UI coerente, zero
errori visibili — **senza riscrivere ciò che è sano** (sim autoritativa, 53 abilità,
predizione, arena PBR: sono solidi e restano).

**Vincoli duri (invariati).** Solo asset/tecnologie/hosting GRATIS · scelte di stile e
asset = **decide l'utente** (io propongo con prove renderizzate, mai astratto) · valori
numerici e ingegneria = compito mio · gate `pnpm check` verde prima di ogni commit ·
verifica headless (shot/probe/testroom/lineup) per ogni cambio visibile.

**Criteri di accettazione ("finito").** Un nuovo giocatore: apre il sito → capisce il
menu → entra in OGNI modalità e trova sempre una partita viva (bot-fill) → vede
personaggi che non sembrano placeholder → legge ogni spell in volo e ne sente l'impatto →
sente musica/foley → un errore di rete gli parla invece di buttarlo su una schermata
muta. Niente riscritture "big-bang": ogni fase spedisce da sola.

## 2. DIAGNOSI (sintesi verificata — dettaglio in COMPLETEZZA.md)

Sano: server 60Hz, combat/parry/knockup, ability-registry, predizione, ELO 1v1, arena
PBR+luci, harness di verifica. Rotto/mancante (le lamentele): personaggi frankenstein
cartoon (bloccati da clip di locomozione), armi KayKit rifiutate, spell piatte e povere,
modalità irraggiungibili (5v5 senza UI, FFA vuota), errori di rete silenziosi, zero
musica/audio-file, UI esports generica, niente progressione.

## 3. RICERCA 2026 — cosa è cambiato e cosa adottare

### 3.1 Rendering (three.js)

- Ultima release **r185** (lug 2026); upgrade da r180 = rischio basso, ma ritestare
  luci/ombre/AO: PBR leggermente più luminoso (r181), `PCFSoftShadowMap` deprecato →
  `PCFShadowMap` (ora soft), GTAO più corretto (ritarare radius/scale), `Clock`→`Timer`.
  FBXLoader ora auto-converte Z-up (r184) — controllare i loader FBX nostri.
- **WebGPU: NON migrare ora** (gioco esistente, target compatibilità); WebGL resta pienamente supportato.
- **`postprocessing` (pmndrs)**: fonde bloom+AO+grade in una passata, bloom selettivo
  nativo → sostituisce il nostro doppio-composer con meno costo. Da adottare in F1.
- **three-mesh-bvh** = standard de-facto per raycast/collisioni mesh. **detect-gpu** per
  auto-settare la qualità iniziale.

### 3.2 VFX spell — LA soluzione pronta

- **three.quarks** (v0.17, MIT, mantenuto, richiede three ≥0.182): batching, trail,
  sub-emitter, flipbook, **editor visuale** (quarks.art) che esporta JSON caricabile.
  È esattamente ciò che oggi facciamo a mano male. → adottare in F2.
- Texture: Kenney Particle Pack (CC0) già in uso + Brackeys VFX Bundle (flipbook, free).
- Leggibilità competitiva (Riot/GDC): core piccolo saturo + glow largo desaturato,
  trail direzionale, telegraph a terra, impatto ≠ colore proiettile, hot-point sempre visibile.
- Beam/fulmini: `Line2`/pmndrs meshline + `LightningStrike` (examples three).

### 3.3 Personaggi/animazioni — LO SBLOCCO più importante

- **Mixamo è vivo** (catalogo scaricabile; è l'UPLOAD/auto-rigger a essere instabile) e
  la licenza copre giochi commerciali. **I personaggi STOCK Mixamo sono già rigged sullo
  stesso scheletro `mixamorig`** → scaricando ogni animazione **"with skin"** per ciascun
  personaggio, il retargeting SPARISCE (l'ostacolo che ci ha bloccato per mesi).
- Candidati stock (nomi esatti): cavaliere **"Paladin W/Prop J Nordstrom"** o **"Knight D
  Pelegrini"** o **"Vanguard By T. Choonyung"**; arciere **"Erika Archer With Bow/Arrow"**;
  orientale **"Ninja"**. **Il mago NON esiste su Mixamo** → modello CC (Sketchfab/Fab) +
  **AccuRig 2.0** (Reallusion, gratis, sostituto dell'auto-rigger Mixamo) + retarget in
  Blender con **Rokoko addon / Expy Kit** (free).
- Regola d'oro confermata: **retarget SOLO offline in Blender**; a runtime three.js
  riproduce clip già cotte (mai `retargetClip` in produzione).
- ⚠️ Il catalogo Mixamo è senza manutenzione: scaricare PRESTO ciò che serve.

### 3.4 Netcode/hosting

- **Colyseus 0.17** (apr 2026): riconnessione automatica client (onDrop/onReconnect) =
  esattamente il nostro gap "reconnect non reale"; migrazione da 0.16 contenuta. → F1.
- **Fly.io: free tier morto** per i nuovi account (verificare se il nostro è
  grandfathered!). Piano B gratuito: **Koyeb** (Francoforte, WS ok, cold start 1-5s) ·
  piano C: Oracle Always Free (VM ARM, always-on, gestione manuale).
- Restare su **WebSocket** (WebTransport non passa sui PaaS free). Matchmaking/lobby:
  Colyseus li ha già inclusi.
- **Supabase free: si pausa dopo 7 giorni senza query** → serve un keep-alive schedulato
  (GitHub Actions cron). Da fare subito.

### 3.5 Ecosistema asset free (aggiornamento del verdetto di giugno)

- Novità vera: la **Fab Standard License è engine-agnostic** → i drop gratuiti
  bisettimanali di Fab (anche pack realistici dungeon/armi) sono usabili in Three.js.
  **Claimarli sistematicamente** (restano tuoi per sempre).
- Armi/prop realistici: Poly Haven (CC0, PBR top), Sketchfab CC per-modello,
  Medieval Dungeon Modular Base Kit (OGA, CC-BY). Il "mosaico" va curato, ma esiste.
- **Audio**: Sonniss GameAudioGDC (GB di foley, royalty-free senza attribution),
  pack spell per elemento su itch (TheSoundRack, Khron Studio), musica Kevin MacLeod
  (CC-BY) / OGA CC0. Copre TUTTO il gap audio gratis.
- **Font**: Cinzel (UI, leggibilissimo) + Grenze Gotisch (titoli, 9 pesi) — OFL.
- Buchi di stile: generatori AI (Meshy/Tripo) free tier = CC-BY con attribution, ormai
  praticabili per prop/armi coerenti.

## 4. IL PIANO IN FASI (ogni fase spedisce da sola, gate verde)

- **F0 — Flusso sbloccato ✅ (fatta 2026-08-11).** Errore-connessione visibile + retry
  cold-start; FFA con bot-fill (5, env `FFA_BOT_FILL`); **Team 5v5 giocabile** (tile menu,
  wiring, team bilanciati, spawn per metà anello, bot che non attaccano i compagni e
  scelgono il nemico più vicino); gate WebGL con messaggio. +11 test (`lobby-fill`).
- **F1 — Fondamenta tech 2026 ✅ (fatta 2026-08-11, salvo post-FX).** three r180→**r185** ✅ ·
  **Colyseus 0.16→0.17** ✅ (bootstrap `express`-callback del transport, schema v4, client
  `@colyseus/sdk`, close-code kick spostato a 4100, verificato live 5v5 e in-match browser) ·
  **auto-quality FPS-adattivo** ✅ (al posto di detect-gpu: campiona gli fps reali in match e
  scala il preset, mai dopo una scelta manuale — zero CDN, 6 test) · **keep-alive Supabase** ✅
  (workflow cron pronto in `.github/workflows/supabase-keepalive.yml` — il token di push non ha lo scope `workflow`: va caricato una volta a mano su GitHub → Add file, poi gira da solo) · RESTANO: post-FX pmndrs (accorpato a
  F2: stesso compositor, va visto dal vivo) e la verifica del piano hosting Fly (serve l'utente).
- **F2 — Spell rifatte (three.quarks) + post-FX pmndrs.** Emitter JSON per elemento (editor
  quarks.art): core+glow+trail+ember, muzzle-flash al cast, telegraph a terra, impatto dedicato;
  pool luci esistente mantenuto; regole di leggibilità §3.2. Nello stesso giro: composer unico
  pmndrs (bloom selettivo+AO+grade in una passata). Verifica `shot.mjs SHOT_FIRE=1` + utente dal vivo.
- **F3 — Personaggi realistici (il piano §5B diventa eseguibile).**
  1. _(UTENTE, ~1 ora, con la mia guida)_ Login Adobe → scaricare i 3-4 stock scelti +
     set animazioni "with skin" per ciascuno; scegliere il modello del mago (CC) →
     AccuRig → retarget Blender (io preparo lo script/istruzioni passo-passo).
  2. _(IO)_ Pipeline: FBX→GLB per classe (clip nominate), `normalize-glb`, path
     single-GLB già esistente (`_installSingleGlbModel`), grip armi per-rig, verifica
     lineup/animshot/testroom. **Decisione stile = utente** sui candidati renderizzati.
- **F4 — Armi vere + braccia FP.** Sostituire i KayKit con pack realistici (Fab free
  claimati / Sketchfab CC / Poly Haven); braccia FP free (Sketchfab CC-BY) per staff+spada;
  socket grip standard all'origine (fine del pin-a-mano).
- **F5 — Audio completo.** Pipeline `public/audio` (encode webm/ogg) · foley Sonniss ·
  spell per elemento · musica menu+combat (CC) · announcer/sting esiti · spazializzazione
  estesa (footstep/cast nemici). Slider Musica/SFX separati.
- **F6 — UI gotico-materica.** Cinzel+Grenze Gotisch self-hostati · re-skin menu/HUD
  (pergamena/ferro/oro-occulto, via le emoji-icone) · purge di `game-ui.css` (5.5k righe) ·
  scoreboard multi-player FFA/5v5 · una sola lingua.
- **F7 — Ranked & progressione (epica multi-day, dopo che il core è completo).**
  ELO per-mode → coda/matchmaking con UI → leaderboard → reconnect `allowReconnection`
  (0.17 aiuta) → stats persistite per-classe → quest-unlock/cosmetici (pilastri design).

**Ordine scelto perché:** F0-F2 cancellano le frustrazioni quotidiane senza decisioni di
stile; F3-F4 richiedono l'utente (scelte + download Adobe) e la ricerca dice di farli
PRESTO (Mixamo senza manutenzione); F5-F6 danno il "sembra finito"; F7 dà la longevità.

## 5. COSA SERVE DALL'UTENTE (punti-decisione, nient'altro va deciso da me)

1. **Conferma del piano** (o modifiche — questo file si aggiorna, non si butta).
2. **F3**: scelta dei 4 modelli (io rendo i candidati a schermo) + ~1 ora su mixamo.com
   con me a guidare i download (serve il TUO account Adobe; io non posso fare login).
3. **F4/F6**: ok sugli asset armi/font che proporrò renderizzati.
4. **Hosting**: dirmi se l'account Fly è ancora sul piano vecchio (se no: ok a Koyeb).
