## Verifica che due giocatori esistano DAVVERO nella stessa arena.
##
## Il test precedente (test_net) provava che i messaggi passano. Questo prova la
## cosa che conta: il client preme avanti, il SERVER muove il suo corpo con la
## simulazione autoritativa, e la posizione torna indietro. È la differenza fra
## "la rete risponde" e "si gioca insieme".
##
##   godot --headless --script res://tests/test_net_world.gd -- server
##   godot --headless --script res://tests/test_net_world.gd -- client
extends SceneTree

const NetScript := preload("res://src/net.gd")
const WorldScript := preload("res://src/net_world.gd")

var net: Node
var world: Node3D
var role := "server"
var _t := 0.0
var _started := false
var _start_pos := Vector3.INF
var _moved := 0.0
var _bodies_seen := 0


func _init() -> void:
	var args := OS.get_cmdline_user_args()
	if args.size() > 0:
		role = args[0]

	# Pavimento: senza, i corpi cadono e il test misura una caduta, non una corsa.
	var ground := StaticBody3D.new()
	var gcol := CollisionShape3D.new()
	var gshape := BoxShape3D.new()
	gshape.size = Vector3(120, 1, 120)
	gcol.shape = gshape
	gcol.position = Vector3(0, -0.5, 0)
	ground.add_child(gcol)
	root.add_child(ground)

	net = NetScript.new()
	net.name = "Net"
	root.add_child(net)
	net.net_status.connect(func(m): print("  [%s] %s" % [role, m]))

	world = WorldScript.new()
	world.name = "World"
	root.add_child(world)


func _process(delta: float) -> bool:
	_t += delta

	if not _started:
		_started = true
		if role == "server":
			if not net.host():
				print("  [server] ESITO: host fallito")
				quit(1)
				return true
		else:
			net.join()
		world.setup(net)
		return false

	if role == "server":
		world.server_tick(delta)

	var mp = net.multiplayer
	var connected: bool = (
		mp != null
		and mp.multiplayer_peer != null
		and mp.multiplayer_peer.get_connection_status() == MultiplayerPeer.CONNECTION_CONNECTED
	)

	# Il client tiene premuto AVANTI. Non tocca il proprio corpo: vuole vedere
	# se è il SERVER a muoverlo.
	if role == "client" and connected:
		net.send_input.rpc_id(1, Vector2(0, 1), 0.0, 0.0, false, int(_t * 60.0))
		var mine: int = mp.get_unique_id()
		if world.bodies.has(mine):
			var body = world.bodies[mine]["node"]
			if _start_pos == Vector3.INF:
				_start_pos = body.global_position
			_moved = _start_pos.distance_to(body.global_position)
		_bodies_seen = world.bodies.size()

	if role == "server":
		_bodies_seen = world.bodies.size()

	if _t > 6.0:
		var ok := false
		if role == "server":
			# Due corpi: il server e il client.
			ok = _bodies_seen >= 2
			print("  [server] ESITO: corpi=%d" % _bodies_seen)
		else:
			# Il corpo del client si è mosso perché il SERVER l'ha simulato.
			ok = _moved > 3.0 and _bodies_seen >= 2
			print("  [client] ESITO: corpi_visti=%d spostamento=%.2f m" % [_bodies_seen, _moved])
		quit(0 if ok else 1)
		return true
	return false
