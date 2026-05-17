# RAGEQUIT — Roadmap / Stato Reale

Ultimo riallineamento documentale: 2026-05-16.

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
- Direct hotkeys: R, G, 1-5, Z/X/F/V castano immediatamente.
- Play/Training aprono prima il Loadout Station; la room parte solo dopo `SAVE BUILD`.
- Settings: FOV, sensitivity, volume, quality e keybind sono modificabili e persistono in `localStorage`.
- Nessun sistema rune/passive.
- Mastery calcolata solo sui 5 slot magic.
- Status runtime: burn, chill, bleed, poison, slow, root, stun, freeze, curse, mark, shield, haste, invulnerable.
- Zone/projectile runtime, damage queue centrale, shield/parry/lifesteal/death nello stesso path.
- Bot training, match phases, replay scaffolding, rate limiter.
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

- Continuare polish visivo AAA-style: più leggibilità, meno HTML panel feel.
- Rendere chiarissima la distinzione:
  - E = ability palette
  - Q = utility/transfer palette
  - LMB = fire primed ability
  - direct keys = instant cast
- Aggiungere preset persistenti quando entra il layer account/storage.

### 3. Client Modularization

`packages/client/src/main.ts` è ancora troppo grande. Sono già presenti moduli `input`, `hud`, `net`, `render`, `vfx`, ma serve continuare l’estrazione:

- input + radial wheel controller
- cast/fire/weapon input dispatcher
- HUD cooldown/status/mastery renderer
- projectile/zone/player render systems
- menu/loadout orchestration

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

- Loadout Station comprensibile in 10 secondi.
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

- Loadout persistente local-first o DB-backed.
- Schema pronto per account guest.
- Nessun blocco sul gameplay locale se persistence è assente.

### M5 — Art/Feel Pass

DoD:

- Arena e personaggi smettono di sembrare blockout.
- VFX elementali leggibili.
- Hit/parry/death/channel interrupt hanno feedback chiaro.
- Bundle budget monitorato.

## Verification Standard

Prima di considerare chiuso un pass:

- `pnpm lint`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- QA browser su `localhost:5173` per UI/gameplay toccato

Il warning Vite sul chunk grande è noto e non bloccante, ma va affrontato nel pass di modularizzazione/code splitting.
