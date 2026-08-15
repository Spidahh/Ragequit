## Il collante della scena.
##
## Esiste perché tre cose devono conoscersi solo a partita avviata: l'HUD deve
## sapere di chi mostra la vita, i nemici chi inseguire, e il feedback di colpo
## subito deve arrivare a schermo. Cablarlo qui invece che dentro ognuno dei tre
## evita la dipendenza incrociata che rende impossibile testarli separati.
extends Node3D

const Vfx := preload("res://src/vfx.gd")
const MatchRules := preload("res://src/match_rules.gd")
const SpawnsScript := preload("res://src/spawns.gd")
const Bots := preload("res://src/bots.gd")
const Sfx := preload("res://src/sfx.gd")

## Il giocatore è il peer 1; i nemici prendono 101, 102… Gli stessi id che
## userebbe la rete, così le regole non sanno se stanno arbitrando umani o bot.
const PLAYER_ID := 1
const BOT_ID_BASE := 101

var _player: Node = null
var _hud: Node = null
var _hurt_flash: ColorRect
## Chi ti ha colpito per ultimo: serve al kill feed e al recap di morte, che
## devono dire un nome e non "sei morto".
var _last_attacker := -1
var _match: Dictionary = {}
## peer id → nodo del nemico
var _bots: Dictionary = {}
## peer id → nome di battaglia
var _bot_names: Dictionary = {}
## La difficoltà di questa partita. In partita mista il default è Veterano: è
## l'unico che si può battere sudando, ed è quello su cui è tarato il resto.
@export var difficulty: int = Bots.DEFAULT_LEVEL
## Il poligono: stessa arena, nessun punteggio e nessuna morte. È l'unico posto
## dove il gioco insegna, e ci si sta finché si vuole.
@export var practice: bool = false
@export var match_mode: int = MatchRules.Mode.SOLO

## Statistiche della partita, per la schermata dei risultati. Si contano qui
## perché qui succedono: chiederle dopo a un sistema che non le ha viste
## significa inventarle.
var _streak := 0
var _best_streak := 0
var _shots := 0
var _hits := 0

signal match_finished(rows: Array, won: bool, stats: Dictionary)


func _ready() -> void:
	_player = get_node_or_null("Player")
	_hud = get_node_or_null("HUD")
	if _player == null:
		push_warning("arena: nessun Player nella scena")
		return

	if _hud and _hud.has_method("setup"):
		_hud.setup(_player)
	if _player.has_signal("cast_resolved"):
		_player.cast_resolved.connect(func(_n, hits):
			_shots += 1
			if hits > 0:
				_hits += 1)

	# Ogni nemico insegue il giocatore ed entra in partita con un suo id.
	var next_id := BOT_ID_BASE
	for child in get_children():
		if child.has_method("_shoot") and "target" in child:
			child.target = _player
			if child.has_signal("fired"):
				child.fired.connect(_on_enemy_fired)
			if child.has_signal("died"):
				var id := next_id
				var idx := next_id - BOT_ID_BASE
				next_id += 1
				_bots[id] = child
				child.died.connect(_on_bot_died.bind(id))
				# Ogni bot è un avversario con un nome, una classe e una
				# difficoltà: "Bot 3" è un avversario che il giocatore smette di
				# considerare un avversario.
				var who: Dictionary = Bots.identity(idx)
				_bot_names[id] = String(who["name"])
				child.class_id = String(who["class_id"])
				Bots.apply(child, difficulty)

	# Una partita vera anche da soli: si segna, si muore, si torna, e si vince o
	# si perde. Un'arena senza condizione di vittoria non è un gioco incompleto —
	# è una sandbox, e non si rigioca.
	if not practice:
		var roster := [PLAYER_ID]
		roster.append_array(_bots.keys())
		_match = MatchRules.start(match_mode, roster)

	if _player.has_signal("died"):
		_player.died.connect(_on_player_died)

	# Lampo rosso quando prendi: è il feedback minimo senza cui non sai da dove
	# stai morendo. Sta qui e non nell'HUD perché è una reazione, non un widget.
	var layer := CanvasLayer.new()
	layer.layer = 10
	add_child(layer)
	_hurt_flash = ColorRect.new()
	_hurt_flash.color = Color(0.85, 0.05, 0.1, 0.0)
	_hurt_flash.set_anchors_preset(Control.PRESET_FULL_RECT)
	_hurt_flash.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(_hurt_flash)

	if _player.has_signal("damaged"):
		_player.damaged.connect(_on_player_damaged)

	_start_ambience()


## Il fondo sonoro dell'arena: il vento sotto tutto, e una torcia che crepita su
## ognuna delle luci calde. Le torce hanno un suono PROPRIO e spazializzato per
## la stessa ragione per cui hanno una luce propria: sono i punti di riferimento
## della mappa, e ci si orienta anche a orecchie.
func _start_ambience() -> void:
	Sfx.ambience("wind_loop", -20.0)
	var lit := 0
	for node in _all_descendants(self):
		if node is OmniLight3D and node.light_color.r > node.light_color.b:
			Sfx.ambience_at("torch_loop", node, -16.0)
			lit += 1
	if lit == 0:
		# Nessuna torcia trovata: meglio un crepitio non spazializzato che il
		# silenzio, ma vale la pena saperlo.
		push_warning("arena: nessuna torcia trovata per l'audio d'ambiente")


func _all_descendants(node: Node, out: Array = []) -> Array:
	for child in node.get_children():
		out.append(child)
		_all_descendants(child, out)
	return out


func _on_enemy_fired(from: Vector3, to: Vector3, hit: bool) -> void:
	# Il tracciante rosso: senza, non sai da dove ti stanno sparando, e morire
	# senza sapere da dove è la cosa che fa chiudere un PvP.
	for id in _bots.keys():
		var b = _bots[id]
		if is_instance_valid(b) and b.global_position.distance_to(from) < 2.5:
			_last_attacker = id
			break
	Vfx.tracer(self, from, to)
	if hit:
		Vfx.impact(self, to, Vfx.COL_ENEMY)
	# Il colpo del nemico suona DAL PUNTO IN CUI PARTE, sempre — anche quando
	# manca. È metà dell'informazione direzionale che hai su chi ti sta sparando,
	# e l'unica che funziona quando non lo vedi.
	Sfx.play_at("cast_beam", from, -9.0)


func _bot_name(peer_id: int) -> String:
	return String(_bot_names.get(peer_id, "SOMEONE"))


func _on_player_damaged(_amount: float, _remaining: float) -> void:
	if _hurt_flash:
		_hurt_flash.color.a = 0.32


## Un bot è caduto: il punto è di chi lo ha ucciso, e qui l'unico che uccide è
## il giocatore — i bot non si sparano fra loro.
func _on_bot_died(bot_id: int) -> void:
	if _match.is_empty():
		return
	MatchRules.on_kill(_match, PLAYER_ID, bot_id)
	_streak += 1
	_best_streak = maxi(_best_streak, _streak)
	Sfx.play("kill")
	if _hud and _hud.has_method("push_feed"):
		_hud.push_feed("YOU  ▸  %s" % _bot_name(bot_id), true)


func _on_player_died() -> void:
	if _match.is_empty():
		return
	# -1: nessuno segna. Contro i bot il punteggio deve restare quello del
	# giocatore, ma la morte va contata comunque — è la metà onesta del risultato.
	MatchRules.on_kill(_match, -1, PLAYER_ID)
	_streak = 0
	if _hud and _hud.has_method("push_feed"):
		_hud.push_feed("%s  ▸  YOU" % _bot_name(_last_attacker))


func _process(delta: float) -> void:
	if _hurt_flash and _hurt_flash.color.a > 0.0:
		_hurt_flash.color.a = maxf(0.0, _hurt_flash.color.a - delta * 1.6)

	if _match.is_empty():
		return
	for event in MatchRules.tick(_match, delta):
		match event["kind"]:
			"respawn":
				_respawn(int(event["peer"]))
			"match_over":
				_on_match_over(int(event["winner"]))
	if _hud and _hud.has_method("set_match"):
		var mine: int = int(_match["score"].get(PLAYER_ID, 0))
		var top: int = MatchRules.leader(_match)
		var leader_text := (
			"YOU LEAD"
			if top == PLAYER_ID
			else "%s LEADS  %d" % [_bot_name(top), int(_match["score"].get(top, 0))]
		)
		_hud.set_match(mine, MatchRules.time_left(_match), leader_text)


func _respawn(peer_id: int) -> void:
	var occupied := []
	if _player and is_instance_valid(_player):
		occupied.append(_player.global_position)
	for id in _bots.keys():
		var n = _bots[id]
		if is_instance_valid(n) and not n.dead:
			occupied.append(n.global_position)
	var at: Vector3 = SpawnsScript.farthest_from(occupied)

	if peer_id == PLAYER_ID:
		if _player and is_instance_valid(_player):
			_player.global_position = at
			_player.velocity = Vector3.ZERO
			if _player.has_method("respawn"):
				_player.respawn()
		return
	var bot = _bots.get(peer_id)
	if is_instance_valid(bot):
		bot.revive(at)


func _on_match_over(winner: int) -> void:
	if _hud and _hud.has_method("push_feed"):
		_hud.push_feed("MATCH OVER — %s" % ("YOU WIN" if winner == PLAYER_ID else "YOU LOSE"), true)
	match_finished.emit(scoreboard(), winner == PLAYER_ID, match_stats())


## Il tabellone finale. Ogni riga ha un nome vero: "Bot 3" non e' un avversario.
func scoreboard() -> Array:
	if _match.is_empty():
		return []
	var rows := []
	for peer in _match["peers"]:
		rows.append({
			"name": "YOU" if int(peer) == PLAYER_ID else _bot_name(int(peer)),
			"score": int(_match["score"].get(peer, 0)),
			"deaths": int(_match["deaths"].get(peer, 0)),
			"mine": int(peer) == PLAYER_ID,
			"best": "—",
		})
	rows.sort_custom(func(a, b): return int(a["score"]) > int(b["score"]))
	return rows


func match_stats() -> Dictionary:
	var combo := 0
	if _hud and "_combo" in _hud:
		combo = int(_hud.get("_combo"))
	return {
		"streak": _best_streak,
		"juggle": combo,
		"accuracy": int(round(100.0 * float(_hits) / maxf(float(_shots), 1.0))),
	}
