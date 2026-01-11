/**
 * Global configuration management for Viban
 * Stores user preferences like last used project path
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'yaml';

/** Global config filename */
const GLOBAL_CONFIG_FILENAME = '.viban-global.yml';

/** Global config stored in user's home directory */
export interface GlobalConfig {
    /** Last used project path */
    lastProjectPath?: string;
    /** List of recent project paths */
    recentProjects?: string[];
}

/**
 * Get path to global config file
 */
export function getGlobalConfigPath(): string {
    return path.join(os.homedir(), GLOBAL_CONFIG_FILENAME);
}

/**
 * Load global configuration
 */
export function loadGlobalConfig(): GlobalConfig {
    const configPath = getGlobalConfigPath();

    if (!fs.existsSync(configPath)) {
        return {};
    }

    try {
        const content = fs.readFileSync(configPath, 'utf-8');
        return yaml.parse(content) || {};
    } catch {
        return {};
    }
}

/**
 * Save global configuration
 */
export function saveGlobalConfig(config: GlobalConfig): void {
    const configPath = getGlobalConfigPath();
    const content = yaml.stringify(config);
    fs.writeFileSync(configPath, content, 'utf-8');
}

/**
 * Update the last used project path
 */
export function setLastProjectPath(projectPath: string): void {
    const config = loadGlobalConfig();
    config.lastProjectPath = projectPath;

    // Update recent projects list
    const recentProjects = config.recentProjects || [];
    const index = recentProjects.indexOf(projectPath);
    if (index > -1) {
        recentProjects.splice(index, 1);
    }
    recentProjects.unshift(projectPath);
    config.recentProjects = recentProjects.slice(0, 10); // Keep last 10

    saveGlobalConfig(config);
}

/**
 * Get the last used project path
 */
export function getLastProjectPath(): string | undefined {
    return loadGlobalConfig().lastProjectPath;
}

/**
 * Get list of recent projects
 */
export function getRecentProjects(): string[] {
    return loadGlobalConfig().recentProjects || [];
}
