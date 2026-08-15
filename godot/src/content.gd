## Il contenuto del gioco: le 67 abilità, le 4 classi, le 12 sottoclassi.
##
## LA REGOLA CHE QUESTO FILE FA RISPETTARE: **un numero che nessun file importa è
## un numero che nessuno può correggere.** Nel progetto precedente il tempo di
## uccisione dichiarato era sbagliato di tre-cinque volte, ed è rimasto sbagliato
## per tutta la vita del progetto perché viveva in un documento e in nessun
## `import`. Qui i dati sono la fonte: se un danno cambia in `data/abilities.json`
## cambia nel gioco, nei test e nelle schermate insieme.
##
## I dati arrivano dal progetto precedente esportati meccanicamente. Non sono
## stati ribattuti a mano: ricopiare 67 abilità è ricopiare 67 occasioni di
## sbagliare un numero senza accorgersene.
extends RefCounted

const ABILITIES_PATH := "res://data/abilities.json"
const CLASSES_PATH := "res://data/classes.json"

## Le tre forme con cui un colpo raggiunge il bersaglio, più le due che non lo
## raggiungono affatto perché partono già addosso a qualcuno.
enum Shape { BEAM, BOLT, BURST, ZONE, SELF }

static var _abilities: Dictionary = {}
static var _classes: Array = []
static var _loaded := false


static func _load() -> void:
	if _loaded:
		return
	_loaded = true
	_abilities = {}
	for raw in _read_json(ABILITIES_PATH, []):
		var a := _parse_ability(raw)
		_abilities[a["id"]] = a
	_classes = _read_json(CLASSES_PATH, [])


static func _read_json(path: String, fallback: Variant) -> Variant:
	if not FileAccess.file_exists(path):
		push_error("content: manca %s" % path)
		return fallback
	var text := FileAccess.get_file_as_string(path)
	var parsed = JSON.parse_string(text)
	return parsed if parsed != null else fallback


## Traduce un'abilità dei dati in qualcosa che il gioco sa eseguire.
##
## Il danno NON sta in un campo: sta dentro gli effetti, e può arrivare da un
## colpo diretto, da un proiettile, da una zona che pulsa o da un canale. Qui si
## somma una volta sola, e da qui in poi nessuno lo ricalcola — due posti che
## calcolano lo stesso totale sono due posti che possono dare totali diversi.
static func _parse_ability(raw: Dictionary) -> Dictionary:
	var effects: Array = _with_channels_as_zones(raw.get("effects", []))
	var damage := 0.0
	var airtime := 0.0
	var speed := 0.0
	var radius := 0.0
	var zone_sec := 0.0
	var heal := 0.0
	for e in effects:
		match String(e.get("kind", "")):
			"damage":
				damage += float(e.get("amount", 0.0))
				radius = maxf(radius, float(e.get("radius", 0.0)))
			"projectile":
				damage += float(e.get("damage", 0.0))
				speed = maxf(speed, float(e.get("speedMps", 0.0)))
				radius = maxf(radius, float(e.get("splashRadius", 0.0)))
			"zone":
				var ticks := 0.0
				var every := float(e.get("tickEverySec", 1.0))
				if every > 0.0:
					ticks = floorf(float(e.get("durationSec", 0.0)) / every)
				damage += float(e.get("damagePerTick", 0.0)) * ticks
				radius = maxf(radius, float(e.get("radius", 0.0)))
				zone_sec = maxf(zone_sec, float(e.get("durationSec", 0.0)))
			"channel":
				var per: Dictionary = e.get("perTick", {})
				var every2 := float(e.get("tickEverySec", 1.0))
				var n := 0.0
				if every2 > 0.0:
					n = floorf(float(e.get("durationSec", 0.0)) / every2)
				damage += float(per.get("amount", 0.0)) * n if String(per.get("kind", "")) == "damage" else 0.0
				heal += float(per.get("amount", 0.0)) * n if String(per.get("kind", "")) == "heal" else 0.0
			"knockup":
				airtime = maxf(airtime, float(e.get("airborneSec", 0.0)))
			"heal":
				heal += float(e.get("amount", 0.0))

	return {
		"id": String(raw.get("id", "")),
		"name": String(raw.get("name", "")),
		"school": String(raw.get("slot", "")),
		"element": String(raw.get("element", "none")),
		"weapon": String(raw.get("weapon", "none")),
		"role": String(raw.get("role", "")),
		"description": String(raw.get("description", "")),
		"mini_malus": String(raw.get("mini_malus", "")),
		"cooldown": float(raw.get("cooldown", 0.0)),
		"windup": float(raw.get("windup", 0.0)),
		"range_m": float(raw.get("range", 0.0)),
		"cost_mana": float(raw.get("cost_mana", 0.0)),
		"cost_stamina": float(raw.get("cost_stamina", 0.0)),
		"damage": damage,
		"heal": heal,
		"airtime": airtime,
		# Il runtime delle forme chiede "sbalza sì o no"; la durata la chiede
		# dopo, quando sa con quale sottoclasse.
		"launches": airtime > 0.0,
		"bolt_speed": speed,
		"radius": radius,
		"zone_sec": zone_sec,
		"shape": _shape_of(raw, speed, zone_sec),
		"effects": effects,
	}


## Un canale è una zona che ti segue.
##
## `Whirlwind Slash` gira per un secondo colpendo tutto intorno a ogni terzo di
## secondo; `Life Drain` tiene un raggio addosso a qualcuno per due secondi e
## mezzo. Sono la stessa cosa vista da due angoli: qualcosa che pulsa per un
## po'. Trattarli come un colpo istantaneo che infligge tutto il totale sarebbe
## una bugia — l'avversario non avrebbe modo di uscirne, che è esattamente ciò
## che un canale deve concedere. Qui il canale diventa una zona centrata su chi
## lancia, e il resto del gioco non deve sapere che esistono i canali.
static func _with_channels_as_zones(effects: Array) -> Array:
	var out := effects.duplicate(true)
	for e in effects:
		if String(e.get("kind", "")) != "channel":
			continue
		var per: Dictionary = e.get("perTick", {})
		if String(per.get("kind", "")) != "damage":
			continue
		out.append(
			{
				"kind": "zone",
				"placement": "self",
				"radius": maxf(float(per.get("radius", 0.0)), 2.5),
				"durationSec": float(e.get("durationSec", 1.0)),
				"tickEverySec": float(e.get("tickEverySec", 0.5)),
				"damagePerTick": float(per.get("amount", 0.0)),
				"fromChannel": true,
			}
		)
	return out


## Che forma ha un'abilità, dedotta da cosa fa e non da un campo che qualcuno
## deve ricordarsi di riempire. Un campo in più da tenere allineato è un campo
## che prima o poi non lo è.
static func _shape_of(raw: Dictionary, speed: float, zone_sec: float) -> int:
	var targeting := String(raw.get("targeting", "forward"))
	if targeting == "self" and float(raw.get("range", 0.0)) <= 0.0:
		return Shape.SELF
	if targeting == "point" or zone_sec > 0.0:
		return Shape.ZONE
	if speed > 0.0:
		return Shape.BOLT
	if targeting == "self":
		return Shape.BURST
	return Shape.BEAM


# --- accesso --------------------------------------------------------------


static func ability(id: String) -> Dictionary:
	_load()
	return _abilities.get(id, {})


static func all_abilities() -> Dictionary:
	_load()
	return _abilities


static func classes() -> Array:
	_load()
	return _classes


static func game_class(id: String) -> Dictionary:
	for c in classes():
		if String(c.get("id", "")) == id:
			return c
	return {}


static func subclass(class_id: String, sub_id: String) -> Dictionary:
	for s in game_class(class_id).get("subclasses", []):
		if String(s.get("id", "")) == sub_id:
			return s
	return {}


## Il kit di partenza di una sottoclasse: otto abilità già scelte e sensate.
## Si può giocare senza mai aprire la schermata delle build — chi vuole solo
## giocare deve poterlo fare, e un preset vuoto è una schermata obbligatoria
## travestita da libertà.
static func preset_kit(class_id: String) -> Array:
	var out := []
	for id in game_class(class_id).get("preset", []):
		var a := ability(String(id))
		if not a.is_empty():
			out.append(a)
	return out


## Le abilità che una classe può portare. È il pool CURATO, non tutto il gioco:
## un kit chiuso è ciò che rende una classe riconoscibile — guardando un'abilità
## devi sapere chi la lancia.
static func pool(class_id: String) -> Array:
	var out := []
	for id in game_class(class_id).get("pool", []):
		var a := ability(String(id))
		if not a.is_empty():
			out.append(a)
	return out


## I numeri di un personaggio, classe e sottoclasse insieme.
##
## La sottoclasse è un BARATTO: non tocca mai il danno — quello cambierebbe
## quanto dura un fight — ma cambia vita, velocità, ricariche e quanto a lungo
## tieni qualcuno per aria. Cioè cambia come si gioca, non quanto si vince.
static func stats(class_id: String, sub_id: String) -> Dictionary:
	var c := game_class(class_id)
	var s := subclass(class_id, sub_id)
	return {
		"max_hp": float(c.get("hp", 200)) * float(s.get("max_hp_mult", 1.0)),
		"max_mana": float(c.get("mana", 100)),
		"max_stamina": float(c.get("stamina", 150)),
		"move_speed_mult": float(s.get("move_speed_mult", 1.0)),
		"cooldown_mult": float(s.get("cooldown_mult", 1.0)),
		"knockup_mult": float(s.get("knockup_airtime_mult", 1.0)),
		"weapons": c.get("weapons", []),
		"label": String(c.get("label", class_id.to_upper())),
		"sub_name": String(s.get("name", "")),
	}


## La ricarica vera di un'abilità per un dato personaggio.
static func cooldown_for(a: Dictionary, stats_dict: Dictionary) -> float:
	return float(a.get("cooldown", 0.0)) * float(stats_dict.get("cooldown_mult", 1.0))


## Quanto resta per aria chi viene sbalzato da questa abilità, con questa
## sottoclasse. È il numero che ANVIL, SPIRE e PYRE comprano.
static func airtime_for(a: Dictionary, stats_dict: Dictionary) -> float:
	return float(a.get("airtime", 0.0)) * float(stats_dict.get("knockup_mult", 1.0))
