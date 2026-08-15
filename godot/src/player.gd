## Il giocatore in prima persona.
##
## La fisica NON è quella del motore: è `Movement.step`, portata dal progetto
## precedente. Godot muove il corpo, ma la velocità la decide la nostra funzione
## deterministica — perché quella stessa funzione dovrà girare sul server
## autoritativo, e due integratori diversi divergono sempre.
##
## Quello che invece si prende dal motore, e che nel progetto Three.js erano
## migliaia di righe scritte a mano: collisione capsula (`move_and_slide`),
## camera, viewmodel su un layer suo che non compenetra i muri, e l'ambiente.
extends CharacterBody3D

const Combat := preload("res://src/combat.gd")
const AbilityRuntime := preload("res://src/ability_runtime.gd")
const BoltScript := preload("res://src/bolt.gd")
const Vfx := preload("res://src/vfx.gd")
const Sfx := preload("res://src/sfx.gd")
# Anche il movimento: `class_name Movement` esiste, ma dipende dalla cache
# delle classi globali, che su un checkout appena clonato non c'è ancora.
const Movement := preload("res://src/movement.gd")
const Content := preload("res://src/content.gd")
const Status := preload("res://src/status.gd")
const Effects := preload("res://src/effects.gd")
const ZoneScript := preload("res://src/zone.gd")
const ViewmodelScript := preload("res://src/viewmodel.gd")
const SettingsScript := preload("res://src/settings.gd")
const BasicWeaponsScript := preload("res://src/basic_weapons.gd")
const AbilityWheelScript := preload("res://src/ability_wheel.gd")

## La sensibilita' di serie, prima del moltiplicatore del giocatore.
const SENSITIVITY_BASE := 0.0012
const MOUSE_SENSITIVITY := 0.0022
const PITCH_LIMIT := deg_to_rad(89.0)
## Otto slot, otto tasti diretti. E/Q restano liberi per le due wheel alternative.
const SLOTS := 8

@onready var _camera: Camera3D = $Camera3D
@onready var _viewmodel: Node3D = $Camera3D/Viewmodel

## Chi sei. Si sceglie prima di entrare; qui c'è il default con cui il gioco si
## apre, così l'arena è giocabile senza passare da nessuna schermata.
@export var class_id := "breaker"
@export var sub_id := "breaker_ram"

## Il kit in mano: otto abilità dal pool della classe.
var _kit: Array = []
var _cooldowns := AbilityRuntime.Cooldowns.new()
var _clock := 0.0
var _cam_kick := 0.0
## Un cast con windup vive davvero nel tempo. Prima il valore `windup` veniva
## usato solo per il GCD, mentre danno e VFX uscivano nello stesso frame.
var _pending_cast: Dictionary = {}
var _release_anim := 0.0
var _basic := BasicWeaponsScript.new()
## Il click che preme PLAY non deve attraversare il cambio scena e diventare
## il primo fendente. L'arma si arma solo dopo aver visto LMB rilasciato.
var _combat_input_armed := false
var _combat_input_release_frames := 0
var _ability_wheel := AbilityWheelScript.new()
var _primed_slot := -1

## I numeri del personaggio: vita, velocità, ricariche, durata degli sbalzi.
## Vengono dai dati, non da costanti qui dentro — un numero che nessun file
## importa è un numero che nessuno può correggere.
var stats: Dictionary = {}
## Cosa hai addosso: veleni, rallentamenti, radici, scudi.
var status := Status.new()

var mana := 100.0
var stamina := 150.0

## Vita del giocatore. Sta qui e non in un componente separato finche non serve:
## un sistema in piu senza un secondo utente e complessita comprata a credito.
var hp: float = Combat.HP_MAX
## A terra, in attesa che le regole dicano quando si torna. Un morto non spara
## e non incassa: senza questo, i tre secondi di attesa sono tre secondi in cui
## il cadavere continua a far salire il punteggio di chi lo ha ucciso.
var dead := false

## LA PARATA.
##
## Tasto destro. Un TAP apre una finestra breve che blocca tutto; TENUTO blocca
## una parte finche' regge la stamina. Sono due gesti diversi sullo stesso tasto
## perche' sono due decisioni diverse: il tap e' una lettura — hai visto arrivare
## quel colpo — e il tenuto e' una rinuncia, perche' mentre pari non attacchi e
## la stamina che consumi e' quella che ti serviva per gli scatti.
##
## E si vede addosso al personaggio: una parata invisibile e' una meccanica che
## esiste solo per chi la usa, e chi ci sta davanti non impara mai a leggerla.
const PARRY_WINDOW := 0.5
const PARRY_COST := 20.0
const PARRY_COOLDOWN := 3.0
const PARRY_HOLD_FRACTION := 0.7
const PARRY_HOLD_DRAIN := 15.0

## IL BREAK.
##
## Annulla UNA VOLTA il controllo che stai subendo: ti fa cadere da uno sbalzo,
## ti libera da una radice, ti toglie di dosso il gelo. Ce l'hanno tutti, non
## costa uno slot e non si sceglie — e ha una ricarica lunga, quindi usarlo sul
## primo sbalzo significa non averlo sul secondo.
##
## E' UNA DECISIONE, NON UN PULSANTE. Se fosse gratis, lo sbalzo smetterebbe di
## essere una finestra e diventerebbe un fastidio; se non ci fosse, sarebbe una
## condanna. La ricarica lunga e' cio' che lo rende una scelta.
##
## Sta su `Shift` e non su `F` — `F` e' l'ottavo slot di abilita'. `Shift` e'
## il tasto che in ogni altro gioco fa correre, ed e' libero qui proprio perche'
## correre e' gia' la velocita' normale.
const BREAK_COOLDOWN := 18.0

var _break_ready_at := 0.0

var _parry_until := -1.0
var _parry_ready_at := 0.0
var _parry_holding := false

var _weapon := "none"
var _step_t := 0.0
var _was_grounded_sfx := true
var _fall_speed := 0.0

signal died

signal cast_resolved(ability_name: String, hits: int)
signal cast_state_changed(state: String, ability_name: String, weapon: String, duration: float)
signal ability_wheel_changed(page: int, picked: int, items: Array)
signal damaged(amount: float, remaining: float)

## Dove è finito l'ultimo colpo a segno. Serve al contatore combo, che va
## sopra la testa di chi lo sta subendo e non al centro dello schermo.
## Nel poligono le abilita' non hanno ricarica e non si muore: provare non deve
## costare attese, e una prova che ti uccide non e' una prova.
var practice := false
var last_hit_point := Vector3.ZERO
## Il danno dell'ultimo lancio andato a segno.
var last_cast_damage := 0.0
var _sensitivity := MOUSE_SENSITIVITY
var _shake_enabled := true
var _sim: Dictionary
var _yaw := 0.0
var _pitch := 0.0

# Stato del viewmodel: sway sul mouse, bob sulla velocità, dip all'atterraggio.
# Sono le tre cose che fanno sentire che TIENI un oggetto invece di indossare un
# adesivo — nel progetto precedente non c'era proprio niente in mano.
var _sway := Vector2.ZERO
var _bob_phase := 0.0
var _land_dip := 0.0
var _was_on_ground := true
var _vm_rest := Vector3.ZERO
var _vm: Node = null


func _ready() -> void:
	_sim = Movement.make_state(global_position)
	# I parallelepipedi bianchi che stavano nella scena erano un segnaposto, e
	# nel primo frame renderizzato erano una barra che tagliava lo schermo in due.
	# Al loro posto l'arma vera, in un viewport suo.
	if _viewmodel:
		_viewmodel.queue_free()
	_vm = ViewmodelScript.new()
	add_child(_vm)
	_vm.build(self)
	_viewmodel = _vm.root
	_vm_rest = _vm.REST_POS
	_basic.setup(self)
	equip(class_id, sub_id)
	apply_settings(SettingsScript.new())
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


## Porta le impostazioni dentro al gioco.
##
## Un cursore che si muove e non cambia niente e' peggio di un cursore che non
## c'e': dice al giocatore che ha capito male. Qui la sensibilita' arriva al
## mouse e il campo visivo alla camera, separato da quello dell'arma.
func apply_settings(st) -> void:
	_sensitivity = SENSITIVITY_BASE * float(st.get_value("sensitivity"))
	if _camera:
		_camera.fov = float(st.get_value("fov"))
	if _vm and _vm.camera:
		_vm.camera.fov = float(st.get_value("viewmodel_fov"))
	_shake_enabled = bool(st.get_value("camera_shake"))


## Prende classe e sottoclasse e ne monta il personaggio: numeri e kit insieme.
## È l'unico punto che decide chi sei, e si può richiamare — è così che si
## cambia build fra una partita e l'altra senza ricaricare la scena.
func equip(new_class: String, new_sub: String, kit_ids: Array = []) -> void:
	class_id = new_class
	sub_id = new_sub
	stats = Content.stats(class_id, sub_id)
	hp = float(stats.get("max_hp", Combat.HP_MAX))
	mana = float(stats.get("max_mana", 100.0))
	stamina = float(stats.get("max_stamina", 150.0))
	status = Status.new()

	if kit_ids.is_empty():
		# Nessuna scelta: il preset della classe. Chi vuole solo giocare deve
		# poterlo fare, e un kit vuoto è una schermata obbligatoria travestita
		# da libertà.
		_kit = Content.preset_kit(class_id)
	else:
		_kit = []
		for id in kit_ids:
			var a := Content.ability(String(id))
			if not a.is_empty():
				_kit.append(a)
	_cooldowns = AbilityRuntime.Cooldowns.new()

	# L'arma in mano DAL PRIMO FRAME, non dal primo lancio: aprire il gioco a
	# mani vuote è il segnale più forte che manchi qualcosa.
	var weapons: Array = stats.get("weapons", [])
	_weapon = ""
	_equip_weapon(String(weapons[0]) if not weapons.is_empty() else "sword")


func kit() -> Array:
	return _kit


## Riceve l'intenzione del giocatore. `cast_slot` resta la risoluzione
## immediata e testabile; l'input reale passa di qui e rispetta il windup.
func request_cast(idx: int) -> bool:
	if idx < 0 or idx >= _kit.size() or not _pending_cast.is_empty():
		Sfx.play("unavailable", Sfx.UI, -8.0)
		return false
	var ability: Dictionary = _kit[idx]
	if not _cast_available(ability):
		Sfx.play("unavailable", Sfx.UI, -8.0)
		cast_state_changed.emit("failed", String(ability["name"]), String(ability["weapon"]), 0.3)
		return false

	var windup := maxf(0.0, float(ability.get("windup", 0.0)))
	_equip_weapon(String(ability.get("weapon", "none")))
	cast_state_changed.emit("windup", String(ability["name"]), String(ability["weapon"]), windup)
	if windup <= 0.01:
		var instant_result := cast_slot(idx)
		_release_anim = 1.0
		cast_state_changed.emit(
			"released" if instant_result >= 0 else "failed",
			String(ability["name"]),
			String(ability["weapon"]),
			0.32
		)
		return instant_result >= 0

	_pending_cast = {
		"idx": idx,
		"ability": ability,
		"started": _clock,
		"release_at": _clock + windup,
		"duration": windup,
	}
	return true


func _cast_available(ability: Dictionary) -> bool:
	return (
		(practice or _cooldowns.can_cast(String(ability["id"]), _clock))
		and status.can_cast()
		and mana >= float(ability.get("cost_mana", 0.0))
		and stamina >= float(ability.get("cost_stamina", 0.0))
	)


func _advance_pending_cast() -> void:
	if _pending_cast.is_empty():
		return
	var ability: Dictionary = _pending_cast["ability"]
	if dead or not status.can_cast():
		_pending_cast.clear()
		cast_state_changed.emit("failed", String(ability["name"]), String(ability["weapon"]), 0.4)
		Sfx.play("unavailable", Sfx.UI, -8.0)
		return
	if _clock < float(_pending_cast["release_at"]):
		return
	var idx := int(_pending_cast["idx"])
	_pending_cast.clear()
	var result := cast_slot(idx)
	_release_anim = 1.0
	cast_state_changed.emit(
		"released" if result >= 0 else "failed",
		String(ability["name"]),
		String(ability["weapon"]),
		0.32
	)


## Lancia lo slot `idx` (0-7). Ritorna quanti bersagli ha preso, -1 se non era
## disponibile — così il chiamante (e i test) sanno distinguere "mancato" da
## "non potevi".
func cast_slot(idx: int) -> int:
	if idx < 0 or idx >= _kit.size():
		return -1
	var ability = _kit[idx]

	# Tre cose possono impedire un lancio, e sono tre "no" diversi. Suonano tutti
	# uguali di proposito: al giocatore serve sapere che non è partito, il
	# perché lo legge dall'HUD.
	var cd := Content.cooldown_for(ability, stats)
	if not _cast_available(ability):
		# Un tasto premuto a vuoto deve rispondere qualcosa. Il silenzio si legge
		# come "il gioco non mi ha sentito", che è la lamentela peggiore.
		Sfx.play("unavailable", Sfx.UI, -8.0)
		return -1
	if not practice:
		_cooldowns.start(ability.id, cd, float(ability.get("windup", 0.0)), _clock)
	mana -= float(ability.get("cost_mana", 0.0))
	stamina -= float(ability.get("cost_stamina", 0.0))

	# Nessuna abilità è mai bloccata dall'arma sbagliata: se serve un'altra arma,
	# il gioco la cambia. Mostrare metà build come "non disponibile" è una bugia
	# che trasforma otto abilità in due gruppi da quattro nella testa di chi gioca.
	_equip_weapon(String(ability.get("weapon", "none")))
	var moved := _apply_movement_effects(ability)

	# Le due forme che non raggiungono nessuno: partono già addosso a qualcuno.
	if ability.shape == Content.Shape.SELF:
		Effects.apply(ability, self, [], stats)
		_punch(Combat.Shape.BURST)
		Sfx.play("cast_burst")
		var self_world := _combat_world()
		if self_world:
			Vfx.self_effect(self_world, global_position, ability)
		cast_resolved.emit(ability.name, 0)
		return 0
	if ability.shape == Content.Shape.ZONE:
		_cast_zone(ability)
		cast_resolved.emit(ability.name, 0)
		return 0

	# L'origine è l'occhio, non i piedi: la forma parte da dove guardi, o quello
	# che vedi e quello che colpisci non coincidono.
	var origin := _camera.global_position
	var dir := -_camera.global_transform.basis.z
	if moved and float(ability.get("damage", 0.0)) <= 0.0:
		var move_world := _combat_world()
		if move_world:
			Vfx.mobility(move_world, global_position, dir, ability)
		_sound_cast(Combat.Shape.BURST)
		cast_resolved.emit(ability.name, 0)
		return 0

	# Il kick dell'arma parte QUI, prima che il colpo esista nel mondo: è ciò che
	# fa sentire che l'attacco è partito da te.
	_punch(ability.shape)

	if ability.shape == Combat.Shape.BOLT:
		var bolt := Area3D.new()
		bolt.set_script(BoltScript)
		var col := CollisionShape3D.new()
		var sph := SphereShape3D.new()
		sph.radius = 0.2
		col.shape = sph
		bolt.add_child(col)
		bolt.add_child(Vfx.projectile_visual(ability))
		var bolt_world := _combat_world()
		if bolt_world == null:
			bolt.queue_free()
			return -1
		bolt_world.add_child(bolt)
		bolt.fire(origin, dir, ability, self, stats)
		_sound_cast(ability.shape)
		cast_resolved.emit(ability.name, 0)
		return 0

	var space := get_world_3d().direct_space_state
	var result := AbilityRuntime.resolve_instant(space, ability, origin, dir, [get_rid()])
	# La geometria dice CHI è stato colpito; cosa succede a chi è stato colpito lo
	# decide `effects.gd`, in un posto solo. Sono due domande diverse, e tenerle
	# separate è ciò che permette a un'abilità di fare danno, sbalzare, avvelenare
	# e rubare vita nello stesso colpo senza che la risoluzione lo sappia.
	# Quanto ha fatto DAVVERO questo lancio: è il numero che serve a dire quale
	# abilità hai usato meglio, e chiederlo dopo a un sistema che non l'ha visto
	# significa inventarlo.
	last_cast_damage = Effects.apply(ability, self, result.hits, stats)
	var n := result.hits.size()

	# Il VFX usa la geometria che il colpo ha DAVVERO occupato — result.end_point
	# è dove la forma si è fermata, non dove sarebbe arrivata al massimo. È così
	# che disegnato e colpito restano la stessa cosa.
	var world := _combat_world()
	if world:
		if ability.shape == Combat.Shape.BURST:
			Vfx.burst(world, global_position, maxf(float(ability.get("range_m", 0.0)), 1.0), ability)
		else:
			# Il VFX parte dalla BOCCA DELL'ARMA, non dall'occhio.
			# Il test di collisione parte dall'occhio ed è giusto così — quello
			# che vedi è quello che colpisci. Ma disegnare il cilindro da lì
			# mette la camera DENTRO un volume additivo: misurato, il pixel più
			# scuro del frame passava da 0 a 96 e metà schermo finiva sopra l'80%
			# di luminanza. Due origini diverse per due scopi diversi.
			var muzzle := origin + dir * 1.1 + _camera.global_transform.basis.x * 0.22 - _camera.global_transform.basis.y * 0.16
			Vfx.beam(world, muzzle, result.end_point, ability)
		for h in result.hits:
			if is_instance_valid(h):
				Vfx.impact(
					world,
					h.global_position + Vector3(0, 0.9, 0),
					Vfx.ability_color(ability),
					ability
				)

	# Il peso del colpo: un calcio alla camera e al viewmodel, NON un freeze del
	# motore. Avevo usato Engine.time_scale, ed è uno strumento troppo grosso:
	# rallenta tutto — nemici, proiettili, il proiettile che avevi appena
	# lanciato. Il test l'ha preso subito (il bolt non arrivava più a bersaglio).
	# Un kick visivo dà la stessa sensazione senza toccare la simulazione.
	if n > 0 and _shake_enabled:
		_cam_kick = 0.035
		_sway += Vector2(0.0, -0.045)

	# Il suono del lancio parte SEMPRE, quello del colpo a segno solo se prendi:
	# sono due informazioni diverse, e confonderle è il modo più veloce di
	# togliere a un FPS l'unico feedback che non può non avere.
	_sound_cast(ability.shape)
	if n > 0:
		Sfx.play("hit_confirm")
		# Dove è stato colpito il primo bersaglio: è lì che va il contatore.
		for h in result.hits:
			if is_instance_valid(h):
				last_hit_point = h.global_position + Vector3(0, 1.1, 0)
				break

	cast_resolved.emit(ability.name, n)
	return n


## Le abilità che rivendicano un pezzo di pavimento. Si posano dove guardi, o ai
## tuoi piedi se guardi il cielo: una zona che non atterra da nessuna parte è un
## cooldown speso per niente.
func _cast_zone(ability: Dictionary) -> void:
	var origin := _camera.global_position
	var dir := -_camera.global_transform.basis.z
	var reach: float = maxf(float(ability.get("range_m", 10.0)), 1.0)
	var at := global_position
	var q := PhysicsRayQueryParameters3D.create(origin, origin + dir * reach)
	q.exclude = [get_rid()]
	var hit := get_world_3d().direct_space_state.intersect_ray(q)
	if hit and hit.has("position"):
		at = hit["position"]
	else:
		at = origin + dir * reach
		at.y = global_position.y - 0.9

	var world := _combat_world()
	if world == null:
		return
	for e in ability.get("effects", []):
		if String(e.get("kind", "")) == "zone":
			var placement := String(e.get("placement", "point"))
			var zone_at := global_position + Vector3(0, -0.85, 0) if placement == "self" else at
			ZoneScript.spawn(world, zone_at, e, self, ability)
	_punch(Combat.Shape.BURST)
	Sfx.play("cast_burst")


## Applica gli spostamenti dichiarati nei dati. Prima `move` veniva ignorato:
## Gap Closer e Quick Dash consumavano risorse senza muovere il giocatore.
func _apply_movement_effects(ability: Dictionary) -> bool:
	var applied := false
	for effect in ability.get("effects", []):
		if String(effect.get("kind", "")) != "move":
			continue
		var distance := float(effect.get("distance", 0.0))
		if is_zero_approx(distance):
			continue
		var dir := -_camera.global_transform.basis.z
		dir.y = 0.0
		if bool(effect.get("useMovementDirection", false)):
			var moving := Vector3(velocity.x, 0.0, velocity.z)
			if moving.length_squared() > 0.04:
				dir = moving.normalized()
		if distance < 0.0:
			dir = -dir
		var duration := 0.18
		var dash_speed := absf(distance) / duration
		_sim["vel"].x = dir.x * dash_speed
		_sim["vel"].z = dir.z * dash_speed
		_sim["knockback_ticks"] = int(ceilf(duration * 60.0))
		applied = true
	return applied


## Il contenitore del combattimento. Main resta la scena corrente mentre
## l'arena nasce e muore sotto di lui, quindi `get_tree().current_scene` non e'
## il posto in cui aggiungere proiettili e VFX.
func _combat_world() -> Node3D:
	var parent := get_parent()
	return parent as Node3D


## Cambia arma senza chiedere. Il cambio è istantaneo di proposito: un tempo di
## estrazione trasformerebbe otto abilità in due gruppi che non si mescolano.
func _equip_weapon(weapon: String) -> void:
	if weapon == "none" or weapon == _weapon:
		return
	_weapon = weapon
	_basic.cancel()
	if _vm:
		_vm.equip(weapon)
	# Un accenno di peso: l'arma nuova arriva in mano, non ci si teletrasporta.
	_sway += Vector2(0.0, -0.04)


func _sound_cast(shape: int) -> void:
	match shape:
		Combat.Shape.BEAM:
			Sfx.play("cast_beam")
		Combat.Shape.BOLT:
			Sfx.play("cast_bolt")
		Combat.Shape.BURST:
			Sfx.play("cast_burst")


## Quanto di un colpo passa la parata. Zero se sei dentro la finestra del tap,
## una frazione se stai tenendo, tutto se non stai parando.
func parry_absorb(amount: float) -> float:
	if _clock <= _parry_until:
		return 0.0
	if _parry_holding and stamina > 0.0:
		return amount * (1.0 - PARRY_HOLD_FRACTION)
	return amount


## Rompe il controllo. Restituisce `true` se ha fatto qualcosa: chiamarlo a
## vuoto NON deve consumare la ricarica, o il break diventa un tasto da non
## premere mai per paura di sprecarlo.
func break_free() -> bool:
	if _clock < _break_ready_at:
		return false
	var held := not (status.can_move() and status.can_cast())
	var airborne := not is_on_floor()
	if not held and not airborne:
		return false
	_break_ready_at = _clock + BREAK_COOLDOWN
	status.cleanse()
	if airborne:
		# Cadere subito invece di restare per aria: e' quello che il break
		# compra, ed e' anche il motivo per cui non e' gratis.
		_sim["vel"].y = minf(_sim["vel"].y, -6.0)
		_sim["knockback_ticks"] = 0
	Sfx.play("cleanse" if false else "parry")
	_cam_kick = 0.03
	return true


func break_ready() -> bool:
	return _clock >= _break_ready_at


func _try_break() -> void:
	if not break_free():
		Sfx.play("unavailable", Sfx.UI, -8.0)


func parrying() -> bool:
	return _clock <= _parry_until or (_parry_holding and stamina > 0.0)


func _try_parry() -> void:
	if _clock < _parry_ready_at or stamina < PARRY_COST or not status.can_cast():
		Sfx.play("unavailable", Sfx.UI, -8.0)
		return
	stamina -= PARRY_COST
	_parry_until = _clock + PARRY_WINDOW
	_parry_ready_at = _clock + PARRY_COOLDOWN
	# L'arma sale: e' il segnale che chi ti sta davanti deve poter leggere.
	_sway += Vector2(0.0, 0.07)
	Sfx.play("parry")


func take_damage(amount: float) -> void:
	if dead:
		return
	var passed := parry_absorb(amount)
	if passed <= 0.0:
		# Una parata riuscita non e' silenzio: e' il metallo secco, ed e' la
		# ricompensa per aver letto il colpo.
		Sfx.play("parry")
		damaged.emit(0.0, hp)
		return
	amount = passed
	if practice:
		# Nel poligono si incassa il colpo — il feedback serve — ma non si muore.
		damaged.emit(amount, hp)
		Sfx.play("hurt")
		return
	hp = maxf(0.0, hp - amount)
	damaged.emit(amount, hp)
	Sfx.play("hurt")
	if hp <= 0.0:
		dead = true
		Sfx.play("death")
		died.emit()


## Chi decide QUANDO si torna in vita sono le regole della partita, non il
## colpo che ti ha ucciso. Qui si esegue e basta.
func respawn() -> void:
	dead = false
	hp = Combat.HP_MAX
	_sim["vel"] = Vector3.ZERO


## Sbalzato. La durata in aria decide la velocità iniziale, non un numero fisso:
## con gravità `g` un corpo lanciato a `v` ricade dopo `2v/g`, quindi la finestra
## che ANVIL compra al 28 % in più è davvero il 28 % in più.
##
## E lo slancio orizzontale RESTA. Azzerarlo trasformerebbe la vittima in un
## bersaglio fermo, che è l'esatto opposto del rocket di Quake da cui viene
## l'idea: se stava correndo, vola in diagonale.
func launch(airtime: float = 0.72) -> void:
	_sim["vel"].y = maxf(_sim["vel"].y, Effects.launch_speed(airtime, Movement.GRAVITY))
	_sim["knockback_ticks"] = 6
	Sfx.play("launched")


func heal(amount: float) -> void:
	if dead:
		return
	hp = minf(float(stats.get("max_hp", Combat.HP_MAX)), hp + amount)


## Mana e stamina, in un metodo solo. Un valore negativo toglie: è così che una
## maledizione svuota il mana di chi la subisce e ne restituisce metà a chi la
## lancia, senza che nessuno dei due debba conoscere l'altro.
func restore(resource: String, amount: float) -> void:
	match resource:
		"mana":
			mana = clampf(mana + amount, 0.0, float(stats.get("max_mana", 100.0)))
		"stamina":
			stamina = clampf(stamina + amount, 0.0, float(stats.get("max_stamina", 150.0)))


func _punch(shape: int) -> void:
	match shape:
		Combat.Shape.BURST:
			_land_dip = 0.09
		Combat.Shape.BOLT:
			_sway += Vector2(0.0, -0.05)
		_:
			_sway += Vector2(0.0, -0.03)


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and not event.echo:
		var is_e: bool = event.keycode == KEY_E or event.physical_keycode == KEY_E
		var page := 0 if is_e else 1
		var is_wheel_key: bool = (
			event.keycode == KEY_E or event.physical_keycode == KEY_E
			or event.keycode == KEY_Q or event.physical_keycode == KEY_Q
		)
		if is_wheel_key and event.pressed and not _ability_wheel.is_open():
			_ability_wheel.begin(page)
			ability_wheel_changed.emit(page, 0, _kit.slice(page * 4, page * 4 + 4))
			get_viewport().set_input_as_handled()
			return
		if (
			is_wheel_key and not event.pressed and _ability_wheel.is_open()
			and page == _ability_wheel.page
		):
			_prime_from_wheel()
			get_viewport().set_input_as_handled()
			return
	if event is InputEventMouseMotion and _ability_wheel.is_open():
		var picked := _ability_wheel.move(event.relative)
		ability_wheel_changed.emit(
			_ability_wheel.page, picked,
			_kit.slice(_ability_wheel.page * 4, _ability_wheel.page * 4 + 4)
		)
		return
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		_yaw -= event.relative.x * _sensitivity
		_pitch = clampf(_pitch - event.relative.y * _sensitivity, -PITCH_LIMIT, PITCH_LIMIT)
		# Il sway è il DELTA del mouse: l'arma resta indietro e rientra a molla.
		_sway.x += event.relative.x * 0.00035
		_sway.y += event.relative.y * 0.00035
	elif event.is_action_pressed("ui_cancel"):
		Input.mouse_mode = (
			Input.MOUSE_MODE_VISIBLE
			if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED
			else Input.MOUSE_MODE_CAPTURED
		)


func _prime_from_wheel() -> void:
	_primed_slot = _ability_wheel.finish()
	ability_wheel_changed.emit(-1, -1, [])
	if _primed_slot < 0 or _primed_slot >= _kit.size():
		return
	var ability: Dictionary = _kit[_primed_slot]
	_equip_weapon(String(ability.get("weapon", "none")))
	cast_state_changed.emit(
		"selected", String(ability["name"]), String(ability.get("weapon", "none")), 0.0
	)
	Sfx.play("ui_confirm", Sfx.UI, -8.0)


func _physics_process(delta: float) -> void:
	_clock += delta
	_advance_pending_cast()
	_basic.tick(_clock)
	if not Input.is_action_pressed("attack"):
		_combat_input_release_frames += 1
		if _combat_input_release_frames >= 2:
			_combat_input_armed = true
	else:
		_combat_input_release_frames = 0
	if _combat_input_armed and Input.is_action_just_pressed("attack"):
		if _primed_slot >= 0:
			var selected := _primed_slot
			_primed_slot = -1
			request_cast(selected)
		else:
			_basic.press(_clock)
	if Input.is_action_just_released("attack"):
		_basic.release(_clock)
	for i in SLOTS:
		if Input.is_action_just_pressed("ability_%d" % (i + 1)):
			_primed_slot = -1
			request_cast(i)

	if Input.is_action_just_pressed("break_free"):
		_try_break()

	if Input.is_action_just_pressed("parry"):
		_try_parry()
	_parry_holding = Input.is_action_pressed("parry")
	if _parry_holding and _clock > _parry_until:
		# Tenere costa: e' la meta' onesta di una difesa che non ha un limite di
		# tempo. Chi para tutto resta senza scatti.
		stamina = maxf(0.0, stamina - PARRY_HOLD_DRAIN * delta)

	# Gli stati scorrono qui e in nessun altro punto: veleni che pulsano,
	# rallentamenti che scadono, scudi che finiscono.
	var dot := status.tick(delta)
	if dot > 0.0:
		take_damage(dot)

	# Le risorse rientrano da sole. La stamina più lentamente in movimento —
	# chi corre e para di continuo deve finire per restare a secco.
	var moving := Vector2(velocity.x, velocity.z).length() > 1.0
	stamina = minf(float(stats.get("max_stamina", 150.0)), stamina + (5.0 if moving else 12.0) * delta)
	mana = minf(float(stats.get("max_mana", 100.0)), mana + 8.0 * delta)

	var wish := Input.get_vector("move_left", "move_right", "move_back", "move_forward")
	# Rallentamenti, gelo e radici agiscono sull'INTENZIONE, non sulla velocità
	# risultante: così chi è rallentato accelera comunque come sempre, arriva
	# solo più in basso. Tagliare la velocità dopo produce uno scatto quando lo
	# stato scade, e il movimento di Quake non deve mai scattare.
	wish *= status.move_multiplier() * float(stats.get("move_speed_mult", 1.0))

	# Il motore ha già risolto la collisione: rileggi da lui la posizione e lo
	# stato di appoggio prima di simulare, o la nostra funzione integra contro un
	# mondo che non esiste.
	_sim["pos"] = global_position
	_sim["on_ground"] = is_on_floor()

	_sim = Movement.step(_sim, wish, _yaw, Input.is_action_pressed("jump"), delta)

	velocity = _sim["vel"]
	move_and_slide()

	# E dopo: se il motore ci ha fermati contro un muro, la nostra velocità deve
	# saperlo, altrimenti continua ad accumulare contro la geometria.
	_sim["vel"] = velocity
	_sim["pos"] = global_position

	_footsteps(delta)

	rotation.y = _yaw
	# Il kick si somma al pitch e rientra a molla: la camera ricorda il colpo
	# per un attimo, poi torna dove stavi mirando.
	_cam_kick *= exp(-14.0 * delta)
	_camera.rotation.x = _pitch + _cam_kick

	_update_viewmodel(delta)


func cycle_weapon() -> void:
	var weapons: Array = stats.get("weapons", [])
	if weapons.size() < 2 or not _pending_cast.is_empty():
		return
	var current := weapons.find(_weapon)
	_equip_weapon(String(weapons[(current + 1) % weapons.size()]))


## Passi, salto e atterraggio.
##
## I passi sono legati alla VELOCITÀ REALE, non a un timer: chi accelera sente
## il ritmo salire, chi frena lo sente calare, e in un gioco dove la velocità si
## accumula è quello che dice all'orecchio quanto stai andando forte.
## L'atterraggio suona più forte se cadi da più in alto, per lo stesso motivo.
func _footsteps(delta: float) -> void:
	var grounded := is_on_floor()
	if grounded and not _was_grounded_sfx:
		Sfx.play_at("land", global_position, clampf(-14.0 + absf(_fall_speed) * 0.9, -14.0, 0.0))
		_step_t = 0.22
	if not grounded and _was_grounded_sfx and _sim["vel"].y > 0.5:
		Sfx.play("jump", Sfx.SFX, -14.0)
	_fall_speed = _sim["vel"].y if not grounded else 0.0
	_was_grounded_sfx = grounded

	if not grounded:
		return
	var speed := Vector2(velocity.x, velocity.z).length()
	if speed < 1.5:
		_step_t = 0.12
		return
	_step_t -= delta * (speed / Movement.MOVE_SPEED)
	if _step_t <= 0.0:
		_step_t = 0.34
		Sfx.step(global_position)


func _update_viewmodel(delta: float) -> void:
	if not _viewmodel:
		return
	var step := minf(delta, 0.05)

	# Sway: rientra a molla verso la posa di riposo.
	_sway = _sway.limit_length(0.09) * exp(-9.0 * step)

	# Bob: un otto guidato dalla velocità REALE, così l'accelerazione di Quake si
	# vede nelle mani invece che solo nel movimento della camera.
	var speed := Vector2(velocity.x, velocity.z).length()
	var ratio := clampf(speed / Movement.MOVE_SPEED, 0.0, 1.4)
	if is_on_floor() and ratio > 0.05:
		_bob_phase += step * 9.5 * ratio
	var bob_x := cos(_bob_phase) * 0.022 * ratio
	# Frequenza doppia sulla verticale: è ciò che lo rende un passo e non un dondolio.
	var bob_y := absf(sin(_bob_phase)) * 0.016 * ratio - 0.008 * ratio

	# Dip di atterraggio, su molla: peso.
	if is_on_floor() and not _was_on_ground:
		_land_dip = 0.12
	_was_on_ground = is_on_floor()
	_land_dip *= exp(-7.0 * step)
	_release_anim *= exp(-15.0 * step)
	var windup := 0.0
	if not _pending_cast.is_empty():
		var duration := maxf(float(_pending_cast["duration"]), 0.001)
		windup = clampf((_clock - float(_pending_cast["started"])) / duration, 0.0, 1.0)

	# Ogni arma prepara e rilascia in modo diverso. Il gesto resta nel viewport
	# del viewmodel, quindi non compenetra il mondo e non altera la simulazione.
	var action_pos := Vector3.ZERO
	var action_rot := Vector3.ZERO
	match _weapon:
		"sword":
			action_pos = Vector3(-0.055 * windup, 0.035 * windup, 0.07 * windup)
			action_rot = Vector3(-0.10 * windup, 0.0, -0.52 * windup + 0.72 * _release_anim)
		"bow":
			action_pos = Vector3(0.0, 0.015 * windup, 0.09 * windup - 0.06 * _release_anim)
			action_rot = Vector3(0.0, 0.12 * windup, -0.08 * windup)
		"staff":
			action_pos = Vector3(0.0, 0.07 * windup + 0.025 * _release_anim, 0.04 * windup)
			action_rot = Vector3(-0.20 * windup + 0.16 * _release_anim, 0.0, 0.12 * windup)

	_viewmodel.position = _vm_rest + Vector3(
		-_sway.x + bob_x,
		_sway.y + bob_y - _land_dip,
		0.0
	) + action_pos
	_viewmodel.rotation = (
		Vector3(deg_to_rad(ViewmodelScript.REST_ROT.x), deg_to_rad(ViewmodelScript.REST_ROT.y), deg_to_rad(ViewmodelScript.REST_ROT.z))
		+ Vector3(_sway.y * 2.0, -_sway.x * 2.0, _sway.x * 3.0)
		+ action_rot
	)
