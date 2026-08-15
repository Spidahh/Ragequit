## La radice del gioco: le schermate, l'arena, e il passaggio fra le due.
##
## PERCHE' UNA RADICE E NON DUE SCENE CHE SI SOSTITUISCONO. Passando da una scena
## all'altra si perde tutto quello che non e' nella scena — chi hai scelto, le
## impostazioni, il progresso — e si finisce per rimetterlo in un singleton a
## parte. Qui la radice resta, l'arena e' un figlio che nasce e muore, e la
## scelta della build vive dove viene fatta.
##
## LA REGOLA: **dal click su PLAY al primo colpo passa un click solo.** Non c'e'
## una schermata di caricamento, non c'e' una coda, non c'e' una conferma. Si
## preme e si e' dentro.
extends Node

const ScreensScript := preload("res://src/screens.gd")
const MatchRules := preload("res://src/match_rules.gd")
const Sfx := preload("res://src/sfx.gd")
const ServerScript := preload("res://src/server_main.gd")

const ARENA := "res://scenes/arena.tscn"

var screens: CanvasLayer = null
var arena: Node3D = null


func _ready() -> void:
	# IL SERVER PARTE DA QUI, non da una scena sua.
	#
	# L'esportatore non permette di cambiare la scena principale per preset,
	# quindi la radice e' la stessa e si biforca al primo frame. `--server`
	# serve per provarlo in locale; `dedicated_server` e' la funzionalita' che
	# Godot accende da sola sull'esportato del server, ed e' quella che conta in
	# produzione — un flag dimenticato nel comando di avvio farebbe partire un
	# client senza schermo su una macchina senza schermo.
	# Sia prima sia dopo il `--`: chi lancia a mano lo mette di la', il servizio
	# lo passa di qua, e cercarlo in un solo posto vuol dire un avvio su due che
	# parte come client senza dirlo.
	var argv := OS.get_cmdline_args() + OS.get_cmdline_user_args()
	if OS.has_feature("dedicated_server") or "--server" in argv:
		var srv := ServerScript.new()
		srv.name = "Server"
		add_child(srv)
		return

	screens = ScreensScript.new()
	screens.name = "Screens"
	add_child(screens)
	screens.play_requested.connect(_start_match)
	screens.range_requested.connect(_start_range)
	# Nei menu il mouse serve: catturarlo qui vorrebbe dire non poter premere
	# niente, ed e' il classico avvio in cui "il gioco non risponde".
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE


func _start_match(mode: int, class_id: String, sub_id: String, kit_ids: Array) -> void:
	_open_arena(mode, class_id, sub_id, kit_ids, false)


## Il poligono: la stessa arena, senza punteggio e senza morte. E' l'unico posto
## dove il gioco insegna, e ci si arriva anche dalla schermata della build —
## si prova quello che si e' appena scelto senza uscire dal flusso.
func _start_range() -> void:
	_open_arena(MatchRules.Mode.SOLO, screens.class_id, screens.sub_id, screens.kit_ids, true)


func _open_arena(
	mode: int, class_id: String, sub_id: String, kit_ids: Array, practice: bool
) -> void:
	if arena and is_instance_valid(arena):
		arena.queue_free()
	var packed: PackedScene = load(ARENA)
	if packed == null:
		push_error("main: %s non caricata" % ARENA)
		return
	arena = packed.instantiate()
	arena.set("practice", practice)
	arena.set("match_mode", mode)
	add_child(arena)
	# Main resta la scena corrente per tutta la sessione. L'arena e' un suo
	# figlio temporaneo: assegnarla a `current_scene` dopo `add_child` e'
	# illegale in Godot (la scena corrente deve essere figlia diretta di root) e
	# produceva un errore ogni volta che si premeva PLAY nella build web.

	var player := arena.get_node_or_null("Player")
	if player and player.has_method("equip"):
		player.equip(class_id, sub_id, kit_ids)

	if arena.has_signal("match_finished"):
		arena.match_finished.connect(_on_match_finished, CONNECT_ONE_SHOT)

	screens.visible = false
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


func _on_match_finished(rows: Array, won: bool, stats: Dictionary) -> void:
	screens.progress.finish_match(won)
	if arena and is_instance_valid(arena):
		arena.queue_free()
		arena = null
	screens.visible = true
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	screens.show_results(rows, won, stats)


## `Esc` esce dall'arena e torna al menu. Il gioco NON si mette in pausa: e'
## multigiocatore, e una pausa che ferma solo te e' una pausa che ti fa uccidere.
func _unhandled_input(event: InputEvent) -> void:
	if not (event is InputEventKey and event.pressed and not event.echo):
		return
	if event.keycode != KEY_ESCAPE:
		return
	if arena == null or not is_instance_valid(arena):
		return
	arena.queue_free()
	arena = null
	screens.visible = true
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	screens.show_screen(ScreensScript.Screen.MENU)
