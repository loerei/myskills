---
name: write-pr
description: Write and format GitHub Pull Requests according to standard repository guidelines. Use when generating, writing, or revising PR descriptions.
---

# Writing Pull Requests

## Quick start

Format PR titles using conventional commits: `feat(<scope>): <description>` or `fix(<scope>): <description>`.

Example of a standard PR description:
```markdown
## Summary
Adds a CLI help interface and short option aliases.

---

## Why
- Running the command with `--help` previously crashed.
- Typing full parameters was verbose.

---

## Implementation Details

### CLI
- Mapped short options in argument parser using a lookup dictionary.
- Added usage instruction prints.

### Tests
- Ran build validation successfully.

---

## Files Changed

### CLI
- `src/cli.ts`: Added help print function and short alias mappings.
```

## Plain English (No Fluff)

Write factual PR descriptions. State what changed, not how "powerful" or "robust" it is.

| Bad (Marketing / Fluff) | Good (Plain English) |
| :--- | :--- |
| `Leverages a cutting-edge, robust parsing engine to seamlessly process user input` | `Parses command-line arguments using a key-value dictionary` |
| `Significantly elevates developer velocity and eliminates workflow friction` | `Adds CLI aliases (-h, -d) for common commands` |
| `Engineered robust fail-safe mechanisms to mitigate critical crash hazards` | `Catches null pointer errors and returns default config if file is missing` |
| `Seamlessly integrates groundbreaking synchronization across distributed nodes` | `Syncs config files on save via webhook` |
| `Refactored foundational abstractions for superior maintainability and elegance` | `Extracted shared authentication logic into src/auth.ts` |

## Workflows

Checklist for generating PR descriptions:
- [ ] **Verify Session History & Scope**: Before drafting the description, retrieve conversational history using `chronicle-mcp` (`get_session_details` with `conversationStepsOnly: true`). Review the sequence of actions and check against base branch status. Do NOT read raw SQLite or jsonl transcripts directly. Distinguish between new features and modifications to existing code.
- [ ] **Plain English**: Ensure PR title and body are free of marketing adjectives ("robust", "seamless", "advanced").
- [ ] **Determine Scope**: Pick a scope for the title (e.g. `cli`, `server`, `core`, `utils`).
- [ ] **Draft Summary**: Summarize modifications and affected files concisely.
- [ ] **State Rationale (Why)**: Detail the problem solved and core improvements.
- [ ] **Explain Implementation**: Group technical details by component/module.
- [ ] **List Files**: Document modified files under their component groups, marking new files with `[NEW]`.

## References

For detailed guidelines on commit conventions and PR reviews, see the repository's main documentation.
