## L'audio.
##
## Meta' del peso di uno sparatutto sta nelle orecchie: un colpo senza suono non
## pesa, per quanto bene sia disegnato. Era la mancanza che, a parita' di sforzo,
## cambiava di piu'.
##
## LA REGOLA: ogni evento che cambia lo stato del gioco ha un suono, e ogni suono
## dice UNA cosa sola. Tre famiglie che non si confondono mai:
##
##   - quello che FAI TU     → secco, in primo piano, senza riverbero;
##   - quello che TI FANNO   → filtrato e spazializzato, deve dire DA DOVE;
##   - il MONDO              → sotto tutto, non compete mai.
##
## Le tre famiglie stanno su tre bus diversi non per ordine, ma perche' il
## combattimento ABBASSA l'ambiente mentre suona: e' l'unico modo perche' un
## crepitio di torcia non copra il suono che ti dice che sei stato colpito.
##
## Il suono piu' importante e' `hit_confirm`. E' l'unico feedback che un FPS non
## puo' non avere — senza, non sai se hai colpito — e taglia sopra tutto.
extends Node

const DIR := "res://audio/"

## Il combattimento si sente sopra l'ambiente di sei decibel. Non e' un gusto:
## e' la differenza fra sentire da dove arriva un colpo e non sentirlo.
const DUCK_DB := -6.0
const DUCK_SEC := 0.35

## I suoni che fanno abbassare l'ambiente. Gli altri no: un passo che abbassa il
## vento a ogni falcata produce un mondo che respira a tempo di corsa.
const DUCKS := ["cast_beam", "cast_bolt", "cast_burst", "hurt", "death", "kill"]

## I due loop d'ambiente. Un WAV importato non si ripete da solo: il flag va
## messo sulla risorsa, o il vento suona quattro secondi e poi cala il silenzio.
const LOOPS := ["torch_loop", "wind_loop"]

enum Bus { MASTER, SFX, AMBIENT, UI, MUSIC }

const BUS_NAME := {
	Bus.MASTER: "Master", Bus.SFX: "SFX", Bus.AMBIENT: "Ambient",
	Bus.UI: "UI", Bus.MUSIC: "Music",
}

var _streams: Dictionary = {}
var _pool: Array[AudioStreamPlayer] = []
var _pool_3d: Array[AudioStreamPlayer3D] = []
var _duck_t := 0.0
var _ambient_db := 0.0
## Passi: si alternano invece di ripetersi. Un passo identico ripetuto diventa
## un metronomo e sparisce dall'attenzione.
var _step_i := 0
var _muted := false


func _ready() -> void:
	_make_buses()
	_load_all()
	# Le voci si allocano una volta: creare un nodo per ogni colpo in un fight
	# significa allocare decine di volte al secondo nel momento peggiore.
	for i in 24:
		var p := AudioStreamPlayer.new()
		add_child(p)
		_pool.append(p)
	for i in 24:
		var p3 := AudioStreamPlayer3D.new()
		p3.max_distance = 45.0
		add_child(p3)
		_pool_3d.append(p3)


func _make_buses() -> void:
	for b in [Bus.SFX, Bus.AMBIENT, Bus.UI, Bus.MUSIC]:
		var name: String = BUS_NAME[b]
		if AudioServer.get_bus_index(name) != -1:
			continue
		var idx := AudioServer.get_bus_count()
		AudioServer.add_bus(idx)
		AudioServer.set_bus_name(idx, name)
		AudioServer.set_bus_send(idx, "Master")


func _load_all() -> void:
	var dir := DirAccess.open(DIR)
	if dir == null:
		push_warning("audio: nessuna cartella %s — lancia tools/make_sounds.mjs" % DIR)
		return
	for file in dir.get_files():
		# Nell'export i .wav diventano .wav.import: si cerca il nome, non il file.
		var base := file.get_basename()
		if base.get_extension() != "":
			base = base.get_basename()
		if _streams.has(base):
			continue
		var stream = load(DIR + base + ".wav")
		if stream == null:
			continue
		if base in LOOPS and stream is AudioStreamWAV:
			stream.loop_mode = AudioStreamWAV.LOOP_FORWARD
			stream.loop_begin = 0
			stream.loop_end = stream.data.size() / 2
		_streams[base] = stream


func has(sound: String) -> bool:
	return _streams.has(sound)


## Un suono senza posizione: quello che fai tu, l'HUD, i menu.
func play(sound: String, bus: int = Bus.SFX, volume_db: float = 0.0) -> void:
	var stream = _streams.get(sound)
	if stream == null or _muted:
		return
	var p := _free_voice()
	if p == null:
		return
	p.stream = stream
	p.bus = BUS_NAME[bus]
	p.volume_db = volume_db
	p.play()
	if sound in DUCKS:
		_duck_t = DUCK_SEC


## Un suono nel mondo: quello che ti fanno, e tutto cio' che ha un DOVE.
## Spazializzarlo non e' un lusso — morire senza sapere da dove e' la cosa che
## fa chiudere un PvP.
func play_at(sound: String, position: Vector3, volume_db: float = 0.0) -> void:
	var stream = _streams.get(sound)
	if stream == null or _muted:
		return
	var p := _free_voice_3d()
	if p == null:
		return
	p.stream = stream
	p.bus = BUS_NAME[Bus.SFX]
	p.volume_db = volume_db
	p.global_position = position
	p.play()
	if sound in DUCKS:
		_duck_t = DUCK_SEC


## Il passo successivo della sequenza. Quattro varianti, in giro.
func step(position: Vector3) -> void:
	_step_i = (_step_i + 1) % 4
	play_at("step_%d" % (_step_i + 1), position, -6.0)


## Un loop d'ambiente attaccato a un punto della mappa (una torcia).
func ambience_at(sound: String, parent: Node3D, volume_db: float = -12.0) -> AudioStreamPlayer3D:
	var stream = _streams.get(sound)
	if stream == null:
		return null
	var p := AudioStreamPlayer3D.new()
	p.stream = stream
	p.bus = BUS_NAME[Bus.AMBIENT]
	p.volume_db = volume_db
	p.max_distance = 22.0
	p.autoplay = true
	parent.add_child(p)
	p.play()
	return p


## Il fondo continuo dell'arena, senza posizione.
func ambience(sound: String, volume_db: float = -18.0) -> AudioStreamPlayer:
	var stream = _streams.get(sound)
	if stream == null:
		return null
	var p := AudioStreamPlayer.new()
	p.stream = stream
	p.bus = BUS_NAME[Bus.AMBIENT]
	p.volume_db = volume_db
	add_child(p)
	p.play()
	return p


## `M` toglie tutto, subito, senza aprire niente — perche' a volte serve.
func toggle_mute() -> bool:
	_muted = not _muted
	AudioServer.set_bus_mute(AudioServer.get_bus_index("Master"), _muted)
	return _muted


func set_bus_volume(bus: int, db: float) -> void:
	var idx := AudioServer.get_bus_index(BUS_NAME[bus])
	if idx != -1:
		AudioServer.set_bus_volume_db(idx, db)
	if bus == Bus.AMBIENT:
		_ambient_db = db


## `M` toglie tutto senza aprire niente. È l'unica scorciatoia cablata qui e non
## nella mappa dei tasti, perché deve funzionare anche mentre un menù è aperto,
## anche a partita finita, anche se la mappa dei tasti è rotta.
func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_M:
		toggle_mute()


func _process(delta: float) -> void:
	# L'attenuazione dell'ambiente rientra da sola: se restasse abbassata dopo
	# l'ultimo colpo, il mondo si spegnerebbe a ogni fight e non tornerebbe.
	var idx := AudioServer.get_bus_index(BUS_NAME[Bus.AMBIENT])
	if idx == -1:
		return
	var target := _ambient_db + (DUCK_DB if _duck_t > 0.0 else 0.0)
	var now := AudioServer.get_bus_volume_db(idx)
	AudioServer.set_bus_volume_db(idx, lerpf(now, target, clampf(delta * 8.0, 0.0, 1.0)))
	if _duck_t > 0.0:
		_duck_t -= delta


func _free_voice() -> AudioStreamPlayer:
	for p in _pool:
		if not p.playing:
			return p
	# Nessuna voce libera: si ruba la prima. Meglio un suono troncato che un
	# colpo a segno muto.
	return _pool[0] if not _pool.is_empty() else null


func _free_voice_3d() -> AudioStreamPlayer3D:
	for p in _pool_3d:
		if not p.playing:
			return p
	return _pool_3d[0] if not _pool_3d.is_empty() else null
