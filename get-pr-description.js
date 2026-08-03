#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function parseArgs() {
  const args = process.argv.slice(2);
  let target = null;
  let rawOnly = false;
  let jsonOutput = false;
  let outputPath = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg === '--raw') {
      rawOnly = true;
    } else if (arg === '--json') {
      jsonOutput = true;
    } else if (arg === '--output' || arg === '-o' || arg === '--out') {
      outputPath = args[i + 1];
      i++;
    } else if (arg.startsWith('--output=') || arg.startsWith('-o=') || arg.startsWith('--out=')) {
      outputPath = arg.split('=')[1];
    } else if (!arg.startsWith('-')) {
      target = arg;
    } else if (arg.startsWith('--')) {
      // Handle cases like --42 or --https://...
      target = arg.replace(/^--/, '');
    }
  }

  return { target, rawOnly, jsonOutput, outputPath };
}

function printHelp() {
  console.log("Usage: node get-pr-description.js <PR_NUMBER_OR_URL> [options]");
  console.log("\nOptions:");
  console.log("  --raw                   Output only the raw PR description markdown body");
  console.log("  --json                  Output PR details in JSON format");
  console.log("  --output, -o <file>     Export output to specified file path (.md or .json)");
  console.log("  --help, -h              Show this help message and exit");
  console.log("\nExamples:");
  console.log("  node get-pr-description.js 42");
  console.log("  node get-pr-description.js 42 --raw --output ./pr-description.md");
  console.log("  node get-pr-description.js 42 -o ./pr-data.json");
  console.log("  node get-pr-description.js https://github.com/owner/repo/pull/42 -o pr.md");
}

function fetchPRDetails(target) {
  try {
    const cmd = `gh pr view "${target}" --json number,title,body,author,state,url,headRefName,baseRefName`;
    const output = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return JSON.parse(output);
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString() : err.message;
    console.error(`[-] Error fetching PR details for "${target}":`);
    console.error(`    ${stderr.trim()}`);
    process.exit(1);
  }
}

function main() {
  const { target, rawOnly, jsonOutput, outputPath } = parseArgs();

  if (!target) {
    console.error("[-] Error: Missing PR number or URL.");
    printHelp();
    process.exit(1);
  }

  const pr = fetchPRDetails(target);

  let content = "";
  let isJsonFormat = jsonOutput;
  let isRawFormat = rawOnly;

  // Auto-detect format from output file extension if not explicitly specified
  if (outputPath && !jsonOutput && !rawOnly) {
    if (outputPath.endsWith('.json')) {
      isJsonFormat = true;
    } else if (outputPath.endsWith('.md')) {
      isRawFormat = true;
    }
  }

  if (isJsonFormat) {
    content = JSON.stringify(pr, null, 2);
  } else if (isRawFormat) {
    content = pr.body ? pr.body.trim() : "(No description provided)";
  } else {
    const lines = [];
    lines.push("==================================================");
    lines.push(`PR #${pr.number}: ${pr.title}`);
    lines.push("==================================================");
    lines.push(`Author:     ${pr.author ? pr.author.login : 'Unknown'}`);
    lines.push(`State:      ${pr.state}`);
    lines.push(`Branch:     ${pr.headRefName} -> ${pr.baseRefName}`);
    lines.push(`URL:        ${pr.url}`);
    lines.push("--------------------------------------------------");
    lines.push("DESCRIPTION:");
    lines.push("--------------------------------------------------");
    lines.push(pr.body ? pr.body.trim() : "(No description provided)");
    lines.push("==================================================");
    content = lines.join("\n");
  }

  if (outputPath) {
    try {
      const resolvedPath = path.resolve(outputPath);
      const dir = path.dirname(resolvedPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(resolvedPath, content, 'utf8');
      console.log(`[+] Exported PR #${pr.number} details to: ${resolvedPath}`);
    } catch (err) {
      console.error(`[-] Failed to write file to "${outputPath}": ${err.message}`);
      process.exit(1);
    }
  } else {
    console.log(content);
  }
}

main();
