# MIXAMO — checklist download (l'UNICO passo che richiede il tuo login Adobe)

> Verificato 2026-08-11: mixamo.com è vivo, il catalogo carica, i personaggi sotto ESISTONO
> col nome esatto. Serve solo il login (io non posso inserire credenziali). ~5 min a classe.
> Appena i file sono in `E:/GIOCHI/ASSET_GRAFICA/PERSONAGGI/MIXAMO_STOCK/`, il resto lo faccio io.

## Impostazioni di download (SEMPRE queste)

- Format: **FBX Binary (.fbx)**
- Skin: **With Skin** ← fondamentale (senza, il modello non c'è)
- Frames per Second: 30 · Keyframe Reduction: none

## Per ogni personaggio: 1 download in T-Pose + le animazioni

Cerca il personaggio (tab CHARACTERS), selezionalo, poi tab ANIMATIONS e scarica queste
(cerca per nome; se una manca, la più simile va bene):

| #   | Personaggio (nome esatto)                                            | Classe  |
| --- | -------------------------------------------------------------------- | ------- |
| 1   | **Paladin J Nordstrom**                                              | Tank    |
| 2   | **Erika Archer With Bow/Arrow**                                      | Arciere |
| 3   | **Ninja**                                                            | Ibrido  |
| 4   | (mago: NON esiste su Mixamo — lo risolvo io con AccuRig, vedi sotto) | Mago    |

Animazioni per ciascuno (stesso set, scaricate SUL personaggio selezionato):

1. `Idle` · 2. `Walking` · 3. `Running` · 4. `Left Strafe` · 5. `Right Strafe` ·
2. `Jump` · 7. `Standing React Death Backward` (o `Death`) · 8. `Standing Melee Attack Downward`
   (Paladin/Ninja) **oppure** `Standing Draw Arrow` + `Standing Aim Recoil` (Erika) ·
3. `Standing React Small From Front` (hit react) · 10. `Standing 2H Cast Spell` (se disponibile)

Salva tutto in: `E:/GIOCHI/ASSET_GRAFICA/PERSONAGGI/MIXAMO_STOCK/<NomePersonaggio>/`
(un FBX per animazione va benissimo — li fondo io in un GLB per classe).

## Cosa faccio IO appena i file ci sono

FBX → GLB per classe con clip nominate (Blender headless) → `normalize-glb.mjs` →
path single-GLB già in codice (`_installSingleGlbModel`) → grip armi → verifica
lineup/animshot/testroom → ti mostro i 4 personaggi renderizzati per l'OK finale.
Per il MAGO: scelgo 2-3 candidati CC (Sketchfab/Fab) e te li mostro renderizzati;
il rig lo faccio con AccuRig 2.0 (gratis) + retarget offline in Blender.
