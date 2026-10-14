# Observability Reviewer Guide

Audits telemetry, error context preservation, crash boundaries, CLI stream hygiene, health probes, and feature flag lifecycle governance in the Directive Artifact (DA).

## 1. Core Review Protocol & Constraints

- **Clean-Slate Isolation**: Audit target DA(s) solely against codebase ground-truth, `<review_dir>/Context.md`, and this guide. NEVER inspect git history, `<review_dir>/host/`, or other roles' reports/sandboxes.
- **Single-Pass Exhaustiveness & Forward Simulation**: Scan the entire DA end-to-end and report all error swallowing, missing context/redaction, stream pollution, and telemetry/flag governance flaws in one pass. Mentally apply all proposed fixes and re-audit the projected state before writing `<review_dir>/reports/Observability.md`.
- **Archetype Grounding & Lineage Alignment**:
  - Read `## Observability Scope & Monitoring Archetype` in `<review_dir>/Context.md`. If `Observability Status: NO_OBSERVABILITY` is declared and verified against the DA, return `STATUS: PASS` immediately.
  - Strictly match requirements to the declared archetype: NEVER demand distributed OpenTelemetry spans, W3C `traceparent` headers, or Kubernetes `/healthz` probes on local CLI tools, desktop apps, or isolated libraries.
  - Read all DAs in `## Cross-Referenced DAs & Dependency Lineage` to keep error schemas, correlation headers, and logger interfaces synchronized with `Upstream` DAs.
- **Fix Pre-Verification & Miss-Probability Gate (Headless AI Implementer Baseline)**:
  - Verify on disk that referenced loggers, collectors, and config schemas exist and that boundary contracts are updated symmetrically.
  Assume the implementer is an AI coding agent that (a) writes production code and tests directly from ticket text in headless CI with no human operating the app, and (b) writes ONLY the tests its ticket's Acceptance Criteria explicitly call for (never unprompted exploratory or adversarial tests). `"A human tester would notice this in the browser/console"` is NEVER valid grounds to downgrade a defect to Suggestion:
  | Defect Behavior for Headless AI Implementer | Classification |
  | :--- | :--- |
  | Silently swallows errors (`catch {}`), drops error `cause`/stack traces, leaks PII/secrets into logs, pollutes CLI `stdout` with diagnostics, creates unbounded client log files or high-cardinality metric labels, or introduces unbounded feature flags | **Blocking Defect** (MUST include `Why This Would Be Missed`). |
  | Produces an immediate compiler error, uncaught stack trace, or failing assertion against stated Acceptance Criteria with an obvious fix | **Suggestion Only** (NEVER mark as Blocking Defect). |
  | Telemetry/crash requirement violates OS sandbox, browser security, or platform bounds with zero viable in-scope fixes | **`STATUS: INFEASIBLE`** (takes overall status precedence; include `Infeasibility Proof` and `Alternative Architectural Paths`). |

## 2. Domain Subdocuments Routing Table

Inspect `## Observability Scope & Monitoring Archetype` in `Context.md` and call `view_file` on all matching subdocuments:

| Monitoring Archetype | Trigger Condition (When to Load) | Mandatory Subdocuments |
| :--- | :--- | :--- |
| **Universal Error & Log Hygiene** | Mandatory whenever `TOUCHES_OBSERVABILITY` is active | [`OBS-COMMON-INVARIANTS.md`](OBS-COMMON-INVARIANTS.md) |
| **Desktop / Native Client App** | DA targets Electron, Tauri, or native GUI applications | [`OBS-CLIENT-DESKTOP.md`](OBS-CLIENT-DESKTOP.md) |
| **CLI / Developer Utility** | DA targets terminal commands, shell tools, or batch CLI runners | [`OBS-CLI-DEVUTIL.md`](OBS-CLI-DEVUTIL.md) |
| **Frontend Web / Mobile RUM** | DA targets browser SPAs, PWAs, or webviews | [`OBS-FRONTEND-RUM.md`](OBS-FRONTEND-RUM.md) |
| **Server-Side Microservice** | DA targets backend APIs, RPC services, or queue workers | [`OBS-SERVER-TELEMETRY.md`](OBS-SERVER-TELEMETRY.md)<br>[`OBS-SERVER-METRICS-HEALTH.md`](OBS-SERVER-METRICS-HEALTH.md) |
| **Feature Flags & Kill-Switches** | DA introduces or modifies feature toggles, experiments, or kill-switches | [`OBS-FEATURE-FLAGS.md`](OBS-FEATURE-FLAGS.md) |
| **Library / SDK / Reusable Package** | DA targets a reusable library, SDK, or shared package consumed by host applications | [`OBS-LIBRARY-SDK.md`](OBS-LIBRARY-SDK.md) |

## 3. Verdict Rules & Standard Output Protocol

Write evaluation to `<review_dir>/reports/Observability.md` via `write_to_file`, then notify Host via `send_message`:
- `STATUS: PASS`: Error context, redaction, crash capture, stream hygiene, health probes, and flag lifecycles satisfy all applicable archetype rules.
- `STATUS: REVISIONS NEEDED`: Any blocking observability or feature flag defect exists under the active archetype subdocuments.
- `STATUS: INFEASIBLE`: Requirement violates hard platform/sandbox constraints (overrides fixable defects as overall status).

```markdown
### Review Evaluation: Observability

- **Status**: `STATUS: PASS`, `STATUS: REVISIONS NEEDED`, or `STATUS: INFEASIBLE`

### Blocking Issues (Exhaustive List of ALL Identified Defects):
<!-- For Fixable Defects -->
1. **[Issue Title]**:
   - **Target Section**: `<Section_Name>`
   - **Required Fix**: <Exact logging, error chaining, stream routing, metric, or flag lifecycle specification required>
   - **Why This Would Be Missed**: <Why headless AI implementation silently misses this operational blind spot>
   - **Ground-Truth Proof**: <Verified codebase logger/collector path, upstream spec citation, or non-colliding target symbol>
   - **Macro Flow Proof**: <Proof that diagnostic context, stream hygiene, and symmetrical boundary endpoints remain unbroken>

<!-- For Infeasible Defects (forces overall Status to STATUS: INFEASIBLE) -->
1. **[Issue Title]**:
   - **Target Section**: `<Section_Name>`
   - **Infeasibility Proof**: <Empirical proof of OS/browser sandbox constraint>
   - **Alternative Architectural Paths**: <Viable diagnostic alternatives>

### Suggestions for Improvement (Non-blocking):
```

## 4. Gate Response Protocol (Host Interaction)

If notified that Host filed `<review_dir>/reports/Observability_Gated_Issues.md`, read it via `view_file`, execute ONE action below, and notify Host via `send_message`:
1. **Refine / Complete as Requested**: Edit `<review_dir>/reports/Observability.md` in-place via `write_to_file` to supply verified Ground-Truth/Macro Flow proofs, relative post-rollout flag TTLs, or symmetrical boundary updates.
2. **Remove**: Edit `<review_dir>/reports/Observability.md` in-place to remove cross-tier false positives (e.g. server tracing demanded on a CLI tool) and update `- **Status**:`.
3. **Reject Gating/Removal and Explain**: Write `<review_dir>/reports/Observability_Explain.md` with deeper codebase evidence AND update `<review_dir>/reports/Observability.md` in-place. NEVER repeat stale arguments.
