---
name: brave-browsing
description: Configure and execute Chrome DevTools MCP server using Brave browser instead of default Google Chrome. Use when configuring browser automation with Brave, loading logged-in user profile data (--userDataDir), or resolving Chromium connection errors.
---

# Brave Browsing with Chrome DevTools MCP

## Quick Start

Configure `mcp_config.json` (located at `~/.gemini/config/mcp_config.json`) to connect via Remote Debugging Port:

```json
{
  "mcpServers": {
    "chrome-devtools-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "chrome-devtools-mcp@latest",
        "--browserUrl",
        "http://127.0.0.1:9222"
      ]
    }
  }
}
```

Launch Brave with secure origin debugging enabled:

```powershell
& "C:\Users\<username>\AppData\Local\BraveSoftware\Brave-Browser\Application\brave.exe" --remote-debugging-port=9222 --remote-allow-origins=http://127.0.0.1:9222,http://localhost:9222
```

## Workflows

```mermaid
flowchart TD
    Start["User Requests Brave Automation / /browser"] --> Strategy{"Select Setup Mode"}
    
    Strategy -->|"Remote Debugging Port (Recommended)"| CheckMode{"Select Port Execution Method"}
    CheckMode -->|"CLI Launch"| StartBravePort["Launch Brave with --remote-debugging-port=9222 --remote-allow-origins=http://127.0.0.1:9222,http://localhost:9222"]
    CheckMode -->|"Registry Level (Persistent)"| RegGate{"Ask Explicit User Approval (Tier 3 Gate)"}
    RegGate -->|"Approved"| ApplyReg["Apply Windows Registry Command Modification"]
    RegGate -->|"Denied"| StartBravePort
    
    Strategy -->|"Isolated Profile (Automated)"| LaunchExecPath["Use --executablePath + --userDataDir in mcp_config.json"]
    
    StartBravePort --> ConnectPort["Use --browserUrl http://127.0.0.1:9222 in mcp_config.json"]
    ApplyReg --> ConnectPort
    LaunchExecPath --> RestartMCP["Restart IDE / MCP Server Session"]
    ConnectPort --> RestartMCP
    RestartMCP --> Verify["Call list_pages / navigate_page tool"]
```

## Setup Modes

### Mode 1: Remote Debugging Port (--browserUrl) - Recommended
- **Use when:** Interacting with authenticated web sessions (Facebook E2EE, Gmail, GitHub) while maintaining full extension support.
- **Command:** `brave.exe --remote-debugging-port=9222 --remote-allow-origins=http://127.0.0.1:9222,http://localhost:9222`
- **MCP Config:** `--browserUrl http://127.0.0.1:9222`
- **Security:** Always use explicit origins (`http://127.0.0.1:9222,http://localhost:9222`) instead of wildcard `*`.

### Mode 2: System-Wide Registry Automation (Persistent)
> [!CAUTION]
> **Tier 3 Execution Gate:** Modifying Registry keys is a system-wide modification. Agents MUST present the exact plan and obtain EXPLICIT USER APPROVAL before executing any Registry commands.

- **Target Registry Keys:**
  1. `HKCU:\Software\Classes\BraveHTML\shell\open\command`
  2. `HKCU:\Software\Classes\http\shell\open\command`
  3. `HKCU:\Software\Classes\https\shell\open\command`
- **Value to set:**
  `"C:\Users\<username>\AppData\Local\BraveSoftware\Brave-Browser\Application\brave.exe" --remote-debugging-port=9222 --remote-allow-origins=http://127.0.0.1:9222,http://localhost:9222 -- "%1"`

#### How to restore Registry to Default:
- **Registry default value:**
  `"C:\Users\<username>\AppData\Local\BraveSoftware\Brave-Browser\Application\brave.exe" -- "%1"`

## Completion Checklist
- [ ] Explicit user approval granted if executing Registry setup.
- [ ] Brave running with `--remote-debugging-port=9222` and secure origins.
- [ ] `mcp_config.json` configured with `--browserUrl http://127.0.0.1:9222`.
- [ ] `call_mcp_tool` (`chrome-devtools-mcp`/`list_pages`) connects cleanly.
