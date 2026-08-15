## Il corpo che si vede: modello, animazioni, arma in pugno, colore di squadra.
##
## Sostituisce la capsula. Non e' una rifinitura: una capsula non ha una
## direzione che si legge, non ha una posa che dice cosa sta per fare, e non ha
## una sagoma che si riconosca a trenta metri. Meta' delle informazioni che un
## arena shooter passa al giocatore passano dal corpo dell'avversario.
##
## I MODELLI ARRIVANO DAL PROGETTO PRECEDENTE, gia' scaricati e gia' retargettati
## su un rig comune (`mixamorig_*`). Non si rifanno: si importano. Quello che
## serviva era un passaggio di formato (vedi `tools/import_characters.mjs`).
##
## COME SI SCEGLIE UN'ANIMAZIONE. Non da uno stato dichiarato da chi chiama, ma
## dalla VELOCITA' VERA del corpo: chi accelera si vede accelerare, chi si ferma
## si vede fermarsi, e nessuno deve ricordarsi di aggiornare uno stato. E' la
## stessa scelta del bob dell'arma in prima persona, per la stessa ragione.
##
## LE CLIP HANNO NOMI DIVERSI PER OGNI MODELLO, e non si possono uniformare senza
## riesportarli tutti. La tabella qui sotto e' quella traduzione, ed e' l'unico
## posto che sa che il paladino chiama "slash" quello che il ninja chiama
## "great_sword_slash".
extends Node3D

const Settings := preload("res://src/settings.gd")

## Quale modello porta ogni classe, e con che arma in mano.
const MODELS := {
	"breaker": {"file": "paladin", "weapon": "sword"},
	"talon": {"file": "erika", "weapon": "bow"},
	"warden": {"file": "vampire", "weapon": "staff"},
	"drift": {"file": "ninja", "weapon": "sword"},
}

## Da stato del gioco a nome di clip, per modello.
##
## Erika non ha una clip di attesa: e' un pacchetto di tiro con l'arco, e la posa
## piu' vicina a "in piedi, pronta" e' la parata. Meglio una posa giusta presa da
## un'altra clip che una posa a T.
const CLIPS := {
	"paladin": {
		"idle": "sword_and_shield_idle",
		"walk": "sword_and_shield_walk",
		"run": "sword_and_shield_run",
		"strafe": "sword_and_shield_strafe",
		"jump": "sword_and_shield_jump",
		"attack": "sword_and_shield_slash",
		"cast": "sword_and_shield_casting",
		"hit": "sword_and_shield_impact",
		"death": "sword_and_shield_death",
	},
	"erika": {
		"idle": "standing_block",
		"walk": "standing_walk_forward",
		"run": "standing_run_forward",
		"strafe": "standing_run_left",
		"jump": "fall_a_land_to_run_forward",
		"attack": "standing_draw_arrow",
		"cast": "standing_aim_recoil",
		"hit": "standing_aim_recoil",
		"death": "standing_death_forward_01",
	},
	"vampire": {
		"idle": "standing_idle_03",
		"walk": "standing_walk_forward",
		"run": "standing_run_forward",
		"strafe": "standing_run_left",
		"jump": "standing_jump",
		"attack": "standing_1h_magic_attack_01",
		"cast": "standing_2h_cast_spell_01",
		"hit": "standing_block_react_large",
		"death": "standing_react_death_forward",
	},
	"ninja": {
		"idle": "great_sword_idle",
		"walk": "great_sword_walk",
		"run": "great_sword_run",
		"strafe": "great_sword_strafe",
		"jump": "great_sword_jump",
		"attack": "great_sword_slash",
		"cast": "great_sword_casting",
		"hit": "great_sword_impact",
		"death": "two_handed_sword_death",
	},
}

## L'altezza a cui si normalizza ogni modello. I quattro arrivano fra 1,56 e 2,00
## metri: senza normalizzare, il WARDEN sarebbe basso mezzo metro piu' del
## BREAKER per un motivo che non ha niente a che vedere col gioco.
const BODY_HEIGHT_M := 1.8

## Lo spessore del bordo di squadra, in FRAZIONE dell'altezza del corpo.
##
## Costante in metri sarebbe un errore asimmetrico: su un modello grande
## sparisce, su uno piccolo inghiotte il personaggio e lo fa sembrare un
## manichino di plastica colorata. Su un corpo di 1,8 m fa 5,4 mm.
const RIM_FRACTION := 0.003

## Sotto questa velocita' si sta fermi, sopra si corre. In mezzo si cammina.
const WALK_SPEED := 1.2
const RUN_SPEED := 5.5

var class_id := "breaker"
var team_color := Color(0.78, 0.16, 0.18)

var _model: Node3D = null
var _anim: AnimationPlayer = null
var _skel: Skeleton3D = null
var _clips: Dictionary = {}
var _current := ""
## Le azioni (colpo, danno subito, morte) hanno la precedenza sul movimento per
## un attimo: senza, un colpo lanciato mentre corri non si vede mai.
var _lock := 0.0
var _dead := false


func setup(new_class: String, color: Color) -> void:
	class_id = new_class if MODELS.has(new_class) else "breaker"
	team_color = color
	_build()


func _build() -> void:
	for c in get_children():
		c.queue_free()

	var spec: Dictionary = MODELS[class_id]
	var file := String(spec["file"])
	var packed: PackedScene = load("res://assets/characters/%s.glb" % file)
	if packed == null:
		push_warning("character: modello %s mancante" % file)
		return
	_model = packed.instantiate()
	add_child(_model)
	_clips = CLIPS.get(file, {})

	_anim = _find(_model, "AnimationPlayer") as AnimationPlayer
	_skel = _find(_model, "Skeleton3D") as Skeleton3D

	_normalize_scale()
	_apply_team_rim()
	_attach_weapon(String(spec["weapon"]))
	play("idle")


## Trova il primo nodo di un tipo, ovunque sia nell'albero importato: la
## gerarchia dei GLB cambia da esportatore a esportatore, e cablare un percorso
## significa rompersi al prossimo modello.
func _find(from: Node, type_name: String) -> Node:
	var stack: Array = [from]
	while not stack.is_empty():
		var n = stack.pop_back()
		if n.get_class() == type_name:
			return n
		for c in n.get_children():
			stack.append(c)
	return null


## Porta tutti i modelli alla stessa altezza e appoggia i piedi a terra.
##
## Il corpo sta dentro una capsula alta 1,8 con il centro a 0,9: il modello va
## abbassato di mezza altezza, o galleggia esattamente di quanto misura.
func _normalize_scale() -> void:
	var box := _bounds(_model)
	if box.size.y <= 0.01:
		return
	# Il fattore MOLTIPLICA la scala che il modello ha già, non la sostituisce.
	var k := BODY_HEIGHT_M / box.size.y
	_model.scale = _model.scale * k
	_model.position.y = -BODY_HEIGHT_M * 0.5


## L'ingombro del modello NELLO SPAZIO DELLA SUA RADICE, non in quello locale di
## ogni mesh.
##
## È la differenza fra 1,8 m e 1,8 centomillesimi. I GLB Mixamo arrivano in
## centimetri e portano una scala di 0,01 sulla radice: leggendo l'AABB locale
## della mesh si ottengono 200 unità, si calcola un fattore per portarle a 1,8 e
## lo si applica a una radice **che era già scalata**. Il personaggio diventa un
## puntino, e non c'è nessun errore da nessuna parte — l'ho visto solo
## renderizzando un frame.
##
## Le trasformazioni si compongono a mano invece di usare `global_transform`
## perché questo gira anche fuori dall'albero, quando il modello è appena stato
## istanziato e non è ancora figlio di niente.
func _bounds(from: Node) -> AABB:
	var box := AABB()
	var first := true
	var stack: Array = [[from, Transform3D.IDENTITY]]
	while not stack.is_empty():
		var item: Array = stack.pop_back()
		var n = item[0]
		var xform: Transform3D = item[1]
		if n is Node3D:
			xform = xform * (n as Node3D).transform
		for c in n.get_children():
			stack.append([c, xform])
		if n is MeshInstance3D:
			var a: AABB = xform * (n as MeshInstance3D).get_aabb()
			if first:
				box = a
				first = false
			else:
				box = box.merge(a)
	return box


## Il bordo di squadra: un guscio a facce invertite, disegnato dietro il corpo.
##
## Passa da `next_pass` invece che da una mesh duplicata perche' cosi' segue lo
## scheletro da solo — una copia andrebbe riagganciata al rig, e a ogni frame
## sarebbe una seconda deformazione da calcolare.
func _apply_team_rim() -> void:
	var rim := StandardMaterial3D.new()
	rim.albedo_color = team_color
	rim.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	rim.cull_mode = BaseMaterial3D.CULL_FRONT
	rim.grow = true
	rim.grow_amount = BODY_HEIGHT_M * RIM_FRACTION
	# Emissivo: il colore di squadra deve staccarsi anche nelle zone d'ombra fra
	# una torcia e l'altra, che e' esattamente dove serve.
	rim.emission_enabled = true
	rim.emission = team_color
	rim.emission_energy_multiplier = 0.8

	var stack: Array = [_model]
	while not stack.is_empty():
		var n = stack.pop_back()
		for c in n.get_children():
			stack.append(c)
		if n is MeshInstance3D:
			var mi := n as MeshInstance3D
			for i in mi.get_surface_override_material_count():
				var m := mi.mesh.surface_get_material(i)
				if m == null:
					continue
				var dup := m.duplicate()
				dup.next_pass = rim
				mi.set_surface_override_material(i, dup)


## L'arma in pugno, agganciata all'osso della mano destra.
##
## Un BoneAttachment3D e non una riparentazione: l'osso si muove ogni frame con
## l'animazione, e attaccarsi al nodo invece che all'osso lascia l'arma ferma
## a mezz'aria mentre il braccio la attraversa.
func _attach_weapon(weapon: String) -> void:
	if _skel == null or weapon == "none":
		return
	var packed: PackedScene = load("res://assets/weapons/%s.glb" % weapon)
	if packed == null:
		return
	var hand := _skel.find_bone("mixamorig_RightHand")
	if hand == -1:
		return
	var att := BoneAttachment3D.new()
	att.bone_idx = hand
	_skel.add_child(att)
	var w := packed.instantiate()
	# L'arma e' modellata in scala sua: si rimette in scala rispetto al corpo,
	# che e' gia' normalizzato, invece di ritararla a occhio per ogni modello.
	var wbox := _bounds(w)
	var wanted := 0.95 if weapon != "staff" else 1.5
	var longest: float = maxf(maxf(wbox.size.x, wbox.size.y), wbox.size.z)
	if longest > 0.01:
		var k: float = wanted / longest
		w.scale = Vector3(k, k, k)
	# La lama lungo +Y del modello: 90 gradi su X la mettono in avanti nella mano.
	# È la stessa rotazione che usava la pipeline del progetto precedente.
	w.rotation_degrees = Vector3(90, 0, 0)
	att.add_child(w)


## Che animazione va adesso, dedotta dalla velocità vera.
func drive(velocity: Vector3, on_floor: bool, delta: float) -> void:
	if _dead:
		return
	if _lock > 0.0:
		_lock -= delta
		return
	if not on_floor:
		play("jump")
		return
	var flat := Vector2(velocity.x, velocity.z).length()
	if flat < WALK_SPEED:
		play("idle")
	elif flat < RUN_SPEED:
		play("walk")
	else:
		play("run")


## Un'azione che deve vedersi per intero, anche se il corpo si sta muovendo.
func act(kind: String, lock_sec: float = 0.45) -> void:
	if _dead:
		return
	play(kind)
	_lock = lock_sec


func die() -> void:
	if _dead:
		return
	_dead = true
	play("death")


func revive() -> void:
	_dead = false
	_lock = 0.0
	play("idle")


func play(state: String) -> void:
	if _anim == null:
		return
	var clip := String(_clips.get(state, ""))
	if clip.is_empty() or clip == _current:
		return
	if not _anim.has_animation(clip):
		return
	_current = clip
	# Mezzo decimo di fusione: senza, ogni cambio di direzione è uno scatto. Con
	# di più, una parata arriva dopo il colpo che doveva fermare.
	_anim.play(clip, 0.12)
	var a := _anim.get_animation(clip)
	if a and state in ["idle", "walk", "run", "strafe"]:
		a.loop_mode = Animation.LOOP_LINEAR
	elif a:
		a.loop_mode = Animation.LOOP_NONE
