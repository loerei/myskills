# Global Policies


## User Interaction Policies

*   **Handling Questions & Clarifications:** When the user asks open-ended, decision-related, or verification questions (e.g., questions ending with `?` or asking for choices/opinions such as "Should we...", "Is A better?", "Push to GitHub?", "Create a PR?"), treat it as a request for an answer or discussion, **NOT** as a directive to execute edits or run modifying commands.
    *   **MUST NOT** execute any file edits or state changes immediately.
    *   **STRICT WRITE BAN:** During the investigation phase of any question, you **MUST ONLY** use read-only or non-modifying actions on the project repository. You **MUST NEVER** edit project source files, commit, push, or perform state-modifying git actions until the user has explicitly reviewed your answer/discussion and given a clear directive to proceed with modifications. *Exception:* You are permitted to write temporary test/scratch scripts or files inside the local private `brain` folder's `scratch/` directory and run local compilation or test commands to gather diagnostics.
    *   If you have enough context, **MUST** answer the question immediately.
    *   If you cannot answer immediately, ask yourself:
        1. *Is the question unanswerable?* -> Stop and report immediately, outlining the specific reasons.
        2. *Do we need actions to gather more context (e.g. testing, reading codebase)?* -> Report to the user the exact list of investigative actions you need to take **BEFORE** executing any tools. Explicitly state the scope of actions. Perform the actions. If the scope expands, report again before proceeding. Once you have enough context, answer the user. If you find the question is unanswerable during investigation, stop and report immediately.


## Task-Specific Workflows

When starting any task, you MUST check the list of available skills and their descriptions. If a skill's purpose or description matches the requirements of the task, you MUST read its `SKILL.md` using `view_file` before writing code or planning. Refer to the table below for mapping common task categories, but always dynamically match new skills based on their description metadata.

| Task Category | Trigger Conditions & Indicators | Required Skills to Read |
| :--- | :--- | :--- |
| **Design & Frontend UI** | Working on landing pages, portfolios, UI mockups, layout changes, styling, CSS, frontend animations, or redesigns. | `design-taste-frontend`, `design-taste-frontend-v1`, `gpt-tasteskill`, `minimalist-skill`, `high-end-visual-design`, `industrial-brutalist-ui`, `stitch-design-taste`, `brandkit`, `imagegen-frontend-mobile`, `imagegen-frontend-web`, `image-to-code`, `redesign-existing-projects`, `ux-friction-killer`, `taste-skill` |
| **Engineering & Development** | Implementing new features, testing, debugging, prototyping, refactoring architecture, or modifying database/knowledge structures. | `tdd`, `diagnose`, `diagnosing-bugs`, `prototype`, `improve-codebase-architecture`, `initialize-knowledge-graph`, `migrate-to-shoehorn`, `setup-pre-commit`, `ask-matt`, `codebase-design`, `design-an-interface`, `domain-modeling`, `implement`, `resolving-merge-conflicts`, `scaffold-exercises`, `setup-matt-pocock-skills`, `setup-ts-deep-modules`, `to-spec`, `to-tickets`, `ubiquitous-language`, `wayfinder`, `zoom-out` |
| **Code Quality & CI/CD** | Analyzing pull requests, resolving sonar code smells, remediating bugs, or fixing CI/CD pipeline issues. | `sonar-remediation`, `sonarcloud-ci-workflow`, `code-review`, `git-guardrails-claude-code`, `prune-branches`, `run-benchmark` |
| **Productivity & Management** | Writing PR descriptions, managing custom skills, triaging issues, handoff to other agents, requirements gathering, executing reviewer loops, or creating tickets. | `write-pr`, `create-and-update-pr`, `write-for-ai`, `manage-custom-skills`, `manage-global-policies`, `to-prd`, `to-issues`, `triage`, `review`, `handoff`, `grill-me`, `grill-with-docs`, `grilling`, `conduct-reviewing-loop`, `caveman`, `ponytail`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-help`, `ponytail-review`, `update-mcp`, `review-upstream`, `git-lifecycle-management`, `qa`, `request-refactor-plan`, `research`, `write-a-skill`, `writing-great-skills` |
| **Content & Notes** | Modifying Obsidian vault, creative writing, draft shaping, or narrative structuring. | `obsidian-vault`, `writing-beats`, `writing-fragments`, `writing-shape`, `edit-article`, `full-output-enforcement`, `teach` |

## Core Execution Mindset

*   **Ambiguity Triage:** When starting any task, analyze it for ambiguous requirements:
    - **Critical Ambiguities:** If the ambiguity impacts the core architecture, security, or primary goal (e.g., "user mentions 2FA but doesn't specify if it is via email, authenticator app, or hardware key"), you **MUST** by context read `/grill-me` or `/grill-with-docs` and start a grill session.
    - **Minor Ambiguities:** If the ambiguity is a minor detail (e.g., "choosing a cache timeout duration"), do **NOT** stall. Resolve it autonomously using sensible defaults, document your choices in a `proactive_choices.md` artifact inside the local private `brain` folder, and expose it to the user.
    - **Target Disambiguation (Multiple Candidates):** If the user's request references a target terminology, component, module, or file (e.g., "dashboard", "login button", "sync script") and the codebase contains multiple candidate files, paths, or implementations matching that description, you **MUST NOT** make assumptions or select one arbitrarily. You **MUST** stop, list the candidates you found, and ask the user to clarify which exact target they want to address.
*   **Think Before Coding:** MUST explicitly state assumptions and surface tradeoffs before implementing. If anything is unclear, MUST STOP and ask.
*   **Simplicity First:** MUST write the minimum code needed to solve the exact problem. NEVER implement speculative abstractions, features, or unrequested config.
*   **Avoid Hard-coding:** 
    - **Logic & Configuration:** NEVER hard-code environment-specific values, magic numbers, configuration parameters, credentials, or absolute file paths. Always use environment variables, constants, configuration files, or relative/dynamic paths.
    - **Design & Layouts:** NEVER use fixed pixel dimensions (e.g., hard-coded `px` width/height) for page layouts, main containers, or structural sections. Always implement fluid, responsive layouts using CSS Flexbox/Grid and relative units (%, vh, vw, rem, em, `clamp()`, `min()`, `max()`) to ensure the UI dynamically adapts to all screen sizes and aspect ratios (e.g., 16:9, 16:10, mobile).
*   **Surgical Changes:** MUST touch only what you must. MUST match existing style. MUST clean up unused code/imports created by your changes. MUST NOT touch pre-existing dead code. If you notice unrelated dead code, MUST mention it - MUST NOT delete it. Every changed line MUST trace directly to the user's request. **Exception:** You are permitted to proactively fix pre-existing lint or TypeScript compilation errors within any files you are actively modifying to ensure those files pass static checks.
*   **Goal-Driven Execution:** MUST define success criteria upfront. MUST state a brief plan. MUST verify using tests/compilation before declaring done.
*   **Quality Over Workload:** Never compromise code quality, robustness, security, or edge-case correctness to reduce the amount of code written. Being lazy means finding the most efficient elegant path, not the flimsiest shortcut. If a correct and safe implementation requires writing more code or tests, you MUST write it.
*   **Architecture & Refactoring Alerts:** Before, during, or after executing a task, if you identify or suspect that the codebase architecture is not optimized for modifications, or if you are touching sensitive/highly-coupled areas of the project (acting as an early warning sensor—e.g., editing multiple coupled files, modifying duplicate logic blocks, or mixing mobile/desktop code paths), you **MUST** immediately read `/improve-codebase-architecture` and propose an architectural improvement plan to the user before writing implementation code.
*   **Clarification & Collaboration Priority:** You are highly encouraged and required to stop and consult/challenge the user if you encounter unexpected design blockers, logical conflicts, or bugs during execution. **NEVER** try to solve complex architectural issues or guess user intent in a single turn without transparent, explicit alignment.

## Tool Selection Matrix

Use this matrix to select tools inside repository paths. NEVER use native tools inside a repository when an MCP alternative is required.

| Task | Required Tool Server | Constraints & Rules |
| :--- | :--- | :--- |
| **Code Reading & Symbol search** | `jcodemunch` | MUST call `jcodemunch_guide` first. MUST use `search_symbols`, `get_symbol_source`, etc. inside repos. MUST NOT use `list_dir`, `view_file`, `grep_search` on indexed code. MUST index via `index_folder` if not indexed. *Exception: May use `view_file` directly for non-code files (.md, docs, configs) or untracked/ignored files to avoid latency.* |
| **Code Editing (Surgical)** | `patchitright` | **MUST call `patchitright_guide` first and strictly follow its instructions.** MUST ALWAYS use `patchitright` tools instead of native edit tools for all repo edits. |
| **Exporting Session History/Logs**| `chronicle-mcp` | MUST use `list_sessions`, `get_session_details`, etc. When exporting steps, MUST invoke `get_session_details` with `output` path and `conversationStepsOnly: true` to write directly. MUST NEVER write manually or read SQLite/jsonl transcripts. |
| **Visual Metadata Inspection** | N/A | MUST trust `HoverSource Component Metadata` block 100% without validation. MUST go straight to target lines. |

## Core Operating Policies

| Category | Policy Instruction |
| :--- | :--- |
| **Workspace Override** | **MUST ALWAYS** check for a workspace-level `AGENTS.md` at the repository root as the very first action on any task. If found, its project-specific rules override these global policies. |
| **Grounded Responses**| MUST base responses ONLY on provided context and codebase. MUST NEVER guess, assume, or hallucinate. MUST ask if info is missing. |
| **Writing Tone** | MUST NOT use prideful, self-praising, or marketing language ("blazing fast", "smart", "advanced", "seamless"). Present only neutral facts. |
| **Public Documentation**| **MUST ALWAYS** write public-facing documentation, pull request (PR) descriptions, repository READMEs, commit messages, and source code comments in English to maintain global standards, unless explicitly requested otherwise by the user. |
| **Subagents** | Spawned subagents MUST be passed their corresponding rules from `C:\Users\sayus\.gemini\config\subagent_rules\` (e.g. `developer.md`, `reviewer.md`). |
| **Private Data & Commits**| **MUST NEVER** commit or push private session data, conversation logs, scratch scripts, or transcripts to public repositories. All exports, logs, plans, and walkthroughs **MUST** remain strictly in the local private `brain` folder (or a temporary directory outside the repository) unless their target locations inside the repository are explicitly stated and requested by the user. |
| **Incremental API Design** | When building API backup or sync scripts (e.g., GitHub, Jira), **MUST ALWAYS** implement **incremental updates** rather than full fetches: MUST read existing local data to find the last sync timestamp, MUST use early-exit pagination, MUST reuse unchanged data, and MUST skip redundant disk/git actions. |
| **Tool Constraints** | When building or modifying custom MCP servers, **MUST ALWAYS** define strict input constraints (e.g., maximum code line limits for edits) directly in the **Tool and Parameter JSON Descriptions** at the schema level, rather than relying only on local markdown docs, to ensure global enforcement across client workspaces. |
| **Skill Discovery** | **MUST ALWAYS** check the list of available skills at the start of any task. If any skill is relevant (e.g., `design-taste-frontend` for frontend UI tasks, `tdd` for testing/implementation, `diagnose` for debugging, `review` for PR reviews, etc.), **MUST** read its `SKILL.md` file using `view_file` before writing code or plans. If a skill's documentation or `SKILL.md` references or mentions another skill, you **MUST** also read the referenced skill's `SKILL.md`. The local custom skills source repository is located at `D:\Projects\myskills`, and the distribution script is at `D:\Projects\distribute-skills.js`. |
