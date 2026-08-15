## Una zona a terra: muri di fuoco, tormente, campi di spine, trappole.
##
## PERCHE' ESISTE COME NODO E NON COME EFFETTO ISTANTANEO. Dodici delle
## sessantasette abilita' non colpiscono nessuno nel momento in cui le lanci:
## rivendicano un pezzo di pavimento e lo tengono. E' il verbo della classe che
## "decide dove si combatte", e se lo si risolvesse all'impatto sarebbe solo un
## colpo ad area con un effetto grafico che mente per cinque secondi.
##
## LA REGOLA DELLA SAGOMA VALE ANCHE QUI: il cerchio disegnato a terra ha lo
## stesso raggio del volume che fa danno. Un metro di differenza e' un metro in
## cui il giocatore impara che il gioco non dice la verita'.
##
## La zona e' VISIBILE PRIMA DI FAR MALE: si arma dopo un istante e pulsa a
## intervalli, invece di colpire di continuo. E' quello che la rende evitabile —
## e una zona inevitabile non e' una scelta di posizione, e' una tassa.
extends Area3D

const Status := preload("res://src/status.gd")
const Vfx := preload("res://src/vfx.gd")

var radius := 3.0
var duration := 4.0
var tick_every := 0.5
var damage_per_tick := 0.0
var apply_status: Dictionary = {}
var arm_delay := 0.0
## Le trappole spariscono a chi le fa scattare; i campi restano fino a scadenza.
var expires_on_trigger := false
var owner_node: Node = null

var _age := 0.0
var _next_tick := 0.0
var _clock := 0.0
var _mesh: MeshInstance3D = null
var _ability: Dictionary = {}

signal triggered(bodies: Array)


static func spawn(
	world: Node, at: Vector3, effect: Dictionary, from: Node, ability: Dictionary = {}
) -> Node:
	var z := Area3D.new()
	z.set_script(load("res://src/zone.gd"))
	z.radius = maxf(float(effect.get("radius", 0.0)), float(effect.get("width", 0.0)) * 0.5)
	if z.radius <= 0.0:
		z.radius = 2.0
	z.duration = float(effect.get("durationSec", 3.0))
	z.tick_every = maxf(float(effect.get("tickEverySec", 0.5)), 0.05)
	z.damage_per_tick = float(effect.get("damagePerTick", 0.0))
	z.apply_status = effect.get("applyStatus", {})
	z.arm_delay = float(effect.get("armDelaySec", 0.0))
	z.expires_on_trigger = bool(effect.get("expiresOnTrigger", false))
	z.owner_node = from
	z._ability = ability
	z.position = at
	world.add_child(z)
	return z


func _ready() -> void:
	var col := CollisionShape3D.new()
	var sph := SphereShape3D.new()
	sph.radius = radius
	col.shape = sph
	add_child(col)
	monitoring = true

	# Solo il bordo della zona: il vecchio cilindro trasparente diventava un
	# lenzuolo arancione che copriva quasi tutta la visuale in prima persona.
	_mesh = MeshInstance3D.new()
	var ring := TorusMesh.new()
	ring.inner_radius = maxf(radius - 0.12, 0.05)
	ring.outer_radius = radius
	ring.rings = 36
	_mesh.mesh = ring
	var mat := StandardMaterial3D.new()
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	var color := Vfx.ability_color(_ability)
	mat.albedo_color = Color(color.r, color.g, color.b, 0.72)
	mat.emission_enabled = true
	mat.emission = color
	mat.emission_energy_multiplier = 1.8
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	_mesh.material_override = mat
	_mesh.position.y = 0.04
	add_child(_mesh)


func _process(delta: float) -> void:
	_age += delta
	_clock += delta
	if _age >= duration + arm_delay:
		queue_free()
		return

	# Finche' non e' armata si vede ma non fa niente: e' l'avviso, ed e' la
	# meta' del contratto con chi ci cammina dentro.
	if _age < arm_delay:
		if _mesh:
			_mesh.material_override.albedo_color.a = 0.30
		return
	if _mesh:
		var left := (duration + arm_delay) - _age
		# Sbiadisce sul finire: chi ci sta dentro deve poter contare gli ultimi
		# istanti invece di vederla sparire di colpo.
		_mesh.material_override.albedo_color.a = 0.72 * clampf(left / 0.8, 0.25, 1.0)

	if _clock < _next_tick:
		return
	_next_tick = _clock + tick_every
	_pulse()


func _pulse() -> void:
	var world := get_parent() as Node3D
	if world:
		Vfx.burst(world, global_position + Vector3(0, 0.86, 0), radius, _ability)
	var caught := []
	for body in get_overlapping_bodies():
		if body == owner_node:
			continue
		if not body.has_method("take_damage"):
			continue
		caught.append(body)
		if damage_per_tick > 0.0:
			var st = body.get("status") if "status" in body else null
			var passed: float = st.absorb(damage_per_tick) if st else damage_per_tick
			if passed > 0.0:
				body.take_damage(passed)
		if not apply_status.is_empty() and "status" in body:
			var s = body.get("status")
			if s:
				s.apply(
					String(apply_status.get("status", "")),
					float(apply_status.get("durationSec", 1.0)),
					int(apply_status.get("stacks", 1)),
					float(apply_status.get("slowFraction", 0.0))
				)
	if not caught.is_empty():
		triggered.emit(caught)
		if expires_on_trigger:
			queue_free()
