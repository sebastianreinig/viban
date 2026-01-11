#!/usr/bin/env node
/**
 * Viban - Kanban Board with MCP Server
 * CLI Entry Point with interactive project selection
 */

import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';
import { startMcpServer } from './mcp-server.js';
import { startWebServer } from './web-server.js';
import { loadConfig, CONFIG_FILENAME } from './config/config.js';
import {
  getLastProjectPath,
  setLastProjectPath,
  getRecentProjects
} from './config/global-config.js';

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Viban - Kanban Board with MCP Server

USAGE:
  viban              Start web UI (default, http://localhost:3000)
  viban --web        Start web UI on default port 3000
  viban --web 8080   Start web UI on custom port
  viban --mcp        Start MCP server (for AI integration)
  viban --help       Show this help message

MODES:
  Web UI (default)   Visual Kanban board at http://localhost:3000
  MCP Server         Headless server for AI integration (--mcp flag)

DESCRIPTION:
  Viban is a Kanban board that integrates with AI coding assistants via the
  Model Context Protocol (MCP). It provides tools for managing tasks across
  four columns: Backlog, Todo, Review, and Done.

  Configuration is stored in ${CONFIG_FILENAME} and tasks in tasks.json.

MCP INTEGRATION:
  Add to your claude_desktop_config.json or Cursor settings:

  {
    "mcpServers": {
      "viban": {
        "command": "node",
        "args": ["/path/to/viban/dist/index.js", "--mcp"]
      }
    }
  }

  The MCP server uses the last selected project path, or set VIBAN_PROJECT_PATH
  environment variable to override.
`);
}

/**
 * Create readline interface for prompting
 */
function createReadline(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Prompt user for input
 */
function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Interactive project selection
 */
async function selectProject(): Promise<string> {
  const rl = createReadline();

  console.log('\n🎯 Viban - Kanban Board with MCP Server\n');

  const lastPath = getLastProjectPath();
  const recentProjects = getRecentProjects();

  // Show recent projects if available
  if (recentProjects.length > 0) {
    console.log('Recent projects:');
    recentProjects.forEach((p, i) => {
      const marker = p === lastPath ? ' (last used)' : '';
      console.log(`  [${i + 1}] ${p}${marker}`);
    });
    console.log();
  }

  // Default suggestion
  const defaultPath = lastPath || process.cwd();

  const input = await prompt(
    rl,
    `Enter project path (or number, default: ${defaultPath}): `
  );

  rl.close();

  let projectPath: string;

  if (!input) {
    // Use default
    projectPath = defaultPath;
  } else if (/^\d+$/.test(input)) {
    // Selected from recent projects
    const index = parseInt(input) - 1;
    if (index >= 0 && index < recentProjects.length) {
      projectPath = recentProjects[index];
    } else {
      console.error('Invalid selection');
      process.exit(1);
    }
  } else {
    // New path entered
    projectPath = path.resolve(input);
  }

  return projectPath;
}

/**
 * Initialize project at path
 */
function initializeProject(projectPath: string): void {
  // Ensure directory exists
  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true });
    console.log(`📁 Created project directory: ${projectPath}`);
  }

  // Load or create config (this creates .config-viban.yml if it doesn't exist)
  const config = loadConfig(projectPath);

  // Save as last used project
  setLastProjectPath(projectPath);

  console.log(`\n✅ Board initialized!`);
  console.log(`   Project: ${projectPath}`);
  console.log(`   Board: ${config.boardName}`);
  console.log(`   Tasks: ${config.tasksFile}`);
}

/**
 * Run MCP server mode
 */
async function runMcpMode(): Promise<void> {
  // Priority: env var > last project path > current directory
  let projectPath = process.env.VIBAN_PROJECT_PATH
    || getLastProjectPath()
    || process.cwd();

  projectPath = path.resolve(projectPath);

  // Initialize project if needed
  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true });
  }

  const config = loadConfig(projectPath);

  // Log to stderr so it doesn't interfere with MCP protocol on stdout
  console.error(`Viban MCP Server starting...`);
  console.error(`Project: ${projectPath}`);
  console.error(`Board: ${config.boardName}`);

  await startMcpServer(projectPath);
}

/**
 * Run interactive mode
 */
async function runInteractiveMode(): Promise<void> {
  const projectPath = await selectProject();
  initializeProject(projectPath);

  console.log(`\n📋 Starting MCP server...`);
  console.log(`   (Waiting for MCP client connection via stdio)\n`);

  await startMcpServer(projectPath);
}

/**
 * Run web server mode
 */
async function runWebMode(port: number): Promise<void> {
  // Try to use last project path if available
  const lastProject = getLastProjectPath();

  console.log('\n🎯 Viban - Kanban Board\n');

  const server = await startWebServer(port, lastProject || undefined);

  if (lastProject) {
    console.log(`📂 Project: ${lastProject}`);
  } else {
    console.log('📂 No project selected - open the web UI to select one');
  }

  console.log(`\n✅ Open your browser to: http://localhost:${port}\n`);
  console.log('Press Ctrl+C to stop the server.');
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Check for help flag
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  // Check for MCP mode
  if (args.includes('--mcp')) {
    await runMcpMode();
    return;
  }

  // Web mode (default)
  const webIndex = args.indexOf('--web');
  let port = 3000;

  if (webIndex !== -1 && args[webIndex + 1]) {
    const portArg = parseInt(args[webIndex + 1]);
    if (!isNaN(portArg)) {
      port = portArg;
    }
  }

  await runWebMode(port);
}

// Run main
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
