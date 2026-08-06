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
1. **Repository Source Files (`AGENTS.md` and Platform Deltas):** Run `distribute-skills --info <platform>.policy` (e.g. `distribute-skills --info gemini.policy`) to get the exact `sourceFile` path in `myskills` and `destinationFile` path in the home directory.
   - Universal policy: `<custom-skills-repo-root>/AGENTS.md`
   - Platform-specific overrides (e.g. Gemini): `<custom-skills-repo-root>/gemini/AGENTS.md`
2. **Active IDE Global Config File:** Automatically resolved via `destinationFile` from `distribute-skills --info <platform>.policy`.

### Cross-Repository Policy Protocol

When requested to update global policy rules while working inside an external project repository:
1. **Query Policy Source:** Run `distribute-skills --info <platform>.policy` to locate the target `sourceFile` inside `myskills`.
2. **Edit Source File:** Edit `sourceFile` inside `myskills` directly.
3. **Distribute Back:** Run `distribute-skills` to update all active IDE global configs (`~/.gemini`, `~/.claude`, `~/.cursor`) and project workspaces.
4. **Commit & Push `myskills`:** Commit and push the updated policy file in `myskills`.

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
