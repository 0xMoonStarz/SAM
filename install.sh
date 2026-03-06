#!/bin/bash
# SAM installer for Linux/macOS

set -e

echo "SAM - Serialized Abstraction Machine for Claude Code"
echo "====================================================="

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "! Node.js is required. Install from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "! Node.js 18+ required. Current: $(node -v)"
    exit 1
fi

# Install globally
echo "Installing sam-cc globally..."
npm install -g sam-cc

# Run installer
echo "Configuring MCP server..."
sam install

echo ""
echo "d SAM installed successfully!"
echo "Restart Claude Code to activate."
