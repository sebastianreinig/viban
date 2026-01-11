/**
 * MCP Server for Viban Kanban Board
 * Exposes kanban operations as tools for AI assistants
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { KanbanBoard } from './board/board.js';
import { COLUMNS, type ColumnType } from './board/types.js';

/**
 * Create and configure the MCP server for a given project path
 */
export function createMcpServer(projectPath: string): McpServer {
    const board = new KanbanBoard(projectPath);

    const server = new McpServer({
        name: 'viban',
        version: '1.0.0',
    });

    // === TOOLS ===

    /**
     * Get tasks from the board
     */
    server.tool(
        'get_tasks',
        'Get all tasks from the Kanban board, optionally filtered by column',
        {
            column: z.enum(['backlog', 'todo', 'review', 'done']).optional()
                .describe('Filter by column: backlog, todo, review, or done'),
        },
        async ({ column }) => {
            const tasks = board.getTasks(column as ColumnType | undefined);
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: JSON.stringify(tasks, null, 2),
                    },
                ],
            };
        }
    );

    /**
     * Get current TODO tasks
     */
    server.tool(
        'get_todo_tasks',
        'Get all tasks in the TODO column - these are tasks ready to be worked on',
        {},
        async () => {
            const tasks = board.getTasks('todo');
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: JSON.stringify(tasks, null, 2),
                    },
                ],
            };
        }
    );

    /**
     * Create a new task
     */
    server.tool(
        'create_task',
        'Create a new task on the Kanban board',
        {
            title: z.string().describe('Task title'),
            description: z.string().optional().describe('Task description'),
            column: z.enum(['backlog', 'todo', 'review', 'done']).optional()
                .describe('Initial column (default: backlog)'),
            priority: z.enum(['low', 'medium', 'high']).optional()
                .describe('Task priority (default: medium)'),
        },
        async ({ title, description, column, priority }) => {
            const task = board.createTask({
                title,
                description,
                column: column as ColumnType | undefined,
                priority,
            });
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `Created task: ${JSON.stringify(task, null, 2)}`,
                    },
                ],
            };
        }
    );

    /**
     * Update a task
     */
    server.tool(
        'update_task',
        'Update an existing task properties',
        {
            id: z.string().describe('Task ID'),
            title: z.string().optional().describe('New title'),
            description: z.string().optional().describe('New description'),
            priority: z.enum(['low', 'medium', 'high']).optional().describe('New priority'),
        },
        async ({ id, title, description, priority }) => {
            const task = board.updateTask(id, { title, description, priority });
            if (!task) {
                return {
                    content: [{ type: 'text' as const, text: `Error: Task with ID ${id} not found` }],
                    isError: true,
                };
            }
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `Updated task: ${JSON.stringify(task, null, 2)}`,
                    },
                ],
            };
        }
    );

    /**
     * Move a task to any column
     */
    server.tool(
        'move_task',
        'Move a task to a different column',
        {
            id: z.string().describe('Task ID'),
            column: z.enum(['backlog', 'todo', 'review', 'done'])
                .describe('Target column'),
        },
        async ({ id, column }) => {
            const task = board.moveTask(id, column as ColumnType);
            if (!task) {
                return {
                    content: [{ type: 'text' as const, text: `Error: Task with ID ${id} not found` }],
                    isError: true,
                };
            }
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `Moved task to ${column}: ${JSON.stringify(task, null, 2)}`,
                    },
                ],
            };
        }
    );

    /**
     * Move task to review - primary tool for AI to mark work complete
     */
    server.tool(
        'move_to_review',
        'Move a task from TODO to REVIEW - use this when you have completed work on a task',
        {
            id: z.string().describe('Task ID to move to review'),
        },
        async ({ id }) => {
            const task = board.moveToReview(id);
            if (!task) {
                return {
                    content: [{ type: 'text' as const, text: `Error: Task with ID ${id} not found` }],
                    isError: true,
                };
            }
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `Task moved to review: ${JSON.stringify(task, null, 2)}`,
                    },
                ],
            };
        }
    );

    /**
     * Complete a task
     */
    server.tool(
        'complete_task',
        'Mark a task as done - move it to the DONE column',
        {
            id: z.string().describe('Task ID to complete'),
        },
        async ({ id }) => {
            const task = board.completeTask(id);
            if (!task) {
                return {
                    content: [{ type: 'text' as const, text: `Error: Task with ID ${id} not found` }],
                    isError: true,
                };
            }
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `Task completed: ${JSON.stringify(task, null, 2)}`,
                    },
                ],
            };
        }
    );

    /**
     * Delete a task
     */
    server.tool(
        'delete_task',
        'Delete a task from the board',
        {
            id: z.string().describe('Task ID to delete'),
        },
        async ({ id }) => {
            const success = board.deleteTask(id);
            if (!success) {
                return {
                    content: [{ type: 'text' as const, text: `Error: Task with ID ${id} not found` }],
                    isError: true,
                };
            }
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `Task ${id} deleted successfully`,
                    },
                ],
            };
        }
    );

    /**
     * Get board statistics
     */
    server.tool(
        'get_board_stats',
        'Get statistics about the Kanban board (task counts per column)',
        {},
        async () => {
            const stats = board.getStats();
            const state = board.getState();
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: JSON.stringify({
                            boardName: state.config.boardName,
                            stats,
                            total: Object.values(stats).reduce((a, b) => a + b, 0),
                        }, null, 2),
                    },
                ],
            };
        }
    );

    // === RESOURCES ===

    /**
     * Resource: Current board state
     */
    server.resource(
        'kanban://board',
        'Current state of the Kanban board including all tasks and configuration',
        async () => {
            const state = board.getState();
            return {
                contents: [
                    {
                        uri: 'kanban://board',
                        mimeType: 'application/json',
                        text: JSON.stringify(state, null, 2),
                    },
                ],
            };
        }
    );

    /**
     * Resource: Tasks by column
     */
    server.resource(
        'kanban://tasks/todo',
        'Current TODO tasks that need to be worked on',
        async () => {
            const tasks = board.getTasks('todo');
            return {
                contents: [
                    {
                        uri: 'kanban://tasks/todo',
                        mimeType: 'application/json',
                        text: JSON.stringify(tasks, null, 2),
                    },
                ],
            };
        }
    );

    return server;
}

/**
 * Start the MCP server with stdio transport
 */
export async function startMcpServer(projectPath: string): Promise<void> {
    const server = createMcpServer(projectPath);
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
