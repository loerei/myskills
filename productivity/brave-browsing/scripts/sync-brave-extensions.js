/**
 * sync-brave-extensions.js
 * Automatically detects packed AND unpacked extensions from Brave User Data
 * and updates mcp_config.json using separate --chromeArg entries for each extension.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function main() {
  const userHome = os.homedir();
  const braveUserDataDir = path.join(userHome, 'AppData', 'Local', 'BraveSoftware', 'Brave-Browser', 'User Data');
  const defaultProfileDir = path.join(braveUserDataDir, 'Default');
  const extensionsDir = path.join(defaultProfileDir, 'Extensions');
  const braveExePath = path.join(userHome, 'AppData', 'Local', 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe');

  if (!fs.existsSync(defaultProfileDir)) {
    console.error(`[❌] Brave Default profile directory not found: ${defaultProfileDir}`);
    process.exit(1);
  }

  const extensionPathsSet = new Set();

  // 1. Read Preferences / Secure Preferences to find unpacked extensions & packed extension paths
  for (const prefName of ['Secure Preferences', 'Preferences']) {
    const prefPath = path.join(defaultProfileDir, prefName);
    if (!fs.existsSync(prefPath)) continue;

    try {
      const prefData = JSON.parse(fs.readFileSync(prefPath, 'utf8'));
      const settings = prefData.extensions?.settings || {};

      for (const [id, ext] of Object.entries(settings)) {
        if (!ext.path) continue;

        let fullPath = ext.path;
        if (!path.isAbsolute(fullPath)) {
          fullPath = path.join(extensionsDir, fullPath);
        }

        const manifestPath = path.join(fullPath, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
          extensionPathsSet.add(fullPath);
        }
      }
    } catch (e) {
      console.warn(`[⚠️] Warning reading ${prefName}:`, e.message);
    }
  }

  // 2. Scan Extensions directory directly as fallback
  if (fs.existsSync(extensionsDir)) {
    const extFolders = fs.readdirSync(extensionsDir, { withFileTypes: true });
    for (const folder of extFolders) {
      if (!folder.isDirectory()) continue;
      const extFolderPath = path.join(extensionsDir, folder.name);

      const subdirs = fs.readdirSync(extFolderPath, { withFileTypes: true });
      for (const sub of subdirs) {
        if (!sub.isDirectory()) continue;
        const candidatePath = path.join(extFolderPath, sub.name);
        const manifestPath = path.join(candidatePath, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
          extensionPathsSet.add(candidatePath);
        }
      }
    }
  }

  const extensionPaths = Array.from(extensionPathsSet);
  console.log(`[+] Found ${extensionPaths.length} Brave extensions (packed & unpacked).`);
  extensionPaths.forEach(p => console.log(`   - ${p}`));

  const mcpConfigPath = path.join(userHome, '.gemini', 'config', 'mcp_config.json');
  if (!fs.existsSync(mcpConfigPath)) {
    console.error(`[❌] MCP config file not found: ${mcpConfigPath}`);
    process.exit(1);
  }

  const rawConfig = fs.readFileSync(mcpConfigPath, 'utf8');
  const config = JSON.parse(rawConfig);

  if (!config.mcpServers) config.mcpServers = {};

  const args = [
    '-y',
    'chrome-devtools-mcp@latest',
    '--executablePath',
    braveExePath,
    '--userDataDir',
    braveUserDataDir,
    '--ignoreDefaultChromeArg',
    '--disable-extensions'
  ];

  for (const extPath of extensionPaths) {
    args.push('--chromeArg', `--load-extension=${extPath}`);
  }

  config.mcpServers['chrome-devtools-mcp'] = {
    command: 'npx',
    args: args
  };

  fs.writeFileSync(mcpConfigPath, JSON.stringify(config, null, 2), 'utf8');
  console.log(`[✔] Successfully updated ${mcpConfigPath} with ${extensionPaths.length} Brave extensions!`);
}

main();
