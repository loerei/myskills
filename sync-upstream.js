const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = __dirname;
const upstreamsPath = path.join(rootDir, 'upstreams.json');
const pendingDir = path.join(rootDir, 'pending');

// Helper to recursively find skill directories
function findSkillDirectories(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  const items = fs.readdirSync(dir);

  // If this directory itself contains SKILL.md, it is a skill directory
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

function printUsage(upstreams) {
  console.log('Usage:');
  console.log('  node sync-upstream.js --all');
  Object.keys(upstreams).forEach(key => {
    console.log(`  node sync-upstream.js --${key}`);
  });
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

  if (!fs.existsSync(pendingDir)) {
    fs.mkdirSync(pendingDir, { recursive: true });
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
    const targetRepoDir = path.join(pendingDir, key);
    console.log(`\n[*] Syncing ${key} from ${config.url}...`);

    try {
      if (!fs.existsSync(targetRepoDir)) {
        execSync(`git clone ${config.url} "${targetRepoDir}"`, { stdio: 'inherit' });
      } else {
        execSync(`git fetch origin`, { cwd: targetRepoDir, stdio: 'inherit' });
        execSync(`git reset --hard origin/${config.branch || 'main'}`, { cwd: targetRepoDir, stdio: 'inherit' });
      }
    } catch (err) {
      console.error(`[-] Failed to sync upstream ${key}: ${err.message}`);
      continue;
    }

    console.log(`[*] Scanning skills in pending/${key}...`);
    const pendingSkillDirs = findSkillDirectories(targetRepoDir);

    for (const dir of pendingSkillDirs) {
      const name = path.basename(dir);
      const skillFilePath = path.join(dir, 'SKILL.md');
      if (!fs.existsSync(skillFilePath)) continue;

      const upstreamContent = fs.readFileSync(skillFilePath, 'utf8');
      const upstreamMeta = parseFrontmatter(upstreamContent);

      if (!localSkills[name]) {
        newSkillsReport.push({
          name,
          source: key,
          description: upstreamMeta.description,
          contentSummary: upstreamContent.substring(0, 150).replace(/\r?\n/g, ' ') + '...'
        });
      } else {
        const localContent = fs.readFileSync(localSkills[name].skillFile, 'utf8');
        if (localContent !== upstreamContent) {
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
    }
  }

  console.log('\n==================================================');
  console.log('                 SYNC REPORT                      ');
  console.log('==================================================\n');

  console.log('### New Upstream Skills');
  if (newSkillsReport.length === 0) {
    console.log('No new skills found.');
  } else {
    console.log('| Skill Name | Source | Description | Content Preview |');
    console.log('|---|---|---|---|');
    newSkillsReport.forEach(item => {
      console.log(`| ${item.name} | ${item.source} | ${item.description} | ${item.contentSummary} |`);
    });
  }

  console.log('\n### Modified Upstream Skills');
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
