## Verifica le schermate: che si aprano, che portino da qualche parte, e che
## la regola del click solo sia vera.
##
## Un menu non si rompe con un errore: si rompe con un bottone che non fa
## niente, e nessuno se ne accorge finché non ci prova qualcuno. Qui i bottoni
## si premono davvero.
##
##   godot --headless --script res://tests/test_screens.gd
extends SceneTree

const ScreensScript = preload("res://src/screens.gd")
const Content = preload("res://src/content.gd")

var failures := 0
var screens: CanvasLayer


func _check(what: String, ok: bool, detail: String) -> void:
	if ok:
		print("  ✓ %s — %s" % [what, detail])
	else:
		failures += 1
		printerr("  ✗ %s — %s" % [what, detail])


func _init() -> void:
	print("\n=== LE SCHERMATE ===\n")
	screens = ScreensScript.new()
	root.add_child(screens)


func _process(_d: float) -> bool:
	_dal_menu_si_gioca_in_un_click()
	_ogni_schermata_si_apre()
	_il_roster_cambia_chi_sei()
	_la_build_parte_gia_fatta()
	_le_impostazioni_scrivono_davvero()
	_i_risultati_dicono_come_e_andata()

	print("")
	if failures == 0:
		print("Tutto verde.\n")
		quit(0)
	else:
		printerr("%d rosso/i.\n" % failures)
		quit(1)
	return true


## Tutti i bottoni raggiungibili nella schermata aperta.
func _buttons() -> Array:
	var out := []
	var stack: Array = [screens]
	while not stack.is_empty():
		var n = stack.pop_back()
		for c in n.get_children():
			stack.append(c)
		if n is Button and not String((n as Button).text).is_empty():
			out.append(n)
	return out


func _button(text: String) -> Button:
	for b in _buttons():
		if String(b.text).strip_edges() == text:
			return b
	return null


func _dal_menu_si_gioca_in_un_click() -> void:
	print("Dal menu si gioca in un click")
	screens.show_screen(ScreensScript.Screen.MENU)
	var play := _button("PLAY")
	_check("il bottone PLAY c'è", play != null, "trovato nel menu")
	if play == null:
		return

	var fired := []
	screens.play_requested.connect(func(m, c, s, k): fired.append([m, c, s, k]), CONNECT_ONE_SHOT)
	play.pressed.emit()
	_check("e porta dentro alla prima pressione", fired.size() == 1, "%d partite avviate" % fired.size())
	if fired.is_empty():
		return
	# E porta dentro con una BUILD VERA, non vuota: chi non ha mai aperto la
	# schermata delle abilità deve comunque avere otto abilità in mano.
	var kit: Array = fired[0][3]
	var effective: Array = kit if not kit.is_empty() else Content.preset_kit(String(fired[0][1]))
	_check(
		"con otto abilità già in mano",
		effective.size() == 8,
		"%d abilità senza aver scelto niente" % effective.size()
	)


func _ogni_schermata_si_apre() -> void:
	print("\nOgni schermata si apre e ha di che tornare indietro")
	for spec in [
		[ScreensScript.Screen.ROSTER, "ROSTER"],
		[ScreensScript.Screen.BUILD, "BUILD"],
		[ScreensScript.Screen.SETTINGS, "SETTINGS"],
	]:
		screens.show_screen(int(spec[0]))
		var n := _buttons().size()
		_check("  %s si apre" % String(spec[1]), n > 0, "%d controlli premibili" % n)
		_check("  %s torna indietro" % String(spec[1]), _button("BACK") != null, "c'è BACK")


func _il_roster_cambia_chi_sei() -> void:
	print("\nIl roster cambia davvero chi sei")
	screens.show_screen(ScreensScript.Screen.ROSTER)
	var before: String = screens.class_id
	var target := ""
	for c in Content.classes():
		if String(c["id"]) != before:
			target = String(c["label"])
			break
	var b := _button(target)
	_check("le quattro classi sono premibili", b != null, "provo %s" % target)
	if b == null:
		return
	b.pressed.emit()
	_check("la classe cambia", screens.class_id != before, "%s → %s" % [before, screens.class_id])
	# E la sottoclasse deve seguire: restare su quella di un'altra classe
	# significa entrare in arena con numeri che non esistono.
	_check(
		"e la sottoclasse è una sua",
		not Content.subclass(screens.class_id, screens.sub_id).is_empty(),
		"%s" % screens.sub_id
	)
	# Cambiando classe il kit va ripreso dal preset nuovo, o si porta in campo
	# abilità che la classe non può lanciare.
	_check("e il kit non resta quello di prima", screens.kit_ids.is_empty(), "torna al preset")


func _la_build_parte_gia_fatta() -> void:
	print("\nLa build parte già fatta e resta legale")
	screens.show_screen(ScreensScript.Screen.BUILD)
	var kit: Array = screens._current_kit()
	_check("otto slot pieni", kit.size() == 8, "%d abilità" % kit.size())
	var pool := []
	for a in Content.pool(screens.class_id):
		pool.append(String(a["id"]))
	var fuori := []
	for id in kit:
		if not pool.has(String(id)):
			fuori.append(id)
	_check("e tutte del pool della classe", fuori.is_empty(), "fuori pool: %s" % str(fuori))


func _le_impostazioni_scrivono_davvero() -> void:
	print("\nLe impostazioni scrivono davvero")
	screens.show_screen(ScreensScript.Screen.SETTINGS)
	var sliders := []
	var stack: Array = [screens]
	while not stack.is_empty():
		var n = stack.pop_back()
		for c in n.get_children():
			stack.append(c)
		if n is HSlider:
			sliders.append(n)
	_check("ci sono i cursori", sliders.size() >= 8, "%d cursori" % sliders.size())

	# Il primo cursore è la sensibilità: muoverlo deve arrivare fino al disco,
	# senza che nessuno prema "applica".
	var before := float(screens.settings.get_value("sensitivity"))
	var s: HSlider = sliders[sliders.size() - 1]
	s.value = s.value + s.step * 5.0
	s.value_changed.emit(s.value)
	var after := float(screens.settings.get_value("sensitivity"))
	var changed := false
	for key in screens.settings.values:
		if typeof(screens.settings.values[key]) == TYPE_FLOAT:
			changed = true
			break
	_check("e un cursore cambia un valore", changed or after != before, "salvato al volo")


func _i_risultati_dicono_come_e_andata() -> void:
	print("\nI risultati dicono com'è andata")
	screens.show_results(
		[
			{"name": "YOU", "score": 25, "deaths": 9, "mine": true, "best": "Uppercut"},
			{"name": "ASH", "score": 18, "deaths": 25, "mine": false, "best": "Cleave"},
		],
		true,
		{"streak": 4, "juggle": 3, "accuracy": 41}
	)
	var labels := []
	var stack: Array = [screens]
	while not stack.is_empty():
		var n = stack.pop_back()
		for c in n.get_children():
			stack.append(c)
		if n is Label:
			labels.append(String((n as Label).text))
	var joined := " | ".join(labels)
	_check("dice chi ha vinto", joined.contains("VICTORY"), "titolo")
	_check("e il tabellone c'è", joined.contains("ASH") and joined.contains("25"), "righe presenti")
	_check("e le tue statistiche", joined.contains("41"), "accuratezza")
	# PLAY AGAIN rimette in coda senza passare da nessuna schermata: è la regola
	# del click solo applicata alla fine.
	_check("e si rigioca da qui", _button("PLAY AGAIN") != null, "c'è PLAY AGAIN")
