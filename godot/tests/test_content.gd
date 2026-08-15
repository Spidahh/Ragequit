## Verifica il CONTENUTO: 67 abilità, 4 classi, 12 sottoclassi, letti dai dati.
##
## Questo test esiste per una ragione precisa: nel progetto precedente i numeri
## di bilanciamento vivevano nei documenti e non in un `import`, e sono rimasti
## sbagliati per tutta la vita del progetto perché niente poteva accorgersene.
## Da qui in avanti il dato è la fonte, e quando il dato è incoerente questo
## diventa rosso.
##
##   godot --headless --script res://tests/test_content.gd
extends SceneTree

const Content = preload("res://src/content.gd")

var failures := 0


func _check(what: String, ok: bool, detail: String) -> void:
	if ok:
		print("  ✓ %s — %s" % [what, detail])
	else:
		failures += 1
		printerr("  ✗ %s — %s" % [what, detail])


func _init() -> void:
	print("\n=== IL CONTENUTO ===\n")

	var abilities := Content.all_abilities()
	var classes := Content.classes()

	_check("le abilità ci sono tutte", abilities.size() == 67, "%d abilità" % abilities.size())
	_check("le classi sono quattro", classes.size() == 4, "%d classi" % classes.size())

	var subs := 0
	for c in classes:
		subs += c.get("subclasses", []).size()
	_check("le sottoclassi sono dodici", subs == 12, "%d sottoclassi" % subs)

	_ogni_abilita_e_eseguibile(abilities)
	_ogni_classe_e_giocabile(classes)
	_le_recovery_non_si_scambiano(classes)
	_le_sottoclassi_sono_baratti(classes)
	_i_numeri_arrivano_fino_in_fondo()

	print("")
	if failures == 0:
		print("Tutto verde.\n")
		quit(0)
	else:
		printerr("%d rosso/i.\n" % failures)
		quit(1)


func _ogni_abilita_e_eseguibile(abilities: Dictionary) -> void:
	print("\nOgni abilità sa cosa fare")
	var senza_nome := []
	var senza_effetto := []
	var senza_difetto := []
	var bolt_fermi := []
	for id in abilities:
		var a: Dictionary = abilities[id]
		if String(a["name"]).is_empty():
			senza_nome.append(id)
		# Un'abilità che non fa danno, non cura, non sbalza e non applica niente
		# è un tasto che non fa niente.
		if (
			a["damage"] <= 0.0
			and a["heal"] <= 0.0
			and a["airtime"] <= 0.0
			and a["effects"].is_empty()
		):
			senza_effetto.append(id)
		# Il difetto scritto non è modestia: è come il giocatore capisce contro
		# cosa sta scegliendo un'abilità.
		if String(a["mini_malus"]).is_empty():
			senza_difetto.append(id)
		if a["shape"] == Content.Shape.BOLT and a["bolt_speed"] <= 0.0:
			bolt_fermi.append(id)
	_check("hanno tutte un nome", senza_nome.is_empty(), "senza nome: %s" % str(senza_nome))
	_check("fanno tutte qualcosa", senza_effetto.is_empty(), "inerti: %s" % str(senza_effetto))
	_check("dichiarano tutte il loro difetto", senza_difetto.is_empty(), "senza difetto: %s" % str(senza_difetto))
	_check("i proiettili viaggiano", bolt_fermi.is_empty(), "fermi: %s" % str(bolt_fermi))

	# Le forme si distribuiscono: se fossero tutte della stessa, gli stili di
	# gioco che nascono dalle forme non esisterebbero.
	var per_forma := {}
	for id in abilities:
		var k: int = abilities[id]["shape"]
		per_forma[k] = int(per_forma.get(k, 0)) + 1
	var righe := []
	for k in per_forma:
		righe.append("%s %d" % [Content.Shape.keys()[k], per_forma[k]])
	_check("tutte e cinque le forme sono usate", per_forma.size() == 5, " · ".join(righe))


func _ogni_classe_e_giocabile(classes: Array) -> void:
	print("\nOgni classe si può giocare senza aprire una schermata")
	for c in classes:
		var id := String(c["id"])
		var preset := Content.preset_kit(id)
		var pool := Content.pool(id)
		_check(
			"%s ha otto abilità pronte" % String(c["label"]),
			preset.size() == 8,
			"%d nel preset, %d nel pool" % [preset.size(), pool.size()]
		)
		# Un preset che contiene qualcosa fuori dal pool è un preset illegale:
		# il giocatore lo userebbe e poi non riuscirebbe a ricostruirlo.
		var pool_ids := []
		for a in pool:
			pool_ids.append(a["id"])
		var fuori := []
		for a in preset:
			if not pool_ids.has(a["id"]):
				fuori.append(a["id"])
		_check("  e sono tutte sue", fuori.is_empty(), "fuori pool: %s" % str(fuori))

		# Il pool deve essere più grande del kit, o non c'è niente da scegliere.
		_check("  e c'è da scegliere", pool.size() >= 16, "%d abilità legali" % pool.size())


func _le_recovery_non_si_scambiano(classes: Array) -> void:
	print("\nOgni classe si rimette in piedi a modo suo")
	var recoveries := {}
	for c in classes:
		var rec := String(c.get("recovery", ""))
		_check("%s ha la sua cura" % String(c["label"]), not rec.is_empty(), rec)
		recoveries[rec] = String(c["id"])
	_check("sono quattro cure diverse", recoveries.size() == 4, str(recoveries.keys()))

	# E nessuna finisce nel pool di un'altra: è il modo più economico che il
	# gioco ha di dire che quattro classi sono quattro cose diverse.
	var sconfinamenti := []
	for c in classes:
		for a in Content.pool(String(c["id"])):
			var owner: String = recoveries.get(a["id"], "")
			if owner != "" and owner != String(c["id"]):
				sconfinamenti.append("%s in %s" % [a["id"], c["id"]])
	_check("e nessuna sconfina", sconfinamenti.is_empty(), str(sconfinamenti))


func _le_sottoclassi_sono_baratti(classes: Array) -> void:
	print("\nOgni sottoclasse guadagna qualcosa e paga qualcosa")
	var gratis := []
	var senza_vantaggi := []
	var toccano_il_danno := []
	for c in classes:
		for s in c.get("subclasses", []):
			var mults := [
				float(s.get("max_hp_mult", 1.0)),
				float(s.get("move_speed_mult", 1.0)),
				float(s.get("knockup_airtime_mult", 1.0)),
				# Sul cooldown "meglio" vuol dire più basso: si gira per
				# confrontarlo con gli altri sulla stessa scala.
				2.0 - float(s.get("cooldown_mult", 1.0)),
			]
			var meglio := false
			var peggio := false
			for m in mults:
				if m > 1.001:
					meglio = true
				if m < 0.999:
					peggio = true
			if meglio and not peggio:
				gratis.append(String(s["name"]))
			if peggio and not meglio:
				senza_vantaggi.append(String(s["name"]))
			if s.has("damage_mult") and not is_equal_approx(float(s["damage_mult"]), 1.0):
				toccano_il_danno.append(String(s["name"]))
	_check("nessuna è gratis", gratis.is_empty(), "solo vantaggi: %s" % str(gratis))
	_check("nessuna è solo una punizione", senza_vantaggi.is_empty(), "solo svantaggi: %s" % str(senza_vantaggi))
	# Una sottoclasse che tocca il danno cambia quanto dura un fight, non come si
	# gioca — e allora non è più una scelta di stile, è una scelta di potenza.
	_check("nessuna tocca il danno", toccano_il_danno.is_empty(), str(toccano_il_danno))


func _i_numeri_arrivano_fino_in_fondo() -> void:
	print("\nI numeri della sottoclasse arrivano davvero all'abilità")
	var st_anvil := Content.stats("breaker", "breaker_anvil")
	var st_ram := Content.stats("breaker", "breaker_ram")
	var uppercut := Content.ability("uppercut")

	_check(
		"ANVIL tiene in aria più a lungo",
		Content.airtime_for(uppercut, st_anvil) > Content.airtime_for(uppercut, st_ram),
		(
			"%.2f s contro %.2f s"
			% [Content.airtime_for(uppercut, st_anvil), Content.airtime_for(uppercut, st_ram)]
		)
	)
	_check(
		"e lo paga in ricarica",
		Content.cooldown_for(uppercut, st_anvil) > Content.cooldown_for(uppercut, st_ram),
		(
			"%.2f s contro %.2f s"
			% [Content.cooldown_for(uppercut, st_anvil), Content.cooldown_for(uppercut, st_ram)]
		)
	)
	_check(
		"RAM è più veloce e più fragile",
		(
			float(st_ram["move_speed_mult"]) > float(st_anvil["move_speed_mult"])
			and float(st_ram["max_hp"]) < float(st_anvil["max_hp"])
		),
		"%.0f vita contro %.0f" % [st_ram["max_hp"], st_anvil["max_hp"]]
	)

	# Il BREAKER è il corpo più pesante, il TALON il più leggero: è l'asse su cui
	# le quattro classi si distinguono prima ancora del kit.
	var breaker := Content.stats("breaker", "")
	var talon := Content.stats("talon", "")
	_check(
		"il BREAKER regge più del TALON",
		float(breaker["max_hp"]) > float(talon["max_hp"]),
		"%.0f contro %.0f" % [breaker["max_hp"], talon["max_hp"]]
	)
