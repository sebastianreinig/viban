/**
 * JSON file storage for Kanban tasks
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Task } from './types.js';
import { loadConfig } from '../config/config.js';

/**
 * Get the full path to the tasks file
 */
export function getTasksPath(projectPath: string): string {
    const config = loadConfig(projectPath);
    return path.join(projectPath, config.tasksFile);
}

/**
 * Load all tasks from the JSON file
 * Returns an empty array if the file doesn't exist
 */
export function loadTasks(projectPath: string): Task[] {
    const tasksPath = getTasksPath(projectPath);

    if (!fs.existsSync(tasksPath)) {
        // Initialize with empty array
        saveTasks(projectPath, []);
        return [];
    }

    try {
        const content = fs.readFileSync(tasksPath, 'utf-8');
        const parsed = JSON.parse(content);

        if (!Array.isArray(parsed)) {
            throw new Error('Tasks file must contain an array');
        }

        return parsed as Task[];
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error(`Invalid JSON in tasks file: ${tasksPath}`);
        }
        throw error;
    }
}

/**
 * Save all tasks to the JSON file
 */
export function saveTasks(projectPath: string, tasks: Task[]): void {
    const tasksPath = getTasksPath(projectPath);

    // Ensure directory exists
    const dir = path.dirname(tasksPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const content = JSON.stringify(tasks, null, 2);

    // Write atomically to prevent corruption
    const tempPath = `${tasksPath}.tmp`;
    fs.writeFileSync(tempPath, content, 'utf-8');
    fs.renameSync(tempPath, tasksPath);
}

/**
 * Add a single task
 */
export function addTask(projectPath: string, task: Task): void {
    const tasks = loadTasks(projectPath);
    tasks.push(task);
    saveTasks(projectPath, tasks);
}

/**
 * Update a task by ID
 */
export function updateTask(projectPath: string, taskId: string, updates: Partial<Task>): Task | null {
    const tasks = loadTasks(projectPath);
    const index = tasks.findIndex(t => t.id === taskId);

    if (index === -1) {
        return null;
    }

    tasks[index] = {
        ...tasks[index],
        ...updates,
        updatedAt: new Date().toISOString(),
    };

    saveTasks(projectPath, tasks);
    return tasks[index];
}

/**
 * Delete a task by ID
 */
export function deleteTask(projectPath: string, taskId: string): boolean {
    const tasks = loadTasks(projectPath);
    const index = tasks.findIndex(t => t.id === taskId);

    if (index === -1) {
        return false;
    }

    tasks.splice(index, 1);
    saveTasks(projectPath, tasks);
    return true;
}

/**
 * Find a task by ID
 */
export function findTask(projectPath: string, taskId: string): Task | null {
    const tasks = loadTasks(projectPath);
    return tasks.find(t => t.id === taskId) || null;
}
