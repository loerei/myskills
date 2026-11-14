#!/usr/bin/env node

/**
 * Audit Catalog & Policy Health Script (Wrapper)
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
if (args.some(arg => ['--add', '-a', '--prune', '-p'].includes(arg))) {
  console.warn('[!] Note: Table 1 auto-add/prune flags were removed; running catalog & policy audit.');
}

const result = runPolicyAudit({ sourceRoot: repoRoot, config });
process.exit(result.exitCode);
