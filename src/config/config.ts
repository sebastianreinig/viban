/**
 * Configuration file management for Viban
 * Handles .config-viban.yml files
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import type { BoardConfig } from '../board/types.js';

/** Configuration filename */
export const CONFIG_FILENAME = '.config-viban.yml';

/** Default configuration values */
const DEFAULT_CONFIG: Omit<BoardConfig, 'createdAt'> = {
    boardName: 'Kanban Board',
    tasksFile: 'tasks.json',
};

/**
 * Get the full path to the config file
 */
export function getConfigPath(projectPath: string): string {
    return path.join(projectPath, CONFIG_FILENAME);
}

/**
 * Check if a config file exists at the given project path
 */
export function configExists(projectPath: string): boolean {
    return fs.existsSync(getConfigPath(projectPath));
}

/**
 * Load configuration from .config-viban.yml
 * Creates a new config file if it doesn't exist
 */
export function loadConfig(projectPath: string): BoardConfig {
    const configPath = getConfigPath(projectPath);

    if (!fs.existsSync(configPath)) {
        // Create default config
        const config: BoardConfig = {
            ...DEFAULT_CONFIG,
            createdAt: new Date().toISOString(),
        };
        saveConfig(projectPath, config);
        return config;
    }

    try {
        const content = fs.readFileSync(configPath, 'utf-8');
        const parsed = yaml.parse(content) as BoardConfig;

        // Merge with defaults for any missing fields
        return {
            ...DEFAULT_CONFIG,
            ...parsed,
        };
    } catch (error) {
        throw new Error(`Failed to parse config file: ${configPath}`);
    }
}

/**
 * Save configuration to .config-viban.yml
 */
export function saveConfig(projectPath: string, config: BoardConfig): void {
    const configPath = getConfigPath(projectPath);

    // Ensure directory exists
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const content = yaml.stringify(config);
    fs.writeFileSync(configPath, content, 'utf-8');
}

/**
 * Update specific config values
 */
export function updateConfig(
    projectPath: string,
    updates: Partial<Omit<BoardConfig, 'createdAt'>>
): BoardConfig {
    const current = loadConfig(projectPath);
    const updated: BoardConfig = {
        ...current,
        ...updates,
    };
    saveConfig(projectPath, updated);
    return updated;
}
