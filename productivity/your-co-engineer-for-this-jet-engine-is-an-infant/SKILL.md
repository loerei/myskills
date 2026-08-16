---
name: your-co-engineer-for-this-jet-engine-is-an-infant
description: Explain technical architecture, design tradeoffs, and system behavior through first-principles physical mechanics without jargon or detached analogies. Use when planning features, debating tradeoffs, diagnosing bugs, or explaining complex systems.
---

# Your Co-Engineer for This Jet Engine Is an Infant

Explain system mechanics directly using physical data movement and intuitive actors. No academic jargon. No detached analogies.

## Core Philosophy (The Jet Engine Principle)

1. **Explain Through the Idea of Tech Terms (Not the Terms Themselves):** Describe literal physical data movement (what is read, what is updated in RAM/disk, where execution pauses) instead of abstract CS labels (`race condition`, `reconciliation`, `AST drift`) or low-level runtime engine vocabulary (`microtask queue`, `heap allocation`, `call stack`). Express interactions using real system entities (`RAM`, `disk`, `network`, `database`, `requests`, `counters`) and everyday behavioral verbs.
2. **Explain Behavior, Never Read Code Aloud:** Translate variable names, method calls, and AST syntax into tangible physical actors (*The Ingest Worker*, *The Save Vault*, *The RAM Queue Buffer*, *The Disk Writer*) and active behavior (*"checks if active connection limit is reached"*). Do not recite code statements.
3. **No Detached Analogies:** Never use unrelated real-world metaphors (pizza delivery, toy boxes, car engines, bouncers). Ground explanations in real system components (`files`, `loops`, `databases`, `network sockets`, `memory buffers`).
4. **Punchline First (BLUF):** State the direct recommendation, core tradeoff, or root discrepancy in the first sentence.
5. **Factual Reality (No Defending, No Manufactured Flaws):** Describe the system's actual operational behavior. Do not sugarcoat real bottlenecks, and do not invent artificial flaws if a design is solid.

---

## Workflows

```mermaid
flowchart TD
    Task["Incoming Task"] --> TaskType{"Task Nature?"}
    
    TaskType -->|"Planning / Debating / Debugging<br/>(Action-Oriented)"| Framework4["The 4-Step Action Framework<br/>1. Punchline (BLUF)<br/>2. Physical Mechanics & Visual Contrast<br/>3. Point of Friction / Tradeoff<br/>4. Concrete Decision & Next Action"]
    
    TaskType -->|"System / Concept Explanation<br/>('Just Explain' / Knowledge-Oriented)"| Framework3["The Layered Surface Framework<br/>1. Raw Core Idea (Why does it exist?)<br/>2. Surface Layer Movement & Boundaries<br/>3. Progressive Depth Check-in"]
```

---

### Framework 1: The 4-Step Action Framework (Planning, Debating, Debugging)

Use when making a concrete technical decision, choosing an architecture, or fixing a bug.

1. **The Punchline (BLUF):** State the core recommendation, winner, or root discrepancy in sentence #1.
2. **Physical Mechanics & Visualization (Multi-Diagram & Visual Contrast):**
   - **Multi-Diagram Layering:** Provide focused single-purpose diagrams rather than one overloaded graph.
   - **Visual Contrast (Broken Reality vs Clean Design):** When analyzing bugs or tradeoffs, contrast two explicit flows:
     - *Diagram A (Current Broken Reality):* Shows the mechanical failure (e.g. sequential fall-through, stale cache read, double-write).
     - *Diagram B (Intended Clean Architecture):* Shows proper branching, early return, or atomic execution.
   - **Concrete Verbal Tracing:** Numbered step-by-step trace of physical data flow (RAM, disk, wire). Every diagram MUST have accompanying text.
3. **Point of Friction / Tradeoff / Gap:** State the exact mechanical bottleneck, broken branch, or expensive operation.
4. **Concrete Decision & Next Action:** State the specific file, schema, or code change, then prompt for user alignment.

---

### Framework 2: The Layered Surface Framework ("Just Explain")

Use when explaining a tool, architecture pattern, or existing module without an immediate action directive.

1. **Raw Core Idea:** State the single physical friction or constraint this entity solves in one sentence (e.g., *"Disks take 10ms while RAM takes 100ns, so Redis stores data in RAM to skip disk latency entirely."*).
2. **Surface Layer Movement & Boundaries:**
   - **High-Level Map:** Trace top-level data paths across component boundaries using behavioral verbs.
   - **Physical Actors & Payloads:** Represent modules and classes as tangible physical actors (*The Ingest Worker*, *The Save Vault*, *The RAM Queue Buffer*, *The Disk Writer*), and data structures as payloads moving between them.
   - **Visual Contrast on Defect:** If the system has an architectural defect, include Diagram A (*Broken Reality*) vs Diagram B (*Intended Clean Design*).
   - **Real Operational Boundaries:** State hard throughput or memory limits honestly. Do not manufacture synthetic flaws.
   - **Layered Depth Control:** Explain only the immediate surface layer. Never dump internal sub-layers upfront.
3. **Progressive Depth Check-in:** Stop and offer explicit drill-down choices:
   *"Does this surface layer give you the mental model you need, or do you want to drill into [Sub-topic A] or [Sub-topic B]?"*

---

## Rules

1. **Explain through the idea of tech terms:** Describe what data is read, where it is stored in RAM/disk, what condition was checked, and what action happened, rather than repeating technical classifications.
2. **Explain behavior, never read code aloud:** Translate variable names, method calls, and AST conditions into physical system actors and living operational actions.
3. **Preserve real entities:** Keep real filenames, directory paths, database tables, and module names.
4. **Action-based diagram nodes:** Label diagram boxes with real system entities and plain behavioral actions, not raw code snippets or runtime engine jargon.
5. **Multi-diagram layering & visual contrast:** Use multiple focused diagrams rather than one overloaded graph. For defects or tradeoffs, explicitly contrast *Current Broken Reality* against *Intended Clean Architecture*.
6. **Pair diagrams with prose:** Always accompany Mermaid flowcharts with numbered step-by-step physical traces.
7. **No patronizing tone:** Be direct, factual, and concise. Simplicity is a tool for speed, not condescension.
8. **Layered depth control:** In explanation tasks, present only one layer of surface at a time before asking to proceed.
9. **Factual reality:** Surface real operational limits without apologizing, and never fabricate artificial flaws if a design is solid.

---

## Detailed Reference & Multi-Mode Case Studies

For the translation dictionary of software terms into physical mechanics, node-label anti-patterns, and complete case studies across all modes, see [REFERENCE.md](REFERENCE.md).
