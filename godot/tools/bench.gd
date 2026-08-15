## Benchmark dell'arena — numeri, non impressioni.
##
## Guardare uno screenshot dice se qualcosa si vede, non se il gioco regge. Un
## FPS competitivo si giudica su frame time, draw call e memoria, e questi sono i
## monitor che il motore espone già.
##
## Bersagli, presi da come si misurano gli shooter veri (non inventati):
##   - frame time medio  <= 16.6 ms  (60 fps)
##   - frame time 1% low <= 33.3 ms  (nessun singhiozzo sotto i 30 fps)
##   - draw call         <  300      (una scena da arena, non un open world)
##
##   godot --path . --script res://tools/bench.gd
extends SceneTree

const WARMUP := 60
const SAMPLES := 300

var _arena: Node3D
var _frame := 0
var _times: Array[float] = []
var _t_last := 0.0


func _init() -> void:
	var packed: PackedScene = load("res://scenes/arena.tscn")
	_arena = packed.instantiate()
	root.add_child(_arena)
	_t_last = Time.get_ticks_usec() / 1000000.0
	print("\n=== BENCHMARK ARENA ===")
	print("renderer: %s" % ProjectSettings.get_setting("rendering/renderer/rendering_method"))


func _process(_d: float) -> bool:
	var now := Time.get_ticks_usec() / 1000000.0
	var dt := now - _t_last
	_t_last = now
	_frame += 1
	if _frame <= WARMUP:
		return false
	_times.append(dt * 1000.0)
	if _times.size() < SAMPLES:
		return false

	_times.sort()
	var sum := 0.0
	for t in _times:
		sum += t
	var avg := sum / _times.size()
	var p50 := _times[_times.size() / 2]
	var p99 := _times[int(_times.size() * 0.99)]

	var draw_calls := Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME)
	var prims := Performance.get_monitor(Performance.RENDER_TOTAL_PRIMITIVES_IN_FRAME)
	var mem_static := Performance.get_monitor(Performance.MEMORY_STATIC) / 1048576.0
	var vram := Performance.get_monitor(Performance.RENDER_VIDEO_MEM_USED) / 1048576.0
	var objects := Performance.get_monitor(Performance.OBJECT_COUNT)

	var fails := 0
	print("\n  frame time medio   %6.2f ms   (bersaglio <= 16.60)%s" % [avg, _mark(avg <= 16.6)])
	if avg > 16.6:
		fails += 1
	print("  frame time p50     %6.2f ms" % p50)
	print("  frame time p99     %6.2f ms   (bersaglio <= 33.30)%s" % [p99, _mark(p99 <= 33.3)])
	if p99 > 33.3:
		fails += 1
	print("  fps medio          %6.1f" % (1000.0 / avg))
	print("")
	print("  draw call          %6d      (bersaglio < 300)%s" % [draw_calls, _mark(draw_calls < 300)])
	if draw_calls >= 300:
		fails += 1
	print("  primitive          %6d" % prims)
	print("  memoria statica    %6.1f MB" % mem_static)
	print("  VRAM               %6.1f MB" % vram)
	print("  oggetti            %6d" % objects)

	print("")
	if fails == 0:
		print("=== TUTTI I BERSAGLI CENTRATI ===\n")
	else:
		printerr("=== %d BERSAGLI MANCATI ===\n" % fails)
	quit(1 if fails > 0 else 0)
	return true


func _mark(ok: bool) -> String:
	return "  ✓" if ok else "  ✗"
