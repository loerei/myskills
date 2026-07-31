/**
 * sync-brave-extensions.js
 * Automatically scans Brave extensions under User Data\Default\Extensions
 * and updates mcp_config.json with --load-extension containing all installed extensions.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function main() {
  const userHome = os.homedir();
  const braveUserDataDir = path.join(userHome, 'AppData', 'Local', 'BraveSoftware', 'Brave-Browser', 'User Data');
  const extensionsDir = path.join(braveUserDataDir, 'Default', 'Extensions');
  const braveExePath = path.join(userHome, 'AppData', 'Local', 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe');

  if (!fs.existsSync(extensionsDir)) {
    console.error(`[❌] Extensions directory not found: ${extensionsDir}`);
    process.exit(1);
  }

  const extensionPaths = [];

  const extFolders = fs.readdirSync(extensionsDir, { withFileTypes: true });
  for (const folder of extFolders) {
    if (!folder.isDirectory()) continue;
    const extFolderPath = path.join(extensionsDir, folder.name);

    // Find version subdirectories containing manifest.json
    const subdirs = fs.readdirSync(extFolderPath, { withFileTypes: true });
    for (const sub of subdirs) {
      if (!sub.isDirectory()) continue;
      const candidatePath = path.join(extFolderPath, sub.name);
      const manifestPath = path.join(candidatePath, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        extensionPaths.push(candidatePath);
      }
    }
  }

  console.log(`[+] Found ${extensionPaths.length} installed Brave extensions.`);

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

  if (extensionPaths.length > 0) {
    args.push('--chromeArg', `--load-extension=${extensionPaths.join(',')}`);
  }

  config.mcpServers['chrome-devtools-mcp'] = {
    command: 'npx',
    args: args
  };

  fs.writeFileSync(mcpConfigPath, JSON.stringify(config, null, 2), 'utf8');
  console.log(`[✔] Successfully updated ${mcpConfigPath} with ${extensionPaths.length} Brave extensions!`);
}

main();
