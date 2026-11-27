# Reference: Write for AI & Deslop Guide

## 1. Master Deslop Matrix & Checklist

| Noise Category | Fix | Bad | Good |
| :--- | :--- | :--- | :--- |
| **Fluff, Chaff & Synonym Stacking** | Cut buzzwords (`robust`, `seamless`, `orchestrate`), hedging (`Please note`, `try to`), and stacked qualifiers (`strict, absolute, mandatory`). Use active verbs + single `MUST`/`NEVER`. | `Please make sure to always robustly orchestrate avatar updates` | `MUST update user avatar URL in database` |
| **Implementation Trivia** | Cut internal algorithms, threading, or caches the caller cannot control; state only external behavior and return contracts. | `Uses multi-threaded SHA-256 hashing to verify file integrity` | `Checks whether a file changed on disk` |
| **Schema & Naming Duplication** | Omit types, defaults, required flags, and self-evident rephrasings already in schemas; state triggers and side effects. | `delete_user: Deletes a user. Optional boolean preview defaults to false.` | `delete_user: Permanently deletes account, purges caches, revokes keys. preview=true returns diff only.` |
| **Motivational Fluff vs. Operational Rationale** | Cut cost/UX/history justification; KEEP failure-mode or anti-bias rationale that changes edge-case judgment (Drop Test). | `Isolate explorer and auditor to keep agent prompts modular and clean.` | `Isolate explorer and auditor because authors overlook defects in their own code.` |
| **Reference Over-Specification** | Link by high-level category only; never catalog internal sub-topics in the link sentence. | `For Auth, Emails, and Payments case studies, see REFERENCE.md.` | `For canonical case studies, see REFERENCE.md.` |
| **Phantom / Reactionary Bans** | Delete the prompt trigger that caused an unwanted artifact instead of adding `NEVER`. Reserve `NEVER` for default LLM biases. | `STRICT BAN: NEVER output Persona Trees.` *(while trigger remains)* | *(Delete original instruction requesting Persona Trees)* |
| **Opaque Error Messages** | State exact failure cause and concrete recovery action. | `Unexpected internal exception in image pipeline.` | `Unsupported 'image/bmp'. Convert to PNG, JPEG, or WebP and retry.` |
| **Hollow Structure** | Never wrap 1–2 sentences in a header; title bullets in plain English only for cross-referencing. | `### Enforcement Gate\nReject PR if checks fail.` | `- Reject PR if checks fail.` |
| **Incident / Domain Lock-In (`Rule 3`)** | Never bolt a triggering incident's layer/technology onto an existing rule; lift to the domain-agnostic invariant subsuming all cases. | `Never hardcode PostgreSQL ports, Redis URLs, or S3 bucket names.` | `Never hardcode environment-specific configuration or secrets in tracked source; inject via runtime config.` |
| **Cross-Repo & Runtime Lock-In** | Cut local filenames, dataset jargon, and host-locked tool IDs (`view_file`, `grep_search`); use capability phrasing and parameterized paths while keeping contract-pinned APIs exact. | `Call view_file on Client.csv and run pwsh repo/scripts/run.ps1.` | `Read local schema fixtures with your native file-reading tool and run pwsh <skill_dir>/scripts/run.ps1.` |
| **Lossy Compression** | Never shorten if it drops conditions (`more generalized OR more concise`), weakens `MUST`, or breaks repeated variable-binding noun phrases. | `Replace any prompt with a shorter rule.` | `Replace any instruction or instruction set with a more generalized or more concise one of equal or better quality.` |
| **Cross-Doc Protocol Drift** | Align status enums, caller/callee prerequisites, and handoff templates across linked files; strip YAML frontmatter from non-skill subdocs. | Caller checks `status == "APPROVED"`; subdoc has frontmatter and emits `"PASS"`. | Strip subdoc frontmatter; align caller check and subdoc output on one status enum. |
| **Recall-Lossy Checklist Compression** | Compress *gating/routing policies* to invariants, but preserve concrete defect signatures and `BAD`/`GOOD` pairs in *audit checklists*. | `Ensure JWTs, session IDs, and paths follow security best practices.` | `Reject alg:"none" JWTs, Math.random() tokens, and path.join() without resolved root containment check.` |

---

## 2. Artifact Target Matrix

| Artifact Type | Primary Purpose | Must Answer | Cut |
| :--- | :--- | :--- | :--- |
| **Tool Description** | Tool selection | Action, trigger vs. peers, required inputs, failure/recovery | Parameter repeats, internals, marketing adjectives |
| **Parameter Doc** | Value formulation | Expected format and behavior switch | Type/default repeats, circular descriptions |
| **System / Agent Rule** | Behavioral constraint | Condition, `MUST`/`NEVER` invariant, scope, recovery | Hedging, creation history, incident-layer patches |
| **SKILL.md Frontmatter** | Router trigger | `Use when [triggers].` in 10–15 words | Feature summaries, benefits, slash commands |
| **Tool Error Message** | Agent recovery | Exact failure cause and next corrective action | Generic errors, raw traces without recovery |
| **Audit / Reviewer Guide** | Defect recall & verdict | Scope isolation, conditional subdocs, concrete defect signatures, exact verdict/schema | Vague quality summaries, narrative filler |

---

## 3. High-Signal Contrasts

### A. Over-Pruning vs. True Deslop (Tool Description)
- **Bloated:** `Perform a robust, atomic user deletion using optimistic locks to prevent orphaned rows; fails if user_id is unknown, unverified, or has active subscriptions.`
- **Over-Pruned (Lossy):** `Delete a user account.` *(drops blocking preconditions and irreversibility)*
- **True Deslop:** `Permanently delete user account by user_id. Fails if unknown, unverified, or active subscriptions exist (cancel first).`

### B. Operational Rationale vs. Motivational Fluff (Drop Test)
- **Fluff (Cut):** `Isolate explorer and auditor into separate subagents to keep prompts modular and roles clean.`
- **Over-Pruned (Loses compass):** `Isolate explorer and auditor into separate subagents.` *(explorer may self-verify on blocker)*
- **Operational Rationale (Keep):** `Isolate explorer and auditor into separate subagents because authors have confirmation bias and overlook defects in their own code.`

### C. Post-Incident Additive Patching vs. Invariant Abstraction (Core Rule 3)
- **Incident Patch (Bad):** `Never auto-retry HTTP 500 on POST /payments, POST /orders, or DELETE /sessions.`
- **Domain-Agnostic Invariant (Good):** `Never auto-retry non-idempotent mutations unless the request carries a stable idempotency key.`

### D. Enumeration Trap vs. Generative Compression (Decision Gates)
- **Enumeration Trap (Brittle):** Listing 6 sub-cases to warn instead of failing CI (unused local var, comment typo, import order...) implies unlisted cases are exempt.
- **Generative Invariant (Good):**
  `Warn instead of failing CI iff (1) the issue has zero runtime impact AND (2) an automated fixer resolves it deterministically. Otherwise fail CI.`

### E. Decision-Gate Compression vs. Audit-Checklist Recall
- Compress **gating/routing rules** into general invariants (Contrast D) to close loopholes.
- Preserve **explicit failure signatures** in **audit checklists** so auditors recall specific defects:
  - **Bad:** `Audit JWTs, session tokens, and file paths for security issues.`
  - **Good:** `Reject JWT verification trusting decoded.header.alg (allowlist RS256/EdDSA; block alg:"none"), Math.random() session tokens (require CSPRNG), and path.join(base, input) without path.resolve containment check.`
