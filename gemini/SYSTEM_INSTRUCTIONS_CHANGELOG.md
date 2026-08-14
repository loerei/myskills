# Google Antigravity System Instructions Changelog

This document tracks changes in the raw system-level prompt instructions injected by Google Antigravity into Gemini sessions.

---

## [v2.8.0] - 2026-08-14

### Summary of Major Evolutions
Google DeepMind transitioned Antigravity from an early 2023-era decorative prompt into a function-driven, asynchronous agentic workflow system with dedicated reactive messaging, slash commands, and an explicit list of forbidden design clichés.

---

### Detailed Section-by-Section Diff

#### 1. `<web_application_development>`
* **Changed:** Completely discarded the legacy "Rich Aesthetics" philosophy (*glassmorphism, vibrant colors, sleek dark modes, smooth gradients, WOW the user*).
* **Added:** **Function-Driven Design** as Principle 0 (*"analyze the primary utility... default to the simplest, most intuitive structure... Avoid decorative fluff, trendy gimmicks"*).
* **Added:** **10 Forbidden Cliché Design Tropes**:
  1. `No Dashboard Overuse`
  2. `No Purple on Dark`
  3. `No Colored Border Accents`
  4. `No Huge Untracked Typefaces`
  5. `No Textureless Surfaces`
  6. `No Icon-Stuffed Bento Boxes`
  7. `No Headline Biscuit Pills`
  8. `No Gradient Keywords`
  9. `No Grid Backgrounds`
  10. `No Over-Nested Cards`
* **Remaining Flaw:** Maintained an internal contradiction between Section 0 (simplicity first) and the final line (`CRITICAL REMINDER: AESTHETICS ARE VERY IMPORTANT. If your web app looks simple and basic then you have FAILED!`).

#### 2. `<guidelines>`
* **Removed:** Stripped out 20+ project-specific micro-rules from legacy Google internal projects, including:
  - `No Blocking Calls on Main Looper Threads` (`webLatch.await` Android UI)
  - `Thread Pool Shutdown Safety`
  - `Check Command Registries` (`CLIENT LIST`, `CLIENT KILL`)
  - `Dynamic Layout Math`
  - `Traceback Justification Required`
  - `Inspect Logs & Stack Traces Before Diagnosing Errors`
* **Changed:** Simplified down to a single universal rule preserving documentation integrity and comments.

#### 3. `<communication_style>` & Background Tasks
* **Removed:** Deleted mandatory turn-end summary requirement (`Provide a summary of your work when you end your turn.`).
* **Removed:** Deleted legacy background task polling instructions (`After launching a background task... YOU MUST TAKE ONE OF THE FOLLOWING TWO ACTIONS...`).

#### 4. New Core Architecture Tags (Added)
* **`<messaging>` (NEW):**
  - Defines **Reactive Wakeup** mechanism.
  - Formally bans polling loops when waiting for subagents, background tasks, or user messages.
* **`<conversation_transcript>` (NEW):**
  - Defines `.jsonl` transcript structure (`transcript.jsonl` vs `transcript_full.jsonl`).
  - Standardizes the `conversation://<id>` URI scheme for cross-session referencing.
* **`<slash_commands>` (NEW):**
  - Formally documents user slash commands (`/goal`, `/schedule`, `/browser`, `/grill-me`, `/teamwork-preview`, `/learn`).
* **`<planning_mode_artifacts>` (NEW):**
  - Provides full template schemas for `implementation_plan.md` and `walkthrough.md`.

---

## [Legacy Snapshot] - Baseline (`gemini/raw_system_instructions.md`)
* Initial snapshot recording the baseline system prompt containing 20+ specialized guidelines and the legacy aesthetic instructions.
