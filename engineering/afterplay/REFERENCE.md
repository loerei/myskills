# Reference: Subagent Prompt Templates, Schemas & Output Formats

This reference document contains heavy templates, prompt schemas, and JSON output formats used during Phase 5 (Per-File Diff & Multi-Subagent Audit) and Phase 6 (Confidence Voting & Synthesis) of the **Afterplay** workflow.

---

## 1. Subagent Prompt & Context Package Template

Use this ready-to-use prompt template when spawning per-file diff review subagents via `invoke_subagent` in Phase 5:

```markdown
You are assigned to deeply analyze the diff file:
Diff file: <appDataDir>\brain\<conversation-id>\<filename>.diff
Target file: <absolute_path_to_source_file>

Context:
1. Prototype Goal: <quantified_goal_metrics_feature_perf_bugfix>
2. Bug behavior / Symptoms: <observed_symptoms_and_reproduction_steps>

You have permission to read all diffs and source files in the codebase using view_file / jcodemunch.

Answer these 3 questions in detail:
1. What exact changes are in <filename>.diff?
2. How critical are these changes to achieving the Goal (feature/perf/bugfix/refactor)? (Could this change be reverted/discarded without degrading the Goal?) Include confidence level (0-100%).
3. Does this diff contain the root cause of the bug? If so, which category does it fall under:
   - Type 0: Unrelated to bug.
   - Type 1: Missing feature/implementation code (existing code is fine).
   - Type 2: Bug in existing code (defect in pre-existing implementation).
   - Type 3: Both (existing code defect + missing code).
   Include confidence level (0-100%). Optionally point to any other diff file if relevant.
```

---

## 2. Subagent Assessment Markdown & JSON Schemas

### Subagent Assessment Markdown Format:
```markdown
### Subagent Review: <file-basename>

1. **Changes in Diff**: <Summary of modifications>
2. **Goal Contribution Impact**: <Critical / Non-Critical> (Confidence: X%)
3. **Bug Classification**: <Type 0 / Type 1 / Type 2 / Type 3> (Confidence: Y%)
4. **Cross-File Pointing (Optional)**: Points to `<other-file>` as potential root cause (Confidence: Z%).
```

### JSON Schema for Programmatic Aggregation:
```json
{
  "targetFile": "path/to/File.java",
  "diffFile": "<appDataDir>/brain/<conversation-id>/File.java.diff",
  "goalContributionImpact": {
    "isCritical": true,
    "canDiscard": false,
    "confidenceScore": 95
  },
  "bugClassification": {
    "type": "Type 3",
    "description": "Both missing code and pre-existing bug",
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

| File Name | Critical to Goal? | Can Discard? | Bug Type (0-3) | Subagent Confidence | Cross-File Pointing |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `File1.java` | Yes | No | Type 0 | 95% | None |
| `File2.xml` | Yes | No | Type 3 | 90% | `OtherFile.java` |
| `File3.java` | No | Yes | Type 0 | 100% | None |

---

## 2. Synthesis & Fix Plan

1. **Non-Goal Code to Strip**: <List diffs with 0 Contribution to Goal to discard>
2. **Clean Goal Code to Retain (Type 0)**: <List clean diffs contributing to Goal with zero bug association>
3. **Identified Surgical Fix**: <Minimal edit required based on Type 2/3 bug findings>
4. **Verification Command**: <Build and test execution commands>
```
