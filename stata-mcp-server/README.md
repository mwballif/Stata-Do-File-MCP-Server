# Stata MCP Server

A Model Context Protocol (MCP) server specifically designed for managing Stata .do files. This server provides tools for reading, writing, editing, and searching Stata do files within specified directories.

## Features

- **Read Stata Files**: Read entire .do files or specific portions (head/tail)
- **Write Stata Files**: Create or overwrite .do files with new content
- **Edit Stata Files**: Apply text replacements with dry-run preview capability
- **List Stata Files**: Find all .do files in a directory (with optional recursive search)
- **Create Stata Files**: Create new .do files with optional initial content
- **Search Stata Files**: Search for .do files using glob patterns
- **Get File Info**: Get detailed information about .do files including line count and content analysis

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the server:
```bash
npm run build
```

## Usage

### Command Line

Start the server with one or more allowed directories:

```bash
node dist/index.js /path/to/stata/project /another/stata/directory
```

### MCP Client Configuration

Add this server to your MCP client configuration:

```json
{
  "mcpServers": {
    "stata": {
      "command": "node",
      "args": ["/path/to/stata-mcp-server/dist/index.js", "/path/to/stata/project"],
      "env": {}
    }
  }
}
```

## Available Tools

### read_stata_file
Read a Stata .do file and return its contents.

**Parameters:**
- `path` (string): Path to the Stata .do file
- `tail` (number, optional): Return only the last N lines
- `head` (number, optional): Return only the first N lines

### write_stata_file
Write content to a Stata .do file.

**Parameters:**
- `path` (string): Path to the Stata .do file
- `content` (string): Content to write to the file

### edit_stata_file
Edit a Stata .do file by applying text replacements.

**Parameters:**
- `path` (string): Path to the Stata .do file
- `edits` (array): Array of edit operations with `oldText` and `newText`
- `dryRun` (boolean, optional): Preview changes without applying them

### list_stata_files
List all Stata .do files in a directory.

**Parameters:**
- `path` (string): Directory path to search
- `recursive` (boolean, optional): Search recursively in subdirectories

### create_stata_file
Create a new Stata .do file.

**Parameters:**
- `path` (string): Path for the new .do file
- `content` (string, optional): Initial content for the file

### search_stata_files
Search for Stata .do files using patterns.

**Parameters:**
- `path` (string): Directory path to search in
- `pattern` (string): Search pattern (supports glob patterns)
- `excludePatterns` (array, optional): Patterns to exclude

### get_stata_file_info
Get detailed information about a Stata .do file.

**Parameters:**
- `path` (string): Path to the Stata .do file

## Security

The server implements strict path validation to ensure it only operates within the specified allowed directories. All file operations are validated against these directories to prevent unauthorized access.

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Watch for changes
npm run watch

# Run tests
npm test
```

## License

MIT 