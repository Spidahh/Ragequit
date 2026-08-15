## Misura i corpi in gioco invece di dedurli: un personaggio alto la metà del
## dovuto non dà nessun errore, si vede solo in un frame renderizzato.
extends SceneTree

const CharacterScript = preload("res://src/character.gd")


func _init() -> void:
	var holder := Node3D.new()
	root.add_child(holder)
	for cls in ["breaker", "talon", "warden", "drift"]:
		var ch = CharacterScript.new()
		holder.add_child(ch)
		ch.setup(cls, Color.RED)
		var box: AABB = ch._bounds(ch)
		var m = ch._model
		print(
			"%-8s altezza %.2f m  y da %.2f a %.2f  scala %.4f  clip=%s  arma=%s" % [
				cls, box.size.y, box.position.y, box.position.y + box.size.y,
				m.scale.x if m else 0.0,
				ch._current,
				str(ch._skel.get_child_count() if ch._skel else 0),
			]
		)
		ch.queue_free()
	quit(0)
