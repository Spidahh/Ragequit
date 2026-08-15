## Verifica QUALI trasporti di rete esistono davvero.
##
## E' la domanda che decide se il multigiocatore funziona nel browser, e non si
## risponde leggendo: si risponde chiedendo al motore.
extends SceneTree
func _init() -> void:
	for t in ["ENetMultiplayerPeer", "WebSocketMultiplayerPeer", "WebRTCMultiplayerPeer", "WebRTCPeerConnection"]:
		print("%-28s %s" % [t, "c'e'" if ClassDB.class_exists(t) else "NON esiste"])
	print("piattaforma: %s" % OS.get_name())
	print("feature web: %s" % str(OS.has_feature("web")))
	quit(0)
