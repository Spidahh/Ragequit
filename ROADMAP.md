# RAGEQUIT — Roadmap / Stato Reale

Ultimo riallineamento documentale: 2026-05-19.

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

- Continuare audit su mira, projectile hit, AoE, status combo, parry edge cases, channel/cast interruption.
- Tuning numerico TTK 20-30 s su bot e partite manuali.
- Migliorare feedback hit/parry/channel/interrupt.
- Rendere più leggibile la differenza tra basic M1, direct ability cast e primed ability fire.

### 2. Loadout Station / UX

- Seguire `01_DESIGN/11_ui_redesign_plan.md` prima di altri interventi HUD/menu/loadout: prima togliere rumore e definire gerarchia, poi rifare superfici.
- Continuare polish visivo AAA-style: più leggibilità, meno HTML panel feel.
- Rendere chiarissima la distinzione:
  - E = ability palette
  - Q = utility/transfer palette
  - LMB = fire primed ability
  - direct keys = bypass wheel; instant cast immediato, placement con preview + LMB
- Aggiungere preset persistenti quando entra il layer account/storage.

### 3. Client Modularization

`packages/client/src/main.ts` è ancora troppo grande. Sono già presenti moduli `input`, `hud`, `net`, `render`, `vfx`, ma serve continuare l’estrazione:

- HUD drag/resize controller estratto in `packages/client/src/hud/hud-drag.ts`.
- Hotbar/cooldown strip estratta in `packages/client/src/hud/cd-strip.ts`.
- Kill feed, kill splash, combo popup e streak banner estratti in `packages/client/src/hud/combat-feed.ts`.
- Radial wheel controller Q/E estratto in `packages/client/src/input/radial-wheels.ts`.
- Sensibilità mouse e overlay di regolazione estratti in `packages/client/src/input/sensitivity.ts`.
- Game input controller (keyboard/mouse/pointer event registration + mutable state bag) estratto in `packages/client/src/input/game-input.ts`.
- HUD self-player status renderer (HP/mana/stamina/mastery/status strip/cast bar/GCD) estratto in `packages/client/src/hud/self-hud.ts`.
- Cast/fire/weapon input dispatcher (primedSlot, castQueue, placementId, dispatch per tick) estratto in `packages/client/src/input/cast-dispatcher.ts`.
- Projectile visual system (onSpawned, onExpired, renderFrame) estratto in `packages/client/src/render/projectile-visuals.ts`.
- Zone visual system (onSpawned, onExpired, animateFrame, zoneColorForElement) estratto in `packages/client/src/render/zone-visuals.ts`.
- Placement preview system (footprint, aimPoint, update) estratto in `packages/client/src/render/placement-preview.ts`.
- Remote player visual system (snapshot capture, interpolated render, emissives, nameplate) estratto in `packages/client/src/render/remote-players.ts`.
- Ability fail / server toast HUD estratto in `packages/client/src/hud/ability-fail-hud.ts`.
- Transmute bar HUD estratto in `packages/client/src/hud/transmute-hud.ts`.
- Hit feedback HUD (hitmarker, directional hit, damage popup) estratto in `packages/client/src/hud/hit-feedback.ts`.
- Arena particle/torch/ring animation spostata in `buildArena` closure in `packages/client/src/world/arena.ts`.
- Bow charge / parry ring / round timer / vignettes estratti in `packages/client/src/hud/combat-overlay-hud.ts`.
- Status applied/expired vignette flash estratto in `packages/client/src/hud/status-overlay.ts`.
- Self-character emissive + player-light estratti in `packages/client/src/render/self-emissive.ts`.
- main.ts ridotto a 1825 linee (da 2896); nucleo rimasto è orchestrazione pura (connect, simStep, render, reconcileSelf, onHit, onDeath).

### 4. Content Consistency

- Ogni modifica a `registry.ts` deve aggiornare:
  - `01_DESIGN/05_abilities_*.md`
  - `02_TECH/02_ability_dsl.md` se cambia schema/primitiva
  - tests registry/engine se cambia comportamento
- Niente rune/passive nei docs, runtime o UI.
- Transfer fissi sempre documentati come Z/X/F.

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

- Full test suite verde.
- Browser QA senza errori console.
- Nessun mismatch noto tra descrizione ability e runtime.
- Nessun cast doppio durante swing/charge/channel/parry.
- Point abilities usano davvero il mirino.

### M2 — Loadout UX Pass

DoD:

- HUD subtraction pass completato: niente pannelli esplicativi persistenti in centro visuale durante il live gameplay.
- Bottom combat console coerente: risorse, weapon strip, combat slots, utility/transfer e cooldown leggibili senza sovrapporsi.
- Loadout Station comprensibile in 10 secondi.
- Loadout Station v2 centrata su build equipaggiata, abilità selezionata, combo flow e cast mode.
- Transfer fissi visibili e non sostituibili.
- Wheel behavior documentato e verificato.
- Nessuna categoria/passiva/runa fantasma.

### M3 — Client Split

DoD:

- `main.ts` ridotto a orchestration/bootstrap.
- Input/HUD/render/net/VFX in moduli dedicati.
- Smoke test client su keybind, loadout, radial prime/fire.

### M4 — Persistence And Account Stub

DoD:

- Loadout persistente local-first o DB-backed. ✅ localStorage (ragequit.loadout.v6 + ragequit.instantCast.v2) già attivo in loadout-station.ts.
- Schema pronto per account guest. ✅ Player.userId (string, default '') aggiunto; GameRoom.onJoin accetta options.userId; gameplay non dipende dal campo.
- Nessun blocco sul gameplay locale se persistence è assente. ✅

Ancora aperto: Supabase auth/JWT verification e DB-backed persistence richiedono credenziali esterne.

### M5 — Art/Feel Pass

DoD:

- Main menu, pause, settings e lobby condividono un linguaggio da gioco, non da pagina HTML.
- Arena e personaggi smettono di sembrare blockout.
- VFX elementali leggibili. ✅ Zone pulse differenziato per elemento; proiettili emissivi (amber arrow, cyan bolt).
- Hit/parry/death/channel interrupt hanno feedback chiaro. ✅ ImpactPool ora produce sphere burst + ring shockwave espandibile con ease-out.
- Bundle budget monitorato. ✅ chunkSizeWarningLimit=550 kB in vite.config.ts; game chunk a 177 kB / 53 kB gzip.

## Verification Standard

Prima di considerare chiuso un pass:

- `pnpm lint`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- QA browser su `localhost:5173` per UI/gameplay toccato

Il warning Vite sul chunk grande è noto e non bloccante, ma va affrontato nel pass di modularizzazione/code splitting.
