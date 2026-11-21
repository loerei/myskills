---
name: to-prd-and-tickets
description: Use when synthesizing a plan or conversation into a local PRD and dependency-ordered tickets.
---

# To PRD and Tickets

Synthesize conversation context and codebase understanding into a local Epic directory (`docs/specs/<NN>-<epic-slug>/PRD.md` and `tickets/<key>-<slug>.md`) ready for `conduct-deep-reviewing-loop`, `gitpublish-prd-and-tickets`, and `implement-with-subagents`.

## Workflow

1. **Explore Codebase & Seams**:
   - Inspect current modules, domain glossary vocabulary, and ADRs in the target area.
   - On brownfield tasks (features, refactors, or migrations touching existing surfaces), inventory existing stylesheets/selectors, cross-cutting runtime binders (i18n/localization, theme, shortcuts, IPC/event subscriptions, custom protocols/CSP), consumed data fields, and existing test cases so zero live capabilities are silently dropped.
   - Identify the highest existing testing seams (or propose minimal new high-level seams).
2. **Draft Ticket Breakdown & Align with User**:
   - Slice the Epic into dependency-ordered tickets (`01`, `02`, `03.1`, etc.):
     - **Vertical tracer-bullet slices (default)**: Cut a narrow, complete, verifiable path through every layer (schema/domain, IPC/API, UI, tests) sized to fit in a single context window. Put prefactoring tickets first ("Make the change easy, then make the easy change").
     - **Wide-refactor exception (`expand-contract`)**: When a mechanical change has a codebase-wide blast radius that cannot land green as a vertical slice, sequence it as: (1) *Expand* (add new alongside old), (2) *Migrate* in blast-radius batches (each batch blocked by Expand, keeping CI green), and (3) *Contract* (remove old form once zero callers remain, blocked by all Migrate batches).
   - Present the testing seams and numbered ticket breakdown (`Key & Title`, `Blocked by`, `What it delivers`) to the user and confirm granularity and blocking edges before writing files.
3. **Write Local `PRD.md` and `tickets/*.md`**:
   - Write `docs/specs/<NN>-<epic-slug>/PRD.md` and one file per ticket under `docs/specs/<NN>-<epic-slug>/tickets/<key>-<slug>.md` using the templates below.
   - **Dual-Layer Checkbox & Unified File-Entry Invariant**: Every ticket MUST include valid GFM task-list checkboxes (`- [ ]`) on **both** `## What to Build` deliverables (`- [ ] 1. **[NEW|MODIFY|DELETE]** [file.ext](file:///...)`) and `## Acceptance Criteria` items (`- [ ] <Criterion>`). Embed target file paths and `[NEW|MODIFY|DELETE]` tags directly on the `## What to Build` deliverable entries (when a `[NEW]` file replaces legacy code, append `(Replaces: [legacy.ext](file:///...))` on that deliverable line); NEVER create a separate `## Target Files` section that duplicates `## What to Build`.
   - **Prototype Snippet Rule**: Avoid fragile line numbers; inline concise decision-encoding snippets (state machines, schemas, type contracts, reducers) when they specify contracts more accurately than prose. In brownfield repositories, snippets MUST reuse verified CSS selectors, i18n/localization lookups, and DTO/state fields from disk — NEVER invent placeholder class names or hardcode sample English strings where an active i18n seam exists.
4. **Downstream Handoff**:
   - Do not publish directly from this skill. Hand off to `conduct-deep-reviewing-loop` for specification auditing or `gitpublish-prd-and-tickets` to sync `PRD.md` and `tickets/*.md` to GitHub Issues.

## Templates

### 1. `docs/specs/<NN>-<epic-slug>/PRD.md`

```markdown
# PRD: <Epic Title>

## Problem Statement
The user-facing or architectural problem and root causes.

## Solution
High-level architectural and user-facing solution.

## User Stories
1. As a <actor>, I want <capability>, so that <outcome>.

## Implementation Decisions
- Modules, interfaces, schemas, state invariants, and API contracts to build or modify.

## Baseline Parity & Intentional Deltas
- **Preserved (`PRESERVE`)**: Existing behaviors, defaults, DOM/CSS contracts, cross-cutting binders (i18n, shortcuts, theme), and data fields that must remain unchanged.
- **Intentional Changes (`INTENTIONALLY_CHANGED`)**: Explicit behavioral, visual, or contract deltas authorized by this PRD (omit section only on pure greenfield epics).

## Testing Decisions
- Target seams, behavioral test philosophy, and prior art in the repository.

## Out of Scope
- Explicit non-goals and deferred work.

## Tickets
- `01` — <Title> (`tickets/01-<slug>.md`)
- `02` — <Title> (`tickets/02-<slug>.md`)
```

### 2. `docs/specs/<NN>-<epic-slug>/tickets/<key>-<slug>.md`

```markdown
# <Key> — <Ticket Title>

## Epic
PRD: <Epic Title>

## Status
ready-for-agent

## Blocked by
- `<upstream-key>` — <Upstream Title> (or `None — can start immediately`)

## What to Build
End-to-end behavior and concrete file/module deliverables for this slice. Every deliverable MUST start with a GFM task-list checkbox (`- [ ]`) and anchor its target file(s) inline (do NOT create a separate `## Target Files` section):

- [ ] 1. **[NEW|MODIFY|DELETE]** [`src/path/to/file.ts`](file:///absolute/path/to/src/path/to/file.ts) — <Deliverable / Module Title> *(if replacing legacy code: `(Replaces: [src/path/to/legacy.ts](file:///absolute/path/to/src/path/to/legacy.ts))`)*
  - Contract, state transitions, and edge-case rules.
- [ ] 2. **[NEW|MODIFY|DELETE]** [`src/path/to/file.test.ts`](file:///absolute/path/to/src/path/to/file.test.ts) — <Test Suite Title>
  - Behavioral test cases and boundary assertions.

## Acceptance Criteria
- [ ] <Concrete, testable behavioral or structural assertion 1>
- [ ] <Concrete, testable behavioral or structural assertion 2>
- [ ] Execute automated verification command: `<test-and-typecheck-command>`.

## Verification Command
```bash
<test-and-typecheck-command>
```
```
