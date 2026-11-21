---
name: implement-a-ticket
description: Use when executing well-defined GitHub or local tickets with strict acceptance criteria.
---

# Implement a Ticket

Execute well-specified tickets directly from their `What to Build` deliverables and `Acceptance Criteria` without creating a separate `implementation_plan.md`.

## Directives

1. **Zero Re-Planning**: NEVER generate `implementation_plan.md`; use the ticket file itself as the live execution plan.
2. **Pre-Flight Deliverable Checkboxes**: Before writing code, inspect `## What to Build` in the ticket file. If its deliverables (e.g. `### 1. <Deliverable>` or file entries) lack GFM task-list checkboxes (`- [ ]`), convert each deliverable header/entry to `- [ ] 1. <Deliverable>` (anchoring `[NEW|MODIFY|DELETE]` target file paths inline) so mid-ticket checkpoints record exact file/module progress in valid GFM syntax.
3. **Two-Layer Single-Step Progression (`What to Build` -> `Acceptance Criteria`)**:
   - Mark at most **one** `## What to Build` deliverable `[/]` at a time.
   - Implement and unit-test that deliverable via TDD, run verification commands, then mark the deliverable `[x]` and simultaneously mark `[x]` on every `## Acceptance Criteria` item proven by those tests.
   - After all `## What to Build` deliverables are `[x]`, verify and check off any remaining cross-cutting `## Acceptance Criteria` items before committing.
4. **Targeted Seam Exploration**: Inspect only the codebase seams and tests relevant to the active ticket.
5. **Pre-Flight Spec Drift Check**: Before writing code, check for `Reviewed-At-Commit` in the parent PRD or ticket header. When present, run `git log --oneline <sha>..HEAD -- <touched-paths>`. If commits landed in overlapping scope after spec review, inspect their diff and reconcile live defaults, protocols, and handlers before coding (preserve newer live behavior unless it directly contradicts a core ticket requirement; escalate to the user on semantic contradiction).
6. **Considerate Porting on Migrations**: When migrating or replacing an existing file or UI component (including `[NEW]` deliverables declaring `Replaces: <legacy-file-path(s)>`), read the live legacy implementation and its paired stylesheets/tests first. Treat inline code snippets in tickets as structural intent, never as authorization to drop existing CSS selectors, secondary data fields, localization/i18n lookups, defaults, or live behaviors not explicitly marked `INTENTIONALLY_CHANGED` in the spec.

## Workflow

```mermaid
flowchart TD
    Start["Ticket Path / Issue ID"] --> Fetch["1. Read Local Ticket + PRD (or run fetch-ticket.js)"]
    Fetch --> Inspect["2. Inspect touched seams, tests & spec drift (git log <sha>..HEAD)"]
    Inspect --> Confirm{"3. Present briefing & ask: Implement?"}
    Confirm -->|"User Approves / T3"| Preflight["4. Ensure [ ] on What to Build deliverable headers"]
    Confirm -->|"Clarifications / No"| Stop["Address feedback"]
    Preflight --> Loop["5. Execute one [/] Deliverable in What to Build (TDD)<br/>Verify tests -> mark Deliverable [x] + matching ACs [x]"]
    Loop --> MoreDeliv{"More What to Build deliverables?"}
    MoreDeliv -->|"Yes"| Loop
    MoreDeliv -->|"No"| VerifyAll{"All remaining ACs [x] & full ticket verification pass?"}
    VerifyAll -->|"No"| Fix["Fix & re-run verification"] --> VerifyAll
    VerifyAll -->|"Yes"| CommitClose["6. Commit, push & close ticket"]
    CommitClose --> NextCheck{"Next unblocked ticket in PRD?"}
    NextCheck -->|"Yes"| AskNext["Ask: Read Ticket N and implement?"]
    NextCheck -->|"No (All Done)"| ClosePRD["Close Parent PRD & report summary"]
```

1. **Fetch & Brief**:
   - Read the local ticket and parent `PRD.md` directly (or for remote-only issues, run `node <skill-dir>/scripts/fetch-ticket.js <ticket-number-or-url>` to pull `.scratch/tickets/ticket_<number>.md` and `prd_<parent>.md`).
   - Inspect touched seams and tests (running `git log --oneline <sha>..HEAD -- <touched-paths>` when `Reviewed-At-Commit` is recorded, and reading live files + paired stylesheets before porting/replacing them), then present a concise briefing (`Ticket`, `Parent PRD`, `Touched Seams`, `Spec Drift` if any, `Deliverables & Acceptance Criteria`) and ask `"Implement Ticket #<number>?"` (skip confirmation when dispatched autonomously by `implement-with-subagents`).
2. **Execute & Verify**:
   - Normalize `## What to Build` deliverables to GFM task-list items (`- [ ] 1. <Deliverable>`) if missing.
   - Advance one `[/]` deliverable at a time: write tests alongside minimal code edits, run verification, mark the deliverable `[x]`, and check off (`[x]`) satisfied `## Acceptance Criteria` items.
3. **Commit, Close & Handoff**:
   - Commit atomically: `git commit -m "<type>(<scope>): <summary> (closes #<number>)"`.
   - When working against remote issues without `closes #<number>` auto-close, run `node <skill-dir>/scripts/close-ticket.js <ticket-number> --comment "Implemented and verified with unit tests."`
   - If another unblocked ticket exists in the PRD, ask `"Do you want me to read Ticket <next-number> and implement?"`.
