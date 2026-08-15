## La camera da spettatore.
##
## PERCHE' ESISTE, e perche' non e' una comodita' facoltativa. In TOURNAMENT chi
## perde un duello non ha finito la serata: ha ancora tre duelli da guardare
## prima della finale. **Buttarlo fuori significa che la meta' delle persone in
## un torneo da otto smette di giocare dopo novanta secondi.**
##
## E guardare non e' un ripiego: aspettare il proprio turno guardando qualcun
## altro giocare e' meta' del piacere di un torneo, e vedere l'HUD di chi e'
## bravo e' il modo piu' veloce che esista di imparare un gioco — molto piu' di
## qualunque tutorial, perche' non spiega: mostra.
##
## TRE MODI DI GUARDARE, e sono tre domande diverse:
##   - **la prima persona di qualcuno** — cosa vede e cosa preme;
##   - **la terza persona dietro di lui** — dove sta rispetto agli altri;
##   - **la camera libera** — la forma della partita, che dalle prime due non si
##     vede mai.
extends Node3D

enum Mode { FIRST, THIRD, FREE }

const MOVE_SPEED := 14.0
const MOUSE_SENSITIVITY := 0.0022
## Quanto sta indietro e in alto la terza persona. Abbastanza da vedere il corpo
## e quello che ha davanti, non tanto da perdere di vista dove sta mirando.
const THIRD_OFFSET := Vector3(0.0, 1.4, 4.2)

var mode: int = Mode.THIRD
## Chi si sta guardando. Cambiando bersaglio non si cambia modo: chi stava
## guardando in prima persona vuole continuare a farlo sul prossimo.
var target: Node3D = null

var camera: Camera3D = null
var _targets: Array = []
var _index := 0
var _yaw := 0.0
var _pitch := 0.0

signal target_changed(who: Node3D)


func _ready() -> void:
	camera = Camera3D.new()
	camera.fov = 92.0
	add_child(camera)
	camera.current = true


## Chi si puo' guardare. Si passa la lista viva: chi muore esce, chi rinasce
## rientra, e l'indice si aggiusta invece di puntare al vuoto.
func set_targets(who: Array) -> void:
	_targets = who.filter(func(n): return is_instance_valid(n))
	if _targets.is_empty():
		target = null
		return
	_index = clampi(_index, 0, _targets.size() - 1)
	_select(_index)


func next_target() -> void:
	if _targets.is_empty():
		return
	_index = (_index + 1) % _targets.size()
	_select(_index)


func cycle_mode() -> void:
	mode = (mode + 1) % 3
	# Passando a camera libera si parte da DOVE SI STAVA GUARDANDO, non
	# dall'origine: ritrovarsi in mezzo al nulla e' il modo piu' veloce di
	# perdere il filo della partita.
	if mode == Mode.FREE and target and is_instance_valid(target):
		global_position = camera.global_position


func _select(i: int) -> void:
	if i < 0 or i >= _targets.size():
		return
	target = _targets[i]
	target_changed.emit(target)


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion:
		_yaw -= event.relative.x * MOUSE_SENSITIVITY
		_pitch = clampf(_pitch - event.relative.y * MOUSE_SENSITIVITY, -1.5, 1.5)
	elif event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_SPACE:
			next_target()
		elif event.keycode == KEY_F:
			cycle_mode()


func _process(delta: float) -> void:
	match mode:
		Mode.FIRST:
			_follow_eyes()
		Mode.THIRD:
			_follow_behind(delta)
		Mode.FREE:
			_fly(delta)


## La prima persona di chi si guarda: la sua posizione e la sua testa. Se il suo
## corpo sparisce (e' morto) non si resta appesi al vuoto — si passa al prossimo.
func _follow_eyes() -> void:
	if not is_instance_valid(target):
		next_target()
		return
	camera.global_position = target.global_position + Vector3(0, 0.65, 0)
	var eye := target.get_node_or_null("Camera3D") as Camera3D
	camera.global_rotation = eye.global_rotation if eye else target.global_rotation


## Dietro le spalle, con un ritardo: una camera incollata rende ogni scatto del
## corpo uno scatto dello schermo, e da fuori si guarda peggio di chi gioca.
func _follow_behind(delta: float) -> void:
	if not is_instance_valid(target):
		next_target()
		return
	var basis := Basis(Vector3.UP, target.global_rotation.y)
	var wanted: Vector3 = target.global_position + basis * THIRD_OFFSET
	camera.global_position = camera.global_position.lerp(wanted, clampf(delta * 6.0, 0.0, 1.0))
	camera.look_at(target.global_position + Vector3(0, 1.0, 0), Vector3.UP)


func _fly(delta: float) -> void:
	camera.rotation = Vector3(_pitch, _yaw, 0.0)
	var wish := Input.get_vector("move_left", "move_right", "move_back", "move_forward")
	var dir := camera.global_transform.basis * Vector3(wish.x, 0, -wish.y)
	if Input.is_action_pressed("jump"):
		dir.y += 1.0
	camera.global_position += dir * MOVE_SPEED * delta


## Cosa scrivere a schermo. Chi guarda deve sapere CHI sta guardando e come si
## cambia: una camera senza etichetta è una camera in cui ci si perde.
func status_line() -> String:
	var who := "—"
	if is_instance_valid(target):
		who = String(target.name)
	var how: String = ["EYES", "BEHIND", "FREE"][mode]
	return "%s   ·   %s   ·   SPACE next   F view" % [who, how]
