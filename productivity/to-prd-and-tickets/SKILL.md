---
name: to-prd-and-tickets
description: Use when synthesizing a plan or conversation into a local PRD and dependency-ordered tickets.
---

# To PRD and Tickets

Synthesize conversation context and codebase understanding into a local Epic directory (`docs/specs/<NN>-<epic-slug>/PRD.md` and `tickets/<key>-<slug>.md`) ready for `conduct-deep-reviewing-loop`, `gitpublish-prd-and-tickets`, and `implement-with-subagents`.

## Workflow

1. **Explore Codebase & Seams**:
   - Inspect current modules, domain glossary vocabulary, and ADRs in the target area.
   - Identify the highest existing testing seams (or propose minimal new high-level seams).
2. **Draft Ticket Breakdown & Align with User**:
   - Slice the Epic into dependency-ordered tickets (`01`, `02`, `03.1`, etc.):
     - **Vertical tracer-bullet slices (default)**: Cut a narrow, complete, verifiable path through every layer (schema/domain, IPC/API, UI, tests) sized to fit in a single context window. Put prefactoring tickets first ("Make the change easy, then make the easy change").
     - **Wide-refactor exception (`expand-contract`)**: When a mechanical change has a codebase-wide blast radius that cannot land green as a vertical slice, sequence it as: (1) *Expand* (add new alongside old), (2) *Migrate* in blast-radius batches (each batch blocked by Expand, keeping CI green), and (3) *Contract* (remove old form once zero callers remain, blocked by all Migrate batches).
   - Present the testing seams and numbered ticket breakdown (`Key & Title`, `Blocked by`, `What it delivers`) to the user and confirm granularity and blocking edges before writing files.
3. **Write Local `PRD.md` and `tickets/*.md`**:
   - Write `docs/specs/<NN>-<epic-slug>/PRD.md` and one file per ticket under `docs/specs/<NN>-<epic-slug>/tickets/<key>-<slug>.md` using the templates below.
   - **Dual-Layer Checkbox Invariant**: Every ticket MUST include valid GFM task-list checkboxes (`- [ ]`) on **both** `## What to Build` deliverables (`- [ ] 1. <Deliverable>`) and `## Acceptance Criteria` items (`- [ ] <Criterion>`) so execution agents track step-by-step build progress and test verification in-place without a separate `implementation_plan.md`.
   - **Prototype Snippet Rule**: Avoid fragile line numbers; inline concise decision-encoding snippets (state machines, schemas, type contracts, reducers) when they specify contracts more accurately than prose.
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
End-to-end behavior and concrete deliverables for this slice. Every deliverable MUST start with a GFM task-list checkbox (`- [ ]`):

- [ ] 1. <First Deliverable / Module / Seam>
  - Contract, state transitions, and edge-case rules.
- [ ] 2. <Second Deliverable / Module / Seam>
  - Contract, state transitions, and edge-case rules.

## Acceptance Criteria
- [ ] <Concrete, testable behavioral or structural assertion 1>
- [ ] <Concrete, testable behavioral or structural assertion 2>
- [ ] Execute automated verification command: `<test-and-typecheck-command>`.

## Verification Command
```bash
<test-and-typecheck-command>
```
```
