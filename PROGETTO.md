# PROGETTO — RAGEQUIT (fonte di verità unica)

> **REGOLA.** Questo è l'UNICO file-cervello del progetto. Si LEGGE all'inizio di ogni
> sessione e si AGGIORNA man mano. Quando l'utente dà un feedback, il piano qui dentro
> si **modifica** e si annota nel log — **non si butta via e non si ricomincia**.
> Niente modifiche sparse a caso: si lavorano le fasi del piano in ordine.

---

## 1. Cos'è il gioco

Arena PvP da browser, prima persona / mezza-terza, combattimento medievale-fantasy
(melee + magie). 4 classi: **tank, archer, mage, hybrid**. Three.js (client) +
Colyseus (server). Camera MISTA: spada = 3ª persona (corpo visibile), arco/staff = 1ª
persona (viewmodel) — vedi `render/weapon-view.ts`.

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

### 5B. OVERHAUL TOTALE DEGLI ASSET (la richiesta vera) — DA DEFINIRE

Sostituire TUTTA la grafica principale in un unico stile dark-gritty-realistico.
**In ricerca ora** (workflow `ragequit-art-overhaul-plan`): quali ecosistemi di asset
coerenti esistono davvero (gratis/a pagamento), per personaggi+arena+armi+props+VFX+UI,
integrabili in Three.js. Quando la ricerca finisce → qui va: lo style-bible, la decisione
di sourcing (gratis vs a pagamento vs asset forniti dall'utente), il manifesto asset,
l'ordine d'esecuzione. **L'unica domanda da sbloccare**: quale via per gli asset/budget.

## 6. LOG DECISIONI & FEEDBACK (cronologico — non perdere il contesto)

- **Regola**: niente branch, tutto su `main`. Niente modifiche a caso. Piano vivo, non si butta.
- L'utente vuole un gioco **tripla-A**, TUTTI gli asset cambiati, **stesso stile coerente**.
- **NO cartoon/tinteggiato** (KayKit scartato esplicitamente).
- **Atmosfera = secondaria**; la grafica principale (mesh/asset) è la priorità.
- Riferimenti = §4 (dark gritty realistico medievale-fantasy).
- Lamentela di metodo: smettere di ri-scoprire tutto e dimenticare → questo file +
  la memoria persistente sono la soluzione (vedi memoria `working-method-persistent-plan`).

## 7. Metodo di lavoro (professionale)

1. Leggere QUESTO file all'inizio. 2. Lavorare le fasi del piano in ordine, niente sparse.
2. Verificare headless ogni cambio visibile. 4. Gate verde prima di ogni commit su `main`.
3. Aggiornare questo file + il log a ogni cambiamento/feedback. 6. Sul feedback dell'utente:
   **modificare** il piano qui, non ricominciare.
