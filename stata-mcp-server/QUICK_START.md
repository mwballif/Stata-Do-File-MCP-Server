# Quick Start Guide - Stata MCP Server

## What is this?

A Model Context Protocol (MCP) server specifically designed for managing Stata .do files. It allows AI assistants like Claude to read, write, edit, and search Stata do files within specified directories.

## Quick Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the server:**
   ```bash
   npm run build
   ```

3. **Start the server:**
   ```bash
   ./start_server.sh /path/to/your/stata/projects
   ```

## What can it do?

- ✅ Read Stata .do files
- ✅ Write/create new .do files  
- ✅ Edit existing .do files with text replacements
- ✅ List all .do files in a directory
- ✅ Search for .do files using patterns
- ✅ Get detailed file information (size, line count, etc.)
- ✅ Secure - only works within specified directories

## Example Usage

Once connected to an MCP client like Claude Desktop, you can ask:

- "List all Stata files in my project directory"
- "Read the contents of analysis.do"
- "Create a new Stata file called regression.do"
- "Edit my data_cleaning.do file to add a new variable"
- "Search for all files containing 'regression' in the name"

## Configuration

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "stata": {
      "command": "node",
      "args": [
        "/full/path/to/stata-mcp-server/dist/index.js",
        "/path/to/your/stata/projects"
      ]
    }
  }
}
```

## Security

The server only operates within the directories you specify. It cannot access files outside these directories, ensuring your data remains secure.

## Need Help?

- Check the `README.md` for detailed documentation
- See `examples/example-usage.md` for API examples
- Look at `mcp-config-example.json` for configuration examples 