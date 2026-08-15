## Verifica il passaggio reale menu -> arena. I test delle schermate controllano
## i segnali dei bottoni, ma in passato nessuno istanziava la radice completa:
## la build pubblica entrava in arena mostrando un errore che 20 test ignoravano.
extends SceneTree

const MainScene := preload("res://scenes/main.tscn")
const MatchRules := preload("res://src/match_rules.gd")

var failures := 0
var main: Node


func _check(what: String, ok: bool, detail: String) -> void:
	if ok:
		print("  ✓ %s — %s" % [what, detail])
	else:
		failures += 1
		printerr("  ✗ %s — %s" % [what, detail])


func _init() -> void:
	print("\n=== IL FLUSSO REALE ===\n")
	main = MainScene.instantiate()
	root.add_child(main)
	current_scene = main


func _process(_delta: float) -> bool:
	main._open_arena(MatchRules.Mode.SOLO, "breaker", "breaker_ram", [], true)
	var arena: Node3D = main.arena
	_check("l'arena nasce", arena != null, "istanziata da Main")
	_check("Main resta la scena corrente", current_scene == main, "nessun cambio scena illegale")
	_check("l'arena resta sotto Main", arena != null and arena.get_parent() == main, "gerarchia valida")

	var player = arena.get_node_or_null("Player") if arena else null
	_check("il giocatore esiste", player != null, "presente nella scena")
	_check(
		"proiettili e VFX usano l'arena",
		player != null and player._combat_world() == arena,
		"contenitore di combattimento corretto"
	)

	print("")
	if failures == 0:
		print("Tutto verde.\n")
		quit(0)
	else:
		printerr("%d rosso/i.\n" % failures)
		quit(1)
	return true
