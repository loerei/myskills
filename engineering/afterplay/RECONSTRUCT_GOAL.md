# Reconstruct Goal & Tagging Baseline

This subdoc defines Phase 1 of the **Afterplay** workflow: isolating the prototype's reference state, setting up git tags, and establishing quantifiable goal metrics.

---

## 1. Objectives

1. Preserve the dirty prototype state in an independent reference directory or worktree.
2. Establish clean baseline git tags for both the dirty prototype and the clean target branch.
3. Record exact goal metrics (e.g. typing latency drop from ~80ms to ~30ms at 100k character offset).

---

## 2. Git Tagging Conventions

| State | Tag Naming Convention | Example Tag Name |
| :--- | :--- | :--- |
| **Dirty Prototype State** | `dirty-code-<goal-status>-but-<bug-symptom>` | `dirty-code-perf-is-perfect-but-scrolling-doesnt-work` |
| **Clean Extracted State** | `clean-code-<goal-status>-but-<bug-symptom>` | `clean-code-perf-is-perfect-but-scrolling-doesnt-work` |
| **Dev Bypass / Test Only** | `<feature>-bypass-for-test-do-not-take-into-production` | `login-bypass-for-test-do-not-take-into-production` |

---

## 3. Environment Setup & Verification

1. **Create Reference Worktree / Repo**:
   ```bash
   git worktree add ../<repo-name>-architecture <dirty-branch>
   ```
2. **Tag Reference State**:
   ```bash
   git tag -a "dirty-code-perf-is-perfect-but-scrolling-doesnt-work" -m "dirty reference baseline"
   git push origin "dirty-code-perf-is-perfect-but-scrolling-doesnt-work"
   ```
3. **Verify Baseline Metrics**:
   - Run benchmark/profiling tool (Logcat, Chrome DevTools, test runner).
   - Document quantitative baseline in `<appDataDir>\brain\<conversation-id>\RATIONALE.md`.
