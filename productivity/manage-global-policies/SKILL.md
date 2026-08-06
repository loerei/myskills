---
name: manage-global-policies
description: >
  Create, update, or edit global policy rules for AI agents. Use when the user wants to add, modify, delete, or rearrange rules in the global policy files across any IDE or machine.
---

# Manage Global Policies

This skill guides the agent through modifying the global policy files, ensuring consistency between the local IDE configurations and the remote custom skills repository.

## Workflows

### 1. Locate Target Files Dynamically
Before making edits, locate the configuration paths on the current system:
1. **Repository Source Files (`AGENTS.md` and Platform Deltas):** Run `distribute-skills --where` to retrieve the absolute path of `<custom-skills-repo-root>`.
   - Universal policy: `<custom-skills-repo-root>/AGENTS.md`
   - Platform-specific overrides (e.g. Gemini): `<custom-skills-repo-root>/gemini/AGENTS.md`
2. **Active IDE Global Config File:** Detect the active IDE and locate its global policy file in the user's home directory (e.g., `~/.gemini/AGENTS.md` for Google Antigravity/Gemini, or the corresponding global rule file for Cursor/Claude/etc.).

### 2. Apply Changes & Distribute
Whenever a policy change is made:
1. Update `<custom-skills-repo-root>/AGENTS.md` (and platform delta file such as `gemini/AGENTS.md` if platform-specific micro-anchors/rules apply).
2. Run `distribute-skills --all <projects-dir>` to automatically deploy policy files (with per-platform override logic) and custom skills to all active IDE config targets (`~/.gemini`, `~/.claude`, `~/.cursor`) and workspace repositories.

### 3. Verify Policy Skill Coverage
Run the automated coverage audit script to ensure 100% of skills are documented:
```powershell
node audit-policy-coverage.js
```

### 4. Commit & Push to GitHub
Navigate to `<custom-skills-repo-root>/`, commit the policy updates, and push to the remote repository:
```powershell
git add AGENTS.md gemini/AGENTS.md
git commit -m "Update global policies: <brief description of changes>"
git push
```
