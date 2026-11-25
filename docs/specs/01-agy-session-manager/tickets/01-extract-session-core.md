# 01 — Extract `session_core` and Windows-Safe Deletion

## Epic
PRD: Antigravity Session Manager CLI, Thorough Cleanup & Skill

## Status
ready-for-agent

## Blocked by
None — can start immediately

## What to Build
> **Scope Guard:** Implement only what is explicitly specified; preserve initial intended UXUI and all unmentioned existing behaviors. Do NOT alter, restyle, or remove anything unasked.

- [x] 1. **Extract `session_core.py` from `server/main.py`**:
  - **Files:** **[NEW]** [session_core.py](file:///D:/Projects/.devutil/antigravity-session-manager/server/session_core.py), **[MODIFY]** [main.py](file:///D:/Projects/.devutil/antigravity-session-manager/server/main.py)
  - Move `is_antigravity_running`, `get_dir_size`, `parse_proto_entries`, `extract_role_from_raw`, `extract_root_from_raw`, `get_system_status`, `get_session_tree`, and `delete_sessions` into `session_core.py`, accepting an explicit `base_dir` parameter (defaulting to `os.path.expanduser(r"~\.gemini\antigravity")`).
  - Keep [main.py](file:///D:/Projects/.devutil/antigravity-session-manager/server/main.py) as a thin FastAPI wrapper preserving `/api/status`, `/api/tree`, `/api/delete`, port discovery (`.server_port.json`), and exact `SystemStatus` / `TreeResponse` / `SessionNode` response shapes.
- [x] 2. **Implement Windows-safe recursive deletion (`safe_rmtree`)**:
  - **Files:** **[MODIFY]** [session_core.py](file:///D:/Projects/.devutil/antigravity-session-manager/server/session_core.py)
  - Replace `shutil.rmtree` calls in `session_core.py` with `safe_rmtree(path)` supporting extended-length `\\?\` paths on Windows (>260 chars), trailing-dot filenames, and safe reparse-point/junction unlinking (`os.rmdir` / `os.unlink` without traversing into junction targets).
  - Collect per-path lock/permission errors in a `errors: list[str]` field rather than aborting remaining deletions in the batch.
- [x] 3. **Add `session_core` and FastAPI smoke tests**:
  - **Files:** **[NEW]** [test_session_core.py](file:///D:/Projects/.devutil/antigravity-session-manager/server/tests/test_session_core.py)
  - Verify `get_session_tree`, `delete_sessions` (including backup creation and `force=False` guard), FastAPI `/api/status` + `/api/tree` + `/api/delete` via `TestClient`, and `safe_rmtree` on >260-char paths, trailing-dot files, and directory junctions (asserting junction target contents survive).

## Acceptance Criteria
- [x] `server/main.py` delegates all DB/proto/filesystem logic to `session_core.py` with zero changes to existing `SystemStatus`, `TreeResponse`, or `SessionNode` JSON keys.
- [x] `safe_rmtree` removes >260-char nested directories, trailing-dot filenames, and unlinks junctions without deleting junction target contents.
- [x] Locked files during deletion are reported in `errors` without aborting the rest of the batch.
- [x] Execute automated verification command: `pytest D:\Projects\.devutil\antigravity-session-manager\server\tests\test_session_core.py`.

## Verification Command
```bash
pytest D:\Projects\.devutil\antigravity-session-manager\server\tests\test_session_core.py
```
