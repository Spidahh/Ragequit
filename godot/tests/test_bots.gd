## Verifica i bot: le tre difficoltà e il riempimento della lobby.
##
## È il sistema più sottovalutato del progetto, ed è quello che decide se il
## gioco esiste alle tre di notte. Un bot che non può battere nessuno non è un
## avversario — nella prima versione l'errore di mira era così largo che era
## MATEMATICAMENTE impossibile che colpisse un corpo, e nessuno se ne era
## accorto guardando.
##
##   godot --headless --script res://tests/test_bots.gd
extends SceneTree

const Bots = preload("res://src/bots.gd")
const Content = preload("res://src/content.gd")
const M = preload("res://src/match_rules.gd")

## Il raggio della capsula che si deve colpire. È il numero contro cui si giudica
## se un errore di mira è un errore o un'impossibilità.
const CAPSULE_RADIUS := 0.4

var failures := 0


func _check(what: String, ok: bool, detail: String) -> void:
	if ok:
		print("  ✓ %s — %s" % [what, detail])
	else:
		failures += 1
		printerr("  ✗ %s — %s" % [what, detail])


func _init() -> void:
	print("\n=== I BOT ===\n")

	_le_difficolta_sono_una_scala()
	_si_possono_battere_e_possono_battere()
	_la_lobby_non_e_mai_vuota()
	_chi_entra_prende_il_posto_del_peggiore()
	_hanno_un_nome_e_una_classe()

	print("")
	if failures == 0:
		print("Tutto verde.\n")
		quit(0)
	else:
		printerr("%d rosso/i.\n" % failures)
		quit(1)


func _le_difficolta_sono_una_scala() -> void:
	print("Le tre difficoltà sono una scala, non tre valori a caso")
	var r := Bots.stats_for(Bots.Level.RECRUIT)
	var v := Bots.stats_for(Bots.Level.VETERAN)
	var e := Bots.stats_for(Bots.Level.ELITE)

	# Ogni parametro deve andare NELLA STESSA DIREZIONE salendo di difficoltà.
	# Un profilo che mira meglio ma spara più piano non è "più difficile": è un
	# altro avversario, e il giocatore non capisce cosa ha scelto.
	_check(
		"si mira meglio salendo",
		float(r["aim_error_m"]) > float(v["aim_error_m"]) and float(v["aim_error_m"]) > float(e["aim_error_m"]),
		"%.1f → %.1f → %.1f m di errore" % [r["aim_error_m"], v["aim_error_m"], e["aim_error_m"]]
	)
	_check(
		"si gira più in fretta",
		float(r["turn_speed_deg"]) < float(v["turn_speed_deg"]) and float(v["turn_speed_deg"]) < float(e["turn_speed_deg"]),
		"%.0f → %.0f → %.0f °/s" % [r["turn_speed_deg"], v["turn_speed_deg"], e["turn_speed_deg"]]
	)
	_check(
		"si spara più spesso",
		float(r["fire_period"]) > float(v["fire_period"]) and float(v["fire_period"]) > float(e["fire_period"]),
		"%.2f → %.2f → %.2f s" % [r["fire_period"], v["fire_period"], e["fire_period"]]
	)


func _si_possono_battere_e_possono_battere() -> void:
	print("\nOgni difficoltà è un avversario, non un bersaglio né un aimbot")
	for level in [Bots.Level.RECRUIT, Bots.Level.VETERAN, Bots.Level.ELITE]:
		var s := Bots.stats_for(level)
		var err := float(s["aim_error_m"])
		# L'errore è dichiarato a 20 m su una capsula da 40 cm di raggio. Se è
		# più largo di qualche raggio, il bot non può colpire nemmeno per caso:
		# è un bersaglio con un'arma.
		_check(
			"  %s può colpire" % Bots.name_for(level),
			err < CAPSULE_RADIUS * 8.0,
			"errore %.1f m contro una capsula da %.1f m" % [err, CAPSULE_RADIUS]
		)
		# E deve poter mancare, o non è un avversario: è una condanna.
		_check(
			"  %s può mancare" % Bots.name_for(level),
			err > 0.0 and float(s["hit_rate"]) < 1.0,
			"%.0f%% a segno dichiarato" % (float(s["hit_rate"]) * 100.0)
		)

	# E il tempo che ci mette a ucciderti deve restare umano: un Élite che
	# svuota 200 di vita in due secondi non è difficile, è finito.
	var elite := Bots.stats_for(Bots.Level.ELITE)
	var dps: float = float(elite["damage"]) / float(elite["fire_period"]) * float(elite["hit_rate"])
	var ttk: float = 200.0 / dps
	_check(
		"anche l'Élite ti lascia il tempo di reagire",
		ttk > 8.0,
		"ti uccide in %.1f s in vista libera" % ttk
	)


func _la_lobby_non_e_mai_vuota() -> void:
	print("\nNon si vede mai una coda")
	_check("da solo si gioca lo stesso", Bots.fill_count(1, 8) == 7, "1 umano + 7 bot")
	_check("in due si riempie fino al bersaglio", Bots.fill_count(2, 8) == 6, "2 umani + 6 bot")
	_check("a lobby piena non si aggiunge nessuno", Bots.fill_count(8, 8) == 0, "0 bot")
	_check("e nemmeno oltre", Bots.fill_count(9, 8) == 0, "0 bot")

	# Il minimo assoluto è due giocatori: una modalità che ne pretende otto umani
	# non esiste mai, e TOURNAMENT ne pretende otto.
	_check(
		"anche una modalità piccola parte a due",
		Bots.fill_count(0, 1) == 2 and Bots.fill_count(1, 1) == 1,
		"da solo entra comunque un avversario"
	)


func _chi_entra_prende_il_posto_del_peggiore() -> void:
	print("\nChi entra a partita in corso prende il posto del bot che sta peggio")
	var scores := {101: 7, 102: 2, 103: 11}
	_check(
		"si sceglie il peggiore",
		Bots.worst_bot(scores, [101, 102, 103]) == 102,
		"esce il bot a 2 punti, non quello a 11"
	)
	_check("e se non ci sono bot, nessuno", Bots.worst_bot(scores, []) == -1, "-1")

	# E il punteggio si eredita davvero: chi entra non si trova a zero contro
	# gente a quindici, e non si trova nemmeno in testa senza aver giocato.
	var state := M.start(M.Mode.SOLO, [1, 101, 102])
	state["score"][102] = 2
	state["score"][101] = 7
	var worst := Bots.worst_bot(state["score"], [101, 102])
	M.replace(state, worst, 55)
	_check(
		"e l'umano eredita il punteggio del peggiore",
		int(state["score"].get(55, -1)) == 2,
		"entra con %d punti" % int(state["score"].get(55, -1))
	)


func _hanno_un_nome_e_una_classe() -> void:
	print("\nHanno un nome e una classe, non un numero")
	var names := {}
	var classes := {}
	for i in 8:
		var id := Bots.identity(i)
		names[String(id["name"])] = true
		classes[String(id["class_id"])] = true
		# Deterministico: due client devono vedere lo stesso avversario, o il
		# kill feed racconta due partite diverse.
		_check(
			"  bot %d è sempre lo stesso" % i,
			String(Bots.identity(i)["name"]) == String(id["name"]),
			"%s / %s" % [id["name"], id["class_id"]]
		)
	_check("otto nomi diversi", names.size() == 8, str(names.keys()))
	_check("e tutte e quattro le classi in campo", classes.size() == 4, str(classes.keys()))

	# E la classe deve esistere davvero, o il bot entra senza corpo.
	var mancanti := []
	for i in 8:
		if Content.game_class(String(Bots.identity(i)["class_id"])).is_empty():
			mancanti.append(i)
	_check("e sono classi vere", mancanti.is_empty(), "inesistenti: %s" % str(mancanti))
