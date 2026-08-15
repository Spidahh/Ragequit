## netfox e' davvero caricato e parla con Godot 4.7?
extends SceneTree
var _f := 0
func _process(_d: float) -> bool:
	_f += 1
	if _f < 3:
		return false
	for n in ["NetworkTime", "NetworkRollback", "NetworkEvents"]:
		print("%-18s %s" % [n, "c'e'" if root.get_node_or_null(n) else "MANCA"])
	for t in ["RollbackSynchronizer", "TickInterpolator", "StateSynchronizer"]:
		print("%-18s %s" % [t, "registrato" if ClassDB.class_exists(t) or ResourceLoader.exists("res://addons/netfox/rollback/rollback-synchronizer.gd") else "MANCA"])
	var nt = root.get_node_or_null("NetworkTime")
	if nt:
		print("tickrate %s" % str(nt.tickrate))
	quit(0)
	return true
