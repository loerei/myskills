# Google Antigravity / Gemini Policy Delta

> [!NOTE]
> *I extracted Antigravity's full raw system instructions, and honestly, Google is trolling its users, prompting the agent as if everyone's just asking for slop Rock-Paper-Scissors or a Tetris clone. So this folder holds the wrapped policy layer engineered to clip those bad habits.*

This directory (`gemini/`) contains the custom override rules for **Google Antigravity / Gemini**.

When you run `distribute-skills`, `gemini/AGENTS.md` automatically overrides root `AGENTS.md` and syncs to `~/.gemini/AGENTS.md`.

---

## What's in here?

### 1. [`AGENTS.md`](AGENTS.md) — The Gemini Delta
Root policy handles universal agent rules. This delta tackles Gemini's specific system prompt quirks:

- **Micro-anchors (§4, §6):** Slaps overrides right on top of Antigravity's system tags (`<planning_mode>`, `<web_application_development>`, `<communication_style>`, `<identity>`) so the model doesn't drift.
- **Design Quality (§4):** Replaces Google's *"add gradients, micro-animations, and glassmorphism to wow the user"* directive with clean, project-appropriate standards.
- **Anti-Energy Kill List (§6):** Cuts out the fluff:
  - *Thinking traps:* pattern-guessing, premature "I found it!", claiming fixes without test proof.
  - *Chatter traps:* marketing hype ("blazing fast!"), enthusiasm hedging, celebratory emojis.

### 2. [`override_coverage_report.md`](override_coverage_report.md) — The Receipts
Full audit breakdown of all 11 prompt conflicts (#1–#11) and 7 bad default behaviors (A–G) we found in Antigravity's system prompt, documenting why each override rule exists.

### 3. [`raw_system_instructions.md`](raw_system_instructions.md) — Primary Source
Exact, un-edited text of Antigravity system-level instruction tags (`<identity>`, `<web_application_development>`, `<planning_mode>`, `<guidelines>`, `<communication_style>`).

---

## Quick Check

Inspect active policy resolution paths:
```bash
distribute-skills --info gemini.policy
```
