# System Protocol & Anti-Anchoring Specifications

Rules governing execution, context isolation, invalidation routing, and artifact updates in `conduct-deep-reviewing-loop`.

## 1. Clean & Neutral Artifact Protocol (Anti-Anchoring)

When updating draft artifacts between iterations, integrate fixes directly into the specification as native first-class requirements.

### DA Sanitization Checklist (Before Invoking Reviewers)
- [ ] Strip review-iteration delta markers (e.g. `[UPDATED]`, `[FIXED]`, `[ADDED IN ROUND N]`, `[RESOLVED]`). Preserve standard `AGENTS.md` plan action tags (`[NEW]`, `[MODIFY]`, `[DELETE]`).
- [ ] Remove internal changelogs, version history tables (`v1.x`), or review feedback references.
- [ ] Normalize tone and detail level across all sections to eliminate defensive patching markers.

## 2. Workspace Air-Gap & Context Freezing Protocol

### Workspace Layout
```text
<repo-root>/.scratch/deep-review/
├── host/                    # [HOST ONLY] Coordination artifacts (hidden from reviewers)
│   ├── Analyzation.md
│   ├── Changelog.md
│   ├── Reviewer_Choice_Rationale.md
│   └── Untouched_Reviewers.md
├── Context.md               # [PUBLIC] Initialized by Layer 1 (DA path, rules, criteria, static SP)
└── reports/                 # [REVIEWER OUTPUTS & GATING] Purged at pass starts; in-place sanitized
    ├── <Role>.md            # Initial reviewer report & in-place sanitized report
    ├── <Role>_Gated_Issues.md # Host gated issues (demands sanitization/removal without suggestions)
    └── <Role>_Explain.md    # Reviewer explanation with deeper/differing proof (if rejecting gate)

<repo-root>/.scratch/        # [DIAGNOSTIC SANDBOX] Inline probes & shadow modules (.scratch/<action>_<role>_*, .scratch/shadow_*)
```

Reviewers MUST read only their assigned target DA and `.scratch/deep-review/Context.md`. Reviewers MUST NOT inspect `.scratch/deep-review/host/` or reports of other reviewers.

### File Authoring Protocol
Reviewers and Host MUST use native `write_to_file` directly (without `ArtifactMetadata`) for all file creations (`.scratch/` probe scripts, `.scratch/deep-review/reports/<Role>.md`, `.scratch/deep-review/host/*.md`). Creating intermediate helper scripts (e.g. `write_report.cjs`, `.js`, `.ps1`) or embedding multi-line code inside `run_command` inline strings (`node -e`, `python -c`, `echo`, `pwsh`) to author text files is strictly prohibited.

Layer 1 initializes `.scratch/deep-review/Context.md` at workflow start. Context files MUST remain frozen during active reviewer execution.

### Context Content Rules

- **MUST Include**:
  - Target DA path.
  - Cross-Referenced DAs & Dependency Lineage table:
    ```markdown
    ## Cross-Referenced DAs & Dependency Lineage
    | DA Path | Lineage Direction | Codebase Status | Domain Boundary & Contract Responsibility |
    | :--- | :---: | :---: | :--- |
    | `<path-to-da>` | `Upstream` \| `Downstream` | `Implemented` \| `Unimplemented` | <Explicit responsibility boundary> |
    ```
  - Codebase rules path (`AGENTS.md`).
  - Task domain skill paths.
  - Objective user criteria.
  - Static `SP` threshold.
- **MUST NOT Include**: Leading prompt questions, past reviewer scores, historical changelogs, or dynamic execution state (active round numbers, iteration counts, or current `PassCount`).

### Cross-Referenced DA & Dependency Lineage Semantics
When evaluating a target DA with cross-referenced dependencies, reviewers MUST strictly follow these invariant semantics:
1. **`Upstream` + `Implemented`**: The existing codebase on disk is the authoritative ground-truth. The target DA must cleanly integrate with existing implementations.
2. **`Upstream` + `Unimplemented` (Authoritative Future Baseline)**: Reviewers MUST read the upstream DA and treat its declared types, schemas, and seams as the authoritative future baseline:
   - **Anti-Bloat**: The target DA MUST NOT re-specify, duplicate, or expand features belonging to the upstream DA.
   - **Anti-Drift**: The target DA MUST strictly adhere to the data structures, types, and seams defined in the upstream DA without contradiction or incompatible divergence.
   - **Anti-False-Positive**: Reviewers MUST NOT flag missing codebase files or unimplemented methods as readiness/liveness defects if they are explicitly scheduled to be created by the upstream DA.
3. **`Downstream` + `Unimplemented`**: The target DA must expose clean extension points and domain seams, but MUST NOT be tightly coupled to or leak domain-specific logic of future downstream epics.

## 3. Invariant Reviewer Invocation Protocol

Host MUST summon Layer 3 subagents using this exact invariant template across all rounds:

```text
You are the <Role> Reviewer for Directive Artifact verification.
Target DA: <da_path>
Domain Context: .scratch/deep-review/Context.md
Review Guide: <guide_path>
Output Path: .scratch/deep-review/reports/<Role>.md

Audit the target document objectively from a clean-slate perspective. Follow your Review Guide and any domain subdocuments referenced within it strictly.
```

- `<guide_path>` MUST be resolved dynamically relative to the active skill location (`.agents/skills/conduct-deep-reviewing-loop/<Role>-REVIEWER-GUIDE.md` in distributed projects or `productivity/conduct-deep-reviewing-loop/<Role>-REVIEWER-GUIDE.md` in central `myskills`).
- **Subdocument Progressive Disclosure**: Host passes only the primary `<Role>-REVIEWER-GUIDE.md` path. Reviewers autonomously load domain subdocuments referenced in their guide's routing table as needed via `view_file`.
- **Tool Metadata Rule**: Host MUST specify neutral tool metadata (`toolAction: "Summoning reviewer"`, `toolSummary: "Domain review"`) to prevent leaking phase/round names in subagent tool logs.
- **Banned Calling Tokens**: `Round`, `Sweep`, `Targeted`, `Re-verify`, `Re-audit`, `Fix`, `Pass`, `Iteration`, `Previous round`.

## 4. Dynamic Role Selection Protocol

Before launching Round 1, Layer 2 Host inspects target DA scope and criteria, then writes `.scratch/deep-review/host/Reviewer_Choice_Rationale.md`.

### Selection Rules:
1. **Mandatory Core Roles**: `Architect` (Tier 3.1) and `Logic` (Tier 3.3) MUST ALWAYS be `INCLUDED` for every DA and cannot be excluded.
2. **Specialist Roles (Dynamic)**: `Readiness`, `Security`, `DataMigration`, `Testability`, `Progress`, `Edgecase`, `Performance`, `Observability`, `UXUI` are marked `INCLUDED` or `EXCLUDED` with concrete technical justification based on DA scope (`Progress` MUST be `INCLUDED` for multi-phase/multi-ticket epics, roadmaps, or work-breakdown structures; `EXCLUDED` for single-ticket/simple plans).
3. **Roster Immutability**: If `.scratch/deep-review/host/Reviewer_Choice_Rationale.md` exists (Round N+1), Host loads and preserves the active roster without re-evaluating exclusions.
4. **Active Roster**: Only `INCLUDED` roles are summoned during DAG execution passes and Full Sweep rounds.

## 5. Dynamic DAG Execution Sequence

Host executes Layer 3 reviewers in dependency order across the active selected roster:

| DAG Tier | Role | Prerequisite |
| :--- | :--- | :--- |
| **Layer 3.1** | `Architect` *(Mandatory Core)*, `Progress` | None |
| **Layer 3.2** | `Readiness`, `Security`, `DataMigration`, `Testability` | Layer 3.1 PASS |
| **Layer 3.3** | `Logic` *(Mandatory Core)*, `Edgecase`, `Performance`, `Observability` | Layer 3.2 PASS |
| **Layer 3.4** | `UXUI` | Layer 3.3 PASS |

### Vacuous Tier Transition Rule
If all roles in a DAG tier are `EXCLUDED`, Host treats that tier as vacuously passed and immediately advances to the next tier.

### Tier Batch Gate & Reviewer Negotiation Rule
Within each active DAG tier, Host coordinates reviewers strictly in **tier batches**:
- **Subagent Lifecycle Preservation & Process Teardown**: Host MUST NOT terminate reviewer subagents upon receiving their initial reports. Reviewer subagents must remain alive in the `idle` state throughout active tier batch negotiation so that `send_message` reaches the existing reviewer conversation. Once a tier batch is fully resolved (all roles are accepted as PASS, accepted as blocking REVISIONS NEEDED, or removed/sanitized), Host MUST terminate that tier's reviewer subagents via process control (`manage_subagents` with Action: `kill`) before advancing to the next tier (or triggering early suspension if any role retains accepted blocking defects).
1. Host summons active roles for the current tier batch in a single wave (simultaneously dispatching parallel roles via a single `invoke_subagent` call), initializes `PendingTierRoles` containing all active roles in the tier, and arms a 180s liveness check timer via `schedule(DurationSeconds=180, Prompt="Check on reviewers liveness", TimerCondition="any")`. Upon receiving a completion message from a reviewer, Host removes that reviewer from `PendingTierRoles`. If `PendingTierRoles` is non-empty, Host re-arms the 180s liveness check timer, does NOT inspect reports on disk or advance to gating evaluation, and ends its turn to continue waiting. Only when `PendingTierRoles` is empty does Host proceed to evaluate reports across the tier batch.
2. Host marks any issues lacking proofs, citing non-existent APIs, breaking macro flow, or constituting invalid defects as GATED. For all roles with gated issues, Host initializes `PendingGatedRoles`, authors `.scratch/deep-review/reports/<Role>_Gated_Issues.md` simultaneously, placing a single top-level `## Required Reviewer Action` section at the top of the file without repeating action choices per issue, demanding sanitization or removal without suggesting solutions, notifies them via `send_message`, and arms a 180s liveness check timer via `schedule(DurationSeconds=180, Prompt="Check on gated reviewers liveness", TimerCondition="any")`. Fully accepted roles are not messaged.
3. Gated reviewers respond by either:
   - Sanitizing `<Role>.md` in-place (stripping invalid snippets, providing abstract specs and verified proofs). If `.scratch/deep-review/reports/<Role>_Explain.md` was authored in a prior turn of the active tier batch, reviewer MUST invalidate it (either by deleting it, or by overwriting it with empty content via `write_to_file(CodeContent="")` if native file deletion tools are unavailable) to eliminate stale defense artifacts; Host handles authoritative physical file removal upon accepting the updated report.
   - Removing invalid defects in-place (changing verdict to `STATUS: PASS` if all blocking issues are removed). If `.scratch/deep-review/reports/<Role>_Explain.md` was authored in a prior turn of the active tier batch, reviewer MUST invalidate it (either by deleting it, or by overwriting it with empty content via `write_to_file(CodeContent="")` if native file deletion tools are unavailable) to eliminate stale defense artifacts; Host handles authoritative physical file removal upon accepting the updated report.
   - Rejecting the gate and providing deeper/differing proof in `.scratch/deep-review/reports/<Role>_Explain.md` AND updating `.scratch/deep-review/reports/<Role>.md` in-place with substantiated proofs and clean remediation text, preserving `<Role>.md` as the clean single source of truth.
   Upon receiving a completion message, Host removes that reviewer from `PendingGatedRoles`. If `PendingGatedRoles` is non-empty, Host re-arms the 180s liveness check timer via `schedule(DurationSeconds=180, Prompt="Check on gated reviewers liveness", TimerCondition="any")`, does NOT inspect `<Role>.md` reports on disk or trigger re-gating, and ends its turn to continue waiting for remaining subagents. If a gated reviewer is unresponsive or errored, Host terminates and respawns that specific reviewer, resetting its pending wait state; upon respawning, Host MUST immediately dispatch the gating notification message via `send_message` to the newly spawned subagent conversation ID (directing it to `.scratch/deep-review/reports/<Role>_Gated_Issues.md` and instructing it to apply the Gate Response Protocol). Only when `PendingGatedRoles` is empty does Host re-evaluate reports. When Host accepts an updated role report, Host deletes `.scratch/deep-review/reports/<Role>_Gated_Issues.md` and any `.scratch/deep-review/reports/<Role>_Explain.md` for that role (if present, idempotently handling missing files).
4. Host re-evaluates. If an issue remains ungrounded or explanation in `<Role>_Explain.md` is stale without differing/deeper evidence, reviewer MUST either accept removal or sanitize the issue into an abstract specification; reviewer MUST NOT re-assert stale arguments. Host gates again until resolved:
   - Host updates `.scratch/deep-review/reports/<Role>_Gated_Issues.md` via `write_to_file` detailing why the previous explanation was rejected as stale and reiterating the demand for removal or abstract specification sanitization.
   - Host re-populates `PendingGatedRoles` with the subset of roles being re-gated.
   - Host sends notification messages to those specific re-gated reviewers via `send_message`.
   - Host re-arms the 180s liveness check timer via `schedule(DurationSeconds=180, Prompt="Check on gated reviewers liveness", TimerCondition="any")`.
   - Host ends its turn to await reactive wakeup messages from the re-gated reviewers before re-evaluating.
   Once all roles in the tier batch are resolved, Host terminates that tier's reviewer subagents via process control (`manage_subagents` with Action: `kill`) and advances to the next tier (or triggers early suspension if any role retains accepted blocking defects).

If any layer returns `REVISION NEEDED` after tier batch gate resolution (i.e. if any active role in the resolved tier retains accepted blocking defects), terminate all remaining active reviewer subagents via process control (`manage_subagents` with Action: `kill`), cancel remaining downstream layers for the current round, and transition directly to Step 7 (Reporting & Final Teardown).

## 6. Invalidation Matrix & Targeted Re-Review

When Layer 1 applies `Changelog.md` edits, the Directive Artifact transitions to a new static snapshot $S_N$. The smallest scheduling unit is the **individual Reviewer**:
1. Host identifies the highest modified DAG tier and its downstream tiers.
2. Host loads `.scratch/deep-review/host/Untouched_Reviewers.md` (emitted by Host Round N) and filters out all untouched reviewers from the immediate pass.
3. Host summons only the affected reviewers in topological DAG sequence, while registering untouched reviewers into the pending backfill queue for snapshot $S_N$:

| Highest Modified Tier | Targeted Roles Run on Snapshot $S_N$ | Skipped Roles Pending Backfill (Upstream + Untouched) |
| :--- | :--- | :--- |
| **Layer 3.1 (Architectural & Phasing)** | Active 3.1 to 3.4 Roles $\setminus$ `Untouched_Reviewers` | Untouched 3.1 to 3.4 Roles |
| **Layer 3.2 (Readiness / Security / DataMigration / Testability)** | Active 3.2 to 3.4 Roles $\setminus$ `Untouched_Reviewers` | Active Layer 3.1 Roles + Untouched 3.2-3.4 Roles |
| **Layer 3.3 (Logic / Edgecase / Performance / Observability)** | Active 3.3 to 3.4 Roles $\setminus$ `Untouched_Reviewers` | Active Layer 3.1 & 3.2 Roles + Untouched 3.3-3.4 Roles |
| **Layer 3.4 (UX/UI)** | Active 3.4 Roles $\setminus$ `Untouched_Reviewers` | Active Layer 3.1 to 3.3 Roles + Untouched 3.4 Roles |

## 7. Snapshot Delta Backfill & Full Sweep Clearance Gate

To prevent redundant subagent invocations on identical static snapshots while preserving strict 100% roster audit coverage:

- **Targeted Pass Verification**: When all active targeted roles return `PASS` on snapshot $S_N$, Host identifies any active roles in the frozen roster that have **not yet audited snapshot $S_N$** (the union of skipped upstream roles and untouched reviewers).
- **Snapshot Delta Backfill**:
  - If skipped roles exist (upstream or untouched): Host executes all skipped roles in **topological DAG dependency sequence** (Layer 3.1 -> 3.2 -> 3.3 -> 3.4), writing reports into `.scratch/deep-review/reports/` (preserving intra-round targeted reports on snapshot $S_N$) and enforcing early tier suspension if any role returns `REVISION NEEDED`.
  - If no skipped roles exist (i.e. 100% of active roster executed and passed on snapshot $S_N$): The round is **natively recognized as a Full Sweep pass**.
- **Full Sweep Pass (`ROUND_PASS`)**: Once 100% of active roles in the frozen roster have audited and passed snapshot $S_N$ with zero blocking issues:
  - Increments `PassCount` by 1.
  - If `PassCount < SP`: Host transitions directly to Step 7, authors `.scratch/deep-review/host/Analyzation.md` with `- **Gate Verdict**: ROUND_PASS` and `- **Current PassCount**: <N> / <SP>`, terminates active reviewer subagents via process control (`manage_subagents(kill)`), purges `.scratch/deep-review/reports/` and transient gating artifacts (if present, idempotently handling missing files) while strictly preserving `host/Analyzation.md` intact for Layer 1 handoff, and concludes execution. Layer 1 reads `ROUND_PASS` and re-spawns Host for the next Full Sweep round on the unchanged static DA with a clean context window per `SKILL.md` Step 3.
  - If `PassCount >= SP`: Host issues `FINAL_PASS`, terminates reviewer subagents via `manage_subagents(kill)`, purges `.scratch/deep-review/reports/` and transient gating artifacts (if present, idempotently handling missing files) while strictly preserving `.scratch/deep-review/host/Analyzation.md` intact, and hands off to Layer 1. Layer 1 Main Agent reads `Analyzation.md`, presents the verified final Directive Artifact to the user, and executes the final scoped purge of `<repo-root>/.scratch/deep-review/*`.
- **Pass Counter Invalidation**: `PassCount` resets to 0 whenever any role returns `REVISION NEEDED`.

## 8. Modifier Commands Matrix

| Tag | Parameter | Timing | System Behavior |
| :--- | :--- | :--- | :--- |
| `!SP<N>` | N (Integer >= 1) | Start-time | Sets required continuous Full Sweep PASS threshold `SP = N`. |
| `!PA` / `!WA` | None | Start-time / Mid-flight | Pre-mutation pause gate: When Host issues `ROUND_REVISION_NEEDED`, Main Agent stops immediately before modifying DA files, prompts user to verify API quota, and awaits keyword `"C"` to apply `Changelog.md` edits (synchronizing `Context.md` if DA tree changed) and proceed to Round N+1. Remains persistent across all rounds until `FINAL_PASS`. |
| `!FPA` | None | Mid-flight | Instantly kills running subagent via process control, discards outputs, pauses loop. |
