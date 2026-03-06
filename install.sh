#!/bin/bash
# SAM v1.0 installer for Linux/macOS
set -e

echo ""
echo "  SAM v1.0 - Serialized Abstraction Machine"
echo "  =========================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "  [!!] Node.js is required. Install from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "  [!!] Node.js 18+ required. Current: $(node -v)"
    exit 1
fi
echo "  [OK] Node.js $(node -v)"

# Clean previous install
if npm list -g sam-cc &> /dev/null; then
    echo "  [..] Removing previous SAM install..."
    npm uninstall -g sam-cc 2>/dev/null || sudo npm uninstall -g sam-cc 2>/dev/null || true
fi

# Install — try without sudo first, fallback to sudo
echo "  [..] Installing from GitHub..."
if npm install -g github:0xMoonStarz/SAM 2>/dev/null; then
    echo "  [OK] Installed"
elif sudo npm install -g github:0xMoonStarz/SAM; then
    echo "  [OK] Installed (with sudo)"
else
    echo "  [!!] Install failed."
    echo "  If using nvm: nvm use 18 && npm install -g github:0xMoonStarz/SAM"
    exit 1
fi

# Verify
echo ""
if ! command -v sam &> /dev/null; then
    echo "  [!!] 'sam' command not found in PATH."
    echo "  Try: export PATH=\"\$(npm config get prefix)/bin:\$PATH\""
    exit 1
fi

echo "  [OK] sam CLI available"
sam doctor

echo ""
echo "  Restart Claude Code to activate SAM."
echo ""
