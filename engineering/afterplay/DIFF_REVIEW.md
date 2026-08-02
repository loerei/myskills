# Per-File Diff Generation & Multi-Subagent Audit

This subdoc defines Phase 4 of the **Afterplay** workflow: generating individual `.diff` files and spawning parallel subagents (1 subagent per diff file).

---

## 1. Per-File `.diff` Generation Protocol

Run `git diff` against the baseline target branch (`origin/trunk` or `origin/main`) for each modified file in the clean goal commit:

```powershell
# Export individual .diff files into brain artifact directory
git diff origin/trunk clean-tag -- path/to/File1.java > "<appDataDir>\brain\<conversation-id>\File1.java.diff"
git diff origin/trunk clean-tag -- path/to/File2.xml > "<appDataDir>\brain\<conversation-id>\File2.xml.diff"
```

---

## 2. Multi-Subagent Spawning Template

Spawn $N$ subagents concurrently using `invoke_subagent` (where $N$ = number of modified diff files).

### Context Package Provided to Each Subagent:
1. Absolute path to assigned `.diff` file.
2. Full codebase access (`file://`).
3. Performance Win / Goal context (quantified baseline).
4. Bug behavior context (observed symptoms, reproduction steps).

### Subagent Submittal Schema:
Each subagent MUST answer 3 explicit questions:
1. **Scope of Changes**: What exact changes are inside this assigned `.diff`?
2. **Performance/Goal Criticality**: How critical are these changes to the performance win? Can they be reverted without losing performance? (Include Confidence Level 0-100%).
3. **Bug Cause Classification**: Does this diff contain the root cause of the bug? Classify into Type 0-3 (see [`CONFIDENCE_VOTE.md`](CONFIDENCE_VOTE.md)) with Confidence Level (0-100%).
