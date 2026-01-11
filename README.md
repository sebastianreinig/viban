# Viban

**A Kanban Board with MCP Server Integration for AI-Assisted Task Management**

Viban is a lightweight TypeScript Kanban board that integrates with AI coding assistants via the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/). It enables AI tools like Claude, Cursor, or Antigravity to manage development tasks programmatically.

## Features

- 🎯 **4 Kanban Columns**: Backlog → Todo → Review → Done
- 🌐 **Web UI**: Visual board at http://localhost:3000
- 🌙 **Light/Dark Mode**: Toggle between themes
- 🤖 **MCP Server**: 9 tools for AI integration
- 📁 **File-Based Storage**: Tasks stored in JSON, config in YAML
- ⚡ **Lightweight**: No database required

## Quick Start

### Option 1: Run Locally (npm)

```bash
# Clone the repository
git clone https://github.com/yourusername/viban.git
cd viban

# Install dependencies
npm install

# Build
npm run build

# Run interactively (prompts for project path)
node dist/index.js

# Or run as MCP server (uses last project or current dir)
node dist/index.js --mcp
```

### Option 3: Development Mode

```bash
# Run in dev mode (interactive)
npm run dev

# Or run as MCP server in dev mode
npm run dev -- --mcp
```

## Configuration

Viban stores its configuration in `.config-viban.yml` in your project directory:

```yaml
boardName: "My Project"
tasksFile: "tasks.json"
createdAt: "2026-01-11T11:20:30+01:00"
```

Tasks are stored in `tasks.json`:

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Implement user authentication",
    "description": "Add login/logout functionality",
    "column": "todo",
    "priority": "high",
    "createdAt": "2026-01-11T11:20:30+01:00",
    "updatedAt": "2026-01-11T11:20:30+01:00"
  }
]
```

## MCP Integration

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "viban": {
      "command": "node",
      "args": ["/absolute/path/to/viban/dist/index.js", "--mcp"],
      "env": {
        "VIBAN_PROJECT_PATH": "/path/to/your/project"
      }
    }
  }
}
```

### Cursor

Add to your MCP settings:

```json
{
  "viban": {
    "command": "node",
    "args": ["/absolute/path/to/viban/dist/index.js", "--mcp"],
    "env": {
      "VIBAN_PROJECT_PATH": "/path/to/your/project"
    }
  }
}
```

### Antigravity

Add to your Antigravity MCP settings:

```json
{
  "mcpServers": {
    "viban": {
      "command": "node",
      "args": [
        "c:/Users/Seb/Documents/viban/dist/index.js",
        "--mcp"
      ],
      "env": {
        "VIBAN_PROJECT_PATH": "C:/Users/Seb/Documents/viban_test"
      }
    }
  }
}
```

> **Note**: The MCP server uses the `VIBAN_PROJECT_PATH` environment variable, or falls back to the last selected project path from interactive mode.

## Available MCP Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_tasks` | Get all tasks, optionally filtered by column | `column?`: backlog, todo, review, done |
| `get_todo_tasks` | Get tasks in the TODO column | - |
| `create_task` | Create a new task | `title`, `description?`, `column?`, `priority?` |
| `update_task` | Update task properties | `id`, `title?`, `description?`, `priority?` |
| `move_task` | Move task to a column | `id`, `column` |
| `move_to_review` | Move task to REVIEW | `id` |
| `complete_task` | Move task to DONE | `id` |
| `delete_task` | Delete a task | `id` |
| `get_board_stats` | Get task counts per column | - |

## Available MCP Resources

| Resource URI | Description |
|--------------|-------------|
| `kanban://board` | Full board state (tasks + config) |
| `kanban://tasks/todo` | Current TODO tasks |

## AI Workflow Example

1. **AI gets current tasks**:
   ```
   "Show me the current TODO tasks"
   → Calls get_todo_tasks
   ```

2. **AI works on a task**:
   ```
   "Work on task: Implement login functionality"
   → AI implements the feature
   ```

3. **AI marks task for review**:
   ```
   "I've completed the task, move it to review"
   → Calls move_to_review(id)
   ```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev -- /path/to/project

# Run tests
npm test

# Build for production
npm run build
```

## Project Structure

```
viban/
├── src/
│   ├── index.ts          # CLI entry point
│   ├── mcp-server.ts     # MCP server implementation
│   ├── board/
│   │   ├── types.ts      # TypeScript interfaces
│   │   ├── board.ts      # Board management logic
│   │   └── storage.ts    # JSON file storage
│   └── config/
│       └── config.ts     # YAML config parser
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## License

MIT
