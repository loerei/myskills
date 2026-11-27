---
name: todo
description: Use when tracking cross-session tasks, deferred ideas, or resuming work across repositories.
---

# Todo

Maintain one centralized markdown board per repository (`<TODO_DIR>/<repo-slug>.md`) across sessions, grouping entries by status with session links and chronological progress logs.

## 1. Config & File Resolution

Resolve `TODO_DIR` in order:
1. `AGENT_TODO_DIR` environment variable, if set and non-empty.
2. `TODO_DIR=<path>` inside `~/.agents/todo.env` (Windows: `%USERPROFILE%\.agents\todo.env`).
3. If neither exists or the file lacks `TODO_DIR`: stop and ask the user where to store centralized todo files, write `TODO_DIR=<chosen-path>` to `~/.agents/todo.env`, and create `<TODO_DIR>` if absent.

- NEVER place `TODO_DIR` inside a public or git-tracked repository directory unless gitignored.
- Target `<TODO_DIR>/<repo-slug>.md` (`basename(<repo-root>)` lowercased with non-alphanumerics collapsed to `-`, or `general.md` outside a repository). Create it from the template below if missing; otherwise read and update in-place.

## 2. Read-on-Resume & Checkpoint Continuity

- On session start in a repository or direct `/todo` invocation, read `<TODO_DIR>/<repo-slug>.md` first and briefly summarize open `WIP`, `To-do`, and `For Consideration` entries before taking action.
- List `<TODO_DIR>/<repo-slug>.md` and active `#N` IDs in `What To Re-read After A Checkpoint.md` under `## Referenced Artifacts` so context survives compaction.

## 3. Update & Progress Rules

- Assign monotonically increasing `#N` IDs per repository file (`#1`, `#2`, ...; never reuse IDs).
- Move an entry under the matching status section (`## WIP`, `## To-do`, `## For Consideration`, `## Done`) whenever status changes, and refresh `Updated: YYYY-MM-DD HH:mm`.
- Include `Session` as `[<Session Title>](conversation://<conversation-id>)` alongside `<short-id>` (add subsequent sessions that touch the entry) and link relevant PRs, artifacts, files, or concise code notes in `Details`.
- Append `- YYYY-MM-DD HH:mm: <note>` to `Progress` **only at meaningful milestones** (status transition, confirmed root cause or decision, PR/commit/artifact created, blocker hit, or pause/handoff). NEVER log routine reads or intermediate tool chatter.

## 4. File Template (`<TODO_DIR>/<repo-slug>.md`)

```markdown
# Todo: <Repo Name>

## WIP

### #1 <Entry Title>
- **Session:** [<Session Title>](conversation://<conversation-id>) (`<short-id>`)
- **Created:** YYYY-MM-DD HH:mm | **Updated:** YYYY-MM-DD HH:mm
- **Details:** <Scope, decision context, PR/artifact/file links, or code notes>
- **Progress:**
  - YYYY-MM-DD HH:mm: <Milestone or state transition>

## To-do

## For Consideration

## Done
```
