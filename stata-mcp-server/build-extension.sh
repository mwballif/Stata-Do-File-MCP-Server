#!/bin/bash

# Build script for Stata MCP Desktop Extension

echo "Building Stata MCP Desktop Extension..."

# Check if we're in the right directory
if [ ! -f "manifest.json" ]; then
    echo "Error: manifest.json not found. Make sure you're in the extension root directory."
    exit 1
fi

# Build the server
echo "Building server..."
cd server
npm install
npm run build
cd ..

# Create the extension package
echo "Creating .dxt package..."

# Create a temporary directory for packaging
TEMP_DIR=$(mktemp -d)
EXTENSION_NAME="stata-mcp-server-$(date +%Y%m%d-%H%M%S)"

# Copy files to temp directory
cp -r server "$TEMP_DIR/"
cp manifest.json "$TEMP_DIR/"
cp icon.png "$TEMP_DIR/" 2>/dev/null || echo "Warning: icon.png not found, using placeholder"
cp README.md "$TEMP_DIR/"
cp QUICK_START.md "$TEMP_DIR/"

# Create the .dxt file (which is just a zip file)
cd "$TEMP_DIR"
zip -r "../$EXTENSION_NAME.dxt" . -x "*.DS_Store" "*/node_modules/.cache/*" "*/dist/.cache/*"

# Clean up
cd ..
rm -rf "$TEMP_DIR"

echo "✅ Desktop Extension created: $EXTENSION_NAME.dxt"
echo ""
echo "To install in Claude Desktop:"
echo "1. Open Claude Desktop"
echo "2. Go to Settings > Extensions"
echo "3. Drag and drop $EXTENSION_NAME.dxt"
echo "4. Click 'Install'"
echo "5. Configure your Stata project directories"
echo ""
echo "Note: Make sure to replace icon.png with an actual 64x64 PNG icon before distribution." 