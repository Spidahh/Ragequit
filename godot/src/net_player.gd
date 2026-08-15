## Il corpo di un giocatore in rete, sotto netfox.
##
## COSA CAMBIA RISPETTO A PRIMA, e perche'.
##
## La versione scritta a mano faceva predizione e riconciliazione: il client
## muoveva subito, il server rigirava la stessa funzione, e se divergevano oltre
## 35 cm il client si allineava. Mancava **il rollback**: dopo una correzione i
## tick successivi non venivano risimulati, quindi la correzione si vedeva come
## uno scatto invece che come una divergenza riassorbita.
##
## netfox lo fa: quando arriva uno stato piu' recente di quello predetto,
## riporta il mondo a quel tick e **ri-esegue tutti i tick fino a ora** con gli
## input che il giocatore aveva gia' dato. Il risultato e' che una correzione
## non si vede.
##
## E' possibile per una ragione sola: **`Movement.step` e' una funzione pura.**
## Il rollback risimula lo stesso tick decine di volte al secondo, e una
## funzione che tiene stato dentro di se' darebbe un risultato diverso a ogni
## ripetizione. Era gia' la ragione per cui era stata scritta cosi'.
##
## COSA DICHIARA A NETFOX:
##   - **stato** — posizione e velocita': quello che il server possiede e che il
##     client si fa correggere;
##   - **input** — cosa sta premendo il giocatore: quello che viaggia in salita,
##     e mai la posizione, che e' la prima cosa che un cheat inventerebbe.
extends CharacterBody3D

const Movement := preload("res://src/movement.gd")
const CharacterScript := preload("res://src/character.gd")
const SettingsScript := preload("res://src/settings.gd")
const Status := preload("res://src/status.gd")

## Le proprieta' che netfox sincronizza. Sono stringhe e non riferimenti perche'
## e' cosi' che il sincronizzatore le legge — e tenerle qui, accanto al corpo che
## le possiede, evita che qualcuno le dichiari in un file lontano e poi le
## rinomini qui senza accorgersene.
const STATE_PROPERTIES: Array[String] = [
	"position",
	"velocity",
	"hp",
]
const INPUT_PROPERTIES: Array[String] = [
	"input_wish",
	"input_yaw",
	"input_jump",
]

var peer_id: int = 0

## Lo stato che il server possiede.
var hp: float = 200.0
var status := Status.new()

## L'input, riempito dal client che possiede questo corpo. netfox lo manda al
## server da solo: non c'e' nessuna RPC scritta a mano.
var input_wish := Vector2.ZERO
var input_yaw := 0.0
var input_jump := false

var body_view: Node3D = null

var _sim: Dictionary = {}

signal died
signal damaged(amount: float, remaining: float)


func _ready() -> void:
	_sim = Movement.make_state(global_position)
	_build_shape()
	_build_view()


## La capsula di collisione e' UGUALE PER TUTTI, e non dipende dal modello: due
## giocatori non devono essere piu' facili o piu' difficili da colpire per via
## del personaggio che hanno scelto.
func _build_shape() -> void:
	var col := CollisionShape3D.new()
	var caps := CapsuleShape3D.new()
	caps.height = 1.8
	caps.radius = 0.4
	col.shape = caps
	add_child(col)


func _build_view() -> void:
	body_view = CharacterScript.new()
	body_view.name = "Body"
	add_child(body_view)
	body_view.setup("breaker", SettingsScript.COLORBLIND["none"]["enemy"])


## L'input locale. netfox lo chiama solo sul corpo che questo client possiede,
## e lo spedisce al server insieme al numero di tick a cui si riferisce.
func _gather_input() -> void:
	input_wish = Input.get_vector("move_left", "move_right", "move_back", "move_forward")
	input_jump = Input.is_action_pressed("jump")


## IL TICK CHE VIENE RISIMULATO.
##
## Gira sul server per la verita', sul client per la predizione, e **di nuovo su
## ogni tick riavvolto** quando arriva una correzione. Per questo dentro non ci
## puo' essere niente che non sia la simulazione: nessun suono, nessun effetto,
## nessun punteggio. Un colpo che suona qui suonerebbe dieci volte per un
## pacchetto in ritardo.
func _rollback_tick(delta: float, _tick: int, _is_fresh: bool) -> void:
	_sim["pos"] = global_position
	_sim["on_ground"] = is_on_floor()

	var wish := input_wish
	# Rallentamenti e radici agiscono sull'intenzione, non sulla velocita'
	# risultante: chi e' rallentato accelera come sempre, arriva solo piu' in
	# basso — e quando lo stato scade non c'e' nessuno scatto.
	wish *= status.move_multiplier()

	_sim = Movement.step(_sim, wish, input_yaw, input_jump, delta)
	velocity = _sim["vel"]
	move_and_slide()
	# Il motore ha appena risolto la collisione: la nostra velocita' deve
	# saperlo, o continua ad accumulare contro un muro.
	_sim["vel"] = velocity
	_sim["pos"] = global_position


## Fuori dal tick: tutto quello che NON va risimulato. L'animazione guarda la
## velocita' e basta, quindi puo' stare qui e girare una volta per frame.
func _process(delta: float) -> void:
	if body_view:
		body_view.drive(velocity, is_on_floor(), delta)


func take_damage(amount: float) -> void:
	hp = maxf(0.0, hp - amount)
	damaged.emit(amount, hp)
	if hp <= 0.0:
		died.emit()


func heal(amount: float) -> void:
	hp = minf(200.0, hp + amount)


func restore(_resource: String, _amount: float) -> void:
	pass


func launch(airtime: float = 0.72) -> void:
	velocity.y = maxf(velocity.y, 25.0 * airtime * 0.5)
	_sim["vel"] = velocity
