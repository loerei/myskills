# Review Host Guide

## 1. Architecture and Workspace Isolation

### 1.1 Workspace Layout
```text
<repo-root>/<review_dir>/    # Active round workspace (.scratch/deep-review-<short_title>/)
├── host/                    # [HOST ONLY] Hidden from all Layer 3 reviewers
│   ├── State.md             # Zero-prose routing state (Verdict, Highest Modified Tier, PassCount, TOUCHED/UNTOUCHED)
│   ├── Analyzation.md       # Round analysis report (accepted issues, accounting rationale, rejected suggestions, or impasse)
│   ├── Reviewer_Choice_Rationale.md
│   └── trace/               # Intra-round negotiation trace (pre-gate reports, Gated_Issues, Explain, CR files)
├── Context.md               # [PUBLIC] Frozen scope & lineage initialized by Layer 1
├── reports/                 # [ACTIVE REPORTS] Final accepted <Role>.md reports for current round
│   ├── <Role>.md
│   ├── <Role>_Gated_Issues.md
│   ├── <Role>_Explain.md
│   ├── <AuthorRole>-CR-<CrossReviewerRole>.md
│   └── <AuthorRole>-Cross-Review-Requests.md
└── sandbox/                 # [ISOLATED SANDBOXES] Purged every round; isolated per subagent
    ├── <Role>/              # Dedicated sandbox for primary reviewer (<Role>)
    └── <AuthorRole>-CR-<CrossReviewerRole>/ # Dedicated sandbox for cross-reviewer
```

- **Reviewer Isolation**: Reviewers MUST read only their assigned target DA(s), cross-referenced Upstream DAs declared in `Context.md`, `<review_dir>/Context.md`, and their `<Role>-REVIEWER-GUIDE.md` (plus its domain subdocuments). Reviewers MUST NOT inspect `<review_dir>/host/`, `<review_dir>/reports/` of other roles, or sibling `<review_dir>/sandbox/<OtherRole>/` directories.
- **Context Freezing & Content Rules**: `<review_dir>/Context.md` remains strictly frozen during active reviewer execution (updated only by Host in Step 7 if WBS restructuring splits/merges target DAs). `Context.md` MUST NOT contain leading prompt questions, past reviewer scores, historical changelogs, or dynamic execution state (round numbers, iteration counts, or current `PassCount`).
- **File Authoring Protocol**: Host and Reviewers MUST use native `write_to_file` directly (without `ArtifactMetadata`) for all markdown and sandbox files. NEVER create intermediate helper scripts (`write_report.cjs`, `.js`, `.ps1`) or embed multi-line code inside `run_command` inline strings (`node -e`, `python -c`, `echo`, `pwsh`) to author files.
- **Specification Hygiene (Zero-Loss & Clean Integration)**:
  - Integrate accepted remediations into target DAs as native first-class requirements without omission or semantic drift. Do not paraphrase concrete contracts or code signatures into vague prose, and do not invent requirements beyond accepted reports.
  - Strip review-iteration markers (`[UPDATED]`, `[FIXED]`, `[ADDED IN ROUND N]`, `[RESOLVED]`), internal changelogs, and version tables (`v1.x`) while preserving standard `AGENTS.md` plan action tags (`[NEW]`, `[MODIFY]`, `[DELETE]`).
- **Cross-Referenced DA Lineage Semantics**:
  1. **`Upstream` + `Implemented`**: Codebase on disk is authoritative ground-truth; target DA must integrate cleanly with existing implementations.
  2. **`Upstream` + `Unimplemented` (Authoritative Future Baseline)**: Reviewers MUST read the upstream DA and treat its declared types, schemas, and seams as the authoritative future baseline. Target DA MUST NOT duplicate/expand upstream features, MUST adhere strictly to upstream contracts, and reviewers MUST NOT flag upstream-scheduled files/methods as missing readiness defects.
  3. **`Downstream` + `Unimplemented`**: Target DA must expose clean extension points and domain seams without tightly coupling to or leaking logic of future downstream epics.
  4. **Intra-Epic Multi-Ticket Contract Parity**: When `Target DA(s)` comprises a multi-file epic (`PRD.md` + `tickets/01-...md` .. `0N-...md`), Host and Reviewers MUST verify that function signatures, exported symbol names, and data schemas remain 100% consistent across `PRD.md` and across all sibling tickets.

---

## 2. Subagent Prompt Templates

### 2A. Primary Reviewer Prompt Template
Host MUST summon Layer 3 subagents using this exact invariant template across all rounds:

```text
You are the <Role> Reviewer for Directive Artifact verification.
Review Workspace: <review_dir>
Target DA(s): <da_path(s)>
Domain Context: <review_dir>/Context.md
Review Guide: <guide_path>
Sandbox Directory: <review_dir>/sandbox/<Role>/
Output Path: <review_dir>/reports/<Role>.md

Audit the target document(s) objectively from a clean-slate perspective. Follow your Review Guide and any domain subdocuments referenced within it strictly. All findings and non-blocking suggestions MUST strictly adhere to your domain standards and codebase invariants.
```

- **Dynamic Guide Resolution**: Resolve `<guide_path>` dynamically relative to the active skill location (`.agents/skills/<skill-name>/<Role>-REVIEWER-GUIDE.md` in distributed projects or `productivity/<skill-name>/<Role>-REVIEWER-GUIDE.md` in central `myskills`).
- **Tool Metadata & Banned Calling Tokens**: Specify neutral metadata (`toolAction: "Summoning reviewer"`, `toolSummary: "Domain review"`). NEVER include tokens: `Round`, `Sweep`, `Targeted`, `Re-verify`, `Re-audit`, `Fix`, `Pass`, `Iteration`, `Previous round`.

### 2B. Cross-Reviewer Prompt Template
Host summons each ephemeral Cross-Reviewer via `invoke_subagent` (`TypeName: "reviewer"`, `Role: "<AuthorRole>: <CrossReviewerRole> Cross-Reviewer"`, `toolAction: "Cross-reviewing remediation"`, `toolSummary: "Domain cross-review"`) using this exact template:

```text
You are the <CrossReviewerRole> Cross-Reviewer for remediation validation.
Review Workspace: <review_dir>
Codebase Root: <repo-root>
Target DA(s): <da_path(s)>
Target Remediation: <review_dir>/reports/<AuthorRole>.md
Domain Context: <review_dir>/Context.md
Review Guide: <guide_path>
Sandbox Directory: <review_dir>/sandbox/<AuthorRole>-CR-<CrossReviewerRole>/
Output Path: <review_dir>/reports/<AuthorRole>-CR-<CrossReviewerRole>.md

Evaluate <AuthorRole>'s proposed remediation ONLY against your domain standards for the areas affected by the proposed changes. Follow your Review Guide for domain expertise.

You are encouraged to inspect relevant codebase files and Target DA(s) to verify that the proposed remediation is technically grounded and does not break existing contracts or domain invariants.

SCOPE CONSTRAINT: You are cross-reviewing a sibling role's remediation, NOT conducting a full audit. You MUST NOT report defects, findings, or requirements unrelated to the proposed remediation's changes. Codebase inspection is strictly for verifying the remediation's feasibility, not for discovering new defects that belong in your own regular audit report.

If the remediation satisfies your domain standards for the affected areas, return CROSS-PASSED.
If it does not, return CROSS-GATED with concrete requirements and specification text the authoring role must incorporate.

Write your evaluation to the Output Path per the Cross-Review Output Format, then notify Host via send_message with the exact text: "CR-COMPLETE <VERDICT>: <AuthorRole>-CR-<CrossReviewerRole>"
```

### 2C. Cross-Review Output & Request Formats
- **`<review_dir>/reports/<AuthorRole>-CR-<CrossReviewerRole>.md`**:
  ```markdown
  # Cross-Review: <AuthorRole> Remediation
  - **Cross-Reviewer**: <CrossReviewerRole>
  - **Verdict**: CROSS-PASSED | CROSS-GATED

  ## Cross-Gated Requirements
  <!-- Only present when verdict is CROSS-GATED -->
  1. **[Requirement Title]**:
     - **Affected Remediation Section**: <Section in AuthorRole.md where the gap exists>
     - **Domain Standard**: <Specific standard from cross-reviewer's domain not satisfied>
     - **Required Specification**: <Concrete spec text or acceptance criteria the authoring role must incorporate>
  ```
- **`<review_dir>/reports/<AuthorRole>-Cross-Review-Requests.md`** (compiled by Host):
  ```markdown
  # Cross-Review Requests: <AuthorRole>
  The following cross-domain requirements must be incorporated into your remediation in <review_dir>/reports/<AuthorRole>.md.

  ## From <CrossReviewerRole1>
  <Requirements copied from CR file>

  Update your report and notify Host via send_message with the exact text: "CR-UPDATED: <AuthorRole>"
  ```

---

## 3. Dynamic DAG Hierarchy & Role Catalog

### 3.1 DAG Execution Sequence (Seam-First Topology)
Host executes Layer 3 reviewers in dependency order across the active selected roster (`Testability` runs in Layer 3.2 to enforce module test seams and dependency injection before Layer 3.3 audits implementation logic and edge cases):

| DAG Tier | Role Identifiers | Prerequisite | Guide Reference Path | Output Artifact Path |
| :--- | :--- | :--- | :--- | :--- |
| **Layer 3.1** | `Architect` *(Mandatory Core)*<br>`Progress` | None | `<skill-root>/ARCHITECT-REVIEWER-GUIDE.md`<br>`<skill-root>/PROGRESS-REVIEWER-GUIDE.md` | `<review_dir>/reports/Architect.md`<br>`<review_dir>/reports/Progress.md` |
| **Layer 3.2** | `Readiness`<br>`Security`<br>`DataMigration`<br>`Testability` | Layer 3.1 PASS | `<skill-root>/READINESS-REVIEWER-GUIDE.md`<br>`<skill-root>/SECURITY-REVIEWER-GUIDE.md`<br>`<skill-root>/DATA-MIGRATION-REVIEWER-GUIDE.md`<br>`<skill-root>/TESTABILITY-REVIEWER-GUIDE.md` | `<review_dir>/reports/Readiness.md`<br>`<review_dir>/reports/Security.md`<br>`<review_dir>/reports/DataMigration.md`<br>`<review_dir>/reports/Testability.md` |
| **Layer 3.3** | `Logic` *(Mandatory Core)*<br>`Edgecase`<br>`Performance`<br>`Observability` | Layer 3.2 PASS | `<skill-root>/LOGIC-REVIEWER-GUIDE.md`<br>`<skill-root>/EDGECASE-REVIEWER-GUIDE.md`<br>`<skill-root>/PERFORMANCE-REVIEWER-GUIDE.md`<br>`<skill-root>/OBSERVABILITY-REVIEWER-GUIDE.md` | `<review_dir>/reports/Logic.md`<br>`<review_dir>/reports/Edgecase.md`<br>`<review_dir>/reports/Performance.md`<br>`<review_dir>/reports/Observability.md` |
| **Layer 3.4** | `UXUI` | Layer 3.3 PASS | `<skill-root>/UXUI-REVIEWER-GUIDE.md` | `<review_dir>/reports/UXUI.md` |

- **Skipped Tiers**: If all roles in a DAG tier are `EXCLUDED`, or if all active roles in the tier are skipped during an initial targeted pass (upstream of `Highest Modified Tier` or marked `UNTOUCHED` in `host/State.md`), treat that tier as skipped for the targeted pass and advance immediately to the next tier.

---

## 4. Host Step-by-Step Execution Workflow

### Step 0: Scope Analysis & Dynamic Roster Selection
- If `<review_dir>/host/Reviewer_Choice_Rationale.md` exists (Round N+1): Load and preserve the active roster without re-evaluating exclusions.
- Else (Round 1): Inspect target DA scope, `Context.md`, and user criteria; write `<review_dir>/host/Reviewer_Choice_Rationale.md`:
  ```markdown
  | Role Identifier | Selection Status (INCLUDED / EXCLUDED) | Technical Rationale |
  ```
  - `Architect` and `Logic` MUST ALWAYS be `INCLUDED`.
  - `Progress` MUST be `INCLUDED` for multi-phase/multi-ticket epics, roadmaps, or WBS plans; `EXCLUDED` for single-ticket/simple plans.
  - `DataMigration` MUST be `EXCLUDED` if `## Data Storage & Migration Scope` in `Context.md` specifies `Persistence Status: NO_PERSISTENCE`, and `INCLUDED` if `TOUCHES_PERSISTENCE`.
  - Remaining specialist roles are marked `INCLUDED` or `EXCLUDED` with concrete technical justification.

### Step 1: Workspace & Anti-Leak Sandbox Preparation
- Purge all files in `<review_dir>/reports/`, `<review_dir>/sandbox/`, and `<review_dir>/host/trace/` so zero stale scripts or reports remain from prior rounds.
- Ensure no stale sibling `<da_stem>.bak.md` files exist on disk before commencing the round.
- Validate `<review_dir>/Context.md` without overwriting user criteria or `SP`.

### Step 2: DAG Routing & Targeted Execution
- **Single-Round Host Invariant**: A Host instance is strictly ephemeral and executes ONE review round. NEVER initiate or launch a subsequent round (Round N+1) inside Host.
- **Initial Round (`host/State.md` absent)**: Set `PassCount = 0` and run Full DAG across all active roles (Tier 3.1 -> 3.2 -> 3.3 -> 3.4).
- **Targeted Round (`Gate Verdict: ROUND_REVISION_NEEDED` in `host/State.md`)**:
  - Reset `PassCount = 0`.
  - Read `Highest Modified Tier` from `host/State.md` (fallback to `Layer 3.1` if missing/malformed).
  - Parse `Reviewer Accounting` in `host/State.md` and extract all roles with `Status == UNTOUCHED` as `Untouched Reviewers` (fallback to empty set if missing/malformed).
  - Summon affected roles per §5 Invalidation Matrix on static snapshot $S_N$.
- **Full Sweep Round (`Gate Verdict: ROUND_PASS` in `host/State.md`)**:
  - Set `PassCount` to the parsed integer from `Current PassCount` in `host/State.md` (fallback to `1` if missing/malformed) and run Full DAG across all active roles on static snapshot $S_N$.

### Step 3: Subagent Execution & Batch Invocation
- Parallel roles within the same DAG tier MUST be launched simultaneously in a single `invoke_subagent` call using §2A.
- Initialize `PendingTierRoles`, set `ProbeCount[role] = 0`, and arm a 600s liveness timer via `schedule(DurationSeconds=600, Prompt="Check on reviewers liveness", TimerCondition="any")`.
- **Asynchronous Reactive Wakeup Handling**:
  - If `<review_dir>/reports/<Role>.md` exists on disk: remove `<Role>` from `PendingTierRoles`.
  - If report does not exist on disk but message is an active confirmation: reset `ProbeCount[role] = 0`, keep `<Role>` in `PendingTierRoles`, re-arm timer, and continue waiting.
  - While `PendingTierRoles` is non-empty: re-arm 600s timer, do NOT inspect partial reports or advance to Step 4, and end turn.
- **Liveness Timer Expiry Escalation**:
  1. Inspect subagents via `manage_subagents(Action="list")`.
  2. If `running`: send no message, re-arm timer.
  3. If `idle` and report exists on disk: remove from `PendingTierRoles`.
  4. If `idle` without report on disk:
     - `ProbeCount[role] == 0`: send Probe 1 (`"Status probe: Detected idle state. If you have a running background script, check its status via manage_task. Once your audit is finished, write your report to <review_dir>/reports/<Role>.md and notify Host."`), set `ProbeCount[role] = 1`.
     - `ProbeCount[role] == 1`: send Probe 2 (`"Status probe (confirm active status immediately via send_message): Detected idle state. Once your audit is finished, write your report to <review_dir>/reports/<Role>.md and notify Host."`), set `ProbeCount[role] = 2`.
     - `ProbeCount[role] >= 2` and idle with no confirmation: conclude reviewer is unrecoverable, reset `ProbeCount[role] = 0`, purge `<review_dir>/sandbox/<Role>/`, and respawn that reviewer via `invoke_subagent`.
- **Quota Interruption & Mid-Flight Resume**:
  > **Invariant Instruction**: Upon receiving resuming command: Check your progress by checking subagents, reports and host files and resume if unfinished, conclude and report if finished. DO NOT create a new round.
  1. Inspect subagents via `manage_subagents(Action="list")`.
  2. For any role in `PendingTierRoles` without a report on disk: if its conversation ID exists, send a resume message via `send_message` (`"System resumed from interruption. Please continue your audit and write your report to <review_dir>/reports/<Role>.md, then notify Host via send_message."`) without re-invoking. Only if missing from `manage_subagents(Action="list")` or exceeding Probe 2 may Host respawn via `invoke_subagent`.
  3. Re-arm 600s timer and end turn.

### Step 4: Tier Batch Gate, Intra-Tier Conflict Resolution & Reviewer Negotiation
Evaluate Layer 3 reports strictly per **tier batch** after `PendingTierRoles` is empty (`Wave = 1`):
- **Subagent Lifecycle**: Keep primary reviewers alive throughout the round; terminate Cross-Reviewer subagents via `manage_subagents(Action="kill")` immediately after receiving their cross-review report.
- **Triage per `HOW-TO-GATE.md`**:
  - **Verified Technical Impasse (`STATUS: INFEASIBLE`)**: Evaluate `Infeasibility Proof` per `HOW-TO-GATE.md` Principle 9. If verified, accept immediately, cancel downstream tiers, set `Gate Verdict: PLAN_INFEASIBLE`, `PassCount = 0`, and transition directly to Step 7. If speculative/ungrounded, gate under `Ungrounded Infeasibility Claim`.
  - **Intra-Tier Remediation Conflict Check**: When 2+ roles in the active tier report fixable blocking defects (`STATUS: REVISIONS NEEDED`), check whether their proposed remediations modify the same target section, interface, or workflow in mutually incompatible ways. If a conflict exists, resolve priority per `HOW-TO-GATE.md` ("Reviewer Trade-Off & Conflict Resolution") and gate the lower-priority finding under `Inter-Role Remediation Conflict`.
  - **Gated Issues**: Issues lacking Ground-Truth/Macro Flow proofs, citing non-existent APIs, breaking boundary symmetry, introducing cross-section contradictions, asserting ungrounded platform constraints, or conflicting with a higher-priority intra-tier remediation are marked GATED.
- **Gated Negotiation Loop**:
  1. For each gated role, copy its pre-gate `<review_dir>/reports/<Role>.md` to `<review_dir>/host/trace/gate_w<Wave>_<Role>.pre-gate.md`. If `<Role>_Explain.md` exists from a prior wave, move it to `<review_dir>/host/trace/gate_w<Wave-1>_<Role>_Explain.md`.
  2. Record `GatingIssuedTimestamp = current_time` and author `<review_dir>/reports/<Role>_Gated_Issues.md` simultaneously per §6.1. Host MUST NOT suggest fix solutions or code snippets.
  3. Initialize `PendingGatedRoles`, set `ProbeCount[role] = 0`, notify gated roles in a single wave via `send_message`, and arm a 600s timer.
  4. **Asynchronous Reactive Wakeup Handling**:
     - De-queue `<Role>` from `PendingGatedRoles` ONLY when: (1) `mtime(<Role>_Explain.md) > GatingIssuedTimestamp`, OR (2) `mtime(<Role>.md) > GatingIssuedTimestamp`, OR (3) an explicit completion message is received from `<Role>` subsequent to `GatingIssuedTimestamp`. NEVER check mere file existence of `<Role>.md`.
     - **Impasse Early-Exit Exception**: If a de-queued role updates `<Role>.md` with `STATUS: INFEASIBLE` or authors `<Role>_Explain.md` defending an impasse, immediately inspect the proof without waiting for `PendingGatedRoles` to empty. If verified per Principle 9, cancel downstream tiers, set `Gate Verdict: PLAN_INFEASIBLE`, `PassCount = 0`, and transition to Step 7. If unverified, keep the role de-queued and wait until `PendingGatedRoles` is empty before batch re-evaluation.
     - Liveness escalation and mid-flight resume follow Step 3 (if `ProbeCount[role] >= 2`, respawn with prompt referencing `<review_dir>/reports/<Role>_Gated_Issues.md`).
  5. **Re-Evaluation & Trace Preservation**: When `PendingGatedRoles` is empty, inspect updated `<Role>.md` and `<Role>_Explain.md`. If accepted, move `<Role>_Gated_Issues.md` and any `<Role>_Explain.md` into `<review_dir>/host/trace/gate_w<Wave>_...` (preserving negotiation history for Layer 1 archival while clearing `reports/`). If still ungrounded or stale, increment `Wave += 1` and re-gate.
- **Tier Batch Resolution**:
  - **Zero blocking defects**: Advance to the next DAG tier.
  - **1+ accepted blocking defects**: Proceed to Step 4B.

### Step 4B: Cross-Domain Remediation Review
When a tier batch (`<FailingTier>`) resolves with 1+ accepted blocking defects (`STATUS: REVISIONS NEEDED`), validate remediations against cross-domain standards before Early Suspension (Step 5) or DA Mutation (Step 7):
1. **Collect Remediations**: Identify all `<Role>.md` reports in the resolved `<FailingTier>` with status `REVISION NEEDED`.
2. **Determine Cross-Review Roles (Selective Triggering)**:
   - **Zero Cross-Domain Impact (`Cross-Review Roles: None`)**: If a remediation is strictly self-contained within a single module/function (e.g. fixing an internal calculation, adding error `cause` chaining, refining local unit test assertions, pinning a lockfile version) and does NOT alter: (a) cross-module interfaces/DTOs, (b) persistent schemas/migrations, (c) state machine transitions or concurrency locks, (d) security/authz boundaries or ingress schemas, (e) UI layout/interaction flows, or (f) ticket WBS sequencing $\rightarrow$ assign `Cross-Review Roles: None` and skip cross-review for that remediation.
   - **Cross-Cutting Remediations**: Select cross-review roles from the active roster (excluding `<AuthorRole>` itself):
     - Public contracts, module boundaries, shared state, or cross-subsystem dependencies $\rightarrow$ `Architect`
     - Prerequisite tasks, ticket delivery order, or ticket scope expansion $\rightarrow$ `Progress`
     - Package dependencies, build/bundler configs, compiler/environment contracts $\rightarrow$ `Readiness`
     - API boundaries, authz/authn, network/IPC protocols, or payload schemas $\rightarrow$ `Security`, `Testability`, `Observability`
     - Database schemas, configuration formats, or caching/query strategies $\rightarrow$ `DataMigration`, `Performance`
     - State machines, concurrency control, or algorithmic logic $\rightarrow$ `Logic`, `Edgecase`, `Testability`
     - Component composition, focus lifecycle, event handling, or rendering $\rightarrow$ `UXUI`
   - **`Cross-Review Tier Invariant`**: Cross-Reviewers validate `<AuthorRole>`'s proposed remediation in-flight; they are NOT primary tier reviewers for the round and **MUST NEVER shift, override, or alter `Highest Modified Tier` or `Reviewer Accounting` in `host/State.md`**.
3. **Invoke Cross-Reviewers**: Launch all `<AuthorRole>-CR-<CrossReviewerRole>` subagents simultaneously in a single wave per §2B (`CRWave = 1`). Initialize `PendingCrossReviewRoles[AuthorRole]` and arm a 600s timer per Step 3.
4. **Wakeup & Immediate Termination**: Upon receiving `"CR-COMPLETE <VERDICT>: <AuthorRole>-CR-<CrossReviewerRole>"` via `send_message`, verify report on disk, de-queue, and immediately terminate that cross-reviewer via `manage_subagents(Action="kill")`.
5. **Cross-Review Resolution & Trace Preservation**:
   - **All `CROSS-PASSED`**: Move `<AuthorRole>-CR-*.md` files into `<review_dir>/host/trace/cr_w<CRWave>_...` without reading them, and mark `<AuthorRole>` resolved.
   - **Any `CROSS-GATED`**: Read ONLY `CROSS-GATED` reports, compile `<review_dir>/reports/<AuthorRole>-Cross-Review-Requests.md` per §2C, copy current `<AuthorRole>.md` to `<review_dir>/host/trace/cr_w<CRWave>_<AuthorRole>.pre-cr.md`, and message `<AuthorRole>`:
     `Cross-domain review identified requirements for your remediation. Read <review_dir>/reports/<AuthorRole>-Cross-Review-Requests.md. Incorporate all listed requirements into your report at <review_dir>/reports/<AuthorRole>.md. Once updated, notify Host via send_message with the exact text: "CR-UPDATED: <AuthorRole>"`
   - Upon receiving `"CR-UPDATED: <AuthorRole>"`:
     1. Move `<AuthorRole>-Cross-Review-Requests.md` and prior `<AuthorRole>-CR-*.md` files into `<review_dir>/host/trace/cr_w<CRWave>_...`, and purge `<review_dir>/sandbox/<AuthorRole>-CR-*/`.
     2. Increment `CRWave += 1`.
     3. **Re-Evaluate Cross-Review Roles on Updated Remediation**: Inspect the updated `<AuthorRole>.md` and spawn fresh clean-slate cross-reviewers per §2B for all previously gating roles **PLUS any active role (including roles that returned `CROSS-PASSED` in Wave 1 or newly affected roles) whose domain standards are affected by the newly incorporated changes**.
     4. Repeat until all selected cross-review roles return `CROSS-PASSED`.

### Step 5: Early Suspension
- After Step 4B completes for a tier batch (`<FailingTier>`, e.g. `Layer 3.X`) with accepted blocking defects: bind **`Highest Modified Tier = <FailingTier>`** (the exact DAG tier whose primary reviewer(s) returned `STATUS: REVISIONS NEEDED` — NEVER a Cross-Reviewer's tier from Step 4B), reset `PassCount = 0`, cancel downstream tiers for that round, and transition directly to Step 7.

### Step 6: Snapshot Delta Backfill & Full Sweep Clearance Gate
- When all active roles in the current pass clear with zero blocking defects:
  - **Snapshot Delta Backfill**: If un-evaluated active roles exist on snapshot $S_N$ (skipped upstream roles or `UNTOUCHED` roles from `host/State.md`), summon ONLY those skipped roles in topological DAG sequence on snapshot $S_N$ (if any backfilled tier returns blocking defects or impasses, that backfilled tier becomes `<FailingTier>` and executes Steps 4–5).
  - **Full Sweep Clearance Check**: Once 100% of active roles in the frozen roster have audited and passed snapshot $S_N$ with zero blocking defects:
    - Increment `PassCount += 1`.
    - Set `Gate Verdict: FINAL_PASS` if `PassCount >= SP`, else `Gate Verdict: ROUND_PASS`, and transition to Step 7.

### Step 7: Direct DA Mutation, Coordination Artifacts & Teardown

#### 7.1 Direct DA Mutation Transaction (`ROUND_REVISION_NEEDED` only)
*(When verdict is `PLAN_INFEASIBLE`, `ROUND_PASS`, or `FINAL_PASS`, skip §7.1 entirely: do NOT mutate target DAs and generate zero `.bak.md` files).*
1. **Pre-Mutation Backups**: Create sibling `<da_stem>.bak.md` copies before mutating or deleting any target DA. If WBS restructuring alters `## Target Directive Artifacts` in `Context.md`, create `<review_dir>/Context.bak.md`.
2. **In-Place DA Mutation & File Tree Synchronization**:
   - Apply verified remediations from accepted `<Role>.md` reports directly into target DA(s) per §1.1 Specification Hygiene. Document every applied non-blocking suggestion in `Analyzation.md`.
   - Verify boundary contract symmetry (caller + callee + shared types) and cross-section coherence (`Verification Plan` synchronized with behavioral changes).
   - If accepted feedback splits, merges, creates, or deletes DA files (Progress WBS actions):
     - For `DECOMPOSE_PLAN_TO_PRD_AND_TICKETS`:
       1. Create target epic directory `<epic_dir>/` and `<epic_dir>/tickets/`.
       2. Write `<epic_dir>/PRD.md` containing architectural context, milestones, and continuity invariants.
       3. Write modular `<epic_dir>/tickets/01-...md`, `02-...md` capturing independent slices, acceptance criteria, and verification steps.
       4. Preserve `<source_plan_stem>.bak.md` in source plan's directory, then delete original monolithic plan file from disk.
       5. Update `## Target Directive Artifacts` in `<review_dir>/Context.md` to reference the newly generated `PRD.md` and tickets.
     - For `SPLIT_PRD`, `MERGE_PRDS`, `EXTRACT_PRD_FROM_TICKETS`, `SPLIT_TICKET_TRACER_BULLETS`: create, rename, or remove target DA files on disk and synchronize `Context.md`.
3. **Write Verification & Abort Recovery**:
   - Verify on disk that all mutated and restructured DA files were written and are non-empty (`size > 0`).
   - **Verification Failure Recovery**: If any file is missing or 0 bytes:
     1. If `<review_dir>/Context.bak.md` exists: delete newly created DA files, restore `Context.md` from `Context.bak.md`, and delete `Context.bak.md`.
     2. Restore every target DA in restored `Context.md` from its sibling `<da_stem>.bak.md` and delete all `.bak.md` files.
     3. Author `host/State.md` and `host/Analyzation.md` with `Gate Verdict: ABORTED_MUTATION_FAILURE` detailing the error and affected paths, notify Layer 1 via `send_message`, and conclude round.
   - **Verification Success**: Retain `<da_stem>.bak.md` and `Context.bak.md` on disk so Layer 1 Step 3A can archive `da-pre-mutation/` into `<trace_vault>` (Layer 1 automatically purges `.bak.md` files after archival when `!PA` / `!WA` is inactive, or retains them when `!PA` / `!WA` is active).

#### 7.2 Author Coordination Artifacts & Process Teardown (All Verdicts)
1. Author `<review_dir>/host/State.md` per §6.2 and `<review_dir>/host/Analyzation.md` per §6.3.
2. **Process Teardown Handshake**: Send completion message to Layer 1 via `send_message` reporting the `Gate Verdict` and referencing `<review_dir>/host/State.md` and `Analyzation.md`, and conclude execution. **Host MUST NOT call `manage_subagents(Action="kill")` at round teardown**; Layer 1 handles all process termination by killing Layer 2 (cascading to all descendant subagents) and archiving `<review_dir>` into `/tmp/deep-review-trace-<short_title>/round-<NN>/`.

---

## 5. Invalidation Matrix & Targeted Re-Review

When Host applies verified mutations to the DA, it transitions to static snapshot $S_N$. Host N+1 reads `Highest Modified Tier` and `Untouched Reviewers` (`Status == UNTOUCHED`) from `host/State.md`:

| Highest Modified Tier | Targeted Roles Run on Snapshot $S_N$ | Skipped Roles Pending Step 6 Backfill (Upstream + Untouched) |
| :--- | :--- | :--- |
| **Layer 3.1 (`Architect`, `Progress`)** | Active 3.1 to 3.4 Roles minus Untouched Roles | Untouched 3.1 to 3.4 Roles |
| **Layer 3.2 (`Readiness`, `Security`, `DataMigration`, `Testability`)** | Active 3.2 to 3.4 Roles minus Untouched Roles | Active Layer 3.1 Roles + Untouched 3.2–3.4 Roles |
| **Layer 3.3 (`Logic`, `Edgecase`, `Performance`, `Observability`)** | Active 3.3 to 3.4 Roles minus Untouched Roles | Active Layer 3.1 & 3.2 Roles + Untouched 3.3–3.4 Roles |
| **Layer 3.4 (`UXUI`)** | Active 3.4 Roles minus Untouched Roles | Active Layer 3.1 to 3.3 Roles + Untouched 3.4 Roles |

---

## 6. Host Artifact Schemas

### 6.1 `<review_dir>/reports/<Role>_Gated_Issues.md`
```markdown
# Gated Issues: <Role>

## Required Reviewer Action
Read the gated issues below. For each issue, choose ONE action:
1. **Refine / Complete as Requested**: Update `<Role>.md` in-place, resolving the gate failure (e.g. replacing ungrounded snippets or invented tokens with verified codebase symbols/tokens, converting speculative impasse claims into fixable defects with concrete remediation and updating report header to `STATUS: REVISIONS NEEDED`, supplying missing symmetrical boundary endpoints, or harmonizing contradicting assertions in dependent sections) with verified proofs.
2. **Remove**: Remove the issue from `<Role>.md` in-place (set status to `STATUS: PASS` if zero blocking issues remain, or `STATUS: REVISIONS NEEDED` if other fixable defects remain).
3. **Reject Gating/Removal and Explain**: Author `<Role>_Explain.md` with differing/deeper codebase proof (or empirical probe logs / sandbox traces) AND update `<Role>.md` in-place with verified proofs and clean remediation text (or verified `Infeasibility Proof` and `Alternative Architectural Paths`).
Notify Host via message when done.

## Gated Issues
1. **[Issue Title]**:
   - **Target Section**: `<Section_Name>`
   - **Gate Failure Classification**: `Ungrounded Fix Proposal` | `Asymmetric Boundary Contract` | `Cross-Section Contradiction` | `Inter-Role Remediation Conflict` | `False-Positive Upstream Unreadiness` | `Premature Downstream Coupling` | `Speculative Over-Engineering` | `Spec-Induced Regression` | `Ungrounded Infeasibility Claim` | `Ad-Hoc Runtime Migration Bloat` | `Invented Protocol Verdict` | `Defensive Fallback Bloat` | `Ambient Fault Masking` | `Ad-Hoc Runtime Flag Bloat` | `Hot-Path Telemetry Overhead` | `Ad-Hoc Configuration & Runtime Shim Bloat` | `Unlabeled or Ambiguous Icon` | `Ad-Hoc Z-Index Escalation` | `Monolithic Acceptance Criteria Bloat` | `Propagation Suppression` | `Post-Render Focus Hacks` | `Callee Masking / Downstream Patching` | `Obvious Implementation Signal` | `False-Positive Plan Decomposition` | `False-Positive Continuous Phasing Demand` | `False-Positive Intermediate Boot Demand`
   - **Gate Rationale**: <Exact technical reason why issue failed the gate without proposing fix code>
```

### 6.2 `<review_dir>/host/State.md` (Zero-Prose Routing State)
To prevent anchoring Host $N+1$ on prior round mutation details, `State.md` contains ONLY machine-readable routing state (record `Reviewer Accounting` `Technical Rationale` in `Analyzation.md` instead):

- **When verdict is `ROUND_REVISION_NEEDED`**:
  ```markdown
  # Gate State
  - Gate Verdict: ROUND_REVISION_NEEDED
  - Highest Modified Tier: Layer 3.X
  - Current PassCount: 0 / <SP>

  ## Reviewer Accounting (Layer 3.X)
  | Role Identifier | Status |
  | :--- | :---: |
  | `<Role_1>` | TOUCHED |
  | `<Role_2>` | UNTOUCHED |
  ```
  - **`Highest Modified Tier` Invariant (`<FailingTier>`)**: `Highest Modified Tier` MUST ALWAYS be the exact DAG tier (`Layer 3.1`, `Layer 3.2`, `Layer 3.3`, or `Layer 3.4`) whose **primary Reviewer (`<Role>.md`)** returned `STATUS: REVISIONS NEEDED` and triggered Early Suspension in Step 5 of the current round (e.g. if `UXUI` in `Layer 3.4` failed, `Highest Modified Tier` MUST be `Layer 3.4`). **NEVER** shift `Highest Modified Tier` to an upstream tier because a Cross-Reviewer (`<AuthorRole>-CR-<CrossReviewerRole>`) from that upstream tier participated or gated in Step 4B, or because the remediation modifies an upstream domain section (all upstream tiers are automatically scheduled via §5 Step 6 Snapshot Delta Backfill once `<FailingTier>` passes in Round $N+1$).
  - **Mandatory 100% Intra-Tier Coverage (`Reviewer Accounting`)**: List 100% of active primary roles belonging strictly to that exact `Highest Modified Tier` (`<FailingTier>`) — NEVER list roles from other tiers, never write `*(None)*`, and never omit active sibling roles in `<FailingTier>` (e.g. if `Highest Modified Tier` is `Layer 3.4`, the table lists ONLY `| \`UXUI\` | TOUCHED |`). Within `<FailingTier>`, mark a role `TOUCHED` if it raised an accepted blocking defect OR if applied DA mutations touch contracts, seams, requirements, or dependencies relevant to that sibling role's domain checklist; mark a sibling role in `<FailingTier>` `UNTOUCHED` ONLY if applied mutations introduce zero modifications, additions, or regressions relevant to its domain (default to `TOUCHED` on any ambiguity).
- **When verdict is `ROUND_PASS`, `FINAL_PASS`, `PLAN_INFEASIBLE`, or `ABORTED_MUTATION_FAILURE`**:
  ```markdown
  # Gate State
  - Gate Verdict: <VERDICT>
  - Highest Modified Tier: None
  - Current PassCount: <N> / <SP>
  ```

### 6.3 `<review_dir>/host/Analyzation.md`
```markdown
- **Gate Verdict**: ROUND_REVISION_NEEDED | ROUND_PASS | FINAL_PASS | ABORTED_MUTATION_FAILURE | PLAN_INFEASIBLE
- **Current PassCount**: <N> / <SP>
- **Active Roster**: <List of active roles>
- **Highest Modified Tier**: Layer 3.X | None

<!-- When Gate Verdict is PLAN_INFEASIBLE -->
## Technical Impasse Analysis
1. **Insurmountable Technical Barrier(s)**: <Synthesized blocker(s) across reporting roles>
2. **Grounded Empirical Proof**: <Verified evidence/traces>
3. **Trade-Offs & Alternative Architectural Paths**: <Options for user decision>

<!-- For all other verdicts -->
## Reviewer Accounting Rationale (Layer 3.X)
| Role Identifier | Status | Technical Rationale |
| :--- | :---: | :--- |
| `<Role_1>` | TOUCHED | <How applied DA mutations touch this role's contracts, seams, or domain within Highest Modified Tier> |
| `<Role_2>` | UNTOUCHED | <Proof that applied DA mutations introduce zero modifications or regressions relevant to this sibling role's domain> |

## Accepted Issues and Suggestions
<!-- Group by role: ### N. [<Role> Issue:] <Title> or ### N. [<Role> Suggestion:] <Title>. Document every applied suggestion with target section, applied remediation, and rationale. Record *(None - All active roles cleared with zero blocking defects)* if empty. Zero rejected/gated blocking issues. -->

## Rejected Suggestions
<!-- Group by role: ### N. [<Role> Suggestion:] <Title> with technical rejection rationale, or *(None)*. -->
```
