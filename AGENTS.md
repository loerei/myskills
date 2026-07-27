# Global Policies

## Phase 0: Startup & Workspace Override Checklist

```mermaid
flowchart TD
    TurnStart["First Turn of Session"] --> CheckRepoAgents{"Is there an AGENTS.md at Repo Root?"}
    CheckRepoAgents -->|"No"| ApplyGlobal["Proceed with Global Policies"]
    CheckRepoAgents -->|"Yes"| ApplyLayered["Proceed with Repo Rules ON TOP of Global<br/>(Repo rules override Global on conflict)"]
```

---

## 1. User Interaction Policies & 3-Tier Execution Framework

```mermaid
flowchart TD
    TurnStart["Start Any Turn or Request"] --> Tier1Default["Tier 1: Read & Debate Only (DEFAULT STATE)"]
    
    Tier1Default --> InputAnalysis{"Analyze User Prompt Type"}
    
    InputAnalysis -->|"Question / Proposal / Analysis / Prompt ends with '?'"| Tier1Exec["Tier 1 Execution:<br/>• Read codebase & docs<br/>• Propose plans & debate<br/>• STRICT WRITE BAN on repository"]
    
    InputAnalysis -->|"Diagnostic / Scratch File Operation"| PathCheck{"Target Path inside brain/scratch/?"}
    PathCheck -->|"Yes"| Tier2Exec["Tier 2 Execution:<br/>• Write ONLY to private brain/scratch/<br/>• Run local diagnostic tests/builds<br/>• Report empirical evidence"]
    PathCheck -->|"No (Repo Source Path)"| Tier3Gate
    
    InputAnalysis -->|"Source Edit / Commit / Push / PR / State Change"| Tier3Gate{"Explicit Approval Granted for Plan?"}
    
    Tier3Gate -->|"No / Ambiguous / Praise / Follow-up Question"| Tier3Block["> [!CAUTION]<br/>STRICT EXECUTION BLOCK:<br/>• STOP execution immediately<br/>• Present Plan / Walkthrough<br/>• Await explicit execution command"]
    
    Tier3Gate -->|"Explicit Execution Command ('Approve', 'Proceed', Directive)"| Tier3Exec["Tier 3 Execution:<br/>• Source edits<br/>• Atomic Git commit, push, PR<br/>• Step-by-step evidence verification"]
```

### Execution Tiers & Operational Guardrails

> [!IMPORTANT]
> **Default State:** Every turn and task begins strictly in **Tier 1**. Transitioning to higher tiers requires meeting explicit path and approval gates.

#### Tier 1: Read & Debate Only (DEFAULT STATE)
* **Trigger:** Questions, discussions, analysis requests, or any user prompt ending with `?` (e.g., *"Should we...?"*, *"Is A better?"*, *"Push to GitHub?"*).
* **Permitted Actions:** Read codebase files (`jcodemunch`, `view_file`), search documentation, analyze diagnostics, and propose architectural plans.
* **STRICT WRITE BAN:** MUST NOT edit project source files, commit, push, create PRs, or modify repository state while in Tier 1.

#### Tier 2: Controlled Diagnostic & Scratch Execution
* **Trigger:** Need for empirical runtime evidence (test execution, build verification) to validate a Tier 1 proposal.
* **Permitted Actions:** Write temporary test/scratch scripts strictly inside `<appDataDir>\brain\<conversation-id>\scratch\`, run local compilation/test checks.
* **Hard Boundary:** Any file write target outside `brain/scratch/` is classified as a Tier 3 action and MUST NOT execute in Tier 2.

#### Tier 3: State-Modifying Executions (Source Edits, Commit, Push, PR)
* **Trigger:** Modifying repository source files, running `git commit`/`git push`, opening/updating PRs, or deleting branches.
* **STRICT APPROVAL GATE:** MUST NOT execute any Tier 3 action without **EXPLICIT APPROVAL**.
  - **Valid Approval Signals (`EXPLICIT_APPROVAL = TRUE`):** User explicitly states *"Approve"*, *"Proceed"*, *"Execute plan"*, or gives a direct, unambiguous edit command following a plan presentation.
  - **Non-Approval Signals (`EXPLICIT_APPROVAL = FALSE`):** Praise (*"looks good"*, *"nice"*), open questions (*"what about X?"*), hypothetical discussions, or silence. These signals KEEP the agent in Tier 1.
* **Mandatory Tier 3 Protocol:**
  1. Present the technical Implementation Plan / Walkthrough in Tier 1.
  2. STOP execution immediately and await explicit user approval.
  3. Execute approved edits. Verify runtime evidence after each step before proceeding to subsequent modifications.

---

## 2. Ambiguity Triage

```mermaid
flowchart TD
    StartTask["Start Task / Request"] --> AmbiguityCheck{"Ambiguity Level"}
    AmbiguityCheck -->|"Critical (Architecture/Security)"| GrillSession["MUST run /grill-me or /grill-with-docs"]
    AmbiguityCheck -->|"Minor (Config/Timeouts)"| AutoResolve["Resolve autonomously + Record in proactive_choices.md"]
    AmbiguityCheck -->|"Multiple Candidate Target Files"| StopList["MUST STOP -> List candidate files -> Ask User to specify"]
```

* **Ambiguity Triage:** When starting any task, analyze it for ambiguous requirements:
  - **Critical Ambiguities:** If the ambiguity impacts the core architecture, security, or primary goal (e.g., "user mentions 2FA but doesn't specify if it is via email, authenticator app, or hardware key"), you **MUST** by context read `/grill-me` or `/grill-with-docs` and start a grill session.
  - **Minor Ambiguities:** If the ambiguity is a minor detail (e.g., "choosing a cache timeout duration"), do **NOT** stall. Resolve it autonomously using sensible defaults, document your choices in a `proactive_choices.md` artifact inside the local private `brain` folder, and expose it to the user.
  - **Target Disambiguation (Multiple Candidates):** If the user's request references a target terminology, component, module, or file (e.g., "dashboard", "login button", "sync script") and the codebase contains multiple candidate files, paths, or implementations matching that description, you **MUST NOT** make assumptions or select one arbitrarily. You **MUST** stop, list the candidates you found, and ask the user to clarify which exact target they want to address.

---

## 3. Task-Specific Workflows (Skill Discovery & Gateway)

```mermaid
flowchart TD
    StartTask["Start Any Task"] --> CategoryCheck{"Match Task to Categories in Table 1 below"}
    CategoryCheck -->|"Match Category"| LookupTable["Look up required Skill list in Table 1 below"]
    CategoryCheck -->|"No Category Match"| DynamicCheck["Dynamically match Skill by Description Metadata"]
    LookupTable --> MustRead["MUST call view_file on SKILL.md BEFORE planning or coding"]
    DynamicCheck --> MustRead
    MustRead --> CheckRef{"Does SKILL.md reference another Skill?"}
    CheckRef -->|"Yes"| ReadRef["MUST call view_file on referenced SKILL.md"]
    CheckRef -->|"No"| Proceed["Proceed to Implementation / Planning"]
    ReadRef --> Proceed
```

### Table 1: Task Category to Required Skills Catalog

When starting any task, you MUST check the list of available skills and their descriptions. If a skill's purpose or description matches the requirements of the task, you MUST read its `SKILL.md` using `view_file` before writing code or planning. Refer to the table below for mapping common task categories, but always dynamically match new skills based on their description metadata.

| Task Category | Trigger Conditions & Indicators | Required Skills to Read |
| :--- | :--- | :--- |
| **Design & Frontend UI** | Working on landing pages, portfolios, UI mockups, layout changes, styling, CSS, frontend animations, or redesigns. | `design-taste-frontend`, `design-taste-frontend-v1`, `gpt-tasteskill`, `minimalist-skill`, `high-end-visual-design`, `industrial-brutalist-ui`, `stitch-design-taste`, `brandkit`, `imagegen-frontend-mobile`, `imagegen-frontend-web`, `image-to-code`, `redesign-existing-projects`, `ux-friction-killer`, `taste-skill` |
| **Engineering & Development** | Implementing new features, testing, debugging, prototyping, refactoring architecture, or modifying database/knowledge structures. | `tdd`, `diagnose`, `diagnosing-bugs`, `prototype`, `improve-codebase-architecture`, `initialize-knowledge-graph`, `migrate-to-shoehorn`, `setup-pre-commit`, `ask-matt`, `codebase-design`, `design-an-interface`, `domain-modeling`, `implement`, `resolving-merge-conflicts`, `scaffold-exercises`, `setup-matt-pocock-skills`, `setup-ts-deep-modules`, `to-spec`, `to-tickets`, `ubiquitous-language`, `wayfinder`, `zoom-out` |
| **Code Quality & CI/CD** | Analyzing pull requests, resolving sonar code smells, remediating bugs, or fixing CI/CD pipeline issues. | `sonar-remediation`, `sonarcloud-ci-workflow`, `code-review`, `git-guardrails-claude-code`, `prune-branches`, `run-benchmark` |
| **Productivity & Management** | Writing PR descriptions, managing custom skills, triaging issues, handoff to other agents, requirements gathering, executing reviewer loops, or creating tickets. | `write-pr`, `create-and-update-pr`, `write-for-ai`, `manage-custom-skills`, `manage-global-policies`, `to-prd`, `to-issues`, `triage`, `review`, `handoff`, `grill-me`, `grill-with-docs`, `grilling`, `conduct-reviewing-loop`, `caveman`, `ponytail`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-help`, `ponytail-review`, `update-mcp`, `review-upstream`, `git-lifecycle-management`, `qa`, `request-refactor-plan`, `research`, `write-a-skill`, `writing-great-skills` |
| **Content & Notes** | Modifying Obsidian vault, creative writing, draft shaping, or narrative structuring. | `obsidian-vault`, `writing-beats`, `writing-fragments`, `writing-shape`, `edit-article`, `full-output-enforcement`, `teach` |

---

## 4. Core Execution Mindset & Operational Boundaries

### Architecture Alert & Refactoring Gate

```mermaid
flowchart TD
    InspectCode["Inspect Target Code Base"] --> RiskCheck{"Touching sensitive/coupled logic, multi-file edits, or mixed mobile/desktop code?"}
    RiskCheck -->|"Yes"| ArchitectureAlert["MUST read /improve-codebase-architecture & propose plan FIRST before writing code"]
    RiskCheck -->|"No"| DirectFix["Proceed with Surgical Changes"]
```

### Evidence-Based Progress & 2-Attempt Failure Gate

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
* **Simplicity First:** MUST write the minimum code needed to solve the exact problem. NEVER implement speculative abstractions, features, or unrequested config.
* **Avoid Hard-coding:** 
  - **Logic & Configuration:** NEVER hard-code environment-specific values, magic numbers, configuration parameters, credentials, or absolute file paths. Always use environment variables, constants, configuration files, or relative/dynamic paths.
  - **Design & Layouts:** NEVER use fixed pixel dimensions (e.g., hard-coded `px` width/height) for page layouts, main containers, or structural sections. Always implement fluid, responsive layouts using CSS Flexbox/Grid and relative units (%, vh, vw, rem, em, `clamp()`, `min()`, `max()`) to ensure the UI dynamically adapts to all screen sizes and aspect ratios (e.g., 16:9, 16:10, mobile).
* **Surgical Changes:** MUST touch only what you must. MUST match existing style. MUST clean up unused code/imports created by your changes. MUST NOT touch pre-existing dead code. If you notice unrelated dead code, MUST mention it - MUST NOT delete it. Every changed line MUST trace directly to the user's request. **Exception:** You are permitted to proactively fix pre-existing lint or TypeScript compilation errors within any files you are actively modifying to ensure those files pass static checks.
* **Goal-Driven Execution:** MUST define success criteria upfront. MUST state a brief plan. MUST verify using tests/compilation before declaring done.
* **Quality Over Workload:** Never compromise code quality, robustness, security, or edge-case correctness to reduce the amount of code written. Being lazy means finding the most efficient elegant path, not the flimsiest shortcut. If a correct and safe implementation requires writing more code or tests, you MUST write it.
* **Architecture & Refactoring Alerts:** Before, during, or after executing a task, if you identify or suspect that the codebase architecture is not optimized for modifications, or if you are touching sensitive/highly-coupled areas of the project (acting as an early warning sensor—e.g., editing multiple coupled files, modifying duplicate logic blocks, or mixing mobile/desktop code paths), you **MUST** immediately read `/improve-codebase-architecture` and propose an architectural improvement plan to the user before writing implementation code.
* **Clarification & Collaboration Priority:** You are highly encouraged and required to stop and consult/challenge the user if you encounter unexpected design blockers, logical conflicts, or bugs during execution. **NEVER** try to solve complex architectural issues or guess user intent in a single turn without transparent, explicit alignment.
* **Evidence-Based Progress Claims:** MUST NEVER claim success, victory, or completion until runtime evidence (logs, screenshots, test output) explicitly confirms the claimed result. When an attempt fails or produces no observable change, MUST explicitly acknowledge the failure, analyze root cause from available evidence, and research alternatives BEFORE trying again. Repeatedly attempting the same approach with cosmetic variations (e.g., version bumps, log string changes, moving identical failing code to different locations) is PROHIBITED. If 2 consecutive attempts at the same strategy fail, MUST STOP, research the problem domain, and present a revised strategy to the user before proceeding.
* **Research-First for Unfamiliar Domains:** When working in an unfamiliar problem domain (e.g., undocumented APIs, system internals, third-party framework internals), MUST research the domain (web search, official docs, reference implementations) BEFORE writing code. MUST NOT attempt trial-and-error coding against undocumented behavior without first understanding the landscape. If a reference implementation exists (e.g., an open-source mod doing something similar), MUST study its approach before proposing your own.

---

## 5. Tool Selection Matrix Router

```mermaid
flowchart TD
    FileAction["Need File / Code Operation inside Repository"] --> ActionType{"Action Type"}
    ActionType -->|"Read / Search Code"| CodeMunch["MUST call jcodemunch_guide -> Use jcodemunch tools"]
    ActionType -->|"Edit Source Code"| PatchItRight["MUST call patchitright_guide -> Use patchitright tools"]
    ActionType -->|"Export Session Logs"| Chronicle["MUST call chronicle_guide -> Use chronicle-mcp tools"]
    ActionType -->|"Read Non-Code Config (.md, .json)"| ViewFile["May use native view_file"]
```

Use this matrix to select tools inside repository paths. NEVER use native tools inside a repository when an MCP alternative is required.

| Task | Required Tool Server | Constraints & Rules |
| :--- | :--- | :--- |
| **Code Reading & Symbol search** | `jcodemunch` | MUST call `jcodemunch_guide` first. MUST use `search_symbols`, `get_symbol_source`, etc. inside repos. MUST NOT use `list_dir`, `view_file`, `grep_search` on indexed code. MUST index via `index_folder` if not indexed. *Exception: May use `view_file` directly for non-code files (.md, docs, configs) or untracked/ignored files to avoid latency.* |
| **Code Editing (Surgical)** | `patchitright` | **MUST call `patchitright_guide` first and strictly follow its instructions.** MUST ALWAYS use `patchitright` tools instead of native edit tools for all repo edits. |
| **Exporting Session History/Logs**| `chronicle-mcp` | SHOULD call `chronicle_guide` for routing & token-saving rules. MUST use `chronicle-mcp` tools (`list_sessions`, `get_session_details`, etc.). MUST use `reverseSteps=true` when reading recent context first. MUST delegate file exports via `output` parameter. MUST NEVER write manually or read SQLite/jsonl transcripts. |
| **Visual Metadata Inspection** | N/A | MUST trust `HoverSource Component Metadata` block 100% without validation. MUST go straight to target lines. |

---

## 6. Core Operating Policies

| Category | Policy Instruction |
| :--- | :--- |
| **Workspace Override** | **MUST ALWAYS** check for a workspace-level `AGENTS.md` at the repository root as the very first action on any task. If found, apply repo-level rules on top of global policies, prioritizing repo-level rules over global rules if there are conflicting instructions. |
| **Grounded Responses**| MUST base responses ONLY on provided context and codebase. MUST NEVER guess, assume, or hallucinate. MUST ask if info is missing. |
| **Writing Tone** | MUST NOT use prideful, self-praising, or marketing language ("blazing fast", "smart", "advanced", "seamless"). Present only neutral facts. **MUST adopt a pragmatic, honest, direct tone.** Lead with the technical substance (what changed, what the evidence shows, what's still unknown). MUST NOT pad responses with celebratory emoji, dramatic formatting, or verbose restatements of information the user already provided. When reporting iteration results, state: (1) what was tried, (2) what the evidence shows, (3) what to do next. |
| **Public Documentation**| **MUST ALWAYS** write public-facing documentation, pull request (PR) descriptions, repository READMEs, commit messages, and source code comments in English to maintain global standards, unless explicitly requested otherwise by the user. |
| **Subagents** | Spawned subagents MUST be passed their corresponding rules from `C:\Users\sayus\.gemini\config\subagent_rules\` (e.g. `developer.md`, `reviewer.md`). |
| **Private Data & Commits**| **MUST NEVER** commit or push private session data, conversation logs, scratch scripts, or transcripts to public repositories. All exports, logs, plans, and walkthroughs **MUST** remain strictly in the local private `brain` folder (or a temporary directory outside the repository) unless their target locations inside the repository are explicitly stated and requested by the user. |
| **Incremental API Design** | When building API backup or sync scripts (e.g., GitHub, Jira), **MUST ALWAYS** implement **incremental updates** rather than full fetches: MUST read existing local data to find the last sync timestamp, MUST use early-exit pagination, MUST reuse unchanged data, and MUST skip redundant disk/git actions. |
| **Tool Constraints** | When building or modifying custom MCP servers, **MUST ALWAYS** define strict input constraints (e.g., maximum code line limits for edits) directly in the **Tool and Parameter JSON Descriptions** at the schema level, rather than relying only on local markdown docs, to ensure global enforcement across client workspaces. |
| **Skill Discovery** | **MUST ALWAYS** check the list of available skills at the start of any task. If any skill is relevant (e.g., `design-taste-frontend` for frontend UI tasks, `tdd` for testing/implementation, `diagnose` for debugging, `review` for PR reviews, etc.), **MUST** read its `SKILL.md` file using `view_file` before writing code or plans. If a skill's documentation or `SKILL.md` references or mentions another skill, you **MUST** also read the referenced skill's `SKILL.md`. The local custom skills source repository is located at `D:\Projects\myskills`, and the distribution script is at `D:\Projects\distribute-skills.js`. |
