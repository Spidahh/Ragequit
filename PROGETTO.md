# RAGEQUIT — Il gioco

> Questo documento descrive **il gioco finito**: cosa vedi, cosa fai, come si
> sente. Non è una lista di cose da fare — è come sarà quando è fatto.
>
> I numeri stanno dove servono, a sostegno di una descrizione, mai al posto suo.
> Quando ne leggi uno, quello è deciso: `[M]` misurato sul motore, `[B]`
> verificato da un test, `[S]` standard di settore.
>
> Redatto il 2026-08-15. Motore **Godot 4.7.1**, renderer **Compatibility** —
> l'unico che il browser supporta. Tutto il testo di gioco è in **inglese**.

**Cosa c'è dentro**

|                           |                               |                        |                            |
| ------------------------- | ----------------------------- | ---------------------- | -------------------------- |
| 1 · Che gioco è           | 6 · I nemici del gioco        | 11 · Le schermate      | 16 · L'ordine              |
| 2 · Cosa vedi quando apri | 7 · **Le spell, una per una** | 12 · **Le comodità**   | 17 · Le verifiche          |
| 3 · Come si gioca         | 8 · L'arena                   | 13 · La rete           | 18 · Cosa non si fa        |
| 4 · Le modalità           | 9 · La grafica                | 14 · Gratis per sempre | **Appendice** · i numeri   |
| 5 · Le classi             | 10 · L'audio                  | 15 · Venti ore         | **Appendice** · le abilità |

---

## 1 · Che gioco è

Apri una pagina del browser. In dieci secondi sei dentro un'arena buia illuminata
da torce, con una spada in mano e altri sette che ti vogliono morto.

RAGEQUIT è un **arena PvP in prima persona**. Ti muovi come in Quake — veloce,
con inerzia vera, e puoi guadagnare velocità in aria se sai come — e combatti con
un kit di otto abilità che hai scelto tu prima di entrare, fra quattro classi,
dodici sottoclassi e decine di spell.

Il momento che il gioco vende è questo: **una spell stacca il nemico da terra, e
mentre è per aria e non può schivare, tu lo colpisci.** Si chiama sbalzo, dura
poco più di mezzo secondo, e chiuderlo è la cosa più difficile e più soddisfacente
del gioco.

**Non c'è niente da pagare. Non c'è niente da grindare.** Si scarica in sette
megabyte, gira in una scheda del browser, e si sblocca tutto giocando.

---

## 2 · Cosa vedi quando apri

### Il menù

Fondo scuro, quasi nero-blu. Il logo brucia in alto — lettere arancioni con dentro
un movimento di fuoco. Sotto, un unico bottone grande: **PLAY**. Sotto ancora,
tre tessere per le modalità, e su ognuna un numero: **quanta gente ci sta giocando
adesso**. Non è un ornamento: è l'informazione che ti dice se vale la pena entrare.

Tutto il resto — profilo, impostazioni, poligono — sta piccolo in un angolo. Il
menù non è il gioco, e non deve sembrarlo.

**Dal click al primo colpo passa un click.** Se ne servono due, la schermata è
sbagliata.

### L'arena

Un colosseo di pietra, di notte. Il pavimento è sabbia compattata, chiara,
consumata al centro dove si combatte di più. I muri sono di un rosso mattone
spento. Sopra, cielo notturno vero: stelle, e una luna che fa da luce fredda su
tutto.

L'unica luce calda viene dalle **torce sui muri**, che sputano arancione e creano
pozze di luce sul pavimento. Fra una torcia e l'altra ci sono zone di ombra dove
si può stare senza essere visti subito. Quella alternanza non è decorazione: è la
mappa che partecipa al combattimento.

**Il mondo è desaturato. Le azioni sono sature.** È la regola che tiene in piedi
tutta la leggibilità: se brilla anche il muro, la spell sparisce. Il pavimento è
terra spenta, i muri sono mattone spento, e poi arriva un fascio giallo acceso o
un proiettile arancione e lo vedi da trenta metri.

I nemici sono **rossi ed emissivi**: si staccano dal fondo anche in penombra. Gli
alleati blu. Il colore dice la squadra, mai la classe — la classe la riconosci
dalla silhouette, perché due lingue di colore sullo stesso schermo si combattono.

Sparse sul pavimento ci sono sei o otto **coperture di pietra**, alte quanto un
corpo e mezzo. Ti nascondi dietro, e ci salti sopra: sono fatte apposta per essere
entrambe le cose. E due piattaforme rialzate, raggiungibili con un salto normale —
la verticalità è per tutti, non solo per chi ha preso lo scatto giusto.

### Il tuo personaggio

Lo vedi in prima persona, e **hai un'arma in mano dal primo frame**. La spada sta
in basso a destra, angolata; quando giri il mouse **resta indietro di un istante e
poi rientra**, come farebbe un oggetto vero che ha un peso. Quando corri oscilla
col passo. Quando atterri si abbassa di scatto e risale. Quando colpisci, la
camera prende un calcio secco.

Sono cinque dettagli piccolissimi e sono **la differenza fra tenere in mano
un'arma e indossare un adesivo**. Una prima persona che non disegna niente del
giocatore è una telecamera che galleggia in una stanza.

### L'HUD

In basso a sinistra, in periferia, tre barre: **vita** alta e rossa con il numero
accanto, **stamina** e **mana** più sottili sotto. Stanno lì e non al centro
perché il centro è dove guardi il nemico.

In basso al centro, **otto riquadri**: le tue abilità, ognuna col suo tasto. Quando
ne usi una il riquadro si svuota e **si riempie dal basso** mentre il cooldown
scorre. Non c'è un numero da leggere — in un fight non leggi, guardi.

Al centro, un **mirino a quattro trattini con il buco in mezzo**: si vede sul
pavimento chiaro e sul muro scuro, e non copre quello che stai per colpire. Quando
prendi qualcuno ci compare sopra una **X**, per un sesto di secondo. È il feedback
senza cui uno sparatutto non esiste: senza, non sai se hai colpito.

In alto: punteggio, timer, e **chi sta vincendo**. A destra il **kill feed**, che
dice sempre **con quale abilità** — è così che impari i kit degli altri senza che
nessuno te li spieghi.

E quando tieni qualcuno per aria concatenando colpi, sopra di lui sale un
**contatore combo**. È l'unica cosa in più che compare in partita, e c'è perché
**premia, non insegna**.

Quando ti colpiscono, i bordi dello schermo lampeggiano rosso **dalla parte da cui
è arrivato il colpo**.

---

## 3 · Come si gioca

### Ti muovi

Non c'è sprint. La velocità normale **è** la velocità: 9 metri al secondo, e ci
arrivi in circa un decimo di secondo perché il corpo accelera invece di partire
già lanciato. Quando molli i tasti non ti fermi sul posto: scivoli per **ottanta
centimetri**. Il corpo ha peso, e si sente.

Il salto è un impulso fisso: tenerlo premuto non ti fa saltare più in alto. Se
salti nell'istante esatto in cui atterri, **non perdi velocità** — e se in aria
tieni premuto avanti e giri il mouse di lato, **acceleri oltre il limite di
terra**. Non è un bug: è il tetto di skill del movimento, ed è la prima cosa che
separa chi gioca da mesi da chi ha appena aperto.

Non costa stamina e **non può essere rifiutato**. Un gioco di movimento non mette
il movimento dietro una risorsa da combattimento.

### Colpisci

Tasto sinistro è l'arma: spada, arco o staff a seconda della classe. È **gratis** —
non costa nulla, si può usare sempre, e porta circa il **40 %** del tuo danno. È
deliberato: se le abilità facessero tutto, mirare non servirebbe e il gioco
diventerebbe una rotazione di cooldown.

Tasto destro è la **parata**. Un tap apre una finestra di mezzo secondo che blocca
tutto; tenendolo premuto blocchi il 70 % finché ti regge la stamina. E si vede
addosso al personaggio: chi para davanti a te è leggibile da fuori.

Le otto abilità stanno su `1 2 3 4` e `Q E R F` — il cluster che ogni sparatutto
usa, perché dalla presa WASD l'indice non arriva a `5`-`8` senza staccare la
mano. Il break sta su **`Shift`**: è il tasto che in ogni altro gioco ti fa
correre, e qui è libero proprio perché correre è già la tua velocità normale.

**Nessuna abilità è mai bloccata dall'arma sbagliata.** Se lanci una spell mentre
hai la spada, il gioco cambia arma per te. Mostrarti metà build come "non
disponibile" sarebbe una bugia che ti trasforma otto abilità in due gruppi da
quattro nella testa.

### Le tre forme di un colpo

Ogni abilità arriva in uno di tre modi, e **ognuno ti chiede una cosa diversa**. È
da qui che nascono gli stili di gioco, non dai numeri.

**Il fascio** parte istantaneo, dritto davanti, e colpisce quello che tocca. Ti
chiede di mirare fermo. È largo quanto un corpo — perdona poco, ma abbastanza da
poter prendere qualcuno che vola.

**Il proiettile** viaggia. Ci mette mezzo secondo ad arrivare a venti metri,
quindi contro qualcuno che strafa **devi tirare tre metri davanti a lui**. È un
problema di mira vero, ed è l'unico del kit.

**L'area** esplode intorno a te. Non si mira: si sta nel posto giusto. È il verbo
del corpo a corpo, e la maggior parte degli sbalzi passa da qui.

E vale una regola sola: **quello che vedi disegnato è quello che colpisce**. Il
cilindro luminoso del fascio ha lo stesso raggio del volume che fa danno, l'onda a
terra ha lo stesso raggio dell'area. Un effetto che mente una volta è peggio di
nessun effetto.

### Il momento firma

Colpisci con un'abilità che sbalza. Il nemico **si stacca da terra** e resta per
aria poco più di mezzo secondo, con un bagliore bianco sotto i piedi che lo dice a
tutti.

Lassù non è indifeso: **può ancora mirare, lanciare e parare**. Ma non può
schivare, perché non ha appoggio. Quindi tu hai una finestra, e se in quella
finestra ci infili un fascio o un proiettile, il combo sale e sopra la sua testa
appare `x2`, `x3`.

Lo sbalzo **si somma alla velocità che aveva già**. Non lo ferma: se stava
correndo, vola in diagonale. Azzerargli lo slancio lo trasformerebbe in un
bersaglio fermo — che è l'esatto opposto del rocket di Quake da cui viene l'idea.

**Il danno da caduta è zero, sempre.** Un gioco che ti punisce per essere stato
sbalzato punisce chi sta già perdendo lo scambio.

E c'è un modo per uscirne: **`Shift`, il break.** Non costa slot e non si
sceglie —
ce l'hanno tutti. Annulla una volta il controllo che stai subendo: ti fa cadere da
uno sbalzo, ti libera da una radice. Ha un cooldown lungo, quindi usarlo sul primo
sbalzo significa non averlo sul secondo. **È una decisione, non un pulsante.**

### Muori e torni

Muori in tre secondi di attesa. Sullo schermo, mentre aspetti, compare il **death
recap**: chi ti ha ucciso, **con quali abilità e per quanto danno ciascuna**, e
quanto ne avevi fatto tu.

> _Killed by **SIEGE** — Bastion 45 · Hammerfall 30. You dealt 120._

È lì e non durante il fight per una ragione precisa: **il gioco non insegna mentre
giochi.** In partita non compare mai un suggerimento, una freccia o un tasto che
lampeggia. Le spiegazioni stanno nelle schermate di scelta e nel tutorial; in
partita c'è solo quello che ti dice **cosa è successo**, mai cosa fare.

---

## 4 · Le modalità

Tutte e tre girano sulla stessa arena, con le stesse regole e gli stessi kit.
Cambia **solo come finisce**. Una modalità non è un altro gioco: è un altro modo
di chiudere lo stesso gioco.

### SOLO — tutti contro tutti

Da due a otto giocatori, nessuna squadra. Primo a **25 uccisioni**, o alla
scadenza degli otto minuti vince chi ne ha di più.

Si respawna in **tre secondi**, e questo cambia il carattere della modalità: la
morte costa poco, quindi si combatte in continuazione e si prendono rischi. È la
modalità dove impari il gioco, perché sbagliare non ti mette in panchina.

Verso la fine, quando qualcuno è a 22 e tu a 19, l'arena si stringe da sola: tutti
cercano lo stesso, e la mappa diventa piccola.

### SQUAD — squadra contro squadra

Da 2v2 a 4v4. Punteggio comune, prima squadra a **50**. Il fuoco amico non
esiste.

Il respawn è di **quattro secondi**, uno in più del solo, e non è un dettaglio: in
squadra la tua morte costa a qualcun altro, che per quattro secondi combatte in
inferiorità numerica. Basta quel secondo in più a cambiare come si gioca — si
resta più vicini, si copre, si aspetta il compagno.

Ed è la modalità dove le classi si incastrano davvero: uno sbalza, l'altro
converte. Il momento firma diventa una cosa a due.

### TOURNAMENT — ne resta uno

Otto giocatori, tabellone a eliminazione. Quattro duelli, poi due, poi la finale.
Ogni duello è al **meglio di tre round da novanta secondi**, e nei round **non si
respawna**: se muori, il round è finito.

È l'unica modalità dove ogni singolo errore conta, e si sente. Un solo scambio
sbagliato e sei sotto 1-0.

Chi perde **non viene buttato fuori**: resta a guardare il resto del tabellone in
camera libera, e può seguire chi vuole. Aspettare il proprio turno guardando
qualcun altro giocare è metà del piacere di un torneo.

### E se non c'è nessuno online?

Questa è la domanda che decide se il gioco esiste davvero, perché un PvP gratis è
per la maggior parte delle ore **un gioco contro i bot**.

Quindi: **ogni modalità parte a due giocatori**, i bot riempiono all'istante, e
**gli umani prendono il posto dei bot a partita in corso**, ereditandone il
punteggio. **Non si vede mai una coda.** Premi play e stai combattendo.

E i bot sono avversari, non riempitivo — vedi §6.

---

## 5 · Le classi

Quattro classi, e non si dividono per tema fantasy ma per **che ruolo hanno nel
momento firma del gioco**.

### BREAKER — quello che apre

> _You don't get the kill. You make it possible._

È il corpo più pesante del gioco, 280 punti vita, spada in mano. Il suo mestiere
è **arrivare addosso e staccarti da terra**.

Giocarlo significa attraversare l'arena sotto tiro per arrivare a due metri da
qualcuno, e da lì aprire lo scambio. Da solo converte anche da sé; in squadra
sbalza e lascia finire agli altri. Non è la classe che fa i numeri più alti — è
quella senza cui i numeri degli altri non succedono.

**Le sue tre sottoclassi:**

**SIEGE** tiene il punto. Più vita, meno velocità: chi ti si avvicina paga, e se
ti ignora perde il terreno. Si gioca piantati.

**RAM** arriva. È il corpo più veloce della classe e il più fragile: apri tu lo
scambio, sempre, e se sbagli l'entrata non hai la vita per reggerlo.

**ANVIL** tiene in aria. I suoi sbalzi durano quasi un terzo in più — abbastanza
da farci stare un colpo in più — ma il kit torna più lento. È la sottoclasse che
trasforma un momento in una finestra.

### TALON — quello che chiude

> _Everything you do needs aim. Miss and you're the fragile one._

Duecento punti vita, i più bassi. Arco in mano e un po' di magia per la distanza.
**Tutto quello che fa richiede mira**: non ha un'abilità che perdona.

È la classe con il tetto di skill più alto e il margine di errore più basso. Da
sola si prepara lo sbalzo e converte; in squadra è la cassa che incassa quello che
il BREAKER apre.

**SPIRE** aspetta. Un colpo caricato, lentissimo, che attraversa l'arena — e uno
sbalzo che dura il 30 % in più. Tutto il suo kit è su leash lunga: colpisci una
volta e conta.

**VOLLEY** non aspetta. Cooldown più corti del gioco, vita ancora più bassa: non
cerchi il momento perfetto, tracci il bersaglio e lo consumi.

**TETHER** insegue. Più veloce, ma i suoi sbalzi durano meno: non è la
sottoclasse che juggla, è quella da cui non si scappa.

### WARDEN — quello che decide dove

> _You don't out-damage them. You decide where the fight happens._

Staff, 250 vita, e il pool di magia più profondo del gioco. **Non ti batte in
danno: ti batte in posizione.** Mette zone a terra, rende inutilizzabile il
terreno, e ti costringe a combattere dove vuole lui.

È la classe che cambia la mappa mentre ci giochi sopra.

**BRAMBLE** rivendica il terreno più spesso: cooldown più corti, ma è lenta a
lasciare quello che ha preso.

**PYRE** brucia. Sbalzi più lunghi a costo di un po' di margine: quello che alza,
il campo lo finisce.

**HOLLOW** sopravvive. Più vita, kit più lento: più il fight dura, più è il suo
fight.

### DRIFT — quello che non c'è

> _Never be where they're shooting._

Porta tutte e tre le armi e pesca un po' da ogni scuola, ma **niente di pesante**:
il suo pool è una sezione trasversale scelta sulla rapidità. Il danno più basso
del gioco, la mobilità più alta.

Si gioca non facendosi prendere. È la classe che vince gli scambi che non
avvengono.

**PHASE** è il corpo più difficile da colpire del gioco, e il meno capace di
reggere un colpo.

**SLIPSTREAM** è più veloce e ha il kit più pronto, e ha rinunciato a tutto il
resto per averlo.

**ECHO** ha sempre un'altra risposta pronta — il cooldown più basso di tutti — e
vince sull'informazione invece che sulla velocità.

### Il cerchio

Le quattro classi si mangiano in cerchio, **senza contro assoluti**:

```
BREAKER  ──odia──▶  DRIFT  ──odia──▶  WARDEN  ──odia──▶  TALON  ──odia──▶  BREAKER
   (non lo prende)    (gli toglie il terreno)  (lo colpisce da fuori)  (gli arriva addosso)
```

Nessuno di questi è un contro automatico: sono matchup che **si giocano
diversamente**, non che si vincono da soli.

### La regola che tiene in piedi tutto

**Un kit di classe è chiuso e riconoscibile: guardando un'abilità devi sapere chi
la lancia.**

Non è filosofia, è una cosa misurabile. Nella versione precedente una classe era
legale per il **95 %** delle abilità del gioco — cioè non era una classe, era un
superinsieme di tutte le altre — e aveva **485 volte** la varietà di build della
più povera. Dopo la curatela il rapporto è **8,6×**, che è lo scarto normale di un
gioco vero. `[M]`

E **nessuna classe ha uno slot con una sola opzione legale**: scegliere 1 fra 1
non è una scelta, è un'abilità fissa travestita da build.

---

## 6 · I nemici controllati dal gioco

I bot sono contenuto, non riempitivo, perché sono l'avversario che incontri più
spesso.

**Non mirano per percentuale di colpi a segno** — quella produce un nemico che
sbaglia a caso e che non puoi leggere. Mirano con due parametri, e sono entrambi
visibili nel comportamento:

**Sbagliano di più quando ti hanno appena visto**, e migliorano restando in vista.
E **ruotano a velocità limitata**: non scattano sul bersaglio, ci arrivano. Se ti
muovi di lato in fretta, la loro mira insegue e resta indietro.

**Se rompi la linea di vista, la loro precisione si azzera.** È questo che dà alle
coperture un motivo che non è decorativo, ed è leggibile: ti nascondi, e il loro
prossimo colpo è impreciso.

Si muovono mentre sparano, strafano, tengono la media distanza e usano le
coperture. Un nemico fermo è un bersaglio, e insegna al giocatore l'abitudine
sbagliata.

Tre difficoltà — **Recluta, Veterano, Élite** — che cambiano quei due parametri e
la cadenza di fuoco. In partita mista il default è Veterano, che prende circa
l'88 % dei colpi in vista libera. `[M]`

> **Un nemico che non ti può battere non è un avversario.** Nella prima versione
> l'errore di mira era così largo che era _matematicamente impossibile_ che
> colpisse un corpo: 0 colpi su 1. Il test l'ha preso prima che finisse in
> partita. `[M]`

---

## 7 · Le spell, una per una

Sessantasette abilità. Non sono sessantasette varianti dello stesso colpo: sono
divise in **quattro scuole**, e ogni scuola è un modo diverso di stare in
un'arena.

Ogni abilità porta con sé una cosa che il giocatore legge nella schermata di
scelta: **cosa fa** e **cosa ti costa** — non il costo in mana, ma il difetto.
Ogni spell del gioco ha un difetto scritto, e non è modestia: è così che il
giocatore capisce contro cosa la sta scegliendo.

> `Riposte` — _Instant counter-cut that lifts the target off their feet._
> _No wind-up to read._
> **Shortest reach in the kit — you must already be inside their swing.**

---

### La scuola della spada — 14 abilità

Il corpo a corpo del gioco. Tutte a due-quattro metri, tutte da usare mentre stai
addosso a qualcuno. È la scuola dove si trovano **quattro dei sei sbalzi
migliori**: se il gioco vende il momento in cui stacchi il nemico da terra, questa
è la scuola che lo fa succedere più spesso.

Si paga sempre in stamina, mai in mana. Chi gioca di spada gestisce una risorsa
che si consuma correndo e parando.

**Uppercut** — il gancio. Sbalza sette decimi di secondo, la finestra più lunga
della scuola, ed è l'apertura più pulita che il gioco abbia. Fa solo 16 di danno:
non è lì per uccidere, è lì per creare il momento.

**Riposte** — il contrattacco. Istantaneo, nessun wind-up da leggere, ti stacca da
terra. Ma arriva a 2,2 metri: devi essere già dentro la sua spada.

**Guard Break** — spezza la guardia. Stordisce e sbalza insieme, ma fa 10 di
danno: è il preludio di qualcos'altro, mai la cosa in sé.

**Executioner's Blow** — il colpo che chiude. 52 di danno, il più alto del gioco
in mischia, e sbalza. Undici secondi di ricarica: sbagliarlo significa non averlo
per il resto dello scambio.

**Skewer** — l'affondo lungo. Arriva a 4,2 metri e apre una ferita che sanguina.
Va dritto e si impegna: chi strafa semplicemente non è lì.

**Cleave** — la sciabolata larga. Prende tutti davanti a te in tre metri. Poco
danno, sempre pronta: è il riempitivo onesto della scuola.

**Momentum Strike** — il colpo veloce. Quattro secondi di ricarica, la più corta
del gioco. Non impressiona: martella.

**Whirlwind Slash** — il mulinello. Un secondo intero di rotazione che colpisce
tutto intorno a ogni terzo di secondo. Mentre giri sei più lento e non puoi
riposizionarti: è un impegno, non un'uscita.

**Ground Slam** — il colpo a terra. Radica chi ti sta intorno: non li sbalza, li
inchioda. È la risposta a chi ti sta addosso in tre.

**Hamstring** — il taglio ai tendini. Rallenta. Dodici di danno e otto secondi di
ricarica: la spendi per impedire una fuga, non per fare male.

**Bleed Strike** — il taglio che sanguina. Dieci sul colpo e il resto nei quattro
secondi dopo. Contro chi si cura è il modo di non farlo mai tornare pieno.

**Bloodthirst** — il colpo che ti riporta in vita. Diciotto di danno e ne
riprendi. È la sopravvivenza di chi non arretra mai.

**Gap Closer** — la carica. Sei metri in avanti, danno e rallentamento
all'arrivo. È così che un BREAKER attraversa il campo aperto.

**Rending Dash** — lo scatto che taglia. Cinque metri, e chi attraversi
sanguina. È l'entrata e l'uscita nello stesso tasto.

---

### La scuola dell'arco — 14 abilità

La distanza. Ogni abilità di questa scuola è un **proiettile che viaggia**, e
ognuna viaggia a una velocità diversa: da 34 metri al secondo della Bola ai 500 di
Marksman Shot. Quella differenza _è_ la scuola: imparare quanto anticipare ogni
freccia è il mestiere del TALON.

Nessuna di queste abilità perdona un errore di mira. È deliberato.

**Marksman Shot** — il colpo da cecchino. 500 m/s: non devi anticipare niente,
punti e prendi. Cinquanta di danno, dieci secondi di ricarica, e una finestra di
mira lunga in cui sei fermo e visibile.

**Steady Aim** — il tiro caricato. Mezzo secondo piantato per terra a tendere, poi
48 di danno che attraversano l'arena senza calare. Quel mezzo secondo è il prezzo,
e si vede da fuori.

**Piercing Shot** — la freccia che passa. 150 m/s, traiettoria piatta, 40 di
danno. Hitbox stretta: contro chi si muove di lato sbaglia di brutto.

**Blast Arrow** — la freccia esplosiva. 45 di danno in tre metri di raggio, spinge
e incendia. Vola lenta e in arco: da lontano si schiva il punto d'impatto, quindi
si tira dove sarà, non dove è.

**Point Blank** — a bruciapelo. 38 di danno a quattro metri, e sbalza. È l'arco
che si difende da chi gli è arrivato addosso.

**Split Shot** — tre frecce a ventaglio. Un bersaglio ne prende una frazione: è
per chi arriva in gruppo o per chi non riesci a inquadrare.

**Broadhead** — la freccia pesante. Fa sanguinare quattro secondi e cala molto:
sulle lunghe devi mirare sopra la testa.

**Poison —** _vedi la scuola arcana._

**Skyfall** — la pioggia. Si tira su un punto, non su una persona. Rallenta chi ci
resta sotto.

**Volley** — la salva. Una zona per un secondo e mezzo che colpisce a ondate e
rallenta del 45 %. Il punto di caduta si vede: chi è sveglio esce prima della
seconda ondata.

**Bola** — la corda. Sei di danno e basta, ma radica per più di un secondo. Vola
piano, si legge, e se arriva hai vinto lo scambio.

**Pin Shot** — la freccia che inchioda. Radica quasi tre secondi. È il setup più
lungo del gioco, e chiede una linea di tiro pulita.

**Snare Trap** — la trappola. Si posa ai tuoi piedi, si arma in due secondi, dura
venti. Il primo che ci passa è radicato tre secondi. Si mette prima, non durante.

**Siphon Arrow** — la freccia che ruba. Ti ricura più di quanto tolga, ma toglie
poco. E se sbagli, non ti cura niente.

**Disengage Shot** — il passo indietro. Salti indietro di tre metri sparando in
avanti. Dodici di danno: non è un attacco, è un modo per non essere lì.

---

### La scuola arcana — 27 abilità, cinque elementi

È la scuola più grande e l'unica divisa per **elemento**, perché ogni elemento fa
una cosa diversa al campo di battaglia.

#### Fuoco — il danno nel tempo

Brucia. Il fuoco non è la scuola del colpo secco, è quella che ti lascia addosso
qualcosa che continua.

**Meteor** — la spell più grossa del gioco. 55 di danno, sbalza per **1,2
secondi** — il doppio di uno sbalzo normale — e incendia. Undici secondi di
ricarica, e si tira su un punto: il bersaglio ha il tempo di uscire, se guarda in
alto.

**Fireball** — il classico. Orbita in arco a 30 m/s, esplode in 2,6 metri, spinge
via e incendia. La traiettoria si vede: muoversi di lato la evita.

**Eruption** — il suolo che si apre. Poco danno, ma sbalza sette decimi. È
l'apertura del WARDEN di fuoco.

**Flame Wall** — il muro. Sette metri di fuoco per tre secondi e mezzo. Non
esplode: sta lì e rende un corridoio inagibile. È la spell che cambia la mappa.

**Ignite** — istantanea, nessun danno diretto, tre cariche di bruciatura. È la
spell che si lancia mentre corri.

**Fire Blink** — sette metri in avanti, e dove eri resta una pozza che brucia.
Riposizionarsi e lasciare un problema alle spalle, nello stesso tasto.

#### Ghiaccio — il controllo

Il ghiaccio fa poco danno per scelta. Serve a togliere all'avversario la cosa più
preziosa che ha in questo gioco: **la velocità**.

**Frost Bolt** — il colpo che raffredda. Sedici di danno e una carica di gelo che
dura sei secondi; **ripetuto, arriva al congelamento vero**. È la spell più lunga
da far fruttare e la più forte quando frutta.

**Freeze Target** — il congelamento diretto. Otto di danno e il nemico è fermo.
Dieci secondi e mezzo di ricarica: è una volta a scambio.

**Frost Pillar** — la colonna che sbuca da terra e ti solleva. Sette decimi in
aria, dodici di danno.

**Ice Wall** — sei metri di ghiaccio che **radica chiunque ci cammini sopra**, per
quattro secondi e mezzo. Zero danno. È negazione pura: gli togli metà arena.

**Blizzard** — sette metri di tormenta per cinque secondi, rallenta del 60 %. È la
zona più grande del gioco, e chi ci sta dentro può ancora sparare — non è una
prigione, è una tassa.

#### Fulmine — la velocità

Il fulmine è l'elemento che arriva prima. Ricariche corte, colpi rapidi, e
l'unico sbalzo istantaneo a distanza.

**Chain Bolt** — 32 di danno, sei secondi di ricarica. È la spell da fight, quella
che entra due volte per scambio.

**Arc Lift** — la saetta che solleva. Viaggia a 30 m/s, quindi va anticipata, ma
se prende, quello vola per sette decimi. È l'apertura a distanza del gioco.

**Thunder Clap** — il tuono addosso. Tre metri intorno a te, stordisce e sbalza.
È la risposta di un mago che si è fatto raggiungere.

**Storm Field** — quattro metri e mezzo di tempesta che rallenta e fa danno a
scatti rapidi.

**Lightning Dash** — cinque metri di scatto che fanno danno a chi attraversi.

#### Ombra — il ritorno di vita

L'ombra non fa i numeri più alti. Fa una cosa sola, e la fa meglio di tutti: **ti
rimette in piedi mentre combatti**.

**Life Drain** — il canale. Due secondi e mezzo attaccato a qualcuno: prima gli
strappa la stamina, poi gli succhia la vita e te la dà. Ti muovi o ti colpiscono e
si spezza subito. È la spell più rischiosa del gioco e la più remunerativa.

**Shadow Bolt** — cinque secondi di ricarica, 18 di danno, un quarto torna a te.
È la sostenuta di base dell'ombra.

**Void Spike** — la punta che esce da terra. Sbalza sette decimi.

**Curse of Weakness** — il raggio che maledice: acceca per quattro secondi e gli
svuota il mana, e metà di quel mana torna a te. È la spell che punisce un altro
mago.

**Dark Barrier** — 38 punti di scudo, istantanei. Nessun attacco, nessuna cura:
assorbe e basta.

#### Natura — il terreno

La natura è la scuola del **dove**. Radica, avvelena, e rivendica pezzi di
pavimento.

**Root Upthrow** — le radici che ti lanciano. **Un secondo pieno in aria**, il
secondo sbalzo più lungo del gioco dopo Meteor.

**Entangle** — le radici che ti tengono. 3,2 secondi di root, quattro di danno.
È il fermo più lungo del gioco.

**Thorn Field** — tre metri e mezzo di spine per cinque secondi, rallenta della
metà.

**Poison Dart** — il dardo veloce. Otto di danno subito e veleno per quattro
secondi. Cinque secondi di ricarica: si tira spesso.

**Vine Dash** — cinque metri di scatto, e dove atterri resta una zona che radica
chi ti insegue. È la fuga che lascia una trappola.

**Healing Totem** — cinque secondi di cura lenta. Non ti salva in un fight: ti
rimette a posto fra un fight e l'altro.

---

### La scuola comune — 12 abilità

Nessuna arma, nessun elemento. Sono le abilità che tutti possono prendere, e sono
quelle che decidono **se sopravvivi a un errore**.

**Phase Shift** — sei decimi di invulnerabilità totale. Non puoi attaccare né
lanciare. È la spell che annulla il colpo che ti avrebbe ucciso, e nient'altro.

**Barrier** — 42 punti di scudo per otto secondi.

**Cleanse Surge** — cancella tutti i malus addosso e ti dà due secondi di scatto.
Non cura: ti restituisce il movimento.

**Energize** — 35 di stamina di colpo. Altri scatti, altre parate, altri colpi di
spada.

**Quick Dash** — quattro metri nella direzione in cui ti stai già muovendo.
Nessuna invulnerabilità: mentre scatti ti si può ancora prendere.

**Smoke Screen** — tre metri e mezzo di fumo che acceca chi ci sta dentro. Zero
danno: è terreno negato.

**Mark Target** — un raggio da trenta metri che marca il nemico e gli toglie
stamina. Sei di danno. In squadra è la spell che dice "quello lì".

**Healing Potion** — due secondi fermo a bere, 40 di vita. Se ti muovi si annulla:
non si combatte e ci si cura insieme.

#### Le quattro Recovery — una per classe, e non si scambiano

Ogni classe ha **la sua** cura, ed è l'unica che può prendere. È il modo più
economico che il gioco ha di dire che quattro classi sono quattro cose diverse:
si vede già da come si rimettono in piedi.

**Brace Recovery** (BREAKER) — 50 di vita e uno scudo. Costa molta stamina: dopo
averla usata, per un momento non puoi né parare né scattare.

**Hunter's Flow** (TALON) — 35 di vita e uno scatto insieme. Cura di meno perché
cura _mentre ti sposti_. Lo scatto non ha invulnerabilità.

**Arcane Rebind** (WARDEN) — 60 di vita, la cura più alta del gioco. Ha un
wind-up: se ti interrompono, l'hai persa.

**Adaptive Mend** (DRIFT) — 30 di vita, la più bassa, ma la ricarica più corta
delle quattro. Il DRIFT non torna su in una volta: torna su spesso.

---

### Come si legge un'abilità nella schermata

Nella scelta della build, ogni abilità mostra sempre e solo queste cose, in
quest'ordine:

```
UPPERCUT                                        [ 2 ]
Sword · Melee · 2.5 m

Rising strike that launches the target airborne.
The longest lift in the game.

16 damage · 8.5 s cooldown · 0.7 s airborne

⚠ Almost no damage on its own — this opens, it does not close.
```

Nome, arma e scuola, **cosa fa in parole**, i tre numeri che contano, il difetto.
Non c'è una scheda tecnica lunga, e non c'è niente nascosto sotto un tooltip: se
un'informazione serve a scegliere, sta lì.

---

## 8 · L'arena, in dettaglio

**Una mappa sola alla prima uscita, fatta bene.** Tre mappe mediocri valgono meno
di una che si impara a memoria.

È un colosseo quadrato di cinquanta metri per cinquanta, con muri di otto. Non è
grande: da un capo all'altro ci si mette cinque secondi e mezzo di corsa. È
deliberato — un'arena dove per trovare qualcuno devi cercarlo è un'arena dove non
succede niente.

Il pavimento è sabbia compattata, più chiara e più consumata al centro, dove si
combatte di più. È una traccia di storia: la mappa sembra usata prima che tu
arrivi.

Ci sono **sei-otto blocchi di pietra** sparsi, alti tre metri. Ognuno è alto
abbastanza da nasconderti e basso abbastanza da saltarci sopra, e questa non è una
coincidenza: **la geometria deve partecipare al movimento, non solo fermare i
proiettili**. E due piattaforme rialzate ai lati, raggiungibili con un salto
normale, senza abilità — perché la verticalità deve essere di tutti, non solo di
chi ha scelto lo scatto.

Gli otto punti di comparsa stanno su un cerchio da venti metri, e **non si vedono
fra loro**. Rinascere sotto tiro è la cosa che fa chiudere la scheda del browser.

**Le regole con cui si giudica la mappa finita:**

- ogni angolo ha **due uscite** — nessun vicolo cieco;
- la linea di tiro più lunga è **trenta metri**, che è la gittata massima del
  gioco: oltre è spazio morto;
- dal centro si vedono tutte le uscite, dai bordi no. Il centro è il posto
  pericoloso, e si vede che lo è;
- **un solo punto nel codice decide dove si nasce.** Nel progetto precedente lo
  decidevano tre posti diversi e uno sovrascriveva gli altri: nascevano tutti
  sovrapposti.

---

## 9 · Come è fatto graficamente

### La direzione

**Stilizzata, con silhouette forti. Non realistica.** È una scelta, e ha tre
ragioni concrete che non sono di gusto.

Il realismo è la direzione artistica più cara che esista, e su asset gratuiti di
autori diversi rende **visibile ogni differenza fra loro** — è così che si
riconosce un gioco fatto di pezzi comprati. Poi: **la leggibilità è l'estetica
moderna.** I giochi che sembrano contemporanei sembrano tali perché li capisci al
volo, non perché hanno più poligoni. E infine gira in una scheda di browser sul
renderer Compatibility, che è il vincolo vero e non si aggira.

### La regola del colore

> **Mondo desaturato, azioni sature.**

È la regola che tiene in piedi tutta la leggibilità del gioco, ed è anche la
ragione per cui l'arena è di notte. Un pavimento di terra spenta e muri di mattone
spento non competono con niente; poi arriva un fascio giallo acceso e lo vedi da
trenta metri.

| Ruolo                                               | Colore                    | Dove                                 |
| --------------------------------------------------- | ------------------------- | ------------------------------------ |
| Pavimento                                           | `#6B5C45`                 | terra desaturata                     |
| Muri                                                | `#4A2A22`                 | mattone spento                       |
| Coperture                                           | `#59544D`                 | pietra                               |
| Cielo                                               | `#0D1221` → `#2A2126`     | notte, più calda all'orizzonte       |
| **Torce**                                           | `#FF7521`                 | le uniche sorgenti calde della mappa |
| **Nemico**                                          | `#C72A2E` + emissione 0,9 | silhouette                           |
| **Alleato**                                         | `#3A8FDE`                 | silhouette                           |
| **Tuo fascio**                                      | `#FFC759`                 | BEAM                                 |
| **Tuo proiettile**                                  | `#FF852E`                 | BOLT                                 |
| **Sbalzo**                                          | bianco                    | è uno _stato_, non un elemento       |
| Vita `#FF3344` · Stamina `#00FF88` · Mana `#00D0FF` |                           | HUD                                  |

Il colore dice **la squadra**, mai la classe. Due lingue di colore sullo stesso
schermo si combattono, e il giocatore impara quella sbagliata: la classe la
riconosci dalla sagoma, che a trenta metri di profilo è già diversa.

### La luce

La luna dà una luce fredda, bassa, che arriva ovunque. Le torce sui muri danno
l'unica luce calda, e sono l'unica cosa che si muove nell'illuminazione: il
crepitio fa oscillare la pozza arancione sul pavimento.

Fra una torcia e l'altra ci sono **zone d'ombra vere**, dove una silhouette non si
stacca subito dal fondo. Quella alternanza non è decorazione: è la mappa che
partecipa al combattimento. Chi conosce le ombre attraversa il campo aperto.

C'è nebbia, e c'è per una ragione misurabile: **su un'arena da cinquanta metri
serve una densità fra 0,012 e 0,018.** Al valore che il progetto precedente
chiamava "densa" — 0,007 — copriva il 4 % a trenta metri, cioè non esisteva. `[M]`

### Come si giudica un frame

**Un'immagine si misura, non si guarda.** È la lezione più cara di questo
progetto: a occhio si sbaglia, e si sbaglia sempre nella stessa direzione — verso
il "va bene così".

Quindi ogni frame catturato passa da quattro bersagli:

|                            | Bersaglio  | Perché                          |
| -------------------------- | ---------- | ------------------------------- |
| Pixel più scuro            | **0**      | senza neri l'immagine è slavata |
| Picco                      | **> 240**  | senza bianchi non ci sono luci  |
| Pixel sopra l'80 %         | **< 8 %**  | oltre, il frame è bruciato      |
| Pixel nel decile più scuro | **< 45 %** | oltre, metà schermo è vuoto     |

Due trappole già prese, **entrambe invisibili a occhio nudo**:

- il fascio disegnato **dall'occhio** invece che dalla bocca dell'arma mette la
  camera dentro un cilindro additivo. Il pixel più scuro passa da 0 a **96** e il
  **51,7 %** dello schermo si brucia. Il VFX parte dalla bocca; il test di
  collisione continua a partire dall'occhio. `[M]`
- l'onda dell'area disegnata all'altezza del petto riempie mezzo schermo. Si
  disegna **ai piedi**, più sottile.

### I personaggi

Corpi stilizzati, silhouette leggibile, **una sagoma per classe** riconoscibile a
trenta metri di profilo. Il BREAKER è largo e basso, il TALON è alto e stretto, il
WARDEN ha una massa attorno alle spalle, il DRIFT è il più piccolo.

Attorno a ognuno c'è un **bordo del colore della squadra**, fatto come guscio a
hull invertito. Il suo spessore è **derivato dalla scala del modello** — sei
millimetri su un corpo di 1,9 metri — e non è un dettaglio tecnico: uno spessore
costante applicato a modelli con scale native diverse sparisce su quello grande e
**inghiotte** quello piccolo, che diventa un manichino di plastica colorata. `[M]`

### L'arma in mano

L'arma esiste **dal primo frame**, e ha una scena e una camera sue, disegnate
sopra il mondo. Così non può compenetrare i muri e ha un campo visivo suo.

Cinque comportamenti, tutti piccoli, tutti indispensabili:

- **sway** — resta indietro sul movimento del mouse e rientra a molla;
- **bob** — oscilla col passo, guidato dalla **velocità reale**, così
  l'accelerazione si vede nelle mani;
- **dip** — si abbassa di scatto quando atterri e risale;
- **kick** — quando lanci, l'arma scatta _prima_ che il colpo esista nel mondo;
- **normalizzazione** — la scala è calcolata da una lunghezza a schermo, non da un
  moltiplicatore: un modello diverso entra senza ritarare nulla.

### Il peso di un colpo

Quando colpisci, la camera prende un calcio secco che rientra a molla, e sullo
schermo compare una X sul mirino.

**Mai rallentando il motore.** `Engine.time_scale` è la soluzione ovvia e sbagliata:
rallenta tutto — nemici, proiettili, il colpo che stavi per subire. Misurato, il
proiettile appena lanciato non arrivava più a bersaglio e la vita del nemico
restava a 148. Il peso si dà con la camera, che è visiva e non tocca la
simulazione. `[M]`

### Le prestazioni

|                         | Bersaglio | Misurato          |
| ----------------------- | --------- | ----------------- |
| Frame time medio        | ≤ 16,6 ms | **6,98 ms** `[M]` |
| Frame time p99          | ≤ 33,3 ms | 7,79 ms `[M]`     |
| Draw call               | < 300     | **70** `[M]`      |
| Peso scaricato (brotli) | < 20 MB   | **15,9 MB** `[M]` |

Il margine serve: quei numeri sono misurati su una macchina da sviluppo, e il
gioco deve girare su un portatile con la grafica integrata.

---

## 10 · Come suona

Metà del peso di uno sparatutto sta nelle orecchie: un colpo senza suono non
pesa, per quanto bene sia disegnato. Era la mancanza che, a parità di sforzo,
cambiava di più.

**I suoni sono sintetizzati, non scaricati.** Ventidue forme d'onda generate da
uno script — mezzo megabyte in tutto — invece di una cartella di campioni con
dietro una rincorsa di licenze. Non sono un segnaposto: sono la forma d'onda
giusta per ogni evento, e se un giorno arriva un campione migliore prende lo
stesso nome e lo stesso posto.

### La regola

**Ogni evento che cambia lo stato del gioco ha un suono, e ogni suono dice una
cosa sola.** Tre famiglie che non si confondono mai:

**Quello che fai tu** è secco, in primo piano, senza riverbero — sta nella tua
testa. **Quello che ti fanno** è filtrato e spazializzato, e deve dirti **da
dove**. **Il mondo** sta sotto tutto e non compete mai.

### Cosa suona

| Evento                         | Suono                             | Priorità    |
| ------------------------------ | --------------------------------- | ----------- |
| Passi                          | 4 varianti alternate              | media       |
| Atterraggio                    | tonfo, intensità dalla velocità   | alta        |
| Salto                          | espirazione corta                 | bassa       |
| **Fascio**                     | scarica secca, 0,15 s             | **massima** |
| **Proiettile**                 | lancio grave + sibilo in volo     | **massima** |
| **Area**                       | impatto al suolo + coda           | **massima** |
| **Colpo a segno (tuo)**        | tic acuto, sopra tutto            | **massima** |
| **Colpo subito**               | impatto sordo + passa-basso 0,3 s | **massima** |
| Sbalzo                         | soffio ascendente                 | alta        |
| Parata riuscita                | metallo secco                     | alta        |
| Abilità tornata pronta         | tic discreto                      | bassa       |
| Abilità non disponibile        | tonfo sordo                       | media       |
| Uccisione                      | conferma a due note               | alta        |
| Morte                          | tonfo + attenuazione generale     | alta        |
| Torce                          | crepitio in loop, spazializzato   | ambiente    |
| Vento                          | loop continuo                     | ambiente    |
| Menu: hover / click / conferma | tre suoni distinti                | media       |

**Il suono del colpo a segno è il più importante del gioco.** È l'unico feedback
che un FPS non può non avere: senza, non sai se hai colpito. Deve tagliare sopra
qualunque altra cosa stia suonando, sempre.

**Il combattimento abbassa l'ambiente di 6 dB** mentre suona. Tutte le sorgenti
sono in 3D tranne HUD e menu.

**Musica solo nel menu e nella schermata dei risultati. In partita, niente.** In
un PvP l'informazione direzionale è gameplay, e la musica la copre.

---

## 11 · Le schermate

Sette schermate in tutto. **Tutto il testo è in inglese.**

La regola che le governa tutte: **dal click su PLAY al primo colpo passa un click
solo.** Se una schermata ne aggiunge uno, quella schermata è sbagliata. Chi vuole
solo giocare deve poterlo fare senza mai vedere la scelta della build.

```
MENU ──▶ ARENA ──▶ RESULTS ──▶ MENU
  │        ▲          │
  │        └──── PLAY AGAIN
  ├──▶ ROSTER ──▶ BUILD ──▶ (torna al menu)
  ├──▶ RANGE
  └──▶ SETTINGS
```

### MENU

Fondo quasi nero-blu, il logo che brucia in alto, un bottone **PLAY** grande al
centro. Sotto, tre tessere — SOLO, SQUAD, TOURNAMENT — e su ognuna **quanta gente
ci sta giocando adesso**: è l'informazione che dice se vale la pena entrare, ed è
l'unico numero che il menù mostra.

In basso, piccoli e in fila: il personaggio attualmente scelto (con la sua sagoma
e il nome della sottoclasse), **RANGE**, **SETTINGS**, e il nome che ti sei dato.

Il menù non è il gioco e non deve sembrarlo: niente caroselli, niente notizie,
niente ricompense giornaliere.

### ROSTER — scegliere chi sei

A sinistra le quattro classi, in colonna, ognuna con la sua sagoma. Ne scegli una
e la colonna si apre nelle **tre sottoclassi**.

Al centro, il personaggio scelto **si vede in 3D**, illuminato come nell'arena,
che fa una posa di attesa con l'arma della classe. Al passaggio da una sottoclasse
all'altra il modello cambia, e cambia visibilmente.

A destra, **quattro righe di testo**: la frase-identità della classe, cosa fa nel
momento firma, cosa guadagna e cosa paga la sottoclasse, e una riga sul come si
gioca.

> **RAM** — _Breaker_
> You open every trade. Fastest body of the class.
> **+12 % move speed · −10 % health**
> If you miss the entry, you don't have the health to sit in it.

**Il baratto è scritto sulla stessa riga.** Guadagni e paghi, sempre insieme: una
sottoclasse che ha solo vantaggi non è una scelta.

In basso, un bottone **BUILD** e un bottone **PLAY**. Puoi giocare da qui senza
mai toccare le abilità: ogni sottoclasse arriva con una build già fatta e sensata.

### BUILD — scegliere cosa porti

Otto slot in fila, con i loro tasti sotto: `1 2 3 4 Q E R F`. Clicchi uno slot e
si apre il pool della classe, filtrato per scuola.

Ogni abilità nel pool mostra il nome, l'arma, cosa fa **in parole**, i tre numeri
che contano e il difetto (§7). Passandoci sopra, **al centro dello schermo una
sagoma la esegue**, in loop, con il suo VFX vero: vedi il fascio partire, il
proiettile viaggiare, l'area espandersi. Il raggio disegnato è quello vero.

In alto, tre indicatori che si aggiornano mentre scegli — e sono l'unico
"consiglio" che il gioco dà, senza mai dire cosa fare:

```
TIME TO KILL  5.4 s        LAUNCHES  2        RECOVERY  yes
```

Se una build non ha nessuno sbalzo, l'indicatore lo dice. Se non ha una cura, lo
dice. Non ti impedisce niente.

Sotto, **PRESETS**: tre build già fatte per sottoclasse, con un nome che dice come
si gioca, non cosa contiene. E **RANDOM**, che ne genera una legale — il modo più
veloce che esista per scoprire un'abilità che non avresti mai preso.

Le build si salvano, se ne tengono **cinque per classe**, e hanno un nome tuo.

### ARENA

Il gioco. L'HUD è descritto al §2, e non c'è nient'altro sopra: **nessun
suggerimento, nessuna freccia, nessun tasto che lampeggia.**

Con `Tab` si apre il tabellone: nomi, punteggio, sottoclasse di ognuno, ping.
Sotto ogni nome della squadra avversaria, **le abilità che ti hanno già colpito**
— è il modo del gioco di dirti contro cosa stai giocando senza spiegarti niente.

`Esc` apre un menù minimo: impostazioni, esci, e basta. **Il gioco non si mette in
pausa**: è multigiocatore.

### RESULTS

Alla fine, il tabellone finale e in cima chi ha vinto, con la sua sagoma in 3D che
fa una posa. Per ogni giocatore: uccisioni, morti, danno fatto, danno subito, e
**l'abilità che ha usato meglio**.

E per te tre righe in più:

```
Best streak        4
Longest juggle     x3
Accuracy           41 %
```

Due bottoni, grandi: **PLAY AGAIN** e **MENU**. Il primo ti rimette in coda con la
stessa build, senza passare da nessuna schermata.

### RANGE — il poligono

L'unico posto dove il gioco insegna.

Sei in un'arena vuota illuminata a giorno, con **bersagli fermi, bersagli che
strafano, e un manichino che si cura da solo**. Le abilità **non hanno ricarica** e
non c'è morte.

Sul muro davanti, tre pannelli che si accendono uno alla volta e ti fanno fare tre
cose:

1. **Muoviti** — salta cinque volte di fila senza perdere velocità. Un contatore
   ti mostra la velocità attuale, ed è così che si scopre lo strafe aereo.
2. **Mira** — colpisci il bersaglio che strafa con un proiettile. Il pannello
   mostra dove è arrivata la tua freccia rispetto a dove era lui.
3. **Sbalza e converti** — sbalza il manichino e colpiscilo mentre è per aria.
   Il contatore combo appare sopra di lui.

Fatte quelle tre cose il poligono non ti chiede più niente e resta aperto. Ci si
torna per provare una build nuova, e ci si arriva **anche dalla schermata BUILD**,
con un bottone: provi quello che hai appena scelto senza uscire dal flusso.

### SETTINGS

Una pagina sola, in colonna, senza sottomenù. Tutto è descritto al §12.

---

## 12 · Le comodità — quelle senza cui un gioco sembra un compito

Sono la parte che nessuno nota quando c'è, e che tutti notano quando manca. Vanno
progettate adesso e non "dopo, se c'è tempo", perché sono esattamente le cose che
"dopo" non si fanno mai.

### Non perdere una partita per colpa nostra

**Se la connessione cade, si rientra.** Il server tiene il posto per **trenta
secondi**: ricarichi la pagina e sei di nuovo dentro, con il tuo punteggio, la tua
build e la tua vita. Se non torni, un bot prende il tuo posto e la partita non si
rompe per gli altri.

**Se il gioco si chiude, la build resta.** Tutto quello che scegli è salvato in
locale nel momento in cui lo scegli — mai al momento di uscire.

**Se ti disconnetti da un torneo**, il tuo posto nel tabellone resta finché il tuo
duello non finisce.

### Sapere cosa sta succedendo alla connessione

In alto a destra, sempre visibile e piccolo: **ping** e **FPS**. Il ping cambia
colore sopra i 120 ms.

Se il tuo client e il server si trovano in disaccordo su dove sei — e succede — la
correzione è visibile: il personaggio non teletrasporta di scatto, **scivola alla
posizione giusta**. Se la connessione peggiora davvero, compare una scritta piccola
`UNSTABLE CONNECTION` sopra il ping. Non è un errore: è il gioco che ti dice che
non è colpa tua.

### Comandi

**Tutti i tasti si possono rimappare, tutti.** Anche il break, anche la parata,
anche i tasti del menù. C'è un preset **left-handed** già pronto (IJKL) per non
costringere nessuno a rimapparne dodici a mano.

Sensibilità del mouse con **due decimali**, e accanto il valore convertito nella
scala dei giochi che il giocatore già usa, così può portarsi la sua mira:

```
Sensitivity   1.85       ( ≈ 0.62 in most FPS at 800 DPI )
```

Il campo visivo si regola **da 80 a 120 gradi**, e ha un cursore separato per
l'arma in mano, perché chi gioca a FOV alto vuole l'arma più piccola, non più
distorta.

**Nessun gesto del mouse, nessun doppio click, nessuna combinazione.** Il gioco si
gioca con dita che stanno già su WASD.

### Vedere

Il mirino si personalizza: **spessore, lunghezza, spazio centrale, colore, punto
al centro sì o no**, e un'anteprima che si aggiorna mentre lo cambi. Chi ha una
mira sua vuole il suo mirino.

**Modalità daltonici** con tre profili (protanopia, deuteranopia, tritanopia): il
rosso-nemico e il blu-alleato diventano una coppia che si distingue davvero. Non è
un filtro sopra lo schermo — **cambia i colori delle silhouette e dell'HUD**, che
è dove il colore porta informazione.

Cursori separati per **luminosità** e per l'intensità degli effetti, perché su un
portatile con lo schermo lucido metà del gioco può sparire.

E tre interruttori che tolgono roba: **scuotimento della camera**, **lampo di
danno ai bordi**, **flash quando qualcuno viene sbalzato**. Non sono opzioni di
accessibilità di facciata — servono a chi quelle cose le trova nauseanti.

### Sentire

Cursori separati per **generale, effetti, ambiente, interfaccia, musica**.
E `M` toglie tutto, subito, senza aprire niente — perché a volte serve.

### Testo

**Tutto il testo di gioco è in inglese**, e i nomi (classi, sottoclassi, abilità)
non si traducono mai: sono nomi propri.

Il testo dell'interfaccia si può ingrandire del **125 % e del 150 %**, e l'HUD si
riadatta invece di sovrapporsi.

### Giocare con qualcuno

**Un link.** Premi INVITE, ti viene copiato un indirizzo, lo mandi a chi vuoi.
Chi lo apre entra nella tua stanza — non deve registrarsi, non deve installare
niente, non deve fare amicizia con te dentro il gioco. È un browser: usiamo
l'unica cosa che un browser sa fare meglio di tutto il resto.

Chi entra così resta con te anche nella partita dopo, finché uno dei due non se ne
va.

### Guardare

Da morto in TOURNAMENT, e sempre quando la tua partita è finita, hai la **camera
libera**: `Spazio` cambia giocatore, `F` passa alla prima persona di chi stai
guardando, il movimento del mouse gira la camera. Vedere il suo HUD è metà
dell'imparare.

### Nomi

Ti scegli un nome la prima volta e resta. Se non ne scegli uno, il gioco te ne dà
uno decente invece di chiamarti `Player_8842`.

**Non c'è chat testuale.** In un PvP anonimo e gratuito, una chat aperta è una
funzione di molestia con un costo di moderazione che questo progetto non può
sostenere. Al suo posto ci sono **quattro segnali rapidi** su una rotella
(`Attacking` · `Falling back` · `Nice` · `Sorry`), che dicono tutto quello che
serve in un'arena e niente che ferisca.

### Come si entra

Non c'è registrazione, non c'è account, non c'è email. **Si apre la pagina e si
gioca.** Il progresso sta nel browser; chi vuole portarselo altrove copia una
stringa dalle impostazioni e la incolla sull'altro dispositivo.

---

## 13 · Come funziona in rete

Questa è la parte che il giocatore non vede mai e che sente sempre. Un gioco di
movimento in cui il colpo che vedi andare a segno non va a segno **non è un gioco
lento: è un gioco rotto**, e non c'è grafica che lo salvi.

### Il modello

**Il server decide, il client anticipa.**

Quando premi un tasto, il tuo personaggio si muove **subito** — se aspettasse la
risposta del server, ogni passo costerebbe un giro di rete prima di vedersi, e con
80 ms di ping il movimento di Quake diventerebbe melma.

Quello che mandi al server è **cosa stai premendo**, mai dove ti trovi. È una
differenza che sembra formale e non lo è: mandare la posizione significa lasciar
decidere al client dove sta, che è la prima cosa che un cheat sfrutta.

Il server esegue **la stessa identica funzione di movimento** — lo stesso file,
non una copia — e ottiene la verità. Poi la rimanda indietro. E qui il client fa
la cosa meno ovvia del sistema: **si corregge solo se lo scarto supera i 35
centimetri.** Allinearsi a ogni pacchetto annullerebbe la predizione e rimetterebbe
il ritardo dentro il movimento.

Gli altri giocatori li vedi **interpolati** verso la verità, non ci salti sopra: a
venti pacchetti al secondo, atterrare sulla posizione esatta si vede come scatti.

|                       | Valore             |
| --------------------- | ------------------ |
| Tick del server       | 60 Hz              |
| Invii di stato        | 20 Hz              |
| Soglia di correzione  | 0,35 m             |
| Interpolazione altrui | 35 % per pacchetto |

### Il danno

Il client **dichiara solo l'intenzione**: quale slot, guardando dove. Il server
controlla la ricarica, risolve la forma, applica il danno.

**Nessun numero di danno attraversa mai la rete in salita**, e **la ricarica la
tiene il server**. Un client che tiene la propria ricarica è un client che può
lanciare quanto vuole.

### Il colpo che vedi a segno va a segno

**Il problema.** Tu vedi l'avversario dov'era 60 ms fa. Spari lì, e centri. Ma
quando la tua richiesta arriva al server sono passati altri 60 ms e lui si è
spostato: **a nove metri al secondo sono 1,1 metri, più largo di un corpo.** Vedi
il tuo colpo attraversarlo, e smetti di giocare.

**La soluzione** è vecchia di venticinque anni (Valve, _Latency Compensating
Methods_, 2001): il server tiene uno storico delle posizioni e **riavvolge il
mondo alla vista di chi ha sparato**.

Lo storico copre mezzo secondo, il riavvolgimento massimo è di **due decimi**, e
fra un campione e l'altro si interpola — prendere il campione più vicino sbaglia
fino a sette centimetri, che su una capsula da quaranta è un ottavo del bersaglio.

**Il baratto, dichiarato apertamente:** chi spara guadagna, chi è sparato può
essere colpito dietro un angolo che credeva sicuro. Il limite di 200 ms è la
manopola con cui si dosa: oltre, lo "sparato dietro l'angolo" diventa
intollerabile. Quindi si taglia lì, e chi ha il ping peggiore paga.

> **La trappola che costa settimane se la scopri tardi.** Il test di collisione
> riavvolto **non può passare dal motore fisico**. Godot sincronizza le
> trasformazioni dei corpi al passo di fisica: una query fatta subito dopo aver
> spostato un corpo vede ancora la posizione **vecchia** — e nemmeno scrivere
> direttamente nel PhysicsServer lo anticipa. Il riavvolgimento _sembra_ avvenire,
> il colpo manca lo stesso, e non c'è nessun errore da nessuna parte. Le hitbox
> riavvolte sono una **rappresentazione separata**: capsula verticale, test
> segmento-contro-capsula in matematica pura. È la ragione per cui gli sparatutto
> seri tengono le hitbox fuori dal motore fisico. `[M]`

### Dove gira

Il client è un pacchetto statico su itch.io. Il server è headless, su una macchina
gratuita già attiva e già collegata alla CI. La connessione è **`wss://`** e non
può essere altro: itch serve in https, e una connessione in chiaro viene bloccata
dal browser come contenuto misto.

---

## 14 · Come sta in piedi gratis, per sempre

Questo è il piano completo per pubblicare il gioco e tenerlo vivo **a costo
zero**, e non "zero finché sono pochi": zero anche se domani ci gioca gente.

La regola che decide ogni scelta qui sotto: **niente a consumo.** Un gioco
gratis che ha una bolletta è un gioco che a un certo punto sparisce — e sparisce
proprio nel momento in cui sta funzionando, perché è allora che la bolletta
arriva. Ogni pezzo di questa catena o è gratis senza tetto, o è gratis perché
per la maggior parte delle ore **non è acceso**.

### La catena, pezzo per pezzo

| Cosa                 | Dove                    | Perché è gratis                                                   |
| -------------------- | ----------------------- | ----------------------------------------------------------------- |
| **Il gioco**         | Cloudflare Pages        | statico, banda illimitata, nessun tetto di richieste              |
| **La seconda casa**  | itch.io                 | statico, gratis, ed è dove il pubblico di questi giochi già passa |
| **Il server**        | Fly.io, `shared-cpu-1x` | si **spegne da solo** quando non c'è nessuno                      |
| **La costruzione**   | GitHub Actions          | gratis sui repository pubblici                                    |
| **Personaggi, armi** | Mixamo, KayKit          | già scaricati, licenza che permette la ridistribuzione            |
| **I suoni**          | `tools/make_sounds.mjs` | **sintetizzati**: nessuna licenza da rincorrere, 1,7 MB in tutto  |

Nessuna riga di questa tabella ha un contatore che gira.

### Il pezzo che ha deciso tutto: il browser non sa fare UDP

**Nessun browser può aprire una socket UDP.** Non è una limitazione di Godot: è
la sandbox del web, e vale per qualunque motore. ENet — il trasporto su cui era
costruito il multigiocatore — è UDP, quindi dentro una scheda del browser non si
connette mai. E non fallisce con un errore chiaro: fallisce e basta.

Le alternative erano due, e la scelta è stata decisa dal vincolo del costo zero:

- **WebRTC** dà datagrammi veri, cioè UDP con tutti i suoi vantaggi. Ma vuole un
  server di segnalazione, uno STUN e — quando il NAT è ostile — un **TURN**, che
  è l'unico pezzo dell'intera infrastruttura che **non esiste gratis**. Un relay
  a consumo dentro un gioco che deve restare gratis per sempre è la bolletta di
  cui sopra, con l'aggravante che cresce proprio col successo.
- **WebSocket** è TCP: un pacchetto perso blocca quelli dopo finché non viene
  ritrasmesso.

**Si prende WebSocket, e si paga quel prezzo con gli occhi aperti.** A venti
pacchetti di stato al secondo su otto giocatori il blocco di testa si sente solo
su una connessione già rotta, e in cambio ci sono zero componenti da pagare e un
solo trasporto da far funzionare — **lo stesso su desktop e su web**, quindi
quello che si prova in sviluppo è quello che si spedisce. È la stessa ragione per
cui il renderer è Compatibility ovunque.

### Il server è lo stesso progetto

Non un altro programma, non un'altra lingua, non un'altra copia delle regole: è
`godot/` esportato senza finestra. Il server esegue **lo stesso file**
`movement.gd` che il client esegue per predire, e non possono divergere perché
non sono due.

È la cosa che al progetto precedente è costata di più: server e client erano
entrambi TypeScript ma erano due basi di codice, e ogni divergenza era un
giocatore che vedeva una cosa e ne subiva un'altra.

L'esportato è un **eseguibile solo** — motore e gioco dentro un file — quindi
l'immagine Docker copia un file e lo lancia: niente Godot da installare, niente
runtime, niente npm.

```
godot --headless --export-release "Linux Server" → un binario
Dockerfile.godot: debian-slim + libfreetype + quel binario
```

> **Perché Debian e non `scratch`.** L'eseguibile è dinamico e vuole la libc.
> Con `scratch` il container parte e muore subito con _"no such file or
> directory"_ — che è il messaggio che Linux dà quando manca il **linker**, non
> quando manca il file. È una delle mezz'ore più facili da perdere.

### La macchina che dorme

`min_machines_running = 0`: quando non c'è nessuno la macchina è **spenta**, e
sotto la soglia gratuita non ci si arriva nemmeno. Si riaccende da sola alla
prima connessione.

Il prezzo è che il primo giocatore della giornata aspetta qualche secondo in più
— ed è esattamente per questo che **i bot riempiono la lobby all'istante**:
mentre la macchina si sveglia, chi ha premuto PLAY sta già combattendo. Le due
scelte non sono indipendenti, una copre l'altra.

> **Il controllo di salute è TCP e non HTTP.** Il server parla WebSocket, e una
> `GET /health` su una porta che aspetta un handshake di upgrade viene
> rifiutata: un controllo HTTP dichiarerebbe morta una macchina viva, e la
> piattaforma la riavvierebbe in tondo per sempre.

### Il TLS non è un problema di nessuno

Il client si connette in `wss://`, la piattaforma termina il TLS e inoltra in
chiaro dentro la macchina. Il server non gestisce nessun certificato e non ne
rinnova nessuno — che è il modo più comune di svegliarsi con un gioco offline
dopo tre mesi.

E `wss://` non è opzionale: la pagina è servita in https, e una connessione in
chiaro viene **bloccata dal browser come contenuto misto**. Il blocco non
somiglia a un errore di rete: somiglia a un gioco che non parte.

### Le sette condizioni di itch.io

Ognuna è una settimana persa se scoperta dopo, e per questo **le controlla uno
script prima di ogni pubblicazione** (`tools/package_itch.mjs`) invece di una
lista che qualcuno rilegge:

| Requisito                             | Stato                                                                         |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| Pointer lock nell'iframe cross-origin | **verificato, funziona** — anche senza `allow` `[M]`                          |
| Renderer                              | **Compatibility** — Forward+ non parte sul web                                |
| Template di export                    | **nothreads** — quelli con i thread vogliono header che su itch non controlli |
| Percorsi                              | relativi: itch serve da una sottocartella                                     |
| Connessione                           | solo `wss://`                                                                 |
| Pacchetto                             | zip con `index.html` **in radice**                                            |
| Peso                                  | **16,2 MB** scaricati, tetto 20 `[M]`                                         |

### Come esce una versione

Un commit su `main`, e basta. Il resto è automatico, e **client e server escono
dallo stesso commit o non escono**: una pubblicazione fatta a mano è una
pubblicazione in cui prima o poi qualcuno salta un passo, e il passo saltato è
sempre lo stesso — il client nuovo contro il server vecchio.

```
push su main
  ├─ import risorse · 19 verifiche · export web · export server
  ├─ controllo peso e sette condizioni  →  si ferma qui se qualcosa non torna
  ├─ Cloudflare Pages   ← il gioco
  └─ Fly.io             ← il server
```

Lo zip per itch.io esce dallo stesso giro (`godot-build/ragequit-itch.zip`) e si
carica a mano: itch non ha un modo gratuito di farlo da una macchina che non è
la tua, ed è l'unico passo che resta manuale in tutta la catena.

### Quanto regge

|                   | Numero          | Da dove viene                                         |
| ----------------- | --------------- | ----------------------------------------------------- |
| Banda del gioco   | illimitata      | Cloudflare Pages non ha tetto sul traffico statico    |
| Giocatori insieme | 200 connessioni | limite dichiarato nella configurazione, non una stima |
| Peso scaricato    | 16,2 MB         | misurato in brotli `[M]`                              |
| Costo a regime    | **0**           | la macchina è accesa solo mentre qualcuno gioca       |

Se un giorno duecento connessioni non bastassero, il pezzo che si tocca è uno
solo: la dimensione della macchina. Tutto il resto resta com'è.

---

## 15 · Cosa succede giocando venti ore

**Niente da pagare, niente da grindare, nessun season pass.** Ma qualcosa deve
succedere, o alla terza partita si chiude la scheda.

Quello che succede è che **il gioco si apre**.

Al primo avvio hai le quattro classi, le dodici sottoclassi e un kit completo per
ognuna — un kit **competitivo**, non una versione ridotta. Le abilità che non hai
ancora le vedi, sai cosa fanno, e sai cosa devi fare per averle.

E quello che devi fare non è aspettare: **è giocare in un certo modo.**

> _Launch an enemy and hit them in the air — 10 times._ → **Arc Lift**
> _Win a round without being launched._ → **Cleanse Surge**
> _Land 25 bolts at over 20 metres._ → **Marksman Shot**

È così che il gioco insegna sé stesso senza spiegare niente: per sbloccare
l'abilità che sbalza a distanza, devi aver già sbalzato dieci volte da vicino.
L'obiettivo è il tutorial.

Il livello dell'account sale con le **partite giocate**, non con le vittorie: chi
perde deve avere un motivo per rigiocare, ed è esattamente chi rischia di non
tornare.

I cosmetici sono l'unica ricompensa che non è un'abilità, e **non toccano mai il
gameplay** — nemmeno un colore che renda una silhouette più difficile da vedere.

**Si sblocca varietà, mai potenza.** Chi ha giocato cento ore ha più cose da
provare, non abilità più forti. È l'unica forma di progressione compatibile con un
PvP che vuole essere giusto.

---

## 16 · In che ordine si costruisce

Ogni fase lascia il gioco **giocabile e verificabile**. Nessuna fase comincia
prima che la precedente sia verde.

| #   | Fase                                                             | Stato                   |
| --- | ---------------------------------------------------------------- | ----------------------- |
| 0   | Motore, movimento portato e verificato                           | **✅ fatto**            |
| 1   | Combattimento: le tre forme, ricariche, danno                    | **✅ fatto**            |
| 2   | Nemici, HUD, effetti                                             | **✅ fatto**            |
| 3   | Rete autoritativa e lag compensation                             | **✅ fatto**            |
| 4   | **Struttura di partita**: modalità, punteggio, vittoria, respawn | **✅ fatto**            |
| 5   | **Audio completo** (§10)                                         | **✅ fatto**            |
| 6   | **Classi, sottoclassi e le 67 abilità** lette dai dati           | **✅ fatto**            |
| 7   | **Le sette schermate** (§11) e le comodità (§12)                 | **✅ fatto**            |
| 8   | **L'arena vera** (§8) al posto del blockout                      | **✅ fatto**            |
| 9   | **Personaggi e armi** al posto delle capsule                     | **✅ fatto**            |
| 10  | **Bot** a tre difficoltà e riempimento della lobby               | **✅ fatto**            |
| 11  | **Pubblicazione** su itch.io e server ospitato                   | **✅ pacchetto pronto** |
| 12  | Sblocchi e livello account                                       | **✅ fatto**            |

**La 4 prima di tutto**, e non è un'opinione. Finché una partita non comincia e
non finisce, tutto il resto è roba bella dentro qualcosa che non si può né vincere
né perdere — e quindi non si rigioca. Un gioco senza condizione di vittoria non è
un gioco incompleto: è una sandbox.

**La 9 per ultima fra quelle visive**, e non per pigrizia: i personaggi sono
l'unica cosa che si può sostituire senza toccare niente altro, se le silhouette
sono state progettate prima. Metterli presto significa ritararli a ogni cambio di
regola.

---

## 17 · Come si controlla che sia vero

Ogni fase entra solo con la sua verifica automatica. Oggi ne girano **diciannove,
tutte verdi**, più un benchmark che stampa i numeri invece di giudicarli. Si
lanciano tutte con un comando: `node run_tests.mjs` dentro `godot/`.

| Verifica               | Cosa protegge                                                           |
| ---------------------- | ----------------------------------------------------------------------- |
| `test_movement`        | il feel di Quake: frenata, salto che conserva la velocità, strafe aereo |
| `test_combat`          | le quattro invarianti della scala                                       |
| `test_ability_runtime` | le forme colpiscono chi devono e mancano chi devono                     |
| `test_arena_play`      | premi il tasto, il colpo parte, il danno arriva                         |
| `test_fight`           | si può vincere **e perdere**                                            |
| `test_lag_comp`        | il colpo che vedi andare a segno va a segno                             |
| `test_match`           | le tre modalità cominciano, segnano e finiscono                         |
| `test_match_world`     | il colpo che uccide fa punto, e il morto smette di essere un bersaglio  |
| `test_arena_match`     | nell'arena vera si arriva a 25 e si vince                               |
| `test_audio`           | ogni evento ha il suo suono, e gli ambienti si ripetono davvero         |
| `test_net`             | due processi veri si parlano — non un albero di scena che finge         |
| `test_net_world`       | due corpi, movimento autoritativo                                       |
| `bench`                | frame time, draw call, e stampa i numeri                                |
| `web_size.mjs`         | quanto pesa DAVVERO l'export: brotli, non i byte su disco               |
| `package_itch.mjs`     | le sette cose che devono essere vere per pubblicare, prima di caricare  |
| `luminance.mjs`        | i quattro bersagli di §9 su un frame, invece di guardarlo               |

**Le quattro regole che valgono più dei test**, e che vengono tutte da un errore
già fatto:

1. **Un numero che nessun file importa è un numero che nessuno può correggere.** È
   così che il tempo di uccisione del progetto precedente è rimasto sbagliato di
   tre-cinque volte per tutta la sua vita: era scritto in un documento e in nessun
   `import`.
2. **Si sviluppa sul renderer che si spedisce.** Tarare su Forward+ e pubblicare su
   Compatibility significa che ogni valore visivo misurato è una bugia.
3. **Un'immagine si misura, non si guarda.** Le due trappole del §9 erano entrambe
   invisibili a occhio e ovvie all'istogramma.
4. **Il numero dei test non è un segnale: quello dei FILE sì.** Un errore di
   compilazione può far sparire un'intera suite dietro un totale verde più basso di
   ieri, e nessuno se ne accorge.

---

## 18 · Le cose che non si fanno

Un progetto è anche quello che esclude. Queste sono decise, e cambiarle vuol dire
riaprire il documento, non improvvisare in corsa.

**Niente montaggio delle spell.** Classi e sottoclassi sono **già fatte**: il
giocatore sceglie, non assembla. Un sistema di potenziamenti componibili produce
una build ottimale e undici sbagliate.

**Niente archetipi generici.** Non esistono mago, guerriero, tank e ibrido. Le
classi si dividono per che ruolo hanno nel momento firma, e i nomi lo dicono.

**Niente spiegazioni durante la partita.** Nessun popup, nessuna freccia, nessun
tasto che lampeggia. Le spiegazioni stanno nelle schermate di scelta e nel
poligono. In partita c'è solo quello che dice **cosa è successo** — il kill feed,
il recap di morte, il contatore combo — mai cosa fare.

**Niente sprint.** La velocità base è già la velocità.

**Niente danno da caduta.** Punirebbe chi ha appena subito uno sbalzo, cioè chi sta
già perdendo lo scambio.

**Niente teletrasporti di posizione in rete.** Un solo sistema di spostamento:
l'impulso. Un teletrasporto non è predicibile dal client e fa scattare la
riconciliazione a ogni uso.

**Niente `Engine.time_scale`.** Il peso di un colpo si dà con la camera.

**Niente chat testuale.** Quattro segnali rapidi, e nient'altro.

## **Niente pagamenti, niente account, niente email.** Si apre la pagina e si gioca.

# Appendice · I numeri

Tutto quello che sopra è descritto a parole, qui è deciso in cifre. Se una cifra
cambia, si cambia **qui**, e chi legge sopra deve trovare la stessa cosa.

## A · La scala del combattimento

Non si parte dal danno di un'abilità. Si parte da **quanto deve durare uno
scambio**, e tutto il resto scende da lì:

```
scambio bersaglio 8 s   →   servono ~25 dps contro 200 di vita
arma base ~15 dps       →   le abilità coprono i ~10 mancanti
4 abilità × ~8 s        →   ognuna entra 1-2 volte per scambio
                        →   ricariche 4-6,5 s · danno 20-52
```

Se cambia la durata dello scambio **cambiano tutti insieme**. È l'errore che il
progetto precedente ha fatto per mesi: una banda di TTK dichiarata in un documento
che nessun file importava, sbagliata di tre-cinque volte, e niente che potesse
accorgersene.

| Grandezza                     | Valore                                                  | Fonte             |
| ----------------------------- | ------------------------------------------------------- | ----------------- |
| Vita base                     | **200**                                                 | `[B]`             |
| TTK del kit di partenza       | **5,4 s**                                               | `[B]` test_combat |
| Quota di danno dell'arma base | **40 %**                                                | `[B]`             |
| Global cooldown               | **0,35 s**                                              | `[B]`             |
| Scala del danno               | 20 / 32 / 45 / 52                                       | `[B]`             |
| Scala delle ricariche         | 4 / 5 / 6,5 s                                           | `[B]`             |
| Stamina                       | 150 · +12/s fermo, +5/s in movimento, 0 durante un cast |                   |
| Mana                          | 160 · +8/s sempre                                       |                   |
| Parata (tap)                  | 0,5 s, blocca 100 %, 20 stamina, 3 s di ricarica        |                   |
| Parata (tenuta)               | blocca 70 %, 15 stamina/s                               |                   |

**Le quattro invarianti**, verificate da un test a ogni modifica:

1. il TTK del kit resta fra **4,8 e 8,8 s**;
2. l'arma base porta fra il **30 % e il 60 %** del danno;
3. **chi picchia più forte si impegna di più** — wind-up e ricarica crescono col
   danno;
4. **nessuna abilità porta più del 50 %** del danno del kit.

## B · Il movimento

|                           | Valore         | Fonte                   |
| ------------------------- | -------------- | ----------------------- |
| Velocità a terra          | 9,0 m/s        |                         |
| Tempo per arrivarci       | 117 ms         | `[M]`                   |
| Spazio di frenata         | **0,812 m**    | `[M]` (dichiarato 0,81) |
| Altezza del salto         | 1,5 m          |                         |
| Gravità                   | 25 m/s²        |                         |
| Tetto di velocità in aria | 14,5 m/s       |                         |
| Coyote time               | 5 tick (83 ms) |                         |
| Jump buffer               | 5 tick         |                         |

**Le tre cose che rendono buono questo movimento e che non si toccano:**

1. **la velocità si accumula**, non viene assegnata — il corpo ha peso;
2. **il salto precede l'attrito** nell'ordine di calcolo. Invertendoli, un salto
   cronometrato sull'atterraggio paga un tick di attrito: viene punito esattamente
   l'input che il sistema dovrebbe premiare;
3. **il limite in aria è sulla PROIEZIONE** della velocità sulla direzione voluta,
   mai sul modulo. È quella singola scelta a far funzionare lo strafe aereo:
   misurato, si superano i 9 m/s di terra. `[M]`

## C · Le tre forme

| Forma     | Chiede         | Numero            | Tolleranza                         |
| --------- | -------------- | ----------------- | ---------------------------------- |
| **BEAM**  | mira ferma     | istantaneo        | raggio **0,45 m** — un corpo       |
| **BOLT**  | anticipo       | **42 m/s** base   | nessuna: a 20 m si tira 3 m avanti |
| **BURST** | posizionamento | centrata su di te | raggio **5 m**                     |

> **La legge della sagoma: quello che si disegna è quello che colpisce.** Il
> cilindro del VFX ha lo stesso raggio del volume che risolve il danno; l'onda a
> terra ha lo stesso raggio dell'area. Se divergono, l'effetto insegna una bugia.

## D · Le dodici sottoclassi

Una sottoclasse è **un baratto dichiarato sulla stessa riga**, e non tocca mai il
danno — quello cambierebbe quanto dura un fight, non come si gioca.

| Classe  | Sottoclasse    | Guadagni                        | Paghi               |
| ------- | -------------- | ------------------------------- | ------------------- |
| BREAKER | **SIEGE**      | +12 % vita                      | −8 % velocità       |
| BREAKER | **RAM**        | +12 % velocità                  | −10 % vita          |
| BREAKER | **ANVIL**      | +28 % durata dello sbalzo       | +10 % ricariche     |
| TALON   | **SPIRE**      | +30 % durata dello sbalzo       | +15 % ricariche     |
| TALON   | **VOLLEY**     | −18 % ricariche                 | −10 % vita          |
| TALON   | **TETHER**     | +10 % velocità                  | −15 % durata sbalzo |
| WARDEN  | **BRAMBLE**    | −15 % ricariche                 | −8 % velocità       |
| WARDEN  | **PYRE**       | +22 % durata sbalzo             | −6 % vita           |
| WARDEN  | **HOLLOW**     | +14 % vita                      | +12 % ricariche     |
| DRIFT   | **PHASE**      | +14 % velocità                  | −12 % vita          |
| DRIFT   | **SLIPSTREAM** | +10 % velocità, −10 % ricariche | −10 % vita          |
| DRIFT   | **ECHO**       | −20 % ricariche                 | −5 % velocità       |

## E · Le quattro classi

| Classe      | Nel momento firma | HP  | Armi        | Abilità legali | Build possibili |
| ----------- | ----------------- | --- | ----------- | -------------- | --------------- |
| **BREAKER** | lo **crea**       | 280 | spada, arco | 28             | 1.261.260       |
| **TALON**   | lo **converte**   | 200 | arco, staff | 34             | 3.243.240       |
| **WARDEN**  | decide **dove**   | 250 | staff       | 36             | 10.810.800      |
| **DRIFT**   | lo **nega**       | 250 | tutte       | 37             | 3.048.192       |

Rapporto fra la classe più ricca e la più povera: **8,6×**. Prima della curatela
era **485×**, e una classe da sola copriva il 95 % del contenuto del gioco. `[M]`

## F · I bot

| Difficoltà   | Errore a 20 m | Rotazione | Cadenza | Colpi a segno  |
| ------------ | ------------- | --------- | ------- | -------------- |
| **Recluta**  | 2,2 m         | 70 °/s    | 1,6 s   | ~40 %          |
| **Veterano** | 1,2 m         | 110 °/s   | 1,15 s  | **88 %** `[M]` |
| **Élite**    | 0,7 m         | 160 °/s   | 0,9 s   | ~95 %          |

## G · La rete

|                                 | Valore             |
| ------------------------------- | ------------------ |
| Tick del server                 | 60 Hz              |
| Invii di stato                  | 20 Hz              |
| Soglia di riconciliazione       | 0,35 m             |
| Interpolazione degli altri      | 35 % per pacchetto |
| Storico per la lag compensation | 0,5 s              |
| Riavvolgimento massimo          | 0,2 s              |
| Capsula per il test riavvolto   | h 1,8 m · r 0,4 m  |

## H · Le prestazioni e il peso

|                         | Bersaglio | Misurato          |
| ----------------------- | --------- | ----------------- |
| Frame time medio        | ≤ 16,6 ms | **6,98 ms** `[M]` |
| Frame time p99          | ≤ 33,3 ms | 7,79 ms `[M]`     |
| Draw call               | < 300     | **70** `[M]`      |
| Peso scaricato (brotli) | < 20 MB   | **15,9 MB** `[M]` |

---

# Appendice · Le abilità di ogni classe

Le sessantasette abilità, divise per classe e per scuola, con i numeri che le
governano. Il **verbo** è cosa fa: è l'unica colonna che il giocatore deve capire
per scegliere.

### BREAKER — 280 HP · sword/bow · slot {"melee":4,"bow":1,"magicBase":0,"magicAdvanced":0,"utility":3}

Sottoclassi: ANVIL · RAM · SIEGE

**melee** (14 disponibili)

| Abilità            | Danno | CD   | Windup | Raggio | Costo | Verbo           |
| ------------------ | ----- | ---- | ------ | ------ | ----- | --------------- |
| Executioner's Blow | 52    | 11s  | 0.55   | 2.6    | 40sp  | sbalza          |
| Whirlwind Slash    | 33    | 8s   | —      | 4      | 30sp  | stato/canalizza |
| Ground Slam        | 24    | 9.5s | 0.3    | 4      | 32sp  | stato           |
| Riposte            | 22    | 7s   | —      | 2.2    | 25sp  | sbalza          |
| Skewer             | 20    | 6s   | 0.2    | 4.2    | 22sp  | stato           |
| Bloodthirst        | 18    | 9s   | 0.1    | 2.4    | 26sp  | drena           |
| Gap Closer         | 18    | 7s   | —      | 6      | 25sp  | sposta te/stato |
| Uppercut           | 16    | 8.5s | 0.4    | 2.5    | 40sp  | sbalza          |
| Momentum Strike    | 15    | 4s   | —      | 2.3    | 12sp  | stamina         |
| Cleave             | 14    | 5s   | 0.15   | 3      | 18sp  | danno           |
| Hamstring          | 12    | 8s   | —      | 2.5    | 20sp  | stato           |
| Rending Dash       | 12    | 8s   | —      | 5      | 28sp  | sposta te/stato |
| Bleed Strike       | 10    | 7s   | —      | 2.5    | 20sp  | stato           |
| Guard Break        | 10    | 8.5s | 0.25   | 2.2    | 30sp  | sbalza/stato    |

**bow** (5 disponibili)

| Abilità       | Danno | CD   | Windup | Raggio | Costo | Verbo            |
| ------------- | ----- | ---- | ------ | ------ | ----- | ---------------- |
| Marksman Shot | 50    | 10s  | 1      | 100    | 20mp  | proiettile       |
| Steady Aim    | 48    | 9s   | 0.5    | 30     | 20sp  | proiettile       |
| Blast Arrow   | 45    | 9s   | 0.45   | 22     | 15mp  | proiettile       |
| Piercing Shot | 40    | 7s   | 0.35   | 20     | —     | proiettile       |
| Siphon Arrow  | 16    | 9.5s | 0.15   | 20     | 22sp  | drena/proiettile |

**utility** (9 disponibili)

| Abilità        | Danno | CD    | Windup | Raggio | Costo | Verbo           |
| -------------- | ----- | ----- | ------ | ------ | ----- | --------------- |
| Mark Target    | 6     | 4s    | —      | 30     | —     | stato/prosciuga |
| Healing Potion | —     | 11.5s | —      | —      | —     | canalizza       |
| Quick Dash     | —     | 6s    | —      | 4      | 10sp  | sposta te       |
| Cleanse Surge  | —     | 11s   | —      | —      | 20sp  | stato/purifica  |
| Barrier        | —     | 11s   | —      | —      | —     | stato           |
| Energize       | —     | 9s    | —      | —      | —     | stamina         |
| Phase Shift    | —     | 12s   | —      | —      | 15sp  | stato           |
| Smoke Screen   | —     | 10.5s | —      | 8      | 20mp  | zona            |
| Brace Recovery | —     | 10s   | —      | —      | 40sp  | cura/stato      |

### TALON — 200 HP · bow/staff · slot {"melee":0,"bow":4,"magicBase":1,"magicAdvanced":1,"utility":2}

Sottoclassi: SPIRE · TETHER · VOLLEY

**bow** (14 disponibili)

| Abilità        | Danno | CD   | Windup | Raggio | Costo | Verbo                |
| -------------- | ----- | ---- | ------ | ------ | ----- | -------------------- |
| Snare Trap     | 200   | 9s   | —      | 5      | —     | zona                 |
| Marksman Shot  | 50    | 10s  | 1      | 100    | 20mp  | proiettile           |
| Steady Aim     | 48    | 9s   | 0.5    | 30     | 20sp  | proiettile           |
| Blast Arrow    | 45    | 9s   | 0.45   | 22     | 15mp  | proiettile           |
| Piercing Shot  | 40    | 7s   | 0.35   | 20     | —     | proiettile           |
| Point Blank    | 38    | 7.5s | —      | 4      | 24sp  | sbalza               |
| Volley         | 33    | 8.5s | —      | 30     | —     | zona                 |
| Skyfall        | 26    | 8s   | 0.2    | 22     | 26sp  | stato                |
| Split Shot     | 18    | 6.5s | 0.1    | 16     | 20sp  | danno                |
| Siphon Arrow   | 16    | 9.5s | 0.15   | 20     | 22sp  | drena/proiettile     |
| Pin Shot       | 14    | 8.5s | 0.4    | 25     | —     | proiettile           |
| Broadhead      | 14    | 7s   | 0.25   | 24     | 10sp  | proiettile           |
| Disengage Shot | 12    | 8s   | —      | 15     | 15sp  | sposta te/proiettile |
| Bola           | 6     | 7s   | —      | 18     | 18sp  | stato/proiettile     |

**magicAdvanced** (5 disponibili)

| Abilità           | Danno | CD   | Windup | Raggio | Costo | Verbo             |
| ----------------- | ----- | ---- | ------ | ------ | ----- | ----------------- |
| Flame Wall        | 30    | 9s   | —      | 10     | 30mp  | zona              |
| Frost Pillar      | 12    | 9.5s | 0.3    | 10     | 30mp  | sbalza            |
| Eruption          | 8     | 9.5s | —      | 10     | 30mp  | sbalza            |
| Arc Lift          | 8     | 9s   | —      | 15     | 30mp  | sbalza/proiettile |
| Curse of Weakness | —     | 9.5s | 0.35   | 15     | 30mp  | stato/prosciuga   |

**magicBase** (6 disponibili)

| Abilità        | Danno | CD   | Windup | Raggio | Costo | Verbo          |
| -------------- | ----- | ---- | ------ | ------ | ----- | -------------- |
| Shadow Bolt    | 18    | 5s   | —      | 20     | 25mp  | proiettile     |
| Thunder Clap   | 16    | 9s   | —      | 3      | 30mp  | sbalza/stato   |
| Lightning Dash | 15    | 8s   | —      | 5      | 25mp  | sposta te      |
| Fire Blink     | 12    | 8.5s | —      | 7      | 30mp  | sposta te/zona |
| Poison Dart    | 8     | 5s   | —      | 18     | 20mp  | proiettile     |
| Vine Dash      | —     | 9s   | —      | 5      | 25mp  | sposta te/zona |

**utility** (9 disponibili)

| Abilità        | Danno | CD    | Windup | Raggio | Costo    | Verbo           |
| -------------- | ----- | ----- | ------ | ------ | -------- | --------------- |
| Mark Target    | 6     | 4s    | —      | 30     | —        | stato/prosciuga |
| Healing Potion | —     | 11.5s | —      | —      | —        | canalizza       |
| Quick Dash     | —     | 6s    | —      | 4      | 10sp     | sposta te       |
| Cleanse Surge  | —     | 11s   | —      | —      | 20sp     | stato/purifica  |
| Barrier        | —     | 11s   | —      | —      | —        | stato           |
| Energize       | —     | 9s    | —      | —      | —        | stamina         |
| Phase Shift    | —     | 12s   | —      | —      | 15sp     | stato           |
| Smoke Screen   | —     | 10.5s | —      | 8      | 20mp     | zona            |
| Hunter's Flow  | —     | 9.5s  | —      | —      | 20mp10sp | sposta te/cura  |

### WARDEN — 250 HP · staff · slot {"melee":0,"bow":0,"magicBase":3,"magicAdvanced":3,"utility":2}

Sottoclassi: BRAMBLE · HOLLOW · PYRE

**magicBase** (12 disponibili)

| Abilità        | Danno | CD    | Windup | Raggio | Costo | Verbo          |
| -------------- | ----- | ----- | ------ | ------ | ----- | -------------- |
| Fireball       | 40    | 8.5s  | —      | 20     | 20mp  | proiettile     |
| Chain Bolt     | 32    | 6s    | —      | 15     | 25mp  | danno          |
| Shadow Bolt    | 18    | 5s    | —      | 20     | 25mp  | proiettile     |
| Frost Bolt     | 16    | 8s    | —      | 20     | 20mp  | proiettile     |
| Thunder Clap   | 16    | 9s    | —      | 3      | 30mp  | sbalza/stato   |
| Lightning Dash | 15    | 8s    | —      | 5      | 25mp  | sposta te      |
| Fire Blink     | 12    | 8.5s  | —      | 7      | 30mp  | sposta te/zona |
| Poison Dart    | 8     | 5s    | —      | 18     | 20mp  | proiettile     |
| Entangle       | 4     | 9.5s  | 0.3    | 10     | 25mp  | stato          |
| Ignite         | —     | 8s    | —      | 12     | 20mp  | stato          |
| Dark Barrier   | —     | 10.5s | —      | —      | 30mp  | stato          |
| Vine Dash      | —     | 9s    | —      | 5      | 25mp  | sposta te/zona |

**magicAdvanced** (15 disponibili)

| Abilità           | Danno | CD    | Windup | Raggio | Costo | Verbo               |
| ----------------- | ----- | ----- | ------ | ------ | ----- | ------------------- |
| Meteor            | 55    | 11s   | 1      | 25     | 40mp  | sbalza/stato        |
| Storm Field       | 32    | 11s   | —      | 20     | 35mp  | zona                |
| Flame Wall        | 30    | 9s    | —      | 10     | 30mp  | zona                |
| Life Drain        | 24    | 9.5s  | —      | 12     | 35mp  | canalizza/prosciuga |
| Thorn Field       | 24    | 10.5s | —      | 12     | 35mp  | zona                |
| Blizzard          | 20    | 10s   | —      | 20     | 30mp  | zona                |
| Void Spike        | 14    | 9.5s  | —      | 10     | 30mp  | sbalza/prosciuga    |
| Frost Pillar      | 12    | 9.5s  | 0.3    | 10     | 30mp  | sbalza              |
| Eruption          | 8     | 9.5s  | —      | 10     | 30mp  | sbalza              |
| Freeze Target     | 8     | 10.5s | 0.4    | 12     | 35mp  | stato               |
| Arc Lift          | 8     | 9s    | —      | 15     | 30mp  | sbalza/proiettile   |
| Root Upthrow      | 8     | 9.5s  | —      | 10     | 30mp  | sbalza              |
| Ice Wall          | —     | 10s   | —      | 8      | 30mp  | zona                |
| Curse of Weakness | —     | 9.5s  | 0.35   | 15     | 30mp  | stato/prosciuga     |
| Healing Totem     | —     | 11.5s | —      | —      | 30mp  | canalizza           |

**utility** (9 disponibili)

| Abilità        | Danno | CD    | Windup | Raggio | Costo | Verbo           |
| -------------- | ----- | ----- | ------ | ------ | ----- | --------------- |
| Mark Target    | 6     | 4s    | —      | 30     | —     | stato/prosciuga |
| Healing Potion | —     | 11.5s | —      | —      | —     | canalizza       |
| Quick Dash     | —     | 6s    | —      | 4      | 10sp  | sposta te       |
| Cleanse Surge  | —     | 11s   | —      | —      | 20sp  | stato/purifica  |
| Barrier        | —     | 11s   | —      | —      | —     | stato           |
| Energize       | —     | 9s    | —      | —      | —     | stamina         |
| Phase Shift    | —     | 12s   | —      | —      | 15sp  | stato           |
| Smoke Screen   | —     | 10.5s | —      | 8      | 20mp  | zona            |
| Arcane Rebind  | —     | 10.5s | 0.4    | —      | 45mp  | cura            |

### DRIFT — 250 HP · sword/bow/staff · slot {"melee":2,"bow":1,"magicBase":2,"magicAdvanced":1,"utility":2}

Sottoclassi: ECHO · PHASE · SLIPSTREAM

**melee** (8 disponibili)

| Abilità         | Danno | CD   | Windup | Raggio | Costo | Verbo           |
| --------------- | ----- | ---- | ------ | ------ | ----- | --------------- |
| Ground Slam     | 24    | 9.5s | 0.3    | 4      | 32sp  | stato           |
| Riposte         | 22    | 7s   | —      | 2.2    | 25sp  | sbalza          |
| Skewer          | 20    | 6s   | 0.2    | 4.2    | 22sp  | stato           |
| Gap Closer      | 18    | 7s   | —      | 6      | 25sp  | sposta te/stato |
| Momentum Strike | 15    | 4s   | —      | 2.3    | 12sp  | stamina         |
| Cleave          | 14    | 5s   | 0.15   | 3      | 18sp  | danno           |
| Rending Dash    | 12    | 8s   | —      | 5      | 28sp  | sposta te/stato |
| Bleed Strike    | 10    | 7s   | —      | 2.5    | 20sp  | stato           |

**bow** (6 disponibili)

| Abilità        | Danno | CD   | Windup | Raggio | Costo | Verbo                |
| -------------- | ----- | ---- | ------ | ------ | ----- | -------------------- |
| Piercing Shot  | 40    | 7s   | 0.35   | 20     | —     | proiettile           |
| Point Blank    | 38    | 7.5s | —      | 4      | 24sp  | sbalza               |
| Split Shot     | 18    | 6.5s | 0.1    | 16     | 20sp  | danno                |
| Broadhead      | 14    | 7s   | 0.25   | 24     | 10sp  | proiettile           |
| Disengage Shot | 12    | 8s   | —      | 15     | 15sp  | sposta te/proiettile |
| Bola           | 6     | 7s   | —      | 18     | 18sp  | stato/proiettile     |

**magicAdvanced** (6 disponibili)

| Abilità           | Danno | CD   | Windup | Raggio | Costo | Verbo               |
| ----------------- | ----- | ---- | ------ | ------ | ----- | ------------------- |
| Flame Wall        | 30    | 9s   | —      | 10     | 30mp  | zona                |
| Life Drain        | 24    | 9.5s | —      | 12     | 35mp  | canalizza/prosciuga |
| Frost Pillar      | 12    | 9.5s | 0.3    | 10     | 30mp  | sbalza              |
| Eruption          | 8     | 9.5s | —      | 10     | 30mp  | sbalza              |
| Arc Lift          | 8     | 9s   | —      | 15     | 30mp  | sbalza/proiettile   |
| Curse of Weakness | —     | 9.5s | 0.35   | 15     | 30mp  | stato/prosciuga     |

**magicBase** (8 disponibili)

| Abilità        | Danno | CD   | Windup | Raggio | Costo | Verbo          |
| -------------- | ----- | ---- | ------ | ------ | ----- | -------------- |
| Chain Bolt     | 32    | 6s   | —      | 15     | 25mp  | danno          |
| Shadow Bolt    | 18    | 5s   | —      | 20     | 25mp  | proiettile     |
| Frost Bolt     | 16    | 8s   | —      | 20     | 20mp  | proiettile     |
| Thunder Clap   | 16    | 9s   | —      | 3      | 30mp  | sbalza/stato   |
| Lightning Dash | 15    | 8s   | —      | 5      | 25mp  | sposta te      |
| Fire Blink     | 12    | 8.5s | —      | 7      | 30mp  | sposta te/zona |
| Poison Dart    | 8     | 5s   | —      | 18     | 20mp  | proiettile     |
| Vine Dash      | —     | 9s   | —      | 5      | 25mp  | sposta te/zona |

**utility** (9 disponibili)

| Abilità        | Danno | CD    | Windup | Raggio | Costo    | Verbo           |
| -------------- | ----- | ----- | ------ | ------ | -------- | --------------- |
| Mark Target    | 6     | 4s    | —      | 30     | —        | stato/prosciuga |
| Healing Potion | —     | 11.5s | —      | —      | —        | canalizza       |
| Quick Dash     | —     | 6s    | —      | 4      | 10sp     | sposta te       |
| Cleanse Surge  | —     | 11s   | —      | —      | 20sp     | stato/purifica  |
| Barrier        | —     | 11s   | —      | —      | —        | stato           |
| Energize       | —     | 9s    | —      | —      | —        | stamina         |
| Phase Shift    | —     | 12s   | —      | —      | 15sp     | stato           |
| Smoke Screen   | —     | 10.5s | —      | 8      | 20mp     | zona            |
| Adaptive Mend  | —     | 9s    | —      | —      | 15mp15sp | cura            |
