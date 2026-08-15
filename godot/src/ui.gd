## Lo stile dell'interfaccia, in un posto solo.
##
## PERCHE' NON UN TEMA DI GODOT. Un tema copre i controlli standard; qui meta'
## dei pezzi sono composti a mano (le tessere delle modalita', gli slot delle
## abilita', le righe del kill feed) e un tema non li raggiunge. Queste sono le
## fabbriche che li costruiscono, e sono l'unico posto dove vivono i colori.
##
## LA REGOLA E' LA STESSA DEL MONDO: **fondo desaturato, azioni sature.** Un menu
## dove ogni bottone e' colorato e' un menu dove non si capisce quale premere. Qui
## c'e' UN accento — l'arancione delle torce — e tutto il resto e' grigio-blu.
##
## E il testo di gioco e' **tutto in inglese**, sempre: i nomi delle classi, delle
## sottoclassi e delle abilita' sono nomi propri e non si traducono mai.
extends RefCounted

const BG := Color(0.043, 0.051, 0.078)
const PANEL := Color(0.075, 0.086, 0.118)
const PANEL_HI := Color(0.12, 0.135, 0.175)
const LINE := Color(1, 1, 1, 0.09)

const TEXT := Color(0.93, 0.94, 0.96)
const TEXT_DIM := Color(0.93, 0.94, 0.96, 0.55)
const TEXT_FAINT := Color(0.93, 0.94, 0.96, 0.32)

## L'unico accento del gioco: il fuoco delle torce. Tutto quello che si puo'
## premere o che sta per succedere e' di questo colore, e nient'altro lo e'.
const ACCENT := Color(1.0, 0.46, 0.13)
const ACCENT_SOFT := Color(1.0, 0.46, 0.13, 0.16)
const DANGER := Color(1.0, 0.20, 0.27)
const GOOD := Color(0.31, 0.82, 0.45)

## I colori delle quattro classi. Servono SOLO nei menu: in partita il colore
## dice la squadra, mai la classe — due lingue di colore sullo stesso schermo si
## combattono, e il giocatore impara quella sbagliata.
const CLASS_COLOR := {
	"breaker": Color(0.85, 0.35, 0.22),
	"talon": Color(0.45, 0.78, 0.55),
	"warden": Color(0.55, 0.45, 0.88),
	"drift": Color(0.35, 0.72, 0.90),
}


static func panel(size: Vector2, color: Color = PANEL) -> PanelContainer:
	var p := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = color
	sb.corner_radius_top_left = 3
	sb.corner_radius_top_right = 3
	sb.corner_radius_bottom_left = 3
	sb.corner_radius_bottom_right = 3
	sb.border_color = LINE
	sb.set_border_width_all(1)
	sb.content_margin_left = 14
	sb.content_margin_right = 14
	sb.content_margin_top = 10
	sb.content_margin_bottom = 10
	p.add_theme_stylebox_override("panel", sb)
	p.custom_minimum_size = size
	return p


static func label(text: String, size: int, color: Color = TEXT) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	return l


## Un'etichetta in maiuscolo con le lettere staccate: e' la voce delle
## intestazioni, e si distingue dal testo corrente senza cambiare colore.
static func eyebrow(text: String) -> Label:
	var l := label(text.to_upper(), 11, TEXT_FAINT)
	l.add_theme_constant_override("line_spacing", 0)
	return l


## Un bottone. `primary` ne fa l'azione principale della schermata, e ce n'e'
## SEMPRE al massimo una: due bottoni che gridano uguale non sono una gerarchia.
static func button(text: String, primary: bool = false, width: float = 0.0) -> Button:
	var b := Button.new()
	b.text = text
	b.focus_mode = Control.FOCUS_ALL
	b.add_theme_font_size_override("font_size", 20 if primary else 14)
	b.custom_minimum_size = Vector2(width, 52 if primary else 34)

	for state in ["normal", "hover", "pressed", "focus", "disabled"]:
		var sb := StyleBoxFlat.new()
		sb.corner_radius_top_left = 3
		sb.corner_radius_top_right = 3
		sb.corner_radius_bottom_left = 3
		sb.corner_radius_bottom_right = 3
		sb.content_margin_left = 22
		sb.content_margin_right = 22
		sb.content_margin_top = 8
		sb.content_margin_bottom = 8
		if primary:
			sb.bg_color = ACCENT
			if state == "hover" or state == "focus":
				sb.bg_color = ACCENT.lightened(0.14)
			if state == "pressed":
				sb.bg_color = ACCENT.darkened(0.18)
			if state == "disabled":
				sb.bg_color = PANEL_HI
		else:
			sb.bg_color = PANEL if state == "normal" else PANEL_HI
			sb.border_color = ACCENT_SOFT if state in ["hover", "focus"] else LINE
			sb.set_border_width_all(1)
		b.add_theme_stylebox_override(state, sb)

	b.add_theme_color_override("font_color", BG if primary else TEXT)
	b.add_theme_color_override("font_hover_color", BG if primary else TEXT)
	b.add_theme_color_override("font_pressed_color", BG if primary else TEXT)
	b.add_theme_color_override("font_focus_color", BG if primary else TEXT)
	b.add_theme_color_override("font_disabled_color", TEXT_FAINT)
	return b


## Una riga orizzontale sottile. Serve a separare senza aggiungere una scatola:
## una cornice in piu' e' rumore, una riga e' una pausa.
static func rule(width: float = 0.0) -> ColorRect:
	var r := ColorRect.new()
	r.color = LINE
	r.custom_minimum_size = Vector2(width, 1)
	return r


static func spacer(h: float) -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(0, h)
	return c


## Un cursore con il suo valore scritto accanto. Il valore si vede SEMPRE, e non
## solo mentre lo trascini: un cursore senza numero e' una scelta che non si puo'
## rifare uguale domani.
static func slider(
	from: float, to: float, step: float, value: float, fmt: String = "%.2f"
) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	var s := HSlider.new()
	s.name = "Slider"
	s.min_value = from
	s.max_value = to
	s.step = step
	s.value = value
	s.custom_minimum_size = Vector2(230, 20)
	s.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	row.add_child(s)
	var v := label(fmt % value, 13, TEXT_DIM)
	v.name = "Value"
	v.custom_minimum_size = Vector2(74, 0)
	row.add_child(v)
	s.value_changed.connect(func(x): v.text = fmt % x)
	return row


static func checkbox(text: String, on: bool) -> CheckBox:
	var c := CheckBox.new()
	c.text = text
	c.button_pressed = on
	c.add_theme_font_size_override("font_size", 14)
	c.add_theme_color_override("font_color", TEXT_DIM)
	c.add_theme_color_override("font_hover_color", TEXT)
	c.add_theme_color_override("font_pressed_color", TEXT)
	return c


## Il fondo di ogni schermata: nero-blu pieno, con una vignettatura calda in
## basso che ricorda le torce dell'arena. Senza, il menu e' un'altra
## applicazione rispetto al gioco.
static func background() -> Control:
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	var art_path := "res://assets/ui/sfondo.webp"
	if ResourceLoader.exists(art_path):
		var art := TextureRect.new()
		art.texture = load(art_path)
		art.set_anchors_preset(Control.PRESET_FULL_RECT)
		art.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		art.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
		root.add_child(art)
	else:
		var flat := ColorRect.new()
		flat.color = BG
		flat.set_anchors_preset(Control.PRESET_FULL_RECT)
		root.add_child(flat)

	var shade := ColorRect.new()
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	var sh := Shader.new()
	sh.code = """
shader_type canvas_item;
void fragment() {
	// L'art resta visibile, ma a destra diventa il fondale leggibile dei menu.
	float right = smoothstep(0.42, 0.86, UV.x);
	float edge = smoothstep(0.9, 0.35, distance(UV, vec2(0.5)));
	float a = clamp(0.20 + right * 0.64 + (1.0 - edge) * 0.18, 0.0, 0.88);
	COLOR = vec4(0.025, 0.03, 0.055, a);
}
"""
	var mat := ShaderMaterial.new()
	mat.shader = sh
	shade.material = mat
	root.add_child(shade)
	return root
