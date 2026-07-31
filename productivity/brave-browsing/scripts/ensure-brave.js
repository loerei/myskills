/**
 * ensure-brave.js
 * Fast Connection Protocol helper for Brave Browsing with chrome-devtools-mcp.
 * 
 * Outputs:
 * 1. [✔] Brave 9222 ready
 * 2. [🚀] Launched Brave with port 9222 (Registry configured)
 * 3. [🚀] Launched Brave with port 9222 (Registry NOT configured). Consider configuring Registry to streamline workflow.
 */

const { exec, execSync } = require('child_process');
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

async function main() {
  // 1. Check if Port 9222 is already listening
  if (await checkPort9222()) {
    console.log('[✔] Brave 9222 ready');
    process.exit(0);
  }

  // 2. Check Registry status
  const hasReg = isRegistryConfigured();
  const braveExe = path.join(os.homedir(), 'AppData', 'Local', 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe');
  const flags = '--remote-debugging-port=9222 --remote-allow-origins=http://127.0.0.1:9222,http://localhost:9222';

  if (hasReg) {
    exec(`start "" "${braveExe}" ${flags}`);
    console.log('[🚀] Launched Brave with port 9222 (Registry configured)');
  } else {
    exec(`start "" "${braveExe}" ${flags}`);
    console.log('[🚀] Launched Brave with port 9222 (Registry NOT configured). Consider configuring Registry to streamline workflow.');
  }

  // Wait 2 seconds for process initialization
  await new Promise(r => setTimeout(r, 2000));
}

main();
