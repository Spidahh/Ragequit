## Cattura il combattimento in azione: lancia le abilità e fotografa i VFX.
extends SceneTree

const SHOTS := [["beam", 0], ["burst", 2], ["bolt", 1]]
var _arena: Node3D
var _player: Node
var _i := 0
var _f := 0


func _init() -> void:
	_arena = (load("res://scenes/arena.tscn") as PackedScene).instantiate()
	root.add_child(_arena)
	current_scene = _arena
	_player = _arena.get_node_or_null("Player")


func _process(_d: float) -> bool:
	_f += 1
	if _f == 10:
		_player.global_position = Vector3(0, 0.9, 2)
		_player.rotation.y = 0.0
		_player.get_node("Camera3D").rotation.x = 0.0
		var dummy = _arena.get_node_or_null("DummyFermo")
		if dummy:
			dummy.global_position = Vector3(0, 0.9, -7)
	if _f > 12 and _i < SHOTS.size():
		var shot = SHOTS[_i]
		_player._clock += 10.0
		_player.cast_slot(shot[1])
		_f = 0
		# 3 frame dopo il lancio: i VFX sono ancora vivi.
		_i += 1
		return false
	if _f == 4 and _i > 0 and _i <= SHOTS.size():
		var img := root.get_texture().get_image()
		img.save_png("res://../.verify/fight-%s.png" % SHOTS[_i - 1][0])
		print("  salvata fight-%s.png" % SHOTS[_i - 1][0])
		if _i >= SHOTS.size():
			quit(0)
			return true
	return false
