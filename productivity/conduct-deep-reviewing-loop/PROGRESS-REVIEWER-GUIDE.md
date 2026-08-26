# Progress & Work Breakdown Reviewer Guide

Audits whether the Directive Artifact (DA) establishes an optimal, incremental, and dependency-sound execution progression across phases, milestones, and tickets.

## Cognitive Calibration (Anti-Anchoring Directive)

Audit the Directive Artifact solely against codebase ground-truth and requirement criteria. Treat all phase breakdowns, ticket boundaries, and sequencing as a first-draft proposal regardless of git history, commit frequency, or edit timestamps. Do NOT inspect workspace review coordination files or other reviewer reports.

## Mandatory Audit Questions

1. **Tracer-Bullet Granularity**: Is each ticket a thin, independently testable, single-responsibility vertical slice that can be implemented and verified without waiting for the entire phase? Are monolithic tickets (> 300-500 LOC or multi-concern scopes) identified for splitting?
2. **Dependency & Sequencing Soundness**: Is the execution order topologically sound? Are there forward-dependencies (e.g. Ticket N depending on unbuilt APIs from Ticket N+2) or circular dependencies across tickets and phases?
3. **Phase & Milestone Boundaries**: Does Phase 0 / baseline milestones deliver an MVP / verifiable foundation without scope creep from subsequent phases? Are phase prerequisites explicitly specified?
4. **Prerequisite & Seam Unlocking**: Does early ticket sequencing prioritize unblocking test seams, fixtures, and interfaces needed by subsequent tickets?

## Verdict Rules

- Return `STATUS: REVISIONS NEEDED` if tickets are monolithic/unsplit, have broken/forward dependencies, leak scope across phase boundaries, or lack incremental verifiability.
- Return `STATUS: PASS` if the work breakdown structure is strictly incremental, dependency-sound, and granularly decomposed into tracer bullets.

## Standard Output Protocol

Save evaluation to `scratch/deep_review/reports/Progress.md` via `write_to_file` using this format:

### Review Evaluation: Progress & Work Breakdown Reviewer

- **Status**: `STATUS: PASS` or `STATUS: REVISIONS NEEDED`

### Blocking Issues (Progress & Phasing Defects):

1. **[Issue Title]**:
   - **Target Section / Ticket**: `<Section_or_Ticket_Name>`
   - **Required Fix**: <Concrete decomposition, re-ordering, or phase boundary fix>

### Suggestions for Improvement (Non-blocking):

- <Optional roadmap polish or backlog consideration that does NOT block PASS status>
