## Lag compensation — "favor the shooter".
##
## IL PROBLEMA, ed è il difetto che rende ingiocabile online un gioco per il
## resto perfetto. Tu vedi l'avversario dove era 60 ms fa, perché tanto ci mette
## il suo pacchetto ad arrivarti. Spari lì e centri. Ma quando la tua richiesta
## arriva al server sono passati altri 60 ms, e sul server l'avversario si è già
## spostato: il colpo non registra. A 9 m/s sono 1,1 metri — più largo di un
## corpo. Il giocatore vede il proprio colpo attraversare il nemico.
##
## LA SOLUZIONE, che è standard dagli anni 2000 (Valve, *Latency Compensating
## Methods*, 2001): il server tiene uno storico delle posizioni e, quando arriva
## un colpo, **riavvolge il mondo** a com'era nella vista di chi ha sparato,
## risolve lì, e rimette tutto a posto.
##
## IL PREZZO, dichiarato: chi spara guadagna, chi è sparato può essere colpito
## dietro un angolo che credeva sicuro. È il baratto che fanno tutti gli sparatutto
## online, e il limite di riavvolgimento è la manopola: oltre ~200 ms lo "sparato
## dietro l'angolo" diventa intollerabile, quindi si taglia lì e chi ha ping
## peggiore paga.
class_name LagComp

## Quanto storico si tiene. Coprire più di questo non serve: oltre si taglia.
const HISTORY_SEC := 0.5
## Riavvolgimento massimo. La manopola del baratto.
const MAX_REWIND_SEC := 0.2

## Storico per corpo: peer_id → Array di { t: float, pos: Vector3 }
var _history: Dictionary = {}


## Registra dove sono tutti, adesso. Va chiamato ogni tick del server.
func record(bodies: Dictionary, now: float) -> void:
	for peer_id in bodies.keys():
		var node = bodies[peer_id]["node"]
		if not is_instance_valid(node):
			continue
		if not _history.has(peer_id):
			_history[peer_id] = []
		var arr: Array = _history[peer_id]
		arr.append({"t": now, "pos": node.global_position})
		# Scarta il vecchio dal fondo: senza, lo storico cresce per sempre e in
		# una partita lunga diventa il primo consumo di memoria del server.
		while arr.size() > 0 and now - arr[0]["t"] > HISTORY_SEC:
			arr.pop_front()


## Dove era `peer_id` `rewind` secondi fa. Interpolato fra i due campioni che lo
## racchiudono: prendere il campione più vicino sbaglia fino a mezzo tick, che a
## 9 m/s è 7 cm — abbastanza da far mancare un bordo.
func position_at(peer_id: int, now: float, rewind: float) -> Variant:
	if not _history.has(peer_id):
		return null
	var arr: Array = _history[peer_id]
	if arr.is_empty():
		return null
	var target := now - clampf(rewind, 0.0, MAX_REWIND_SEC)
	if target <= arr[0]["t"]:
		return arr[0]["pos"]
	for i in range(arr.size() - 1, 0, -1):
		var b: Dictionary = arr[i]
		var a: Dictionary = arr[i - 1]
		if a["t"] <= target and target <= b["t"]:
			var span: float = maxf(b["t"] - a["t"], 0.0001)
			var f: float = (target - a["t"]) / span
			return (a["pos"] as Vector3).lerp(b["pos"] as Vector3, f)
	return arr[arr.size() - 1]["pos"]


## Riavvolge tutti i corpi TRANNE chi spara, esegue `resolve`, rimette a posto.
##
## Il ripristino è in un blocco che non può essere saltato: se un colpo lasciasse
## i corpi nel passato, il tick successivo li simulerebbe da lì e il gioco
## divergerebbe in modo lentissimo e impossibile da diagnosticare.
func rewound(bodies: Dictionary, shooter_id: int, now: float, rewind: float, resolve: Callable) -> Variant:
	var saved := {}
	for peer_id in bodies.keys():
		if peer_id == shooter_id:
			continue
		var node = bodies[peer_id]["node"]
		if not is_instance_valid(node):
			continue
		var past = position_at(peer_id, now, rewind)
		if past == null:
			continue
		saved[peer_id] = node.global_position
		_move_in_physics(node, past)

	var result = resolve.call()

	for peer_id in saved.keys():
		var node = bodies[peer_id]["node"]
		if is_instance_valid(node):
			_move_in_physics(node, saved[peer_id])
	return result


## Sposta un corpo NEL SERVER FISICO, non solo il nodo.
##
## Assegnare  cambia il nodo, ma il server fisico
## sincronizza le sue trasformazioni solo al passo di fisica successivo: una
## query fatta subito dopo vede ancora la posizione VECCHIA. Il riavvolgimento
## sembrava funzionare — il nodo si spostava davvero — e il colpo mancava lo
## stesso. È esattamente il difetto che in produzione si manifesta come "a volte
## il colpo non registra" e costa settimane, perché non dà nessun errore.
static func _move_in_physics(node: Node3D, pos: Vector3) -> void:
	node.global_position = pos
	var body := node as PhysicsBody3D
	if body:
		var t := body.global_transform
		t.origin = pos
		PhysicsServer3D.body_set_state(body.get_rid(), PhysicsServer3D.BODY_STATE_TRANSFORM, t)


func forget(peer_id: int) -> void:
	_history.erase(peer_id)


# --- Risoluzione riavvolta, in matematica pura ------------------------------
#
# PERCHE NON IL SERVER FISICO. Spostare i corpi nel passato e interrogare lo
# spazio non funziona: Godot sincronizza le trasformazioni dei corpi al passo di
# fisica, quindi una query fatta subito dopo lo spostamento vede ancora la
# posizione VECCHIA — e nemmeno PhysicsServer3D.body_set_state la anticipa. Il
# riavvolgimento sembrava avvenire (il nodo si muoveva davvero) e il colpo
# mancava lo stesso: nessun errore, nessun avviso, solo "a volte non registra".
#
# Questa e la ragione per cui gli sparatutto seri tengono una rappresentazione
# delle hitbox SEPARATA dal motore fisico. Qui e una capsula verticale e un test
# segmento-contro-segmento: venti righe, deterministiche, senza stato nascosto.

const CAPSULE_HEIGHT := 1.8
const CAPSULE_RADIUS := 0.4


## Distanza minima fra due segmenti. E il cuore del test: un fascio e un segmento,
## una capsula e un segmento piu un raggio.
static func _segment_distance(p1: Vector3, q1: Vector3, p2: Vector3, q2: Vector3) -> float:
	var d1 := q1 - p1
	var d2 := q2 - p2
	var r := p1 - p2
	var a := d1.dot(d1)
	var e := d2.dot(d2)
	var f := d2.dot(r)
	var s := 0.0
	var t := 0.0
	if a <= 0.00001 and e <= 0.00001:
		return r.length()
	if a <= 0.00001:
		t = clampf(f / e, 0.0, 1.0)
	else:
		var c := d1.dot(r)
		if e <= 0.00001:
			s = clampf(-c / a, 0.0, 1.0)
		else:
			var b := d1.dot(d2)
			var denom := a * e - b * b
			s = clampf((b * f - c * e) / denom, 0.0, 1.0) if denom > 0.00001 else 0.0
			t = (b * s + f) / e
			if t < 0.0:
				t = 0.0
				s = clampf(-c / a, 0.0, 1.0)
			elif t > 1.0:
				t = 1.0
				s = clampf((b - c) / a, 0.0, 1.0)
	return ((p1 + d1 * s) - (p2 + d2 * t)).length()


## Chi viene colpito da un fascio, valutato sulle posizioni RIAVVOLTE.
## Ritorna gli id dei peer colpiti.
func hits_rewound(
	bodies: Dictionary,
	shooter_id: int,
	now: float,
	rewind: float,
	origin: Vector3,
	dir: Vector3,
	range_m: float,
	beam_radius: float
) -> Array:
	var out: Array = []
	var beam_end := origin + dir.normalized() * range_m
	for peer_id in bodies.keys():
		if peer_id == shooter_id:
			continue
		var past = position_at(peer_id, now, rewind)
		if past == null:
			continue
		var c: Vector3 = past
		# La capsula sta in piedi: dal centro, meno il raggio alle due estremita.
		var half := CAPSULE_HEIGHT * 0.5 - CAPSULE_RADIUS
		var lo := c - Vector3(0, half, 0)
		var hi := c + Vector3(0, half, 0)
		if _segment_distance(origin, beam_end, lo, hi) <= beam_radius + CAPSULE_RADIUS:
			out.append(peer_id)
	return out
