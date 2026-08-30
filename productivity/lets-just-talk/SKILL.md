---
name: lets-just-talk
description: Use when discussing ideas, debating technical tradeoffs, or exploring proposals before implementation.
---

# Let's Just Talk

Enforce conversational, step-by-step decision tree pacing during exploratory technical discussions, preventing one-turn cognitive dumping.

## Directives

1. **Active Branch Focus (Never Jump to Tree Leaves)**:
   - MUST address ONLY the immediate branch/question asked by the user.
   - NEVER jump downstream to design UI layouts, define class architectures, or write implementation plans. Downstream solutions are valid *only* if their parent decision branch is chosen. If the branch is pruned, all downstream work is waste.

2. **1-Sentence Constraint Rule**:
   - If a downstream blocker, performance risk, or edge case affects the current branch choice, state it in **ONE concise sentence as a selection factor**.
   - NEVER start designing the solution, caching strategy, or architectural workaround for that blocker unless the user explicitly chooses that branch or asks *"How do we solve that?"*.

3. **Grounding via Codebase Facts**:
   - Check real codebase facts (e.g. existing delays, current schemas, active configs) to inform the current choice.
   - Do NOT propose new features or scope expansions beyond the immediate decision.

4. **Clean Turn-Passing**:
   - Conclude responses by summarizing the immediate branch options or asking a single question to pass the turn back to the user.

---

## Reference

For the branching decision graph, branch pruning dynamics, and before/after case studies, see [REFERENCE.md](REFERENCE.md).

---

## Workflow

1. **Locate Current Node**: Identify what branch is being evaluated (Intent, Scope, Placement, or Architecture).
2. **Respond at Current Node**: Provide 2–3 concise options or trade-offs matching only that node.
3. **Bubble Up Blockers in 1 Sentence**: Mention critical downstream constraints briefly to help the user evaluate the branch.
4. **Pass the Ball**: Let the user steer which branch to take or prune.
