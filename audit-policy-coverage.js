#!/usr/bin/env node

/**
 * Audit Policy Coverage Script
 * Validates that 100% of custom skills in myskills repository are documented
 * in the Task-Specific Workflows matrix of AGENTS.md.
 */

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = __dirname;
const agentsPath = path.join(repoRoot, 'AGENTS.md');

// Helper to discover all valid skill directories containing SKILL.md
function findSkillDirectories(dir) {
  const entries = fs.readdirSync(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter(e => e.isFile() && e.name === 'SKILL.md')
    .map(e => e.parentPath || path.dirname(path.join(dir, e.name)))
    .filter(p => !p.includes('node_modules') && !p.includes('.git') && !p.includes('.agents'));
}

function auditCoverage() {
  if (!fs.existsSync(agentsPath)) {
    console.error(`[-] Error: Policy file AGENTS.md not found at ${agentsPath}`);
    process.exit(1);
  }

  const skillDirs = findSkillDirectories(repoRoot);
  const repoSkills = skillDirs.map(d => path.basename(d)).sort((a, b) => a.localeCompare(b));

  const agentsContent = fs.readFileSync(agentsPath, 'utf-8');
  
  // Extract Task-Specific Workflows table
  const tableMatch = agentsContent.match(/## Task-Specific Workflows[\s\S]*?\n\n/);
  const searchSection = tableMatch ? tableMatch[0] : agentsContent;
  
  const matches = searchSection.match(/`([a-zA-Z0-9_-]+)`/g) || [];
  const mentionedSkills = new Set(matches.map(m => m.replaceAll('`', '')));

  const missingSkills = repoSkills.filter(skill => !mentionedSkills.has(skill));

  console.log('==================================================');
  console.log('            POLICY SKILL COVERAGE AUDIT           ');
  console.log('==================================================');
  console.log(`[+] Total skills found in repository: ${repoSkills.length}`);
  console.log(`[+] Total skills documented in AGENTS.md: ${mentionedSkills.size}`);

  if (missingSkills.length === 0) {
    console.log('\n[✔] SUCCESS: 100% of custom skills are documented in AGENTS.md!');
    process.exit(0);
  } else {
    console.error(`\n[❌] ERROR: Found ${missingSkills.length} skill(s) missing from AGENTS.md Task-Specific Workflows table:\n`);
    missingSkills.forEach(s => console.error(`  - ${s}`));
    process.exit(1);
  }
}

auditCoverage();
