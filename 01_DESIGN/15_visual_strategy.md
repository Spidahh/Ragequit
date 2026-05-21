# VISUAL STRATEGY

Strategia grafica per RAGEQUIT, basata su `12_game_graphic_audit.md`, `09_visual.md`, `11_ui_redesign_plan.md` e `../02_TECH/06_visual_performance_contract.md`.

Obiettivo: ottenere un look moderno, coerente e leggero per un browser arena combat Three.js senza rompere leggibilità, input, performance o contratto multiplayer autoritativo.

## 1. Interpretazione del gioco

### Esperienza offerta

RAGEQUIT sembra offrire un’arena PvP rapida, leggibile e build-driven: il giocatore entra in match dopo aver costruito un loadout, cambia arma, usa wheel/direct hotkey, cerca opener, controllo, finisher e reset mentre il server valida ogni risultato.

L’esperienza reale non è un action RPG esplorativo. È un combat testabile, competitivo, compatto, con ritmo da duel arena:

- decisione pre-match nella Loadout Station;
- lettura immediata di arma, cooldown e risorse;
- execution in arena con crosshair, projectile, parry, placement preview e hit feedback;
- loop breve round/live/death/respawn o match end.

### Cosa deve comunicare visivamente

La grafica deve comunicare:

- combattimento skill-based, non idle/autoplay;
- arena leggibile prima dell’estetica;
- tre armi con identità immediata: sword = corpo a corpo, bow = precisione/charge, staff = magie/proiettili;
- cinque elementi riconoscibili solo quando servono: Fire, Ice, Lightning, Dark, Nature;
- risorse come superficie tattica: HP, Mana, Stamina e transfer fissi;
- loadout come build station da gioco, non pagina web;
- server-authoritative feel: feedback chiaro ma mai ingannevole rispetto al risultato validato dal server.

### Cosa deve essere chiaro al giocatore

In ogni momento live devono essere chiari:

- dove sto mirando;
- quale arma è attiva;
- se LMB farà basic attack, bow release, staff bolt, placement confirm o primed ability;
- quale ability è primed;
- se un’abilità è pronta, in cooldown, bloccata da costo o bloccata da stato;
- quali risorse ho e quale transfer posso usare;
- dove finisce una AoE;
- quale player è nemico e quanta vita ha;
- quando subisco danno, parry, blind, freeze/root/stun o death;
- quando un hit è confermato.

### Emozioni e ritmo da sostenere

La grafica deve sostenere un ritmo nervoso ma non caotico:

- pre-match: concentrazione, scelta, build-crafting;
- countdown: tensione breve;
- live: chiarezza, impatto, lettura istantanea;
- hit/parry/death: crunch secco, non cinematiche lunghe;
- training: feedback didattico leggero, senza invadere il centro;
- menu: energia da arena competitiva, non landing page.

Il tono consigliato è “stylized combat sport fantasy”: saturo nei VFX, scuro e controllato nell’ambiente, aggressivo ma non grim-dark.

## 2. Direzioni grafiche possibili

### Direzione A: Stylized Arena Combat Low-Poly

Direzione: modelli low-poly puliti, materiali toon/flat, ambiente scuro-muto, VFX elementali saturi, UI compatta da combat console.

Perché si adatta:

- è già la direzione dei documenti;
- rispetta il renderer attuale con `MeshToonMaterial`, primitive procedurali e GLB leggeri;
- funziona bene con silhouette leggibili e mappe AABB;
- rende sostenibile una futura scala 5v5;
- permette fallback procedurali coerenti.

Pro:

- massima compatibilità con codice e asset attuali;
- basso peso GPU se si riducono luci/materiali standard;
- alta disponibilità di asset gratuiti low-poly;
- ottima leggibilità per hitbox, proiettili e AoE;
- facile creare VFX via codice senza texture complesse.

Contro:

- rischio look “asset pack” se gli asset gratuiti non vengono normalizzati con palette/materiali;
- può sembrare blockout se arena e personaggi non hanno dettagli silhouette;
- richiede regole forti per evitare UI troppo web-panel.

Peso tecnico:

- basso/medio;
- compatibile con GLB, fallback procedurale, instancing e texture canvas;
- nessun bisogno di PBR complesso.

Disponibilità probabile di asset gratuiti:

- alta per props low-poly, armi, environment fantasy/arena;
- alta per icone base e texture CC0;
- media per character rigged perfettamente coerenti con le animazioni attuali.

Rischio di incoerenza:

- medio se si mescolano Kenney, Quaternius, Poly Haven e asset custom senza pass materiale/palette;
- basso se tutti i mesh importati vengono ritinti con materiali toon comuni.

Compatibilità browser desktop:

- buona su browser desktop;
- richiede budget prudente per laptop integrati: pixel ratio controllato, ombre limitate, DOM live pulito.

### Direzione B: Arcane Tech Arena

Direzione: arena più astratta, semi-sci-fi/magitech, forme geometriche pulite, superfici scure, linee emissive, segnali da sport elettronico fantasy.

Perché si adatta:

- il gioco ha già UI scura, gold accent, rings, grid, arena glow e combat console;
- può ridurre dipendenza da asset figurativi complessi;
- mappe AABB e ostacoli geometrici diventano intenzionali invece che blockout.

Pro:

- molto coerente con primitive/procedural Three.js;
- facile ottenere look moderno con pochi mesh;
- VFX elementali leggibili sopra ambiente scuro;
- UI e mondo possono condividere linee, griglie, bracket e glowing edges.

Contro:

- meno fantasy fisico per sword/bow/staff;
- rischio “arena demo neon” se troppe linee emissive sostituiscono silhouette reali;
- minore disponibilità di asset gratuiti perfettamente coerenti rispetto al low-poly fantasy;
- può allontanarsi dal tono “un po’ gore, semplice ma caratterizzato”.

Peso tecnico:

- basso se fatto con primitive, atlas emissive e materiali basic;
- medio se si eccede con bloom, shader glow o postprocessing.

Disponibilità probabile di asset gratuiti:

- media per modular sci-fi/tech;
- alta per icone/SVG;
- media-bassa per fantasy-magitech coerente.

Rischio di incoerenza:

- medio/alto se armi fantasy, player GLB e arena tech non vengono armonizzati;
- basso solo se si trasforma tutto in un linguaggio geometrico comune.

Compatibilità browser desktop:

- buona senza postprocessing su desktop;
- peggiora rapidamente se si tenta glow/bloom pesante.

## 3. Direzione consigliata

Direzione consigliata: **Stylized Arena Combat Low-Poly con accenti arcane-tech solo per UI, sigilli decorativi, telegraph e feedback**.

Motivo:

- è la via più coerente con il gioco reale emerso dall’audit;
- preserva i documenti già presenti;
- sfrutta gli asset già esistenti senza obbligare a riscrivere renderer o camera;
- resta leggera in browser;
- evita di trasformare il progetto in un neon arena generico;
- consente di fare modernizzazione tramite materiali, palette, silhouette, VFX e UI hierarchy invece che tramite mesh pesanti.

La scelta pratica è:

- mondo: low-poly fantasy arena, pietra/metallo/legno, silhouette pulite;
- UI: combat console scura, gold accent, chip compatti, icone nette;
- magic/VFX: arcane-tech leggibile, geometrie semplici, colori saturi;
- player/weapon: stylized low-poly, niente realismo PBR.

## 4. Design system

### Palette colori

Palette base, aderente al progetto:

- Background profondo: `#080B12`
- Panel UI: `rgba(15, 17, 26, 0.85)`
- Panel forte: `#080A12`
- Border soft: `rgba(180, 210, 255, 0.14)`
- Testo primario: `#E8ECF6`
- Testo secondario: `#9AA4B8`
- Testo muted: `#687084`
- Accent/active: `#FFD260`
- Warning/cost fail: `#FF9A3D`
- Danger/death: `#FF3344`

Risorse:

- HP: `#FF3344`
- Mana: `#00D0FF`
- Stamina: `#00FF88`

Elementi:

- Fire: `#FF4500`
- Ice: `#00E5FF`
- Lightning: `#FFE600`
- Dark: `#6A0DAD`
- Nature: `#39FF14`

Ambiente:

- Pietra fredda scura: `#263142`
- Pietra media: `#34455C`
- Bordo consumato: `#52667E`
- Metallo scuro: `#171C25`
- Legno/impugnature: `#5A3A1A`
- Sigil/arcane neutral: `#4C79FF`

Regola: ambiente sotto-saturo, VFX sopra-saturi, UI leggibile ad alto contrasto.

### Gerarchia UI

Layer 0, mondo:

- enemy silhouette;
- projectiles;
- AoE edges;
- placement preview;
- status world feedback.

Layer 1, HUD permanente:

- risorse;
- weapon strip;
- combat/utility slots;
- cooldown readiness;
- ping solo se serve.

Layer 2, HUD contestuale:

- crosshair;
- parry ring;
- bow charge;
- cast bar;
- GCD;
- primed/blocked pulse;
- hitmarker/directional hit.

Layer 3, menu:

- main;
- pause;
- settings;
- loadout;
- scoreboard;
- training teaching.

Nessun nuovo pannello persistente al centro del gameplay.

### Stile HUD

HUD compatto, rettangolare, da arena:

- risorse flat rectangle, mai skew/trapezoid;
- 60x60-style weapon/ability slots;
- active state: gold border/bottom bar + leggero lift;
- cooldown: overlay radiale o fill scuro, numero breve;
- primed: slot gold pulse + ring crosshair;
- cost fail: breve flash arancio sullo slot o sulla risorsa;
- transfer fixed: badge piccolo `FIXED`, sempre visibile in Q/HUD.

HUD live deve usare poche parole. Le spiegazioni lunghe restano in Loadout/Pause.

### Stile menu

Main/Pause/Settings devono sembrare shell di gioco:

- fondo canvas visibile o arena darkened dietro;
- pannelli non più larghi del necessario;
- command rows verticali;
- header grande solo nel main menu;
- pause/settings con heading più piccoli e comandi densi;
- niente card annidate;
- niente hero marketing.

Loadout Station:

- layout tecnico da build bay;
- slot equipaggiati sempre dominanti;
- selected ability panel come cockpit centrale;
- pool filtrabile ma non protagonista;
- flow strip `Opener / Control / Cashout / Reset`;
- mastery pills come stato di build, non decorazione.

### Stile bottoni

Bottoni command-style:

- base scura;
- bordo sottile;
- barra sinistra o bottom accent;
- hover via `transform`/`opacity`, non glow pesante;
- primary gold;
- danger rosso;
- disabled molto desaturato.

Icon button dove il comando è ovvio: back, close, reset, settings, filters. Testo solo per azioni di match/loadout che devono essere inequivocabili.

### Stile icone

Icone flat/SVG monocromatiche con tint per stato:

- ability: silhouette leggibile, 1 simbolo principale;
- elementi: forma + colore, non solo colore;
- weapon: sword/bow/staff distinti a 24/32/60 px;
- utility transfer: frecce risorsa con colori HP/Mana/Stamina;
- status: simboli semplici, massimo due dettagli.

Fonti coerenti:

- `icons-sprite.svg` esistente come base;
- Material Symbols solo se subsettati in SVG/font leggero;
- evitare set misti con stroke/riempimento incoerenti.

### Stile materiali 3D

Materiali consigliati:

- personaggi: `MeshToonMaterial`, 2-3 bande, tint team/element;
- arena: toon/flat, colori freddi e bassi;
- armi: toon/flat, piccoli accenti emissive solo per staff/orb;
- projectiles/previews/zones/VFX: preferire `MeshBasicMaterial`;
- texture: piccole atlas o canvas texture, niente PBR pesante.

Regola: i materiali importati dai GLB vengono normalizzati. Non lasciare ogni asset col proprio look originale.

### Stile luci

Luce leggibile, non realistica:

- una hemisphere per base;
- una directional shadow-casting al massimo;
- rim/fill leggero per silhouette;
- player light solo se serve davvero al contatto;
- torce/spot decorativi con intensità contenuta;
- no nuove shadow-casting dynamic lights.

Le ombre devono aiutare il grounding, non diventare il fulcro del look.

### Stile effetti

Effetti per archetipo + elemento:

- projectile: forma riconoscibile + trail;
- ray: linea/beam istantanea breve, massimo 80-140 ms;
- AoE circle: ground ring + volume leggero;
- wall: plane/box trasparente + bordo netto;
- dash/teleport: afterimage o streak corto;
- shield: ring/halo aderente al player;
- root/freeze/stun: indicatore world vicino ai piedi o torso;
- drain/lifesteal: linea sottile caster-target con colore Dark;
- cleanse: burst anulare breve su self.

Priorità: bordo AoE e direzione del colpo prima di particelle decorative.

### Stile feedback visivi

Feedback obbligatori:

- hit: impact flash + hitmarker + popup opzionale;
- parry: spark argento + ring/crosshair response;
- primed: crosshair gold + slot gold;
- cooldown fail: slot/cd strip pulse;
- cost fail: risorsa interessata pulse;
- placement: preview gold/element, range clamped;
- status hard CC: icona/status + effetto world breve;
- death: overlay/KO + world burst breve, niente ragdoll obbligatorio.

### Font gratuiti o web-safe

Font consigliati:

- HUD: `Rajdhani`, fallback `Arial Narrow`, `Arial`, `sans-serif`.
- UI/body: `Inter`, fallback `system-ui`, `Segoe UI`, `Arial`, `sans-serif`.
- Debug/code: `ui-monospace`, `SFMono-Regular`, `Menlo`, `Consolas`, `monospace`.

Regola payload: self-host o subset quando possibile. Se si usano Google Fonts, limitare pesi e famiglie.

### Regole di coerenza

- Ogni colore saturo in arena deve significare gameplay o stato.
- Ogni abilità deve usare elemento + archetipo, non un effetto casuale.
- Ogni asset importato passa da palette/materiali comuni.
- UI live usa testo minimo.
- Menu usa testo più esplicativo, ma sempre compatto.
- Non introdurre pannelli live persistenti al centro.
- Non usare blur grandi o box-shadow animati lunghi.
- Non aggiungere PBR realistico in mezzo a toon/flat.
- Non usare asset con licenza incerta.

## 5. Performance strategy

### Cosa deve restare leggero

- Projectiles.
- Placement previews.
- Zone walls/circles.
- Hit impacts.
- Status VFX.
- Nameplates.
- HUD live.
- Weapon/ability slots.
- Ambient particles.

Questi elementi possono apparire spesso e devono essere economici.

### Cosa evitare

- Postprocessing bloom globale.
- Shadow-casting lights multiple.
- MeshStandardMaterial per ogni VFX.
- Texture 2K/4K per oggetti piccoli.
- GLB grandi caricati tutti all’avvio.
- Particle system DOM.
- Animazioni CSS lunghe su `filter`, `box-shadow`, `backdrop-filter`.
- Oggetti projectile/zone creati e distrutti in massa senza pooling se il numero cresce.
- Icon font completo non subsettato.

### Cosa può essere fatto in HTML/CSS/SVG

- HUD risorse, cooldown strip, weapon/ability slots.
- Menus, settings, loadout station, scoreboard.
- Radial wheels.
- Icone UI e ability icons.
- Crosshair, parry ring, bow charge, GCD ring.
- Damage flash, blind/death/low-HP vignette.
- Short text feedback e keybind labels.

CSS deve animare soprattutto `transform` e `opacity`.

### Cosa deve stare in Three.js/WebGL

- Arena, player, weapon, obstacles.
- Projectile mesh/trail.
- Placement preview world-space.
- Zone bounds world-space.
- Hit impacts world-space.
- Status effects agganciati ai player.
- Any beam/ray che deve partire dal player o puntare al target in world-space.
- Nameplate position projection può restare DOM, ma la posizione deriva da Three.js.

### Dove usare sprite/texture/shader semplici

- Ground decals AoE: ring/circle texture atlas o geometry ring.
- Status markers: small sprite billboard.
- Hit particles: instanced quads/spheres.
- Fire/ice/lightning/nature/dark small shapes: sprite atlas 256/512.
- UI icons: SVG sprite o Material Symbols subsettati.

Shader semplici ammessi:

- unlit additive/alpha per VFX;
- toon ramp già presente;
- dissolvenza/scale per impact.

### Dove evitare mesh pesanti

- Singoli proiettili.
- Singole particelle.
- Singole icone 3D.
- Dettagli su ostacoli AABB.
- Decorazioni lontane dell’arena.
- Props duplicati non interattivi.

### Dove usare lazy loading

- GLB arena decorativa.
- Character GLB.
- Weapon GLB.
- Audio esterno, se introdotto.
- Texture atlas VFX.
- Icon pack extra non critico.
- Asset specifici di FFA/5v5 quando quelle modalità diventano attive.

Il primo paint deve poter partire con fallback procedurali.

### Dove usare instancing se utile

- Impact burst e shockwave: già usa `InstancedMesh`.
- Ambient particles se diventano mesh invece di Points.
- Props ripetuti: plinths, torches, pillars, stones.
- Status markers ripetuti.
- Floating resource/loot/object markers, se verranno aggiunti.

### Dove usare texture atlas se utile

- Ability/status icons.
- VFX sprite shapes.
- Ground decal masks.
- UI small symbols.
- Blood/spark/frost shards se aggiunti come sprite.

Un atlas piccolo batte molte richieste texture singole.

## 6. Asset strategy

### Asset 3D

Cosa serve:

- player character coerente con capsule e animazioni;
- weapon set sword/bow/staff;
- arena shell;
- ostacoli leggibili per `duel_arena` e `gladiators_arena`;
- props modulari: pilastri, muri bassi, plinth, sigilli, torce, pedane;
- eventuale first-person weapon/viewmodel per bow/staff se confermato.

Cosa cercare:

- low-poly fantasy arena;
- low-poly stylized knights/mages/archers;
- modular stone/ruins/arena props;
- weapons low-poly sword/bow/staff;
- rigged humanoid solo se compatibile o facilmente retargetable.

Formato ideale:

- `.glb` singolo per runtime;
- texture embedded solo se piccole;
- mesh low-poly;
- scale normalizzabile in metri;
- poche material slots.

Licenze accettabili:

- CC0 preferita;
- MIT/Apache/BSD se asset repository lo consente chiaramente;
- CC-BY solo se attribution pipeline è prevista;
- evitare CC-BY-SA/GPL per asset runtime salvo decisione consapevole.

Fonti gratuite probabili:

- Kenney assets: CC0 dichiarato per gli asset sulle pagine ufficiali.
- Quaternius: catalogo ampio di game assets free; verificare licenza del singolo pack scaricato.
- Poly Haven: CC0 per modelli/texture/HDRI, più utile per texture/props che per character gameplay.
- OpenGameArt: usare solo asset con licenza controllata per singolo download, preferendo CC0.

Fallback se non si trova nulla:

- continuare con primitive procedurali esistenti;
- migliorare silhouette con box/cylinder/sphere low-poly;
- normalizzare materiali e colori;
- usare props modulari ripetuti invece di asset unici.

Quando conviene usare codice invece di asset:

- ostacoli AABB gameplay;
- ring arena, spawn pad, sigil floor, telegraph;
- projectile primitives;
- placement preview;
- VFX transienti;
- fallback immediato prima del load GLB.

### Texture

Cosa serve:

- ground stone tile atlas;
- subtle noise/wear per arena;
- small decal masks per AoE/status;
- optional UI metal/noise texture molto leggera.

Cosa cercare:

- seamless stone stylized;
- low-res noise masks;
- alpha rings/circles;
- hand-painted simple fantasy floor, solo se molto leggera.

Formato ideale:

- PNG/WebP 512 o 1024 massimo per atlas;
- repeatable;
- no normal/roughness/metalness obbligatorie;
- preferire color map + vertex/toon shading.

Licenze accettabili:

- CC0 preferita;
- CC-BY solo con attribution chiara.

Fonti gratuite probabili:

- Poly Haven CC0 per texture, da ridurre/semplificare per stylized use.
- Kenney texture/pattern assets se coerenti.
- OpenGameArt solo filtrando licenza.

Fallback se non si trova nulla:

- canvas texture procedurale come quella già presente;
- CSS/SVG pattern per UI;
- DataTexture/noise generato da codice.

Quando conviene usare codice invece di asset:

- floor grid/tile semplice;
- sigil circle;
- AoE boundary;
- cooldown masks;
- noise leggero.

### UI

Cosa serve:

- sistema bottoni;
- slot combat/utility;
- cards loadout;
- filter chips;
- radial wheel sectors;
- resource bars;
- scoreboard/pause/settings shell.

Cosa cercare:

- non serve cercare asset UI completi;
- usare CSS/SVG interno per mantenere coerenza e payload basso.

Formato ideale:

- CSS variables;
- inline SVG/sprite SVG per icone;
- DOM semantic per menu/HUD;
- nessun bitmap UI pesante.

Licenze accettabili:

- codice interno;
- icone Apache 2.0/MIT/CC0;
- evitare kit UI con licenza ambigua.

Fonti gratuite probabili:

- Material Symbols in SVG o font subsettato, Apache 2.0.
- Icone esistenti in `icons-sprite.svg`.

Fallback se non si trova nulla:

- icone geometriche SVG custom create in codice;
- lettere/simboli testuali temporanei solo se leggibili.

Quando conviene usare codice invece di asset:

- quasi sempre per HUD e menu;
- soprattutto cooldown, bars, radial wheel, cast mode badge, mastery pills.

### Icone

Cosa serve:

- weapon icons;
- ability archetype icons;
- element icons;
- utility transfer icons;
- status icons;
- settings/menu/back/reset/filter icons.

Cosa cercare:

- set flat coerente, preferibilmente single-stroke o filled;
- simboli semplici leggibili a 24 px.

Formato ideale:

- SVG sprite;
- per Material Symbols: subset dei nomi usati;
- niente PNG per icone base.

Licenze accettabili:

- Apache 2.0;
- MIT;
- CC0;
- CC-BY solo con attribution.

Fonti gratuite probabili:

- Material Symbols.
- OpenGameArt/Kenney per pack icon solo se stile e licenza combaciano.

Fallback se non si trova nulla:

- generare SVG geometrici nel repo;
- mantenere `icons-sprite.svg` e ampliarlo con pochi simboli coerenti.

Quando conviene usare codice invece di asset:

- transfer arrows;
- cooldown overlays;
- cast mode markers;
- simple element glyphs.

### Effetti

Cosa serve:

- projectile trail per arrow/bolt/element;
- impact per hit/parry/air punish;
- AoE boundary;
- wall/field volume;
- status markers;
- drain/lifesteal/cleanse/shield;
- trap arm state.

Cosa cercare:

- non cercare pack VFX complessi;
- cercare al massimo sprite alpha semplici: spark, smoke puff, slash, ring.

Formato ideale:

- small PNG/WebP atlas con alpha;
- geometry + `MeshBasicMaterial`;
- instanced mesh quando ripetuto.

Licenze accettabili:

- CC0 preferita;
- CC-BY solo se gestita.

Fonti gratuite probabili:

- Kenney particle/sprite packs;
- OpenGameArt CC0 sprite VFX;
- generazione AI gratuita solo per concept o sprite mask se licenza commerciale chiara e senza dipendenza da crediti scarsi.

Fallback se non si trova nulla:

- codice: rings, torus, spheres, lines, sprites geometrici;
- canvas-generated radial gradients;
- instanced primitives.

Quando conviene usare codice invece di asset:

- quasi tutti i VFX gameplay-critical;
- quando il timing deve seguire eventi server;
- quando il bordo AoE deve combaciare con radius/width reali.

### Audio, solo se utile

Cosa serve:

- hit melee;
- bow release/impact;
- staff bolt/cast;
- parry;
- cast elementale;
- death/KO;
- UI confirm/back/error.

Stato attuale:

- WebAudio procedurale già implementato;
- nessun file audio esterno necessario per la strategia grafica.

Cosa cercare:

- solo se il procedural diventa insufficiente;
- transienti corti, asciutti, non cinematici.

Formato ideale:

- OGG/MP3 compressi brevi;
- normalizzati;
- lazy-loaded per categoria.

Licenze accettabili:

- CC0;
- CC-BY solo con attribution;
- evitare licenze non commerciali.

Fonti gratuite probabili:

- Freesound filtrato per singola licenza, preferendo CC0.
- OpenGameArt audio con licenza verificata.

Fallback se non si trova nulla:

- mantenere WebAudio procedurale;
- migliorare mapping causa -> suono senza asset.

Quando conviene usare codice invece di asset:

- UI blips;
- parry tone;
- charge/cast tones;
- placeholder e training feedback.

## 8. Domande aperte

1. Qual è il target hardware minimo reale su desktop: PC mid-range o laptop integrato?
2. FFA e 5v5 devono guidare subito budget e HUD, o la strategia deve ottimizzare prima 1v1/Training?
3. Gli asset GLB attuali sono placeholder o devono essere mantenuti come base visuale?
4. Il player locale in bow/staff deve mostrare viewmodel/mani/arma in prima persona?
5. Il minimap documentato va implementato oppure va rimosso dal contratto visuale?
6. I VFX devono diventare unici per ogni singola ability o basta un sistema per elemento + archetipo?
7. La direzione “un po’ gore” deve includere blood particles in live build o restare solo hit flash/stylized burst?
8. Menu e Loadout devono restare DOM/CSS o il main menu deve mostrare una scena arena dedicata dietro?
9. Supabase/account/ranked avranno una UI visibile a breve?
10. L’audio procedurale è considerato parte dello stile o solo placeholder?
11. È accettabile usare asset CC-BY con attribution screen, o si vuole solo CC0/permissive?
12. Quale budget massimo va imposto: draw calls, triangle count, texture memory, bundle size e initial load?
