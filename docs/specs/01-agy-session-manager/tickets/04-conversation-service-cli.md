# 04 — Add `ConversationService` Enrichment & Lifecycle Commands to CLI

## Epic
PRD: Antigravity Session Manager CLI, Thorough Cleanup & Skill

## Status
ready-for-agent

## Blocked by
- `03` — Add Read-Only Audit & Safe Cleanup Python CLI

## What to Build
> **Scope Guard:** Implement only what is explicitly specified; preserve initial intended UXUI and all unmentioned existing behaviors. Do NOT alter, restyle, or remove anything unasked.

- [x] 1. **Implement `ConversationService` client & live enrichment**:
  - **Files:** **[NEW]** [conversation_service.py](file:///D:/Projects/.devutil/antigravity-session-manager/server/conversation_service.py), **[MODIFY]** [cli.py](file:///D:/Projects/.devutil/antigravity-session-manager/server/cli.py)
  - When `ANTIGRAVITY_LS_ADDRESS` and `ANTIGRAVITY_CSRF_TOKEN` are set, paginate `product.v1.ConversationService/ListConversations` (`includeArchived=true`) and merge `archived`, `pinned`, `starred`, `tags`, `conversationGroupId`, `runState`, and `summary` into `cli.py inspect` output (gracefully degrading with a `live_enrichment: false` flag if env vars are absent or the server is unreachable).
  - Add `--exclude-archived` and `--exclude-pinned` filters to `cli.py inspect` when live enrichment is available.
- [x] 2. **Add `live` lifecycle subcommands to `cli.py`**:
  - **Files:** **[MODIFY]** [cli.py](file:///D:/Projects/.devutil/antigravity-session-manager/server/cli.py)
  - Expose `cli.py live <action>` (`rename`, `archive`, `unarchive`, `pin`, `unpin`, `star`, `unstar`, `tag`, `delete`) supporting prefix resolution (minimum 6 chars, failing on ambiguous or missing match) and calling `UpdateConversation` or `DeleteConversation` safely while Antigravity is running.
- [x] 3. **Add `ConversationService` unit tests**:
  - **Files:** **[NEW]** [test_conversation_service.py](file:///D:/Projects/.devutil/antigravity-session-manager/server/tests/test_conversation_service.py)
  - Mock `urllib.request.urlopen` to verify pagination, `inspect` enrichment + `--exclude-archived`/`--exclude-pinned` filters, graceful fallback when env vars are missing, prefix resolution errors, and `live` subcommands (`rename`, `archive`, `pin`, `delete`).

## Acceptance Criteria
- [x] `cli.py inspect` merges `archived`, `pinned`, `starred`, `tags`, and `runState` when `ANTIGRAVITY_LS_ADDRESS` and `ANTIGRAVITY_CSRF_TOKEN` are present, and still succeeds offline when they are absent.
- [x] `cli.py live` commands resolve 6+ char prefixes and execute `UpdateConversation` / `DeleteConversation` without touching SQLite directly.
- [x] Execute automated verification command: `pytest D:\Projects\.devutil\antigravity-session-manager\server\tests`.

## Verification Command
```bash
pytest D:\Projects\.devutil\antigravity-session-manager\server\tests
```
