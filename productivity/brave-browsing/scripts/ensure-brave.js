/**
 * ensure-brave.js
 * Fast Connection Protocol helper for Brave Browsing with chrome-devtools-mcp.
 * 
 * Outputs:
 * 1. [✔] Brave 9222 ready
 * 2. [🚀] Launched Brave with port 9222 (Registry configured)
 * 3. [🚀] Launched Brave with port 9222 (Registry NOT configured). Consider configuring Registry to streamline workflow.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

async function checkPort9222() {
  try {
    const res = await fetch('http://127.0.0.1:9222/json/version', { signal: AbortSignal.timeout(1000) });
    return res.ok;
  } catch {
    return false;
  }
}

function isRegistryConfigured() {
  if (os.platform() !== 'win32') return false;
  try {
    const out = execSync('powershell -NoProfile -Command "(Get-ItemProperty \'HKCU:\\Software\\Classes\\http\\shell\\open\\command\').\'(default)\'"', { encoding: 'utf8' });
    return out.includes('--remote-debugging-port=9222');
  } catch {
    return false;
  }
}

function launchBraveGUI(braveExe, flags) {
  const defaultFlags = '--remote-debugging-port=9222 --remote-allow-origins=http://127.0.0.1:9222,http://localhost:9222';
  const effectiveFlags = flags || defaultFlags;

  if (os.platform() === 'win32') {
    // Launch via explorer.exe to transfer execution to active interactive desktop session
    const tmpCmdPath = path.join(os.tmpdir(), 'launch-brave-gui.cmd');
    fs.writeFileSync(tmpCmdPath, `@echo off\r\nstart "" "${braveExe}" ${effectiveFlags}\r\n`, 'utf8');
    execSync(`explorer.exe "${tmpCmdPath}"`);
  } else {
    const args = effectiveFlags.split(' ');
    const p = spawn(braveExe, args, { detached: true, stdio: 'ignore' });
    p.unref();
  }
}

async function main() {
  // 1. Check if Port 9222 is already listening
  if (await checkPort9222()) {
    console.log('[✔] Brave 9222 ready');
    process.exit(0);
  }

  // 2. Check Registry status
  const hasReg = isRegistryConfigured();
  const braveExe = path.join(os.homedir(), 'AppData', 'Local', 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe');

  if (hasReg) {
    launchBraveGUI(braveExe);
    console.log('[🚀] Launched Brave with port 9222 (Registry configured)');
  } else {
    launchBraveGUI(braveExe);
    console.log('[🚀] Launched Brave with port 9222 (Registry NOT configured). Consider configuring Registry to streamline workflow.');
  }

  // Wait 2 seconds for process initialization
  await new Promise(r => setTimeout(r, 2000));
}

main();
