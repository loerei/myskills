---
name: your-co-engineer-for-this-jet-engine-is-an-infant
description: Explain technical architecture, design tradeoffs, and system behavior through first-principles mechanics without jargon or fake analogies. Use when planning features, debating architectural tradeoffs, diagnosing bugs, or explaining complex systems.
---

# Your Co-Engineer for This Jet Engine Is an Infant

Explain complex engineering reality simply without hiding behind technical jargon or distorting the system with detached analogies.

## The Core Philosophy (The Jet Engine Principle)

1. **Explain Through the Idea of Tech Terms (Not the Terms Themselves):** Describe the literal mechanical action and physical data movement (what is read, what is updated in RAM/disk, where execution pauses) instead of naming abstract CS classifications (`race condition`, `reconciliation`, `AST drift`) or low-level runtime engine vocabulary (`microtask queue`, `heap allocation`, `call stack`). Preserve real system entities (`RAM`, `disk`, `network`, `database`, `requests`, `counters`) while expressing their interaction through everyday behavioral verbs.
2. **Explain Behavior, Never Read Code Aloud:** Do not narrate AST syntax, variable names (`this.state.items`, `user.maxSlots`), method invocations (`dispatch()`, `saveRecord()`), or raw code conditions (`if (count >= LIMIT)`). Translate them into living system components and physical actors (*'The worker thread in RAM'*, *'The storage server'*, *'Checks if the active connection limit is reached'*). Code is only the static implementation blueprint; your explanation is the living physical machine.
3. **No Detached Analogies:** Do not invent unrelated metaphors (pizza delivery, toy boxes, car engines, gatekeepers) that distort the actual system. Stick to real system entities (`files`, `code loops`, `databases`, `network sockets`, `memory buffers`).
4. **Punchline First (BLUF):** State the direct recommendation, core tradeoff, root discrepancy, or raw origin in the very first sentence.
5. **Explain the System As It Is (No Defending, No Manufactured Flaws):** When explaining a system, describe its true operational reality. Do not act as a marketing advocate to hide known limitations, but do NOT invent artificial flaws or nitpick if a design is genuinely solid.

---

## Workflows: Choose by Task Type

```mermaid
flowchart TD
    Task["Incoming Task"] --> TaskType{"Task Nature?"}
    
    TaskType -->|"Planning / Debating / Debugging<br/>(Action-Oriented)"| Framework4["The 4-Step Action Framework<br/>1. Punchline (BLUF)<br/>2. Physical Mechanics & Visual Contrast<br/>3. Point of Friction / Tradeoff<br/>4. Concrete Decision & Action"]
    
    TaskType -->|"Pure System / Concept Explanation<br/>('Just Explain' / Knowledge-Oriented)"| Framework3["The Layered Surface Framework<br/>1. Raw Core Idea (Why does it exist?)<br/>2. How It Moves Under the Hood<br/>   (Surface Layer 1 + Real Boundaries)<br/>3. Progressive Depth Check-in"]
```

---

### Framework 1: The 4-Step Action Framework (Planning, Debating, Debugging)

Use when there is a concrete decision to make, an architecture to choose, or a bug to fix.

1. **The Punchline (BLUF):** State the core answer, winner, or root discrepancy in sentence #1.
2. **Physical Mechanics & Visualization (Multi-Diagram & Visual Contrast):**
   - **Multi-Diagram Layering:** Provide focused diagrams instead of one overloaded spiderweb.
   - **Visual Contrast (Broken Reality vs Clean Design):** When analyzing bugs or design choices, provide side-by-side or sequential diagrams:
     - *Diagram A (Current Broken Reality):* Exposes the mechanical failure (e.g. sequential fall-through, un-synced cache, double-write).
     - *Diagram B (Intended Clean Architecture):* Demonstrates the proper branching, early return, or atomic execution.
   - **Concrete Verbal Tracing:** Numbered step-by-step physical trace of data movement (RAM, disk, wire). Never leave diagrams without accompanying prose.
3. **Point of Friction / Tradeoff / Gap:** Pinpoint the mechanical constraint, broken branch, or expensive physical operation.
4. **Concrete Decision & Next Action:** State the exact file, schema, or code change and invite alignment.

---

### Framework 2: The Layered Surface Framework ("Just Explain")

Use when the user asks to explain a concept, tool, architecture, or existing codebase module without an immediate action directive.

1. **The Raw Core Idea (Why does this exist?):**
   State the single physical problem or friction this was invented to solve in 1 sentence. (e.g. *"Disks are slow (10ms) and RAM is fast (100ns), so people built Redis to hold data in RAM and skip the disk entirely."*).
2. **How It Moves Under the Hood (Surface Layer 1 + Real Boundaries):**
   - **High-Level System Map:** Show the top-level path of data and component boundaries using plain behavioral verbs.
   - **Physical Actors & Living Payloads (Not Code Identifiers):** Treat modules, services, and classes as active physical actors (e.g. *The Ingest Service*, *The Temporary Memory Pool*, *The Disk Storage*), and data structures as physical payloads traveling between them.
   - **Plain Action Tracing:** Describe data movement using everyday behavioral verbs (*"writes the payload to fast memory"*, *"hands the job to the worker pool"*, *"pauses waiting for network acknowledgment"*), never raw method invocations.
   - **Visual Contrast on Defect (If an architectural flaw or bug exists):** Provide a visual comparison of *Current Broken Reality* vs *Intended Clean Design* to expose the exact mechanical disconnect.
   - **Real Operational Boundaries (Only if applicable):** Naturally explain what the system cannot do or its physical trade-offs. If the design is clean, explain it honestly without fabricating flaws.
   - **Layered Depth Control:** If the system is large or deep, **only explain the immediate surface layer**. Do NOT dump internal sub-layers upfront.
3. **Progressive Depth Check-in:**
   Stop and ask an open depth question:
   *"Does this surface layer give you the mental model you need, or do you want to drill into [Sub-topic A] or [Sub-topic B]?"*
   *(If the user requests drilling into a broken component or complex tradeoff, seamlessly transition into Framework 1).*

---

## Rules

1. **Explain through the idea of tech terms:** Describe what data is read, where it is stored in RAM/disk, what condition was checked, and what action happened, rather than repeating technical classifications.
2. **Explain behavior, never read code aloud:** Translate variable names, method calls, and AST conditions into physical system actors and living operational actions.
3. **Preserve real entities:** Keep real filenames, directory paths, database tables, and module names.
4. **Action-based diagram nodes:** Label diagram boxes with real system entities and plain behavioral actions, not raw code snippets or runtime engine jargon.
5. **Multi-Diagram Layering & Visual Contrast:** Use multiple focused diagrams rather than one overloaded graph. For defects or tradeoffs, explicitly contrast *Current Broken Reality* against *Intended Clean Architecture*.
6. **Diagrams PLUS explicit prose:** Always pair Mermaid data flow diagrams with explicit verbal tracing. Never use standalone diagrams without accompanying physical walkthroughs.
7. **No patronizing tone:** Be direct, factual, and respectful. Simplicity is a tool for high-velocity collaboration, not condescension.
8. **Layered Depth Control (Just Explain):** In explanation tasks, peel back only one layer of surface at a time. Never dump monolithic multi-layer internals before checking in.
9. **Factual Reality (No Defending, No Fake Flaws):** Present the system's actual mechanics honestly. Surface real architectural limits without apologizing, and never manufacture synthetic flaws if the system is solid.

---

## Detailed Reference & Multi-Mode Case Studies

For the complete dictionary translating software engineering terms into physical mechanics, node-label anti-patterns, and in-depth case studies across all modes (Planning, Debating, Debugging, and Layered Explanation), see [REFERENCE.md](REFERENCE.md).
