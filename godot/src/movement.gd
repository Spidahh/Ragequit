## Il controller di movimento — Quake PM_Accelerate / PM_Friction.
##
## PORTATO DAL PROGETTO PRECEDENTE, non riscritto: era la cosa migliore che
## avesse. Velocità che si ACCUMULA invece di essere assegnata, attrito con
## stop-speed, controllo aereo con clamp sulla PROIEZIONE, coyote time e jump
## buffer. Sono numeri già provati in partita — 133 ms per raggiungere la velocità
## massima, 0,81 m di spazio di frenata — e non vanno reinventati.
##
## Deliberatamente SENZA STATO DI NODO: è una funzione pura su uno stato passato,
## come nell'originale. Serve a due cose che verranno dopo:
##   1. il server autoritativo può girare la stessa identica funzione;
##   2. si può testare headless, senza scena e senza fisica del motore.
class_name Movement

# --- Costanti, dai constants/world.ts e stats.ts del progetto precedente ------
const GRAVITY := 25.0
const MOVE_SPEED := 9.0
const JUMP_HEIGHT_TAP := 1.5
const GROUND_ACCEL_COEF := 12.0
const GROUND_FRICTION := 8.0
const STOP_SPEED := 3.0
const AIR_ACCEL_COEF := 1.0
const AIR_SPEED_CAP := 14.5
const MAX_FALL_SPEED := 60.0
const CAPSULE_HALF_HEIGHT := 0.9
const COYOTE_TICKS := 5
const JUMP_BUFFER_TICKS := 5

## Velocità verticale iniziale del salto, dall'equazione del moto: v0 = sqrt(2gh).
static func jump_velocity() -> float:
	return sqrt(2.0 * GRAVITY * JUMP_HEIGHT_TAP)


## Lo stato del corpo. Un Dictionary e non una classe: deve poter essere
## serializzato e confrontato tick per tick nella riconciliazione di rete.
static func make_state(spawn: Vector3) -> Dictionary:
	return {
		"pos": spawn,
		"vel": Vector3.ZERO,
		"on_ground": true,
		"coyote_left": 0,
		"jump_buffer": 0,
		"knockback_ticks": 0,
	}


## UN tick di simulazione. `dt` DEVE essere fisso (1/60): il determinismo
## dipende dal passo costante, ed è ciò che permette al client di predire e al
## server di confermare senza divergere.
##
## `wish` è l'input WASD normalizzato nello spazio locale (x destra, z avanti).
## `yaw` è la direzione di sguardo. `ground_y` è il piano di appoggio.
static func step(previous: Dictionary, wish: Vector2, yaw: float, jump: bool, dt: float, ground_y: float = 0.0) -> Dictionary:
	# LO STATO IN INGRESSO NON SI TOCCA.
	#
	# In GDScript un Dictionary viaggia per riferimento: scrivere dentro
	# `previous` significa scrivere dentro il dizionario di chi ha chiamato. Con
	# la predizione semplice non si notava — c'era un solo stato e lo si voleva
	# aggiornare. Con il ROLLBACK e' fatale: lo storico da cui si riavvolge sono
	# proprio quei dizionari, e risimulare li corromperebbe uno dopo l'altro,
	# quindi ogni riavvolgimento ripartirebbe da uno stato gia' sporcato dal
	# riavvolgimento precedente. Il gioco non divergerebbe di colpo: si
	# scollerebbe piano, e nessuno saprebbe perche'.
	#
	# Se ne e' accorto un test scritto apposta, non un errore in console.
	var state := previous.duplicate(true)
	var vel: Vector3 = state["vel"]
	var pos: Vector3 = state["pos"]

	# Finestra di knockback: durante questa l'attrito e il cap aereo sono sospesi,
	# altrimenti l'impulso di un lancio viene dissipato nel tick stesso in cui
	# arriva. È un'assegnazione, mai un refresh: il contatore solo scende.
	if state["knockback_ticks"] > 0:
		state["knockback_ticks"] -= 1
	var in_knockback: bool = state["knockback_ticks"] > 0

	# Direzione desiderata nello spazio mondo.
	var mag := minf(wish.length(), 1.0)
	var dir := Vector3.ZERO
	if mag > 0.0:
		var n := wish.normalized()
		# yaw = 0 guarda verso -Z, come nel progetto precedente.
		var c := cos(yaw)
		var s := sin(yaw)
		dir = Vector3(n.x * c + n.y * s, 0.0, -n.x * s + n.y * c)

	# --- Salto: DELIBERATAMENTE prima dell'attrito ---------------------------
	# In Quake PM_WalkMove chiama PM_CheckJump e passa a PM_AirMove prima di
	# arrivare a PM_Friction: un salto cronometrato sul tick di atterraggio
	# conserva la velocità. Con l'ordine invertito ogni salto perfetto pagava un
	# tick pieno di attrito — il 13,3% della velocità — cioè veniva punito
	# esattamente l'input che il sistema dovrebbe premiare.
	var was_on_ground: bool = state["on_ground"]
	var can_jump: bool = state["on_ground"] or state["jump_buffer"] > 0 or state["coyote_left"] > 0
	var did_jump := false

	if jump:
		state["jump_buffer"] = JUMP_BUFFER_TICKS
	elif state["jump_buffer"] > 0:
		state["jump_buffer"] -= 1
	var wants_jump: bool = jump or state["jump_buffer"] > 0

	if wants_jump and can_jump:
		vel.y = jump_velocity()
		state["on_ground"] = false
		state["coyote_left"] = 0
		state["jump_buffer"] = 0
		did_jump = true

	# --- Attrito, poi accelerazione (PM_Friction / PM_Accelerate) -------------
	if state["on_ground"] and not in_knockback:
		var sp := Vector2(vel.x, vel.z).length()
		if sp < 0.1:
			vel.x = 0.0
			vel.z = 0.0
		else:
			# Sotto STOP_SPEED l'attrito diventa costante, così si raggiunge uno
			# zero vero invece di avvicinarcisi per sempre.
			var control := STOP_SPEED if sp < STOP_SPEED else sp
			var ns := maxf(0.0, sp - control * GROUND_FRICTION * dt)
			vel.x *= ns / sp
			vel.z *= ns / sp

	var wish_speed := MOVE_SPEED * mag
	var coef := GROUND_ACCEL_COEF if state["on_ground"] else AIR_ACCEL_COEF
	# Il clamp è sulla PROIEZIONE della velocità sulla direzione desiderata, mai
	# sul suo modulo. È quella singola scelta a far funzionare il controllo aereo.
	var cur := vel.x * dir.x + vel.z * dir.z
	var add := wish_speed - cur
	if add > 0.0:
		# min(a, add) fa convergere il passo a wish_speed senza mai superarlo, a
		# qualunque dt: indipendente dal tick rate per costruzione.
		var a := minf(coef * wish_speed * dt, add)
		vel.x += a * dir.x
		vel.z += a * dir.z

	if not state["on_ground"] and not in_knockback:
		var sp2 := Vector2(vel.x, vel.z).length()
		if sp2 > AIR_SPEED_CAP:
			vel.x *= AIR_SPEED_CAP / sp2
			vel.z *= AIR_SPEED_CAP / sp2

	# --- Gravità e integrazione ----------------------------------------------
	vel.y -= GRAVITY * dt
	if vel.y < -MAX_FALL_SPEED:
		vel.y = -MAX_FALL_SPEED
	pos += vel * dt

	# --- Piano di appoggio ----------------------------------------------------
	var floor_y := ground_y + CAPSULE_HALF_HEIGHT
	if pos.y <= floor_y:
		pos.y = floor_y
		if vel.y < 0.0:
			vel.y = 0.0
		state["on_ground"] = true
	else:
		state["on_ground"] = false

	# --- Coyote time ----------------------------------------------------------
	# Concesso solo quando si lascia il suolo NATURALMENTE, mai dopo un salto.
	if state["on_ground"]:
		state["coyote_left"] = 0
	elif was_on_ground and not did_jump:
		state["coyote_left"] = COYOTE_TICKS
	elif state["coyote_left"] > 0:
		state["coyote_left"] -= 1

	state["vel"] = vel
	state["pos"] = pos
	return state
