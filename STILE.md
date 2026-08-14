# STILE — RAGEQUIT (DECISO E BLOCCATO — valori reali del motore)

> Stato: **DECISO**. Calcolato dai giochi di riferimento dell'utente e **ancorato ai valori già
> presenti nel codice** (`main.ts`, `render/grade-pass.ts`, `world/arena.ts`, `hud/cd-strip.ts`).
> Non si ri-decide più: si misura ogni asset/modifica contro questa spec. Le modifiche si registrano
> nel decisions-log di `PROGETTO.md`. Riferimenti utente: Mordhau, Chivalry 2, Mirage, Vermintide,
> Dark Messiah, Amid Evil, Hexen, Lunacid, Project Sparrow, Spellbreak, Darkfall, Quake.

## LA DECISIONE (una sola, esplicita)

**RAGEQUIT vive a ~75% verso il realistico** sull'asse realistico↔stilizzato: PBR realistico,
desaturato e materico (mondo grounded di Mordhau/Vermintide/Darkfall), con **UN solo strato
deliberatamente stilizzato e iper-saturo — la magia element-coded additiva** (Mirage/Spellbreak/
Amid Evil) — che spicca sopra tutto. **CORREZIONE utente 2026-06-11: è un'ARENA, non un dungeon.**
Il mondo è un colosseo torch-lit **chiaro e leggibile** (materico, gritty, realistico — NON cupo-buio:
si deve vedere bene per combattere). Il contrasto materia-realistica / magia-satura **È** l'estetica.

**Fork alternativo (NON scelto):** spingere a ~55% adottando un toon-ramp alla Spellbreak su
personaggi e mondo per nascondere il budget mesh free. Rifiutato: l'utente odia esplicitamente il
"tinteggiato piatto" e i riferimenti primari (Mordhau/Vermintide/Dark Messiah) sono PBR materico.

> Implicazione: lo stile è già al ~85% impostato nel codice. Questa spec **conferma e blocca** i
> valori giusti e **corregge** dove serve (saturazione grade troppo bassa, soglia bloom, outline
> toon residui in arena). Vedi "Modifiche che questa spec implica" in fondo.

## 1. PALETTE (hex esatti)

**Mondo base** _(albedo, NON metal)_

- Pietra/sandstone arena: `#c0a060` chiave → `#6b6358` media → `#4a453e` ombra (già in arena.ts)
- Pietra dungeon fredda: `#3a3d42`
- Ferro/acciaio sporco (albedo neutro): `#3a3d42` → `#52555c` (il metallo prende colore dall'env)
- Filo lama lucido: `#9aa0a8`
- Cuoio: `#3b2a1c` → `#1c1612`
- Legno invecchiato: `#5a4632` → `#3e2f20`

**Luce e ombra** _(duotono caldo/freddo — il contratto-colore portante)_

- Ombra profonda (MAI `#000000`): `#0c0e12`
- Torcia calda (~1900K): core `#ff7521` (già in arena) → falloff `#ffb066`
- Fill freddo/luna (~6500–8000K): `#3c4768` / cielo hemisphere `#141820`
- Nebbia: `#090a10` (freddo quasi-nero, mai grigio neutro)

**5 elementi (saturi, additivi — SSOT in `ELEMENT_COLOR`, mai ricolorati)**

- Fire: `#ff6a2a` core → `#ffd24a` punta
- Ice: `#6dd6ff` → core `#a8e0ff`
- Lightning: `#ffe244` → core `#fffbe0`
- Dark: `#b870ff` → core `#d8b0ff`
- Nature: `#80e860` → core `#b6ff8c`
- Neutro/none: `#9ba0b4`

**Sangue:** fresco (bagnato, rough bassa) `#7e0b0b` · secco (matte) `#5c1a14`

**UI** _(pergamena/ferro/oro occulto, mai neon)_

- Testo: `#c9bca0` · Accento: `#c9a13b` · Danger/HP: `#9e2b2b` · Pannelli: `#2a2420` @ ~80%

## 2. MATERIALI (PBR) — range per superficie

Regola unica: **il colore vive in albedo+roughness; i metalli sono neutri e guidati dall'env.**
Emissive SOLO magia/torce/fuoco.

| Superficie       | roughness                            | metalness   | normalScale | grime/wear                               |
| ---------------- | ------------------------------------ | ----------- | ----------- | ---------------------------------------- |
| Pietra/sandstone | 0.80–0.95                            | 0.0         | 0.8–1.0     | alto: AO in cavità, grout scuro          |
| Metallo/armatura | 0.40–0.65 usurato / 0.25–0.40 pulito | **0.9–1.0** | 0.6         | edge-wear `#6a6d72`                      |
| Filo lama        | 0.18–0.30                            | 1.0         | 0.4         | unico spec highlight netto ammesso       |
| Cuoio            | 0.55–0.75                            | 0.0         | 0.7         | medio, pieghe lucide                     |
| Cloth/gambeson   | 0.80–0.95                            | 0.0         | 0.5         | desaturato (team-color qui)              |
| Pelle/skin       | 0.45–0.60                            | 0.0         | 0.5         | weathered; tint caldo `#cc7a5a` in ombra |
| Legno            | 0.75–0.88                            | 0.0         | 0.8         | venature, bordi consumati                |

- `envMapIntensity` metalli: **1.0–1.3** con PMREM da cubemap notturna torch-lit.
- Emissive policy: `emissiveIntensity` > 1 SOLO su core spell (2–6), fiamme torcia, runes. Resto = 0.

## 3. ILLUMINAZIONE (valori reali da `main.ts`, confermati + 1 estensione)

- Hemisphere: sky `#9aa6c8` / ground `#6a5a3c`, intensity **3.4** (ARENA chiara — ri-tarato 2026-06-11)
- Key directional (luna): `#9aa6c4`, **1.7**, pos (12,28,14), shadow 2048, bias −0.0008
- Rim/fill: `#3c4768`, **0.35** (CONFERMATO)
- Ground bounce (ember): `#ff7a30`, **0.22**, range 24, decay 2
- Player follow-light (torcia personale): `#ffb070`, **0.7**, range 9, decay 2
- Torce arena: `#ff7521`, **18** (a 2.2 con decay 2 erano troppo deboli), range 30, flicker su intensità+posizione (mai colore)
- HDR exposure: ACES `toneMappingExposure = 1.3`. **IBL** `scene.environmentIntensity = 3.0` (PMREM dark, `render/environment.ts`). _Estensione:_ eye-adaptation
  exposure→`clamp(0.5/avgLum, 0.9, 1.25)` ~2 stop/s (≈ il "feeling Vermintide").
- Shadow: PCFSoftShadowMap, bias −0.0008 (CONFERMATO).

## 4. POST CHAIN (ordine reale: RenderPass → GTAO → bloom → grade → OutputPass/ACES)

1. Tonemapping ACES, exposure **1.1** (CONFERMATO)
2. Bloom emissive-only (layer 1): strength **0.45**, radius **0.55**, threshold **0.75** — tenere; far
   sfondare SOLO i core spell alzandone `emissiveIntensity` a 3–5.
3. GTAO: `blendIntensity 1.2` (CONFERMATO — il maggior upgrade "non-flat")
4. Color grade (`grade-pass.ts`, HDR pre-tonemap): contrast **0.2**, warmth/split-tone **0.06**,
   vignette **0.66**, grain **0.016**. **CORREZIONE: saturation 0.82 → 0.92** (0.82 ingoia le spell).
5. Vignette 0.66 (CONFERMATO) · 6. Film grain 0.016 (CONFERMATO)
6. Sharpening: nessuno · 8. Chromatic aberration: **NO** di default (danneggia il tracking proiettili)

## 5. ATMOSFERA

- Fog `FogExp2` `#121622` densità **0.007** (leggera — è un'ARENA, non un dungeon); background `#07080c`.
- Dust motes: Points ~300–600 additive, drift ~3cm/s, **luminosità guidata dalla vicinanza torce** (DA AGGIUNGERE).
- God-rays: billboard additivi conici sotto torce, `#ffa050` op 0.06–0.12 — **economici, non volumetrici full**.

## 6. PERSONAGGI

- Proporzioni heroic-realistic **1:7.5–8** testa-corpo (no anime/toon); spalle/mani +~10% leggibilità.
  Altezza render bloccata `CHARACTER_RENDER_HEIGHT_M = 1.9`.
- Budget: **15k–30k tris/personaggio**; mob/boss fino a 40k.
- Silhouette distinta in **nero puro** (asimmetria deliberata).
- Outline policy: **rim team-colored**, NON outline nera toon. (Arena ancora da de-outlinare — vedi sotto.)
- Rig: **Mixamo** (standard duro). Tank = `Knight_Met.glb` drop-in.

## 7. LINGUAGGIO VFX (stack a 5 layer additivi)

1. **Core** mesh quasi-opaca, hue elemento alto valore, `emissiveIntensity 3–5`; spell **geometrici/faceted** (no blob).
2. **Glow** alone additivo soft, hue chiaro, op ~0.4.
3. **Trail** ribbon additivo, fade ~0.3–0.5s, **animato a step ~13fps** (snappy, tracciabile).
4. **Particles** sparse additive (ember) o opache (flecks); smoke NON-additivo scuro basso-opacità.
5. **Dynamic point-light per proiettile** (hue = `ELEMENT_COLOR`), range 6–8, vita breve, **spruzza la pietra** = la magia legge come LUCE.

- Blending: additive per caldo/luminoso, alpha per freddo/solido. Restraint: core piccolo, niente white-out.
- Telegraph: manifesta la forma sopra il caster PRIMA del rilascio (fairness).

## 8. CAMERA / VIEWMODEL (valori reali)

- World FOV **90°** (`camFovBase = 90`). Viewmodel FOV **58°** (`VIEWMODEL_FOV = 58`, scena/depth dedicati).
- Framing per arma (`weapon-view.ts`): **prima persona per tutte le armi**; l'unica cosa per-arma rimasta e' `fovDelta`.

> **Ritirato 2026-08-13.** Il gioco e' in PRIMA PERSONA e basta. La camera mista non esiste piu' nel codice: `weapon-view.ts` espone solo `fovDelta` per arma, e da stanotte il rig locale non viene proprio disegnato dalla camera del mondo — era la causa delle "texture mezze trasparenti". Questa regola imponeva una telecamera che il codice non ha, e chi la leggeva avrebbe ripristinato il difetto.

- ~~Originale: Spada = 3ª persona (corpo+lama in frame), Arco = 1ª persona animata,
  Staff = 1ª persona statica (glow su mano in carica). _(L'utente vuole 1ª persona per tutte: vedi
  decisions-log di PROGETTO — direzione FPS-only intenzionale, stato attuale mixto.)_
- Motion: idle sway + step bob + **hit-stop camera kick** 4–6° per 80ms su colpo melee.

## 9. HUD/UI

- Diegetic-leaning, near-zero clutter. Font: serif/blackletter titoli + sans pulito numeri (pergamena, mai neon).
- HP rosso-sangue `#9e2b2b`; accenti elemento solo sulle pip abilità (`--elem-color`).
- Crosshair aim manuale: dot/tick piccolo, op ~30–70%, off-white `#e8dcc8`, mai verde-neon; espande su carica.
- (R6 aperto: i webfont menu non si caricano → cade su Arial. Da bloccare.)

## 10. COHERENCE GATE (5 check — un asset entra SOLO se li passa tutti)

1. **PBR materico, non toon piatto** (roughness/metalness/normal nei range §2; metalli metalness ≥0.9 albedo neutro).
2. **Desaturato + grounded** (albedo browns/greys/earthy; nessun emissive su pietra/cloth/pelle; satura solo i 5 elementi + sangue).
3. **Silhouette leggibile in nero puro**; proporzioni 1:7.5–8; rig Mixamo; no outline nera toon (rim team only).
4. **Coerente col duotono torch-lit** (si comporta bene sotto torcia `#ff7521` + fill `#3c4768` su fog `#090a10`; ombre verso teal, mai grigio).
5. **Budget browser + free** (≤30k tris char; entro `check:budget`/`check:assets`; asset 100% gratis da `ASSET_GRAFICA`; bloom solo su emissive HDR>1).

## Modifiche che questa spec implica (mappate ai file reali)

- `render/grade-pass.ts`: **saturation 0.82 → 0.92** (unica correzione di grade).
- `world/arena.ts`: **rimuovere gli outline toon** (`createOutlineMesh(..., 0x050508)` su shell/props).
- `render/projectile-visuals.ts`: core spell `emissiveIntensity 3–5` + **dynamic point-light per proiettile** (hue da `ELEMENT_COLOR`) + trail a step ~13fps.
- `world/arena.ts` / `main.ts`: **dust motes torch-proximity** + **god-ray billboard** economici.
- Tutto il resto (luci/post/fog/FOV/5 hue) è GIÀ corretto → **bloccato** ai valori sopra.
