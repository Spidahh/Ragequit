# SAFE INITIALIZATION SCRIPT (PowerShell)
# Questo script inizializza il progetto SENZA TOCCARE i file master

Write-Host "🛡️ SAFE INIT: Protecting master files..." -ForegroundColor Cyan

# Lista di file che NON DEVONO ESSERE TOCCATI
$protectedFiles = @(
  "_BIBLE.md",
  "_TECH_SPEC.md",
  "_GAME_DATA_SPECS.md",
  ".github\copilot-instructions.md",
  ".gitignore"
)

# Backup dei file protetti
Write-Host "📦 Backing up master files..." -ForegroundColor Yellow
foreach ($file in $protectedFiles) {
  if (Test-Path $file) {
    Copy-Item $file "$file.backup" -Force
    Write-Host "✅ Backed up: $file" -ForegroundColor Green
  }
}

# Pulisci il progetto (tranne i file protetti)
Write-Host "🧹 Cleaning project structure..." -ForegroundColor Yellow
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force src -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force public -ErrorAction SilentlyContinue
Get-Item *.config.ts, *.config.js, *.html -ErrorAction SilentlyContinue | Remove-Item -Force

# Installa dipendenze
npm install --legacy-peer-deps

# Ripristina i file protetti dal backup
Write-Host "🔄 Restoring master files..." -ForegroundColor Yellow
foreach ($file in $protectedFiles) {
  if (Test-Path "$file.backup") {
    Copy-Item "$file.backup" $file -Force
    Remove-Item "$file.backup" -Force
    Write-Host "✅ Restored: $file" -ForegroundColor Green
  }
}

Write-Host "✅ SAFE INIT COMPLETE!" -ForegroundColor Green
Write-Host "📝 Master files are protected and intact." -ForegroundColor Cyan
