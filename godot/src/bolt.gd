## Il proiettile — la terza forma, l'unica che vive nel tempo.
##
## BEAM e BURST si risolvono in un istante; questo viaggia, e per questo chiede
## al giocatore una cosa che le altre due non chiedono: **anticipare**. A 42 m/s
## un bersaglio a 20 metri lo prendi 0,48 s dopo, quindi se strafa a 6 m/s devi
## tirare quasi 3 metri davanti a lui. È un problema di mira vero, ed è
## deliberatamente l'unico del kit.
##
## Si muove a passi di fisica e testa il tratto percorso, non la sola posizione
## finale: a 42 m/s un tick da 1/60 copre 70 cm, e un test puntiforme
## attraverserebbe un corpo largo 80 cm senza vederlo. È il classico tunneling,
## e si evita testando il segmento.
extends Area3D

const Combat := preload("res://src/combat.gd")
const Vfx := preload("res://src/vfx.gd")

var damage: float = 0.0
var launches: bool = false
var speed: float = Combat.BOLT_SPEED
var max_range: float = Combat.RANGE.far
var shooter: Node3D = null

var _travelled := 0.0
var _dir := Vector3.FORWARD

signal hit_target(target: Node3D)


func fire(from: Vector3, dir: Vector3, ability, by: Node3D) -> void:
	global_position = from
	_dir = dir.normalized()
	damage = ability.damage
	launches = ability.launches
	max_range = ability.range_m
	shooter = by


func _physics_process(delta: float) -> void:
	var step := speed * delta
	var from := global_position
	var to := from + _dir * step

	var space := get_world_3d().direct_space_state
	var q := PhysicsRayQueryParameters3D.create(from, to)
	q.collide_with_areas = false
	if shooter:
		q.exclude = [shooter.get_rid()]
	var hit := space.intersect_ray(q)

	if hit:
		var n := hit.get("collider") as Node3D
		if n and n.has_method("take_damage"):
			n.take_damage(damage)
			if launches and n.has_method("launch"):
				n.launch()
			hit_target.emit(n)
		# Muro o bersaglio: in entrambi i casi il proiettile finisce lì.
		global_position = hit["position"]
		var world := get_tree().current_scene
		if world:
			Vfx.impact(world, global_position, Vfx.COL_BOLT)
		queue_free()
		return

	global_position = to
	_travelled += step
	if _travelled >= max_range:
		queue_free()
