# Reference: Subagent Prompt Templates, Schemas & Output Formats

This reference document contains heavy templates, prompt schemas, and JSON output formats used during Phase 5 (Per-File Diff & Multi-Subagent Audit) and Phase 6 (Confidence Voting & Synthesis) of the **Afterplay** workflow.

---

## 1. Subagent Prompt & Context Package Templates

### Standard Full Audit Prompt Template:
Use this ready-to-use prompt template when spawning per-file diff review subagents via `invoke_subagent` in Phase 5:

```markdown
You are assigned to deeply analyze the diff file:
Diff file: <appDataDir>\brain\<conversation-id>\<filename>.diff
Target file: <absolute_path_to_source_file>

Context:
1. Prototype Goal: <quantified_goal_metrics_feature_perf_bugfix>
   (If !GPR was invoked, read Goal details directly from: <appDataDir>\brain\<conversation-id>\PR.md)
2. Bug behavior / Symptoms: <observed_symptoms_and_reproduction_steps>

You have permission to read all diffs and source files in the codebase using view_file / jcodemunch.
If <appDataDir>\brain\<conversation-id>\PR.md exists, YOU MUST read PR.md using view_file to understand the exact Goal specifications and benchmarks.

Answer these 3 questions in detail:
1. What exact changes are in <filename>.diff?
2. How critical are these changes to achieving the Goal defined in PR.md / Goal Context? (Could this change be reverted/discarded without degrading the Goal?) Include confidence level (0-100%).
3. Does this diff contain the root cause of the bug or non-goal code? Select the exact category:
   - Type 0 (Clean / Clear): Changes are completely unrelated to the reported bug and contribute to Goal.
   - Type 1 (Missing Code): Bug occurs because new code for the Goal feature is missing (existing code is fine).
   - Type 2 (Existing Code Bug): Bug in pre-existing code that is required for the Goal.
   - Type 3 (Both): Bug caused by pre-existing code defect AND missing code for Goal.
   - Type U (Unrelated to Goal): Code does not contribute to Goal (accidental prototype bloat / dead code).
   - Type 2U (Unrelated Buggy Code): Bug is in pre-existing or prototype code that is unrelated to and does not contribute to Goal (action: strip/discard, do NOT fix).
   Include confidence level (0-100%). Optionally point to any other diff file if relevant.
```

### `!HU` (Bloat Hunter Pass) Specialized Prompt Template:
Use this lightweight prompt template when the user invokes `!HU`:

```markdown
You are assigned to run a fast BLOAT HUNT pass on:
Diff file: <appDataDir>\brain\<conversation-id>\<filename>.diff
Target file: <absolute_path_to_source_file>

Context:
Prototype Goal: <quantified_goal_metrics_feature_perf_bugfix>
(If PR.md exists at <appDataDir>\brain\<conversation-id>\PR.md, READ PR.md via view_file).

Primary Focus: Focus strictly on identifying whether this diff is Type U (Unrelated to Goal) or Type 2U (Unrelated Buggy Code) that can be stripped immediately.

Answer:
1. Is this diff strictly required for the Goal defined in PR.md? (Yes/No)
2. Classification:
   - Type U: Code does not contribute to Goal (strip/discard).
   - Type 2U: Buggy code that does NOT contribute to Goal (strip/discard, do NOT fix).
   - Relevant to Goal: (Mark as Type 0, 1, 2, or 3 for Pass 2).
Include confidence level (0-100%).
```

---

## 2. Subagent Assessment Markdown & JSON Schemas

### Subagent Assessment Markdown Format:
```markdown
### Subagent Review: <file-basename>

1. **Changes in Diff**: <Summary of modifications>
2. **Goal Contribution Impact**: <Critical / Non-Critical according to PR.md> (Confidence: X%)
3. **Bug Classification**: <Type 0 / Type 1 / Type 2 / Type 3 / Type U / Type 2U> (Confidence: Y%)
4. **Action Recommendation**: <Keep / Implement / Surgical Fix / Strip (Discard)>
5. **Cross-File Pointing (Optional)**: Points to `<other-file>` as potential root cause (Confidence: Z%).
```

### JSON Schema for Programmatic Aggregation:
```json
{
  "targetFile": "path/to/File.java",
  "diffFile": "<appDataDir>/brain/<conversation-id>/File.java.diff",
  "prGoalSpec": "<appDataDir>/brain/<conversation-id>/PR.md",
  "goalContributionImpact": {
    "isCritical": true,
    "canDiscard": false,
    "confidenceScore": 95
  },
  "bugClassification": {
    "type": "Type 2U",
    "name": "Unrelated Buggy Code",
    "description": "Pre-existing defect in legacy helper unneeded for Goal",
    "action": "Strip (Discard)",
    "confidenceScore": 95
  },
  "crossFilePointers": [
    {
      "pointedFile": "path/to/OtherFile.java",
      "reason": "Defect or missing delegation in target method",
      "confidenceScore": 95
    }
  ]
}
```

---

## 3. Subagent Consensus Matrix & Report Template

Use this markdown template to aggregate all subagent findings into `<appDataDir>\brain\<conversation-id>\subagents_diff_and_bug_analysis.md`:

```markdown
# Multi-Subagent Diff Audit & Bug Analysis Summary

## 1. Overview Matrix

| File Name | Critical to Goal? | Can Discard? | Bug Type (0,1,2,3,U,2U) | Action | Subagent Confidence | Cross-File Pointing |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `File1.java` | Yes | No | Type 0 | Keep | 95% | None |
| `File2.xml` | Yes | No | Type 3 | Fix + Impl | 90% | `OtherFile.java` |
| `File3.java` | No | Yes | Type U | Strip | 100% | None |
| `LegacyHelper.java` | No | Yes | Type 2U | Strip (Do Not Fix) | 95% | None |

---

## 2. Synthesis & Fix Plan

1. **Goal Specification Anchor**: `<appDataDir>\brain\<conversation-id>\PR.md`
2. **Non-Goal Code to Strip (Type U / Type 2U)**: <List diffs to discard without spending effort fixing>
3. **Clean Goal Code to Retain (Type 0)**: <List clean diffs contributing to Goal with zero bug association>
4. **Identified Surgical Fix (Type 1/2/3)**: <Minimal edit required based on Goal-relevant findings>
5. **Verification Command**: <Build and test execution commands>
```
