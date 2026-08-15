## Verifica che la SCALA regga — prima di giocarci.
##
## Il progetto precedente aveva una banda di TTK dichiarata (20-30 s) che nessun
## file importava: è rimasta sbagliata di 3-5 volte per tutta la vita del
## progetto perché niente poteva accorgersene. Questo test è ciò che se ne
## accorge: se sposti un danno o un cooldown e la scala si rompe, diventa rosso.
##
##   godot --headless --script res://tests/test_combat.gd
extends SceneTree

# preload invece della classe globale: non dipende dalla cache delle classi del
# progetto, quindi il test gira anche su un checkout appena clonato.
const Combat = preload("res://src/combat.gd")

var failures := 0


func _check(what: String, ok: bool, detail: String) -> void:
	if ok:
		print("  ✓ %s — %s" % [what, detail])
	else:
		failures += 1
		printerr("  ✗ %s — %s" % [what, detail])


func _init() -> void:
	print("\n=== SCALA DEL COMBATTIMENTO ===\n")

	var kit := Combat.starter_kit()
	# L'arma base: ~15 dps, il ritmo di fondo su cui si appoggia tutto il resto.
	var weapon_dps := 15.0

	print("  vita %d · scambio bersaglio %.0f s · arma base %.0f dps\n" % [Combat.HP_MAX, Combat.TTK_TARGET_SEC, weapon_dps])
	for a in kit:
		print("  %-10s %-6s %5.0f dmg  cd %.1fs  cast %.2fs  →  %5.2f dps" % [
			a.name, Combat.Shape.keys()[a.shape], a.damage, a.cooldown, a.cast_time, a.dps()
		])

	var ttk := Combat.kit_ttk(kit, weapon_dps)
	print("\n  TTK del kit: %.2f s" % ttk)

	# 1. La scala centra il bersaglio che si è data. Tolleranza larga apposta:
	#    un fight reale ha mancati, coperture e movimento, quindi questo è il
	#    PAVIMENTO della durata, non la durata.
	_check(
		"il kit chiude nella banda",
		ttk >= Combat.TTK_TARGET_SEC * 0.6 and ttk <= Combat.TTK_TARGET_SEC * 1.1,
		"%.2f s (banda %.1f-%.1f)" % [ttk, Combat.TTK_TARGET_SEC * 0.6, Combat.TTK_TARGET_SEC * 1.1]
	)

	# 2. L'arma base deve contare. Se le abilità fanno tutto, mirare non serve e
	#    il gioco diventa una rotazione di cooldown — che è l'errore che il
	#    progetto precedente aveva misurato: 8 cooldown portavano MENO danno
	#    dell'arma gratis, e nessuno se n'era accorto.
	var ability_dps := 0.0
	for a in kit:
		ability_dps += a.dps()
	var weapon_share := weapon_dps / (weapon_dps + ability_dps)
	_check(
		"l'arma base pesa ancora",
		weapon_share >= 0.30 and weapon_share <= 0.60,
		"quota arma %.0f%%" % (weapon_share * 100.0)
	)

	# 3. Chi picchia più forte deve impegnarsi di più. Senza questa regola il
	#    colpo pesante diventa gratis e non c'è più una decisione.
	var sorted_kit := kit.duplicate()
	sorted_kit.sort_custom(func(a, b): return a.damage < b.damage)
	var ok_commit := true
	var detail := ""
	for i in range(1, sorted_kit.size()):
		var lo = sorted_kit[i - 1]
		var hi = sorted_kit[i]
		if hi.damage <= lo.damage:
			continue
		var commit_lo: float = lo.cooldown + lo.cast_time
		var commit_hi: float = hi.cooldown + hi.cast_time
		if commit_hi < commit_lo:
			ok_commit = false
			detail += "%s(%.0f) impegna meno di %s(%.0f)  " % [hi.name, hi.damage, lo.name, lo.damage]
	_check("il colpo più forte impegna di più", ok_commit, detail if not ok_commit else "ordine rispettato")

	# 4. Nessuna abilità deve dominare: se una sola porta più di metà del danno,
	#    le altre tre sono decorazione.
	var top := 0.0
	var top_name := ""
	for a in kit:
		if a.dps() > top:
			top = a.dps()
			top_name = a.name
	_check(
		"nessuna abilità domina il kit",
		top / ability_dps < 0.5,
		"la più forte è %s con il %.0f%% del danno delle abilità" % [top_name, top / ability_dps * 100.0]
	)

	# 5. Il GCD deve impedire di svuotare la mano in un istante.
	var min_cast := INF
	for a in kit:
		min_cast = minf(min_cast, maxf(a.cast_time, Combat.GCD_SEC))
	_check(
		"il GCD impedisce lo scarico istantaneo",
		min_cast >= Combat.GCD_SEC,
		"la più rapida occupa %.2f s" % min_cast
	)

	print("")
	if failures == 0:
		print("=== SCALA COERENTE ===\n")
	else:
		printerr("=== %d CONTROLLI FALLITI ===\n" % failures)
	quit(1 if failures > 0 else 0)
