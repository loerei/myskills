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

export const OFFICIAL_CATEGORIES = ['design', 'engineering', 'quality', 'productivity', 'personal'];

/**
 * Load skill catalog and deduplicate by shortest path.
 * If baseDir contains whitelisted categories, strictly scans within those categories.
 * @param {string} baseDir 
 * @param {string[]} [validCategories=OFFICIAL_CATEGORIES]
 * @returns {Map<string, {name: string, srcPath: string}>}
 */
export function loadSkillCatalog(baseDir, validCategories = OFFICIAL_CATEGORIES) {
  const hasCategories = Array.isArray(validCategories) && validCategories.some(cat => fs.existsSync(path.join(baseDir, cat)));
  let dirs = [];
  if (hasCategories) {
    for (const cat of validCategories) {
      const catDir = path.join(baseDir, cat);
      if (fs.existsSync(catDir) && fs.statSync(catDir).isDirectory()) {
        findSkillDirectories(catDir, dirs);
      }
    }
  } else {
    dirs = findSkillDirectories(baseDir);
  }
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
 * Loads all skills with name, category, and description from frontmatter.
 * @param {string} baseDir 
 * @param {string[]} [validCategories=OFFICIAL_CATEGORIES]
 * @returns {Array<{ name: string, category: string, description: string, srcPath: string }>}
 */
export function listSkillsDetailed(baseDir, validCategories = OFFICIAL_CATEGORIES) {
  const skillCatalog = loadSkillCatalog(baseDir, validCategories);
  const results = [];

  for (const [name, skill] of skillCatalog.entries()) {
    const rel = path.relative(baseDir, skill.srcPath);
    const parts = rel.split(path.sep);
    let category = 'other';
    if (parts.length > 1) {
      category = parts[0];
      if (validCategories.length > 0 && !validCategories.includes(category)) {
        category = 'other';
      }
    }

    let description = '';
    const skillFile = path.join(skill.srcPath, 'SKILL.md');
    if (fs.existsSync(skillFile)) {
      try {
        const content = fs.readFileSync(skillFile, 'utf-8');
        const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (match) {
          const fmLines = match[1].split(/\r?\n/);
          let collectingDesc = false;
          const descLines = [];

          for (const line of fmLines) {
            if (collectingDesc) {
              if (/^[a-zA-Z0-9_-]+:/.test(line)) {
                break;
              }
              if (line.trim()) {
                descLines.push(line.trim());
              }
            } else if (line.startsWith('description:')) {
              const val = line.slice('description:'.length).trim();
              if (val === '>' || val === '|' || val === '') {
                collectingDesc = true;
              } else {
                description = val.replace(/^['"]|['"]$/g, '');
                break;
              }
            }
          }

          if (descLines.length > 0) {
            description = descLines.join(' ');
          }
        }
      } catch {
        /* ignore unreadable or malformed frontmatter */
      }
    }

    results.push({
      name,
      category,
      description,
      srcPath: skill.srcPath
    });
  }

  // Sort by category then name
  results.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.name.localeCompare(b.name);
  });

  return results;
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
    if (process.env.DEBUG) {
      console.error(`Failed to read ${skillFile}:`, e);
    }
    return false;
  }
}
