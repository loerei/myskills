const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const rootDir = __dirname;
const upstreamsPath = path.join(rootDir, 'upstreams.json');
const pendingDir = path.join(rootDir, 'pending');

// Helper to recursively find skill directories
function findSkillDirectories(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  const items = fs.readdirSync(dir);

  if (items.includes('SKILL.md')) {
    results.push(dir);
    return results;
  }

  for (const item of items) {
    if (item.startsWith('.') || item.startsWith('_') || item === 'pending' || item === 'node_modules') {
      continue;
    }
    const itemPath = path.join(dir, item);
    try {
      if (fs.statSync(itemPath).isDirectory()) {
        findSkillDirectories(itemPath, results);
      }
    } catch (e) {
      // Ignore stat errors
    }
  }
  return results;
}

// Simple YAML frontmatter parser
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { description: 'No description' };
  
  const yaml = match[1];
  const descMatch = yaml.match(/description:\s*>?-?([\s\S]*?)(?=\n\w+:|$)/);
  if (descMatch) {
    return {
      description: descMatch[1].trim().replace(/\r?\n/g, ' ')
    };
  }
  return { description: 'No description' };
}

// Helper to copy directory recursively
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Find a specific skill inside pending/
function findPendingSkill(skillName) {
  if (!fs.existsSync(pendingDir)) return null;
  const upstreams = fs.readdirSync(pendingDir);
  for (const upstream of upstreams) {
    const upstreamPath = path.join(pendingDir, upstream);
    try {
      if (!fs.statSync(upstreamPath).isDirectory()) continue;
      const skillPath = path.join(upstreamPath, skillName);
      if (fs.existsSync(skillPath) && fs.existsSync(path.join(skillPath, 'SKILL.md'))) {
        return {
          path: skillPath,
          upstream: upstream
        };
      }
    } catch (e) {}
  }
  return null;
}

function printUsage(upstreams) {
  console.log('Usage for Sync/Compare:');
  console.log('  node sync-upstream.js --all');
  Object.keys(upstreams).forEach(key => {
    console.log(`  node sync-upstream.js --${key}`);
  });
  console.log('\nUsage for Applying Changes:');
  console.log('  node sync-upstream.js --apply <skill_name> --action <add|overwrite|discard> [--category <category>]');
  process.exit(0);
}

function main() {
  if (!fs.existsSync(upstreamsPath)) {
    console.error('[-] Error: upstreams.json not found.');
    process.exit(1);
  }

  const upstreams = JSON.parse(fs.readFileSync(upstreamsPath, 'utf8'));
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage(upstreams);
  }

  // Handle Apply Mode
  if (args.includes('--apply')) {
    const applyIdx = args.indexOf('--apply');
    const skillName = args[applyIdx + 1];
    
    const actionIdx = args.indexOf('--action');
    if (actionIdx === -1 || !args[actionIdx + 1]) {
      console.error('[-] Error: --action <add|overwrite|discard> is required with --apply.');
      process.exit(1);
    }
    const action = args[actionIdx + 1].toLowerCase();

    if (!skillName) {
      console.error('[-] Error: Specify the skill name to apply.');
      process.exit(1);
    }

    const pendingSkill = findPendingSkill(skillName);
    if (!pendingSkill) {
      console.error(`[-] Error: Skill "${skillName}" not found in pending directory.`);
      process.exit(1);
    }

    // Scan local skills to find current location if any
    const localSkillDirs = findSkillDirectories(rootDir);
    let localPath = null;
    for (const dir of localSkillDirs) {
      if (path.basename(dir) === skillName) {
        localPath = dir;
        break;
      }
    }

    if (action === 'discard') {
      console.log(`[*] Discarding pending skill "${skillName}"...`);
      fs.rmSync(pendingSkill.path, { recursive: true, force: true });
      console.log(`[+] Successfully discarded pending skill "${skillName}".`);
    } 
    else if (action === 'overwrite') {
      if (!localPath) {
        console.error(`[-] Error: Skill "${skillName}" does not exist locally. Use action "add" instead.`);
        process.exit(1);
      }
      console.log(`[*] Overwriting local skill "${skillName}" at ${localPath}...`);
      fs.rmSync(localPath, { recursive: true, force: true });
      copyRecursiveSync(pendingSkill.path, localPath);
      fs.rmSync(pendingSkill.path, { recursive: true, force: true });
      console.log(`[+] Successfully overwrote local skill "${skillName}".`);
    } 
    else if (action === 'add') {
      if (localPath) {
        console.error(`[-] Error: Skill "${skillName}" already exists locally at ${localPath}. Use action "overwrite" instead.`);
        process.exit(1);
      }
      const catIdx = args.indexOf('--category');
      if (catIdx === -1 || !args[catIdx + 1]) {
        console.error('[-] Error: --category <category_folder> is required when adding a new skill.');
        process.exit(1);
      }
      const category = args[catIdx + 1];
      const targetDir = path.join(rootDir, category, skillName);
      
      console.log(`[*] Adding new skill "${skillName}" to category "${category}"...`);
      copyRecursiveSync(pendingSkill.path, targetDir);
      fs.rmSync(pendingSkill.path, { recursive: true, force: true });
      console.log(`[+] Successfully added new skill "${skillName}" to ${targetDir}.`);
    } 
    else {
      console.error(`[-] Error: Invalid action "${action}". Choose from: add, overwrite, discard.`);
      process.exit(1);
    }

    // Clean up empty upstream folders in pending/
    try {
      const parentDir = path.dirname(pendingSkill.path);
      if (fs.readdirSync(parentDir).length === 0) {
        fs.rmdirSync(parentDir);
      }
    } catch (e) {}
    
    process.exit(0);
  }

  // Handle Sync/Compare Mode
  let selectedKeys = [];
  if (args.includes('--all')) {
    selectedKeys = Object.keys(upstreams);
  } else {
    for (const key of Object.keys(upstreams)) {
      if (args.includes(`--${key}`)) {
        selectedKeys.push(key);
      }
    }
  }

  if (selectedKeys.length === 0) {
    console.error('[-] Error: No valid upstream selected.');
    printUsage(upstreams);
  }

  // Scan local skills first
  console.log('[*] Scanning local skills...');
  const localSkillDirs = findSkillDirectories(rootDir);
  const localSkills = {};
  for (const dir of localSkillDirs) {
    const name = path.basename(dir);
    localSkills[name] = {
      path: dir,
      skillFile: path.join(dir, 'SKILL.md')
    };
  }

  const newSkillsReport = [];
  const diffSkillsReport = [];

  for (const key of selectedKeys) {
    const config = upstreams[key];
    
    // Create a temp directory for cloning
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `sync-skills-${key}-`));
    console.log(`\n[*] Fetching ${key} from ${config.url} to temporary directory...`);

    try {
      execSync(`git clone --depth 1 ${config.url} "${tempDir}"`, { stdio: 'inherit' });
    } catch (err) {
      console.error(`[-] Failed to clone upstream ${key}: ${err.message}`);
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {}
      continue;
    }

    console.log(`[*] Comparing skills...`);
    const pendingSkillDirs = findSkillDirectories(tempDir);
    const candidatesToKeep = [];

    for (const dir of pendingSkillDirs) {
      const name = path.basename(dir);
      const skillFilePath = path.join(dir, 'SKILL.md');
      if (!fs.existsSync(skillFilePath)) continue;

      const upstreamContent = fs.readFileSync(skillFilePath, 'utf8');
      const upstreamMeta = parseFrontmatter(upstreamContent);

      let isCandidate = false;

      if (!localSkills[name]) {
        isCandidate = true;
        newSkillsReport.push({
          name,
          source: key,
          description: upstreamMeta.description,
          contentSummary: upstreamContent.substring(0, 150).replace(/\r?\n/g, ' ') + '...'
        });
      } else {
        const localContent = fs.readFileSync(localSkills[name].skillFile, 'utf8');
        if (localContent !== upstreamContent) {
          isCandidate = true;
          const localMeta = parseFrontmatter(localContent);
          const localLines = localContent.split('\n').length;
          const upstreamLines = upstreamContent.split('\n').length;
          
          diffSkillsReport.push({
            name,
            source: key,
            localDesc: localMeta.description,
            localStats: `${localContent.length} bytes, ${localLines} lines`,
            upstreamDesc: upstreamMeta.description,
            upstreamStats: `${upstreamContent.length} bytes, ${upstreamLines} lines`
          });
        }
      }

      if (isCandidate) {
        candidatesToKeep.push({
          name,
          srcPath: dir
        });
      }
    }

    // Clean up local pending directory for this key and write only candidate folders
    const localTargetPendingDir = path.join(pendingDir, key);
    if (fs.existsSync(localTargetPendingDir)) {
      fs.rmSync(localTargetPendingDir, { recursive: true, force: true });
    }

    if (candidatesToKeep.length > 0) {
      fs.mkdirSync(localTargetPendingDir, { recursive: true });
      for (const candidate of candidatesToKeep) {
        const dest = path.join(localTargetPendingDir, candidate.name);
        console.log(`[+] Staging candidate skill: pending/${key}/${candidate.name}`);
        copyRecursiveSync(candidate.srcPath, dest);
      }
    }

    // Clean up temp dir
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.warn(`[!] Warning: Failed to clean up temp directory ${tempDir}: ${e.message}`);
    }
  }

  console.log('\n==================================================');
  console.log('                 SYNC REPORT                      ');
  console.log('==================================================\n');

  console.log('### New Upstream Skills (Staged in pending/)');
  if (newSkillsReport.length === 0) {
    console.log('No new skills found.');
  } else {
    console.log('| Skill Name | Source | Description | Content Preview |');
    console.log('|---|---|---|---|');
    newSkillsReport.forEach(item => {
      console.log(`| ${item.name} | ${item.source} | ${item.description} | ${item.contentSummary} |`);
    });
  }

  console.log('\n### Modified Upstream Skills (Staged in pending/)');
  if (diffSkillsReport.length === 0) {
    console.log('No modified skills found.');
  } else {
    console.log('| Skill Name | Source | Current Version | Upstream Version |');
    console.log('|---|---|---|---|');
    diffSkillsReport.forEach(item => {
      console.log(`| ${item.name} | ${item.source} | **Desc**: ${item.localDesc}<br>**Stats**: ${item.localStats} | **Desc**: ${item.upstreamDesc}<br>**Stats**: ${item.upstreamStats} |`);
    });
  }
  console.log('\n==================================================');
}

main();
