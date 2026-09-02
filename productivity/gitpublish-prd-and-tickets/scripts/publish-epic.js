#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function printUsage() {
    console.log(`
Usage:
  node publish-epic.js <path-to-prd-or-epic-dir> [options]

Options:
  --parent-id <id>          Existing parent PRD issue ID on GitHub (if already created)
  --close-superseded <ids>  Comma-separated list of old issue IDs to close (e.g. "89,90,91")
  --repo <owner/repo>       GitHub repository target (default: current git origin)
  --label <labels>          Issue labels (default: "enhancement,ready-for-agent")
  --dry-run                 Simulate indexing, topological sort, and key replacements without calling GitHub CLI
  --help, -h                Show this help message
`);
    process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
}

let targetPath = null;
let parentId = null;
let closeSuperseded = [];
let repo = null;
let labels = 'enhancement,ready-for-agent';
let isDryRun = false;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--parent-id' && args[i + 1]) {
        parentId = parseInt(args[++i], 10);
    } else if (args[i] === '--close-superseded' && args[i + 1]) {
        closeSuperseded = args[++i].split(',').map(s => parseInt(s.trim(), 10)).filter(Boolean);
    } else if (args[i] === '--repo' && args[i + 1]) {
        repo = args[++i];
    } else if (args[i] === '--label' && args[i + 1]) {
        labels = args[++i];
    } else if (args[i] === '--dry-run') {
        isDryRun = true;
    } else if (!args[i].startsWith('--') && !targetPath) {
        targetPath = args[i];
    }
}

if (!targetPath) {
    console.error('Error: Missing target PRD file or Epic directory path.');
    printUsage();
}

// Resolve target PRD and tickets folder
let prdFilePath = null;
let ticketsDirPath = null;

if (fs.statSync(targetPath).isDirectory()) {
    prdFilePath = path.join(targetPath, 'PRD.md');
    ticketsDirPath = path.join(targetPath, 'tickets');
} else {
    prdFilePath = targetPath;
    ticketsDirPath = path.join(path.dirname(targetPath), 'tickets');
}

if (!fs.existsSync(prdFilePath)) {
    console.error(`Error: PRD file not found at: ${prdFilePath}`);
    process.exit(1);
}

const targetEpicDir = path.dirname(prdFilePath);
const specsRootDir = path.dirname(targetEpicDir);

const env = { ...process.env };
delete env.GITHUB_TOKEN;

function runGh(ghArgs) {
    if (isDryRun) {
        return `[DRY-RUN gh ${ghArgs.join(' ')}]`;
    }
    return execFileSync('gh', ghArgs, { env, encoding: 'utf8' }).trim();
}

function extractEpicNumber(dirOrFileName) {
    const match = dirOrFileName.match(/^(\d+)/);
    return match ? match[1] : null;
}

function extractSemanticKey(fileName) {
    const match = fileName.match(/^(\d+(?:\.\d+)*)/);
    return match ? match[1] : null;
}

console.log(`\n=== 1. Building Global Specs Index (Pre-scan) ===`);

const globalRegistry = {}; // epicNum -> { dirName, prdFile, tickets: { key -> { title, issueId, fileName } } }

if (fs.existsSync(specsRootDir)) {
    const epicDirs = fs.readdirSync(specsRootDir, { withFileTypes: true })
        .filter(d => d.isDirectory() && !d.name.startsWith('.'))
        .map(d => d.name);

    for (const dir of epicDirs) {
        const epicNum = extractEpicNumber(dir);
        if (!epicNum) continue;

        const ePrdFile = path.join(specsRootDir, dir, 'PRD.md');
        const eTicketsDir = path.join(specsRootDir, dir, 'tickets');
        if (!fs.existsSync(ePrdFile)) continue;

        const prdRaw = fs.readFileSync(ePrdFile, 'utf8');

        globalRegistry[epicNum] = {
            epicNum,
            dirName: dir,
            prdFile: ePrdFile,
            tickets: {}
        };

        // Scan existing issue mappings from PRD ## Tickets
        const ticketLineMatches = prdRaw.matchAll(/-\s+(?:#(\d+)\s+[—–-]\s+)?(?:([0-9\.]+)\s+[—–-]\s+)?([^(\n]+?)(?:\s+\(`?([^`)\n]+)`?\))?$/gm);
        for (const m of ticketLineMatches) {
            const issueId = m[1] ? parseInt(m[1], 10) : null;
            const key = m[2] ? m[2].trim() : null;
            const title = m[3] ? m[3].trim() : '';
            const tFile = m[4] ? path.basename(m[4].trim()) : null;

            const effectiveKey = key || (tFile ? extractSemanticKey(tFile) : null);
            if (effectiveKey) {
                globalRegistry[epicNum].tickets[effectiveKey] = {
                    key: effectiveKey,
                    fileName: tFile,
                    title,
                    issueId
                };
            }
        }

        // Scan tickets directory for any unmapped tickets
        if (fs.existsSync(eTicketsDir)) {
            const tFiles = fs.readdirSync(eTicketsDir).filter(f => f.endsWith('.md'));
            for (const tf of tFiles) {
                const k = extractSemanticKey(tf);
                if (!k) continue;
                if (!globalRegistry[epicNum].tickets[k]) {
                    globalRegistry[epicNum].tickets[k] = {
                        key: k,
                        fileName: tf,
                        title: tf.replace('.md', ''),
                        issueId: null
                    };
                } else if (!globalRegistry[epicNum].tickets[k].fileName) {
                    globalRegistry[epicNum].tickets[k].fileName = tf;
                }
            }
        }
    }
}

const currentEpicNum = extractEpicNumber(path.basename(targetEpicDir));
console.log(`Current Target: Epic ${currentEpicNum} (${path.basename(targetEpicDir)})`);
console.log(`Global Epics Indexed: ${Object.keys(globalRegistry).join(', ')}`);

// Parse Current Target Tickets in PRD ordering / folder ordering
const targetTickets = [];
if (fs.existsSync(ticketsDirPath)) {
    const rawFiles = fs.readdirSync(ticketsDirPath).filter(f => f.endsWith('.md')).sort();
    for (const f of rawFiles) {
        const k = extractSemanticKey(f);
        if (!k) continue;
        const filePath = path.join(ticketsDirPath, f);
        const rawContent = fs.readFileSync(filePath, 'utf8');
        const titleMatch = rawContent.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1].trim() : f.replace('.md', '');
        targetTickets.push({
            key: k,
            fileName: f,
            filePath,
            title,
            content: rawContent
        });
    }
}

console.log(`Found ${targetTickets.length} tickets to publish in topological order.`);

// Key Replacement Engine
function replaceSemanticKeys(content, currentEpicNo, registry, dynamicLocalMap) {
    let transformed = content;

    // 1. Cross-PRD replacement: "Epic XX: YY.YY" or "[Epic XX] YY.YY"
    transformed = transformed.replace(/(?:\[?\b(?:Epic|PRD)\s*(\d+)\b\]?[\s:—–\(\)]*)\b(\d+(?:\.\d+)*)\b/gi, (match, epicNo, key) => {
        const normEpic = String(parseInt(epicNo, 10)).padStart(2, '0');
        const targetEpic = registry[normEpic] || registry[epicNo];
        if (targetEpic && targetEpic.tickets[key] && targetEpic.tickets[key].issueId) {
            return `#${targetEpic.tickets[key].issueId} (Epic ${epicNo}: ${key})`;
        }
        return match;
    });

    // 2. Intra-PRD replacement: local semantic keys from dynamicLocalMap
    const sortedKeys = Object.keys(dynamicLocalMap).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
        const id = dynamicLocalMap[key];
        if (!id) continue;
        const keyRegex = new RegExp(`(?<![#\\w\\.\\/])${key.replace(/\\./g, '\\.')}(?![\\w\\.\\/])`, 'g');
        transformed = transformed.replace(keyRegex, `#${id} (${key})`);
    }

    return transformed;
}

// Step 2: Handle Parent PRD Issue
console.log(`\n=== 2. Managing Parent PRD Issue ===`);
let finalParentId = parentId;
let prdRawContent = fs.readFileSync(prdFilePath, 'utf8');

const prdTitleMatch = prdRawContent.match(/^#\s+(.+)$/m);
const prdTitle = prdTitleMatch ? prdTitleMatch[1].trim() : `Epic ${currentEpicNum}: ${path.basename(targetEpicDir)}`;

if (!finalParentId) {
    if (isDryRun) {
        finalParentId = 999;
        console.log(`[DRY-RUN] Would create Parent Issue "${prdTitle}" -> Simulated #${finalParentId}`);
    } else {
        console.log(`Creating Parent Issue "${prdTitle}"...`);
        const ghArgs = ['issue', 'create', '--title', prdTitle, '--body-file', prdFilePath, '--label', labels];
        if (repo) ghArgs.push('--repo', repo);
        const outUrl = runGh(ghArgs);
        const idMatch = outUrl.match(/\/issues\/(\d+)$/);
        finalParentId = idMatch ? parseInt(idMatch[1], 10) : null;
        console.log(`Created Parent Issue #${finalParentId}: ${outUrl}`);
    }
} else {
    console.log(`Using existing Parent Issue #${finalParentId}. Updating content...`);
    const ghArgs = ['issue', 'edit', String(finalParentId), '--body-file', prdFilePath];
    if (repo) ghArgs.push('--repo', repo);
    runGh(ghArgs);
    console.log(`Updated Parent Issue #${finalParentId}.`);
}

// Step 3: Close Superseded Issues
if (closeSuperseded.length > 0) {
    console.log(`\n=== 3. Closing ${closeSuperseded.length} Superseded Issues ===`);
    for (const oldId of closeSuperseded) {
        console.log(`Closing old Issue #${oldId}...`);
        if (!isDryRun) {
            try {
                const commentArgs = ['issue', 'comment', String(oldId), '--body', `Superseded by refined granular tickets published under Parent PRD #${finalParentId}.`];
                if (repo) commentArgs.push('--repo', repo);
                runGh(commentArgs);

                const closeArgs = ['issue', 'close', String(oldId)];
                if (repo) closeArgs.push('--repo', repo);
                runGh(closeArgs);
            } catch (err) {
                console.warn(`Warning: Could not close #${oldId}: ${err.message}`);
            }
        }
    }
}

// Step 4: Publish Tickets in Sequence with Dynamic Rewriting
console.log(`\n=== 4. Publishing Tickets & Dynamically Resolving Keys ===`);
const dynamicLocalMap = {};
let simulatedIssueCounter = 300;

for (const t of targetTickets) {
    // 1. Rewrite content with all currently known keys
    let transformedBody = replaceSemanticKeys(t.content, currentEpicNum, globalRegistry, dynamicLocalMap);

    // 2. Ensure Parent reference is present
    if (!transformedBody.includes(`## Parent\n#${finalParentId}`) && !transformedBody.includes(`## Parent\nhttps://github.com/`)) {
        transformedBody = transformedBody.replace(/## Epic\n[^\n]+/m, `## Parent\n#${finalParentId} (${prdTitle})\n\n## Epic\n${prdTitle}`);
    }

    let createdId = null;

    if (isDryRun) {
        createdId = simulatedIssueCounter++;
        dynamicLocalMap[t.key] = createdId;
        console.log(`  [DRY-RUN] Published [${t.key}] -> #${createdId}: "${t.title}"`);
    } else {
        const tempFilePath = path.join(__dirname, `__temp_${t.fileName}`);
        fs.writeFileSync(tempFilePath, transformedBody, 'utf8');

        console.log(`Publishing [${t.key}]: "${t.title}"...`);
        const ghArgs = ['issue', 'create', '--title', t.title, '--body-file', tempFilePath, '--label', labels];
        if (repo) ghArgs.push('--repo', repo);
        const issueUrl = runGh(ghArgs);
        const idMatch = issueUrl.match(/\/issues\/(\d+)$/);
        createdId = idMatch ? parseInt(idMatch[1], 10) : null;
        dynamicLocalMap[t.key] = createdId;

        console.log(`  -> Created #${createdId}: ${issueUrl}`);

        // Update local file with parent & resolved links
        fs.writeFileSync(t.filePath, transformedBody, 'utf8');
        try { fs.unlinkSync(tempFilePath); } catch (_) {}
    }
}

// Step 5: Update Parent PRD with Live Issue Mapping
console.log(`\n=== 5. Updating Parent PRD with Resolved Issue Table ===`);
let updatedPrd = fs.readFileSync(prdFilePath, 'utf8');
let ticketListMarkdown = '';

for (const t of targetTickets) {
    const issueNum = dynamicLocalMap[t.key];
    ticketListMarkdown += `- #${issueNum} — ${t.title} (\`tickets/${t.fileName}\`)\n`;
}

updatedPrd = updatedPrd.replace(/## Tickets\n\n[\s\S]*?(?=\n## |$)/, `## Tickets\n\n${ticketListMarkdown}`);
// Also replace keys inside PRD body
updatedPrd = replaceSemanticKeys(updatedPrd, currentEpicNum, globalRegistry, dynamicLocalMap);

if (isDryRun) {
    console.log(`[DRY-RUN] Would update PRD #${finalParentId} with ${targetTickets.length} child ticket links.`);
} else {
    fs.writeFileSync(prdFilePath, updatedPrd, 'utf8');
    const ghArgs = ['issue', 'edit', String(finalParentId), '--body-file', prdFilePath];
    if (repo) ghArgs.push('--repo', repo);
    runGh(ghArgs);
    console.log(`Successfully updated Parent Issue #${finalParentId} on GitHub.`);
}

console.log(`\n=== Publish Complete! ===`);
console.log(JSON.stringify(dynamicLocalMap, null, 2));
