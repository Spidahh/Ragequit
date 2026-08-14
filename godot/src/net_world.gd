## Il mondo in rete: un corpo per ogni peer, mosso dal server.
##
## COME FUNZIONA, in ordine di tick:
##   1. il client legge l'input e muove SUBITO il proprio corpo (predizione), o
##      ogni pressione di tasto costerebbe un giro di rete prima di vedersi;
##   2. lo manda al server;
##   3. il server rigira la STESSA `Movement.step` per ogni peer e ottiene la
##      posizione vera;
##   4. il server la ritrasmette; il client la confronta con la propria e, se
##      divergono oltre una soglia, si corregge.
##
## La soglia esiste perché correggere ogni minimo scarto fa vibrare il corpo:
## sotto qualche centimetro la differenza non si vede e non vale un salto di
## posizione, sopra sì.
extends Node3D

const Movement := preload("res://src/movement.gd")
const NetScript := preload("res://src/net.gd")
const LagCompScript := preload("res://src/lag_comp.gd")
const AbilityRuntime := preload("res://src/ability_runtime.gd")
const Combat := preload("res://src/combat.gd")
const BodyScript := preload("res://src/net_body.gd")
const MatchRules := preload("res://src/match_rules.gd")
const SpawnsScript := preload("res://src/spawns.gd")

## Oltre questo scarto fra predizione e verità del server, il client si allinea.
const RECONCILE_M := 0.35

var net: Node = null
## Corpo di ogni peer: id → { node, sim }
var bodies: Dictionary = {}
## Storico posizioni per il riavvolgimento. Solo sul server.
var lag := LagCompScript.new()
## Cooldown per peer: il server è l'unico a decidere se puoi lanciare.
var cooldowns: Dictionary = {}
## Ping stimato per peer, in secondi. Serve a sapere DI QUANTO riavvolgere.
var rtt: Dictionary = {}
var _clock := 0.0

## Le regole della partita in corso. Vuoto finché non se ne apre una: si può
## stare nell'arena senza che nessuno stia segnando niente (il poligono).
var match_state: Dictionary = {}

signal body_spawned(peer_id: int)
signal match_event(event: Dictionary)


func setup(net_node: Node) -> void:
	net = net_node
	net.player_joined.connect(_spawn_body)
	net.player_left.connect(_despawn_body)
	net.cast_requested.connect(_on_cast_requested)
	# Il server ha anche il proprio corpo (id 1).
	if net.is_server:
		_spawn_body(1)


func _spawn_body(peer_id: int) -> void:
	if bodies.has(peer_id):
		return
	var body := CharacterBody3D.new()
	body.set_script(BodyScript)
	body.set("peer_id", peer_id)
	body.name = "Peer%d" % peer_id
	var col := CollisionShape3D.new()
	var caps := CapsuleShape3D.new()
	caps.height = 1.8
	caps.radius = 0.4
	col.shape = caps
	body.add_child(col)
	var mesh := MeshInstance3D.new()
	var cm := CapsuleMesh.new()
	cm.height = 1.8
	cm.radius = 0.4
	mesh.mesh = cm
	body.add_child(mesh)
	# Dove si nasce lo decide un file solo: vedi spawns.gd.
	body.position = SpawnsScript.farthest_from(_occupied_positions())
	add_child(body)
	bodies[peer_id] = {"node": body, "sim": Movement.make_state(body.position), "hp": Combat.HP_MAX}
	if not match_state.is_empty():
		MatchRules.join(match_state, peer_id)
	body_spawned.emit(peer_id)


func _occupied_positions() -> Array:
	var out := []
	for id in bodies.keys():
		var n = bodies[id]["node"]
		if is_instance_valid(n):
			out.append(n.global_position)
	return out


func _despawn_body(peer_id: int) -> void:
	if not bodies.has(peer_id):
		return
	var b = bodies[peer_id]["node"]
	if is_instance_valid(b):
		b.queue_free()
	bodies.erase(peer_id)
	cooldowns.erase(peer_id)
	rtt.erase(peer_id)
	lag.forget(peer_id)
	if not match_state.is_empty():
		MatchRules.leave(match_state, peer_id)


## Apre una partita sui corpi già presenti. Il server è l'unico a tenerne lo
## stato: il client riceve il punteggio, non lo calcola.
func start_match(mode: int) -> void:
	if net != null and not net.is_server:
		return
	match_state = MatchRules.start(mode, bodies.keys())


## Il tick autoritativo. Gira SOLO sul server.
func server_tick(delta: float) -> void:
	if net == null or not net.is_server:
		return
	for peer_id in bodies.keys():
		var entry = bodies[peer_id]
		var body: CharacterBody3D = entry["node"]
		if not is_instance_valid(body):
			continue
		var inp = net.inputs.get(peer_id, null)
		var wish := Vector2.ZERO
		var yaw := 0.0
		var jump := false
		if inp != null:
			wish = inp["wish"]
			yaw = inp["yaw"]
			jump = inp["jump"]

		var sim: Dictionary = entry["sim"]
		sim["pos"] = body.global_position
		sim["on_ground"] = body.is_on_floor()
		sim = Movement.step(sim, wish, yaw, jump, delta)
		body.velocity = sim["vel"]
		body.move_and_slide()
		sim["vel"] = body.velocity
		sim["pos"] = body.global_position
		entry["sim"] = sim

	_clock += delta
	lag.record(bodies, _clock)
	_match_tick(delta)
	_broadcast_state()


func _match_tick(delta: float) -> void:
	if match_state.is_empty():
		return
	for peer_id in bodies.keys():
		MatchRules.report_hp(match_state, peer_id, float(bodies[peer_id]["hp"]))
	for event in MatchRules.tick(match_state, delta):
		if event["kind"] == "respawn":
			_respawn(int(event["peer"]))
		net.broadcast_match_event.rpc(event)
		match_event.emit(event)


## Torna in vita: vita piena, velocità azzerata, e il punto più lontano da
## chiunque sia in campo. Rinascere a fianco di chi ti ha appena ucciso è la
## differenza fra "ho perso" e "non mi hanno fatto giocare".
func _respawn(peer_id: int) -> void:
	if not bodies.has(peer_id):
		return
	var entry = bodies[peer_id]
	var body = entry["node"]
	if not is_instance_valid(body):
		return
	var others := []
	for id in bodies.keys():
		if id != peer_id and is_instance_valid(bodies[id]["node"]):
			others.append(bodies[id]["node"].global_position)
	body.global_position = SpawnsScript.farthest_from(others)
	body.velocity = Vector3.ZERO
	entry["hp"] = Combat.HP_MAX
	entry["sim"] = Movement.make_state(body.global_position)
	net.broadcast_damage.rpc(peer_id, 0.0, Combat.HP_MAX)


func _broadcast_state() -> void:
	# Un pacchetto solo con tutte le posizioni: un messaggio per giocatore
	# moltiplica i pacchetti per il numero di peer al quadrato.
	var ids := PackedInt32Array()
	var pos := PackedVector3Array()
	for peer_id in bodies.keys():
		var b = bodies[peer_id]["node"]
		if is_instance_valid(b):
			ids.append(peer_id)
			pos.append(b.global_position)
	apply_state.rpc(ids, pos)


@rpc("authority", "unreliable_ordered", "call_remote")
func apply_state(ids: PackedInt32Array, positions: PackedVector3Array) -> void:
	for i in ids.size():
		var peer_id := ids[i]
		if not bodies.has(peer_id):
			_spawn_body(peer_id)
		if not bodies.has(peer_id):
			continue
		var body = bodies[peer_id]["node"]
		if not is_instance_valid(body):
			continue
		var truth := positions[i]
		var mine: int = net.multiplayer.get_unique_id() if net and net.multiplayer else 0
		if peer_id == mine:
			# Il MIO corpo: correggi solo se la predizione ha sbagliato tanto.
			# Allinearsi a ogni pacchetto annullerebbe la predizione e
			# rimetterebbe il ritardo di rete dentro il movimento.
			if body.global_position.distance_to(truth) > RECONCILE_M:
				body.global_position = truth
		else:
			# Gli ALTRI: si interpolano verso la verità invece di saltarci sopra,
			# o a 20 pacchetti al secondo si muovono a scatti.
			body.global_position = body.global_position.lerp(truth, 0.35)


func _on_cast_requested(peer_id: int, slot: int, origin: Vector3, dir: Vector3) -> void:
	if net == null or not net.is_server:
		return
	if not bodies.has(peer_id):
		return

	var kit := Combat.starter_kit()
	if slot < 0 or slot >= kit.size():
		return
	var ability = kit[slot]

	# IL COOLDOWN LO TIENE IL SERVER. Un client che tiene il proprio è un client
	# che può lanciare quanto vuole: basta non farlo scorrere.
	if not cooldowns.has(peer_id):
		cooldowns[peer_id] = AbilityRuntime.Cooldowns.new()
	var cds = cooldowns[peer_id]
	if not cds.can_cast(ability.id, _clock):
		return
	cds.start(ability.id, ability.cooldown, ability.cast_time, _clock)

	# Riavvolgi il mondo alla vista di chi ha sparato, poi risolvi.
	var rewind: float = float(rtt.get(peer_id, 0.0)) * 0.5

	# Il test riavvolto e in matematica pura, NON via server fisico: vedi
	# lag_comp.hits_rewound per il perche (Godot sincronizza le trasformazioni al
	# passo di fisica, quindi una query subito dopo lo spostamento vede la
	# posizione vecchia e il riavvolgimento non ha alcun effetto).
	var hit_ids: Array = lag.hits_rewound(
		bodies, peer_id, _clock, rewind, origin, dir, ability.range_m, Combat.BEAM_RADIUS
	)

	# Il danno lo applica il server, e solo lui.
	var hit_points := PackedVector3Array()
	for other_id in hit_ids:
		if not bodies.has(other_id):
			continue
		# Un morto non si colpisce. Senza questo, i tre secondi di attesa sono
		# tre secondi in cui il cadavere continua a far salire il punteggio.
		if not match_state.is_empty() and not bool(match_state["alive"].get(other_id, true)):
			continue
		var node = bodies[other_id]["node"]
		if is_instance_valid(node):
			hit_points.append(node.global_position)
		var hp: float = float(bodies[other_id]["hp"]) - ability.damage
		bodies[other_id]["hp"] = maxf(0.0, hp)
		net.broadcast_damage.rpc(other_id, ability.damage, bodies[other_id]["hp"])
		# La morte la dichiara chi applica il danno, non un controllo periodico:
		# un tick di ritardo fra "vita a zero" e "sei morto" è un tick in cui si
		# può ancora essere uccisi una seconda volta, e il punteggio raddoppia.
		if hp <= 0.0 and not match_state.is_empty():
			MatchRules.on_kill(match_state, peer_id, other_id)

	net.broadcast_cast.rpc(int(ability.shape), origin, origin + dir * ability.range_m, hit_points)


## Il client dichiara il proprio ping; il server lo usa per sapere di quanto
## riavvolgere. È un valore che il client può mentire, ed è per questo che
## MAX_REWIND_SEC lo taglia: mentire oltre quella soglia non compra niente.
func set_peer_rtt(peer_id: int, seconds: float) -> void:
	rtt[peer_id] = clampf(seconds, 0.0, LagCompScript.MAX_REWIND_SEC * 2.0)
