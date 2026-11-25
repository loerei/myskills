#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function printUsage(exitCode = 1) {
    console.log(`
Usage:
  node publish-epic.js <path-to-prd-or-epic-dir> [options]
  node publish-epic.js <specs-root-dir> --all [options]

Options:
  --parent-id <id>          Existing parent PRD issue ID on GitHub (if already created)
  --repo <owner/repo>       GitHub repository target (default: current git origin)
  --concurrency <N>         Maximum parallel GitHub API workers (default: 6)
  --all                     Batch publish / reconcile all Epics found in the target directory
  --to-be-reviewed          Force adding "to-be-reviewed" label on Parent PRD and all Child Tickets
  --reviewed                Force removing "to-be-reviewed" label on Parent PRD and all Child Tickets
  --dry-run                 Simulate reconciliation, sorting, and key replacements without calling GitHub CLI
  --help, -h                Show this help message
`);
    process.exit(exitCode);
}

let targetPath = null;
let parentId = null;
let repo = null;
let concurrency = 6;
let isAll = false;
let isDryRun = false;
let forceReviewMode = null;

function parseCliArgs(argv) {
    if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
        printUsage(argv.length === 0 ? 1 : 0);
    }

    targetPath = null;
    parentId = null;
    repo = null;
    concurrency = 6;
    isAll = false;
    isDryRun = false;
    forceReviewMode = null;

    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--parent-id' && argv[i + 1]) {
            parentId = parseInt(argv[++i], 10);
        } else if (argv[i] === '--repo' && argv[i + 1]) {
            repo = argv[++i];
        } else if (argv[i] === '--concurrency' && argv[i + 1]) {
            concurrency = Math.max(1, parseInt(argv[++i], 10) || 6);
        } else if (argv[i] === '--all') {
            isAll = true;
        } else if (argv[i] === '--dry-run') {
            isDryRun = true;
        } else if (argv[i] === '--to-be-reviewed') {
            if (forceReviewMode === 'reviewed') {
                console.error('Error: Cannot combine --to-be-reviewed and --reviewed.');
                process.exit(1);
            }
            forceReviewMode = 'to-be-reviewed';
        } else if (argv[i] === '--reviewed') {
            if (forceReviewMode === 'to-be-reviewed') {
                console.error('Error: Cannot combine --to-be-reviewed and --reviewed.');
                process.exit(1);
            }
            forceReviewMode = 'reviewed';
        } else if (!argv[i].startsWith('--') && !targetPath) {
            targetPath = argv[i];
        }
    }

    if (!targetPath) {
        console.error('Error: Missing target PRD file or Epic directory path.');
        printUsage(1);
    }
}

const env = { ...process.env };
delete env.GITHUB_TOKEN;

const GITHUB_MAX_BODY_CHARS = 65536;
const SAFE_CHUNK_CHARS = 63000;
const REVIEW_LABEL = 'to-be-reviewed';

/**
 * Split content into GitHub-safe chunks (<= 65536 chars), breaking only at '\n' boundaries when possible.
 */
function splitBodyForGitHub(content) {
    if (content.length <= GITHUB_MAX_BODY_CHARS) {
        return { mainBody: content, overflowComments: [] };
    }

    const rawChunks = [];
    let remaining = content;
    while (remaining.length > SAFE_CHUNK_CHARS) {
        let splitIdx = remaining.lastIndexOf('\n', SAFE_CHUNK_CHARS);
        if (splitIdx <= 0) {
            splitIdx = SAFE_CHUNK_CHARS;
            rawChunks.push(remaining.slice(0, splitIdx));
            remaining = remaining.slice(splitIdx);
        } else {
            rawChunks.push(remaining.slice(0, splitIdx));
            remaining = remaining.slice(splitIdx + 1);
        }
    }
    if (remaining.length > 0) {
        rawChunks.push(remaining);
    }

    const totalParts = rawChunks.length;
    const mainBody = `${rawChunks[0]}\n\n---\n> *Content truncated at GitHub's 65,536-character limit. Continued in ${totalParts - 1} comment(s) below (Part 1/${totalParts}).*\n`;
    const overflowComments = rawChunks.slice(1).map((chunk, idx) => {
        const partNum = idx + 2;
        return `<!-- prd-overflow-part:${partNum} -->\n### Continuation (Part ${partNum}/${totalParts})\n\n${chunk}`;
    });

    return { mainBody, overflowComments };
}

async function syncOverflowComments(issueId, overflowComments, tempDir, filePrefix) {
    if (overflowComments.length === 0) return;
    if (isDryRun) {
        console.log(`  [DRY-RUN COMMENTS] #${issueId}: ${overflowComments.length} overflow comment(s)`);
        return;
    }

    const existingOverflowByPart = new Map();
    try {
        const viewArgs = ['issue', 'view', String(issueId), '--json', 'comments'];
        if (repo) viewArgs.push('--repo', repo);
        const viewOut = await runGh(viewArgs);
        const parsed = JSON.parse(viewOut || '{}');
        for (const c of (parsed.comments || [])) {
            const m = (c.body || '').match(/<!-- (?:yumeshelf-|prd-)?overflow-part:(\d+) -->/);
            if (m) {
                const partNum = parseInt(m[1], 10);
                const idMatch = (c.url || '').match(/issuecomment-(\d+)/);
                existingOverflowByPart.set(partNum, {
                    numericId: idMatch ? idMatch[1] : null,
                    body: c.body
                });
            }
        }
    } catch (_) {}

    for (let i = 0; i < overflowComments.length; i++) {
        const partNum = i + 2;
        const commentBody = overflowComments[i];
        const existing = existingOverflowByPart.get(partNum);
        const commentPath = path.join(tempDir, `${filePrefix}.part${partNum}.md`);
        fs.writeFileSync(commentPath, commentBody, 'utf8');

        if (existing && existing.body.trim() === commentBody.trim()) {
            continue;
        }
        if (existing && existing.numericId) {
            const endpoint = repo
                ? `repos/${repo}/issues/comments/${existing.numericId}`
                : `repos/{owner}/{repo}/issues/comments/${existing.numericId}`;
            const patchArgs = ['api', '--method', 'PATCH', endpoint, '-F', `body=@${commentPath}`];
            await runGh(patchArgs);
            console.log(`  [UPDATED COMMENT Part ${partNum}] #${issueId}`);
        } else {
            const commentArgs = ['issue', 'comment', String(issueId), '--body-file', commentPath];
            if (repo) commentArgs.push('--repo', repo);
            await runGh(commentArgs);
            console.log(`  [COMMENTED Part ${partNum}] #${issueId}`);
        }
    }
}

async function runGh(ghArgs) {
    if (isDryRun) {
        return `[DRY-RUN gh ${ghArgs.join(' ')}]`;
    }
    try {
        const { stdout } = await execFileAsync('gh', ghArgs, { env, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
        return stdout.trim();
    } catch (err) {
        if (err.stderr) console.error(`gh error: ${err.stderr.toString().trim()}`);
        else console.error(`gh error: ${err.message}`);
        throw err;
    }
}

/**
 * High-performance pure Node.js concurrent worker pool
 */
async function runConcurrent(items, maxWorkers, workerFn) {
    if (items.length === 0) return [];
    const results = new Array(items.length);
    let index = 0;

    const workers = new Array(Math.min(maxWorkers, items.length)).fill(0).map(async () => {
        while (index < items.length) {
            const currentIndex = index++;
            results[currentIndex] = await workerFn(items[currentIndex], currentIndex);
        }
    });

    await Promise.all(workers);
    return results;
}

function extractEpicKey(dirOrFileName) {
    const match = String(dirOrFileName || '').match(/^(\d+(?:\.\d+)*)/);
    if (!match) return null;
    const parts = match[1].split('.');
    parts[0] = String(parseInt(parts[0], 10)).padStart(2, '0');
    return parts.join('.');
}

function extractSemanticKey(text) {
    const match = String(text || '').trim().match(/^(\d+(?:\.\d+)*)/);
    return match ? match[1] : null;
}

function cleanTitle(rawTitle) {
    return rawTitle
        .replace(/^#+\s+/, '')
        .replace(/^#\d+\s+[—–-]\s+/, '')
        .replace(/^#\d+\s*\([0-9\.]+\)\s+[—–-]\s+/, '')
        .trim();
}

function resolveReviewLabelMode(prdContent, forceMode) {
    if (forceMode === 'to-be-reviewed') {
        return { mode: 'add', displayStatus: 'TO_BE_REVIEWED' };
    }
    if (forceMode === 'reviewed') {
        return { mode: 'remove', displayStatus: 'REVIEWED' };
    }

    const statusMatch = prdContent.match(/^\s*-\s*\*\*Review\s+Status:\*\*\s*`?([A-Z_]+)`?/im);
    if (statusMatch) {
        const status = statusMatch[1].trim().toUpperCase();
        if (status === 'TO_BE_REVIEWED') return { mode: 'add', displayStatus: 'TO_BE_REVIEWED' };
        if (status === 'REVIEWED') return { mode: 'remove', displayStatus: 'REVIEWED' };
    }

    const commitMatch = prdContent.match(/^\s*-\s*\*\*Reviewed-At-Commit:\*\*\s*`?([^`\r\n]+)`?/im);
    const commitVal = commitMatch ? commitMatch[1].trim() : '';
    const isPlaceholderOrEmpty = !commitVal || /^<[^>]+>$/.test(commitVal) || /^(?:unreviewed|pending|tbd|none)$/i.test(commitVal);
    if (isPlaceholderOrEmpty) {
        return { mode: 'add', displayStatus: 'TO_BE_REVIEWED' };
    }

    return { mode: 'preserve', displayStatus: 'LEGACY' };
}

function replaceSemanticKeysInBody(content, currentEpicKey, registry, dynamicLocalMap) {
    let transformed = content;

    // 1. Cross-PRD replacement: "Epic XX: YY.YY", "Epic 09.1: 01", or "[Epic XX] YY.YY"
    transformed = transformed.replace(/(?:\[?\b(?:Epic|PRD)\s*(\d+(?:\.\d+)*)\b\]?[\s:—–\(\)]*)\b(\d+(?:\.\d+)*)\b/gi, (match, epicNo, key) => {
        const normEpic = extractEpicKey(epicNo);
        const targetEpic = (normEpic && registry[normEpic]) || registry[epicNo];
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
        const escapedKey = key.replace(/\./g, '\\.');
        const keyRegex = new RegExp(`(?<![#\\w\\.\\/])${escapedKey}(?![\\w\\.\\/])`, 'g');
        transformed = transformed.replace(keyRegex, `#${id} (${key})`);
    }

    return transformed;
}

function normalizeIssueLabels(issue) {
    return (issue && Array.isArray(issue.labels))
        ? issue.labels.map(l => (typeof l === 'string' ? l : l.name).toLowerCase())
        : [];
}

function pickPreferredIssue(a, b) {
    if (!a) return b;
    if (!b) return a;
    if (a.state !== b.state) return a.state === 'OPEN' ? a : b;
    return a.number > b.number ? a : b;
}

function isIssueUnchanged(remoteIssue, desiredTitle, desiredMainBody, requiredBaseLabels, reviewMode) {
    if (!remoteIssue || typeof remoteIssue.body !== 'string') return false;
    const remoteTitle = (remoteIssue.title || '').trim();
    const remoteBody = remoteIssue.body.replace(/\r\n/g, '\n').trim();
    if (remoteTitle !== desiredTitle.trim() || remoteBody !== desiredMainBody.trim()) return false;
    const existingLabels = new Set(remoteIssue.labelNames || normalizeIssueLabels(remoteIssue));
    for (const req of requiredBaseLabels) {
        if (!existingLabels.has(req.toLowerCase())) return false;
    }
    if (reviewMode === 'add' && !existingLabels.has(REVIEW_LABEL)) return false;
    if (reviewMode === 'remove' && existingLabels.has(REVIEW_LABEL)) return false;
    return true;
}

async function fetchRemoteIssues() {
    if (isDryRun) {
        return { epicIssues: [], ticketIssues: [] };
    }
    const baseFields = ['--state', 'all', '--json', 'number,title,body,labels,state'];
    const epicArgs = ['issue', 'list', '--label', 'epic', '--limit', '500', ...baseFields];
    const ticketArgs = ['issue', 'list', '--label', 'ticket', '--limit', '1000', ...baseFields];
    if (repo) {
        epicArgs.push('--repo', repo);
        ticketArgs.push('--repo', repo);
    }

    const [epicOut, ticketOut] = await Promise.all([runGh(epicArgs), runGh(ticketArgs)]);
    return {
        epicIssues: JSON.parse(epicOut || '[]'),
        ticketIssues: JSON.parse(ticketOut || '[]')
    };
}

// Build Global Specs Index across all sibling PRDs + GitHub remote state without mutating disk
function buildGlobalRegistry(specsRootDir, remoteData) {
    const globalRegistry = {};
    if (!fs.existsSync(specsRootDir)) return globalRegistry;

    const remoteByEpic = new Map();
    for (const issue of remoteData.epicIssues) {
        const labels = normalizeIssueLabels(issue);
        for (const lbl of labels) {
            if (lbl.startsWith('epic-')) {
                const eKey = extractEpicKey(lbl.slice(5));
                if (eKey) {
                    const slot = remoteByEpic.get(eKey) || { parent: null, tickets: [] };
                    slot.parent = pickPreferredIssue(slot.parent, { ...issue, labelNames: labels });
                    remoteByEpic.set(eKey, slot);
                }
            }
        }
    }
    for (const issue of remoteData.ticketIssues) {
        const labels = normalizeIssueLabels(issue);
        for (const lbl of labels) {
            if (lbl.startsWith('epic-')) {
                const eKey = extractEpicKey(lbl.slice(5));
                if (eKey) {
                    const slot = remoteByEpic.get(eKey) || { parent: null, tickets: [] };
                    slot.tickets.push({ ...issue, labelNames: labels });
                    remoteByEpic.set(eKey, slot);
                }
            }
        }
    }

    const epicDirs = fs.readdirSync(specsRootDir, { withFileTypes: true })
        .filter(d => d.isDirectory() && !d.name.startsWith('.'))
        .map(d => d.name)
        .sort();

    for (const dir of epicDirs) {
        const epicKey = extractEpicKey(dir);
        if (!epicKey) continue;

        const ePrdFile = path.join(specsRootDir, dir, 'PRD.md');
        const eTicketsDir = path.join(specsRootDir, dir, 'tickets');
        if (!fs.existsSync(ePrdFile)) continue;

        const prdRaw = fs.readFileSync(ePrdFile, 'utf8');
        const remoteSlot = remoteByEpic.get(epicKey);

        globalRegistry[epicKey] = {
            epicKey,
            dirName: dir,
            prdFile: ePrdFile,
            parentIssue: remoteSlot ? remoteSlot.parent : null,
            tickets: {}
        };

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
                const fileMatch = line.match(/\(`?([^`\r\n]+\.md)`?\)/);
                const issueId = issueMatch ? parseInt(issueMatch[1], 10) : null;
                const fileName = fileMatch ? path.basename(fileMatch[1].trim()) : null;
                const key = fileName ? extractSemanticKey(fileName) : null;

                if (key) {
                    globalRegistry[epicKey].tickets[key] = {
                        key,
                        fileName,
                        title: cleanTitle(line.replace(/^-\s+/, '')),
                        issueId,
                        state: 'OPEN',
                        labelNames: []
                    };
                }
            }
        }

        if (fs.existsSync(eTicketsDir)) {
            const tFiles = fs.readdirSync(eTicketsDir).filter(f => f.endsWith('.md')).sort();
            for (const tf of tFiles) {
                const k = extractSemanticKey(tf);
                if (!k) continue;
                if (!globalRegistry[epicKey].tickets[k]) {
                    globalRegistry[epicKey].tickets[k] = {
                        key: k,
                        fileName: tf,
                        title: tf.replace('.md', ''),
                        issueId: null,
                        state: 'OPEN',
                        labelNames: []
                    };
                } else if (!globalRegistry[epicKey].tickets[k].fileName) {
                    globalRegistry[epicKey].tickets[k].fileName = tf;
                }
            }
        }

        if (remoteSlot) {
            for (const rIssue of remoteSlot.tickets) {
                const rKey = extractSemanticKey(rIssue.title) || extractSemanticKey(cleanTitle(rIssue.title));
                if (!rKey) continue;
                const existing = globalRegistry[epicKey].tickets[rKey];
                if (!existing) {
                    globalRegistry[epicKey].tickets[rKey] = {
                        key: rKey,
                        fileName: null,
                        title: rIssue.title,
                        issueId: rIssue.number,
                        state: rIssue.state,
                        labelNames: rIssue.labelNames,
                        remoteIssue: rIssue
                    };
                } else {
                    const preferred = existing.issueId
                        ? pickPreferredIssue({ number: existing.issueId, state: existing.state, labelNames: existing.labelNames }, rIssue)
                        : rIssue;
                    existing.issueId = preferred.number;
                    existing.state = preferred.state;
                    existing.labelNames = preferred.labelNames || rIssue.labelNames;
                    existing.remoteIssue = preferred.body !== undefined ? preferred : rIssue;
                }
            }
        }
    }

    return globalRegistry;
}

// Publish or Reconcile a single Epic (PURE COMPILATION — ZERO DISK MUTATION OF TICKETS)
async function processEpic(prdFilePath, parentIdOverride, globalRegistry) {
    const targetEpicDir = path.dirname(prdFilePath);
    const ticketsDirPath = path.join(targetEpicDir, 'tickets');
    const currentEpicKey = extractEpicKey(path.basename(targetEpicDir));
    if (!currentEpicKey) {
        throw new Error(`Could not extract numeric Epic key from directory name: ${path.basename(targetEpicDir)}`);
    }
    const prdRawContent = fs.readFileSync(prdFilePath, 'utf8').replace(/\r\n/g, '\n');
    const reviewState = resolveReviewLabelMode(prdRawContent, forceReviewMode);

    const epicTag = `epic-${currentEpicKey}`;
    const prdBaseLabels = `epic,${epicTag}`;
    const ticketBaseLabels = `ticket,${epicTag}`;
    const prdCreateLabels = reviewState.mode === 'add' ? `${prdBaseLabels},${REVIEW_LABEL}` : prdBaseLabels;
    const ticketCreateLabels = reviewState.mode === 'add' ? `${ticketBaseLabels},${REVIEW_LABEL}` : ticketBaseLabels;

    console.log(`\n======================================================`);
    console.log(`Processing Epic ${currentEpicKey}: ${path.basename(targetEpicDir)} [Review: ${reviewState.displayStatus}]`);
    console.log(`======================================================`);

    const requiredLabels = [
        { name: 'epic', color: '5319e7', description: 'Epic PRD specification' },
        { name: 'ticket', color: '0e8a16', description: 'Actionable task ticket' },
        { name: epicTag, color: '1f75cb', description: `Issues belonging to Epic ${currentEpicKey}` }
    ];
    if (reviewState.mode === 'add') {
        requiredLabels.push({ name: REVIEW_LABEL, color: 'd93f0b', description: 'Draft PRD/ticket pending deep review' });
    }

    for (const l of requiredLabels) {
        if (isDryRun) {
            console.log(`  [DRY-RUN] Ensure label "${l.name}"`);
        } else {
            try {
                const lArgs = ['label', 'create', l.name, '--color', l.color, '--description', l.description, '--force'];
                if (repo) lArgs.push('--repo', repo);
                await runGh(lArgs);
            } catch (_) {}
        }
    }

    // Read Pure Local Tickets (READ-ONLY)
    const targetTickets = [];
    if (fs.existsSync(ticketsDirPath)) {
        const rawFiles = fs.readdirSync(ticketsDirPath).filter(f => f.endsWith('.md')).sort();
        for (const f of rawFiles) {
            const k = extractSemanticKey(f);
            if (!k) continue;
            const filePath = path.join(ticketsDirPath, f);
            const rawContent = fs.readFileSync(filePath, 'utf8');
            const titleMatch = rawContent.match(/^#\s+(.+)$/m);
            const rawTitle = titleMatch ? titleMatch[1].trim() : f.replace('.md', '');
            const title = cleanTitle(rawTitle);

            targetTickets.push({
                key: k,
                fileName: f,
                filePath,
                title,
                rawContent
            });
        }
    }

    console.log(`Found ${targetTickets.length} local tickets (Read-only source).`);

    // Parent PRD Resolution: CLI override > PRD.md ## Parent > GitHub remote label match > Create new
    let finalParentId = parentIdOverride;
    const prdTitleMatch = prdRawContent.match(/^#\s+(.+)$/m);
    const prdTitle = prdTitleMatch ? cleanTitle(prdTitleMatch[1]) : `Epic ${currentEpicKey}: ${path.basename(targetEpicDir)}`;
    const matchedRemoteParent = globalRegistry[currentEpicKey] ? globalRegistry[currentEpicKey].parentIssue : null;
    let parentRemoteIssue = matchedRemoteParent;
    let parentLabelNames = matchedRemoteParent ? matchedRemoteParent.labelNames : null;

    if (!finalParentId) {
        const existingParentMatch = prdRawContent.match(/## Parent\n#(\d+)/m);
        if (existingParentMatch) {
            finalParentId = parseInt(existingParentMatch[1], 10);
        } else if (matchedRemoteParent) {
            finalParentId = matchedRemoteParent.number;
        }
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prd-publish-'));

    if (!finalParentId) {
        parentRemoteIssue = null;
        if (isDryRun) {
            finalParentId = 999;
            console.log(`[DRY-RUN] Create Parent Issue "${prdTitle}" (labels: ${prdCreateLabels}) -> #${finalParentId}`);
        } else {
            console.log(`Creating Parent Issue "${prdTitle}"...`);
            const { mainBody, overflowComments } = splitBodyForGitHub(prdRawContent);
            const tempPrdPath = path.join(tempDir, 'PRD.md');
            fs.writeFileSync(tempPrdPath, mainBody, 'utf8');

            const ghArgs = ['issue', 'create', '--title', prdTitle, '--body-file', tempPrdPath, '--label', prdCreateLabels];
            if (repo) ghArgs.push('--repo', repo);
            const outUrl = await runGh(ghArgs);
            const idMatch = outUrl.match(/\/issues\/(\d+)$/);
            finalParentId = idMatch ? parseInt(idMatch[1], 10) : null;
            console.log(`Created Parent Issue #${finalParentId}: ${outUrl}`);
            if (finalParentId) {
                await syncOverflowComments(finalParentId, overflowComments, tempDir, 'PRD');
            }
        }
    } else {
        console.log(`Using existing Parent Issue #${finalParentId} (labels: ${prdCreateLabels}, reviewMode: ${reviewState.mode}).`);
        if (!isDryRun && (!parentRemoteIssue || parentRemoteIssue.number !== finalParentId)) {
            try {
                const viewArgs = ['issue', 'view', String(finalParentId), '--json', 'number,title,body,labels,state'];
                if (repo) viewArgs.push('--repo', repo);
                const viewOut = await runGh(viewArgs);
                const parsed = JSON.parse(viewOut || '{}');
                parentLabelNames = normalizeIssueLabels(parsed);
                parentRemoteIssue = { ...parsed, labelNames: parentLabelNames };
            } catch (_) {
                parentLabelNames = [];
                parentRemoteIssue = null;
            }
        }
    }

    // Collect orphans now, close AFTER newTickets are created so split children can be linked
    const existingRemoteTickets = (globalRegistry[currentEpicKey] && globalRegistry[currentEpicKey].tickets) || {};
    const localKeySet = new Set(targetTickets.map(t => t.key));
    const orphanedRemoteTickets = [];

    for (const [rKey, rTicket] of Object.entries(existingRemoteTickets)) {
        if (!localKeySet.has(rKey) && rTicket.issueId && rTicket.state !== 'CLOSED') {
            orphanedRemoteTickets.push(rTicket);
        }
    }

    // Separate into In-Place Updates vs New Tickets
    const inPlaceTickets = [];
    const newTickets = [];

    for (const t of targetTickets) {
        const existingEntry = existingRemoteTickets[t.key];
        if (existingEntry && existingEntry.issueId) {
            inPlaceTickets.push({
                ...t,
                existingIssueId: existingEntry.issueId,
                existingLabels: existingEntry.labelNames || [],
                remoteIssue: existingEntry.remoteIssue || null
            });
        } else {
            newTickets.push(t);
        }
    }

    const dynamicLocalMap = {};
    for (const t of inPlaceTickets) {
        dynamicLocalMap[t.key] = t.existingIssueId;
    }

    // 1. Concurrent In-Place Updates (Ephemeral Compile -> no-op skip or gh issue edit -> Zero Disk Mutation)
    if (inPlaceTickets.length > 0) {
        console.log(`\nChecking ${inPlaceTickets.length} In-Place Tickets concurrently (Pool size: ${concurrency})...`);
        await runConcurrent(inPlaceTickets, concurrency, async (t) => {
            let compiledBody = replaceSemanticKeysInBody(t.rawContent, currentEpicKey, globalRegistry, dynamicLocalMap);
            if (!compiledBody.includes(`## Parent\n#${finalParentId}`) && !compiledBody.includes(`## Parent\nhttps://github.com/`)) {
                compiledBody = compiledBody.replace(/## Epic\n[^\n]+/m, `## Parent\n#${finalParentId} (${prdTitle})\n\n## Epic\n${prdTitle}`);
            }

            const { mainBody, overflowComments } = splitBodyForGitHub(compiledBody);
            const shouldRemoveReviewLabel = reviewState.mode === 'remove' && t.existingLabels.includes(REVIEW_LABEL);
            if (isDryRun) {
                console.log(`  [DRY-RUN EDIT] [${t.key}] In-Place Update #${t.existingIssueId}: "${t.title}" (${reviewState.mode})`);
                await syncOverflowComments(t.existingIssueId, overflowComments, tempDir, t.fileName);
            } else if (isIssueUnchanged(t.remoteIssue, t.title, mainBody, ['ticket', epicTag], reviewState.mode)) {
                console.log(`  [UNCHANGED] #${t.existingIssueId} [${t.key}]: "${t.title}"`);
                await syncOverflowComments(t.existingIssueId, overflowComments, tempDir, t.fileName);
            } else {
                const tempFilePath = path.join(tempDir, t.fileName);
                fs.writeFileSync(tempFilePath, mainBody, 'utf8');

                const ghArgs = ['issue', 'edit', String(t.existingIssueId), '--title', t.title, '--body-file', tempFilePath, '--add-label', ticketCreateLabels];
                if (shouldRemoveReviewLabel) {
                    ghArgs.push('--remove-label', REVIEW_LABEL);
                }
                if (repo) ghArgs.push('--repo', repo);
                await runGh(ghArgs);
                console.log(`  [UPDATED] #${t.existingIssueId} [${t.key}]: "${t.title}"${shouldRemoveReviewLabel ? ' (-to-be-reviewed)' : ''}`);
                await syncOverflowComments(t.existingIssueId, overflowComments, tempDir, t.fileName);
            }
        });
    }

    // 2. Sequential Creation of New Tickets (Ephemeral Compile -> gh issue create -> Zero Disk Mutation)
    if (newTickets.length > 0) {
        console.log(`\nCreating ${newTickets.length} New Tickets in topological order...`);
        let simCounter = 500;
        for (const t of newTickets) {
            let compiledBody = replaceSemanticKeysInBody(t.rawContent, currentEpicKey, globalRegistry, dynamicLocalMap);
            if (!compiledBody.includes(`## Parent\n#${finalParentId}`) && !compiledBody.includes(`## Parent\nhttps://github.com/`)) {
                compiledBody = compiledBody.replace(/## Epic\n[^\n]+/m, `## Parent\n#${finalParentId} (${prdTitle})\n\n## Epic\n${prdTitle}`);
            }

            const { mainBody, overflowComments } = splitBodyForGitHub(compiledBody);
            let createdId = null;
            if (isDryRun) {
                createdId = simCounter++;
                dynamicLocalMap[t.key] = createdId;
                console.log(`  [DRY-RUN CREATE] [${t.key}] New Issue #${createdId}: "${t.title}" (labels: ${ticketCreateLabels})`);
                await syncOverflowComments(createdId, overflowComments, tempDir, t.fileName);
            } else {
                const tempFilePath = path.join(tempDir, t.fileName);
                fs.writeFileSync(tempFilePath, mainBody, 'utf8');

                const ghArgs = ['issue', 'create', '--title', t.title, '--body-file', tempFilePath, '--label', ticketCreateLabels];
                if (repo) ghArgs.push('--repo', repo);
                const issueUrl = await runGh(ghArgs);
                const idMatch = issueUrl.match(/\/issues\/(\d+)$/);
                createdId = idMatch ? parseInt(idMatch[1], 10) : null;
                dynamicLocalMap[t.key] = createdId;
                console.log(`  [CREATED] #${createdId} [${t.key}]: "${t.title}"`);
                if (createdId) {
                    if (globalRegistry[currentEpicKey] && globalRegistry[currentEpicKey].tickets[t.key]) {
                        globalRegistry[currentEpicKey].tickets[t.key].issueId = createdId;
                    }
                    await syncOverflowComments(createdId, overflowComments, tempDir, t.fileName);
                }
            }
        }
    }

    // 3. Close Orphaned / Split Remote Tickets (AFTER newTickets so split children can be linked)
    if (orphanedRemoteTickets.length > 0) {
        console.log(`\nClosing ${orphanedRemoteTickets.length} orphaned/split tickets concurrently...`);
        await runConcurrent(orphanedRemoteTickets, concurrency, async (orphan) => {
            const splitChildKeys = Object.keys(dynamicLocalMap)
                .filter(k => k.startsWith(`${orphan.key}.`) && dynamicLocalMap[k])
                .sort();
            const closeComment = splitChildKeys.length > 0
                ? `Split into ${splitChildKeys.map(k => `#${dynamicLocalMap[k]} (${k})`).join(', ')} under Parent PRD #${finalParentId}. Closing.`
                : `Superseded or removed under Parent PRD #${finalParentId}. Closing.`;

            if (!isDryRun) {
                try {
                    const closeArgs = [
                        'issue', 'close', String(orphan.issueId),
                        '--reason', 'not planned',
                        '--comment', closeComment
                    ];
                    if (repo) closeArgs.push('--repo', repo);
                    await runGh(closeArgs);
                    console.log(`  [CLOSED (not planned)] Stale Issue #${orphan.issueId} [${orphan.key}]: ${closeComment}`);
                } catch (err) {
                    console.warn(`  Warning: Could not close #${orphan.issueId}: ${err.message}`);
                }
            } else {
                console.log(`  [DRY-RUN CLOSE] Stale Issue #${orphan.issueId} [${orphan.key}] (reason: not planned): ${closeComment}`);
            }
        });
    }

    // Compile and Upload Parent PRD Body (Ephemeral compile, no-op skip if unchanged)
    console.log(`\nCompiling and Updating Parent PRD #${finalParentId} on GitHub...`);
    let compiledPrd = prdRawContent;
    let ticketListMarkdown = '';

    for (const t of targetTickets) {
        const issueNum = dynamicLocalMap[t.key];
        ticketListMarkdown += `- #${issueNum} — ${t.title} (\`tickets/${t.fileName}\`)\n`;
    }

    compiledPrd = compiledPrd.replace(/## Tickets\n+[\s\S]*?(?=\n## |$)/, `## Tickets\n\n${ticketListMarkdown}`);
    compiledPrd = replaceSemanticKeysInBody(compiledPrd, currentEpicKey, globalRegistry, dynamicLocalMap);

    const { mainBody: prdMainBody, overflowComments: prdOverflow } = splitBodyForGitHub(compiledPrd);
    const shouldRemoveParentReviewLabel = reviewState.mode === 'remove' && Array.isArray(parentLabelNames) && parentLabelNames.includes(REVIEW_LABEL);

    if (isDryRun) {
        console.log(`[DRY-RUN] Update PRD #${finalParentId} on GitHub (add: ${prdCreateLabels}${shouldRemoveParentReviewLabel ? `, remove: ${REVIEW_LABEL}` : ''}).`);
        await syncOverflowComments(finalParentId, prdOverflow, tempDir, 'PRD_final');
    } else if (isIssueUnchanged(parentRemoteIssue, prdTitle, prdMainBody, ['epic', epicTag], reviewState.mode)) {
        console.log(`[UNCHANGED] Parent PRD #${finalParentId} is already up to date.`);
        await syncOverflowComments(finalParentId, prdOverflow, tempDir, 'PRD_final');
    } else {
        const tempPrdPath = path.join(tempDir, 'PRD_final.md');
        fs.writeFileSync(tempPrdPath, prdMainBody, 'utf8');

        const ghArgs = ['issue', 'edit', String(finalParentId), '--title', prdTitle, '--body-file', tempPrdPath, '--add-label', prdCreateLabels];
        if (shouldRemoveParentReviewLabel) {
            ghArgs.push('--remove-label', REVIEW_LABEL);
        }
        if (repo) ghArgs.push('--repo', repo);
        await runGh(ghArgs);
        console.log(`Successfully updated Parent Issue #${finalParentId} on GitHub${shouldRemoveParentReviewLabel ? ' (-to-be-reviewed)' : ''}.`);
        await syncOverflowComments(finalParentId, prdOverflow, tempDir, 'PRD_final');
    }

    try {
        fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) {}

    return {
        epicKey: currentEpicKey,
        dirName: path.basename(targetEpicDir),
        parentId: finalParentId,
        reviewStatus: reviewState.displayStatus,
        tickets: dynamicLocalMap,
        ticketCount: targetTickets.length
    };
}

// Main CLI Entrypoint
async function main() {
    parseCliArgs(process.argv.slice(2));
    const resolvedTarget = path.resolve(targetPath);
    if (!fs.existsSync(resolvedTarget)) {
        console.error(`Error: Target path does not exist: ${resolvedTarget}`);
        process.exit(1);
    }

    const stat = fs.statSync(resolvedTarget);
    let resolvedSpecsRoot = null;
    let targetPrdList = [];

    if (stat.isFile()) {
        resolvedSpecsRoot = path.dirname(path.dirname(resolvedTarget));
        targetPrdList = [resolvedTarget];
    } else if (stat.isDirectory()) {
        const directPrd = path.join(resolvedTarget, 'PRD.md');
        if (!isAll && fs.existsSync(directPrd)) {
            resolvedSpecsRoot = path.dirname(resolvedTarget);
            targetPrdList = [directPrd];
        } else {
            resolvedSpecsRoot = resolvedTarget;
            targetPrdList = fs.readdirSync(resolvedSpecsRoot, { withFileTypes: true })
                .filter(d => d.isDirectory() && !d.name.startsWith('.'))
                .map(d => d.name)
                .sort()
                .map(name => path.join(resolvedSpecsRoot, name, 'PRD.md'))
                .filter(f => fs.existsSync(f));
        }
    }

    if (targetPrdList.length === 0) {
        console.error(`Error: No PRD.md files found under ${resolvedTarget}`);
        process.exit(1);
    }

    console.log(`=== Pre-scanning Global Registry (Specs Root: ${resolvedSpecsRoot}) ===`);
    const remoteData = await fetchRemoteIssues();
    const globalRegistry = buildGlobalRegistry(resolvedSpecsRoot, remoteData);

    const summaries = [];
    for (const prdFile of targetPrdList) {
        summaries.push(await processEpic(prdFile, targetPrdList.length === 1 ? parentId : null, globalRegistry));
    }

    console.log('\n=== Publish Summary ===');
    console.log('| Epic | Parent Issue | Review Status | Tickets |');
    console.log('| :--- | :--- | :--- | :---: |');
    for (const s of summaries) {
        console.log(`| ${s.epicKey} (${s.dirName}) | #${s.parentId} | ${s.reviewStatus} | ${s.ticketCount} |`);
    }

    console.log(`\n======================================================`);
    console.log(`All Epic Operations Completed Successfully! (Local files untouched)`);
    console.log(`======================================================\n`);
}

export { extractEpicKey, resolveReviewLabelMode, isIssueUnchanged, replaceSemanticKeysInBody };

const isMain = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href;
if (isMain) {
    main().catch(err => {
        console.error(`Fatal error: ${err.message}`);
        process.exit(1);
    });
}
