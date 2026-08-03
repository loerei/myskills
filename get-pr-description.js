#!/usr/bin/env node
const { execSync } = require('child_process');

function parseArgs() {
  const args = process.argv.slice(2);
  let target = null;
  let rawOnly = false;
  let jsonOutput = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg === '--raw') {
      rawOnly = true;
    } else if (arg === '--json') {
      jsonOutput = true;
    } else if (!arg.startsWith('-')) {
      target = arg;
    } else if (arg.startsWith('--')) {
      // Handle cases like --123 or --https://...
      target = arg.replace(/^--/, '');
    }
  }

  return { target, rawOnly, jsonOutput };
}

function printHelp() {
  console.log("Usage: node get-pr-description.js <PR_NUMBER_OR_URL> [options]");
  console.log("\nOptions:");
  console.log("  --raw         Output only the raw PR description markdown body");
  console.log("  --json        Output PR details in JSON format");
  console.log("  --help, -h    Show this help message and exit");
  console.log("\nExamples:");
  console.log("  node get-pr-description.js 42");
  console.log("  node get-pr-description.js https://github.com/owner/repo/pull/42");
  console.log("  node get-pr-description.js --42");
  console.log("  node get-pr-description.js 42 --raw");
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
  const { target, rawOnly, jsonOutput } = parseArgs();

  if (!target) {
    console.error("[-] Error: Missing PR number or URL.");
    printHelp();
    process.exit(1);
  }

  const pr = fetchPRDetails(target);

  if (jsonOutput) {
    console.log(JSON.stringify(pr, null, 2));
    return;
  }

  if (rawOnly) {
    console.log(pr.body || "(No description provided)");
    return;
  }

  console.log("==================================================");
  console.log(`PR #${pr.number}: ${pr.title}`);
  console.log("==================================================");
  console.log(`Author:     ${pr.author ? pr.author.login : 'Unknown'}`);
  console.log(`State:      ${pr.state}`);
  console.log(`Branch:     ${pr.headRefName} -> ${pr.baseRefName}`);
  console.log(`URL:        ${pr.url}`);
  console.log("--------------------------------------------------");
  console.log("DESCRIPTION:");
  console.log("--------------------------------------------------");
  console.log(pr.body ? pr.body.trim() : "(No description provided)");
  console.log("==================================================\n");
}

main();
