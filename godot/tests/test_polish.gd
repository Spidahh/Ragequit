## Verifica le cose che il progetto descrive e che si dimenticano sempre:
## la parata, il recap di morte, il tabellone, il mirino personalizzato.
##
## Sono tutte cose che non danno errori quando mancano — il gioco gira lo stesso,
## semplicemente non fa quello che c'è scritto che fa. È la categoria che a fine
## progetto resta ⬜ mentre tutti pensano sia ✅.
##
##   godot --headless --script res://tests/test_polish.gd
extends SceneTree

const Settings = preload("res://src/settings.gd")
const Drills = preload("res://src/range_drills.gd")

var failures := 0
var _arena: Node3D
var _player: CharacterBody3D
var _hud: Node
var _step := 0
var _wait := 0


func _check(what: String, ok: bool, detail: String) -> void:
	if ok:
		print("  ✓ %s — %s" % [what, detail])
	else:
		failures += 1
		printerr("  ✗ %s — %s" % [what, detail])


func _init() -> void:
	print("\n=== LA RIFINITURA ===\n")
	_arena = (load("res://scenes/arena.tscn") as PackedScene).instantiate()
	root.add_child(_arena)
	current_scene = _arena
	_player = _arena.get_node_or_null("Player")
	_hud = _arena.get_node_or_null("HUD")


func _process(_d: float) -> bool:
	if _wait > 0:
		_wait -= 1
		return false
	_step += 1
	match _step:
		1:
			_wait = 6
		2:
			_la_parata_blocca_e_costa()
			_il_recap_dice_come_sei_morto()
			_il_tabellone_si_apre_e_si_chiude()
			_il_mirino_e_tuo()
			_il_break_e_una_decisione()
			_le_impostazioni_arrivano_alla_camera()
			_il_poligono_insegna_tre_cose()
			print("")
			if failures == 0:
				print("Tutto verde.\n")
				quit(0)
			else:
				printerr("%d rosso/i.\n" % failures)
				quit(1)
			return true
	return false


func _la_parata_blocca_e_costa() -> void:
	print("La parata")
	if _player == null:
		_check("il giocatore c'è", false, "assente")
		return
	_player.stamina = float(_player.stats.get("max_stamina", 150.0))
	var stamina_before: float = _player.stamina

	# Un tap apre la finestra: dentro, non passa niente.
	_player._try_parry()
	_check("il tap apre una finestra", _player.parrying(), "sta parando")
	_check(
		"e costa stamina",
		_player.stamina < stamina_before,
		"%.0f → %.0f" % [stamina_before, _player.stamina]
	)

	var hp_before: float = _player.hp
	_player.take_damage(40.0)
	_check("dentro la finestra non passa niente", is_equal_approx(_player.hp, hp_before), "vita intatta")

	# Fuori dalla finestra passa tutto — e la parata non si può ripetere subito,
	# o non è una lettura: è un tasto tenuto premuto.
	_player._clock += _player.PARRY_WINDOW + 0.1
	_check("fuori dalla finestra non pari più", not _player.parrying(), "finestra chiusa")
	_player.take_damage(40.0)
	_check("e il colpo arriva", _player.hp < hp_before, "vita %.0f" % _player.hp)

	var stamina_now: float = _player.stamina
	_player._try_parry()
	_check(
		"e non si può riparare subito",
		is_equal_approx(_player.stamina, stamina_now),
		"la ricarica di %.0f s regge" % _player.PARRY_COOLDOWN
	)

	# Tenuta: blocca una parte, non tutto. Una difesa senza buchi è una difesa
	# che si tiene premuta per sempre.
	_player._clock += _player.PARRY_COOLDOWN + 0.1
	_player._parry_holding = true
	_player.stamina = 100.0
	var hp2: float = _player.hp
	_player.take_damage(50.0)
	var passed: float = hp2 - _player.hp
	_check(
		"tenuta blocca una parte e non tutto",
		passed > 0.0 and passed < 50.0,
		"di 50 ne passano %.0f" % passed
	)
	_player._parry_holding = false


func _il_recap_dice_come_sei_morto() -> void:
	print("\nIl recap di morte")
	if _hud == null or not _hud.has_method("show_death_recap"):
		_check("l'HUD sa mostrarlo", false, "metodo assente")
		return
	_hud.show_death_recap(
		"ASH", [{"name": "Bastion", "damage": 45}, {"name": "Hammerfall", "damage": 30}], 120.0, 3.0
	)
	var texts := _labels(_hud)
	_check("dice chi ti ha ucciso", texts.contains("ASH"), "nome del colpevole")
	_check("con quali abilità e per quanto", texts.contains("Bastion 45"), "il dettaglio")
	_check("e quanto avevi fatto tu", texts.contains("120"), "danno inflitto")
	# E c'è il conto alla rovescia: un'attesa senza numero è un'attesa che
	# sembra un blocco.
	_check("e quanto manca", texts.contains("3"), "conto alla rovescia")
	_hud.hide_death_recap()
	_check("e sparisce", not _labels(_hud).contains("ASH"), "via a fine attesa")


func _il_tabellone_si_apre_e_si_chiude() -> void:
	print("\nIl tabellone")
	if _hud == null or not _hud.has_method("show_scoreboard"):
		_check("l'HUD sa mostrarlo", false, "metodo assente")
		return
	_hud.show_scoreboard([
		{"name": "YOU", "score": 12, "deaths": 4, "mine": true, "ping": 34},
		{"name": "ASH", "score": 9, "deaths": 7, "ping": 51, "hit_you_with": "shot (63)"},
	])
	var texts := _labels(_hud)
	_check("c'è chi gioca e quanto ha fatto", texts.contains("ASH") and texts.contains("9"), "righe")
	_check("e il ping", texts.contains("51 ms"), "ping per riga")
	# La riga che insegna: con cosa ti ha colpito. È l'unico posto in partita
	# dove il gioco dice qualcosa in più, e lo dice solo se lo chiedi.
	_check("e con cosa ti ha colpito", texts.contains("shot (63)"), "il kit degli altri")
	_hud.hide_scoreboard()
	_check("e si richiude", not _labels(_hud).contains("51 ms"), "via al rilascio")


func _il_mirino_e_tuo() -> void:
	print("\nIl mirino")
	if _hud == null:
		return
	var st := Settings.new()
	st.set_value("crosshair_dot", false)
	_hud._build_crosshair()
	var without: int = _hud._crosshair.get_child_count()

	st.set_value("crosshair_dot", true)
	_hud._build_crosshair()
	var with_dot: int = _hud._crosshair.get_child_count()
	_check(
		"il punto centrale si accende dalle impostazioni",
		with_dot == without + 1,
		"%d → %d elementi" % [without, with_dot]
	)

	st.set_value("crosshair_thickness", 5.0)
	_hud._build_crosshair()
	var thick: float = (_hud._crosshair.get_child(0) as ColorRect).size.y
	_check("e lo spessore arriva davvero", is_equal_approx(thick, 5.0), "%.0f px" % thick)
	st.set_value("crosshair_thickness", 2.0)
	st.set_value("crosshair_dot", false)


func _il_break_e_una_decisione() -> void:
	print("\nIl break")
	if _player == null:
		return
	_player._break_ready_at = 0.0
	# A terra e senza niente addosso non c'è niente da rompere: e chiamarlo a
	# vuoto NON deve consumare la ricarica, o diventa un tasto da non premere
	# mai per paura di sprecarlo.
	_player.velocity.y = 0.0
	var used_on_nothing: bool = _player.break_free()
	_check("a vuoto non fa niente", not used_on_nothing, "non si spreca")
	_check("e resta pronto", _player.break_ready(), "ricarica intatta")

	# Radicato: il break libera.
	_player.status.apply("root", 3.0)
	_check("radicato non ti muovi", not _player.status.can_move(), "bloccato")
	var used: bool = _player.break_free()
	_check("il break libera", used and _player.status.can_move(), "libero")

	# E ha una ricarica lunga: usarlo sul primo sbalzo significa non averlo sul
	# secondo. È questo che lo rende una decisione.
	_player.status.apply("root", 3.0)
	_check("e subito dopo non c'è", not _player.break_free(), "%.0f s di attesa" % _player.BREAK_COOLDOWN)
	_check(
		"e l'attesa è lunga davvero",
		_player.BREAK_COOLDOWN >= 10.0,
		"%.0f s: non lo si preme a caso" % _player.BREAK_COOLDOWN
	)
	_player.status.cleanse()
	_player._break_ready_at = 0.0


func _le_impostazioni_arrivano_alla_camera() -> void:
	print("\nLe impostazioni arrivano dove servono")
	if _player == null:
		return
	var st := Settings.new()
	st.set_value("fov", 118.0)
	st.set_value("sensitivity", 3.0)
	_player.apply_settings(st)
	var cam: Camera3D = _player.get_node("Camera3D")
	_check("il campo visivo arriva alla camera", is_equal_approx(cam.fov, 118.0), "%.0f gradi" % cam.fov)
	_check(
		"e la sensibilità al mouse",
		is_equal_approx(_player._sensitivity, _player.SENSITIVITY_BASE * 3.0),
		"%.4f rad per conteggio" % _player._sensitivity
	)
	# E il campo visivo dell'arma resta SUO: chi gioca a FOV alto vuole l'arma
	# più piccola, non più distorta.
	st.set_value("viewmodel_fov", 55.0)
	_player.apply_settings(st)
	_check(
		"e l'arma ha il suo, separato",
		_player._vm and _player._vm.camera and is_equal_approx(_player._vm.camera.fov, 55.0),
		"%.0f gradi" % (_player._vm.camera.fov if _player._vm and _player._vm.camera else 0.0)
	)
	st.set_value("fov", 100.0)
	st.set_value("sensitivity", 1.85)
	st.set_value("viewmodel_fov", 70.0)


func _il_poligono_insegna_tre_cose() -> void:
	print("\nIl poligono")
	var d := Drills.new()
	_check("tre prove, e tre soltanto", d.done.size() == 3, str(d.done.size()))

	# Muoversi: cinque salti DI FILA che conservano la velocità. Uno lento in
	# mezzo azzera la serie — il punto è il ritmo, e il ritmo non si accumula
	# a pezzi.
	for i in Drills.HOPS_NEEDED - 1:
		d.watch_movement(Drills.HOP_SPEED + 0.5, true)
		d.watch_movement(Drills.HOP_SPEED + 0.5, false)
	_check("quattro salti non bastano", not bool(d.done[Drills.Drill.MOVE]), d.progress(Drills.Drill.MOVE))
	d.watch_movement(2.0, true)
	d.watch_movement(2.0, false)
	_check("e uno lento azzera la serie", d.hops == 0, "%d salti" % d.hops)
	for i in Drills.HOPS_NEEDED:
		d.watch_movement(Drills.HOP_SPEED + 0.5, true)
		d.watch_movement(Drills.HOP_SPEED + 0.5, false)
	_check("cinque di fila la chiudono", bool(d.done[Drills.Drill.MOVE]), "fatta")

	# Anticipare: un colpo ravvicinato non insegna niente.
	d.watch_hit(4.0, false, false)
	_check("un colpo da vicino non conta", not bool(d.done[Drills.Drill.LEAD]), "sotto i 12 m")
	d.watch_hit(Drills.LEAD_DISTANCE + 1.0, false, false)
	_check("uno da lontano sì", bool(d.done[Drills.Drill.LEAD]), "fatta")

	# Convertire: colpire in aria QUALCUNO CHE HAI SBALZATO TU. Prendere uno che
	# stava già saltando non è il momento firma.
	d.watch_hit(2.0, true, false)
	_check("prendere chi saltava non conta", not bool(d.done[Drills.Drill.LAUNCH]), "non l'hai sbalzato tu")
	d.watch_hit(2.0, true, true)
	_check("sbalzare e convertire sì", bool(d.done[Drills.Drill.LAUNCH]), "fatta")
	_check("e allora il poligono smette di chiedere", d.all_done(), "pannello via")


## Tutto il testo visibile in un sottoalbero, in una stringa sola.
func _labels(from: Node) -> String:
	var out := []
	var stack: Array = [from]
	while not stack.is_empty():
		var n = stack.pop_back()
		for c in n.get_children():
			stack.append(c)
		if n is Label:
			out.append(String((n as Label).text))
	return " | ".join(out)
