# MySkills

A curated compilation of custom AI agent skills and global policies. This repository serves as the single source of truth for custom skills, which are dynamically distributed to individual project workspaces.

## Repository Structure

Skills are grouped into 5 logical categories:

- **`design/`**: Interface design, styling, typography, brand guidelines, and premium UI taste (e.g., `design-taste-frontend`, `brandkit`, `minimalist-skill`).
- **`engineering/`**: Development workflows, testing, architecture, and diagnostics (e.g., `tdd`, `diagnose`, `improve-codebase-architecture`).
- **`quality/`**: CI/CD integration and automated code quality gates (e.g., `sonarqube-workflow`, `sonar-remediation`).
- **`productivity/`**: Workflow optimization, requirements gathering, issue management, and PR writing (e.g., `write-pr`, `write-for-ai`, `manage-custom-skills`).
- **`personal/`**: Personal notes, Obsidian vault management, and creative drafting (e.g., `obsidian-vault`, `writing-beats`).

## Global Policies

The [AGENTS.md](AGENTS.md) file at the root contains global rules and guidelines that the AI agent must read and adhere to immediately upon starting any task.

## Distribution

Custom skills are synced to target project workspaces using the `distribute-skills.js` script (located in your projects directory).

### Run distribution:

- **All projects**:
  ```powershell
  node <projects-dir>/distribute-skills.js --all <projects-dir>
  ```
- **Single project**:
  ```powershell
  node <projects-dir>/distribute-skills.js --target <projects-dir>/<project-folder>
  ```
