---
name: empirical-discovery-loop
description: Use when investigating codebases, datasets, or performance with autonomous discovery and adversarial audit.
---

# Empirical Discovery Loop

Runs an autonomous Explorer-Auditor loop where an Explorer explores ground truth, authors findings, invokes an Adversarial Auditor subagent, and iterates to resolve all claims before delivering a verified result to the Main Agent.

## Directives

1. **Role Separation & Subagent Nesting**: The Main Agent defines and spawns an `explorer` subagent (with `EnableSubagentTools: true` and `EnableWriteTools: true`). The Explorer executes exploration and delegates audit to an independent clean-slate Auditor subagent. The Explorer NEVER self-audits.
2. **Ground-Truth Execution**: NEVER guess deeper dynamics from surface summaries. All claims deeper than surface observations require executable scripts or tests against raw data or runtime systems.
3. **Adversarial Code Audit**: Auditors MUST inspect the explorer's scratch scripts, but MUST NEVER trust them uncritically. Treat the explorer's script as suspect code: audit it line by line for logical bugs, sample leakage, silent data drops (e.g. dropna, unhandled sentinel values), or flawed formulas. The script serves as the primary artifact to explain the exact root cause of any numerical discrepancy.
4. **Three-Way Auditor Dispositions**: For every claim in the draft, the Auditor MUST assign one of three explicit dispositions:
   - `REVISE`: Claim is directionally valid but contains numerical discrepancies, indexing errors, or minor script bugs. Explorer must fix code and update numbers.
   - `REJECT`: Claim must be removed completely. Reasons for rejection: methodologically flawed, duplicated against known baseline context (`<known_baseline>`), or zero practical/operational value towards the objective (`<objective>`) (enforce strictly to eliminate fluff and bloat).
   - `VERIFY`: Claim and its supporting numbers are 100% reproducible against ground truth and provide actionable value towards the objective (`<objective>`).
5. **Hard Completion Gate**: The Explorer MUST NOT declare completion or deliver the finding to the Main Agent while any claim remains in `REVISE` status. Every claim must either be verified or pruned.
6. **All-Rejected Exit Hatch**: If all proposed claims in the draft are rejected by the Auditor (due to invalidity, duplication, or lack of value towards `<objective>`), the Explorer is explicitly authorized to prune the draft and report to the Main Agent: "No new meaningful discoveries found." NEVER invent or retain low-value filler claims to avoid an empty report.

---

## Workflow

```mermaid
flowchart TD
    Start["Main Agent: Assign Investigation (<objective>, <known_baseline>, <target_scope>)"] --> Register["1. Register explorer via define_subagent<br/>(EnableSubagentTools: true, EnableWriteTools: true)"]
    Register --> SpawnExplorer["2. Main Agent invokes explorer"]
    
    subgraph LOOP["Autonomous Explorer-Auditor Loop (Background)"]
        SpawnExplorer --> Explore["3. Explorer explores ground truth & writes .scratch/ scripts"]
        Explore --> Draft["4. Explorer authors draft discovery document"]
        Draft --> SpawnAuditor["5. Explorer invokes clean-slate Auditor via invoke_subagent"]
        SpawnAuditor --> AuditExec["6. Auditor audits code + verifies against ground truth"]
        AuditExec --> AuditVerdict{"Auditor Dispositions?"}
        
        AuditVerdict -->|"Has REVISE claims"| Amend["7. Explorer fixes scripts & updates numbers"] --> SpawnAuditor
        AuditVerdict -->|"Has REJECT claims"| Prune["8. Explorer deletes rejected/bloated claims"] --> CheckRemaining{"Any verified claims left?"}
        
        CheckRemaining -->|"Yes"| AuditVerdict
        CheckRemaining -->|"No (All claims rejected)"| EmptyReport["9. All-Rejected Exit Hatch:<br/>Report 'No new meaningful discoveries found'"]
        AuditVerdict -->|"All claims VERIFIED"| FinalDoc["10. Explorer finalizes verified document"]
    end
    
    FinalDoc --> ReportMain["11. Explorer delivers verified finding to Main Agent"]
    EmptyReport --> ReportMain
```

### 1. Main Agent Track (Task Dispatch)
1. **Define Subagent Type**: If `explorer` is not registered, call `define_subagent`:
   - `Name`: `"explorer"`
   - `Description`: `"Investigator running autonomous exploration and managing adversarial auditing"`
   - `EnableSubagentTools`: `true`
   - `EnableWriteTools`: `true`
2. **Dispatch Explorer**: Invoke `explorer` with Phase 2C Mode 2 prompt: Objective (`<objective>`), Known baseline (`<known_baseline>`), and Target discovery scope (`<target_scope>`).
3. **Await Final Artifact**: The Main Agent remains unpolluted by intermediate scratch scripts and discrepancy discussions, receiving only the final verified document or "no new discoveries" report.

### 2. Explorer Track (Autonomous Loop Host)
1. **Explore Ground Truth**: Write diagnostic scripts in `.scratch/` directly querying raw data or runtime behavior. Avoid speculative deduction when code can be executed.
2. **Draft Finding Document**: Record observations with exact formulas, sample slices, empirical evidence, and operational significance.
3. **Invoke Auditor Subagent**: Invoke an independent `auditor` subagent using Phase 2C Mode 3 format. Pass problem context (`<problem>`), draft document path (`<target_to_audit>`), and ground truth (`<ground_truth>`).
4. **Resolve Claims**:
   - For `REVISE` claims: Inspect code-level root causes flagged by the Auditor, fix the `.scratch/` scripts, recompute verified numbers, and re-invoke Auditor.
   - For `REJECT` claims: Remove them immediately from the finding document.
   - If ALL claims are rejected: Conclude the loop and report to Main Agent: "No new meaningful discoveries found."
   - When all retained claims achieve `VERIFY`: Finalize the document and report completion to the Main Agent.

### 3. Auditor Track (Adversarial Code & Value Audit)
1. **Bilateral Mandate**: Evaluate the Explorer's claims (`<target_to_audit>`) objectively against ground truth (`<ground_truth>`).
2. **Inspect Claims & Code**: Read the draft discovery document to extract claims, formulas, and sample criteria. Inspect the Explorer's scratch scripts in `.scratch/` as suspect code for unintended filters (e.g. silent dropna), unhandled sentinel values, indexing bugs, or formula drift.
3. **Verify Against Ground Truth**: Run tests or independent verification scripts in `.scratch/` directly against ground truth.
4. **Assign Dispositions**: For every individual claim, assign strictly:
   - `REVISE`: Directionally valid, but contains numerical errors or script bugs. Pinpoint the exact line of code causing the discrepancy.
   - `REJECT`: Flawed methodology, duplicated baseline context (`<known_baseline>`), or zero practical value towards objective (`<objective>`). Enforce strictly to prevent bloat.
   - `VERIFY`: 100% reproducible from ground truth and operationally valuable.
5. **Emit Audit Report**: Output table of claims with dispositions, code-level root causes for revisions, and explicit justifications for rejections.

---

## Role Prompts

### Explorer Prompt Pattern (Main Agent to Explorer - Phase 2C Mode 2 Aligned)
```text
You are an Explorer.
Explore target: <data_source_or_subsystem>.
Objective: <problem_objective>.
Known baseline: <known_baseline>.
Target scope: <target_discovery_scope>.
Ground truth: <ground_truth_files_or_entrypoints>.
Output target: <output_doc_path>.
Directives:
- Write and run diagnostic scripts in .scratch/ directly on ground truth.
- Do not stop at surface observations and guess deeper dynamics; all deeper findings require empirical proof from executed scripts or tests.
- "New discoveries" include completely new findings or deeper, unmentioned relationships among known elements.
- Draft your finding document at <output_doc_path>.
- Once drafted, invoke a clean-slate auditor subagent to adversarial-audit your scripts, numbers, and relevance to objective (<problem_objective>).
- Resolution Loop:
  * For claims marked REVISE: fix your scripts and correct numbers.
  * For claims marked REJECT: delete them from the document.
  * Re-invoke auditor until all retained claims are VERIFIED.
  * Exit Hatch: If all proposed claims are REJECTED, report to Main Agent: "No new meaningful discoveries found."
- You MUST NOT report completion with unverified or unrevised claims.
```

### Auditor Prompt Pattern (Explorer to Auditor - Phase 2C Mode 3 Aligned)
```text
You are an Adversarial Audit Specialist.
Objective: <problem_objective>.
Known baseline: <known_baseline>.
Target to audit: <target_document_path>.
Ground truth: <ground_truth_files_or_entrypoints>.
Directives:
- Adversarial Code Audit: Inspect the scratch scripts in .scratch/ to audit implementation logic. Do NOT trust the code uncritically; check for hidden filters, data leakage, silent row drops, unhandled sentinel values, or arithmetic bugs.
- Ground-Truth Verification: Run tests against ground truth to verify numerical claims independently.
- Assign one of three explicit dispositions to EACH claim in <target_document_path>:
  1. REVISE: Valid finding but numbers or code contain errors. Point out exact line of code and mechanism causing discrepancy.
  2. REJECT: Claim is flawed, duplicates known baseline (<known_baseline>), or lacks practical value towards objective (<problem_objective>). Enforce aggressively against bloat.
  3. VERIFY: Claim is 100% reproducible from ground truth and delivers meaningful insight towards objective (<problem_objective>).
- Conclude report with a summary table listing every claim and its status (VERIFY, REVISE, or REJECT).
```
