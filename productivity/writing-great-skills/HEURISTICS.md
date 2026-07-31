# Skill Complexity Heuristics

Reference framework for evaluating and refactoring skill complexity via objective-driven progressive disclosure.

## 1. Optimization Objective

**Goal**: Minimize retrieval cost per execution path while keeping `SKILL.md` readable.

Every decision to inline or extract material must serve this balance:
- **Inline** what every execution path needs to run cleanly.
- **Disclose** behind pointers what only specific paths require or what bloats context.

## 2. Complexity Signals

### Primary Signals
High-density or branch-bound material that inflates retrieval cost:
- **Heavy Lookup Tables**: Parameter schemas, tool maps, error code tables, reference matrices.
- **Large Templates**: Code scaffolds, prompt templates, configuration snippets.
- **Branch-Specific References**: Rules or checklists serving only one specific execution branch.
- **Long Repeated Checklists**: Multi-item verification lists used across review iterations.

### Secondary Signal
- **Audit Threshold (`~100 lines` or large byte footprint)**: Trigger to inspect unextracted primary signals. Purely linear, unbranched prose under the `~150 lines` upper ceiling without primary signals may remain inline.

## 3. Structural Routing

- **Inline Execution**: Keep material inline if needed by all execution paths without triggering primary signals.
- **Single Subdoc (`REFERENCE.md`)**: Disclose into a single reference file when primary signals are triggered globally across all execution paths.
- **Multiple Subdocs (`TYPE/DOMAIN.md`)**: Disclose into domain-scoped subdocs when primary signals are isolated to specific execution branches.
- **Overlapping Subdocs Principle**: Create the smallest set of subdocs such that every execution path loads only the reference blocks it requires, preventing monolithic subdocs.

## 4. Protocol Reference

To execute subdoc extraction based on these heuristics, invoke the [write-skill-subdocs](../write-skill-subdocs/SKILL.md) skill.
