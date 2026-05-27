# RAGEQUIT Project Memory

Ultimo riallineamento: 2026-05-26.

## Fatti Vivi

- Server gia live su Fly.io: app `ragequit-server`, regione `ams`, porta 8080.
- Supabase gia configurato come Fly secrets.
- Client destinato a Cloudflare Pages.
- Classi vive: Tank, Arciere, Mago, Ibrido.
- Loadout vivo: `melee[]`, `bow[]`, `magicBase[]`, `magicAdvanced[]`,
  `utility[]`.
- Recovery vive: `Brace Recovery`, `Hunter's Flow`, `Arcane Rebind`,
  `Adaptive Mend`.
- Fall damage sempre zero.
- Self-damage dalle proprie abilita sempre zero.
- Nessun sistema passivo, slot extra fuori loadout o RNG negli output abilita.
- `packages/shared/src/abilities/registry.ts` comanda numeri e comportamento
  delle abilita.
- `packages/client/public/game-ui.css` e l'unico CSS UI vivo.
- Il Loadout Forge non usa piu `#ls-magic`; usa `#ls-magic-base` e
  `#ls-magic-advanced`.
- Il 2026-05-26 il blocco CSS menu+Loadout Forge in `game-ui.css` e stato
  riscritto direttamente: lobby a tre zone bilanciate e Forge a tre
  colonne con build centrale dominante.
- Il 2026-05-26 `.hidden` e stato reso dominante in `game-ui.css`: overlay
  nascosti come Settings/Pause/Scoreboard non devono intercettare click del menu.
- Il 2026-05-26 gli outline skinned non definiscono piu manualmente
  `USE_SKINNING`: Three lo inietta gia per `SkinnedMesh` e il doppio define
  causa shader compile error.
- Il 2026-05-27 la tastiera è stata sfoltita: i tasti diretti "Z, X, F, V, R, G" per slot e utility veloci sono stati disattivati e rimossi dalla UI delle impostazioni. Il gameplay si basa solo su WASD, Space, Tab per lo swap, LMB/RMB, Cifre 1-5 per magie, e le ruote radiali E/Q.
- Il 2026-05-27 è stata aggiunta la visualizzazione delle armi permesse (⚔️ SWORD, 🏹 BOW, 🔮 STAFF) e il budget degli slot budget delle spell nella Loadout Station.
- Il 2026-05-27 i sistemi rimossi non sono piu fonte di regole.
- Il 2026-05-27 la validazione del blocco weapon swap `player.weaponSwapEndTick` è stata resa autoritativa sul server per tutti i tipi di attacco base, parate e cast.
- Il 2026-05-27 sono stati risolti i disallineamenti del Loadout Forge (correzione del footer pulsanti `.ls-center-footer`, tab classe `.card-icon/title/desc` e pannello `.class-vitals-panel`).
- Il 2026-05-27 è stata abilitata la sincronizzazione del nome giocatore tramite `roomOptions.name` su Colyseus, includendo il salvataggio immediato al `change`/`blur` del campo input.
- Il 2026-05-27 sono stati eliminati tutti i residui fisici dei tasti disattivati Z, X, F, V, R nel file HTML e corretti i refusi negli esempi di documentazione (`01_controls.md`).


## Regola Documentale

I documenti devono descrivere stato vivo o regole chiuse, non intenzioni
astratte.

## Regola Utente

- Se l'utente dice che un layout/stile fa schifo, va segnato e corretto subito.
- Se l'utente dice di eliminare una cosa, eliminarla dal gioco e dai documenti.
- Le decisioni nuove dell'utente si scrivono come stato vivo, non come piano.
- Menu e Loadout Forge devono essere progettati come UI di gioco pulita,
  proporzionata e posizionata con una sola fonte CSS.
- Menu e Loadout Forge devono nascondere il canvas arena live e usare un
  background statico UI; niente arena che gira dietro alle schermate.
- Home e Loadout Station devono privilegiare leggibilita e proporzioni: dock e
  card grandi, testi leggibili, pannelli larghi e nessuna colonna compressa.
- Il CSS del Loadout Forge deve combaciare con le classi realmente generate da
  `loadout-station.ts`; overlay/glow decorativi devono essere assoluti e non
  partecipare alla griglia dei contenuti.
- La Loadout Forge viva deve seguire solo `loadout-station.ts` e
  `classes.ts`; non tenere riferimenti TS a nodi DOM invisibili o rimossi.
- Le chip abilita del Forge usano `tag-role`, `tag-targeting`, `tag-control`,
  `tag-damage`, `tag-status`, `tag-move`, `tag-resource`; i vecchi tag CSS
  `tag-mobility`/`tag-sustain`/`tag-defense`/`tag-cost` sono rimossi.
- Regola Loadout Forge: leggere prima `TARGET_CLASS_DEFS`,
  `getClassSlotOrder()`, `isAbilityLegalForClass()`, `getAbilitySlotFamily()`,
  `slotKeybindEntries()` e `rebuildPool()`. Nessuna arma inventata, nessuna
  riga classi/armi duplicata, nessuna lane a budget zero per la classe attiva.
- Correzione UX utente: la Forge non deve basarsi su "seleziona uno slot" come
  flusso principale. Deve permettere di cambiare tutta la build da una vista
  unica, con lane e alternative compatibili visibili insieme. Le stats classe
  non devono occupare spazio centrale nel Loadout.
- Nella UI Loadout le uniche classi valide sono Tank, Arciere, Mago e Ibrido.
- Conservare nel progetto solo asset runtime e contratti presenti approvati.
