## Gli stati addosso a un personaggio: veleni, rallentamenti, radici, scudi.
##
## PERCHE' UN SISTEMA SOLO E NON UNA CASELLA PER OGNI EFFETTO. Quattordici stati
## sparsi in quattordici variabili sono quattordici posti dove dimenticarsi di
## far scadere qualcosa, e un rallentamento che non scade non da errori: da un
## giocatore che non capisce perche' e' lento. Qui scadono tutti nello stesso
## punto, e chi vuole sapere cosa ha addosso guarda un posto solo.
##
## COSA FA CIASCUNO, e perche' sono divisi cosi':
##   - **danno nel tempo** (bleed, burn, poison) — pulsano, si sommano a strati;
##   - **movimento** (slow, chill, haste) — moltiplicano la velocita';
##   - **controllo** (root, freeze, stun) — tolgono qualcosa che sapevi fare;
##   - **difesa** (shield, invulnerable) — assorbono o annullano;
##   - **informazione** (mark, blind, curse) — non fanno danno, cambiano cosa
##     sai e quanto fai male.
##
## La differenza fra root e stun e' la piu' importante del gioco: **radicato non
## ti muovi ma lanci, stordito non lanci ma non sei fermo per sempre.** Uno stato
## che ti toglie tutto per piu' di un secondo e' uno stato che ti fa guardare lo
## schermo mentre muori, ed e' la cosa che fa chiudere un PvP.
extends RefCounted

## Quanto rallenta il gelo a ogni strato, e a quanti strati diventa congelamento.
const CHILL_PER_STACK := 0.15
const CHILL_TO_FREEZE := 4
const FREEZE_SEC := 1.2
## La maledizione toglie un quarto del danno che fai. Non blocca niente: rende
## ogni tuo colpo meno utile, che e' un modo di vincere senza colpire.
const CURSE_DAMAGE_MULT := 0.75
## L'accecato non vede piu' i contorni dei nemici. Non gli si annerisce lo
## schermo: togliergli la vista sarebbe togliergli il gioco.
const HASTE_MULT := 1.35

const DOTS := {"bleed": 4.0, "burn": 6.0, "poison": 5.0}
const HARD_CC := ["root", "freeze", "stun"]

## stato → { "until": secondi, "stacks": int, "power": float }
var active: Dictionary = {}
## L'orologio e' DENTRO: chi applica uno stato non deve conoscere il tempo di
## gioco. Passarlo da fuori significava che una zona, un proiettile e il
## giocatore usavano tre orologi diversi, e uno stato messo da una zona sarebbe
## scaduto in un momento che nessuno poteva prevedere.
var clock := 0.0
## Quanto assorbe ancora lo scudo. Separato dagli stati perche' non scade per
## tempo: si consuma.
var shield := 0.0

signal expired(status: String)


func apply(status: String, duration: float, stacks: int = 1, power: float = 0.0) -> void:
	if status == "shield":
		shield = maxf(shield, float(stacks))
		active["shield"] = {"until": clock + duration, "stacks": stacks, "power": power}
		return
	var cur: Dictionary = active.get(status, {"until": 0.0, "stacks": 0, "power": 0.0})
	# La durata si PRENDE LA PIU' LUNGA invece di sommarsi: rallentamenti che si
	# accumulano producono un bersaglio fermo per otto secondi, e nessuno ha
	# deciso che dovesse succedere.
	cur["until"] = maxf(float(cur["until"]), clock + duration)
	cur["stacks"] = int(cur["stacks"]) + stacks
	cur["power"] = maxf(float(cur["power"]), power)
	active[status] = cur

	# Il gelo non congela: ACCUMULA fino al congelamento. È l'unico stato che si
	# costruisce, ed è il motivo per cui il ghiaccio fa poco danno.
	if status == "chill" and int(cur["stacks"]) >= CHILL_TO_FREEZE:
		active.erase("chill")
		apply("freeze", FREEZE_SEC)


func has(status: String) -> bool:
	return active.has(status)


func stacks(status: String) -> int:
	return int(active.get(status, {}).get("stacks", 0))


## Tutti via, in un colpo. È quello che compra `Cleanse Surge`, e vale la pena
## che sia una riga sola: un cleanse che dimentica uno stato è peggio di nessun
## cleanse, perché il giocatore ci conta.
func cleanse() -> void:
	var kept := {}
	# Lo scudo non è un malus: toglierlo sarebbe punire chi si sta curando.
	if active.has("shield"):
		kept["shield"] = active["shield"]
	active = kept


## Quanto va veloce chi ha questi stati addosso. Un moltiplicatore solo: due
## rallentamenti che si moltiplicano fra loro producono numeri che nessuno ha
## scelto.
func move_multiplier() -> float:
	if has("freeze") or has("root"):
		return 0.0
	var m := 1.0
	if has("slow"):
		m -= maxf(float(active["slow"].get("power", 0.3)), 0.0)
	if has("chill"):
		m -= CHILL_PER_STACK * float(stacks("chill"))
	if has("haste"):
		m *= HASTE_MULT
	return clampf(m, 0.15, 2.0)


## Si può lanciare? Radicato sì — ed è deliberato: chi è per aria o inchiodato
## deve poter rispondere, o lo sbalzo diventa una condanna invece che una
## finestra.
func can_cast() -> bool:
	return not (has("freeze") or has("stun"))


func can_move() -> bool:
	return not (has("freeze") or has("root"))


func is_immune() -> bool:
	return has("invulnerable")


## Quanto fa male chi ha questi stati addosso.
func outgoing_damage_multiplier() -> float:
	return CURSE_DAMAGE_MULT if has("curse") else 1.0


## Il danno che passa davvero, dopo lo scudo. Restituisce quanto è arrivato:
## chi chiama deve sapere quanto togliere, non quanto era stato mandato.
func absorb(amount: float) -> float:
	if is_immune():
		return 0.0
	if shield <= 0.0:
		return amount
	var taken := minf(shield, amount)
	shield -= taken
	if shield <= 0.0:
		active.erase("shield")
	return amount - taken


## Il battito: fa scadere quello che è scaduto e restituisce il danno dei veleni
## accumulato in questo intervallo.
func tick(delta: float) -> float:
	clock += delta
	var dot := 0.0
	for status in active.keys():
		if float(active[status]["until"]) <= clock:
			active.erase(status)
			if status == "shield":
				shield = 0.0
			expired.emit(status)
			continue
		if DOTS.has(status):
			# Gli strati si sommano: tre applicazioni di bruciatura bruciano tre
			# volte tanto. È il motivo per cui il fuoco ha `Ignite`, che non fa
			# danno diretto e ne mette tre in una volta.
			dot += float(DOTS[status]) * float(active[status]["stacks"]) * delta
	return dot


## Cosa mostrare addosso a qualcuno, in ordine di importanza. Il controllo prima
## di tutto: quello che ti impedisce di agire deve leggersi prima di quello che
## ti fa male lentamente.
func visible_states() -> Array:
	var out := []
	for s in HARD_CC:
		if has(s):
			out.append(s)
	for s in DOTS.keys():
		if has(s):
			out.append(s)
	for s in ["shield", "haste", "invulnerable", "curse", "blind", "mark", "slow", "chill"]:
		if has(s):
			out.append(s)
	return out
