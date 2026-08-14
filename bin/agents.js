#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSkillCatalog, listSkillsDetailed } from '../src/discovery.js';
import { loadConfig } from '../src/platforms.js';
import { printSummary } from '../src/projects.js';
import { executeDistribution } from '../src/distribute.js';
import { runPolicyAudit } from '../src/audit.js';
import { readPolicySubdoc, readSkillContent } from '../src/reader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function getConfigFile(rootPath) {
  const agentsConfig = path.join(rootPath, 'agents.config.json');
  if (fs.existsSync(agentsConfig)) {
    return agentsConfig;
  }
  return path.join(rootPath, 'distribute-skills.config.json');
}

function findSubdocs(dirPath, excludeFiles = []) {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return [];
  }
  const excludeBasenames = new Set(excludeFiles.map(f => path.basename(f).toLowerCase()));
  const results = [];

  function scan(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        if (!excludeBasenames.has(entry.name.toLowerCase())) {
          results.push(fullPath);
        }
      }
    }
  }

  scan(dirPath);
  return results;
}

function findPolicyDeltas(rootPath, config) {
  const deltas = [];
  const platforms = config.platforms || [];
  const policyFileName = config.policy?.rootFile || 'AGENTS.md';
  
  for (const p of platforms) {
    const sourceDir = p.sourceDir || p.name;
    const deltaPath = path.join(rootPath, sourceDir, policyFileName);
    if (fs.existsSync(deltaPath)) {
      deltas.push(deltaPath);
    }
  }
  return deltas;
}

function printHelp() {
  console.log(`
Usage: agents <command> [options]

Commands:
  distribute, --distribute          Run distribution engine across projects/platforms
  audit, --audit [--add]            Audit policy skill coverage across AGENTS.md & deltas
  list, --list                      List available skills with name & description, with optional category filtering
  read, --read <target>             Print raw markdown content of policy subdoc, skill, or skill subdoc directly to stdout
  info, --info [target]             Print JSON info for repo ('repo'), policy ('policy.general', 'policy.<platform>'), or skill ('skill.<skillname>')
  where, --where                    Print absolute path of myskills repo root
  help, --help, -h                  Show help menu

List Options (use with 'list' or '--list'):
  -c, --category <name>             Filter skills by category (design, engineering, quality, productivity, personal)
  -q, --query <keyword>             Search skills by keyword in name or description
  --json                            Output skill metadata as structured JSON
  --all                             List all skills across all categories (default)

Distribute Options (use with 'distribute' or '--distribute'):
  -t, --target <dir>                Distribute skills to a specific project directory
  -a, --all [dir]                   Distribute skills across all projects in directory
  -p, --prune                       Prune obsolete non-catalog skills during distribution
  -d, --dry-run                     Preview changes without applying them to disk
  -i, --init                        Run 'npx skills add' initialization in projects

Audit Options (use with 'audit' or '--audit'):
  -a, --add                         Auto-insert missing skills into AGENTS.md Task-Specific Workflows tables

Examples:
  agents where                      # Print myskills repo root path
  agents audit                      # Check if 100% of skills are documented in AGENTS.md
  agents audit --add                # Auto-insert missing skills into AGENTS.md & deltas
  agents read policy.git_workflow                 # Print content of subdocs/git_workflow.md
  agents read policy.plan_template.md             # Print content with explicit .md extension
  agents read skill.tdd                           # Print content of tdd/SKILL.md
  agents read skill.writing-great-skills/GLOSSARY # Print content of writing-great-skills/GLOSSARY.md
  agents info policy.general        # Print resolution paths for root Universal AGENTS.md policy
  agents info policy.gemini         # Print resolution paths for Gemini policy delta
  agents info skill.write-a-skill   # Print source location and subdocs for 'write-a-skill'
  agents distribute                 # Distribute skills/policies to all projects
  agents distribute -d              # Dry-run preview of distribution
  agents distribute -t ./my-app     # Distribute to specific project directory
`);
}

const args = process.argv.slice(2);

if (args.length === 0) {
  printHelp();
  process.exit(0);
}

const firstArg = args[0];

// Handle Help
if (firstArg === 'help' || firstArg === '--help' || firstArg === '-h') {
  printHelp();
  process.exit(0);
}

// Handle Where
if (firstArg === 'where' || firstArg === '--where') {
  console.log(projectRoot);
  process.exit(0);
}

// Handle Audit
if (firstArg === 'audit' || firstArg === '--audit') {
  const configPath = getConfigFile(projectRoot);
  let config;
  try {
    config = loadConfig(configPath);
  } catch (e) {
    config = {
      policy: { rootFile: 'AGENTS.md', subdocsDir: 'subdocs' },
      categories: ['design', 'engineering', 'quality', 'productivity', 'personal'],
      platforms: []
    };
  }

  const auditArgs = args.slice(1);
  const autoAdd = auditArgs.includes('--add') || auditArgs.includes('-a');

  const result = runPolicyAudit({ sourceRoot: projectRoot, config, autoAdd });
  process.exit(result.exitCode);
}

// Handle List
if (firstArg === 'list' || firstArg === '--list') {
  const configPath = getConfigFile(projectRoot);
  let config;
  try {
    config = loadConfig(configPath);
  } catch (e) {
    config = {
      categories: ['design', 'engineering', 'quality', 'productivity', 'personal']
    };
  }

  let categoryFilter = null;
  let queryFilter = null;
  let isJson = false;

  const listArgs = args.slice(1);
  for (let i = 0; i < listArgs.length; i++) {
    const arg = listArgs[i];
    if (arg === '-c' || arg === '--category') {
      if (listArgs[i + 1] && !listArgs[i + 1].startsWith('-')) {
        categoryFilter = listArgs[++i].toLowerCase();
      }
    } else if (arg === '-q' || arg === '--query') {
      if (listArgs[i + 1] && !listArgs[i + 1].startsWith('-')) {
        queryFilter = listArgs[++i].toLowerCase();
      }
    } else if (arg === '--json') {
      isJson = true;
    } else if (arg === '--all') {
      categoryFilter = null;
    } else if (!arg.startsWith('-') && !categoryFilter) {
      categoryFilter = arg.toLowerCase();
    }
  }

  let skills = listSkillsDetailed(projectRoot, config.categories || []);

  if (categoryFilter) {
    skills = skills.filter(s => s.category.toLowerCase() === categoryFilter);
  }

  if (queryFilter) {
    skills = skills.filter(s => 
      s.name.toLowerCase().includes(queryFilter) || 
      s.description.toLowerCase().includes(queryFilter)
    );
  }

  if (isJson) {
    console.log(JSON.stringify(skills, null, 2));
    process.exit(0);
  }

  if (skills.length === 0) {
    console.log(`[-] No skills found matching category="${categoryFilter || 'all'}" query="${queryFilter || ''}".`);
    process.exit(0);
  }

  const grouped = new Map();
  for (const s of skills) {
    if (!grouped.has(s.category)) {
      grouped.set(s.category, []);
    }
    grouped.get(s.category).push(s);
  }

  console.log(`\nFound ${skills.length} skills (filter: category="${categoryFilter || 'all'}"):\n`);
  for (const [cat, list] of grouped.entries()) {
    console.log(`[Category: ${cat}] (${list.length} skills)`);
    for (const item of list) {
      const desc = item.description ? ` - ${item.description}` : ' (No description)';
      console.log(`  • ${item.name}${desc}`);
    }
    console.log('');
  }

  process.exit(0);
}

// Handle Read
if (firstArg === 'read' || firstArg === '--read') {
  const configPath = getConfigFile(projectRoot);
  let config;
  try {
    config = loadConfig(configPath);
  } catch (e) {
    config = {
      policy: { rootFile: 'AGENTS.md', subdocsDir: 'subdocs' },
      categories: ['design', 'engineering', 'quality', 'productivity', 'personal'],
      platforms: []
    };
  }

  const target = args[1] && !args[1].startsWith('-') ? args[1] : null;
  if (!target) {
    console.error("[-] Error: Missing read target. Format: 'policy.<subdoc>' or 'skill.<skillname>[/<subdoc>]'");
    process.exit(1);
  }

  if (target.startsWith('policy.')) {
    const res = readPolicySubdoc(target, { config, sourceRoot: projectRoot });
    if (!res.success) {
      console.error(res.error);
      process.exit(res.exitCode || 1);
    }
    process.stdout.write(res.content);
    process.exit(0);
  } else if (target.startsWith('skill.')) {
    const res = readSkillContent(target, { sourceRoot: projectRoot });
    if (!res.success) {
      console.error(res.error);
      process.exit(res.exitCode || 1);
    }
    process.stdout.write(res.content);
    process.exit(0);
  } else {
    let res = readSkillContent(target, { sourceRoot: projectRoot });
    if (!res.success) {
      res = readPolicySubdoc(target, { config, sourceRoot: projectRoot });
    }
    if (!res.success) {
      console.error(res.error);
      process.exit(res.exitCode || 1);
    }
    process.stdout.write(res.content);
    process.exit(0);
  }
}

// Handle Info
if (firstArg === 'info' || firstArg === '--info') {
  const configPath = getConfigFile(projectRoot);
  let config;
  try {
    config = loadConfig(configPath);
  } catch (e) {
    config = {
      policy: { rootFile: 'AGENTS.md', subdocsDir: 'subdocs' },
      categories: ['design', 'engineering', 'quality', 'productivity', 'personal'],
      platforms: []
    };
  }

  const query = args[1] && !args[1].startsWith('-') ? args[1] : null;

  if (!query || query === 'repo') {
    console.log(JSON.stringify({
      repoRoot: projectRoot,
      configPath: configPath,
      binPath: __filename,
      categories: config.categories
    }, null, 2));
    process.exit(0);
  }

  const isExplicitPolicy = query === 'policy' || query === 'policy.general' || query === 'policy.root' || query.startsWith('policy.');
  const isLegacyPolicy = query.endsWith('.policy');

  if (isExplicitPolicy || isLegacyPolicy) {
    let platformName;
    if (query === 'policy' || query === 'policy.general' || query === 'policy.root') {
      platformName = 'general';
    } else if (query.startsWith('policy.')) {
      platformName = query.replace(/^policy\./, '');
    } else if (query.endsWith('.policy')) {
      platformName = query.replace(/\.policy$/, '');
    } else {
      platformName = 'general';
    }

    const policyFileName = config.policy?.rootFile || 'AGENTS.md';
    const subdocsDirName = config.policy?.subdocsDir || 'subdocs';
    const rootSubdocs = findSubdocs(path.join(projectRoot, subdocsDirName));

    if (platformName.toLowerCase() === 'general' || platformName.toLowerCase() === 'root') {
      const sourceFile = path.join(projectRoot, policyFileName);
      const deltas = findPolicyDeltas(projectRoot, config);

      console.log(JSON.stringify({
        type: 'policy',
        platform: 'general',
        sourceFile: sourceFile,
        destinationFile: null,
        isPlatformOverride: false,
        subdocs: rootSubdocs,
        deltas: deltas
      }, null, 2));
      process.exit(0);
    } else {
      const platform = (config.platforms || []).find(p => p.name.toLowerCase() === platformName.toLowerCase());
      const sourceDir = platform ? platform.sourceDir : platformName;
      const specificPath = path.join(projectRoot, sourceDir, policyFileName);
      const fallbackPath = path.join(projectRoot, policyFileName);

      const isPlatformOverride = fs.existsSync(specificPath);
      const sourceFile = isPlatformOverride ? specificPath : fallbackPath;
      const destinationFile = platform ? platform.agentsDest : null;
      const basePolicy = path.join(projectRoot, policyFileName);

      let combinedSubdocs = [...rootSubdocs];
      if (isPlatformOverride) {
        const platformSubdocs = findSubdocs(path.join(projectRoot, sourceDir), [policyFileName, 'README.md']);
        combinedSubdocs = [...combinedSubdocs, ...platformSubdocs];
      }

      console.log(JSON.stringify({
        type: 'policy',
        platform: platformName,
        sourceFile: sourceFile,
        destinationFile: destinationFile,
        basePolicy: basePolicy,
        isPlatformOverride: isPlatformOverride,
        subdocs: combinedSubdocs
      }, null, 2));
      process.exit(0);
    }
  } else {
    const skillName = query.startsWith('skill.') ? query.replace(/^skill\./, '') : query;
    const skillCatalog = loadSkillCatalog(projectRoot);
    const skill = skillCatalog.get(skillName);

    if (!skill) {
      console.error(`[-] Error: Skill "${skillName}" not found in myskills catalog.`);
      process.exit(1);
    }

    const category = path.basename(path.dirname(skill.srcPath));
    const subdocs = findSubdocs(skill.srcPath, ['SKILL.md']);

    console.log(JSON.stringify({
      type: 'skill',
      name: skill.name,
      srcPath: skill.srcPath,
      skillFile: path.join(skill.srcPath, 'SKILL.md'),
      subdocs: subdocs,
      category: category
    }, null, 2));
    process.exit(0);
  }
}

// Handle Distribute
let isDistributeAction = false;
let optStartIndex = 0;

if (firstArg === 'distribute' || firstArg === '--distribute') {
  isDistributeAction = true;
  optStartIndex = 1;
} else if (firstArg.startsWith('-')) {
  const validDistributeFlags = ['--target', '-t', '--all', '-a', '--prune', '-p', '--dry-run', '-d', '--init', '-i'];
  if (validDistributeFlags.includes(firstArg)) {
    isDistributeAction = true;
  }
}

if (!isDistributeAction) {
  console.error(`[-] Error: Unknown command or option '${firstArg}'. Run 'agents --help' for usage.`);
  process.exit(1);
}

// Parse Distribute Options
let mode = null;
let targetDir = null;
let allowPrune = false;
let dryRun = false;
let init = false;

for (let i = optStartIndex; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--distribute' || arg === 'distribute') {
    continue;
  } else if (arg === '--all' || arg === '-a') {
    mode = 'all';
    if (args[i + 1] && !args[i + 1].startsWith('-')) {
      targetDir = args[++i];
    }
  } else if (arg === '--target' || arg === '-t') {
    mode = 'target';
    if (args[i + 1] && !args[i + 1].startsWith('-')) {
      targetDir = args[++i];
    } else {
      console.error("[-] Error: Missing directory target after '--target' / '-t'.");
      process.exit(1);
    }
  } else if (arg === '--prune' || arg === '-p') {
    allowPrune = true;
  } else if (arg === '--dry-run' || arg === '-d') {
    dryRun = true;
  } else if (arg === '--init' || arg === '-i') {
    init = true;
  } else {
    console.error(`[-] Error: Unknown distribute option '${arg}'. Run 'agents --help' for usage.`);
    process.exit(1);
  }
}

let config;
try {
  const configPath = getConfigFile(projectRoot);
  config = loadConfig(configPath);
} catch (e) {
  console.error("[-] Failed to load config:", e.message);
  process.exit(1);
}

try {
  const summary = executeDistribution({
    config,
    mode: mode || 'all',
    targetDir,
    dryRun,
    allowPrune,
    init,
    projectRoot
  });
  printSummary(summary);
} catch (e) {
  console.error(`[-] Error: ${e.message}`);
  process.exit(1);
}
