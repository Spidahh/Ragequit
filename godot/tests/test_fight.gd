## Verifica il COMBATTIMENTO COMPLETO: i nemici sparano, tu prendi, tu uccidi.
##
## È l'ultimo anello: fino a qui i colpi partivano solo dal giocatore e i
## bersagli non rispondevano. Un gioco in cui non puoi perdere non è un gioco, e
## un nemico che non manca mai nemmeno.
##
##   godot --headless --script res://tests/test_fight.gd
extends SceneTree

var failures := 0
var _arena: Node3D
var _player: Node
var _enemy: Node
var _step := 0
var _wait := 0
var _hp_mark := 0.0
var _shots := 0
var _hits := 0
var _frames_waited := 0


func _check(what: String, ok: bool, detail: String) -> void:
	if ok:
		print("  ✓ %s — %s" % [what, detail])
	else:
		failures += 1
		printerr("  ✗ %s — %s" % [what, detail])


func _init() -> void:
	var packed: PackedScene = load("res://scenes/arena.tscn")
	_arena = packed.instantiate()
	root.add_child(_arena)
	current_scene = _arena
	_player = _arena.get_node_or_null("Player")
	_enemy = _arena.get_node_or_null("Enemy0")
	print("\n=== IL COMBATTIMENTO COMPLETO ===\n")


func _on_fired(_f: Vector3, _t: Vector3, hit: bool) -> void:
	_shots += 1
	if hit:
		_hits += 1


func _process(_d: float) -> bool:
	if _wait > 0:
		_wait -= 1
		return false

	match _step:
		0:
			_wait = 6
		1:
			_check("il nemico esiste", _enemy != null, "Enemy0" if _enemy else "assente")
			if _enemy == null or _player == null:
				_finish()
				return true
			_check(
				"il nemico ha un bersaglio",
				_enemy.target == _player,
				"punta il giocatore" if _enemy.target == _player else "nessun bersaglio"
			)
			_enemy.fired.connect(_on_fired)
			# Faccia a faccia a 12 m, in vista libera.
			_player.global_position = Vector3(0, 0.9, 0)
			_enemy.global_position = Vector3(0, 0.9, -12)
			_hp_mark = _player.hp
			_wait = 2
		2:
			# Aspetta un numero di COLPI, non di frame: in headless il _process non
			# gira alla stessa cadenza della fisica, e contare i frame misurava una
			# cosa diversa da quella che serviva.
			if _shots < 8 and _frames_waited < 3000:
				_frames_waited += 1
				return false
		3:
			_check("il nemico spara", _shots > 0, "%d colpi in 4 s" % _shots)
			_check(
				"e qualche colpo va a segno",
				_hits > 0,
				"%d su %d a segno (%.0f%%)" % [_hits, _shots, 100.0 * _hits / maxf(_shots, 1)]
			)
			# E NON tutti: un nemico che non manca mai non è un avversario.
			_check(
				"ma non li prende tutti",
				_hits < _shots or _shots <= 1,
				"%d mancati" % (_shots - _hits)
			)
			_check(
				"il giocatore perde vita",
				_player.hp < _hp_mark,
				"vita %.0f → %.0f" % [_hp_mark, _player.hp]
			)
		4:
			# --- E il giocatore può ucciderlo -----------------------------------
			_player.global_position = Vector3(0, 0.9, 0)
			_enemy.global_position = Vector3(0, 0.9, -8)
			_player.rotation.y = 0.0
			_player.get_node("Camera3D").rotation.x = 0.0
			_hp_mark = _enemy.hp
			_wait = 2
		5:
			var n: int = _player.cast_slot(0)
			_check(
				"il giocatore colpisce il nemico",
				n >= 1 and _enemy.hp < _hp_mark,
				"vita nemico %.0f → %.0f" % [_hp_mark, _enemy.hp]
			)
		6:
			# Svuota il kit finché muore: verifica che il TTK sia una durata
			# vera e non infinita.
			var casts := 0
			var t := 0.0
			while is_instance_valid(_enemy) and _enemy.hp > 0.0 and t < 30.0:
				for slot in 4:
					if _player._cooldowns.can_cast(_player._kit[slot].id, _player._clock):
						if _player.cast_slot(slot) > 0:
							casts += 1
						break
				_player._clock += 0.35
				t += 0.35
			_check(
				"il nemico muore in un tempo sensato",
				not is_instance_valid(_enemy) or _enemy.hp <= 0.0,
				"%d lanci in %.1f s simulati" % [casts, t]
			)
			_finish()
			return true

	_step += 1
	return false


func _finish() -> void:
	print("")
	if failures == 0:
		print("=== SI COMBATTE DAVVERO ===\n")
	else:
		printerr("=== %d CONTROLLI FALLITI ===\n" % failures)
	quit(1 if failures > 0 else 0)
