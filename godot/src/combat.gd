## Il motore di combattimento.
##
## COSA SI FA, in una riga: punti, premi, parte una forma, colpisce quello che
## tocca, fa danno. Tutto il resto è contorno di questo.
##
## I NUMERI SONO RIFATTI DA ZERO, non ereditati. Il progetto precedente aveva 67
## abilità con valori accumulati in mesi, dove ogni numero era stato scelto in
## isolamento: cooldown da 3 a 12 secondi, danni da 6 a 200, e una banda di TTK
## che nessuno importava e che è rimasta sbagliata di 3-5 volte per tutta la vita
## del progetto. Qui i valori vengono da UNA scala, e la scala ha una ragione.
##
## LA SCALA
##
## Parto da quanto deve durare uno scambio, non dal danno di una singola
## abilità: un duello si decide in ~8 secondi, che è la banda degli arena
## shooter (Quake ~2-4 s con l'arma giusta, gli hero shooter 8-12). Da lì
## discende tutto:
##   vita 200 → servono ~25 danni al secondo per chiudere in 8 s
##   l'arma base ne fa 15 → le abilità devono coprire i ~10 mancanti
##   con 4 abilità in mano e ~8 s di scambio, ognuna entra 1-2 volte
##   quindi: cooldown 4-6 s, danno 20-45 a seconda dell'impegno
##
## Ogni numero qui sotto si giustifica con quella catena. Se cambia la durata
## dello scambio, cambiano tutti insieme — non uno alla volta a occhio.
class_name Combat

# --- La scala. Tre gradini, non 67 valori liberi. -------------------------
const HP_MAX := 200.0
const TTK_TARGET_SEC := 8.0

## Danno: leggero / medio / pesante. Il pesante costa impegno (vedi CAST).
const DMG := {"light": 20.0, "medium": 32.0, "heavy": 45.0}
## Cooldown: rapido / normale / lento.
const CD := {"fast": 4.0, "normal": 5.0, "slow": 6.5}
## Tempo di preparazione: quanto sei scoperto prima che parta.
const CAST := {"instant": 0.0, "short": 0.2, "long": 0.45}
## Gittata in metri.
const RANGE := {"melee": 3.0, "mid": 18.0, "far": 30.0}

## Global cooldown: impedisce di svuotare la mano in un frame. Sotto questo
## valore il combattimento diventa "premi tutto", che è rumore, non decisioni.
const GCD_SEC := 0.35

## Come arriva il colpo. Tre forme, e sono TRE perché ognuna chiede al giocatore
## una cosa diversa: mirare fermo, anticipare, o piazzare.
enum Shape {
	BEAM,  ## istantaneo in linea retta — chiede mira precisa
	BOLT,  ## proiettile con velocità — chiede anticipo
	BURST,  ## area centrata su di te — chiede posizionamento
}

const BOLT_SPEED := 42.0
## Raggio del fascio: quanto perdona la mira. È UN numero, e si tara guardando
## quanto è largo un corpo (0.4 m di raggio capsula) — non con una formula che
## cresce con la distanza, che era il "calcolo strano" del progetto precedente.
const BEAM_RADIUS := 0.45
const BURST_RADIUS := 5.0


class AbilityDef:
	var id: String
	var name: String
	var shape: Shape
	var damage: float
	var cooldown: float
	var cast_time: float
	var range_m: float
	var launches: bool  ## sbalza in aria: il momento firma del gioco

	func _init(p_id: String, p_name: String, p_shape: Shape, p_damage: float, p_cd: float, p_cast: float, p_range: float, p_launch := false) -> void:
		id = p_id
		name = p_name
		shape = p_shape
		damage = p_damage
		cooldown = p_cd
		cast_time = p_cast
		range_m = p_range
		launches = p_launch

	## Danno al secondo sostenuto: il numero che conta per il TTK, e l'unico modo
	## onesto di confrontare due abilità con impegno diverso.
	func dps() -> float:
		return damage / (cooldown + maxf(cast_time, GCD_SEC))


## Le quattro abilità del kit di partenza.
##
## Non 67: quattro. Una per verbo — colpisci, anticipa, alza, respira — perché
## quattro verbi distinti si imparano in un match e 67 no. Il pool cresce DOPO
## che questi quattro sono divertenti, non prima.
static func starter_kit() -> Array[AbilityDef]:
	return [
		# Il colpo di base a distanza: istantaneo, chiede mira, danno medio.
		AbilityDef.new("lance", "Lance", Shape.BEAM, DMG.medium, CD.fast, CAST.instant, RANGE.mid),
		# Il pesante: fa male, ma ti scopre per mezzo secondo prima di partire.
		AbilityDef.new("breach", "Breach", Shape.BOLT, DMG.heavy, CD.slow, CAST.long, RANGE.far),
		# Il lancio: poco danno, ma li stacca da terra — apre la finestra.
		AbilityDef.new("upheaval", "Upheaval", Shape.BURST, DMG.light, CD.normal, CAST.short, RANGE.melee, true),
		# La risposta ravvicinata: rapida, corta, per chi ti è addosso.
		AbilityDef.new("riposte", "Riposte", Shape.BEAM, DMG.light, CD.fast, CAST.instant, RANGE.melee),
	]


## TTK teorico del kit contro un bersaglio fermo, arma base inclusa.
##
## Non è una stima: è la somma dei DPS sostenuti. Serve a verificare che la scala
## regga PRIMA di giocarci, e a beccare subito una modifica che la rompe.
static func kit_ttk(kit: Array[AbilityDef], weapon_dps: float) -> float:
	var total := weapon_dps
	for a in kit:
		total += a.dps()
	return HP_MAX / total if total > 0.0 else INF
