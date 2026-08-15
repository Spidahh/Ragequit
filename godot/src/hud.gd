## L'HUD.
##
## Regola presa dall'errore misurato sul progetto precedente: le barre stavano in
## una scatola bordata al centro dello schermo con scritto "200 / 200" in
## monospace. È il linguaggio di un pannello di debug, non di un gioco. Qui il
## contrario, e per motivi dichiarati:
##
##   - le vitali stanno IN BASSO A SINISTRA, in periferia. Il centro è dove
##     guardi il nemico.
##   - la barra È il widget: niente cornice, niente etichetta. Il colore dice
##     quale risorsa, la lunghezza dice quanta ne resta.
##   - la vita è più alta delle altre. Gerarchia per dimensione, non per testo.
##   - i cooldown sono quadrati che si riempiono, non numeri da leggere: in un
##     fight non leggi, guardi.
##   - in partita compare solo FEEDBACK (cosa è successo), mai ISTRUZIONI
##     (cosa fare).
extends CanvasLayer

const Combat := preload("res://src/combat.gd")
const SettingsScript := preload("res://src/settings.gd")
const UI := preload("res://src/ui.gd")

const COL_HP := Color(1.0, 0.20, 0.27)
const COL_STAM := Color(0.0, 1.0, 0.53)
const COL_PANEL := Color(0.04, 0.05, 0.08, 0.55)
const COL_READY := Color(1.0, 0.82, 0.38)
const COL_COOLING := Color(0.16, 0.19, 0.26)

var _player: Node = null
var _hp_bar: ColorRect
var _hp_back: ColorRect
var _hp_num: Label
var _slots: Array[Dictionary] = []
var _bar: Control = null
var _crosshair: Control
var _hitmark: Control
var _hitmark_t := 0.0
var _combo := 0
var _combo_label: Label
var _combo_t := 0.0
var _score_label: Label
var _timer_label: Label
var _leader_label: Label
## Le righe del kill feed, con il tempo che resta a ciascuna.
var _feed: Array = []
var _feed_box: VBoxContainer
var _scoreboard: Control = null
var _recap: Control = null
var _recap_label: Label = null
var _recap_left := 0.0
var _combo_world := Vector3.ZERO
var _combo_has_world := false
var _drills: Control = null
var _netstat: Label = null
var _wheel: Control = null
var _weapon_headers: Dictionary = {}
var _cast_banner: Label = null
var _cast_meter_back: ColorRect = null
var _cast_meter: ColorRect = null
var _cast_t := 0.0
var _ping_ms := 0
var _fps_smooth := 60.0


## I tasti degli otto slot, nell'ordine in cui stanno sotto le dita.
const SLOT_KEYS := ["1", "2", "3", "4", "5", "6", "7", "8"]
const ICON_ROOT := "res://assets/ui/ability-icons/"
const FAMILY_COLORS := {
	"SWORD": Color("ff3344"),
	"BOW": Color("39ff14"),
	"STAFF": Color("00d0ff"),
	"UTILITY": Color("ffd260"),
}


func setup(player: Node) -> void:
	_player = player
	if player.has_signal("cast_resolved"):
		player.cast_resolved.connect(func(n, hits):
			_on_cast(n, hits)
			if hits > 0 and "last_hit_point" in player:
				combo_at(player.last_hit_point))
	if player.has_signal("cast_state_changed"):
		player.cast_state_changed.connect(_on_cast_state_changed)
	if player.has_signal("ability_wheel_changed"):
		player.ability_wheel_changed.connect(_on_ability_wheel_changed)
	# La barra si costruisce QUI e non in `_ready`: le abilità sono quelle della
	# build scelta, e l'HUD non può conoscerle prima di sapere chi sta giocando.
	_build_bar()


func _ready() -> void:
	_build()


func _build() -> void:
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)

	# --- Mirino ---------------------------------------------------------------
	# Quattro trattini con un buco al centro: si vede su fondo chiaro e scuro
	# senza coprire il bersaglio. Un punto pieno sparisce sul muro chiaro.
	_crosshair = Control.new()
	_crosshair.set_anchors_preset(Control.PRESET_CENTER)
	_crosshair.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_crosshair)
	_build_crosshair()

	# Riscontro del cast vicino al mirino: cosa e' stato premuto, con quale arma
	# e quanto manca al rilascio. E' feedback dell'azione, non una spiegazione.
	_cast_banner = Label.new()
	_cast_banner.set_anchors_preset(Control.PRESET_CENTER)
	_cast_banner.position = Vector2(-190, 42)
	_cast_banner.size = Vector2(380, 24)
	_cast_banner.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_cast_banner.add_theme_font_size_override("font_size", 14)
	_cast_banner.add_theme_color_override("font_color", COL_READY)
	_cast_banner.modulate.a = 0.0
	root.add_child(_cast_banner)

	_cast_meter_back = ColorRect.new()
	_cast_meter_back.set_anchors_preset(Control.PRESET_CENTER)
	_cast_meter_back.position = Vector2(-90, 68)
	_cast_meter_back.size = Vector2(180, 3)
	_cast_meter_back.color = Color(0.02, 0.025, 0.04, 0.8)
	_cast_meter_back.modulate.a = 0.0
	root.add_child(_cast_meter_back)

	_cast_meter = ColorRect.new()
	_cast_meter.set_anchors_preset(Control.PRESET_CENTER)
	_cast_meter.position = Vector2(-90, 68)
	_cast_meter.size = Vector2(0, 3)
	_cast_meter.color = COL_READY
	_cast_meter.modulate.a = 0.0
	root.add_child(_cast_meter)

	# --- Conferma di colpo ----------------------------------------------------
	# La X che compare quando prendi qualcuno. È l'unico feedback che un FPS non
	# può non avere: senza, non sai se hai colpito.
	_hitmark = Control.new()
	_hitmark.set_anchors_preset(Control.PRESET_CENTER)
	_hitmark.modulate.a = 0.0
	_hitmark.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_hitmark)
	for i in 4:
		var d := ColorRect.new()
		d.color = Color(1, 0.95, 0.7)
		d.size = Vector2(2, 8)
		d.rotation = deg_to_rad(45.0 if i % 2 == 0 else -45.0)
		d.position = Vector2(-10 if i < 2 else 8, -12 if i % 2 == 0 else 4)
		_hitmark.add_child(d)

	# --- Vitali, in basso a sinistra -----------------------------------------
	var vitals := Control.new()
	vitals.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	vitals.position = Vector2(28, -74)
	vitals.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(vitals)

	_hp_back = ColorRect.new()
	_hp_back.color = COL_PANEL
	_hp_back.size = Vector2(232, 16)
	vitals.add_child(_hp_back)
	_hp_bar = ColorRect.new()
	_hp_bar.color = COL_HP
	_hp_bar.size = Vector2(232, 16)
	vitals.add_child(_hp_bar)

	_hp_num = Label.new()
	_hp_num.position = Vector2(240, -2)
	_hp_num.add_theme_font_size_override("font_size", 17)
	_hp_num.add_theme_color_override("font_color", Color(1, 1, 1, 0.92))
	vitals.add_child(_hp_num)

	# La stamina è più sottile: si legge di sfuggita, non si conta.
	var stam_back := ColorRect.new()
	stam_back.color = COL_PANEL
	stam_back.size = Vector2(232, 7)
	stam_back.position = Vector2(0, 20)
	vitals.add_child(stam_back)
	var stam := ColorRect.new()
	stam.color = COL_STAM
	stam.size = Vector2(232, 7)
	stam.position = Vector2(0, 20)
	vitals.add_child(stam)

	# --- Slot abilità, in basso al centro ------------------------------------
	_bar = Control.new()
	_bar.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	# Separato dal bordo e dal viewmodel: gli slot Utility non devono finire
	# sotto l'arma in prima persona.
	_bar.position = Vector2(0, -122)
	_bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_bar)

	# --- Punteggio e timer, in alto al centro --------------------------------
	# Le due sole cose che dicono a che punto è la partita. Stanno in alto perché
	# si controllano fra uno scambio e l'altro, non durante.
	var top := Control.new()
	top.set_anchors_preset(Control.PRESET_CENTER_TOP)
	top.position = Vector2(0, 14)
	top.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(top)

	_score_label = Label.new()
	_score_label.text = "0"
	_score_label.position = Vector2(-60, 0)
	_score_label.size = Vector2(120, 34)
	_score_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_score_label.add_theme_font_size_override("font_size", 30)
	_score_label.add_theme_color_override("font_color", Color(1, 1, 1, 0.95))
	top.add_child(_score_label)

	_timer_label = Label.new()
	_timer_label.text = "8:00"
	_timer_label.position = Vector2(-60, 34)
	_timer_label.size = Vector2(120, 18)
	_timer_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_timer_label.add_theme_font_size_override("font_size", 15)
	_timer_label.add_theme_color_override("font_color", Color(1, 1, 1, 0.6))
	top.add_child(_timer_label)

	# Chi sta vincendo: senza, il tuo punteggio non vuol dire niente.
	_leader_label = Label.new()
	_leader_label.position = Vector2(-140, 52)
	_leader_label.size = Vector2(280, 16)
	_leader_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_leader_label.add_theme_font_size_override("font_size", 12)
	_leader_label.add_theme_color_override("font_color", COL_READY)
	top.add_child(_leader_label)

	# --- Kill feed, in alto a destra -----------------------------------------
	# Dice sempre CON QUALE ABILITÀ: è così che si imparano i kit degli altri
	# senza che nessuno li spieghi.
	_feed_box = VBoxContainer.new()
	_feed_box.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	_feed_box.position = Vector2(-372, 14)
	_feed_box.size = Vector2(348, 120)
	_feed_box.alignment = BoxContainer.ALIGNMENT_BEGIN
	_feed_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(_feed_box)

	# --- Ping e FPS, in alto a destra e piccoli ------------------------------
	# Sempre visibili, non dietro un menù. Quando il gioco scatta, la prima cosa
	# che il giocatore vuole sapere è se è colpa sua o nostra — e chiederglielo
	# di aprire le impostazioni per scoprirlo è chiederglielo nel momento
	# peggiore.
	_netstat = Label.new()
	_netstat.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	_netstat.position = Vector2(-104, 4)
	_netstat.size = Vector2(96, 16)
	_netstat.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	_netstat.add_theme_font_size_override("font_size", 11)
	_netstat.add_theme_color_override("font_color", Color(1, 1, 1, 0.38))
	root.add_child(_netstat)

	# --- Contatore combo, fluttuante -----------------------------------------
	# L'unica cosa "in più" concessa in partita, e concessa perché PREMIA, non
	# insegna.
	_combo_label = Label.new()
	_combo_label.set_anchors_preset(Control.PRESET_CENTER)
	_combo_label.position = Vector2(28, -46)
	_combo_label.add_theme_font_size_override("font_size", 24)
	_combo_label.add_theme_color_override("font_color", COL_READY)
	_combo_label.modulate.a = 0.0
	root.add_child(_combo_label)


## Aggiorna la testata. `score` è il tuo, `leader` è la riga che dice chi sta
## davanti. Il testo lo compone chi conosce la modalità: l'HUD non sa le regole.
func set_match(score: int, seconds_left: float, leader: String) -> void:
	if _score_label == null:
		return
	_score_label.text = str(score)
	var s := int(ceilf(maxf(0.0, seconds_left)))
	_timer_label.text = "%d:%02d" % [s / 60, s % 60]
	# Sotto il minuto il timer si accende: è l'unico momento in cui vale la pena
	# guardarlo, quindi è l'unico in cui si fa notare.
	_timer_label.add_theme_color_override(
		"font_color", COL_HP if s <= 60 else Color(1, 1, 1, 0.6)
	)
	_leader_label.text = leader


## Una riga di kill feed. Sparisce da sola dopo cinque secondi.
func push_feed(text: String, mine: bool = false) -> void:
	if _feed_box == null:
		return
	var line := Label.new()
	line.text = text
	line.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	line.add_theme_font_size_override("font_size", 13)
	line.add_theme_color_override("font_color", COL_READY if mine else Color(1, 1, 1, 0.75))
	_feed_box.add_child(line)
	_feed.append({"node": line, "t": 5.0})
	# Cinque righe bastano: oltre, il feed copre lo schermo proprio nel momento
	# in cui succede di più.
	while _feed.size() > 5:
		var old = _feed.pop_front()
		if is_instance_valid(old["node"]):
			old["node"].queue_free()



func _build_bar() -> void:
	if _bar == null or _player == null:
		return
	_clear(_bar)
	_slots.clear()
	_weapon_headers.clear()

	var kit: Array = _player.kit() if _player.has_method("kit") else []
	if kit.is_empty():
		return

	# Le abilita' non sono otto quadrati anonimi: vengono separate per arma.
	# L'ordine degli slot resta identico, ma la cornice e l'intestazione dicono
	# subito quale gesto il tasto attivera'.
	var groups: Array = []
	for i in kit.size():
		var family := _slot_family(kit[i])
		if groups.is_empty() or String(groups[-1]["family"]) != family:
			groups.append({"family": family, "items": []})
		groups[-1]["items"].append({"ability": kit[i], "index": i})

	var slot_w := 76.0
	var slot_h := 76.0
	var inner_gap := 5.0
	var group_gap := 16.0
	var total := 0.0
	for group in groups:
		var count: int = group["items"].size()
		total += count * slot_w + maxf(0.0, float(count - 1)) * inner_gap
	total += maxf(0.0, float(groups.size() - 1)) * group_gap

	var x := -total * 0.5
	for group in groups:
		var family := String(group["family"])
		var items: Array = group["items"]
		var group_w := items.size() * slot_w + maxf(0.0, float(items.size() - 1)) * inner_gap
		var head := Label.new()
		head.text = family
		head.position = Vector2(x, -25)
		head.size = Vector2(group_w, 20)
		head.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		head.add_theme_font_size_override("font_size", 11)
		head.add_theme_color_override("font_color", FAMILY_COLORS[family])
		_bar.add_child(head)
		_weapon_headers[family] = head

		for item in items:
			var ability: Dictionary = item["ability"]
			var idx := int(item["index"])
			var frame := Panel.new()
			frame.position = Vector2(x, 0)
			frame.size = Vector2(slot_w, slot_h)
			var frame_style := StyleBoxFlat.new()
			frame_style.bg_color = Color(0.035, 0.043, 0.065, 0.92)
			frame_style.border_color = FAMILY_COLORS[family]
			frame_style.set_border_width_all(2)
			frame_style.corner_radius_top_left = 4
			frame_style.corner_radius_top_right = 4
			frame_style.corner_radius_bottom_left = 4
			frame_style.corner_radius_bottom_right = 4
			frame.add_theme_stylebox_override("panel", frame_style)
			_bar.add_child(frame)

			var icon := TextureRect.new()
			icon.position = Vector2(7, 6)
			icon.size = Vector2(62, 50)
			icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
			icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
			var icon_path := "%s%s.webp" % [ICON_ROOT, String(ability["id"])]
			if ResourceLoader.exists(icon_path):
				icon.texture = load(icon_path)
			frame.add_child(icon)

			# Il cooldown scende dall'alto lasciando riapparire l'icona. Non colora
			# tutto di giallo: forma e colore dell'abilita' restano leggibili.
			var shade := ColorRect.new()
			shade.color = Color(0.015, 0.02, 0.035, 0.82)
			shade.position = Vector2(7, 6)
			shade.size = Vector2(62, 0)
			shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
			frame.add_child(shade)

			var key_back := ColorRect.new()
			key_back.color = Color(0.02, 0.025, 0.04, 0.94)
			key_back.position = Vector2(4, 3)
			key_back.size = Vector2(20, 19)
			frame.add_child(key_back)
			var key := Label.new()
			key.text = SLOT_KEYS[idx] if idx < SLOT_KEYS.size() else str(idx + 1)
			key.position = Vector2(4, 1)
			key.size = Vector2(20, 20)
			key.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			key.add_theme_font_size_override("font_size", 13)
			key.add_theme_color_override("font_color", Color.WHITE)
			frame.add_child(key)

			var cd_text := Label.new()
			cd_text.position = Vector2(7, 20)
			cd_text.size = Vector2(62, 28)
			cd_text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			cd_text.add_theme_font_size_override("font_size", 18)
			cd_text.add_theme_color_override("font_color", Color.WHITE)
			frame.add_child(cd_text)

			var nm := Label.new()
			nm.text = String(ability["name"])
			nm.position = Vector2(3, 56)
			nm.size = Vector2(slot_w - 6, 18)
			nm.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			nm.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
			nm.add_theme_font_size_override("font_size", 9)
			nm.add_theme_color_override("font_color", Color(1, 1, 1, 0.82))
			frame.add_child(nm)

			_slots.append({
				"id": ability["id"],
				"icon": icon,
				"name": nm,
				"shade": shade,
				"cd_text": cd_text,
				"icon_h": 50.0,
				"cd": float(ability["cooldown"]),
				"family": family,
			})
			x += slot_w + inner_gap
		x += group_gap - inner_gap


func _slot_family(ability: Dictionary) -> String:
	match String(ability.get("school", "utility")):
		"melee": return "SWORD"
		"bow": return "BOW"
		"magicBase", "magicAdvanced": return "STAFF"
		_: return "UTILITY"


func _on_cast_state_changed(state: String, ability_name: String, weapon: String, duration: float) -> void:
	if _cast_banner == null:
		return
	var weapon_name := weapon.to_upper() if not weapon.is_empty() and weapon != "none" else "UTILITY"
	match state:
		"selected":
			_cast_banner.text = "PRIMED  ·  %s  ·  LMB TO CAST" % ability_name.to_upper()
			_cast_banner.add_theme_color_override(
				"font_color", FAMILY_COLORS.get(weapon_name, COL_READY)
			)
			_cast_t = 9999.0
		"windup":
			_cast_banner.text = "%s  ·  %s" % [ability_name.to_upper(), weapon_name]
			_cast_banner.add_theme_color_override(
				"font_color", FAMILY_COLORS.get(weapon_name, COL_READY)
			)
			_cast_t = maxf(duration, 0.16)
		"released":
			_cast_banner.text = "CAST  ·  %s" % ability_name.to_upper()
			_cast_banner.add_theme_color_override("font_color", Color.WHITE)
			_cast_t = maxf(duration, 0.28)
		"failed":
			_cast_banner.text = "BLOCKED  ·  %s" % ability_name.to_upper()
			_cast_banner.add_theme_color_override("font_color", COL_HP)
			_cast_t = maxf(duration, 0.35)
	_cast_banner.modulate.a = 1.0
	_cast_meter_back.modulate.a = 1.0
	_cast_meter.modulate.a = 1.0


func _on_ability_wheel_changed(page: int, picked: int, items: Array) -> void:
	if page < 0:
		hide_wheel()
		return
	var labels := {}
	var angles := {}
	for i in items.size():
		var ability: Dictionary = items[i]
		labels[i] = "%d  %s" % [page * 4 + i + 1, String(ability.get("name", "—"))]
		angles[i] = float(i * 90)
	show_wheel(picked, labels, angles)

## Toglie un nodo dall'albero SUBITO, non a fine frame.
##
## `queue_free` libera alla fine del frame, e nel frattempo il nodo è ancora
## figlio: ricostruire il mirino subito dopo produce due mirini sovrapposti, e
## nascondere il tabellone lo lascia visibile fino al frame dopo. Sono due bug
## che a occhio si vedono come uno sfarfallio e che in un test si vedono come
## "il conto non torna".
func _drop(node: Node) -> void:
	if node == null or not is_instance_valid(node):
		return
	if node.get_parent():
		node.get_parent().remove_child(node)
	node.queue_free()


func _clear(node: Node) -> void:
	for c in node.get_children():
		_drop(c)


## Il mirino, costruito dalle impostazioni del giocatore.
##
## Spessore, lunghezza, buco, colore, punto: chi ha una mira sua vuole anche il
## suo mirino, e un mirino imposto è la prima cosa che fa sentire un gioco
## altrui. Si ricostruisce quando le impostazioni cambiano, non al riavvio.
func _build_crosshair() -> void:
	if _crosshair == null:
		return
	_clear(_crosshair)
	var st := SettingsScript.new()
	var th: float = float(st.get_value("crosshair_thickness"))
	var ln: float = float(st.get_value("crosshair_length"))
	var gap: float = float(st.get_value("crosshair_gap"))
	var col: Color = st.get_value("crosshair_color")

	for i in 4:
		var tick := ColorRect.new()
		tick.color = col
		var horizontal := i < 2
		tick.size = Vector2(ln, th) if horizontal else Vector2(th, ln)
		match i:
			0: tick.position = Vector2(-gap - ln, -th * 0.5)
			1: tick.position = Vector2(gap, -th * 0.5)
			2: tick.position = Vector2(-th * 0.5, -gap - ln)
			3: tick.position = Vector2(-th * 0.5, gap)
		_crosshair.add_child(tick)

	if bool(st.get_value("crosshair_dot")):
		var dot := ColorRect.new()
		dot.color = col
		dot.size = Vector2(th, th)
		dot.position = Vector2(-th * 0.5, -th * 0.5)
		_crosshair.add_child(dot)


## Il pannello del poligono: le tre prove, con quella fatta barrata.
##
## Sta a sinistra e non al centro, e non lampeggia: e' un promemoria, non un
## maestro. Quando sono tutte fatte sparisce da solo — il poligono resta aperto,
## ma smette di chiedere.
func show_drills(rows: Array) -> void:
	_drop(_drills)
	if rows.is_empty():
		_drills = null
		return
	_drills = VBoxContainer.new()
	_drills.set_anchors_preset(Control.PRESET_CENTER_LEFT)
	_drills.position = Vector2(34, -60)
	_drills.add_theme_constant_override("separation", 6)
	_drills.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_drills)
	for r in rows:
		var box := VBoxContainer.new()
		box.add_theme_constant_override("separation", 0)
		var head := HBoxContainer.new()
		head.add_theme_constant_override("separation", 8)
		var mark: bool = bool(r.get("done", false))
		head.add_child(UI.label("✓" if mark else "○", 15, UI.GOOD if mark else UI.TEXT_FAINT))
		head.add_child(UI.label(String(r.get("title", "")), 14, UI.TEXT_DIM if mark else UI.TEXT))
		var p := String(r.get("progress", ""))
		if not p.is_empty():
			head.add_child(UI.label(p, 12, UI.ACCENT))
		box.add_child(head)
		if not mark:
			var line := UI.label("     " + String(r.get("line", "")), 11, UI.TEXT_FAINT)
			line.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			line.custom_minimum_size = Vector2(300, 0)
			box.add_child(line)
		_drills.add_child(box)


## La rotella dei segnali. `picked` è il settore puntato, o -1 per nessuno.
##
## Si disegna al centro perché è lì che sta il mouse quando la apri: una rotella
## in un angolo obbliga a cercarla, e in un fight nessuno cerca niente.
func show_wheel(picked: int, labels: Dictionary, angles: Dictionary) -> void:
	if _wheel == null:
		_wheel = Control.new()
		_wheel.set_anchors_preset(Control.PRESET_CENTER)
		_wheel.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(_wheel)
	_clear(_wheel)
	for k in labels:
		var deg: float = float(angles.get(k, 0.0))
		var rad := deg_to_rad(deg)
		var at := Vector2(sin(rad), -cos(rad)) * 118.0
		var chosen: bool = int(k) == picked
		var l := UI.label(String(labels[k]), 15 if chosen else 13, UI.ACCENT if chosen else UI.TEXT_DIM)
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		l.size = Vector2(180, 22)
		l.position = at - Vector2(90, 11)
		_wheel.add_child(l)


func hide_wheel() -> void:
	_drop(_wheel)
	_wheel = null


## Un segnale ricevuto. Va nella stessa colonna del kill feed: sono la stessa
## cosa — righe che dicono cosa è successo, non cosa fare.
func push_signal(text: String) -> void:
	push_feed(text)


func set_ping(ms: int) -> void:
	_ping_ms = ms


func hide_drills() -> void:
	_drop(_drills)
	_drills = null


## Il tabellone, su `T`. Sotto ogni avversario ci sono LE ABILITÀ CON CUI TI
## HA COLPITO: è così che si impara il kit degli altri senza che nessuno lo
## spieghi, ed è l'unico posto in partita dove il gioco dice qualcosa in più.
func show_scoreboard(rows: Array) -> void:
	hide_scoreboard()
	_scoreboard = Control.new()
	_scoreboard.set_anchors_preset(Control.PRESET_FULL_RECT)
	_scoreboard.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_scoreboard)

	var dim := ColorRect.new()
	dim.color = Color(0.02, 0.03, 0.05, 0.72)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	_scoreboard.add_child(dim)

	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	_scoreboard.add_child(center)
	var col := VBoxContainer.new()
	col.custom_minimum_size = Vector2(700, 0)
	center.add_child(col)

	var head := HBoxContainer.new()
	for h in [["PLAYER", 300], ["KILLS", 100], ["DEATHS", 100], ["PING", 100]]:
		var l := UI.eyebrow(String(h[0]))
		l.custom_minimum_size = Vector2(float(h[1]), 0)
		head.add_child(l)
	col.add_child(head)
	col.add_child(UI.rule(700))

	for r in rows:
		var line := HBoxContainer.new()
		var mine: bool = bool(r.get("mine", false))
		for cell in [
			[String(r.get("name", "")), 300],
			[str(int(r.get("score", 0))), 100],
			[str(int(r.get("deaths", 0))), 100],
			["%d ms" % int(r.get("ping", 0)), 100],
		]:
			var l := UI.label(String(cell[0]), 15, UI.ACCENT if mine else UI.TEXT_DIM)
			l.custom_minimum_size = Vector2(float(cell[1]), 24)
			line.add_child(l)
		col.add_child(line)
		var hits := String(r.get("hit_you_with", ""))
		if not hits.is_empty():
			col.add_child(UI.label("      " + hits, 11, UI.TEXT_FAINT))


func hide_scoreboard() -> void:
	_drop(_scoreboard)
	_scoreboard = null


## Il recap di morte. Sta QUI e non durante il fight per una ragione precisa:
## il gioco non insegna mentre giochi. In partita c'è solo quello che dice cosa
## è successo, mai cosa fare — e questo è il momento in cui "cosa è successo" è
## l'unica cosa che serve sapere.
func show_death_recap(killer: String, breakdown: Array, dealt: float, seconds: float) -> void:
	hide_death_recap()
	_recap = Control.new()
	_recap.set_anchors_preset(Control.PRESET_FULL_RECT)
	_recap.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_recap)

	var dim := ColorRect.new()
	dim.color = Color(0.35, 0.02, 0.04, 0.30)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	_recap.add_child(dim)

	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	_recap.add_child(center)
	var col := VBoxContainer.new()
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	center.add_child(col)

	var head := UI.label("KILLED BY  %s" % killer, 26, COL_HP)
	head.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	head.custom_minimum_size = Vector2(520, 0)
	col.add_child(head)

	var parts := []
	for b in breakdown:
		parts.append("%s %d" % [String(b.get("name", "")), int(b.get("damage", 0))])
	var line := UI.label(" · ".join(parts), 14, UI.TEXT_DIM)
	line.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	line.custom_minimum_size = Vector2(520, 0)
	col.add_child(line)

	var mine := UI.label("You dealt %d." % int(dealt), 14, UI.TEXT_FAINT)
	mine.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	mine.custom_minimum_size = Vector2(520, 0)
	col.add_child(mine)

	col.add_child(UI.spacer(14))
	_recap_label = UI.label("%.0f" % ceilf(seconds), 44, COL_READY)
	_recap_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_recap_label.custom_minimum_size = Vector2(520, 0)
	col.add_child(_recap_label)
	_recap_left = seconds


func hide_death_recap() -> void:
	_drop(_recap)
	_recap = null
	_recap_label = null


## Il contatore combo, SOPRA LA TESTA DI CHI VOLA e non al centro dello schermo.
##
## È l'unica cosa "in più" concessa in partita, e c'è perché PREMIA, non insegna.
## Al centro sarebbe un widget; sopra la vittima è parte di quello che sta
## succedendo, e dice anche a chi guarda da fuori chi ce l'ha in mano.
func combo_at(world_pos: Vector3) -> void:
	_combo_world = world_pos
	_combo_has_world = true


func _on_cast(_ability_name: String, hits: int) -> void:
	if hits <= 0:
		return
	_hitmark_t = 0.16
	_combo += hits
	_combo_t = 1.4
	_combo_label.text = "x%d" % _combo


func _process(delta: float) -> void:
	if _player == null:
		return

	# Vita
	var hp: float = _player.get("hp") if _player.has_method("get") else Combat.HP_MAX
	if hp == null:
		hp = Combat.HP_MAX
	var frac: float = clampf(hp / Combat.HP_MAX, 0.0, 1.0)
	_hp_bar.size.x = 232.0 * frac
	_hp_num.text = str(int(round(hp)))

	# Cooldown: il riquadro si riempie dal basso.
	var cds = _player.get("_cooldowns")
	var now: float = _player.get("_clock") if _player.get("_clock") != null else 0.0
	var pending = _player.get("_pending_cast")
	if pending is Dictionary and not pending.is_empty():
		var duration := maxf(float(pending.get("duration", 0.0)), 0.001)
		var progress := clampf((now - float(pending.get("started", now))) / duration, 0.0, 1.0)
		_cast_meter.size.x = 180.0 * progress
		_cast_banner.modulate.a = 1.0
		_cast_meter_back.modulate.a = 1.0
		_cast_meter.modulate.a = 1.0
	else:
		_cast_t = maxf(0.0, _cast_t - delta)
		var cast_alpha := clampf(_cast_t / 0.18, 0.0, 1.0)
		if _cast_banner:
			_cast_banner.modulate.a = cast_alpha
		if _cast_meter_back:
			_cast_meter_back.modulate.a = cast_alpha
		if _cast_meter:
			_cast_meter.modulate.a = cast_alpha
			if _cast_t <= 0.0:
				_cast_meter.size.x = 0.0
	if cds != null:
		for i in _slots.size():
			var left: float = cds.remaining(_slots[i]["id"], now)
			var total: float = float(_slots[i]["cd"])
			var remaining_frac: float = 0.0 if total <= 0.0 else clampf(left / total, 0.0, 1.0)
			var h: float = _slots[i]["icon_h"]
			var shade: ColorRect = _slots[i]["shade"]
			shade.size.y = h * remaining_frac
			var cd_text: Label = _slots[i]["cd_text"]
			cd_text.text = str(int(ceilf(left))) if left > 0.05 else ""

	# L'arma corrente e' dichiarata sopra il suo gruppo. Il giocatore non deve
	# dedurla dalla forma del modello mentre sta mirando.
	var active_weapon := String(_player.get("_weapon")) if _player else ""
	for family in _weapon_headers:
		var header: Label = _weapon_headers[family]
		var weapon := String(family).to_lower()
		var active: bool = family != "UTILITY" and active_weapon == weapon
		header.text = "%s  ·  %s" % [family, "ACTIVE" if active else ("" if family == "UTILITY" else "TAB")]
		header.add_theme_color_override(
			"font_color", FAMILY_COLORS[family] if active or family == "UTILITY" else Color(1, 1, 1, 0.42)
		)

	# Ping e FPS. Gli FPS si mediano: un numero che salta fra 58 e 61 dieci volte
	# al secondo non è un'informazione, è rumore.
	if _netstat:
		_fps_smooth = lerpf(_fps_smooth, float(Engine.get_frames_per_second()), 0.08)
		_netstat.text = "%d ms   %d fps" % [_ping_ms, int(round(_fps_smooth))]
		# Sopra i 120 ms il ping si accende: sotto non cambia niente di quello
		# che senti, sopra sì.
		_netstat.add_theme_color_override(
			"font_color", COL_HP if _ping_ms > 120 else Color(1, 1, 1, 0.38)
		)

	# Il conto alla rovescia del respawn scorre: un numero fermo mentre aspetti
	# è un numero che non dice se il gioco è ancora vivo.
	if _recap_left > 0.0:
		_recap_left -= delta
		if _recap_label and is_instance_valid(_recap_label):
			_recap_label.text = "%.0f" % maxf(ceilf(_recap_left), 0.0)
		if _recap_left <= 0.0:
			hide_death_recap()

	# Le righe del feed sbiadiscono e se ne vanno.
	for entry in _feed.duplicate():
		entry["t"] = float(entry["t"]) - delta
		var node = entry["node"]
		if not is_instance_valid(node):
			_feed.erase(entry)
			continue
		node.modulate.a = clampf(float(entry["t"]) / 1.2, 0.0, 1.0)
		if float(entry["t"]) <= 0.0:
			node.queue_free()
			_feed.erase(entry)

	# Conferma di colpo e combo svaniscono da soli.
	if _hitmark_t > 0.0:
		_hitmark_t -= delta
		_hitmark.modulate.a = clampf(_hitmark_t / 0.16, 0.0, 1.0)
	if _combo_t > 0.0:
		_combo_t -= delta
		_combo_label.modulate.a = clampf(_combo_t / 1.4, 0.0, 1.0)
		# Segue la vittima: si proietta il punto del mondo sullo schermo, e se
		# finisce dietro la camera si nasconde invece di comparire specchiato
		# dalla parte sbagliata.
		if _combo_has_world and _player and is_instance_valid(_player):
			var cam := _player.get_node_or_null("Camera3D") as Camera3D
			if cam:
				if cam.is_position_behind(_combo_world):
					_combo_label.modulate.a = 0.0
				else:
					var p := cam.unproject_position(_combo_world)
					var vp := get_viewport().get_visible_rect().size
					_combo_label.position = p - vp * 0.5 - Vector2(14, 52)
		if _combo_t <= 0.0:
			_combo = 0
			_combo_has_world = false
