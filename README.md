# MySkills

A curated compilation of custom AI agent skills and global policies. This repository serves as the single source of truth for custom skills, which are dynamically distributed to individual project workspaces.

## Repository Structure

Skills are grouped into 5 logical categories:

- **`design/`**: Interface design, styling, typography, brand guidelines, and premium UI taste (e.g., `design-taste-frontend`, `brandkit`, `minimalist-skill`).
- **`engineering/`**: Development workflows, testing, architecture, and diagnostics (e.g., `tdd`, `diagnose`, `improve-codebase-architecture`).
- **`quality/`**: CI/CD integration and automated code quality gates (e.g., `sonar-remediation`, `sonarcloud-ci-workflow`).
- **`productivity/`**: Workflow optimization, requirements gathering, issue management, reviewer loops, and PR writing (e.g., `conduct-reviewing-loop`, `write-pr`, `write-for-ai`, `manage-custom-skills`).
- **`personal/`**: Personal notes, Obsidian vault management, and creative drafting (e.g., `obsidian-vault`, `writing-beats`).

## Global Policies

The [AGENTS.md](AGENTS.md) file at the root contains global rules and guidelines that the AI agent must read and adhere to immediately upon starting any task.

## Distribution

Custom skills are synced to target project workspaces using the `distribute-skills.js` script (located in your projects directory).

### Run distribution:

- **Sync all projects (Safe mode - default)**:
  ```powershell
  node <projects-dir>/distribute-skills.js --all <projects-dir>
  ```
- **Sync single project**:
  ```powershell
  node <projects-dir>/distribute-skills.js --target <projects-dir>/<project-folder>
  ```
- **Sync & Prune obsolete global skills (Opt-in)**:
  ```powershell
  node <projects-dir>/distribute-skills.js --all <projects-dir> --prune
  ```

### Repo-Specific Local Skill Protection

If you build custom skills exclusively for a specific repository (that are not part of `myskills`), protect them from being reported or pruned by adding `local: true` to the YAML frontmatter of `SKILL.md`:

```yaml
---
name: my-project-skill
description: Brief description of local skill. Use when [specific triggers].
local: true
---
```
