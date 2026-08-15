## Risolve un lancio: dalla pressione del tasto al danno sul bersaglio.
##
## LA REGOLA, ed è una sola: **la forma che si disegna è la forma che colpisce.**
## Il raggio del fascio usato per il test di collisione è lo stesso che il
## viewmodel e il VFX mostrano. Nel progetto precedente la geometria del colpo
## viveva come aritmetica inline dentro il codice del server, in tre posti
## diversi, e nessuno poteva disegnarla — per questo 46 abilità su 53 non
## mostravano niente e lanciare era un atto di fede.
##
## Le tre forme non sono decorazione: ognuna chiede al giocatore una cosa
## diversa. BEAM chiede mira ferma, BOLT chiede anticipo, BURST chiede
## posizionamento. È da lì che nascono gli stili di gioco diversi, non dai numeri.
class_name AbilityRuntime

const Combat := preload("res://src/combat.gd")

## Cosa è successo a un lancio. Ritornato invece che applicato direttamente, così
## la risoluzione è testabile headless e il server potrà usarla identica.
class CastResult:
	var hits: Array[Node3D] = []
	var damage_each: float = 0.0
	var launched: bool = false
	var origin: Vector3
	var direction: Vector3
	var end_point: Vector3  ## dove la forma finisce: è ciò che il VFX deve disegnare


## Risolve un lancio istantaneo (BEAM, BURST) contro il mondo fisico.
##
## BOLT non passa da qui: è un proiettile che vive nel tempo, quindi lo spawna
## il chiamante e chiama `resolve_bolt_impact` quando tocca.
static func resolve_instant(
	space: PhysicsDirectSpaceState3D,
	ability,
	origin: Vector3,
	direction: Vector3,
	exclude: Array[RID] = []
) -> CastResult:
	var r := CastResult.new()
	r.damage_each = ability.damage
	r.launched = ability.launches
	r.origin = origin
	r.direction = direction
	r.end_point = origin + direction * ability.range_m

	match ability.shape:
		Combat.Shape.BEAM:
			# Un cilindro, non un raggio infinitamente sottile: BEAM_RADIUS è
			# l'unica tolleranza di mira del gioco, ed è larga quanto un corpo.
			# Un solo numero, tarabile guardandolo, invece di una formula che
			# cresce con la distanza.
			#
			# Il fascio si campiona a PASSI lungo la traiettoria, non con un
			# `cast_motion`: quello restituisce solo il PRIMO ostacolo, quindi
			# senza un muro davanti la sfera arrivava a fondo corsa e il test di
			# sovrapposizione avveniva 8 metri oltre il bersaglio. Colpiva il
			# vuoto e mancava tutto. A passi, il volume campionato È il cilindro
			# che il VFX disegna — che è poi la regola di questo file.
			var wall := PhysicsRayQueryParameters3D.create(origin, origin + direction * ability.range_m)
			wall.exclude = exclude
			var blocked := space.intersect_ray(wall)
			var reach: float = ability.range_m
			if blocked and blocked.has("position"):
				var n_wall := blocked.get("collider") as Node3D
				# Un corpo colpibile non ferma il fascio: lo fermano le pareti.
				if n_wall == null or not n_wall.has_method("take_damage"):
					reach = minf(reach, (blocked["position"] as Vector3).distance_to(origin))
			r.end_point = origin + direction * reach

			var shape := SphereShape3D.new()
			shape.radius = Combat.BEAM_RADIUS
			var q := PhysicsShapeQueryParameters3D.new()
			q.shape = shape
			q.exclude = exclude
			q.collide_with_areas = true
			var stride: float = Combat.BEAM_RADIUS * 1.6
			var seen := {}
			var travelled := 0.0
			while travelled <= reach:
				q.transform = Transform3D(Basis(), origin + direction * travelled)
				for c in space.intersect_shape(q, 8):
					var n := c.get("collider") as Node3D
					if n and n.has_method("take_damage") and not seen.has(n.get_instance_id()):
						seen[n.get_instance_id()] = true
						r.hits.append(n)
				travelled += stride

		Combat.Shape.BURST:
			# Centrata su chi lancia: chiede di essere nel posto giusto, non di
			# mirare. È il verbo del corpo a corpo.
			var sphere := SphereShape3D.new()
			sphere.radius = Combat.BURST_RADIUS
			var q2 := PhysicsShapeQueryParameters3D.new()
			q2.shape = sphere
			q2.transform = Transform3D(Basis(), origin)
			q2.exclude = exclude
			q2.collide_with_areas = true
			r.end_point = origin
			for c in space.intersect_shape(q2, 16):
				var n2 := c.get("collider") as Node3D
				if n2 and n2.has_method("take_damage"):
					r.hits.append(n2)

		Combat.Shape.BOLT:
			# Il proiettile lo gestisce il chiamante; qui si restituisce solo la
			# traiettoria da disegnare.
			pass

	return r


## Applica il risultato. Separato dalla risoluzione di proposito: il server
## deciderà, il client predirà, e useranno la stessa funzione sopra.
static func apply(result: CastResult) -> int:
	var applied := 0
	for h in result.hits:
		if not is_instance_valid(h):
			continue
		h.take_damage(result.damage_each)
		if result.launched and h.has_method("launch"):
			h.launch()
		applied += 1
	return applied


## Stato dei cooldown di una mano. Tenuto fuori dal nodo giocatore così è
## testabile e, più avanti, replicabile.
class Cooldowns:
	var _ready_at: Dictionary = {}
	var _gcd_ready_at: float = 0.0

	func can_cast(id: String, now: float) -> bool:
		if now < _gcd_ready_at:
			return false
		return now >= float(_ready_at.get(id, 0.0))

	func start(id: String, cooldown: float, cast_time: float, now: float) -> void:
		_ready_at[id] = now + cooldown
		# Il GCD è il pavimento: anche un'abilità istantanea occupa la mano.
		_gcd_ready_at = now + maxf(cast_time, Combat.GCD_SEC)

	func remaining(id: String, now: float) -> float:
		return maxf(0.0, float(_ready_at.get(id, 0.0)) - now)
