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

var peer_id: int = 0

signal hit_registered(amount: float)


func take_damage(amount: float) -> void:
	hit_registered.emit(amount)


func launch() -> void:
	velocity.y = 9.0
