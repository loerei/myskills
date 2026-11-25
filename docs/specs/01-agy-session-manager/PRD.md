# PRD: Antigravity Session Manager CLI, Thorough Cleanup & Skill

- **Change Mode:** `BROWNFIELD`
- **Reviewed-At-Commit:** `61607596ba73997f5150aff3dbc5afc88a3b9dde`

## Problem Statement

1. **No agent-friendly CLI or `ConversationService` bridge**: [main.py](file:///D:/Projects/.devutil/antigravity-session-manager/server/main.py) exposes only 3 FastAPI endpoints (`/api/status`, `/api/tree`, `/api/delete`) built for a React SPA. `GET /api/tree` has no filters or pagination, `POST /api/delete` blocks when Antigravity is running unless `force=true` is passed (risking SQLite/protobuf corruption), and SQLite inspection ignores live `ConversationService` annotations (`archived`, `pinned`, `starred`, `tags`, `conversationGroupId`, `runState`).
2. **Incomplete disk and metadata cleanup**: Session deletion only removes `conversations/<id>.db*`, `<id>.*.tmp`, `brain/<id>/`, `agyhub_summaries_proto.pb` entries, and `conversation_summaries` rows. It misses orphaned `worktrees/<id>/` directories, satellite files (`annotations/`, `sidecar_data/`, `presence/`, `chapter_titles/`), related SQLite tables (`conversation_parents`, `conversations_fts`), unmatched `.tmp` files in `conversations/`, unbounded `backups/web_delete_*` snapshots, and fails on Windows `brain/<id>/scratch/` trees with >260-char paths, junctions, or trailing-dot filenames.

## Solution

1. **Extract & harden core (`session_core.py`)**: Move inspection, Windows-safe recursive deletion (`\\?\` extended-length paths, junction unlinking, trailing-dot filenames, per-file lock reporting), and backup-guarded deletion out of [main.py](file:///D:/Projects/.devutil/antigravity-session-manager/server/main.py) into a testable `session_core.py` module while preserving FastAPI routes.
2. **Thorough cleanup & maintenance**: Cascade deletions to `worktrees/<id>/`, satellite directories, `<id>*.tmp`, `conversation_parents`, and `conversations_fts`; surface `worktreeSize` and orphaned worktrees in the API/UI; add `.tmp` purge and backup retention (`keep_last` / `max_age_days`).
3. **Agent CLI + `ConversationService` integration (`cli.py`)**: Provide filtered read-only inspection (`--orphans`, `--ghosts`, `--orphan-worktrees`, `--older-than`, `--max-steps`, `--top-size`, `--json`), safe cleanup with `--dry-run`, optional `ConversationService` live-state enrichment when `ANTIGRAVITY_LS_ADDRESS` and `ANTIGRAVITY_CSRF_TOKEN` are set, and safe live lifecycle commands (`rename`, `archive`, `unarchive`, `pin`, `unpin`, `star`, `tag`, `delete`).
4. **Custom skill (`/agy-session-manager`)**: Author `productivity/agy-session-manager/SKILL.md` in `myskills` routing agent inspection/cleanup to `cli.py` and manual visual inspection to [start.bat](file:///D:/Projects/.devutil/antigravity-session-manager/start.bat).

## User Stories

1. As an agent, I want a filtered JSON CLI (`cli.py inspect`) enriched with live `ConversationService` state, so that I can audit disk usage, step counts, orphans, and archive candidates without spinning up FastAPI or dumping the full tree.
2. As a user, I want session deletion and maintenance to remove `worktrees/`, satellite files, `conversation_parents`, `conversations_fts`, `.tmp` bloat, and old backups reliably on Windows, so that gigabytes of hidden bloat are reclaimed without partial-delete errors.
3. As a user, I want `/agy-session-manager` available as a skill, so that agents use the CLI for automated inspection/cleanup and `start.bat` when I want the visual UI.

## Implementation Decisions

- **Backend architecture**:
  - `server/session_core.py`: Pure Python module parameterized by `base_dir` (defaulting to `~/.gemini/antigravity`). Owns `is_antigravity_running()`, `safe_rmtree()` (Windows `\\?\` prefix, junction/reparse-point handling, trailing-dot filename support, per-path error collection), `get_session_tree()`, `delete_sessions()`, `purge_orphan_tmp()`, and `prune_backups()`.
  - `server/main.py`: Thin FastAPI wrapper delegating to `session_core.py`, adding maintenance endpoints (`/api/maintenance/tmp`, `/api/maintenance/backups`, `/api/maintenance/orphan-worktrees`) while preserving existing `/api/status`, `/api/tree`, and `/api/delete` contracts.
  - `server/cli.py`: Argparse CLI with `status`, `inspect`, `clean`, and `live` subcommands. Live lifecycle commands (`rename`, `archive`, `unarchive`, `pin`, `unpin`, `star`, `tag`, `delete`) call `http://$ANTIGRAVITY_LS_ADDRESS/product.v1.ConversationService/<Method>` using `ANTIGRAVITY_CSRF_TOKEN`.
- **SQLite cascade**: `delete_sessions()` deletes matching `conversation_id` rows from `conversation_summaries`, `conversation_parents` (matching `conversation_id` or `parent_conversation_id`), and `conversations_fts` (if tables exist) before `VACUUM`.
- **Satellite & worktree cascade**: On delete, remove `worktrees/<id>/` and matching `<id>*` files in `annotations/`, `sidecar_data/`, `presence/`, and `chapter_titles/`.
- **Skill placement**: `D:/Projects/myskills/productivity/agy-session-manager/SKILL.md` distributed via `agents audit` and `agents distribute`.

## Intentional Deltas

> **Default Preserve (`BROWNFIELD`):** All existing observable behavior, contracts, and `initial intended UXUI` default to **PRESERVE**; only deltas explicitly listed below may change.

- **`INTENTIONALLY_CHANGED`**: `SessionNode` in [types.ts](file:///D:/Projects/.devutil/antigravity-session-manager/client/src/types.ts) and `/api/tree` adds `hasWorktree: boolean`, `worktreeSize: number`, and `orphanWorktrees` (or `worktree` orphan entries) included in `totalSize`, and [App.tsx](file:///D:/Projects/.devutil/antigravity-session-manager/client/src/App.tsx) adds display of `worktreeSize` and maintenance actions for `.tmp` purge and backup retention.
- **`INTENTIONALLY_CHANGED`**: `delete_sessions()` cascades to `worktrees/`, satellite directories, `conversation_parents`, `conversations_fts`, and `<id>*.tmp` instead of leaving them behind, and reports per-file lock failures without aborting remaining deletions.

## Testing Decisions

- **Core & CLI unit/integration tests**: `pytest` in `D:/Projects/.devutil/antigravity-session-manager/server/tests/` against temporary `BASE_DIR` directories with synthetic SQLite DBs (`conversation_summaries`, `conversation_parents`, `conversations_fts`), protobuf entries, `conversations/*.db`, `conversations/*.tmp`, `brain/`, `worktrees/`, satellite dirs, and `backups/web_delete_*` snapshots.
- **Windows path edge cases**: Test `safe_rmtree()` on deep >260-char paths, trailing-dot filenames, and directory junctions (verifying junction target is NOT deleted).
- **FastAPI & `ConversationService` tests**: `fastapi.testclient.TestClient` for HTTP endpoints and `unittest.mock.patch` on `urllib.request.urlopen` for `ConversationService` enrichment and lifecycle commands.
- **Frontend & Skill verification**: `pnpm run build` / `tsc --noEmit` in `client/`, and `agents audit` in `D:/Projects/myskills`.

## Out of Scope

- Replacing `chronicle` transcript search or token benchmarking.
- Modifying Antigravity's internal language server binary or `ConversationService` protobuf schema.
- Automatic background daemon/cron scheduling for cleanup.

## Tickets

- `01` — Extract `session_core` and Windows-safe deletion (`tickets/01-extract-session-core.md`)
- `02` — Thorough cascade cleanup, worktrees, temp purge & backup retention (`tickets/02-thorough-cleanup-and-maintenance.md`)
- `03` — Add read-only audit & safe cleanup Python CLI (`tickets/03-audit-and-cleanup-cli.md`)
- `04` — Add `ConversationService` enrichment & lifecycle commands to CLI (`tickets/04-conversation-service-cli.md`)
- `05` — Author `/agy-session-manager` skill and distribute (`tickets/05-agy-session-manager-skill.md`)
