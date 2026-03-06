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
    sudo npm uninstall -g sam-cc 2>/dev/null || npm uninstall -g sam-cc 2>/dev/null || true
fi

# Install from GitHub
echo "  [..] Installing from GitHub..."
sudo npm install -g github:0xMoonStarz/SAM 2>/dev/null || npm install -g github:0xMoonStarz/SAM

# Configure
echo "  [..] Configuring MCP server..."
sam install

echo ""
echo "  Done! Restart Claude Code to activate SAM."
echo ""
