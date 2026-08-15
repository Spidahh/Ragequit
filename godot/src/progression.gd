## Cosa succede giocando venti ore.
##
## Niente da pagare, niente da grindare. Ma qualcosa deve succedere, o alla terza
## partita si chiude la scheda. Quello che succede e' che **il gioco si apre**.
##
## LA REGOLA, e non e' negoziabile: **si sblocca VARIETA', mai POTENZA.** Chi ha
## giocato cento ore ha piu' cose da provare, non abilita' piu' forti. E' l'unica
## forma di progressione compatibile con un PvP che vuole essere giusto, e la
## differenza fra un gioco gratis e un gioco gratis che ti chiede soldi per
## vincere.
##
## E GLI OBIETTIVI SONO IL TUTORIAL. Per sbloccare l'abilita' che sbalza a
## distanza devi aver gia' sbalzato dieci volte da vicino: quando arriva, sai
## gia' a cosa serve. Nessun popup lo avrebbe insegnato meglio.
##
## Il livello sale con le PARTITE GIOCATE, non con le vittorie: chi perde deve
## avere un motivo per tornare, ed e' esattamente chi rischia di non tornare.
extends RefCounted

const PATH := "user://progress.cfg"

## Il kit di partenza di ogni classe e' completo e competitivo: quello che si
## sblocca e' il resto del pool, non una versione piena di quello che hai.
##
## Ogni obiettivo e' scritto come un'AZIONE, non come un'attesa: "sbalza dieci
## volte" e non "gioca dieci partite". La differenza e' che il primo insegna.
const UNLOCKS := {
	"root_upthrow": {
		"stat": "air_hits",
		"goal": 10,
		"label": "Launch an enemy and hit them in the air — 10 times.",
	},
	"piercing_shot": {
		"stat": "long_bolts",
		"goal": 25,
		"label": "Land 25 projectiles from over 20 metres.",
	},
	"cleanse_surge": {
		"stat": "rounds_unlaunched",
		"goal": 3,
		"label": "Win a round without ever being launched — 3 times.",
	},
	"blizzard": {
		"stat": "zone_kills",
		"goal": 15,
		"label": "Finish 15 enemies inside one of your own zones.",
	},
	"life_drain": {
		"stat": "lifesteal_healed",
		"goal": 500,
		"label": "Heal 500 health by draining enemies.",
	},
	"dark_barrier": {
		"stat": "survived_at_low",
		"goal": 20,
		"label": "Survive 20 fights that took you under 30 health.",
	},
	"executioner": {
		"stat": "melee_kills",
		"goal": 30,
		"label": "Finish 30 enemies in melee range.",
	},
	"ice_wall": {
		"stat": "slow_seconds",
		"goal": 300,
		"label": "Keep enemies slowed for 300 seconds in total.",
	},
}

## Quante partite servono per ogni livello. Cresce piano: un gioco in cui il
## livello 2 arriva in cinque partite e il 3 in cinquanta smette di dire qualcosa
## proprio quando dovrebbe.
const MATCHES_PER_LEVEL := 4

var stats: Dictionary = {}
var unlocked: Array = []
var matches_played := 0

signal unlocked_ability(id: String)


func _init() -> void:
	load_from_disk()


## Un'abilità è disponibile se non ha un obiettivo, o se l'obiettivo è fatto.
## Il default è DISPONIBILE: un contenuto nuovo non deve sparire per il solo
## fatto che nessuno gli ha scritto un obiettivo.
func is_unlocked(ability_id: String) -> bool:
	if not UNLOCKS.has(ability_id):
		return true
	return unlocked.has(ability_id)


## Quanto manca, in parole, per l'HUD della schermata build. Chi non ha ancora
## un'abilità deve VEDERLA e sapere cosa fare per averla: nasconderla è come non
## averla mai scritta.
func progress_text(ability_id: String) -> String:
	if not UNLOCKS.has(ability_id):
		return ""
	if is_unlocked(ability_id):
		return "UNLOCKED"
	var u: Dictionary = UNLOCKS[ability_id]
	var have := int(stats.get(String(u["stat"]), 0))
	return "%s   %d / %d" % [String(u["label"]), have, int(u["goal"])]


## Il gioco riporta qui quello che è successo. Restituisce le abilità sbloccate
## da questo evento, così chi chiama può mostrarle senza doverle cercare.
func record(stat: String, amount: int = 1) -> Array:
	stats[stat] = int(stats.get(stat, 0)) + amount
	var fresh := []
	for id in UNLOCKS:
		if unlocked.has(id):
			continue
		var u: Dictionary = UNLOCKS[id]
		if String(u["stat"]) != stat:
			continue
		if int(stats[stat]) >= int(u["goal"]):
			unlocked.append(id)
			fresh.append(id)
			unlocked_ability.emit(id)
	save()
	return fresh


## Fine partita. Il livello sale comunque: chi perde deve avere un motivo per
## rigiocare, ed è chi rischia di non tornare.
func finish_match(_won: bool) -> int:
	matches_played += 1
	save()
	return level()


func level() -> int:
	return 1 + int(matches_played / MATCHES_PER_LEVEL)


## Quanto manca al livello successivo, fra 0 e 1. Serve alla barra del menù, ed
## è l'unica cosa che il menù mostra di sé stesso.
func level_fraction() -> float:
	return float(matches_played % MATCHES_PER_LEVEL) / float(MATCHES_PER_LEVEL)


func save() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("progress", "matches", matches_played)
	cfg.set_value("progress", "unlocked", unlocked)
	for k in stats:
		cfg.set_value("stats", k, stats[k])
	cfg.save(PATH)


func load_from_disk() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(PATH) != OK:
		return
	matches_played = int(cfg.get_value("progress", "matches", 0))
	unlocked = cfg.get_value("progress", "unlocked", [])
	stats = {}
	for k in cfg.get_section_keys("stats") if cfg.has_section("stats") else []:
		stats[k] = cfg.get_value("stats", k, 0)
