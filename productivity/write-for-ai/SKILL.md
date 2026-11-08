---
name: write-for-ai
description: Use when asked to review, edit, or deslop AI-facing text (prompts, rules, schemas).
---

# Write for AI

For human-facing documentation (READMEs, API docs, release notes), use the `deslop` skill instead. For reference tables, case studies, and the Noise Checklist, see [REFERENCE.md](REFERENCE.md).

## Core Rules

1. **Instruction equivalence & generative compression (Occam's Instruction Law):** If an instruction or instruction set can be reproduced by another instruction or instruction set that is more generalized or more concise with similar or better quality, the old instruction or instruction set MUST be replaced by that simpler instruction or instruction set. To decide, look strictly at the ultimate objective the instruction or instruction set is aiming for.
2. **Never sacrifice logical precision for stylistic brevity (No lossy compression):** Do NOT rewrite or shorten an instruction if doing so narrows its scope, drops a condition (`more generalized OR more concise`), weakens an imperative (`MUST`), or alters set mappings (`1-to-1` vs. `N-to-M`). Repeating an exact noun phrase across clauses to maintain strict variable binding is execution signal, NOT stylistic noise.
3. **Apply the Drop Test:** Every sentence or detail must change how the AI selects a tool, sets a parameter, recovers from failure, or handles an edge case. If removing it changes nothing in AI execution, delete it.
4. **State failure modes and recovery actions:** Explicitly state *when* an action fails and *what* the AI must do next.
5. **Delete triggers instead of banning artifacts:** To stop unwanted behavior caused by an existing prompt, delete the instruction triggering it. Use `NEVER` or `MUST NOT` only to override default LLM biases (e.g., sycophancy, filler, hallucinated APIs).
6. **Write with zero repo context:** Assume the AI has no prior knowledge of the local repository, dataset, or workspace paths. Use universal, self-contained examples and rules (e.g., user auth, image resize, CRUD pagination).
7. **Format for fast parsing:**
   - **Frontmatter `description`:** 10–15 words stating ONLY *when* to trigger the skill (no features, benefits, or slash commands).
   - **2-column tables (`| Condition | Action |`):** Use for rule branching, mappings, and enums.
   - **Mermaid diagrams:** Use ONLY for sequential state machines, multi-step loops, and cross-agent handoffs.
   - **Headers & bullet titles:** Never create headers for 1–2 sentences (merge into parent text). Title bullets in plain English ONLY when needed for cross-referencing.

| Keep (Execution Signal) | Cut (Zero-Execution Noise) |
| :--- | :--- |
| Exact code symbols, API names, and domain terms | Synonym substitutions for domain terms |
| Repeated exact terms that bind variables or preserve scope (`instruction or instruction set`) | Stylistic paraphrasing that drops quantifiers, conditions, or edge-case coverage |
| Hard imperatives (`MUST`, `NEVER`, `ALWAYS`, `do NOT`) | Hedging and conversational padding (`Please note`, `Make sure to`) |
| `e.g.` on non-exhaustive lists | Exhaustive sub-case lists when a general rule suffices |
| Disambiguation between easily confused tools or rules | Explanations of self-evident tool or parameter names |
| Operational rationale required to resolve ambiguity, prevent edge-case errors, or override LLM biases | Creation history, author preferences, motivational and business justifications |
| Simple active verbs (`get`, `set`, `run`, `check`, `edit`, `delete`) | Buzzwords and marketing adjectives (`orchestrate`, `leverage`, `robust`, `seamless`) |

## Workflows

### Deslop Existing Text
1. Apply the Core Rules and Keep/Cut table to strip noise and compress redundant rules.
2. Output `Original -> Deslopped` with a brief rationale for each cut.

### Write New AI-Facing Text
Include only the answers to these 4 questions:
1. **Action:** What does this do? (One concrete verb phrase)
2. **Trigger:** When must the AI choose this over alternatives?
3. **Inputs:** Which parameters are required vs. optional? (Omit if obvious from schema)
4. **Recovery:** How does it fail and what is the exact recovery step?
