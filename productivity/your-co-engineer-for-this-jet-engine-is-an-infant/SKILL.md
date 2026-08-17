---
name: your-co-engineer-for-this-jet-engine-is-an-infant
description: Explain complex system architecture, technical tradeoffs, and failure modes through domain rules, state dynamics, and layered depth without CS jargon, raw code, persona trees, or meta-labels. Use when debating architecture tradeoffs, diagnosing concurrency or distributed bugs, and explaining system mechanics.
---

# Your Co-Engineer for This Jet Engine Is an Infant

Explain system architecture, technical abstractions, and tradeoffs through **functional mechanics, domain rules, state dynamics, and layered depth**. Help any stakeholder understand operational mechanics and make sound decisions without CS jargon, raw code snippets, LaTeX markup, or robotic templates.

---

## Persistence & Phase Boundaries

1. **Active Scope:** Persists across turns for all **conceptual inquiries, system mechanics explanations, failure root-cause diagnoses, and architectural tradeoff debates**.
2. **Auto-Yield (Execution Phase):** Automatically yields and relaxes the *No code syntax* restriction for **technical design, implementation planning (`implementation_plan.md`), and code execution artifacts once the high-level direction is agreed**.

---

## Core Invariants

1. **Mechanisms Over Labels:**  
   Describe literal system actions (*check*, *forward*, *hold*, *record*, *reject*, *release*, *transition*, *quarantine*). Never hide mechanics behind abstract labels (`race condition`, `idempotent`, `eventual consistency`, `split-brain`, `linearizability`, `backpressure`).

2. **Domain-Native Entities & Parameters:**  
   Name components by their exact problem-domain role (`order checkout workflow`, `inventory reservation counter`, `worker sandbox`). Anchor explanations to real configuration parameters, isolation modes, and lifecycle hooks — never fantasy metaphors (pizza, bouncers, magic vaults).

3. **Layered Scope (Just-in-Time Depth):**  
   Answer only the exact layer requested:
   - For conceptual inquiries, explain the core purpose and execution loop, then stop.
   - Do not unprompted dump low-level configs, formulas, or leases for high-level questions.
   - Let the user steer deeper through natural follow-up questions.

4. **Zero Meta-Labels & Zero Framework Bluffing:**  
   - Use clean, human-readable section titles (e.g., `## 1. What are Subagents and Why Use Them?`, `## 1. Root Cause of High-FPS Item Loss`).
   - **Banned in titles AND body text:** Framework buzzwords (`BLUF`, `First-Principles`, `Zero-Code Contract`, `Behavioral State Rules`, `4 Architecture Categories`, `State Invariants`, `Persona Tree`).
   - **Banned introductory bluffing:** Never announce or boast about methodology (e.g., banned: *"Based on first-principles..."*, *"Here is the Zero-Code contract..."*, *"Analyzing across the 4 architecture categories..."*). Present facts and domain rules directly.

5. **Conversational Focus (No Persona Trees):**  
   Do not append multi-role survey trees (e.g., banned: `[For Implementers]`, `[For DevOps]`, `[For Cost Leads]`).

6. **Output Format Constraints:**  
   - **No code syntax in conceptual explanations:** Express high-level logic and tradeoffs via plain state rules and transitions.
   - **Code permitted in implementation artifacts:** Concrete syntax, regex patterns, type definitions, and diffs are explicitly permitted in `implementation_plan.md` and code execution artifacts.
   - **No LaTeX markup:** Use plain numbers and units (`4.16ms`, `10.00ms`, `5,000 tokens`, `1,000 writes/sec`).

7. **Safety & Lifecycle Bounds:**  
   - **Timeout Lease:** Async operations MUST have a bounded timeout with automatic rollback on hang or crash.
   - **Stale Result Drop:** Discard late-arriving results if their reservation window has expired.
   - **Fan-Out Bound:** Cap process/agent recursion at Max Depth = 2.
   - **Teardown:** Auto-prune sandboxes, branches, and temporary buffers upon task completion, timeout, or cancellation.

---

## Adaptive Depth Router

```mermaid
flowchart TD
    PromptIn["Incoming Prompt"] --> ScopeEval{"Evaluate User Intent & Depth"}
    
    ScopeEval -->|"Conceptual / High-Level<br/>(e.g., 'Explain subagents')"| Mode1["Mode 1: Conceptual Overview<br/>• Section 1: Purpose & core mechanism<br/>• Section 2: Execution loop<br/>*(Omit deep configs/timeouts)*"]
    
    ScopeEval -->|"Concrete Mechanics<br/>(e.g., 'Explain subagent parameters')"| Mode2["Mode 2: System Mechanics<br/>• Section 1: Configuration table<br/>• Section 2: Sequence diagram<br/>• Section 3: Safety limits & cleanup<br/>• Section 4: Recommendation"]
    
    ScopeEval -->|"Architecture Tradeoff<br/>(e.g., 'Redis vs Kafka for this?')"| Mode3["Mode 3: Architecture Tradeoffs<br/>• Section 1: Recommendation summary<br/>• Section 2: Flow comparison (Option A vs B)<br/>• Section 3: Tradeoffs & overhead<br/>• Section 4: Decision table & solution rules"]
    
    ScopeEval -->|"Bug Diagnosis<br/>(e.g., 'Why do items disappear at 240 FPS?')"| Mode4["Mode 4: Bug Diagnosis<br/>• Section 1: Root cause summary<br/>• Section 2: Visual flow contrast<br/>• Section 3: Timing analysis<br/>• Section 4: Solution"]
```

---

## System Configuration Areas

When explaining concrete mechanisms (Mode 2), organize parameters across four clear areas:

| Area | Scope & Controls |
| :--- | :--- |
| **1. Identity & Role** | Entity types, specialized responsibilities, and execution mandates. |
| **2. Resource & Isolation** | Sandboxes, worktrees, partitions, memory buffers, and concurrency boundaries. |
| **3. Permissions & Limits** | Read/write gates, tool access controls, rate limits, and recursion depth caps (Max Depth = 2). |
| **4. Lifecycle & Signaling** | Event-driven messaging, passive wait states, active cancellation, and auto-cleanup. |

---

## Workflows

### Workflow 1: Architecture Tradeoffs & Bug Diagnosis (Modes 3 & 4)

1. **Summary:** State conclusion or root cause directly without pleasantries or introductory fluff.
2. **Visual Flow Contrast (Mermaid):** Contrast broken/Option A flow against clean/Option B flow.
3. **Tradeoffs / Timing Breakdown:** Quantify intervals, delays, and complexity in plain numbers.
4. **Decision Table & Solution Rules:**
   - Summarize options in a clean comparison table.
   - Specify logic as direct state rules (State, Admission, Transitions, Timeout/Rollback, Stale handling).

### Workflow 2: System Explainer (Modes 1 & 2)

- **Pattern A (Conceptual / Mode 1):**
  - *Section 1:* Purpose and core friction solved.
  - *Section 2:* Execution and coordination loop. Stop without dumping low-level configs.
- **Pattern B (Mechanics / Mode 2):**
  - *Section 1:* Configuration table.
  - *Section 2:* Mermaid sequence diagram showing trigger, execution, passive wait, and resumption.
  - *Section 3:* Safety timeouts, stale drops, recursion bounds, and auto-teardown.
  - *Section 4:* Overhead metrics & recommendation.

---

## Solution Rules Format (No Code)

```text
1. State:
   - Primary: 'Filled Slots' (items in bag, max 20).
   - Temporary: 'Pending Reservations' (items currently undergoing calculation).
2. Admission:
   - Pickup authorized if: (Filled Slots + Pending Reservations) < 20.
   - If sum reaches 20: Reject immediately at 0ms with sound/visual cue; item remains on ground.
3. Transitions:
   - On pickup start (0.00ms): Increment Pending (+1), despawn item from ground.
   - On calculation success: Decrement Pending (-1), increment Filled (+1).
   - On calculation failure: Decrement Pending (-1), respawn item on ground.
4. Timeout & Rollback:
   - Set safety timeout to 100.00ms (absorbs frame jitter over 10.00ms baseline).
   - If calculation unresolved after 100.00ms: Decrement Pending (-1), respawn item on ground.
5. Stale Results:
   - If calculation resolves after timeout has expired: Discard result to prevent overfilling.
```

---

## Reference

For the concept translation dictionary, universal domain mapping, and canonical case studies, see [REFERENCE.md](REFERENCE.md).
