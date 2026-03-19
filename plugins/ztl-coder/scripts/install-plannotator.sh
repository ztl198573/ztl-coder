#!/bin/bash
# Install Plannotator CLI for visual plan review
# This script ensures plannotator is available for ztl-coder

set -e

# Check if plannotator is already installed
if command -v plannotator &> /dev/null; then
    echo "✓ Plannotator CLI is already installed"
    plannotator --version 2>/dev/null || true
    exit 0
fi

# Detect OS and install
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo "Installing Plannotator CLI for macOS..."
    curl -fsSL https://plannotator.ai/install.sh | bash
elif [[ "$OSTYPE" == "linux"* ]]; then
    # Linux
    echo "Installing Plannotator CLI for Linux..."
    curl -fsSL https://plannotator.ai/install.sh | bash
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    # Windows (Git Bash / WSL)
    if command -v powershell.exe &> /dev/null; then
        echo "Installing Plannotator CLI for Windows..."
        powershell.exe -Command "irm https://plannotator.ai/install.ps1 | iex"
    else
        echo "Please run this in PowerShell:"
        echo "irm https://plannotator.ai/install.ps1 | iex"
        exit 1
    fi
else
    echo "Unsupported OS: $OSTYPE"
    echo "Please install manually from: https://plannotator.ai"
    exit 1
fi

# Verify installation
if command -v plannotator &> /dev/null; then
    echo "✓ Plannotator CLI installed successfully"
else
    echo "✗ Failed to install Plannotator CLI"
    echo "Please install manually from: https://plannotator.ai"
    exit 1
fi
