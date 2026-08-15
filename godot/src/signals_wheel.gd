## I quattro segnali rapidi, al posto della chat.
##
## PERCHE' NON C'E' UNA CHAT. In un PvP anonimo e gratuito una chat aperta e' una
## funzione di molestia con un costo di moderazione che questo progetto non puo'
## sostenere. Non e' una mancanza di tempo: e' che una chat che nessuno modera e'
## peggio di nessuna chat, e moderarla vuol dire pagare qualcuno per leggerla.
##
## AL SUO POSTO QUATTRO SEGNALI, e sono quattro perche' quattro coprono tutto
## quello che serve in un'arena e **nessuno dei quattro puo' ferire**:
##
##   - **Attacking** — sto entrando, seguimi;
##   - **Falling back** — mi tolgo, non contare su di me adesso;
##   - **Nice** — bel colpo (l'unico modo che il gioco da' di dire qualcosa di
##     buono a qualcuno, ed e' voluto che ci sia);
##   - **Sorry** — ho sbagliato io.
##
## Non si scrive niente e non si sceglie niente di piu': un elenco che cresce
## diventa un elenco dove qualcuno trova il modo di essere sgradevole.
##
## SI TENGONO E SI RILASCIANO, come una rotella d'armi: tenendo il tasto compare
## la scelta, il mouse la punta, il rilascio la manda. Un menu che si apre e si
## chiude con due click e' un menu che in un fight non si usa.
extends RefCounted

enum Signal_ { ATTACKING, FALLING_BACK, NICE, SORRY }

const LABELS := {
	Signal_.ATTACKING: "ATTACKING",
	Signal_.FALLING_BACK: "FALLING BACK",
	Signal_.NICE: "NICE",
	Signal_.SORRY: "SORRY",
}

## Dove sta ognuno sulla rotella, in gradi da su, in senso orario. Le posizioni
## sono FISSE: la memoria muscolare vale piu' di qualunque etichetta, e un
## elenco che si riordina la distrugge.
const ANGLES := {
	Signal_.ATTACKING: 0.0,
	Signal_.FALLING_BACK: 180.0,
	Signal_.NICE: 90.0,
	Signal_.SORRY: 270.0,
}

## Quanto resta a schermo un segnale ricevuto.
const SHOW_SEC := 2.5
## Quanto deve aspettare chi ne manda uno prima del prossimo. Senza, i quattro
## segnali innocui diventano quattro modi di fare rumore addosso a qualcuno.
const COOLDOWN_SEC := 2.0
## Sotto questa distanza dal centro il rilascio NON manda niente: e' l'uscita
## per chi ha aperto la rotella e ha cambiato idea.
const DEADZONE := 0.25

var last_sent_at := -100.0


## Quale segnale sta puntando il mouse. `offset` e' lo spostamento dal centro
## della rotella, in frazione del raggio.
##
## Restituisce -1 nella zona morta: aprire e chiudere senza mandare niente deve
## essere possibile, o il tasto diventa una trappola.
static func pick(offset: Vector2) -> int:
	if offset.length() < DEADZONE:
		return -1
	# `atan2(x, -y)` e non `atan2(y, x)`: lo zero sta in ALTO e i gradi crescono
	# in senso orario, come le posizioni dichiarate sopra.
	var deg := rad_to_deg(atan2(offset.x, -offset.y))
	if deg < 0.0:
		deg += 360.0
	var best := -1
	var best_gap := 999.0
	for k in ANGLES:
		var gap: float = absf(_angle_gap(deg, float(ANGLES[k])))
		if gap < best_gap:
			best_gap = gap
			best = int(k)
	return best


static func _angle_gap(a: float, b: float) -> float:
	var d := fmod(a - b + 540.0, 360.0) - 180.0
	return d


func can_send(now: float) -> bool:
	return now - last_sent_at >= COOLDOWN_SEC


## Manda un segnale, se si puo'. Restituisce il testo da mostrare, o vuoto.
func send(which: int, now: float) -> String:
	if which < 0 or not can_send(now):
		return ""
	last_sent_at = now
	return String(LABELS.get(which, ""))


## Il testo che appare sopra chi lo ha mandato. Il nome davanti, sempre: un
## "NICE" senza nome in una partita a otto non dice a chi.
static func message(sender: String, which: int) -> String:
	return "%s:  %s" % [sender, String(LABELS.get(which, ""))]
