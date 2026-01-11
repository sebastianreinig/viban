/**
 * Tests for Viban Kanban Board
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { KanbanBoard } from '../src/board/board.js';
import { loadConfig, saveConfig, CONFIG_FILENAME } from '../src/config/config.js';
import { loadTasks, saveTasks } from '../src/board/storage.js';

// Create a temp directory for each test
let testDir: string;

beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'viban-test-'));
});

afterEach(() => {
    // Clean up test directory
    fs.rmSync(testDir, { recursive: true, force: true });
});

describe('Config', () => {
    it('should create default config when none exists', () => {
        const config = loadConfig(testDir);

        expect(config.boardName).toBe('Kanban Board');
        expect(config.tasksFile).toBe('tasks.json');
        expect(config.createdAt).toBeDefined();

        // File should exist
        expect(fs.existsSync(path.join(testDir, CONFIG_FILENAME))).toBe(true);
    });

    it('should save and load config', () => {
        const config = {
            boardName: 'Test Board',
            tasksFile: 'custom-tasks.json',
            createdAt: '2026-01-01T00:00:00Z',
        };

        saveConfig(testDir, config);
        const loaded = loadConfig(testDir);

        expect(loaded.boardName).toBe('Test Board');
        expect(loaded.tasksFile).toBe('custom-tasks.json');
    });
});

describe('Storage', () => {
    it('should create empty tasks file when none exists', () => {
        // First, create config
        loadConfig(testDir);

        const tasks = loadTasks(testDir);
        expect(tasks).toEqual([]);
    });

    it('should save and load tasks', () => {
        loadConfig(testDir);

        const tasks = [
            {
                id: 'test-1',
                title: 'Test Task',
                description: 'Description',
                column: 'todo' as const,
                priority: 'high' as const,
                createdAt: '2026-01-01T00:00:00Z',
                updatedAt: '2026-01-01T00:00:00Z',
            },
        ];

        saveTasks(testDir, tasks);
        const loaded = loadTasks(testDir);

        expect(loaded).toHaveLength(1);
        expect(loaded[0].title).toBe('Test Task');
        expect(loaded[0].column).toBe('todo');
    });
});

describe('KanbanBoard', () => {
    let board: KanbanBoard;

    beforeEach(() => {
        board = new KanbanBoard(testDir);
    });

    it('should create a task', () => {
        const task = board.createTask({
            title: 'New Task',
            description: 'Task description',
        });

        expect(task.id).toBeDefined();
        expect(task.title).toBe('New Task');
        expect(task.column).toBe('backlog'); // Default column
        expect(task.priority).toBe('medium'); // Default priority
    });

    it('should create a task in specified column', () => {
        const task = board.createTask({
            title: 'Todo Task',
            column: 'todo',
        });

        expect(task.column).toBe('todo');
    });

    it('should get tasks by column', () => {
        board.createTask({ title: 'Task 1', column: 'backlog' });
        board.createTask({ title: 'Task 2', column: 'todo' });
        board.createTask({ title: 'Task 3', column: 'todo' });

        const todoTasks = board.getTasks('todo');
        expect(todoTasks).toHaveLength(2);

        const allTasks = board.getTasks();
        expect(allTasks).toHaveLength(3);
    });

    it('should move a task to another column', () => {
        const task = board.createTask({ title: 'Move Me', column: 'backlog' });

        const moved = board.moveTask(task.id, 'todo');
        expect(moved?.column).toBe('todo');

        const todoTasks = board.getTasks('todo');
        expect(todoTasks).toHaveLength(1);
        expect(todoTasks[0].id).toBe(task.id);
    });

    it('should move task to review', () => {
        const task = board.createTask({ title: 'Work Item', column: 'todo' });

        const reviewed = board.moveToReview(task.id);
        expect(reviewed?.column).toBe('review');
    });

    it('should complete a task', () => {
        const task = board.createTask({ title: 'Complete Me', column: 'review' });

        const completed = board.completeTask(task.id);
        expect(completed?.column).toBe('done');
    });

    it('should update a task', () => {
        const task = board.createTask({ title: 'Original', priority: 'low' });

        const updated = board.updateTask(task.id, {
            title: 'Updated',
            priority: 'high',
        });

        expect(updated?.title).toBe('Updated');
        expect(updated?.priority).toBe('high');
    });

    it('should delete a task', () => {
        const task = board.createTask({ title: 'Delete Me' });

        const deleted = board.deleteTask(task.id);
        expect(deleted).toBe(true);

        const tasks = board.getTasks();
        expect(tasks).toHaveLength(0);
    });

    it('should get board statistics', () => {
        board.createTask({ title: 'Backlog 1', column: 'backlog' });
        board.createTask({ title: 'Todo 1', column: 'todo' });
        board.createTask({ title: 'Todo 2', column: 'todo' });
        board.createTask({ title: 'Done 1', column: 'done' });

        const stats = board.getStats();

        expect(stats.backlog).toBe(1);
        expect(stats.todo).toBe(2);
        expect(stats.review).toBe(0);
        expect(stats.done).toBe(1);
    });

    it('should get full board state', () => {
        board.createTask({ title: 'Task 1' });

        const state = board.getState();

        expect(state.tasks).toHaveLength(1);
        expect(state.config.boardName).toBe('Kanban Board');
    });

    it('should return null for non-existent task', () => {
        const task = board.getTask('non-existent-id');
        expect(task).toBeNull();

        const moved = board.moveTask('non-existent-id', 'todo');
        expect(moved).toBeNull();

        const deleted = board.deleteTask('non-existent-id');
        expect(deleted).toBe(false);
    });
});
