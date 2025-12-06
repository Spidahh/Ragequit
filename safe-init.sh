#!/bin/bash
# SAFE INITIALIZATION SCRIPT
# Questo script inizializza il progetto SENZA TOCCARE i file master

echo "🛡️ SAFE INIT: Protecting master files..."

# Lista di file che NON DEVONO ESSERE TOCCATI
PROTECTED_FILES=(
  "_BIBLE.md"
  "_TECH_SPEC.md"
  "_GAME_DATA_SPECS.md"
  ".github/copilot-instructions.md"
  ".gitignore"
)

# Backup dei file protetti
echo "📦 Backing up master files..."
for file in "${PROTECTED_FILES[@]}"; do
  if [ -f "$file" ]; then
    cp "$file" "$file.backup"
    echo "✅ Backed up: $file"
  fi
done

# Pulisci il progetto (tranne i file protetti)
echo "🧹 Cleaning project structure..."
rm -rf node_modules dist src/ public/ *.config.ts *.config.js *.html
npm install --legacy-peer-deps

# Ripristina i file protetti dal backup
echo "🔄 Restoring master files..."
for file in "${PROTECTED_FILES[@]}"; do
  if [ -f "$file.backup" ]; then
    cp "$file.backup" "$file"
    rm "$file.backup"
    echo "✅ Restored: $file"
  fi
done

echo "✅ SAFE INIT COMPLETE!"
echo "📝 Master files are protected and intact."
