import fs from 'node:fs';
import path from 'node:path';
import { OFFICIAL_CATEGORIES, findSkillDirectories, parseSkillFrontmatter } from './discovery.js';

export { OFFICIAL_CATEGORIES };

const STALE_POLICY_TERMS = [
  { label: 'subagent_rules', pattern: /\bsubagent_rules\b/ },
  { label: 'Table 1', pattern: /\bTable 1\b/ },
  { label: 'view_file', pattern: /\bview_file\b/ },
  { label: 'grep_search', pattern: /\bgrep_search\b/ },
  { label: 'list_dir', pattern: /\blist_dir\b/ },
  { label: 'replace_file_content', pattern: /\breplace_file_content\b/ },
  { label: 'multi_replace_file_content', pattern: /\bmulti_replace_file_content\b/ },
  { label: 'get_session_details', pattern: /\bget_session_details\b/ },
  { label: 'reverseSteps', pattern: /\breverseSteps\b/ },
  { label: 'conversationStepsOnly', pattern: /\bconversationStepsOnly\b/ }
];

/**
 * Scan configured categories for all skill directories without deduplicating,
 * so duplicate directory names across categories can be reported.
 * @param {string} sourceRoot
 * @param {string[]} categories
 * @returns {Array<{ name: string, dir: string }>}
 */
function collectRawSkills(sourceRoot, categories) {
  const dirs = [];
  const hasCategories = Array.isArray(categories) && categories.some(cat => fs.existsSync(path.join(sourceRoot, cat)));

  if (hasCategories) {
    for (const cat of categories) {
      const catDir = path.join(sourceRoot, cat);
      if (fs.existsSync(catDir) && fs.statSync(catDir).isDirectory()) {
        findSkillDirectories(catDir, dirs);
      }
    }
  } else {
    findSkillDirectories(sourceRoot, dirs);
  }

  return dirs.map(dir => ({ name: path.basename(dir), dir }));
}

/**
 * Check a policy markdown file for existence and stale tool/rule references.
 * @param {string} filePath
 * @param {string} sourceRoot
 * @returns {{ relPath: string, missing: boolean, staleTerms: string[] }}
 */
function inspectPolicyFile(filePath, sourceRoot) {
  const relPath = path.relative(sourceRoot, filePath);
  if (!fs.existsSync(filePath)) {
    return { relPath, missing: true, staleTerms: [] };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const staleTerms = STALE_POLICY_TERMS
    .filter(term => term.pattern.test(content))
    .map(term => term.label);

  return { relPath, missing: false, staleTerms };
}

/**
 * Audit skill catalog health (valid SKILL.md frontmatter and no duplicate names)
 * and policy file integrity (existence and absence of stale references).
 * @param {{ sourceRoot: string, config?: object }} options
 * @returns {{ success: boolean, exitCode: number, skillCount: number, duplicates: Array, frontmatterErrors: Array, policyErrors: Array, checkedPolicies: string[] }}
 */
export function runPolicyAudit({ sourceRoot, config = {} }) {
  const categories = config.categories || OFFICIAL_CATEGORIES;
  const rootFileName = config.policy?.rootFile || 'AGENTS.md';
  const rawSkills = collectRawSkills(sourceRoot, categories);

  const byName = new Map();
  const frontmatterErrors = [];

  for (const { name, dir } of rawSkills) {
    if (!byName.has(name)) {
      byName.set(name, []);
    }
    byName.get(name).push(dir);

    const fm = parseSkillFrontmatter(dir);
    const relDir = path.relative(sourceRoot, dir);
    if (fm.error) {
      frontmatterErrors.push({ skill: relDir, reason: fm.error });
    } else {
      const missingFields = [];
      if (!fm.name) missingFields.push('name');
      if (!fm.description) missingFields.push('description');
      if (missingFields.length > 0) {
        frontmatterErrors.push({
          skill: relDir,
          reason: `Empty or missing YAML frontmatter field(s): ${missingFields.join(', ')}`
        });
      }
    }
  }

  const duplicates = [];
  for (const [name, dirs] of byName.entries()) {
    if (dirs.length > 1) {
      duplicates.push({
        name,
        paths: dirs.map(d => path.relative(sourceRoot, d))
      });
    }
  }

  const policyTargets = [path.join(sourceRoot, rootFileName)];
  for (const platform of config.platforms || []) {
    if (!platform.sourceDir) continue;
    const platformDir = path.join(sourceRoot, platform.sourceDir);
    if (fs.existsSync(platformDir) && fs.statSync(platformDir).isDirectory()) {
      policyTargets.push(path.join(platformDir, rootFileName));
    }
  }

  const policyErrors = [];
  const checkedPolicies = [];

  for (const policyPath of policyTargets) {
    const result = inspectPolicyFile(policyPath, sourceRoot);
    checkedPolicies.push(result.relPath);
    if (result.missing) {
      policyErrors.push({ file: result.relPath, reason: 'Policy file not found' });
    } else if (result.staleTerms.length > 0) {
      policyErrors.push({
        file: result.relPath,
        reason: `Contains stale reference(s): ${result.staleTerms.join(', ')}`
      });
    }
  }

  console.log(`\n[*] Catalog & Policy Audit (${sourceRoot})`);
  console.log(`    Skills scanned: ${rawSkills.length} (${byName.size} unique)`);
  console.log(`    Policies checked: ${checkedPolicies.join(', ')}`);

  for (const dup of duplicates) {
    console.log(`  [!] Duplicate skill "${dup.name}": ${dup.paths.join(' | ')}`);
  }
  for (const err of frontmatterErrors) {
    console.log(`  [!] Frontmatter error in ${err.skill}: ${err.reason}`);
  }
  for (const err of policyErrors) {
    console.log(`  [!] Policy error in ${err.file}: ${err.reason}`);
  }

  const hasFailures = duplicates.length > 0 || frontmatterErrors.length > 0 || policyErrors.length > 0;
  if (!hasFailures) {
    console.log('[+] Audit passed: all skills have valid frontmatter, zero duplicates, and all policy files are clean.\n');
  } else {
    console.log('[-] Audit failed: resolve the catalog or policy errors above.\n');
  }

  return {
    success: !hasFailures,
    exitCode: hasFailures ? 1 : 0,
    skillCount: rawSkills.length,
    duplicates,
    frontmatterErrors,
    policyErrors,
    checkedPolicies
  };
}
