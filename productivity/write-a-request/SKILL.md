---
name: write-a-request
description: Use when asked to write a request.
---

# Write a Request

## Core Rules

1. **Zero speculation**: Propose at the behavioral or interface level. State what capability, option, or behavior is needed; never dictate internal architecture or guess implementation details.
2. **Ground in real context**: State the exact friction point, missing option, or workflow bottleneck with a concrete example.
3. **Clear rationale**: Explain why the change matters without hype.

## Workflow

```mermaid
flowchart TD
    Start["Request / Proposal Need"] --> Identify["1. Identify Target & Concrete Problem"]
    Identify --> Formulate["2. Formulate Idea-Level Proposal"]
    Formulate --> Draft["3. Draft Request (REQUEST.md)"]
    Draft --> Verify["4. Verify Against Checklist"]
    Verify --> Deliver["5. Deliver Request & Artifact Links"]
```

---

## Request Template (`REQUEST.md` / `request_*.md`)

```markdown
# Request: [Short, Descriptive Summary of Request]

**Target**: [e.g. `tool_name`, `DOCUMENT.md`, `project_name`]  
**Type**: [Feature / Policy Change / Enhancement]  
**Date**: [YYYY-MM-DD]  

---

## 1. Problem (What)
- Describe the friction point, limitation, or missing capability with a concrete example.

## 2. Proposed Idea (Do What)
- Describe the desired behavior, option, or interface change at the concept level.
- Focus on idea-level; do not dictate internal implementation.

## 3. Rationale (Why)
- Explain the concrete value.
```

---

## Quality Checklist

- [ ] **Zero Speculation**: Proposes behavior and interfaces only; does not assert or dictate internal mechanics.
- [ ] **Concrete Problem**: Problem is backed by a real use case or example, not hypothetical generalities.
- [ ] **Distinct Rationale**: Clearly states why the change is beneficial without marketing fluff.
- [ ] **Self-Contained**: Clear and actionable for maintainers or policy reviewers.
