## Verifica la rete: due processi, uno ospita e uno entra.
##
## Non si può testare una connessione dentro un solo albero di scena — servono
## due peer veri. Questo script fa entrambe le parti a seconda dell'argomento,
## e il lanciatore (tools/net_smoke.mjs) avvia i due processi e confronta.
##
##   godot --headless --script res://tests/test_net.gd -- server
##   godot --headless --script res://tests/test_net.gd -- client
extends SceneTree

const NetScript := preload("res://src/net.gd")

var net: Node
var role := "server"
var _t := 0.0
var _seen_peer := false
var _got_input := false
var _got_cast := false
var _sent := 0


func _init() -> void:
	var args := OS.get_cmdline_user_args()
	if args.size() > 0:
		role = args[0]
	net = NetScript.new()
	net.name = "Net"
	root.add_child(net)
	net.net_status.connect(func(m): print("  [%s] %s" % [role, m]))
	net.player_joined.connect(func(id): _seen_peer = true; print("  [%s] entrato peer %d" % [role, id]))
	net.cast_requested.connect(_on_cast_requested)
	net.cast_happened.connect(func(_s, _f, _to, _h): _got_cast = true)

	# host/join NON qui: in _init il nodo non e ancora dentro l'albero e la sua
	# proprieta 'multiplayer' e null. Si avvia al primo frame.


func _on_cast_requested(peer_id: int, slot: int, _o: Vector3, _d: Vector3) -> void:
	_got_input = true
	print("  [server] richiesta di lancio dal peer %d, slot %d" % [peer_id, slot])
	# Il server risponde con l'effetto, come farebbe in partita.
	net.broadcast_cast.rpc(0, Vector3.ZERO, Vector3(0, 0, -10), PackedVector3Array())


var _started := false


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
		return false

	# Manda SOLO a handshake completo. Il primo tentativo falliva con "peer which
	# is not connected": la connessione ENet non e istantanea, e un _t > 1.0 e una
	# scommessa sul tempo, non una condizione.
	var mp := net.multiplayer
	var connected: bool = (
		mp != null
		and mp.multiplayer_peer != null
		and mp.multiplayer_peer.get_connection_status() == MultiplayerPeer.CONNECTION_CONNECTED
	)
	if role == "client" and connected and _sent < 3:
		_sent += 1
		net.send_input.rpc_id(1, Vector2(0, 1), 0.0, 0.0, false, _sent)
		net.request_cast.rpc_id(1, 0, Vector3.ZERO, Vector3(0, 0, -1))

	if _t > 5.0:
		var ok := false
		if role == "server":
			ok = _seen_peer and _got_input and net.inputs.size() > 0
			print("  [server] ESITO: peer=%s input=%s inputs_registrati=%d" % [_seen_peer, _got_input, net.inputs.size()])
		else:
			ok = _got_cast
			print("  [client] ESITO: effetto_ricevuto=%s" % _got_cast)
		quit(0 if ok else 1)
		return true
	return false
