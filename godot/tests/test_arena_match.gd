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
## Bot che le regole dichiarano vivi mentre il corpo è ancora a terra.
var _ghosts := 0
## Quante volte ogni bot è tornato in campo.
var _rientri_per_bot: Dictionary = {}
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

	# I rientri si contano SULLE REGOLE, non sui nodi: è la regola che decide
	# quando si torna in vita, e un nodo che non torna mentre la regola dice che
	# è vivo è proprio il difetto che questo test deve trovare — contarlo sui
	# nodi lo renderebbe invisibile.
	var was_dead := {}
	for id in _arena._bots.keys():
		was_dead[id] = not bool(_arena._match["alive"].get(id, true))
	_arena._process(dt)
	for id in _arena._bots.keys():
		var alive_now := bool(_arena._match["alive"].get(id, true))
		if bool(was_dead[id]) and alive_now:
			_respawns_seen += 1
			# E il corpo deve essere tornato con la regola: se la regola dice
			# "vivo" e il nodo è ancora a terra, il giocatore vede un cadavere
			# che gli spara.
			if _arena._bots[id].dead:
				_ghosts += 1
			_rientri_per_bot[id] = int(_rientri_per_bot.get(id, 0)) + 1

	if _arena._match["phase"] == M.Phase.OVER:
		_check(
			"la partita finisce",
			int(_arena._match["score"][1]) >= int(M.SCORE_LIMIT[M.Mode.SOLO]),
			"%d uccisioni" % int(_arena._match["score"][1])
		)
		_check("e la vince chi ha segnato", int(_arena._match["winner"]) == 1, "vincitore = giocatore")
		# Non un RAPPORTO fra rientri e uccisioni: quel numero dipende da quante
		# volte il test riesce a sparare in una finestra di respawn, e una soglia
		# scelta a occhio è una soglia che si rompe quando cambia il ritmo.
		# L'invariante vera è che il ciclo GIRI: ogni bot cade e torna, più volte,
		# per tutta la partita.
		var min_rientri: int = 1 << 30
		for id in _rientri_per_bot:
			min_rientri = mini(min_rientri, int(_rientri_per_bot[id]))
		_check(
			"ogni bot cade e torna, più volte",
			_arena._bots.size() > 0 and min_rientri >= 2,
			"il bot che è tornato meno lo ha fatto %d volte (%d rientri, %d uccisioni)" % [min_rientri, _respawns_seen, _kills]
		)
		_check(
			"e il corpo è tornato insieme alla regola",
			_ghosts == 0,
			"%d rientri con il corpo ancora a terra" % _ghosts
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
