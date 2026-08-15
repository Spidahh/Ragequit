## Cosa succede quando un'abilità arriva a bersaglio.
##
## PERCHE' STA IN UN FILE SOLO. Un'abilità non è "una funzione che genera un
## proiettile": è una lista di effetti che possono fare danno, mettere uno stato,
## staccare da terra, curare, rubare vita o svuotare una risorsa — spesso più
## d'uno insieme. Se ogni tipo di effetto venisse applicato dal punto del codice
## che lo lancia, la stessa `applyStatus` esisterebbe in cinque posti con cinque
## comportamenti leggermente diversi. Qui c'è un solo punto che sa cosa vuol dire
## "applicare".
##
## L'ORDINE CONTA, e non è alfabetico:
##   1. **lo sbalzo prima del danno.** Se il danno uccide, chi è morto non vola
##      più, e il colpo che doveva aprire una finestra la chiude;
##   2. **lo scudo prima della vita.** Chi ha uno scudo addosso deve vederselo
##      consumare, non vedere la vita scendere e lo scudo restare pieno;
##   3. **il furto di vita dopo il danno**, e sul danno REALMENTE inflitto: su
##      un bersaglio quasi morto ruba poco, che è come deve essere.
extends RefCounted

const Status := preload("res://src/status.gd")
const Content := preload("res://src/content.gd")


## Applica un'abilità a chi ha colpito. Restituisce quanto danno ha fatto in
## tutto — è il numero che serve al kill feed, alle statistiche e ai test.
static func apply(
	ability: Dictionary, caster: Node, targets: Array, stats: Dictionary
) -> float:
	var total := 0.0
	var out_mult := 1.0
	var caster_status = _status_of(caster)
	if caster_status:
		out_mult = caster_status.outgoing_damage_multiplier()

	for e in ability.get("effects", []):
		var kind := String(e.get("kind", ""))
		match kind:
			"knockup":
				var air := float(e.get("airborneSec", 0.0)) * float(stats.get("knockup_mult", 1.0))
				for t in targets:
					_launch(t, air)
			"damage":
				var amount := float(e.get("amount", 0.0)) * out_mult
				for t in targets:
					total += _damage(t, amount)
			"projectile":
				# Il carico di un proiettile si applica QUI, all'impatto, e non
				# dentro il proiettile: `Blast Arrow` fa danno, incendia e spinge,
				# e sono le stesse tre cose che fa un'abilità istantanea. Due
				# implementazioni sarebbero due comportamenti che divergono.
				var pdmg := float(e.get("damage", 0.0)) * out_mult
				for t in targets:
					total += _damage(t, pdmg)
				if e.has("onHitStatus"):
					for t in targets:
						_apply_status(t, e["onHitStatus"])
			"applyStatus":
				for t in targets:
					_apply_status(t, e)
			"heal":
				_heal(caster, float(e.get("amount", 0.0)))
			"restoreStamina":
				_restore(caster, "stamina", float(e.get("amount", 0.0)))
			"cleanse":
				if caster_status:
					caster_status.cleanse()
			"lifesteal":
				# `fraction` è sul danno di QUESTA abilità, già inflitto.
				_heal(caster, total * float(e.get("fraction", 0.0)))
			"resourceDrain":
				var res := String(e.get("resource", "mana"))
				var amount2 := float(e.get("amount", 0.0))
				for t in targets:
					_restore(t, res, -amount2)
				_restore(caster, res, amount2 * float(e.get("gainFraction", 0.0)))
			_:
				# projectile, zone, channel e move non si applicano qui: hanno un
				# corpo nel mondo che li porta, e arriveranno a bersaglio dopo.
				pass

	# Il furto di vita dichiarato sul proiettile invece che come effetto a sé.
	for e in ability.get("effects", []):
		if e.has("lifestealFraction"):
			_heal(caster, total * float(e["lifestealFraction"]))
	return total


static func _status_of(node: Node):
	if node and is_instance_valid(node) and "status" in node:
		return node.get("status")
	return null


static func _damage(target: Node, amount: float) -> float:
	if amount <= 0.0 or not is_instance_valid(target):
		return 0.0
	var st = _status_of(target)
	var passed := amount
	if st:
		passed = st.absorb(amount)
	if passed <= 0.0:
		return 0.0
	if target.has_method("take_damage"):
		target.take_damage(passed)
	return passed


static func _apply_status(target: Node, e: Dictionary) -> void:
	var st = _status_of(target)
	if st == null:
		return
	# La forza di un rallentamento sta in un campo suo; per gli altri stati non
	# esiste, e zero significa "quanto dice la regola dello stato".
	var power := float(e.get("slowFraction", 0.0))
	st.apply(
		String(e.get("status", "")),
		float(e.get("durationSec", 0.0)),
		int(e.get("stacks", 1)),
		power
	)


static func _launch(target: Node, airtime: float) -> void:
	if airtime <= 0.0 or not is_instance_valid(target):
		return
	if target.has_method("launch"):
		# Chi sa quanto deve restare per aria lo dice; chi non lo sa usa il suo
		# valore di sempre. Nessuno resta a terra per una firma sbagliata.
		if target.launch.get_argument_count() > 0:
			target.launch(airtime)
		else:
			target.launch()


static func _heal(node: Node, amount: float) -> void:
	if amount <= 0.0 or not is_instance_valid(node):
		return
	if node.has_method("heal"):
		node.heal(amount)


static func _restore(node: Node, resource: String, amount: float) -> void:
	if not is_instance_valid(node) or is_zero_approx(amount):
		return
	if node.has_method("restore"):
		node.restore(resource, amount)


## L'altezza dello sbalzo per una durata in aria voluta.
##
## Non è un numero magico: è la fisica del gioco. Con gravità `g`, un corpo
## lanciato a `v` ricade dopo `2v/g` secondi — quindi per restare per aria `t`
## serve `v = g·t/2`. Scriverlo come costante significherebbe che il giorno in
## cui la gravità cambia, tutti gli sbalzi durano un'altra cosa in silenzio.
static func launch_speed(airtime_sec: float, gravity: float) -> float:
	return gravity * airtime_sec * 0.5
