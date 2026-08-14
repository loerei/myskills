# MySkills

My AI agent skills and global policies.

(Just personal take,) at least when comparing to Claude or GPT, Gemini models are badly RLHFed toward sycophancy and unnecessary fluff, plus [Antigravity system instructions](gemini/raw_system_instructions.v2.8.0.md) is mostly a mess (might even be the main problem here since I don't think the ones on [gemini.google.com](https://gemini.google.com) are as bad.). In short, the models are directed toward "doing whatever it takes to make the user wow and happy" (about how good the model is, not about how good the actual result is, sadly). Which is why I have a [delta version of `AGENTS.md`](gemini/AGENTS.md).

This repo is ~~fully~~ mostly written by Antigravity (including this README). So pardon the fluff if there is any, I'm ~~actively and pathetically~~ trying to reduce that on the user's end.

Uhhh, don't read the "I" below this line as me, thats just embarrassing.

---

## Structure

### Custom Skill Categories
I group my custom skills into 5 main categories:

- **`design/`**: UI/UX taste, design systems, styling, typography (e.g., `design-taste-frontend`, `brandkit`, `minimalist-skill`).
- **`engineering/`**: TDD, debugging, domain modeling, refactoring, architecture (e.g., `tdd`, `diagnose`, `improve-codebase-architecture`).
- **`quality/`**: SonarQube/SonarCloud remediation, benchmark testing, git guardrails (e.g., `sonar-remediation`, `sonarcloud-ci-workflow`).
- **`productivity/`**: Workflows, PR generation, issue triage, reviewer loops, skill management (e.g., `conduct-reviewing-loop`, `write-pr`, `write-for-ai`, `manage-custom-skills`).
- **`personal/`**: My Obsidian vault note management, drafting, narrative editing (e.g., `obsidian-vault`, `writing-beats`).

### Integrated Upstream Skills
Besides my own custom skills, I integrate and maintain upstream skills from the community:

- **Matt Pocock Skills** ([`mattpocock/skills`](https://github.com/mattpocock/skills)): TypeScript & JS development workflows (`tdd`, `codebase-design`, `domain-modeling`, `migrate-to-shoehorn`, `setup-ts-deep-modules`).
- **Ponytail Suite** ([`DietrichGebert/ponytail`](https://github.com/DietrichGebert/ponytail)): Agent task performance metrics, debt analysis, and reviewing (`ponytail`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-review`).
- **Watch / Video Analysis** ([`bradautomates/claude-video`](https://github.com/bradautomates/claude-video)): Frame extraction and transcript processing (`watch`).
- **UI & Taste Suite** ([`leonxlnx/taste-skill`](https://github.com/leonxlnx/taste-skill)): Frontend design taste systems (`gpt-tasteskill`, `design-taste-frontend`, `stitch-design-taste`, `taste-skill`).

### Platform Overrides
- **`gemini/`**: My platform-specific policy delta (`gemini/AGENTS.md`) and audit receipts for Google Antigravity / Gemini.

---

## Global Policies

- **[`AGENTS.md`](AGENTS.md)**: Universal rules and guidelines I enforce for all my agents across any platform.
- **[`gemini/AGENTS.md`](gemini/AGENTS.md)**: My Gemini-specific policy delta (automatically overrides root `AGENTS.md` when syncing to Gemini configuration).

---

## Setup & Linking

How I link `agents` CLI globally so I can run it from any terminal:

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
   agents --where
   # Output: <path-to-cloned-repo>/myskills
   ```

---

## How I Use `agents`

`agents` is a zero-dependency ESM CLI tool supporting both positional subcommands (`agents distribute`) and flag aliases (`agents --distribute`).

### Common Commands:

- **Sync all projects & global configs**:
  ```bash
  agents distribute
  # or: agents --distribute
  ```

- **Sync a specific project workspace**:
  ```bash
  agents distribute -t <project-dir>
  # or: agents distribute --target <project-dir>
  ```

- **Dry-run preview**:
  ```bash
  agents distribute -d
  # or: agents distribute --dry-run
  ```

- **Sync & Prune obsolete non-catalog skills**:
  ```bash
  agents distribute -p
  # or: agents distribute --prune
  ```

- **CLI Info & Policy/Skill Content Reading**:
  ```bash
  agents where                     # Print myskills repo root path
  agents info                      # Print JSON repo metadata
  agents info policy.general       # Get Universal Root AGENTS.md policy & subdocs
  agents info policy.gemini        # Get Gemini policy override, basePolicy, & subdocs
  agents info skill.write-a-skill  # Get source location and subdocs of a skill
  agents read policy.git_workflow  # Print raw content of policy subdoc to stdout
  agents read skill.tdd            # Print raw content of tdd/SKILL.md to stdout
  agents read skill.writing-great-skills/GLOSSARY # Print raw content of auxiliary skill subdoc
  agents audit                     # Check if 100% of skills are documented in AGENTS.md
  agents audit --add               # Auto-insert missing skills into AGENTS.md & deltas
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
