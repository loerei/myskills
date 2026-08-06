import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { copyRecursiveIfDifferent } from './sync.js';

/**
 * Reads and validates config JSON, expands ~ to os.homedir().
 * @param {string} configPath 
 * @returns {object}
 */
export function loadConfig(configPath) {
  const content = fs.readFileSync(configPath, 'utf-8');
  const config = JSON.parse(content);
  
  const expand = (p) => p ? p.replace(/^~(?=$|\/|\\)/, os.homedir()) : p;
  
  config.projectsRoot = expand(config.projectsRoot);
  
  if (config.platforms) {
    for (const platform of config.platforms) {
      platform.baseDir = expand(platform.baseDir);
      platform.agentsDest = expand(platform.agentsDest);
      platform.skillsDir = expand(platform.skillsDir);
      platform.subagentRulesDir = expand(platform.subagentRulesDir);
    }
  }
  return config;
}

/**
 * Override-with-fallback resolution.
 * @param {object} platform 
 * @param {string} file 
 * @param {string} sourceRoot 
 * @returns {string|null}
 */
export function resolvePlatformSource(platform, file, sourceRoot) {
  const specificPath = path.join(sourceRoot, platform.sourceDir, file);
  if (fs.existsSync(specificPath)) return specificPath;
  
  const fallbackPath = path.join(sourceRoot, file);
  if (fs.existsSync(fallbackPath)) return fallbackPath;
  
  return null;
}

/**
 * Sync platform configuration.
 * @param {object} platform 
 * @param {Map<string, {name: string, srcPath: string}>} skillCatalog 
 * @param {object} options 
 * @returns {object}
 */
export function syncPlatformGlobals(platform, skillCatalog, { sourceRoot, subagentRulesDir, dryRun = false }) {
  const result = { platform: platform.name, synced: false, changes: [], errors: [] };
  
  if (!fs.existsSync(platform.baseDir)) {
    result.errors.push(`Base dir ${platform.baseDir} not found`);
    return result;
  }
  
  result.synced = true;
  
  // 1. Sync syncFiles (like AGENTS.md)
  if (platform.syncFiles) {
    for (const file of platform.syncFiles) {
      const src = resolvePlatformSource(platform, file, sourceRoot);
      if (src) {
        let dest;
        if (file === 'AGENTS.md') {
          dest = platform.agentsDest;
        } else {
          dest = path.join(path.dirname(platform.agentsDest), file);
        }
        try {
          const cp = copyRecursiveIfDifferent(src, dest, { dryRun });
          if (cp.changed) {
            result.changes.push({ type: 'file', file, src, dest, changes: cp.files });
          }
        } catch (e) {
          result.errors.push(`Failed to sync ${file}: ${e.message}`);
        }
      }
    }
  }
  
  // 2. Sync Custom Skills
  if (platform.skillsDir) {
    for (const [name, skill] of skillCatalog.entries()) {
      const destDir = path.join(platform.skillsDir, name);
      try {
        const cp = copyRecursiveIfDifferent(skill.srcPath, destDir, { dryRun });
        if (cp.changed) {
          result.changes.push({ type: 'skill', name, changes: cp.files });
        }
      } catch (e) {
        result.errors.push(`Failed to sync skill ${name}: ${e.message}`);
      }
    }
  }
  
  // 3. Sync Subagent Rules
  if (subagentRulesDir && platform.subagentRulesDir && fs.existsSync(subagentRulesDir)) {
    try {
      const cp = copyRecursiveIfDifferent(subagentRulesDir, platform.subagentRulesDir, { dryRun });
      if (cp.changed) {
        result.changes.push({ type: 'subagent_rules', changes: cp.files });
      }
    } catch (e) {
      result.errors.push(`Failed to sync subagent rules: ${e.message}`);
    }
  }
  
  return result;
}
