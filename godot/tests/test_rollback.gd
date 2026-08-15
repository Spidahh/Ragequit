## Verifica che netfox sia DAVVERO agganciato, e che il rollback risimuli.
##
## È il pezzo che il netcode scritto a mano non aveva: c'era predizione e
## riconciliazione, non la ri-esecuzione dei tick dopo una correzione. Senza
## quella, una correzione si vede come uno scatto invece che come una
## divergenza riassorbita.
##
## E c'è una condizione che rende possibile tutto il resto, e va protetta:
## **`Movement.step` deve restare una funzione pura.** Il rollback risimula lo
## stesso tick decine di volte al secondo; una funzione che tiene stato dentro
## di sé darebbe un risultato diverso a ogni ripetizione, e la correzione non
## convergerebbe mai.
##
##   godot --headless --script res://tests/test_rollback.gd
extends SceneTree

const Movement = preload("res://src/movement.gd")
const NetPlayer = preload("res://src/net_player.gd")

var failures := 0
var _f := 0


func _check(what: String, ok: bool, detail: String) -> void:
	if ok:
		print("  ✓ %s — %s" % [what, detail])
	else:
		failures += 1
		printerr("  ✗ %s — %s" % [what, detail])


func _init() -> void:
	print("\n=== IL ROLLBACK ===\n")


func _process(_d: float) -> bool:
	_f += 1
	# netfox si registra come autoload: prima del secondo frame non c'è.
	if _f < 3:
		return false

	_netfox_e_agganciato()
	_il_passo_e_puro()
	_lo_stesso_tick_da_lo_stesso_risultato()
	_il_corpo_dichiara_stato_e_input()

	print("")
	if failures == 0:
		print("Tutto verde.\n")
		quit(0)
	else:
		printerr("%d rosso/i.\n" % failures)
		quit(1)
	return true


func _netfox_e_agganciato() -> void:
	print("netfox è caricato")
	for n in ["NetworkTime", "NetworkRollback", "NetworkEvents"]:
		_check("  %s" % n, root.get_node_or_null(n) != null, "autoload attivo")

	var nt = root.get_node_or_null("NetworkTime")
	if nt == null:
		return
	# Il tick di rete DEVE coincidere con il passo di fisica del gioco.
	# Con due frequenze diverse il server e il client integrano un numero di
	# passi diverso sullo stesso intervallo: divergono sempre, e la
	# riconciliazione correggerebbe in continuazione un errore che non è di rete.
	_check(
		"e batte alla stessa frequenza della fisica",
		int(nt.tickrate) == int(ProjectSettings.get_setting("physics/common/physics_ticks_per_second")),
		"%d Hz di rete, %d Hz di fisica"
			% [int(nt.tickrate), int(ProjectSettings.get_setting("physics/common/physics_ticks_per_second"))]
	)

	_check(
		"e il sincronizzatore di rollback esiste",
		ResourceLoader.exists("res://addons/netfox/rollback/rollback-synchronizer.gd"),
		"RollbackSynchronizer"
	)


func _il_passo_e_puro() -> void:
	print("\nIl passo di movimento è puro — è la condizione di tutto il resto")
	var a := Movement.make_state(Vector3(0, 0.9, 0))
	var b := Movement.make_state(Vector3(0, 0.9, 0))
	var wish := Vector2(0, 1)
	for i in 30:
		a = Movement.step(a, wish, 0.0, false, 1.0 / 60.0)
		b = Movement.step(b, wish, 0.0, false, 1.0 / 60.0)
	_check(
		"due simulazioni identiche danno lo stesso risultato",
		a["vel"].is_equal_approx(b["vel"]) and a["pos"].is_equal_approx(b["pos"]),
		"velocità %.4f e %.4f" % [a["vel"].length(), b["vel"].length()]
	)

	# E non deve toccare l'ingresso: il rollback riparte da uno stato salvato, e
	# una funzione che modifica il dizionario che riceve avrebbe già corrotto la
	# storia prima di poterla riusare.
	var start := Movement.make_state(Vector3(0, 0.9, 0))
	var before: Vector3 = start["vel"]
	Movement.step(start, wish, 0.0, false, 1.0 / 60.0)
	_check(
		"e non modifica lo stato che riceve",
		start["vel"].is_equal_approx(before),
		"lo storico resta riusabile"
	)


func _lo_stesso_tick_da_lo_stesso_risultato() -> void:
	print("\nRisimulare converge invece di divergere")
	# Questa è la cosa che il rollback fa venti volte al secondo: riparte da uno
	# stato vecchio, riesegue gli stessi input, e deve arrivare ESATTAMENTE dove
	# era arrivato prima. Se non ci arriva, ogni correzione sposta il giocatore
	# un po' — e il gioco vibra.
	var inputs := []
	for i in 40:
		inputs.append(Vector2(sin(i * 0.3), cos(i * 0.21)).normalized())

	var straight := Movement.make_state(Vector3(0, 0.9, 0))
	var history := []
	for w in inputs:
		history.append(straight.duplicate(true))
		straight = Movement.step(straight, w, 0.0, false, 1.0 / 60.0)

	# Riavvolge a metà e rifà la seconda metà.
	var rewound: Dictionary = history[20].duplicate(true)
	for i in range(20, inputs.size()):
		rewound = Movement.step(rewound, inputs[i], 0.0, false, 1.0 / 60.0)

	_check(
		"riavvolgere a metà e rifare arriva allo stesso punto",
		rewound["pos"].distance_to(straight["pos"]) < 0.0001,
		"scarto %.6f m" % rewound["pos"].distance_to(straight["pos"])
	)


func _il_corpo_dichiara_stato_e_input() -> void:
	print("\nIl corpo dichiara cosa è stato e cosa è input")
	# La divisione non è formale: lo STATO scende dal server, l'INPUT sale dal
	# client. Mettere la posizione fra gli input vorrebbe dire lasciar decidere
	# al client dove si trova, che è la prima cosa che un cheat sfrutta.
	_check(
		"lo stato è quello che il server possiede",
		NetPlayer.STATE_PROPERTIES.has("position") and NetPlayer.STATE_PROPERTIES.has("velocity"),
		str(NetPlayer.STATE_PROPERTIES)
	)
	_check(
		"e l'input è solo quello che il giocatore preme",
		NetPlayer.INPUT_PROPERTIES.has("input_wish") and not NetPlayer.INPUT_PROPERTIES.has("position"),
		str(NetPlayer.INPUT_PROPERTIES)
	)
	# Nessuna proprietà può stare in tutti e due: sarebbe un valore che il
	# client dichiara e che il server gli riconferma, cioè un valore che il
	# client decide.
	var both := []
	for p in NetPlayer.STATE_PROPERTIES:
		if NetPlayer.INPUT_PROPERTIES.has(p):
			both.append(p)
	_check("e niente sta in tutti e due", both.is_empty(), str(both))

	var body := NetPlayer.new()
	_check(
		"e il corpo risimula davvero",
		body.has_method("_rollback_tick"),
		"_rollback_tick c'è"
	)
	body.free()
