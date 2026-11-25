import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const GITHUB_MAX_BODY_CHARS = 65536;
export const SAFE_CHUNK_CHARS = 63000;
export const REVIEW_LABEL = 'to-be-reviewed';

export function extractEpicKey(dirOrFileName) {
    const match = String(dirOrFileName || '').match(/^(\d+(?:\.\d+)*)/);
    if (!match) return null;
    const parts = match[1].split('.');
    parts[0] = String(parseInt(parts[0], 10)).padStart(2, '0');
    return parts.join('.');
}

export function extractSemanticKey(text) {
    const match = String(text || '').trim().match(/^(\d+(?:\.\d+)*)/);
    return match ? match[1] : null;
}

export function cleanTitle(rawTitle) {
    return String(rawTitle || '')
        .replace(/^#+\s+/, '')
        .replace(/^#\d+\s+[—–-]\s+/, '')
        .replace(/^#\d+\s*\([0-9\.]+\)\s+[—–-]\s+/, '')
        .trim();
}

export function resolveReviewLabelMode(prdContent, forceMode) {
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

function encodePosixPathSegments(relPosix) {
    return relPosix.split('/').map(seg => encodeURIComponent(seg)).join('/');
}

function isPathInsideRoot(candidatePath, rootPath) {
    if (!candidatePath || !rootPath) return false;
    const normRoot = path.resolve(rootPath);
    const normCandidate = path.resolve(candidatePath);
    const cmpRoot = process.platform === 'win32' ? normRoot.toLowerCase() : normRoot;
    const cmpCandidate = process.platform === 'win32' ? normCandidate.toLowerCase() : normCandidate;
    if (cmpCandidate === cmpRoot) return true;
    const sep = path.sep;
    return cmpCandidate.startsWith(cmpRoot.endsWith(sep) ? cmpRoot : `${cmpRoot}${sep}`);
}

/**
 * Rewrite workspace file:/// links to GitHub blob/tree URLs and strip off-repo machine paths.
 */
export function rewriteFileLinksForGitHub(content, repoContext) {
    if (!content) return content;
    const ctx = repoContext || {};

    return content.replace(/\[([^\]]+)\]\((file:\/\/\/[^)\s]+)\)/gi, (_fullMatch, label, rawFileUrl) => {
        let localPath = '';
        let fragment = '';
        try {
            const parsed = new URL(rawFileUrl);
            fragment = parsed.hash || '';
            localPath = fileURLToPath(parsed);
        } catch (_) {
            const stripped = rawFileUrl.replace(/^file:\/\/\/?/i, '');
            const hashIdx = stripped.indexOf('#');
            const rawPath = hashIdx >= 0 ? stripped.slice(0, hashIdx) : stripped;
            fragment = hashIdx >= 0 ? stripped.slice(hashIdx) : '';
            localPath = decodeURIComponent(rawPath);
        }

        if (ctx.repoRoot && isPathInsideRoot(localPath, ctx.repoRoot)) {
            const rel = path.relative(ctx.repoRoot, localPath);
            const relPosix = rel.split(path.sep).join('/');
            if (ctx.repoSlug) {
                const branch = encodeURIComponent(ctx.defaultBranch || 'main');
                if (!relPosix) {
                    return `[${label}](https://github.com/${ctx.repoSlug}/tree/${branch}${fragment})`;
                }
                let kind = 'blob';
                try {
                    if (fs.existsSync(localPath) && fs.statSync(localPath).isDirectory()) {
                        kind = 'tree';
                    }
                } catch (_) {}
                return `[${label}](https://github.com/${ctx.repoSlug}/${kind}/${branch}/${encodePosixPathSegments(relPosix)}${fragment})`;
            }
            return `\`${relPosix || label}${fragment}\``;
        }

        return `\`${path.basename(localPath) || label}\``;
    });
}

/**
 * Context-aware ephemeral semantic key compilation preserving H1 titles, code/mermaid blocks, and standalone PRD refs.
 */
export function replaceSemanticKeysInBody(content, currentEpicKey, registry, dynamicLocalMap, repoContext = null) {
    const placeholders = [];
    const stash = (str) => {
        const token = `\u0000GH_MASK_${placeholders.length}\u0000`;
        placeholders.push(str);
        return token;
    };

    let transformed = String(content || '').replace(/\r\n/g, '\n');

    transformed = transformed.replace(/```[\s\S]*?```/g, (m) => stash(m));
    transformed = rewriteFileLinksForGitHub(transformed, repoContext);

    transformed = transformed.replace(/^# .+$/m, (m) => stash(m));
    transformed = transformed.replace(/^## Parent\n[\s\S]*?(?=\n## |$)/m, (m) => stash(m));
    transformed = transformed.replace(/^## Tickets\n[\s\S]*?(?=\n## |$)/m, (m) => stash(m));
    transformed = transformed.replace(/^\s*-\s*\*\*(?:Change Mode|Review Status|Reviewed-At-Commit):\*\*.*$/gm, (m) => stash(m));
    transformed = transformed.replace(/https?:\/\/[^\s)>\]]+/g, (m) => stash(m));

    // 1. Cross-PRD Ticket references: "Epic 01: 02", "[PRD 09.1] 03.1", "Epic 01, Ticket 02"
    transformed = transformed.replace(
        /(?:\[?\b(?:Epic|PRD)\s*(\d+(?:\.\d+)*)\b\]?(?:\s*[:—–-]\s*|\s*,\s*(?:Ticket\s*)?|\s+Ticket\s+)`?(\d+(?:\.\d+)*)`?)/gi,
        (match, epicNo, key) => {
            const normEpic = extractEpicKey(epicNo);
            const targetEpic = (normEpic && registry[normEpic]) || registry[epicNo];
            if (targetEpic && targetEpic.tickets[key] && targetEpic.tickets[key].issueId) {
                return stash(`#${targetEpic.tickets[key].issueId} (Epic ${normEpic || epicNo}: ${key})`);
            }
            return match;
        }
    );

    // 2. Standalone Cross-PRD Epic references: "PRD 01", "Epic 02"
    transformed = transformed.replace(/\b(PRD|Epic)\s+(\d+(?:\.\d+)*)\b/gi, (match, kind, epicNo) => {
        const normEpic = extractEpicKey(epicNo);
        const targetEpic = (normEpic && registry[normEpic]) || registry[epicNo];
        if (targetEpic && targetEpic.parentIssue && targetEpic.parentIssue.number) {
            return stash(`#${targetEpic.parentIssue.number} (${kind} ${epicNo})`);
        }
        return match;
    });

    // 3. Explicit intra-PRD ticket contexts
    const sortedKeys = Object.keys(dynamicLocalMap || {}).sort((a, b) => b.length - a.length);
    if (sortedKeys.length > 0) {
        const keyAlternation = sortedKeys.map(k => k.replace(/\./g, '\\.')).join('|');
        const resolveKey = (k) => (dynamicLocalMap[k] ? `#${dynamicLocalMap[k]} (${k})` : k);

        const phraseBlockRegex = /\b(?:Tickets?|blocked\s+by|depends\s+on|from\s+Ticket)\b[^\n.;!?]*/gi;
        const singleKeyRegex = new RegExp(`(?<![#\\w\\.\\/])\`?(${keyAlternation})\`?(?![#\\w\\.\\/])`, 'g');
        transformed = transformed.replace(phraseBlockRegex, (segment) => {
            return segment.replace(singleKeyRegex, (m, key) => (dynamicLocalMap[key] ? stash(resolveKey(key)) : m));
        });

        transformed = transformed.replace(/^(## (?:Blocked by|Dependency Lineage)[^\n]*\n[\s\S]*?)(?=\n## |$)/gim, (section) => {
            const keyLineRegex = new RegExp(`(^\\s*-\\s*(?:\\[)?)\`?(${keyAlternation})\`?(?![#\\w\\.\\/])`, 'gm');
            return section.replace(keyLineRegex, (m, lead, key) => (dynamicLocalMap[key] ? `${lead}${stash(resolveKey(key))}` : m));
        });

        const ticketPathRegex = new RegExp(`tickets\\/(${keyAlternation})-[^\\s)\\]\`]+\\.md`, 'g');
        transformed = transformed.replace(ticketPathRegex, (m, key) => (dynamicLocalMap[key] ? stash(`${resolveKey(key)} (${m})`) : m));
    }

    while (/\u0000GH_MASK_\d+\u0000/.test(transformed)) {
        transformed = transformed.replace(/\u0000GH_MASK_(\d+)\u0000/g, (_m, idx) => placeholders[Number(idx)]);
    }

    return transformed;
}

export function splitBodyForGitHub(content) {
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

export function normalizeIssueLabels(issue) {
    return (issue && Array.isArray(issue.labels))
        ? issue.labels.map(l => (typeof l === 'string' ? l : l.name).toLowerCase())
        : [];
}

export function pickPreferredIssue(a, b) {
    if (!a) return b;
    if (!b) return a;
    if (a.state !== b.state) return a.state === 'OPEN' ? a : b;
    return a.number > b.number ? a : b;
}

export function isIssueUnchanged(remoteIssue, desiredTitle, desiredMainBody, requiredBaseLabels, reviewMode) {
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
