# Client Debug Map

Questo documento tiene insieme il quadro operativo del client mentre il progetto viene stabilizzato. Non sostituisce i contratti design e tech: li collega ai flussi da verificare prima e dopo ogni fix.

## 1. Ordine Logico Del Client

1. `packages/client/index.html` definisce canvas, shell menu, HUD, wheels, pause, settings e Loadout Station.
2. `packages/client/src/main.ts` crea renderer, scena, camera, luci, arena, self/remote visuals, VFX, HUD controllers, input controllers e connessione Colyseus.
3. `packages/client/src/menu.ts` governa main menu, settings, round HUD e scoreboard.
4. `packages/client/src/loadout-station.ts` governa build equipaggiato, pool abilita, filtri, cast mode, recovery di classe e conferma ingresso match.
5. `packages/client/src/input/game-input.ts` governa tastiera, mouse, pointer lock, wheel keys, pause e gating degli overlay.
6. `packages/client/src/input/cast-dispatcher.ts` separa LMB/RMB weapon actions, direct casts, primed wheel actions e placement confirm.
7. `packages/client/src/render/*`, `packages/client/src/world/arena.ts` e `packages/client/src/vfx/*` rendono arena, player, projectiles, zones, placement preview e feedback.
8. `packages/shared` definisce registry abilita, sim deterministica, schema e protocollo. `packages/server` resta autoritativo su hit, costi, cooldown, status e match flow.

## 2. Flussi Da Tenere Verificati

| Flusso                                                    | Superfici coinvolte                          | Stato verifica 2026-05-22 (flussi confermati; nuovi sistemi vedi sez. 4) |
| --------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------ |
| Boot -> Main menu                                         | `index.html`, `main.ts`, `menu.ts`           | verificato                                                               |
| Main -> Settings -> Back                                  | `menu.ts`, settings DOM                      | verificato                                                               |
| Main -> Loadout -> Back                                   | `menu.ts`, `loadout-station.ts`              | verificato                                                               |
| Main -> Training -> Loadout -> Countdown -> Live          | menu, loadout, room connect, HUD             | verificato                                                               |
| Main -> Play 1v1 -> Loadout -> Countdown                  | menu, loadout, bot-fill connect              | verificato                                                               |
| Main -> FFA -> Loadout                                    | menu, loadout                                | verificato                                                               |
| Live -> Escape -> Pause -> Return to Lobby                | input, pause, menu reset                     | verificato dopo reset round HUD                                          |
| Live -> pointer lock                                      | input, canvas focus                          | verificato in Chrome locale                                              |
| Live -> Tab weapon swap                                   | input, server sync, weapon strip             | verificato in Training                                                   |
| Live -> hold/release `E` ability wheel                    | input, radial wheel, primed flow             | verificato in Training                                                   |
| Live -> hold/release `Q` wheel (4 settori classe)         | input, radial wheel, Q slots                 | verificato in Training                                                   |
| Live -> seleziona slot da wheel -> `LMB` fire / placement | cast dispatcher, placement preview, cd strip | verificato con `Flame Wall` in Training                                  |

## 3. Problemi Attuali Classificati

### Bloccanti Gia Corretti

- Main menu nascosto ma ancora cliccabile sopra il Loadout Station.
- Character runtime allineato ai modelli GLTF class-based e al set animazioni `UAL1_Standard.glb`.
- Round HUD che conservava la phase del match lasciato quando il main menu tornava visibile.

### Stato Visuale Da Proteggere

- UI e stile vivono nel solo CSS `packages/client/public/game-ui.css`.
- Il main menu, la Loadout Forge e gli overlay devono restare leggibili come UI di gioco, non pagine HTML.
- Il linguaggio VFX deve restare coerente con il budget performance.
- Arena, characters, weapon viewmodels e fallback procedurali convivono; l'inventario runtime resta esplicito nei contratti visual/performance.

## 4. Regola Di Debug

Ogni fix deve dichiarare:

1. quale flusso rompeva;
2. quale contratto rischiava di violare;
3. quale smoke vicino e stato rifatto;
4. se la documentazione di design/tech cambia insieme al codice.

## 5. Matrice Minima Prima Di Dichiarare Un Pass Stabile

- `pnpm --filter @ragequit/client test`
- `pnpm --filter @ragequit/client build`
- `pnpm lint`
- browser smoke menu, Training, Play 1v1, FFA, pointer lock, pause, return lobby
- browser smoke `LMB`, `RMB`, `Tab`, `E`, `Q`, slot `1`-`8` e placement preview per l'area toccata
- screenshot desktop di main menu, Loadout Forge e live HUD quando il pass tocca UI o grafica

---

## 4. Nuovi Sistemi (2026-06-01)

| Sistema           | File                              | Cosa verifica                                                     |
| ----------------- | --------------------------------- | ----------------------------------------------------------------- |
| Loading screen    | `src/preloader.ts`                | Appare prima del match, scompare quando render parte              |
| Match FSM         | `src/game/match-state-machine.ts` | `matchSM.state` deve corrispondere a `currentMatchPhase`          |
| Bloom layer       | `main.ts` (EffectComposer)        | Layer 1 su sigil, border, zone VFX, torce, cast ring, impact pool |
| LOD               | `render/remote-players.ts`        | >40m: mesh invisibile, >20m: no shadow                            |
| Audio listener    | `main.ts` (in \_renderInner)      | `soundEngine.updateListener()` chiamato ogni frame                |
| Heartbeat         | `main.ts`                         | Suona sotto HP 25%, accelera con danger                           |
| Dynamic crosshair | `main.ts` + CSS                   | `data-moving="true"` su WASD, `.kill-confirm` 200ms al kill       |
| Torce arena       | `world/arena.ts`                  | 4 PointLight + Torch_Metal.gltf ai pilastri alternati con flicker |
| Sky dome          | `world/arena.ts`                  | ShaderMaterial visibile da qualsiasi angolo camera                |
| Reconnect         | `main.ts` (onLeave)               | 1 retry su code !== 4000/1000 durante fase live                   |
| Tutorial          | `main.ts` (engage())              | Solo alla prima partita, localStorage `ragequit.tutorial.done`    |

## 5. Invarianti da Non Rompere

- `matchSM.transition()` va chiamato in `applyMatchPhase()` — non in altri punti.
- `hideLoadingScreen()` va chiamato solo dopo che il preload e completato.
- Il bloom pass NON deve girare durante hit-stop (ottimizzazione: si usa `renderer.render` invece).
- Le texture VFX devono restare RGBA bianco-su-trasparente — non modificarle con librerie che aggiungono background.
- I GLB dei personaggi NON vanno rigenerati — producono file enormi per le texture embedded.
