## La facciata dell'audio: come si chiama un suono da qualunque punto del gioco.
##
## PERCHE' ESISTE, invece di chiamare l'autoload `Audio` direttamente.
## In `--script` (cioe' in ogni test) l'identificatore globale dell'autoload NON
## e' registrato al momento in cui gli script vengono compilati: `arena.gd` e
## `player.gd` fallivano la compilazione con "Identifier not found: Audio", il
## Player restava un CharacterBody3D nudo senza i suoi metodi, e i test
## dell'arena restavano appesi ad aspettare qualcosa che non poteva succedere.
## Un errore che si presenta come un blocco, non come un errore.
##
## Qui il servizio si cerca a RUNTIME e, se non c'e', non succede niente. Il
## risultato e' che l'audio non e' mai una dipendenza di compilazione di nessuno:
## un test puo' girare senza, e il gioco suona lo stesso.
## Si usa con un `preload`, non con `class_name`: la cache delle classi globali
## si costruisce a un passo di import, e uno script che dipende da quella cache
## non compila su un checkout appena clonato. È la stessa ragione per cui i test
## preloadano invece di usare i nomi globali.
extends RefCounted

const AudioSvc := preload("res://src/audio.gd")

## I bus, ripresi dal servizio invece che ricopiati: se domani ne nasce uno
## nuovo, esiste in un posto solo.
const SFX := AudioSvc.Bus.SFX
const AMBIENT := AudioSvc.Bus.AMBIENT
const UI := AudioSvc.Bus.UI
const MUSIC := AudioSvc.Bus.MUSIC

static var _svc: Node = null


static func service() -> Node:
	if _svc != null and is_instance_valid(_svc):
		return _svc
	var loop := Engine.get_main_loop()
	if loop is SceneTree:
		_svc = (loop as SceneTree).root.get_node_or_null("Audio")
	return _svc


static func play(sound: String, bus: int = SFX, volume_db: float = 0.0) -> void:
	var s := service()
	if s:
		s.play(sound, bus, volume_db)


static func play_at(sound: String, position: Vector3, volume_db: float = 0.0) -> void:
	var s := service()
	if s:
		s.play_at(sound, position, volume_db)


static func step(position: Vector3) -> void:
	var s := service()
	if s:
		s.step(position)


static func ambience(sound: String, volume_db: float = -18.0) -> void:
	var s := service()
	if s:
		s.ambience(sound, volume_db)


static func ambience_at(sound: String, parent: Node3D, volume_db: float = -12.0) -> void:
	var s := service()
	if s:
		s.ambience_at(sound, parent, volume_db)
