## Attacchi base delle tre armi. Vivono separati dalle abilita': LMB deve
## continuare a funzionare durante il global cooldown e non deve consumare una
## risorsa. Questo era descritto dal bilanciamento, ma non esisteva nel runtime.
extends RefCounted

const Combat := preload("res://src/combat.gd")
const AbilityRuntime := preload("res://src/ability_runtime.gd")
const BoltScript := preload("res://src/bolt.gd")
const Effects := preload("res://src/effects.gd")
const Vfx := preload("res://src/vfx.gd")
const Sfx := preload("res://src/sfx.gd")

const SWORD_SWING_SEC := 0.40
const SWORD_HIT_AT_SEC := 0.20
const SWORD_RANGE_M := 1.8
const SWORD_DAMAGE := [5.0, 5.0, 8.0]
const SWORD_COMBO_RESET_SEC := 1.0
const BOW_MIN_SEC := 0.05
const BOW_FULL_SEC := 0.65
const BOW_MIN_DAMAGE := 4.0
const BOW_FULL_DAMAGE := 22.0
const STAFF_CADENCE_SEC := 0.40

var owner: CharacterBody3D
var ready_at := 0.0
var bow_started := -1.0
var sword_release_at := -1.0
var sword_combo := 0
var sword_combo_expires := -1.0


func setup(player: CharacterBody3D) -> void:
	owner = player


func cancel() -> void:
	bow_started = -1.0
	sword_release_at = -1.0


func press(now: float) -> bool:
	if not _available(now):
		Sfx.play("unavailable", Sfx.UI, -8.0)
		return false
	match String(owner._weapon):
		"sword":
			sword_release_at = now + SWORD_HIT_AT_SEC
			ready_at = now + SWORD_SWING_SEC
			owner.cast_state_changed.emit("windup", "Sword combo", "sword", SWORD_HIT_AT_SEC)
			return true
		"bow":
			bow_started = now
			owner.cast_state_changed.emit("windup", "Charged arrow", "bow", BOW_FULL_SEC)
			return true
		"staff":
			ready_at = now + STAFF_CADENCE_SEC
			_fire_bolt(_bolt("staff_m1", "Staff bolt", "staff", "lightning", 8.0, 75.0, 50.0))
			return true
	return false


func release(now: float) -> bool:
	if bow_started < 0.0:
		return false
	var held := maxf(0.0, now - bow_started)
	bow_started = -1.0
	var ratio := clampf((held - BOW_MIN_SEC) / (BOW_FULL_SEC - BOW_MIN_SEC), 0.0, 1.0)
	# Anche un tap parte: il minimo serve a differenziare il tiro rapido, non a
	# mangiare il click del giocatore.
	ratio = maxf(0.15, ratio)
	var damage := lerpf(BOW_MIN_DAMAGE, BOW_FULL_DAMAGE, ratio)
	var speed := lerpf(35.0, 60.0, ratio)
	ready_at = now + 0.16
	_fire_bolt(_bolt("bow_m1", "Charged arrow", "bow", "none", damage, speed, 40.0))
	return true


func tick(now: float) -> void:
	if sword_release_at >= 0.0 and now >= sword_release_at:
		sword_release_at = -1.0
		_fire_sword(now)


func charge_ratio(now: float) -> float:
	if bow_started < 0.0:
		return 0.0
	return clampf((now - bow_started) / BOW_FULL_SEC, 0.0, 1.0)


func _available(now: float) -> bool:
	return (
		owner != null
		and not owner.dead
		and owner._pending_cast.is_empty()
		and not owner.parrying()
		and owner.status.can_cast()
		and now >= ready_at
		and sword_release_at < 0.0
		and bow_started < 0.0
	)


func _fire_sword(now: float) -> void:
	if now > sword_combo_expires:
		sword_combo = 0
	var ability := {
		"id": "sword_m1",
		"name": "Sword combo %d" % (sword_combo + 1),
		"weapon": "sword",
		"element": "none",
		"shape": Combat.Shape.BEAM,
		"damage": SWORD_DAMAGE[sword_combo],
		"range_m": SWORD_RANGE_M,
		"launches": false,
		"effects": [{"kind": "damage", "amount": SWORD_DAMAGE[sword_combo]}],
	}
	var origin: Vector3 = owner._camera.global_position
	var direction: Vector3 = -owner._camera.global_transform.basis.z
	var result := AbilityRuntime.resolve_instant(
		owner.get_world_3d().direct_space_state, ability, origin, direction, [owner.get_rid()]
	)
	owner.last_cast_damage = Effects.apply(ability, owner, result.hits, owner.stats)
	owner.last_hit_point = result.end_point
	var hit_count := result.hits.size()
	if hit_count > 0:
		sword_combo = (sword_combo + 1) % SWORD_DAMAGE.size()
	else:
		sword_combo = 0
	sword_combo_expires = now + SWORD_COMBO_RESET_SEC
	owner._release_anim = 1.0
	owner._cam_kick += 0.013
	var world: Node3D = owner._combat_world()
	if world:
		Vfx.beam(world, origin, result.end_point, ability)
	Sfx.play("cast_beam")
	owner.cast_resolved.emit(String(ability.name), hit_count)
	owner.cast_state_changed.emit("released", String(ability.name), "sword", 0.28)


func _fire_bolt(ability: Dictionary) -> void:
	var bolt := Area3D.new()
	bolt.set_script(BoltScript)
	var collision := CollisionShape3D.new()
	var sphere := SphereShape3D.new()
	sphere.radius = 0.2
	collision.shape = sphere
	bolt.add_child(collision)
	bolt.add_child(Vfx.projectile_visual(ability))
	var world: Node3D = owner._combat_world()
	if world == null:
		bolt.queue_free()
		return
	world.add_child(bolt)
	var origin: Vector3 = owner._camera.global_position
	var direction: Vector3 = -owner._camera.global_transform.basis.z
	bolt.fire(origin, direction, ability, owner, owner.stats)
	owner._release_anim = 1.0
	owner._cam_kick += 0.009
	Sfx.play("cast_bolt")
	owner.cast_resolved.emit(String(ability.name), 0)
	owner.cast_state_changed.emit("released", String(ability.name), String(ability.weapon), 0.28)


func _bolt(
	id: String, title: String, weapon: String, element: String, damage: float, speed: float, range_m: float
) -> Dictionary:
	return {
		"id": id,
		"name": title,
		"weapon": weapon,
		"element": element,
		"shape": Combat.Shape.BOLT,
		"damage": damage,
		"range_m": range_m,
		"bolt_speed": speed,
		"launches": false,
		"effects": [{"kind": "damage", "amount": damage}],
	}
