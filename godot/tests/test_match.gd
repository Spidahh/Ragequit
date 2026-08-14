## Verifica che una partita COMINCI e FINISCA — in tutte e tre le modalità.
##
## È il test che manca a tutti i prototipi: si può sparare, ma non si può
## vincere. Qui una partita intera viene simulata in millisecondi invece che
## giocata, perché le regole sono funzioni pure su un Dictionary.
##
##   godot --headless --script res://tests/test_match.gd
extends SceneTree

const M = preload("res://src/match_rules.gd")

var failures := 0


func _check(what: String, ok: bool, detail: String) -> void:
	if ok:
		print("  ✓ %s — %s" % [what, detail])
	else:
		failures += 1
		printerr("  ✗ %s — %s" % [what, detail])


## Fa scorrere il tempo a passi di fisica veri, raccogliendo gli eventi.
func _run(state: Dictionary, seconds: float) -> Array:
	var out := []
	var steps := int(seconds * 60.0)
	for _i in steps:
		out.append_array(M.tick(state, 1.0 / 60.0))
	return out


func _kinds(events: Array, kind: String) -> Array:
	var out := []
	for e in events:
		if e["kind"] == kind:
			out.append(e)
	return out


func _init() -> void:
	print("\n=== STRUTTURA DI PARTITA ===\n")

	_solo_si_vince()
	_solo_si_respawna()
	_solo_finisce_a_tempo()
	_squad_punteggio_comune()
	_squad_niente_fuoco_amico()
	_tournament_si_arriva_a_uno()
	_umano_eredita_il_bot()

	print("")
	if failures == 0:
		print("Tutto verde.\n")
		quit(0)
	else:
		printerr("%d rosso/i.\n" % failures)
		quit(1)


# --------------------------------------------------------------------- SOLO


func _solo_si_vince() -> void:
	print("SOLO — si vince a 25")
	var s := M.start(M.Mode.SOLO, [1, 2, 3, 4])
	var over := []
	for _i in 25:
		M.on_kill(s, 1, 2)
		over.append_array(_run(s, M.RESPAWN_SEC[M.Mode.SOLO] + 0.05))
	_check(
		"la partita finisce",
		s["phase"] == M.Phase.OVER,
		"fase = %s dopo 25 uccisioni" % M.Phase.keys()[s["phase"]]
	)
	_check("vince chi ha fatto i punti", s["winner"] == 1, "vincitore = %d" % s["winner"])
	_check(
		"l'evento di fine c'è",
		_kinds(over, "match_over").size() >= 1,
		"%d evento/i match_over" % _kinds(over, "match_over").size()
	)
	# Il punteggio non deve superare il limite: una partita che continua dopo
	# la vittoria è una partita che non è finita.
	_check("il punteggio si ferma al limite", int(s["score"][1]) == 25, "%d punti" % int(s["score"][1]))


func _solo_si_respawna() -> void:
	print("\nSOLO — si torna in vita in 3 secondi")
	var s := M.start(M.Mode.SOLO, [1, 2])
	M.on_kill(s, 1, 2)
	_check("morto subito", not bool(s["alive"][2]), "vivo = %s" % s["alive"][2])

	var early := _run(s, 2.5)
	_check(
		"non prima del tempo",
		_kinds(early, "respawn").is_empty() and not bool(s["alive"][2]),
		"a 2,5 s è ancora morto"
	)

	var late := _run(s, 0.7)
	_check("torna in vita", bool(s["alive"][2]), "a 3,2 s è vivo")
	_check("e lo dice", _kinds(late, "respawn").size() == 1, "1 evento respawn")


func _solo_finisce_a_tempo() -> void:
	print("\nSOLO — allo scadere vince chi è avanti")
	var s := M.start(M.Mode.SOLO, [1, 2, 3])
	M.on_kill(s, 3, 1)
	M.on_kill(s, 3, 2)
	M.on_kill(s, 1, 2)
	var ev := _run(s, M.TIME_LIMIT_SEC + 1.0)
	_check("finisce da sola", s["phase"] == M.Phase.OVER, "fase = %s" % M.Phase.keys()[s["phase"]])
	_check("vince chi è in testa", s["winner"] == 3, "vincitore = %d (2 punti contro 1)" % s["winner"])
	_check("una sola volta", _kinds(ev, "match_over").size() == 1, "1 evento match_over")


# --------------------------------------------------------------------- SQUAD


func _squad_punteggio_comune() -> void:
	print("\nSQUAD — il punteggio è della squadra, non tuo")
	var s := M.start(M.Mode.SQUAD, [1, 2, 3, 4])
	# start assegna a squadre alternate: 1 e 3 nella 0, 2 e 4 nella 1.
	_check(
		"le squadre sono alternate",
		int(s["team"][1]) == 0 and int(s["team"][3]) == 0 and int(s["team"][2]) == 1,
		"1,3 → squadra 0 · 2,4 → squadra 1"
	)
	M.on_kill(s, 1, 2)
	_run(s, M.RESPAWN_SEC[M.Mode.SQUAD] + 0.05)
	M.on_kill(s, 3, 4)
	_run(s, M.RESPAWN_SEC[M.Mode.SQUAD] + 0.05)
	_check(
		"due giocatori diversi, un punteggio solo",
		int(s["team_score"][0]) == 2,
		"squadra 0 = %d" % int(s["team_score"][0])
	)
	_check(
		"il respawn è più lento del solo",
		float(M.RESPAWN_SEC[M.Mode.SQUAD]) > float(M.RESPAWN_SEC[M.Mode.SOLO]),
		"%.0f s contro %.0f s" % [M.RESPAWN_SEC[M.Mode.SQUAD], M.RESPAWN_SEC[M.Mode.SOLO]]
	)


func _squad_niente_fuoco_amico() -> void:
	print("\nSQUAD — uccidere un compagno non fa punto")
	var s := M.start(M.Mode.SQUAD, [1, 2, 3, 4])
	M.on_kill(s, 1, 3)  # stessa squadra
	_check("la squadra non guadagna", int(s["team_score"][0]) == 0, "squadra 0 = %d" % int(s["team_score"][0]))
	_check("nemmeno chi ha colpito", int(s["score"][1]) == 0, "peer 1 = %d" % int(s["score"][1]))
	_check("ma la morte conta", int(s["deaths"][3]) == 1, "peer 3 morto %d volta" % int(s["deaths"][3]))

	# E nemmeno uccidersi da soli.
	var s2 := M.start(M.Mode.SOLO, [1, 2])
	M.on_kill(s2, 1, 1)
	_check("uccidersi da soli non fa punto", int(s2["score"][1]) == 0, "peer 1 = %d" % int(s2["score"][1]))


# ---------------------------------------------------------------- TOURNAMENT


func _tournament_si_arriva_a_uno() -> void:
	print("\nTOURNAMENT — otto entrano, uno resta")
	var s := M.start(M.Mode.TOURNAMENT, [1, 2, 3, 4, 5, 6, 7, 8])
	_check("quattro duelli al primo turno", s["bracket"].size() == 4, "%d duelli" % s["bracket"].size())
	_check(
		"solo i due in duello sono vivi",
		bool(s["alive"][1]) and bool(s["alive"][2]) and not bool(s["alive"][3]),
		"1 e 2 combattono, 3 guarda"
	)

	# Chi muore perde il round: dentro il round NON si respawna.
	M.on_kill(s, 1, 2)
	_check(
		"la morte chiude il round",
		s["phase"] == M.Phase.INTERMISSION,
		"fase = %s" % M.Phase.keys()[s["phase"]]
	)
	var d0: Dictionary = s["bracket"][0]
	_check("il round è di chi ha ucciso", int(d0["wins_a"]) == 1, "1 conduce %d-%d" % [d0["wins_a"], d0["wins_b"]])

	# Si prosegue finché non ne resta uno solo: il numero 1 vince sempre.
	var guard := 0
	while s["phase"] != M.Phase.OVER and guard < 400:
		guard += 1
		_run(s, M.INTERMISSION_SEC + 0.1)
		if s["phase"] == M.Phase.LIVE:
			var d: Dictionary = s["bracket"][s["duel"]]
			var winner: int = d["a"] if d["a"] < d["b"] or d["b"] == -1 else d["b"]
			var loser: int = d["b"] if winner == d["a"] else d["a"]
			if loser == -1:
				continue
			M.on_kill(s, winner, loser)
	_check("il torneo finisce", s["phase"] == M.Phase.OVER, "fase = %s in %d passi" % [M.Phase.keys()[s["phase"]], guard])
	_check("ne resta uno", s["winner"] == 1, "vincitore = %d" % s["winner"])

	# Un round che scade senza morti deve comunque decidere.
	var s2 := M.start(M.Mode.TOURNAMENT, [1, 2])
	M.report_hp(s2, 1, 40.0)
	M.report_hp(s2, 2, 130.0)
	_run(s2, M.ROUND_SEC + 0.1)
	var d2: Dictionary = s2["bracket"][0]
	_check(
		"a tempo scaduto vince chi ha più vita",
		int(d2["wins_b"]) == 1,
		"2 conduce %d-%d con 130 contro 40" % [d2["wins_a"], d2["wins_b"]]
	)


# ---------------------------------------------------------------- lobby viva


func _umano_eredita_il_bot() -> void:
	print("\nLOBBY — chi entra prende il posto del bot, punteggio compreso")
	var s := M.start(M.Mode.SOLO, [1, 900, 901])
	for _i in 7:
		M.on_kill(s, 900, 1)
		_run(s, M.RESPAWN_SEC[M.Mode.SOLO] + 0.05)
	M.replace(s, 900, 42)
	_check("il bot sparisce dalla lista", not s["peers"].has(900), "peers = %s" % str(s["peers"]))
	_check("l'umano c'è", s["peers"].has(42), "peers = %s" % str(s["peers"]))
	_check("e trova 7 punti fatti", int(s["score"].get(42, 0)) == 7, "punteggio = %d" % int(s["score"].get(42, 0)))
	_check("il vecchio id non lascia residui", not s["score"].has(900), "score = %s" % str(s["score"]))
	_check("chi entra non si trova a zero", M.leader(s) == 42, "in testa = %d" % M.leader(s))
