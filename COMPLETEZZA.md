# RAGEQUIT — Roadmap di Completezza (cosa MANCA)

> **Generato 2026-06-13** da un'analisi gap multi-agente (9 dimensioni) che confronta
> **intento (doc design `01_DESIGN/`+`02_TECH/`+piani) ↔ realtà (codice/asset)**, verificando
> ogni voce nel codice reale (no doc-drift). 98 gap grezzi → sintesi sotto. Fonte di verità
> sullo "stato del gioco"; il piano operativo resta `PROGETTO.md`.

## Dove siamo davvero

RAGEQUIT ha un **motore di combattimento e una simulazione autoritativa solidi**
(mischia/parry/knockup, 53 abilità, mechanic per classe, ELO 1v1, predizione client) e
**una sola cosa visivamente finita: l'arena** (shell PBR + luci/torce/dust). Tutto il resto
del "guscio di gioco completo" è ancora prototipo o assente: i **personaggi e le armi sono i
placeholder cartoon rifiutati**, **non esiste musica né audio reale** (tutto sintetizzato), il
**5v5 e il matchmaking umano sono irraggiungibili**, e la **progressione/identità (quest-unlock,
leaderboard, cosmetici)** — pilastri del design — **non esistono in codice**. In breve: ottimo
"fight", scheletro di "gioco".

---

## 🔴 BLOCCANTI — serve per dire "gioco completo"

- **Modalità multiplayer reale assente** — nessun matchmaking/coda/lobby/party: ogni partita è solo-vs-bot o riempimento "primo libero" (`main.ts` `joinOrCreate` filtra solo per mode/difficulty). Il design (`07_modes.md`) lo dichiara prerequisito di lancio ranked. **L**
- **5v5 Team Battle non avviabile** — server pronto (team red/blue, 75 kill) ma **nessun tile nel menu** (`index.html` ha solo 1v1/FFA/Train) e `connect()` non invia mai `'5v5'`; serve anche mappa con spawn divisi per team (oggi anello simmetrico) e team-assignment per ELO/party invece del modulo join-order. **M**+**M**
- **Personaggi = "frankenstein" cartoon Quaternius** — tank/mage/archer/hybrid sono solo `Superhero_Male/Female` + outfit Ranger/Peasant + tinta; i GLB realistici sono **disabilitati** in `classes.ts`. **L** (asset-gated)
- **Niente clip di locomozione/morte per i personaggi realistici** — i CC-clip liberi sono "solo cast del mago, NO run/walk/death" → i modelli realistici resterebbero "congelati che slittano"; sblocco legato al reperimento di clip same-rig-family. **L** (asset-gated)
- **Armi = KayKit cartoon** (pack esplicitamente rifiutato) — `character-weapons.ts` punta a `/weapons/kaykit/*`; alternative realistiche (RPGWeapons, wizard_staff) inutilizzate. **M**
- **Nessuna musica** — niente loop menu/combat, nessun playback; i loop liberi (`01-Menu-loop.ogg`, 4 in-game metal) esistono in libreria ma non sono cablati. **M**
- **Connessione fallita silenziosa** — su Fly free-tier (cold-start) il primo PLAY rimbalza al menu con solo un puntino "offline", nessuno spinner/retry visibile. Per un gioco online pubblicabile è bloccante. **S**

---

## 🟡 IMPORTANTI — attesi dal design o da un'arena classica

- **Progressione quest-unlock assente** — pilastro headline ("tutto sbloccato via quest"), zero codice: ogni abilità è subito equipaggiabile. **L**
- **Nessuna leaderboard** — né ladder globale né top-3 live in HUD FFA; solo lookup self-row su Supabase. **M**
- **ELO mono-colonna, solo 1v1** — FFA e 5v5 non toccano mai l'ELO; servono 3 ladder per-mode. **M**
- **Scoreboard/leaderboard multi-player mancanti** — HUD = contatore a riga singola; fine partita hard-coded 1v1 (winner vs loser), collassa FFA/5v5 a "tu vs top opponent". **M**
- **FFA non giocabile da solo** — il client non chiede bot-fill per FFA e il server default è 0 bot → lobby vuota bloccata. **S**
- **Tile "Master" lancia la Test Room** (intenzionale: la 3ª difficoltà allenamento è la Stanza Test) — il bot Master resta UI morta, ma è una scelta già fatta dall'utente. **S** (verificare se si vuole un 4° slot)
- **Solo 2 mappe reali, stesso guscio** — `duel_arena`+`gladiators_arena` rendono nello stesso colosseo; `blockout` (stub) ancora fallback/boot. Zero varietà tema/bioma. **L**
- **Niente interactables/hazard/pickup** — mappe = sola cover statica; per modalità a uccisioni (40/75 kill) mancano anchor tattici (cure/mana/jump-pad). **L**
- **UI/menu generica esports-dark, non gotico-materico** — `game-ui.css` ha solo Inter/Rajdhani sans, nessun display blackletter/serif; tile neon + emoji. **M-L**
- **Audio interamente sintetizzato** — nessun file foley/spell reale cablato; 9 pack spell per elemento inutilizzati; manca la cartella `public/audio` e la pipeline encode. **M**
- **Niente announcer / sting vittoria-sconfitta / suono UI** — kill-streak, first blood, round-start, esiti partita sono muti. **S-M**
- **Spazializzazione audio quasi inesistente** — panner HRTF su 2 soli eventi; footstep/casti nemici non spaziali (critico in FFA/5v5). **M**
- **VFX spell incompleti** — manca core sfaccettato + ember, telegraph pre-rilascio sopra il caster, muzzle/cast-flash all'origine. **M**
- **Solo l'arco ha braccia FP** — staff = arma fluttuante senza mani, spada in 3ª persona; incoerente con la direzione FPS-only. **M**
- **Reconnect non reale** — il retry fa un join nuovo (nuovo sessionId), il server cancella lo stato su `onLeave` e non usa `allowReconnection()`; la partita in corso è persa. **M**
- **Niente gate WebGL / mobile** — `WebGLRenderer` costruito senza try/catch né probe; mobile o GPU non supportata = schermo rotto senza messaggio. **S/M**
- **Onboarding superficiale** — tutorial = 4 tooltip che svaniscono (solo tasti), non insegna parry-timing/risorse/combo; non ripetibile; nessun "How to Play". **M**
- **Niente accessibilità** — nessun colorblind mode né UI scaling, mentre HUD/VFX sono color-coded (mischia=rosso/arco=verde/magia=blu). **M**
- **Simmetria elementi rotta** — Ice/Dark mancano lo slot mobilità/utility-signature che Fire/Nature hanno. **M** (scelta design)
- **Recovery non imposto** — il validator non richiede ≥1 recovery → un build può avere zero self-heal. **S** (scelta design)
- **Niente friends/party/social** — party-queue/team del design non giocabili con amici. **L**
- **Profilo persistito minimo** — solo ELO/wins/losses; nessuna stat per-classe/per-mode/lifetime; le MatchStats di fine partita non persistono. **M**

---

## 🟢 POLISH — rifinitura

- **Niente rematch / play-again** (fine partita = solo "BACK TO MENU"). **M** · **Niente spettatore**. **L**
- **Soffitto mischia/movimento piatto** vs Mordhau/Quake — niente feint/cancel, attacchi direzionali spada, alt-fire arco/staff (M2 = parry globale), weapon-impulse come movement-tech, air-strafe. **M-L** (scelte design)
- **Parry omnidirezionale** (blocca anche alle spalle), **arco senza overdraw/sway**, derive doc↔codice su tempi carica arco e cadenza inter-round (2s vs 8s). **S**
- **Outline nera toon su armi/viewmodel** (i corpi hanno già rim team-color, le armi no), **orb staff FP hardcoded cyan** invece che tinto per elemento, **god-ray/dust torch-driven assenti**, **prop arena scarni/cartoon**. **S-M**
- **Icone menu = emoji OS**, **scoreboard/deathcam in inglese** mentre il resto è italiano, **crosshair non personalizzabile**, **audio = un solo slider master** (no Music/SFX/mute). **S-M**
- **Drift documentale**: i contratti `02_TECH/06` e `07` descrivono ancora la pipeline toon/MeshToon abbandonata — fuorvianti per il lavoro asset futuro. **S**
- **Minori**: account senza verify-email/reset-password/username-unique/migrazione guest; FFA cap 8 (menu) vs 10 (design); replay solo su disco effimero; anti-cheat senza report/ban; respawn FFA/5v5 a cadenza unica senza random; match a sole kill-cap senza timer fallback. **S-M**

---

## 🎨 NOTA GRAFICA (PIANO #1 — decisione di stile, dell'utente)

**Fatto:** l'**arena** ha il pass PBR + illuminazione (shell `gladiators_arena.glb`, torce, sky dome, dust) — l'unica parte visivamente "finita".

**Resta il grosso** (dove vive la frustrazione "errori ovunque"):

- **Personaggi** — ancora il "frankenstein" cartoon Quaternius (tank e mage condividono lo stesso corpo maschile → silhouette indistinta). I GLB realistici (`medieval_knight`, `shadowkin_mage_norm`, `shadowflame_samurai_norm`) sono in `packages/client/character-sources/` ma **disabilitati**, bloccati **solo** dal reperimento di clip locomozione/morte same-rig-family CC-free.
- **Armi** — KayKit cartoon, da sostituire con i GLB realistici già in libreria.
- **Braccia 1ª persona** — solo arco; staff fluttuante, spada in 3ª persona.
- **VFX** — manca core sfaccettato + ember + telegraph + muzzle-flash; orb staff non tinto per elemento; god-ray/dust.
- **UI/HUD** — esports-dark generico, manca il font display gotico e l'identità pergamena/ferro/oro-occulto.

Vincoli duri: **solo asset free + rig Mixamo/CC-family**; l'upload Mixamo è morto → le clip CC vanno reperite drag-drop. La scelta di stile/asset (quali GLB realistici adottare) **è dell'utente** — il sistema renderizza già qualunque GLB normalizzato.

---

## ▶️ ORDINE CONSIGLIATO

1. **Sblocchi di flusso a costo S, subito giocabili**: bot-fill FFA, tile + connect 5v5, superficie d'errore connessione + gate WebGL. Sblocca le modalità del menu in poche ore.
2. **Mappa team 5v5 con spawn divisi + team-assignment valido per i bot** — rende il 5v5 giocabile vs bot prima del multiplayer umano.
3. **Audio file-based**: crea `public/audio` + pipeline encode, poi cabla foley/elementi, musica menu+combat, sting esiti + UI click. Massimo rapporto "sensazione di gioco finito"/sforzo, indipendente dagli asset 3D.
4. **Armi realistiche** — sostituzione mesh + grip, sblocca anche le braccia FP. Indipendente dalle clip personaggio.
5. **Reperire clip locomozione/morte CC-free** (drag-drop dell'utente): unico blocco per **riattivare i personaggi realistici**. Cancella la lamentela #1.
6. **UI re-skin gotico-materico** + font display, così menu/HUD seguono lo stile dell'arena.
7. **Scoreboard/leaderboard multi-player** — dà senso a FFA/5v5 ora raggiungibili.
8. **Backend persistente per il ranked** (epica coesa multi-day): ELO per-mode → matchmaking/coda con UI → leaderboard → reconnect reale via `allowReconnection()`.

I pilastri di progressione (quest-unlock, cosmetici, social/party) sono **L** e indipendenti: epica separata dopo che il loop core è visivamente e funzionalmente completo.
