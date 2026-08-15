## Il feedback visivo dei colpi.
##
## LA REGOLA, ed è la stessa di ability_runtime.gd vista dall'altro lato: **quello
## che si disegna è quello che colpisce.** Il fascio disegnato ha lo stesso raggio
## del cilindro che risolve il danno, l'onda a terra ha lo stesso raggio dell'area.
## Se divergono, il VFX insegna una bugia — e un'anteprima che mente una volta è
## peggio di nessuna anteprima.
##
## Nel progetto precedente questa cosa non poteva esistere: la geometria del
## colpo viveva come aritmetica sparsa dentro il codice del server, quindi niente
## poteva disegnarla. Le spell uscivano come nastri bianchi senza colore né forma.
##
## Tutto a vita breve e auto-distruggente: un VFX che resta è un leak di nodi, e
## in un fight se ne creano decine al secondo.
class_name Vfx

const Combat := preload("res://src/combat.gd")

## Colori per FORMA, non per abilità. Il giocatore impara tre segnali, non
## sessantasette: caldo = istantaneo, arancio = proiettile, bianco = lancio.
const COL_BEAM := Color(1.0, 0.78, 0.35)
const COL_BOLT := Color(1.0, 0.52, 0.18)
const COL_BURST := Color(1.0, 1.0, 1.0)
const COL_ENEMY := Color(1.0, 0.25, 0.22)


static func _unlit(color: Color, alpha: float) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	m.albedo_color = Color(color.r, color.g, color.b, alpha)
	m.emission_enabled = true
	m.emission = color
	m.emission_energy_multiplier = 1.2
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	return m


## Il fascio: un cilindro fra origine e fine, esattamente largo quanto il volume
## che risolve il colpo. Svanisce in ~0,12 s — un tell istantaneo, non una scia.
static func beam(parent: Node3D, from: Vector3, to: Vector3, color := COL_BEAM) -> void:
	var length := from.distance_to(to)
	if length < 0.05:
		return
	var mesh := MeshInstance3D.new()
	var cyl := CylinderMesh.new()
	# Lo stesso BEAM_RADIUS del test di collisione. Se qualcuno cambia quello,
	# questo lo segue: è una costante sola, non due numeri che si somigliano.
	cyl.top_radius = Combat.BEAM_RADIUS * 0.30
	cyl.bottom_radius = Combat.BEAM_RADIUS * 0.30
	cyl.height = length
	cyl.radial_segments = 8
	mesh.mesh = cyl
	mesh.material_override = _unlit(color, 0.55)
	parent.add_child(mesh)
	mesh.global_position = (from + to) * 0.5
	# Il cilindro di Godot punta lungo +Y: va ruotato sull'asse del tiro.
	var dir := (to - from).normalized()
	if absf(dir.dot(Vector3.UP)) < 0.999:
		mesh.look_at_from_position(mesh.global_position, mesh.global_position + dir, Vector3.UP)
		mesh.rotate_object_local(Vector3.RIGHT, PI * 0.5)
	_fade_and_free(mesh, 0.12)


## L'onda a terra dell'area: un anello che si allarga fino al raggio VERO.
static func burst(parent: Node3D, at: Vector3, radius := Combat.BURST_RADIUS, color := COL_BURST) -> void:
	var mesh := MeshInstance3D.new()
	var torus := TorusMesh.new()
	# Anello SOTTILE: era spesso il 18% del raggio e, disegnato all'altezza del
	# busto, la camera ci finiva dentro e riempiva mezzo schermo di bianco. Un
	# VFX che ti acceca è peggio di nessun VFX — copre proprio il momento in cui
	# devi vedere cosa succede.
	torus.inner_radius = radius * 0.94
	torus.outer_radius = radius
	torus.rings = 24
	mesh.mesh = torus
	mesh.material_override = _unlit(color, 0.45)
	parent.add_child(mesh)
	# AI PIEDI, non al centro del corpo: l'onda è un segno per terra, e dev'essere
	# leggibile da chi la lancia (che la vede da sopra) e da chi la subisce.
	mesh.global_position = at + Vector3(0, -0.82, 0)
	mesh.scale = Vector3(0.25, 1.0, 0.25)
	var tw := parent.create_tween()
	tw.set_parallel(true)
	tw.tween_property(mesh, "scale", Vector3.ONE, 0.22)
	tw.tween_property(mesh.material_override, "albedo_color:a", 0.0, 0.3)
	tw.chain().tween_callback(mesh.queue_free)


## Il lampo all'impatto: dice CHE hai colpito, ed è il feedback senza cui un FPS
## non esiste.
static func impact(parent: Node3D, at: Vector3, color := COL_BEAM) -> void:
	var mesh := MeshInstance3D.new()
	var sph := SphereMesh.new()
	# Piccolo e breve. Un lampo che copre il bersaglio nasconde proprio la cosa
	# che sei riuscito a colpire, ed e il momento in cui vuoi vederla.
	sph.radius = 0.16
	sph.height = 0.32
	sph.radial_segments = 8
	sph.rings = 4
	mesh.mesh = sph
	mesh.material_override = _unlit(color, 0.9)
	parent.add_child(mesh)
	mesh.global_position = at
	var tw := parent.create_tween()
	tw.set_parallel(true)
	tw.tween_property(mesh, "scale", Vector3.ONE * 1.5, 0.11)
	tw.tween_property(mesh.material_override, "albedo_color:a", 0.0, 0.11)
	tw.chain().tween_callback(mesh.queue_free)


## Il tracciante del nemico: sottile e rosso. Serve a una cosa sola, ed è la più
## importante del combattimento contro i bot — capire DA DOVE ti stanno sparando.
static func tracer(parent: Node3D, from: Vector3, to: Vector3) -> void:
	var length := from.distance_to(to)
	if length < 0.05:
		return
	var mesh := MeshInstance3D.new()
	var cyl := CylinderMesh.new()
	cyl.top_radius = 0.035
	cyl.bottom_radius = 0.035
	cyl.height = length
	cyl.radial_segments = 6
	mesh.mesh = cyl
	mesh.material_override = _unlit(COL_ENEMY, 0.75)
	parent.add_child(mesh)
	mesh.global_position = (from + to) * 0.5
	var dir := (to - from).normalized()
	if absf(dir.dot(Vector3.UP)) < 0.999:
		mesh.look_at_from_position(mesh.global_position, mesh.global_position + dir, Vector3.UP)
		mesh.rotate_object_local(Vector3.RIGHT, PI * 0.5)
	_fade_and_free(mesh, 0.09)


static func _fade_and_free(mesh: MeshInstance3D, secs: float) -> void:
	var tw := mesh.create_tween()
	tw.tween_property(mesh.material_override, "albedo_color:a", 0.0, secs)
	tw.tween_callback(mesh.queue_free)
