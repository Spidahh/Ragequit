## Verifica che OGNI EVENTO ABBIA UN SUONO.
##
## È la regola del §10 del progetto, ed è una regola che si rompe in silenzio:
## un suono che manca non dà nessun errore, semplicemente non succede — e uno
## sparatutto senza il tic del colpo a segno sembra rotto senza che nessuno
## sappia dire perché. Questo test è ciò che se ne accorge.
##
##   godot --headless --script res://tests/test_audio.gd
extends SceneTree

## La lista degli eventi che DEVONO suonare. Se se ne aggiunge uno al gioco e
## non lo si aggiunge qui, il test non lo protegge: questa lista è il contratto.
const REQUIRED := [
	"cast_beam",
	"cast_bolt",
	"cast_burst",
	"hit_confirm",
	"hurt",
	"launched",
	"death",
	"kill",
	"parry",
	"ready",
	"unavailable",
	"step_1",
	"step_2",
	"step_3",
	"step_4",
	"land",
	"jump",
	"torch_loop",
	"wind_loop",
	"ui_hover",
	"ui_click",
	"ui_confirm",
]

const LOOPS := ["torch_loop", "wind_loop"]

var failures := 0
var _step := 0


func _check(what: String, ok: bool, detail: String) -> void:
	if ok:
		print("  ✓ %s — %s" % [what, detail])
	else:
		failures += 1
		printerr("  ✗ %s — %s" % [what, detail])


func _init() -> void:
	print("\n=== L'AUDIO ===\n")


## L'autoload esiste solo dal primo frame: in `_init` l'albero non è ancora
## costruito e `/root/Audio` non c'è.
func _process(_delta: float) -> bool:
	_step += 1
	if _step < 2:
		return false

	var audio := root.get_node_or_null("Audio")
	_check("il servizio audio esiste", audio != null, "autoload /root/Audio")
	if audio == null:
		quit(1)
		return true

	var missing := []
	for name in REQUIRED:
		if not audio.has(name):
			missing.append(name)
	_check(
		"ogni evento ha il suo suono",
		missing.is_empty(),
		"%d suoni caricati, mancano: %s" % [REQUIRED.size() - missing.size(), str(missing)]
	)

	# I bus separati non sono ordine: servono perché il combattimento possa
	# abbassare l'ambiente senza toccare nient'altro.
	var buses := []
	for n in ["SFX", "Ambient", "UI", "Music"]:
		if AudioServer.get_bus_index(n) == -1:
			buses.append(n)
	_check("i quattro bus ci sono", buses.is_empty(), "mancano: %s" % str(buses))

	# Un loop che non è marcato come loop suona una volta e poi lascia il
	# silenzio. Non dà errori: dà un'arena che ammutolisce dopo quattro secondi.
	var not_looping := []
	for name in LOOPS:
		var s = audio._streams.get(name)
		if s == null or not (s is AudioStreamWAV) or s.loop_mode != AudioStreamWAV.LOOP_FORWARD:
			not_looping.append(name)
	_check("gli ambienti si ripetono davvero", not_looping.is_empty(), "non in loop: %s" % str(not_looping))

	# Il tic del colpo a segno deve essere CORTO: è l'unico suono che deve poter
	# suonare tre volte in mezzo secondo senza impastarsi con sé stesso.
	var hit = audio._streams.get("hit_confirm")
	var hit_sec: float = 0.0
	if hit is AudioStreamWAV:
		hit_sec = float(hit.data.size() / 2) / float(hit.mix_rate)
	_check("la conferma di colpo è corta", hit_sec > 0.0 and hit_sec < 0.15, "%.0f ms" % (hit_sec * 1000.0))

	# Ventiquattro voci per tipo: in un fight a otto ne servono più di quattro,
	# e allocarne una per colpo significa allocare nel momento peggiore.
	_check("le voci sono preallocate", audio._pool.size() >= 16 and audio._pool_3d.size() >= 16, "%d + %d voci" % [audio._pool.size(), audio._pool_3d.size()])

	# Il silenzio a un tasto deve funzionare in entrambe le direzioni.
	var muted: bool = audio.toggle_mute()
	var back: bool = audio.toggle_mute()
	_check("il muto va e torna", muted and not back, "M silenzia e M riaccende")

	print("")
	if failures == 0:
		print("Tutto verde.\n")
		quit(0)
	else:
		printerr("%d rosso/i.\n" % failures)
		quit(1)
	return true
