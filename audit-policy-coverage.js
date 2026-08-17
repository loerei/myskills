#!/usr/bin/env node

/**
 * Audit Policy Coverage Script (Wrapper)
 * Calls runPolicyAudit engine from src/audit.js.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './src/platforms.js';
import { runPolicyAudit } from './src/audit.js';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.dirname(__filename);

const configFile = path.join(repoRoot, 'agents.config.json');
let config;
try {
  config = loadConfig(configFile);
} catch (e) {
  config = { policy: { rootFile: 'AGENTS.md', subdocsDir: 'subdocs' }, platforms: [] };
}

const args = process.argv.slice(2);
const autoAdd = args.includes('--add') || args.includes('-a');
const autoPrune = args.includes('--prune') || args.includes('-p');

const result = runPolicyAudit({ sourceRoot: repoRoot, config, autoAdd, autoPrune });
process.exit(result.exitCode);
