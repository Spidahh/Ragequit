## Genera scenes/server.tscn: la radice del server dedicato.
extends SceneTree
func _init() -> void:
	var root := Node.new()
	root.name = "Server"
	root.set_script(load("res://src/server_main.gd"))
	var packed := PackedScene.new()
	packed.pack(root)
	var err := ResourceSaver.save(packed, "res://scenes/server.tscn")
	print("server.tscn %s" % ("scritta" if err == OK else "FALLITA %d" % err))
	quit(0)
