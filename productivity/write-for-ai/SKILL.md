---
name: write-for-ai
description: Use when asked to review, edit, or deslop AI-facing text (prompts, rules, schemas).
---

# Write for AI

Text written for AI must directly drive decisions, constraints, or routing. It should never market, reassure, speculate, or over-explain. For human-facing technical documentation (READMEs, API docs, release notes), use the deslop skill instead.

## Core Rules

1. **Instruction equivalence & generative compression (Occam's Instruction Law).** If an instruction or instruction set can be reproduced by another instruction or instruction set that is more generalized or more concise with similar or better quality, the old instruction or instruction set MUST be replaced by that simpler instruction or instruction set. To decide, look strictly at the ultimate objective the instruction or instruction set is aiming for.
2. **One sentence = one decision signal.** Every sentence must help the AI choose a tool, set a parameter, or enforce a constraint. If removing a sentence changes nothing in AI execution, cut it.
3. **Cut noise, never signal.** Deslopping means stripping conversational fluff, marketing adjectives, and tautology, NEVER dropping domain mechanics, failure recovery procedures, parameter contracts, or operational constraints. If removing a detail deprives the agent of a recovery action or a decision branch, it MUST be preserved.
4. **Only add information to resolve ambiguity.** Add context only if two tools or rules could be confused. Do not explain what a tool name or parameter name already makes obvious.
5. **State failure modes and recovery actions.** Tell the AI *when* an action fails and *what to do next*.
6. **Delete the trigger instead of banning the artifact.** When removing an unwanted behavior created by a previous prompt or revision, delete the trigger instruction. Do not add negative constraints (`"NEVER do X"`) against artifacts that the AI has no natural baseline tendency to generate. Reserve `NEVER` and `MUST NOT` for overriding default LLM biases (e.g., sycophancy, conversational filler, hallucinating code).
7. **Use plain English, no fluff.** Say things simply with simple active verbs (`get`, `set`, `run`, `check`, `edit`, `delete`). Avoid pompous buzzwords (`orchestrate`, `leverage`, `facilitate`, `paradigm`), marketing adjectives (`robust`, `seamless`, `powerful`, `intelligent`), and conversational padding (`Please note`, `Make sure to`).
8. **Preserve domain terms.** Keep exact code symbols, API names, and domain terms intact. Do not substitute synonyms for established domain concepts.
9. **Preserve rule-strength imperatives.** Words like `MUST`, `NEVER`, `ALWAYS`, and `do NOT` carry critical constraint weight. Keep them sharp and unambiguous.
10. **Keep "e.g." on non-exhaustive lists.** Removing "e.g." signals that a list is complete when it may only be representative.
11. **Use tables for lookups & decision matrices; Mermaid for multi-step workflows.** Use 2-column tables (`| Condition | Action |`) for rule branching, mappings, and enums. Use Mermaid diagrams ONLY for sequential state machines, multi-step execution loops, and cross-agent handoffs.
12. **Do not force-escort bullets with decorative titles.** Never force-escort every bullet with a title if decoration is the only reason. Make sure bullet titles are to help calling and referring to a rule shortly, not to put a pretty name on it. If titling, use only plain English, not fancy names.
13. **No theatrical or hollow headers.** Do not create section headers or sub-headers for 1–2 sentences. Merge directly into parent flow.
14. **Frontmatter description is trigger condition only.** Answer ONLY "When to choose this skill?" in 10–15 words. Never summarize features (What), explain benefits (Why), or include slash command mentions.
15. **Use universal, self-contained examples.** NEVER write examples, lookup tables, or case studies that depend on specific context from a random repository or proprietary domain that an LLM does not always have. All examples MUST be universally understandable from first principles ("Hello World examples", e.g. canonical scenarios like resizing an image, sending an email, user auth, or basic CRUD pagination) that any LLM can understand and generalize instantly.
16. **Detail standard: Reinforce statement, never cosmetic granularity.** Extra detail is justified ONLY when it directly strengthens the statement, establishes an operational boundary, or provides a concrete recovery path. NEVER add details merely to "look more thorough" or "do more than asked" when that addition narrows the statement's generality or dilutes its authority.
17. **Reader context decoupling (Zero cross-repo contamination).** Write rules and documentation from the standpoint of an agent with zero prior context of the author's local repository. Never inject local project jargon, dataset specifics, or workspace paths into shared rules or skills. Doing so causes future agents in other codebases to hallucinate, misinterpret directives, or fail.
18. **Operational rationale vs. motivational fluff (The Drop Test).** Distinguish between behavioral mechanisms vs. human history:
    - **Motivational fluff (MUST CUT):** Explaining past creation history, author preferences, or external business/cost savings (e.g. "compress images to save bandwidth and improve user UX"). AI models execute instructions; they do not need justification.
    - **Operational rationale (PRESERVE IF IT PASSES DROP TEST):** Stating the underlying failure mode, downstream blast radius, or anti-bias mechanism that guides agent decisions during out-of-distribution edge cases (e.g. "run auditor in clean-slate context because authors have confirmation bias and overlook own bugs"). If dropping the rationale causes an agent to misjudge intent in ambiguous edge cases or revert to default LLM bias, it is a vital decision signal and MUST be preserved.

## Workflows

### 1. Deslop & Optimize Existing Text
1. Read as the AI model to assess decision value.
2. Strip buzzwords, marketing claims, and Latinate verbs.
3. Eliminate redundancy: schema duplication, circular naming, hedging, motivational fluff (preserve operational rationale that passes Drop Test), synonym stacking, reference over-specification, and enumerative sub-case clutter (apply generative compression).
4. Test each sentence: if removing it does not change AI execution, delete it.
5. Present Original -> Deslopped with concise rationale for cuts.

### 2. Write New AI-Facing Text
Answer only these 4 questions before writing:
1. What does this do? (One concrete verb phrase)
2. When should the AI choose this over alternatives? (Unique trigger or differentiator)
3. What inputs are required vs optional? (State only if not obvious from schema)
4. How does it fail and what is the recovery step? (Actionable error signal)

---

## Subdoc Reference

- Reference tables, before/after case studies, and Noise Checklist: see [REFERENCE.md](REFERENCE.md).
