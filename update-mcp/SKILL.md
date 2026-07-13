---
name: update-mcp
description: Update Model Context Protocol (MCP) servers from their upstream source repositories, rebuild their packages, and resolve file-lock conflicts. Use when the user requests to update, upgrade, or pull changes for one or more MCP servers.
---

# Update MCP

Guide to updating local or standard Model Context Protocol (MCP) servers.

## Quick Start

1. Find the target MCP server in the config file (`mcp_config.json`).
2. Locate its source directory and fetch/merge changes from its `upstream` repository.
3. Handle file-locks or process conflicts gracefully.

## Workflows

### Phase 1: Locate & Inspect MCP
- Read the active MCP configuration file:
  - **Antigravity**: `C:\Users\sayus\.gemini\antigravity\mcp_config.json`
  - **Cursor**: `%APPDATA%\Cursor\User\globalStorage\storage.json`
  - **VS Code**: `%APPDATA%\Code\User\settings.json`
- Locate the entry matching the requested MCP name.
- Identify the executable or command path to find the repository directory (e.g. `D:\Projects\jcodemunch-mcp`).

### Phase 2: Upstream Updates
- Check the git remotes in the MCP directory using `git remote -v`.
- Fetch and merge changes from the remote repository (prefer `upstream/main` if set up as a fork, otherwise `origin/main`):
  ```powershell
  git fetch upstream
  git merge upstream/main
  ```
  *(If there are uncommitted locks or changes like `uv.lock` or `package-lock.json`, stash them using `git stash` first)*.

### Phase 3: Rebuilding & Lock Resolution
- Determine the package type:
  - **Python (pyproject.toml/uv.lock)**: Run `uv sync`.
  - **Node.js (package.json/package-lock.json)**: Run `npm install && npm run build` (or `npm run compile`).
- **File Lock Resolution**: If the tool fails to build/update because the `.exe` or process is locked by the active agent/editor, immediately construct a one-shot command block for the user to run manually:
  ```powershell
  # Close your IDE/Antigravity completely, run this block in PowerShell, then reopen:
  cd "D:\Projects\jcodemunch-mcp"
  uv sync
  ```
  Ask the user to copy/paste the commands, close the client app, execute it, and then message back to wake up the agent.

### Phase 4: Verification & Changelog Brief
- Once the update completes, query the repository's `CHANGELOG.md`, `whatsnew.json`, or recent git commits (`git log -n 5 --oneline`) to summarize what new features or bug fixes were updated.
- Prompt the user to reload the MCP servers and verify with a test tool call.
