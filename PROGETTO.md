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

- **2026-06-12 — PIANO GRAFICA TOTALE (il PROCESSO che l'utente ha ripetuto, NON dettagli decisi da me).**
  ⛔ REGOLA dall'utente: **NON inventare i dettagli da solo, si decide INSIEME.** Le scelte di
  STILE e ASSET sono **sue**; io faccio analisi, propongo, eseguo. (Questo è il piano che mi ha
  scritto «20 volte»; ora è registrato — non va più ridetto.)
  **Obiettivo:** rifare **TUTTA** la grafica in **UNO stile coerente** — personaggi, arena, armi,
  braccia, props, VFX, HUD **e i MENU**. La camera/atmosfera è secondaria: il problema è mesh/asset/UI.
  **PROCESSO (la prossima sessione esegue QUESTO, in ordine, con l'utente che decide):**
  1. **ANALISI** completa della grafica attuale + di cosa è rotto (skin tutte uguali = frankenstein a
     layer; armi girate/scudo storto = grip a mano; braccia FP a caso; font menu su Arila; VFX piatte).
  2. **DECIDERE INSIEME LO STILE per TUTTO il gioco** (mondo 3D **e** menu/HUD) — **UNA via sola**.
     `STILE.md` esiste ma copre il 3D e l'ho deciso io → va **ri-validato con l'utente** ed esteso a
     menu/UI. Proporgli 2-3 vie concrete (con riferimenti), **lui sceglie UNA**.
  3. **STUDIARE `E:/GIOCHI/ASSET_GRAFICA` a fondo** (ha `_INVENTARIO.md`): elencare **SOLO** ciò che è
     **davvero utile e funzionale** allo stile scelto; scartare il resto (incluso il cartoon che odia).
  4. **SCARICARE il mancante FREE** online (Sketchfab/Quaternius/Mixamo/Poly Haven/ambientCG/font CC0).
  5. **INTEGRARE tutto coerente**, verificando (log+logica + l'utente guarda dal vivo).
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
