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

## Il giocatore è il peer 1; i nemici prendono 101, 102… Gli stessi id che
## userebbe la rete, così le regole non sanno se stanno arbitrando umani o bot.
const PLAYER_ID := 1
const BOT_ID_BASE := 101

var _player: Node = null
var _hud: Node = null
var _hurt_flash: ColorRect
var _match: Dictionary = {}
## peer id → nodo del nemico
var _bots: Dictionary = {}


func _ready() -> void:
	_player = get_node_or_null("Player")
	_hud = get_node_or_null("HUD")
	if _player == null:
		push_warning("arena: nessun Player nella scena")
		return

	if _hud and _hud.has_method("setup"):
		_hud.setup(_player)

	# Ogni nemico insegue il giocatore ed entra in partita con un suo id.
	var next_id := BOT_ID_BASE
	for child in get_children():
		if child.has_method("_shoot") and "target" in child:
			child.target = _player
			if child.has_signal("fired"):
				child.fired.connect(_on_enemy_fired)
			if child.has_signal("died"):
				var id := next_id
				next_id += 1
				_bots[id] = child
				child.died.connect(_on_bot_died.bind(id))

	# Una partita vera anche da soli: si segna, si muore, si torna, e si vince o
	# si perde. Un'arena senza condizione di vittoria non è un gioco incompleto —
	# è una sandbox, e non si rigioca.
	var roster := [PLAYER_ID]
	roster.append_array(_bots.keys())
	_match = MatchRules.start(MatchRules.Mode.SOLO, roster)

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


func _on_enemy_fired(from: Vector3, to: Vector3, hit: bool) -> void:
	# Il tracciante rosso: senza, non sai da dove ti stanno sparando, e morire
	# senza sapere da dove è la cosa che fa chiudere un PvP.
	Vfx.tracer(self, from, to)
	if hit:
		Vfx.impact(self, to, Vfx.COL_ENEMY)


func _on_player_damaged(_amount: float, _remaining: float) -> void:
	if _hurt_flash:
		_hurt_flash.color.a = 0.32


## Un bot è caduto: il punto è di chi lo ha ucciso, e qui l'unico che uccide è
## il giocatore — i bot non si sparano fra loro.
func _on_bot_died(bot_id: int) -> void:
	if _match.is_empty():
		return
	MatchRules.on_kill(_match, PLAYER_ID, bot_id)
	if _hud and _hud.has_method("push_feed"):
		_hud.push_feed("YOU  ▸  BOT %d" % (bot_id - BOT_ID_BASE + 1), true)


func _on_player_died() -> void:
	if _match.is_empty():
		return
	# -1: nessuno segna. Contro i bot il punteggio deve restare quello del
	# giocatore, ma la morte va contata comunque — è la metà onesta del risultato.
	MatchRules.on_kill(_match, -1, PLAYER_ID)
	if _hud and _hud.has_method("push_feed"):
		_hud.push_feed("BOT  ▸  YOU")


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
			else "BOT %d LEADS  %d" % [top - BOT_ID_BASE + 1, int(_match["score"].get(top, 0))]
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
