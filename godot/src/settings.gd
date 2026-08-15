## Le impostazioni, e le comodità che ci stanno dentro.
##
## PERCHE' QUESTE COSE SI FANNO ADESSO E NON "DOPO, SE C'E' TEMPO". Sono la parte
## che nessuno nota quando c'e' e che tutti notano quando manca, ed e' esattamente
## la categoria di lavoro che "dopo" non si fa mai. Un gioco senza tasti
## rimappabili e senza un cursore per il mirino non e' un gioco a cui manca una
## rifinitura: e' un gioco che dice al giocatore che non e' suo.
##
## COSA C'E' DENTRO, e perche' ognuna:
##   - **mira**: sensibilita' a due decimali, e accanto il valore convertito nella
##     scala che il giocatore gia' usa altrove — chi ha una mira sua se la porta;
##   - **campo visivo**: separato per il mondo e per l'arma in mano, perche' chi
##     gioca a FOV alto vuole l'arma piu' piccola, non piu' distorta;
##   - **mirino**: spessore, lunghezza, buco, colore, punto — chi ha una mira sua
##     vuole anche il suo mirino;
##   - **daltonici**: tre profili che cambiano i colori delle SILHOUETTE e
##     dell'HUD, non un filtro sopra lo schermo. Il colore li' porta informazione,
##     ed e' li' che va cambiato;
##   - **interruttori che tolgono roba**: scuotimento, lampo di danno, flash
##     dello sbalzo. Non sono accessibilita' di facciata: servono a chi quelle
##     cose le trova nauseanti;
##   - **tasti**: tutti rimappabili, tutti, compreso il break e la parata.
##
## Si salva NEL MOMENTO IN CUI SI SCEGLIE, mai all'uscita: un gioco che perde le
## impostazioni perche' e' stato chiuso male e' un gioco che le fa rifare.
extends RefCounted

const PATH := "user://settings.cfg"

## Il fattore di conversione verso la scala che quasi tutti gli sparatutto usano
## (yaw in gradi per conteggio del mouse, a 800 DPI). Mostrarlo accanto al numero
## nostro e' la differenza fra "ritarare a occhio" e "incollare il valore".
const COMMON_FPS_FACTOR := 0.335

## I profili per daltonismo. Cambiano la COPPIA nemico/alleato, che e' l'unico
## posto in cui il colore e' gameplay. Il rosso e il verde sono la coppia
## sbagliata due volte su tre.
const COLORBLIND := {
	"none": {"enemy": Color(0.78, 0.16, 0.18), "ally": Color(0.23, 0.56, 0.87)},
	# Protanopia e deuteranopia: il rosso sparisce. Non basta cambiare tinta —
	# chi non distingue le tinte distingue la LUMINOSITA', quindi la coppia e'
	# arancione chiaro contro blu scuro, non arancione contro ciano (che hanno
	# la stessa luminanza e diventano lo stesso colore).
	"protanopia": {"enemy": Color(0.98, 0.72, 0.20), "ally": Color(0.05, 0.28, 0.72)},
	"deuteranopia": {"enemy": Color(1.0, 0.78, 0.24), "ally": Color(0.06, 0.24, 0.78)},
	# Tritanopia: il blu sparisce. Rosso contro verde acido.
	"tritanopia": {"enemy": Color(0.86, 0.14, 0.22), "ally": Color(0.35, 0.85, 0.25)},
}

const DEFAULTS := {
	"sensitivity": 1.85,
	"fov": 100.0,
	"viewmodel_fov": 70.0,
	"crosshair_thickness": 2.0,
	"crosshair_length": 9.0,
	"crosshair_gap": 6.0,
	"crosshair_dot": false,
	"crosshair_color": Color(1, 1, 1, 0.85),
	"colorblind": "none",
	"brightness": 1.0,
	"effects_intensity": 1.0,
	"camera_shake": true,
	"damage_flash": true,
	"launch_flash": true,
	"ui_scale": 1.0,
	"vol_master": 0.0,
	"vol_sfx": 0.0,
	"vol_ambient": -4.0,
	"vol_ui": -6.0,
	"vol_music": -8.0,
	"name": "",
}

## I tasti di serie. `left_handed` non e' un vezzo: rimapparne dodici a mano e'
## un muro, e chi gioca con la sinistra lo trova a ogni gioco.
const BINDINGS := {
	"move_forward": KEY_W,
	"move_back": KEY_S,
	"move_left": KEY_A,
	"move_right": KEY_D,
	"jump": KEY_SPACE,
	"ability_1": KEY_1,
	"ability_2": KEY_2,
	"ability_3": KEY_3,
	"ability_4": KEY_4,
	"ability_5": KEY_5,
	"ability_6": KEY_6,
	"ability_7": KEY_7,
	"ability_8": KEY_8,
	# Il break e la parata SI RIMAPPANO come tutto il resto: "tutti i tasti"
	# significa tutti, compresi quelli che nessuno pensa di voler cambiare.
	"break_free": KEY_SHIFT,
	# La parata sta sul tasto destro del mouse, ma nella mappa c'e' lo stesso:
	# "tutti i tasti" comprende quelli che non sono tasti.
	"parry": KEY_C,
}

const LEGACY_WHEEL_CONFLICTS := {
	"ability_5": KEY_Q,
	"ability_6": KEY_E,
	"ability_7": KEY_R,
	"ability_8": KEY_F,
}

const LEFT_HANDED := {
	"move_forward": KEY_I,
	"move_back": KEY_K,
	"move_left": KEY_J,
	"move_right": KEY_L,
}

var values: Dictionary = DEFAULTS.duplicate(true)
var bindings: Dictionary = BINDINGS.duplicate(true)


func _init() -> void:
	load_from_disk()


func get_value(key: String) -> Variant:
	return values.get(key, DEFAULTS.get(key))


## Cambia un valore E SALVA SUBITO. Non c'è un pulsante "applica": un pulsante
## che si può dimenticare di premere è un modo di perdere le proprie scelte.
func set_value(key: String, value: Variant) -> void:
	values[key] = value
	save()


func bind(action: String, keycode: int) -> void:
	bindings[action] = keycode
	apply_bindings()
	save()


## Il preset per mancini tocca solo il movimento: le abilità restano dove sono,
## perché sono già raggiungibili da entrambe le mani.
func use_left_handed() -> void:
	for action in LEFT_HANDED:
		bindings[action] = LEFT_HANDED[action]
	apply_bindings()
	save()


func reset_bindings() -> void:
	bindings = BINDINGS.duplicate(true)
	apply_bindings()
	save()


## Riscrive la mappa del motore.
##
## Cancella e riscrive invece di aggiungere: aggiungere lascia il vecchio tasto
## attivo, e chi rimappa si ritrova due tasti che fanno la stessa cosa senza
## capire perché.
##
## Ma cancella SOLO I TASTI, non i pulsanti del mouse. La parata sta sul tasto
## destro e ha anche un tasto di tastiera: cancellando tutto, rimappare la
## tastiera toglierebbe in silenzio il tasto destro — cioè romperebbe la
## meccanica proprio mentre il giocatore la sta personalizzando.
func apply_bindings() -> void:
	for action in bindings:
		if not InputMap.has_action(action):
			InputMap.add_action(action, 0.2)
		for ev_old in InputMap.action_get_events(action):
			if ev_old is InputEventKey:
				InputMap.action_erase_event(action, ev_old)
		var ev := InputEventKey.new()
		ev.physical_keycode = int(bindings[action])
		InputMap.action_add_event(action, ev)


## I pulsanti del mouse gia' assegnati a un'azione, in chiaro. Servono alla
## schermata: una riga "Parry — C" che non dice anche "o tasto destro" e'
## una riga che mente.
func mouse_hint(action: String) -> String:
	if not InputMap.has_action(action):
		return ""
	for ev in InputMap.action_get_events(action):
		if ev is InputEventMouseButton:
			match (ev as InputEventMouseButton).button_index:
				MOUSE_BUTTON_LEFT:
					return "LMB"
				MOUSE_BUTTON_RIGHT:
					return "RMB"
				MOUSE_BUTTON_MIDDLE:
					return "MMB"
	return ""


## Il tasto già occupato da un'altra azione, o stringa vuota. Serve a dirlo
## PRIMA di assegnare: scoprire in partita che due cose sono sullo stesso tasto
## è il modo peggiore di scoprirlo.
func conflict(action: String, keycode: int) -> String:
	for other in bindings:
		if other != action and int(bindings[other]) == keycode:
			return other
	return ""


## La sensibilità nella scala che il giocatore già conosce altrove.
func sensitivity_in_common_scale() -> float:
	return float(get_value("sensitivity")) * COMMON_FPS_FACTOR


func team_colors() -> Dictionary:
	return COLORBLIND.get(String(get_value("colorblind")), COLORBLIND["none"])


func save() -> void:
	var cfg := ConfigFile.new()
	for key in values:
		cfg.set_value("game", key, values[key])
	for action in bindings:
		cfg.set_value("keys", action, bindings[action])
	cfg.save(PATH)


func load_from_disk() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(PATH) != OK:
		return
	for key in DEFAULTS:
		if cfg.has_section_key("game", key):
			values[key] = cfg.get_value("game", key)
	for action in BINDINGS:
		if cfg.has_section_key("keys", action):
			bindings[action] = cfg.get_value("keys", action)
	var legacy := true
	for action in LEGACY_WHEEL_CONFLICTS:
		legacy = legacy and int(bindings.get(action, 0)) == int(LEGACY_WHEEL_CONFLICTS[action])
	if legacy:
		for action in LEGACY_WHEEL_CONFLICTS:
			bindings[action] = BINDINGS[action]
		save()
