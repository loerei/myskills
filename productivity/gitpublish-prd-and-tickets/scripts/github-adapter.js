import fs from 'node:fs';
import path from 'node:path';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { normalizeIssueLabels } from './markdown-compiler.js';

const execFileAsync = promisify(execFile);
const DEFAULT_MAX_BUFFER = 50 * 1024 * 1024;

export function resolveRepoContext(specsRootDir, repoOverride = null) {
    let repoRoot = null;
    try {
        repoRoot = execFileSync('git', ['-C', specsRootDir, 'rev-parse', '--show-toplevel'], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
        }).trim();
    } catch (_) {
        repoRoot = null;
    }

    let repoSlug = repoOverride || null;
    let defaultBranch = 'main';
    if (repoRoot) {
        if (!repoSlug) {
            try {
                const originUrl = execFileSync('git', ['-C', repoRoot, 'remote', 'get-url', 'origin'], {
                    encoding: 'utf8',
                    stdio: ['ignore', 'pipe', 'ignore']
                }).trim();
                const m = originUrl.match(/[:/]([^/:\s]+\/[^/\s]+?)(?:\.git)?$/);
                if (m) repoSlug = m[1];
            } catch (_) {}
        }
        try {
            const symRef = execFileSync('git', ['-C', repoRoot, 'symbolic-ref', 'refs/remotes/origin/HEAD'], {
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'ignore']
            }).trim();
            if (symRef.startsWith('refs/remotes/origin/')) {
                defaultBranch = symRef.slice('refs/remotes/origin/'.length) || 'main';
            }
        } catch (_) {}
    }

    return { repoRoot, repoSlug, defaultBranch };
}

export async function runConcurrent(items, maxWorkers, workerFn) {
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

export async function runGh(ghArgs, options = {}) {
    if (options.dryRun) {
        return `[DRY-RUN gh ${ghArgs.join(' ')}]`;
    }
    const cleanEnv = { ...process.env };
    delete cleanEnv.GITHUB_TOKEN;

    try {
        const { stdout } = await execFileAsync('gh', ghArgs, {
            env: cleanEnv,
            encoding: 'utf8',
            maxBuffer: options.maxBuffer || DEFAULT_MAX_BUFFER
        });
        return stdout.trim();
    } catch (err) {
        if (err.stderr) console.error(`gh error: ${err.stderr.toString().trim()}`);
        else console.error(`gh error: ${err.message}`);
        throw err;
    }
}

export async function fetchRemoteIssues(options = {}) {
    if (options.dryRun) {
        return { epicIssues: [], ticketIssues: [] };
    }
    const baseFields = ['--state', 'all', '--json', 'number,title,body,labels,state'];
    const epicArgs = ['issue', 'list', '--label', 'epic', '--limit', '500', ...baseFields];
    const ticketArgs = ['issue', 'list', '--label', 'ticket', '--limit', '1000', ...baseFields];
    if (options.repo) {
        epicArgs.push('--repo', options.repo);
        ticketArgs.push('--repo', options.repo);
    }

    const [epicOut, ticketOut] = await Promise.all([
        runGh(epicArgs, options),
        runGh(ticketArgs, options)
    ]);
    return {
        epicIssues: JSON.parse(epicOut || '[]'),
        ticketIssues: JSON.parse(ticketOut || '[]')
    };
}

export async function ensureLabels(requiredLabels, options = {}) {
    for (const l of requiredLabels) {
        if (options.dryRun) {
            console.log(`  [DRY-RUN] Ensure label "${l.name}"`);
            continue;
        }
        try {
            const lArgs = ['label', 'create', l.name, '--color', l.color, '--description', l.description, '--force'];
            if (options.repo) lArgs.push('--repo', options.repo);
            await runGh(lArgs, options);
        } catch (_) {}
    }
}

export async function fetchIssueDetails(issueId, options = {}) {
    const viewArgs = ['issue', 'view', String(issueId), '--json', 'number,title,body,labels,state'];
    if (options.repo) viewArgs.push('--repo', options.repo);
    const viewOut = await runGh(viewArgs, options);
    const parsed = JSON.parse(viewOut || '{}');
    const labelNames = normalizeIssueLabels(parsed);
    return { ...parsed, labelNames };
}

export async function syncOverflowComments(issueId, overflowComments, tempDir, filePrefix, options = {}) {
    if (overflowComments.length === 0) return;
    if (options.dryRun) {
        console.log(`  [DRY-RUN COMMENTS] #${issueId}: ${overflowComments.length} overflow comment(s)`);
        return;
    }

    const existingOverflowByPart = new Map();
    try {
        const viewArgs = ['issue', 'view', String(issueId), '--json', 'comments'];
        if (options.repo) viewArgs.push('--repo', options.repo);
        const viewOut = await runGh(viewArgs, options);
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
            const endpoint = options.repo
                ? `repos/${options.repo}/issues/comments/${existing.numericId}`
                : `repos/{owner}/{repo}/issues/comments/${existing.numericId}`;
            const patchArgs = ['api', '--method', 'PATCH', endpoint, '-F', `body=@${commentPath}`];
            await runGh(patchArgs, options);
            console.log(`  [UPDATED COMMENT Part ${partNum}] #${issueId}`);
        } else {
            const commentArgs = ['issue', 'comment', String(issueId), '--body-file', commentPath];
            if (options.repo) commentArgs.push('--repo', options.repo);
            await runGh(commentArgs, options);
            console.log(`  [COMMENTED Part ${partNum}] #${issueId}`);
        }
    }
}

export function createGitHubAdapter(defaultOptions = {}) {
    return {
        options: defaultOptions,
        runGh: (ghArgs) => runGh(ghArgs, defaultOptions),
        runConcurrent,
        fetchRemoteIssues: () => fetchRemoteIssues(defaultOptions),
        ensureLabels: (labels) => ensureLabels(labels, defaultOptions),
        fetchIssueDetails: (issueId) => fetchIssueDetails(issueId, defaultOptions),
        syncOverflowComments: (issueId, comments, tempDir, filePrefix) =>
            syncOverflowComments(issueId, comments, tempDir, filePrefix, defaultOptions)
    };
}
