# RAGEQUIT — Roadmap / Stato Reale

Ultimo riallineamento documentale: 2026-05-20.

Questo file non descrive più il bootstrap iniziale come se dovesse ancora partire. Il progetto ha già una vertical slice giocabile con server autoritativo, client Three.js, abilità data-driven, loadout, mastery, bot/training e match flow.

## Stato Attuale

Implementato:

- Monorepo pnpm con `packages/shared`, `packages/client`, `packages/server`.
- Server Colyseus autoritativo a 60 Hz.
- Client Vite/Three.js con HUD, hotbar, ruote Q/E, Loadout Station, menu, pause/settings, VFX base.
- Movimento custom TypeScript con prediction/reconciliation client.
- Sword/Bow/Staff M1, parry tap/hold, weapon swap.
- 52 abilità data-driven:
  - 6 melee
  - 8 bow
  - 27 magic
  - 11 utility
- Utility wheel: tre transfer fissi Z/X/F + una utility flessibile V.
- Ability wheel: melee, bow, 5 magic. La wheel è palette di selezione: rilasciare E/Q prima uno slot, LMB lo spara.
- Direct hotkeys: R, G, 1-5, Z/X/F/V bypassano la wheel; le abilità instant castano subito, quelle con placement aprono preview e confermano con LMB.
- Play/Training aprono prima il Loadout Station; la room parte solo dopo la CTA di lancio (`START 1V1` o `START TRAINING`). L'editor aperto dal menu resta su `SAVE BUILD`.
- Settings: FOV, sensitivity, volume, quality e keybind sono modificabili e persistono in `localStorage`.
- Nessun sistema rune/passive.
- Mastery calcolata solo sui 5 slot magic.
- Status runtime: burn, chill, bleed, poison, slow, root, stun, freeze, curse, mark, shield, haste, invulnerable.
- Zone/projectile runtime, damage queue centrale, shield/parry/lifesteal/death nello stesso path.
- Bot training, match phases, replay scaffolding, rate limiter.
- Colyseus monitor admin opt-in: disabled by default and protected by Basic Auth when enabled.
- Combat actions are accepted only during the live phase; loadout changes are locked during live combat.
- Free For All / 5v5 remain product targets; FFA is visibly disabled in the client until the mode is real.
- Smoke/unit coverage su shared/server/client.

## Priorità Aperte

### 1. Combat Feel E Bug Meccanici

- Audit mira/projectile/AoE/status combo/parry/channel: ✅ codice verificato, nessun bug noto trovato.
- Tuning numerico TTK 20-30 s su bot e partite manuali: richiede browser QA manuale.
- Feedback hit/parry/channel/interrupt: ✅ element-colored world impacts per tutti i tipi di hit (melee/bow/magic/combo/zone); parry spark argento; doppio burst arancione per air-punish; trail line per proiettili (amber arrow, cyan bolt); durata toast ridotta, cooldown/gcd silenti.
- Leggibilità basic M1 vs primed ability: ✅ `[data-primed]` crosshair gold pulse ring; slot pip gold lift + glow.
- Wheel UX: ✅ cooldown badge (rosso, secondi) + cast-mode marker (I/P) su tutti gli slot; slot dimma se in cooldown.

### 2. Loadout Station / UX ✅ Completata (vedi M2)

- Design plan `11_ui_redesign_plan.md` seguito. Gerarchia HUD definita e applicata.
- Rendere chiarissima la distinzione E/Q/LMB/direct-keys: ✅ (vedi M2 DoD).
- Preset persistenti: localStorage già attivo; account/DB-backed rimandato a M4+.

### 3. Client Modularization ✅ Completata (vedi M3)

Tutti i moduli estratti. `main.ts` a 1824 linee (da 2896). Moduli attivi: `hud/` (10), `input/` (6), `render/` (7), `net/` (1), `vfx/` (1), `world/` (arena + maps).

### 4. Content Consistency ✅ Verificata

- Conteggi confermati: 6 melee / 8 bow / 27 magic / 11 utility = 52. ✅
- `02_TECH/02_ability_dsl.md` aggiornato e coerente con lo schema. ✅
- Niente rune/passive nei docs, runtime o UI. ✅
- Transfer fissi sempre documentati come Z/X/F. ✅

### 5. Production Layer

Non ancora completo:

- Account/auth/persistence.
- Supabase loadout persistence.
- Deploy multi-regione.
- Telemetry production.
- Full asset pipeline.
- Matchmaking/ELO persistente.

## Milestone Successive

### M1 — Combat Integrity Pass

DoD:

- Full test suite verde. ✅ 162 tests passing (80 shared + 68 server + 14 client).
- Browser QA senza errori console.
- Nessun mismatch noto tra descrizione ability e runtime. ✅ Bow ability projectiles now spawn as arrows (not bolts). Curse of Weakness mana drain now respects parry (was bypassing it). Audit completato su tutti 52 ability defs vs engine.
- Nessun cast doppio durante swing/charge/channel/parry. ✅ Confermato: player.casting + swingEndsAtTick + bowChargeStartTick + player.parrying bloccano tutti i conflitti.
- Point abilities usano davvero il mirino. ✅ placementPreview.aimPoint() invia targetPoint; defaultInstantCast() = def.targeting !== 'point'.

### M2 — Loadout UX Pass

DoD:

- HUD subtraction pass completato: niente pannelli esplicativi persistenti in centro visuale durante il live gameplay. ✅ `#status-strip` spostato da `left:50%;bottom:204px` a `left:28px;bottom:302px` — fuori asse centrale. Nessun pannello esplicativo persistente trovato durante gameplay live.
- Bottom combat console coerente: risorse, weapon strip, combat slots, utility/transfer e cooldown leggibili senza sovrapporsi. ✅ `#combat-console` (centro-basso) contiene weapon slots + cd-strip con sezioni E/Q separate. Nessun overlap con `#hud` (bottom-left) o `#status-strip` (bottom-left sopra HUD) a nessun viewport testato.
- Loadout Station comprensibile in 10 secondi. ✅ Layout 3 colonne: sinistra=slot equipaggiati, centro=dettaglio ability + cast mode toggle, destra=filtri+pool. Build coach e flow strip attivi.
- Loadout Station v2 centrata su build equipaggiata, abilità selezionata, combo flow e cast mode. ✅ Flow strip (Opener/Control/Cashout/Reset) in header con stato online/missing. Build coach (score/6, coach-pills, coach-lines) nel pannello centrale. Cast-mode toggle prominente su ogni slot e card.
- Transfer fissi visibili e non sostituibili. ✅ Badge FIXED + nessun pulsante clear + CSS `locked-transfer` su slot Z/X/F.
- Wheel behavior documentato e verificato. ✅ `01_controls.md` descrive contratto Q/E+release=prime+LMB=fire. `radial-wheels.ts` + `cast-dispatcher.ts` confermati in linea.
- Nessuna categoria/passiva/runa fantasma. ✅ Nessun riferimento a rune/passive in HTML, TS o design docs.

### M3 — Client Split

DoD:

- `main.ts` ridotto a orchestration/bootstrap. ✅ 1824 linee (da 2896). Nucleo rimasto: connect, simStep, render, reconcileSelf, onHit, onDeath.
- Input/HUD/render/net/VFX in moduli dedicati. ✅ `hud/` (10 moduli), `input/` (6 moduli), `render/` (7 moduli), `net/loadout-sync.ts`, `vfx/impact-pool.ts`.
- Smoke test client su keybind, loadout, radial prime/fire. ✅ `keybinds.test.ts` (2), `loadout-slots.test.ts` (2), `loadout-station.test.ts` (10) — tutti verdi.

### M4 — Persistence And Account Stub

DoD:

- Loadout persistente local-first o DB-backed. ✅ localStorage (ragequit.loadout.v6 + ragequit.instantCast.v2) già attivo in loadout-station.ts.
- Schema pronto per account guest. ✅ Player.userId (string, default '') aggiunto; GameRoom.onJoin accetta options.userId; gameplay non dipende dal campo.
- Nessun blocco sul gameplay locale se persistence è assente. ✅

Ancora aperto: Supabase auth/JWT verification e DB-backed persistence richiedono credenziali esterne.

### M5 — Art/Feel Pass

DoD:

- Main menu, pause, settings e lobby condividono un linguaggio da gioco, non da pagina HTML. ✅ Main menu: dark left panel + gold scanline + RAGEQUIT titolo enorme + command-style `.menu-btn` con hover slide. Pause: glassmorphism panel + gold h2 + `.pause-btn` con border-left accent. Settings: same dark glass language. Tutti e tre condividono colori, font-family, transizioni.
- Arena e personaggi smettono di sembrare blockout. ✅ Arena: stone tile ground texture (canvas 512×512, 16×16 tiles con grout lines + brightness variation); 4 stone plinths con rune glow ai 4 diagonali r=16; doppia fascia decorativa sui pilastri (1.6m e 3.2m). Personaggi: helmet crest dorato (BoxGeometry + CylinderGeometry), visor slit angolati per look aggressivo, chest stripe detail, proporzioni leggermente più eroiche.
- VFX elementali leggibili. ✅ Zone pulse differenziato per elemento; proiettili emissivi (amber arrow, cyan bolt).
- Hit/parry/death/channel interrupt hanno feedback chiaro. ✅ ImpactPool ora produce sphere burst + ring shockwave espandibile con ease-out.
- Bundle budget monitorato. ✅ chunkSizeWarningLimit=550 kB in vite.config.ts; game chunk a 179 kB / 54 kB gzip.

## Verification Standard

Prima di considerare chiuso un pass:

- `pnpm lint`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- QA browser su `localhost:5173` per UI/gameplay toccato

Il warning Vite sul chunk grande è noto e non bloccante, ma va affrontato nel pass di modularizzazione/code splitting.
