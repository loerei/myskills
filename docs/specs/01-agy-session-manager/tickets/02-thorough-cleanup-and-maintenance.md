# 02 — Thorough Cascade Cleanup, Worktrees, Temp Purge & Backup Retention

## Epic
PRD: Antigravity Session Manager CLI, Thorough Cleanup & Skill

## Status
ready-for-agent

## Blocked by
- `01` — Extract `session_core` and Windows-Safe Deletion

## What to Build
> **Scope Guard:** Implement only what is explicitly specified; preserve initial intended UXUI and all unmentioned existing behaviors. Do NOT alter, restyle, or remove anything unasked.

- [x] 1. **Cascade delete to worktrees, satellite files, and related SQLite tables**:
  - **Files:** **[MODIFY]** [session_core.py](file:///D:/Projects/.devutil/antigravity-session-manager/server/session_core.py)
  - On `delete_sessions()`, remove `worktrees/<id>/` via `safe_rmtree`, matching `<id>*` files in `annotations/`, `sidecar_data/`, `presence/`, and `chapter_titles/`, and all `<id>*.tmp` files in `conversations/`.
  - Delete matching rows from `conversation_parents` (where `conversation_id` or `parent_conversation_id` is in `target_ids`) and `conversations_fts` (if those tables exist in `conversation_summaries.db`) in addition to `conversation_summaries`, before `VACUUM`.
- [x] 2. **Surface worktree sizes, orphaned worktrees, `.tmp` purge, and backup retention**:
  - **Files:** **[MODIFY]** [session_core.py](file:///D:/Projects/.devutil/antigravity-session-manager/server/session_core.py), **[MODIFY]** [main.py](file:///D:/Projects/.devutil/antigravity-session-manager/server/main.py)
  - Add `hasWorktree` and `worktreeSize` to each `SessionNode` (included in `totalSize`), and detect `orphanWorktrees` (directories in `worktrees/` with no matching session in `conversation_summaries.db`) in `get_session_tree()` stats/payload.
  - Add `purge_orphan_tmp(base_dir, force=False)` (removes `.tmp` files in `conversations/` when Antigravity is closed or `force=True`, skipping locked files cleanly) and `prune_backups(base_dir, keep_last=5, max_age_days=None)` (prunes `backups/web_delete_*`).
  - Expose maintenance endpoints in `main.py`: `POST /api/maintenance/tmp`, `POST /api/maintenance/backups`, and `POST /api/maintenance/orphan-worktrees`.
- [x] 3. **Update React UI for worktree sizes and maintenance actions**:
  - **Files:** **[MODIFY]** [types.ts](file:///D:/Projects/.devutil/antigravity-session-manager/client/src/types.ts), **[MODIFY]** [App.tsx](file:///D:/Projects/.devutil/antigravity-session-manager/client/src/App.tsx)
  - Add `hasWorktree`, `worktreeSize`, and `orphanWorktrees` to `types.ts`, display `worktreeSize` in the `App.tsx` detail inspector alongside `dbSize` and `brainSize`, and add maintenance controls to clean orphaned worktrees, purge `.tmp` files, and prune old backups while preserving existing layout and tree/orphan tabs.
- [x] 4. **Add thorough cleanup and maintenance tests**:
  - **Files:** **[NEW]** [test_thorough_cleanup.py](file:///D:/Projects/.devutil/antigravity-session-manager/server/tests/test_thorough_cleanup.py)
  - Test cascade deletion across `worktrees/`, satellite dirs, `conversation_parents`, `conversations_fts`, `<id>*.tmp`, `orphanWorktrees` detection, `purge_orphan_tmp`, and `prune_backups(keep_last=...)`.

## Acceptance Criteria
- [x] Deleting a session removes its `worktrees/<id>/`, satellite files (`annotations/`, `sidecar_data/`, `presence/`, `chapter_titles/`), `<id>*.tmp`, `conversation_parents` rows, and `conversations_fts` rows.
- [x] `get_session_tree()` reports `worktreeSize`, `hasWorktree`, and `orphanWorktrees`, and `App.tsx` displays `worktreeSize` and maintenance actions without breaking existing tabs or selection filters.
- [x] `purge_orphan_tmp` and `prune_backups` reclaim `.tmp` and `backups/web_delete_*` files safely.
- [x] Execute automated verification command: `pytest D:\Projects\.devutil\antigravity-session-manager\server\tests && pnpm --dir D:\Projects\.devutil\antigravity-session-manager\client run build`.

## Verification Command
```bash
pytest D:\Projects\.devutil\antigravity-session-manager\server\tests && pnpm --dir D:\Projects\.devutil\antigravity-session-manager\client run build
```
