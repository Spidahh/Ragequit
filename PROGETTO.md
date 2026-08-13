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

- **2026-06-12 — ROUND 3 (feedback live: «errori ovunque, modelli che non si muovono, posizionati male»).**
  CAUSA #0 del feedback precedente «tutto uguale»: l'utente giocava su **:5173 servito da una WORKTREE VECCHIA**
  (dazzling-lumiere) e il repo principale era sul branch superato → ora :5173 = client NUOVO di questa worktree,
  repo principale allineato a `origin/main` (file sciolti salvati in `.backup-untracked/`). LEZIONE: prima di
  qualsiasi verifica utente, controllare COSA serve la sua porta.
  1. **REVERT personaggi realistici dal gameplay** (decisione di completezza): le clip CC free sono solo cast →
     in partita i 3 realistici SCIVOLANO senza animazione di corsa/morte = ingiocabili («modelli che non si
     muovono»). `mixamoGlb`/`ccAnims` COMMENTATI per tank/mage/hybrid → il gioco torna ai 4 modulari COMPLETI
     (tutte le anim) e distinti (CLASS_BUILD breadth+tinte). Le 4 classi realistiche tornano quando ci saranno
     clip CC di locomotion (ActorCore free, serve account utente). Tutto il codice/asset resta pronto.
  2. **AUDIT sistematico** (8 idle class×weapon + run/attack/death forzati con animshot) → 2 bug VERI trovati:
     - **DECAPITAZIONE in pose basse** (corsa china, morte a terra): il piano head-clip era ad ALTEZZA FISSA →
       la testa scendeva sotto e spariva. FIX in 2 passi: (a) il piano segue l'OSSO della testa (`headBone` in
       userData); (b) segue anche l'ORIENTAMENTO (normale = asse-Y dell'osso, `setFromNormalAndCoplanarPoint`)
       perché da sdraiati il piano orizzontale non tagliava più nulla e la pelle base bucava i vestiti.
       Verificato: corsa con viso ✓, morte con viso e vestiti puliti ✓.
     - **STAFF "da lancia"**: grip orizzontale all'indietro → da davanti un moncone all'anca. FIX: rotazione
       verticale (come la spada) + scala 0.46/0.42→0.56/0.52 su tutte le classi. (Tentata inclinazione extra:
       peggio, revertita — il diagonale a tutta lunghezza è il meglio del KayKit staff.)
  3. Verificato in-match su :5173 (bot in affondo animato, 0 errori). Gate verde → ship su main.

- **2026-06-12 — ROUND 4 (feedback: arena piccola/fatta male · anim non partono sempre · scudo/braccio ·
  arco storto · «si blocca tutto») — METODO NUOVO: sonda interattiva, non più screenshot statici.**
  Costruito `tools/verify/probe.mjs`: GIOCA davvero ~25 s (corre, mira, attacca, riattacca, abilità, Tab-swap,
  parata, salto) registrando errori console, **rAF-gap >150 ms** (rilevatore "si blocca") e **conteggio
  programmi shader** (`__renderer` esposto). Risultati e fix:
  1. **FREEZE = compilazione shader in-fight (2 cause, 2 fix).** (a) Le PointLight dei proiettili venivano
     aggiunte/rimosse a runtime → ogni spawn cambiava il light-count e three ricompilava TUTTI gli shader.
     → **pool FISSO di 6 luci sempre in scena** (intensity 0 da ferme, acquire/release, posizione sincronizzata
     al proiettile). (b) Materiali di proiettili/trail/impatti compilavano alla PRIMA magia → **warm-up**: un
     proiettile per elemento + un impatto permanenti a y=−120 → compilano nel load. + `render/shader-warmup.ts`:
     `renderer.compile` del pass viewmodel a 4/12/22/35 s (copre i GLB che arrivano al join). Probe: programmi
     stabili durante il play (53→55 prima del tuning sweep).
  2. **ANIM CHE NON RIPARTONO**: `_crossfade` usciva se `current===next` → due colpi IDENTICI consecutivi
     (arco→arco, staff→staff) non ri-triggeravano la clip (restava clampata sull'ultimo frame). FIX: se il
     one-shot richiesto è già current ma l'azione è FINITA → `reset()+play()` (Death escluso).
  3. **SCUDO**: ancorato all'**AVAMBRACCIO** (lowerarm_l) invece che alla mano — la mano ruota a ogni
     micro-movimento e lo scudo "ballava" anche da idle. Posizionamento metà-avambraccio, guardia verificata.
  4. **ARCO FPV storto/enorme** (riempiva mezzo schermo di traverso — confermato a screenshot): riposizionato
     `VM_POSITION (0.02,-0.44,-0.5)` scala 0.26→**0.2** → basso-sinistra, freccia verso il mirino.
  5. **ARENA ×1.5**: `ARENA_SHELL_SCALE = 1.5` (conchiglia GLB, sabbia, offset-y del pavimento, anello torce
     scalano insieme — il pit passa da r≈16.7 a r≈25); layout mappe ALLARGATI (centri ×1.3 duel / ×1.45 FFA
     via `dbox`/`gbox`, le misure dei blocchi restano), spawn fuori (±14.3 duel, ±23 FFA). Verificata in-match:
     campo visibilmente ampio. Gate verde (244 test) → ship.

- **2026-06-13 — ROUND 5 (l'utente: «vai nella STANZA TEST e controlla, armi dei nemici messe male»).**
  METODO NUOVO ancora: `tools/verify/testroom.mjs` — entra nella Stanza Test (il banco di prova dell'utente),
  aspetta il load dei GLB (12 s — al primo scatto i dummy erano ancora placeholder dorati!), fotografa la fila,
  **zooma su ogni dummy** (sharp crop) e DIAGNOSTICA via `__remotes` (genitore/posizione di weaponGroup e
  shieldGroup per ogni remoto). Trovati e risolti:
  1. **SCUDO dei remoti "pannello fluttuante"**: ancorato sì all'avambraccio, ma ruotato con la faccia larga
     avanti/dietro (di profilo = lastra sospesa) e scostato dal braccio. FIX: yaw **−90°** (faccia borchiata in
     FUORI lungo il braccio — prima prova a +90° mostrava il RETRO con la maniglia), stretto al braccio
     (pos −0.02/0.10/0). Verificato a zoom: buckler da braccio vero, fronte visibile.
  2. **STENDARDI A MEZZ'ARIA**: l'anello bandiere era a raggio FISSO 21 (muro vecchio) e quota 4.5 — con la
     conchiglia ×1.5 il muro è a ~31 → bandiere appese al nulla dentro il pit. FIX: `BANNER_RING_R` e quota
     scalano con `ARENA_SHELL_SCALE`. LEZIONE GENERALE: OGNI decorazione a raggio/quota fissa va legata alla
     scala della conchiglia (torce ✓, bandiere ✓ — controllare eventuali future).
  3. Diagnostica remoti: arma in `hand_r` ✓ per tutte le classi; scudo visibile solo per sword ✓.
     Stanza Test finale: dummy armati corretti, bandiere sui muri, niente oggetti volanti. Gate verde → ship.

- **2026-06-13 — AUDIT PROFESSIONALE COMPLETO (richiesta utente: «trova ogni errore/logica fatta male,
  soprattutto le armi»).** Workflow multi-agente: 8 finder paralleli (doppia lente sulle armi) + verifica
  AVVERSARIALE che ri-legge il codice reale per ogni finding → **37 confermati, 16 falsi positivi scartati**
  (il verificatore ha retto: i 16 erano scelte di stile/codice morto irraggiungibile/premesse sbagliate).
  Dedup: ~30 unici (GLB morti segnalati 5×, outline FPV 4×). **Batch SICURO applicato + committato sul
  branch worktree (NON pushato su main = deploy prod; decide l'utente). Gate verde, 341 test.**
  - **Sicurezza server:** loadoutSet senza cap sulle array client = DoS event-loop (milioni di stringhe
    vuote) → cap; handler heartbeat era l'unico non rate-limitato → gate+finite-guard; swing.atTick non
    validato finite → poteva disattivare la lag-comp (NaN→posizione live).
  - **Correttezza combat:** [#9 del backlog] parata PERFETTA (tap) consumava Fury Surge/Flow e applicava
    lo slow anche a colpo bloccato → ora `fullyBlocked` salta i modificatori consumanti; dash/knockback
    usavano il raggio hitbox-proiettili 0.65 invece del footprint 0.4 → dash si fermava prima dei muri
    raggiungibili a piedi; ELO assegnato su pareggio (bestWins=-1) → guard sul lead stretto; matchmaking
    `filterBy(['mode','difficulty'])` (difficoltà training non più mischiate); rimosso codice morto
    (blocco knockup PendingDamage mai vero; fallback effectMove che attraversava i muri); path m2-parry
    ristretto ai SOLI bot (gli umani lo doppiavano → AbilityFailed/tapStart fantasma).
  - **Armi/scudo render (client):** outline del viewmodel FPV staff/spada era un NO-OP (`outline.parent`
    null) + leak geometria → ora aggancia al parent della mesh sorgente; grip arma applicato solo dopo il
    re-parent sull'osso mano (niente arma minuscola all'origine se il GLB arma arriva prima del modello);
    scudo con guard anti-race (re-selezione rapida impilava 2 scudi); parata HOLD ora mostra la posa
    sostenuta anche sui remoti.
  - **Riconnessione:** ora rigioca il mode UI originale → la difficoltà training sopravvive.
  - **De-bloat deploy (~79MB OFF dal bundle spedito):** GLB realistici disabilitati + FBX anim CC spostati
    FUORI da `public/` in `packages/client/character-sources/` (preservati per il re-enable, non più
    spediti); 6 texture trim arena orfane 2048px (~16MB) eliminate; `.clinerules` (7MB) scollegato+gitignore;
    `check:assets` ora segnala le immagini orfane nei prop-bundle (chiuso il buco del gate "bugiardo");
    corretto il commento falso "kept in sync" sul raggio capsule. Verificato: `dist/characters` = solo
    `UAL1_Standard.glb`, trim assenti. `vite build` ok.
  - **DA DECIDERE CON L'UTENTE (non toccato — scelte di stile/asset o serve verifica live):**
    (1) **breadth skew armi/scudo** [HIGH]: il `build.breadth` per-classe scala SOLO X/Z del modello (Tank
    1.32) → l'arma/scudo agganciati a un osso EREDITANO lo skew (non si può allargare il corpo senza scalare
    le ossa). Trade-off: silhouette di classe vs armi non deformate. (2) **flash post-FX su ogni hit-stop**
    [HIGH, perf]: durante l'hit-stop il frame salta GTAO/grade/vignette → pop visibile; il fix richiede check
    perf live. (3) **anim di tiro arco/staff sui remoti** [HIGH]: nessuna clip di rilascio/cast (serve campo
    schema `lastRangedReleaseTick` + verifica). (4) staff FP senza braccia, orb staff mai tinto (heuristica
    nome mai matcha i KayKit), combo spada = stessa clip, viewmodel senza grade-pass, grip single-GLB latente.
  - **AGGIORNAMENTO STESSA SESSIONE — l'utente: «fai tutto senza fermarti» + «sempre main».** Risolti in
    autonomia, gate verde (341 test), e **PUSHATO su `main` (deploy prod)**:
    - (1) **breadth DISATTIVATO** (scelta utente): il modello torna a scala UNIFORME → armi/scudo non più
      deformati; identità di classe via outfit/capelli/accessori + tinta accent. `CLASS_BUILD.breadth`
      rimosso del tutto (commento-guardia «non reintrodurre»).
    - (2) **flash post-FX hit-stop RISOLTO**: durante l'hit-stop si compositano comunque GTAO/grade/vignette
      via `finalComposer.render()` (si salta SOLO il darken bloom per-frame, riusando il target precedente) →
      niente più pop a ogni colpo. (Accorcia anche `main.ts` → rientra nel budget.)
    - (3) **anim di tiro remoti RISOLTA**: nuovo campo schema `Player.lastRangedReleaseTick` (settato solo
      quando freccia/dardo nasce davvero in `handleChargeRelease`/`handleFireStaff`); il client edge-detecta
      il cambio e apre una finestra 220 ms → `Bow_Release` (via `attacking`) / `Staff_Cast` (via `casting`)
      sui nemici. hitReact/parry mantengono la priorità; nessun falso trigger su tap/cancel.
  - **RESTANO (LOW, bloccati da ASSET o tuning live — non sono bug di codice da fixare alla cieca):** staff FP
    senza braccia (serve un GLB braccia) + sway idle; orb staff element-tint (il KayKit staff è una mesh
    unica, servirebbe una mesh-tip emissiva da posizionare a vista); varietà clip combo spada (serve una 2ª
    clip); viewmodel senza grade-pass (budget main.ts + render non banale); grip single-GLB (codice morto,
    si ritara in-engine al riabilitare i realistici); shader-warmup ancorato al page-load (micro-stall
    one-shot). Tutti annotati; si fanno col modello/asset giusto o con l'utente che guarda dal vivo.

- **2026-06-13 — GAP ANALYSIS «cosa manca» (richiesta utente). 9 agenti: intento (doc) ↔ realtà (codice/
  asset). 98 gap → roadmap priorizzata verificata sul codice in `COMPLETEZZA.md`** (BLOCCANTI/IMPORTANTI/
  POLISH + nota grafica + ordine consigliato). Verdetto: «ottimo fight, scheletro di gioco» — finito solo
  l'arena (PBR+luci); restano personaggi/armi cartoon (PIANO #1), niente musica/audio-file, 5v5+matchmaking
  irraggiungibili, progressione/leaderboard/cosmetici assenti. `COMPLETEZZA.md` è la mappa-stato; questo file
  resta il piano operativo. Prossimi passi sicuri (ordine §1): bot-fill FFA, gate WebGL, surface errore-connessione.
  Le scelte di
  STILE e ASSET sono **sue**; io faccio analisi, propongo, eseguo. (Questo è il piano che mi ha
  scritto «20 volte»; ora è registrato — non va più ridetto.)
  **Obiettivo:** rifare **TUTTA** la grafica in **UNO stile coerente** — personaggi, arena, armi,
  braccia, props, VFX, HUD **e i MENU**. La camera/atmosfera è secondaria: il problema è mesh/asset/UI.
  **PROCESSO (la prossima sessione esegue QUESTO, in ordine, con l'utente che decide):** 4. **ANALISI** completa della grafica attuale + di cosa è rotto (skin tutte uguali = frankenstein a
  layer; armi girate/scudo storto = grip a mano; braccia FP a caso; font menu su Arila; VFX piatte). 5. **DECIDERE INSIEME LO STILE per TUTTO il gioco** (mondo 3D **e** menu/HUD) — **UNA via sola**.
  `STILE.md` esiste ma copre il 3D e l'ho deciso io → va **ri-validato con l'utente** ed esteso a
  menu/UI. Proporgli 2-3 vie concrete (con riferimenti), **lui sceglie UNA**. 6. **STUDIARE `E:/GIOCHI/ASSET_GRAFICA` a fondo** (ha `_INVENTARIO.md`): elencare **SOLO** ciò che è
  **davvero utile e funzionale** allo stile scelto; scartare il resto (incluso il cartoon che odia). 7. **SCARICARE il mancante FREE** online (Sketchfab/Quaternius/Mixamo/Poly Haven/ambientCG/font CC0). 8. **INTEGRARE tutto coerente**, verificando (log+logica + l'utente guarda dal vivo).
  **REGOLE DURE:** solo asset/tech/hosting **GRATIS**; rig **Mixamo**; **gioco completo, niente tagli**;
  valori numerici = compito MIO; **scelte di stile/asset = decise dall'UTENTE**.
  **AREE da sistemare** (lo scope; i dettagli si fissano ai punti 2-3 con l'utente): personaggi/skin
  (4 classi DISTINTE, oggi frankenstein in `render/character-loader.ts`) · armi+grip (R3) · braccia 1ª
  persona · spell/VFX (`render/projectile-visuals.ts`) · menu/HUD/font (`menu.ts`,`public/game-ui.css`,`hud/*`).
  **FATTO finora:** SOLO arena (PBR+luce). Tutto il resto è da fare con questo processo, deciso con lui.

- **2026-08-11 — REVISIONE GLOBALE + RICERCA 2026 + RIFONDAZIONE (richiesta utente: «rivedi tutto,
  cerca aggiornamenti, studia il piano perfetto e realizzalo»).** Ricerca web su 5 fronti (three.js,
  VFX, personaggi/anim, netcode/hosting, asset free) + piano completo in **`RIFONDAZIONE.md`**
  (prompt riscritto, diagnosi, ricerca, fasi F0-F7, punti-decisione utente). Scoperte chiave:
  - **Personaggi (LO SBLOCCO):** i personaggi STOCK di Mixamo (Paladin/Knight/Vanguard, Erika
    Archer, Ninja) sono tutti sul rig `mixamorig` → scaricando le anim **"with skin"** per ciascuno
    il retargeting sparisce. Mago assente su Mixamo → modello CC + AccuRig 2.0 (free) + Rokoko/Expy
    in Blender. Mixamo è vivo ma non mantenuto → scaricare presto. Serve l'account Adobe dell'utente.
  - **VFX:** three.quarks (mantenuto, editor visuale, trail/sub-emitter) = sistema pronto per le
    spell; richiede three ≥0.182 → upgrade r185 (basso rischio, ritarare ombre/GTAO).
  - **Netcode/hosting:** Colyseus 0.17 ha la riconnessione automatica (nostro gap); **Fly.io free
    è morto per i nuovi account** (verificare grandfathering!, piano B: Koyeb Francoforte);
    **Supabase free si pausa dopo 7 giorni** → serve keep-alive cron.
  - **Asset:** la licenza Fab Standard è engine-agnostic → i free bisettimanali valgono per
    Three.js (claimarli sempre); audio completo gratis via Sonniss GDC + pack spell itch; font
    Cinzel+Grenze Gotisch.
  - **F0 ESEGUITA (flow sbloccato, gate verde 355 test):** (1) errore-connessione VISIBILE + retry
    con backoff per il cold-start (niente più rimbalzo muto al menu); (2) FFA parte con 5 bot
    (`FFA_BOT_FILL`); (3) **Team 5v5 giocabile**: tile nel menu (griglia a 4), wiring `connect('5v5')`,
    team bilanciati (squadra più piccola), spawn a metà-anello per team, bot mai contro compagni e
    sul nemico più VICINO (prima: ultimo iterato — fix anche per FFA); (4) gate WebGL con messaggio
    chiaro. Estratto `rooms/lobby-fill.ts` (pure) + 11 test che bloccano le regole.

- **2026-08-11 (2ª parte) — F1 FONDAMENTA TECH ESEGUITA (ok dell'utente sul piano).** Gate verde
  (358 test), verificato live (join 5v5 reale + in-match browser headless, 0 errori):
  - **Colyseus 0.16→0.17 + schema v4 + client `@colyseus/sdk`**: il bootstrap è cambiato — in 0.17
    le rotte di matchmaking vivono nell'app express DEL TRANSPORT; health/monitor si montano nel
    callback `express:` di `new Server({...})` (un'app express propria = /matchmake 404, provato).
    `Room<{state}>`, `this.state =`, `onLeave(client, code)`, kick rate-limit 4001→**4100** (0.17
    riserva 4000-4010). Sblocca la riconnessione automatica lato client (da cablare in F7).
  - **Auto-quality FPS-adattivo** (`render/auto-quality.ts` + 6 test): niente detect-gpu (scarica
    benchmark da CDN = contro la regola self-contained); campiona gli fps SOLO in live, media <42
    → scala il preset di un tier (mai su, mai dopo scelta manuale), toast informativo.
  - **Keep-alive Supabase**: `.github/workflows/supabase-keepalive.yml` (cron lun+gio, usa i secret già in repo; ⚠ il token locale non ha scope `workflow` → il file va aggiunto una volta dalla UI GitHub)
    VITE*SUPABASE*\* già presenti) — il free tier si pausa dopo 7 giorni senza query.
  - Estrazioni per file-budget: `net/join-with-retry.ts` (retry cold-start), `render/create-renderer.ts`.
  - **F1d post-FX pmndrs RIMANDATO a F2** (stesso compositor delle spell, va visto dal vivo).
  - DA FARE (serve l'utente): stato account Fly (grandfathered o no) · ora Mixamo (F3).

- **2026-08-11 (3ª parte) — F2a SPELL PARTICLE LAYER (three.quarks) — «continua da solo, decidi tu».**
  Le spell ora hanno CORPO: `render/spell-particles.ts` (three.quarks 0.17) sopra i core a piani
  incrociati — **ember-trail** che scia dal dardo (emission-over-distance: densità costante a ogni
  velocità), **burst di scintille all'impatto** (con gravità), **muzzle-puff al lancio**; tutto
  element-tinted (STILE §7) e sul layer bloom. Design anti-freeze: **UN solo materiale** (sprite
  `vfx_shield` cerchio soffice, colore per-particella) → un solo SpriteBatch/shader, warmato al
  load con un burst sotto il pavimento; pool luci invariato. Verifica: nuova sonda
  **`tools/verify/spellshot.mjs`** (pointer-lock come probe, mostra il debug HUD col Backquote,
  campiona SOLO quando `#dbg-proj>0`) → dardo mago IN VOLO con nube di embers catturato
  (`.verify/spell-mage-*.png`), 0 errori; `probe.mjs`: programmi shader STABILI in play (46→39,
  nessuna compilazione mid-fight). Gate verde 358 test → push su `main`.
  - API quarks imparata (per la prossima volta): `startColor` vuole `ConstantColor`; i vettori
    sono di quarks.core (`Vector3/4` da three.quarks, NON di three); `ColorOverLife` vuole un
    `Gradient` (FunctionColorGenerator), non `ColorRange`; `BatchedRenderer.update` aggiorna i
    sistemi anche a emitter sganciato → `endEmit()+autoDestroy` è un teardown sicuro.
  - PROSSIMO F2b (visivo, con utente o altra sessione): tuning quantità/dimensioni per elemento,
    telegraph a terra pre-impatto, composer unico pmndrs (F1d), varietà per-elemento (es. fulmine
    jitter, dark che ASSORBE luce).

- **2026-08-11 (4ª parte) — SCOREBOARD MULTI-PLAYER (FFA/5v5 non collassano più a 1v1).**
  `assembleEndScreen` in `game/scoreboard-data.ts` (pure, +6 test): duel → pannello classico;
  **FFA → classifica ranked** (kill desc, riga TU evidenziata, vittoria = primo posto strict);
  **5v5 → tabella per squadre** (rosse prima, bordo colore team, titolo «ROSSO x — y BLU», esito
  dai totali team). Dati dal último Score broadcast (`lastSoloScores`/`lastTeamScores`, reset a
  inizio match). Render `renderMultiScoreboard` in `endgame.ts` + CSS `.sb-table/.sb-trow`.
  Vale anche per l'uscita volontaria (FFA/5v5 mostrano la tabella, duel abbandonato resta
  PRATICA senza ELO). main.ts alleggerito (~-60 righe, i due call-site ora sono una chiamata).
  Gate verde 362 test → push su `main`. **+ RIVINCITA**: chip ⟳ sul fine-partita (duel e multi) che rilancia lo STESSO ui-mode via `lastConnectMode` (teardown pulito → launchModeOrForge).

- **2026-08-11 (5ª parte) — 🎉 PERSONAGGI REALISTICI IN GIOCO (F3 core, «muoviti/fai tutto tu»).**
  Con l'utente loggato su Mixamo (Brave, estensione Chrome): scaricati **i personaggi stock + i
  PACK di animazioni** (la scoperta chiave: 1 pack = 50+ clip in uno zip): Paladin J Nordstrom +
  Pro Sword and Shield (52), Erika Archer con arco + Pro Longbow (40), Ninja + Great Sword (52).
  Blocco Brave "download multipli" superato coi "Consenti" dell'utente. Tutto committato in
  `character-sources/mixamo/`. **Pipeline di fusione NUOVA** `tools/asset-pipeline/mixamo-to-glb.mjs`
  (niente Blender: FBX2glTF via npm + gltf-transform mergeDocuments con retarget canali per nome
  osso + prune/dedup/unpartition + optimize quantize/WebP) → **paladin.glb 1.9MB/29 clip,
  erika.glb 2.5MB/20, ninja.glb 1.8MB/23**. `classes.ts`: `mixamoGlb` RIATTIVATO per tank/archer/
  hybrid (il blocco storico "no locomotion" è morto — clip complete embedded); `_mapMixamoClips`
  esteso ai nomi dei pack (guardie negative su block_idle, slash→attack2, impact→hit-react,
  power_up→respawn, aim_overdraw/recoil→arco). **Verificato**: lineup post-compressione (tutti e
  3 animati) + Stanza Test in-engine (a terra, armati, team-rim ok). Gate 362 test → main (9ec00a4).
  - RESTANO (tuning prossima sessione): materiali scuri nell'arena (Paladin quasi nero → serve
    boost tipo GLB_BRIGHTNESS), grip armi per-rig, yaw lineup, **mago** (serve Pro Magic Pack —
    zip ancora bloccato dal consenso Brave — + un modello CC via AccuRig), FPV braccia.

- **2026-08-12 — GIRO «continua a migliorare e fixare» (4 fix shippati, gate verde 364 test).**
  (1) **Luminosità personaggi**: GLB_BRIGHTNESS paladin 1.5 / ninja 1.2 / erika 1.15 (il piastre-nero
  era una silhouette). (2) **Arco animato di Erika**: i mesh `Bow/Arrow` embedded si mostrano SOLO con
  arco equipaggiato (prop di gioco soppressa), staff li nasconde — generico via nome mesh. (3) **Via le
  outline ink da armi+scudo** (STILE bloccato: rim, non ink; i corpi le avevano già perse). (4) **Timer
  10 min sui modi kill-cap** (FFA/5v5 non possono più stallare all'infinito; +2 test MatchManager).
  Probe col Paladin in play: 0 errori, shader 43→43 (nessuna compilazione mid-fight). Scoreboard e
  deathcam ora TUTTI in italiano. Commits: 4100670, 782340c, ac21282, bb93271.

- **2026-08-12 — GIRO POLISH+F5 (autonomo, «fai tutte le fasi»).** Push: d96b341 (Cinzel display
  font self-hosted su tutti i titoli · preloadClassModel via placeholder dorati · FFA→10 ·
  barili imbruniti) · d5f3258 (orb emissivo element-tinted sullo staff — backlog giugno chiuso) ·
  **2275e9a (F5 MUSICA: `audio/music.ts` crossfade menu↔combat, tracce CC0 OpenGameArt —
  "Loopable Dungeon Ambience" + "Battle Theme A" —, slider Musica dedicato persistito,
  autoplay-policy gestita col gesture-unlock esistente; CREDITS.md nuovo)**. Gate 364 test.
  - PROSSIMI: ritratti classi dai modelli veri (menu/loadout mostrano ancora i vecchi) · F2b
    tuning spell per elemento + pmndrs · foley file-based (Sonniss) · F7 reconnect 0.17/leaderboard.

- **2026-08-12 — GIRO «continua senza fermarti, migliora tutto» (autonomo, su branch
  `claude/game-improvements-ff3fff`, NON ancora pushato su `main` — vedi nota sotto).** Gate verde
  379 test. Prima di toccare codice: verificato nel sorgente reale dell'SDK Colyseus 0.17
  (`Room.mjs`) che la riconnessione **era già cablata correttamente** (auto-retry interno, consuma
  da solo il `reconnectionToken` contro l'`allowReconnection(20s)` server) — la nota di
  COMPLETEZZA.md/l'agente di ricerca erano fuorvianti; il gap vero era solo l'assenza di feedback
  UI durante il retry automatico. Shippato:
  1. **Feedback riconnessione** (`net/reconnect-feedback.ts`): toast "riconnessione automatica" su
     `room.onDrop`, richiuso su `room.onReconnect` — prima il giocatore vedeva un gioco muto/fermo
     per tutta la finestra di retry (fino a ~20-60s).
  2. **Validator Recovery**: `classLoadoutFitsSlotGrammar` non imponeva mai la presenza della
     Recovery di classe (gap COMPLETEZZA «zero self-heal possibile»). Aggiunte
     `loadoutHasRecovery`/`ensureLoadoutHasRecovery` in `shared/constants/classes.ts` + rete di
     sicurezza server-authoritative in `rooms/loadout-resolve.ts` (sostituisce l'ultimo slot utility
     se manca, ServerNote di avviso — mai un match senza sustain).
  3. **F2b varietà VFX per-elemento** (`render/spell-particles.ts`): embers/impatti/muzzle erano
     identici per tutti e 5 gli elementi (solo colore cambiava). Aggiunta tabella `ELEMENT_MOTION`
     (velocità/vita/size/conteggio/forza verticale per elemento) — fuoco sale e brucia in fretta,
     ghiaccio lento e cristallino, fulmine scatta e sparisce, dark pesante e lento, nature deriva
     verso l'alto. Un solo materiale/batch/shader invariato (shader 41→41 nel probe).
  4. **Atmosfera arena** (STILE §5, ultimi due item mancanti): dust motes ora si illuminano per
     vicinanza torcia (colore per-vertice ricalcolato ogni frame) + god-ray economici (cono
     shader gradiente, stesso trucco della sky dome) sotto ognuna delle 4 torce. Verificato
     renderizzato via `tools/verify/shot.mjs`/`spellshot.mjs` (god-ray visibile, 0 errori pagina).
  5. **Doc drift chiuso**: `02_TECH/06` e `07` descrivevano ancora `MeshToonMaterial`/asset
     Quaternius abbandonati; riscritti sulla pipeline PBR/Mixamo reale (con nota sul fallback
     silhouette toon di `character.ts`, che resta vivo ma non è più il default).
  6. **File-budget**: le aggiunte sopra avrebbero sforato il ratchet su `main.ts`/`GameRoom.ts` →
     estratti `hud/connection-status.ts` (setStatus) e `rooms/loadout-resolve.ts` (loadout+classe+
     recovery), che ha anche liberato margine extra sul tetto di `GameRoom.ts`.
  - **Verifica**: hitch >150ms nel probe headless erano identici A/B (stash del branch vs baseline)
    → artefatto SwiftShader/carico macchina (altro worktree con server attivo in parallelo), non
    una regressione introdotta qui.
  - **⚠ NOTA workflow**: sessione avviata in un git worktree separato (non `main`); ho scelto di
    NON pushare/mergiare su `main` in autonomia data l'assenza dell'utente (push = deploy prod per
    le regole del progetto) — le modifiche restano committate sul branch, pronte per review/merge.
  - PROSSIMI: valutare leaderboard minima (letta da Supabase, nessuna migrazione servirebbe se lo
    schema esistente basta) · split file-budget di `AbilityEngine.ts`/`sound-engine.ts` (ratchet
    opportunities segnalate da `check:budget`) · F2b resta aperto per pmndrs post-FX + telegraph
    a terra dedicato · ritratti classi dai modelli veri.

- **2026-08-12 (2ª parte) — AUDIT MULTI-AGENTE + FIX DI BUG VERI (feedback durissimo dell'utente:
  «è tutta una merda, non si capisce quando/cosa casti, le spell sembrano tutte uguali, le
  animazioni non funzionano, il loadout è incomprensibile»).** Gate verde 403 test.
  - ⚠ **PRIMA COSA, ed era colpa mia**: l'utente sentiva «il gioco attivo da qualche parte ma non
    lo vedo, sento l'audio». Era una **scheda browser invisibile lasciata aperta da me** con il
    gioco (e la musica) in esecuzione. Chiusa. **Lezione: spegnere SEMPRE preview/dev-server a fine
    verifica** — un server headless che continua a girare è indistinguibile da un bug del gioco.
  - **Metodo nuovo, e decisivo**: invece di ragionare sul codice, ho costruito sonde che
    FOTOGRAFANO l'HUD reale in partita. `tools/verify/hud.mjs` (HUD in-match: congela il rAF —
    `page.screenshot` va altrimenti in timeout sotto il render loop —, rimuove il canvas, nasconde
    gli overlay, misura la geometria di ogni sezione e **fallisce se l'HUD esce dallo schermo**;
    `HUD_CAST=1` lancia davvero le abilità e ispeziona il readout) · `tools/verify/forge.mjs`
    (Loadout: accento-colore risolto per card + conta i nodi di testo sotto gli 11px) ·
    `tools/verify/list-clips.mjs` (inventario clip per GLB).
  - **Audit**: workflow a 56 agenti su 8 dimensioni (HUD, cast feedback, VFX spell, animazioni,
    loadout, logica combat, menu, audio) con ricerca web sulle tecniche di riferimento (LoL VFX
    style guide, Valorant clarity, Overwatch frequency-slot audio, WildStar telegraph) e verifica
    avversariale per ogni finding. **31 confermati su 64**. Dump completo nel journal del run
    `wf_646bb9a6-106`.
  - **BUG DI GAMEPLAY VERI trovati e corretti** (non estetica — spiegano «le meccaniche sono una
    merda»): (1) **ogni dash/teleport non muoveva il caster**: `effectMove` scriveva solo
    `player.transform`, ma il tick copia `simState.pos` sul transform ogni frame → spostamento
    annullato un tick dopo; (2) **le abilità a costo stamina erano gratis**, stesso meccanismo sul
    campo stamina (rotti anche Energize e i drain). MeleeSystem/ProjectileSystem/ParrySystem
    avevano già gli hook `syncSimPos`/`syncSimStamina`; l'AbilityEngine no. Ora li ha, e i test
    asseriscono che la **simulazione** è stata scritta — i vecchi test guardavano solo lo schema,
    ed è esattamente per questo che il bug è sopravvissuto.
  - **NON toccato di proposito**: i 9 knockup identici. Il codice documenta esplicitamente la
    scelta (`void airborneSec`, «differentiating airtime would be a balance change, not a bug
    fix») → è una decisione di bilanciamento, **serve l'utente**.
  - **Leggibilità (le lamentele dirette)**: nomi abilità non più troncati né in hotbar
    ("MARKSMA…") né nella colonna build del Forge ("TRAIETTORIA · 24 DANNI · ESP…") · danno/cura/
    controllo/distanza + glifo della forma del colpo ora **sul pip**, sempre visibili (erano
    calcolati ma chiusi in un tooltip `:hover`, **irraggiungibile in FPS con pointer-lock**) ·
    dimensione pip da variabile CSS (prima la barra usciva dallo schermo a 1280×720) ·
    `--elem-color` non era MAI definito fuori dalla hotbar → tutte e 53 le card del Forge e il
    diagramma "dove colpisce" erano grigi uguali; ora seguono `ELEMENT_COLOR`/STILE.md §1.
  - **Animazioni**: Sword/Bow/Staff/Attacking idle collassavano su UNA sola clip per classe (il
    personaggio non cambiava mai postura cambiando arma); lo staff ora usa la clip `*_casting` che
    i pack già contengono ma non veniva mai suonata. Inoltre `exact()` risolveva i candidati
    sull'ordine delle clip nel GLB invece che sull'ordine di priorità → Erika suonava la posa ad
    arco già teso al posto dell'incocco. Nuovo `character-clips.test.ts` valida i **4 GLB reali** e
    fissa a ratchet le lacune di asset rimaste (Erika non ha idle neutro, Paladin non ha clip arco).
  - **RESTANO CONFERMATI, non ancora fatti** (in ordine di impatto): hotbar `ready` mente (non
    legge mana/stamina/GCD) · cast bar morta per 40/53 abilità · niente anello di cast sul mirino ·
    `#shoot-flash` identico per tutte le 53 abilità/3 armi/5 elementi · 33/53 abilità senza VFX di
    mondo · impatto VFX spawnato al PUNTO MEDIO attaccante-vittima con raggio fisso (mente su dove
    e quanto grande) · casting muto sul frame di input (arco e staff completamente silenziosi) ·
    nessun telegraph a terra AoE · niente footstep/audio remoti · AoE con 3 hitbox diverse (sfera
    vs cilindro infinito) · abilità forward che non colpisce nulla addebita comunque costo+CD.
  - ⚠ Resta su branch `claude/game-improvements-ff3fff`, NON pushato (push = deploy prod).

- **2026-08-12 (3ª parte) — SVUOTAMENTO DELLA CODA («perché in coda? devi finire tutto»).**
  Gate verde 427 test. Altri 5 commit sullo stesso branch, tutti su problemi CONFERMATI dall'audit:
  - **Hotbar che mentiva**: un'abilità era «PRONTA» appena fuori cooldown, ignorando mana, stamina e
    GCD → premevi un tasto acceso e non succedeva nulla, senza spiegazione. Ora i pip hanno gli stati
    `unaffordable` e `gcd-locked`.
  - **Flash "hai sparato" prima di ogni controllo**: ogni pressione confermava visivamente, e il
    server smentiva un round-trip dopo. Nuovo `input/cast-preflight.ts` (puro, testato) sceglie tra
    flash di successo e motivo immediato, leggendo gli STESSI campi replicati che valida il server.
    Non predice mai un fallimento per l'arma sbagliata (il server auto-swappa) e non blocca l'invio.
  - **Impatti disegnati nel posto sbagliato**: erano al PUNTO MEDIO attaccante-vittima, quindi una
    freccia da 20 m disegnava l'impatto 10 m prima del bersaglio. Ora sono SULLA vittima, ad altezza
    petto. Estratto in `game/hit-impacts.ts` con test sulla geometria.
  - **33/53 abilità senza effetto elementale**: la libreria di particelle per-elemento era cablata
    SOLO ai proiettili; ora anche gli impatti istantanei (raggi, magia ravvicinata, combo) hanno il
    loro burst. Fisico e parate esclusi di proposito.
  - **Cast muto**: arco e staff non facevano ALCUN rumore allo sparo (la spada sì) — un colpo a vuoto
    era completamente silenzioso. Nuovo `playWeaponFire()`. E il suono delle abilità è passato
    dall'eco del server al frame di input, dove appartiene.
  - **Una sola hitbox AoE**: danno=sfera 3D, status/knockup=cilindri verticali INFINITI → la stessa
    abilità colpiva tre insiemi diversi. Ora `sim/aoe-shape.ts`: disco con estensione verticale che
    cresce col raggio ma mai più bassa di un giocatore — ed è la forma che il client già disegna.
  - Localizzati in italiano tutti i messaggi di fallimento cast (erano l'ultimo inglese visibile).
  - **Estrazioni per file-budget** (il ratchet ha imposto lavoro vero, non trucchi): `send-cast.ts`,
    `hit-impacts.ts`, `on-ability-casted.ts`, `audio/hurt-sounds.ts`, `sim/aoe-shape.ts`,
    `ability-engine-host.ts`, `hud/connection-status.ts`, `rooms/loadout-resolve.ts`. main.ts
    2816→2745, sound-engine 909→819, AbilityEngine 1014→916. ⚠ LEZIONE: il tetto non si alza MAI —
    una volta l'ho fatto e ho dovuto rifare il lavoro come si deve.
  - **RESTA APERTO**: nessun telegraph a terra per le AoE (Meteor ha 1 s di windup e il punto non è
    replicato) · nessun footstep/audio remoto (non senti arrivare nessuno) · `#shoot-flash` ancora
    identico per tutte le abilità · abilità forward a vuoto che addebita comunque costo+CD ·
    animazioni: 53 abilità → 3 clip di corpo, e le one-shot vengono tagliate nel primo ~15-20% ·
    ritratti classi dai modelli veri · pmndrs post-FX.
  - **DA DECIDERE (utente)**: i 9 knockup identici — il codice documenta la scelta come
    bilanciamento, non tocco.

- **2026-08-12 (4ª parte) — CODA FINITA.** Gate verde 433 test, altri 4 commit:
  - **Animazioni: il colpo non si vedeva MAI.** Le clip Mixamo durano 1.5-2.5s ma lo stato che le
    guida è tenuto solo ~220-420ms (finestra dell'arco di swing / rilascio a distanza), quindi il
    crossfade abbandonava la clip dopo il 10-25%: partiva il caricamento e la stoccata non veniva
    mai renderizzata. Invece di rallentare il gioco per far stare le clip, ogni one-shot viene
    ACCELERATA per stare nella sua finestra (`fitOneShotToWindow`, cap 6× per non sfocare, mai
    sotto 1×). Le animazioni c'erano già — semplicemente non le vedevi. Corretto anche il recoil
    della spada, che rimetteva `timeScale = 1` e rallentava lo swing a metà colpo.
  - **Telegraph a terra**: nuovo messaggio `CastTelegraph`. Il server lo trasmette appena parte un
    cast con windup e area reale, col raggio VERO dell'abilità e la durata esatta del windup; il
    client disegna un cerchio element-tinted con bordo opaco (leggibile su qualsiasi pavimento) e
    riempimento che cresce dal centro e tocca il bordo esattamente all'impatto — il riempimento È
    il timer. Verificato con test sul broadcast (l'input headless per le abilità a piazzamento è
    fragile, il test è più affidabile).
  - **Audio remoto**: i passi esistevano solo per il giocatore locale e su uscita non spaziale →
    un avversario poteva attraversare l'arena alle tue spalle in silenzio totale. Ora passi HRTF
    spazializzati per ogni giocatore remoto, stessa regola dei 2.1 m, più forti dei tuoi (la
    posizione di un nemico è informazione).
  - **Abilità a vuoto**: nuova ragione `no_target`. Il costo resta pagato (se rimborsare è una
    scelta di bilanciamento, tua), ma almeno il giocatore viene informato.
  - Estratti ancora per budget: `cast-telegraph.ts` (client+server), `on-death.ts`,
    `remote-sounds.ts`, `player-maxima.ts`, `aoe-shape.ts`. main.ts 2816→2747 in totale.
- **2026-08-12 (5ª parte) — «fai tutto e anche di più».** Gate verde 438 test, altri 3 commit.
  Tutti da finding confermati dell'audit, tutti senza scaricare un solo asset nuovo:
  - **Terzo fendente**: il combo va a 3 colpi ma erano mappate solo 2 clip d'attacco, quindi il
    terzo ripeteva il primo. I pack Mixamo ne contengono 4-6 a testa (paladin: attack_2/3/4 +
    slash_2; ninja: slash/slash_2) e **stavano lì inutilizzate**. Aggiunto `Dagger_Attack3` e il
    selettore ora cicla su quante varianti il pack ha davvero. Test sui GLB REALI: paladin e ninja
    risolvono 3 clip DISTINTE.
  - **Flash element-tinted e pesato**: era un lampo bianco identico per 53 abilità, 3 armi e 5
    elementi — diceva solo CHE qualcosa era partito, mai cosa. Ora porta il colore dell'elemento e
    scala col peso (windup = cast impegnativo → più forte; M1 spada/staff restano discreti perché
    sparano di continuo).
  - **Hit-confirm dell'attaccante**: colpire non aveva alcuna conferma dedicata — sentivi il corpo
    dell'impatto, lo stesso che sentono gli spettatori. Aggiunto un tick in banda alta (~4.2/5.1
    kHz, libera nel mix) con transiente netto e decay 55ms: sopravvive a una mischia senza fango.
  - **Parata direzionale**: la parata di terzi suonava a volume PIENO a qualsiasi distanza,
    annullando l'indizio direzionale. Ora spazializzata su chi para.
  - **Proiettili col loro peso**: `damage` arrivava sul filo e veniva buttato → un colpo da 8 danni
    era identico a uno da 38. Dimensione e luce ora scalano (regola LoL: un attacco base non deve
    rivaleggiare visivamente con un finisher).
  - **Pip "input ricevuto"**: `markPending` metteva una classe che il refresh per-frame toglieva
    ~16ms dopo → non si vedeva mai. Ora è una scadenza che il refresh rispetta.
  - Estratti: `attacker-feedback.ts` (e rimosso un `ComboState` che avevo duplicato — esisteva già
    in `combat-feedback.ts`).
  - **RESTA, e serve l'UTENTE**: ritratti classi dai modelli veri (già tentato alla cieca in
    passato e SCARTATO: 2/4 banner brutti — va rifatto con inquadratura dedicata o con lui) ·
    pmndrs post-FX (cambia il look, va visto dal vivo) · clip d'attacco per l'arciere su
    paladin/vampire/ninja (serve rieseguire la pipeline Mixamo con Pro Longbow: download) ·
    i 9 knockup identici (bilanciamento).

- **2026-08-12 — RILASCIO IN PRODUZIONE (autorizzato dall'utente: "vai")**. I 17 commit del branch
  `claude/game-improvements-ff3fff` sono entrati su `main` in fast-forward (`f01a111..c99c4ce`) e
  sono pubblicati. Gate verde sul commit esatto prima del push; CI verde su tutti e quattro i job
  (gate, build, Fly.io, Cloudflare Pages).
  - **Trappola dell'URL, scoperta qui**: `ragequit.pages.dev` NON è questo gioco — è il sito di
    un'altra app. Il sottodominio era occupato, quindi il progetto Pages si chiama `ragequit-5i6`.
    Un `curl` su quell'URL risponde `200` e sembra un deploy riuscito: ci ero cascato per un
    momento. Documentato in `02_TECH/10_deploy_status.md` perché non ricapiti a nessuno. È molto
    probabilmente all'origine del "sento il gioco attivo da qualche parte ma non riesco a vederlo".
  - Catena verificata end-to-end sul deploy reale, non sui test: `https://ragequit-5i6.pages.dev/`
    serve `<title>RAGEQUIT</title>`, il bundle pubblicato punta a `wss://ragequit-server.fly.dev`,
    e quel server risponde `{"status":"ok"}`. (`ws://127.0.0.1` nel vendor bundle è solo il default
    dell'SDK Colyseus, non l'endpoint configurato.)
  - **Stendardi a scacchi viola/ciano — trovati FOTOGRAFANDO la produzione, non leggendo il
    codice.** `banner_patternA_red` si chiama "red" ma i suoi UV pescano sulle strisce viola e
    turchese della palette atlas KayKit (`dungeon_texture.png`, 64×64 a strisce): in ogni partita
    pendevano dalle mura due bandiere che sembravano una texture mancante. Non era un 404 (nessuno
    in produzione) e non era l'arena (la sua palette 3×4 non ha né viola né ciano). `mat.color`
    moltiplica la map, quindi una tirata decisa verso il cremisi riporta entrambe le strisce su
    maroon/mattone lasciando vivo il pattern — stessa tecnica già usata lì accanto per i barili,
    a cui lo stendardo era semplicemente sfuggito. A/B misurato sulla stessa scena locale:
    **1266 px viola + 1608 ciano → 0 e 0**; il "prima" (0,281% del frame) combacia con la
    produzione (0,277%), il che conferma che era proprio quello.
  - **Ancora aperto e NON toccato (è STILE, quindi tuo)**: dentro `gladiators_arena.glb` ci sono
    barili/casse verde-acqua accesi, che stonano con l'arena rosso-scura. Non sono prop: sono
    geometria dell'arena, quindi il tint "legno invecchiato" dei prop non li tocca. Colorarli è una
    scelta di look, non un bug da correggere di mia iniziativa.
  - **PISTA APERTA, non risolta — manichino azzurro dentro i personaggi.** Nella cattura di
    produzione `prodfix-match2.png` due figure si compenetrano: un ninja col modello vero e, dentro
    di lui, un corpo procedurale piatto azzurro (braccio, gamba e stivale che sporgono). L'azzurro
    è `0x3a8fde`, il "blu = te stesso" di `character.ts:53`, quindi è un personaggio rimasto col
    corpo procedurale mentre un altro ha già installato il GLB nello stesso punto. Non è il
    placeholder di classe (tank=canna di fucile, arciere=verde, mago=viola, ibrido=cremisi: nessuno
    azzurro). `_installCharacterModel` rimuove il procedurale quando installa il modello, quindi il
    sospetto è una corsa in caricamento o due entità sullo stesso spawn. NON l'ho corretto: è
    diagnosi da guardare dal vivo, e tirare a indovinare qui significa rompere il rendering dei
    personaggi. Prova: `.verify/char.png`.

- **2026-08-13 (notte) — l'utente va a dormire e dà autonomia piena, STILE COMPRESO** ("puoi
  decidere quello che vuoi, ma deve essere figo"). Ogni scelta di gusto presa qui è annotata sotto
  perché lui possa bocciarla; nulla è irreversibile.
  - **Il menu dichiarava OFFLINE a chiunque aprisse il gioco.** Lo stato partiva da "offline" e si
    correggeva solo quando rispondeva la health probe — che ha un timeout di 20s, e il server ha lo
    scale-to-zero, quindi il primo visitatore pagava il cold start leggendo che il gioco era morto.
    Ora "non lo so ancora" è uno stato suo: ambra `checking server` finché la probe non risponde.
    Verificato tenendo aperta la /health (è ciò che si vede con la macchina addormentata): l'etichetta
    resta `checking server` a 0ms, 1.5s e 6s. L'"offline" neutro dopo un'uscita volontaria è INVARIATO
    — lì c'è un commento che lo difende come scelta.
  - **Forge: 8 nodi di testo fisicamente tagliati, misurati non discussi** (`.verify/trunc.mjs`).
    4 erano le descrizioni delle abilità equipaggiate ("bruciatura…", "lancia in ari…"): non potevi
    leggere cosa avevi in mano. Causa: `text-transform: uppercase` su una FRASE — il maiuscolo costa
    circa un quinto di larghezza in più e toglie le forme delle parole. Tolto, più clamp 2→3 righe.
    Ora 8→5 nodi, e le descrizioni 4→1 (resta METEOR, che ha quattro clausole).
  - **La meccanica di classe non era leggibile da nessuna parte.** La targhetta in alto sta in una
    riga flex `overflow: hidden` con `flex: 1 1 0` e collassava a una scatoletta con dentro la sola
    emoji. Provato a farla andare a capo: peggio, si riduceva a due caratteri — RIPRISTINATA com'era.
    La colonna sinistra del Forge aveva un'area morta sotto gli slot Utility: la spiegazione vive lì
    ora, per esteso e in minuscolo. Verificato su mage (RISONANZA) e tank (FURY).
  - Estratto `hud/ffa-ladder.ts` (con test: top3 + te al tuo rango vero, senza duplicarti sul podio)
    per ripagare le righe aggiunte a main.ts — il budget non sale mai.

- **2026-08-13 (notte) — audit multi-agente e cinque batch di upgrade.** 13 agenti su 6 settori
  (grafica, HUD, abilità, IA, quality-of-life, armi), ognuno con ricerca su come lo risolvono i
  titoli usciti, poi una passata avversariale a uccidere i findings che non reggevano il contatto
  col codice: **29 sopravvissuti su ~35**. Backlog ordinato in `.verify/backlog.md`.
  - **Colore sbagliato su TUTTI i prop dell'arena.** `cloneGltfScene` scambia la map di ogni
    materiale con una texture condivisa caricata a mano, e `TextureLoader` non imposta il
    `colorSpace`: quindi l'albedo di torce, barili, casse e stendardi veniva decodificato come
    lineare. Ecco perché sembravano plasticosi e da luna park accanto al guscio del colosseo, che
    invece è caricato da GLTFLoader ed era sempre stato giusto. Misurato: il verde-acqua fuori
    palette sui barili 128 px → 0, con saturazione media della scena INVARIATA (0,879 → 0,880).
  - **Anisotropia da 4 fissa al massimo hardware (16).** Senza, il filtraggio mip sfoca in poltiglia
    tutto ciò che si guarda di sbieco — cioè la sabbia dell'arena, che è quasi tutto lo schermo.
  - **L'antialiasing era spento senza che nessuno lo sapesse.** Il canvas nasce con
    `antialias: true`, ma quel flag smette di contare nel momento in cui `EffectComposer` possiede i
    buffer — e li possiede da sempre. Ora il composer finale ha un target multisample. Misurato
    contando i salti netti di luminanza: **3815 → 2169** su un frame, 3295 → 2580 sull'altro.
    ⚠ TRAPPOLA: `EffectComposer` deriva la dimensione dal renderer SOLO se costruisce il target da
    sé; se gliene passi uno, adotta le dimensioni di quello. Costruito 1×1 ha renderizzato tutto il
    gioco come un unico pixel stirato — beccato subito dalla sonda (frame beige pieno, coverage 100%).
  - **L'M1 dello staff non muoveva nulla in mano.** Il punch-and-settle del viewmodel esisteva e
    funzionava, ma era raggiungibile solo da `AbilityCasted`, che sparare non emette. Ora ha una
    magnitudine: la stoccata calcia a metà di un cast impegnato.
  - **L'arco della spada era un cerchio alle caviglie**, mentre la lama passava nel petto. Alzato
    all'altezza di contatto già usata da `hit-impacts.ts`, e tubo 0.14 → 0.05 (una spada lascia una
    scia larga quanto la lama, non una ciambella). Corretto un commento che dichiarava 120°: la
    campata è 90°.
  - **La meccanica di classe ora si vede in partita.** Fury/Momentum/Risonanza/Flow erano simulate e
    replicate su ogni Player, e il client non le leggeva: il CSS della striscia era già nel repo,
    inutilizzato. Le costanti di scala erano private del server → spostate in `shared`, così l'HUD
    disegna gli stessi numeri della simulazione. Barra Momentum con la tacca alla soglia vera
    (modello Guild Wars 2: leggi la SOGLIA, non il valore).
  - Estratti per pagare le righe: `render/post-pipeline.ts`, `input/input-gating.ts`,
    `hud/ffa-ladder.ts`. main.ts 2738 → 2679 righe, budget stretto di conseguenza.
  - **ESC sulla schermata dei risultati DISTRUGGEVA il risultato.** È l'unico posto dove vedi il tuo
    delta ELO, uccisioni e danno. ESC non aveva un caso per lei: cadeva nel ramo del menu di pausa e,
    finita la room, su un menu principale che si disegna DIETRO (z-index 850 contro 800) — e il
    teardown cancellava i numeri senza modo di tornarci. Ora esce dalla stessa porta del pulsante.
    Verificato sul client vivo: un ESC = un click di uscita, zero menu di pausa.
  - **Tolto il prompt "SPC · SKIP" del deathcam** (e il suo CSS): il respawn è temporizzato dal
    server, quindi nessun tasto poteva accorciarlo. Un prompt che non si può onorare è peggio di
    nessun prompt.
  - **Scuotimento camera regolabile** (0-100%), con default a 0 se il sistema chiede
    `prefers-reduced-motion`. Era obbligatorio: chi soffre di motion sickness non poteva giocare.
    A zero la camera non si muove per NIENTE, non "si muove meno" — è il punto della funzione, ed è
    fissato da un test.
  - **L'anello di cast nemico ora dice COSA arriva e QUANTO manca.** Era un cerchio dorato che si
    accendeva e spegneva: comunicava che stava succedendo qualcosa, mai cosa né entro quando —
    quindi interromperlo non era un'abilità, era fortuna. Ora prende il colore dell'elemento e si
    stringe da pieno a nucleo mentre il windup si risolve, schiarendo nell'ultimo quarto. Le
    abilità istantanee restano APERTE invece di ricevere un finto conto alla rovescia che le
    farebbe leggere tutte come "sta per colpire". Zero stato nuovo: il tick d'inizio si ricava dal
    windup dell'abilità stessa.
  - Per farlo ho dovuto estrarre `render/remote-nameplate.ts`: `remote-players.ts` era ESATTAMENTE
    sul limite duro di 800 righe, quindi non ci si poteva aggiungere niente. Ora è a 711.
  - Test 438 → 492. Undici commit, CI verde su ognuno.
  - **NON fatto stanotte, e perché**: IA dei bot (B8/B9 del backlog) — richiede di estrarre l'host
    dei bot da `GameRoom.ts`, che è al suo tetto di 1927 righe: è chirurgia sul file più delicato
    del server e non la volevo fare alle 5 del mattino senza nessuno che potesse guardare. I bot
    intanto NON sono stupidi come sembrava: hanno già strafe orbitale, cambio arma per distanza,
    ritirata a HP bassi, schivata sul cast nemico e reazione alla parata (`BotController.ts`).

### 2026-08-13 — Ogni spell adesso si VEDE prima di lanciarla (00_truth.md §10 passo 7)

- **Il punto è la tua richiesta centrale**: "devi capire come castare le spell, come visualizzarle,
  un sistema semplice ma efficace, che ti fa capire dove andrà la spell visivamente, cosa farà".
- **Com'era davvero**: 46 abilità su 53 non mostravano NIENTE. `isDirectCast` mandava tutto ciò che
  non era `point` dritto a un cast alla cieca. Le 8 abilità di movimento non avevano alcuna
  anteprima: un blink da 6 m era un tiro di dadi su dove saresti finito.
- **Cosa ho fatto**: la forma di un'abilità adesso è un VALORE, non aritmetica sparsa dentro il
  server. `shared/abilities/aim.ts` prende l'AbilityDef più la mira e restituisce le forme —
  corsia, cerchio, muro, fantasma del dash. Il client le disegna e il server risolve sugli stessi
  numeri: un'anteprima che si scosta dall'hitbox insegna una bugia, e l'unica difesa vera è che
  esista una formula sola. `isCapsuleBlocked2D` è passata in `shared`, così il fantasma del dash
  campiona gli stessi passi da 0.25 m del corpo e si ferma esattamente dove si fermerà lui.
- **Il comando è cambiato, ed è la parte che devi provare tu**: premi il tasto → vedi la forma;
  rilasci → lancia, con la mira che avevi al RILASCIO. Un tap resta un tap (premi e rilasci a un
  paio di frame di distanza, quindi la velocità è quella di prima). Tenere premuto ti compra tempo
  di mira, pagandolo col tuo stesso tempo. È lo standard dei giochi che citi, non una mia invenzione.
  M1 conferma lo stesso, M2/Esc annulla. **Se questo non ti piace, si torna indietro in un commit:
  è una scelta di FEEL e resta tua.**
- **`isDirectCast` è stato eliminato ovunque** — dispatcher, loadout station, test. Nominava un
  concetto che non esiste più.
- **Prova renderizzata, non solo test**: `tools/verify/aimpreview.mjs` tiene premuto ogni tasto e
  legge sia l'output del solver sia il framebuffer. 8/8 col mago e 8/8 con l'ibrido (tutti e tre i
  tipi di dash), con l'estremità di ogni corsia che proietta a NDC (0.000, 0.000) — il mirino esatto.
- **Due errori miei, tenuti a verbale perché costano ogni volta**:
  1. La prima corsia disegnava il volume VERO — un tubo conico dalla bocca dell'arma. Corretto e
     inguardabile: la corsia parte dalla telecamera, quindi guardavi dentro un cono di 30 m dal suo
     vertice, ~60° di schermo pieno. La larghezza è finita nell'anello sul punto d'impatto, dove è
     piccola e dove stai già guardando.
  2. L'harness ha dichiarato rotta una feature funzionante per cinque run. Sotto SwiftShader il
     render loop gira a **1-4 fps**: aspettare 220 ms vuol dire aspettare circa zero frame, e stavo
     leggendo un'anteprima non ancora calcolata. Adesso aspetta un contatore di frame.
     **Mai più misurare questo renderer a orologio.**
- Gate verde: typecheck, lint, budget (3 tetti abbassati), content, 528 test.

### 2026-08-13 — L'arena ha finalmente un bordo, e la velocità un tetto che si merita (passi 8 di §10)

- **D20 — l'arena non aveva confini.** Nessun muro nella simulazione, nessun clamp, `groundY` un
  piano infinito: uscivi dal colosseo e continuavi a camminare per sempre sul nulla. Adesso il
  confine è un RAGGIO (24.5 m), non quattro muri quadrati — l'arena è rotonda, e un perimetro
  quadrato o taglia gli angoli della sabbia o ti lascia stare fuori dal muro sulle diagonali. Il
  numero è derivato dall'ARTE che già c'è (shell ×1.5, muro interno a 16.7 → 25.05; sabbia a
  24.75), perché un confine che non vedi sembra un bug. Viene tolta solo la componente di velocità
  VERSO il muro, così ci corri lungo invece di restarci incollato.
- **Dare un bordo all'arena ha scoperto un difetto che il bordo mancante nascondeva**: la mappa FFA
  non ci stava dentro il proprio edificio. Le piattaforme d'angolo arrivavano a r = 27.4 —
  sospese sul vuoto oltre la sabbia — e 4 spawn su 10 stavano a r = 24.6-28.7, cioè giocatori che
  nascevano FUORI dal colosseo. Ho stretto lo spread FFA 1.45 → 1.27 e messo gli spawn su un ANELLO
  (angolo + raggio) invece di dieci coordinate scritte a mano senza regola. **Sono due scelte di
  SPAZIATURA e restano tue: si tornano indietro in un commit**, oppure si allarga il colosseo
  alzando shell scale e raggio insieme.
- **D18 — il tetto della velocità in aria: 11.7 → 14.5 m/s.** Era 1.30× i 9 m/s base: TUTTO il
  soffitto di abilità del movimento era +30%, in un gioco il cui secondo pilastro è "il movimento è
  il soffitto di abilità", contro Quake 3 che non ha tetto. **Misurato, non scelto**: simulando il
  controller vero su catene di strafe-jump, 14.50 si tocca esatto al quinto salto con una virata
  stretta, e 11.06 con una virata sciatta. Cioè la tecnica adesso vale **+3.44 m/s**; prima la
  virata sciatta saturava già il tetto e sopra "sufficiente" non c'era niente a cui puntare.
  NON ho usato il "soft cap a 18 che perde 2 m/s al secondo" che gira in rete: simulato, non
  converge (20.59 m/s a 5 salti, 31.03 a 20 e ancora in salita).
- **Prova end-to-end, non solo unit test**: `tools/verify/bounds.mjs` entra in una partita vera e
  tiene una direzione per 12 s (oltre quattro raggi d'arena) in tutte e quattro le direzioni. Le due
  che arrivano al muro si fermano a 24.10 m esatti, e la posizione PREDETTA dal client è uguale a
  quella del server al centimetro. Quell'uguaglianza è la vera affermazione: un confine che il
  client non predice non è un muro, è un elastico — e in fotografia sono identici.
- `tools/verify/feel.mjs` adesso stampa anche tetto in aria, catena di strafe sciatta vs stretta,
  quanto vale la tecnica e il raggio dell'arena.
- Estrazioni per stare nei tetti di riga (mai alzati, solo abbassati): `server/sim/displacement.ts`
  (GameRoom aveva una copia privata del loop del dash — ora chiama lo STESSO solver condiviso che
  disegna il fantasma, quindi anteprima e corpo non possono più divergere) e
  `client/verify-seams.ts`. Tre tetti abbassati.
- Gate verde: typecheck, lint, budget, content, 550 test.

### 2026-08-13 — Il TTK: il documento mentiva, non il gioco (passo 9 di §10)

- **La cosa più importante da capire**: `TTK_MIN_SEC = 20` / `TTK_MAX_SEC = 30` stavano lì da
  sempre col commento "tutti i valori di danno/CD/costo sono tarati su questo". **Era falso**: il
  registry uccide in circa sei secondi. E nessuno importava quelle due costanti — erano
  documentazione travestita da codice, quindi sbagliare di 3-5× non costava niente e nessuno se ne
  accorgeva. **Il documento è cambiato, non la tabella dei danni.**
- Un rescale ×3 dei danni era la tentazione ovvia ed è stato RIFIUTATO: cure (50, 60) e scudi
  (`stacks: 20`) sono numeri piatti fuori da qualsiasi moltiplicatore, quindi triplicare i danni non
  conserva il bilanciamento — cancella le cure.
- **Adesso il TTK si MISURA** (`shared/config/ttk.ts`) e un test fallisce se il roster esce dalla
  banda 6-9 s. Per avere un numero onesto ho dovuto correggere prima il modello: sommare DPS delle
  abilità e DPS dell'arma al 100% presuppone che tu lanci tutto E meni di continuo negli stessi
  secondi — sono due giocatori, non una rotazione, e leggeva ~25% più veloce del reale. Ora ogni
  abilità paga il proprio tempo di cast e l'arma riempie solo quello che resta.
  Risultato: tank 6.53 / arciere 6.31 / mago 7.88 / ibrido 6.63 s. **Tutti dentro.**
- **Tetto ai cooldown 12 s**: 24 abilità lo superavano, fino a 22 s. A TTK 6-9 s un cooldown da 22 s
  parte una volta ogni TRE scontri, quindi una build a sei slot ne esprimeva due o tre e il resto
  era arredamento. La coda sopra 8 s è COMPRESSA nel tetto, non tagliata di netto, così l'ordine
  relativo sopravvive invece di far diventare 24 abilità identiche a 12. Mediana 12 → 9.
  Curiosità utile: **non ha accorciato il TTK**, perché più uptime = più tempo a lanciare = meno
  tempo a menare.
- **Banda finisher 40-55**, ordinata per IMPEGNO (windup + cooldown), non cinque numeri uguali.
- **`fireball` è il caso che insegna qualcosa**: portato a 40 rispettava la lettera della banda e ne
  rompeva la ragione. Senza windup e con 5 s di cooldown diventava il bottone col DPS più alto del
  gioco (7.55), presente in 3 build preset su 4, e buttava arciere e ibrido fuori dal fondo della
  banda TTK. La banda è un tetto di CONVERSIONE (la punizione dopo il lancio in aria), quindi il
  danno dentro la banda si paga con l'impegno: cooldown 5 → 8.5. Un test adesso impone l'ordine —
  chi picchia più forte deve impegnarsi di più.
- **Condizioni di vittoria ri-derivate**: FFA 40 → 45, squadre 75 → 150, con il modello scritto nero
  su bianco (`TTK + avvicinamento + respawn`: vecchio 40 s, nuovo 19 s). **Il numero delle squadre è
  quello debole** — dipende da quanti dei 5 stanno combattendo davvero, e lo dice solo il playtest.
  Nota: col vecchio ciclo, 40 kill FFA erano una partita da 27 minuti, quindi il "partite da 15
  minuti" di `07_modes.md` era già sbagliato PRIMA della correzione del TTK.
- Corretti i quattro punti che citavano il numero vecchio come autorità (`weapons.ts`, `stats.ts`,
  `05_abilities_philosophy.md`, `01_combat_fundamentals.md`) incluso il suo dato sbagliato
  ("Sword M1 a 17.5 DPS" contro i 15.0 delle costanti).
- Due test del server smettono di incollare numeri di bilanciamento: leggono dal registry, così una
  passata di bilanciamento non rompe più test che non parlano di bilanciamento.
- `tools/verify/ttk.mjs` stampa la tabella completa. Gate verde: 559 test.

### 2026-08-13 — Le specializzazioni: il terzo asse della build (passo 10 di §10)

- **Le tue parole**: "ti scegli una build tra varie combo di classe, abilità o specializzazioni".
  Di quelle tre ne erano spedite due. Questa è la terza, e prima non esisteva NIENTE: né codice, né
  schema, né documento.
- **Prima di ricostruirla ho studiato quella cancellata**, come diceva il piano. C'era un sistema
  Mastery (`03_mastery_system.md`, cancellato nel commit `6a7839a`): si attivava se 4 delle tue 5
  slot magiche condividevano l'elemento. **È morto perché era DEDOTTO, non scelto**: nessuno
  sceglieva una Mastery, te la ritrovavi — o scoprivi di averla persa prendendo la spell che
  volevi. Non esprimeva una decisione, tassava chi mescolava gli elementi. Per questo la prima
  regola del sostituto è che si SCEGLIE, nella Forge, accanto alle carte classe.
- **12 specializzazioni, 4 archetipi, 3 per classe.** Ognuna ha un bonus E un costo, tutti e due
  scritti sulla carta. Validate lato server come il resto della build e RIFIUTATE con una ragione,
  non scartate in silenzio: una build corretta di nascosto è una build che scopri in arena.
- **Nessuna tocca il danno, e il vincolo ha migliorato il design.** Il test della banda TTK gira sul
  registry base, quindi una spec da +15% danno gli sarebbe passata sotto il naso spingendo
  l'arciere fuori dal fondo della banda 6-9 s — annullando in silenzio il lavoro di ieri. Quel che
  resta è più interessante: durata del lancio in aria, cooldown, velocità, vita. "I tuoi lanci in
  aria durano il 25% in più" è una decisione di build più bella di "+15% danno", e punta al momento
  che dà identità al gioco invece che altrove.
- Due dettagli tecnici che tengo a verbale: il moltiplicatore di airtime si legge dal LANCIATORE,
  non dalla vittima ("i TUOI lanci durano di più" è una proprietà di chi lancia); e il modificatore
  di velocità entra in `slowFraction` da UNA funzione condivisa che il server usa per l'autorità e
  il client per la predizione — due copie di quella riga sono un elastico permanente in attesa che
  qualcuno ne modifichi una sola.
- **Prova end-to-end** (`tools/verify/spec.mjs`): apre la Forge, legge le carte, ne clicca una,
  entra in partita e confronta la vita che **il server ha dato** con quella calcolata — 168 per un
  mago Baluardo, su 150 di base. Una specializzazione che vive solo in un registry non è una
  feature. Screenshot in `.verify/spec-forge.png`.
- Il layout è stato sbagliato al primo colpo: la riga finiva dentro la colonna della vitals e le
  quattro carte si schiacciavano in una fettina illeggibile. L'ho visto perché la prova è
  renderizzata, non perché un test è passato.
- **Estrazioni per stare nei tetti** (mai alzati, tre abbassati): `rooms/loadout-validate.ts` —
  `handleLoadoutSet` erano 155 righe di cui 119 di validazione intrecciata con gli avvisi al client,
  quindi non testabile senza una stanza, un client e un socket; ora è una funzione pura.
  Poi `sim/target-selection.ts` e `client/game/movement-caps.ts`.
- Ritirato il divieto in `06_loadout_build.md` che vietava esattamente questo (restano i divieti su
  slot extra e trasferimento risorse), scritto `01_DESIGN/08_specializations.md`, registrato nel
  MANIFEST, cancellato l'artefatto morto `dist/constants/mastery.*`.
- Gate verde: 572 test.

## 7. Metodo di lavoro (professionale)

1. Leggere QUESTO file all'inizio. 2. Lavorare le fasi del piano in ordine, niente sparse.
2. Verificare headless ogni cambio visibile. 4. Gate verde prima di ogni commit su `main`.
3. Aggiornare questo file + il log a ogni cambiamento/feedback. 6. Sul feedback dell'utente:
   **modificare** il piano qui, non ricominciare.
