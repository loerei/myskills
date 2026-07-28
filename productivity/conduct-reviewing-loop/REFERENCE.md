# Conduct Reviewing Loop Reference & Prompt Templates

Templates, checklist builders, and multi-turn reviewer loop protocols for stress-testing any target artifact.

---

## 1. Reviewer Subagent Prompt Template (Blind Reviewer Protocol)

When invoking a reviewer subagent via `invoke_subagent`, use this structured prompt:

```markdown
You are <Domain> Reviewer #<N>. You are conducting an independent, blind audit of the proposed <Artifact Type> draft.

### Required Reading (MUST read using view_file):
1. Target Artifact Draft: `<draft_path>`
2. System Guidelines / Rules: `<rule_paths>`

### Synthesized Audit Checklist:
1. **User Requirements**: <User-defined constraints and preferences>
2. **System Guidelines**: <Rules from AGENTS.md, /write-a-skill, /write-for-ai, etc.>
3. **Domain & Edge-Case Completeness**: <Domain-specific correctness, safety, or performance checks>

> [!CAUTION]
> **Blind Protocol Enforcement**: You are auditing this draft with fresh eyes. Do NOT ask for or expect previous iteration logs or past reviewer notes. Focus strictly on discovering any architectural flaws, missing edge cases, or invalid logic in the current draft.

Conclude explicitly with either:
- **STATUS: REVISIONS NEEDED** (with a numbered list of required edits), OR
- **STATUS: PASS** (if the draft is 100% complete and compliant).
```

---

## 2. Domain Checklist Builders

### A. Implementation Plans & Architectural RFCs
- [ ] User goals & constraints explicitly addressed
- [ ] No hardcoded env values, magic numbers, or fixed pixel layouts
- [ ] Surgical changes: only touch required files
- [ ] Empirical verification plan included (build, test, lint)
- [ ] Rollback or failure recovery strategy present

### B. Skill Drafts & Documentation
- [ ] Description frontmatter includes explicit "Use when..." triggers
- [ ] `SKILL.md` strictly under 80-100 lines (Progressive Disclosure)
- [ ] `/write-for-ai` compliance: decision signals, no marketing fluff, decision tables used
- [ ] Concrete **Before / After** code examples included in `REFERENCE.md`
- [ ] 100% universal and usable across all target project repositories

### C. PRDs & Feature Specifications
- [ ] Problem statement & clear scope boundaries defined
- [ ] User user stories & acceptance criteria unambiguous
- [ ] Security, permission, and data isolation requirements specified
- [ ] Edge cases (network timeouts, empty data states, rate limits) covered

---

## 3. Multi-Turn Iteration Best Practices

1. **Role Differentiation**: ALWAYS increment the Reviewer index (`Reviewer #1`, `Reviewer #2`, `Reviewer #3`) to enforce fresh, un-biased perspectives on each iteration.
2. **Blind Reviewer Protocol (No Past Context Feeding)**: NEVER include previous reviewer findings, lists of fixed points, or past iteration logs in the subagent prompt. Feeding past feedback causes **Anchoring Bias** (limiting scope to old items) and **Confirmation Bias** (rubber-stamping approval).
3. **Critical Evaluation Gatekeeper (Always Question Reviewer Feedback)**: Do NOT blindly apply every reviewer request. The Main Agent MUST filter reviewer feedback against code realities, user intent, and YAGNI/simplicity principles before editing the draft. Reject or refine over-engineered or hallucinated reviewer suggestions.
4. **Strict Termination Rule (Requires Explicit STATUS: PASS)**: The Main Agent MUST NEVER terminate the loop or declare the draft finalized/ready if the latest reviewer response was `REVISIONS NEEDED`. The loop MUST continue with iteration $N+1$ until a reviewer subagent explicitly returns `STATUS: PASS`.
5. **Neutral & Un-biased Evaluation**: Do NOT tell the subagent reviewer that the draft is "almost finished" or "good". Keep prompt neutral to ensure objective critique.
6. **Surgical Refinement**: Apply edits strictly addressing verified, valid reviewer feedback without introducing unrequested side-effects.
