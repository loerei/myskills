# Confidence Voting & Bug Taxonomy Schema

This subdoc defines Phase 5 of the **Afterplay** workflow: subagent bug classification, confidence scoring, cross-file pointing, and consensus matrix synthesis.

---

## 1. 4-Tier Bug Taxonomy

When evaluating whether a `.diff` file contains the root cause of a bug, each subagent classifies the diff into one of 4 explicit categories:

| Category Code | Name | Description |
| :---: | :--- | :--- |
| **Type 0** | **Unrelated** | Changes in this file are completely unrelated to the reported bug. |
| **Type 1** | **Missing Code** | The bug occurs because new code for the missing feature (e.g. scroll handling) has not yet been implemented. Existing code is fine. |
| **Type 2** | **Existing Code Bug** | The bug occurs because of a defect/bug in pre-existing code (e.g. returning `false` instead of calling `super.onTouchEvent(...)`). |
| **Type 3** | **Both** | The bug is caused by a combination of pre-existing code defects AND missing implementation logic. |

---

## 2. Subagent Assessment Schema

Each subagent output MUST be formatted as follows:

```md
### Subagent Review: <file-basename>

1. **Changes in Diff**: <Summary of modifications>
2. **Performance Impact**: <Critical / Non-Critical> (Confidence: X%)
3. **Bug Classification**: <Type 0 / Type 1 / Type 2 / Type 3> (Confidence: Y%)
4. **Cross-File Pointing (Optional)**: Points to `<other-file>` as potential root cause (Confidence: Z%).
```

---

## 3. Synthesis & Surgical Fix Strategy

1. **Consolidated Matrix Table**: Compile all subagent assessments into a single summary table in `<appDataDir>\brain\<conversation-id>\subagents_diff_and_scrolling_bug_analysis.md`.
2. **Filter Non-Critical Code**: Identify diffs with 0% performance contribution (e.g., empty stubs) that can be discarded to keep code minimal.
3. **Identify Single-Point Surgical Fix**: Cross-reference Type 2 / Type 3 findings to pinpoint the minimal necessary line edit (e.g., delegating `return super.onTouchEvent(...)` in `SimplenoteMovementMethod.java`).
