# RAGEQUIT Visual Redesign System

## Direzione

RAGEQUIT deve sembrare una arena PvP fantasy da combattimento competitivo: scura, sporca, leggibile, aggressiva, ma non caotica. La grafica deve servire prima l'aim e la lettura dei colpi, poi la personalita.

Il linguaggio unico e:

- arena low-poly scura con accenti elementali saturi;
- UI da war-console arcana, piatta, allineata, senza look da pagina web;
- pannelli rettangolari, pochi bordi, forte gerarchia tipografica;
- oro solo per focus, conferma, primed action e mastery;
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
- utility/transfer strip;
- tutto deve sembrare un unico modulo, non pezzi sparsi.

Sinistra bassa:

- HP, Mana, Stamina;
- mastery;
- transmute/fixed transfer info;
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

- header: logo + titolo, flow, mastery, stato mastery;
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

1. Sostituire o riparare il GLB personaggio: quello attuale e stato escluso perche si deforma in triangoli enormi in runtime.
2. Sostituire o riparare i GLB weapon: per ora sono esclusi e restano props procedurali per evitare asset instabili.
3. Rifare viewmodel bow/staff con asset coerenti e leggeri; ora esiste un fallback procedurale minimo.
4. Arena props e landmark coerenti con la stessa palette, senza elementi che entrano nel cono visivo.
5. Icone ability piu specifiche, almeno per archetipi ed elementi.
6. Un pass su sound feedback, se si vuole chiudere il feeling combat.
