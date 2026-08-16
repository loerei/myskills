---
name: write-a-skill
description: Create new agent skills with proper structure, progressive disclosure, and bundled resources. Use when user wants to create, write, or build a new skill.
---

# Writing Skills

## Process

1. **Gather requirements**: Domain scope, specific use cases, scripts needed, reference materials.
2. **Draft skill**: SKILL.md instructions, plain English rules, Mermaid decision trees for multi-branch workflows, reference files based on complexity heuristics, utility scripts for deterministic tasks.
3. **Review with user**: Confirm use case coverage, clarity, and detail level.
4. **Distribute skill**: Sync across workspace targets using `agents --target <target-repo>` (or `agents --distribute`).

## Skill Structure

```
skill-name/
├── SKILL.md           # Main instructions (required)
├── REFERENCE.md       # Detailed docs (if needed)
├── EXAMPLES.md        # Usage examples (if needed)
└── scripts/           # Utility scripts (if needed)
    └── helper.js
```

## SKILL.md Template

````md
---
name: skill-name
description: Use when [specific triggers].
---

# Skill Name

## Quick start

[Minimal working example]

## Workflows

```mermaid
flowchart TD
    Start["Request / Trigger"] --> Decision{"Determine Scope"}
    Decision -->|"Branch A"| PathA["Execute Path A"]
    Decision -->|"Branch B"| PathB["Execute Path B"]
```

[Step-by-step processes with checklists for complex tasks]

## Advanced features

See [REFERENCE.md](REFERENCE.md) for advanced configuration and tool parameters.
````

## Plain English (No Fluff)

Keep skill instructions and templates simple. Do not write self-important rule titles or inflate basic steps.

| Bad (Bloated / Self-Important Skill Text) | Good (Plain English / Direct Workflow) |
| :--- | :--- |
| `Comprehensive Execution Architecture & Phased Pipeline` | `Workflow` |
| `Verify that optimal state convergence has occurred across all targets` | `Verify all tests pass and output matches schema` |
| `Execute deep forensic behavioral telemetry capture on unexpected anomalies` | `Save error logs to a file on failure` |
| `Robust enterprise-grade solution engineered to effortlessly orchestrate Git pull requests` | `Create and format pull requests. Use when opening or updating PRs.` |
| `Maintain absolute cognitive synergy with domain constraints throughout the turn` | `Follow existing naming conventions in the codebase` |

## Description Requirements

Surfaced in system prompt. Max 1024 chars, third-person, format: `<Capability>. Use when [specific triggers].` or simply `Use when [specific triggers].`

- **Good**: `Extract text/tables from PDF files. Use when working with PDF files or user mentions PDFs.`
- **Good**: `Use when asked to write a report for a bug.`
- **Bad**: `Helps with documents.` (Too vague)
- **Bad**: `Comprehensive multi-paradigm enterprise utility engineered to optimize document workflows...` (Marketing fluff)

## Mermaid Decision Trees

- **When**: Workflows with 3+ branching paths or complex fallback loops. Do NOT use for simple flat 1-2-3 linear steps.
- **How**: Quote labels containing brackets/parens (`Node["Label (Details)"]`). Keep flowcharts under 25-30 lines.

## File Splitting & Scripts

- **Scripts**: Add when operation is deterministic (validation, formatting), same code would be generated repeatedly, or errors need explicit handling.
- **File Split**: Move content out of SKILL.md when primary or secondary indicators are triggered per [HEURISTICS.md](../writing-great-skills/HEURISTICS.md) — execute extraction via [write-skill-subdocs](../write-skill-subdocs/SKILL.md).

## Review Checklist

- [ ] Description includes explicit triggers ("Use when...")
- [ ] Plain English: Section headers and rules are direct and fluff-free
- [ ] SKILL.md kept lean via complexity heuristics — see [HEURISTICS.md](../writing-great-skills/HEURISTICS.md)
- [ ] Mermaid decision tree used for workflows with 3+ branches
- [ ] No time-sensitive info
- [ ] Consistent terminology
- [ ] Concrete examples included
- [ ] References one level deep
- [ ] Skill distributed via `agents` CLI (`agents --distribute`)
- [ ] Policy coverage verified and auto-updated via `agents` CLI (`agents audit --add`)
