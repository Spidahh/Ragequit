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
	env.ambient_light_sky_contribution = 0.46
	env.tonemap_mode = Environment.TONE_MAPPER_ACES
	env.tonemap_exposure = 1.08
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
	sun.light_energy = 1.25
	sun.shadow_enabled = true
	sun.rotation_degrees = Vector3(-52, 34, 0)
	root.add_child(sun)

	# --- L'arena: un colosseo, non una scatola -------------------------------
	#
	# La forma e' ROTONDA e non quadrata, e non e' un gusto: in una scatola gli
	# angoli sono quattro posti dove nascondersi con le spalle coperte, e il
	# combattimento ci si accuccia dentro. In un cerchio non esiste un angolo, e
	# il centro — che e' il posto pericoloso — resta il posto che tutti devono
	# attraversare.
	#
	# Il pavimento e' sabbia compattata, PIU' CHIARO E CONSUMATO AL CENTRO: la
	# mappa sembra usata prima che tu arrivi, ed e' una traccia di storia che
	# costa un secondo cilindro.
	var sand := StandardMaterial3D.new()
	sand.albedo_color = Color(0.33, 0.28, 0.21)
	sand.roughness = 1.0

	var sand_worn := StandardMaterial3D.new()
	sand_worn.albedo_color = Color(0.40, 0.34, 0.25)
	sand_worn.roughness = 1.0

	var stone := StandardMaterial3D.new()
	stone.albedo_color = Color(0.24, 0.22, 0.20)
	stone.roughness = 0.92

	var brick := StandardMaterial3D.new()
	brick.albedo_color = Color(0.26, 0.15, 0.12)
	brick.roughness = 0.88

	var ground := StaticBody3D.new()
	ground.name = "Ground"
	var disc := MeshInstance3D.new()
	var disc_mesh := CylinderMesh.new()
	disc_mesh.top_radius = 30.0
	disc_mesh.bottom_radius = 30.0
	disc_mesh.height = 1.0
	disc_mesh.radial_segments = 48
	disc.mesh = disc_mesh
	disc.material_override = sand
	disc.position = Vector3(0, -0.5, 0)
	ground.add_child(disc)
	var worn := MeshInstance3D.new()
	var worn_mesh := CylinderMesh.new()
	worn_mesh.top_radius = 13.0
	worn_mesh.bottom_radius = 13.0
	worn_mesh.height = 0.04
	worn_mesh.radial_segments = 40
	worn.mesh = worn_mesh
	worn.material_override = sand_worn
	worn.position = Vector3(0, 0.005, 0)
	ground.add_child(worn)
	var gcol := CollisionShape3D.new()
	var gshape := CylinderShape3D.new()
	gshape.radius = 30.0
	gshape.height = 1.0
	gcol.shape = gshape
	gcol.position = Vector3(0, -0.5, 0)
	ground.add_child(gcol)
	root.add_child(ground)

	# Il muro: 32 segmenti su un cerchio da 25 m. Un cilindro cavo non esiste
	# come primitiva, e 32 pareti dritte a 11 gradi l'una dall'altra si leggono
	# come una curva — con il vantaggio che ognuna e' una collisione banale.
	var SEGMENTS := 32
	var RADIUS := 25.0
	var seg_w: float = TAU * RADIUS / float(SEGMENTS) * 1.04
	for i in SEGMENTS:
		var ang := float(i) * TAU / float(SEGMENTS)
		var w := StaticBody3D.new()
		w.name = "Wall%02d" % i
		var wm := MeshInstance3D.new()
		var wb := BoxMesh.new()
		wb.size = Vector3(seg_w, 9.0, 1.2)
		wm.mesh = wb
		wm.material_override = brick
		w.add_child(wm)
		var wc := CollisionShape3D.new()
		var ws := BoxShape3D.new()
		ws.size = Vector3(seg_w, 9.0, 1.2)
		wc.shape = ws
		w.add_child(wc)
		w.position = Vector3(sin(ang) * RADIUS, 4.5, cos(ang) * RADIUS)
		w.rotation.y = ang
		root.add_child(w)

		# La gradinata dietro il muro: due anelli di pietra che salgono. Non ci
		# si arriva e non serve in partita — serve a dire che l'arena sta DENTRO
		# un posto, e a togliere allo sguardo l'orizzonte piatto che fa sembrare
		# tutto un livello di prova.
		for tier in 2:
			var t := MeshInstance3D.new()
			var tb := BoxMesh.new()
			tb.size = Vector3(seg_w, 2.4, 3.0)
			t.mesh = tb
			t.material_override = stone
			var r2: float = RADIUS + 2.2 + float(tier) * 2.6
			var y2: float = 9.0 + float(tier) * 2.0
			t.position = Vector3(sin(ang) * r2, y2, cos(ang) * r2)
			t.rotation.y = ang
			root.add_child(t)

	# --- Coperture: la geometria partecipa al movimento -----------------------
	#
	# Ogni blocco e' alto abbastanza da nasconderti (1,9 m) e basso abbastanza da
	# saltarci sopra: il salto arriva a 1,5 m da fermo, e da un blocco si prende
	# il successivo. Un muretto che ferma i proiettili e basta e' arredamento.
	var covers := [
		Vector3(9, 0.95, 7), Vector3(-10, 0.95, 5), Vector3(4, 0.95, -12),
		Vector3(-7, 0.95, -9), Vector3(15, 0.95, -4), Vector3(-15, 0.95, -13),
		Vector3(12, 0.95, 13), Vector3(-13, 0.95, 14),
	]
	for idx in covers.size():
		var c := StaticBody3D.new()
		c.name = "Cover%d" % idx
		var cm := MeshInstance3D.new()
		var cb := BoxMesh.new()
		cb.size = Vector3(3.2, 1.9, 3.2)
		cm.mesh = cb
		cm.material_override = stone
		c.add_child(cm)
		var cc := CollisionShape3D.new()
		var cs := BoxShape3D.new()
		cs.size = Vector3(3.2, 1.9, 3.2)
		cc.shape = cs
		c.add_child(cc)
		c.position = covers[idx]
		# Ognuno ruotato di suo: otto cubi allineati alla griglia si leggono come
		# un editor di livelli, non come un posto.
		c.rotation.y = float(idx) * 0.7
		root.add_child(c)
		_scatter_props(root, covers[idx], idx)

	# Due ballatoi rialzati, raggiungibili SENZA abilita': si sale sul gradino
	# accanto e da li' si passa. La verticalita' e' di tutti, non solo di chi ha
	# scelto lo scatto.
	for side in 2:
		var sgn: float = 1.0 if side == 0 else -1.0
		var p := StaticBody3D.new()
		p.name = "Platform%d" % side
		var pm := MeshInstance3D.new()
		var pb := BoxMesh.new()
		pb.size = Vector3(9.0, 0.6, 5.0)
		pm.mesh = pb
		pm.material_override = stone
		p.add_child(pm)
		var pc := CollisionShape3D.new()
		var ps := BoxShape3D.new()
		ps.size = Vector3(9.0, 0.6, 5.0)
		pc.shape = ps
		p.add_child(pc)
		p.position = Vector3(sgn * 17.0, 3.2, sgn * 2.0)
		p.rotation.y = sgn * 0.4
		root.add_child(p)

		var step := StaticBody3D.new()
		step.name = "Step%d" % side
		var sm := MeshInstance3D.new()
		var sb := BoxMesh.new()
		sb.size = Vector3(3.0, 1.7, 3.0)
		sm.mesh = sb
		sm.material_override = stone
		step.add_child(sm)
		var sc := CollisionShape3D.new()
		var ss := BoxShape3D.new()
		ss.size = Vector3(3.0, 1.7, 3.0)
		sc.shape = ss
		step.add_child(sc)
		step.position = Vector3(sgn * 13.5, 0.85, sgn * 4.5)
		root.add_child(step)

	# --- Torce: le uniche sorgenti calde, e cio' che da' gamma tonale ---------
	#
	# Dodici sul muro. Fra una e l'altra restano zone d'ombra vere, e quella
	# alternanza non e' decorazione: e' la mappa che partecipa al combattimento —
	# chi conosce le ombre attraversa il campo aperto.
	var torch_scene: PackedScene = load("res://assets/arena/props/Torch_Metal.gltf")
	for i in 12:
		var ang := float(i) * TAU / 12.0
		var holder := Node3D.new()
		holder.name = "Torch%02d" % i
		holder.position = Vector3(sin(ang) * (RADIUS - 0.9), 3.4, cos(ang) * (RADIUS - 0.9))
		holder.rotation.y = ang + PI
		root.add_child(holder)

		if torch_scene:
			var t2 := torch_scene.instantiate()
			t2.scale = Vector3(1.6, 1.6, 1.6)
			holder.add_child(t2)

		var lamp := OmniLight3D.new()
		lamp.name = "Light"
		lamp.light_color = Color(1.0, 0.46, 0.13)
		lamp.light_energy = 4.2
		lamp.omni_range = 16.0
		lamp.position = Vector3(0, 0.9, 0.35)
		holder.add_child(lamp)

		# La fiamma: particelle vere, non un cubo arancione. Costa poco ed e'
		# l'unica cosa che si muove nell'illuminazione di tutta la mappa.
		var fire := GPUParticles3D.new()
		fire.name = "Flame"
		fire.amount = 24
		fire.lifetime = 0.9
		fire.position = Vector3(0, 0.95, 0.35)
		var pmat := ParticleProcessMaterial.new()
		pmat.direction = Vector3(0, 1, 0)
		pmat.spread = 12.0
		pmat.initial_velocity_min = 0.6
		pmat.initial_velocity_max = 1.3
		pmat.gravity = Vector3(0, 0.4, 0)
		pmat.scale_min = 0.12
		pmat.scale_max = 0.3
		pmat.color = Color(1.0, 0.62, 0.18)
		fire.process_material = pmat
		var qm := QuadMesh.new()
		qm.size = Vector2(0.26, 0.26)
		var fm := StandardMaterial3D.new()
		fm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		fm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		fm.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
		fm.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
		fm.albedo_color = Color(1.0, 0.45, 0.10, 0.42)
		fm.emission_enabled = true
		fm.emission = Color(1.0, 0.5, 0.12)
		fm.emission_energy_multiplier = 1.8
		qm.material = fm
		fire.draw_pass_1 = qm
		holder.add_child(fire)

	# Gli stendardi, fra una torcia e l'altra: sono l'unico rosso saturo della
	# mappa e danno alla parete una scala verticale che il mattone non ha.
	var banner_scene: PackedScene = load("res://assets/arena/props/banner_patternA_red.gltf")
	if banner_scene:
		for i in 12:
			var ang := (float(i) + 0.5) * TAU / 12.0
			var b := banner_scene.instantiate()
			b.scale = Vector3(1.9, 1.9, 1.9)
			# Spenti del 45 %: erano la cosa piu chiara del frame, e la regola e
			# che il mondo sta sotto e le azioni sopra.
			_darken(b, 0.30)
			b.position = Vector3(sin(ang) * (RADIUS - 0.7), 6.6, cos(ang) * (RADIUS - 0.7))
			b.rotation.y = ang + PI
			root.add_child(b)

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


## Qualche cassa e qualche barile ai piedi di ogni copertura.
##
## Non fanno collisione e non cambiano il gioco: rompono la silhouette di un
## cubo, che e' la differenza fra "un blocco di prova" e "roba appoggiata in un
## posto dove qualcuno vive". Costano tre mesh a copertura.
func _scatter_props(root: Node, at: Vector3, seed_i: int) -> void:
	var files := ["barrel_large.gltf", "Crate_Wooden.gltf", "barrel_small.gltf", "box_large.gltf"]
	var rng := RandomNumberGenerator.new()
	# Seme fisso: l'arena deve essere IDENTICA a ogni avvio, o due giocatori
	# nella stessa partita vedono due mappe diverse.
	rng.seed = 1000 + seed_i
	for k in 3:
		var f: String = files[(seed_i + k) % files.size()]
		var ps: PackedScene = load("res://assets/arena/props/%s" % f)
		if ps == null:
			continue
		var p := ps.instantiate()
		var ang := rng.randf() * TAU
		var dist := 1.9 + rng.randf() * 0.7
		p.position = at + Vector3(sin(ang) * dist, -0.95, cos(ang) * dist)
		p.rotation.y = rng.randf() * TAU
		# Un barile e' alto un metro: la scala e' quella che lo porta li, non
		# quella che riempie lo spazio.
		var k2 := 0.55 + rng.randf() * 0.2
		p.scale = Vector3(k2, k2, k2)
		_darken(p, 0.7)
		root.add_child(p)


## Abbassa l'albedo di un modello importato.
##
## I props arrivano da pacchetti diversi, tarati per scene illuminate a giorno.
## Nell'arena di notte la stessa texture e' la cosa piu chiara dello schermo, e
## il mondo desaturato smette di essere desaturato.
func _darken(node: Node, k: float) -> void:
	var stack: Array = [node]
	while not stack.is_empty():
		var n = stack.pop_back()
		for c in n.get_children():
			stack.append(c)
		if n is MeshInstance3D:
			var mi := n as MeshInstance3D
			if mi.mesh == null:
				continue
			for i in mi.mesh.get_surface_count():
				var m = mi.mesh.surface_get_material(i)
				if m == null or not (m is StandardMaterial3D):
					continue
				var d := (m as StandardMaterial3D).duplicate()
				d.albedo_color = d.albedo_color * k
				d.albedo_color.a = 1.0
				mi.set_surface_override_material(i, d)


func _own(node: Node, owner: Node) -> void:
	node.owner = owner
	for child in node.get_children():
		_own(child, owner)


func _count(node: Node) -> int:
	var n := 1
	for child in node.get_children():
		n += _count(child)
	return n
