import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
    REVIEW_LABEL,
    extractEpicKey,
    extractSemanticKey,
    cleanTitle,
    resolveReviewLabelMode,
    rewriteFileLinksForGitHub,
    replaceSemanticKeysInBody,
    splitBodyForGitHub,
    normalizeIssueLabels,
    pickPreferredIssue,
    isIssueUnchanged
} from './markdown-compiler.js';
import { createGitHubAdapter } from './github-adapter.js';

/**
 * Build global index across all sibling PRDs and remote GitHub issues without mutating disk.
 */
export function buildGlobalRegistry(specsRootDir, remoteData) {
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

function readLocalTickets(ticketsDirPath) {
    const targetTickets = [];
    if (!fs.existsSync(ticketsDirPath)) return targetTickets;

    const rawFiles = fs.readdirSync(ticketsDirPath).filter(f => f.endsWith('.md')).sort();
    for (const f of rawFiles) {
        const k = extractSemanticKey(f);
        if (!k) continue;
        const filePath = path.join(ticketsDirPath, f);
        const rawContent = fs.readFileSync(filePath, 'utf8');
        const titleMatch = rawContent.match(/^#\s+(.+)$/m);
        const rawTitle = titleMatch ? titleMatch[1].trim() : f.replace('.md', '');
        targetTickets.push({
            key: k,
            fileName: f,
            filePath,
            title: cleanTitle(rawTitle),
            rawContent
        });
    }
    return targetTickets;
}

async function resolveOrCreateParentIssue({
    prdRawContent,
    prdTitle,
    currentEpicKey,
    parentIdOverride,
    globalRegistry,
    reviewState,
    prdCreateLabels,
    tempDir,
    repoContext,
    gh
}) {
    let finalParentId = parentIdOverride;
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

    if (!finalParentId) {
        parentRemoteIssue = null;
        if (gh.options.dryRun) {
            finalParentId = 999;
            console.log(`[DRY-RUN] Create Parent Issue "${prdTitle}" (labels: ${prdCreateLabels}) -> #${finalParentId}`);
        } else {
            console.log(`Creating Parent Issue "${prdTitle}"...`);
            const initialBody = rewriteFileLinksForGitHub(prdRawContent, repoContext);
            const { mainBody, overflowComments } = splitBodyForGitHub(initialBody);
            const tempPrdPath = path.join(tempDir, 'PRD.md');
            fs.writeFileSync(tempPrdPath, mainBody, 'utf8');

            const ghArgs = ['issue', 'create', '--title', prdTitle, '--body-file', tempPrdPath, '--label', prdCreateLabels];
            if (gh.options.repo) ghArgs.push('--repo', gh.options.repo);
            const outUrl = await gh.runGh(ghArgs);
            const idMatch = outUrl.match(/\/issues\/(\d+)$/);
            finalParentId = idMatch ? parseInt(idMatch[1], 10) : null;
            console.log(`Created Parent Issue #${finalParentId}: ${outUrl}`);
            if (finalParentId) {
                if (globalRegistry[currentEpicKey]) {
                    globalRegistry[currentEpicKey].parentIssue = {
                        number: finalParentId,
                        state: 'OPEN',
                        labelNames: prdCreateLabels.split(',')
                    };
                }
                await gh.syncOverflowComments(finalParentId, overflowComments, tempDir, 'PRD');
            }
        }
    } else {
        if (globalRegistry[currentEpicKey] && !globalRegistry[currentEpicKey].parentIssue) {
            globalRegistry[currentEpicKey].parentIssue = {
                number: finalParentId,
                state: 'OPEN',
                labelNames: parentLabelNames || []
            };
        }
        console.log(`Using existing Parent Issue #${finalParentId} (labels: ${prdCreateLabels}, reviewMode: ${reviewState.mode}).`);
        if (!gh.options.dryRun && (!parentRemoteIssue || parentRemoteIssue.number !== finalParentId)) {
            try {
                parentRemoteIssue = await gh.fetchIssueDetails(finalParentId);
                parentLabelNames = parentRemoteIssue.labelNames;
            } catch (_) {
                parentLabelNames = [];
                parentRemoteIssue = null;
            }
        }
    }

    return { finalParentId, parentRemoteIssue, parentLabelNames };
}

async function updateInPlaceTickets({
    inPlaceTickets,
    finalParentId,
    prdTitle,
    currentEpicKey,
    epicTag,
    ticketCreateLabels,
    reviewState,
    globalRegistry,
    dynamicLocalMap,
    tempDir,
    repoContext,
    concurrency,
    gh
}) {
    if (inPlaceTickets.length === 0) return;
    console.log(`\nChecking ${inPlaceTickets.length} In-Place Tickets concurrently (Pool size: ${concurrency})...`);

    await gh.runConcurrent(inPlaceTickets, concurrency, async (t) => {
        let compiledBody = replaceSemanticKeysInBody(t.rawContent, currentEpicKey, globalRegistry, dynamicLocalMap, repoContext);
        if (!compiledBody.includes(`## Parent\n#${finalParentId}`) && !compiledBody.includes(`## Parent\nhttps://github.com/`)) {
            compiledBody = compiledBody.replace(/## Epic\n[^\n]+/m, `## Parent\n#${finalParentId} (${prdTitle})\n\n## Epic\n${prdTitle}`);
        }

        const { mainBody, overflowComments } = splitBodyForGitHub(compiledBody);
        const shouldRemoveReviewLabel = reviewState.mode === 'remove' && t.existingLabels.includes(REVIEW_LABEL);

        if (gh.options.dryRun) {
            console.log(`  [DRY-RUN EDIT] [${t.key}] In-Place Update #${t.existingIssueId}: "${t.title}" (${reviewState.mode})`);
            await gh.syncOverflowComments(t.existingIssueId, overflowComments, tempDir, t.fileName);
            return;
        }
        if (isIssueUnchanged(t.remoteIssue, t.title, mainBody, ['ticket', epicTag], reviewState.mode)) {
            console.log(`  [UNCHANGED] #${t.existingIssueId} [${t.key}]: "${t.title}"`);
            await gh.syncOverflowComments(t.existingIssueId, overflowComments, tempDir, t.fileName);
            return;
        }

        const tempFilePath = path.join(tempDir, t.fileName);
        fs.writeFileSync(tempFilePath, mainBody, 'utf8');

        const ghArgs = ['issue', 'edit', String(t.existingIssueId), '--title', t.title, '--body-file', tempFilePath, '--add-label', ticketCreateLabels];
        if (shouldRemoveReviewLabel) {
            ghArgs.push('--remove-label', REVIEW_LABEL);
        }
        if (gh.options.repo) ghArgs.push('--repo', gh.options.repo);
        await gh.runGh(ghArgs);
        console.log(`  [UPDATED] #${t.existingIssueId} [${t.key}]: "${t.title}"${shouldRemoveReviewLabel ? ' (-to-be-reviewed)' : ''}`);
        await gh.syncOverflowComments(t.existingIssueId, overflowComments, tempDir, t.fileName);
    });
}

async function createNewTickets({
    newTickets,
    finalParentId,
    prdTitle,
    currentEpicKey,
    ticketCreateLabels,
    globalRegistry,
    dynamicLocalMap,
    tempDir,
    repoContext,
    gh
}) {
    if (newTickets.length === 0) return;
    console.log(`\nCreating ${newTickets.length} New Tickets in topological order...`);
    let simCounter = 500;

    for (const t of newTickets) {
        let compiledBody = replaceSemanticKeysInBody(t.rawContent, currentEpicKey, globalRegistry, dynamicLocalMap, repoContext);
        if (!compiledBody.includes(`## Parent\n#${finalParentId}`) && !compiledBody.includes(`## Parent\nhttps://github.com/`)) {
            compiledBody = compiledBody.replace(/## Epic\n[^\n]+/m, `## Parent\n#${finalParentId} (${prdTitle})\n\n## Epic\n${prdTitle}`);
        }

        const { mainBody, overflowComments } = splitBodyForGitHub(compiledBody);
        if (gh.options.dryRun) {
            const createdId = simCounter++;
            dynamicLocalMap[t.key] = createdId;
            console.log(`  [DRY-RUN CREATE] [${t.key}] New Issue #${createdId}: "${t.title}" (labels: ${ticketCreateLabels})`);
            await gh.syncOverflowComments(createdId, overflowComments, tempDir, t.fileName);
            continue;
        }

        const tempFilePath = path.join(tempDir, t.fileName);
        fs.writeFileSync(tempFilePath, mainBody, 'utf8');

        const ghArgs = ['issue', 'create', '--title', t.title, '--body-file', tempFilePath, '--label', ticketCreateLabels];
        if (gh.options.repo) ghArgs.push('--repo', gh.options.repo);
        const issueUrl = await gh.runGh(ghArgs);
        const idMatch = issueUrl.match(/\/issues\/(\d+)$/);
        const createdId = idMatch ? parseInt(idMatch[1], 10) : null;
        dynamicLocalMap[t.key] = createdId;
        console.log(`  [CREATED] #${createdId} [${t.key}]: "${t.title}"`);

        if (createdId) {
            if (globalRegistry[currentEpicKey] && globalRegistry[currentEpicKey].tickets[t.key]) {
                globalRegistry[currentEpicKey].tickets[t.key].issueId = createdId;
            }
            await gh.syncOverflowComments(createdId, overflowComments, tempDir, t.fileName);
        }
    }
}

async function closeOrphanedTickets({ orphanedRemoteTickets, dynamicLocalMap, finalParentId, concurrency, gh }) {
    if (orphanedRemoteTickets.length === 0) return;
    console.log(`\nClosing ${orphanedRemoteTickets.length} orphaned/split tickets concurrently...`);

    await gh.runConcurrent(orphanedRemoteTickets, concurrency, async (orphan) => {
        const splitChildKeys = Object.keys(dynamicLocalMap)
            .filter(k => k.startsWith(`${orphan.key}.`) && dynamicLocalMap[k])
            .sort();
        const closeComment = splitChildKeys.length > 0
            ? `Split into ${splitChildKeys.map(k => `#${dynamicLocalMap[k]} (${k})`).join(', ')} under Parent PRD #${finalParentId}. Closing.`
            : `Superseded or removed under Parent PRD #${finalParentId}. Closing.`;

        if (gh.options.dryRun) {
            console.log(`  [DRY-RUN CLOSE] Stale Issue #${orphan.issueId} [${orphan.key}] (reason: not planned): ${closeComment}`);
            return;
        }

        try {
            const closeArgs = ['issue', 'close', String(orphan.issueId), '--reason', 'not planned', '--comment', closeComment];
            if (gh.options.repo) closeArgs.push('--repo', gh.options.repo);
            await gh.runGh(closeArgs);
            console.log(`  [CLOSED (not planned)] Stale Issue #${orphan.issueId} [${orphan.key}]: ${closeComment}`);
        } catch (err) {
            console.warn(`  Warning: Could not close #${orphan.issueId}: ${err.message}`);
        }
    });
}

async function syncParentPrdIssue({
    finalParentId,
    prdTitle,
    prdRawContent,
    targetTickets,
    currentEpicKey,
    epicTag,
    prdCreateLabels,
    reviewState,
    parentRemoteIssue,
    parentLabelNames,
    globalRegistry,
    dynamicLocalMap,
    tempDir,
    repoContext,
    gh
}) {
    console.log(`\nCompiling and Updating Parent PRD #${finalParentId} on GitHub...`);
    let compiledPrd = replaceSemanticKeysInBody(prdRawContent, currentEpicKey, globalRegistry, dynamicLocalMap, repoContext);
    let ticketListMarkdown = '';
    for (const t of targetTickets) {
        const issueNum = dynamicLocalMap[t.key];
        ticketListMarkdown += `- #${issueNum} — ${t.title} (\`tickets/${t.fileName}\`)\n`;
    }
    compiledPrd = compiledPrd.replace(/## Tickets\n+[\s\S]*?(?=\n## |$)/, `## Tickets\n\n${ticketListMarkdown.trimEnd()}`);

    const { mainBody: prdMainBody, overflowComments: prdOverflow } = splitBodyForGitHub(compiledPrd);
    const shouldRemoveParentReviewLabel = reviewState.mode === 'remove' && Array.isArray(parentLabelNames) && parentLabelNames.includes(REVIEW_LABEL);

    if (gh.options.dryRun) {
        console.log(`[DRY-RUN] Update PRD #${finalParentId} on GitHub (add: ${prdCreateLabels}${shouldRemoveParentReviewLabel ? `, remove: ${REVIEW_LABEL}` : ''}).`);
        await gh.syncOverflowComments(finalParentId, prdOverflow, tempDir, 'PRD_final');
        return;
    }
    if (isIssueUnchanged(parentRemoteIssue, prdTitle, prdMainBody, ['epic', epicTag], reviewState.mode)) {
        console.log(`[UNCHANGED] Parent PRD #${finalParentId} is already up to date.`);
        await gh.syncOverflowComments(finalParentId, prdOverflow, tempDir, 'PRD_final');
        return;
    }

    const tempPrdPath = path.join(tempDir, 'PRD_final.md');
    fs.writeFileSync(tempPrdPath, prdMainBody, 'utf8');

    const ghArgs = ['issue', 'edit', String(finalParentId), '--title', prdTitle, '--body-file', tempPrdPath, '--add-label', prdCreateLabels];
    if (shouldRemoveParentReviewLabel) {
        ghArgs.push('--remove-label', REVIEW_LABEL);
    }
    if (gh.options.repo) ghArgs.push('--repo', gh.options.repo);
    await gh.runGh(ghArgs);
    console.log(`Successfully updated Parent Issue #${finalParentId} on GitHub${shouldRemoveParentReviewLabel ? ' (-to-be-reviewed)' : ''}.`);
    await gh.syncOverflowComments(finalParentId, prdOverflow, tempDir, 'PRD_final');
}

/**
 * Reconcile and publish one Epic without mutating local specification files on disk.
 */
export async function processEpic(prdFilePath, parentIdOverride, globalRegistry, repoContext, options = {}) {
    const gh = options.gh || createGitHubAdapter(options);
    const concurrency = options.concurrency || 6;
    const targetEpicDir = path.dirname(prdFilePath);
    const ticketsDirPath = path.join(targetEpicDir, 'tickets');
    const currentEpicKey = extractEpicKey(path.basename(targetEpicDir));
    if (!currentEpicKey) {
        throw new Error(`Could not extract numeric Epic key from directory name: ${path.basename(targetEpicDir)}`);
    }

    const prdRawContent = fs.readFileSync(prdFilePath, 'utf8').replace(/\r\n/g, '\n');
    const reviewState = resolveReviewLabelMode(prdRawContent, options.forceReviewMode || null);

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
    await gh.ensureLabels(requiredLabels);

    const targetTickets = readLocalTickets(ticketsDirPath);
    console.log(`Found ${targetTickets.length} local tickets (Read-only source).`);

    const prdTitleMatch = prdRawContent.match(/^#\s+(.+)$/m);
    const prdTitle = prdTitleMatch ? cleanTitle(prdTitleMatch[1]) : `Epic ${currentEpicKey}: ${path.basename(targetEpicDir)}`;
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prd-publish-'));

    try {
        const { finalParentId, parentRemoteIssue, parentLabelNames } = await resolveOrCreateParentIssue({
            prdRawContent,
            prdTitle,
            currentEpicKey,
            parentIdOverride,
            globalRegistry,
            reviewState,
            prdCreateLabels,
            tempDir,
            repoContext,
            gh
        });

        const existingRemoteTickets = (globalRegistry[currentEpicKey] && globalRegistry[currentEpicKey].tickets) || {};
        const localKeySet = new Set(targetTickets.map(t => t.key));
        const orphanedRemoteTickets = Object.values(existingRemoteTickets)
            .filter(rTicket => !localKeySet.has(rTicket.key) && rTicket.issueId && rTicket.state !== 'CLOSED');

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

        await updateInPlaceTickets({
            inPlaceTickets,
            finalParentId,
            prdTitle,
            currentEpicKey,
            epicTag,
            ticketCreateLabels,
            reviewState,
            globalRegistry,
            dynamicLocalMap,
            tempDir,
            repoContext,
            concurrency,
            gh
        });

        await createNewTickets({
            newTickets,
            finalParentId,
            prdTitle,
            currentEpicKey,
            ticketCreateLabels,
            globalRegistry,
            dynamicLocalMap,
            tempDir,
            repoContext,
            gh
        });

        await closeOrphanedTickets({
            orphanedRemoteTickets,
            dynamicLocalMap,
            finalParentId,
            concurrency,
            gh
        });

        await syncParentPrdIssue({
            finalParentId,
            prdTitle,
            prdRawContent,
            targetTickets,
            currentEpicKey,
            epicTag,
            prdCreateLabels,
            reviewState,
            parentRemoteIssue,
            parentLabelNames,
            globalRegistry,
            dynamicLocalMap,
            tempDir,
            repoContext,
            gh
        });

        return {
            epicKey: currentEpicKey,
            dirName: path.basename(targetEpicDir),
            parentId: finalParentId,
            reviewStatus: reviewState.displayStatus,
            tickets: dynamicLocalMap,
            ticketCount: targetTickets.length
        };
    } finally {
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (_) {}
    }
}
