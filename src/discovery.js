import fs from 'node:fs';
import path from 'node:path';

/**
 * Recursively find all directories containing SKILL.md under a base path.
 * Skip directories starting with '.' or '_'.
 * @param {string} dir 
 * @param {string[]} results 
 * @returns {string[]}
 */
export function findSkillDirectories(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  const items = fs.readdirSync(dir);

  if (items.includes('SKILL.md')) {
    results.push(dir);
    return results;
  }

  for (const item of items) {
    if (item.startsWith('.') || item.startsWith('_')) continue;
    const itemPath = path.join(dir, item);
    if (fs.statSync(itemPath).isDirectory()) {
      findSkillDirectories(itemPath, results);
    }
  }
  return results;
}

/**
 * Load skill catalog and deduplicate by shortest path.
 * @param {string} baseDir 
 * @returns {Map<string, {name: string, srcPath: string}>}
 */
export function loadSkillCatalog(baseDir) {
  const dirs = findSkillDirectories(baseDir);
  const catalog = new Map();
  
  for (const dir of dirs) {
    const name = path.basename(dir);
    if (catalog.has(name)) {
      const existing = catalog.get(name);
      if (dir.length < existing.srcPath.length) {
        catalog.set(name, { name, srcPath: dir });
      }
    } else {
      catalog.set(name, { name, srcPath: dir });
    }
  }
  return catalog;
}

/**
 * Check if a skill is local by reading its SKILL.md frontmatter.
 * @param {string} skillDir 
 * @returns {boolean}
 */
export function isLocalSkill(skillDir) {
  const skillFile = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillFile)) return false;
  try {
    const content = fs.readFileSync(skillFile, 'utf-8');
    return /local:\s*true/i.test(content) || /scope:\s*(project|local)/i.test(content);
  } catch (e) {
    return false;
  }
}
