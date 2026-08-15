## L'arma in mano, in prima persona.
##
## Una prima persona che non disegna niente del giocatore è una telecamera che
## galleggia in una stanza, ed è il singolo segnale più forte di "questo è un
## prototipo". Prima qui c'erano due parallelepipedi bianchi: nel frame
## renderizzato erano una barra verticale che tagliava lo schermo in due.
##
## PERCHE' UN VIEWPORT SUO E NON UN NODO ATTACCATO ALLA CAMERA.
## Un'arma disegnata nella stessa scena del mondo fa due cose sbagliate, e le fa
## sempre: **compenetra i muri** quando ti ci appoggi, e **usa il campo visivo
## del mondo** — a 110 gradi un oggetto a mezzo metro dall'occhio si deforma
## fino a non sembrare più un oggetto. Qui l'arma vive in un mondo suo, con una
## camera sua a FOV piu' stretto, e viene disegnata SOPRA il gioco.
##
## Le tre cose che la fanno sembrare tenuta in mano invece che incollata allo
## schermo — sway, bob e dip — restano nel giocatore, perche' vengono dal suo
## movimento. Qui c'e' solo la scena che le riceve.
extends Node

## Quanto e' lunga l'arma a schermo, in metri, davanti alla camera del
## viewmodel. E' una lunghezza normalizzata e non un moltiplicatore di scala:
## un modello nuovo entra senza ritarare niente.
const WEAPON_LENGTH_M := 0.55

## Il campo visivo dell'arma, indipendente da quello del mondo. Chi gioca a 110
## gradi vuole l'arma piu' piccola, non piu' distorta.
const VIEWMODEL_FOV := 62.0

## La posa di riposo: in basso a destra, inclinata. Non e' un gusto — un'arma
## centrata copre il mirino, e un'arma orizzontale non ha profondita'.
const REST_POS := Vector3(0.21, -0.26, -0.52)
## Le armi KayKit hanno la lama lungo il proprio +Y: 90 gradi su X la fanno
## puntare in avanti, lontano dalla camera. Senza, la si guarda di taglio e
## sembra un'asse — nel primo frame renderizzato era esattamente cosi'.
const REST_ROT := Vector3(78.0, 7.0, -9.0)

var root: Node3D = null
var camera: Camera3D = null

var _viewport: SubViewport = null
var _weapon: Node3D = null
var _current := ""


## Costruisce il viewport, la sua camera e il pannello che lo disegna sopra il
## mondo. `parent` è il giocatore: il pannello va su un CanvasLayer suo, sotto
## l'HUD ma sopra il 3D.
func build(parent: Node) -> void:
	_viewport = SubViewport.new()
	_viewport.transparent_bg = true
	_viewport.own_world_3d = true
	_viewport.handle_input_locally = false
	_viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	_viewport.size = Vector2i(1280, 720)
	parent.add_child(_viewport)

	camera = Camera3D.new()
	camera.fov = VIEWMODEL_FOV
	camera.near = 0.01
	camera.far = 12.0
	_viewport.add_child(camera)

	root = Node3D.new()
	root.name = "Hand"
	root.position = REST_POS
	root.rotation_degrees = REST_ROT
	_viewport.add_child(root)

	# Una luce sua, altrimenti l'arma è nera: il mondo del viewport non vede né
	# la luna né le torce dell'arena.
	var key := DirectionalLight3D.new()
	key.light_energy = 1.5
	key.light_color = Color(1.0, 0.92, 0.82)
	key.rotation_degrees = Vector3(-32, 148, 0)
	_viewport.add_child(key)
	var fill := DirectionalLight3D.new()
	fill.light_energy = 0.55
	# Il riempimento è arancione come le torce: è l'unica luce calda dell'arena,
	# e l'arma deve appartenere allo stesso posto in cui la stai usando.
	fill.light_color = Color(1.0, 0.6, 0.32)
	fill.rotation_degrees = Vector3(18, -40, 0)
	_viewport.add_child(fill)

	# Il pannello che porta il viewport a schermo, sotto l'HUD.
	var layer := CanvasLayer.new()
	layer.layer = 5
	parent.add_child(layer)
	var rect := TextureRect.new()
	rect.texture = _viewport.get_texture()
	rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	rect.stretch_mode = TextureRect.STRETCH_SCALE
	rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(rect)


## Mette in mano un'arma. Il cambio è istantaneo di proposito: un tempo di
## estrazione trasformerebbe otto abilità in due gruppi che non si mescolano.
func equip(weapon: String) -> void:
	if root == null or weapon == _current or weapon == "none":
		return
	_current = weapon
	if _weapon and is_instance_valid(_weapon):
		_weapon.queue_free()
	var packed: PackedScene = load("res://assets/weapons/%s.glb" % weapon)
	if packed == null:
		return
	_weapon = packed.instantiate()
	root.add_child(_weapon)
	_fit(_weapon, WEAPON_LENGTH_M if weapon != "staff" else WEAPON_LENGTH_M * 1.5)


## Porta il modello a una lunghezza a schermo nota, qualunque scala nativa abbia.
func _fit(node: Node3D, length: float) -> void:
	var box := _bounds(node)
	var longest: float = maxf(maxf(box.size.x, box.size.y), box.size.z)
	if longest <= 0.001:
		return
	var k: float = length / longest
	node.scale = node.scale * k
	# L'IMPUGNATURA va nel punto di riposo, non il centro dell'arma: centrando
	# sull'ingombro, meta' della lama finisce dietro la camera e si vede solo la
	# punta spuntare dal nulla.
	var c := box.get_center()
	node.position = Vector3(-c.x * k, -box.position.y * k, -c.z * k)


func _bounds(from: Node) -> AABB:
	var box := AABB()
	var first := true
	var stack: Array = [[from, Transform3D.IDENTITY]]
	while not stack.is_empty():
		var item: Array = stack.pop_back()
		var n = item[0]
		var xform: Transform3D = item[1]
		if n is Node3D:
			xform = xform * (n as Node3D).transform
		for c in n.get_children():
			stack.append([c, xform])
		if n is MeshInstance3D:
			var a: AABB = xform * (n as MeshInstance3D).get_aabb()
			if first:
				box = a
				first = false
			else:
				box = box.merge(a)
	return box


## Il viewport segue la finestra: un pannello che scala una texture 1280×720 su
## uno schermo 4K sfoca l'arma e nient'altro.
func resize(to: Vector2i) -> void:
	if _viewport and to.x > 0 and to.y > 0:
		_viewport.size = to
