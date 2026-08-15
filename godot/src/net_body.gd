## Il corpo di un peer nel mondo di rete.
##
## Minimo di proposito: la vita autoritativa vive in net_world (il server è
## l'unico a deciderla), qui c'è solo quello che serve perché il motore di
## risoluzione lo RICONOSCA come bersaglio.
##
## Senza questo script i corpi erano CharacterBody3D nudi, e
## `AbilityRuntime.resolve_instant` raccoglie solo i nodi che espongono
## `take_damage`: nessun colpo avrebbe mai trovato nessuno. Un difetto che non
## dà errori — semplicemente non succede niente — ed è la categoria peggiore.
extends CharacterBody3D

const Status := preload("res://src/status.gd")

var peer_id: int = 0
## Gli stati vivono sul corpo anche in rete: è il server a farli scorrere, ed è
## l'unico che può — un veleno che scade sul client è un veleno che scade in un
## momento diverso per ognuno.
var status := Status.new()

signal hit_registered(amount: float)


func take_damage(amount: float) -> void:
	hit_registered.emit(amount)


func launch(airtime: float = 0.72) -> void:
	velocity.y = maxf(velocity.y, 25.0 * airtime * 0.5)


func heal(amount: float) -> void:
	healed.emit(amount)


func restore(_resource: String, _amount: float) -> void:
	pass


signal healed(amount: float)
