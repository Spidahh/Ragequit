## Verifica le correzioni che un test puramente numerico non vedeva: il windup
## deve ritardare davvero il colpo, le abilita' di movimento devono muovere e
## l'HUD deve distinguere gli slot con icone e famiglie.
extends SceneTree

var failures := 0
var arena: Node3D
var player: CharacterBody3D
var target: CharacterBody3D
var hud: CanvasLayer
var step := 0
var wait := 0
var uppercut := -1
var hp_before := 0.0


func _check(what: String, ok: bool, detail: String) -> void:
	if ok:
		print("  ✓ %s — %s" % [what, detail])
	else:
		failures += 1
		printerr("  ✗ %s — %s" % [what, detail])


func _slot(id: String) -> int:
	for i in player.kit().size():
		if String(player.kit()[i]["id"]) == id:
			return i
	return -1


func _init() -> void:
	print("\n=== COMBATTIMENTO LEGGIBILE ===\n")
	arena = (load("res://scenes/arena.tscn") as PackedScene).instantiate()
	root.add_child(arena)
	current_scene = arena
	player = arena.get_node("Player")
	target = arena.get_node("DummyFermo")
	hud = arena.get_node("HUD")
	player.practice = true


func _process(_delta: float) -> bool:
	if wait > 0:
		wait -= 1
		return false
	match step:
		0:
			wait = 8
		1:
			var slots: Array = hud._slots
			var icons_ok := slots.size() == 8
			var families := {}
			for slot in slots:
				icons_ok = icons_ok and slot["icon"].texture != null
				families[slot["family"]] = true
			_check("otto icone reali in HUD", icons_ok, "%d slot" % slots.size())
			_check("le armi sono separate", families.size() >= 3, str(families.keys()))

			player.global_position = Vector3(0, 0.9, 0)
			player.rotation.y = 0.0
			player._yaw = 0.0
			player._pitch = 0.0
			player._sim["pos"] = player.global_position
			player._sim["vel"] = Vector3.ZERO
			player.get_node("Camera3D").rotation.x = 0.0
			target.global_position = Vector3(0, 0.9, -1.5)
			PhysicsServer3D.body_set_state(
				target.get_rid(), PhysicsServer3D.BODY_STATE_TRANSFORM, target.global_transform
			)
			PhysicsServer3D.body_set_state(
				player.get_rid(), PhysicsServer3D.BODY_STATE_TRANSFORM, player.global_transform
			)
			uppercut = _slot("uppercut")
			hp_before = target.hp
			# La broadphase fisica aggiorna le forme al frame successivo. Il cast
			# deve essere provato contro il mondo reale, non contro trasformi appena
			# scritti che il server fisico non ha ancora indicizzato.
			wait = 3
		2:
			_check("Uppercut e' nel kit", uppercut >= 0, "slot %d" % (uppercut + 1))
			_check("il windup comincia", player.request_cast(uppercut), "richiesta accettata")
			_check("e il colpo non parte subito", is_equal_approx(target.hp, hp_before), "vita invariata")
			player._clock += 0.20
			player._advance_pending_cast()
			_check("a meta' preparazione ancora niente", is_equal_approx(target.hp, hp_before), "nessun danno anticipato")
			player._clock += 0.25
			player._advance_pending_cast()
			_check("al rilascio il colpo arriva", target.hp < hp_before, "vita %.0f → %.0f" % [hp_before, target.hp])
			target.global_position = Vector3(0, 0.9, -1.5)
			PhysicsServer3D.body_set_state(
				target.get_rid(), PhysicsServer3D.BODY_STATE_TRANSFORM, target.global_transform
			)
			hp_before = target.hp
			wait = 1
		3:
			var weapon_before := String(player._weapon)
			var tab := InputEventKey.new()
			tab.keycode = KEY_TAB
			tab.pressed = true
			arena._input(tab)
			_check("Tab cambia l'arma attiva", String(player._weapon) != weapon_before, "%s → %s" % [weapon_before, player._weapon])
			# Torniamo alla spada per verificare il suo attacco base.
			arena._weapon_tab_down = false
			arena._input(tab)
			_check("LMB spada comincia lo swing", player._basic.press(player._clock), "input accettato")
			_check("la lama non colpisce prima del gesto", is_equal_approx(target.hp, hp_before), "vita invariata")
			player._clock += 0.21
			player._basic.tick(player._clock)
			_check("LMB spada colpisce al centro dello swing", target.hp < hp_before, "vita %.0f → %.0f" % [hp_before, target.hp])

			var gap := _slot("gap_closer")
			player._sim["vel"] = Vector3.ZERO
			player.cast_slot(gap)
			var dash_speed := Vector2(player._sim["vel"].x, player._sim["vel"].z).length()
			_check("Gap Closer muove davvero", dash_speed > 10.0, "%.1f m/s" % dash_speed)

			var whirlwind := _slot("whirlwind")
			player.cast_slot(whirlwind)
			var ring_found := false
			for child in arena.get_children():
				if child is Area3D and child.get("_mesh") != null:
					var mesh = child.get("_mesh")
					if mesh is MeshInstance3D and mesh.mesh is TorusMesh:
						ring_found = true
						break
			_check("la zona lascia libero il centro", ring_found, "bordo ad anello, non disco pieno")

			var wheel_key := InputEventKey.new()
			wheel_key.keycode = KEY_E
			wheel_key.pressed = true
			player._unhandled_input(wheel_key)
			var aim_right := InputEventMouseMotion.new()
			aim_right.relative = Vector2(70, 0)
			player._unhandled_input(aim_right)
			wheel_key.pressed = false
			player._unhandled_input(wheel_key)
			_check("E apre quattro abilita' e ne prepara una", player._primed_slot == 1, "slot %d primato" % (player._primed_slot + 1))
			_finish()
			return true
	step += 1
	return false


func _finish() -> void:
	print("")
	if failures == 0:
		print("Tutto verde.\n")
		quit(0)
	else:
		printerr("%d rosso/i.\n" % failures)
		quit(1)
