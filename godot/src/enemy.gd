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
const Status := preload("res://src/status.gd")
const CharacterScript := preload("res://src/character.gd")
const SettingsScript := preload("res://src/settings.gd")

@export var max_hp: float = Combat.HP_MAX
## Gradi al secondo di rotazione: quanto in fretta ti insegue con la mira.
@export var turn_speed_deg: float = 110.0
## Errore di mira in metri a 20 m, quando ti ha appena visto. Cala restando in vista.
@export var aim_error_m: float = 1.2
## Secondi fra un colpo e l'altro.
@export var fire_period: float = 1.15
@export var damage: float = 9.0
@export var sight_range: float = 34.0
## Che classe interpreta questo bot. Decide modello, arma e silhouette — e in
## un'arena dove le classi sono quattro, vedere sempre lo stesso corpo
## significa non imparare mai a riconoscerle.
@export var class_id: String = "drift"

var hp: float
var target: Node3D = null
## Anche i bot subiscono veleni, rallentamenti e radici. Un nemico immune agli
## stati renderebbe inutile meta' del gioco proprio contro l'avversario che si
## incontra piu' spesso.
var status := Status.new()
## Fuori scena in attesa di rientrare. Un morto non spara e non si colpisce.
var dead := false

var _aim := Vector3.FORWARD
var _fire_t := 0.0
var _tracking := 0.0
var _rng := RandomNumberGenerator.new()
var _err := Vector3.ZERO
var _err_t := 0.0
var _layer := 0

signal fired(from: Vector3, to: Vector3, hit: bool)
signal died


var body_view: Node3D = null


func _ready() -> void:
	hp = max_hp
	_rng.randomize()
	_aim = -global_transform.basis.z
	_build_body()


## Il corpo vero al posto della capsula. La capsula di collisione resta — è
## quella che il gioco usa per colpire, ed è la stessa per tutti: due giocatori
## non devono essere più facili o più difficili da prendere per via del modello
## che hanno scelto.
func _build_body() -> void:
	for c in get_children():
		if c is MeshInstance3D:
			c.queue_free()
	body_view = CharacterScript.new()
	body_view.name = "Body"
	add_child(body_view)
	var colors: Dictionary = SettingsScript.COLORBLIND["none"]
	body_view.setup(class_id, colors["enemy"])


func take_damage(amount: float) -> void:
	if dead:
		return
	hp = maxf(0.0, hp - amount)
	if hp > 0.0:
		# Il colpo subito si VEDE addosso a chi lo prende: è metà del feedback di
		# aver colpito, e l'unica metà che vede anche chi sta guardando da fuori.
		if body_view:
			body_view.act("hit", 0.25)
		return
	if hp <= 0.0:
		dead = true
		if body_view:
			body_view.die()
		# Non `queue_free`: un nemico distrutto non può tornare, e una partita in
		# cui gli avversari finiscono non è una partita — è un livello. Qui esce
		# di scena e ci rientra quando le regole lo dicono.
		# Il corpo resta visibile per un attimo mentre cade: sparire di colpo
		# toglie la conferma di averlo ucciso.
		visible = false
		process_mode = Node.PROCESS_MODE_DISABLED
		# E smette di essere un bersaglio: senza questo, i secondi di attesa sono
		# secondi in cui il cadavere continua a incassare e a far salire il
		# punteggio.
		_layer = collision_layer
		collision_layer = 0
		died.emit()


## Rientra in campo, vita piena, nel punto che gli viene detto.
func revive(at: Vector3) -> void:
	dead = false
	hp = max_hp
	global_position = at
	velocity = Vector3.ZERO
	_tracking = 0.0
	visible = true
	process_mode = Node.PROCESS_MODE_INHERIT
	if body_view:
		body_view.revive()
	if _layer != 0:
		collision_layer = _layer


func launch(airtime: float = 0.72) -> void:
	velocity.y = maxf(velocity.y, 25.0 * airtime * 0.5)


func heal(amount: float) -> void:
	hp = minf(max_hp, hp + amount)


## I bot non hanno mana ne' stamina: non lanciano abilita' che li consumino.
## Il metodo esiste perche' chi drena una risorsa non debba sapere chi ha davanti.
func restore(_resource: String, _amount: float) -> void:
	pass


func _physics_process(delta: float) -> void:
	var dot := status.tick(delta)
	if dot > 0.0:
		take_damage(dot)
	if not status.can_move():
		velocity.x = 0.0
		velocity.z = 0.0
		move_and_slide()
		return

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

	# Il corpo guarda dove mira: senza, un nemico che strafa sembra scivolare di
	# lato invece di inseguirti, e non si legge più da che parte sta per sparare.
	var flat := Vector3(_aim.x, 0.0, _aim.z)
	if flat.length_squared() > 0.001:
		rotation.y = atan2(flat.x, flat.z) + PI

	# Si muove di lato mentre spara: un nemico fermo è un bersaglio, non un
	# avversario, e insegna al giocatore l'abitudine sbagliata.
	var strafe := to_target.cross(Vector3.UP).normalized()
	var approach: float = 1.0 if dist > 14.0 else (-1.0 if dist < 7.0 else 0.0)
	var move := (to_target.normalized() * approach + strafe * sin(_tracking * 1.7) * 0.8)
	move.y = 0.0
	var slow := status.move_multiplier()
	velocity.x = move.x * 5.5 * slow
	velocity.z = move.z * 5.5 * slow
	move_and_slide()

	if body_view:
		body_view.drive(velocity, is_on_floor(), delta)

	_fire_t -= delta
	if _fire_t <= 0.0 and status.can_cast():
		_fire_t = fire_period
		if body_view:
			body_view.act("attack", 0.4)
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
