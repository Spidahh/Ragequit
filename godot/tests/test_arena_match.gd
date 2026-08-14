## Verifica che nell'arena vera si possa VINCERE UNA PARTITA.
##
## Non "il colpo fa danno" (lo prova test_arena_play) e non "le regole tornano"
## (test_match): questo prende la scena che si gioca davvero e ci porta dentro
## una partita fino alla fine. È la differenza fra una sandbox e un gioco, ed è
## esattamente la cosa che un prototipo non ha mai.
##
##   godot --headless --script res://tests/test_arena_match.gd
extends SceneTree

const M = preload("res://src/match_rules.gd")

var failures := 0
var _arena: Node3D
var _kills := 0
var _respawns_seen := 0
var _step := 0


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
	print("\n=== UNA PARTITA INTERA NELL'ARENA ===\n")


func _process(delta: float) -> bool:
	_step += 1
	if _step == 1:
		_check(
			"la partita è aperta appena entri",
			not _arena._match.is_empty() and _arena._match["phase"] == M.Phase.LIVE,
			"%d giocatori in campo" % _arena._match["peers"].size()
		)
		_check(
			"i bot sono giocatori, non arredamento",
			_arena._bots.size() >= 2,
			"%d bot con un id" % _arena._bots.size()
		)
		return false

	# Il tempo lo si fa scorrere a passi fissi: in headless un frame dura
	# microsecondi, e i tre secondi di respawn non arriverebbero mai.
	var dt := 1.0 / 60.0

	# Si uccide tutto quello che è vivo, il più in fretta possibile: interessa
	# che il ciclo giri, non quanto sia bravo chi spara.
	for id in _arena._bots.keys():
		var bot = _arena._bots[id]
		if is_instance_valid(bot) and not bot.dead:
			bot.take_damage(9999.0)
			_kills += 1

	# I rientri si contano PER BOT: se rientrano nello stesso frame, contare i
	# morti prima e dopo ne vede uno solo — e il conto sarebbe sbagliato in
	# silenzio, che è il modo peggiore di sbagliare in un test.
	var was_dead := {}
	for id in _arena._bots.keys():
		was_dead[id] = _arena._bots[id].dead
	_arena._process(dt)
	for id in _arena._bots.keys():
		if bool(was_dead[id]) and not _arena._bots[id].dead:
			_respawns_seen += 1

	if _arena._match["phase"] == M.Phase.OVER:
		_check(
			"la partita finisce",
			int(_arena._match["score"][1]) >= int(M.SCORE_LIMIT[M.Mode.SOLO]),
			"%d uccisioni" % int(_arena._match["score"][1])
		)
		_check("e la vince chi ha segnato", int(_arena._match["winner"]) == 1, "vincitore = giocatore")
		_check(
			"ogni bot ucciso è tornato in campo",
			_respawns_seen >= _kills - _arena._bots.size(),
			"%d rientri su %d uccisioni" % [_respawns_seen, _kills]
		)
		_check(
			"e sono tornati vivi, non fantasmi",
			_all_alive_have_collision(),
			"chi è in campo si può colpire"
		)
		print("")
		if failures == 0:
			print("Tutto verde.\n")
			quit(0)
		else:
			printerr("%d rosso/i.\n" % failures)
			quit(1)
		return true

	# Un tetto: una partita che non finisce è il difetto che questo test cerca.
	if _step > 60 * 60 * 10:
		printerr("  ✗ la partita non finisce mai — %d uccisioni" % _kills)
		quit(1)
		return true
	return false


func _count_dead() -> int:
	var n := 0
	for id in _arena._bots.keys():
		var b = _arena._bots[id]
		if is_instance_valid(b) and b.dead:
			n += 1
	return n


func _all_alive_have_collision() -> bool:
	for id in _arena._bots.keys():
		var b = _arena._bots[id]
		if is_instance_valid(b) and not b.dead and b.collision_layer == 0:
			return false
	return true
