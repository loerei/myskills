# Progress & Work Breakdown Reviewer Guide

Audits whether the Directive Artifact (DA) establishes an optimal, incremental, and dependency-sound execution progression across phases, milestones, and tickets.

## Cognitive Calibration (Anti-Anchoring Directive)

Audit the Directive Artifact solely against codebase ground-truth and requirement criteria. Treat all phase breakdowns, ticket boundaries, and sequencing as a first-draft proposal regardless of git history, commit frequency, or edit timestamps. Do NOT inspect workspace review coordination files or other reviewer reports.

## Mandatory Audit Questions

1. **Tracer-Bullet Granularity**: Is each ticket a thin, independently testable, single-responsibility vertical slice that can be implemented and verified without waiting for the entire phase? Are monolithic tickets (> 300-500 LOC or multi-concern scopes) identified for splitting?
2. **Dependency & Sequencing Soundness**: Is the execution order topologically sound? Are there forward-dependencies (e.g. Ticket N depending on unbuilt APIs from Ticket N+2) or circular dependencies across tickets and phases?
3. **Phase & Milestone Boundaries**: Does Phase 0 / baseline milestones deliver an MVP / verifiable foundation without scope creep from subsequent phases? Are phase prerequisites explicitly specified?
4. **Prerequisite & Seam Unlocking**: Does early ticket sequencing prioritize unblocking test seams, fixtures, and interfaces needed by subsequent tickets?

## Work Breakdown Restructuring Actions Catalog

When restructuring multi-phase PRDs or tickets, reviewers MUST formulate findings using these structured action primitives:

### 1. Macro & Phase-Level Actions (PRD ↔ PRD)
- **`MERGE_PRDS`**: Consolidate tightly coupled or circular PRDs into a single unified phase to eliminate artificial boundaries.
- **`SPLIT_PRD`**: Decompose an overloaded PRD into sequential phases (e.g., Phase A: Core Engine MVP -> Phase B: Ecosystem/UI).
- **`REORDER_PHASES`**: Re-sequence execution order when a downstream phase contains mandatory architectural prerequisites for an upstream phase.

### 2. Cross-Level Actions (PRD ↔ Ticket)
- **`EXTRACT_PRD_FROM_TICKETS`**: Extract a cluster of related tickets from an existing PRD into a new standalone PRD/Phase when they form an independent subsystem.
- **`RELOCATE_TICKET`**: Move a ticket from a later phase to an earlier phase (e.g., promoting test fixtures or binary parsers to Phase 0) or defer a non-essential ticket to a later phase.
- **`DEMOTE_PRD_TO_TICKET`**: Demote an overly trivial PRD into a single ticket within an existing parent PRD.

### 3. Micro & Ticket-Level Actions (Ticket ↔ Ticket)
- **`SPLIT_TICKET_TRACER_BULLETS`**: Split a monolithic ticket into sequential tracer bullets: `Ticket A` (minimal contract + stub/devutil harness) -> `Ticket B` (core implementation) -> `Ticket C` (edge cases & full rule coverage).
- **`MERGE_TICKETS`**: Combine fragmented tickets that cannot be independently tested or delivered in isolation into a single cohesive ticket.
- **`REORDER_TICKETS`**: Re-sequence tickets within a phase to build data models, contracts, and test seams before consuming logic.
- **`INJECT_SCAFFOLDING_TICKET`**: Author a new prerequisite ticket for missing test byte fixtures, mock providers, or CLI developer utilities (`.devutil/`).

## Verdict Rules

- Return `STATUS: REVISIONS NEEDED` if tickets are monolithic/unsplit, have broken/forward dependencies, leak scope across phase boundaries, or lack incremental verifiability.
- Return `STATUS: PASS` if the work breakdown structure is strictly incremental, dependency-sound, and granularly decomposed into tracer bullets.

## Standard Output Protocol

Save evaluation to `scratch/deep_review/reports/Progress.md` via `write_to_file` using this format:

### Review Evaluation: Progress & Work Breakdown Reviewer

- **Status**: `STATUS: PASS` or `STATUS: REVISIONS NEEDED`

### Blocking Issues (Progress & Phasing Defects):

1. **[<ACTION_NAME>] <Issue Title>**:
   - **Target Scope / Source**: `<Source_Files_or_Tickets>`
   - **Target Destination**: `<Target_Files_or_New_PRD_Path>`
   - **Technical Rationale**: <Why this restructuring is required for incremental deliverability or dependency soundness>
   - **Required Transformation**: <Step-by-step instructions on splitting, merging, extracting, or reordering>

### Suggestions for Improvement (Non-blocking):

- <Optional roadmap polish or backlog consideration that does NOT block PASS status>
