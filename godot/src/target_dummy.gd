## Il bersaglio da allenamento.
##
## Esiste presto di proposito: senza qualcosa da colpire non si può misurare se
## il combattimento funziona, e il progetto precedente ha passato mesi a tarare
## numeri che nessuno aveva mai visto atterrare su un corpo.
##
## Tre stati, e sono i tre che servono per allenare le tre forme: fermo (provi le
## sagome), che si muove (provi l'anticipo), che rimbalza in aria (provi la cosa
## più difficile del gioco, che è colpire un corpo che vola).
extends CharacterBody3D

enum Mode { STILL, STRAFE, BOUNCE }

@export var mode: Mode = Mode.STILL
@export var max_hp: float = 200.0

var hp: float
var _t := 0.0
var _origin: Vector3
var _airborne_until := 0.0

signal damaged(amount: float, remaining: float)
signal died


func _ready() -> void:
	hp = max_hp
	_origin = global_position


func take_damage(amount: float) -> void:
	hp = maxf(0.0, hp - amount)
	damaged.emit(amount, hp)
	if hp <= 0.0:
		died.emit()
		hp = max_hp  # si rialza subito: è un manichino, non un nemico


## Sbalzo in aria — il momento firma del gioco.
func launch() -> void:
	velocity.y = 9.0
	_airborne_until = _t + 0.9


func _physics_process(delta: float) -> void:
	_t += delta
	match mode:
		Mode.STILL:
			velocity.x = 0.0
			velocity.z = 0.0
		Mode.STRAFE:
			velocity.x = sin(_t * 1.6) * 6.0
			velocity.z = cos(_t * 0.9) * 2.5
		Mode.BOUNCE:
			if is_on_floor() and _t > _airborne_until:
				velocity.y = 8.0
			velocity.x = sin(_t * 1.1) * 3.0

	if not is_on_floor():
		velocity.y -= 25.0 * delta
	move_and_slide()

	# Non si allontana mai troppo: deve restare inquadrabile mentre si prova.
	var flat := Vector2(global_position.x - _origin.x, global_position.z - _origin.z)
	if flat.length() > 9.0:
		global_position.x = _origin.x
		global_position.z = _origin.z
