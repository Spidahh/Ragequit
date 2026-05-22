---
id: visual_redesign_system
title: Visual Redesign System
section: art
tags: [visual_system, hierarchy, rules, debt]
provides: [visual_system_rules, visual_screen_hierarchy, visual_debt_register]
deps: [13_graphic_redesign_blueprint.md, 11_ui_redesign_plan.md]
status: active
---

# RAGEQUIT Visual Redesign System

> 2026-05-22 update: menu, HUD, Loadout, spell/projectile feedback and class
> indicators must be redesigned as one arena-FPS system. Fixed-transfer and old
> mastery references are runtime debt until the class and sustain passes land.

## Direzione

RAGEQUIT deve sembrare una arena PvP fantasy da combattimento competitivo: scura, sporca, leggibile, aggressiva, ma non caotica. La grafica deve servire prima l'aim e la lettura dei colpi, poi la personalita.

Il linguaggio unico e:

- **Estetica di Riferimento Obligatoria**: La grafica di gioco, gli asset tridimensionali, la modellazione e l'illuminazione devono uniformarsi e trarre diretta ispirazione dagli screenshot di esempio presenti in `E:\GIOCHI\ASSET_GRAFICA\esempio` (in particolare [esempio1.png](file:///E:/GIOCHI/ASSET_GRAFICA/esempio/esempio1.png), [esempio2.png](file:///E:/GIOCHI/ASSET_GRAFICA/esempio/esempio2.png) e [esempio3.png](file:///E:/GIOCHI/ASSET_GRAFICA/esempio/esempio3.png)). Le altre AI e tutti gli sviluppatori futuri devono allinearsi rigorosamente a questa direzione estetica e non introdurre elementi al di fuori di questo stile.
- arena low-poly scura con accenti elementali saturi (ispirata direttamente agli screen di esempio);
- UI da war-console arcana, piatta, allineata, senza look da pagina web;
- pannelli rettangolari, pochi bordi, forte gerarchia tipografica;
- oro solo per focus, conferma, primed action e class-mechanic emphasis;
- rosso solo per danno, pericolo, morte o azione distruttiva;
- elementi magici riconoscibili da colore + forma + ritmo, non solo colore.

## Gerarchia Schermo In Game

Centro:

- crosshair;
- cast bar solo quando serve;
- feedback hit/parry/primed;
- niente pannelli permanenti al centro.

Basso centro:

- combat console;
- weapon strip;
- ability hotbar;
- utility/recovery strip; legacy transfer strip only while the runtime still has it;
- tutto deve sembrare un unico modulo, non pezzi sparsi.

Sinistra bassa:

- HP, Mana, Stamina;
- class mechanic indicator; legacy mastery only while the runtime still has it;
- final recovery state; legacy transmute/fixed-transfer info only while the
  runtime still has it;
- status icons sopra le barre.

Alto centro:

- round state;
- timer;
- round pips;
- kill counter solo quando il mode lo richiede.

Destra alta:

- kill feed;
- ping tecnico piccolo;
- nessuna informazione primaria qui.

Overlay:

- main menu, pause, settings, scoreboard e loadout condividono bordo, palette, tipografia, bottoni e spaziatura.

## Regole Menu

Main menu:

- logo grande come primo segnale;
- azioni in colonna sinistra;
- tactical brief a destra;
- sfondo arena oscurato;
- nessun layout centrato da landing page.

Loadout Forge:

- header: logo + titolo, flow, classe, class-mechanic state;
- corpo: slot rail, dettaglio abilita, pool;
- filtri e cast mode sempre visibili;
- nessuna card deve sovrapporsi o sembrare tabella web.

Pause/Settings/Scoreboard:

- pannello unico, scuro, centrato o laterale secondo funzione;
- bottoni uguali al menu principale;
- scoreboard deve sembrare risultato match, non modal generica.

## Regole VFX

Spell projectile:

- fire: massa irregolare + coda calda;
- ice: shard appuntito;
- lightning: lance rapida e nervosa;
- dark: cristallo/void rotante;
- nature: dart/spina;
- neutral: orb semplice.

Zone:

- colore elemento;
- bordo leggibile a terra;
- accento interno con ritmo diverso per elemento;
- muri elementali non devono restare arancioni generici.

## Regole Performance

- niente bloom/postprocessing obbligatorio;
- materiali basic/standard economici per VFX brevi;
- niente mesh dense per projectile;
- texture UI statiche solo dove danno identita, come logo;
- DOM live ridotto e stabile;
- animazioni su transform/opacity.

## Cose Da Rifare Dopo Questo Pass

1. Tenere stabile il runtime character FBX legacy ora attivo e valutare ogni futuro replacement solo contro il contratto animazioni/visibilita.
2. Verificare i GLB weapon runtime contro fallback procedurali, silhouette e coerenza materiali prima di un altro replacement pass.
3. Rifare viewmodel bow/staff con asset coerenti e leggeri; ora esiste un fallback procedurale minimo.
4. Arena props e landmark coerenti con la stessa palette, senza elementi che entrano nel cono visivo.
5. Icone ability piu specifiche, almeno per archetipi ed elementi.
6. Un pass su sound feedback, se si vuole chiudere il feeling combat.
