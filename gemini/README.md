# Google Antigravity / Gemini Policy Delta

I extracted Antigravity's raw system instructions twice (`raw_system_instructions.md` and then `v2.8.0`), and honestly, Google is trolling. Even after adding 10 forbidden cliché design rules in v2.8.0, they still left a line screaming that simple apps are failures, while telling the agent it can skip planning whenever it feels like it.

On top of that, Antigravity has this habit of silently compacting your chat when token limits hit. The context summary only tracks files you edited, so the model immediately forgets what skills you loaded, what review tags you were using, and starts hallucinating.

So this folder holds the policy delta that clips those bad habits before the model does something stupid.

When you run `agents distribute`, `gemini/AGENTS.md` automatically overrides the root rules and syncs to `~/.gemini/AGENTS.md`.

---

## What's in here

- **[`AGENTS.md`](AGENTS.md)**: The actual policy file. It forces the agent to keep a small checklist (`What To Re-read After A Checkpoint.md`) so it can reload its skills and tool guides after a checkpoint, and stops it from editing code without approval.
- **[`override_coverage_report.md`](override_coverage_report.md)**: The audit sheet where we cross-referenced all 11 prompt conflicts and 7 bad defaults we found in Google's prompt.
- **[`SYSTEM_INSTRUCTIONS_CHANGELOG.md`](SYSTEM_INSTRUCTIONS_CHANGELOG.md)**: Notes on what Google changed between the raw prompt snapshots.
- **[`raw_system_instructions.v2.8.0.md`](raw_system_instructions.v2.8.0.md)**: The raw v2.8.0 system prompt from Antigravity.
- **[`raw_system_instructions.md`](raw_system_instructions.md)**: The older baseline system prompt with all the legacy Android guidelines.

---

## Quick Check

```bash
agents info policy.gemini
```
