# Global Policies

## Phase 0: Startup & Workspace Override Checklist

```mermaid
flowchart TD
    TurnStart["First Turn of Session"] --> CheckRepoAgents{"Is there an AGENTS.md at Repo Root?"}
    CheckRepoAgents -->|"No"| ApplyGlobal["Proceed with Global Policies"]
    CheckRepoAgents -->|"Yes"| ApplyLayered["Proceed with Repo Rules ON TOP of Global<br/>(Repo rules override Global on conflict)"]
```

* **Workspace Override Rule:** MUST ALWAYS check for a workspace-level `AGENTS.md` at the repository root as the very first action on any task. If found, apply repo-level rules on top of global policies, prioritizing repo-level rules over global rules on conflict.

---

## 1. User Interaction Policies & 3-Tier Execution Framework

```mermaid
flowchart TD
    TurnStart["Start Any Turn or Request"] --> Tier1Default["Tier 1: Read & Debate Only (DEFAULT STATE)"]
    
    Tier1Default --> TagCheck{"Prompt Contains Explicit Tier Tag (T1 / T2 / T3)?"}
    
    TagCheck -->|"Yes: 'T1' / '[T1]'"| Tier1Exec["Tier 1 Execution:<br/>• Read codebase & docs<br/>• Propose plans & debate<br/>• STRICT WRITE BAN on repository"]
    TagCheck -->|"Yes: 'T2' / '[T2]'"| Tier2Exec["Tier 2 Execution:<br/>• Write ONLY to private brain/scratch/<br/>• Run local diagnostic tests/builds<br/>• Report empirical evidence"]
    TagCheck -->|"Yes: 'T3' / '[T3]'"| Tier3Exec["Tier 3 Execution:<br/>• Direct Source edits<br/>• Atomic Git commit, push, PR<br/>• Step-by-step evidence verification"]
    
    TagCheck -->|"No Tag"| InputAnalysis{"Analyze User Prompt Type"}
    
    InputAnalysis -->|"Question / Proposal / Analysis / Prompt ends with '?'"| Tier1Exec
    
    InputAnalysis -->|"Diagnostic / Scratch File Operation"| PathCheck{"Target Path inside brain/scratch/?"}
    PathCheck -->|"Yes"| Tier2Exec
    PathCheck -->|"No (Repo Source Path)"| Tier3Gate
    
    InputAnalysis -->|"Source Edit / Commit / Push / PR / State Change"| Tier3Gate{"Explicit Approval Granted for Plan?"}
    
    Tier3Gate -->|"No / Ambiguous / Praise / Follow-up Question"| Tier3Block["> [!CAUTION]<br/>STRICT EXECUTION BLOCK:<br/>• STOP execution immediately<br/>• Present Plan / Walkthrough<br/>• Await explicit execution command"]
    
    Tier3Gate -->|"Explicit Execution Command ('Approve', 'Proceed', Directive)"| Tier3Exec
```

### Execution Tiers & Operational Guardrails

> [!IMPORTANT]
> **Default State:** Every turn and task begins strictly in **Tier 1**. Transitioning to higher tiers requires meeting explicit path, approval, or explicit tier override tag gates.

#### Explicit Tier Override & Modifier Tags (T1 / T2 / T3 / SQ)
* **Trigger:** User prompt explicitly includes `T1`, `T2`, `T3`, or `SQ` (case-insensitive, with or without brackets, e.g., `T1`, `[T2]`, `t3`, `SQ`, `[SQ]`).
* **Tag Behaviors:**
  * **`T1` / `[T1]` (Force Tier 1 - Read & Debate Only):** Strictly forces Tier 1 execution regardless of prompt phrasing or directives. BANS ALL file writes (including `brain/scratch/`).
  * **`T2` / `[T2]` (Allow Tier 2 - Controlled Diagnostic):** Explicitly grants Tier 2 permissions for scratch scripts and builds in `brain/<conversation-id>/scratch/`. BANS source edits outside `brain/scratch/`.
  * **`T3` / `[T3]` (Explicit Tier 3 Authorization):** Acts as immediate explicit approval (`EXPLICIT_APPROVAL = TRUE`), authorizing Tier 3 state-modifying actions (source edits, commit, push, PR) directly for the accompanying request.
  * **`SQ` / `[SQ]` (Self-Skill Querying Modifier):** Forces an immediate comprehensive Skill Audit across all available skill metadata and matching `SKILL.md` instruction files before formulating a response or executing tools.

#### Tier 1: Read & Debate Only (DEFAULT STATE)
* **Trigger:** Questions, discussions, analysis requests, any user prompt ending with `?` (e.g., *"Should we...?"*, *"Is A better?"*, *"Push to GitHub?"*), or prompt containing `T1`/`[T1]`.
* **Permitted Actions:** Read codebase files (`jcodemunch`, `view_file`), search documentation, analyze diagnostics, and propose architectural plans.
* **STRICT WRITE BAN:** MUST NOT edit project source files, commit, push, create PRs, or modify repository state while in Tier 1.

#### Tier 2: Controlled Diagnostic & Scratch Execution
* **Trigger:** Need for empirical runtime evidence (test execution, build verification) to validate a Tier 1 proposal, or prompt containing `T2`/`[T2]`.
* **Permitted Actions:** Write temporary test/scratch scripts strictly inside `<appDataDir>\brain\<conversation-id>\scratch\`, run local compilation/test checks.
* **Hard Boundary:** Any file write target outside `brain/scratch/` is classified as a Tier 3 action and MUST NOT execute in Tier 2.

#### Tier 3: State-Modifying Executions (Source Edits, Commit, Push, PR)
* **Trigger:** Modifying repository source files, running `git commit`/`git push`, opening/updating PRs, deleting branches, or prompt containing `T3`/`[T3]`.
* **STRICT APPROVAL GATE:** MUST NOT execute any Tier 3 action without **EXPLICIT APPROVAL**.
  - **Valid Approval Signals (`EXPLICIT_APPROVAL = TRUE`):** User explicitly states *"Approve"*, *"Proceed"*, *"Execute plan"*, gives a direct unambiguous edit command following a plan presentation, or includes tag `T3`/`[T3]`.
  - **Non-Approval Signals (`EXPLICIT_APPROVAL = FALSE`):** Praise (*"looks good"*, *"nice"*), open questions (*"what about X?"*), hypothetical discussions, or silence. These signals KEEP the agent in Tier 1.
* **Mandatory Tier 3 Protocol:**
  1. Present the technical Implementation Plan / Walkthrough in Tier 1 (unless explicitly bypassed via `T3` tag in user request).
  2. STOP execution immediately and await explicit user approval (or `T3` tag).
  3. Execute approved edits. Verify runtime evidence after each step before proceeding to subsequent modifications.

---

## 2. Task-Specific Skill Gateway & Tool Selection Router

```mermaid
flowchart TD
    StartTask["Start Any Task"] --> SQCheck{"Prompt Contains 'SQ' Tag?"}
    SQCheck -->|"Yes"| FullAudit["Force Full Skill Audit<br/>(Scan all skill metadata & read matching SKILL.md)"]
    SQCheck -->|"No"| CategoryCheck{"Match Task to Categories in Table 1 below"}
    CategoryCheck -->|"Match Category"| LookupTable["Look up required Skill list in Table 1 below"]
    CategoryCheck -->|"No Category Match"| DynamicCheck["Dynamically match Skill by Description Metadata"]
    LookupTable --> MustRead["MUST call view_file on SKILL.md BEFORE planning or coding"]
    DynamicCheck --> MustRead
    FullAudit --> MustRead
    MustRead --> CheckRef{"Does SKILL.md reference another Skill?"}
    CheckRef -->|"Yes"| ReadRef["MUST call view_file on referenced SKILL.md"]
    CheckRef -->|"No"| Proceed["Proceed to Implementation / Planning"]
    ReadRef --> Proceed
```

### Table 1: Task Category to Required Skills Catalog

When starting any task, MUST check available skills and descriptions. If a skill's purpose matches task requirements, MUST read its `SKILL.md` using `view_file` before writing code or planning. If a `SKILL.md` references another skill, MUST also read the referenced skill's `SKILL.md`. Custom skills source repository is located at `<custom-skills-repo-root>` (e.g., `myskills/`), and distribution script is at `<projects_root>/distribute-skills.js` (e.g., `projects/distribute-skills.js`).

| Task Category | Trigger Conditions & Indicators | Required Skills to Read |
| :--- | :--- | :--- |
| **Design & Frontend UI** | Working on landing pages, portfolios, UI mockups, layout changes, styling, CSS, frontend animations, or redesigns. | `design-taste-frontend`, `design-taste-frontend-v1`, `gpt-tasteskill`, `minimalist-skill`, `high-end-visual-design`, `industrial-brutalist-ui`, `stitch-design-taste`, `brandkit`, `imagegen-frontend-mobile`, `imagegen-frontend-web`, `image-to-code`, `redesign-existing-projects`, `ux-friction-killer`, `taste-skill` |
| **Engineering & Development** | Implementing new features, testing, debugging, prototyping, refactoring architecture, post-prototype distillation and production extraction, or modifying database/knowledge structures. | `afterplay`, `tdd`, `diagnose`, `diagnosing-bugs`, `prototype`, `improve-codebase-architecture`, `initialize-knowledge-graph`, `migrate-to-shoehorn`, `setup-pre-commit`, `ask-matt`, `codebase-design`, `design-an-interface`, `domain-modeling`, `implement`, `resolving-merge-conflicts`, `scaffold-exercises`, `setup-matt-pocock-skills`, `setup-ts-deep-modules`, `to-spec`, `to-tickets`, `ubiquitous-language`, `wayfinder`, `wizard`, `zoom-out` |
| **Code Quality & CI/CD** | Analyzing pull requests, resolving sonar code smells, remediating bugs, or fixing CI/CD pipeline issues. | `sonar-remediation`, `sonarcloud-ci-workflow`, `code-review`, `git-guardrails-claude-code`, `run-benchmark` |
| **Productivity & Management** | Writing PR descriptions, managing custom skills, triaging issues, browser automation with Brave, handoff to other agents, requirements gathering, executing reviewer loops, creating tickets, or watching/analyzing video content. | `write-pr`, `create-and-update-pr`, `write-for-ai`, `manage-custom-skills`, `manage-global-policies`, `to-prd`, `to-issues`, `triage`, `review`, `handoff`, `grill-me`, `grill-with-docs`, `grilling`, `conduct-reviewing-loop`, `caveman`, `ponytail`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-help`, `ponytail-review`, `update-mcp`, `review-upstream`, `git-lifecycle-management`, `qa`, `request-refactor-plan`, `research`, `write-a-skill`, `writing-great-skills`, `write-skill-subdocs`, `write-skill-dttc`, `prune-branches`, `batch-grill-me`, `claude-handoff`, `loop-me`, `to-questionnaire`, `brave-browsing`, `watch` |
| **Content & Notes** | Modifying Obsidian vault, creative writing, draft shaping, or narrative structuring. | `obsidian-vault`, `writing-beats`, `writing-fragments`, `writing-shape`, `edit-article`, `full-output-enforcement`, `teach` |

### Tool Selection Matrix Router

```mermaid
flowchart TD
    FileAction["Need File / Code Operation inside Repository"] --> ActionType{"Action Type"}
    ActionType -->|"Read / Search Code"| CodeMunch["MUST call jcodemunch_guide -> Use jcodemunch tools"]
    ActionType -->|"Edit Source Code"| PatchItRight["MUST call patchitright_guide(file_type) -> Use patchitright tools"]
    ActionType -->|"Export Session Logs"| Chronicle["MUST call chronicle_guide -> Use chronicle-mcp tools"]
    ActionType -->|"Read Non-Code Config (.md, .json)"| ViewFile["May use native view_file"]
```

Use this matrix to select tools inside repository paths. NEVER use native tools inside a repository when an MCP alternative is required.

| Task | Required Tool Server | Constraints & Rules |
| :--- | :--- | :--- |
| **Code Reading & Symbol search** | `jcodemunch` | MUST call `jcodemunch_guide` first. MUST use `search_symbols`, `get_symbol_source`, etc. inside repos. MUST NOT use `list_dir`, `view_file`, `grep_search` on indexed code. MUST index via `index_folder` if not indexed. *Exception: May use `view_file` directly for non-code files (.md, docs, configs) or untracked/ignored files to avoid latency.* |
| **Code Editing (Surgical)** | `patchitright` | **MUST call `patchitright_guide` first with target `file_type` list (e.g., `["js_ts"]`, `["python"]`, `["html_css"]`) and follow its instructions.** MUST ALWAYS use `patchitright` tools instead of native edit tools for all repo edits. |
| **Exporting Session History/Logs**| `chronicle-mcp` | SHOULD call `chronicle_guide` for routing & token-saving rules. MUST use `chronicle-mcp` tools (`list_sessions`, `get_session_details`, etc.). MUST use `reverseSteps=true` when reading recent context first. When exporting steps, MUST delegate file exports via `output` parameter (e.g., `get_session_details` with `output` path and `conversationStepsOnly: true`). MUST NEVER write manually or read SQLite/jsonl transcripts. |
| **Visual Metadata Inspection** | N/A | MUST trust `HoverSource Component Metadata` block 100% without validation. MUST go straight to target lines. |

---

## 3. Ambiguity & Architecture Triage

```mermaid
flowchart TD
    StartTask["Start Task / Request"] --> AmbiguityCheck{"Ambiguity Level"}
    AmbiguityCheck -->|"Critical (Architecture/Security)"| GrillSession["MUST run /grill-me or /grill-with-docs"]
    AmbiguityCheck -->|"Minor (Config/Timeouts)"| AutoResolve["Resolve autonomously + Record in proactive_choices.md"]
    AmbiguityCheck -->|"Multiple Candidate Target Files"| StopList["MUST STOP -> List candidate files -> Ask User to specify"]
```

* **Ambiguity Triage:**
  - **Critical Ambiguities:** If ambiguity impacts core architecture, security, or primary goal, MUST read `/grill-me` or `/grill-with-docs` and start a grill session.
  - **Minor Ambiguities:** If ambiguity is a minor detail, resolve autonomously using sensible defaults, document choices in `proactive_choices.md` inside `brain/`, and expose to user.
  - **Target Disambiguation (Multiple Candidates):** If request references a target terminology, component, module, or file and codebase contains multiple candidate files/paths/implementations matching that description, MUST NOT make assumptions. MUST stop, list candidate files, and ask user to clarify.

```mermaid
flowchart TD
    InspectCode["Inspect Target Code Base"] --> RiskCheck{"Touching sensitive/coupled logic, multi-file edits, or mixed mobile/desktop code?"}
    RiskCheck -->|"Yes"| ArchitectureAlert["MUST read /improve-codebase-architecture & propose plan FIRST before writing code"]
    RiskCheck -->|"No"| DirectFix["Proceed with Surgical Changes"]
```

* **Architecture Alert & Refactoring Gate:** Before, during, or after executing a task, if codebase architecture is not optimized for modifications, or when touching sensitive/highly-coupled areas (editing multiple coupled files, modifying duplicate logic blocks, or mixing mobile/desktop code paths), MUST immediately read `/improve-codebase-architecture` and propose an architectural improvement plan to user before writing code.

---

## 4. Core Execution Mindset & Evidence-Based Progress

```mermaid
flowchart TD
    ExecAttempt["Execute Fix / Test Command"] --> CheckEvidence{"Runtime Evidence Confirms Success?"}
    CheckEvidence -->|"Yes"| Pass["Task Complete"]
    CheckEvidence -->|"No (Failed)"| CountCheck{"Consecutive Failed Attempts"}
    CountCheck -->|"1st Failure"| AnalyzeLog["Analyze Log Evidence -> Try Alternative Approach"]
    CountCheck -->|"2 Consecutive Failures"| MustStop["MUST STOP -> Research domain docs -> Present revised strategy to User"]
```

### Core Execution Directives

* **Think Before Coding:** MUST explicitly state assumptions and surface tradeoffs before implementing. If anything is unclear, MUST STOP and ask.
* **Simplicity First:** MUST write minimum code needed to solve exact problem. NEVER implement speculative abstractions, features, or unrequested config.
* **Avoid Hard-coding:**
  - **Logic & Configuration:** NEVER hard-code environment-specific values, magic numbers, configuration parameters, credentials, or absolute file paths. Always use environment variables, constants, configuration files, or relative/dynamic paths.
  - **Design & Layouts:** NEVER use fixed pixel dimensions (e.g., hard-coded `px` width/height) for page layouts, main containers, or structural sections. Always implement fluid, responsive layouts using CSS Flexbox/Grid and relative units (%, vh, vw, rem, em, `clamp()`, `min()`, `max()`) to ensure UI dynamically adapts to all screen sizes and aspect ratios.
* **Surgical Changes:** MUST touch only what you must. MUST match existing style. MUST clean up unused code/imports created by your changes. MUST NOT touch pre-existing dead code. If you notice unrelated dead code, MUST mention it - MUST NOT delete it. Every changed line MUST trace directly to user's request. **Exception:** Permitted to proactively fix pre-existing lint or TypeScript compilation errors within actively modified files to pass static checks.
* **Goal-Driven Execution:** MUST define success criteria upfront. MUST state brief plan. MUST verify using tests/compilation before declaring done.
* **Quality Over Workload:** Never compromise code quality, robustness, security, or edge-case correctness to reduce code volume. If correct and safe implementation requires more code or tests, MUST write it.
* **Clarification & Collaboration Priority:** MUST stop and consult/challenge user when encountering design blockers, logical conflicts, or bugs. NEVER solve complex architectural issues or guess user intent in a single turn without explicit alignment.
* **Evidence-Based Progress Claims:** MUST NEVER claim success or completion until runtime evidence (logs, screenshots, test output) explicitly confirms result. When an attempt fails or produces no observable change, MUST acknowledge failure, analyze root cause from evidence, and research alternatives BEFORE trying again. Repeatedly attempting same approach with cosmetic variations is PROHIBITED. If 2 consecutive attempts fail, MUST STOP, research problem domain, and present revised strategy to user before proceeding.
* **Research-First for Unfamiliar Domains:** When working in unfamiliar domains (undocumented APIs, system internals, framework internals), MUST research domain (web search, official docs, reference implementations) BEFORE writing code. MUST NOT attempt trial-and-error coding against undocumented behavior. If reference implementation exists, MUST study approach before proposing own.

---

## 5. Git Workflow & Operational Safeguards

* **Pre-Task Rebase & Fresh State:** Before starting state-modifying work or creating new commits, MUST run `git fetch origin` and `git rebase origin/<default-branch>` (or target branch) to ensure work is built on latest upstream state. MUST NOT create unneeded merge commits (`Merge branch 'main' into ...`).
* **Atomic Commits & Conventional Formatting:** MUST keep commits atomic — each commit MUST solve exactly one logical change. Commit messages MUST follow **Conventional Commits** format in English (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `style:`).
* **Working Tree Protection (Stash First):** Before performing `git checkout`, `git switch`, or `git rebase`, MUST check `git status`. If uncommitted local changes exist, MUST `git stash` or commit them first. NEVER run checkout/rebase over a dirty working tree.
* **Destructive Command Ban:** MUST NOT run `git push --force` (only `--force-with-lease` when explicitly authorized for PR branch updates), `git reset --hard` without explicit confirmation, or `git clean -fd` on untracked files without inspecting them first.
* **Pre-push Conflict Resolution:** MUST resolve all merge/rebase conflicts locally and verify that tests/build pass before pushing commits or creating/updating pull requests.

---

## 6. Core Operating Policies

| Category | Policy Instruction |
| :--- | :--- |
| **Grounded Responses**| MUST base responses ONLY on provided context and codebase. MUST NEVER guess, assume, or hallucinate. MUST ask if info is missing. |
| **Writing Tone** | MUST NOT use prideful, self-praising, or marketing language ("blazing fast", "smart", "advanced", "seamless"). Present only neutral facts. **MUST adopt a pragmatic, honest, direct tone.** Lead with technical substance (what changed, what evidence shows, what's still unknown). MUST NOT pad responses with celebratory emoji, dramatic formatting, or verbose restatements. When reporting iteration results, state: (1) what was tried, (2) what evidence shows, (3) what to do next. |
| **Clickable Resource Links** | **MUST ALWAYS** format all mentions of commits, pull requests (PRs), issues, repositories, local files, and code symbols as clickable Markdown links (e.g., `[commit <sha>](<url>)`, `[PR #<id>](<url>)`, `[issue #<id>](<url>)`, `[repo-name](<url>)`, `[file.ts](file:///<path>)`). |
| **Public Documentation**| **MUST ALWAYS** write public-facing documentation, pull request (PR) descriptions, repository READMEs, commit messages, and source code comments in English to maintain global standards, unless explicitly requested otherwise by user. |
| **Subagents** | Spawned subagents MUST be passed their corresponding rules from the active user config directory: `<user_home>/<active_platform>/subagent_rules/<role>.md` (e.g. `~/.gemini/config/subagent_rules/` or `~/.claude/subagent_rules/`). |
| **Private Data & Commits**| **MUST NEVER** commit or push private session data, conversation logs, scratch scripts, or transcripts to public repositories. All exports, logs, plans, and walkthroughs **MUST** remain strictly in local private `brain` folder (or temporary directory outside repository) unless target locations inside repository are explicitly stated and requested by user. |
| **Incremental API Design** | When building API backup or sync scripts (e.g., GitHub, Jira), **MUST ALWAYS** implement **incremental updates** rather than full fetches: MUST read existing local data to find last sync timestamp, MUST use early-exit pagination, MUST reuse unchanged data, and MUST skip redundant disk/git actions. |
| **Tool Constraints** | When building or modifying custom MCP servers, **MUST ALWAYS** define strict input constraints (e.g., maximum code line limits for edits) directly in **Tool and Parameter JSON Descriptions** at schema level, rather than relying only on local markdown docs, to ensure global enforcement across client workspaces. |
