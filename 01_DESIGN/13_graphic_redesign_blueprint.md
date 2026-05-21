# GRAPHIC REDESIGN BLUEPRINT

Questo documento corregge il tiro rispetto a un semplice inventario asset.

Obiettivo: definire una grafica coerente per tutto RAGEQUIT: logo, shell menu, HUD, Loadout Station, spell, proiettili, VFX, arena e uso degli asset gia presenti o trovati in `E:\GIOCHI\ASSET_GRAFICA`.

## 1. Direzione unica

La direzione da seguire e:

**Arena fantasy low-poly da combat sport, con UI da war-console arcana.**

Non deve sembrare:

- una pagina web con pannelli;
- un prototipo Three.js con palle colorate;
- un asset pack buttato dentro;
- un MMO fantasy generico;
- un neon arena generico.

Deve sembrare:

- un gioco PvP rapido;
- un'arena compatta, aggressiva, leggibile;
- un sistema di build serio;
- un combattimento in cui ogni spell ha identita e funzione chiara;
- un'interfaccia da gioco, non da gestionale.

La coerenza nasce da 4 regole:

1. **Ambiente freddo e muto.** Pietra blu/grigia, ferro scuro, ombre controllate.
2. **UI scura e tagliente.** Pannelli neri/blu, accento oro, testo compatto, niente card web.
3. **VFX saturi e funzionali.** Fire/Ice/Lightning/Dark/Nature devono essere immediati.
4. **Ogni abilita usa forma + colore + movimento.** Non solo colore.

## 2. Logo

### Logo consigliato

Wordmark: **RAGEQUIT** in maiuscolo, condensato, tagliato, inclinazione minima in avanti.

Marchio: **RQ slash mark**.

Forma:

- una `R` compatta che sembra un blocco arena;
- una `Q` spezzata da un taglio diagonale;
- il taglio diventa anche una lama/impact slash;
- sotto o dietro: piccolo ring ottagonale da arena.

Versioni necessarie:

- `logo-full`: scritta RAGEQUIT + slash mark;
- `logo-mark`: solo RQ/slash per favicon, loading, watermark HUD;
- `logo-flat`: monocromatico oro/bianco per UI;
- `logo-danger`: rosso su nero per death/match end.

Stile:

- SVG, non PNG;
- no texture;
- no gradienti pesanti;
- massimo 2 colori: `#E8ECF6` e `#FFD260`;
- variante KO con `#FF3344`.

Posizionamento:

- main menu: grande, alto sinistra/centro-sinistra, non centrato in una card;
- pause/settings/loadout: piccolo in alto a sinistra come brand shell;
- HUD: solo mark piccolo opzionale, mai al centro;
- scoreboard: logo piccolo in alto, winner al centro.

Font logo:

- base: Rajdhani Bold/700 o un SVG custom derivato;
- se si vuole piu cattiveria: costruire il wordmark in SVG con tagli sulle lettere `A`, `G`, `Q`, `T`.

## 3. Shell globale menu

Tutti i menu devono condividere la stessa architettura visiva.

### Background menu

Usare sempre una scena arena scura dietro i menu:

- canvas Three.js visibile;
- camera ferma o slow orbit molto leggero;
- arena desaturata;
- vignette nera ai bordi;
- niente background PNG enormi;
- niente hero/landing page.

Asset da usare:

- `packages/client/public/arena/gladiators_arena.glb`;
- plinth/ring/sigilli decorativi procedurali gia presenti;
- props futuri solo se low-poly e ritintati.

### Layout shell

Struttura comune:

```text
┌─────────────────────────────────────────────────────────────┐
│ LOGO / SCREEN NAME                         profile/status    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   LEFT COMMAND RAIL       MAIN CONTENT / GAME SURFACE       │
│   Play                    Loadout / Settings / Score        │
│   Training                                                   │
│   Loadout                                                   │
│   Settings                                                  │
│                                                             │
│                                                             │
│   footer: build/version/server/ping                         │
└─────────────────────────────────────────────────────────────┘
```

Regole:

- navigazione a sinistra, non bottoni sparsi;
- contenuto principale a destra;
- niente card dentro card;
- massimo 1 pannello principale per screen;
- comandi primari sempre nella stessa zona;
- escape/back sempre alto sinistra o bottom left, coerente.

### Stile pannello

Pannello principale:

- background `rgba(15,17,26,0.88)`;
- bordo 1px `rgba(255,210,96,0.18)`;
- accento oro solo su attivo/primary;
- angoli 6px massimo;
- shadow corta, non glow gigante;
- texture UI solo con CSS noise molto leggero o SVG pattern, non bitmap pesante.

## 4. Main menu

Il main menu attuale deve diventare una schermata da gioco, non una home page.

### Composizione

```text
LEFT 34%                         RIGHT 66%
┌───────────────────────┐        arena visible / player idle / weapon silhouette
│ RAGEQUIT logo         │
│ PvP ARENA COMBAT      │
│                       │
│ PLAY 1V1              │
│ TRAINING              │
│ LOADOUT               │
│ SETTINGS              │
│                       │
│ FFA locked/disabled   │
└───────────────────────┘
```

Il player deve vedere subito:

- titolo;
- 1 comando primario;
- Training;
- Loadout;
- Settings;
- stato server/ping piccolo.

Da togliere o ridurre:

- spiegoni controlli in main menu;
- griglie di card grandi;
- box multipli decorativi;
- mode card bitmap pesanti.

### Visual

Il logo sta sopra la command rail.

Bottoni:

- altezza 48-56px;
- bordo sinistro oro quando hover/active;
- icona a sinistra;
- testo forte;
- descrizione solo per selected/hover in una riga piccola sotto.

## 5. Pause menu e Settings

Pause:

```text
┌ PAUSED ───────────────┐
│ Resume                │
│ Loadout               │
│ Settings              │
│ Return to Lobby       │
└───────────────────────┘
```

Settings:

- tab in alto: `VIDEO`, `INPUT`, `AUDIO`, `GAME`;
- form compatto;
- keybind in righe dense;
- niente layout da pagina HTML lunga;
- pulsanti save/reset sempre bottom right.

## 6. Loadout Station rifatta

Il Loadout Manager attuale va trattato come problema principale di UI.

Non deve sembrare un catalogo.
Deve sembrare una **Build Forge**.

Nome schermata:

**LOADOUT FORGE**

Sottotitolo:

**Build 7 combat actions + 4 utilities**

### Layout consigliato desktop

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ LOGO  LOADOUT FORGE                                      CONFIRM / BACK     │
├───────────────┬──────────────────────────────┬─────────────────────────────┤
│ SLOT RAIL     │ SELECTED ABILITY             │ ABILITY POOL                │
│               │                              │                             │
│ MELEE  R      │ icon + name + role            │ search + compact filters    │
│ BOW    BOW    │ cost cd range cast mode       │                             │
│ MAGIC  1      │ gameplay sentence             │ 3-column cards              │
│ MAGIC  2      │ status applied                │ icon role element cd/cost   │
│ MAGIC  3      │ preview/instant toggle        │                             │
│ MAGIC  4      │                              │                             │
│ MAGIC  5      │ BUILD FLOW                    │                             │
│               │ opener/control/cashout/reset │                             │
│ UTIL Z fixed  │                              │                             │
│ UTIL X fixed  │ MASTERY STRIP                 │                             │
│ UTIL F fixed  │ fire/ice/light/dark/nature    │                             │
│ FLEX V        │                              │                             │
└───────────────┴──────────────────────────────┴─────────────────────────────┘
```

Proporzioni:

- slot rail: 18%;
- selected ability: 36%;
- ability pool: 46%;

### Slot rail

Ogni slot deve essere un oggetto da gioco:

```text
[R]  MELEE     Whirlwind        cooldown/cost mini
[B]  BOW       Piercing Shot    cooldown/cost mini
[1]  MAGIC     Fireball         element pip
...
[Z]  FIXED     HP -> MANA       always visible
```

Regole:

- trasferimenti fissi sempre visibili e bloccati;
- niente testo lungo;
- icona grande a sinistra;
- keybind forte;
- tipo slot piccolo;
- selected slot con bordo oro e glow minimo.

### Selected ability panel

Deve rispondere a 5 domande in 2 secondi:

- cosa fa;
- quanto costa;
- come si lancia;
- che stato applica;
- dove si mette nel build flow.

Struttura:

```text
ICONA GRANDE       FIREBALL
ROLE: CASHOUT      CAST: PREVIEW/INSTANT

Launches a fire projectile. On hit: damage + Burn.

Cost: 30 Mana      CD: 6s      Range: 22m

[INSTANT] [PREVIEW]

Build role:
OPENER  CONTROL  CASHOUT  RESET  SURVIVE
                 active
```

Niente note interne. Niente comparazioni. Niente paragrafi.

### Ability pool

Card compatte, non card giganti.

```text
┌ icon ─────────────┐
│ FIREBALL          │
│ Fire · Cashout    │
│ 30M · 6s · Preview│
└───────────────────┘
```

Filtri:

- riga compatta sopra pool;
- `SMART`, `CONTROL`, `INSTANT`, `PREVIEW` restano;
- element chips come pill piccole;
- search non deve dominare.

### Mobile/narrow fallback

Tre tab:

- `SLOTS`
- `DETAIL`
- `POOL`

Non tentare di comprimere tutto in 3 colonne.

## 7. HUD live

Il live HUD deve essere meno “pannelli” e piu combat cockpit.

### Default layout

```text
top center       round/countdown only
top right        ping/debug only if enabled

center           crosshair, parry ring, cast/charge only

bottom left      HP/Mana/Stamina compact
bottom center    weapons + ability hotbar + utility transfers
right/bottom     status strip small
```

### Bottom combat console

Un unico blocco:

```text
         [Sword] [Bow] [Staff]
[R][BOW][1][2][3][4][5]    [Z][X][F][V]
```

Regole:

- weapon strip non deve sembrare separata dall'hotbar;
- hotbar 60x60;
- utility 48-52px;
- primed ability: bordo oro + crosshair micro ring;
- cooldown: overlay scuro + numero;
- no testi lunghi durante il fight.

## 8. Linguaggio spell e proiettili

Il problema attuale: troppe spell sembrano “sfera colorata + trail”.

La soluzione e separare ogni spell per:

- **forma**
- **movimento**
- **trail**
- **impact**
- **ground/readability marker**

### Archetipi base

Projectile:

- `bolt`: veloce, compatto, trail sottile.
- `orb`: lento, volumetrico, aura.
- `lance`: lungo, direzionale, punta chiara.
- `shard`: frammenti multipli o cristallo.
- `wave`: arco o slash frontale.
- `beam/ray`: linea istantanea breve.
- `field`: area persistente con bordo netto.
- `wall`: volume verticale leggibile.
- `dash`: streak sul player, non proiettile.
- `totem/trap`: oggetto world + stato armato.

### Fire

Identita: aggressivo, esplosivo, bordi caldi, coda instabile.

Forme:

- fireball: orb irregolare con corona;
- flame wall: segmenti verticali + bordo a terra;
- ignite: ray corto/mark sul target, non palla;
- meteor: warning circle + massa dall'alto;
- eruption: ground cracks + burst verticale;
- fire blink: dash streak rosso/arancio + afterimage breve.

Asset/codice:

- usare sprite `vfx/kenney/fire_*`, `flame_*`, `muzzle_*`;
- projectile mesh: sphere low-poly + 2 sprite flame billboard;
- impact: ring espansivo + sparks.

### Ice

Identita: geometrico, cristallino, tagliente, movimento piu secco.

Forme:

- frost_bolt: shard/lancia azzurra, non orb;
- ice_wall: blocchi verticali low-poly trasparenti;
- blizzard: field circolare con piccoli shard orbitanti;
- freeze_target: snap reticle + cristallo che chiude sul target;
- frost_pillar: warning circle + colonna/cristallo che sale.

Asset/codice:

- mesh cone/cylinder/sphere low-poly;
- sprite `p_ice_*`;
- niente fumo morbido: usare shards e ring freddi.

### Lightning

Identita: istantaneo, spezzato, nervoso.

Forme:

- chain_bolt: polyline segmentata, non sfera;
- thunder_clap: ring shockwave dal player;
- storm_field: field con linee verticali random;
- lightning_dash: dash streak giallo, immagine residua;
- arc_lift: colonna/beam verso alto + lift indicator.

Asset/codice:

- `THREE.Line`/tube semplice;
- sprite spark/trace;
- materiali basic additive, durata corta.

### Dark

Identita: vuoto, sottrazione, viola/nero, bordi deformati.

Forme:

- shadow_bolt: shard scuro con core viola;
- curse_of_weakness: sigillo sopra target;
- life_drain: tether caster-target, non projectile;
- dark_barrier: dome/ring difensivo;
- void_spike: spike dal terreno o lancia nera verticale.

Asset/codice:

- sprite `p_dark_*`, aura dark;
- line/tether con alpha;
- torus/ring scuri.

### Nature

Identita: radici, spine, veleno, crescita dal terreno.

Forme:

- poison_dart: piccolo dardo verde, trail tossico sottile;
- thorn_field: ground roots/spikes lungo bordo;
- entangle: radici ai piedi;
- healing_totem: totem world, non semplice aura;
- root_upthrow: radice che spinge su;
- vine_dash: dash con scia di foglie;
- self_heal: pulse verde dal corpo.

Asset/codice:

- `sm_totem_healing.fbx` come candidato forte;
- sprite leaf/poison/wind;
- mesh vine/ring con cylinder sottili.

### Bow

Le frecce non devono essere spell colorate.

- piercing_shot: freccia lunga con trail bianco stretto;
- volley: 3-5 arc lines/frecce leggere;
- pin_shot: freccia con impact root marker;
- snare_trap: oggetto a terra + stato armato;
- marksman_shot: reticle/crosshair sharpen + projectile pulito;
- disengage_shot: shot + dash back streak;
- broadhead: freccia pesante, trail corto;
- blast_arrow: freccia normale + explosion fire on impact.

### Melee

- whirlwind: slash ring attorno al player;
- gap_closer: body streak, non projectile;
- uppercut: vertical arc + lift indicator;
- bleed_strike: red slash + blood particles;
- guard_break: shield crack icon/impact;
- rending_dash: red dash slash.

## 9. VFX mapping per abilita

| Ability | Visual identity |
|---|---|
| whirlwind | circular slash ring + red/white edge |
| gap_closer | forward body streak + ground dust |
| uppercut | vertical slash arc + lift column |
| bleed_strike | red slash + small blood spray |
| guard_break | bright impact star + cracked shield glyph |
| rending_dash | red dash trail + slash impact |
| piercing_shot | thin bright arrow trail through target |
| volley | multiple light arrow traces |
| pin_shot | arrow impact + root pin marker on feet |
| snare_trap | low trap mesh + armed pulse ring |
| marksman_shot | focused reticle + clean long arrow |
| disengage_shot | arrow + backward dash streak |
| broadhead | heavier arrow, short brutal trail |
| blast_arrow | arrow then fire burst on impact |
| fireball | unstable orange orb + flame tail |
| flame_wall | vertical flame panels + hard ground edge |
| ignite | instant target mark + burn burst |
| meteor | warning circle + falling mass + ring impact |
| eruption | cracked ground + vertical fire burst |
| fire_blink | red/orange dash streak + arrival burst |
| frost_bolt | ice shard projectile |
| ice_wall | translucent block wall + frosty base |
| blizzard | circle field + orbiting shards |
| freeze_target | ice lock reticle + snap crystal |
| frost_pillar | ground warning + rising crystal |
| chain_bolt | jagged line segments target-to-target |
| thunder_clap | expanding shock ring from caster |
| storm_field | field boundary + vertical lightning ticks |
| lightning_dash | yellow zigzag streak |
| arc_lift | upward bolt column + lift ring |
| shadow_bolt | dark shard with violet core |
| curse_of_weakness | dark sigil over target + purple pulse |
| life_drain | tether beam caster-target |
| dark_barrier | dark dome/ring shield |
| void_spike | black/violet spike from ground |
| poison_dart | small green dart + toxic trail |
| thorn_field | root/spike field boundary |
| entangle | roots wrap feet |
| healing_totem | placed totem + green pulse radius |
| root_upthrow | root spike lifting target |
| vine_dash | green dash with leaf trail |
| self_heal | body-centered green pulse |
| quick_dash | neutral white/blue movement streak |
| ping_mark | target reticle marker |
| cleanse_surge | white/green burst washing outward |
| barrier | clear shield ring/dome |
| energize | cyan/green resource spark around body |
| phase_shift | transparent ghost duplicate + fade |
| smoke_screen | smoke cloud field, low opacity edges |
| transfer_hp_mana | red-to-cyan UI/world micro pulse |
| transfer_mana_stam | cyan-to-green UI/world micro pulse |
| transfer_stam_hp | green-to-red UI/world micro pulse |

## 10. Asset usage from ASSET_GRAFICA

Use now / useful:

- `threejs_lowpoly_asset_pack\crate.glb`, `barrel.glb`, `rock.glb`, `crystal.glb`, `wood_fence.glb`: arena props after toon recolor.
- `asset_vecchi\environment\meshes\sm_totem_healing.fbx`: candidate for healing_totem, convert/inspect before runtime.
- `asset_vecchi\vfx\kenney\*.png`: sprite source for slash/spark/smoke/trace/fire/magic.
- `asset_vecchi\vfx\particles_png\*.png`: small particle source for element variants.
- `1resetgrafico` / `2resetgrafico` SVG icons: already suitable style; keep SVG sprite route.

Do not use directly:

- giant menu backgrounds/modecards;
- 2K PBR cobblestone set;
- large FBX character/mutant pipeline;
- old 512/1024 PNG icons;
- large music files until audio strategy is separate.

## 11. Implementation sequence

### Phase 1: Identity and menu shell

- Add SVG logo/mark.
- Replace current main menu visual hierarchy with command rail + arena backdrop.
- Make pause/settings use same shell.
- Do not touch input logic.

### Phase 2: Loadout Forge

- Rebuild Loadout Station layout around slot rail, selected ability, pool.
- Keep all existing loadout rules.
- Keep SMART/CONTROL/INSTANT/PREVIEW.
- Keep transfer slots fixed and obvious.

### Phase 3: VFX language foundation

- Build VFX archetype helpers:
  - bolt
  - shard
  - orb
  - beam
  - field
  - wall
  - dash
  - trap/totem
- Use current ability IDs to pick archetype.
- Use sprite atlas or procedural mesh, not one-off random files.

### Phase 4: Spell identity pass

- Fire/Ice/Lightning/Dark/Nature variants.
- Melee/Bow distinct treatment.
- Replace generic projectile look.

### Phase 5: Arena coherence

- Recolor current arena GLB/procedural parts into the same palette.
- Add only a few lightweight props.
- Remove visual haze/noise that competes with spells.

## 12. Acceptance criteria

The redesign works only if:

- main menu looks like a game screen in 2 seconds;
- Loadout Forge can be understood without reading paragraphs;
- every spell archetype is identifiable by silhouette before color;
- fire/ice/lightning/dark/nature are impossible to confuse;
- projectiles no longer all look like identical glowing balls;
- HUD does not block aim;
- no heavy random asset breaks the low-poly style;
- the whole game feels like one product.
