# Stata MCP Server - Desktop Extension Guide

## What is a Desktop Extension (.dxt)?

Desktop Extensions are a new packaging format that makes installing MCP servers as simple as clicking a button in Claude Desktop. They bundle the entire server—including all dependencies—into a single installable package.

## Building the Desktop Extension

### Prerequisites

- Node.js 16+ installed
- zip command available (usually pre-installed on macOS/Linux)

### Quick Build

1. **Build the extension:**
   ```bash
   ./build-extension.sh
   ```

2. **The script will:**
   - Install dependencies
   - Build the TypeScript server
   - Package everything into a `.dxt` file
   - Create a timestamped filename like `stata-mcp-server-20240716-140930.dxt`

## Installing in Claude Desktop

### Method 1: Drag and Drop (Recommended)

1. **Open Claude Desktop**
2. **Go to Settings > Extensions**
3. **Drag your `.dxt` file into the extensions area**
4. **Click "Install"**
5. **Configure your Stata project directories when prompted**

### Method 2: Manual Installation

1. **Copy the `.dxt` file to a known location**
2. **Open Claude Desktop**
3. **Go to Settings > Extensions**
4. **Click "Install Extension"**
5. **Browse to your `.dxt` file and select it**
6. **Follow the installation prompts**

## Configuration

During installation, Claude Desktop will prompt you to configure:

- **Stata Project Directories**: The directories containing your `.do` files
- You can specify multiple directories
- The server will only have access to these directories for security

### Example Configuration

```
Stata Project Directories:
- /Users/username/Documents/stata-projects
- /Users/username/Research/data-analysis
- /Users/username/Work/statistical-models
```

## Using the Extension

Once installed, you can ask Claude to:

- **List Stata files**: "Show me all the .do files in my project"
- **Read files**: "Read the contents of analysis.do"
- **Create files**: "Create a new Stata file called regression.do"
- **Edit files**: "Add a comment to the top of data_cleaning.do"
- **Search files**: "Find all files containing 'regression' in the name"

## Extension Structure

```
stata-mcp-server/
├── manifest.json              # Extension metadata and configuration
├── server/                    # MCP server implementation
│   ├── dist/                  # Built JavaScript files
│   ├── src/                   # TypeScript source files
│   ├── package.json           # Dependencies
│   └── node_modules/          # Bundled dependencies
├── icon.png                   # Extension icon (64x64 PNG)
├── README.md                  # Documentation
└── QUICK_START.md            # Quick start guide
```

## Troubleshooting

### Installation Issues

1. **"Invalid extension format"**
   - Make sure the `.dxt` file was created correctly
   - Try rebuilding with `./build-extension.sh`

2. **"Server failed to start"**
   - Check that Node.js 16+ is installed
   - Verify the server builds correctly: `cd server && npm run build`

3. **"Permission denied"**
   - Make sure the directories you specified exist and are accessible
   - Check file permissions on your Stata project directories

### Runtime Issues

1. **"Access denied" errors**
   - The server only works within the directories you specified
   - Add the correct directories in the configuration

2. **"File not found" errors**
   - Make sure the `.do` files exist in your specified directories
   - Check file paths are correct

## Development

### Modifying the Extension

1. **Edit the server code** in `server/src/`
2. **Update the manifest** if you add new tools or configuration
3. **Rebuild** with `./build-extension.sh`
4. **Reinstall** in Claude Desktop

### Adding New Tools

1. **Add the tool** to `server/src/index.ts`
2. **Update the manifest.json** tools array
3. **Rebuild and reinstall**

### Customizing the Icon

Replace `icon.png` with your own 64x64 PNG icon before building.

## Security Features

- **Directory restrictions**: Only operates within specified directories
- **Path validation**: All file operations are validated
- **Symlink protection**: Resolves and validates symlink targets
- **No external access**: Cannot access files outside allowed directories

## Support

- **Documentation**: See `README.md` for detailed API documentation
- **Examples**: Check `examples/example-usage.md` for usage examples
- **Issues**: Report problems with the extension installation or functionality

## Distribution

To share your extension:

1. **Test thoroughly** on both macOS and Windows
2. **Replace the placeholder icon** with a proper PNG
3. **Update the manifest** with your contact information
4. **Share the `.dxt` file** with other users

Users can install your extension by dragging the `.dxt` file into Claude Desktop's Extensions settings. 