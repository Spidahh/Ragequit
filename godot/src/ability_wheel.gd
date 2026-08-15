## Selezione pura delle due wheel abilita. E apre gli slot 1-4, Q gli slot 5-8.
## Il mouse resta catturato: accumuliamo il movimento relativo e scegliamo il
## settore dalla direzione, cosi la mira non salta quando la wheel si chiude.
extends RefCounted

const RADIUS := 18.0

var page := -1
var picked := 0
var offset := Vector2(0.0, -RADIUS)


func begin(which: int) -> void:
	page = clampi(which, 0, 1)
	picked = 0
	offset = Vector2(0.0, -RADIUS)


func move(relative: Vector2) -> int:
	if page < 0:
		return -1
	offset += relative
	if offset.length() > 96.0:
		offset = offset.normalized() * 96.0
	if offset.length() < 8.0:
		return picked
	var angle := fposmod(rad_to_deg(offset.angle()) + 90.0, 360.0)
	picked = int(floor((angle + 45.0) / 90.0)) % 4
	return picked


func finish() -> int:
	if page < 0:
		return -1
	var slot := page * 4 + picked
	page = -1
	return slot


func is_open() -> bool:
	return page >= 0
