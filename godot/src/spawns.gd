## Dove si nasce. **L'unico posto nel codice che lo decide.**
##
## Nel progetto precedente il punto di comparsa era calcolato in tre file
## diversi e l'ultimo sovrascriveva gli altri: tutti nascevano sovrapposti nello
## stesso punto. Non era un bug difficile — era un bug impossibile da vedere
## leggendo un file solo. Da qui in avanti chi vuole sapere dove si nasce ha un
## file solo da aprire.
class_name Spawns

## Otto punti su un cerchio, come gli otto giocatori massimi.
const COUNT := 8
const RADIUS_M := 20.0
## L'altezza a cui si materializza il centro della capsula (alta 1,8).
const HEIGHT_M := 0.9


static func point(index: int) -> Vector3:
	var ang := float(index % COUNT) * TAU / float(COUNT)
	return Vector3(sin(ang) * RADIUS_M, HEIGHT_M, cos(ang) * RADIUS_M)


static func all() -> Array:
	var out := []
	for i in COUNT:
		out.append(point(i))
	return out


## Il punto più lontano da chiunque sia già in campo.
##
## Rinascere sotto tiro è la cosa che fa chiudere la scheda del browser, e non è
## una questione di equilibrio: è la differenza fra "ho perso" e "non mi hanno
## fatto giocare". Scegliere il più lontano costa otto confronti e li evita.
static func farthest_from(occupied: Array) -> Vector3:
	if occupied.is_empty():
		return point(0)
	var best := point(0)
	var best_gap := -1.0
	for i in COUNT:
		var p := point(i)
		var gap := INF
		for o in occupied:
			gap = minf(gap, p.distance_to(o))
		if gap > best_gap:
			best_gap = gap
			best = p
	return best
