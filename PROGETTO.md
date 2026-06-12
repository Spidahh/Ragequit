# PROGETTO — RAGEQUIT (fonte di verità unica)

> **REGOLA.** Questo è l'UNICO file-cervello del progetto. Si LEGGE all'inizio di ogni
> sessione e si AGGIORNA man mano. Quando l'utente dà un feedback, il piano qui dentro
> si **modifica** e si annota nel log — **non si butta via e non si ricomincia**.
> Niente modifiche sparse a caso: si lavorano le fasi del piano in ordine.
>
> **Per sviluppare/verificare/modificare senza perdere tempo → leggi `SVILUPPO.md`** (come si gira,
> come si VERIFICA con log+logica e NON con gli screenshot, le trappole, le ricette di modifica).

---

## ⭐ PIANO ATTIVO #1 — RIFARE TUTTA LA GRAFICA (parole dell'utente, NON ridiscutere)

Scritto una volta per non farselo ripetere mai più. Si esegue IN QUEST'ORDINE:

1. **ANALISI** di tutta la grafica attuale: cosa c'è e cosa è rotto.
2. **PIANO + UNA VIA**: decidere **uno stile** che deve avere **TUTTO il gioco** — personaggi,
   arena, armi, props, VFX, HUD **E i MENU**. _Io propongo le vie (con riferimenti); **sceglie l'UTENTE**._
3. Deciso lo stile → **guardare cosa c'è in `E:/GIOCHI/ASSET_GRAFICA`**, studiarlo tutto, tenere
   **SOLO le cose davvero funzionali e utili** a quello stile (scartare il resto, incluso il cartoon).
4. Il **resto si scarica online, FREE** (Sketchfab/Quaternius/Mixamo/Poly Haven/CC0…).
5. **INTEGRARE** tutto in modo coerente, verificando.

**Regole dure:** solo GRATIS (asset+tech+hosting) · rig **Mixamo** · gioco **COMPLETO, niente tagli** ·
**stile/asset = li decide l'UTENTE** · valori numerici = li metto io.
Dettaglio aree/file nel log (§6). Come verificare senza perdere tempo → `SVILUPPO.md`.
**Fatto finora: SOLO l'arena (PBR+luce). Tutto il resto della grafica è da fare con questo piano.**

---

## 1. Cos'è il gioco

Arena PvP da browser, prima persona / mezza-terza, combattimento medievale-fantasy
(melee + magie). 4 classi: **tank, archer, mage, hybrid**. Three.js (client) +
Colyseus (server). Camera MISTA: spada = 3ª persona (corpo visibile), arco/staff = 1ª
persona (viewmodel) — vedi `render/weapon-view.ts`.

## 1.5 VINCOLI DURI & FONTE ASSET (regole non negoziabili)

- **SOLO asset GRATIS.** Niente pacchetti a pagamento (Synty/KitBash3D/Megascans = NO,
  anche se più belli). Una ricerca a 6 agenti ha confermato: non esiste un ecosistema
  gratis, coerente E realistico esterno → la via è la **libreria curata dall'utente**.
- **TUTTE le tecnologie + hosting GRATIS** (oggi: Three.js + Colyseus; Fly.io +
  Cloudflare Pages, tier gratuiti).
- **FONTE ASSET PRIMARIA = `E:/GIOCHI/ASSET_GRAFICA`** — l'utente la aggiorna spesso; ha
  un suo `_INVENTARIO.md`. Usare un asset SOLO se è davvero utile **e migliore** di
  quello già nel gioco.
- **RIG STANDARD = Mixamo** (uno scheletro). Ogni skin + animazione si conforma; skin
  non-Mixamo → auto-rig su Mixamo o scartare.
- **Cosa c'è in ASSET_GRAFICA** (2026-06):
  - PERSONAGGI/CHARACTERS: `Knight_Met.glb` (Mixamo, 14 anim → **TANK pronto drop-in**),
    `pbr_shadowkin_mage_rigged.glb`, `lightning_mage_free_download.glb` (statico/sporco),
    `shadowflame_samurai.glb` (rig CC, 0 anim → conformare), `armored_guard_knight_rig.glb`.
  - PERSONAGGI/MOBS: drago (52 anim), **Gwyn Lord of Cinder** (boss Dark Souls), zombie (Mixamo).
  - PERSONAGGI/ANIMATION: **204 FBX Mixamo** (idle/run/strafe/attack/…) + cast da mago + UAL.
  - PERSONAGGI/ARMI: KayKit FantasyWeapons + **RPGWeapons_Free** + archi/bastoni/braccia-FP.
  - mappe: KayKit Dungeon Remastered, **Fantasy Props MegaKit**, Modular Village, Free
    Modular, `gladiators_arena.glb`.
  - AUDIO: 9 pack spell per elemento. PARTICELLE: Kenney. icone (106). menu (ritratti classi + logo).
  - ⚠️ Alcuni item SONO cartoon (KayKit) → l'utente li rifiuta: valutare ognuno contro
    il target dark-gritty-realistico; tenere i realistici (Knight_Met, Gwyn, drago,
    RPGWeapons, dungeon/props realistici), scartare i cartoon.

> Il design del gioco (vision, classi, combat, abilità, modalità) è nei doc `01_DESIGN/`
> (rivisti con l'utente in `REVISIONE.md`). Non duplicarlo qui.

## 2. Architettura & sistemi (mappa — NON ri-scoprirla ogni volta)

- **Monorepo** pnpm: `packages/{client,server,shared}`. `@ragequit/shared` va buildato
  (`pnpm --filter=@ragequit/shared build`) prima di typecheck/test.
- **Gate**: `pnpm check` = typecheck + check:budget + check:assets + lint + format:check
  - validate:content + test (41 client + 119 server). DEVE essere verde prima di ogni
    commit. Su Windows il cwd può driftare: girare i gate via Bash con `cd` esplicito.
- **Deploy**: push su `main` = produzione (Fly.io server + Cloudflare Pages client).
  **Tutto va su `main`, niente branch** (regola utente). Flusso: commit → `git fetch
origin main` → `git rebase origin/main` → `git push origin HEAD:main` → `git branch -f
main HEAD`. (La CI a volte avanza `origin/main`: rebasare.)
- **File client chiave**:
  - `src/main.ts` — orchestratore (renderer, scena, luci, post-FX, loop, camera). Vicino
    al tetto del file-budget: estrarre in moduli, non gonfiarlo.
  - Sistema personaggio: `render/characters.ts` (install + materiali), `character-loader.ts`
    (composizione layer + skeleton), `character-weapons.ts` (armi/scudo + grip),
    `character-animation.ts` (mixer/stati), `character.ts` (anchor + weaponGroup/shieldGroup).
  - `render/weapon-view.ts` — `WEAPON_VIEW` (camera 1ª/3ª per arma).
  - `world/arena.ts` — arena (shell GLB, pavimento, cover-box, torce, cielo, props).
  - Post-FX: `render/grade-pass.ts` (grade), GTAO + bloom selettivo in `main.ts`.
  - VFX spell: `render/projectile-visuals.ts`. HUD: `hud/*` + `public/game-ui.css`.
    Menu: `menu.ts`, `loadout-station.ts`, `menu-bg.ts`.
  - Asset: `public/characters/*` (mesh+texture), `public/weapons/kaykit/*`,
    `public/arena/*`.
- **Verifica visiva headless** (FUNZIONA — l'utente la vuole): `tools/verify/shot.mjs`
  (in-match) e `tools/verify/inspect.mjs` + `/inspect.html` (personaggio ravvicinato).
  Playwright + SwiftShader + `gl.readPixels`. **Dopo ogni edit a `main.ts` riavviare il
  dev-server** (HMR sull'entry → scena nera). Dettagli: vedi memoria `ragequit-verify-harness`.

## 3. Stato visivo & cause-radice (diagnosi data-driven, 8 agenti)

Meta-causa storica: **mancanza di una singola fonte di verità** per ogni cosa (altezza
render, bind-pose, grip armi, outline, materiale/palette/post-FX, font). 6 cause radice:

| #   | Causa                                                              | Stato                                                                                                          |
| --- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| R1  | `×1.45` solo sul modello → personaggi giganti vs camera a 1.8m     | ✅ FATTO (`CHARACTER_RENDER_HEIGHT_M=1.9`)                                                                     |
| R2  | layer skin con boneInverses propri + corpo base che buca i vestiti | 🟡 corpo: clip head-only (la base dà la FACCIA, l'outfit il CORPO); resta lo skeleton condiviso per dita/piedi |
| R3  | armi/scudo pinnati con offset a mano, non sul grip/asse reale      | ⛔ scudo ancora storto                                                                                         |
| R4  | regola "cappuccio=nascondi testa" + outline che mangia gli occhi   | ✅ FATTO (facce visibili, base non più outlinata)                                                              |
| R5  | materiale/palette/post-FX forkati per ogni path; toon fangoso      | 🟡 personaggi+armi ora PBR + bordo team; arena ancora toon                                                     |
| R6  | font del menu MAI caricati (cade su Arial); CSS 5.5k righe         | ⛔ da fare                                                                                                     |

**MA** (chiarito dall'utente): il problema vero NON è solo aggiustare questi — vuole
**cambiare TUTTI gli asset principali** (mesh di personaggi, arena, armi, props, UI)
in **un unico stile coerente**. L'atmosfera è secondaria. Vedi §4 e §5.

## 4. Direzione artistica (BLOCCATA dai riferimenti dell'utente)

Riferimenti dati: **Mordhau, Chivalry 1/2, Mirage, Vermintide 1/2, Dark Messiah, Amid
Evil, Hexen, Heretic, Ziggurat, Lichdom, Avowed, Witchfire, Tainted Grail, Warlander,
Gunfire Reborn, Lunacid, Savage Resurrection.**

DNA comune = **dark, gritty, atmosferico, realistico-medievale-fantasy, prima persona,
melee + magia.** PBR realistico, desaturato, pietra cupa, torce. **NO** cartoon piatto
"tinteggiato" (KayKit/Quaternius/Synty-carino: l'utente li ODIA). Buona notizia: giochi
come Amid Evil/Hexen/Lunacid vivono di **luce+mood+materiali**, non di poligoni → il feel
è raggiungibile senza la fedeltà mesh di Mordhau.

## 5. IL PIANO

### 5A. Riparazione fondamenta (in corso) — vedi tabella §3. Quasi fatta; restano R3

(scudo) e R6 (font menu) e lo skeleton condiviso (R2).

### 5B. OVERHAUL TOTALE DEGLI ASSET (la richiesta vera)

**Sourcing DECISO**: tutto dalla libreria gratuita **`ASSET_GRAFICA`** (vedi §1.5),
standard **rig Mixamo**. Niente a pagamento. Sostituire TUTTA la grafica principale in
un unico stile **dark-gritty-realistico** (refs §4), scartando i pezzi cartoon.

**Manifesto asset (mappa categoria → fonte):**

- **Personaggi** (rig Mixamo, mont. clip dalle 204 anim):
  - Tank = `Knight_Met.glb` (pronto). Mago = `pbr_shadowkin_mage_rigged.glb` (rigged) o
    conformare `lightning_mage`. Ibrido = `shadowflame_samurai.glb` (conformare a Mixamo).
    Arciere = scegliere/conformare una skin Mixamo (o assemblato Quaternius solo se nulla di meglio).
  - Mob/boss = zombie (Mixamo), drago, Gwyn.
- **Arena/ambiente** = dungeon/props realistici (Fantasy Props MegaKit / dungeon realistico),
  illuminati dark+torce. NON KayKit cartoon.
- **Armi** = RPGWeapons_Free / staff realistici / archi. **VFX** = Kenney + additive.
  **Audio** = i 9 pack per elemento. **Icone/Menu** = `icone/` + ritratti classi.

**Esecuzione (ordine, senza lasciare il gioco metà-vecchio):**

1. Renderer bloccato su PBR realistico + illuminazione dark/torce (§ atmosfera — già impostata).
2. **Pipeline personaggio Mixamo**: caricatore single-GLB Mixamo + libreria 204 clip →
   sostituisce il sistema Frankenstein a layer. Tank=Knight come primo drop-in verificabile.
3. Arena/ambiente realistico al posto del coliseum toon.
4. Armi/props realistici. 5. VFX/audio per elemento. 6. HUD/menu + font.

Ogni fase: verificata con `/inspect.html` + `shot.mjs`. **Stato: da iniziare (Fase 2).**

## 6. LOG DECISIONI & FEEDBACK (cronologico — non perdere il contesto)

- **Regola**: niente branch, tutto su `main`. Niente modifiche a caso. Piano vivo, non si butta.
- L'utente vuole un gioco **tripla-A**, TUTTI gli asset cambiati, **stesso stile coerente**.
- **NO cartoon/tinteggiato** (KayKit scartato esplicitamente).
- **Atmosfera = secondaria**; la grafica principale (mesh/asset) è la priorità.
- Riferimenti = §4 (dark gritty realistico medievale-fantasy).
- Lamentela di metodo: smettere di ri-scoprire tutto e dimenticare → questo file +
  la memoria persistente sono la soluzione (vedi memoria `working-method-persistent-plan`).
- **SOLO asset gratis; TUTTO (tech + hosting) gratis.** Fonte asset = `E:/GIOCHI/ASSET_GRAFICA`
  (curata dall'utente, aggiornata spesso) — usare un asset solo se migliore dell'attuale.
- Confermato: NON esiste ecosistema gratis-coerente-realistico esterno → si usa la
  libreria dell'utente, rig Mixamo standard. Il realistico a pagamento (KitBash/Synty)
  è ESCLUSO dalla regola "solo gratis".
- ⚠️ DA REGISTRARE QUI: "le mille cose" (visione/gameplay/regole) che l'utente ha già
  detto nei mesi — §1.6 è ancora incompleta, va riempita con lui.
- **2026-06-11 — STILE DECISO E BLOCCATO.** Fine del ri-decidere lo stile a ogni sessione.
  Calcolato dai giochi di riferimento e **ancorato ai valori reali del codice** (scoperto: lo
  stile è già ~85% implementato in `main.ts`/`grade-pass.ts`/`arena.ts`). Spec completa con
  valori = **`STILE.md`** (palette hex, materiali PBR, luci, post, VFX, camera, HUD, gate).
  - **Decisione unica:** ~75% realistico (PBR materico desaturato, mondo grounded
    Mordhau/Vermintide/Darkfall) + **un solo strato iper-saturo: la magia element-coded additiva**
    (Mirage/Spellbreak) = l'unica cosa luminosa nel nero torch-lit. Fork ~55% toon-ramp = RIFIUTATO
    (l'utente odia il tinteggiato piatto).
  - **Valori confermati e bloccati** (non si ritoccano): hemisphere 0.4, key dir `#8893ad` 0.5,
    rim `#3c4768` 0.35, torce `#ff7521` 2.2/30, exposure ACES 1.1, GTAO 1.2, fog `#090a10` 0.038,
    FOV 90 / viewmodel 58, 5 hue elemento in `ELEMENT_COLOR`.
  - **Correzioni che ne derivano (TODO visivo, mio = value-tuning):** (1) grade saturation
    0.82→0.92; (2) togliere outline toon residui in `arena.ts`; (3) spell core emissive 3–5 +
    dynamic point-light per proiettile + trail 13fps; (4) dust motes torch-proximity + god-ray
    billboard economici.
- **2026-06-11 — ARENA convertita TOON → PBR (fatto, da rivedere live).** Scoperta: TUTTA l'arena
  (`world/arena.ts`: cover, shell colosseo, props, pavimento) era `MeshToonMaterial` + gradient toon
  - outline neri, e **scartava le texture normal/ORM** ("MeshToonMaterial doesn't use them") → mondo
    piatto/finto. = la causa concreta del "sembra cartone".
  * FATTO: tutti i materiali arena → `MeshStandardMaterial` (pietra/sabbia rough .9/.95 metal 0;
    props/torce mantengono il materiale PBR del GLB con normal+ORM riattivati); rimossi gradient toon
    e tutti gli `createOutlineMesh(...0x050508)`. grade saturation 0.82→0.92.
  * FATTO: aggiunto **environment map PMREM** (gradiente equirect dark on-palette) — senza IBL il PBR
    rende nero. Le luci erano tarate sul toon (che illumina gratis) → ri-bilanciate per il PBR reale.
  * CAUSA "niente luci" (feedback utente): le **torce erano `PointLight` intensità 2.2 con decay 2** =
    fisicamente debolissime (cadono come 1/d²), illuminavano ~1m; il centro arena (~16m) restava nero.
    Il toon lo mascherava. **Valori luce finali (verificati headless, forward+pavimento leggibili):**
    torce `0xff7521` **intensità 18** (era 2.2) range 30 decay 2; hemisphere `0x7c8cb2/0x4a3a24` **@2.0**
    (era `0x141820/0x05060a` @0.4); key dir `0x8893ad` **@1.0** (era 0.5); `environmentIntensity` **2.6**;
    fog `FogExp2` **0.015** (era 0.038). Risultato: colosseo arenaria caldo + pozze torce + ombre reali +
    cielo notte, dark ma leggibile, PBR (non più cartone).
  * DA FARE: l'utente guarda live (`http://localhost:5173`, ricarica) e conferma il livello luce; poi
    si committa. NON ancora su `main` (push = deploy prod). Allineare `STILE.md §3/§5` a questi valori.
- **2026-06-11 — STILE arena RIVISTO: "è un'arena, non un dungeon".** Feedback utente: era troppo scura.
  Rialzata e resa chiara/leggibile (verificato sulla GPU dell'utente via estensione Chrome): exposure 1.3,
  hemisphere `0x9aa6c8/0x6a5a3c` @3.4, key `0x9aa6c4` @1.7, torce intensità 18, env 3.0, fog 0.007. Lo
  STILE.md "dark dungeon" va corretto in "arena torch-lit chiara e leggibile" (mood gritty, NON cupo-buio).
- **2026-06-11 — STANZA TEST aggiunta (feature).** La 3ª difficoltà allenamento ("Maestro") è ora **"Stanza
  Test"** (`difficulty: 'test'`): spawna **4 dummy fermi, uno per ogni classe** (Tank/Arciere/Mago/Ibrido,
  preset+arma corretti), il player spawna **davanti** rivolto verso di loro, in arena con cover come elementi
  di test. File: `server/rooms/GameRoom.ts` (maxClients=5, botSpawnAtMatchStart=4, posizioni in fila + spawn
  player), `server/sim/BotController.ts` (`'test'` = input neutro fermo), `client/menu.ts` + `index.html`
  (pulsante "🧪 Stanza Test"). Verificato sulla GPU (4 dummy, player li guarda). Typecheck server+client OK.
  - POLISH da fare: badge "✈ AIR" appare per errore sui dummy fermi (sono a terra — falso positivo client su
    player perfettamente immobili); rifinire la fila/occlusione cover; valutare invuln/respawn dei dummy.
  - VERIFY: pipeline GPU = estensione Chrome `?capture=1` → JS clicca menu → screenshot CDP (funziona col
    preserveDrawingBuffer di `?capture`; senza va in timeout sul render-loop).
- **2026-06-11 — AUDIT TOTALE (8 dimensioni, multi-agente + verifica avversariale).** 65 candidati → 28
  "confermati". LEZIONE: l'audit ha **falsi positivi** (anche dopo la verifica) — ogni fix va ri-letto sul
  codice prima di applicarlo, altrimenti introduce regressioni.
  - APPLICATI (verificati a mano, sicuri): **[8]** ParrySystem — il ramo `else` di `release()` non bruciava
    stamina/CD su una race di 1 tick = parry gratis → ora addebita (no doppio-addebito). **[21]** tolto
    `passWithNoTests:true` da client+server vitest (cancello bugiardo; entrambi hanno test). Import-order
    auto-fix. STILE.md §3/§5 allineato ai valori luce nuovi (arena chiara).
  - FALSI POSITIVI (SKIP, motivo): **[0]** "onGround spingendo in su" — è l'atterraggio SOPRA le casse, il
    codice è giusto, il fix proposto romperebbe lo stare sulle coperture. **[11]–[15]** "luci troppo alte vs
    spec" — la mia illuminazione è richiesta dall'utente (arena, non dungeon), lo spec era vecchio. **[16]**
    "pulsante Master manda 'test'" — è la Stanza Test, intenzionale. **[19]** Life Drain `breakOnDamage` — è
    il mini-malus DOCUMENTATO (design). **[20]** fallback maxima — difensiva, scatta solo con classId invalido.
  - DA FARE (bug veri ma da verificare/valutare con cura, prossimi giri): **[9]** Fury Surge slow applicato
    prima del parry (leak); **[27]** doppi `Math.round` sul danno (precisione); **[5]** bow M1 a costo 0 (se
    sono davvero M1, aggiungere stamina); **[1]/[4]** codice morto knockup in `drainDamage` (valutare se
    cablarlo o rimuoverlo); **[2]** `clamp` NaN→0 (rischioso, valutare); **[22]–[26]** scrivere i test mancanti
    (MeleeSystem/ParrySystem/ClassMechanic/Zone/Projectile) — da fare con un workflow dedicato.
  - Lista completa difetti (confermati + 36 medium/low) nel task output dell'audit `wbxpn7b7i`.
- **2026-06-12 — STANZA TEST completata (rifatta da zero su richiesta).** Iter: side-by-side → a terra non
  sulle casse → mappa vuota + fila davanti → fermi immobili → distanti. Stato finale: mappa dedicata
  **`test_room` VUOTA** (0 casse); **4 dummy una per classe, fermi immobili** (BotController: nessun input),
  in **fila a terra distanziata 4 m** (x = -6/-2/2/6, z=0), **davanti al player** (z=8) e rivolti verso di lui.
  - LEZIONE chiave: la disposizione va applicata in **TUTTI e 3** i punti di posizionamento —
    `spawnBot` (spawn iniziale), `onJoin` (player), e **`respawn`** (chiamato da `resetAllPlayersForRound`
    a inizio round, usava lo spawn unico → impilava tutti). Mancava il respawn = bug "tutti nello stesso punto".
  - Bloccato da `rooms/test-room.test.ts` (regressione impossibile). Verifica = **logica + log server**, NON
    screenshot (il gioco va in pausa senza pointer-lock → l'headless cattura il menu di pausa).
- **2026-06-12 — Commit pushati su `main` (prod) questa sessione:** arena PBR+luce, Stanza Test, fix parry,
  `passWithNoTests` tolto, estrazioni god-file, **+80 test** sistemi critici, redo Stanza Test (mappa vuota +
  dummy fermi/distanti/respawn-fix) + test che la blocca. Gate verde a ogni push.
  - PROSSIMI (coda, in ordine di valore, da fare con l'utente che guarda dal vivo): VFX magie "pop" (STILE §7);
    bug visibili R6 font / R3 scudo; refactor combat rimandati [9]/[27]; dust-motes + god-ray (STILE §5).

- **2026-06-12 — PIANO ATTIVO #1, STEP 1 «ANALISI» FATTA (code-grounded, 4 agenti).** Scoperta chiave:
  il gioco **spedisce ANCORA gli asset cartoon che l'utente odia** — il manifesto §5B (Knight/Mixamo
  realistico) è la DIREZIONE, non la realtà. Stato reale degli asset on-disk:
  - **PERSONAGGI = Quaternius modular "frankenstein"** (`character-loader.ts`): base `Superhero_Male/Female_FullBody`
    - outfit `Male/Female_Ranger|Peasant` + capelli, ri-bindati su 1 scheletro condiviso. Le 4 classi = solo
      maschio/femmina × Ranger/Peasant → **poco distinte, look cartoon**. NIENTE Knight_Met/Mixamo nel gioco
      (le 204 anim girano via `UAL1_Standard.glb`, non i clip Mixamo). R2 vivo: dita/piedi su skeleton condiviso.
      Materiale forzato a `MeshStandardMaterial` rough .72/metal .05 hardcoded (scarta rough/metal sorgente).
  - **ARMI = KayKit** (`/weapons/kaykit/sword|bow|staff|shield_A.glb`) = il pacchetto cartoon **esplicitamente
    odiato**. Grip = offset a mano per classe (no socket reale). Scudo: in realtà RADDRIZZATO (non più storto).
    FP: solo l'arco ha braccia vere (`animated_fps_bow.glb`); spada=3ª persona, staff=viewmodel statico (no braccia).
  - **OUTLINE toon team-color** ancora su personaggi (0.008) E armi (0.01) — contraddice STILE.md (rim, non ink).
  - **VFX** (`projectile-visuals.ts`): core = 2 plane incrociati `MeshBasicMaterial` additivo + trail 10pt + impact
    a 3 layer + bloom selettivo. **MANCA la dynamic point-light per proiettile** (la magia non illumina la pietra).
  - **MENU/HUD**: `game-ui.css` = **5.563 righe monolitiche**; **R6 confermato** — `Inter`/`Rajdhani` dichiarati
    ma **0 @font-face / 0 link** → cade su Arial. UI = "esports dark generico", non gotico-materico. Asset UI già
    presenti: logo, `frame_but.webp`, `sfondo.webp`, ritratti classi.
  - **CONCLUSIONE**: «fatto = solo arena (PBR+luce)» confermato. Tutto il resto è ancora il vecchio cartoon.
    Step 2 = decidere INSIEME UNA via di stile (sotto). Dettaglio completo file:riga nei task-output dei 4 agenti.

- **2026-06-12 — PROVA CONCRETA resa all'utente (dopo forte feedback: niente più astratto, solo render veri).**
  L'utente si è infuriato sulle proposte astratte (descrizioni + schemi SVG) e sul fatto che la Stanza Test
  mostra 4 classi che SEMBRANO UGUALI (perché oggi sono lo stesso modular-cartone). Risposta data = render VERI:
  - Renderizzato `Knight_Met.glb` (Tank) in-engine via inspector **RAW mode** (`?raw=`, lanciato da PowerShell
    perché Git Bash storpia il leading slash). Look realistico confermato. Schiarite le luci dell'inspector
    (`src/inspect.ts`: hemi 2.3/key 2.7/rim 1.1 + fill) perché l'armatura scura era illeggibile.
  - Creato **harness "lineup"** (`packages/client/lineup.html` + `src/lineup.ts` + `tools/verify/lineup.mjs`):
    carica N GLB affiancati, normalizza altezza 1.9m, `?models=` e `?yaws=` per-modello. Reso un'immagine con
    **4 candidati DISTINTI** dalla libreria: Tank=`Knight_Met`, Arciere=`armored_guard_knight_rig` (provvisorio),
    Mago=`pbr_shadowkin_mage_rigged`, Ibrido=`shadowflame_samurai`. = prova che 4 classi distinte realistiche
    sono fattibili col free esistente. (`.verify/lineup.png` mostrato all'utente.)
  - GLB copiati in `packages/client/public/characters/` (worktree). Deps installate nella worktree (pnpm store
    caldo, 6s); `@ragequit/shared` buildato; dev server inspector su :5174.
  - STATO: in attesa OK utente su assegnazione classe→modello. Prossimo: integrare Tank=Knight in-game (single-GLB
    Mixamo loader, 14 anim pronte) come primo drop-in verificabile; gli altri 3 = conformare anim a Mixamo (lavoro vero).
  - ⚠️ NOTA repo: il working tree del repo PRINCIPALE `E:/GIOCHI/RAGEQUIT` è sul branch vecchio
    `feat/first-person-viewmodels` (no inspector/harness) → si lavora nella worktree `eloquent-robinson-6bdcc4`.

- **2026-06-12 — VETTING LIBRERIA (richiesto dall'utente) + tentativo integrazione Tank=Knight (BLOCCATO).**
  Feedback utente: «hai controllato che gli asset possano usare TUTTE le animazioni?». Giusto → fatto vetting
  data-driven di **tutta** la libreria personaggi con `tools/verify/vet-rigs.mjs` (legge scheletro+anim di ogni
  GLB via @gltf-transform). **ROSTER reale:**
  - **Mixamo-ready (drop-in, usano le 204 anim) = SOLO `Knight_Met` (Tank, 14 anim)** + `zombie` (mob).
  - NON-Mixamo (servono conform/retarget, NON usabili as-is): `armored_guard` (rig custom, 1 anim),
    `pbr_shadowkin_mage` (rig Character Creator, 0 anim reali), `shadowflame_samurai` (rig Reallusion, 0 anim),
    `lightning_mage` (NESSUN rig). Quindi: per arciere/mago/ibrido **non esiste drop-in gratis** in libreria →
    vanno scaricati Mixamo-ready o conformati via Mixamo (passo dell'utente).
  - **Integrazione Tank=Knight TENTATA e BLOCCATA.** Aggiunto campo `mixamoGlb` a `ClassVisualDefinition`
    (shared) + percorso "GLB singolo Mixamo" nel loader (`buildCharacterModel`) + branch in
    `_installCharacterModel` (tiene materiali PBR, niente head-clip, nasconde spada/scudo interni, mappa i 14
    clip). **BUG bloccante:** `Knight_Met` è autorato a **scala 1/100 dentro un nodo `knight`** (mesh in cm).
    In RAW (scene.add diretto) rende perfetto, ma appena la pipeline del gioco **scala/sposta** il modello, lo
    **skinning 'attached' di three.js collassa la mesh del corpo** (le ossa restano giuste → le armi su osso si
    vedono, il corpo no). Diagnosi certa (flag mesh tutti ok: visible/colorWrite/layers; worldScale 0.01).
    Provati: bone-box scale, no-scale, re-bind, no-clone → tutti falliti. **FIX corretto = normalizzare il GLB
    a 1:1 offline** (bake della scala 0.01 in geometria+skeleton+inverseBindMatrices), poi ri-abilitare.
  - **STABILIZZATO:** `mixamoGlb` del Tank **commentato** → il gioco torna al Tank modular funzionante (niente
    Tank invisibile). Codice/scaffolding del percorso single-GLB restano (typecheck verde). Harness `vet-rigs.mjs`
    - `lineup.*` tenuti (utili). GLB realistici copiati in `public/characters/` (servono al lineup).
  - **PROSSIMO PASSO concreto:** normalizzare `Knight_Met.glb` (e futuri Mixamo) a scala 1:1 → un task focalizzato;
    poi il Tank=Knight entra in-game verificabile. LEZIONE: i Mixamo-export a 0.01 vanno normalizzati prima di entrare nella pipeline.
  - **AGGIORNAMENTO — scala RISOLTA, ma 2° bug più profondo.** Creato `tools/verify/normalize-glb.mjs` (bake della
    scala 0.01 in geometria+ossa+inverseBindMatrices+anim) → `Knight_Met_norm.glb` **rende PERFETTO in RAW** (scala
    ok). MA nella pipeline install il corpo **ancora non si disegna**: questo rig salva la **mesh "collassata"**
    (225 verti ~in un punto, rest-pose piatto) e si vede SOLO quando lo skinning la espande con un'animazione. In
    RAW (mixer sull'idle) si espande; nella pipeline le ossa SI posano (spine a Y 0.256, idle running) ma il corpo
    skinnato resta collassato → invisibile. Escluso a uno a uno: scala/clone/posizione/mixer/attacco-armi → nessuno
    è il colpevole. È un edge-case three.js skinning di QUESTO rig vs `_installCharacterModel`.
  - **DECISIONE/PROSSIMO:** non forzare più il Knight nella pipeline modulare. La via che FUNZIONERÀ = **render path
    DEDICATO per i personaggi single-GLB** che replica il RAW (che rende perfetto): add modello + mixer su clip
    originali + scala-altezza + grip, SENZA il sistema head-clip/layer/material-fork dei cartoon. (Oppure asset
    autorato pulito 1:1.) Strumenti tenuti: `vet-rigs.mjs`, `normalize-glb.mjs`, `lineup.*`. Tank torna modular (ok).
  - **CONCLUSIONE FINALE (dopo render-path dedicato + analisi del file).** Costruito `_installSingleGlbModel`
    (path dedicato, no head-clip/layer/material-fork). NON basta. **Causa-radice provata dai dati del file:** la
    mesh del corpo è autorata **COLLASSATA** (POSITION del corpo = lastra piatta X0.3×**Y0.09**×Z1.0 a Y~1.4): il
    corpo NON ha un bind-pose vero, si forma SOLO via skinning animato. Le mesh a **osso singolo** (spada/scudo)
    rendono; il corpo **multi-osso** collassa nella pipeline (test rosso: solo le armi diventano rosse). Nel RAW
    rende perché l'idle deforma ≈ posa in piedi. Isolati TUTTI: scala/clone/posizione/mixer/clip-clone/traslazione/
    bind attached+detached → nessuno risolve. **= export ROTTO di questo specifico GLB** (bind-pose collassato).
    **VERDETTO:** serve un personaggio **autorato pulito** (rest-mesh vera T-pose, 1:1). Scaffolding `mixamoGlb`+
    dedicato lasciato in codice ma DISABILITATO. `Knight_Met_norm.glb` (scala 1:1, rende perfetto STANDALONE) tenuto.

- **2026-06-12 — SVOLTA: LA PIPELINE È SANA, il Knight era solo ROTTO. Personaggi realistici RENDONO in-game.**
  Test con asset PULITI via il path dedicato `_installSingleGlbModel` + `normalize-glb.mjs`:
  - **`Soldier.glb`** (three.js, rig Mixamo pulito, mesh vera, 4 anim, scaricato da GitHub raw) → **RENDE E SI
    ANIMA** nel motore vero (corpo multi-osso intero, posa di cammino). = la pipeline funziona con asset sani;
    il Knight era difettoso (mesh collassata), non la pipeline.
  - **`medieval_knight.glb`** (dalla libreria, `tank/Pack _warrior _free/`, rig Tripo 40 ossa, mesh vera) →
    **RENDE PERFETTO**: cavaliere a piastre nere + mantello + occhi rossi = lo stile dark che l'utente vuole.
    MA le sue "4 anim" sono **pose statiche da 1 frame** (NlaTrack, dur 0.04s) → niente vere animazioni → T-pose.
  - **Aggiunto** in `_mapMixamoClips` un fallback by-index per clip a nomi generici (NlaTrack) — non basta qui
    perché le clip sono pose statiche, ma serve per char con clip vere a nomi non-standard.
  - **STRATEGIA NUOVA (la via vincente):** i modelli realistici dell'utente RENDONO; manca solo animarli. Soluzione
    generale = **retarget della libreria animazioni Mixamo (le 14 clip del Knight, o le 204 FBX) sui rig realistici**.
    Mappatura ossa medieval→Mixamo **PULITA e verificata** (Hip→Hips, Spine01→Spine, L*Thigh→LeftUpLeg, L_Calf→LeftLeg,
    L_Upperarm→LeftArm, L_Forearm→LeftForeArm, L_Hand→LeftHand, idem R*\*; i Twist senza equivalente restano a riposo).
    Entrambi bipedi standard → `THREE SkeletonUtils.retargetClip` fattibile. Questo sblocca 4 classi realistiche
    animate dai modelli che l'utente HA GIÀ (medieval_knight, samurai, mage…).
  - **PROSSIMO:** costruire il retargeting (runtime nel loader o bake offline) → animare il medieval_knight col Mixamo,
    poi estendere a samurai/mage per le 4 classi. Asset tenuti: `Soldier.glb/_norm`, `medieval_knight.glb`.

- **2026-06-12 — ✅ SBLOCCO: 4 CLASSI DISTINTE, 3 REALISTICHE ANIMATE — meccanismo "CC-direct" (LA soluzione).**
  Il retargeting Mixamo↔rig-diversi resta garbled (provati world-delta E local-delta: ribalta/garbuglia — rest-pose
  troppo diversi). LA VIA GIUSTA scoperta: **applicazione DIRETTA di clip della stessa famiglia di rig** — zero
  retargeting, solo rimappa dei nomi:
  - La libreria ha `MageCollectionSamplesFree/CharacterCreator/*_CC.fbx` (6 clip mago) con ossa **`CC_Base_*`** =
    STESSO scheletro del `pbr_shadowkin_mage` e del `shadowflame_samurai` (rig CC). E il `medieval_knight` (Tripo)
    usa gli **stessi nomi senza prefisso** (`Hip`, `L_Thigh`…) → le stesse clip valgono anche per lui.
  - **Implementato in `character-loader.ts`:** `ccAnims` per classe (in `classes.ts` visuals) + `_loadFbxClip`
    (FBXLoader, cache) + `_remapClipToModel` — tiene SOLO tracce `.quaternion`, rimappa per **suffisso numerico**
    (`CC_Base_Hip` ↔ `CC_Base_Hip_03`, i GLB dedupano i nomi) e per **prefisso** (`CC_Base_Hip` ↔ `Hip`), e
    **SCARTA la traccia del root** (`boneroot|^root$|_rootjoint`): porta la convenzione Z-up dell'FBX e sdraiava
    il modello di 90° (questo era il bug-chiave).
  - **STATO CLASSI (verificato in-engine, montage mostrato all'utente):** Tank=`medieval_knight` (bestione piastre
    nere+mantello) · Mago=`shadowkin_mage_norm` (stregone mascherato) · Ibrido=`shadowflame_samurai_norm` (samurai
    rosso-oro) — tutti REALISTICI e ANIMATI (clip CC dirette). Arciere=modulare (ranger verde incappucciato, completo).
    Tutti normalizzati 1:1 con `normalize-glb.mjs` (i GLB-da-FBX hanno il nodo 0.01).
  - **RIFINITURE da fare:** (1) le 6 clip CC sono "da mago" (cast/powerup) → mancano locomotion/death per i 3
    realistici (gli stati fanno fallback su idle; serve trovare clip CC di run/walk/morte free); (2) grip armi
    per-rig (lo staff fluttua sulle mani del mago, lame doppie sul tank scuro); (3) tank troppo scuro (materiale/luce);
    (4) arciere realistico (l'`armored_guard` ha nomi ossa simil-CC parziali — candidato). Lineup/inspect = harness di verifica.

- **2026-06-12 — RUN AUTONOMO "analizza→trova→correggi" (richiesto dall'utente). GATE PIENO VERDE.**
  1. **Gate completo** (`pnpm check`): trovati e corretti lint (`prefer-const` in lineup.ts) + format (2 file).
     Tutti i test passano: **203 server + 41 client**.
  2. **Asset de-bloat**: rimossi i GLB duplicati/inutilizzati (−92MB: Knight_Met raw, Soldier raw+norm, guard,
     mage/samurai raw). Compressi i vivi con gltf-transform: `medieval_knight` **37→24.6MB** (weld+quantize,
     niente texture: è vertex-color), `samurai` **27→6MB** e `mago` **8.9→1.9MB** (texture→WebP).
     `public/characters` 135→95MB. Render verificati identici dopo compressione.
  3. **Grip armi (single-GLB)**: il path dedicato non attaccava l'arma → ora aggancia il `weaponGroup` alla
     mano destra con match fuzzy dei nomi CC/Tripo/Mixamo (`CC_Base_R_Hand_xx`/`R_Hand`/`RightHand`), spada
     verticale a riposo. **Bestione schiarito** (`GLB_BRIGHTNESS` ×1.55 sui vertex-color, ora leggibile).
  4. **R6 RISOLTO (font menu)**: scaricati e self-hostati `Inter` (variabile) + `Rajdhani` 500/600/700 woff2
     (~95KB, `public/fonts/`) + @font-face in `game-ui.css`. **Verificato via `document.fonts`** nel browser
     headless: Inter e Rajdhani ora CARICANO (prima cadeva tutto su Arial).
  5. **Bug combat [27] RISOLTO**: il danno passava per 4 `Math.round` in cascata (curse→fury→surge→flow,
     drift cumulativo) → ora moltiplicatori in float e UN solo round. **Estratto** in
     `server/src/sim/damage-modifiers.ts` (`applyOutgoingDamageModifiers`) anche per rientrare nel file-budget
     di GameRoom (1960→sotto il tetto 1956). Test invariati e verdi.
  6. Gate finale: **tutto verde** (typecheck, budget, assets, lint, format, content, test).

- **2026-06-12 — RUN "finisci il gioco" (piena libertà). Verifica IN-MATCH + point-light spell + ship su main.**
  1. **Verificato IN PARTITA** (shot.mjs, server worktree su :2567 — ucciso un server orfano di una worktree
     vecchia che occupava la porta): match come tank e come mage, coverage 75–81%, **zero page errors**.
     Registrati i materiali reali dei single-GLB in `userData.glbMaterials` → i flash di stato (hp pulse/
     shield/damage blink) funzionano anche sui personaggi realistici.
  2. **STILE §7 layer 5 FATTO**: **dynamic PointLight per proiettile spell** (`projectile-visuals.ts`) — hue
     dall'elemento, intensità 7/range 7/decay 2, pool max 6 concorrenti (budget), niente luce sulle frecce.
     La magia ora illumina la pietra. Test client verdi.
  3. **Pulizia finale**: rimosso TUTTO il codice morto del retargeting cross-rig (3 funzioni + dizionario) con
     un commento-guardia «non reintrodurre»; rimosso `Knight_Met_norm.glb` (−9.4MB, era solo del path morto).
     Aggiunto `tools/verify/animshot.mjs` (verifica clip forzate: `&anim=run|death|attack` in inspect.html).
  4. **CONFERMA cross-rig = vicolo cieco** (test visivo): anche l'applicazione diretta Mixamo→CC via dizionario
     capitomba il corpo. Le anim si trasferiscono SOLO nella stessa famiglia di rig. **Locomotion dei 3
     realistici = BLOCCATA su clip CC** (ActorCore ne ha 32 gratis ma serve account/browser → unico passo
     dell'utente); nel frattempo corsa/morte fanno fallback su Idle (coerente, non rotto).
  5. Gate pieno verde → **commit + push su `main` (= deploy prod)**.

- **2026-06-12 — ROUND 2 (feedback utente: scudo storto · mappe da rifare · QoL "sembra primitivo").**
  1. **SCUDO/BRACCIO RISOLTO.** Cause trovate coi dati (diag Playwright su `__inspectChar`): (a) `findBone`
     non conosceva i nomi CC/Tripo → sui realistici lo scudo finiva sul fallback e il MODELLO single-GLB non
     chiamava mai `applyShieldProp` → gruppo scudo VUOTO (meshCount 0); (b) posa-parata additiva troppo
     estrema (braccio slogato); (c) scala scudo doppia sui realistici (model scale ~1.0 vs ~0.66 modulare).
     FIX: **fuzzy bone-match canonico** in `findBone` (`_canonBone`: side+part, gestisce `CC_Base_L_Hand_31`/
     `L_Hand`/`mixamorig:LeftHand`); `applyShieldProp` nel path single-GLB; costanti parata ammorbidite
     (Z −0.8, X 0.42, gomito 0.95); scala scudo ×0.45 sui single-GLB. Verificato: knight para con scudo al
     braccio, archer in guardia plausibile.
  2. **MAPPE RIFATTE (level-design vero, principi arena-PvP).** `duel_arena` = "Court of Pillars": slab
     centrale bassa vault-abile, 2 pilastri-orbita grassi E/W (melee dance), corsie z=±5 interrotte da
     pilastri snelli (no shooting-gallery per gli archi), L-wall di protezione a ogni spawn, 2 power-flank
     rialzati con step (rischio/ricompensa). `gladiators_arena` = "Ruined Bastion": keep centrale con DUE
     approcci a gradini (la power position si conquista), rovine a taglie/posizioni irregolari (simmetria
     180°, niente effetto-griglia), muri sfalsati off-cardinal, pocket-crate fra le zone, piattaforme angolo
     ad altezze diverse (2.6/3.4 in coppie diagonali). Validator + 203 test server verdi; verificato in-match
     (muro-spawn in muratura visibile davanti al giocatore).
  3. **QoL AUDIO (il gap vero del "primitivo"):** il gioco aveva GIÀ popup-danno/hitmarker/kill-feed/20+ SFX
     procedurali (audit fatto) — mancavano **passi** e **ambiente**. Nuovo `audio/ambience.ts`: footstep
     stride-driven (uno scuff ogni ~2.1 m a terra, pitch variato, guard anti-teleport) + **wind-bed loop**
     procedurale con swell lento (brown noise + LFO), zero file, dentro il master gain (volume/mute ok).
     Spostati lì anche `playSwap`/`playStatus` (estrazione per il file-budget di sound-engine/main).
  4. Gate pieno verde (244 test) → commit + push su `main`.
     ⛔ REGOLA dall'utente: **NON inventare i dettagli da solo, si decide INSIEME.** Le scelte di
     STILE e ASSET sono **sue**; io faccio analisi, propongo, eseguo. (Questo è il piano che mi ha
     scritto «20 volte»; ora è registrato — non va più ridetto.)
     **Obiettivo:** rifare **TUTTA** la grafica in **UNO stile coerente** — personaggi, arena, armi,
     braccia, props, VFX, HUD **e i MENU**. La camera/atmosfera è secondaria: il problema è mesh/asset/UI.
     **PROCESSO (la prossima sessione esegue QUESTO, in ordine, con l'utente che decide):**
  5. **ANALISI** completa della grafica attuale + di cosa è rotto (skin tutte uguali = frankenstein a
     layer; armi girate/scudo storto = grip a mano; braccia FP a caso; font menu su Arila; VFX piatte).
  6. **DECIDERE INSIEME LO STILE per TUTTO il gioco** (mondo 3D **e** menu/HUD) — **UNA via sola**.
     `STILE.md` esiste ma copre il 3D e l'ho deciso io → va **ri-validato con l'utente** ed esteso a
     menu/UI. Proporgli 2-3 vie concrete (con riferimenti), **lui sceglie UNA**.
  7. **STUDIARE `E:/GIOCHI/ASSET_GRAFICA` a fondo** (ha `_INVENTARIO.md`): elencare **SOLO** ciò che è
     **davvero utile e funzionale** allo stile scelto; scartare il resto (incluso il cartoon che odia).
  8. **SCARICARE il mancante FREE** online (Sketchfab/Quaternius/Mixamo/Poly Haven/ambientCG/font CC0).
  9. **INTEGRARE tutto coerente**, verificando (log+logica + l'utente guarda dal vivo).
     **REGOLE DURE:** solo asset/tech/hosting **GRATIS**; rig **Mixamo**; **gioco completo, niente tagli**;
     valori numerici = compito MIO; **scelte di stile/asset = decise dall'UTENTE**.
     **AREE da sistemare** (lo scope; i dettagli si fissano ai punti 2-3 con l'utente): personaggi/skin
     (4 classi DISTINTE, oggi frankenstein in `render/character-loader.ts`) · armi+grip (R3) · braccia 1ª
     persona · spell/VFX (`render/projectile-visuals.ts`) · menu/HUD/font (`menu.ts`,`public/game-ui.css`,`hud/*`).
     **FATTO finora:** SOLO arena (PBR+luce). Tutto il resto è da fare con questo processo, deciso con lui.

## 7. Metodo di lavoro (professionale)

1. Leggere QUESTO file all'inizio. 2. Lavorare le fasi del piano in ordine, niente sparse.
2. Verificare headless ogni cambio visibile. 4. Gate verde prima di ogni commit su `main`.
3. Aggiornare questo file + il log a ogni cambiamento/feedback. 6. Sul feedback dell'utente:
   **modificare** il piano qui, non ricominciare.
