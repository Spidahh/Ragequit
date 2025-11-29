# RageQuit

Arena Multiplayer 3D con combattimento magico e meccaniche di squadra.

## Versione 1.1.0 - Novembre 2025

### Nuove Funzionalità
- 🎨 **Texture Gore Rossa**: Terreno completamente ridisegnato con effetti sangue e gore
- 🗺️ **Mappa FFA Rivoluzionata**: Spawn random in tutta la mappa, muri perimetrali, ostacoli sparsi
- 💬 **Sistema Chat**: Chat draggabile integrata con multiplayer in tempo reale
- 🎯 **Contatore Kill Persistente**: Sistema di tracking kill con localStorage
- 📊 **Scoreboard Dinamico**: Lista FFA ordinata e tabella squadre in tempo reale
- 🏛️ **Tempio di Rigenerazione**: Zona speciale di healing nella mappa TEAM
- ✨ **Glow Nemici**: Effetti emissivi sui giocatori nemici per migliore visibilità
- 🎨 **Colori Squadra**: Armature colorate per ogni team (Rosso, Nero, Verde, Viola)
- 🖱️ **Sensibilità Mouse**: Slider configurabile (0.1-3.0x)
- ⌨️ **Pannello Comandi**: UI ridisegnata per keybinds accessibile dal menu
- 🎮 **Free Look**: Modalità Ctrl per movimento libero della camera
- 🌟 **Menu Principale Ridisegnato**: Logo ingrandito, nuovi bottoni Comandi/Audio
- 👥 **Contatori Team Live**: Visualizzazione giocatori per squadra nel menu

### Miglioramenti
- ⚡ Jump cooldown ridotto (1000ms → 300ms)
- 🚫 Rimossa collisione con alberi e case per movimento fluido
- 💡 Illuminazione migliorata (ambient + directional light potenziati)
- 📏 UI compattata e riposizionata per migliore usabilità
- 🎯 Cielo schiarito per visibilità ottimale

### Fix Tecnici
- Correzione bug mouse sensitivity (gestione NaN)
- Fix pointer lock con free look
- Correzione chiusura pannello comandi dal menu
- Fix spawn TEAM con variazione casuale

## Stato
- Tutti i riferimenti a "Darkfall" sono stati sostituiti con "RageQuit".
- `package.json` aggiornato (`name`: `ragequit-multiplayer`).
- `.gitignore` aggiunto e `node_modules` rimosso dall'indice Git.

## Requisiti
- Node.js (LTS) installato sulla macchina.

## Avvio (PowerShell)
```powershell
cd 'c:\CARTELLE PRINCIPALI\GRAFICA\GENERALE\RageQuit'
npm install
node server.js
# oppure, se presente,
# npm start
```

## Note
- Se vuoi pushare il repo su un remoto, aggiungi un remote e poi `git push -u origin main` (o branch desiderato).
- Se preferisci che configuri il remote o esegua altre azioni, indicami l'URL del remote.
