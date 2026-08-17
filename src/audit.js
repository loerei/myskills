import fs from 'node:fs';
import path from 'node:path';

const CATEGORY_ROW_MAP = {
  design: 'Design & Frontend UI',
  engineering: 'Engineering & Development',
  quality: 'Code Quality & CI/CD',
  productivity: 'Productivity & Management',
  personal: 'Content & Notes'
};

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Discovers all skill directories in repoRoot containing SKILL.md.
 */
export function findSkillDirectories(repoRoot) {
  const entries = fs.readdirSync(repoRoot, { recursive: true, withFileTypes: true });
  return entries
    .filter(e => e.isFile() && e.name === 'SKILL.md')
    .map(e => e.parentPath || path.dirname(path.join(repoRoot, e.name)))
    .filter(p => !p.includes('node_modules') && !p.includes('.git') && !p.includes('.agents'));
}

/**
 * Parses policy markdown file content to extract documented skills by category rows.
 * @param {string} content 
 * @returns {{documentedSkills: Set<string>, rowSkillsMap: Map<string, string[]>}}
 */
export function parsePolicySkillsByRow(content) {
  const documentedSkills = new Set();
  const rowSkillsMap = new Map();

  for (const [category, rowTitle] of Object.entries(CATEGORY_ROW_MAP)) {
    const rowRegex = new RegExp(`\\|\\s*\\*\\*${escapeRegex(rowTitle)}\\*\\*\\s*\\|[^\\|]*\\|([^\\n\\r]*)`, 'i');
    const match = content.match(rowRegex);
    if (match) {
      const skillsCol = match[1];
      const matches = skillsCol.match(/`([a-zA-Z0-9_-]+)`/g) || [];
      const skills = matches.map(m => m.replaceAll('`', ''));
      rowSkillsMap.set(category, skills);
      skills.forEach(s => documentedSkills.add(s));
    }
  }

  return { documentedSkills, rowSkillsMap };
}

/**
 * Parses policy markdown file content to extract documented skills (backward compatible).
 * @param {string} content
 * @returns {Set<string>}
 */
export function parsePolicySkills(content) {
  return parsePolicySkillsByRow(content).documentedSkills;
}

/**
 * Inserts missing skills into the Task-Specific Workflows / Table 1 of policyContent.
 */
export function insertMissingSkillsToPolicy(policyContent, missingSkillsWithCategory) {
  let updatedContent = policyContent;
  let addedCount = 0;

  for (const { skill, category } of missingSkillsWithCategory) {
    const rowTitle = CATEGORY_ROW_MAP[category] || CATEGORY_ROW_MAP.productivity;
    const rowRegex = new RegExp(`(\\|\\s*\\*\\*${escapeRegex(rowTitle)}\\*\\*\\s*\\|[^\\|]*\\|)([^\\n\\r]*)`, 'i');
    const match = updatedContent.match(rowRegex);

    if (match) {
      const rowHeaderAndCol2 = match[1];
      let skillsCol = match[2].trimEnd();

      // Check idempotency (prevent duplicate insertion)
      const existingMatches = skillsCol.match(/`([a-zA-Z0-9_-]+)`/g) || [];
      const existingSkills = new Set(existingMatches.map(m => m.replaceAll('`', '')));
      if (!existingSkills.has(skill)) {
        if (skillsCol.endsWith('|')) {
          const contentBeforePipe = skillsCol.slice(0, -1).trimEnd();
          const newCellContent = contentBeforePipe.length > 0 
            ? `${contentBeforePipe}, \`${skill}\` |` 
            : ` \`${skill}\` |`;
          updatedContent = updatedContent.replace(match[0], `${rowHeaderAndCol2}${newCellContent}`);
          addedCount++;
        }
      }
    }
  }

  return { updatedContent, addedCount };
}

/**
 * Prunes orphan / obsolete skills from Table 1 of policyContent.
 * @param {string} policyContent
 * @param {Set<string>} orphanSkillsSet
 * @returns {{updatedContent: string, prunedCount: number, prunedList: Array<{skill: string, category: string}>}}
 */
export function pruneOrphanSkillsFromPolicy(policyContent, orphanSkillsSet) {
  let updatedContent = policyContent;
  let prunedCount = 0;
  const prunedList = [];

  for (const [category, rowTitle] of Object.entries(CATEGORY_ROW_MAP)) {
    const rowRegex = new RegExp(`(\\|\\s*\\*\\*${escapeRegex(rowTitle)}\\*\\*\\s*\\|[^\\|]*\\|)([^\\n\\r]*)`, 'i');
    const match = updatedContent.match(rowRegex);

    if (match) {
      const rowHeaderAndCol2 = match[1];
      const skillsCol = match[2];
      const matches = skillsCol.match(/`([a-zA-Z0-9_-]+)`/g) || [];
      const currentSkills = matches.map(m => m.replaceAll('`', ''));

      const remainingSkills = currentSkills.filter(skill => {
        if (orphanSkillsSet.has(skill)) {
          prunedCount++;
          prunedList.push({ skill, category });
          return false;
        }
        return true;
      });

      if (currentSkills.length !== remainingSkills.length) {
        const newCellContent = remainingSkills.length > 0
          ? ` ${remainingSkills.map(s => `\`${s}\``).join(', ')} |`
          : ` |`;
        updatedContent = updatedContent.replace(match[0], `${rowHeaderAndCol2}${newCellContent}`);
      }
    }
  }

  return { updatedContent, prunedCount, prunedList };
}

/**
 * Runs policy coverage audit across root policy and platform deltas.
 */
export function runPolicyAudit({ sourceRoot, config, autoAdd = false, autoPrune = false }) {
  const policyFileName = config.policy?.rootFile || 'AGENTS.md';
  const rootPolicyPath = path.join(sourceRoot, policyFileName);

  if (!fs.existsSync(rootPolicyPath)) {
    console.error(`[-] Error: Root policy file ${policyFileName} not found at ${rootPolicyPath}`);
    return { success: false, exitCode: 1 };
  }

  const skillDirs = findSkillDirectories(sourceRoot);
  const repoSkillsMap = new Map();
  for (const dir of skillDirs) {
    const name = path.basename(dir);
    const category = path.basename(path.dirname(dir));
    repoSkillsMap.set(name, category);
  }

  const repoSkills = Array.from(repoSkillsMap.keys()).sort((a, b) => a.localeCompare(b));
  const repoSkillsSet = new Set(repoSkills);

  // Determine policy files to check and update
  const policyFilesToAudit = [rootPolicyPath];
  const platforms = config.platforms || [];
  for (const p of platforms) {
    const sourceDir = p.sourceDir || p.name;
    const deltaPath = path.join(sourceRoot, sourceDir, policyFileName);
    if (fs.existsSync(deltaPath)) {
      policyFilesToAudit.push(deltaPath);
    }
  }

  // Perform initial audit on root policy
  const rootContent = fs.readFileSync(rootPolicyPath, 'utf-8');
  const { documentedSkills: rootDocumentedSkills } = parsePolicySkillsByRow(rootContent);
  const missingSkills = repoSkills.filter(skill => !rootDocumentedSkills.has(skill));
  const orphanSkills = Array.from(rootDocumentedSkills).filter(skill => !repoSkillsSet.has(skill));

  console.log('==================================================');
  console.log('            POLICY SKILL COVERAGE AUDIT           ');
  console.log('==================================================');
  console.log(`[+] Total skills found in repository: ${repoSkills.length}`);
  console.log(`[+] Total skills documented in ${policyFileName}: ${rootDocumentedSkills.size}`);

  if (missingSkills.length === 0 && orphanSkills.length === 0) {
    console.log(`\n[✔] SUCCESS: 100% of custom skills are documented and zero orphan skills found in ${policyFileName}!`);
    return { success: true, exitCode: 0, missingSkills: [], orphanSkills: [] };
  }

  if (!autoAdd && !autoPrune) {
    if (missingSkills.length > 0) {
      console.error(`\n[❌] ERROR: Found ${missingSkills.length} skill(s) missing from ${policyFileName} table:\n`);
      missingSkills.forEach(s => console.error(`  - ${s} (category: ${repoSkillsMap.get(s)})`));
      console.log(`\n[i] Run 'agents audit --add' to automatically insert missing skills into policy tables.`);
    }

    if (orphanSkills.length > 0) {
      console.error(`\n[⚠️] WARNING: Found ${orphanSkills.length} orphan/obsolete skill(s) in ${policyFileName} table (not in repo):\n`);
      orphanSkills.forEach(s => console.error(`  - ${s}`));
      console.log(`\n[i] Run 'agents audit --prune' to automatically remove obsolete skills from policy tables.`);
    }

    return { success: false, exitCode: 1, missingSkills, orphanSkills };
  }

  let totalAdded = 0;
  let totalPruned = 0;

  // Auto-Prune Mode
  if (autoPrune && orphanSkills.length > 0) {
    console.log(`\n[+] Auto-pruning ${orphanSkills.length} orphan skill(s) from policy tables...`);
    const orphanSkillsSet = new Set(orphanSkills);

    for (const filePath of policyFilesToAudit) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const { updatedContent, prunedCount } = pruneOrphanSkillsFromPolicy(content, orphanSkillsSet);
      if (prunedCount > 0) {
        fs.writeFileSync(filePath, updatedContent, 'utf-8');
        const relPath = path.relative(sourceRoot, filePath);
        console.log(`  [-] Updated ${relPath} (-${prunedCount} orphan skill entries)`);
        totalPruned += prunedCount;
      }
    }
  }

  // Auto-Add Mode
  if (autoAdd && missingSkills.length > 0) {
    console.log(`\n[+] Auto-inserting ${missingSkills.length} missing skill(s) into policy tables...`);
    const missingSkillsWithCategory = missingSkills.map(skill => ({
      skill,
      category: repoSkillsMap.get(skill)
    }));

    for (const filePath of policyFilesToAudit) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const { updatedContent, addedCount } = insertMissingSkillsToPolicy(content, missingSkillsWithCategory);
      if (addedCount > 0) {
        fs.writeFileSync(filePath, updatedContent, 'utf-8');
        const relPath = path.relative(sourceRoot, filePath);
        console.log(`  [+] Updated ${relPath} (+${addedCount} skill entries)`);
        totalAdded += addedCount;
      }
    }
  }

  console.log(`\n[✔] SUCCESS: Policy files updated! (+${totalAdded} added, -${totalPruned} pruned).`);
  return { success: true, exitCode: 0, totalAdded, totalPruned };
}
