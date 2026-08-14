## Renderizza l'arena e salva dei frame su disco.
##
## È l'equivalente del `tools/verify/shot.mjs` del progetto precedente, e serve
## alla stessa cosa: guardare il gioco invece di dedurlo dal codice. Il vecchio
## doveva combattere il render-loop rAF e leggere i pixel dalla canvas WebGL a
## mano; qui è una chiamata.
##
##   godot --path . --script res://tools/capture.gd
extends SceneTree

const OUT := "user://"
const SHOTS := [
	# nome, posizione del giocatore, yaw, pitch
	["spawn", Vector3(0, 0.9, 12), 0.0, 0.0],
	["cover", Vector3(6, 0.9, 2), -0.6, -0.05],
	["wall", Vector3(0, 0.9, -18), PI, 0.08],
]

var _arena: Node3D
var _player: CharacterBody3D
var _frame := 0
var _shot := 0


func _init() -> void:
	var packed: PackedScene = load("res://scenes/arena.tscn")
	if packed == null:
		printerr("arena.tscn non caricata")
		quit(1)
		return
	_arena = packed.instantiate()
	root.add_child(_arena)
	_player = _arena.get_node_or_null("Player")
	if _player == null:
		printerr("Player non trovato nella scena")
		quit(1)
		return
	_place(0)
	print("cattura avviata — %d inquadrature" % SHOTS.size())


func _place(i: int) -> void:
	var s: Array = SHOTS[i]
	_player.global_position = s[1]
	_player.rotation.y = s[2]
	var cam: Camera3D = _player.get_node("Camera3D")
	cam.rotation.x = s[3]


func _process(_delta: float) -> bool:
	_frame += 1
	# Qualche frame perché luci, ombre e glow si assestino.
	if _frame < 12:
		return false
	var img := root.get_texture().get_image()
	var name: String = SHOTS[_shot][0]
	var path := "res://../.verify/godot-%s.png" % name
	var err := img.save_png(path)
	if err != OK:
		printerr("salvataggio %s fallito: %d" % [path, err])
	else:
		print("  salvata %s (%dx%d)" % [path, img.get_width(), img.get_height()])
	_shot += 1
	if _shot >= SHOTS.size():
		quit(0)
		return true
	_place(_shot)
	_frame = 0
	return false
