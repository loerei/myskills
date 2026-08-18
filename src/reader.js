import fs from 'node:fs';
import path from 'node:path';
import { loadSkillCatalog } from './discovery.js';

/**
 * Normalizes subdoc filename by appending .md if missing.
 */
function normalizeMarkdownFilename(name) {
  if (!name) return '';
  return name.toLowerCase().endsWith('.md') ? name : `${name}.md`;
}

/**
 * Reads raw Markdown content of a policy subdoc.
 * Target format examples:
 *   - policy.git_workflow
 *   - policy.git_workflow.md
 *   - policy.gemini.override_coverage_report
 */
export function readPolicySubdoc(query, { config, sourceRoot }) {
  let cleanQuery = query.startsWith('policy.') ? query.replace(/^policy\./, '') : query;
  const subdocsDirName = config.policy?.subdocsDir || 'subdocs';

  const parts = cleanQuery.split('.');
  let platformName = null;
  let subdocName = cleanQuery;

  if (parts.length > 1) {
    const candidatePlatform = parts[0];
    const isPlatform = (config.platforms || []).some(p => p.name.toLowerCase() === candidatePlatform.toLowerCase());
    if (isPlatform) {
      platformName = candidatePlatform;
      subdocName = parts.slice(1).join('.');
    }
  }

  const normalizedSubdoc = normalizeMarkdownFilename(subdocName);
  const candidatePaths = [];

  if (platformName) {
    const platform = (config.platforms || []).find(p => p.name.toLowerCase() === platformName.toLowerCase());
    const sourceDir = platform ? platform.sourceDir : platformName;
    candidatePaths.push(path.join(sourceRoot, sourceDir, subdocsDirName, normalizedSubdoc));
    candidatePaths.push(path.join(sourceRoot, sourceDir, normalizedSubdoc));
  }

  for (const p of (config.platforms || [])) {
    const sourceDir = p.sourceDir || p.name;
    candidatePaths.push(path.join(sourceRoot, sourceDir, subdocsDirName, normalizedSubdoc));
    candidatePaths.push(path.join(sourceRoot, sourceDir, normalizedSubdoc));
  }

  candidatePaths.push(path.join(sourceRoot, subdocsDirName, normalizedSubdoc));
  candidatePaths.push(path.join(sourceRoot, normalizedSubdoc));

  for (const filePath of candidatePaths) {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return { success: true, content, filePath, exitCode: 0 };
    }
  }

  return {
    success: false,
    error: `[-] Error: Policy subdoc "${query}" not found in root policy subdocs or platform deltas.`,
    exitCode: 1
  };
}

/**
 * Reads raw Markdown content of a skill or skill subdoc.
 * Target format examples:
 *   - skill.tdd
 *   - skill.writing-great-skills/GLOSSARY
 *   - skill.writing-great-skills/GLOSSARY.md
 *   - skill.writing-great-skills.GLOSSARY
 */
export function readSkillContent(query, { sourceRoot }) {
  let cleanQuery = query.startsWith('skill.') ? query.replace(/^skill\./, '') : query;
  cleanQuery = cleanQuery.replaceAll('\\', '/');

  let skillName;
  let subdocName = null;

  if (cleanQuery.includes('/')) {
    const parts = cleanQuery.split('/');
    skillName = parts[0];
    subdocName = parts.slice(1).join('/');
  } else if (cleanQuery.includes('.')) {
    const parts = cleanQuery.split('.');
    skillName = parts[0];
    subdocName = parts.slice(1).join('.');
  } else {
    skillName = cleanQuery;
  }

  const skillCatalog = loadSkillCatalog(sourceRoot);
  const skill = skillCatalog.get(skillName);

  if (!skill) {
    return {
      success: false,
      error: `[-] Error: Skill "${skillName}" not found in myskills catalog.`,
      exitCode: 1
    };
  }

  if (!subdocName) {
    const skillFile = path.join(skill.srcPath, 'SKILL.md');
    if (fs.existsSync(skillFile)) {
      const content = fs.readFileSync(skillFile, 'utf-8');
      return { success: true, content, filePath: skillFile, exitCode: 0 };
    }
  }

  const normalizedSubdoc = normalizeMarkdownFilename(subdocName);

  const candidatePaths = [
    path.join(skill.srcPath, normalizedSubdoc),
    path.join(skill.srcPath, 'subdocs', normalizedSubdoc)
  ];

  for (const filePath of candidatePaths) {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return { success: true, content, filePath, exitCode: 0 };
    }
  }

  const entries = fs.readdirSync(skill.srcPath, { recursive: true, withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.toLowerCase() === normalizedSubdoc.toLowerCase()) {
      const fullPath = path.join(entry.parentPath || path.dirname(path.join(skill.srcPath, entry.name)), entry.name);
      const content = fs.readFileSync(fullPath, 'utf-8');
      return { success: true, content, filePath: fullPath, exitCode: 0 };
    }
  }

  return {
    success: false,
    error: `[-] Error: Subdoc "${subdocName}" not found in skill "${skillName}" at ${skill.srcPath}`,
    exitCode: 1
  };
}
