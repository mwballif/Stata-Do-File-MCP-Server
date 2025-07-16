# Connecting Stata MCP Server to Claude Desktop

## Step 1: Locate Claude Desktop Configuration

Claude Desktop stores its configuration in different locations depending on your OS:

**macOS:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux:**
```
~/.config/Claude/claude_desktop_config.json
```

## Step 2: Edit the Configuration

1. Open the `claude_desktop_config.json` file in a text editor
2. Add the Stata MCP server configuration to the `mcpServers` section:

```json
{
  "mcpServers": {
    "stata": {
      "command": "node",
      "args": [
        "/Users/mitchell/cursor/stata mcp/stata-mcp-server/dist/index.js",
        "/path/to/your/stata/projects"
      ],
      "env": {}
    }
  }
}
```

**Important:** Replace `/path/to/your/stata/projects` with the actual path to your Stata project directory.

## Step 3: Restart Claude Desktop

1. Close Claude Desktop completely
2. Reopen Claude Desktop
3. The Stata MCP server should now be available

## Step 4: Test the Connection

In Claude Desktop, you can now ask:

- "List all Stata files in my project"
- "Read the contents of analysis.do"
- "Create a new Stata file called regression.do"

## Alternative: Use the Provided Config

You can copy the contents of `claude-desktop-config.json` in this directory and modify the paths as needed.

## Troubleshooting

1. **Server not found**: Make sure the path to `dist/index.js` is correct
2. **Permission denied**: Ensure the server file is executable (`chmod +x dist/index.js`)
3. **Directory not found**: Verify the Stata project directory exists
4. **Server won't start**: Check that you've run `npm install` and `npm run build`

## Example Usage

Once connected, you can ask Claude:

```
"Can you list all the Stata .do files in my project directory?"
```

Claude will use the MCP server to find and list all your Stata files. 