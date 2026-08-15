## Verifica la lag compensation: il colpo che il giocatore VEDE andare a segno
## deve andare a segno.
##
## È il test più importante della rete, e verifica una cosa che nessun altro
## test può prendere: senza riavvolgimento un colpo perfettamente mirato MANCA,
## perché nel tempo che il pacchetto impiega ad arrivare il bersaglio si è
## spostato. A 9 m/s con 60 ms di ritardo sono 54 cm — più largo di mezzo corpo.
##
## Il test costruisce esattamente quella situazione e verifica entrambe le
## direzioni: manca senza riavvolgimento, colpisce con.
##
##   godot --headless --script res://tests/test_lag_comp.gd
extends SceneTree

const LagCompScript := preload("res://src/lag_comp.gd")
const AbilityRuntime := preload("res://src/ability_runtime.gd")
const Combat := preload("res://src/combat.gd")
const BodyScript := preload("res://src/net_body.gd")

var failures := 0
var _world: Node3D
var _target: CharacterBody3D
var _bodies := {}
var _lag
var _step := 0
var _wait := 0
var _t := 0.0
var _aim_at := Vector3.ZERO
var _hit_without := -1
var _hit_with := -1


func _check(what: String, ok: bool, detail: String) -> void:
	if ok:
		print("  ✓ %s — %s" % [what, detail])
	else:
		failures += 1
		printerr("  ✗ %s — %s" % [what, detail])


func _init() -> void:
	_world = Node3D.new()
	root.add_child(_world)
	_lag = LagCompScript.new()

	_target = CharacterBody3D.new()
	_target.set_script(BodyScript)
	var col := CollisionShape3D.new()
	var caps := CapsuleShape3D.new()
	caps.height = 1.8
	caps.radius = 0.4
	col.shape = caps
	_target.add_child(col)
	_target.position = Vector3(0, 0.9, -12)
	_world.add_child(_target)
	_bodies[2] = {"node": _target, "hp": 200.0}

	print("\n=== LAG COMPENSATION ===\n")


func _process(delta: float) -> bool:
	if _wait > 0:
		_wait -= 1
		return false
	_t += delta

	match _step:
		0:
			_wait = 4
		1:
			# Registra il bersaglio fermo per un po': è lo storico da cui si
			# riavvolge.
			_lag.record(_bodies, _t)
			if _t < 0.35:
				return false
			# Questa è la posizione che il giocatore VEDE (60 ms nel passato).
			_aim_at = _target.global_position
		2:
			# Il bersaglio si sposta di lato a 9 m/s per ~120 ms: 1,08 m, cioè
			# oltre un corpo intero. Ogni tick finisce nello storico.
			var moved := 0.0
			while moved < 1.05:
				_target.global_position.x += 9.0 * (1.0 / 60.0)
				_target.force_update_transform()
				_t += 1.0 / 60.0
				_lag.record(_bodies, _t)
				moved += 9.0 * (1.0 / 60.0)
			_wait = 2
		3:
			var space := _world.get_world_3d().direct_space_state
			var lance = Combat.starter_kit()[0]
			var origin := Vector3(0, 0.9, 0)
			var dir := (_aim_at - origin).normalized()

			# --- SENZA riavvolgimento: si risolve dove il bersaglio è ORA -----
			var r0 := AbilityRuntime.resolve_instant(space, lance, origin, dir)
			_hit_without = r0.hits.size()

			# --- CON riavvolgimento a 120 ms ---------------------------------
			var hits: Array = _lag.hits_rewound(
				_bodies, 1, _t, 0.12, origin, dir, lance.range_m, Combat.BEAM_RADIUS
			)
			_hit_with = hits.size()

			_check(
				"senza riavvolgimento il colpo MANCA",
				_hit_without == 0,
				"%d colpiti (il bersaglio si è spostato di 1,05 m)" % _hit_without
			)
			_check(
				"con il riavvolgimento il colpo VA A SEGNO",
				_hit_with >= 1,
				"%d colpiti mirando dove il giocatore lo vedeva" % _hit_with
			)

			# --- E il mondo torna com'era ------------------------------------
			# Se un colpo lasciasse i corpi nel passato, il tick dopo li
			# simulerebbe da lì e la partita divergerebbe lentissimamente, in un
			# modo impossibile da diagnosticare.
			_check(
				"dopo il riavvolgimento il mondo è rimesso a posto",
				absf(_target.global_position.x - 1.05) < 0.12,
				"x = %.2f (atteso ~1.05)" % _target.global_position.x
			)

			# --- Il riavvolgimento è limitato --------------------------------
			var far_past = _lag.position_at(2, _t, 5.0)
			var capped = _lag.position_at(2, _t, LagCompScript.MAX_REWIND_SEC)
			_check(
				"il riavvolgimento è tagliato al massimo",
				far_past != null and capped != null and (far_past as Vector3).distance_to(capped) < 0.01,
				"oltre %.0f ms non si va indietro" % (LagCompScript.MAX_REWIND_SEC * 1000.0)
			)

			_finish()
			return true

	_step += 1
	return false


func _finish() -> void:
	print("")
	if failures == 0:
		print("=== IL COLPO CHE VEDI ANDARE A SEGNO, VA A SEGNO ===\n")
	else:
		printerr("=== %d CONTROLLI FALLITI ===\n" % failures)
	quit(1 if failures > 0 else 0)
