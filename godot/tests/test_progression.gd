## Verifica che la progressione apra il gioco senza sbilanciarlo.
##
## È il sistema che è facilissimo sbagliare in una direzione sola: sbloccare
## POTENZA invece che VARIETÀ. Un PvP gratis in cui chi ha giocato di più colpisce
## più forte non è un gioco competitivo, è un abbonamento pagato in ore.
##
##   godot --headless --script res://tests/test_progression.gd
extends SceneTree

const Progression = preload("res://src/progression.gd")
const Content = preload("res://src/content.gd")

var failures := 0


func _check(what: String, ok: bool, detail: String) -> void:
	if ok:
		print("  ✓ %s — %s" % [what, detail])
	else:
		failures += 1
		printerr("  ✗ %s — %s" % [what, detail])


func _init() -> void:
	print("\n=== LA PROGRESSIONE ===\n")
	DirAccess.remove_absolute(ProjectSettings.globalize_path(Progression.PATH))

	_il_kit_di_partenza_e_completo()
	_gli_obiettivi_sono_azioni()
	_si_sblocca_giocando()
	_il_livello_sale_anche_perdendo()
	_quello_che_manca_si_vede()

	print("")
	if failures == 0:
		print("Tutto verde.\n")
		quit(0)
	else:
		printerr("%d rosso/i.\n" % failures)
		quit(1)


func _il_kit_di_partenza_e_completo() -> void:
	print("Si parte con un kit competitivo, non con una versione ridotta")
	var p := Progression.new()
	var bloccate := []
	for c in Content.classes():
		for id in c.get("preset", []):
			if not p.is_unlocked(String(id)):
				bloccate.append("%s/%s" % [c["id"], id])
	_check(
		"nessun preset contiene roba bloccata",
		bloccate.is_empty(),
		"bloccate nei preset: %s" % str(bloccate)
	)

	# E quello che si sblocca deve esistere davvero: un obiettivo che punta a
	# un'abilità cancellata è un obiettivo che non si completa mai.
	var fantasmi := []
	for id in Progression.UNLOCKS:
		if Content.ability(id).is_empty():
			fantasmi.append(id)
	_check("gli sblocchi puntano ad abilità vere", fantasmi.is_empty(), "inesistenti: %s" % str(fantasmi))

	# E devono essere una minoranza: se metà del gioco è chiusa, il gioco che si
	# scarica non è quello che è stato progettato.
	var totale := Content.all_abilities().size()
	_check(
		"e sono una minoranza del contenuto",
		Progression.UNLOCKS.size() * 4 < totale,
		"%d bloccate su %d abilità" % [Progression.UNLOCKS.size(), totale]
	)


func _gli_obiettivi_sono_azioni() -> void:
	print("\nOgni obiettivo si legge e si sa cosa fare")
	var vaghi := []
	for id in Progression.UNLOCKS:
		var u: Dictionary = Progression.UNLOCKS[id]
		var label := String(u["label"])
		# Un obiettivo che non dice un numero non dice quanto manca, e uno che non
		# comincia con un verbo è una condizione, non una cosa da fare.
		if label.length() < 12 or not label.contains(str(int(u["goal"]))):
			vaghi.append(id)
	_check("dicono cosa fare e quanto", vaghi.is_empty(), "vaghi: %s" % str(vaghi))

	# Nessuno chiede di aspettare: "gioca N partite" non insegna niente.
	var attese := []
	for id in Progression.UNLOCKS:
		if String(Progression.UNLOCKS[id]["stat"]).contains("matches"):
			attese.append(id)
	_check("e nessuno chiede solo di aspettare", attese.is_empty(), str(attese))


func _si_sblocca_giocando() -> void:
	print("\nSi sblocca facendo la cosa che l'abilità poi fa")
	var p := Progression.new()
	_check("all'inizio è chiusa", not p.is_unlocked("root_upthrow"), "Root Upthrow chiusa")

	var goal := int(Progression.UNLOCKS["root_upthrow"]["goal"])
	for i in goal - 1:
		p.record("air_hits")
	_check("a un colpo dalla fine è ancora chiusa", not p.is_unlocked("root_upthrow"), "%d/%d" % [goal - 1, goal])

	var fresh := p.record("air_hits")
	_check("l'ultimo la apre", p.is_unlocked("root_upthrow"), "%d/%d" % [goal, goal])
	_check("e lo dice a chi chiama", fresh.has("root_upthrow"), "sbloccate: %s" % str(fresh))

	# E non si richiude, e non si sblocca due volte.
	var ancora := p.record("air_hits")
	_check("non si sblocca due volte", ancora.is_empty(), "nessun doppione")

	# E resta sbloccata dopo aver chiuso il gioco.
	var ripreso := Progression.new()
	_check("e resta dopo aver chiuso", ripreso.is_unlocked("root_upthrow"), "salvata su disco")


func _il_livello_sale_anche_perdendo() -> void:
	print("\nIl livello sale con le partite, non con le vittorie")
	DirAccess.remove_absolute(ProjectSettings.globalize_path(Progression.PATH))
	var p := Progression.new()
	var start := p.level()
	for i in Progression.MATCHES_PER_LEVEL:
		p.finish_match(false)  # perse tutte
	_check("perdendo si sale lo stesso", p.level() > start, "livello %d → %d" % [start, p.level()])
	_check(
		"e la barra dice a che punto sei",
		p.level_fraction() >= 0.0 and p.level_fraction() < 1.0,
		"%.0f%% verso il prossimo" % (p.level_fraction() * 100.0)
	)


func _quello_che_manca_si_vede() -> void:
	print("\nQuello che non hai lo vedi, con scritto come si prende")
	var p := Progression.new()
	var text := p.progress_text("piercing_shot")
	_check("c'è una riga da leggere", text.length() > 10, text)
	_check("e dice a che punto sei", text.contains("/"), text)
	_check("le abilità senza obiettivo sono libere", p.is_unlocked("cleave"), "Cleave disponibile da subito")
