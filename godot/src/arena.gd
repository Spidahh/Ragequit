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
const RangeDrills := preload("res://src/range_drills.gd")
const Wheel := preload("res://src/signals_wheel.gd")
const SpectatorScript := preload("res://src/spectator.gd")
const Sfx := preload("res://src/sfx.gd")

## Il giocatore è il peer 1; i nemici prendono 101, 102… Gli stessi id che
## userebbe la rete, così le regole non sanno se stanno arbitrando umani o bot.
const PLAYER_ID := 1
const BOT_ID_BASE := 101

var _player: Node = null
var _hud: Node = null
var _hurt_flash: ColorRect
var _hurt_edge: ColorRect
## Chi ti ha colpito per ultimo: serve al kill feed e al recap di morte, che
## devono dire un nome e non "sei morto".
var _last_attacker := -1
var _match: Dictionary = {}
## peer id → nodo del nemico
var _bots: Dictionary = {}
## peer id → nome di battaglia
var _bot_names: Dictionary = {}
var _scoreboard_open := false
var _weapon_tab_down := false
var _drills = null
## La rotella dei segnali: si tiene premuto, si punta, si rilascia.
var _wheel := Wheel.new()
var _wheel_open := false
var _spectator: Node3D = null
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
## Cosa ti ha colpito e per quanto, da quando sei vivo. Si azzera a ogni
## rinascita: un recap che somma tutta la partita non dice come sei morto.
var _taken: Dictionary = {}
var _dealt := 0.0
## Da che parte è arrivato l'ultimo colpo, per il lampo direzionale.
var _hurt_from := Vector3.ZERO
var _wheel_pick := -1
## Danno per abilità, per la riga "BEST" della schermata dei risultati.
var _by_ability: Dictionary = {}

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
		_player.cast_resolved.connect(func(n, hits):
			_shots += 1
			if hits > 0:
				_hits += 1
				# Con cosa stai vincendo: si somma il danno per abilità, non i
				# colpi. Un'abilità che entra spesso e fa poco non è quella che
				# ha deciso la partita.
				var dmg: float = float(_player.get("last_cast_damage"))
				_by_ability[n] = float(_by_ability.get(n, 0.0)) + dmg
				_dealt += dmg)
	_scoreboard_open = false

	if practice:
		_drills = RangeDrills.new()
		_drills.drill_done.connect(func(_w): _refresh_drills())
		_refresh_drills()
		# Nel poligono le abilita' non hanno ricarica e non si muore: si prova,
		# e provare non deve costare attese.
		if _player:
			_player.set("practice", true)

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

	# Il lampo direzionale: una banda sul bordo dalla parte da cui sei stato
	# colpito. È metà dell'informazione che hai su chi ti sta uccidendo.
	_hurt_edge = ColorRect.new()
	_hurt_edge.color = Color(0.95, 0.10, 0.14, 0.0)
	_hurt_edge.anchor_top = 0.0
	_hurt_edge.anchor_bottom = 1.0
	_hurt_edge.anchor_left = 0.0
	_hurt_edge.anchor_right = 0.25
	_hurt_edge.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(_hurt_edge)

	if _player.has_signal("damaged"):
		_player.damaged.connect(_on_player_damaged)

	_start_ambience()


## Il fondo sonoro dell'arena: il vento sotto tutto, e una torcia che crepita su
## ognuna delle luci calde. Le torce hanno un suono PROPRIO e spazializzato per
## la stessa ragione per cui hanno una luce propria: sono i punti di riferimento
## della mappa, e ci si orienta anche a orecchie.
func _start_ambience() -> void:
	# Silenzio musicale appena si entra: da qui in poi quello che senti è
	# informazione, e una musica sopra la coprirebbe.
	Sfx.music("")
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
			if hit:
				# Il nome dell'arma con cui ti hanno preso: è quello che il recap
				# deve dire, e senza tracciarlo qui non lo sa nessuno.
				var key := "%s's shot" % _bot_name(id)
				_taken[key] = float(_taken.get(key, 0.0)) + float(b.damage)
				_hurt_from = from
			break
	Vfx.tracer(self, from, to)
	# Sul giocatore il punto d'impatto puo' stare dietro la camera: una sfera
	# additiva vista dall'interno diventava un poligono rosso a pieno schermo.
	if not hit:
		Vfx.impact(self, to, Vfx.COL_ENEMY)
	# Il colpo del nemico suona DAL PUNTO IN CUI PARTE, sempre — anche quando
	# manca. È metà dell'informazione direzionale che hai su chi ti sta sparando,
	# e l'unica che funziona quando non lo vedi.
	Sfx.play_at("cast_beam", from, -9.0)


## Riporta le tre prove all'HUD. Si ricostruisce ogni frame perché il contatore
## dei salti cambia mentre salti: un pannello che si aggiorna solo a prova
## conclusa non fa vedere che stai andando bene.
func _refresh_drills() -> void:
	if _drills == null or _hud == null or not _hud.has_method("show_drills"):
		return
	if _drills.all_done():
		_hud.hide_drills()
		return
	var rows := []
	for k in [RangeDrills.Drill.MOVE, RangeDrills.Drill.LEAD, RangeDrills.Drill.LAUNCH]:
		rows.append({
			"title": String(RangeDrills.TITLES[k]),
			"line": String(RangeDrills.LINES[k]),
			"done": bool(_drills.done[k]),
			"progress": _drills.progress(k),
		})
	_hud.show_drills(rows)


## La rotella: tenuta aperta con `V`, puntata col mouse, mandata al rilascio.
##
## Il puntamento usa lo scostamento del mouse DAL CENTRO DELLO SCHERMO e non la
## posizione assoluta: in partita il mouse è catturato e non ha una posizione
## che il giocatore possa vedere.
func _tick_wheel() -> void:
	if _hud == null or not _hud.has_method("show_wheel"):
		return
	var held := Input.is_key_pressed(KEY_V)
	if held:
		var vp := get_viewport().get_visible_rect().size
		var offset := (get_viewport().get_mouse_position() - vp * 0.5) / (vp.y * 0.25)
		_wheel_pick = Wheel.pick(offset)
		_hud.show_wheel(_wheel_pick, Wheel.LABELS, Wheel.ANGLES)
		_wheel_open = true
		return
	if not _wheel_open:
		return
	_wheel_open = false
	_hud.hide_wheel()
	var text := _wheel.send(_wheel_pick, Time.get_ticks_msec() / 1000.0)
	if not text.is_empty():
		_hud.push_signal("YOU:  %s" % text)
		Sfx.play("ui_confirm", Sfx.UI, -6.0)


## Chi è fuori dal torneo resta a guardare. Buttarlo al menù significa che metà
## delle persone in un torneo da otto smette di giocare dopo novanta secondi.
func enter_spectator() -> void:
	if _spectator != null:
		return
	_spectator = SpectatorScript.new()
	add_child(_spectator)
	var alive := []
	for id in _bots.keys():
		var b = _bots[id]
		if is_instance_valid(b) and not b.dead:
			alive.append(b)
	_spectator.set_targets(alive)
	if _player and is_instance_valid(_player):
		_player.set_process_input(false)


func _bot_name(peer_id: int) -> String:
	return String(_bot_names.get(peer_id, "SOMEONE"))


func _on_player_damaged(amount: float, _remaining: float) -> void:
	if amount <= 0.0:
		# Parata riuscita: nessun lampo. Un lampo rosso su un colpo che hai
		# bloccato dice che hai sbagliato proprio mentre hai fatto giusto.
		return
	if _hurt_flash:
		_hurt_flash.color.a = 0.10
	# Da dove è arrivato: i bordi lampeggiano DALLA PARTE del colpo, o il lampo
	# dice solo "stai morendo" e non "gira a destra".
	if _player and is_instance_valid(_player) and _hurt_edge:
		var to_them: Vector3 = _hurt_from - _player.global_position
		var fwd: Vector3 = -_player.global_transform.basis.z
		var right: Vector3 = _player.global_transform.basis.x
		var side: float = right.dot(to_them.normalized())
		var front: float = fwd.dot(to_them.normalized())
		_hurt_edge.anchor_left = 0.0 if side < 0.0 else 0.86
		_hurt_edge.anchor_right = 0.14 if side < 0.0 else 1.0
		# Mai coprire il mirino: il flash deve indicare, non accecare.
		_hurt_edge.color.a = 0.20 if front <= 0.6 else 0.14


func _input(event: InputEvent) -> void:
	# La build Web puo' consumare Tab prima del polling del frame. L'evento e il
	# polling condividono il latch, quindi uno swap produce sempre un solo passo.
	if (
		event is InputEventKey
		and event.pressed
		and not event.echo
		and (event.keycode == KEY_TAB or event.physical_keycode == KEY_TAB)
	):
		if not _weapon_tab_down and _player and _player.has_method("cycle_weapon"):
			_player.cycle_weapon()
		_weapon_tab_down = true


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
	# Nel torneo non si respawna: se sei caduto, il round è finito e da qui in
	# poi guardi. Il tuo posto nel tabellone resta.
	if int(_match.get("mode", 0)) == MatchRules.Mode.TOURNAMENT:
		enter_spectator()
	# Il recap: chi ti ha ucciso, con cosa e per quanto, e quanto avevi fatto tu.
	var breakdown := []
	for k in _taken:
		breakdown.append({"name": k, "damage": _taken[k]})
	breakdown.sort_custom(func(a, b): return float(a["damage"]) > float(b["damage"]))
	if _hud and _hud.has_method("show_death_recap"):
		_hud.show_death_recap(
			_bot_name(_last_attacker),
			breakdown,
			_dealt,
			float(MatchRules.RESPAWN_SEC[_match["mode"]])
		)
	_taken = {}
	_dealt = 0.0
	if _hud and _hud.has_method("push_feed"):
		_hud.push_feed("%s  ▸  YOU" % _bot_name(_last_attacker))


func _process(delta: float) -> void:
	if _hurt_flash and _hurt_flash.color.a > 0.0:
		_hurt_flash.color.a = maxf(0.0, _hurt_flash.color.a - delta * 1.6)
	if _hurt_edge and _hurt_edge.color.a > 0.0:
		_hurt_edge.color.a = maxf(0.0, _hurt_edge.color.a - delta * 1.1)

	_tick_wheel()
	# Qui, accanto al tabellone: il polling di Tab e' affidabile anche nella
	# build Web, dove l'evento tastiera puo' essere consumato dal canvas.
	var weapon_tab_down := Input.is_key_pressed(KEY_TAB)
	if weapon_tab_down and not _weapon_tab_down and _player and _player.has_method("cycle_weapon"):
		_player.cycle_weapon()
	_weapon_tab_down = weapon_tab_down

	# Tab cambia arma: il tabellone resta su T e si tiene premuto. Usare lo
	# stesso tasto per entrambe le azioni copriva proprio il feedback dello swap.
	if _hud and _hud.has_method("show_scoreboard"):
		if Input.is_action_pressed("scoreboard") and not _scoreboard_open:
			_scoreboard_open = true
			_hud.show_scoreboard(scoreboard())
		elif not Input.is_action_pressed("scoreboard") and _scoreboard_open:
			_scoreboard_open = false

	if practice:
		# Nel poligono le abilita' non hanno ricarica e non si muore: si prova,
		# e provare non deve costare attese.
		if _player:
			_player.set("practice", true)
			_hud.hide_scoreboard()

	if _drills != null and _player and is_instance_valid(_player):
		var flat := Vector2(_player.velocity.x, _player.velocity.z).length()
		_drills.watch_movement(flat, _player.is_on_floor())
		_refresh_drills()

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
			"best": _best_ability(int(peer)),
			"ping": 0,
			"hit_you_with": _hit_you_with(int(peer)),
		})
	rows.sort_custom(func(a, b): return int(a["score"]) > int(b["score"]))
	return rows


## Con cosa quell'avversario ti ha colpito. È l'unica riga in più che il
## tabellone mostra, e serve a imparare i kit degli altri senza spiegazioni.
func _hit_you_with(peer_id: int) -> String:
	var prefix := "%s's" % _bot_name(peer_id)
	var out := []
	for k in _taken:
		if String(k).begins_with(prefix):
			out.append("%s (%d)" % [String(k).replace(prefix + " ", ""), int(_taken[k])])
	return " · ".join(out)


## L'abilità con cui quel giocatore ha fatto più danno.
##
## Per te si sa perché si conta; per un bot è la sua arma, che è l'unica cosa
## che ha. Meglio una riga vera e povera che una riga inventata.
func _best_ability(peer_id: int) -> String:
	if peer_id != PLAYER_ID:
		return "%s's shot" % _bot_name(peer_id)
	var best := "—"
	var best_dmg := 0.0
	for k in _by_ability:
		if float(_by_ability[k]) > best_dmg:
			best_dmg = float(_by_ability[k])
			best = String(k)
	return best


func match_stats() -> Dictionary:
	var combo := 0
	if _hud and "_combo" in _hud:
		combo = int(_hud.get("_combo"))
	return {
		"streak": _best_streak,
		"juggle": combo,
		"accuracy": int(round(100.0 * float(_hits) / maxf(float(_shots), 1.0))),
	}
