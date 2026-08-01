# Engineering

Development workflows, testing, architecture, diagnostics, and code quality.

## User-invoked

Reachable only when you type them (Claude Code: `disable-model-invocation: true`; Codex: `policy.allow_implicit_invocation: false` in `agents/openai.yaml`).

- **[git-lifecycle-management](./git-lifecycle-management/SKILL.md)** — Manage the git lifecycle for large sessions, including atomic commits, continuous PR updates, 150s CI audit loops, mandatory gate checks, and safe rollbacks.
- **[grill-with-docs](./grill-with-docs/SKILL.md)** — Stress-test plans, architecture, or design ideas using project domain documentation.
- **[run-benchmark](./run-benchmark/SKILL.md)** — Execute and analyze multi-variant A/B/C benchmark tests against codebases.
- **[setup-matt-pocock-skills](./setup-matt-pocock-skills/SKILL.md)** — Configure Matt Pocock TypeScript principles and guidelines across the workspace.
- **[setup-pre-commit](./setup-pre-commit/SKILL.md)** — Set up Husky pre-commit hooks with lint-staged (Prettier), type checking, and test suites.
- **[setup-ts-deep-modules](./setup-ts-deep-modules/SKILL.md)** — Configure deep module architecture boundaries and TypeScript module resolution.

## Model-invoked

Model- or user-reachable (rich trigger phrasing so the model can reach for them).

- **[ask-matt](./ask-matt/SKILL.md)** — Resolve complex TypeScript type errors and type system design questions.
- **[code-review](./code-review/SKILL.md)** — Perform thorough code reviews checking for bugs, anti-patterns, and architectural consistency.
- **[codebase-design](./codebase-design/SKILL.md)** — Shared vocabulary for designing deep modules, hiding implementation details, and finding clean seams.
- **[diagnose](./diagnose/SKILL.md)** — Disciplined diagnosis loop for hard bugs and performance regressions (reproduce $\rightarrow$ minimize $\rightarrow$ instrument $\rightarrow$ fix).
- **[diagnosing-bugs](./diagnosing-bugs/SKILL.md)** — Systematic bug diagnosis and performance profiling workflow.
- **[domain-modeling](./domain-modeling/SKILL.md)** — Build and sharpen a project's domain model, ubiquitous language, and architectural decision records.
- **[implement](./implement/SKILL.md)** — Implement features or fixes with surgical precision, minimal code footprint, and exact spec compliance.
- **[improve-codebase-architecture](./improve-codebase-architecture/SKILL.md)** — Propose and execute codebase refactoring plans before modifying sensitive or coupled areas.
- **[initialize-knowledge-graph](./initialize-knowledge-graph/SKILL.md)** — Automatically scan domain documents and module structure to build initial Knowledge Graphs.
- **[migrate-to-shoehorn](./migrate-to-shoehorn/SKILL.md)** — Migrate test files from risky `as` type assertions to `@total-typescript/shoehorn`.
- **[prototype](./prototype/SKILL.md)** — Build throwaway prototypes to validate state models, logic flows, or UI concepts.
- **[research](./research/SKILL.md)** — Investigate technical questions against primary sources and capture findings as Markdown reports.
- **[resolving-merge-conflicts](./resolving-merge-conflicts/SKILL.md)** — Resolve in-progress git merge and rebase conflicts safely.
- **[tdd](./tdd/SKILL.md)** — Test-driven development using red-green-refactor cycles and unit/integration test suites.
- **[to-spec](./to-spec/SKILL.md)** — Convert loose requirements or architectural discussions into formal technical specifications.
- **[to-tickets](./to-tickets/SKILL.md)** — Break specifications down into actionable, tracer-bullet implementation tickets.
- **[triage](./triage/SKILL.md)** — Triage incoming issues, bug reports, and code feedback systematically.
- **[wayfinder](./wayfinder/SKILL.md)** — Navigate unfamiliar codebases efficiently to discover symbols, call graphs, and entry points.
- **[wizard](./wizard/SKILL.md)** — Step-by-step interactive wizard for complex multi-step engineering tasks.
- **[zoom-out](./zoom-out/SKILL.md)** — Take a macro architectural view of the codebase before making large structural modifications.
