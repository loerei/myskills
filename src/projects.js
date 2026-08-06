import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { pruneObsoleteSkills, copyRecursiveIfDifferent } from './sync.js';

/**
 * Returns array of project paths under parentDir.
 * @param {string} parentDir 
 * @param {string[]} excludePatterns 
 * @returns {string[]}
 */
export function discoverProjects(parentDir, excludePatterns) {
  if (!fs.existsSync(parentDir)) return [];
  const items = fs.readdirSync(parentDir);
  const projects = [];
  
  for (const item of items) {
    const itemPath = path.join(parentDir, item);
    if (!fs.statSync(itemPath).isDirectory()) continue;
    
    if (item.startsWith('.') || item.startsWith('_')) continue;
    
    const nameLower = item.toLowerCase();
    const shouldExclude = excludePatterns.some(pattern => nameLower.includes(pattern.toLowerCase()));
    if (shouldExclude) continue;
    
    projects.push(itemPath);
  }
  
  return projects;
}

function hasSkillsInstalled(projectPath) {
  const checkPaths = [
    path.join(projectPath, '.agents', 'skills'),
    path.join(projectPath, '.gemini', 'skills'),
    path.join(projectPath, 'skills')
  ];

  for (const p of checkPaths) {
    if (fs.existsSync(p) && fs.readdirSync(p).length > 0) {
      return true;
    }
  }
  return false;
}

/**
 * Process a single project to sync skills.
 * @param {string} projectPath 
 * @param {Map<string, {name: string, srcPath: string}>} skillCatalog 
 * @param {object} options 
 * @returns {object}
 */
export function processProject(projectPath, skillCatalog, { dryRun = false, allowPrune = false, init = false }) {
  const projectName = path.basename(projectPath);
  const result = { status: 'skipped', name: projectName, changes: [], errors: [] };
  
  let needsInit = init;
  if (!hasSkillsInstalled(projectPath)) {
    needsInit = true;
  }
  
  if (needsInit && !dryRun) {
    try {
      const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      execSync(`${npxCmd} skills add mattpocock/skills --all`, {
        cwd: projectPath,
        stdio: 'ignore',
        env: { ...process.env }
      });
      result.status = 'installed';
    } catch (e) {
      result.status = 'failed';
      result.errors.push(`Init failed: ${e.message}`);
      return result;
    }
  } else if (needsInit && dryRun) {
    result.status = 'installed';
    result.changes.push('Would run npx skills add mattpocock/skills --all');
  }

  const activeNames = Array.from(skillCatalog.keys());
  const pruneResult = pruneObsoleteSkills(projectPath, activeNames, { dryRun, allowPrune });
  if (pruneResult.pruned.length > 0) {
    result.changes.push(...pruneResult.pruned.map(p => `Pruned ${p}`));
  }
  if (pruneResult.candidates.length > 0) {
    result.errors.push(`Notice: Found ${pruneResult.candidates.length} non-catalog skill(s). Pass --prune to delete.`);
  }

  let changedAny = pruneResult.pruned.length > 0;
  
  for (const [name, skill] of skillCatalog.entries()) {
    const destDir = path.join(projectPath, '.agents', 'skills', name);
    try {
      const cp = copyRecursiveIfDifferent(skill.srcPath, destDir, { dryRun });
      if (cp.changed) {
        changedAny = true;
        result.changes.push(`Updated ${name}`);
      }
    } catch (e) {
      result.errors.push(`Failed to sync ${name}: ${e.message}`);
    }
  }
  
  if (result.status !== 'installed' && changedAny) {
    result.status = 'updated';
  }
  
  return result;
}

/**
 * Print formatted summary.
 * @param {object} results 
 */
export function printSummary({ platformResults, projectResults }) {
  console.log('\n==================================================');
  console.log('                    SUMMARY                       ');
  console.log('==================================================');
  
  console.log('\n[+] PLATFORM SYNC:');
  for (const p of platformResults) {
    if (!p.synced) {
      console.log(`  - ${p.platform}: Skipped (Base dir not found)`);
    } else {
      console.log(`  - ${p.platform}: Synced (${p.changes.length} changes)`);
      p.errors.forEach(e => console.log(`      Error: ${e}`));
    }
  }
  
  const installed = projectResults.filter(r => r.status === 'installed');
  const updated = projectResults.filter(r => r.status === 'updated');
  const skipped = projectResults.filter(r => r.status === 'skipped');
  const failed = projectResults.filter(r => r.status === 'failed');

  console.log(`\n[+] INSTALLED PROJECTS (${installed.length}):`);
  if (installed.length > 0) installed.forEach(p => console.log(`  - ${p.name}`));
  else console.log(`  (None)`);

  console.log(`\n[+] UPDATED PROJECTS (${updated.length}):`);
  if (updated.length > 0) updated.forEach(p => console.log(`  - ${p.name}`));
  else console.log(`  (None)`);

  console.log(`\n[~] SKIPPED PROJECTS (${skipped.length}):`);
  if (skipped.length > 0) skipped.forEach(p => console.log(`  - ${p.name}`));
  else console.log(`  (None)`);

  if (failed.length > 0) {
    console.log(`\n[-] FAILED PROJECTS (${failed.length}):`);
    failed.forEach(p => {
      console.log(`  - ${p.name}`);
      p.errors.forEach(e => console.log(`      ${e}`));
    });
  }
  console.log(`==================================================\n`);
}
