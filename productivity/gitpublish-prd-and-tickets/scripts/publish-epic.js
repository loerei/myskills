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
  --repo <owner/repo>       GitHub repository target (default: current git origin)
  --dry-run                 Simulate reconciliation, topological sorting, and key replacements without calling GitHub CLI
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
let repo = null;
let isDryRun = false;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--parent-id' && args[i + 1]) {
        parentId = parseInt(args[++i], 10);
    } else if (args[i] === '--repo' && args[i + 1]) {
        repo = args[++i];
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
    try {
        return execFileSync('gh', ghArgs, { env, encoding: 'utf8' }).trim();
    } catch (err) {
        if (err.stderr) console.error(`gh error: ${err.stderr.toString().trim()}`);
        else console.error(`gh error: ${err.message}`);
        throw err;
    }
}

function extractEpicNumber(dirOrFileName) {
    const match = dirOrFileName.match(/^(\d+)/);
    return match ? String(parseInt(match[1], 10)).padStart(2, '0') : null;
}

function extractSemanticKey(fileName) {
    const match = fileName.match(/^(\d+(?:\.\d+)*)/);
    return match ? match[1] : null;
}

const currentEpicNum = extractEpicNumber(path.basename(targetEpicDir));
const epicTag = `epic-${currentEpicNum}`;
const prdLabels = `epic,${epicTag}`;
const ticketLabels = `ticket,${epicTag}`;

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
        const lines = prdRaw.split('\n');
        let inTicketsSection = false;

        for (const line of lines) {
            if (/^##\s+Tickets/i.test(line)) {
                inTicketsSection = true;
                continue;
            }
            if (inTicketsSection && /^##\s+/i.test(line)) {
                inTicketsSection = false;
                break;
            }
            if (inTicketsSection && line.trim().startsWith('-')) {
                const issueMatch = line.match(/-\s+#(\d+)\b/);
                const fileMatch = line.match(/\(`?([^`\n]+\.md)`?\)/);
                const keyMatch = line.match(/(?:#\d+\s+[—–-]\s+)?([0-9\.]+)\s+[—–-]/);

                const issueId = issueMatch ? parseInt(issueMatch[1], 10) : null;
                const fileName = fileMatch ? path.basename(fileMatch[1].trim()) : null;
                const key = keyMatch ? keyMatch[1].trim() : (fileName ? extractSemanticKey(fileName) : null);

                if (key) {
                    globalRegistry[epicNum].tickets[key] = {
                        key,
                        fileName,
                        title: line.replace(/^-\s+/, '').trim(),
                        issueId
                    };
                }
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

console.log(`Current Target: Epic ${currentEpicNum} (${path.basename(targetEpicDir)})`);
console.log(`Global Epics Indexed: ${Object.keys(globalRegistry).join(', ')}`);

// Auto-Ensure Required Taxonomy Labels Exist
function ensureTaxonomyLabels() {
    const requiredLabels = [
        { name: 'epic', color: '5319e7', description: 'Epic PRD specification' },
        { name: 'ticket', color: '0e8a16', description: 'Actionable task ticket' },
        { name: epicTag, color: '1f75cb', description: `Issues belonging to Epic ${currentEpicNum}` }
    ];

    console.log(`\n=== 2. Ensuring Taxonomy Labels on GitHub ===`);
    for (const l of requiredLabels) {
        if (isDryRun) {
            console.log(`  [DRY-RUN] Ensure label "${l.name}"`);
        } else {
            try {
                const args = ['label', 'create', l.name, '--color', l.color, '--description', l.description, '--force'];
                if (repo) args.push('--repo', repo);
                runGh(args);
                console.log(`  [OK] Label "${l.name}" verified.`);
            } catch (_) {
                // Already exists or created
            }
        }
    }
}

ensureTaxonomyLabels();

// Parse Current Target Local Tickets
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

console.log(`Found ${targetTickets.length} local tickets in specification.`);

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

// Step 3: Handle Parent PRD Issue
console.log(`\n=== 3. Managing Parent PRD Issue (Labels: ${prdLabels}) ===`);
let finalParentId = parentId;
let prdRawContent = fs.readFileSync(prdFilePath, 'utf8');

const prdTitleMatch = prdRawContent.match(/^#\s+(.+)$/m);
const prdTitle = prdTitleMatch ? prdTitleMatch[1].trim() : `Epic ${currentEpicNum}: ${path.basename(targetEpicDir)}`;

if (!finalParentId) {
    const existingParentMatch = prdRawContent.match(/## Parent\n#(\d+)/m);
    if (existingParentMatch) {
        finalParentId = parseInt(existingParentMatch[1], 10);
    }
}

if (!finalParentId) {
    if (isDryRun) {
        finalParentId = 999;
        console.log(`[DRY-RUN] Would create Parent Issue "${prdTitle}" -> Simulated #${finalParentId}`);
    } else {
        console.log(`Creating Parent Issue "${prdTitle}"...`);
        const ghArgs = ['issue', 'create', '--title', prdTitle, '--body-file', prdFilePath, '--label', prdLabels];
        if (repo) ghArgs.push('--repo', repo);
        const outUrl = runGh(ghArgs);
        const idMatch = outUrl.match(/\/issues\/(\d+)$/);
        finalParentId = idMatch ? parseInt(idMatch[1], 10) : null;
        console.log(`Created Parent Issue #${finalParentId}: ${outUrl}`);
    }
} else {
    console.log(`Using existing Parent Issue #${finalParentId}. Updating content & labels...`);
    const ghArgs = ['issue', 'edit', String(finalParentId), '--body-file', prdFilePath, '--add-label', prdLabels];
    if (repo) ghArgs.push('--repo', repo);
    runGh(ghArgs);
    console.log(`Updated Parent Issue #${finalParentId}.`);
}

// Step 4: Idempotent Reconciliation (Detect Match vs New vs Orphaned)
console.log(`\n=== 4. Idempotent Ticket Reconciliation ===`);

const existingRemoteTickets = (globalRegistry[currentEpicNum] && globalRegistry[currentEpicNum].tickets) || {};
const localKeySet = new Set(targetTickets.map(t => t.key));
const orphanedRemoteTickets = [];

for (const [rKey, rTicket] of Object.entries(existingRemoteTickets)) {
    if (!localKeySet.has(rKey) && rTicket.issueId) {
        orphanedRemoteTickets.push(rTicket);
    }
}

// Close orphaned/split tickets
if (orphanedRemoteTickets.length > 0) {
    console.log(`Found ${orphanedRemoteTickets.length} orphaned/split remote tickets to close:`);
    for (const orphan of orphanedRemoteTickets) {
        console.log(`  - Closing stale Issue #${orphan.issueId} [${orphan.key}]...`);
        if (!isDryRun) {
            try {
                const commentArgs = [
                    'issue', 'comment', String(orphan.issueId),
                    '--body', `Superseded or split into refined tickets under Parent PRD #${finalParentId}. Closing.`
                ];
                if (repo) commentArgs.push('--repo', repo);
                runGh(commentArgs);

                const closeArgs = ['issue', 'close', String(orphan.issueId)];
                if (repo) closeArgs.push('--repo', repo);
                runGh(closeArgs);
            } catch (err) {
                console.warn(`    Warning: Could not close #${orphan.issueId}: ${err.message}`);
            }
        }
    }
} else {
    console.log(`Zero orphaned tickets. Clean state.`);
}

// Step 5: Publish/Update Tickets in Topological Sequence (Labels: ${ticketLabels})
console.log(`\n=== 5. Publishing & Updating Tickets (Labels: ${ticketLabels}) ===`);
const dynamicLocalMap = {};
let simulatedCounter = 400;

for (const t of targetTickets) {
    // 1. Rewrite content with all currently known keys
    let transformedBody = replaceSemanticKeys(t.content, currentEpicNum, globalRegistry, dynamicLocalMap);

    // 2. Ensure Parent reference is present
    if (!transformedBody.includes(`## Parent\n#${finalParentId}`) && !transformedBody.includes(`## Parent\nhttps://github.com/`)) {
        transformedBody = transformedBody.replace(/## Epic\n[^\n]+/m, `## Parent\n#${finalParentId} (${prdTitle})\n\n## Epic\n${prdTitle}`);
    }

    // Check if ticket already exists on remote with the SAME semantic key (In-place update)
    const existingEntry = existingRemoteTickets[t.key];
    const existingIssueId = existingEntry && existingEntry.issueId;

    let targetIssueId = null;

    if (existingIssueId) {
        // In-place edit of existing ticket + apply ticket,epic-XX labels
        targetIssueId = existingIssueId;
        dynamicLocalMap[t.key] = targetIssueId;

        if (isDryRun) {
            console.log(`  [DRY-RUN EDIT] [${t.key}] In-Place Update Issue #${targetIssueId} (labels: ${ticketLabels})`);
        } else {
            const tempFilePath = path.join(__dirname, `__temp_${t.fileName}`);
            fs.writeFileSync(tempFilePath, transformedBody, 'utf8');

            console.log(`Updating existing Issue #${targetIssueId} [${t.key}] (labels: ${ticketLabels})...`);
            const ghArgs = ['issue', 'edit', String(targetIssueId), '--title', t.title, '--body-file', tempFilePath, '--add-label', ticketLabels];
            if (repo) ghArgs.push('--repo', repo);
            runGh(ghArgs);
            console.log(`  -> Updated #${targetIssueId}`);

            fs.writeFileSync(t.filePath, transformedBody, 'utf8');
            try { fs.unlinkSync(tempFilePath); } catch (_) {}
        }
    } else {
        // New ticket or split child -> CREATE with ticket,epic-XX labels
        if (isDryRun) {
            targetIssueId = simulatedCounter++;
            dynamicLocalMap[t.key] = targetIssueId;
            console.log(`  [DRY-RUN CREATE] [${t.key}] New Issue #${targetIssueId} (labels: ${ticketLabels})`);
        } else {
            const tempFilePath = path.join(__dirname, `__temp_${t.fileName}`);
            fs.writeFileSync(tempFilePath, transformedBody, 'utf8');

            console.log(`Creating new Issue [${t.key}] (labels: ${ticketLabels})...`);
            const ghArgs = ['issue', 'create', '--title', t.title, '--body-file', tempFilePath, '--label', ticketLabels];
            if (repo) ghArgs.push('--repo', repo);
            const issueUrl = runGh(ghArgs);
            const idMatch = issueUrl.match(/\/issues\/(\d+)$/);
            targetIssueId = idMatch ? parseInt(idMatch[1], 10) : null;
            dynamicLocalMap[t.key] = targetIssueId;

            console.log(`  -> Created #${targetIssueId}: ${issueUrl}`);

            fs.writeFileSync(t.filePath, transformedBody, 'utf8');
            try { fs.unlinkSync(tempFilePath); } catch (_) {}
        }
    }
}

// Step 6: Update Parent PRD with Live Issue Mapping
console.log(`\n=== 6. Updating Parent PRD with Resolved Issue Table ===`);
let updatedPrd = fs.readFileSync(prdFilePath, 'utf8');
let ticketListMarkdown = '';

for (const t of targetTickets) {
    const issueNum = dynamicLocalMap[t.key];
    ticketListMarkdown += `- #${issueNum} — ${t.title} (\`tickets/${t.fileName}\`)\n`;
}

updatedPrd = updatedPrd.replace(/## Tickets\n\n[\s\S]*?(?=\n## |$)/, `## Tickets\n\n${ticketListMarkdown}`);
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

console.log(`\n=== Reconcile & Publish Complete! ===`);
console.log(JSON.stringify(dynamicLocalMap, null, 2));
