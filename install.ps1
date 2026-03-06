# SAM installer for Windows
Write-Host "SAM - Serialized Abstraction Machine for Claude Code"
Write-Host "====================================================="

# Check Node.js
try {
    $nodeVersion = (node -v) -replace 'v','' -split '\.' | Select-Object -First 1
    if ([int]$nodeVersion -lt 18) {
        Write-Host "! Node.js 18+ required. Current: $(node -v)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "! Node.js is required. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Install globally
Write-Host "Installing sam-cc globally..."
npm install -g sam-cc

# Run installer
Write-Host "Configuring MCP server..."
sam install

Write-Host ""
Write-Host "d SAM installed successfully!" -ForegroundColor Green
Write-Host "Restart Claude Code to activate."
