# 03 — Add Read-Only Audit & Safe Cleanup Python CLI

## Epic
PRD: Antigravity Session Manager CLI, Thorough Cleanup & Skill

## Status
ready-for-agent

## Blocked by
- `02` — Thorough Cascade Cleanup, Worktrees, Temp Purge & Backup Retention

## What to Build
> **Scope Guard:** Implement only what is explicitly specified; preserve initial intended UXUI and all unmentioned existing behaviors. Do NOT alter, restyle, or remove anything unasked.

- [x] 1. **Create `server/cli.py` with `status`, `inspect`, and `clean` subcommands**:
  - **Files:** **[NEW]** [cli.py](file:///D:/Projects/.devutil/antigravity-session-manager/server/cli.py)
  - `status`: Reports `antigravity_running`, DB/brain/worktree counts, `.tmp` count/bytes, and backup count/bytes (`--json` supported).
  - `inspect`: Queries `session_core.get_session_tree()` with agent-friendly filters: `--orphans`, `--ghosts`, `--orphan-worktrees`, `--older-than <days>`, `--max-steps <n>`, `--min-size-mb <mb>`, `--top-size <n>`, `--limit <n>`, `--json` (compact summary without dumping nested `children` unless `--tree` is passed).
  - `clean`: Supports `--orphans-only`, `--orphan-worktrees`, `--tmp`, `--backups-keep <n>`, `--ids <id...>`, `--dry-run`, and `--force`. Refuses live `conversation_summaries.db` / `.pb` mutations when Antigravity is running unless `--force` is explicitly passed; disk-only non-DB cleanups (`--orphan-worktrees`, `--backups-keep`) are allowed with `--dry-run` or live execution.
- [x] 2. **Add CLI tests**:
  - **Files:** **[NEW]** [test_cli.py](file:///D:/Projects/.devutil/antigravity-session-manager/server/tests/test_cli.py)
  - Test `status --json`, `inspect` filter combinations (`--orphans`, `--older-than`, `--max-steps`, `--top-size`, `--json`), `clean --dry-run` (zero deletions), and the running-process guard when `is_antigravity_running()` is True.

## Acceptance Criteria
- [x] `cli.py inspect --json` returns filtered, bounded session/orphan/worktree records without requiring FastAPI to be running.
- [x] `cli.py clean --dry-run` reports exact target counts and bytes without modifying disk or DB state.
- [x] `cli.py clean --ids ...` exits non-zero when Antigravity is running unless `--force` is passed.
- [x] Execute automated verification command: `pytest D:\Projects\.devutil\antigravity-session-manager\server\tests`.

## Verification Command
```bash
pytest D:\Projects\.devutil\antigravity-session-manager\server\tests
```
