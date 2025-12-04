# Generates an Implementation Log from template with date/title/author
param(
    [Parameter(Mandatory=$false)][string]$Title,
    [Parameter(Mandatory=$false)][string]$Author
)

$ErrorActionPreference = 'Stop'

# Defaults
if (-not $Author -or $Author.Trim().Length -eq 0) {
    $Author = $env:USERNAME
}
if (-not $Title -or $Title.Trim().Length -eq 0) {
    $Title = 'Implementation Update'
}

# Paths
$root = Split-Path -Parent $PSCommandPath
$docsDir = Join-Path $root 'docs'
$templatePath = Join-Path $docsDir 'Implementation_Log_Template.md'

# Ensure docs dir exists
if (-not (Test-Path $docsDir)) {
    New-Item -ItemType Directory -Path $docsDir | Out-Null
}

# Read template or fallback content
if (Test-Path $templatePath) {
    $template = Get-Content -Path $templatePath -Raw
} else {
    $template = @'
# Implementation Log Template

## Summary
- Title:
- Date:
- Author:
- Scope: (feature, fix, refactor, docs)

## Motivation (Vision Alignment)
- What player problem or pillar does this address?
- Which vision section is impacted? (loop, combat/physics, UX/HUD, modes)

## Changes
- Code paths:
- Systems touched: (Movement, Combat, Casting, Projectile, Resource, Managers)
- Data changed: (e.g., `src/data/SkillData.js`)
- Assets/VFX/HUD updates:

## Behavioral Effects
- Player-facing behavior:
- Edge cases:
- Performance considerations:

## Tests & Verification
- Manual test steps:
- Expected results:
- Regressions checked:

## Documentation
- Updated files: (`README.md`, `DOCUMENTATION_INDEX_CURRENT.md`, others)
- New docs:
- Links:

## Rollback Plan
- How to revert:
- Config flags:
'@
}

# Compose content with header block
$today = Get-Date -Format 'yyyy-MM-dd'
$fileName = "Implementation_Log_$today.md"
$targetPath = Join-Path $docsDir $fileName

$header = @"
# Implementation Log — $today

## Summary
- Title: $Title
- Date: $today
- Author: $Author
- Scope: 

"@

$content = $header + $template

# Write file (avoid overwrite)
if (Test-Path $targetPath) {
    Write-Host "File already exists: $targetPath" -ForegroundColor Yellow
} else {
    Set-Content -Path $targetPath -Value $content -Encoding UTF8
    Write-Host "Created: $targetPath" -ForegroundColor Green
}

# Open in VS Code if available
$codeCmd = Get-Command code -ErrorAction SilentlyContinue
if ($codeCmd) {
    & code $targetPath | Out-Null
}
