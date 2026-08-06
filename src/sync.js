import fs from 'node:fs';
import path from 'node:path';
import { isLocalSkill } from './discovery.js';

/**
 * Copy recursively if files are different. Returns planned changes if dryRun is true.
 * @param {string} src 
 * @param {string} dest 
 * @param {{dryRun?: boolean}} options 
 * @returns {{changed: boolean, files: string[]}}
 */
export function copyRecursiveIfDifferent(src, dest, { dryRun = false } = {}) {
  const result = { changed: false, files: [] };
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      if (!dryRun) fs.mkdirSync(dest, { recursive: true });
      result.changed = true;
      result.files.push(dest);
    } else if (!fs.statSync(dest).isDirectory()) {
      if (!dryRun) {
        fs.rmSync(dest, { recursive: true, force: true });
        fs.mkdirSync(dest, { recursive: true });
      }
      result.changed = true;
      result.files.push(dest);
    }
    const children = exists ? fs.readdirSync(src) : [];
    for (const childItemName of children) {
      const childSrc = path.join(src, childItemName);
      const childDest = path.join(dest, childItemName);
      const childResult = copyRecursiveIfDifferent(childSrc, childDest, { dryRun });
      if (childResult.changed) {
        result.changed = true;
        result.files.push(...childResult.files);
      }
    }
    
    if (fs.existsSync(dest) && fs.statSync(dest).isDirectory()) {
      fs.readdirSync(dest).forEach((childItemName) => {
        const childSrc = path.join(src, childItemName);
        const childDest = path.join(dest, childItemName);
        if (!fs.existsSync(childSrc)) {
          if (!dryRun) fs.rmSync(childDest, { recursive: true, force: true });
          result.changed = true;
          result.files.push(childDest);
        }
      });
    }
  } else if (exists) {
    let shouldCopy = true;
    if (fs.existsSync(dest)) {
      const srcBuf = fs.readFileSync(src);
      const destBuf = fs.readFileSync(dest);
      if (srcBuf.equals(destBuf)) {
        shouldCopy = false;
      }
    }
    if (shouldCopy) {
      if (!dryRun) {
        const destDir = path.dirname(dest);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(src, dest);
      }
      result.changed = true;
      result.files.push(dest);
    }
  }
  return result;
}

/**
 * Prune obsolete skills from platform dirs.
 * @param {string} targetDir 
 * @param {Set<string>|Array<string>} activeSkillNames 
 * @param {{dryRun?: boolean, allowPrune?: boolean}} options 
 * @returns {{pruned: string[], preserved: string[], candidates: string[]}}
 */
export function pruneObsoleteSkills(targetDir, activeSkillNames, { dryRun = false, allowPrune = false } = {}) {
  const activeSet = new Set(activeSkillNames);
  const dirsToCheck = [
    path.join(targetDir, '.agents', 'skills'),
    path.join(targetDir, '.claude', 'skills'),
    path.join(targetDir, '.gemini', 'skills')
  ];

  const result = { pruned: [], preserved: [], candidates: [] };

  for (const dir of dirsToCheck) {
    if (!fs.existsSync(dir)) continue;
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const itemPath = path.join(dir, item);
      try {
        if (fs.statSync(itemPath).isDirectory() && !activeSet.has(item)) {
          if (isLocalSkill(itemPath)) {
            result.preserved.push(itemPath);
            continue;
          }

          if (allowPrune) {
            if (!dryRun) {
              fs.rmSync(itemPath, { recursive: true, force: true });
            }
            result.pruned.push(itemPath);
          } else {
            result.candidates.push(itemPath);
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }

  return result;
}
