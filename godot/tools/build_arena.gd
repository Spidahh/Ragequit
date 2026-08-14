## Costruisce e salva scenes/arena.tscn.
##
## Scritta come script invece che a mano: un .tscn scritto a mano è un formato di
## serializzazione, e sbagliarne la sintassi costa più tempo di quanto ne faccia
## risparmiare. Questo è anche riproducibile.
##
##   godot --headless --path . --script res://tools/build_arena.gd
extends SceneTree


func _init() -> void:
	var root := Node3D.new()
	root.name = "Arena"
	root.set_script(load("res://src/arena.gd"))

	# --- Ambiente -------------------------------------------------------------
	# QUESTO è il punto della migrazione. Nel progetto Three.js nebbia, bloom,
	# tonemap, esposizione e vignette erano ~700 righe di shader e pass scritti a
	# mano, con valori che NON facevano quello che i commenti dichiaravano: la
	# nebbia era 3 volte troppo rada per l'arena, la soglia del bloom stava sopra
	# quello che le torce raggiungevano davvero. Qui sono proprietà di una
	# risorsa, con default sensati.
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var sky_mat := ProceduralSkyMaterial.new()
	sky_mat.sky_top_color = Color(0.05, 0.07, 0.13)
	sky_mat.sky_horizon_color = Color(0.16, 0.13, 0.15)
	sky_mat.ground_bottom_color = Color(0.03, 0.03, 0.05)
	sky_mat.ground_horizon_color = Color(0.16, 0.13, 0.15)
	sky.sky_material = sky_mat
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.ambient_light_sky_contribution = 0.6
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.tonemap_exposure = 1.15
	env.glow_enabled = true
	env.glow_intensity = 0.55
	env.glow_bloom = 0.15
	# Densità tarata sull'arena (raggio ~25 m), non a occhio: a 40 m la geometria
	# si stacca dal fondo invece di fondercisi.
	env.fog_enabled = true
	env.fog_light_color = Color(0.10, 0.13, 0.19)
	env.fog_density = 0.012
	env.adjustment_enabled = true
	env.adjustment_saturation = 0.92
	env.adjustment_contrast = 1.08

	var we := WorldEnvironment.new()
	we.name = "WorldEnvironment"
	we.environment = env
	root.add_child(we)

	# --- Luce chiave ----------------------------------------------------------
	var sun := DirectionalLight3D.new()
	sun.name = "KeyLight"
	sun.light_color = Color(0.74, 0.78, 0.91)
	sun.light_energy = 1.6
	sun.shadow_enabled = true
	sun.rotation_degrees = Vector3(-52, 34, 0)
	root.add_child(sun)

	# --- Arena: pavimento e muro perimetrale ---------------------------------
	var ground_mat := StandardMaterial3D.new()
	ground_mat.albedo_color = Color(0.42, 0.36, 0.27)
	ground_mat.roughness = 0.95

	var wall_mat := StandardMaterial3D.new()
	wall_mat.albedo_color = Color(0.29, 0.16, 0.13)
	wall_mat.roughness = 0.9

	var ground := StaticBody3D.new()
	ground.name = "Ground"
	var gmesh := MeshInstance3D.new()
	var gbox := BoxMesh.new()
	gbox.size = Vector3(60, 1, 60)
	gmesh.mesh = gbox
	gmesh.material_override = ground_mat
	gmesh.position = Vector3(0, -0.5, 0)
	ground.add_child(gmesh)
	var gcol := CollisionShape3D.new()
	var gshape := BoxShape3D.new()
	gshape.size = Vector3(60, 1, 60)
	gcol.shape = gshape
	gcol.position = Vector3(0, -0.5, 0)
	ground.add_child(gcol)
	root.add_child(ground)

	# Quattro muri: danno all'arena un bordo e, soprattutto, danno allo sguardo
	# qualcosa a cui agganciare la distanza. Nel frame catturato dal vecchio
	# progetto non si capiva se una parete fosse a 5 o a 50 metri.
	for i in 4:
		var wall := StaticBody3D.new()
		wall.name = "Wall%d" % i
		var ang := i * PI * 0.5
		var pos := Vector3(sin(ang) * 26.0, 4.0, cos(ang) * 26.0)
		var size := Vector3(56, 8, 2) if i % 2 == 0 else Vector3(2, 8, 56)
		var wmesh := MeshInstance3D.new()
		var wbox := BoxMesh.new()
		wbox.size = size
		wmesh.mesh = wbox
		wmesh.material_override = wall_mat
		wall.add_child(wmesh)
		var wcol := CollisionShape3D.new()
		var wshape := BoxShape3D.new()
		wshape.size = size
		wcol.shape = wshape
		wall.add_child(wcol)
		wall.position = pos
		root.add_child(wall)

	# --- Coperture: il livello partecipa al combattimento ---------------------
	var cover_mat := StandardMaterial3D.new()
	cover_mat.albedo_color = Color(0.35, 0.33, 0.30)
	cover_mat.roughness = 0.85
	var covers := [
		Vector3(8, 1.5, 6), Vector3(-9, 1.5, 4), Vector3(3, 1.5, -11),
		Vector3(-6, 1.5, -8), Vector3(14, 1.5, -3), Vector3(-14, 1.5, -12),
	]
	for idx in covers.size():
		var c := StaticBody3D.new()
		c.name = "Cover%d" % idx
		var cm := MeshInstance3D.new()
		var cb := BoxMesh.new()
		cb.size = Vector3(3, 3, 3)
		cm.mesh = cb
		cm.material_override = cover_mat
		c.add_child(cm)
		var cc := CollisionShape3D.new()
		var cs := BoxShape3D.new()
		cs.size = Vector3(3, 3, 3)
		cc.shape = cs
		c.add_child(cc)
		c.position = covers[idx]
		root.add_child(c)

	# --- Torce: le uniche sorgenti calde, e ciò che dà gamma tonale ----------
	for i in 6:
		var ang := i * TAU / 6.0
		var lamp := OmniLight3D.new()
		lamp.name = "Torch%d" % i
		lamp.light_color = Color(1.0, 0.46, 0.13)
		lamp.light_energy = 6.0
		lamp.omni_range = 18.0
		lamp.position = Vector3(sin(ang) * 20.0, 4.5, cos(ang) * 20.0)
		root.add_child(lamp)

	# --- I bersagli -----------------------------------------------------------
	# Tre, e sono i tre che servono per allenare le tre forme: fermo (provi le
	# sagome), che striscia (provi l'anticipo del proiettile), che rimbalza in
	# aria (provi la cosa più difficile del gioco). Il terzo è la scelta di
	# design più importante di questa scena: il gioco offre un modo di allenare
	# esattamente la sua abilità più difficile.
	var dummy_script := load("res://src/target_dummy.gd")
	var dummies := [
		["Fermo", Vector3(0, 0.9, -6), 0],
		["Mobile", Vector3(-7, 0.9, -9), 1],
		["Aereo", Vector3(7, 0.9, -9), 2],
	]
	for entry in dummies:
		var d := CharacterBody3D.new()
		d.name = "Dummy%s" % entry[0]
		d.set_script(dummy_script)
		d.set("mode", entry[2])
		var dcol := CollisionShape3D.new()
		var dcaps := CapsuleShape3D.new()
		dcaps.height = 1.8
		dcaps.radius = 0.4
		dcol.shape = dcaps
		d.add_child(dcol)
		var dmesh := MeshInstance3D.new()
		var dbody := CapsuleMesh.new()
		dbody.height = 1.8
		dbody.radius = 0.4
		dmesh.mesh = dbody
		var dmat := StandardMaterial3D.new()
		# Rosso nemico, e leggermente emissivo: a 20 metri in un'arena buia una
		# silhouette che non si stacca dal fondo non è un bersaglio.
		dmat.albedo_color = Color(0.72, 0.19, 0.20)
		dmat.emission_enabled = true
		dmat.emission = Color(0.5, 0.08, 0.08)
		dmat.emission_energy_multiplier = 0.5
		dmesh.material_override = dmat
		d.add_child(dmesh)
		d.position = entry[1]
		root.add_child(d)

	# --- Nemici ---------------------------------------------------------------
	# Due, non uno: contro uno solo impari a duellare, contro due impari a
	# scegliere il bersaglio e a usare le coperture — che e' il gioco vero.
	var enemy_script := load("res://src/enemy.gd")
	for e_i in 2:
		var e := CharacterBody3D.new()
		e.name = "Enemy%d" % e_i
		e.set_script(enemy_script)
		var ecol := CollisionShape3D.new()
		var ecaps := CapsuleShape3D.new()
		ecaps.height = 1.8
		ecaps.radius = 0.4
		ecol.shape = ecaps
		e.add_child(ecol)
		var em := MeshInstance3D.new()
		var ebody := CapsuleMesh.new()
		ebody.height = 1.8
		ebody.radius = 0.4
		em.mesh = ebody
		var emat := StandardMaterial3D.new()
		# Nemico rosso ed emissivo: a venti metri in un'arena buia una silhouette
		# che non si stacca dal fondo non e' un avversario, e' una sorpresa.
		emat.albedo_color = Color(0.78, 0.16, 0.18)
		emat.emission_enabled = true
		emat.emission = Color(0.85, 0.10, 0.10)
		emat.emission_energy_multiplier = 0.9
		em.material_override = emat
		e.add_child(em)
		e.position = Vector3(-12.0 + e_i * 24.0, 0.9, -16.0)
		root.add_child(e)

	# --- Il giocatore ---------------------------------------------------------
	var player := CharacterBody3D.new()
	player.name = "Player"
	player.set_script(load("res://src/player.gd"))
	player.position = Vector3(0, 0.9, 12)

	var pcol := CollisionShape3D.new()
	var caps := CapsuleShape3D.new()
	caps.height = 1.8
	caps.radius = 0.4
	pcol.shape = caps
	player.add_child(pcol)

	var cam := Camera3D.new()
	cam.name = "Camera3D"
	cam.position = Vector3(0, 0.65, 0)
	# FOV VERTICALE in Godot. Nel progetto precedente passare un orizzontale
	# crudo dava 129,5° e rendeva impossibile mirare: qui 75 verticali su 16:9
	# sono ~106 orizzontali, la banda giusta per un arena shooter.
	cam.fov = 75.0
	player.add_child(cam)

	# Viewmodel: nodo suo sotto la camera. Nel progetto Three.js NON esisteva
	# proprio — la prima persona non disegnava niente del giocatore, e il frame
	# era una telecamera che galleggiava in una stanza.
	var vm := Node3D.new()
	vm.name = "Viewmodel"
	vm.position = Vector3(0.28, -0.22, -0.55)
	vm.rotation_degrees = Vector3(-8, 22, 14)
	var blade := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(0.05, 0.62, 0.012)
	blade.mesh = bm
	var steel := StandardMaterial3D.new()
	steel.albedo_color = Color(0.78, 0.82, 0.89)
	steel.metallic = 0.85
	steel.roughness = 0.28
	blade.material_override = steel
	blade.position = Vector3(0, 0.3, 0)
	vm.add_child(blade)
	var grip := MeshInstance3D.new()
	var gm := BoxMesh.new()
	gm.size = Vector3(0.035, 0.2, 0.035)
	grip.mesh = gm
	var leather := StandardMaterial3D.new()
	leather.albedo_color = Color(0.31, 0.21, 0.14)
	leather.roughness = 0.9
	grip.material_override = leather
	grip.position = Vector3(0, -0.08, 0)
	vm.add_child(grip)
	cam.add_child(vm)

	root.add_child(player)

	# HUD, e i nemici puntano il giocatore. Cablato qui perche' la scena e'
	# costruita in codice: e' l'unico posto dove tutti e tre esistono insieme.
	var hud := CanvasLayer.new()
	hud.name = "HUD"
	hud.set_script(load("res://src/hud.gd"))
	root.add_child(hud)

	# Il proprietario dei nodi deve essere la radice o PackedScene salva un albero vuoto.
	for child in root.get_children():
		_own(child, root)

	var packed := PackedScene.new()
	if packed.pack(root) != OK:
		printerr("pack fallito")
		quit(1)
		return
	var err := ResourceSaver.save(packed, "res://scenes/arena.tscn")
	if err != OK:
		printerr("salvataggio fallito: %d" % err)
		quit(1)
		return
	print("arena.tscn scritta — %d nodi" % _count(root))
	quit(0)


func _own(node: Node, owner: Node) -> void:
	node.owner = owner
	for child in node.get_children():
		_own(child, owner)


func _count(node: Node) -> int:
	var n := 1
	for child in node.get_children():
		n += _count(child)
	return n
