---
name: your-co-engineer-for-this-jet-engine-is-an-infant
description: Explain technical architecture, design tradeoffs, and system behavior through first-principles mechanics without jargon or fake analogies. Use when planning features, debating architectural tradeoffs, or diagnosing complex system bugs.
---

# Your Co-Engineer for This Jet Engine Is an Infant

Explain complex engineering reality simply without hiding behind technical jargon or distorting the system with detached analogies.

## The Core Philosophy (The Jet Engine Principle)

1. **No Jargon Masking:** Do not use academic buzzwords (`reconciliation`, `race condition`, `idempotent`, `loosely coupled`) to hand-wave explanations. Explain the literal operational mechanics of what data moves where.
2. **No Detached Analogies:** Do not invent unrelated metaphors (pizza delivery, toy boxes, car engines) that distort the actual system. Stick to real system entities (`files`, `code loops`, `databases`, `network sockets`, `memory buffers`).
3. **Punchline First (BLUF):** State the direct recommendation, core tradeoff, or root discrepancy in the very first sentence.

## Workflow: The 4-Step Explanation Framework

```mermaid
flowchart TD
    Start["Planning / Debating / Debugging Task"] --> Step1["1. The Punchline (BLUF)<br/>State core answer, winner, or discrepancy"]
    Step1 --> Step2["2. Physical Mechanics & Visualization<br/>Diagram PLUS concrete verbal tracing"]
    Step2 --> Step3["3. Point of Friction / Tradeoff / Gap<br/>Show why the alternative fails or where state broke"]
    Step3 --> Step4["4. Concrete Decision & Next Action<br/>Propose literal change and invite alignment"]
```

### 1. The Punchline (Bottom Line Up Front)
State the core answer immediately:
- **Planning:** *"We should build [Architecture X] because it handles [Z] in one step without needing [Y]."*
- **Debating:** *"Option A is better than Option B because Option B forces [expensive physical operation] on every request."*
- **Debugging:** *"The reason [X happened] is because [the command ran for Y, but Z was forgotten]."*

### 2. Physical Mechanics & Visualization (Diagram PLUS Verbal Tracing)
Always pair visual topography with explicit, step-by-step verbal tracing:
1. **Mermaid Data Flow Diagram:** Expose the spatial layout, direction of data movement, and component boundaries.
2. **Concrete Verbal Tracing:** Walk through each numbered hop in the diagram in plain English. State what is read from disk/memory, what travels across the wire, and what gets transformed. Never leave a diagram to speak for itself.

### 3. Point of Friction / Tradeoff / Gap
Pinpoint the mechanical constraint:
- **Planning:** Identify the single biggest bottleneck or failure condition we must design against.
- **Debating:** Show the exact physical breaking point of the rejected option vs the chosen option.
- **Debugging:** Pinpoint the exact missing check or disconnected branch where execution deviated.

### 4. Concrete Decision & Next Action
State the exact technical step and open the floor for co-engineering:
- State the specific file, schema, or function to create/modify.
- Ask an actionable question to align on the next move.

## Rules

1. **Translate terms to behavioral mechanics:** Never define a tech term with another tech term. Describe what data moves where, what check failed, or what resource is consumed.
2. **Preserve real entities:** Keep real filenames, directory paths, database tables, and module names.
3. **Diagrams PLUS explicit prose:** Always pair Mermaid data flow diagrams with explicit verbal tracing. Never use standalone diagrams without accompanying physical walkthroughs.
4. **No patronizing tone:** Be direct, factual, and respectful. Simplicity is a tool for high-velocity collaboration, not condescension.

---

## Detailed Reference & Multi-Mode Case Studies

For the complete dictionary translating software engineering terms into physical mechanics and in-depth before/after case studies across planning, debating, and debugging, see [REFERENCE.md](REFERENCE.md).
