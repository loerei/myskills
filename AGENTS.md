# ~/.gemini/GEMINI.md (Global Policies)


## User Interaction Policies

*   **Handling Questions & Clarifications:** When the user asks open-ended, decision-related, or verification questions (e.g., questions ending with `?` or asking for choices/opinions such as "Should we...", "Is A better?", "Push to GitHub?", "Create a PR?"), treat it as a request for an answer or discussion, **NOT** as a directive to execute edits or run modifying commands.
    *   **MUST NOT** execute any file edits or state changes immediately.
    *   **STRICT WRITE BAN:** During the investigation phase of any question, you **MUST ONLY** use read-only or non-modifying actions (e.g., `view_file`, `grep_search`, `search_web`). You **MUST NEVER** perform any write operations, file edits, git commits, git pushes, file copies, or state-modifying commands until the user has explicitly reviewed your answer/discussion and given a clear directive to proceed with modifications.
    *   If you have enough context, **MUST** answer the question immediately.
    *   If you cannot answer immediately, ask yourself:
        1. *Is the question unanswerable?* -> Stop and report immediately, outlining the specific reasons.
        2. *Do we need actions to gather more context (e.g. testing, reading codebase)?* -> Report to the user the exact list of investigative actions you need to take **BEFORE** executing any tools. Explicitly state the scope of actions. Perform the actions. If the scope expands, report again before proceeding. Once you have enough context, answer the user. If you find the question is unanswerable during investigation, stop and report immediately.


## Task-Specific Workflows

When starting any task, you MUST check the list of available skills and their descriptions. If a skill's purpose or description matches the requirements of the task, you MUST read its `SKILL.md` using `view_file` before writing code or planning. Refer to the table below for mapping common task categories, but always dynamically match new skills based on their description metadata.

| Task Category | Trigger Conditions & Indicators | Required Skills to Read |
| :--- | :--- | :--- |
| **Design & Frontend UI** | Working on landing pages, portfolios, UI mockups, layout changes, styling, CSS, frontend animations, or redesigns. | `design-taste-frontend`, `design-taste-frontend-v1`, `gpt-tasteskill`, `minimalist-skill`, `high-end-visual-design`, `industrial-brutalist-ui`, `stitch-design-taste`, `brandkit`, `imagegen-frontend-mobile`, `imagegen-frontend-web`, `image-to-code`, `redesign-existing-projects` |
| **Engineering & Development** | Implementing new features, testing, debugging, prototyping, refactoring architecture, or modifying database/knowledge structures. | `tdd`, `diagnose`, `prototype`, `improve-codebase-architecture`, `initialize-knowledge-graph`, `migrate-to-shoehorn`, `setup-pre-commit` |
| **Code Quality & CI/CD** | Analyzing pull requests, resolving sonar code smells, remediating bugs, or fixing CI/CD pipeline issues. | `sonarqube-workflow`, `sonar-remediation`, `sonarcloud-ci-workflow` |
| **Productivity & Management** | Writing PR descriptions, managing custom skills, triaging issues, handoff to other agents, requirements gathering, or creating tickets. | `write-pr`, `write-for-ai`, `manage-custom-skills`, `to-prd`, `to-issues`, `triage`, `review`, `handoff`, `grill-me`, `grill-with-docs`, `caveman`, `ponytail`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-help`, `ponytail-review` |
| **Content & Notes** | Modifying Obsidian vault, creative writing, draft shaping, or narrative structuring. | `obsidian-vault`, `writing-beats`, `writing-fragments`, `writing-shape` |

## Core Execution Mindset

*   **Think Before Coding:** MUST explicitly state assumptions and surface tradeoffs before implementing. If anything is unclear, MUST STOP and ask.
*   **Simplicity First:** MUST write the minimum code needed to solve the exact problem. NEVER implement speculative abstractions, features, or unrequested config.
*   **Surgical Changes:** MUST touch only what you must. MUST match existing style. MUST clean up unused code/imports created by your changes. MUST NOT touch pre-existing dead code. If you notice unrelated dead code, MUST mention it - MUST NOT delete it. Every changed line MUST trace directly to the user's request.
*   **Goal-Driven Execution:** MUST define success criteria upfront. MUST state a brief plan. MUST verify using tests/compilation before declaring done.

## Tool Selection Matrix

Use this matrix to select tools inside repository paths. NEVER use native tools inside a repository when an MCP alternative is required.

| Task | Required Tool Server | Constraints & Rules |
| :--- | :--- | :--- |
| **Code Reading & Symbol search** | `jcodemunch` | MUST call `jcodemunch_guide` first. MUST use `search_symbols`, `get_symbol_source`, etc. inside repos. MUST NOT use `list_dir`, `view_file`, `grep_search` on indexed code. MUST index via `index_folder` if not indexed. *Exception: May use `view_file` directly for non-code files (.md, docs, configs) or untracked/ignored files to avoid latency.* |
| **Code Editing (Surgical)** | `patchitright` | **MUST ALWAYS** use for all repo edits. Use `patch_file` (single file; use `replacements` parameter for multi-edits) or `batch_patch_files` (multi-file atomic diffs). MUST NEVER use native edit tools. MUST use `symbol_name` to scope edits. MUST enable `did_you_mean: true`. <br> *Casing: Parameters MUST be strict snake_case (`target_file`, `search_content`, `replace_content`, `replacements`, etc.).* |
| **Exporting Session History/Logs**| `chronicle-mcp` | MUST use `list_sessions`, `get_session_details`, etc. When exporting steps, MUST invoke `get_session_details` with `output` path and `conversationStepsOnly: true` to write directly. MUST NEVER write manually or read SQLite/jsonl transcripts. |
| **Visual Metadata Inspection** | N/A | MUST trust `HoverSource Component Metadata` block 100% without validation. MUST go straight to target lines. |

## Core Operating Policies

| Category | Policy Instruction |
| :--- | :--- |
| **Workspace Override** | **MUST ALWAYS** check for a workspace-level `AGENTS.md` at the repository root as the very first action on any task. If found, its project-specific rules override these global policies. |
| **Grounded Responses**| MUST base responses ONLY on provided context and codebase. MUST NEVER guess, assume, or hallucinate. MUST ask if info is missing. |
| **Writing Tone** | MUST NOT use prideful, self-praising, or marketing language ("blazing fast", "smart", "advanced", "seamless"). Present only neutral facts. |
| **Subagents** | Spawned subagents MUST be passed their corresponding rules from `C:\Users\sayus\.gemini\config\subagent_rules\` (e.g. `developer.md`, `reviewer.md`). |
| **Private Data & Commits**| **MUST NEVER** commit or push private session data, conversation logs, scratch scripts, or transcripts to public repositories. All exports, logs, plans, and walkthroughs **MUST** remain strictly in the local private `brain` folder (or a temporary directory outside the repository) unless their target locations inside the repository are explicitly stated and requested by the user. |
| **Incremental API Design** | When building API backup or sync scripts (e.g., GitHub, Jira), **MUST ALWAYS** implement **incremental updates** rather than full fetches: MUST read existing local data to find the last sync timestamp, MUST use early-exit pagination, MUST reuse unchanged data, and MUST skip redundant disk/git actions. |
| **Tool Constraints** | When building or modifying custom MCP servers, **MUST ALWAYS** define strict input constraints (e.g., maximum code line limits for edits) directly in the **Tool and Parameter JSON Descriptions** at the schema level, rather than relying only on local markdown docs, to ensure global enforcement across client workspaces. |
| **Skill Discovery** | **MUST ALWAYS** check the list of available skills at the start of any task. If any skill is relevant (e.g., `design-taste-frontend` for frontend UI tasks, `tdd` for testing/implementation, `diagnose` for debugging, `review` for PR reviews, etc.), **MUST** read its `SKILL.md` file using `view_file` before writing code or plans. The local custom skills source repository is located at `D:\Projects\myskills`, and the distribution script is at `D:\Projects\distribute-skills.js`. |
