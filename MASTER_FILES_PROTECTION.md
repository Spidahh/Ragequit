# 🚨 RAGEQUIT 2: MASTER FILES PROTECTION GUIDE

## ⚠️ CRITICAL MASTER FILES

Questi 4 file sono il **fondamento assoluto** del progetto. Se scompaiono, il progetto è **MORTO**.

```
_BIBLE.md                      # Game Design Document
_TECH_SPEC.md                  # Technical Specifications
_GAME_DATA_SPECS.md            # Data Architecture & Registry
.github/copilot-instructions.md # AI Instructions (Immutable)
```

## 🛡️ PROTECTION MECHANISMS

### 1. `.gitignore` - Git Protection
I file master sono **explicitly protected** nel `.gitignore`:
```
!_BIBLE.md
!_TECH_SPEC.md
!_GAME_DATA_SPECS.md
!.github/
!.github/copilot-instructions.md
```

### 2. Safe Init Scripts
Se devi reinizializzare il progetto **SENZA perdere i file master**:

**On Windows (PowerShell):**
```powershell
.\safe-init.ps1
```

**On macOS/Linux:**
```bash
bash safe-init.sh
```

Questi script:
- ✅ Backup automatico dei file master
- ✅ Puliscono il progetto
- ✅ Reinstallano le dipendenze
- ✅ Ripristinano i file master da backup

## 🔄 EMERGENCY RESTORE

Se i file master **comunque scompaiono**, sono qui come **BACKUP PERMANENTE**:

1. Copia il contenuto dei file dalla sezione "BACKUP" di questo README
2. Ricrea i 4 file nella root del progetto
3. Procedi normalmente

## 📋 MANUAL RESTORE (Se tutto fallisce)

### _BIBLE.md
```markdown
# 🩸 RAGEQUIT 2: THE PVP BIBLE
[Contenuto completo nel README di progetto]
```

### _TECH_SPEC.md
```markdown
# 🛡️ TECHNICAL SPECIFICATIONS (STABLE LOCK)
[Contenuto completo nel README di progetto]
```

### _GAME_DATA_SPECS.md
```markdown
# 📊 DATA & REGISTRY SPECS
[Contenuto completo nel README di progetto]
```

### .github/copilot-instructions.md
```markdown
# ISTRUZIONI OPERATIVE PER L'AGENTE AI
[Contenuto completo nel README di progetto]
```

---

## ✅ VERIFICATION CHECKLIST

Prima di qualsiasi operazione, verifica che i 4 file master siano presenti:

```bash
ls -la _BIBLE.md _TECH_SPEC.md _GAME_DATA_SPECS.md .github/copilot-instructions.md
```

Se uno qualsiasi **manca**, **STOP IMMEDIATO** e ripristina manualmente.

---

**Remember**: The Master Files are the heartbeat of RageQuit 2. Protect them. Always. 🔐⚔️
