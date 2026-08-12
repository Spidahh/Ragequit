# RAGEQUIT — Stato Corrente

Ultimo riallineamento: 2026-08-12.

Questo file descrive solo lo stato vivo del progetto.

## Implementato

### Core Runtime

- Monorepo pnpm con `packages/shared`, `packages/client`, `packages/server`.
- Server Colyseus autoritativo a 60 Hz.
- Client Vite + Three.js con toon shading, ACES filmic, PCF soft shadows.
- 53 abilita data-driven nel registry condiviso.
- Classi attive: Tank, Arciere, Mago, Ibrido con ClassMechanicRuntime server-side (Fury, Momentum, Risonanza, Flow).
- Loadout class-aware con Magic Base e Magic Advanced separati.
- HUD con meccanica classe, hotbar 1-8, wheel E/Q, castbar, status e scoreboard.
- Supabase auth e persistenza DB con fallback locale.
- Training con difficolta Novice, Competent e Master.
- CSS unificato in `packages/client/public/game-ui.css`.

### Fase 1 — Stabilizzazione (2026-05-31)

- Loading screen con barra di progresso e preload asset prima dell'ingresso arena.
- Error boundary nel render loop (try/catch su \_renderInner, toast errore).
- Texture VFX convertite in RGBA bianco-su-trasparente (Kenney Particle Pack CC0).
- Audit GLTF .bin: tutti i 21 file corretti.

### Fase 2 — Qualita Visiva (2026-05-31)

- Prima persona: fpvKeyLight + MeshStandardMaterial per armi FPV.
- Nameplate remote players: transform: translate3d() invece di left/top.
- Arena dust: DynamicDrawUsage per upload GPU efficiente.
- Audio: variazione pitch +/-8% su tutti i BufferSource nodes.

### Fase 3 — Game Feel (2026-05-31)

- Bot AI: strafing orbitale, retreat HP < 20%, dodge su cast nemico, weapon swap per distanza.
- Reconnect automatico: 1 retry dopo 2s su disconnessione inaspettata durante fase live.
- Tutorial HUD: 4 tooltip sequenziali alla prima partita (localStorage, si dissolve da solo).

### Fase 4 — Architettura (2026-05-31)

- Weapon loader aggiornato a .glb (sword, bow, staff, shield_A; sword_D sostituito da sword).
- 13 GLB erronei dei personaggi (~250 MB) eliminati.

### Fase 5 — Feature Avanzate (2026-06-01)

- Bloom post-processing: EffectComposer + UnrealBloomPass selettivo (Three.js layer 1).
- LOD remote players: oltre 40m modello nascosto, oltre 20m shadow disabilitato.
- Audio spaziale 3D: PannerNode HRTF per impatti/cast remoti.
- Match State Machine esplicita: src/game/match-state-machine.ts.
- Crosshair dinamico: si espande durante movimento, flash verde al kill.
- Battito cardiaco procedurale sotto HP 25%.
- Camera shake esponenziale con micro-oscillazione.
- Torce 3D (Torch_Metal.gltf) ai pilastri con PointLight flickering.
- Sky dome gradient: ShaderMaterial custom.
- Props KayKit Dungeon: barrel_large, barrel_small, box_large, banner_patternA_red.
- Zone VFX e cast ring su layer bloom.
- ASSET_GRAFICA esplorata: particelle Kenney, props Fantasy MegaKit, KayKit Dungeon.

### Revisione leggibilita e game feel (2026-08-12)

- Il precedente pass visivo e stato rifiutato: la sola presenza di HUD, animazioni e VFX non e una prova di qualita.
- Animazioni delle quattro classi mappate per ruolo semantico sui nomi reali delle clip; rimosso il fallback per indice che poteva usare atterraggio come idle e mira come corsa.
- Idle specifici per spada, arco e staff; cast visibile anche quando l'arma attiva non e lo staff.
- Evento `projectileSpawned` arricchito con `abilityId`: proiettili con sagome distinte per sfera, scheggia, lancia, drenaggio, spina e freccia pesante.
- Zone persistenti con firme distinte per volley, trappola, ghiaccio, tempesta, rovi, fumo e totem; il bordo continua a rappresentare la hitbox reale.
- Loadout Forge mechanic-first: tutti gli 8 slot visibili senza scroll a 1280x720, tasto diretto 1-8, percorso wheel, diagramma della forma, istruzione di mira e risultato numerico.
- HUD compatto e readout temporaneo vicino al mirino con nome, forma e risultato dell'abilita attivata.
- Preview delle abilita a punto colorata per elemento, con raggio/muro e reticolo della zona colpita.

## Verifica Minima

```text
pnpm --filter @ragequit/client typecheck
pnpm --filter @ragequit/client test
pnpm --filter @ragequit/client build
pnpm lint
```

## Prossimi Passi

- Split di main.ts (~3400 righe) in moduli separati.
- Valutazione Rapier.js per fisica slope-aware.
- Continuare il collaudo visivo delle animazioni su tutte le classi e delle 53 abilita in arena; nessun sistema e considerato visualmente approvato solo perche i test automatici passano.
