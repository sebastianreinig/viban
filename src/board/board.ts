/**
 * Kanban board management logic
 */

import { v4 as uuidv4 } from 'uuid';
import type {
    Task,
    ColumnType,
    BoardState,
    CreateTaskInput,
    UpdateTaskInput,
    Priority
} from './types.js';
import { COLUMNS } from './types.js';
import { loadConfig } from '../config/config.js';
import {
    loadTasks,
    saveTasks,
    findTask as storageFindTask,
    updateTask as storageUpdateTask,
    deleteTask as storageDeleteTask
} from './storage.js';

/**
 * Kanban Board class
 * Manages all operations on the board
 */
export class KanbanBoard {
    private projectPath: string;

    constructor(projectPath: string) {
        this.projectPath = projectPath;
    }

    /**
     * Get full board state
     */
    getState(): BoardState {
        return {
            tasks: loadTasks(this.projectPath),
            config: loadConfig(this.projectPath),
        };
    }

    /**
     * Get all tasks, optionally filtered by column
     */
    getTasks(column?: ColumnType): Task[] {
        const tasks = loadTasks(this.projectPath);

        if (column) {
            return tasks.filter(t => t.column === column);
        }

        return tasks;
    }

    /**
     * Get tasks grouped by column
     */
    getTasksByColumn(): Record<ColumnType, Task[]> {
        const tasks = loadTasks(this.projectPath);
        const grouped: Record<ColumnType, Task[]> = {
            backlog: [],
            todo: [],
            review: [],
            done: [],
        };

        for (const task of tasks) {
            grouped[task.column].push(task);
        }

        return grouped;
    }

    /**
     * Create a new task
     */
    createTask(input: CreateTaskInput): Task {
        const now = new Date().toISOString();

        const task: Task = {
            id: uuidv4(),
            title: input.title,
            description: input.description,
            column: input.column || 'backlog',
            priority: input.priority || 'medium',
            createdAt: now,
            updatedAt: now,
        };

        const tasks = loadTasks(this.projectPath);
        tasks.push(task);
        saveTasks(this.projectPath, tasks);

        return task;
    }

    /**
     * Get a task by ID
     */
    getTask(taskId: string): Task | null {
        return storageFindTask(this.projectPath, taskId);
    }

    /**
     * Update a task's properties
     */
    updateTask(taskId: string, updates: UpdateTaskInput): Task | null {
        return storageUpdateTask(this.projectPath, taskId, updates);
    }

    /**
     * Move a task to a different column
     */
    moveTask(taskId: string, toColumn: ColumnType): Task | null {
        if (!COLUMNS.includes(toColumn)) {
            throw new Error(`Invalid column: ${toColumn}. Must be one of: ${COLUMNS.join(', ')}`);
        }

        return storageUpdateTask(this.projectPath, taskId, { column: toColumn });
    }

    /**
     * Move a task to the review column
     * Convenience method for AI to mark work as ready for review
     */
    moveToReview(taskId: string): Task | null {
        return this.moveTask(taskId, 'review');
    }

    /**
     * Move a task to the done column
     * Convenience method to mark tasks as complete
     */
    completeTask(taskId: string): Task | null {
        return this.moveTask(taskId, 'done');
    }

    /**
     * Delete a task
     */
    deleteTask(taskId: string): boolean {
        return storageDeleteTask(this.projectPath, taskId);
    }

    /**
     * Get summary statistics for the board
     */
    getStats(): Record<ColumnType, number> {
        const tasks = loadTasks(this.projectPath);
        const stats: Record<ColumnType, number> = {
            backlog: 0,
            todo: 0,
            review: 0,
            done: 0,
        };

        for (const task of tasks) {
            stats[task.column]++;
        }

        return stats;
    }
}
