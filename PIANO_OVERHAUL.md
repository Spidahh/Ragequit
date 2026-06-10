# PIANO OVERHAUL AUTONOMO — RAGEQUIT

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

- [ ] **W2 — Pipeline asset moderna (leva massima: ~110MB → ~20MB)**
  - step build-time gltf-transform: KTX2/Basis su tutte le texture + Draco/meshopt geometria
  - wiring `KTX2Loader` + `DRACOLoader`/`MeshoptDecoder` nei loader client
  - right-size texture per ruolo (1024² body, 512² trim/normal)
  - verifica visiva (preview harness) prima del push

- [ ] **W3 — Validator esteso = rete di sicurezza**
  - orfani asset = errore CI · texture over-budget = errore · copertura animazioni (~18 stati) gate

- [ ] **W4 — Loader unico + cache props + preload esteso**
  - un solo `THREE.LoadingManager` · cache+dedup props · preload arena/vfx/icone loadout

- [ ] **W5 — Sistema personaggio modulare "figo & customizzabile"**
  - consolidare il sistema a layer (base+outfit+capelli+accessori) come API dati-driven pulita
  - pipeline Mixamo standardizzata (retarget → libreria unica GLB → prune → audit)

- [ ] **W6 — Bug & cose scollegate (sweep continuo)**
  - audit ricorrente correttezza/leak/scollegamenti tra sistemi (server/client/render/HUD/audio)

Aggiorno questo file man mano. Stato live nei commit su `main`.
