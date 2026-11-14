# Google Antigravity / Gemini Policy Delta

Why [`AGENTS.md`](AGENTS.md) exists alongside the root policy.

Google eventually cleaned up the worst parts of Antigravity's old v2.8.0 system prompt (the aesthetic hype lectures, the line about simple apps being failures, and the instruction letting the agent skip planning whenever it felt like it). The Oct 2026 and legacy v2.8.0 snapshots are still archived in [`System_Instruction.md`](System_Instruction.md) if you want the receipt.

With Gemini 4 Hydrogen and the slimmer Antigravity prompt, most of those old workarounds are gone. A smaller delta still stays around for two reasons that didn't go away:

1. **Silent context compaction still drops working state.** When Antigravity injects `<CONTEXT_SUMMARY>`, it tracks touched files but loses which skills, review tags, and invariants were active, and tells the model not to acknowledge the checkpoint. [`AGENTS.md`](AGENTS.md) overrides that suppression rule and forces the agent to maintain and re-read `What To Re-read After A Checkpoint.md`.
2. **RLHF defaults still push premature closure and filler.** Even without the old prompt bloat, Gemini models still reach for `"I found it!"` guesses, applause (`"Great question!"`), and unverified fixes unless pinned down by Tier gates, the Kill List, and active tag overrides (`<identity>`, `<guidelines>`, `<communication_style>`).

## Files

- [`AGENTS.md`](AGENTS.md) - Root policy plus Antigravity overrides, synced to `~/.gemini/AGENTS.md` via `agents distribute`.
- [`System_Instruction.md`](System_Instruction.md) - Archived Antigravity system prompt snapshots (Aug 2026 v2.8.0 and Oct 2026).
- [`override_coverage_report.md`](override_coverage_report.md) - Historical conflict audit against the legacy v2.8.0 prompt.
- [`SYSTEM_INSTRUCTIONS_CHANGELOG.md`](SYSTEM_INSTRUCTIONS_CHANGELOG.md) - Diff notes from comparing the earlier raw prompt captures.
