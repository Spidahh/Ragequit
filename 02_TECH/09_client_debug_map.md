# Client Debug Map

Questo documento tiene insieme il quadro operativo del client mentre il progetto viene stabilizzato. Non sostituisce i contratti design e tech: li collega ai flussi da verificare prima e dopo ogni fix.

## 1. Ordine Logico Del Client

1. `packages/client/index.html` definisce canvas, shell menu, HUD, wheels, pause, settings e Loadout Station.
2. `packages/client/src/main.ts` crea renderer, scena, camera, luci, arena, self/remote visuals, VFX, HUD controllers, input controllers e connessione Colyseus.
3. `packages/client/src/menu.ts` governa main menu, settings, round HUD e scoreboard.
4. `packages/client/src/loadout-station.ts` governa build equipaggiato, pool abilita, filtri, cast mode, transfer fissi e conferma ingresso match.
5. `packages/client/src/input/game-input.ts` governa tastiera, mouse, pointer lock, wheel keys, pause e gating degli overlay.
6. `packages/client/src/input/cast-dispatcher.ts` separa LMB/RMB weapon actions, direct casts, primed wheel actions e placement confirm.
7. `packages/client/src/render/*`, `packages/client/src/world/arena.ts` e `packages/client/src/vfx/*` rendono arena, player, projectiles, zones, placement preview e feedback.
8. `packages/shared` definisce registry abilita, sim deterministica, schema e protocollo. `packages/server` resta autoritativo su hit, costi, cooldown, status e match flow.

## 2. Flussi Da Tenere Verificati

| Flusso                                                     | Superfici coinvolte                          | Stato verifica locale 2026-05-22        |
| ---------------------------------------------------------- | -------------------------------------------- | --------------------------------------- |
| Boot -> Main menu                                          | `index.html`, `main.ts`, `menu.ts`           | verificato                              |
| Main -> Settings -> Back                                   | `menu.ts`, settings DOM                      | verificato                              |
| Main -> Loadout -> Back                                    | `menu.ts`, `loadout-station.ts`              | verificato                              |
| Main -> Training -> Loadout -> Countdown -> Live           | menu, loadout, room connect, HUD             | verificato                              |
| Main -> Play 1v1 -> Loadout -> Countdown                   | menu, loadout, bot-fill connect              | verificato                              |
| Main -> FFA -> Loadout                                     | menu, loadout                                | verificato                              |
| Live -> Escape -> Pause -> Return to Lobby                 | input, pause, menu reset                     | verificato dopo reset round HUD         |
| Live -> pointer lock                                       | input, canvas focus                          | verificato in Chrome locale             |
| Live -> Tab weapon swap                                    | input, server sync, weapon strip             | verificato in Training                  |
| Live -> hold/release `E` ability wheel                     | input, radial wheel, primed flow             | verificato in Training                  |
| Live -> hold/release `Q` utility wheel                     | input, radial wheel, transfer slots          | verificato in Training                  |
| Live -> direct preview key -> `RMB` cancel / `LMB` confirm | cast dispatcher, placement preview, cd strip | verificato con `Flame Wall` in Training |

## 3. Problemi Attuali Classificati

### Bloccanti Gia Corretti

- Main menu nascosto ma ancora cliccabile sopra il Loadout Station.
- Base character FBX errato: animation-only asset al posto del mesh/skinned base.
- Retarget delle animazioni legacy che ribaltava il personaggio e importava `Hips.position` con scala non compatibile.
- Round HUD che conservava la phase del match lasciato quando il main menu tornava visibile.

### Debito Tecnico/Visuale Ancora Aperto

- UI e stile sono divisi tra CSS inline in `packages/client/index.html` e override in `packages/client/public/graphic-redesign.css`.
- Il main menu ha gia un logo e una command rail, ma la presentazione live e la Loadout Forge non sono ancora allo stesso livello di coerenza del blueprint.
- Il linguaggio VFX non e ancora completo per ogni archetipo abilita: il mapping documentato deve diventare codice verificabile senza perdere il budget performance.
- Arena, characters, weapon viewmodels e fallback procedurali convivono; serve mantenere un inventario esplicito di quale asset runtime e attivo e quale fallback resta ammesso.

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
- browser smoke `LMB`, `RMB`, `Tab`, `E`, `Q`, direct slot keys e placement preview per l'area toccata
- screenshot desktop di main menu, Loadout Forge e live HUD quando il pass tocca UI o grafica
