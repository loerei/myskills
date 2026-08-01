# Productivity

General workflow tools, not code-specific.

## User-invoked

Reachable only when you type them (Claude Code: `disable-model-invocation: true`; Codex: `policy.allow_implicit_invocation: false` in `agents/openai.yaml`).

- **[batch-grill-me](./batch-grill-me/SKILL.md)** — Run grill sessions in batch across multiple topics or decision trees.
- **[claude-handoff](./claude-handoff/SKILL.md)** — Export conversation state specifically formatted for Claude handoff.
- **[grill-me](./grill-me/SKILL.md)** — Get relentlessly interviewed about a plan or design until every branch of the decision tree is resolved.
- **[handoff](./handoff/SKILL.md)** — Compact the current conversation into a handoff document so another agent can continue the work.
- **[loop-me](./loop-me/SKILL.md)** — Execute an interactive feedback loop with user input checkpoints.
- **[ponytail](./ponytail/SKILL.md)** — Inspect and run ponytail optimizations across workspace skills.
- **[ponytail-audit](./ponytail-audit/SKILL.md)** — Audit skill complexity and context footprint against ponytail baselines.
- **[ponytail-debt](./ponytail-debt/SKILL.md)** — Report technical debt and context sediment accumulated in skills.
- **[ponytail-gain](./ponytail-gain/SKILL.md)** — Show ponytail's measured impact as a compact scoreboard.
- **[ponytail-help](./ponytail-help/SKILL.md)** — Quick-reference card for all ponytail modes, skills, and commands.
- **[ponytail-review](./ponytail-review/SKILL.md)** — Perform multi-aspect ponytail review of skill structures.
- **[prune-branches](./prune-branches/SKILL.md)** — Audit, deep-review, and prune stale or merged Git branches locally and on remotes.
- **[request-refactor-plan](./request-refactor-plan/SKILL.md)** — Create a detailed refactor plan with tiny commits via user interview, then file it as a GitHub issue.
- **[review-upstream](./review-upstream/SKILL.md)** — Sync and review custom skill updates from upstream repositories.
- **[teach](./teach/SKILL.md)** — Teach the user a new skill or concept over multiple sessions, using the current directory as a stateful teaching workspace.
- **[writing-great-skills](./writing-great-skills/SKILL.md)** — Reference for writing and editing skills well: the vocabulary and principles that make a skill predictable. Core SSOT: [HEURISTICS.md](./writing-great-skills/HEURISTICS.md)

## Model-invoked

Model- or user-reachable (rich trigger phrasing so the model can reach for them).

- **[brave-browsing](./brave-browsing/SKILL.md)** — Configure and execute Chrome DevTools MCP server using Brave browser. Subdocs: [SETUP.md](./brave-browsing/SETUP.md) | [EXTENSION-POPUP.md](./brave-browsing/EXTENSION-POPUP.md)
- **[caveman](./caveman/SKILL.md)** — Ultra-compressed communication mode cutting token usage while preserving technical accuracy.
- **[conduct-reviewing-loop](./conduct-reviewing-loop/SKILL.md)** — Conduct an iterative, multi-turn review loop using independent subagents to stress-test plans (Mode A) or validate code implementation `.diff` artifacts (Mode B) until `PASS` status. Subdocs: [MODE-A-DESIGN-AUDIT.md](./conduct-reviewing-loop/MODE-A-DESIGN-AUDIT.md) | [MODE-B-CODE-VALIDATION.md](./conduct-reviewing-loop/MODE-B-CODE-VALIDATION.md)
- **[create-and-update-pr](./create-and-update-pr/SKILL.md)** — Create GitHub Pull Requests and dynamically update their descriptions to match recent commit changes.
- **[design-an-interface](./design-an-interface/SKILL.md)** — Generate multiple radically different interface designs for a module using parallel sub-agents.
- **[full-output-enforcement](./full-output-enforcement/SKILL.md)** — Overrides default LLM truncation behavior to enforce complete, unabridged output.
- **[git-guardrails-claude-code](./git-guardrails-claude-code/SKILL.md)** — Set up Claude Code hooks to block dangerous git commands before execution.
- **[grilling](./grilling/SKILL.md)** — Interview the user relentlessly about a plan, decision, or idea until every branch of the decision tree is resolved.
- **[manage-custom-skills](./manage-custom-skills/SKILL.md)** — Create, update, and distribute custom agent skills from the central repository to project workspaces.
- **[manage-global-policies](./manage-global-policies/SKILL.md)** — Create, update, or edit global policy rules for AI agents across multi-IDE platforms.
- **[qa](./qa/SKILL.md)** — Interactive QA session where user reports bugs conversationally, and the agent files GitHub issues.
- **[review](./review/SKILL.md)** — Perform comprehensive code reviews, plan checks, and quality audits.
- **[scaffold-exercises](./scaffold-exercises/SKILL.md)** — Create exercise directory structures with sections, problems, solutions, and explainers that pass linting.
- **[to-issues](./to-issues/SKILL.md)** — Break a plan, spec, or PRD into independently-grabbable issues using tracer-bullet vertical slices.
- **[to-prd](./to-prd/SKILL.md)** — Turn current conversation context into a PRD and publish it to the project issue tracker.
- **[to-questionnaire](./to-questionnaire/SKILL.md)** — Generate structured questionnaires to solicit requirements from users.
- **[write-a-skill](./write-a-skill/SKILL.md)** — Create new agent skills with proper structure, progressive disclosure, and bundled resources.
- **[write-for-ai](./write-for-ai/SKILL.md)** — Review, edit, or write AI-facing text for maximum signal-to-noise ratio and token efficiency.
- **[write-pr](./write-pr/SKILL.md)** — Write and format GitHub Pull Requests according to standard repository guidelines.
- **[write-skill-subdocs](./write-skill-subdocs/SKILL.md)** — Extract supporting material from `SKILL.md` into disclosed sub-documents (`REFERENCE.md` or `TYPE/DOMAIN.md`) using mathematical invariant $\sum(\text{reference bytes loaded per execution path})$ and 6-column matrix (`ID | Component | Needed Every Run? | Trigger | Dependencies | Decision`). Core SSOT: [HEURISTICS.md](./writing-great-skills/HEURISTICS.md)
