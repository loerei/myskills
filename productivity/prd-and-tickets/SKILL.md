---
name: prd-and-tickets
description: Use when creating or migrating local PRDs and dependency-ordered tickets from plans or specs.
---

# PRD and Tickets

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
   - **Dual-Layer Checkbox & Unified File-Entry Invariant**: Every ticket MUST include valid GFM task-list checkboxes (`- [ ]`) on **both** `## What to Build` deliverables (`- [ ] 1. **[NEW|MODIFY|DELETE]** [file.ext](file:///...)`) and `## Acceptance Criteria` items (`- [ ] <Criterion>`). Embed target file paths and `[NEW|MODIFY|DELETE]` tags directly on the `## What to Build` deliverable entries; NEVER create a separate `## Target Files` section that duplicates `## What to Build`.
   - **Brownfield Equivalence & Unasked-Change Guard**: On brownfield or refactor tickets, frame replacement deliverables explicitly as `Replace <legacy> with <new> preserving initial intended UXUI` (and append `(Replaces: [legacy.ext](file:///...))` on `[NEW]` deliverables) so the spec separates underlying implementation changes (DOM to VDOM, file relocation, state store) from invariant user-facing UXUI. Include the standing `Scope Guard` line in `## What to Build` forbidding unrequested edits, restyling, or removals.
   - **Prototype Snippet Rule**: Avoid fragile line numbers; inline concise decision-encoding snippets (state machines, schemas, type contracts, reducers) when they specify contracts more accurately than prose. In brownfield repositories, snippets MUST reuse verified CSS selectors, i18n/localization lookups, and DTO/state fields from disk — NEVER invent placeholder class names or hardcode sample English strings where an active i18n seam exists.
4. **Downstream Handoff**:
   - Do not publish directly from this skill. Hand off to `conduct-deep-reviewing-loop` for specification auditing or `gitpublish-prd-and-tickets` to sync `PRD.md` and `tickets/*.md` to GitHub Issues.

## Reconcile / Migrate Existing Specs

When invoked on an existing `<epic-dir>` (`docs/specs/<NN>-<epic-slug>/`):
1. **Resolve Baseline Commit**: Read `Reviewed-At-Commit` from `PRD.md`; if missing, run `git log -n 1 --format=%H -- <epic-dir>` (if empty/untracked, skip the `git log` range and inspect live files on disk directly in Step 2).
2. **Audit Drift & Live Ground Truth**: Run `git log --oneline <baseline>..HEAD -- <touched-paths>` and inspect live files on disk to verify that all referenced paths, symbols, contracts, dependencies, and ticket dependencies still hold against current codebase state (flagging any obsolete, already-implemented, or conflicting specs).
3. **Audit Template & Invariant Parity**: Diff `PRD.md` and `tickets/*.md` against `## Workflow` (step 3 invariants) and `## Templates`; automatically stage format migration updates wherever the existing spec omits or drifts from current requirements.
4. **Draft Update Plan -> Approve -> Apply**: If zero drift and zero format/brownfield gaps are found, report `"No updates needed"` with the verified baseline commit and stop without editing. Otherwise, present a compact per-file delta table (`File | Drift / Gap | Proposed Update`) and wait for approval before editing (unless explicit edit approval is active). After applying updates, suggest `/conduct-deep-reviewing-loop` for cross-domain verification.

## Templates

### 1. `docs/specs/<NN>-<epic-slug>/PRD.md`

```markdown
# PRD: <Epic Title>

- **Change Mode:** `PARITY_MIGRATION | EXISTING_PRODUCT_FEATURE | GREENFIELD`
- **Reviewed-At-Commit:** `<HEAD SHA>`

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
> **Scope Guard:** Implement only what is explicitly specified; preserve initial intended UXUI and all unmentioned existing behaviors. Do NOT alter, restyle, or remove anything unasked.

End-to-end behavior and concrete file/module deliverables for this slice. Every deliverable MUST start with a GFM task-list checkbox (`- [ ]`) and anchor its target file(s) inline (do NOT create a separate `## Target Files` section):

- [ ] 1. **[NEW|MODIFY|DELETE]** [`src/path/to/file.ts`](file:///absolute/path/to/src/path/to/file.ts) — <Deliverable / Module Title> *(if replacing legacy code: `Replace [src/path/to/legacy.ts](file:///...) preserving initial intended UXUI` / `(Replaces: [src/path/to/legacy.ts](file:///...))`)*
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

## Domain Terms and Tag Commands

- **`!REC <path>` (Reconcile & Migrate Existing Specs)**: Audit an existing `<epic-dir>` against intervening commits, live code, and current spec templates/invariants, automatically flagging format migrations whenever schema or template drift is detected (Default: `none (requires path or active epic context)`; Timing: `Start-time`).
  - **Agent Action**:
    1. Run steps 1–4 of `## Reconcile / Migrate Existing Specs` against `<path>`.
    2. If zero drift or format/brownfield gaps are found, report `"No updates needed"` and stop; otherwise output the per-file Update Plan (`File | Drift / Gap | Proposed Update`, covering both code drift and template/brownfield format migrations) and stop for user approval unless explicit edit approval is active.
