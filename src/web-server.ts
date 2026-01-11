/**
 * HTTP Web Server for Viban
 * Provides REST API and serves the web frontend
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { KanbanBoard } from './board/board.js';
import { loadConfig, saveConfig, configExists, CONFIG_FILENAME } from './config/config.js';
import { setLastProjectPath, getRecentProjects, getLastProjectPath } from './config/global-config.js';
import type { ColumnType, CreateTaskInput, UpdateTaskInput } from './board/types.js';

const MIME_TYPES: Record<string, string> = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
};

/**
 * Parse JSON body from request
 */
async function parseBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch {
                reject(new Error('Invalid JSON'));
            }
        });
        req.on('error', reject);
    });
}

/**
 * Send JSON response
 */
function sendJson(res: http.ServerResponse, data: any, status = 200): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

/**
 * Send error response
 */
function sendError(res: http.ServerResponse, message: string, status = 400): void {
    sendJson(res, { error: message }, status);
}

/**
 * Web server class
 */
export class WebServer {
    private server: http.Server;
    private projectPath: string | null = null;
    private board: KanbanBoard | null = null;
    private staticDir: string;

    constructor() {
        // Static files are in the 'public' folder relative to dist
        this.staticDir = path.join(import.meta.dirname, '..', 'public');
        this.server = http.createServer(this.handleRequest.bind(this));
    }

    /**
     * Set project path and initialize board
     */
    setProject(projectPath: string): void {
        this.projectPath = path.resolve(projectPath);

        // Ensure directory exists
        if (!fs.existsSync(this.projectPath)) {
            fs.mkdirSync(this.projectPath, { recursive: true });
        }

        // Initialize config if needed
        loadConfig(this.projectPath);

        // Create board instance
        this.board = new KanbanBoard(this.projectPath);

        // Save as last used
        setLastProjectPath(this.projectPath);
    }

    /**
     * Handle incoming HTTP request
     */
    private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        const url = new URL(req.url || '/', `http://${req.headers.host}`);
        const pathname = url.pathname;

        try {
            // API routes
            if (pathname.startsWith('/api/')) {
                await this.handleApi(req, res, pathname);
                return;
            }

            // Static files
            await this.serveStatic(res, pathname);
        } catch (error) {
            console.error('Request error:', error);
            sendError(res, 'Internal server error', 500);
        }
    }

    /**
     * Handle API requests
     */
    private async handleApi(req: http.IncomingMessage, res: http.ServerResponse, pathname: string): Promise<void> {
        const method = req.method || 'GET';

        // Project management endpoints (don't require active project)
        if (pathname === '/api/projects') {
            if (method === 'GET') {
                const recent = getRecentProjects();
                const current = this.projectPath;
                sendJson(res, { current, recent });
                return;
            }
        }

        if (pathname === '/api/project/select') {
            if (method === 'POST') {
                const body = await parseBody(req);
                if (!body.path) {
                    sendError(res, 'Path required');
                    return;
                }
                this.setProject(body.path);
                const config = loadConfig(this.projectPath!);
                sendJson(res, { success: true, project: this.projectPath, config });
                return;
            }
        }

        if (pathname === '/api/project/current') {
            if (method === 'GET') {
                if (!this.projectPath) {
                    sendJson(res, { project: null });
                    return;
                }
                const config = loadConfig(this.projectPath);
                sendJson(res, { project: this.projectPath, config });
                return;
            }
        }

        // All other API routes require an active project
        if (!this.board || !this.projectPath) {
            sendError(res, 'No project selected. POST to /api/project/select first.', 400);
            return;
        }

        // Board endpoints
        if (pathname === '/api/board') {
            if (method === 'GET') {
                sendJson(res, this.board.getState());
                return;
            }
        }

        if (pathname === '/api/stats') {
            if (method === 'GET') {
                sendJson(res, this.board.getStats());
                return;
            }
        }

        // Task endpoints
        if (pathname === '/api/tasks') {
            if (method === 'GET') {
                const url = new URL(req.url || '/', `http://${req.headers.host}`);
                const column = url.searchParams.get('column') as ColumnType | null;
                sendJson(res, this.board.getTasks(column || undefined));
                return;
            }
            if (method === 'POST') {
                const body = await parseBody(req) as CreateTaskInput;
                if (!body.title) {
                    sendError(res, 'Title required');
                    return;
                }
                const task = this.board.createTask(body);
                sendJson(res, task, 201);
                return;
            }
        }

        // Task by ID endpoints
        const taskMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/);
        if (taskMatch) {
            const taskId = taskMatch[1];

            if (method === 'GET') {
                const task = this.board.getTask(taskId);
                if (!task) {
                    sendError(res, 'Task not found', 404);
                    return;
                }
                sendJson(res, task);
                return;
            }

            if (method === 'PUT') {
                const body = await parseBody(req) as UpdateTaskInput;
                const task = this.board.updateTask(taskId, body);
                if (!task) {
                    sendError(res, 'Task not found', 404);
                    return;
                }
                sendJson(res, task);
                return;
            }

            if (method === 'DELETE') {
                const success = this.board.deleteTask(taskId);
                if (!success) {
                    sendError(res, 'Task not found', 404);
                    return;
                }
                sendJson(res, { success: true });
                return;
            }
        }

        // Move task endpoint
        const moveMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/move$/);
        if (moveMatch && method === 'POST') {
            const taskId = moveMatch[1];
            const body = await parseBody(req);
            if (!body.column) {
                sendError(res, 'Column required');
                return;
            }
            const task = this.board.moveTask(taskId, body.column);
            if (!task) {
                sendError(res, 'Task not found', 404);
                return;
            }
            sendJson(res, task);
            return;
        }

        // Config endpoint
        if (pathname === '/api/config') {
            if (method === 'GET') {
                sendJson(res, loadConfig(this.projectPath));
                return;
            }
            if (method === 'PUT') {
                const body = await parseBody(req);
                const config = loadConfig(this.projectPath);
                const updated = { ...config, ...body };
                saveConfig(this.projectPath, updated);
                sendJson(res, updated);
                return;
            }
        }

        sendError(res, 'Not found', 404);
    }

    /**
     * Serve static files
     */
    private async serveStatic(res: http.ServerResponse, pathname: string): Promise<void> {
        // Default to index.html
        if (pathname === '/') {
            pathname = '/index.html';
        }

        const filePath = path.join(this.staticDir, pathname);

        // Security: prevent directory traversal
        if (!filePath.startsWith(this.staticDir)) {
            sendError(res, 'Forbidden', 403);
            return;
        }

        if (!fs.existsSync(filePath)) {
            // SPA fallback - serve index.html for unknown routes
            const indexPath = path.join(this.staticDir, 'index.html');
            if (fs.existsSync(indexPath)) {
                const content = fs.readFileSync(indexPath);
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(content);
                return;
            }
            sendError(res, 'Not found', 404);
            return;
        }

        const ext = path.extname(filePath);
        const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
        const content = fs.readFileSync(filePath);

        res.writeHead(200, { 'Content-Type': mimeType });
        res.end(content);
    }

    /**
     * Start the server
     */
    start(port: number): Promise<void> {
        return new Promise((resolve) => {
            this.server.listen(port, () => {
                console.log(`\n🌐 Web UI available at: http://localhost:${port}`);
                resolve();
            });
        });
    }

    /**
     * Stop the server
     */
    stop(): Promise<void> {
        return new Promise((resolve) => {
            this.server.close(() => resolve());
        });
    }
}

/**
 * Start the web server
 */
export async function startWebServer(port = 3000, projectPath?: string): Promise<WebServer> {
    const server = new WebServer();

    if (projectPath) {
        server.setProject(projectPath);
    }

    await server.start(port);
    return server;
}
