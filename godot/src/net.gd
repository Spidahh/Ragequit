## La rete.
##
## MODELLO, e non è negoziabile: **il server è autoritativo, il client predice.**
## Il client muove il suo corpo subito con `Movement.step` per non avere input
## lag, manda gli input al server, e il server rigira la STESSA funzione e
## corregge se divergono. È il motivo per cui `Movement.step` è una funzione pura
## senza stato di nodo — due integratori diversi divergono sempre, e un gioco
## dove il server e il client calcolano il movimento in modo anche solo
## leggermente diverso è un gioco che scatta.
##
## Il danno NON lo decide il client. Mai. Il client dice "ho premuto 1 guardando
## là"; il server risolve la forma e applica. Un client che dichiara i propri
## danni è un client che li può inventare.
##
## Godot dà ENet e le RPC di serie: nel progetto precedente questo strato era
## Colyseus più uno schema replicato scritto a mano.
extends Node

const PORT := 27015
const MAX_PLAYERS := 8

signal player_joined(id: int)
signal player_left(id: int)
signal net_status(msg: String)

var peer: ENetMultiplayerPeer = null
var is_server := false
## Ultimo input ricevuto da ogni peer, letto dal server nel suo tick.
var inputs: Dictionary = {}


func _ready() -> void:
	multiplayer.peer_connected.connect(_on_peer_connected)
	multiplayer.peer_disconnected.connect(_on_peer_disconnected)
	multiplayer.connected_to_server.connect(func(): net_status.emit("connesso"))
	multiplayer.connection_failed.connect(func(): net_status.emit("connessione fallita"))
	multiplayer.server_disconnected.connect(func(): net_status.emit("server caduto"))


func host(port := PORT) -> bool:
	peer = ENetMultiplayerPeer.new()
	var err := peer.create_server(port, MAX_PLAYERS)
	if err != OK:
		net_status.emit("host fallito: %d" % err)
		return false
	multiplayer.multiplayer_peer = peer
	is_server = true
	net_status.emit("in ascolto sulla porta %d" % port)
	return true


func join(address := "127.0.0.1", port := PORT) -> bool:
	peer = ENetMultiplayerPeer.new()
	var err := peer.create_client(address, port)
	if err != OK:
		net_status.emit("join fallito: %d" % err)
		return false
	multiplayer.multiplayer_peer = peer
	is_server = false
	net_status.emit("connessione a %s:%d" % [address, port])
	return true


func stop() -> void:
	if multiplayer.multiplayer_peer:
		multiplayer.multiplayer_peer.close()
	multiplayer.multiplayer_peer = null
	peer = null
	is_server = false
	inputs.clear()


func peers() -> Array:
	if multiplayer.multiplayer_peer == null:
		return []
	return Array(multiplayer.get_peers())


func _on_peer_connected(id: int) -> void:
	if claim_reconnect(id):
		net_status.emit("peer %d rientrato" % id)
		return
	net_status.emit("peer %d entrato" % id)
	player_joined.emit(id)


## LA FINESTRA DI RIENTRO.
##
## Se la connessione cade, il posto resta. Trenta secondi: ricarichi la pagina e
## sei di nuovo dentro, con il tuo punteggio, la tua build e la tua vita.
##
## PERCHE' TRENTA E NON CINQUE. Cinque bastano per un pacchetto perso, non per
## una pagina che si ricarica: fra il crollo, il ricaricamento del wasm e il
## nuovo handshake passano dieci-quindici secondi buoni. E non trecento, perche'
## un posto tenuto per cinque minuti e' un posto in meno in una lobby da otto.
##
## Chi non torna lascia il posto a un bot, e la partita non si rompe per gli
## altri: il caso peggiore per chi resta e' un avversario in meno per un attimo,
## non una partita a tre in una modalita' da otto.
const RECONNECT_SEC := 30.0

## peer id → { until, score } di chi puo' ancora rientrare.
var reconnecting: Dictionary = {}

signal peer_reconnected(id: int)
signal reconnect_expired(id: int)


func _on_peer_disconnected(id: int) -> void:
	inputs.erase(id)
	reconnecting[id] = {"until": _now() + RECONNECT_SEC}
	net_status.emit("peer %d caduto — posto tenuto %ds" % [id, int(RECONNECT_SEC)])
	player_left.emit(id)


func _now() -> float:
	return float(Time.get_ticks_msec()) / 1000.0


## Qualcuno che era caduto e' tornato dentro la finestra?
func claim_reconnect(id: int) -> bool:
	if not reconnecting.has(id):
		return false
	if _now() > float(reconnecting[id]["until"]):
		reconnecting.erase(id)
		return false
	reconnecting.erase(id)
	peer_reconnected.emit(id)
	return true


## Fa scadere i posti tenuti. Chiamato dal tick del server: senza, un posto
## tenuto resta tenuto per sempre e la lobby si svuota da sola.
func expire_reconnects() -> void:
	var now := _now()
	for id in reconnecting.keys():
		if now > float(reconnecting[id]["until"]):
			reconnecting.erase(id)
			reconnect_expired.emit(id)


# --- Input: client → server ------------------------------------------------
## Il client manda cosa STA PREMENDO, non dove si trova. Mandare la posizione
## significa lasciar decidere al client dove sta, che è la prima cosa che un
## cheat sfrutta.
@rpc("any_peer", "unreliable_ordered", "call_remote")
func send_input(wish: Vector2, yaw: float, pitch: float, jump: bool, seq: int) -> void:
	if not is_server:
		return
	var from := multiplayer.get_remote_sender_id()
	inputs[from] = {
		"wish": wish, "yaw": yaw, "pitch": pitch, "jump": jump, "seq": seq
	}


# --- Cast: client chiede, server decide ------------------------------------
## Il client dichiara SOLO l'intenzione: quale slot, guardando dove. Il server
## controlla cooldown, risolve la forma e applica il danno. Nessun numero di
## danno attraversa mai la rete in questa direzione.
@rpc("any_peer", "reliable", "call_remote")
func request_cast(slot: int, origin: Vector3, dir: Vector3) -> void:
	if not is_server:
		return
	var from := multiplayer.get_remote_sender_id()
	cast_requested.emit(from, slot, origin, dir)


signal cast_requested(peer_id: int, slot: int, origin: Vector3, dir: Vector3)


# --- Effetti: server → tutti ------------------------------------------------
## Il server dice cosa È SUCCESSO, così ogni client lo disegna. Il VFX non è
## simulazione: viene dopo la decisione, non prima.
@rpc("authority", "reliable", "call_local")
func broadcast_cast(shape: int, from: Vector3, to: Vector3, hits: PackedVector3Array) -> void:
	cast_happened.emit(shape, from, to, hits)


signal cast_happened(shape: int, from: Vector3, to: Vector3, hits: PackedVector3Array)


@rpc("authority", "reliable", "call_local")
func broadcast_damage(target_id: int, amount: float, remaining: float) -> void:
	damage_happened.emit(target_id, amount, remaining)


signal damage_happened(target_id: int, amount: float, remaining: float)


## Gli eventi di partita: uccisione, respawn, fine round, fine partita.
## Il punteggio NON viaggia come numero: viaggiano i fatti, e ogni client
## ricostruisce il totale. Un totale che arriva già fatto è un totale che può
## arrivare sbagliato senza che nessuno se ne accorga.
@rpc("authority", "reliable", "call_local")
func broadcast_match_event(event: Dictionary) -> void:
	match_event_happened.emit(event)


signal match_event_happened(event: Dictionary)
