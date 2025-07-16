#!/bin/bash

# Stata MCP Server Startup Script

# Check if a directory was provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <stata-project-directory> [additional-directories...]"
    echo "Example: $0 ~/stata-projects ~/research/data"
    exit 1
fi

# Check if the built server exists
if [ ! -f "dist/index.js" ]; then
    echo "Error: Server not built. Run 'npm run build' first."
    exit 1
fi

# Start the server with the provided directories
echo "Starting Stata MCP server with directories: $@"
node dist/index.js "$@" 