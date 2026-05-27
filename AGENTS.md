# RAGEQUIT Agent Rules

Regole vive per lavorare su questo repository. Non usare documenti cancellati o
assunzioni precedenti come autorita.

## Fatti Stabiliti

- Server gia online su Fly.io: app `ragequit-server`, regione `ams`, porta 8080.
- Supabase gia configurato come Fly secrets: `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`.
- Client destinato a Cloudflare Pages; output statico in `apps/web/`.
- Asset esistenti:
  - `packages/client/public/ui/ragequit-logo-full.png`
  - `packages/client/public/ui/ragequit-logo-small.png`
  - `packages/client/public/ui/sfondo.png`
  - `packages/client/public/icons-sprite.svg`
- Unico CSS UI vivo: `packages/client/public/game-ui.css`.
- Non ricreare layer CSS separati.
- `#bg-canvas` deve renderizzare una scena arena 3D, non nero/vuoto.

## Gameplay Non Negoziabile

- Arena FPS attivo.
- Fall damage sempre zero.
- Self-damage dalle proprie abilita sempre zero.
- Tutte le armi possono agire in aria.
- Airborne non e hard CC.
- Parry/protezione deve avere scudo leggibile sul personaggio.
- Nessuna passiva, slot passivo, runa o sistema rune.
- Classi vive: Tank, Arciere, Mago, Ibrido.
- Sprint e movimento base, non toggle e non costa Stamina di default.
- Wheel abilita/utility: hold, seleziona, rilascia per primare, LMB per
  sparare/confermare.
- Output abilita deterministico. Zero RNG.
- Sangue fisico rosso `#FF3344`.
- TTK reale desiderato: 20-30s con difesa attiva.

## Loadout

- Il Loadout Forge e class-aware.
- Famiglie vive: `melee`, `bow`, `magicBase`, `magicAdvanced`, `utility`.
- Recovery vive:
  - Tank: `Brace Recovery`
  - Arciere: `Hunter's Flow`
  - Mago: `Arcane Rebind`
  - Ibrido: `Adaptive Mend`
- Il Forge usa `#ls-magic-base` e `#ls-magic-advanced`.
- Il Forge non usa `#ls-magic`.
- Il Forge usa solo classi, slot family e Recovery.
- Allowed Weapons e Spell budgets sono evidenziati visivamente nella console della Loadout Station (⚔️ SWORD, 🏹 BOW, 🔮 STAFF con stato active/disabled e badge di budget per ogni family).

## UI / Visual

- Menu, Loadout, Pause, Settings e HUD devono sembrare UI di gioco, non pagine
  HTML.
- Menu e Loadout Forge non devono mostrare il canvas arena live dietro:
  nascondono il canvas con `body.main-menu-active` / `body.loadout-active` e
  usano background statico da asset UI.
- Home page e Loadout Station devono essere leggibili a colpo d'occhio:
  bottoni grandi, testi leggibili, pannelli proporzionati e nessuna colonna
  compressa che schiaccia nomi o descrizioni.
- Il CSS del Loadout Forge deve seguire le classi generate da
  `packages/client/src/loadout-station.ts`; non lasciare stili morti per markup
  vecchio e non usare overlay decorativi come celle di griglia.
- La Loadout Forge deve mostrare sempre ricerca abilita, filtri utili
  (`BEST`, `STARTER`, `CONTROL`, `INSTANT`, `PREVIEW`, elementi), key hint e
  vitals/meccanica della classe selezionata. Non lasciare logiche TS invisibili
  dietro DOM rimosso.
- Le chip abilita del Forge usano le classi vive generate da `tagClass()`:
  `tag-role`, `tag-targeting`, `tag-control`, `tag-damage`, `tag-status`,
  `tag-move`, `tag-resource`. Non ripristinare tag CSS vecchi come
  `tag-mobility`, `tag-sustain`, `tag-defense`, `tag-cost`.
- Studio UI esterno del 2026: per menu/loadout competitivi usare gerarchia
  forte, search sempre accessibile, filtri/toggle leggibili, stato selezionato
  evidente e card compatte. Evitare box grandi con poca informazione e stati
  visivi tutti uguali.
- Se l'utente dice che un layout/stile fa schifo, va trattato come feedback
  vincolante: aggiornare subito UI e memoria, poi verificare.
- Quando l'utente ordina di eliminare una cosa, eliminarla dal gioco e dai
  documenti nella stessa passata.
- Nuove decisioni dell'utente vanno scritte come stato vivo, non come proposta.
- Palette:
  - Panel: `#0F111A`
  - Accent: `#FFD260`
  - HP: `#FF3344`
  - Mana: `#00D0FF`
  - Stamina: `#00FF88`
  - Fire: `#FF4500`
  - Ice: `#00E5FF`
  - Lightning: `#FFE600`
  - Dark: `#6A0DAD`
  - Nature: `#39FF14`
- Barre risorse: rettangolari, leggibili, draggable/resizable.
- Weapon strip: slot leggibili stile 60x60, nessun overlap con hotbar.
- Niente nuovi layer CSS. Correggi `game-ui.css`.
- Preferisci rimozione e consolidamento invece di aggiungere pannelli.
- Animazioni UI preferite: `transform` e `opacity`.
- `.hidden` deve vincere su regole ID come `#settings-overlay { display: grid }`:
  overlay nascosti non devono mai intercettare click o input.
- Outline su `SkinnedMesh`: non definire manualmente `USE_SKINNING` nei
  `ShaderMaterial`; Three lo inietta gia e il doppio define rompe il shader.

## Input / Combat Safety

- Non toccare casualmente pointer lock, keyboard capture, mouse capture,
  weapon swap, LMB/RMB, wheel o aiming first-person.
- Se tocchi input, leggi `02_TECH/05_input_contract.md` e verifica in browser.
- Bow/staff/spell devono allinearsi al crosshair.
- Combat server-authoritative: non fidarti del client.
- Layout tastiera consolidato senza bloat: WASD, Space, Tab per swap, LMB/RMB, Cifre 1-5 per magie, Q/E per le ruote. I tasti diretti Z, X, F, V, R, G non sono più bindabili e sono disattivati.
- La validazione del weapon swap lock `player.weaponSwapEndTick` è autoritativa sul server per tutti gli input di attacco base, parata e incantesimi.

## File Autoritativi

- `packages/shared/src/abilities/registry.ts`: numeri e comportamento abilita.
- `packages/server/src/sim/AbilityEngine.ts`: effect chain server.
- `packages/server/src/rooms/GameRoom.ts`: Colyseus room.
- `packages/client/index.html`: DOM client.
- `packages/client/src/main.ts`: bootstrap client.
- `packages/client/src/loadout-station.ts`: Loadout Forge runtime.
- `packages/client/public/game-ui.css`: stile UI.
- `02_TECH/10_deploy_status.md`: deploy e asset.
- `memory/project_ragequit.md`: memoria corta dei fatti vivi.

## Read Before Editing

- `02_TECH/10_deploy_status.md`
- `GAME_SYSTEM_MODEL.md`
- `README.md`
- `ROADMAP.md`
- `01_DESIGN/README.md`
- `02_TECH/README.md`
- `02_TECH/05_input_contract.md` se tocchi input.
- `02_TECH/06_visual_performance_contract.md` se tocchi visual, HUD o VFX.

## Verifica

Per client/UI/combat:

- `pnpm --filter @ragequit/client test`
- `pnpm --filter @ragequit/client build`
- `pnpm lint`

Se tocchi codice TypeScript client:

- `pnpm --filter @ragequit/client typecheck`

## Documentazione

- I documenti devono descrivere stato vivo o regole chiuse.
- Non aggiungere piani astratti.
- Non lasciare scoperte solo in chat: aggiorna `AGENTS.md` e
  `memory/project_ragequit.md`.
