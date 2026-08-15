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


## I tasti degli otto slot, nell'ordine in cui stanno sotto le dita.
const SLOT_KEYS := ["1", "2", "3", "4", "Q", "E", "R", "F"]


func setup(player: Node) -> void:
	_player = player
	if player.has_signal("cast_resolved"):
		player.cast_resolved.connect(_on_cast)
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
	_bar = Control.new()
	_bar.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	_bar.position = Vector2(0, -84)
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
	for child in _bar.get_children():
		child.queue_free()
	_slots.clear()

	var kit: Array = _player.kit() if _player.has_method("kit") else []
	var bar := _bar
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
		key.text = SLOT_KEYS[i] if i < SLOT_KEYS.size() else str(i + 1)
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
		_slots.append({"id": kit[i].id, "fill": fill, "h": w, "cd": float(kit[i].cooldown)})

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
		for i in _slots.size():
			var left: float = cds.remaining(_slots[i]["id"], now)
			var total: float = float(_slots[i]["cd"])
			var ready_frac: float = 1.0 if total <= 0.0 else clampf(1.0 - left / total, 0.0, 1.0)
			var h: float = _slots[i]["h"]
			var fill: ColorRect = _slots[i]["fill"]
			fill.size.y = h * ready_frac
			fill.position.y = h - h * ready_frac
			fill.color = COL_READY if ready_frac >= 1.0 else COL_COOLING

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
		if _combo_t <= 0.0:
			_combo = 0
