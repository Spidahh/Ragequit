## Le schermate: menu, roster, build, risultati, poligono, impostazioni.
##
## LA REGOLA CHE LE GOVERNA TUTTE: **dal click su PLAY al primo colpo passa un
## click solo.** Se una schermata ne aggiunge uno, quella schermata e' sbagliata.
## Chi vuole solo giocare deve poterlo fare senza vedere mai la scelta della
## build — per questo ogni sottoclasse arriva con un kit gia' fatto e sensato.
##
## E l'altra: **il gioco non insegna mentre giochi.** Tutte le spiegazioni stanno
## qui dentro e nel poligono; in partita c'e' solo quello che dice cosa e'
## successo, mai cosa fare.
##
## Il menu non e' il gioco e non deve sembrarlo: niente caroselli, niente
## notizie, niente ricompense giornaliere. Un bottone grande e tre tessere.
extends CanvasLayer

const UI := preload("res://src/ui.gd")
const Content := preload("res://src/content.gd")
const Progression := preload("res://src/progression.gd")
const Settings := preload("res://src/settings.gd")
const MatchRules := preload("res://src/match_rules.gd")
const Bots := preload("res://src/bots.gd")
const Sfx := preload("res://src/sfx.gd")

enum Screen { MENU, ROSTER, BUILD, RESULTS, SETTINGS }

## Le tre modalita', con la riga che dice cosa sono in una frase.
const MODES := [
	{
		"id": MatchRules.Mode.SOLO,
		"name": "SOLO",
		"line": "Everyone for themselves. First to 25.",
		"players": "2-8",
	},
	{
		"id": MatchRules.Mode.SQUAD,
		"name": "SQUAD",
		"line": "Team score. First team to 50.",
		"players": "2v2 - 4v4",
	},
	{
		"id": MatchRules.Mode.TOURNAMENT,
		"name": "TOURNAMENT",
		"line": "Bracket. Best of three, no respawns.",
		"players": "8",
	},
]

var settings := Settings.new()
var progress := Progression.new()

## Chi sei adesso. Sopravvive fra una schermata e l'altra, e fra una partita e
## l'altra: rifare la scelta a ogni giro e' il modo piu' veloce di far smettere
## di rigiocare.
var class_id := "breaker"
var sub_id := "breaker_ram"
var kit_ids: Array = []
var mode: int = MatchRules.Mode.SOLO

var _screen: int = Screen.MENU
var _body: Control = null
var _editing_slot := -1
## Quale azione sta aspettando un tasto. Vuoto = nessuna cattura in corso.
var _capture_for := ""
var _key_buttons: Dictionary = {}
var _conflict_label: Label = null

signal play_requested(mode: int, class_id: String, sub_id: String, kit_ids: Array)
signal range_requested
signal quit_requested


func _ready() -> void:
	layer = 20
	settings.apply_bindings()
	_apply_audio_settings()
	apply_ui_scale()
	show_screen(Screen.MENU)


func show_screen(which: int) -> void:
	_screen = which
	for c in get_children():
		c.queue_free()
	var bg := UI.background()
	add_child(bg)
	_body = Control.new()
	_body.set_anchors_preset(Control.PRESET_FULL_RECT)
	_body.mouse_filter = Control.MOUSE_FILTER_PASS
	add_child(_body)
	# La musica c'è solo qui: in partita l'informazione direzionale è gameplay.
	Sfx.music("music_results" if which == Screen.RESULTS else "music_menu")
	match which:
		Screen.MENU:
			_build_menu()
		Screen.ROSTER:
			_build_roster()
		Screen.BUILD:
			_build_loadout()
		Screen.SETTINGS:
			_build_settings()
		Screen.RESULTS:
			pass


# =========================================================================
# MENU
# =========================================================================


func _build_menu() -> void:
	var col := _column(Vector2(0, 0), 520)

	# Il logo brucia: e' l'unica cosa animata del menu, e dice il nome del gioco
	# con la stessa luce delle torce dell'arena.
	var logo := UI.label("RAGEQUIT", 76, UI.ACCENT)
	logo.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	logo.custom_minimum_size = Vector2(520, 0)
	col.add_child(logo)
	var tag := UI.label("Pick a build. Enter the arena. Take them off the ground.", 14, UI.TEXT_DIM)
	tag.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	tag.custom_minimum_size = Vector2(520, 0)
	col.add_child(tag)
	col.add_child(UI.spacer(26))

	# UN bottone grande. Il resto e' piu' piccolo di proposito.
	var play := UI.button("PLAY", true, 520)
	play.pressed.connect(_on_play)
	col.add_child(play)
	col.add_child(UI.spacer(14))

	# Le tre tessere, e su ognuna QUANTA GENTE CI STA GIOCANDO. E' l'unico numero
	# che il menu mostra, ed e' quello che dice se vale la pena entrare.
	var tiles := HBoxContainer.new()
	tiles.add_theme_constant_override("separation", 10)
	col.add_child(tiles)
	for m in MODES:
		tiles.add_child(_mode_tile(m))

	col.add_child(UI.spacer(30))
	col.add_child(UI.rule(520))
	col.add_child(UI.spacer(14))

	# In fondo, piccolo: chi sei, il poligono, le impostazioni. Il menu non e' il
	# gioco, e questa riga non deve competere con PLAY.
	var foot := HBoxContainer.new()
	foot.add_theme_constant_override("separation", 10)
	col.add_child(foot)

	var st := Content.stats(class_id, sub_id)
	var who := UI.button("%s · %s" % [st.get("label", ""), st.get("sub_name", "")], false, 240)
	who.pressed.connect(func(): _go(Screen.ROSTER))
	foot.add_child(who)

	var range_btn := UI.button("RANGE", false, 120)
	range_btn.pressed.connect(func():
		Sfx.play("ui_confirm", Sfx.UI)
		range_requested.emit())
	foot.add_child(range_btn)

	var set_btn := UI.button("SETTINGS", false, 140)
	set_btn.pressed.connect(func(): _go(Screen.SETTINGS))
	foot.add_child(set_btn)

	col.add_child(UI.spacer(10))
	var lvl := UI.label(
		"LEVEL %d   ·   %d matches played" % [progress.level(), progress.matches_played],
		12,
		UI.TEXT_FAINT
	)
	lvl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lvl.custom_minimum_size = Vector2(520, 0)
	col.add_child(lvl)


func _mode_tile(m: Dictionary) -> Control:
	var chosen: bool = int(m["id"]) == mode
	var p := UI.panel(Vector2(166, 92), UI.PANEL_HI if chosen else UI.PANEL)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 3)
	p.add_child(v)

	var head := HBoxContainer.new()
	head.add_child(UI.label(String(m["name"]), 15, UI.ACCENT if chosen else UI.TEXT))
	v.add_child(head)
	v.add_child(UI.label(String(m["players"]), 11, UI.TEXT_FAINT))

	var line := UI.label(String(m["line"]), 11, UI.TEXT_DIM)
	line.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	line.custom_minimum_size = Vector2(138, 28)
	v.add_child(line)

	# Quanta gente c'e' ora. Finche' non c'e' un server vero il numero e' quello
	# dei bot che riempirebbero la lobby: e' una risposta onesta alla domanda
	# "trovo qualcuno?", che e' sempre si'.
	var live := Bots.fill_count(0, 8)
	v.add_child(UI.label("%d in game" % live, 11, UI.GOOD))

	var btn := Button.new()
	btn.flat = true
	btn.set_anchors_preset(Control.PRESET_FULL_RECT)
	btn.mouse_filter = Control.MOUSE_FILTER_STOP
	btn.pressed.connect(func():
		mode = int(m["id"])
		Sfx.play("ui_click", Sfx.UI)
		show_screen(Screen.MENU))
	p.add_child(btn)
	return p


func _on_play() -> void:
	Sfx.play("ui_confirm", Sfx.UI)
	play_requested.emit(mode, class_id, sub_id, kit_ids)


# =========================================================================
# ROSTER
# =========================================================================


func _build_roster() -> void:
	var col := _column(Vector2(0, 0), 900)
	col.add_child(_header("CHOOSE YOUR FIGHTER"))

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 16)
	col.add_child(row)

	# A sinistra le quattro classi, e sotto quella scelta le sue tre sottoclassi.
	var left := VBoxContainer.new()
	left.add_theme_constant_override("separation", 6)
	row.add_child(left)
	for c in Content.classes():
		var cid := String(c["id"])
		var b := UI.button(String(c["label"]), false, 210)
		if cid == class_id:
			b.add_theme_color_override("font_color", UI.CLASS_COLOR.get(cid, UI.ACCENT))
		b.pressed.connect(func():
			class_id = cid
			var subs: Array = c.get("subclasses", [])
			sub_id = String(subs[0]["id"]) if not subs.is_empty() else ""
			kit_ids = []
			Sfx.play("ui_click", Sfx.UI)
			show_screen(Screen.ROSTER))
		left.add_child(b)

		if cid != class_id:
			continue
		for s in c.get("subclasses", []):
			var sid := String(s["id"])
			var sb := UI.button("   " + String(s["name"]), false, 210)
			sb.alignment = HORIZONTAL_ALIGNMENT_LEFT
			if sid == sub_id:
				sb.add_theme_color_override("font_color", UI.ACCENT)
			sb.pressed.connect(func():
				sub_id = sid
				Sfx.play("ui_click", Sfx.UI)
				show_screen(Screen.ROSTER))
			left.add_child(sb)

	# A destra: chi e', cosa fa nel momento firma, e IL BARATTO sulla stessa riga.
	var right := VBoxContainer.new()
	right.add_theme_constant_override("separation", 8)
	right.custom_minimum_size = Vector2(620, 0)
	row.add_child(right)

	var cls := Content.game_class(class_id)
	var sub := Content.subclass(class_id, sub_id)
	var st := Content.stats(class_id, sub_id)

	right.add_child(UI.label(String(cls.get("label", "")), 40, UI.CLASS_COLOR.get(class_id, UI.TEXT)))
	right.add_child(UI.label(String(sub.get("name", "")), 20, UI.ACCENT))
	right.add_child(UI.spacer(4))

	var desc := UI.label(String(sub.get("description", "")), 15, UI.TEXT)
	desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	desc.custom_minimum_size = Vector2(600, 0)
	right.add_child(desc)

	# Il difetto, scritto. Una sottoclasse che ha solo vantaggi non e' una scelta.
	var malus := UI.label("⚠  " + String(sub.get("mini_malus", "")), 13, UI.DANGER)
	malus.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	malus.custom_minimum_size = Vector2(600, 0)
	right.add_child(malus)

	right.add_child(UI.spacer(10))
	right.add_child(UI.rule(600))
	right.add_child(UI.spacer(6))

	var stats_row := HBoxContainer.new()
	stats_row.add_theme_constant_override("separation", 26)
	right.add_child(stats_row)
	stats_row.add_child(_stat("HEALTH", "%d" % int(st["max_hp"])))
	stats_row.add_child(_stat("SPEED", "%+.0f%%" % ((float(st["move_speed_mult"]) - 1.0) * 100.0)))
	stats_row.add_child(_stat("COOLDOWNS", "%+.0f%%" % ((float(st["cooldown_mult"]) - 1.0) * 100.0)))
	stats_row.add_child(_stat("AIRTIME", "%+.0f%%" % ((float(st["knockup_mult"]) - 1.0) * 100.0)))
	stats_row.add_child(_stat("WEAPONS", ", ".join(st.get("weapons", []))))

	right.add_child(UI.spacer(18))
	var actions := HBoxContainer.new()
	actions.add_theme_constant_override("separation", 10)
	right.add_child(actions)

	var play := UI.button("PLAY", true, 300)
	play.pressed.connect(_on_play)
	actions.add_child(play)

	var build := UI.button("BUILD", false, 150)
	build.pressed.connect(func(): _go(Screen.BUILD))
	actions.add_child(build)

	var back := UI.button("BACK", false, 130)
	back.pressed.connect(func(): _go(Screen.MENU))
	actions.add_child(back)


func _stat(name: String, value: String) -> Control:
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 1)
	v.add_child(UI.eyebrow(name))
	v.add_child(UI.label(value, 17, UI.TEXT))
	return v


# =========================================================================
# BUILD
# =========================================================================


func _current_kit() -> Array:
	if kit_ids.is_empty():
		var out := []
		for a in Content.preset_kit(class_id):
			out.append(String(a["id"]))
		return out
	return kit_ids.duplicate()


func _build_loadout() -> void:
	var col := _column(Vector2(0, 0), 980)
	col.add_child(_header("LOADOUT"))

	var kit := _current_kit()

	# I tre indicatori. Sono l'unico "consiglio" che il gioco da', e non dicono
	# mai cosa fare: dicono cosa hai. Una build senza sbalzi lo dice, e ti lascia
	# giocarla.
	var ttk := 0.0
	var launches := 0
	var recovery := false
	for id in kit:
		var a := Content.ability(String(id))
		if a.is_empty():
			continue
		if float(a["airtime"]) > 0.0:
			launches += 1
		if float(a["heal"]) > 0.0:
			recovery = true
		var cd: float = maxf(Content.cooldown_for(a, Content.stats(class_id, sub_id)), 0.1)
		ttk += float(a["damage"]) / cd
	var hp: float = float(Content.stats(class_id, sub_id)["max_hp"])
	var seconds: float = hp / maxf(ttk + 15.0, 1.0)

	var meters := HBoxContainer.new()
	meters.add_theme_constant_override("separation", 30)
	col.add_child(meters)
	meters.add_child(_stat("TIME TO KILL", "%.1f s" % seconds))
	meters.add_child(_stat("LAUNCHES", str(launches)))
	meters.add_child(_stat("RECOVERY", "yes" if recovery else "NONE"))
	col.add_child(UI.spacer(12))

	# Gli otto slot, con i tasti sotto le dita.
	var slots := HBoxContainer.new()
	slots.add_theme_constant_override("separation", 8)
	col.add_child(slots)
	var keys := ["1", "2", "3", "4", "Q", "E", "R", "F"]
	for i in 8:
		var id: String = String(kit[i]) if i < kit.size() else ""
		var a := Content.ability(id)
		var p := UI.panel(Vector2(112, 86), UI.PANEL_HI if i == _editing_slot else UI.PANEL)
		var v := VBoxContainer.new()
		v.add_theme_constant_override("separation", 2)
		p.add_child(v)
		v.add_child(UI.label(keys[i], 12, UI.ACCENT))
		var nm := UI.label(String(a.get("name", "—")), 12, UI.TEXT)
		nm.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		nm.custom_minimum_size = Vector2(88, 30)
		v.add_child(nm)
		v.add_child(UI.label(String(a.get("school", "")), 10, UI.TEXT_FAINT))
		var btn := Button.new()
		btn.flat = true
		btn.set_anchors_preset(Control.PRESET_FULL_RECT)
		var slot := i
		btn.pressed.connect(func():
			_editing_slot = slot
			Sfx.play("ui_click", Sfx.UI)
			show_screen(Screen.BUILD))
		p.add_child(btn)
		slots.add_child(p)

	col.add_child(UI.spacer(14))

	if _editing_slot >= 0:
		col.add_child(_pool_list(kit))
	else:
		col.add_child(
			UI.label("Pick a slot to change what it holds.", 13, UI.TEXT_DIM)
		)

	col.add_child(UI.spacer(16))
	var actions := HBoxContainer.new()
	actions.add_theme_constant_override("separation", 10)
	col.add_child(actions)

	var play := UI.button("PLAY", true, 300)
	play.pressed.connect(_on_play)
	actions.add_child(play)

	var preset := UI.button("PRESET", false, 140)
	preset.pressed.connect(func():
		kit_ids = []
		Sfx.play("ui_click", Sfx.UI)
		show_screen(Screen.BUILD))
	actions.add_child(preset)

	var back := UI.button("BACK", false, 130)
	back.pressed.connect(func():
		_editing_slot = -1
		_go(Screen.ROSTER))
	actions.add_child(back)


## Il pool della classe per lo slot in modifica.
##
## Le abilita' bloccate SI VEDONO, con scritto cosa fare per averle: nasconderle
## e' come non averle mai scritte, e l'obiettivo scritto e' il tutorial.
func _pool_list(kit: Array) -> Control:
	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(960, 260)
	var grid := VBoxContainer.new()
	grid.add_theme_constant_override("separation", 4)
	scroll.add_child(grid)

	for a in Content.pool(class_id):
		var id := String(a["id"])
		var unlocked := progress.is_unlocked(id)
		var used := kit.has(id)
		var p := UI.panel(Vector2(940, 0), UI.PANEL_HI if used else UI.PANEL)
		var v := VBoxContainer.new()
		v.add_theme_constant_override("separation", 1)
		p.add_child(v)

		var head := HBoxContainer.new()
		head.add_theme_constant_override("separation", 12)
		v.add_child(head)
		head.add_child(UI.label(String(a["name"]), 15, UI.TEXT if unlocked else UI.TEXT_FAINT))
		head.add_child(
			UI.label(
				"%s · %s · %.0f m" % [String(a["weapon"]), String(a["school"]), float(a["range_m"])],
				11,
				UI.TEXT_FAINT
			)
		)

		var desc := UI.label(String(a["description"]), 12, UI.TEXT_DIM)
		desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		desc.custom_minimum_size = Vector2(900, 0)
		v.add_child(desc)

		# I tre numeri che contano, e nient'altro: se un'informazione serve a
		# scegliere sta qui, se non serve non c'e'.
		v.add_child(
			UI.label(
				(
					"%.0f damage · %.1f s cooldown%s"
					% [
						float(a["damage"]),
						Content.cooldown_for(a, Content.stats(class_id, sub_id)),
						(" · %.2f s airborne" % float(a["airtime"])) if float(a["airtime"]) > 0.0 else "",
					]
				),
				12,
				UI.ACCENT
			)
		)

		# Il difetto. Ogni abilita' ne dichiara uno, e non e' modestia: e' come
		# il giocatore capisce contro cosa la sta scegliendo.
		var malus := UI.label("⚠  " + String(a["mini_malus"]), 11, UI.DANGER)
		malus.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		malus.custom_minimum_size = Vector2(900, 0)
		v.add_child(malus)

		if not unlocked:
			v.add_child(UI.label("🔒  " + progress.progress_text(id), 11, UI.TEXT_FAINT))
		else:
			var btn := Button.new()
			btn.flat = true
			btn.set_anchors_preset(Control.PRESET_FULL_RECT)
			btn.pressed.connect(func():
				var k := _current_kit()
				while k.size() < 8:
					k.append("")
				k[_editing_slot] = id
				kit_ids = k
				_editing_slot = -1
				Sfx.play("ui_confirm", Sfx.UI)
				show_screen(Screen.BUILD))
			p.add_child(btn)

		grid.add_child(p)
	return scroll


# =========================================================================
# RISULTATI
# =========================================================================


## La schermata di fine partita. `rows` e' [{name, score, deaths, mine}].
func show_results(rows: Array, won: bool, stats: Dictionary) -> void:
	show_screen(Screen.RESULTS)
	var col := _column(Vector2(0, 0), 720)

	var title := UI.label("VICTORY" if won else "DEFEAT", 54, UI.ACCENT if won else UI.DANGER)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.custom_minimum_size = Vector2(720, 0)
	col.add_child(title)
	col.add_child(UI.spacer(18))

	var head := HBoxContainer.new()
	head.add_theme_constant_override("separation", 0)
	col.add_child(head)
	for h in [["PLAYER", 340], ["KILLS", 120], ["DEATHS", 120], ["BEST", 140]]:
		var l := UI.eyebrow(String(h[0]))
		l.custom_minimum_size = Vector2(float(h[1]), 0)
		head.add_child(l)
	col.add_child(UI.rule(720))

	for r in rows:
		var line := HBoxContainer.new()
		var mine: bool = bool(r.get("mine", false))
		for cell in [
			[String(r.get("name", "")), 340],
			[str(int(r.get("score", 0))), 120],
			[str(int(r.get("deaths", 0))), 120],
			[String(r.get("best", "—")), 140],
		]:
			var l := UI.label(String(cell[0]), 15, UI.ACCENT if mine else UI.TEXT_DIM)
			l.custom_minimum_size = Vector2(float(cell[1]), 26)
			line.add_child(l)
		col.add_child(line)

	col.add_child(UI.spacer(20))
	var mine_row := HBoxContainer.new()
	mine_row.add_theme_constant_override("separation", 40)
	col.add_child(mine_row)
	mine_row.add_child(_stat("BEST STREAK", str(int(stats.get("streak", 0)))))
	mine_row.add_child(_stat("LONGEST JUGGLE", "x%d" % int(stats.get("juggle", 0))))
	mine_row.add_child(_stat("ACCURACY", "%d %%" % int(stats.get("accuracy", 0))))
	mine_row.add_child(_stat("LEVEL", str(progress.level())))

	col.add_child(UI.spacer(24))
	var actions := HBoxContainer.new()
	actions.add_theme_constant_override("separation", 12)
	col.add_child(actions)
	# PLAY AGAIN rimette in coda CON LA STESSA BUILD, senza passare da nessuna
	# schermata: e' la stessa regola del click solo, applicata alla fine.
	var again := UI.button("PLAY AGAIN", true, 340)
	again.pressed.connect(_on_play)
	actions.add_child(again)
	var menu := UI.button("MENU", false, 160)
	menu.pressed.connect(func(): _go(Screen.MENU))
	actions.add_child(menu)


# =========================================================================
# IMPOSTAZIONI
# =========================================================================


func _build_settings() -> void:
	var col := _column(Vector2(0, 0), 720)
	col.add_child(_header("SETTINGS"))

	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(700, 420)
	col.add_child(scroll)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 10)
	scroll.add_child(v)

	v.add_child(UI.eyebrow("aim"))
	var sens := UI.slider(0.2, 8.0, 0.01, float(settings.get_value("sensitivity")))
	(sens.get_node("Slider") as HSlider).value_changed.connect(func(x):
		settings.set_value("sensitivity", x)
		_refresh_sens_hint(v))
	v.add_child(_labeled("Mouse sensitivity", sens))
	# La conversione nella scala che il giocatore gia' usa altrove: chi ha una
	# mira sua se la porta invece di ritararla a occhio.
	var hint := UI.label(
		"≈ %.2f in most FPS at 800 DPI" % settings.sensitivity_in_common_scale(), 11, UI.TEXT_FAINT
	)
	hint.name = "SensHint"
	v.add_child(hint)

	var fov := UI.slider(80.0, 120.0, 1.0, float(settings.get_value("fov")), "%.0f")
	(fov.get_node("Slider") as HSlider).value_changed.connect(
		func(x): settings.set_value("fov", x)
	)
	v.add_child(_labeled("Field of view", fov))
	var vmfov := UI.slider(50.0, 90.0, 1.0, float(settings.get_value("viewmodel_fov")), "%.0f")
	(vmfov.get_node("Slider") as HSlider).value_changed.connect(
		func(x): settings.set_value("viewmodel_fov", x)
	)
	v.add_child(_labeled("Weapon field of view", vmfov))

	v.add_child(UI.spacer(6))
	v.add_child(UI.eyebrow("crosshair"))
	for spec in [
		["Thickness", "crosshair_thickness", 1.0, 6.0, 1.0],
		["Length", "crosshair_length", 3.0, 20.0, 1.0],
		["Gap", "crosshair_gap", 0.0, 20.0, 1.0],
	]:
		var s := UI.slider(float(spec[2]), float(spec[3]), float(spec[4]), float(settings.get_value(String(spec[1]))), "%.0f")
		var key := String(spec[1])
		(s.get_node("Slider") as HSlider).value_changed.connect(
			func(x): settings.set_value(key, x)
		)
		v.add_child(_labeled(String(spec[0]), s))
	var dot := UI.checkbox("Center dot", bool(settings.get_value("crosshair_dot")))
	dot.toggled.connect(func(on): settings.set_value("crosshair_dot", on))
	v.add_child(dot)

	v.add_child(UI.spacer(6))
	v.add_child(UI.eyebrow("accessibility"))
	var cb := OptionButton.new()
	var profiles := Settings.COLORBLIND.keys()
	for i in profiles.size():
		cb.add_item(String(profiles[i]).capitalize(), i)
		if String(profiles[i]) == String(settings.get_value("colorblind")):
			cb.select(i)
	cb.item_selected.connect(func(i): settings.set_value("colorblind", String(profiles[i])))
	v.add_child(_labeled("Colourblind profile", cb))

	var scale := OptionButton.new()
	var scales := [1.0, 1.25, 1.5]
	for i in scales.size():
		scale.add_item("%d %%" % int(scales[i] * 100.0), i)
		if is_equal_approx(float(settings.get_value("ui_scale")), float(scales[i])):
			scale.select(i)
	scale.item_selected.connect(func(i):
		settings.set_value("ui_scale", float(scales[i]))
		apply_ui_scale())
	v.add_child(_labeled("Interface size", scale))

	# Tre interruttori che TOLGONO roba. Non sono accessibilita' di facciata:
	# servono a chi quelle cose le trova nauseanti.
	for spec2 in [
		["Camera shake", "camera_shake"],
		["Damage flash", "damage_flash"],
		["Launch flash", "launch_flash"],
	]:
		var key2 := String(spec2[1])
		var c := UI.checkbox(String(spec2[0]), bool(settings.get_value(key2)))
		c.toggled.connect(func(on): settings.set_value(key2, on))
		v.add_child(c)

	v.add_child(UI.spacer(6))
	v.add_child(UI.eyebrow("audio"))
	for spec3 in [
		["Master", "vol_master"], ["Effects", "vol_sfx"], ["Ambience", "vol_ambient"],
		["Interface", "vol_ui"], ["Music", "vol_music"],
	]:
		var key3 := String(spec3[1])
		var s3 := UI.slider(-40.0, 6.0, 1.0, float(settings.get_value(key3)), "%.0f dB")
		(s3.get_node("Slider") as HSlider).value_changed.connect(func(x):
			settings.set_value(key3, x)
			_apply_audio_settings())
		v.add_child(_labeled(String(spec3[0]), s3))

	v.add_child(UI.spacer(6))
	v.add_child(UI.eyebrow("controls"))
	v.add_child(UI.label("Every key can be remapped, including the ones you never think about.", 12, UI.TEXT_DIM))
	# La lista tasto per tasto. "Tutti i tasti si possono rimappare" non è vero
	# se l'unica cosa che si può fare è scegliere fra due preset.
	v.add_child(_keybind_list())

	var kb := HBoxContainer.new()
	kb.add_theme_constant_override("separation", 8)
	v.add_child(kb)
	var lefty := UI.button("LEFT-HANDED (IJKL)", false, 220)
	lefty.pressed.connect(func():
		settings.use_left_handed()
		Sfx.play("ui_confirm", Sfx.UI))
	kb.add_child(lefty)
	var reset := UI.button("RESET KEYS", false, 160)
	reset.pressed.connect(func():
		settings.reset_bindings()
		Sfx.play("ui_click", Sfx.UI))
	kb.add_child(reset)

	col.add_child(UI.spacer(16))
	var back := UI.button("BACK", false, 160)
	back.pressed.connect(func(): _go(Screen.MENU))
	col.add_child(back)


## L'elenco dei tasti, uno per riga.
##
## Si preme il bottone e si preme il tasto nuovo: nessuna finestra modale, che
## in una lista di quattordici righe vorrebbe dire aprirla e chiuderla
## quattordici volte. E il conflitto SI DICE PRIMA di assegnare — scoprire in
## partita che due cose stanno sullo stesso tasto è il modo peggiore di
## scoprirlo.
func _keybind_list() -> Control:
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 3)
	for action in Settings.BINDINGS:
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 12)
		var label := UI.label(_action_label(String(action)), 13, UI.TEXT_DIM)
		label.custom_minimum_size = Vector2(200, 0)
		row.add_child(label)

		var key := int(settings.bindings.get(action, 0))
		var mouse := settings.mouse_hint(String(action))
		var shown := OS.get_keycode_string(key)
		if not mouse.is_empty():
			shown += "  /  " + mouse
		var b := UI.button(shown, false, 178)
		var act := String(action)
		b.pressed.connect(func():
			_capture_for = act
			b.text = "PRESS A KEY"
			Sfx.play("ui_click", Sfx.UI))
		row.add_child(b)
		_key_buttons[act] = b
		box.add_child(row)

	_conflict_label = UI.label("", 12, UI.DANGER)
	box.add_child(_conflict_label)
	return box


## Il nome leggibile di un'azione. "ability_5" non dice niente a nessuno;
## "Ability 5  (Q)" dice quale slot e dove sta adesso.
func _action_label(action: String) -> String:
	match action:
		"move_forward": return "Move forward"
		"move_back": return "Move back"
		"move_left": return "Strafe left"
		"move_right": return "Strafe right"
		"jump": return "Jump"
		"parry": return "Parry"
		"break_free": return "Break free"
		_:
			if action.begins_with("ability_"):
				return "Ability %s" % action.substr(8)
			return action.capitalize()


## Cattura il tasto premuto e lo assegna. Sta in `_input` e non in
## `_unhandled_input` perché un bottone appena premuto si tiene il focus e
## mangerebbe la pressione successiva.
func _input(event: InputEvent) -> void:
	if _capture_for.is_empty() or _screen != Screen.SETTINGS:
		return
	if not (event is InputEventKey and event.pressed and not event.echo):
		return
	var key: int = (event as InputEventKey).physical_keycode
	var clash := settings.conflict(_capture_for, key)
	if not clash.is_empty():
		# Non si assegna e si dice perché: sovrascrivere in silenzio lascia il
		# giocatore con un'azione che ha smesso di funzionare e nessun indizio.
		if _conflict_label:
			_conflict_label.text = "%s is already %s." % [
				OS.get_keycode_string(key), _action_label(clash)
			]
		Sfx.play("unavailable", Sfx.UI)
		_reset_capture()
		return
	settings.bind(_capture_for, key)
	if _conflict_label:
		_conflict_label.text = ""
	Sfx.play("ui_confirm", Sfx.UI)
	_reset_capture()
	get_viewport().set_input_as_handled()


func _reset_capture() -> void:
	var b = _key_buttons.get(_capture_for)
	if b and is_instance_valid(b):
		b.text = OS.get_keycode_string(int(settings.bindings.get(_capture_for, 0)))
	_capture_for = ""


func _refresh_sens_hint(parent: Node) -> void:
	var l = parent.get_node_or_null("SensHint")
	if l:
		l.text = "≈ %.2f in most FPS at 800 DPI" % settings.sensitivity_in_common_scale()


## La scala dell'interfaccia. Su uno schermo grande o per chi legge male, un
## testo da 12 pixel non è una scelta di design: è un muro. Ingrandisce TUTTO
## insieme, perché ingrandire solo il testo lo fa uscire dai riquadri.
func apply_ui_scale() -> void:
	var k := float(settings.get_value("ui_scale"))
	var tree := get_tree()
	if tree:
		tree.root.content_scale_factor = k


func _apply_audio_settings() -> void:
	var svc := Sfx.service()
	if svc == null:
		return
	AudioServer.set_bus_volume_db(
		AudioServer.get_bus_index("Master"), float(settings.get_value("vol_master"))
	)
	svc.set_bus_volume(Sfx.SFX, float(settings.get_value("vol_sfx")))
	svc.set_bus_volume(Sfx.AMBIENT, float(settings.get_value("vol_ambient")))
	svc.set_bus_volume(Sfx.UI, float(settings.get_value("vol_ui")))
	svc.set_bus_volume(Sfx.MUSIC, float(settings.get_value("vol_music")))


# =========================================================================
# impalcatura
# =========================================================================


func _column(_at: Vector2, width: float) -> VBoxContainer:
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	_body.add_child(center)
	var col := VBoxContainer.new()
	col.custom_minimum_size = Vector2(width, 0)
	col.add_theme_constant_override("separation", 4)
	center.add_child(col)
	return col


func _header(text: String) -> Control:
	var v := VBoxContainer.new()
	v.add_child(UI.label(text, 30, UI.TEXT))
	v.add_child(UI.spacer(6))
	v.add_child(UI.rule(0))
	v.add_child(UI.spacer(12))
	return v


func _labeled(text: String, control: Control) -> Control:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 16)
	var l := UI.label(text, 13, UI.TEXT_DIM)
	l.custom_minimum_size = Vector2(200, 0)
	row.add_child(l)
	row.add_child(control)
	return row


func _go(which: int) -> void:
	Sfx.play("ui_click", Sfx.UI)
	show_screen(which)
