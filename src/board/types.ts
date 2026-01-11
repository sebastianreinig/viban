/**
 * Core types for Viban Kanban board
 */

/** Available Kanban columns */
export type ColumnType = 'backlog' | 'todo' | 'review' | 'done';

/** All column types in order */
export const COLUMNS: ColumnType[] = ['backlog', 'todo', 'review', 'done'];

/** Task priority levels */
export type Priority = 'low' | 'medium' | 'high';

/** A single Kanban task */
export interface Task {
    /** Unique task identifier */
    id: string;
    /** Task title */
    title: string;
    /** Optional task description */
    description?: string;
    /** Current column */
    column: ColumnType;
    /** Task priority */
    priority: Priority;
    /** ISO timestamp when created */
    createdAt: string;
    /** ISO timestamp when last updated */
    updatedAt: string;
}

/** Board configuration stored in .config-viban.yml */
export interface BoardConfig {
    /** Display name for the board */
    boardName: string;
    /** Filename for tasks JSON (default: tasks.json) */
    tasksFile: string;
    /** ISO timestamp when board was created */
    createdAt: string;
}

/** Complete board state */
export interface BoardState {
    /** All tasks on the board */
    tasks: Task[];
    /** Board configuration */
    config: BoardConfig;
}

/** Input for creating a new task */
export interface CreateTaskInput {
    title: string;
    description?: string;
    column?: ColumnType;
    priority?: Priority;
}

/** Input for updating an existing task */
export interface UpdateTaskInput {
    title?: string;
    description?: string;
    priority?: Priority;
}
