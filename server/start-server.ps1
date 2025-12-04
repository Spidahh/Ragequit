# RageQuit Server - Quick Install & Start
# PowerShell Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   RageQuit Multiplayer Server Setup   " -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "[1/4] Checking Node.js..." -ForegroundColor White
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Navigate to server directory
Write-Host "[2/4] Navigating to server directory..." -ForegroundColor White
$serverPath = Join-Path $PSScriptRoot ""
Set-Location $serverPath
Write-Host "✓ Directory: $serverPath" -ForegroundColor Green

Write-Host ""

# Install dependencies
Write-Host "[3/4] Installing dependencies..." -ForegroundColor White
Write-Host "This may take a minute..." -ForegroundColor Gray
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Start server
Write-Host "[4/4] Starting server..." -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Server starting at http://localhost:3000" -ForegroundColor Yellow
Write-Host "   Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

npm start
