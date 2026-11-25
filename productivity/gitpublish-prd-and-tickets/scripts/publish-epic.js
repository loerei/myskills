#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
    extractEpicKey,
    resolveReviewLabelMode,
    isIssueUnchanged,
    replaceSemanticKeysInBody,
    rewriteFileLinksForGitHub
} from './markdown-compiler.js';
import { createGitHubAdapter, resolveRepoContext } from './github-adapter.js';
import { buildGlobalRegistry, processEpic } from './reconciler.js';

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

function parseCliArgs(argv) {
    if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
        printUsage(argv.length === 0 ? 1 : 0);
    }

    const opts = {
        targetPath: null,
        parentId: null,
        repo: null,
        concurrency: 6,
        isAll: false,
        dryRun: false,
        forceReviewMode: null
    };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--parent-id' && argv[i + 1]) {
            opts.parentId = parseInt(argv[++i], 10);
        } else if (arg === '--repo' && argv[i + 1]) {
            opts.repo = argv[++i];
        } else if (arg === '--concurrency' && argv[i + 1]) {
            opts.concurrency = Math.max(1, parseInt(argv[++i], 10) || 6);
        } else if (arg === '--all') {
            opts.isAll = true;
        } else if (arg === '--dry-run') {
            opts.dryRun = true;
        } else if (arg === '--to-be-reviewed') {
            if (opts.forceReviewMode === 'reviewed') {
                console.error('Error: Cannot combine --to-be-reviewed and --reviewed.');
                process.exit(1);
            }
            opts.forceReviewMode = 'to-be-reviewed';
        } else if (arg === '--reviewed') {
            if (opts.forceReviewMode === 'to-be-reviewed') {
                console.error('Error: Cannot combine --to-be-reviewed and --reviewed.');
                process.exit(1);
            }
            opts.forceReviewMode = 'reviewed';
        } else if (!arg.startsWith('--') && !opts.targetPath) {
            opts.targetPath = arg;
        }
    }

    if (!opts.targetPath) {
        console.error('Error: Missing target PRD file or Epic directory path.');
        printUsage(1);
    }

    return opts;
}

function resolveTargetPrds(targetPath, isAll) {
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

    return { resolvedSpecsRoot, targetPrdList };
}

async function main() {
    const opts = parseCliArgs(process.argv.slice(2));
    const { resolvedSpecsRoot, targetPrdList } = resolveTargetPrds(opts.targetPath, opts.isAll);

    console.log(`=== Pre-scanning Global Registry (Specs Root: ${resolvedSpecsRoot}) ===`);
    const repoContext = resolveRepoContext(resolvedSpecsRoot, opts.repo);
    const gh = createGitHubAdapter({ repo: opts.repo, dryRun: opts.dryRun });
    const remoteData = await gh.fetchRemoteIssues();
    const globalRegistry = buildGlobalRegistry(resolvedSpecsRoot, remoteData);

    const summaries = [];
    for (const prdFile of targetPrdList) {
        const parentOverride = targetPrdList.length === 1 ? opts.parentId : null;
        summaries.push(await processEpic(prdFile, parentOverride, globalRegistry, repoContext, { ...opts, gh }));
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

export {
    extractEpicKey,
    resolveReviewLabelMode,
    isIssueUnchanged,
    replaceSemanticKeysInBody,
    rewriteFileLinksForGitHub,
    resolveRepoContext,
    buildGlobalRegistry,
    processEpic
};

const isMain = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href;
if (isMain) {
    main().catch(err => {
        console.error(`Fatal error: ${err.message}`);
        process.exit(1);
    });
}
