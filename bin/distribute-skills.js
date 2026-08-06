#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSkillCatalog } from '../src/discovery.js';
import { loadConfig, syncPlatformGlobals } from '../src/platforms.js';
import { discoverProjects, processProject, printSummary } from '../src/projects.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
let mode = null;
let targetDir = null;
let allowPrune = false;
let dryRun = false;
let init = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--where') {
    console.log(projectRoot);
    process.exit(0);
  } else if (args[i] === '--info') {
    const configPath = path.join(projectRoot, 'distribute-skills.config.json');
    console.log(JSON.stringify({
      repoRoot: projectRoot,
      configPath: configPath,
      binPath: __filename
    }, null, 2));
    process.exit(0);
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log("Usage: distribute-skills [options]\n");
    console.log("Options:");
    console.log("  --all [dir]                       Distribute skills across all projects in directory");
    console.log("  --target <dir>                    Distribute skills to specific project");
    console.log("  --prune                           Prune obsolete non-catalog skills");
    console.log("  --dry-run                         Show changes without applying them");
    console.log("  --init                            Run 'npx skills add mattpocock/skills --all' in projects");
    console.log("  --where                           Print absolute path of myskills repo root");
    console.log("  --info                            Print JSON metadata about repo root and config");
    console.log("  --help, -h                        Show help");
    process.exit(0);
  } else if (args[i] === '--all') {
    mode = 'all';
    if (args[i + 1] && !args[i + 1].startsWith('-')) {
      targetDir = args[++i];
    }
  } else if (args[i] === '--target') {
    mode = 'target';
    targetDir = args[++i];
  } else if (args[i] === '--prune') {
    allowPrune = true;
  } else if (args[i] === '--dry-run') {
    dryRun = true;
  } else if (args[i] === '--init') {
    init = true;
  }
}

let config;
try {
  const configPath = path.join(projectRoot, 'distribute-skills.config.json');
  config = loadConfig(configPath);
} catch (e) {
  console.error("[-] Failed to load config:", e.message);
  process.exit(1);
}

if (!mode) {
  mode = 'all';
}
if (!targetDir && mode === 'all') {
  targetDir = config.projectsRoot;
}

if (!targetDir) {
  console.error("[-] Error: Missing directory target.");
  process.exit(1);
}

const sourceRoot = path.resolve(projectRoot);
const subagentRulesDir = path.join(sourceRoot, 'subagent_rules');

const skillCatalog = loadSkillCatalog(sourceRoot);

const platformResults = [];
if (config.platforms) {
  for (const platform of config.platforms) {
    platformResults.push(syncPlatformGlobals(platform, skillCatalog, { sourceRoot, subagentRulesDir, dryRun }));
  }
}

const projectResults = [];
let initTarget = init;
if (config.mattPocockInstall) initTarget = true;

if (mode === 'target') {
  const resolvedPath = path.resolve(targetDir);
  if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isDirectory()) {
    console.error(`[-] Error: Target directory does not exist: ${resolvedPath}`);
    process.exit(1);
  }
  projectResults.push(processProject(resolvedPath, skillCatalog, { dryRun, allowPrune, init: initTarget }));
} else {
  const resolvedParent = path.resolve(targetDir);
  if (!fs.existsSync(resolvedParent) || !fs.statSync(resolvedParent).isDirectory()) {
    console.error(`[-] Error: Parent directory does not exist: ${resolvedParent}`);
    process.exit(1);
  }
  
  const projects = discoverProjects(resolvedParent, config.excludePatterns || []);
  for (const proj of projects) {
    projectResults.push(processProject(proj, skillCatalog, { dryRun, allowPrune, init: initTarget }));
  }
}

printSummary({ platformResults, projectResults });
