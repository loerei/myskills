---
name: write-a-skill
description: Use when asked to create, write, or build a new skill.
---

# Write a Skill

Create and distribute agent skills across workspaces.

## Directives

1. **Prerequisite**: MUST read [write-for-ai/SKILL.md](../write-for-ai/SKILL.md) before drafting or editing any skill.
2. **Instruction Equivalence & Generative Compression (Occam's Instruction Law)**: If an instruction or instruction set can be reproduced by another instruction or instruction set that is more generalized or more concise with similar or better quality, the old instruction or instruction set MUST be replaced by that simpler instruction or instruction set. To decide, look strictly at the ultimate objective the instruction or instruction set is aiming for.
3. **Logical Precision Over Stylistic Brevity (No Lossy Compression)**: Do NOT rewrite or shorten an instruction if doing so narrows its scope, drops a condition (`more generalized OR more concise`), weakens an imperative (`MUST`), or alters set mappings (`1-to-1` vs. `N-to-M`). Repeating an exact noun phrase across clauses to maintain strict variable binding is execution signal, NOT stylistic noise.
4. **Description / Trigger Gate**: Frontmatter `description` MUST use format `Use when [specific triggers]` in 10-15 words. NEVER summarize internal features (What), explain benefits (Why), or include slash commands.
5. **Mindset Over Micro-Format**: Directives MUST define thinking principles and decision criteria rather than rigid output layouts that get replayed verbatim.
6. **Progressive Disclosure**: Keep `SKILL.md` under 100 lines. Extract heavy tables, branch-bound checklists, and reference guides to subdocs (`REFERENCE.md`, `<DOMAIN>.md`) per [HEURISTICS.md](HEURISTICS.md) and [REFERENCE.md](REFERENCE.md).
7. **Context-Independent Portability**: Instructions MUST stand on first-principles. NEVER leak local repository paths, dataset names, or project jargon into shared skills.

---

## SKILL.md Template

```markdown
---
name: <skill-name>
description: Use when [specific triggers].
---

# <Skill Title>

<1-sentence description of purpose and produced artifacts>.

## Directives

1. **<Rule 1>**: MUST/NEVER [Actionable constraint].

---

## Template / Output Format

<Clean markdown template or code block with placeholders>

---

## Workflow

1. <Step 1: Inspect/Audit>
2. <Step 2: Execute/Draft>
3. <Step 3: Verify & Sync via agents distribute>
```

---

## Workflow

1. Identify domain scope, target category, and tool integrations; read [write-for-ai/SKILL.md](../write-for-ai/SKILL.md).
2. Draft `SKILL.md` and evaluate subdoc extraction per [HEURISTICS.md](HEURISTICS.md).
3. Review draft with user and incorporate feedback.
4. Write files under `<category>/<skill-name>/`, run `agents audit` to validate frontmatter/duplicates/policies, then run `agents distribute` to sync workspaces and IDEs.
