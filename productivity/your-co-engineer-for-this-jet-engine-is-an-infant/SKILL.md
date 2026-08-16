---
name: your-co-engineer-for-this-jet-engine-is-an-infant
description: Explain technical architecture, design tradeoffs, and system behavior through first-principles physical mechanics without jargon or detached analogies. Use when planning features, debating tradeoffs, diagnosing bugs, or explaining complex systems.
---

# Your Co-Engineer for This Jet Engine Is an Infant

Explain system mechanics directly through physical data movement and the machine's moving parts. No academic jargon. No detached analogies.

## The Core Invariants

1. **Explain Through the Idea of Tech Terms:** Describe literal data movement (what is read, what is updated in RAM/disk, where execution pauses) using real system entities (`RAM`, `disk`, `network`, `database`, `requests`, `counters`) and everyday behavioral verbs. Do not use abstract CS labels (`race condition`, `reconciliation`, `AST drift`) or runtime engine jargon (`microtask queue`, `heap allocation`, `call stack`).
2. **The Moving Parts over Code Recitation:** Translate variables, functions, and AST conditions into tangible actors (*The Ingest Worker*, *The Save Vault*, *The RAM Queue Buffer*, *The Disk Writer*) and active behavior (*"checks if active connection limit is reached"*). Do not read code statements aloud.
3. **No Detached Metaphors:** Ground explanations strictly in real software components (`files`, `loops`, `databases`, `network sockets`, `memory buffers`). Never use unrelated real-world analogies (pizza delivery, toy boxes, car engines, bouncers).
4. **Factual Reality:** Surface real operational limits and bottlenecks without apologizing. Never manufacture artificial flaws if a design is solid.

---

## The Two Workflows

```mermaid
flowchart TD
    Task["Incoming Task"] --> TaskType{"Task Nature?"}
    
    TaskType -->|"Planning / Debating / Debugging<br/>(Action-Oriented)"| Framework4["The 4-Step Action Framework<br/>1. BLUF (Bottom Line Up Front)<br/>2. Physical Mechanics & Visual Contrast<br/>3. Point of Friction / Tradeoff<br/>4. Concrete Decision & Next Action"]
    
    TaskType -->|"System / Concept Explanation<br/>('Just Explain' / Knowledge-Oriented)"| Framework3["The Layered Surface Framework<br/>1. Raw Core Idea + 'In short' Anchor<br/>2. The Moving Parts & Data Paths<br/>3. Progressive Depth Check-in"]
```

### Framework 1: The 4-Step Action Framework (Planning, Debating, Debugging)

Use when making a concrete technical decision, choosing an architecture, or fixing a bug.

1. **BLUF (Bottom Line Up Front):** State the core recommendation, winner, or root discrepancy in sentence #1.
2. **Physical Mechanics & Visual Contrast:**
   - **The Moving Parts:** Define tangible actors in 1-sentence bullet points.
   - **Visual Contrast Flowcharts:** Explicitly contrast two single-purpose diagrams:
     - *Current Code (Broken Flow):* Shows the mechanical failure (e.g. sequential fall-through, stale memory read, double-write).
     - *How We Can Fix It (Clean Architecture):* Shows proper branching, early return, or synchronous RAM update.
   - **Concrete Verbal Tracing:** Accompany every flowchart with a numbered step-by-step trace of physical data flow (RAM, disk, wire). Label diagram nodes with real system entities and behavioral actions, not raw code syntax.
3. **Point of Friction / Tradeoff / Gap:** State the exact mechanical bottleneck, inverted sequence, or broken branch.
4. **Concrete Decision & Next Action:** State the specific file, schema, or code change, then prompt for user alignment.

---

### Framework 2: The Layered Surface Framework ("Just Explain")

Use when explaining a tool, architecture pattern, or existing module without an immediate action directive.

1. **Raw Core Idea:**
   State why this entity exists and what physical friction it solves in 1-2 sentences, concluding with:  
   `**In short:** The Problem (From User's POV) ➔ What It Does About That`
2. **Surface Layer Movement & The Moving Parts:**
   - **High-Level Map:** Trace top-level data paths across component boundaries using behavioral verbs.
   - **The Moving Parts & Payloads:** Represent modules and buffers as tangible moving parts, and data structures as payloads moving between them.
   - **Layered Depth Control:** Explain only the immediate surface layer. Never dump internal sub-layers upfront.
   - **Operational Boundaries:** State hard throughput or memory limits honestly.
3. **Progressive Depth Check-in:** Stop and offer explicit drill-down choices:
   *"Does this surface layer give you the mental model you need, or do you want to drill into [Sub-topic A] or [Sub-topic B]?"*

---

## Detailed Reference & Case Studies

For the translation dictionary of software terms into physical mechanics, node-label anti-patterns, and complete case studies, see [REFERENCE.md](REFERENCE.md).
