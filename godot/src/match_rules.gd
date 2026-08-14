## Le regole di una partita: quando comincia, come si segna, quando finisce.
##
## PERCHE' QUESTA E' LA PRIMA COSA CHE SI COSTRUISCE dopo il combattimento:
## finche' una partita non comincia e non finisce, tutto il resto e' roba bella
## dentro qualcosa che non si puo' ne' vincere ne' perdere — e quindi non si
## rigioca.
##
## E' SCRITTO COME FUNZIONI PURE su un Dictionary di stato, come `movement.gd`:
## nessun nodo, nessun timer, nessun segnale. Cosi' una partita intera si puo'
## simulare in un test in pochi millisecondi, invece di doverla giocare.
##
## Le tre modalita' girano sulla STESSA arena con le stesse regole e gli stessi
## kit. Cambia solo come finisce.
class_name MatchRules

enum Mode { SOLO, SQUAD, TOURNAMENT }

## Le fasi che una partita attraversa. `LIVE` e' l'unica in cui si combatte.
enum Phase { WARMUP, LIVE, INTERMISSION, OVER }

## SOLO: primo a 25. SQUAD: prima squadra a 50 — piu' alto perche' il punteggio
## e' comune, non perche' la partita debba durare di piu'.
const SCORE_LIMIT := {Mode.SOLO: 25, Mode.SQUAD: 50}

## Otto minuti. Sotto non c'e' arco, sopra si perde chi non ha una serata libera.
const TIME_LIMIT_SEC := 480.0

## Il respawn di SQUAD e' un secondo piu' lento, e non e' un dettaglio: in
## squadra la tua morte costa a qualcun altro, che per quel tempo combatte in
## inferiorita' numerica.
const RESPAWN_SEC := {Mode.SOLO: 3.0, Mode.SQUAD: 4.0}

## TOURNAMENT: round da 90 s, al meglio di tre, e dentro il round NON si
## respawna. E' l'unica modalita' dove un singolo errore chiude qualcosa.
const ROUND_SEC := 90.0
const ROUND_WINS_NEEDED := 2

## Il tempo fermo fra un round e l'altro, e fra un duello e l'altro.
const INTERMISSION_SEC := 4.0

## Ogni modalita' parte a due. Se TOURNAMENT ne pretendesse otto umani, non
## esisterebbe mai: i bot riempiono il resto.
const MIN_PLAYERS := 2
const MAX_PLAYERS := 8


## Crea lo stato di una partita. `peers` e' la lista degli id che ci giocano.
static func start(mode: int, peers: Array) -> Dictionary:
	var state := {
		"mode": mode,
		"phase": Phase.LIVE,
		"clock": 0.0,
		"peers": peers.duplicate(),
		"score": {},  # peer → uccisioni
		"deaths": {},  # peer → morti
		"team": {},  # peer → 0 | 1  (solo SQUAD)
		"team_score": [0, 0],
		"respawn_at": {},  # peer → istante in cui torna in vita
		"alive": {},  # peer → bool
		"winner": -1,  # peer vincitore, o indice di squadra in SQUAD
		"events": [],
		# --- solo TOURNAMENT ---
		"bracket": [],  # [{a, b, wins_a, wins_b, winner}]
		"duel": 0,  # quale duello e' in corso
		"round_ends_at": 0.0,
		"resume_at": 0.0,
	}
	for i in peers.size():
		var p = peers[i]
		state["score"][p] = 0
		state["deaths"][p] = 0
		state["alive"][p] = true
		state["team"][p] = i % 2
	if mode == Mode.TOURNAMENT:
		state["bracket"] = _seed_bracket(peers)
		state["duel"] = 0
		_open_duel(state)
	return state


## Il tabellone: otto giocatori, quattro duelli, poi due, poi la finale.
## Si gioca un duello alla volta — c'e' una sola arena, e chi perde guarda.
static func _seed_bracket(peers: Array) -> Array:
	var duels := []
	var i := 0
	while i + 1 < peers.size():
		duels.append({"a": peers[i], "b": peers[i + 1], "wins_a": 0, "wins_b": 0, "winner": -1})
		i += 2
	# Numero dispari: l'ultimo passa il turno. Meglio un bye che un duello
	# contro nessuno.
	if i < peers.size():
		duels.append({"a": peers[i], "b": -1, "wins_a": ROUND_WINS_NEEDED, "wins_b": 0, "winner": peers[i]})
	return duels


static func _open_duel(state: Dictionary) -> void:
	var duels: Array = state["bracket"]
	while state["duel"] < duels.size() and duels[state["duel"]]["winner"] != -1:
		state["duel"] += 1
	if state["duel"] >= duels.size():
		_advance_bracket(state)
		return
	var d: Dictionary = duels[state["duel"]]
	for p in state["peers"]:
		state["alive"][p] = p == d["a"] or p == d["b"]
	state["round_ends_at"] = state["clock"] + ROUND_SEC
	state["phase"] = Phase.LIVE
	state["events"].append({"kind": "round_start", "a": d["a"], "b": d["b"]})


## Finiti tutti i duelli di un turno, i vincitori si affrontano fra loro.
static func _advance_bracket(state: Dictionary) -> void:
	var winners := []
	for d in state["bracket"]:
		if d["winner"] != -1:
			winners.append(d["winner"])
	if winners.size() <= 1:
		state["phase"] = Phase.OVER
		state["winner"] = winners[0] if winners.size() == 1 else -1
		state["events"].append({"kind": "match_over", "winner": state["winner"]})
		return
	state["bracket"] = _seed_bracket(winners)
	state["duel"] = 0
	_open_duel(state)


## Qualcuno e' morto. `killer` puo' essere -1 (caduta, fuoco amico, suicidio):
## in quel caso la morte conta ma non fa punto a nessuno.
static func on_kill(state: Dictionary, killer: int, victim: int) -> void:
	if state["phase"] != Phase.LIVE:
		return
	if not state["alive"].has(victim) or not state["alive"][victim]:
		return
	state["alive"][victim] = false
	state["deaths"][victim] = int(state["deaths"].get(victim, 0)) + 1

	var mode: int = state["mode"]
	# Uccidersi da soli non fa punto, e in squadra uccidere un compagno nemmeno.
	# Un punteggio che sale sbagliando e' un punteggio che invita a sbagliare.
	var scores := killer != -1 and killer != victim
	if scores and mode == Mode.SQUAD and state["team"].get(killer, 0) == state["team"].get(victim, 1):
		scores = false
	if scores:
		state["score"][killer] = int(state["score"].get(killer, 0)) + 1
		if mode == Mode.SQUAD:
			var t: int = int(state["team"].get(killer, 0))
			state["team_score"][t] = int(state["team_score"][t]) + 1

	state["events"].append({"kind": "kill", "killer": killer, "victim": victim})

	if mode == Mode.TOURNAMENT:
		# Nel round non si respawna: chi muore ha perso il round, e basta.
		_end_round(state, killer if killer != -1 else _other_in_duel(state, victim))
	else:
		state["respawn_at"][victim] = float(state["clock"]) + float(RESPAWN_SEC[mode])
		_check_score_limit(state)


static func _other_in_duel(state: Dictionary, peer: int) -> int:
	var d: Dictionary = state["bracket"][state["duel"]]
	return d["b"] if d["a"] == peer else d["a"]


static func _check_score_limit(state: Dictionary) -> void:
	var mode: int = state["mode"]
	var limit: int = int(SCORE_LIMIT[mode])
	if mode == Mode.SQUAD:
		for t in 2:
			if int(state["team_score"][t]) >= limit:
				_finish(state, t)
				return
	else:
		for p in state["peers"]:
			if int(state["score"].get(p, 0)) >= limit:
				_finish(state, p)
				return


static func _finish(state: Dictionary, winner: int) -> void:
	state["phase"] = Phase.OVER
	state["winner"] = winner
	state["events"].append({"kind": "match_over", "winner": winner})


## Chiude un round di torneo e assegna la vittoria. Se un duellante arriva a due
## round, il duello e' suo e si passa al prossimo del tabellone.
static func _end_round(state: Dictionary, round_winner: int) -> void:
	var d: Dictionary = state["bracket"][state["duel"]]
	if round_winner == d["a"]:
		d["wins_a"] = int(d["wins_a"]) + 1
	elif round_winner == d["b"]:
		d["wins_b"] = int(d["wins_b"]) + 1
	state["events"].append({"kind": "round_over", "winner": round_winner})

	if int(d["wins_a"]) >= ROUND_WINS_NEEDED:
		d["winner"] = d["a"]
	elif int(d["wins_b"]) >= ROUND_WINS_NEEDED:
		d["winner"] = d["b"]

	if d["winner"] != -1:
		state["events"].append({"kind": "duel_over", "winner": d["winner"]})
		state["duel"] += 1
	state["phase"] = Phase.INTERMISSION
	state["resume_at"] = float(state["clock"]) + INTERMISSION_SEC


## Il battito della partita. Restituisce gli eventi accaduti in questo tick e li
## svuota: chi chiama li consuma una volta sola.
static func tick(state: Dictionary, delta: float) -> Array:
	state["clock"] = float(state["clock"]) + delta
	var now: float = state["clock"]

	if state["phase"] == Phase.OVER:
		return _drain(state)

	if state["phase"] == Phase.INTERMISSION:
		if now >= float(state["resume_at"]):
			_open_duel(state)
		return _drain(state)

	var mode: int = state["mode"]

	if mode == Mode.TOURNAMENT:
		# Round scaduto senza morti: vince chi ha piu' vita. Un pareggio a tempo
		# non decide niente, e una modalita' a eliminazione deve decidere.
		if now >= float(state["round_ends_at"]):
			_end_round(state, _healthiest_in_duel(state))
		return _drain(state)

	for peer in state["respawn_at"].keys():
		if now >= float(state["respawn_at"][peer]):
			state["respawn_at"].erase(peer)
			state["alive"][peer] = true
			state["events"].append({"kind": "respawn", "peer": peer})

	if now >= TIME_LIMIT_SEC:
		_finish(state, leader(state))

	return _drain(state)


## Chi e' in testa adesso. In SQUAD e' l'indice della squadra, altrove il peer.
## A parita' vince chi ha meno morti: chi ha fatto lo stesso punteggio
## rischiando meno ha giocato meglio.
static func leader(state: Dictionary) -> int:
	if state["mode"] == Mode.SQUAD:
		var a: int = int(state["team_score"][0])
		var b: int = int(state["team_score"][1])
		return 0 if a >= b else 1
	var best := -1
	var best_score := -1
	var best_deaths := 1 << 30
	for p in state["peers"]:
		var s: int = int(state["score"].get(p, 0))
		var d: int = int(state["deaths"].get(p, 0))
		if s > best_score or (s == best_score and d < best_deaths):
			best = p
			best_score = s
			best_deaths = d
	return best


static func _healthiest_in_duel(state: Dictionary) -> int:
	var d: Dictionary = state["bracket"][state["duel"]]
	var ha: float = float(state.get("hp", {}).get(d["a"], 0.0))
	var hb: float = float(state.get("hp", {}).get(d["b"], 0.0))
	return d["a"] if ha >= hb else d["b"]


## Il server aggiorna qui la vita di ognuno, cosi' un round scaduto sa chi
## stava vincendo. E' l'unico dato del combattimento che le regole guardano.
static func report_hp(state: Dictionary, peer: int, hp: float) -> void:
	if not state.has("hp"):
		state["hp"] = {}
	state["hp"][peer] = hp


## Qualcuno entra a partita gia' cominciata, e non c'e' nessun bot di cui
## prendere il posto. Entra vivo e a zero — non e' in coda, sta gia' giocando.
static func join(state: Dictionary, peer: int) -> void:
	if state["peers"].has(peer):
		return
	state["peers"].append(peer)
	state["score"][peer] = 0
	state["deaths"][peer] = 0
	state["alive"][peer] = true
	state["team"][peer] = (state["peers"].size() - 1) % 2


static func leave(state: Dictionary, peer: int) -> void:
	state["peers"].erase(peer)
	for key in ["score", "deaths", "alive", "team", "respawn_at", "hp"]:
		if state.has(key):
			state[key].erase(peer)


## Un umano prende il posto di un bot a partita in corso, e ne EREDITA il
## punteggio: chi entra non deve trovarsi a zero contro gente a quindici.
static func replace(state: Dictionary, bot_id: int, human_id: int) -> void:
	var i: int = state["peers"].find(bot_id)
	if i == -1:
		return
	state["peers"][i] = human_id
	for key in ["score", "deaths", "alive", "team", "respawn_at", "hp"]:
		if state.has(key) and state[key].has(bot_id):
			state[key][human_id] = state[key][bot_id]
			state[key].erase(bot_id)
	for d in state["bracket"]:
		if d["a"] == bot_id:
			d["a"] = human_id
		if d["b"] == bot_id:
			d["b"] = human_id
		if d["winner"] == bot_id:
			d["winner"] = human_id


## Quanto manca, per l'HUD. Negativo non esiste: a zero la partita e' finita.
static func time_left(state: Dictionary) -> float:
	if state["mode"] == Mode.TOURNAMENT:
		return maxf(0.0, float(state["round_ends_at"]) - float(state["clock"]))
	return maxf(0.0, TIME_LIMIT_SEC - float(state["clock"]))


static func _drain(state: Dictionary) -> Array:
	var out: Array = state["events"]
	state["events"] = []
	return out
