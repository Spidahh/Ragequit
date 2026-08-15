## I bot: tre difficolta' e il riempimento della lobby.
##
## PERCHE' QUESTO E' CONTENUTO E NON RIEMPITIVO. Un PvP gratis su itch.io e', per
## la maggior parte delle ore, **un gioco contro i bot**: c'e' gente online solo
## in certe fasce, e chi apre la pagina alle tre di notte deve trovare una
## partita comunque. Se i bot sono bersagli, il gioco che quasi tutti giocano e'
## un gioco contro bersagli.
##
## COME SI TARA UNA DIFFICOLTA', e perche' non con la percentuale di colpi a
## segno. Quella produce un avversario che sbaglia A CASO: non si legge, non si
## impara, e non si ha mai la sensazione di averlo battuto. Qui i parametri sono
## due, e sono **entrambi visibili nel comportamento**:
##
##   - **l'errore di mira**, che CALA mentre ti tiene in vista — e si azzera se
##     rompi la linea di vista. E' questo che da' alle coperture un motivo che
##     non e' decorativo;
##   - **la velocita' di rotazione**, che non scatta sul bersaglio ma ci arriva:
##     se ti muovi di lato in fretta, la sua mira insegue e resta indietro.
##
## Un bot che non ti puo' battere non e' un avversario. Nella prima versione
## l'errore era cosi' largo che era MATEMATICAMENTE IMPOSSIBILE che colpisse un
## corpo — 2,6 m di deviazione contro una capsula da 0,4 m di raggio — e il test
## lo ha preso prima che finisse in partita.
extends RefCounted

enum Level { RECRUIT, VETERAN, ELITE }

const NAMES := {Level.RECRUIT: "RECRUIT", Level.VETERAN: "VETERAN", Level.ELITE: "ELITE"}

## I tre profili. `hit_rate` non e' un parametro: e' il RISULTATO misurato, ed e'
## li' perche' chi cambia i due numeri veri possa accorgersi di cosa ha fatto.
const LEVELS := {
	Level.RECRUIT: {
		"aim_error_m": 2.2,
		"turn_speed_deg": 70.0,
		"fire_period": 1.6,
		"damage": 7.0,
		"hit_rate": 0.40,
	},
	Level.VETERAN: {
		"aim_error_m": 1.2,
		"turn_speed_deg": 110.0,
		"fire_period": 1.15,
		"damage": 9.0,
		"hit_rate": 0.88,
	},
	Level.ELITE: {
		"aim_error_m": 0.7,
		"turn_speed_deg": 160.0,
		"fire_period": 0.9,
		"damage": 11.0,
		"hit_rate": 0.95,
	},
}

## In partita mista il default e' Veterano: e' l'unico che si puo' battere
## sudando, ed e' quello su cui e' tarato tutto il resto del gioco.
const DEFAULT_LEVEL := Level.VETERAN

## Il nome di un bot. Non "Bot 3": un avversario con un nome da segnaposto e' un
## avversario che il giocatore smette di considerare un avversario.
const CALLSIGNS := [
	"ASH", "VULTURE", "NINE", "HOLLOWPOINT", "SABLE", "RUIN", "KESTREL", "TANNER",
	"GRIT", "MORROW", "VESPER", "CASK", "IRONJAW", "SILT", "WREN", "HALLOW",
]

## Le quattro classi, in giro: una lobby dove tutti giocano la stessa classe non
## insegna a riconoscerne nessuna.
const CLASSES := ["breaker", "talon", "warden", "drift"]


static func stats_for(level: int) -> Dictionary:
	return LEVELS.get(level, LEVELS[DEFAULT_LEVEL])


static func name_for(level: int) -> String:
	return String(NAMES.get(level, "VETERAN"))


## Applica un profilo a un nodo nemico. Tocca solo i quattro numeri: tutto il
## resto del comportamento — coperture, strafe, distanza tenuta — e' lo stesso a
## ogni difficolta', perche' e' quello che rende un bot leggibile.
static func apply(enemy: Node, level: int) -> void:
	var s := stats_for(level)
	enemy.set("aim_error_m", float(s["aim_error_m"]))
	enemy.set("turn_speed_deg", float(s["turn_speed_deg"]))
	enemy.set("fire_period", float(s["fire_period"]))
	enemy.set("damage", float(s["damage"]))


## Il nome e la classe dell'ennesimo bot di una partita.
##
## Deterministico sull'indice: due client nella stessa partita devono vedere lo
## stesso avversario con lo stesso nome, o il kill feed racconta due partite
## diverse.
static func identity(index: int) -> Dictionary:
	return {
		"name": CALLSIGNS[index % CALLSIGNS.size()],
		"class_id": CLASSES[index % CLASSES.size()],
		"level": DEFAULT_LEVEL,
	}


## QUANTI BOT SERVONO ADESSO.
##
## E' la funzione che decide se il gioco esiste alle tre di notte. La regola:
## **non si mostra mai una coda.** Si entra e si combatte, e i bot riempiono la
## differenza fra chi c'e' e quanti ne vuole la modalita'.
##
##   `humans`  quanti umani ci sono ora
##   `target`  quanti giocatori vuole la modalita'
##
## Il minimo e' due giocatori in tutto: se TOURNAMENT ne pretendesse otto umani,
## non esisterebbe mai.
static func fill_count(humans: int, target: int) -> int:
	return maxi(0, maxi(target, 2) - maxi(humans, 0))


## Quale bot cede il posto a un umano che entra a partita in corso.
##
## Il PEGGIORE, non il primo della lista: chi entra eredita il punteggio del bot
## che sostituisce (vedi `MatchRules.replace`), e ereditare il punteggio del bot
## in testa vorrebbe dire arrivare vincendo senza aver giocato. Ereditare quello
## dell'ultimo e' onesto in entrambe le direzioni.
##
## Restituisce -1 se non c'e' nessun bot da sostituire: allora l'umano entra
## come giocatore nuovo, a zero.
static func worst_bot(scores: Dictionary, bot_ids: Array) -> int:
	var worst := -1
	var worst_score := 1 << 30
	for id in bot_ids:
		var s := int(scores.get(id, 0))
		if s < worst_score:
			worst_score = s
			worst = int(id)
	return worst
