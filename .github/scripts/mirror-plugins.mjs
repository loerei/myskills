import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONFIG = path.resolve(__dirname, '..', 'plugin-mirrors.json');

function parseArgs(argv) {
  const opts = { config: DEFAULT_CONFIG, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--repo' && argv[i + 1]) opts.repo = argv[++i];
    else if (arg === '--source' && argv[i + 1]) opts.source = argv[++i];
    else if (arg === '--target' && argv[i + 1]) opts.target = argv[++i];
    else if (arg === '--config' && argv[i + 1]) opts.config = argv[++i];
    else if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--check-paths' && argv[i + 1]) opts.checkPaths = argv[++i];
  }
  return opts;
}

function resolveContained(baseDir, relPath) {
  const resolvedBase = path.resolve(baseDir);
  const resolved = path.resolve(resolvedBase, relPath);
  const rel = path.relative(resolvedBase, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Path escapes base directory: ${relPath}`);
  }
  return resolved;
}

function copyFiltered(src, dest, dryRun) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.DS_Store' || entry.name === '.git') continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (!dryRun) fs.mkdirSync(destPath, { recursive: true });
      copyFiltered(srcPath, destPath, dryRun);
    } else if (!dryRun) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function syncReplaceDir(srcDir, destDir, targetRoot, dryRun) {
  if (destDir === path.resolve(targetRoot)) {
    throw new Error('replace-dir mode cannot target repository root');
  }
  if (!dryRun) {
    fs.rmSync(destDir, { recursive: true, force: true });
    fs.mkdirSync(destDir, { recursive: true });
  }
  copyFiltered(srcDir, destDir, dryRun);
}

function syncRoot(srcDir, targetRoot, preserveList, dryRun) {
  const preserve = new Set(['.git', ...(preserveList || [])]);
  const existing = fs.readdirSync(targetRoot, { withFileTypes: true });
  for (const entry of existing) {
    if (preserve.has(entry.name)) continue;
    const targetPath = path.join(targetRoot, entry.name);
    if (!dryRun) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    }
  }
  const incoming = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of incoming) {
    if (preserve.has(entry.name) || entry.name === '.DS_Store') continue;
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(targetRoot, entry.name);
    if (entry.isDirectory()) {
      if (!dryRun) fs.mkdirSync(destPath, { recursive: true });
      copyFiltered(srcPath, destPath, dryRun);
    } else if (!dryRun) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.repo) {
    throw new Error('Missing required --repo <owner/name>');
  }
  const mirrors = JSON.parse(fs.readFileSync(opts.config, 'utf8'));
  const entry = mirrors.find((item) => item.repo === opts.repo);
  if (!entry) {
    throw new Error(`Repo not found in ${opts.config}: ${opts.repo}`);
  }

  if (opts.checkPaths !== undefined) {
    const changed = opts.checkPaths
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const infraTouched = changed.some(
      (p) =>
        p === '.github/plugin-mirrors.json' ||
        p === '.github/scripts/mirror-plugins.mjs' ||
        p === '.github/workflows/mirror-plugins.yml'
    );
    const sourceTouched = entry.mappings.some((m) =>
      changed.some((p) => p === m.src || p.startsWith(`${m.src}/`))
    );
    process.stdout.write(infraTouched || sourceTouched ? 'true' : 'false');
    return;
  }

  if (!opts.source || !opts.target) {
    throw new Error('Missing required --source and --target arguments');
  }
  const sourceRoot = path.resolve(opts.source);
  const targetRoot = path.resolve(opts.target);

  for (const mapping of entry.mappings) {
    const srcDir = resolveContained(sourceRoot, mapping.src);
    if (!fs.existsSync(srcDir) || !fs.statSync(srcDir).isDirectory()) {
      throw new Error(`Missing source directory: ${srcDir}`);
    }
    const destDir = resolveContained(targetRoot, mapping.dest);
    if (mapping.mode === 'replace-dir') {
      syncReplaceDir(srcDir, destDir, targetRoot, opts.dryRun);
    } else if (mapping.mode === 'sync-root') {
      syncRoot(srcDir, targetRoot, mapping.preserve, opts.dryRun);
    } else {
      throw new Error(`Unsupported mapping mode: ${mapping.mode}`);
    }
    console.log(`[${opts.dryRun ? 'dry-run' : 'synced'}] ${mapping.src} -> ${entry.repo}:${mapping.dest}`);
  }
}

main();
