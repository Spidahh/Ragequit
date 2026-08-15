## Verifica headless del controller portato.
##
## Non controlla che "funzioni": controlla che si comporti come l'ORIGINALE.
## Il progetto Three.js aveva misurato e dichiarato i suoi numeri di feel — 133 ms
## per raggiungere la velocità massima, 0,81 m di spazio di frenata, 183 ms per
## invertire — e sono quelli che rendono il movimento buono. Un porting che li
## cambia ha perso la cosa che stava portando.
##
##   godot --headless --script res://tests/test_movement.gd
extends SceneTree

const DT := 1.0 / 60.0
var failures := 0


func _fail(what: String, got, want, tol := 0.0) -> void:
	failures += 1
	printerr("  ✗ %s: ottenuto %s, atteso %s (± %s)" % [what, got, want, tol])


func _near(what: String, got: float, want: float, tol: float) -> void:
	if absf(got - want) <= tol:
		print("  ✓ %s = %.3f (atteso %.3f ± %.3f)" % [what, got, want, tol])
	else:
		_fail(what, "%.4f" % got, "%.4f" % want, tol)


func _init() -> void:
	print("\n=== CONTROLLER PORTATO — verifica di comportamento ===\n")

	# --- 1. Tempo per raggiungere la velocità massima ------------------------
	# La velocità si ACCUMULA: partendo da fermo deve servire tempo reale.
	var s := Movement.make_state(Vector3(0, 0.9, 0))
	var ticks := 0
	while ticks < 600:
		s = Movement.step(s, Vector2(0, 1), 0.0, false, DT)
		var sp := Vector2(s["vel"].x, s["vel"].z).length()
		if sp >= Movement.MOVE_SPEED * 0.99:
			break
		ticks += 1
	_near("tempo alla velocità massima (ms)", ticks * DT * 1000.0, 133.0, 25.0)

	# --- 2. Spazio di frenata -------------------------------------------------
	# Rilasciando l'input il corpo non si ferma sul posto: ha peso.
	s = Movement.make_state(Vector3(0, 0.9, 0))
	for i in 120:
		s = Movement.step(s, Vector2(0, 1), 0.0, false, DT)
	var start_z: float = s["pos"].z
	var stop_ticks := 0
	while stop_ticks < 600:
		s = Movement.step(s, Vector2.ZERO, 0.0, false, DT)
		if Vector2(s["vel"].x, s["vel"].z).length() < 0.01:
			break
		stop_ticks += 1
	_near("spazio di frenata (m)", absf(s["pos"].z - start_z), 0.81, 0.25)

	# --- 3. Altezza del salto -------------------------------------------------
	s = Movement.make_state(Vector3(0, 0.9, 0))
	s = Movement.step(s, Vector2.ZERO, 0.0, true, DT)
	var apex: float = s["pos"].y
	for i in 200:
		s = Movement.step(s, Vector2.ZERO, 0.0, false, DT)
		apex = maxf(apex, s["pos"].y)
		if s["on_ground"]:
			break
	_near("altezza del salto (m)", apex - 0.9, Movement.JUMP_HEIGHT_TAP, 0.08)

	# --- 4. Il salto conserva la velocità (l'ordine attrito/salto) -----------
	# In Quake il salto precede l'attrito: un hop cronometrato non paga il tick.
	s = Movement.make_state(Vector3(0, 0.9, 0))
	for i in 120:
		s = Movement.step(s, Vector2(0, 1), 0.0, false, DT)
	var speed_before := Vector2(s["vel"].x, s["vel"].z).length()
	s = Movement.step(s, Vector2(0, 1), 0.0, true, DT)
	var speed_after := Vector2(s["vel"].x, s["vel"].z).length()
	if speed_after >= speed_before - 0.01:
		print("  ✓ il salto conserva la velocità (%.2f → %.2f)" % [speed_before, speed_after])
	else:
		_fail("salto che conserva la velocità", "%.2f" % speed_after, ">= %.2f" % speed_before)

	# --- 5. Il controllo aereo permette di guadagnare velocità ---------------
	# Il clamp è sulla proiezione, non sul modulo: strafe in aria = più veloce
	# del cap di terra. È il tetto di skill del movimento, e deve sopravvivere.
	s = Movement.make_state(Vector3(0, 0.9, 0))
	for i in 120:
		s = Movement.step(s, Vector2(0, 1), 0.0, false, DT)
	s = Movement.step(s, Vector2(0, 1), 0.0, true, DT)
	var yaw := 0.0
	for i in 60:
		yaw += 0.03
		s = Movement.step(s, Vector2(1, 1), yaw, false, DT)
	var air_speed := Vector2(s["vel"].x, s["vel"].z).length()
	if air_speed > Movement.MOVE_SPEED:
		print("  ✓ strafe aereo guadagna velocità (%.2f > %.2f a terra)" % [air_speed, Movement.MOVE_SPEED])
	else:
		_fail("strafe aereo", "%.2f" % air_speed, "> %.2f" % Movement.MOVE_SPEED)

	# --- 6. Coyote time -------------------------------------------------------
	# Cadendo da un bordo il salto resta valido per qualche tick.
	s = Movement.make_state(Vector3(0, 5.0, 0))
	s["on_ground"] = true
	s = Movement.step(s, Vector2.ZERO, 0.0, false, DT)  # lascia il suolo
	var coyote_ok: bool = s["coyote_left"] > 0
	s = Movement.step(s, Vector2.ZERO, 0.0, true, DT)  # salta a mezz'aria
	if coyote_ok and s["vel"].y > 0.0:
		print("  ✓ coyote time: il salto resta valido dopo aver lasciato il bordo")
	else:
		_fail("coyote time", "vy=%.2f" % s["vel"].y, "> 0")

	print("")
	if failures == 0:
		print("=== TUTTO VERDE — il feel del movimento è sopravvissuto al porting ===\n")
	else:
		printerr("=== %d VERIFICHE FALLITE ===\n" % failures)
	quit(1 if failures > 0 else 0)
