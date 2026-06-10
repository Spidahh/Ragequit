# PIANO OVERHAUL AUTONOMO — RAGEQUIT

## STATO FINALE (sessione notturna autonoma)
**8 commit su `main`, tutti gate-verdi e deployati in prod. Gioco verificato LIVE
end-to-end col preview harness (client+server).** Riepilogo:
- **Asset: public/ 135MB → 65MB (−52%)** rimuovendo tutto ciò che il runtime scarta:
  il materiale toon tiene solo baseColor (`.map`); l'arena renderizza a colore piatto
  (nessun `map:`). Tutte le normal/ORM (character+arena) e le arena-baseColor → 64².
  Guardia CI `check:assets` impedisce il ritorno del bloat. La character-baseColor
  (18MB, pelle visibile) e la UI restano (renderizzate).
- **Codice morto + sistema duplicato rimossi** (knip-verificato): 7 `record*` di
  stats-tracker (duplicato di hit-stats), 4 funzioni combat-feedback, markBloom/
  computeImpactKick, iconMarkup, trackLoadoutSaved, scene-builder.ts, tool duplicato.
- **2 feature scollegate ricollegate**: setHitStop (freeze nemico) + triggerWeaponRecoil.
- **Limite verifica**: lo screenshot del 3D in loop non si cattura headless (serve
  Playwright+SwiftShader); verifica via health-signal (LIVE, no errori, GL sano).
  Compressione di character-baseColor/UI (rendered) DEFERRED → serve l'occhio umano.

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
