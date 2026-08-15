## Verifica le comodità: tasti, mirino, daltonici, salvataggio.
##
## Sono la parte che nessuno prova, perché "sono solo impostazioni". E infatti
## sono la parte che si scopre rotta quando qualcuno rimappa un tasto e si
## ritrova due azioni sullo stesso, o quando chiude il gioco e ritrova tutto
## com'era prima.
##
##   godot --headless --script res://tests/test_settings.gd
extends SceneTree

const Settings = preload("res://src/settings.gd")

var failures := 0


func _check(what: String, ok: bool, detail: String) -> void:
	if ok:
		print("  ✓ %s — %s" % [what, detail])
	else:
		failures += 1
		printerr("  ✗ %s — %s" % [what, detail])


func _init() -> void:
	print("\n=== LE COMODITÀ ===\n")

	# Si parte puliti: un test che eredita il file di un altro giro non prova
	# niente di ripetibile.
	DirAccess.remove_absolute(ProjectSettings.globalize_path(Settings.PATH))

	_tutti_i_tasti_si_rimappano()
	_i_conflitti_si_vedono_prima()
	_la_mira_si_porta_da_un_altro_gioco()
	_i_daltonici_vedono_due_colori_diversi()
	_si_salva_subito_non_all_uscita()

	print("")
	if failures == 0:
		print("Tutto verde.\n")
		quit(0)
	else:
		printerr("%d rosso/i.\n" % failures)
		quit(1)


func _tutti_i_tasti_si_rimappano() -> void:
	print("Tutti i tasti, davvero tutti")
	var s := Settings.new()
	_check(
		"movimento e otto abilità sono tutti mappabili",
		s.bindings.size() >= 13,
		"%d azioni" % s.bindings.size()
	)

	s.apply_bindings()
	s.bind("ability_5", KEY_Z)
	_check("il nuovo tasto risponde", InputMap.action_has_event("ability_5", _key(KEY_Z)), "Q → Z")
	# E il vecchio NON deve rispondere più: aggiungere invece di sostituire lascia
	# due tasti che fanno la stessa cosa, e chi rimappa non capisce perché.
	_check("e il vecchio no", not InputMap.action_has_event("ability_5", _key(KEY_Q)), "Q è libero")

	s.use_left_handed()
	_check(
		"il preset per mancini sposta il movimento",
		int(s.bindings["move_forward"]) == KEY_I and int(s.bindings["move_left"]) == KEY_J,
		"IJKL"
	)
	_check(
		"e lascia stare le abilità",
		int(s.bindings["ability_1"]) == KEY_1,
		"1-4 e QERF restano dove sono"
	)

	s.reset_bindings()
	_check("e si torna indietro", int(s.bindings["move_forward"]) == KEY_W, "WASD")


func _i_conflitti_si_vedono_prima() -> void:
	print("\nUn tasto occupato si dice prima, non dopo")
	var s := Settings.new()
	s.reset_bindings()
	_check("il conflitto si trova", s.conflict("ability_1", KEY_SPACE) == "jump", "1 su Spazio → salto")
	_check("e un tasto libero non lo è", s.conflict("ability_1", KEY_Z) == "", "Z è libero")
	_check("e un'azione non è in conflitto con sé stessa", s.conflict("jump", KEY_SPACE) == "", "Spazio resta suo")


func _la_mira_si_porta_da_un_altro_gioco() -> void:
	print("\nLa mira si porta da dove si veniva")
	var s := Settings.new()
	s.set_value("sensitivity", 2.0)
	var common := s.sensitivity_in_common_scale()
	_check("c'è una conversione", common > 0.0, "%.2f nostro ≈ %.2f nella scala comune" % [2.0, common])
	# E deve essere monotona, o non è una conversione: è un numero decorativo.
	s.set_value("sensitivity", 4.0)
	_check("e raddoppiando raddoppia", is_equal_approx(s.sensitivity_in_common_scale(), common * 2.0), "proporzionale")


func _i_daltonici_vedono_due_colori_diversi() -> void:
	print("\nDaltonici: due colori che si distinguono davvero")
	var s := Settings.new()
	for profile in Settings.COLORBLIND.keys():
		s.set_value("colorblind", profile)
		var c := s.team_colors()
		var enemy: Color = c["enemy"]
		var ally: Color = c["ally"]
		# La distanza va misurata su qualcosa che il daltonismo NON schiaccia:
		# la luminosità. Due colori "diversi" con la stessa luminanza, per chi non
		# distingue le tinte, sono lo stesso colore.
		var lum_gap: float = absf(_luminance(enemy) - _luminance(ally))
		_check(
			"  %s: nemico e alleato si distinguono" % profile,
			lum_gap > 0.12,
			"scarto di luminosità %.2f" % lum_gap
		)


func _si_salva_subito_non_all_uscita() -> void:
	print("\nSi salva nel momento in cui si sceglie")
	var s := Settings.new()
	s.set_value("fov", 112.0)
	s.set_value("crosshair_dot", true)
	s.bind("jump", KEY_C)

	# Nessuno ha premuto "applica" e nessuno ha chiuso il gioco: un'altra
	# istanza che rilegge da disco deve già trovare tutto.
	var ripreso := Settings.new()
	_check("il valore c'è", is_equal_approx(float(ripreso.get_value("fov")), 112.0), "FOV 112")
	_check("anche gli interruttori", bool(ripreso.get_value("crosshair_dot")), "punto al centro acceso")
	_check("e i tasti", int(ripreso.bindings["jump"]) == KEY_C, "salto su C")

	# E i valori mai toccati restano quelli di serie, invece di sparire.
	_check(
		"il resto resta di serie",
		is_equal_approx(float(ripreso.get_value("ui_scale")), float(Settings.DEFAULTS["ui_scale"])),
		"scala interfaccia %.2f" % float(ripreso.get_value("ui_scale"))
	)


func _key(code: int) -> InputEventKey:
	var ev := InputEventKey.new()
	ev.physical_keycode = code
	return ev


func _luminance(c: Color) -> float:
	return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b
