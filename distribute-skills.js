const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');

const userHome = os.homedir();
const globalSkillsBase = fs.existsSync(path.join(__dirname, 'myskills')) ? path.join(__dirname, 'myskills') : __dirname;
const subagentRulesBase = path.join(globalSkillsBase, 'subagent_rules');
const globalAgentsSource = path.join(globalSkillsBase, 'AGENTS.md');

// Recursively find all directories containing SKILL.md under a base path
function findSkillDirectories(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  const items = fs.readdirSync(dir);

  // If this directory itself contains SKILL.md, it is a skill directory
  if (items.includes('SKILL.md')) {
    results.push(dir);
    return results;
  }

  for (const item of items) {
    if (item.startsWith('.') || item.startsWith('_')) {
      continue;
    }
    const itemPath = path.join(dir, item);
    if (fs.statSync(itemPath).isDirectory()) {
      findSkillDirectories(itemPath, results);
    }
  }
  return results;
}

// Dynamically read custom skills recursively from the myskills folder
let CUSTOM_SKILLS = [];
try {
  const skillDirs = findSkillDirectories(globalSkillsBase);
  CUSTOM_SKILLS = skillDirs.map((dir) => {
    return {
      name: path.basename(dir),
      srcPath: dir
    };
  });
} catch (err) {
  console.error(`[-] Warning: Failed to scan custom skills recursively from ${globalSkillsBase}: ${err.message}`);
}

// Parse command line arguments
const args = process.argv.slice(2);
let mode = null; // 'all' or 'target'
let targetDir = null;
let shouldPrune = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--help' || args[i] === '-h') {
    console.log("Usage: node distribute-skills.js [options]\n");
    console.log("Options:");
    console.log("  --all <parent-directory>          Distribute skills across all project directories in parent-directory");
    console.log("  --target <project-directory>      Distribute skills to a specific project directory");
    console.log("  --prune                           Prune obsolete non-catalog skills during distribution");
    console.log("  --help, -h                        Show this help message and exit");
    process.exit(0);
  } else if (args[i] === '--all') {
    mode = 'all';
    targetDir = args[i + 1] || __dirname;
    i++;
  } else if (args[i] === '--target') {
    mode = 'target';
    targetDir = args[i + 1];
    i++;
  } else if (args[i] === '--prune') {
    shouldPrune = true;
  }
}

// Default fallback for backward compatibility
if (!mode) {
  mode = 'all';
  targetDir = __dirname;
}

if (!targetDir) {
  console.error("[-] Error: Missing directory target.");
  console.log("Usage:");
  console.log("  node distribute-skills.js --all <parent-directory>");
  console.log("  node distribute-skills.js --target <specific-project-directory>");
  process.exit(1);
}

console.log(`[*] Using skills source: ${globalSkillsBase}`);

function copyRecursiveIfDifferent(src, dest) {
  let changed = false;
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
      changed = true;
    }
    fs.readdirSync(src).forEach((childItemName) => {
      const childSrc = path.join(src, childItemName);
      const childDest = path.join(dest, childItemName);
      if (copyRecursiveIfDifferent(childSrc, childDest)) {
        changed = true;
      }
    });
    // Remove extra files in dest that are not in src
    if (fs.existsSync(dest)) {
      fs.readdirSync(dest).forEach((childItemName) => {
        const childSrc = path.join(src, childItemName);
        const childDest = path.join(dest, childItemName);
        if (!fs.existsSync(childSrc)) {
          fs.rmSync(childDest, { recursive: true, force: true });
          changed = true;
        }
      });
    }
  } else {
    let shouldCopy = true;
    if (fs.existsSync(dest)) {
      const srcBuf = fs.readFileSync(src);
      const destBuf = fs.readFileSync(dest);
      if (srcBuf.equals(destBuf)) {
        shouldCopy = false;
      }
    }
    if (shouldCopy) {
      const destDir = path.dirname(dest);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(src, dest);
      changed = true;
    }
  }
  return changed;
}

function isLocalSkill(skillDir) {
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

function pruneObsoleteSkills(projectPath, allowPrune = false) {
  const activeSkillNames = new Set(CUSTOM_SKILLS.map((s) => s.name));
  const targetDirs = [
    path.join(projectPath, '.agents', 'skills'),
    path.join(projectPath, '.claude', 'skills'),
    path.join(projectPath, '.gemini', 'skills')
  ];

  let prunedAny = false;
  const obsoleteCandidates = [];

  for (const dir of targetDirs) {
    if (!fs.existsSync(dir)) continue;
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const itemPath = path.join(dir, item);
      try {
        if (fs.statSync(itemPath).isDirectory() && !activeSkillNames.has(item)) {
          if (isLocalSkill(itemPath)) {
            console.log(`  [~] Preserving repo-specific local skill "${item}" at ${itemPath}`);
            continue;
          }

          if (allowPrune) {
            console.log(`[-] Pruning obsolete skill "${item}" from ${itemPath}`);
            fs.rmSync(itemPath, { recursive: true, force: true });
            prunedAny = true;
          } else {
            obsoleteCandidates.push({ name: item, path: itemPath });
          }
        }
      } catch (_e) {}
    }
  }

  if (!allowPrune && obsoleteCandidates.length > 0) {
    console.log(`  [⚠️] Notice: Found ${obsoleteCandidates.length} non-catalog skill(s) (pass '--prune' to delete, or add 'local: true' to frontmatter to keep):`);
    obsoleteCandidates.forEach(s => console.log(`      - ${s.name}`));
  }

  return prunedAny;
}

function copyCustomSkills(projectPath) {
  let changedAny = false;
  const pruned = pruneObsoleteSkills(projectPath, shouldPrune);
  if (pruned) changedAny = true;

  for (const skill of CUSTOM_SKILLS) {
    const srcDir = skill.srcPath;
    const destDir = path.join(projectPath, '.agents', 'skills', skill.name);
    try {
      const changed = copyRecursiveIfDifferent(srcDir, destDir);
      if (changed) {
        console.log(`[+] Synced and updated ${skill.name} to ${destDir}`);
        changedAny = true;
      } else {
        console.log(`  [~] ${skill.name} is already up to date`);
      }
    } catch (err) {
      console.error(`[-] Failed to copy custom skill ${skill.name} to ${projectPath}: ${err.message}`);
    }
  }
  return changedAny;
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

function processProject(projectPath) {
  const projectName = path.basename(projectPath);
  console.log(`\n==================================================`);
  console.log(`Checking project: ${projectName}`);

  if (hasSkillsInstalled(projectPath)) {
    console.log(`[~] Skills are already present. Skipping installation.`);
    const changed = copyCustomSkills(projectPath);
    return { status: changed ? 'updated' : 'skipped', name: projectName };
  }

  console.log(`[*] Installing skills locally for ${projectName}...`);
  try {
    execSync('npx skills add mattpocock/skills --all', {
      cwd: projectPath,
      stdio: 'inherit'
    });
    console.log(`[+] Successfully installed skills in ${projectName}`);
    copyCustomSkills(projectPath);
    return { status: 'installed', name: projectName };
  } catch (err) {
    console.error(`[-] Failed to install skills in ${projectName}: ${err.message}`);
    return { status: 'failed', name: projectName, error: err.message };
  }
}

// Multi-IDE Sync Engine (Gemini, Claude Code, Cursor, Windsurf, Codex)
function syncMultiIDEGlobalConfigs() {
  const platforms = [
    {
      name: 'Google Antigravity / Gemini',
      baseDir: path.join(userHome, '.gemini'),
      agentsDest: path.join(userHome, '.gemini', 'AGENTS.md'),
      skillsDir: path.join(userHome, '.gemini', 'config', 'skills'),
      subagentRulesDir: path.join(userHome, '.gemini', 'config', 'subagent_rules')
    },
    {
      name: 'Claude Code (Anthropic)',
      baseDir: path.join(userHome, '.claude'),
      agentsDest: path.join(userHome, '.claude', 'CLAUDE.md'),
      skillsDir: path.join(userHome, '.claude', 'skills'),
      subagentRulesDir: path.join(userHome, '.claude', 'subagent_rules')
    },
    {
      name: 'Cursor IDE',
      baseDir: path.join(userHome, '.cursor'),
      agentsDest: path.join(userHome, '.cursor', 'rules', 'AGENTS.md'),
      skillsDir: path.join(userHome, '.cursor', 'skills'),
      subagentRulesDir: path.join(userHome, '.cursor', 'subagent_rules')
    }
  ];

  console.log(`\n[*] Executing Multi-IDE Global Configuration Sync...`);

  for (const platform of platforms) {
    // Only deploy if the platform directory exists or if it's default Gemini
    const shouldDeploy = fs.existsSync(platform.baseDir) || platform.name.includes('Gemini');
    if (!shouldDeploy) continue;

    console.log(`  [->] Syncing configuration for ${platform.name}...`);

    // 1. Sync AGENTS.md
    if (fs.existsSync(globalAgentsSource)) {
      try {
        const changed = copyRecursiveIfDifferent(globalAgentsSource, platform.agentsDest);
        if (changed) {
          console.log(`    [+] Updated AGENTS.md at ${platform.agentsDest}`);
        }
      } catch (err) {
        console.error(`    [-] Failed to sync AGENTS.md to ${platform.agentsDest}: ${err.message}`);
      }
    }

    // 2. Sync Custom Skills
    for (const skill of CUSTOM_SKILLS) {
      const destDir = path.join(platform.skillsDir, skill.name);
      try {
        copyRecursiveIfDifferent(skill.srcPath, destDir);
      } catch (err) {
        console.error(`    [-] Failed to sync skill ${skill.name} to ${destDir}: ${err.message}`);
      }
    }

    // 3. Sync Subagent Rules
    if (fs.existsSync(subagentRulesBase)) {
      try {
        copyRecursiveIfDifferent(subagentRulesBase, platform.subagentRulesDir);
        console.log(`    [+] Synced subagent rules to ${platform.subagentRulesDir}`);
      } catch (err) {
        console.error(`    [-] Failed to sync subagent rules to ${platform.subagentRulesDir}: ${err.message}`);
      }
    }
  }
}

function run() {
  syncMultiIDEGlobalConfigs();
  if (mode === 'target') {
    const resolvedPath = path.resolve(targetDir);
    if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isDirectory()) {
      console.error(`[-] Error: Target directory does not exist: ${resolvedPath}`);
      process.exit(1);
    }
    const result = processProject(resolvedPath);
    console.log(`\nDone! Status for ${result.name}: ${result.status}`);
  } else {
    // Mode is 'all'
    const resolvedParent = path.resolve(targetDir);
    if (!fs.existsSync(resolvedParent) || !fs.statSync(resolvedParent).isDirectory()) {
      console.error(`[-] Error: Parent directory does not exist: ${resolvedParent}`);
      process.exit(1);
    }
    
    const items = fs.readdirSync(resolvedParent);
    const installed = [];
    const updated = [];
    const skipped = [];
    const failed = [];

    for (const item of items) {
      const itemPath = path.join(resolvedParent, item);
      if (!fs.statSync(itemPath).isDirectory()) {
        continue;
      }

      const nameLower = item.toLowerCase();
      if (
        nameLower.includes('backup') || 
        nameLower.includes('worktree') || 
        item.startsWith('.') ||
        item.startsWith('_')
      ) {
        continue;
      }

      const result = processProject(itemPath);
      if (result.status === 'installed') installed.push(result.name);
      else if (result.status === 'updated') updated.push(result.name);
      else if (result.status === 'skipped') skipped.push(result.name);
      else if (result.status === 'failed') failed.push(`${result.name} (Error: ${result.error})`);
    }

    // Print Summary
    console.log(`\n==================================================`);
    console.log(`                    SUMMARY                       `);
    console.log(`==================================================`);
    
    console.log(`\n[+] INSTALLED PROJECTS (${installed.length}):`);
    if (installed.length > 0) {
      installed.forEach(p => console.log(`  - ${p}`));
    } else {
      console.log(`  (None)`);
    }

    console.log(`\n[+] UPDATED PROJECTS (${updated.length}):`);
    if (updated.length > 0) {
      updated.forEach(p => console.log(`  - ${p}`));
    } else {
      console.log(`  (None)`);
    }

    console.log(`\n[~] SKIPPED PROJECTS (${skipped.length}):`);
    if (skipped.length > 0) {
      skipped.forEach(p => console.log(`  - ${p}`));
    } else {
      console.log(`  (None)`);
    }

    if (failed.length > 0) {
      console.log(`\n[-] FAILED PROJECTS (${failed.length}):`);
      failed.forEach(p => console.log(`  - ${p}`));
    }
    console.log(`==================================================\n`);
  }
}

run();
