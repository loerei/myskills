# 05 — Author `/agy-session-manager` Skill and Distribute

## Epic
PRD: Antigravity Session Manager CLI, Thorough Cleanup & Skill

## Status
ready-for-agent

## Blocked by
- `04` — Add `ConversationService` Enrichment & Lifecycle Commands to CLI

## What to Build
> **Scope Guard:** Implement only what is explicitly specified; preserve initial intended UXUI and all unmentioned existing behaviors. Do NOT alter, restyle, or remove anything unasked.

- [x] 1. **Create `productivity/agy-session-manager/SKILL.md` in `myskills`**:
  - **Files:** **[NEW]** [SKILL.md](file:///D:/Projects/myskills/productivity/agy-session-manager/SKILL.md)
  - Follow `write-for-ai` and `manage-custom-skills`: 10-15 word frontmatter `description: Use when ...`, no hardcoded local paths or ambient context, explicit routing table:
    - Live metadata/lifecycle changes (rename, archive, pin, star, tag, delete live sessions) -> `cli.py live` / `ConversationService`.
    - Disk footprint, step counts, orphan DBs, orphan worktrees, `.tmp` purge, backup pruning -> `cli.py inspect --json` and `cli.py clean` (with `--dry-run` first, never `--force` on live DBs without explicit user approval).
    - Manual visual inspection -> launch `start.bat`.
  - Document failure modes and recovery (missing `ANTIGRAVITY_LS_ADDRESS` env vars, sandbox HTTP block, running-process lock).
- [x] 2. **Validate and distribute skill**:
  - **Files:** **[MODIFY]** [SKILL.md](file:///D:/Projects/myskills/productivity/agy-session-manager/SKILL.md)
  - Run `agents audit` and `agents distribute` from `D:/Projects/myskills`.

## Acceptance Criteria
- [x] `SKILL.md` passes `agents audit` with 10-15 word `Use when ...` description and zero policy violations.
- [x] `agents distribute` deploys `agy-session-manager` to registered IDE skill directories.
- [x] Execute automated verification command: `agents audit && agents distribute`.

## Verification Command
```bash
agents audit && agents distribute
```
