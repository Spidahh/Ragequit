## Verifica che le abilità COLPISCANO DAVVERO, in un mondo fisico vero.
##
## Il test della scala (test_combat) dice che i numeri sono coerenti; questo dice
## che arrivano su un corpo. Sono due cose diverse, e il progetto precedente
## aveva la prima senza la seconda: 46 abilità su 53 non disegnavano niente e
## nessuno sapeva dove andassero.
##
##   godot --headless --script res://tests/test_ability_runtime.gd
extends SceneTree

const Combat := preload("res://src/combat.gd")
const AbilityRuntime := preload("res://src/ability_runtime.gd")
const DummyScript := preload("res://src/target_dummy.gd")

var failures := 0


func _check(what: String, ok: bool, detail: String) -> void:
	if ok:
		print("  ✓ %s — %s" % [what, detail])
	else:
		failures += 1
		printerr("  ✗ %s — %s" % [what, detail])


func _make_dummy(pos: Vector3) -> CharacterBody3D:
	var d := CharacterBody3D.new()
	d.set_script(DummyScript)
	var col := CollisionShape3D.new()
	var caps := CapsuleShape3D.new()
	caps.height = 1.8
	caps.radius = 0.4
	col.shape = caps
	d.add_child(col)
	d.position = pos
	return d


func _init() -> void:
	print("\n=== LE ABILITA COLPISCONO ===\n")

	# Un mondo fisico vero: serve un World3D con lo spazio attivo.
	var world := Node3D.new()
	root.add_child(world)

	var kit := Combat.starter_kit()
	var lance = kit[0]  # BEAM, 18 m
	var upheaval = kit[2]  # BURST, sbalza

	# Bersaglio dritto davanti, a 10 m.
	var d1 := _make_dummy(Vector3(0, 0.9, -10))
	world.add_child(d1)
	# Bersaglio fuori mira, 6 m di lato: NON deve essere colpito da un fascio.
	var d2 := _make_dummy(Vector3(6, 0.9, -10))
	world.add_child(d2)
	# Bersaglio vicino, per l'area.
	var d3 := _make_dummy(Vector3(2, 0.9, -2))
	world.add_child(d3)

	await process_frame
	await process_frame
	var space := world.get_world_3d().direct_space_state

	# --- 1. Il fascio colpisce quello che è in mira ---------------------------
	var r1 := AbilityRuntime.resolve_instant(space, lance, Vector3(0, 0.9, 0), Vector3(0, 0, -1))
	var hit_d1 := r1.hits.has(d1)
	_check("il fascio colpisce il bersaglio in mira", hit_d1, "%d colpiti" % r1.hits.size())

	# --- 2. E NON colpisce quello fuori mira ---------------------------------
	# È la prova che la tolleranza è un raggio stretto e non un cono che si
	# allarga: a 10 m un corpo a 6 m di lato deve essere mancato.
	_check(
		"il fascio manca chi è fuori mira",
		not r1.hits.has(d2),
		"bersaglio a 6 m di lato %s" % ("colpito (male)" if r1.hits.has(d2) else "mancato (bene)")
	)

	# --- 3. Il danno arriva davvero -------------------------------------------
	var hp_before: float = d1.hp
	var applied := AbilityRuntime.apply(r1)
	_check(
		"il danno viene applicato",
		d1.hp == hp_before - lance.damage and applied >= 1,
		"%.0f → %.0f (-%0.f)" % [hp_before, d1.hp, lance.damage]
	)

	# --- 4. L'area prende chi è vicino, in ogni direzione --------------------
	var r2 := AbilityRuntime.resolve_instant(space, upheaval, Vector3(0, 0.9, 0), Vector3(0, 0, -1))
	_check(
		"l'area prende chi è nel raggio",
		r2.hits.has(d3),
		"%d colpiti entro %.0f m" % [r2.hits.size(), Combat.BURST_RADIUS]
	)

	# --- 5. E sbalza in aria: il momento firma -------------------------------
	AbilityRuntime.apply(r2)
	await process_frame
	_check(
		"il lancio stacca il bersaglio da terra",
		d3.velocity.y > 0.0,
		"velocità verticale %.1f m/s" % d3.velocity.y
	)

	# --- 6. I cooldown impediscono lo spam -----------------------------------
	var cds := AbilityRuntime.Cooldowns.new()
	var now := 0.0
	_check("all'inizio si può lanciare", cds.can_cast(lance.id, now), "pronto")
	cds.start(lance.id, lance.cooldown, lance.cast_time, now)
	_check("subito dopo no", not cds.can_cast(lance.id, now + 0.1), "ancora in cooldown")
	# Il GCD blocca anche le ALTRE abilità, non solo quella lanciata.
	_check(
		"il GCD blocca anche il resto della mano",
		not cds.can_cast(upheaval.id, now + 0.1),
		"GCD %.2f s" % Combat.GCD_SEC
	)
	_check(
		"e si sblocca quando scade",
		cds.can_cast(lance.id, now + lance.cooldown + 0.01),
		"pronto dopo %.1f s" % lance.cooldown
	)

	print("")
	if failures == 0:
		print("=== LE ABILITA FUNZIONANO ===\n")
	else:
		printerr("=== %d CONTROLLI FALLITI ===\n" % failures)
	quit(1 if failures > 0 else 0)
