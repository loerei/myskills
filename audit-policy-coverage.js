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

// Helper to recursively discover all valid skill directories containing SKILL.md
function findSkillDirectories(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  const items = fs.readdirSync(dir);

  if (items.includes('SKILL.md')) {
    results.push(dir);
    return results;
  }

  for (const item of items) {
    if (item.startsWith('.') || item.startsWith('_') || item === 'node_modules' || item === 'pending') {
      continue;
    }
    const itemPath = path.join(dir, item);
    try {
      if (fs.statSync(itemPath).isDirectory()) {
        findSkillDirectories(itemPath, results);
      }
    } catch (_e) {
      // Ignore unreadable paths
    }
  }
  return results;
}

function auditCoverage() {
  if (!fs.existsSync(agentsPath)) {
    console.error(`[-] Error: Policy file AGENTS.md not found at ${agentsPath}`);
    process.exit(1);
  }

  const skillDirs = findSkillDirectories(repoRoot);
  const repoSkills = skillDirs.map(d => path.basename(d)).sort();

  const agentsContent = fs.readFileSync(agentsPath, 'utf-8');
  
  // Extract Task-Specific Workflows table
  const tableMatch = agentsContent.match(/## Task-Specific Workflows[\s\S]*?\n\n/);
  const searchSection = tableMatch ? tableMatch[0] : agentsContent;
  
  const matches = searchSection.match(/`([a-zA-Z0-9_-]+)`/g) || [];
  const mentionedSkills = new Set(matches.map(m => m.replace(/`/g, '')));

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
