## Il collante della scena.
##
## Esiste perché tre cose devono conoscersi solo a partita avviata: l'HUD deve
## sapere di chi mostra la vita, i nemici chi inseguire, e il feedback di colpo
## subito deve arrivare a schermo. Cablarlo qui invece che dentro ognuno dei tre
## evita la dipendenza incrociata che rende impossibile testarli separati.
extends Node3D

const Vfx := preload("res://src/vfx.gd")

var _player: Node = null
var _hud: Node = null
var _hurt_flash: ColorRect


func _ready() -> void:
	_player = get_node_or_null("Player")
	_hud = get_node_or_null("HUD")
	if _player == null:
		push_warning("arena: nessun Player nella scena")
		return

	if _hud and _hud.has_method("setup"):
		_hud.setup(_player)

	# Ogni nemico insegue il giocatore.
	for child in get_children():
		if child.has_method("_shoot") and "target" in child:
			child.target = _player
			if child.has_signal("fired"):
				child.fired.connect(_on_enemy_fired)

	# Lampo rosso quando prendi: è il feedback minimo senza cui non sai da dove
	# stai morendo. Sta qui e non nell'HUD perché è una reazione, non un widget.
	var layer := CanvasLayer.new()
	layer.layer = 10
	add_child(layer)
	_hurt_flash = ColorRect.new()
	_hurt_flash.color = Color(0.85, 0.05, 0.1, 0.0)
	_hurt_flash.set_anchors_preset(Control.PRESET_FULL_RECT)
	_hurt_flash.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(_hurt_flash)

	if _player.has_signal("damaged"):
		_player.damaged.connect(_on_player_damaged)


func _on_enemy_fired(from: Vector3, to: Vector3, hit: bool) -> void:
	# Il tracciante rosso: senza, non sai da dove ti stanno sparando, e morire
	# senza sapere da dove è la cosa che fa chiudere un PvP.
	Vfx.tracer(self, from, to)
	if hit:
		Vfx.impact(self, to, Vfx.COL_ENEMY)


func _on_player_damaged(_amount: float, _remaining: float) -> void:
	if _hurt_flash:
		_hurt_flash.color.a = 0.32


func _process(delta: float) -> void:
	if _hurt_flash and _hurt_flash.color.a > 0.0:
		_hurt_flash.color.a = maxf(0.0, _hurt_flash.color.a - delta * 1.6)
