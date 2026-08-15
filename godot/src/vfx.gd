## Feedback visivo del combattimento.
##
## La sagoma descrive la meccanica, il colore descrive l'elemento e alcuni
## ability id importanti aggiungono una firma propria. Due spell non possono
## essere la stessa sfera con una tinta diversa.
class_name Vfx

const Combat := preload("res://src/combat.gd")

const COL_BEAM := Color("ffd260")
const COL_BOLT := Color("ff851f")
const COL_BURST := Color("fff4cf")
const COL_ENEMY := Color("ff3344")

const ELEMENT_COLORS := {
	"fire": Color("ff4500"),
	"ice": Color("00e5ff"),
	"lightning": Color("ffe600"),
	"dark": Color("9b4dff"),
	"nature": Color("39ff14"),
}

const ARROW_COLORS := {
	"piercing_shot": Color("d9fff1"),
	"pin_shot": Color("65d7ff"),
	"marksman_shot": Color("fff0a6"),
	"broadhead": Color("ff6b55"),
	"blast_arrow": Color("ff4500"),
}


static func ability_color(ability: Dictionary) -> Color:
	var id := String(ability.get("id", ""))
	if ARROW_COLORS.has(id):
		return ARROW_COLORS[id]
	var element := String(ability.get("element", "none"))
	if ELEMENT_COLORS.has(element):
		return ELEMENT_COLORS[element]
	match String(ability.get("school", "")):
		"melee": return Color("ff5a45")
		"bow": return Color("8cff9b")
		"utility": return Color("ffd260")
		_: return COL_BEAM


static func _unlit(color: Color, alpha: float, additive := true) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD if additive else BaseMaterial3D.BLEND_MODE_MIX
	m.albedo_color = Color(color.r, color.g, color.b, alpha)
	m.emission_enabled = true
	m.emission = color
	m.emission_energy_multiplier = 1.7
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	return m


static func _align_y(mesh: Node3D, from: Vector3, to: Vector3) -> void:
	mesh.global_position = (from + to) * 0.5
	var dir := (to - from).normalized()
	if absf(dir.dot(Vector3.UP)) < 0.999:
		mesh.look_at_from_position(mesh.global_position, mesh.global_position + dir, Vector3.UP)
		mesh.rotate_object_local(Vector3.RIGHT, PI * 0.5)


## Un fascio ha due strati: il nucleo comunica forza, l'involucro tenue mostra
## il margine reale del colpo. Prima il commento prometteva 45 cm ma il cilindro
## disegnato ne mostrava il 30%.
static func beam(parent: Node3D, from: Vector3, to: Vector3, ability: Dictionary = {}) -> void:
	var length := from.distance_to(to)
	if length < 0.05:
		return
	var color := ability_color(ability)
	var weapon := String(ability.get("weapon", ""))

	var envelope := MeshInstance3D.new()
	var envelope_mesh := CylinderMesh.new()
	envelope_mesh.top_radius = Combat.BEAM_RADIUS
	envelope_mesh.bottom_radius = Combat.BEAM_RADIUS
	envelope_mesh.height = length
	envelope_mesh.radial_segments = 12
	envelope.mesh = envelope_mesh
	envelope.material_override = _unlit(color, 0.10)
	parent.add_child(envelope)
	_align_y(envelope, from, to)
	_fade_and_free(envelope, 0.16)

	var core := MeshInstance3D.new()
	var core_mesh := CylinderMesh.new()
	core_mesh.top_radius = 0.055 if weapon == "bow" else 0.09
	core_mesh.bottom_radius = 0.16 if weapon == "sword" else 0.075
	core_mesh.height = length
	core_mesh.radial_segments = 8
	core.mesh = core_mesh
	core.material_override = _unlit(color, 0.82)
	parent.add_child(core)
	_align_y(core, from, to)
	_fade_and_free(core, 0.11)

	# La spada lascia tre tagli sfalsati, non un laser perfetto. L'involucro
	# conserva comunque il bordo esatto della hitbox.
	if weapon == "sword":
		for side in [-1.0, 1.0]:
			var streak := core.duplicate()
			parent.add_child(streak)
			streak.global_transform = core.global_transform
			streak.translate_object_local(Vector3(side * 0.12, 0.0, 0.0))
			streak.scale = Vector3(0.42, 0.94, 0.42)
			_fade_and_free(streak, 0.09)


## Onda di un colpo centrato sul corpo. Solo bordo e tacche: il centro resta
## trasparente, quindi non copre il pavimento e non acceca chi la lancia.
static func burst(
	parent: Node3D, at: Vector3, radius: float = Combat.BURST_RADIUS, ability: Dictionary = {}
) -> void:
	var color := ability_color(ability)
	var ring := MeshInstance3D.new()
	var torus := TorusMesh.new()
	torus.inner_radius = maxf(radius - 0.10, 0.05)
	torus.outer_radius = radius
	torus.rings = 32
	ring.mesh = torus
	ring.material_override = _unlit(color, 0.72)
	parent.add_child(ring)
	ring.global_position = at + Vector3(0, -0.82, 0)
	ring.scale = Vector3(0.18, 1.0, 0.18)
	var tw := parent.create_tween()
	tw.set_parallel(true)
	tw.tween_property(ring, "scale", Vector3.ONE, 0.20)
	tw.tween_property(ring.material_override, "albedo_color:a", 0.0, 0.32)
	tw.chain().tween_callback(ring.queue_free)


## Modello del proiettile. Le frecce hanno corpo, punta e lunghezza; le spell
## hanno nucleo e orbita. Blast Arrow porta una carica visibile sulla punta.
static func projectile_visual(ability: Dictionary) -> Node3D:
	var root := Node3D.new()
	var color := ability_color(ability)
	if String(ability.get("weapon", "")) == "bow":
		var shaft := MeshInstance3D.new()
		var shaft_mesh := CylinderMesh.new()
		var id := String(ability.get("id", ""))
		shaft_mesh.height = 0.95 if id == "marksman_shot" else 0.68
		shaft_mesh.top_radius = 0.022
		shaft_mesh.bottom_radius = 0.022
		shaft_mesh.radial_segments = 6
		shaft.mesh = shaft_mesh
		shaft.material_override = _unlit(color, 0.95)
		shaft.rotation_degrees.x = 90.0
		root.add_child(shaft)

		var tip := MeshInstance3D.new()
		var tip_mesh := CylinderMesh.new()
		tip_mesh.height = 0.18
		tip_mesh.top_radius = 0.0
		tip_mesh.bottom_radius = 0.075 if id == "broadhead" else 0.05
		tip_mesh.radial_segments = 6
		tip.mesh = tip_mesh
		tip.material_override = _unlit(color, 1.0)
		tip.rotation_degrees.x = 90.0
		tip.position.z = -shaft_mesh.height * 0.5 - 0.08
		root.add_child(tip)

		if id == "blast_arrow":
			var charge := MeshInstance3D.new()
			var charge_mesh := SphereMesh.new()
			charge_mesh.radius = 0.13
			charge_mesh.height = 0.26
			charge.mesh = charge_mesh
			charge.material_override = _unlit(color, 0.65)
			charge.position.z = -shaft_mesh.height * 0.5
			root.add_child(charge)
	else:
		var orb := MeshInstance3D.new()
		var orb_mesh := SphereMesh.new()
		orb_mesh.radius = 0.17
		orb_mesh.height = 0.34
		orb_mesh.radial_segments = 12
		orb.mesh = orb_mesh
		orb.material_override = _unlit(color, 0.9)
		root.add_child(orb)
		var orbit := MeshInstance3D.new()
		var orbit_mesh := TorusMesh.new()
		orbit_mesh.inner_radius = 0.21
		orbit_mesh.outer_radius = 0.25
		orbit.mesh = orbit_mesh
		orbit.material_override = _unlit(color, 0.55)
		orbit.rotation_degrees = Vector3(64, 15, 0)
		root.add_child(orbit)
	return root


static func impact(
	parent: Node3D, at: Vector3, color := COL_BEAM, ability: Dictionary = {}
) -> void:
	var chosen: Color = ability_color(ability) if not ability.is_empty() else color
	var explosive := String(ability.get("id", "")) in ["blast_arrow", "fireball", "meteor"]
	var mesh := MeshInstance3D.new()
	var sph := SphereMesh.new()
	sph.radius = 0.38 if explosive else 0.16
	sph.height = sph.radius * 2.0
	sph.radial_segments = 10
	sph.rings = 6
	mesh.mesh = sph
	mesh.material_override = _unlit(chosen, 0.92)
	parent.add_child(mesh)
	mesh.global_position = at
	var tw := parent.create_tween()
	tw.set_parallel(true)
	tw.tween_property(mesh, "scale", Vector3.ONE * (2.1 if explosive else 1.5), 0.14)
	tw.tween_property(mesh.material_override, "albedo_color:a", 0.0, 0.16)
	tw.chain().tween_callback(mesh.queue_free)
	if explosive:
		burst(parent, at + Vector3(0, 0.84, 0), 1.25, ability)


static func mobility(parent: Node3D, at: Vector3, dir: Vector3, ability: Dictionary) -> void:
	var color := ability_color(ability)
	for i in 3:
		var ring := MeshInstance3D.new()
		var torus := TorusMesh.new()
		torus.inner_radius = 0.34 + i * 0.11
		torus.outer_radius = torus.inner_radius + 0.045
		ring.mesh = torus
		ring.material_override = _unlit(color, 0.48 - i * 0.09)
		parent.add_child(ring)
		ring.global_position = at - dir * (0.35 + i * 0.42)
		ring.look_at(ring.global_position + dir, Vector3.UP)
		ring.rotate_object_local(Vector3.RIGHT, PI * 0.5)
		_fade_and_free(ring, 0.22 + i * 0.04)


static func self_effect(parent: Node3D, at: Vector3, ability: Dictionary) -> void:
	var color := ability_color(ability)
	var id := String(ability.get("id", ""))
	if id in ["barrier", "dark_barrier", "phase_shift"]:
		var shell := MeshInstance3D.new()
		var sphere := SphereMesh.new()
		sphere.radius = 0.95
		sphere.height = 1.9
		shell.mesh = sphere
		shell.material_override = _unlit(color, 0.16)
		parent.add_child(shell)
		shell.global_position = at
		var tw := parent.create_tween()
		tw.set_parallel(true)
		tw.tween_property(shell, "scale", Vector3.ONE * 1.18, 0.28)
		tw.tween_property(shell.material_override, "albedo_color:a", 0.0, 0.34)
		tw.chain().tween_callback(shell.queue_free)
	else:
		burst(parent, at, 1.15, ability)


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
	_align_y(mesh, from, to)
	_fade_and_free(mesh, 0.09)


static func _fade_and_free(mesh: MeshInstance3D, secs: float) -> void:
	var tw := mesh.create_tween()
	tw.tween_property(mesh.material_override, "albedo_color:a", 0.0, secs)
	tw.tween_callback(mesh.queue_free)
