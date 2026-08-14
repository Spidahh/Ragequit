## Il giocatore in prima persona.
##
## La fisica NON è quella del motore: è `Movement.step`, portata dal progetto
## precedente. Godot muove il corpo, ma la velocità la decide la nostra funzione
## deterministica — perché quella stessa funzione dovrà girare sul server
## autoritativo, e due integratori diversi divergono sempre.
##
## Quello che invece si prende dal motore, e che nel progetto Three.js erano
## migliaia di righe scritte a mano: collisione capsula (`move_and_slide`),
## camera, viewmodel su un layer suo che non compenetra i muri, e l'ambiente.
extends CharacterBody3D

const Combat := preload("res://src/combat.gd")
const AbilityRuntime := preload("res://src/ability_runtime.gd")
const BoltScript := preload("res://src/bolt.gd")
const Vfx := preload("res://src/vfx.gd")

const MOUSE_SENSITIVITY := 0.0022
const PITCH_LIMIT := deg_to_rad(89.0)

@onready var _camera: Camera3D = $Camera3D
@onready var _viewmodel: Node3D = $Camera3D/Viewmodel

## Il kit in mano: quattro abilità sui tasti 1-4. Quattro perché quattro verbi si
## imparano in una partita — vedi combat.gd.
var _kit: Array = []
var _cooldowns := AbilityRuntime.Cooldowns.new()
var _clock := 0.0
var _cam_kick := 0.0

## Vita del giocatore. Sta qui e non in un componente separato finche non serve:
## un sistema in piu senza un secondo utente e complessita comprata a credito.
var hp: float = Combat.HP_MAX
## A terra, in attesa che le regole dicano quando si torna. Un morto non spara
## e non incassa: senza questo, i tre secondi di attesa sono tre secondi in cui
## il cadavere continua a far salire il punteggio di chi lo ha ucciso.
var dead := false

signal died

signal cast_resolved(ability_name: String, hits: int)
signal damaged(amount: float, remaining: float)

var _sim: Dictionary
var _yaw := 0.0
var _pitch := 0.0

# Stato del viewmodel: sway sul mouse, bob sulla velocità, dip all'atterraggio.
# Sono le tre cose che fanno sentire che TIENI un oggetto invece di indossare un
# adesivo — nel progetto precedente non c'era proprio niente in mano.
var _sway := Vector2.ZERO
var _bob_phase := 0.0
var _land_dip := 0.0
var _was_on_ground := true
var _vm_rest := Vector3.ZERO


func _ready() -> void:
	_sim = Movement.make_state(global_position)
	if _viewmodel:
		_vm_rest = _viewmodel.position
	_kit = Combat.starter_kit()
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


## Lancia lo slot `idx` (0-3). Ritorna quanti bersagli ha preso, -1 se non era
## disponibile — così il chiamante (e i test) sanno distinguere "mancato" da
## "non potevi".
func cast_slot(idx: int) -> int:
	if idx < 0 or idx >= _kit.size():
		return -1
	var ability = _kit[idx]
	if not _cooldowns.can_cast(ability.id, _clock):
		return -1
	_cooldowns.start(ability.id, ability.cooldown, ability.cast_time, _clock)

	# L'origine è l'occhio, non i piedi: la forma parte da dove guardi, o quello
	# che vedi e quello che colpisci non coincidono.
	var origin := _camera.global_position
	var dir := -_camera.global_transform.basis.z

	# Il kick dell'arma parte QUI, prima che il colpo esista nel mondo: è ciò che
	# fa sentire che l'attacco è partito da te.
	_punch(ability.shape)

	if ability.shape == Combat.Shape.BOLT:
		var bolt := Area3D.new()
		bolt.set_script(BoltScript)
		var col := CollisionShape3D.new()
		var sph := SphereShape3D.new()
		sph.radius = 0.2
		col.shape = sph
		bolt.add_child(col)
		var mesh := MeshInstance3D.new()
		var sm := SphereMesh.new()
		sm.radius = 0.16
		sm.height = 0.32
		mesh.mesh = sm
		var glow := StandardMaterial3D.new()
		glow.albedo_color = Color(1.0, 0.55, 0.2)
		glow.emission_enabled = true
		glow.emission = Color(1.0, 0.45, 0.1)
		glow.emission_energy_multiplier = 3.0
		mesh.material_override = glow
		bolt.add_child(mesh)
		get_tree().current_scene.add_child(bolt)
		bolt.fire(origin, dir, ability, self)
		cast_resolved.emit(ability.name, 0)
		return 0

	var space := get_world_3d().direct_space_state
	var result := AbilityRuntime.resolve_instant(space, ability, origin, dir, [get_rid()])
	var n := AbilityRuntime.apply(result)

	# Il VFX usa la geometria che il colpo ha DAVVERO occupato — result.end_point
	# è dove la forma si è fermata, non dove sarebbe arrivata al massimo. È così
	# che disegnato e colpito restano la stessa cosa.
	var world := get_tree().current_scene
	if world:
		if ability.shape == Combat.Shape.BURST:
			Vfx.burst(world, global_position)
		else:
			# Il VFX parte dalla BOCCA DELL'ARMA, non dall'occhio.
			# Il test di collisione parte dall'occhio ed è giusto così — quello
			# che vedi è quello che colpisci. Ma disegnare il cilindro da lì
			# mette la camera DENTRO un volume additivo: misurato, il pixel più
			# scuro del frame passava da 0 a 96 e metà schermo finiva sopra l'80%
			# di luminanza. Due origini diverse per due scopi diversi.
			var muzzle := origin + dir * 1.1 + _camera.global_transform.basis.x * 0.22 - _camera.global_transform.basis.y * 0.16
			Vfx.beam(world, muzzle, result.end_point)
		for h in result.hits:
			if is_instance_valid(h):
				Vfx.impact(world, h.global_position + Vector3(0, 0.9, 0))

	# Il peso del colpo: un calcio alla camera e al viewmodel, NON un freeze del
	# motore. Avevo usato Engine.time_scale, ed è uno strumento troppo grosso:
	# rallenta tutto — nemici, proiettili, il proiettile che avevi appena
	# lanciato. Il test l'ha preso subito (il bolt non arrivava più a bersaglio).
	# Un kick visivo dà la stessa sensazione senza toccare la simulazione.
	if n > 0:
		_cam_kick = 0.035
		_sway += Vector2(0.0, -0.045)

	cast_resolved.emit(ability.name, n)
	return n


func take_damage(amount: float) -> void:
	if dead:
		return
	hp = maxf(0.0, hp - amount)
	damaged.emit(amount, hp)
	if hp <= 0.0:
		dead = true
		died.emit()


## Chi decide QUANDO si torna in vita sono le regole della partita, non il
## colpo che ti ha ucciso. Qui si esegue e basta.
func respawn() -> void:
	dead = false
	hp = Combat.HP_MAX
	_sim["vel"] = Vector3.ZERO


func launch() -> void:
	_sim["vel"].y = 9.0
	_sim["knockback_ticks"] = 6


func _punch(shape: int) -> void:
	match shape:
		Combat.Shape.BURST:
			_land_dip = 0.09
		Combat.Shape.BOLT:
			_sway += Vector2(0.0, -0.05)
		_:
			_sway += Vector2(0.0, -0.03)


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		_yaw -= event.relative.x * MOUSE_SENSITIVITY
		_pitch = clampf(_pitch - event.relative.y * MOUSE_SENSITIVITY, -PITCH_LIMIT, PITCH_LIMIT)
		# Il sway è il DELTA del mouse: l'arma resta indietro e rientra a molla.
		_sway.x += event.relative.x * 0.00035
		_sway.y += event.relative.y * 0.00035
	elif event.is_action_pressed("ui_cancel"):
		Input.mouse_mode = (
			Input.MOUSE_MODE_VISIBLE
			if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED
			else Input.MOUSE_MODE_CAPTURED
		)


func _physics_process(delta: float) -> void:
	_clock += delta
	for i in 4:
		if Input.is_action_just_pressed("ability_%d" % (i + 1)):
			cast_slot(i)

	var wish := Input.get_vector("move_left", "move_right", "move_back", "move_forward")

	# Il motore ha già risolto la collisione: rileggi da lui la posizione e lo
	# stato di appoggio prima di simulare, o la nostra funzione integra contro un
	# mondo che non esiste.
	_sim["pos"] = global_position
	_sim["on_ground"] = is_on_floor()

	_sim = Movement.step(_sim, wish, _yaw, Input.is_action_pressed("jump"), delta)

	velocity = _sim["vel"]
	move_and_slide()

	# E dopo: se il motore ci ha fermati contro un muro, la nostra velocità deve
	# saperlo, altrimenti continua ad accumulare contro la geometria.
	_sim["vel"] = velocity
	_sim["pos"] = global_position

	rotation.y = _yaw
	# Il kick si somma al pitch e rientra a molla: la camera ricorda il colpo
	# per un attimo, poi torna dove stavi mirando.
	_cam_kick *= exp(-14.0 * delta)
	_camera.rotation.x = _pitch + _cam_kick

	_update_viewmodel(delta)


func _update_viewmodel(delta: float) -> void:
	if not _viewmodel:
		return
	var step := minf(delta, 0.05)

	# Sway: rientra a molla verso la posa di riposo.
	_sway = _sway.limit_length(0.09) * exp(-9.0 * step)

	# Bob: un otto guidato dalla velocità REALE, così l'accelerazione di Quake si
	# vede nelle mani invece che solo nel movimento della camera.
	var speed := Vector2(velocity.x, velocity.z).length()
	var ratio := clampf(speed / Movement.MOVE_SPEED, 0.0, 1.4)
	if is_on_floor() and ratio > 0.05:
		_bob_phase += step * 9.5 * ratio
	var bob_x := cos(_bob_phase) * 0.022 * ratio
	# Frequenza doppia sulla verticale: è ciò che lo rende un passo e non un dondolio.
	var bob_y := absf(sin(_bob_phase)) * 0.016 * ratio - 0.008 * ratio

	# Dip di atterraggio, su molla: peso.
	if is_on_floor() and not _was_on_ground:
		_land_dip = 0.12
	_was_on_ground = is_on_floor()
	_land_dip *= exp(-7.0 * step)

	_viewmodel.position = _vm_rest + Vector3(
		-_sway.x + bob_x,
		_sway.y + bob_y - _land_dip,
		0.0
	)
	_viewmodel.rotation = Vector3(_sway.y * 2.0, -_sway.x * 2.0, _sway.x * 3.0)
