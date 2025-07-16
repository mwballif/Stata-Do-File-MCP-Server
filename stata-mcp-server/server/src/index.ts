#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
  RootsListChangedNotificationSchema,
  type Root,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from 'os';
import { randomBytes } from 'crypto';
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { diffLines, createTwoFilesPatch } from 'diff';
import { minimatch } from 'minimatch';
import { isPathWithinAllowedDirectories } from './path-validation.js';
import { getValidRootDirectories } from './roots-utils.js';

// Command line argument parsing
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: mcp-server-stata [stata-project-directory] [additional-directories...]");
  console.error("Note: Stata project directories can be provided via:");
  console.error("  1. Command-line arguments (shown above)");
  console.error("  2. MCP roots protocol (if client supports it)");
  console.error("At least one directory must be provided by EITHER method for the server to operate.");
}

// Normalize all paths consistently
function normalizePath(p: string): string {
  return path.normalize(p);
}

function expandHome(filepath: string): string {
  if (filepath.startsWith('~/') || filepath === '~') {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}

// Store allowed directories in normalized and resolved form
let allowedDirectories = await Promise.all(
  args.map(async (dir) => {
    const expanded = expandHome(dir);
    const absolute = path.resolve(expanded);
    try {
      // Resolve symlinks in allowed directories during startup
      const resolved = await fs.realpath(absolute);
      return normalizePath(resolved);
    } catch (error) {
      // If we can't resolve (doesn't exist), use the normalized absolute path
      // This allows configuring allowed dirs that will be created later
      return normalizePath(absolute);
    }
  })
);

// Validate that all directories exist and are accessible
await Promise.all(args.map(async (dir) => {
  try {
    const stats = await fs.stat(expandHome(dir));
    if (!stats.isDirectory()) {
      console.error(`Error: ${dir} is not a directory`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error accessing directory ${dir}:`, error);
    process.exit(1);
  }
}));

// Security utilities
async function validatePath(requestedPath: string): Promise<string> {
  const expandedPath = expandHome(requestedPath);
  const absolute = path.isAbsolute(expandedPath)
    ? path.resolve(expandedPath)
    : path.resolve(process.cwd(), expandedPath);

  const normalizedRequested = normalizePath(absolute);

  // Check if path is within allowed directories
  const isAllowed = isPathWithinAllowedDirectories(normalizedRequested, allowedDirectories);
  if (!isAllowed) {
    throw new Error(`Access denied - path outside allowed directories: ${absolute} not in ${allowedDirectories.join(', ')}`);
  }

  // Handle symlinks by checking their real path
  try {
    const realPath = await fs.realpath(absolute);
    const normalizedReal = normalizePath(realPath);
    if (!isPathWithinAllowedDirectories(normalizedReal, allowedDirectories)) {
      throw new Error(`Access denied - symlink target outside allowed directories: ${realPath} not in ${allowedDirectories.join(', ')}`);
    }
    return realPath;
  } catch (error) {
    // For new files that don't exist yet, verify parent directory
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      const parentDir = path.dirname(absolute);
      try {
        const realParentPath = await fs.realpath(parentDir);
        const normalizedParent = normalizePath(realParentPath);
        if (!isPathWithinAllowedDirectories(normalizedParent, allowedDirectories)) {
          throw new Error(`Access denied - parent directory outside allowed directories: ${realParentPath} not in ${allowedDirectories.join(', ')}`);
        }
        return absolute;
      } catch {
        throw new Error(`Parent directory does not exist: ${parentDir}`);
      }
    }
    throw error;
  }
}

// Schema definitions for Stata-specific operations
const ReadStataFileArgsSchema = z.object({
  path: z.string().describe('Path to the Stata .do file'),
  tail: z.number().optional().describe('If provided, returns only the last N lines of the file'),
  head: z.number().optional().describe('If provided, returns only the first N lines of the file')
});

const WriteStataFileArgsSchema = z.object({
  path: z.string().describe('Path to the Stata .do file'),
  content: z.string().describe('Content to write to the file'),
});

const EditOperation = z.object({
  oldText: z.string().describe('Text to search for - must match exactly'),
  newText: z.string().describe('Text to replace with')
});

const EditStataFileArgsSchema = z.object({
  path: z.string().describe('Path to the Stata .do file'),
  edits: z.array(EditOperation),
  dryRun: z.boolean().default(false).describe('Preview changes using git-style diff format')
});

const ListStataFilesArgsSchema = z.object({
  path: z.string().describe('Directory path to search for Stata .do files'),
  recursive: z.boolean().optional().default(false).describe('Search recursively in subdirectories'),
});

const CreateStataFileArgsSchema = z.object({
  path: z.string().describe('Path for the new Stata .do file'),
  content: z.string().optional().describe('Initial content for the file'),
});

const SearchStataFilesArgsSchema = z.object({
  path: z.string().describe('Directory path to search in'),
  pattern: z.string().describe('Search pattern (supports glob patterns)'),
  excludePatterns: z.array(z.string()).optional().default([]).describe('Patterns to exclude')
});

const GetStataFileInfoArgsSchema = z.object({
  path: z.string().describe('Path to the Stata .do file'),
});

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

interface StataFileInfo {
  size: number;
  created: Date;
  modified: Date;
  accessed: Date;
  isDirectory: boolean;
  isFile: boolean;
  permissions: string;
  lineCount?: number;
  hasComments?: boolean;
  hasCommands?: boolean;
}

// Server setup
const server = new Server(
  {
    name: "stata-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Utility functions
async function getStataFileStats(filePath: string): Promise<StataFileInfo> {
  const stats = await fs.stat(filePath);
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  
  return {
    size: stats.size,
    created: stats.birthtime,
    modified: stats.mtime,
    accessed: stats.atime,
    isDirectory: stats.isDirectory(),
    isFile: stats.isFile(),
    permissions: stats.mode.toString(8),
    lineCount: lines.length,
    hasComments: lines.some(line => line.trim().startsWith('*') || line.trim().startsWith('//')),
    hasCommands: lines.some(line => line.trim().length > 0 && !line.trim().startsWith('*') && !line.trim().startsWith('//'))
  };
}

async function searchStataFiles(
  rootPath: string,
  pattern: string,
  excludePatterns: string[] = []
): Promise<string[]> {
  const results: string[] = [];
  
  async function search(currentPath: string) {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        // Skip excluded patterns
        if (excludePatterns.some(excludePattern => 
          minimatch(fullPath, excludePattern) || minimatch(entry.name, excludePattern)
        )) {
          continue;
        }
        
        if (entry.isDirectory()) {
          await search(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.do')) {
          // Check if file matches the pattern
          if (minimatch(fullPath, pattern) || minimatch(entry.name, pattern)) {
            results.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Skip directories we can't access
      console.warn(`Cannot access directory ${currentPath}:`, error);
    }
  }
  
  await search(rootPath);
  return results;
}

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function createUnifiedDiff(originalContent: string, newContent: string, filepath: string = 'file'): string {
  const patch = createTwoFilesPatch(filepath, filepath, originalContent, newContent);
  return patch;
}

async function applyStataFileEdits(
  filePath: string,
  edits: Array<{oldText: string, newText: string}>,
  dryRun = false
): Promise<string> {
  let content = await fs.readFile(filePath, 'utf-8');
  const originalContent = content;
  
  for (const edit of edits) {
    if (!content.includes(edit.oldText)) {
      throw new Error(`Edit failed: Could not find text "${edit.oldText}" in file`);
    }
    content = content.replace(edit.oldText, edit.newText);
  }
  
  if (dryRun) {
    return createUnifiedDiff(originalContent, content, filePath);
  }
  
  await fs.writeFile(filePath, content, 'utf-8');
  return `Successfully applied ${edits.length} edit(s) to ${filePath}`;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function tailStataFile(filePath: string, numLines: number): Promise<string> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const tailLines = lines.slice(-numLines);
  return tailLines.join('\n');
}

async function headStataFile(filePath: string, numLines: number): Promise<string> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const headLines = lines.slice(0, numLines);
  return headLines.join('\n');
}

// Tool definitions
const tools = [
  {
    name: "read_stata_file",
    description: "Read a Stata .do file and return its contents",
    inputSchema: zodToJsonSchema(ReadStataFileArgsSchema),
  },
  {
    name: "write_stata_file",
    description: "Write content to a Stata .do file",
    inputSchema: zodToJsonSchema(WriteStataFileArgsSchema),
  },
  {
    name: "edit_stata_file",
    description: "Edit a Stata .do file by applying text replacements",
    inputSchema: zodToJsonSchema(EditStataFileArgsSchema),
  },
  {
    name: "list_stata_files",
    description: "List all Stata .do files in a directory",
    inputSchema: zodToJsonSchema(ListStataFilesArgsSchema),
  },
  {
    name: "create_stata_file",
    description: "Create a new Stata .do file",
    inputSchema: zodToJsonSchema(CreateStataFileArgsSchema),
  },
  {
    name: "search_stata_files",
    description: "Search for Stata .do files using patterns",
    inputSchema: zodToJsonSchema(SearchStataFilesArgsSchema),
  },
  {
    name: "get_stata_file_info",
    description: "Get detailed information about a Stata .do file",
    inputSchema: zodToJsonSchema(GetStataFileInfoArgsSchema),
  },
];

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "read_stata_file": {
      const { path: filePath, tail, head } = ReadStataFileArgsSchema.parse(args);
      const validatedPath = await validatePath(filePath);
      
      if (!validatedPath.endsWith('.do')) {
        throw new Error('File must be a Stata .do file');
      }
      
      if (tail) {
        return { content: [{ type: "text", text: await tailStataFile(validatedPath, tail) }] };
      }
      
      if (head) {
        return { content: [{ type: "text", text: await headStataFile(validatedPath, head) }] };
      }
      
      const content = await fs.readFile(validatedPath, 'utf-8');
      return { content: [{ type: "text", text: content }] };
    }

    case "write_stata_file": {
      const { path: filePath, content } = WriteStataFileArgsSchema.parse(args);
      const validatedPath = await validatePath(filePath);
      
      if (!validatedPath.endsWith('.do')) {
        throw new Error('File must be a Stata .do file');
      }
      
      await fs.writeFile(validatedPath, normalizeLineEndings(content), 'utf-8');
      return { content: [{ type: "text", text: `Successfully wrote to ${validatedPath}` }] };
    }

    case "edit_stata_file": {
      const { path: filePath, edits, dryRun } = EditStataFileArgsSchema.parse(args);
      const validatedPath = await validatePath(filePath);
      
      if (!validatedPath.endsWith('.do')) {
        throw new Error('File must be a Stata .do file');
      }
      
      const result = await applyStataFileEdits(validatedPath, edits, dryRun);
      return { content: [{ type: "text", text: result }] };
    }

    case "list_stata_files": {
      const { path: dirPath, recursive } = ListStataFilesArgsSchema.parse(args);
      const validatedPath = await validatePath(dirPath);
      
      const stats = await fs.stat(validatedPath);
      if (!stats.isDirectory()) {
        throw new Error('Path must be a directory');
      }
      
      const pattern = recursive ? '**/*.do' : '*.do';
      const files = await searchStataFiles(validatedPath, pattern);
      
      const fileList = await Promise.all(
        files.map(async (file) => {
          const relativePath = path.relative(validatedPath, file);
          const stats = await fs.stat(file);
          return `${relativePath} (${formatSize(stats.size)})`;
        })
      );
      
      return { 
        content: [{ 
          type: "text", 
          text: `Found ${fileList.length} Stata .do files:\n${fileList.join('\n')}` 
        }] 
      };
    }

    case "create_stata_file": {
      const { path: filePath, content = '' } = CreateStataFileArgsSchema.parse(args);
      const validatedPath = await validatePath(filePath);
      
      if (!validatedPath.endsWith('.do')) {
        throw new Error('File must have a .do extension');
      }
      
      await fs.writeFile(validatedPath, normalizeLineEndings(content), 'utf-8');
      return { content: [{ type: "text", text: `Successfully created ${validatedPath}` }] };
    }

    case "search_stata_files": {
      const { path: dirPath, pattern, excludePatterns } = SearchStataFilesArgsSchema.parse(args);
      const validatedPath = await validatePath(dirPath);
      
      const stats = await fs.stat(validatedPath);
      if (!stats.isDirectory()) {
        throw new Error('Path must be a directory');
      }
      
      const files = await searchStataFiles(validatedPath, pattern, excludePatterns);
      
      const fileList = files.map(file => path.relative(validatedPath, file));
      
      return { 
        content: [{ 
          type: "text", 
          text: `Found ${fileList.length} matching Stata .do files:\n${fileList.join('\n')}` 
        }] 
      };
    }

    case "get_stata_file_info": {
      const { path: filePath } = GetStataFileInfoArgsSchema.parse(args);
      const validatedPath = await validatePath(filePath);
      
      if (!validatedPath.endsWith('.do')) {
        throw new Error('File must be a Stata .do file');
      }
      
      const info = await getStataFileStats(validatedPath);
      
      const infoText = `File: ${path.basename(validatedPath)}
Size: ${formatSize(info.size)}
Created: ${info.created.toISOString()}
Modified: ${info.modified.toISOString()}
Permissions: ${info.permissions}
Line Count: ${info.lineCount}
Has Comments: ${info.hasComments}
Has Commands: ${info.hasCommands}`;
      
      return { content: [{ type: "text", text: infoText }] };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Handle roots protocol for dynamic directory configuration
server.setRequestHandler(RootsListChangedNotificationSchema, async (request) => {
  const params = request.params as any;
  if (params && params.roots) {
    await updateAllowedDirectoriesFromRoots(params.roots);
  }
  return {};
});

async function updateAllowedDirectoriesFromRoots(requestedRoots: any[]) {
  const newAllowedDirectories = await Promise.all(
    requestedRoots.map(async (root) => {
      const uri = root.uri;
      const uriString = typeof uri === 'string' ? uri : uri.pathname || uri;
      const expanded = expandHome(uriString);
      const absolute = path.resolve(expanded);
      try {
        const resolved = await fs.realpath(absolute);
        return normalizePath(resolved);
      } catch (error) {
        return normalizePath(absolute);
      }
    })
  );
  
  allowedDirectories = newAllowedDirectories;
  console.log(`Updated allowed directories to: ${allowedDirectories.join(', ')}`);
}

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Stata MCP server started");
}

runServer().catch((error) => {
  console.error("Failed to run server:", error);
  process.exit(1);
}); 