---
name: afterplay
description: Post-prototype distillation workflow. Use when refining a dirty prototype branch, isolating bug origins after achieving a performance goal, or running parallel subagent diff audits with confidence voting for production PRs.
---

# Afterplay: Post-Prototype Distillation & Diff Audit

Use **Afterplay** when a prototype branch achieves a critical performance win or complex goal (the **Goal**), but the codebase has become dirty, unmaintainable, or contains subtle bugs.

Afterplay provides a disciplined 5-phase pipeline to isolate bugs, extract minimal clean abstractions, run multi-subagent diff audits, and cast confidence votes on every modified file.

---

## Workflows

```mermaid
flowchart TD
    Start["Dirty Prototype with Performance/Goal Win"] --> Phase1["1. Reconstruct Goal & Tagging<br/>(RECONSTRUCT_GOAL.md)"]
    Phase1 --> Phase2{"2. Isolate Bug Origin<br/>(ISOLATE_BUG.md)"}
    Phase2 -->|"Scenario A (Dirty Code Bug)"| DoneA["Discard Dirty Code & Create Clean PR"]
    Phase2 -->|"Scenario B (Goal Code Bug)"| Phase3["3. Extract Implementation<br/>(EXTRACT_IMPLEMENTATION.md)"]
    Phase3 --> Phase4["4. Per-File Diff & Multi-Subagent Audit<br/>(DIFF_REVIEW.md)"]
    Phase4 --> Phase5["5. Confidence Voting & Synthesis<br/>(CONFIDENCE_VOTE.md)"]
    Phase5 --> DoneB["Clean Production-Ready PR"]
```

---

## Execution Phases

### Phase 1: Reconstruct Goal & Tag Baseline
Cleanly reconstruct the environment, preserve dirty work in a reference repository/branch, tag both states, and establish baseline performance metrics.
👉 See [`RECONSTRUCT_GOAL.md`](RECONSTRUCT_GOAL.md) via `view_file` for git tagging conventions and baseline setup.

### Phase 2: Isolate Bug Scenario
Distinguish whether bugs stem from dirty prototype boilerplate (**Scenario A**) or core goal changes (**Scenario B**).
👉 See [`ISOLATE_BUG.md`](ISOLATE_BUG.md) via `view_file` for bug origin isolation rules.

### Phase 3: Extract Minimal Implementation
Extract only the essential abstractions into atomic commits on the clean branch, stripping speculative bloat and separating test bypass code.
👉 See [`EXTRACT_IMPLEMENTATION.md`](EXTRACT_IMPLEMENTATION.md) via `view_file` for surgical extraction protocols.

### Phase 4: Per-File Diff & Multi-Subagent Audit
Generate individual `.diff` files per modified file and spawn parallel subagents (1 subagent per diff file) with complete codebase and goal/bug context.
👉 See [`DIFF_REVIEW.md`](DIFF_REVIEW.md) via `view_file` for `.diff` generation and subagent spawning templates.

### Phase 5: Confidence Voting & Consensus Matrix
Collect subagent assessments across performance criticality, bug taxonomy (Type 0-3), confidence levels (0-100%), and cross-file bug pointing to form a surgical fix plan.
👉 See [`CONFIDENCE_VOTE.md`](CONFIDENCE_VOTE.md) via `view_file` for subagent voting schemas and synthesis templates.

---

## Domain Terms and Tag Commands

The afterplay skill supports specialized modifier tags and domain terminology to control post-prototype distillation and subagent diff review:

- **`Goal Metric`**: Quantifiable baseline performance or functional target achieved during initial prototyping.
- **`Scenario A`**: Bug originating strictly from dirty prototype wrappers or unused boilerplate (discarded on clean branch).
- **`Scenario B`**: Bug originating directly from core goal implementation changes.
- **`!SC<A|B>` (Scenario Choice)**: Force bug classification to Scenario A or B mid-flight to skip empirical isolation testing.
  - **Syntax/Parameter**: `!SC<A|B>` (Default: Auto-detected via empirical branch test).
  - **Timing**: Start-time.
  - **Agent Action**: Forces bug classification to Scenario A (dirty code bug) or Scenario B (goal code bug).
- **`!BA` (Baseline Audit)**: Require quantitative metric verification before spawning diff review subagents.
  - **Syntax/Parameter**: `!BA`.
  - **Timing**: Start-time.
  - **Agent Action**: Forces explicit benchmark/profiling run to record baseline metrics before diff review.
- **`!SV<N>` (Subagent Voting Threshold)**: Set minimum confidence threshold required to accept subagent bug classification.
  - **Syntax/Parameter**: `!SV<N>` (Default: `70`).
  - **Timing**: Start-time.
  - **Agent Action**: Rejects subagent votes with confidence score below $N\%$.

