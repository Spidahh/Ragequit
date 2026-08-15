## Verifica gli STATI: veleni, rallentamenti, controllo, scudi.
##
## Gli stati sono la categoria di bug che non dà errori: un rallentamento che non
## scade produce un giocatore che non capisce perché è lento, e uno stordimento
## che dura troppo produce qualcuno che guarda lo schermo mentre muore. Nessuna
## delle due cose stampa niente in console.
##
##   godot --headless --script res://tests/test_status.gd
extends SceneTree

const Status = preload("res://src/status.gd")

var failures := 0


func _check(what: String, ok: bool, detail: String) -> void:
	if ok:
		print("  ✓ %s — %s" % [what, detail])
	else:
		failures += 1
		printerr("  ✗ %s — %s" % [what, detail])


func _init() -> void:
	print("\n=== GLI STATI ===\n")

	_scadono()
	_i_veleni_pulsano()
	_il_gelo_si_accumula()
	_il_controllo_e_graduato()
	_lo_scudo_assorbe_e_finisce()
	_il_cleanse_toglie_i_malus_non_i_bonus()
	_niente_si_somma_all_infinito()

	print("")
	if failures == 0:
		print("Tutto verde.\n")
		quit(0)
	else:
		printerr("%d rosso/i.\n" % failures)
		quit(1)


func _scadono() -> void:
	print("Tutto scade")
	var s := Status.new()
	s.apply("slow", 2.0, 1, 0.45)
	_check("addosso subito", s.has("slow"), "rallentato")
	s.tick(1.0)
	_check("ancora addosso a metà", s.has("slow"), "a 1 s c'è ancora")
	s.tick(1.1)
	_check("via a scadenza", not s.has("slow"), "a 2,1 s è finito")


func _i_veleni_pulsano() -> void:
	print("\nI veleni fanno danno nel tempo, e gli strati contano")
	var uno := Status.new()
	uno.apply("burn", 3.0, 1)
	var due := Status.new()
	due.apply("burn", 3.0, 3)  # come fa `Ignite`: tre strati in una volta

	var d1 := uno.tick(1.0)
	var d3 := due.tick(1.0)
	_check("uno strato brucia", d1 > 0.0, "%.1f danno al secondo" % d1)
	_check("tre strati bruciano tre volte tanto", is_equal_approx(d3, d1 * 3.0), "%.1f contro %.1f" % [d3, d1])

	# Un veleno finito smette. Sembra ovvio, ed è esattamente il bug che nessuno
	# nota finché qualcuno non muore fermo in un angolo.
	uno.tick(2.2)
	_check("e smettono davvero", is_equal_approx(uno.tick(1.0), 0.0), "0 danno dopo la scadenza")


func _il_gelo_si_accumula() -> void:
	print("\nIl gelo non congela: ci arriva")
	var s := Status.new()
	for i in Status.CHILL_TO_FREEZE - 1:
		s.apply("chill", 6.0)
	_check(
		"tre strati rallentano e basta",
		s.has("chill") and not s.has("freeze") and s.move_multiplier() < 1.0,
		"velocità al %.0f%%" % (s.move_multiplier() * 100.0)
	)
	s.apply("chill", 6.0)
	_check("il quarto congela", s.has("freeze") and not s.has("chill"), "congelato")
	_check("e congelato non ci si muove", is_equal_approx(s.move_multiplier(), 0.0), "velocità 0")


func _il_controllo_e_graduato() -> void:
	print("\nControllo: radicato non è stordito, e non è congelato")
	var root := Status.new()
	root.apply("root", 3.0)
	_check(
		"radicato: fermo ma puoi rispondere",
		not root.can_move() and root.can_cast(),
		"si lancia, non si cammina"
	)

	var stun := Status.new()
	stun.apply("stun", 1.0)
	_check("stordito: non lanci", not stun.can_cast(), "niente cast")

	var freeze := Status.new()
	freeze.apply("freeze", 1.0)
	_check("congelato: né l'uno né l'altro", not freeze.can_cast() and not freeze.can_move(), "fermo del tutto")

	# La durata del controllo duro è il numero più pericoloso del gioco.
	_check(
		"e il congelamento è breve",
		Status.FREEZE_SEC <= 1.5,
		"%.1f s — oltre, si guarda lo schermo mentre si muore" % Status.FREEZE_SEC
	)

	var curse := Status.new()
	curse.apply("curse", 5.0)
	_check(
		"la maledizione toglie danno, non azioni",
		curse.can_cast() and curse.outgoing_damage_multiplier() < 1.0,
		"danno al %.0f%%" % (curse.outgoing_damage_multiplier() * 100.0)
	)


func _lo_scudo_assorbe_e_finisce() -> void:
	print("\nLo scudo assorbe finché ce n'è")
	var s := Status.new()
	s.apply("shield", 8.0, 40)
	var passato := s.absorb(25.0)
	_check("il primo colpo non passa", is_equal_approx(passato, 0.0), "25 assorbiti su 40")
	var passato2 := s.absorb(30.0)
	_check("il secondo passa in parte", is_equal_approx(passato2, 15.0), "15 di 30 arrivano")
	_check("e lo scudo è finito", not s.has("shield"), "consumato")

	var immune := Status.new()
	immune.apply("invulnerable", 0.6)
	_check("l'invulnerabilità annulla tutto", is_equal_approx(immune.absorb(999.0), 0.0), "999 → 0")


func _il_cleanse_toglie_i_malus_non_i_bonus() -> void:
	print("\nIl cleanse toglie quello che ti fanno, non quello che ti sei dato")
	var s := Status.new()
	s.apply("root", 3.0)
	s.apply("burn", 3.0, 2)
	s.apply("slow", 3.0, 1, 0.5)
	s.apply("shield", 5.0, 30)
	s.cleanse()
	_check("i malus spariscono tutti", not s.has("root") and not s.has("burn") and not s.has("slow"), "puliti")
	_check("lo scudo resta", s.has("shield") and s.shield > 0.0, "%.0f di scudo" % s.shield)
	_check("e si torna a velocità piena", is_equal_approx(s.move_multiplier(), 1.0), "100%")


func _niente_si_somma_all_infinito() -> void:
	print("\nLe durate prendono la più lunga, non si sommano")
	var s := Status.new()
	s.apply("slow", 3.0, 1, 0.4)
	s.apply("slow", 1.0, 1, 0.4)
	s.tick(2.0)
	_check("la seconda applicazione non accorcia", s.has("slow"), "a 2 s c'è ancora")
	s.tick(1.2)
	_check("e nemmeno allunga", not s.has("slow"), "a 3,1 s è finito, non a 4")

	# Sei rallentamenti addosso non devono produrre un bersaglio immobile: quello
	# non lo ha deciso nessuno, esce dalla moltiplicazione.
	var tanti := Status.new()
	for i in 6:
		tanti.apply("slow", 4.0, 1, 0.45)
	_check(
		"e sei rallentamenti non ti inchiodano",
		tanti.move_multiplier() >= 0.15,
		"velocità al %.0f%% — un fermo si chiama root e dura poco" % (tanti.move_multiplier() * 100.0)
	)
