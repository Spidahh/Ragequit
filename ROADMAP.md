# RAGEQUIT — Roadmap / Stato Reale

Ultimo riallineamento documentale: 2026-05-22.

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
- Utility wheel runtime: tre transfer fissi Z/X/F + una utility flessibile V.
  Questo descrive la slice attuale, non il target sustain/utility dopo il
  redesign classi.
- Ability wheel: melee, bow, 5 magic. La wheel è palette di selezione: rilasciare E/Q prima uno slot, LMB lo spara.
- Direct hotkeys: R, G, 1-5, Z/X/F/V bypassano la wheel; le abilità instant castano subito, quelle con placement aprono preview e confermano con LMB.
- Play/Training aprono prima il Loadout Station; la room parte solo dopo la CTA di lancio (`START 1V1` o `START TRAINING`). L'editor aperto dal menu resta su `SAVE BUILD`.
- Settings: FOV, sensitivity, volume, quality e keybind sono modificabili e persistono in `localStorage`.
- Nessun sistema rune/passive.
- Mastery runtime calcolata solo sui 5 slot magic. Il target redesign la
  sostituisce con identita e bonus di classe.
- Status runtime: burn, chill, bleed, poison, slow, root, stun, freeze, curse, mark, shield, haste, invulnerable.
- Zone/projectile runtime, damage queue centrale, shield/parry/lifesteal/death nello stesso path.
- Bot training, match phases, replay scaffolding, rate limiter.
- Colyseus monitor admin opt-in: disabled by default and protected by Basic Auth when enabled.
- Combat actions are accepted only during the live phase; loadout changes are locked during live combat.
- Free For All has a menu/loadout launch path and kill-based runtime without bot fill; matchmaking/persistence polish is still deferred. 5v5 remains a product target.
- Smoke/unit coverage su shared/server/client.
- Visual document chain promoted and indexed: root `GAME_GRAPHIC_AUDIT.md` and `VISUAL_STRATEGY.md` point to the active audit, strategy, blueprint, UI and performance contracts.

## Priorità Aperte

### 0. Design Reset Confirmed

- Target combat feel is active arena FPS: Quake 3 / Darkfall are reference
  anchors when deciding movement, air combat and spell/weapon activity.
- Classes confirmed: Tank, Arciere, Mago, Ibrido with class slot grammar,
  resource emphasis and unique class mechanics.
- Fall damage and self-damage from own abilities are target-zero; all weapon
  families need air behavior.
- Fixed three-transfer target rejected. Target sustain now uses class-legal
  Recovery utility choices plus explicit magic sustain; utility, HUD and Loadout
  must be rewritten around that contract.
- Visual presentation pass is reopened end-to-end: menu, loading, logo use, HUD,
  Loadout, spell/projectile language, feedback, arena and characters.

### 1. Combat Feel E Bug Meccanici

- Audit mira/projectile/AoE/status combo/parry/channel: ✅ codice verificato, nessun bug noto trovato.
- Tuning numerico TTK 20-30 s su bot e partite manuali: richiede browser QA manuale.
- Feedback hit/parry/channel/interrupt: ✅ element-colored world impacts per tutti i tipi di hit (melee/bow/magic/combo/zone); parry spark argento; doppio burst arancione per air-punish; trail line per proiettili (amber arrow, cyan bolt); durata toast ridotta, cooldown/gcd silenti.
- Leggibilità basic M1 vs primed ability: ✅ `[data-primed]` crosshair gold pulse ring; slot pip gold lift + glow.
- Wheel UX: ✅ cooldown badge (rosso, secondi) + cast-mode marker (I/P) su tutti gli slot; slot dimma se in cooldown.

### 2. Loadout Station / UX Runtime Pass ✅ Completata (vedi M2)

- Design plan `11_ui_redesign_plan.md` seguito. Gerarchia HUD definita e applicata.
- Rendere chiarissima la distinzione E/Q/LMB/direct-keys: ✅ (vedi M2 DoD).
- Preset persistenti: localStorage già attivo; account/DB-backed rimandato a M4+.

### 3. Client Modularization ✅ Completata (vedi M3)

Tutti i moduli estratti. `main.ts` a 1981 linee (da 2896). Moduli attivi: `hud/` (10), `input/` (6), `render/` (7), `net/` (1), `vfx/` (1), `world/` (arena + maps).

### 4. Content Consistency Runtime ✅ Verificata

- Conteggi confermati: 6 melee / 8 bow / 27 magic / 11 utility = 52. ✅
- `02_TECH/02_ability_dsl.md` aggiornato e coerente con lo schema. ✅
- Niente sistemi rune/passive nei docs, runtime o UI. ✅
- Transfer fissi Z/X/F documentati come runtime legacy. Il contratto target
  sustain/utility ora rimuove i transfer fissi e passa a Recovery class-aware.
  ✅

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
- Registry, tooltip live e runtime ability auditati insieme. ✅ Bow ability projectiles now spawn as arrows (not bolts). Curse of Weakness mana drain now respects parry (was bypassing it). Audit completato su tutti 52 ability defs vs engine. I documenti lista ability restano snapshot di design: i valori live stanno nel registry.
- Nessun cast doppio durante swing/charge/channel/parry. ✅ Confermato: player.casting + swingEndsAtTick + bowChargeStartTick + player.parrying bloccano tutti i conflitti.
- Point abilities usano davvero il mirino. ✅ placementPreview.aimPoint() invia targetPoint; defaultInstantCast() = def.targeting !== 'point'.

### M2 — Loadout UX Runtime Pass

DoD:

- HUD subtraction pass completato: niente pannelli esplicativi persistenti in centro visuale durante il live gameplay. ✅ `#status-strip` spostato da `left:50%;bottom:204px` a `left:28px;bottom:302px` — fuori asse centrale. Nessun pannello esplicativo persistente trovato durante gameplay live.
- Bottom combat console coerente: risorse, weapon strip, combat slots, utility/transfer e cooldown leggibili senza sovrapporsi. ✅ `#combat-console` (centro-basso) contiene weapon slots + cd-strip con sezioni E/Q separate. Nessun overlap con `#hud` (bottom-left) o `#status-strip` (bottom-left sopra HUD) a nessun viewport testato.
- Loadout Station comprensibile in 10 secondi. ✅ Layout 3 colonne: sinistra=slot equipaggiati, centro=dettaglio ability + cast mode toggle, destra=filtri+pool. Build coach e flow strip attivi.
- Loadout Station v2 centrata su build equipaggiata, abilità selezionata, combo flow e cast mode. ✅ Flow strip (Opener/Control/Cashout/Reset) in header con stato online/missing. Build coach (score/6, coach-pills, coach-lines) nel pannello centrale. Cast-mode toggle prominente su ogni slot e card.
- Transfer fissi runtime visibili e non sostituibili. ✅ Badge FIXED + nessun
  pulsante clear + CSS `locked-transfer` su slot Z/X/F. Questo non approva i
  transfer fissi nel target class-based.
- Wheel behavior documentato e verificato. ✅ `01_controls.md` descrive contratto Q/E+release=prime+LMB=fire. `radial-wheels.ts` + `cast-dispatcher.ts` confermati in linea.
- Nessuna categoria/passiva/runa fantasma. ✅ Nessun sistema rune/passive in HTML, TS o design docs; eventuali segni visuali sono solo sigilli decorativi senza meccanica.

### M3 — Client Split

DoD:

- `main.ts` ridotto a orchestration/bootstrap. ✅ 1981 linee (da 2896). Nucleo rimasto: connect, simStep, render, reconcileSelf, onHit, onDeath.
- Input/HUD/render/net/VFX in moduli dedicati. ✅ `hud/` (10 moduli), `input/` (6 moduli), `render/` (7 moduli), `net/loadout-sync.ts`, `vfx/impact-pool.ts`.
- Smoke test client su keybind, loadout, radial prime/fire. ✅ `keybinds.test.ts` (2), `loadout-slots.test.ts` (2), `loadout-station.test.ts` (10) — tutti verdi.

### M4 — Persistence And Account Stub

DoD:

- Loadout persistente local-first o DB-backed. ✅ localStorage (ragequit.loadout.v6 + ragequit.instantCast.v2) già attivo in loadout-station.ts.
- Schema pronto per account guest. ✅ Player.userId (string, default '') aggiunto; GameRoom.onJoin accetta options.userId; gameplay non dipende dal campo.
- Nessun blocco sul gameplay locale se persistence è assente. ✅

Ancora aperto: Supabase auth/JWT verification e DB-backed persistence richiedono credenziali esterne.

### M5 — Art/Feel Pass Reopened

DoD:

- Visual hierarchy must be executed from `VISUAL_STRATEGY.md`, `01_DESIGN/13_graphic_redesign_blueprint.md`, `01_DESIGN/14_visual_redesign_system.md`, and `01_DESIGN/11_ui_redesign_plan.md`, not from isolated asset swaps.
- Main menu, pause, settings, scoreboard/loading shell and Loadout Forge must read as one game UI system. Current main menu and Loadout pass are partial, not accepted as final.
- Live HUD must keep aim dominant while resources, weapon strip, ability/utility slots, cooldowns, status and round state align into a coherent combat cockpit. Current surfaces still require screenshot-led alignment checks.
- Spell and projectile language must move beyond generic shared shapes: archetype + element + motion + trail + impact + ground/readability marker where relevant.
- Arena, character, weapons, viewmodels and fallbacks must have an explicit runtime asset inventory and visual acceptance path before another replacement pass.
- Bundle and render cost remain monitored. Current Vite chunk budget isolates Three.js vendor, but visual changes still need browser smoke and performance review.

## Verification Standard

Prima di considerare chiuso un pass:

- `pnpm lint`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- QA browser su `localhost:5173` per UI/gameplay toccato

Il warning Vite sul chunk grande non deve comparire su una build pulita: il vendor Three.js è isolato in `vendor-three`, mentre eventuali crescite del game chunk vanno trattate come regressione di modularizzazione/code splitting.
