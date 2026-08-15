## Fotografa le schermate. Un menu si giudica guardandolo, ma i numeri di
## luminanza dicono se sta dentro la stessa notte dell'arena o se e' una
## schermata di sistema incollata sopra un gioco.
extends SceneTree

const ScreensScript = preload("res://src/screens.gd")

const SHOTS = ["menu", "roster", "build", "settings", "results"]

var _screens: CanvasLayer
var _i := 0
var _f := 0


func _init() -> void:
	_screens = ScreensScript.new()
	root.add_child(_screens)
	_place(0)


func _place(i: int) -> void:
	match SHOTS[i]:
		"menu":
			_screens.show_screen(ScreensScript.Screen.MENU)
		"roster":
			_screens.show_screen(ScreensScript.Screen.ROSTER)
		"build":
			_screens.show_screen(ScreensScript.Screen.BUILD)
		"settings":
			_screens.show_screen(ScreensScript.Screen.SETTINGS)
		"results":
			_screens.show_results(
				[
					{"name": "YOU", "score": 25, "deaths": 9, "mine": true, "best": "Uppercut"},
					{"name": "ASH", "score": 18, "deaths": 25, "mine": false, "best": "Cleave"},
					{"name": "VULTURE", "score": 14, "deaths": 21, "mine": false, "best": "Volley"},
				],
				true,
				{"streak": 4, "juggle": 3, "accuracy": 41}
			)


func _process(_d: float) -> bool:
	_f += 1
	if _f < 8:
		return false
	var img := root.get_texture().get_image()
	img.save_png("res://../.verify/ui-%s.png" % SHOTS[_i])
	print("  salvata ui-%s" % SHOTS[_i])
	_i += 1
	if _i >= SHOTS.size():
		quit(0)
		return true
	_place(_i)
	_f = 0
	return false
