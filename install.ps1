# SAM v1.0 installer for Windows
Write-Host ""
Write-Host "  SAM v1.0 - Serialized Abstraction Machine" -ForegroundColor Cyan
Write-Host "  ==========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
try {
    $nodeVersion = (node -v) -replace 'v','' -split '\.' | Select-Object -First 1
    if ([int]$nodeVersion -lt 18) {
        Write-Host "  [!!] Node.js 18+ required. Current: $(node -v)" -ForegroundColor Red
        exit 1
    }
    Write-Host "  [OK] Node.js $(node -v)" -ForegroundColor Green
} catch {
    Write-Host "  [!!] Node.js is required. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Clean previous install
$installed = npm list -g sam-cc 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [..] Removing previous SAM install..."
    npm uninstall -g sam-cc 2>$null
}

# Install from GitHub
Write-Host "  [..] Installing from GitHub..."
npm install -g github:0xMoonStarz/SAM
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [!!] Install failed. Try running as Administrator." -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] Installed" -ForegroundColor Green

# Verify
Write-Host ""
$samCmd = Get-Command sam -ErrorAction SilentlyContinue
if (-not $samCmd) {
    Write-Host "  [!!] 'sam' command not found in PATH." -ForegroundColor Red
    exit 1
}

Write-Host "  [OK] sam CLI available" -ForegroundColor Green
sam doctor

Write-Host ""
Write-Host "  Restart Claude Code to activate SAM." -ForegroundColor Green
Write-Host ""
