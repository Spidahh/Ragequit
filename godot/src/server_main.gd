## Il server dedicato.
##
## E' LO STESSO PROGETTO DEL CLIENT, esportato senza finestra. Non un altro
## programma, non un'altra lingua, non un'altra copia delle regole: lo stesso
## `movement.gd`, lo stesso `combat.gd`, lo stesso `match_rules.gd`.
##
## E' la cosa che il progetto precedente non aveva e che gli e' costata di piu':
## il server era in TypeScript e il client in TypeScript, ma le due copie delle
## regole divergevano di continuo, e ogni divergenza era un giocatore che vedeva
## una cosa e ne subiva un'altra. Qui la funzione di movimento che il server
## esegue e' **lo stesso file** che il client esegue per predire, e non possono
## divergere perche' non sono due.
##
## COME PARTE:
##   godot --headless --main-pack game.pck -- --server
## oppure, nell'immagine Docker, l'eseguibile esportato con `--server`.
##
## La porta arriva da `PORT` nell'ambiente, perche' e' cosi' che la assegnano
## tutte le piattaforme di hosting; se manca si usa quella di sviluppo.
extends Node

const NetScript := preload("res://src/net.gd")
const WorldScript := preload("res://src/net_world.gd")
const MatchRules := preload("res://src/match_rules.gd")
const Bots := preload("res://src/bots.gd")

## Ogni quanto il server scrive una riga di stato. Non e' un log di debug: e'
## l'unico modo di sapere che e' vivo su una macchina a cui non si accede.
const HEARTBEAT_SEC := 60.0

var net: Node = null
var world: Node3D = null

var _started := false
var _heartbeat := 0.0
var _peak_players := 0


func _ready() -> void:
	print("[server] RAGEQUIT — avvio")
	net = NetScript.new()
	net.name = "Net"
	add_child(net)
	world = WorldScript.new()
	world.name = "World"
	add_child(world)
	net.net_status.connect(func(m): print("[server] %s" % m))


func _process(delta: float) -> void:
	# L'avvio va rimandato al primo frame: in `_ready` il nodo non e' ancora
	# dentro l'albero e la sua proprieta' `multiplayer` e' nulla. E' un errore
	# che si presenta come "il server parte e non ascolta", senza dire perche'.
	if not _started:
		_started = true
		var port := _port()
		if not net.host(port):
			print("[server] impossibile ascoltare sulla porta %d — esco" % port)
			get_tree().quit(1)
			return
		world.setup(net)
		world.start_match(MatchRules.Mode.SOLO)
		print("[server] pronto sulla porta %d" % port)
		return

	world.server_tick(delta)

	_heartbeat += delta
	if _heartbeat >= HEARTBEAT_SEC:
		_heartbeat = 0.0
		var n: int = world.bodies.size()
		_peak_players = maxi(_peak_players, n)
		print(
			"[server] vivo — %d in campo (picco %d), partita %s"
			% [n, _peak_players, _phase_name()]
		)


func _phase_name() -> String:
	if world.match_state.is_empty():
		return "nessuna"
	return String(MatchRules.Phase.keys()[int(world.match_state["phase"])])


## La porta: `PORT` dall'ambiente, come vuole ogni piattaforma di hosting.
func _port() -> int:
	var env := OS.get_environment("PORT")
	if env.is_valid_int():
		return int(env)
	return NetScript.PORT
