---
name: brave-browsing
description: Configure and execute Chrome DevTools MCP server using Brave browser instead of default Google Chrome. Use when configuring browser automation with Brave, loading logged-in user profile data (--userDataDir), or resolving Chromium connection errors.
---

# Brave Browsing with Chrome DevTools MCP

## Quick Start

Run the bundled extension sync script to dynamically detect all installed Brave extensions and update `mcp_config.json`:

```powershell
node <projects-dir>/myskills/productivity/brave-browsing/scripts/sync-brave-extensions.js
```

Or manually configure `mcp_config.json` (located at `~/.gemini/config/mcp_config.json`):

```json
{
  "mcpServers": {
    "chrome-devtools-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "chrome-devtools-mcp@latest",
        "--executablePath",
        "C:\\Users\\<username>\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
        "--userDataDir",
        "C:\\Users\\<username>\\AppData\\Local\\BraveSoftware\\Brave-Browser\\User Data",
        "--ignoreDefaultChromeArg",
        "--disable-extensions",
        "--chromeArg",
        "--load-extension=<comma-separated-extension-paths>"
      ]
    }
  }
}
```

## Workflows

```mermaid
flowchart TD
    Start["User Requests Brave Automation / /browser"] --> Strategy{"Select Connection Mode"}
    
    Strategy -->|"Logged-in Profile + Extensions"| SyncExt["Run: node sync-brave-extensions.js"]
    SyncExt --> CheckBraveRunning{"Are background brave.exe processes active?"}
    CheckBraveRunning -->|"Yes"| StopBrave["Stop-Process -Name brave -Force"]
    StopBrave --> LaunchExecPath["Use --executablePath + --userDataDir in mcp_config.json"]
    CheckBraveRunning -->|"No"| LaunchExecPath
    
    Strategy -->|"Remote Debugging Port (Active Browser)"| StartBravePort["Launch Brave: brave.exe --remote-debugging-port=9222 --remote-allow-origins=*"]
    StartBravePort --> ConnectPort["Use --browserUrl http://127.0.0.1:9222 in mcp_config.json"]
    
    LaunchExecPath --> RestartMCP["Restart IDE / MCP Server Session"]
    ConnectPort --> RestartMCP
    RestartMCP --> Verify["Call list_pages / navigate_page tool"]
```

## Setup Modes

### Mode 1: Logged-in Profile + Extensions (--userDataDir + --load-extension)
- **Use when:** Interacting with authenticated web sessions (Facebook E2EE, Gmail, GitHub) with active extensions.
- **Auto-Sync Helper Script:** `node scripts/sync-brave-extensions.js`
- **Failure Condition:** If existing Brave instances are running, Chromium locks `User Data` (`The browser is already running...`).
- **Recovery:** Run `Stop-Process -Name brave -Force` before launching or restarting MCP.

### Mode 2: Remote Debugging Port (--browserUrl)
- **Use when:** Attaching directly to an active browser window without restarting Brave.
- **Command:** `brave.exe --remote-debugging-port=9222 --remote-allow-origins=*`
- **MCP Config:** `--browserUrl http://127.0.0.1:9222`

## Completion Checklist
- [ ] Ran `node scripts/sync-brave-extensions.js` to populate installed extensions.
- [ ] `mcp_config.json` configured with verified `brave.exe` path.
- [ ] No locked `User Data` processes remaining if using Mode 1.
- [ ] `call_mcp_tool` (`chrome-devtools-mcp`/`list_pages`) returns active target pages.
