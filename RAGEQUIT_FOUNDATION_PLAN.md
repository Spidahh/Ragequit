# RAGEQUIT — Piano di riparazione delle FONDAMENTA visive

Diagnosi data-driven (8 agenti, codice letto a fondo) dei problemi che l'utente
segnala da mesi. **Meta-causa unica: manca una "singola fonte di verità".** Ogni
difetto è un valore tarato in isolamento. La cura è la stessa ovunque: derivare da
UNA costante autorevole, mai ritoccare a mano in un solo posto.

## Mappa cause-radice (6 cause spiegano ~90% dei sintomi)

| #   | Causa                                                                                                                                                                            | Sintomi                                                               | Dove                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| R1  | Nessuna "render height" condivisa: `×1.45` solo sul modello, camera/nameplate ancora a 1.8m                                                                                      | nemici giganti, tu nano, nameplate al petto                           | `characters.ts:107`                                                     |
| R2  | Skin layer legate alle ossa base ma con i PROPRI inverse-bind; corpo base mai nascosto sotto i vestiti                                                                           | skin entrano nello scheletro, dita/piedi rotti, z-fight               | `character-loader.ts:226,266`                                           |
| R3  | Armi/scudo pinnati con offset a mano invece che sul grip/asse reale; attacco-mano è side-effect del path d'install                                                               | armi fuori dalle mani, scudo al contrario, anni di revert             | `character-weapons.ts:43,310`; `character.ts:99`                        |
| R4  | Un solo spessore outline + una sola regola "cappuccio=nascondi testa" applicati ciechi                                                                                           | niente facce (occhi mangiati / cappuccio vuoto)                       | `characters.ts:234`; `character-loader.ts:266`                          |
| R5  | Nessun contratto visivo condiviso: materiale/palette/outline/post-FX forkati per ogni path; viewmodel e hit-stop bypassano il composer; 3 palette diverse; team color invisibile | stile incoerente, arma "staccata", schermo che sfarfalla a ogni colpo | `fpv-bow.ts`, `fpv-static-viewmodel.ts`, `main.ts:2763`, 3 file palette |
| R6  | Font del menu referenziati ma MAI caricati (tutto cade su Arial); sfondo "3D live" è uno stub; CSS 5.5k righe con duplicati                                                      | menu generici, piatti, layout instabile                               | `game-ui.css` (no `@font-face`), `menu-bg.ts`                           |

## Piano (fondamenta prima — 1→4 in ordine stretto, poi 5/6/7 in parallelo)

1. **[S] Scala/camera** ✅ FATTO (commit 7f7c131) — `CHARACTER_RENDER_HEIGHT_M=1.9` unica; via il ×1.45.
   Resta: derivare camUp/nameplate/muzzle dalla stessa costante.
2. **[L] Rig** — 🟡 PARZIALE (commit seguente): cappuccio duplicato rimosso; **clip head-only della base**
   (la base dà la FACCIA, l'outfit il CORPO) → niente più corpo muscoloso che affiora, su TUTTE le 4 classi.
   Resta: skeleton condiviso (boneInverses) per le dita/piedi; togliere il polygonOffset-cerotto.
3. **[M] Armi & scudo** — wrappare ogni arma in un offset interno così il GRIP è all'origine; `applyWeaponProp`
   unico responsabile di `rightHand.add(wg)`; rotazione scudo derivata dall'asse +Z reale, parent a `lowerarm_l`;
   collassare le 4 tabelle grip in una. AxesHelper dietro un debug flag.
4. **[M] Facce** — ✅ FATTO (commit seguente): la regola cappuccio tiene il viso visibile nelle cowl aperte
   (solo elmi pieni nascondono la testa); l'outline NON viene più messo sulle mesh-base → occhi/viso non più
   mangiati. Tutte e 4 le classi ora hanno una faccia. Verificato con l'inspector (`/inspect.html`).
5. **[L] Contratto visivo** — `materials.ts` `toGameMaterial()` (toon ovunque, anche i 2 viewmodel); UN `palette.ts`
   (elementi+team); UN `OUTLINE` spec; viewmodel DENTRO il composer; **stop allo swap di pipeline in hit-stop**
   (congela la sim, non il post-FX); tint team nel diffuse (self=blu/enemy=rosso a colpo d'occhio); ramp-toon vs grade: un solo padrone.
6. **[L] HUD** — un `#hud-root` bottom-center a griglia; **cablare la risorsa di classe** (Fury/Momentum/… — CSS c'è, elemento mai inserito);
   ricostruire la barra (ghost-damage, heal-flash, gloss); nameplate in classi CSS condivise, scala con la distanza.
7. **[L] Menu** — **self-host Rajdhani+Inter woff2 + `@font-face` + preload** (ROI altissimo); `menu-bg.ts` vero (hero classe su turntable);
   purga CSS morto/duplicato; via le emoji come icone; una sola lingua.

## Decisioni (prese, modificabili)

- **A — Rig:** fix in codice ORA (skeleton condiviso), poi re-export pulito degli asset come igiene finale con test screenshot per-classe. NON ricostruire il loader: è sano.
- **B — Statura:** `1.9 m` (eroico ma non rotto). **Stile:** il ramp-toon possiede lo split ombra/luce; tolgo lo split-tone dal grade. Il cel è il brand.

**Niente di tutto questo è un "rifare da zero".** Sono 6 fonti-di-verità mancanti. Aggiorno questo file man mano.
