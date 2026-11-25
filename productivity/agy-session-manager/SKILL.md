---
name: agy-session-manager
description: Use when inspecting, auditing, cleaning, or managing Antigravity sessions, worktrees, temp files, or backups.
---

# Antigravity Session Manager

Manage Antigravity session storage, orphan cleanup, and live conversation metadata via `.devutil/antigravity-session-manager/rust/target/release/agy-session-manager.exe` (or `start.bat` for the visual UI). If the binary is missing, build it with `cargo build --release --manifest-path .devutil/antigravity-session-manager/rust/Cargo.toml`.

## Routing

| Task | Route | Rules |
| :--- | :--- | :--- |
| Live metadata & lifecycle (`rename`, `archive`, `unarchive`, `pin`, `unpin`, `star`, `unstar`, `tag`, `delete`) | `.devutil/antigravity-session-manager/rust/target/release/agy-session-manager.exe live <action> <target>` | `<target>` must be a full ID or >=6-char unique prefix. Use `--title` for `rename` and `--tags` for `tag`. |
| Disk footprint, step counts, orphan DBs, ghost sessions, orphan worktrees | `.devutil/antigravity-session-manager/rust/target/release/agy-session-manager.exe inspect --json` | Filter with `--orphans`, `--ghosts`, `--orphan-worktrees`, `--older-than`, `--max-steps`, `--min-size-mb`, `--top-size`, `--limit`, `--tree`, `--exclude-archived`, `--exclude-pinned`. |
| Delete sessions, orphan worktrees, `.tmp` files, or prune backups | `.devutil/antigravity-session-manager/rust/target/release/agy-session-manager.exe clean` | ALWAYS run with `--dry-run --json` first. NEVER pass `--force` on live DBs without explicit user approval. |
| Status & disk counts | `.devutil/antigravity-session-manager/rust/target/release/agy-session-manager.exe status --json` | Reports running state, DB/brain/worktree counts, `.tmp` bytes, and backup bytes. |
| Manual visual inspection | `.devutil/antigravity-session-manager/start.bat` | Launch only when the user wants the interactive web UI. |

## Failure Modes & Recovery

| Failure | Cause | Recovery |
| :--- | :--- | :--- |
| `ANTIGRAVITY_LS_ADDRESS` / `ANTIGRAVITY_CSRF_TOKEN` missing (`live` exits 1, or `inspect` returns `live_enrichment: false`) | Language server RPC env vars are unset in the current shell. | For `inspect`, continue with disk-only results unless live `archived`/`pinned` filtering is required. For `live`, verify/set both env vars or defer to the user. |
| Sandbox HTTP block on `cli.py live` (`urlopen` / connection error) | Sandboxed execution blocks localhost RPC to `ANTIGRAVITY_LS_ADDRESS`. | Request unsandboxed execution with user approval, or instruct the user to apply the change in the Antigravity UI. |
| Running-process lock (`Antigravity or language_server is running`) | `clean` with `--ids`, `--orphans-only`, or `--tmp` refuses to mutate live SQLite/files while Antigravity is running. | Run `--dry-run` first, then ask the user to close Antigravity before re-running. Do NOT pass `--force` without explicit user approval; inspect per-file lock errors in the JSON output if partial deletion occurs. |
