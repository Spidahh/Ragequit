## Il nemico.
##
## Non un aimbot e non un bersaglio: un avversario che si può battere e da cui si
## può perdere. Il progetto precedente aveva scritto nei suoi documenti che i bot
## sono "la cosa più sottovalutata del repository", ed è vero — un PvP gratis con
## poca gente online è, per la maggior parte del tempo, un gioco contro i bot.
##
## COME MIRA, e perché così.
## Non punta la posizione esatta: punta con un errore che si riduce mentre resti
## in vista, e ci arriva con una velocità di rotazione limitata. Sono i due
## parametri con cui si tara la difficoltà, e sono gli stessi che usano gli
## shooter veri — non "percentuale di colpi a segno", che produce un nemico che
## sbaglia a caso e non si legge.
extends CharacterBody3D

const Combat := preload("res://src/combat.gd")

@export var max_hp: float = Combat.HP_MAX
## Gradi al secondo di rotazione: quanto in fretta ti insegue con la mira.
@export var turn_speed_deg: float = 110.0
## Errore di mira in metri a 20 m, quando ti ha appena visto. Cala restando in vista.
@export var aim_error_m: float = 1.2
## Secondi fra un colpo e l'altro.
@export var fire_period: float = 1.15
@export var damage: float = 9.0
@export var sight_range: float = 34.0

var hp: float
var target: Node3D = null

var _aim := Vector3.FORWARD
var _fire_t := 0.0
var _tracking := 0.0
var _rng := RandomNumberGenerator.new()
var _err := Vector3.ZERO
var _err_t := 0.0

signal fired(from: Vector3, to: Vector3, hit: bool)
signal died


func _ready() -> void:
	hp = max_hp
	_rng.randomize()
	_aim = -global_transform.basis.z


func take_damage(amount: float) -> void:
	hp = maxf(0.0, hp - amount)
	if hp <= 0.0:
		died.emit()
		queue_free()


func launch() -> void:
	velocity.y = 9.0


func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity.y -= 25.0 * delta
	else:
		velocity.y = 0.0

	if target == null or not is_instance_valid(target):
		move_and_slide()
		return

	var to_target: Vector3 = target.global_position - global_position
	var dist := to_target.length()
	if dist > sight_range:
		_tracking = 0.0
		move_and_slide()
		return

	# Più a lungo ti tiene in vista, meglio mira. È leggibile: se rompi la linea
	# di vista, il suo prossimo colpo torna impreciso — e questo dà un motivo
	# vero alle coperture.
	_tracking = minf(_tracking + delta, 2.0)
	var accuracy := clampf(_tracking / 2.0, 0.0, 1.0)

	# L'errore cambia lentamente invece che a ogni frame: un errore che salta a
	# ogni tick fa tremare il colpo e sembra rumore, non imprecisione.
	_err_t -= delta
	if _err_t <= 0.0:
		_err_t = 0.35
		var spread: float = aim_error_m * (1.0 - accuracy * 0.8) * (dist / 20.0)
		_err = Vector3(_rng.randfn(0.0, spread), _rng.randfn(0.0, spread * 0.5), _rng.randfn(0.0, spread))

	var wanted := (to_target + _err).normalized()
	# Rotazione limitata: non scatta sul bersaglio, ci arriva.
	var max_turn := deg_to_rad(turn_speed_deg) * delta
	_aim = _aim.slerp(wanted, clampf(max_turn / maxf(_aim.angle_to(wanted), 0.0001), 0.0, 1.0))

	# Si muove di lato mentre spara: un nemico fermo è un bersaglio, non un
	# avversario, e insegna al giocatore l'abitudine sbagliata.
	var strafe := to_target.cross(Vector3.UP).normalized()
	var approach: float = 1.0 if dist > 14.0 else (-1.0 if dist < 7.0 else 0.0)
	var move := (to_target.normalized() * approach + strafe * sin(_tracking * 1.7) * 0.8)
	move.y = 0.0
	velocity.x = move.x * 5.5
	velocity.z = move.z * 5.5
	move_and_slide()

	_fire_t -= delta
	if _fire_t <= 0.0:
		_fire_t = fire_period
		_shoot()


func _shoot() -> void:
	var from := global_position + Vector3(0, 0.6, 0)
	var to := from + _aim * sight_range
	var q := PhysicsRayQueryParameters3D.create(from, to)
	q.exclude = [get_rid()]
	var res := get_world_3d().direct_space_state.intersect_ray(q)
	var hit := false
	if res:
		var n := res.get("collider") as Node3D
		to = res["position"]
		if n and n.has_method("take_damage"):
			n.take_damage(damage)
			hit = true
	fired.emit(from, to, hit)
