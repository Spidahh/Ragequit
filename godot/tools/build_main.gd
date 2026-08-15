## Genera scenes/main.tscn: la radice del gioco.
extends SceneTree
func _init() -> void:
	var root := Node.new()
	root.name = "Main"
	root.set_script(load("res://src/main.gd"))
	var packed := PackedScene.new()
	packed.pack(root)
	var err := ResourceSaver.save(packed, "res://scenes/main.tscn")
	print("main.tscn %s" % ("scritta" if err == OK else "FALLITA %d" % err))
	quit(0)
