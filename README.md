# MySkills

My single source of truth for custom AI agent skills, global policies, and my distribution engine.

I maintain all my custom skills and system prompt overrides here and push them out to my local project workspaces and global configurations.

---

## Structure

### Custom Skill Categories
I group my custom skills into 5 main categories:

- **`design/`**: UI/UX taste, design systems, styling, typography (e.g., `design-taste-frontend`, `brandkit`, `minimalist-skill`).
- **`engineering/`**: TDD, debugging, domain modeling, refactoring, architecture (e.g., `tdd`, `diagnose`, `improve-codebase-architecture`).
- **`quality/`**: SonarQube/SonarCloud remediation, benchmark testing, git guardrails (e.g., `sonar-remediation`, `sonarcloud-ci-workflow`).
- **`productivity/`**: Workflows, PR generation, issue triage, reviewer loops, skill management (e.g., `conduct-reviewing-loop`, `write-pr`, `write-for-ai`, `manage-custom-skills`).
- **`personal/`**: My Obsidian vault note management, drafting, narrative editing (e.g., `obsidian-vault`, `writing-beats`).

### Platform Overrides
- **`gemini/`**: My platform-specific policy delta (`gemini/AGENTS.md`) and audit receipts for Google Antigravity / Gemini.

---

## Global Policies

- **[`AGENTS.md`](AGENTS.md)**: Universal rules and guidelines I enforce for all my agents across any platform.
- **[`gemini/AGENTS.md`](gemini/AGENTS.md)**: My Gemini-specific policy delta (automatically overrides root `AGENTS.md` when syncing to Gemini configuration).

---

## Setup & Linking

How I link `distribute-skills` globally so I can run it from any terminal:

1. **Clone & install**:
   ```bash
   git clone https://github.com/loerei/myskills.git
   cd myskills
   ```

2. **Link CLI globally**:
   ```bash
   npm link
   # or: pnpm link --global
   ```

3. **Sanity check**:
   ```bash
   distribute-skills --where
   # Output: <path-to-cloned-repo>/myskills
   ```

---

## How I Use `distribute-skills`

`distribute-skills` is a zero-dependency ESM CLI tool I bundle right in this repo.

### My Common Commands:

- **Sync all my projects & global configs**:
  ```bash
  distribute-skills --all
  ```

- **Sync a specific project workspace**:
  ```bash
  distribute-skills --target <project-dir>
  ```

- **Dry-run (preview changes without writing)**:
  ```bash
  distribute-skills --dry-run
  ```

- **Sync & Prune obsolete skills**:
  ```bash
  distribute-skills --all --prune
  ```

- **CLI Info Queries**:
  ```bash
  distribute-skills --where                   # Print myskills repo root path
  distribute-skills --info                    # Print JSON repo metadata
  distribute-skills --info <skillname>        # Get source path of a skill
  distribute-skills --info <platform>.policy # Get policy source and destination paths
  ```

---

## Local Skill Protection

To protect custom skills built exclusively for a single project repository (not included in `myskills`) from being pruned during distribution, add `local: true` to the `SKILL.md` frontmatter:

```yaml
---
name: my-project-skill
description: Brief description of local skill. Use when [specific triggers].
local: true
---
```
