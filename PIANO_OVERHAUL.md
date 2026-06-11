# PIANO OVERHAUL AUTONOMO — RAGEQUIT

## UPLIFT VISIVO "TRIPLA-A" (sessione 06-11, in corso)

**Sbloccato il collo di bottiglia: ora VEDO il gioco headless.** `tools/verify/shot.mjs`
(`pnpm verify:shot`) — Playwright + Chromium SwiftShader + `gl.readPixels()` cattura frame
3D reali in-match (la rAF mandava in timeout `page.screenshot`). Seeda il profilo configurato,
`SHOT_CLASS=` per arma, `SHOT_FIRE=1` per proiettili/spell. **Gotcha: dopo ogni edit a main.ts
serve restart del dev-server vite** (HMR sull'entry → scena nera).

5 ondate visive, tutte verificate headless + gate-verdi su `main`:

1. **Grade cinematografico + ramp toon 3 bande + pavimento torneo** — `render/grade-pass.ts`
   (vignette/contrasto filmico/split-tone/dither in lineare HDR prima di OutputPass); ramp
   2→3 bande dà forma alle pareti; `world/arena-floor-texture.ts` (grana, anelli, raggi,
   stemma centrale) → il pit ha uno scopo.
2. **Cielo notturno (stelle + luna) + rim lunare + ambiente caldo** — shader sky con starfield
   e luna alonata; rim ciano→blu-luna (toglieva il verde al sandstone); emisferica
   meno-blu (il sandstone non vira più olive di taglio).
3. **Cover in pietra scolpita** — `world/stone-texture.ts` (ashlar greyscale × tint per-altezza):
   le casse-cubo piatte ora sono muratura.
4. **Spell in bloom** — proiettili magici + trail sul layer bloom → alone energetico
   (frecce fisiche restano nitide). Verificato: fireball mage = orbita luminosa.
5. **Bracieri accesi** — le 4 torce (luce+modello+fiamma sprite additiva flicker) spostate
   sulla faccia interna della parete (r 20→16): fuoco visibile nell'arena.

**Direzione confermata**: arena gladiatoria notturna torch-lit (tipo Hades), pulita e
leggibile (competitive), NON buio-cinematografico. **TODO grossi rimasti** (alto valore, ma
rischiosi/non-verificabili headless o design): modelli arma migliori (arco/staff sono rozzi),
mappe più grandi/professionali, char 3ª persona, animazioni, bilanciamento, muzzle/impact juice.
Pareti del colosseo: tentata texture pietra → scartata (UV del GLB stirano/scuriscono).

## STATO FINALE (sessione notturna autonoma)

**14 commit su `main`, tutti gate-verdi e deployati in prod. Gioco verificato LIVE
end-to-end col preview harness (client+server), incl. QA in combattimento.** Riepilogo:

- **Asset: public/ 135MB → 47.5MB (−65%)** — modernizzazione completa:
  - rimosso tutto ciò che il runtime scarta: il toon tiene solo baseColor (`.map`),
    l'arena renderizza a colore piatto (nessun `map:`). Tutte le normal/ORM
    (character+arena) e le arena-baseColor → 64² (−70MB).
  - **WebP**: UI (logo/sfondo/card → −10.6MB), character-baseColor lossless (−5.2MB,
    URI gltf riscritte, **nessun cambio visivo**), 53 ability-icon lossless (−1.3MB).
  - Guardia CI `check:assets` impedisce il ritorno del bloat normal/ORM.
- **Codice morto + sistema duplicato rimossi** (knip-verificato): 7 `record*` di
  stats-tracker (duplicato di hit-stats), 4 funzioni combat-feedback, markBloom/
  computeImpactKick, iconMarkup, trackLoadoutSaved, scene-builder.ts, tool duplicato.
- **2 feature scollegate ricollegate**: setHitStop (freeze nemico) + triggerWeaponRecoil.
- **QA live**: match LIVE con bot in combattimento per ~12s → zero warning/errori oltre
  al Supabase no-DB atteso. Personaggi/UI/icone WebP caricano senza errori (verificato img+gltf).
- **Limite verifica**: lo screenshot del 3D-in-loop non si cattura headless (serve
  Playwright+SwiftShader); ho usato health-signal (LIVE, no errori, GL sano) + screenshot
  DOM/menu (funzionano) + check `naturalWidth>0` sulle immagini.
- **Restano (diminishing/serve occhio umano)**: WebP _lossy_ q90 della baseColor (~5MB in
  più, impercettibile ma non verificabile headless), KTX2/Draco (serve build+verifica
  visiva), strip texture embedded in UAL1/fpv_bow.glb.

---

Lavoro autonomo (utente che dorme, pieni poteri). Regola: **`main` sempre verde** —
ogni ondata passa `pnpm check` (typecheck + budget + lint + prettier + content + 257 test)
prima del commit+push. Niente deploy di un gioco rotto.

Obiettivo: gioco moderno, pulito, **customizzabile in futuro**. Rimuovere sistemi doppi e
codice morto, de-bloatare gli asset, modernizzare la pipeline, fixare bug e cose scollegate.

## Onde (ordine per leva × rischio)

> NOTA BRANCH: due linee divergono da `d0e6a7b`. `main` (canonica, 06-11, sistema
> personaggio MODULARE GLTF + fix) e `feat/first-person-viewmodels` (06-06,
> esperimento FPV+FBX `human-character.ts`). Il sistema FBX NON è su main: l'utente
> ha tenuto il modulare. Lavoro su `main`; `feat/fpv` è superato, lo lascio.

- [x] **W1 — Bonifica sicura su MAIN (dead code + orfani, ~6.5MB, rischio zero, verificato)**
  - `game/scene-builder.ts` (duplicato morto del setup scena/bloom, zero call-site)
  - `public/vfx/vfx_blood|smoke|muzzle.png` (mai caricati; getter aliasano a vfx_fire)
  - `public/ui/frame_b|frame_button.png` (orfani; la CSS usa frame_but.png)
  - `public/weapons/kaykit/sword_D.glb` + `public/weapons/{sword,bow,staff}.glb` (leftover)
  - `public/arena/props/Banner_1.gltf+.bin` (superseded da banner_patternA_red)
  - (`human-character.ts` + `characters/human/*.fbx` NON erano su main — solo su feat/fpv)

- [x] **W2a — De-bloat texture mai renderizzate (−67MB, rischio zero, fatto)**
  - SCOPERTA: il materiale toon (`_makeToonMaterial`) tiene SOLO baseColor; normal/ORM/
    roughness vengono scaricate e buttate. Erano ~67MB di download sprecato.
  - `classify-textures.mjs` (analisi data-driven dai gltf) + `shrink-unused-maps.mjs`
    (sharp → 64²). 20 mappe: 67.5MB → 0.15MB. Nessun gltf edit, nessun cambio visivo.
  - public/ 135MB → 68MB.
- [ ] **W2b — Compressione del resto (visivo: serve preview verify)**
  - downscale baseColor 2048→1024 (renderizzate, cambio lieve) · KTX2/Basis · Draco/meshopt
  - strip pulito delle mappe inutili dai gltf (gltf-transform) come versione definitiva

- [x] **W3 — Rete di sicurezza asset (fatto, parziale)**
  - `check:assets` in `pnpm check`: fallisce se una mappa scartata-dal-toon supera 64²
    → i 67MB di normal/ORM non possono più rientrare full-res.
  - launch.json: aggiunta config `ragequit-server` per il preview harness (client+server).
  - TODO futuro: orfani-asset = errore · copertura animazioni (~18 stati) gate.
  - VERIFICA VISIVA: harness preview funziona (client 5174 + server 2567); il match entra
    LIVE senza errori, WebGL sano. Limite: screenshot del 3D in loop va in timeout headless
    → per i cambi visivi (downscale baseColor/KTX2) serve cattura single-frame, da risolvere.

- [ ] **W4 — Loader unico + cache props + preload esteso**
  - un solo `THREE.LoadingManager` · cache+dedup props · preload arena/vfx/icone loadout

- [ ] **W5 — Sistema personaggio modulare "figo & customizzabile"**
  - consolidare il sistema a layer (base+outfit+capelli+accessori) come API dati-driven pulita
  - pipeline Mixamo standardizzata (retarget → libreria unica GLB → prune → audit)

- [~] **W6 — Bug & cose scollegate (sweep continuo)**
  - [x] collegato `setHitStop` (freeze animazione del nemico colpito — macchina già
        presente nel mixer, mai innescata) → ora innescato in onHit per la vittima remota.
  - [x] collegato `triggerWeaponRecoil` (rinculo lama spada) — era ri-esportato ma mai
        chiamato → ora innescato in onHit sull'attaccante (self + remoto via nuovo metodo).
  - Verificato: gate verde + preview entra LIVE senza errori coi nuovi path.
  - TODO: continuare la caccia ad altre cose scollegate/morte.

Aggiorno questo file man mano. Stato live nei commit su `main`.
