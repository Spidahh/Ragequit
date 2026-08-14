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
var _crosshair: Control
var _hitmark: Control
var _hitmark_t := 0.0
var _combo := 0
var _combo_label: Label
var _combo_t := 0.0


func setup(player: Node) -> void:
	_player = player
	if player.has_signal("cast_resolved"):
		player.cast_resolved.connect(_on_cast)


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
	for i in 4:
		var tick := ColorRect.new()
		tick.color = Color(1, 1, 1, 0.85)
		var horizontal := i < 2
		tick.size = Vector2(9, 2) if horizontal else Vector2(2, 9)
		var off := 6.0
		match i:
			0: tick.position = Vector2(-off - 9, -1)
			1: tick.position = Vector2(off, -1)
			2: tick.position = Vector2(-1, -off - 9)
			3: tick.position = Vector2(-1, off)
		_crosshair.add_child(tick)

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
	var bar := Control.new()
	bar.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	bar.position = Vector2(0, -84)
	bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(bar)

	var kit := Combat.starter_kit()
	var w := 58.0
	var gap := 8.0
	var total := kit.size() * w + (kit.size() - 1) * gap
	for i in kit.size():
		var x := -total * 0.5 + i * (w + gap)
		var back := ColorRect.new()
		back.color = COL_PANEL
		back.size = Vector2(w, w)
		back.position = Vector2(x, 0)
		bar.add_child(back)
		# Il riempimento sale dal basso mentre il cooldown scorre: il tempo si
		# guarda, non si legge.
		var fill := ColorRect.new()
		fill.color = COL_READY
		fill.size = Vector2(w, w)
		fill.position = Vector2(x, 0)
		bar.add_child(fill)
		var key := Label.new()
		key.text = str(i + 1)
		key.position = Vector2(x + 5, -1)
		key.add_theme_font_size_override("font_size", 13)
		key.add_theme_color_override("font_color", Color(1, 1, 1, 0.75))
		bar.add_child(key)
		var nm := Label.new()
		nm.text = kit[i].name
		nm.position = Vector2(x, w + 2)
		nm.size = Vector2(w, 14)
		nm.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		nm.add_theme_font_size_override("font_size", 10)
		nm.add_theme_color_override("font_color", Color(1, 1, 1, 0.55))
		bar.add_child(nm)
		_slots.append({"id": kit[i].id, "fill": fill, "h": w})

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
	if cds != null:
		var kit := Combat.starter_kit()
		for i in _slots.size():
			var left: float = cds.remaining(_slots[i]["id"], now)
			var total: float = kit[i].cooldown
			var ready_frac: float = 1.0 if total <= 0.0 else clampf(1.0 - left / total, 0.0, 1.0)
			var h: float = _slots[i]["h"]
			var fill: ColorRect = _slots[i]["fill"]
			fill.size.y = h * ready_frac
			fill.position.y = h - h * ready_frac
			fill.color = COL_READY if ready_frac >= 1.0 else COL_COOLING

	# Conferma di colpo e combo svaniscono da soli.
	if _hitmark_t > 0.0:
		_hitmark_t -= delta
		_hitmark.modulate.a = clampf(_hitmark_t / 0.16, 0.0, 1.0)
	if _combo_t > 0.0:
		_combo_t -= delta
		_combo_label.modulate.a = clampf(_combo_t / 1.4, 0.0, 1.0)
		if _combo_t <= 0.0:
			_combo = 0
