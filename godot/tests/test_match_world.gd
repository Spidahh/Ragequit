## Verifica che le regole di partita siano DAVVERO collegate al mondo.
##
## `test_match` prova le regole da sole, in matematica pura. Questo prova la cosa
## che di solito si rompe: che il colpo che uccide faccia salire il punteggio,
## che il morto smetta di essere un bersaglio, e che chi rinasce si ritrovi vivo
## e lontano — non a fianco di chi lo ha appena ucciso.
##
##   godot --headless --script res://tests/test_match_world.gd
extends SceneTree

const NetScript = preload("res://src/net.gd")
const WorldScript = preload("res://src/net_world.gd")
const M = preload("res://src/match_rules.gd")
const Combat = preload("res://src/combat.gd")
const Spawns = preload("res://src/spawns.gd")

var failures := 0
var net: Node
var world: Node3D
var events: Array = []
var step := 0


func _check(what: String, ok: bool, detail: String) -> void:
	if ok:
		print("  ✓ %s — %s" % [what, detail])
	else:
		failures += 1
		printerr("  ✗ %s — %s" % [what, detail])


func _init() -> void:
	print("\n=== PARTITA COLLEGATA AL MONDO ===\n")
	net = NetScript.new()
	net.name = "Net"
	root.add_child(net)
	world = WorldScript.new()
	world.name = "World"
	root.add_child(world)
	net.match_event_happened.connect(func(e): events.append(e))


## Il test è una macchina a stati sui frame, non una sequenza con `await`:
## `_process` deve restituire un bool, e un `await` al suo interno lo fa
## restituire un segnale — il test passa in silenzio senza aver provato niente.
## È già successo.
func _process(delta: float) -> bool:
	step += 1
	match step:
		1:
			if not net.host(27099):
				printerr("  host fallito")
				quit(1)
				return true
			world.setup(net)
			return false
		2:
			# Due corpi: il server (1) e un avversario finto (2).
			world._spawn_body(2)
			world.start_match(M.Mode.SOLO)
			_check(
				"la partita si apre sui corpi presenti",
				world.match_state["peers"].size() == 2,
				"%d giocatori" % world.match_state["peers"].size()
			)
			_check(
				"si nasce lontani",
				(
					world.bodies[1]["node"].global_position.distance_to(
						world.bodies[2]["node"].global_position
					)
					> Spawns.RADIUS_M
				),
				(
					"%.1f m fra i due"
					% world.bodies[1]["node"].global_position.distance_to(
						world.bodies[2]["node"].global_position
					)
				)
			)
			return false
		3:
			_uccidi()
			return false
		4:
			_check(
				"l'uccisione fa punto",
				int(world.match_state["score"][1]) == 1,
				"peer 1 = %d" % int(world.match_state["score"][1])
			)
			_check("il morto è morto", not bool(world.match_state["alive"][2]), "vivo = false")
			_check(
				"l'evento arriva sul filo",
				_has_event("kill"),
				"%d eventi finora" % events.size()
			)
			# Colpirlo di nuovo mentre è a terra non deve fare un secondo punto.
			world.bodies[2]["hp"] = 1.0
			_uccidi()
			return false
		5:
			_check(
				"un cadavere non fa punteggio",
				int(world.match_state["score"][1]) == 1,
				"peer 1 = %d dopo il secondo colpo" % int(world.match_state["score"][1])
			)
			return false
	# Il tempo lo si fa scorrere a passi FISSI, non con il delta reale: in
	# headless il motore gira più veloce che può e un frame dura microsecondi —
	# duecento frame non sarebbero mai tre secondi.
	var ticks := int(float(M.RESPAWN_SEC[M.Mode.SOLO]) * 60.0) + 10
	for _i in ticks:
		world._match_tick(1.0 / 60.0)

	_check("torna in vita", bool(world.match_state["alive"][2]), "vivo dopo il conto")
	_check(
		"con la vita piena",
		is_equal_approx(float(world.bodies[2]["hp"]), float(Combat.HP_MAX)),
		"%d vita" % int(world.bodies[2]["hp"])
	)
	_check(
		"e non addosso a chi lo ha ucciso",
		(
			world.bodies[2]["node"].global_position.distance_to(
				world.bodies[1]["node"].global_position
			)
			> 10.0
		),
		(
			"%.1f m di distanza"
			% world.bodies[2]["node"].global_position.distance_to(
				world.bodies[1]["node"].global_position
			)
		)
	)
	_check("e lo dice a tutti", _has_event("respawn"), "evento respawn ricevuto")

	print("")
	if failures == 0:
		print("Tutto verde.\n")
		quit(0)
	else:
		printerr("%d rosso/i.\n" % failures)
		quit(1)
	return true


## Mette il bersaglio davanti al server a tiro certo e lo finisce.
func _uccidi() -> void:
	var me: CharacterBody3D = world.bodies[1]["node"]
	var him: CharacterBody3D = world.bodies[2]["node"]
	him.global_position = me.global_position + Vector3(0, 0, -5)
	world.bodies[2]["hp"] = 1.0
	world.cooldowns.erase(1)
	# La risoluzione passa dallo storico del riavvolgimento, non dalle posizioni
	# attuali: senza un campione registrato non c'è niente da colpire.
	world.lag.record(world.bodies, world._clock)
	world._on_cast_requested(1, 0, me.global_position, Vector3(0, 0, -1))
	world._match_tick(1.0 / 60.0)


func _has_event(kind: String) -> bool:
	for e in events:
		if e["kind"] == kind:
			return true
	return false
