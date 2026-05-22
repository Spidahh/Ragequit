# RAGEQUIT Agent Rules

These rules are mandatory for any AI/coding agent working on this repository.

---

## FATTI STABILITI — Leggi prima di fare QUALSIASI domanda o assunzione

Questa sezione va letta prima di tutto il resto. Contiene fatti già decisi e verificati. Non riaprirli, non richiederli all'utente, non assumere il contrario.

### Deploy — già online, non suggerire di farlo

- **Server**: Fly.io, app `ragequit-server`, regione `ams` (Amsterdam), porta 8080. `fly.toml` esiste nella root. **Il server è già deployato.** Non dire all'utente di fare il deploy o di scegliere una piattaforma.
- **Supabase**: URL e service key già configurati come Fly secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). Non chiederli all'utente. Non dire di configurarli.
- **Client**: Cloudflare Pages come target di deploy. `apps/web/` è la build output.

### Asset — già esistono, non chiedere se ci sono

- `packages/client/public/ui/ragequit-logo-full.png` — **ESISTE**
- `packages/client/public/ui/ragequit-logo-small.png` — **ESISTE**
- `packages/client/public/icons-sprite.svg` — **ESISTE**
- `packages/client/public/graphic-redesign.css` — **ESISTE** ed è importato da
  `packages/client/public/game-ui.css`; senza quell'override logo/menu/loadout
  tornano alle dimensioni CSS legacy.
- Il logo è già usato in `index.html`: `<img src="/ui/ragequit-logo-full.png" alt="RAGEQUIT">`

### Stato visivo — non è placeholder/bianco

- `index.html` ha un design system completo: sfondo `#0a0a10`, accent gold `#ffd260`. **Nessun bottone bianco, nessun placeholder.**
- Il menu principale ha logo, tagline "PvP arena combat", griglia bottoni, colori dark. Non è uno schermo bianco vuoto.
- Le icone degli slot abilità nella wheel/hotbar usano **emoji di sistema** (`⚔ 🏹 ✦ ⚡`) — non sono ancora icone SVG custom.
- Lo scoreboard post-partita è minimale (punteggio win/loss + tasto back) — nessuna statistica dettagliata è implementata.
- Il canvas del menu (`#bg-canvas`) può essere vuoto/scuro — non c'è una scena 3D live nel menu principale al momento.

### Decisioni di game design FINALI — non riaprirle

- **Arena FPS attivo** — quando c'è dubbio sul feel, studiare riferimenti come
  Quake 3 e Darkfall prima di introdurre blocchi rigidi o combat passivo.
- **Fall damage = 0 sempre** e **self-damage dalle proprie abilità = 0**. Spell e
  proiettili propri possono diventare movement tech.
- **Tutte le armi devono poter agire in aria.** Non reintrodurre il blocco
  "solo Bow airborne".
- **Air combat interattivo** — knockup e juggle non devono togliere per
  assunzione tutte le armi, ability o risposte al bersaglio lanciato. Il
  contratto target e in `01_DESIGN/01_arena_fps_reference_study.md`: airborne
  non e hard CC e l'impulso va validato server-side.
- **Parry/protezione visibile** — quando M2 protegge deve esserci uno scudo
  leggibile sul personaggio.
- **Nessuna abilità passiva, nessun slot passivo, nessun sistema rune.** Non reintrodurli mai.
- **Classi confermate**: Tank, Arciere, Mago, Ibrido. Slot, risorse, armi e
  meccanica classe devono rendere il gameplay davvero diverso.
- **Sprint è il movimento base** — non è un toggle, non costa Stamina di default.
- **Transfer/sustain target chiuso.** Il vecchio pacchetto dei 3 transfer fissi
  è runtime ereditato. Il target li rimuove e mette il self-sustain in Recovery
  utility legali per classe e magic sustain che paga slot/costo/counterplay.
  Leggere `01_DESIGN/04_resource_sustain_study.md` prima di cambiare
  heal/utility/HUD.
- **Recovery target per classe**: Tank `Brace Recovery`, Arciere
  `Hunter's Flow`, Mago `Arcane Rebind`, Ibrido `Adaptive Mend`. Le starter
  build class-aware in `01_DESIGN/06_loadout_build.md` includono sempre una
  Recovery.
- **La wheel è una palette di selezione**: hold → seleziona → rilascia per primare → LMB per sparare. Non è un launcher diretto.
- **Zero RNG nell'output delle abilità** — tutto è deterministico. Nessun "chance to proc".
- **Sangue rosso `#FF3344`** su tutti i colpi fisici, mai miscelato con i colori degli elementi.
- **TTK target: 20-30s in partita reale** (con difesa attiva), non il minimo teorico (~11s sword M1).
- **La vecchia Mastery 4/5 non è più l'asse target.** Il redesign classi la
  supera; il runtime corrente la contiene ancora finché abilities/loadout non
  vengono rifatti.

### Decisioni di design strategiche stabilite (2026-05-22)

Le seguenti sono decisioni documentate nei design docs. Non riaprirle, non trattarle come opzionali.

- **Post-match scoreboard** deve essere ricalibrato sul redesign classi e sul
  sistema finale di sustain; il live attuale mostra solo win/loss.
- **Knockup combo feedback** resta importante, ma il vecchio airborne lockout non
  è più target. Feedback e stats vanno aggiornati insieme all'air-combat pass.
- **`#bg-canvas` deve sempre rendere una scena arena** (non nero/vuoto). Se l'asset GLB non carica, usare fallback procedurale. Un canvas nero = prodotto abbandonato.
- **Loadout Station: Starter Build pre-caricato** per nuovi giocatori (nessun
  build in localStorage). Le build target sono per classe in
  `06_loadout_build.md`; il runtime classless conserva ancora lo snapshot
  legacy.
- **Loadout salvato class-aware**: se una build locale legacy o di altra classe
  non rispetta legalità, duplicati o budget slot della classe attiva, il client
  deve ricadere sullo Starter Build di quella classe prima del send al server.
  Il server applica la stessa grammatica al loadout persistito in join e ricade
  sul default Ibrido se il salvataggio non permette un'inferenza valida.
- **Master bot in Training deve eseguire knockup → follow-up combo**. Novice: solo M1. Competent: abilità ma no combo. Master: KNOCKUP → instant follow-up nella finestra aerea. Spec completa in `07_modes.md`.
- **Training deve mostrare end-screen stats** anche senza auth: time alive, damage dealt/taken, knockup conversions, parry successes, abilities used.

### Cosa è LIVE nel codice vs DESIGN TARGET (non ancora implementato)

**LIVE:**

- 52 abilità data-driven (6 melee, 8 bow, 27 magic, 11 utility)
- Finisher +25% damage vs airborne — `AIR_PUNISH_DAMAGE_MULT = 1.25` in `AbilityEngine.ts`
- **Bleed.cleansedByTransmute = false** (Pass 4: bleed cleanse è ora Cleanse Surge, non transmute)
- `ABILITY_D2_CURSE_OF_WEAKNESS.comboRole = 'starter'` (non `'drain'`)
- Marksman Shot: 500 m/s, damage 38, zero gravità
- Smoke Screen: radius 3.5m, range 8m, blind 1.1s ogni 0.5s, durata zona 3.5s
- Mark Target: range 30m, id interno `ping_mark`, draina 12 Stamina dal **target**
- Healing Potion: nome "Healing Potion" (non "Self-Heal Potion"), cura 40 HP incondizionatamente
- **Pass 3 ✅**: normalizeLoadoutSlots non inietta più transfer fissi; starter builds per classe in `loadout-station.ts` e server DEFAULT_LOADOUT sono gli Ibrido/class starters con Recovery
- **Pass 4 ✅**: Wire protocol class-aware envelope (`melee[]/bow[]/magicBase[]/magicAdvanced[]/utility[]`); transfer abilities rimossi da ABILITY_LEGAL_CLASSES; Build Coach usa Recovery check invece di Mastery
- **177 test green** (15 client, 92 shared, 70 server) — stato post Pass 3+4

**DESIGN TARGET — non nel codice:**

- Supabase auth/JWT verification e DB-backed persistence
- Class mechanics runtime: Fury (Tank), Momentum (Arciere), Risonanza (Mago), Flow (Ibrido) — Pass 5
- Sword M1 redesign: miss resetta combo e basic attacks non devono superare le
  abilities come output dominante
- HUD class-aware + Loadout UI redesign — Pass 6
- Healing Potion: pausa stationary (attualmente cura sempre, senza controllare il movimento)
- Training: 3 livelli di difficoltà
- Starter unlock set (nuovi account sblocano abilità progressivamente)

### File chiave — non cercarli, sono questi

- `packages/shared/src/abilities/registry.ts` — **unica fonte autorativa** per tutti i numeri/comportamenti delle abilità. I design docs sono snapshot, il registry comanda.
- `packages/server/src/sim/AbilityEngine.ts` — effect chain dichiarativa server
- `packages/server/src/rooms/GameRoom.ts` — Colyseus room
- `packages/client/index.html` — 4525 linee, design system completo dark/gold
- `packages/client/src/main.ts` — bootstrap client principale
- `01_DESIGN/99_resolved_ambiguities.md` — **36 decisioni di design risolte** — leggerlo prima di fare domande di design evita di re-aprire problemi già chiusi
- `01_DESIGN/15_visual_strategy.md` — master design system visivo (supera `09_visual.md`)

### Regola di aggiornamento

**Ogni volta che un'AI apprende, corregge, o stabilisce un fatto nuovo su questo progetto, deve aggiornare questa sezione di AGENTS.md.** Non lasciare mai una scoperta solo nella conversazione — va scritta qui. Stessa regola per il file di memoria a `memory/project_ragequit.md`.

---

## Read Before Editing

Before changing gameplay, UI, VFX, input, loadout, networking, or docs, read:

- `02_TECH/10_deploy_status.md` — **PRIMO** — stato deploy live, Supabase, asset esistenti. Evita di chiedere o re-fare cose già fatte.
- `GAME_SYSTEM_MODEL.md`
- `REDESIGN_MASTER_PLAN.md`
- `README.md`
- `ROADMAP.md`
- `01_DESIGN/README.md`
- `01_DESIGN/01_controls.md`
- `01_DESIGN/01_arena_fps_reference_study.md`
- `01_DESIGN/00_classes.md`
- `01_DESIGN/04_transmutation.md`
- `01_DESIGN/04_resource_sustain_study.md`
- `01_DESIGN/05_abilities_philosophy.md`
- `01_DESIGN/05_ability_redesign_plan.md`
- `01_DESIGN/05_ability_target_roster_pass1.md`
- `01_DESIGN/05_abilities_melee.md`
- `01_DESIGN/05_abilities_bow.md`
- `01_DESIGN/05_abilities_magic.md`
- `01_DESIGN/05_abilities_utility.md`
- `01_DESIGN/06_loadout_build.md`
- `01_DESIGN/09_visual.md`
- `01_DESIGN/11_ui_redesign_plan.md`
- `GAME_GRAPHIC_AUDIT.md`
- `VISUAL_STRATEGY.md`
- `01_DESIGN/15_visual_strategy.md`
- `01_DESIGN/14_visual_redesign_system.md`
- `01_DESIGN/13_graphic_redesign_blueprint.md`
- `02_TECH/05_input_contract.md`
- `02_TECH/06_visual_performance_contract.md`
- `02_TECH/11_redesign_runtime_migration_plan.md`

## Non-Negotiable Game Rules

- The game is a browser PvP arena with authoritative multiplayer in mind. Do not add mechanics that only work locally or rely on client trust.
- There are no passive abilities, passive slots, runes, rune systems, or passive mechanics. Do not reintroduce them.
- Transfer/sustain changes must follow `01_DESIGN/04_resource_sustain_study.md`.
  Target fixed transfers are removed; do not preserve their slots by inertia or
  add a universal replacement transfer outside loadout pressure.
- The ability wheel and utility wheel are selection palettes, not launchers:
  - Hold the wheel key to open.
  - Move the mouse to select a sector.
  - Release the wheel key to prime that ability/utility.
  - LMB fires or confirms the primed action toward the current crosshair/preview.
  - Direct hotkeys still cast immediately when intended by their cast mode.
- Placement abilities must show a preview first unless they are explicitly configured as instant cast.
- Ability descriptions must be player-facing: explain what the ability does, what state it applies, and what it costs. Do not write comparison notes, internal suggestions, or design commentary inside ability descriptions.
- The Loadout Station must be redesigned around classes, class slot grammar,
  Magic Base / Magic Advanced, cleaned player-facing descriptions and visible
  cast modes. Preserve live safety while replacing the old mastery/fixed-transfer
  assumptions.

## Visual / UI Rules

- **Strict Aesthetic Alignment**: Follow the graphic references in `E:\GIOCHI\ASSET_GRAFICA\esempio` (specifically [esempio1.png](file:///E:/GIOCHI/ASSET_GRAFICA/esempio/esempio1.png), [esempio2.png](file:///E:/GIOCHI/ASSET_GRAFICA/esempio/esempio2.png), and [esempio3.png](file:///E:/GIOCHI/ASSET_GRAFICA/esempio/esempio3.png)) as the absolute visual anchor for the game's low-poly models, lighting, scene aesthetic, and UI harmony. Any AI agent choosing, importing, or editing graphics must conform to this style.
- Follow `GAME_GRAPHIC_AUDIT.md`, `VISUAL_STRATEGY.md`, `01_DESIGN/09_visual.md`, `01_DESIGN/13_graphic_redesign_blueprint.md`, and `02_TECH/06_visual_performance_contract.md`.
- Visual direction is low-poly stylized action with clear silhouettes and saturated element VFX.
- Use the project palette:
  - UI panel: `#0F111A` around 85% opacity
  - Accent/active: `#FFD260`
  - HP: `#FF3344`
  - Mana: `#00D0FF`
  - Stamina: `#00FF88`
  - Fire: `#FF4500`
  - Ice: `#00E5FF`
  - Lightning: `#FFE600`
  - Dark: `#6A0DAD`
  - Nature: `#39FF14`
- Resource HUD bars are flat rectangles, draggable and resizable. Do not use skew/trapezoid styling for resource bars.
- Weapon strip uses readable 60x60-style slots, clear active state, and must not overlap the hotbar.
- Avoid HTML-page-looking menus. Menus, loadout, pause, and settings must feel like game UI.
- Follow `01_DESIGN/11_ui_redesign_plan.md` before adding, moving, or redesigning HUD/menu/loadout surfaces.
- Do not add persistent center-screen HUD panels for explanations. Reuse hotbar, crosshair, castbar, status, or menu surfaces; if a new HUD layer is unavoidable, first remove or consolidate an existing layer and document why.
- Prefer subtraction and consolidation over adding more UI. The live combat view must stay clear enough for aim, projectiles, VFX, and enemy silhouettes to remain dominant.
- Prefer `transform` and `opacity` animations. Avoid long-running animation of `filter`, `border-color`, heavy `box-shadow`, or large `backdrop-filter` blur.
- Use cheap materials for projectiles, previews, zone walls, and short-lived VFX. Do not add heavier lit materials unless they clearly improve gameplay readability.

## Input / Combat Safety

- Do not casually edit pointer lock, keyboard capture, mouse capture, weapon swap, LMB/RMB, wheel, or first-person aiming logic.
- If touching input, read `02_TECH/05_input_contract.md` first and verify in browser.
- Preserve first-person staff/bow/spell aiming: projectiles and previews must align with the crosshair, not spawn from above the player head.
- Combat changes must consider multiplayer authority, prediction, and server validation.

## Verification

For client/UI/combat changes, run at minimum:

- `pnpm --filter @ragequit/client test`
- `pnpm --filter @ragequit/client build`
- `pnpm lint`

When the change affects the playable browser client, also smoke test locally in the browser:

- Main menu opens with no console errors.
- Training can be entered.
- Mouse/keyboard input works after click/pointer lock.
- LMB/RMB, Tab/weapon swap, wheel keys, and hotbar still behave correctly for the touched area.
- HUD, hotbar, weapon strip, and previews do not overlap incoherently.

## Documentation

- If code changes gameplay, controls, UI contracts, ability semantics, visual rules, or architecture, update the matching docs in the same work pass.
- Do not leave docs describing old bootstrap/prototype behavior when the code already implements a later state.
- Keep local scratch notes out of commits unless they are intentionally promoted into project docs.
