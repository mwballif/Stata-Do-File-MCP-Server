# Stata MCP Server Usage Examples

This document provides examples of how to use the Stata MCP server with various tools.

## Starting the Server

```bash
# Start with a single directory
./start_server.sh ~/stata-projects

# Start with multiple directories
./start_server.sh ~/stata-projects ~/research/data ~/work/analysis
```

## Tool Examples

### 1. List Stata Files

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "list_stata_files",
    "arguments": {
      "path": "/path/to/stata/projects",
      "recursive": true
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Found 3 Stata .do files:\nanalysis.do (2.1 KB)\nclean_data.do (1.5 KB)\nregression.do (3.2 KB)"
      }
    ]
  }
}
```

### 2. Read a Stata File

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "read_stata_file",
    "arguments": {
      "path": "/path/to/stata/projects/analysis.do"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "* Analysis script\n* Load data\nuse \"data.dta\", clear\n\n* Summary statistics\nsummarize var1 var2 var3\n\n* Regression analysis\nregress y x1 x2 x3"
      }
    ]
  }
}
```

### 3. Create a New Stata File

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "create_stata_file",
    "arguments": {
      "path": "/path/to/stata/projects/new_analysis.do",
      "content": "* New analysis script\n* Created by MCP server\n\nuse \"data.dta\", clear\n\n* Add your analysis here"
    }
  }
}
```

### 4. Edit a Stata File

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "edit_stata_file",
    "arguments": {
      "path": "/path/to/stata/projects/analysis.do",
      "edits": [
        {
          "oldText": "summarize var1 var2 var3",
          "newText": "summarize var1 var2 var3 var4"
        }
      ],
      "dryRun": false
    }
  }
}
```

### 5. Search for Stata Files

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "search_stata_files",
    "arguments": {
      "path": "/path/to/stata/projects",
      "pattern": "*analysis*.do",
      "excludePatterns": ["*temp*", "*backup*"]
    }
  }
}
```

### 6. Get File Information

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "tools/call",
  "params": {
    "name": "get_stata_file_info",
    "arguments": {
      "path": "/path/to/stata/projects/analysis.do"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "File: analysis.do\nSize: 2.1 KB\nCreated: 2024-01-15T10:30:00.000Z\nModified: 2024-01-15T14:45:00.000Z\nPermissions: 644\nLine Count: 25\nHas Comments: true\nHas Commands: true"
      }
    ]
  }
}
```

## Integration with MCP Clients

### Claude Desktop

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "stata": {
      "command": "node",
      "args": [
        "/path/to/stata-mcp-server/dist/index.js",
        "/path/to/your/stata/projects"
      ]
    }
  }
}
```

### Other MCP Clients

Most MCP clients follow a similar configuration pattern. Check your client's documentation for specific configuration options.

## Security Notes

- The server only operates within the directories you specify
- All file operations are validated against allowed directories
- Symlinks are resolved and checked for security
- The server cannot access files outside the specified directories 