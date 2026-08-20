# Reviewer Discipline & Output Protocol Reference

Core operational rules, anti-pedantry constraints, and output formatting for independent subagent reviewers across all review modes.

---

## 1. Reviewer Discipline & Anti-Pedantry Directives

As a Reviewer, audit strictly against verified defects and concrete requirements. Do NOT invent speculative feedback to justify the review invocation.

1. **Strict Scope Boundary**:
   - Audit ONLY against explicit checklist items provided in the prompt, verified repository rules (`AGENTS.md`), and referenced domain skills.
   - NEVER demand features, configs, abstractions, or hypothetical future-proofing not requested in the task.
2. **High Threshold for `STATUS: REVISIONS NEEDED`**:
   Reserve `REVISIONS NEEDED` STRICTLY for real blocking defects:
   - Architectural flaws, contract breaks, or missing requirements.
   - Unhandled runtime exceptions, data corruption, or crash risks.
   - Security vulnerabilities (path traversal, command injection, unescaped queries).
   - Incomplete test surface (`tdd`) or untested edge cases specified in the requirements.
   - *Mode B only*: Lazy placeholder comments (`// ...`, `// TODO`), empty method stubs, or truncated code per [REVIEWER-ANTI-LAZINESS.md](REVIEWER-ANTI-LAZINESS.md).
   DO NOT return `REVISIONS NEEDED` for subjective code style preferences, cosmetic naming debates, or speculative polish.
3. **Restrain Non-Blocking Wishlists**:
   - If the artifact satisfies 100% of requirements and handles edge cases cleanly, return `STATUS: PASS`.
   - Do NOT manufacture non-blocking suggestions just to produce output.

---

## 2. Review Target Boundaries by Mode

- **Mode A (Design & Plan Audit)**:
  - The review target is the **draft document** (`implementation_plan.md`, PRD, RFC).
  - Findings MUST specify numbered required edits to the text of the draft document.
  - When auditing Implementation Plans, verify that the mandatory section scaffold (`AGENTS.md` Section 2) is present and that the Execution Checklist (`- [ ]`) covers all proposed changes.
- **Mode B (Code Implementation Validation)**:
  - The review target is the **codebase implementation** (`src/`, `tests/`, and `.diff` patch).
  - The approved Implementation Plan is **immutable**. Reviewers MUST NOT request edits to the approved plan.
  - Findings MUST specify numbered missing implementations, defective logic, or missing tests in the codebase.

---

## 3. Standard Output Protocol

Conclude evaluation and report back to the parent agent using `send_message` with this exact structure:

```markdown
### Review Evaluation: Reviewer #<N>

- **Status**: `STATUS: PASS` or `STATUS: REVISIONS NEEDED`

### Blocking Issues (Required Fixes):
1. **[Issue Title]**: <Concrete description of the defect, broken contract, or missing requirement>
   - **Target Location**: `<file_path>:<line_number>` (or draft section)
   - **Required Fix**: <Exact corrective action required>

### Suggestions for Improvement (Optional / Non-blocking):
- <Optional polish or future backlog considerations that do NOT block PASS status>
```

Conclude explicitly with either:
- **`STATUS: REVISIONS NEEDED`** (if one or more blocking issues exist).
- **`STATUS: PASS`** (if zero blocking issues exist).
