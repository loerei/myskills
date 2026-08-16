import fs from 'node:fs';
import path from 'node:path';
import { loadSkillCatalog } from './discovery.js';
import { syncPlatformGlobals } from './platforms.js';
import { discoverProjects, processProject } from './projects.js';

/**
 * Execute full distribution across platforms and projects.
 * @param {object} params
 * @param {object} params.config
 * @param {string} [params.mode='all']
 * @param {string} [params.targetDir]
 * @param {boolean} [params.dryRun=false]
 * @param {boolean} [params.allowPrune=false]
 * @param {boolean} [params.init=false]
 * @param {string} params.projectRoot
 * @returns {{ platformResults: Array<object>, projectResults: Array<object> }}
 */
export function executeDistribution({
  config,
  mode = 'all',
  targetDir = null,
  dryRun = false,
  allowPrune = false,
  init = false,
  projectRoot
}) {
  const resolvedTarget = targetDir || (mode === 'all' ? config.projectsRoot : null);
  if (!resolvedTarget) {
    throw new Error('Missing directory target.');
  }

  const sourceRoot = path.resolve(projectRoot);
  const subagentRulesDir = path.join(sourceRoot, 'subagent_rules');
  const skillCatalog = loadSkillCatalog(sourceRoot);

  const platformResults = (config.platforms || []).map(platform =>
    syncPlatformGlobals(platform, skillCatalog, { sourceRoot, subagentRulesDir, dryRun, allowPrune })
  );

  const initTarget = init || Boolean(config.mattPocockInstall);
  const targetPath = path.resolve(resolvedTarget);

  if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isDirectory()) {
    throw new Error(`Target directory does not exist: ${targetPath}`);
  }

  const targetProjects = mode === 'target'
    ? [targetPath]
    : discoverProjects(targetPath, config.excludePatterns || []);

  const projectResults = targetProjects.map(proj =>
    processProject(proj, skillCatalog, { dryRun, allowPrune, init: initTarget })
  );

  return { platformResults, projectResults };
}
