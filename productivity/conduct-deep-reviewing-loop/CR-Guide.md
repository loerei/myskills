# Cross-Review Guide

Domain cross-review protocol for validating `<AuthorRole>`'s proposed remediation before Directive Artifact (DA) mutation.

## 1. Precedence & Isolation Protocol

- **Guide Override Precedence**: This guide strictly overrides `<CrossReviewerRole>-REVIEWER-GUIDE.md` §1 (`Protocol`), §4 (`Verdict Rules`), and §5 (`Gate Response`). Use `<CrossReviewerRole>-REVIEWER-GUIDE.md` **solely** for its §2 Audit Checklist and §3 Domain Subdocuments Routing Table.
- **Execution Sequence**: Read in order: (1) this `CR-Guide.md`, (2) `Domain Context` (`Context.md`), (3) `Target Remediation` (`<review_dir>/reports/<AuthorRole>.md`), (4) `Domain Guide` (`<CrossReviewerRole>-REVIEWER-GUIDE.md`) and ONLY matching §3 domain subdocuments via your native file-reading tool.
- **Clean-Slate Isolation**: Inspect ONLY `Context.md`, `Target Remediation`, `Target DA(s)` (plus declared `Upstream` DAs), relevant codebase files/configs/fixtures on disk, and matching guides. NEVER inspect `<review_dir>/host/` or other roles' reports/sandboxes. Run temporary verification probes ONLY inside `Sandbox Directory`; write final evaluation directly via your native file-writing tool.
- **Disk Ground-Truth Pre-Verification**: Before raising any blocking requirement or advisory suggestion, verify all referenced APIs, file paths, module symbols, adjacent test fixtures, and toolchain/runner configs directly on disk. NEVER assert unverified paths or behavior from memory.

## 2. Scope Constraint & Wave Modes

Audit `<AuthorRole>`'s remediation ONLY against your domain standards for the areas modified or introduced by that remediation. NEVER perform a full audit of unrelated DA sections or surface pre-existing DA defects outside `<AuthorRole>`'s remediation scope.

| `CR Wave Mode` | Required Audit Scope |
| :--- | :--- |
| `INITIAL_AUDIT` | Validate `<AuthorRole>`'s proposed remediation `R` against all domain boundaries and contracts affected by `R`. |
| `DELTA_RECHECK` | Audit ONLY newly incorporated deltas in `<AuthorRole>.md` since the prior wave and their direct cross-domain effects. NEVER reopen unchanged sections of `R` unless directly invalidated by the new delta. |

- **Self-Review Exception (`<CrossReviewerRole> == <AuthorRole>`)**: Gate ONLY patch-induced regressions or broken invariants introduced by `R` itself, never alternative stylistic preferences when `R` already resolves the defect.

## 3. Monotonic Convergence Gate (`Blocking` vs. `Suggestion`)

Classify every valid cross-review finding `F` targeting `<AuthorRole>`'s remediation `R` strictly by **Monotonic Convergence**:

- **Blocking Issue (`CROSS-GATED`)**: `R` breaks cross-domain or upstream/downstream contracts, introduces an unfeasible or contradictory spec state, or violates domain/architectural invariants in a way that would require discarding, reverting, or redesigning `R` in a subsequent audit (or, when `<CrossReviewerRole>` matches `<AuthorRole>`, introduces patch-induced regressions silently breaking `R`'s domain boundary).
- **Suggestion (`CROSS-PASSED-WITH-SUGGESTIONS` if zero Blocking Issues remain)**: `R`'s structural approach and contracts monotonically converge with your domain standards, and `F` is strictly an additive guard, local edge-case refinement, or mechanical test/spec clarification that layers onto `R` without rewriting `R`'s structure or contracts.

## 4. Verdict Rules, Output Schema & Completion

| Condition | Output Verdict |
| :--- | :--- |
| `0` Blocking Issues AND `0` Suggestions | `CROSS-PASSED` |
| `0` Blocking Issues AND `>= 1` Suggestions | `CROSS-PASSED-WITH-SUGGESTIONS` |
| `>= 1` Blocking Issues (with or without Suggestions) | `CROSS-GATED` |

Write evaluation directly to `Output Path` (`<review_dir>/reports/<AuthorRole>-CR-<CrossReviewerRole>.md`) via your native file-writing tool (never helper scripts):

```markdown
# Cross-Review: <AuthorRole> Remediation
- **Cross-Reviewer**: <CrossReviewerRole>
- **Verdict**: CROSS-PASSED | CROSS-PASSED-WITH-SUGGESTIONS | CROSS-GATED

## Cross-Gated Requirements
<!-- Include ONLY when Verdict is CROSS-GATED (1+ Blocking Issues) -->
1. **[Requirement Title]**:
   - **Affected Remediation Section**: <Section/Issue in AuthorRole.md>
   - **Domain Standard**: <Specific checklist item or subdocument invariant violated>
   - **Proof**: <Verified file:line, symbol, config, or contract boundary proving non-monotonic divergence>
   - **Required Specification**: <Concrete interface, invariant, or spec text AuthorRole must incorporate>

## Advisory Suggestions
<!-- Include ONLY when 1+ Suggestions exist (present on CROSS-PASSED-WITH-SUGGESTIONS, or alongside Cross-Gated Requirements) -->
1. **[Suggestion Title]**:
   - **Affected Remediation Section**: <Section/Issue in AuthorRole.md>
   - **Rationale & Verification Proof**: <Additive improvement and verified codebase/test evidence>
   - **Suggested Refinement**: <Concrete additive code, assertion, or wording AuthorRole may apply cleanly>
```

Upon writing `Output Path`, notify Host via `send_message` with the exact text:
`"CR-COMPLETE <VERDICT>: <AuthorRole>-CR-<CrossReviewerRole>"` (where `<VERDICT>` is `CROSS-PASSED`, `CROSS-PASSED-WITH-SUGGESTIONS`, or `CROSS-GATED`).
