## Verifica la scena GIOCABILE: premi un tasto, il colpo parte e fa danno.
##
## I test precedenti verificano i pezzi (movimento, scala, risoluzione). Questo
## verifica che siano COLLEGATI — che è dove i progetti muoiono: sistemi tutti
## giusti che non si parlano.
##
## Scritto come macchina a stati sui frame e NON con `await`: in un SceneTree il
## `_process` deve restituire un bool, e mettendoci dentro un await la funzione
## diventa una coroutine, il valore di ritorno smette di essere quel bool e il
## test si ferma a metà senza dire perché. Ci sono cascato scrivendolo.
##
##   godot --headless --script res://tests/test_arena_play.gd
extends SceneTree

var failures := 0
var _arena: Node3D
var _player: CharacterBody3D
var _still: CharacterBody3D
var _step := 0
var _wait := 0
var _hp_mark := 0.0
var _bolts := 0


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
	_still = _arena.get_node_or_null("DummyFermo")
	print("\n=== LA SCENA GIOCABILE ===\n")


func _process(_d: float) -> bool:
	if _wait > 0:
		_wait -= 1
		return false

	match _step:
		0:
			_wait = 8  # la fisica deve popolare lo spazio
		1:
			_check("il giocatore è nella scena", _player != null, "Player trovato" if _player else "assente")
			_check(
				"i tre bersagli esistono",
				_still != null
				and _arena.get_node_or_null("DummyMobile") != null
				and _arena.get_node_or_null("DummyAereo") != null,
				"fermo/mobile/aereo"
			)
			if _player == null or _still == null:
				_finish()
				return true
			_player.global_position = Vector3(0, 0.9, 0)
			_player.rotation.y = 0.0
			_player.get_node("Camera3D").rotation.x = 0.0
			_still.global_position = Vector3(0, 0.9, -6)
			_wait = 2
		2:
			# --- Slot 1: il fascio -------------------------------------------
			_hp_mark = _still.hp
			var n1: int = _player.cast_slot(0)
			_check(
				"slot 1 (fascio) colpisce",
				n1 >= 1,
				"%d bersagli, vita %.0f → %.0f" % [n1, _hp_mark, _still.hp]
			)
			# --- Il GCD blocca il lancio immediatamente successivo -----------
			_check("il GCD blocca il lancio successivo", _player.cast_slot(1) == -1, "rifiutato")
		3:
			# --- Slot 3: l'area, e sbalza ------------------------------------
			_player._clock += 1.0
			_still.global_position = Vector3(1.5, 0.9, 0.5)
			_wait = 2
		4:
			var n3: int = _player.cast_slot(2)
			_check("slot 3 (area) colpisce chi è vicino", n3 >= 1, "%d bersagli" % n3)
			_wait = 1
		5:
			_check("e lo stacca da terra", _still.velocity.y > 0.0, "vy %.1f m/s" % _still.velocity.y)
		6:
			# --- Slot 2: il proiettile, che vive nel tempo -------------------
			_player._clock += 2.0
			_still.global_position = Vector3(0, 0.9, -12)
			_still.velocity = Vector3.ZERO
			_player.global_position = Vector3(0, 0.9, 0)
			_wait = 2
		7:
			_hp_mark = _still.hp
			_player.cast_slot(1)
			_bolts = 0
			for c in _arena.get_children():
				if c is Area3D:
					_bolts += 1
			_check("il proiettile viene creato", _bolts >= 1, "%d in volo" % _bolts)
			# 12 m a 42 m/s = ~0,29 s = ~18 tick. Ne aspetto 45 con margine.
			_wait = 45
		8:
			_check(
				"il proiettile arriva e fa danno",
				_still.hp < _hp_mark,
				"vita %.0f → %.0f" % [_hp_mark, _still.hp]
			)
			_finish()
			return true

	_step += 1
	return false


func _finish() -> void:
	print("")
	if failures == 0:
		print("=== LA SCENA GIOCABILE FUNZIONA ===\n")
	else:
		printerr("=== %d CONTROLLI FALLITI ===\n" % failures)
	quit(1 if failures > 0 else 0)
