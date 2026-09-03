# Layer 2 Review Host Operational Guide

Instructions for Review Host to route Layer 3 reviewers, filter feedback, and enforce DAG gates.

## Core Responsibilities

0. **Scope Analysis & Dynamic Roster Selection**:
   - If `.scratch/deep-review/host/Reviewer_Choice_Rationale.md` exists (Round N+1): Load and preserve the active roster without re-evaluating exclusions.
   - Else (Round 1): Inspect target DA scope, `## Cross-Referenced DAs & Dependency Lineage` in `Context.md`, and user criteria; write `.scratch/deep-review/host/Reviewer_Choice_Rationale.md` using the standard table layout:
     ```markdown
     | Role Identifier | Selection Status (INCLUDED / EXCLUDED) | Technical Rationale |
     ```
     Ensure `Architect` and `Logic` are `INCLUDED`, and explicitly mark remaining 9 roles as `INCLUDED` or `EXCLUDED` (`Progress` MUST be `INCLUDED` for multi-phase/multi-ticket epics, roadmaps, or work-breakdown structures; `EXCLUDED` for single-ticket/simple plans).
1. **Workspace Preparation**: Purge all files in `.scratch/deep-review/reports/` (preserving intra-tier reports within an active pass). Validate `.scratch/deep-review/Context.md` (verifying presence of target DA, dependency lineage table, and criteria) without overwriting criteria or `SP`.
2. **DAG Routing & Targeted Execution**:
   - If `.scratch/deep-review/host/Changelog.md` exists: Reset `PassCount = 0`, load `.scratch/deep-review/host/Untouched_Reviewers.md` (if present), determine affected roles per `PROTOCOL.md` Section 6, then delete `.scratch/deep-review/host/Changelog.md` and `.scratch/deep-review/host/Untouched_Reviewers.md` before invoking reviewers.
   - If `.scratch/deep-review/host/Changelog.md` is absent:
     - If previous `host/Analyzation.md` recorded `ROUND_PASS`: Read active `PassCount` and run Full Sweep on the static DA across all active roles.
     - Else (Round 1): Initialize `PassCount = 0` and run Full DAG across all active roles (Tier 3.1 -> 3.2 -> 3.3 -> 3.4).
   - Vacuous Tier Handling: If all roles in an active tier are `EXCLUDED`, treat the tier as passed and advance immediately.
   - MUST use the invariant invocation template from `PROTOCOL.md` Section 3 with `<guide_path>` dynamically resolved to the primary `<Role>-REVIEWER-GUIDE.md` relative to the active skill location and neutral tool metadata (`toolAction: "Summoning reviewer"`, `toolSummary: "Domain review"`). Reviewers autonomously load domain subdocuments referenced in their guide's routing table as needed via `view_file`. NEVER inject round numbers or phase names into reviewer prompts.
3. **Subagent Execution & Single-Wave Invariant Summoning**:
   - Host dynamically summons active Layer 3 subagents using the invariant summoning template from `PROTOCOL.md` Section 3.
   - For parallel roles within the same DAG tier (e.g. `Logic` and `Edgecase` in Layer 3.3), Host MUST launch all subagents simultaneously in a single `invoke_subagent` call.
   - Host initializes a tracking set `PendingTierRoles` containing all active roles in the active tier batch, and arms a 180s liveness check timer via `schedule(DurationSeconds=180, Prompt="Check on reviewers liveness", TimerCondition="any")`.
   - Upon receiving an asynchronous reactive wakeup message from a reviewer, Host removes that reviewer from `PendingTierRoles`. If `PendingTierRoles` is non-empty, Host re-arms the 180s liveness check timer via `schedule(DurationSeconds=180, Prompt="Check on reviewers liveness", TimerCondition="any")`, does NOT inspect `<Role>.md` reports on disk or advance to Step 4, and ends its turn to continue waiting for remaining subagents.
   - If the 180s liveness check timer expires while `PendingTierRoles` is non-empty:
     1. Inspect subagent status via `manage_subagents(Action="list")`.
     2. If idle, hung, or stuck in background execution, send a status check ping via `send_message` (`"Status check: Please finalize your review report or disclose blockers."`).
     3. If non-responsive or errored, terminate and respawn that specific reviewer, resetting its pending wait state.
     4. After sending a status ping or respawning an unresponsive reviewer, Host MUST re-arm the 180s liveness check timer via `schedule(DurationSeconds=180, Prompt="Check on reviewers liveness", TimerCondition="any")` and end its turn to continue waiting for reviewer responses.
   - Only when `PendingTierRoles` is empty does Host proceed to Step 4 (Tier Batch Gate evaluation).
4. **Tier Batch Gate & Reviewer Negotiation**:
   - Host evaluates Layer 3 reports strictly per **tier batch** (after all active roles in the current tier produce their initial outputs).
   - **Subagent Lifecycle Preservation & Process Teardown**: Host MUST NOT terminate reviewer subagents upon receiving their initial reports. Reviewer subagents must remain alive in the `idle` state throughout active Tier Batch Gate negotiation so that Host can communicate via `send_message`. Once a tier batch is fully resolved (all roles are accepted as PASS, accepted as blocking REVISIONS NEEDED, or removed/sanitized), Host MUST terminate that tier's reviewer subagents via process control (`manage_subagents` with Action: `kill`) before advancing to the next tier (or triggering early suspension if any role retains accepted blocking defects).
   - For each role in the tier:
     - **Fully Accepted**: If all reported issues satisfy Ground-Truth and Macro Flow proofs with verified codebase/spec citations, Host accepts the report. Host does NOT author `<Role>_Gated_Issues.md` and does NOT send a message to that reviewer.
     - **Gated Issues**: If an issue lacks proofs, cites non-existent APIs, breaks macro flow, or constitutes an invalid defect, Host marks it as GATED.
   - For all roles in the tier with gated issues:
     1. Host authors `.scratch/deep-review/reports/<Role>_Gated_Issues.md` for each affected role simultaneously via native `write_to_file`. In this document, Host explains why each issue failed the gate. Host places a single top-level `## Required Reviewer Action` section at the top of the file (defining the 3 Gate Response Protocol choices), followed by `## Gated Issues` listing each failure with its `Gate Failure Classification` and `Rationale`. Host MUST NOT suggest fix solutions or code snippets, and MUST NOT repeat the 3 action choices per individual issue.
     2. Host initializes `PendingGatedRoles` containing all gated roles in the active tier batch.
     3. Host sends a notification message via `send_message` to all gated reviewers in the active tier batch in a single wave, and arms a 180s liveness check timer via `schedule(DurationSeconds=180, Prompt="Check on gated reviewers liveness", TimerCondition="any")`.
     4. Upon receiving a reactive wakeup message from a reviewer, Host removes that reviewer from `PendingGatedRoles`. If `PendingGatedRoles` is non-empty, Host re-arms the 180s liveness check timer via `schedule(DurationSeconds=180, Prompt="Check on gated reviewers liveness", TimerCondition="any")`, does NOT inspect `<Role>.md` reports on disk or trigger re-gating, and ends its turn to continue waiting for remaining subagents.
     5. If the liveness check timer expires before `PendingGatedRoles` is empty:
        - Host inspects subagent status via `manage_subagents(Action="list")`.
        - If a gated reviewer is idle, hung, or stuck in execution, Host sends a status ping via `send_message` (`"Status check: Please finalize your gate response or disclose blockers."`).
        - If a gated reviewer is unresponsive or errored, Host terminates and respawn that specific reviewer, resetting its pending wait state. Upon respawning, Host MUST immediately dispatch the gating notification message via `send_message` to the newly spawned subagent conversation ID (directing it to `.scratch/deep-review/reports/<Role>_Gated_Issues.md` and instructing it to apply the Gate Response Protocol).
        - After sending a status ping or respawning an unresponsive reviewer, Host MUST re-arm the 180s liveness check timer via `schedule(DurationSeconds=180, Prompt="Check on gated reviewers liveness", TimerCondition="any")` and end its turn to continue waiting for reviewer responses.
     6. Only when `PendingGatedRoles` is empty does Host proceed to re-evaluate updated `<Role>.md` and `<Role>_Explain.md` reports.
     7. Reviewers respond by either:
        - **Sanitizing as Requested**: editing `<Role>.md` in-place via native `write_to_file` (stripping invalid snippets and converting to an abstract specification with verified proofs). If `.scratch/deep-review/reports/<Role>_Explain.md` was authored in a prior turn of the active tier batch, reviewer MUST invalidate it (either by deleting it, or by overwriting with empty content via `write_to_file(CodeContent="")` if native file deletion tools are unavailable) to eliminate stale defense artifacts.
        - **Removing**: removing the defect from `<Role>.md` (if all blocking defects are removed, changing status to `- **Status**: STATUS: PASS`). If `.scratch/deep-review/reports/<Role>_Explain.md` was authored in a prior turn of the active tier batch, reviewer MUST invalidate it (either by deleting it, or by overwriting with empty content via `write_to_file(CodeContent="")` if native file deletion tools are unavailable) to eliminate stale defense artifacts.
        - **Rejecting Sanitization/Removal and Explaining**: authoring `.scratch/deep-review/reports/<Role>_Explain.md` with deeper/differing ground-truth proof on disk AND updating `.scratch/deep-review/reports/<Role>.md` in-place to integrate the substantiated `Ground-Truth Proof`, `Macro Flow Proof`, and clean remediation text, ensuring `<Role>.md` remains the clean single source of truth for Host aggregation.
     8. Host re-evaluates the updated `<Role>.md` and `<Role>_Explain.md`. If Host agrees, Host stops ping-pong (no confirmation message needed). If an issue remains ungrounded or explanation in `<Role>_Explain.md` is stale without differing/deeper ground-truth evidence, reviewer MUST either accept removal or sanitize the issue into an abstract specification; reviewer MUST NOT re-assert stale arguments. Host gates again until resolved:
        - Host updates `.scratch/deep-review/reports/<Role>_Gated_Issues.md` via `write_to_file` detailing why the previous explanation was rejected as stale and reiterating the demand for removal or abstract specification sanitization.
        - Host re-populates `PendingGatedRoles` with the subset of roles being re-gated.
        - Host sends notification messages to those specific re-gated reviewers via `send_message`.
        - Host re-arms the 180s liveness check timer via `schedule(DurationSeconds=180, Prompt="Check on gated reviewers liveness", TimerCondition="any")`.
        - Host ends its turn to await reactive wakeup messages from the re-gated reviewers before re-evaluating.
     9. When Host accepts an updated role report (whether via reviewer sanitization, removal, or substantiated explanation in `<Role>_Explain.md`), Host deletes `.scratch/deep-review/reports/<Role>_Gated_Issues.md` and any `.scratch/deep-review/reports/<Role>_Explain.md` for that role (if present, idempotently handling missing files) to eliminate transient gating artifacts from `reports/`.
   - Once all roles in the tier batch are resolved, Host terminates that tier's reviewer subagents via process control (`manage_subagents` with Action: `kill`) and advances to the next tier (or triggering early suspension if any role retains accepted blocking defects).
5. **Early Suspension**: If a tier returns `REVISION NEEDED` **after tier batch gate resolution** (i.e. if any active role in the resolved tier retains accepted blocking defects), terminate all remaining active reviewer subagents via process control (`manage_subagents` with Action: `kill`), cancel downstream tiers for that round, and transition directly to Step 7 (Reporting & Final Teardown).
6. **Snapshot Delta Backfill & Full Sweep Clearance**:
   - When all targeted roles pass on snapshot $S_N$:
     - If un-evaluated active roles exist on snapshot $S_N$ (skipped upstream roles or untouched reviewers): Summon **ONLY those skipped roles in topological DAG sequence** on snapshot $S_N$, preserving intra-round reports in `reports/`.
     - If all active roles in the frozen roster have now passed on snapshot $S_N$ (either via Full DAG execution or Targeted + Backfill): Record Full Sweep Clearance, increment `PassCount += 1`, and evaluate against `SP`.
     - If `PassCount < SP`: Transition directly to Step 7. Author `host/Analyzation.md` with `- **Gate Verdict**: ROUND_PASS` and `- **Current PassCount**: <N> / <SP>`, terminate active reviewer subagents via process control (`manage_subagents(kill)`), purge `reports/` and transient gating artifacts while strictly preserving `host/Analyzation.md` intact for Layer 1 handoff, and conclude execution. Layer 1 reads `ROUND_PASS` and re-spawns Host for the next Full Sweep round on the unchanged static DA with a clean context window per `SKILL.md` Step 3.
     - If `PassCount >= SP`: Issue `FINAL_PASS` and transition to Step 7.
7. **Reporting & Final Teardown**:
   - All reviewer reports in `.scratch/deep-review/reports/` are now 100% verified and sanitized directly by the specialist reviewers.
   - Record `Current PassCount: <N> / <SP>` in `.scratch/deep-review/host/Analyzation.md`.
   - **`Analyzation.md`**: Author `.scratch/deep-review/host/Analyzation.md` containing the Executive Summary header (`Gate Verdict`, `Current PassCount`, `Active Roster`) and ONLY the list of **Accepted Issues** across the active roles along with their technical acceptance rationale. `Analyzation.md` contains zero rejected or sanitized tables, as those issues were resolved or removed during the tier batch gate.
   - **`Changelog.md`**: When the verdict is `ROUND_REVISION_NEEDED`, author `.scratch/deep-review/host/Changelog.md` by aggregating BOTH the structural destination anchor (`Target Section` for standard roles, or `Target Scope / Source` and `Target Destination` for Progress) AND the verified remediation (`Required Fix` or `Required Transformation`) from accepted `<Role>.md` reports.
   - **`Untouched_Reviewers.md`**: When the verdict is `ROUND_REVISION_NEEDED`, author `.scratch/deep-review/host/Untouched_Reviewers.md` per Section 6/7.
   - When accepted feedback alters the DA file tree (e.g. WBS restructuring actions), Host MUST author a dedicated `## Target Directive Artifacts Synchronization (Context.md)` section in `Changelog.md` with explicit instructions and the updated file list for Layer 1.
   - **Intermediate Round Teardown**: When concluding an intermediate round with verdict `ROUND_REVISION_NEEDED`, terminate all active reviewer subagents via process control (`manage_subagents` with Action: `kill`), but MUST NOT purge `.scratch/deep-review/` (preserving `Analyzation.md`, `Changelog.md`, and `Untouched_Reviewers.md` for Layer 1).
   - **Final Pass Teardown**: When concluding the round or issuing `FINAL_PASS` (where `PassCount == SP`), terminate all remaining active reviewer subagents via process control (`manage_subagents` with Action: `kill`), and purge `.scratch/deep-review/reports/` and transient gating artifacts (`reports/<Role>_Gated_Issues.md`, `reports/<Role>_Explain.md`, if present, idempotently handling missing files), but MUST preserve `.scratch/deep-review/host/Analyzation.md` intact for Layer 1 handoff. The final recursive purge of `<repo-root>/.scratch/deep-review/*` is executed strictly by Layer 1 Main Agent after presenting the verified Directive Artifact to the user.

## Role Summoning Table

| Role Identifier | Guide Reference Path | Output Artifact Path |
| :--- | :--- | :--- |
| `Architect` | `<skill-root>/ARCHITECT-REVIEWER-GUIDE.md` | `.scratch/deep-review/reports/Architect.md` |
| `Progress` | `<skill-root>/PROGRESS-REVIEWER-GUIDE.md` | `.scratch/deep-review/reports/Progress.md` |
| `Readiness` | `<skill-root>/READINESS-REVIEWER-GUIDE.md` | `.scratch/deep-review/reports/Readiness.md` |
| `Security` | `<skill-root>/SECURITY-REVIEWER-GUIDE.md` | `.scratch/deep-review/reports/Security.md` |
| `DataMigration` | `<skill-root>/DATA-MIGRATION-REVIEWER-GUIDE.md` | `.scratch/deep-review/reports/DataMigration.md` |
| `Testability` | `<skill-root>/TESTABILITY-REVIEWER-GUIDE.md` | `.scratch/deep-review/reports/Testability.md` |
| `Logic` | `<skill-root>/LOGIC-REVIEWER-GUIDE.md` | `.scratch/deep-review/reports/Logic.md` |
| `Edgecase` | `<skill-root>/EDGECASE-REVIEWER-GUIDE.md` | `.scratch/deep-review/reports/Edgecase.md` |
| `Performance` | `<skill-root>/PERFORMANCE-REVIEWER-GUIDE.md` | `.scratch/deep-review/reports/Performance.md` |
| `Observability` | `<skill-root>/OBSERVABILITY-REVIEWER-GUIDE.md` | `.scratch/deep-review/reports/Observability.md` |
| `UXUI` | `<skill-root>/UXUI-REVIEWER-GUIDE.md` | `.scratch/deep-review/reports/UXUI.md` |
