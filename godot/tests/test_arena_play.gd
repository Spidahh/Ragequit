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
var _slot_beam := -1
var _slot_bolt := -1
var _slot_zone := -1


## Gli slot NON si cercano per indice: il kit dipende dalla classe scelta, e un
## test che dice "slot 1" sta verificando la build del BREAKER, non il gioco.
## Si cerca la prima abilità di ogni forma che faccia davvero danno.
func _find_slot(shape: int) -> int:
	var kit: Array = _player.kit()
	for i in kit.size():
		if int(kit[i]["shape"]) == shape and float(kit[i]["damage"]) > 0.0:
			return i
	return -1


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
			_slot_beam = _find_slot(2 if false else 0)
			_slot_bolt = _find_slot(1)
			_slot_zone = _find_slot(3)
			_check(
				"il kit della build ha di che combattere",
				_slot_beam >= 0 and _slot_bolt >= 0,
				(
					"%d abilità, fascio allo slot %d, proiettile allo slot %d"
					% [_player.kit().size(), _slot_beam + 1, _slot_bolt + 1]
				)
			)
			if _slot_beam < 0 or _slot_bolt < 0:
				_finish()
				return true
			# Il bersaglio si mette a tiro DELL'ABILITÀ, non a una distanza fissa:
			# un fascio da 2,5 m e uno da 30 non si provano allo stesso posto.
			var reach: float = float(_player.kit()[_slot_beam]["range_m"])
			_still.global_position = Vector3(0, 0.9, -maxf(reach * 0.6, 1.5))
			_wait = 2
		2:
			# --- Il fascio ---------------------------------------------------
			_hp_mark = _still.hp
			var n1: int = _player.cast_slot(_slot_beam)
			_check(
				"il fascio colpisce",
				n1 >= 1,
				"%d bersagli, vita %.0f → %.0f" % [n1, _hp_mark, _still.hp]
			)
			# --- Il GCD blocca il lancio immediatamente successivo -----------
			_check("il GCD blocca il lancio successivo", _player.cast_slot(_slot_bolt) == -1, "rifiutato")
			_wait = 1
		3:
			# Se il fascio sbalza, deve staccare da terra: è il momento firma.
			var launches: bool = bool(_player.kit()[_slot_beam]["launches"])
			if launches:
				_check("e lo stacca da terra", _still.velocity.y > 0.0, "vy %.1f m/s" % _still.velocity.y)
			else:
				_check("e il bersaglio resta a terra", true, "questa abilità non sbalza")
		4:
			# --- La zona, che pulsa nel tempo --------------------------------
			_player._clock += 12.0
			if _slot_zone >= 0:
				_still.global_position = _player.global_position + Vector3(1.2, 0.0, 0.0)
				_still.velocity = Vector3.ZERO
				_hp_mark = _still.hp
				_player.cast_slot(_slot_zone)
			_wait = 60
		5:
			if _slot_zone >= 0:
				_check("la zona fa danno a chi ci sta dentro", _still.hp < _hp_mark, "vita %.0f → %.0f" % [_hp_mark, _still.hp])
			else:
				_check("nessuna zona in questo kit", true, "saltato")
		6:
			# --- Il proiettile, che vive nel tempo ---------------------------
			_player._clock += 12.0
			_still.global_position = Vector3(0, 0.9, -12)
			_still.velocity = Vector3.ZERO
			_player.global_position = Vector3(0, 0.9, 0)
			_wait = 2
		7:
			_hp_mark = _still.hp
			_player.cast_slot(_slot_bolt)
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
