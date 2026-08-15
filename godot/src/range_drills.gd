## Il poligono: le tre cose che il gioco insegna, e le uniche.
##
## E' L'UNICO POSTO DOVE IL GIOCO INSEGNA. In partita non compare mai un
## suggerimento, una freccia o un tasto che lampeggia: le spiegazioni stanno
## nelle schermate di scelta e qui. E' una regola, non una preferenza — un gioco
## che ti parla mentre combatti ti toglie l'attenzione proprio quando ti serve.
##
## LE TRE PROVE, e perche' esattamente queste tre. Sono le tre cose che separano
## chi ha appena aperto il gioco da chi ci gioca:
##
##   1. **muoversi** — che saltare al momento giusto conserva la velocita', e che
##      in aria si supera il limite di terra. Nessuno lo scopre da solo, e senza
##      di quello il movimento e' solo camminare;
##   2. **anticipare** — che un proiettile viaggia, e che a venti metri contro
##      qualcuno che strafa si tira dove SARA';
##   3. **sbalzare e convertire** — il momento firma. Staccare da terra e
##      colpire mentre vola e' la cosa piu' difficile del gioco, e provarla
##      contro un manichino costa zero.
##
## Ognuna si completa FACENDOLA, non leggendola. E quando sono fatte il poligono
## smette di chiedere e resta aperto: ci si torna per provare una build nuova.
extends RefCounted

## Quanti salti di fila senza perdere velocita' contano come "l'hai capito".
const HOPS_NEEDED := 5
## La velocita' sopra la quale un salto ha conservato lo slancio. E' appena
## sotto quella di terra: chi atterra e riparte senza perdere niente ci passa.
const HOP_SPEED := 8.4
## A che distanza un colpo di proiettile conta come "hai anticipato". Sotto,
## si e' semplicemente sparato addosso a qualcuno.
const LEAD_DISTANCE := 12.0

enum Drill { MOVE, LEAD, LAUNCH }

const TITLES := {
	Drill.MOVE: "MOVE",
	Drill.LEAD: "AIM",
	Drill.LAUNCH: "LAUNCH & CONVERT",
}

const LINES := {
	Drill.MOVE: "Jump the instant you land, five times in a row. Watch the speed.",
	Drill.LEAD: "Hit the strafing dummy with a projectile from over 12 m.",
	Drill.LAUNCH: "Take a dummy off the ground, then hit it while it is in the air.",
}

var done: Dictionary = {Drill.MOVE: false, Drill.LEAD: false, Drill.LAUNCH: false}
var hops := 0

var _was_grounded := true
var _speed_at_takeoff := 0.0

signal drill_done(which: int)


func all_done() -> bool:
	for k in done:
		if not bool(done[k]):
			return false
	return true


func progress(which: int) -> String:
	if which == Drill.MOVE and not bool(done[which]):
		return "%d / %d" % [hops, HOPS_NEEDED]
	return "DONE" if bool(done[which]) else ""


## Il battito del movimento. Conta un salto come "buono" se al momento di
## staccare da terra la velocita' era ancora alta: e' esattamente la cosa che
## `Movement.step` premia mettendo il salto prima dell'attrito.
func watch_movement(speed: float, on_floor: bool) -> void:
	if bool(done[Drill.MOVE]):
		return
	if _was_grounded and not on_floor:
		_speed_at_takeoff = speed
		if speed >= HOP_SPEED:
			hops += 1
			if hops >= HOPS_NEEDED:
				_finish(Drill.MOVE)
		else:
			# Una serie si interrompe: cinque di fila, non cinque in tutto.
			# Il punto e' il ritmo, e il ritmo non si accumula a pezzi.
			hops = 0
	_was_grounded = on_floor


## Un colpo a segno. `travelled` e' la distanza percorsa dal proiettile, o zero
## se il colpo era istantaneo.
func watch_hit(travelled: float, target_airborne: bool, was_launched_by_me: bool) -> void:
	if travelled >= LEAD_DISTANCE and not bool(done[Drill.LEAD]):
		_finish(Drill.LEAD)
	if target_airborne and was_launched_by_me and not bool(done[Drill.LAUNCH]):
		_finish(Drill.LAUNCH)


func _finish(which: int) -> void:
	if bool(done[which]):
		return
	done[which] = true
	drill_done.emit(which)
