# Override Coverage Report

Cross-reference of the 11 severity-ranked conflicts and 7 harmful practices (A–G) identified in the system prompt audit, evaluated against:

- **user_global** (the active policy document)
- **prompt-override-architecture** (the skill that teaches _how_ to structurally defeat system prompt conflicts)

## Classification Key

| Status | Meaning |
|:---|:---|
| **RESOLVED** | user_global already contains a rule that directly addresses this risk, AND prompt-override-architecture's 3-Layer Pattern is already applied in the document (header override, per-section micro-anchor, footer reinforcement). The conflict still _exists_ in the system prompt, but adherence is maximally reinforced. |
| **STRUCTURALLY MITIGATED** | user_global contains a rule that addresses this risk, AND prompt-override-architecture's techniques are _partially_ applied (e.g., header + footer present, but micro-anchor missing at the specific conflict point). The override exists but has a token-distance decay gap. |
| **CONFLICTING — NOT RESOLVED** | A system prompt instruction actively contradicts user_global, and user_global's current structure does not adequately override it (missing micro-anchor, missing procedural framing, or the competing system instruction is too strong). |
| **NO POLICY YET** | The system prompt contains a harmful default or gap, but user_global has _no rule at all_ addressing this area. prompt-override-architecture can't help because there's nothing to override — the policy itself needs to be written first. |

---

## Part 1: The 11 Severity-Ranked Conflicts

### #1 — `<planning_mode>` "When NOT to plan" vs. §1 Tier 3 Approval Gate

> **System says:** Skip planning and execute directly for "trivially simple" tasks like "fix the alignment of this UI layout."
> **user_global says:** ALL turns start Tier 1. Source edits = Tier 3, require EXPLICIT_APPROVAL. No "trivially simple" exemption.

| Dimension | Assessment |
|:---|:---|
| **user_global rule exists?** | Yes — §1 Tier 3 approval gate, explicitly defined. |
| **Layer 1 (Header Override)?** | Yes — header CRITICAL block names `<planning_mode>` by tag. |
| **Layer 2 (Micro-Anchor)?** | Yes — §1 opens with: _"Overrides `<planning_mode>` autonomous execution defaults. The tier gates below replace any plan-then-execute workflow defined in system tags."_ |
| **Layer 3 (Footer Reinforcement)?** | Yes — footer re-lists `<planning_mode>` in the override reminder. |
| **Procedural framing?** | Yes — §1's flowchart gives the model a step-by-step algorithm: check tags → analyze prompt type → route to tier → check approval gate. |

**Status: RESOLVED**

**Rationale:** This is the strongest override in user_global. All 3 layers are applied, the micro-anchor is placed directly at the conflict point, and the tier flowchart provides procedural framing that replaces `<planning_mode>`'s decision tree entirely. The competing instruction ("When NOT to plan") is a moderate-imperative suggestion; the user_global counter is a MUST-level gate with a flowchart algorithm. Imperative competition favors user_global.

---

### #2 — Native Tool Descriptions vs. §2 Tool Selection Matrix (jcodemunch, patchitright)

> **System says:** Every native tool description (`replace_file_content`, `view_file`, `grep_search`, etc.) instructs the agent to use it directly for file operations.
> **user_global says:** MUST use jcodemunch for code reading, patchitright for code editing. MUST NOT use native tools on indexed code.

| Dimension | Assessment |
|:---|:---|
| **user_global rule exists?** | Yes — §2 Tool Selection Matrix, explicit routing table. |
| **Layer 1 (Header Override)?** | Yes — header CRITICAL block names "native tool instructions" as overridden. |
| **Layer 2 (Micro-Anchor)?** | Yes — §2 opens with: _"Overrides `<guidelines>` native tool instructions and all tool descriptions that suggest using `view_file`, `grep_search`, `list_dir`, `replace_file_content`, or `multi_replace_file_content` directly on repository code."_ |
| **Layer 3 (Footer Reinforcement)?** | Partially — footer lists `<guidelines>` but doesn't specifically re-mention "native tool instructions." |
| **Procedural framing?** | Yes — §2's flowchart gives a decision tree: Action Type → route to MCP server. |

**Status: STRUCTURALLY MITIGATED (No policy change needed)**

**Rationale:** The defense against this conflict operates in two stages, and is stronger than initially assessed:

1. **Stage 1 — §2 routing table + micro-anchor:** Instructs the agent to call `jcodemunch_guide` / `patchitright_guide` before performing code operations. The micro-anchor and flowchart provide procedural framing for this routing decision.

2. **Stage 2 — The guides themselves:** Once called, both guides are well-engineered override documents that implement their own 3-layer override patterns internally:
   - `patchitright_guide` opens with a `[!CRITICAL]` header override naming native tools, provides a 3-step procedural Tool Decision Procedure, and closes with a `[!IMPORTANT]` footer reinforcement.
   - `jcodemunch_guide` uses semantic reframing — mapping intents to actions (`route` takes a natural language query and picks the action) — which steers the model's vocabulary toward MCP tools at the intent formation level, not just at the tool selection level.

**Initial proximity argument (corrected):** The original assessment overstated the "proximity advantage" of native tool descriptions, claiming they are "injected fresh at every tool call" and "literally adjacent to the invocation." In practice, tool schemas are presented once in the system context at a fixed position, not re-injected per call. The real challenge is **functional association** (the model's semantic match between "read file" and `view_file`), which the guides' own semantic reframing addresses once they are called.

**Remaining gap:** The vulnerability is purely at Stage 1 — whether the agent remembers to call the guide before reaching for native tools. This is a platform limitation that cannot be fully resolved via prompt engineering. §2's routing table handles it as well as policy text can.

**Decision: No changes to either AGENTS.md.** The existing two-stage defense is sufficient. Adding redundant instructions (e.g., a pre-tool-call routing check) would duplicate what §2 + the guides already provide.

---

### #3 — `<web_application_development>` Anti-MVP Stance vs. §4 Simplicity First + Surgical Changes

> **System says:** "Avoid creating simple minimum viable products." / "Premium Designs" / Add micro-animations, glassmorphism, gradients even if unrequested.
> **user_global says:** "MUST write minimum code needed to solve exact problem. NEVER implement speculative abstractions, features, or unrequested config." / "Every changed line MUST trace directly to user's request."

| Dimension | Assessment |
|:---|:---|
| **user_global rule exists?** | Yes — §4 Simplicity First + Surgical Changes. |
| **Layer 1 (Header Override)?** | Yes — header names `<web_application_development>` as overridden. |
| **Layer 2 (Micro-Anchor)?** | **Yes (added).** gemini/AGENTS.md §4 now opens with: _"Overrides `<web_application_development>` anti-MVP and aesthetic-padding directives. The simplicity-first and surgical-changes rules below are authoritative."_ |
| **Layer 3 (Footer Reinforcement)?** | Yes — footer lists `<web_application_development>`. |
| **Anti-wow policy?** | **Yes (added).** gemini/AGENTS.md §4 now includes a "Design Quality" rule that directly counters the system prompt's "premium/wowing" vocabulary: _"'Premium' or 'Wowing' is not a design direction — it's a marketing word."_ This anchors the exact tokens ("Premium", "Wowing") used in the system prompt, steering the model away from the slopification pattern. |

**Status: RESOLVED**

**Rationale:** All 3 layers are now applied in gemini/AGENTS.md. The micro-anchor names `<web_application_development>` at the exact conflict point (§4). The anti-wow "Design Quality" rule goes beyond a generic override — it directly anchors the competing tokens ("Premium", "Wowing") and reframes design quality as project-context-appropriateness rather than visual effect layering. This is an Antigravity-specific addition; root AGENTS.md's existing §4 Surgical Changes rule ("Every changed line MUST trace directly to user's request") serves as the universal equivalent.

**Changes applied:** gemini/AGENTS.md §4 — added micro-anchor + Design Quality anti-wow policy.

---

### #4 — `<planning_mode>` "Minor Follow-up" Exemption vs. §1 Per-Action Approval

> **System says:** "Is a minor follow-up to an existing plan that the user has already approved... continue your work WITHOUT making a plan or requesting user review."
> **user_global says:** Each Tier 3 action requires its own explicit approval signal or T3 tag.

| Dimension | Assessment |
|:---|:---|
| **user_global rule exists?** | Yes — §1, implicit in the Tier 3 approval gate (no "minor follow-up" exemption listed). |
| **Layer 1 (Header Override)?** | Yes — header names `<planning_mode>`. |
| **Layer 2 (Micro-Anchor)?** | Yes — §1's micro-anchor overrides `<planning_mode>` defaults. |
| **Layer 3 (Footer Reinforcement)?** | Yes — footer re-lists `<planning_mode>`. |
| **Procedural framing?** | Yes — the flowchart routes ALL source edits through the Tier 3 approval gate. |

**Status: RESOLVED**

**Rationale:** The §1 flowchart explicitly routes "Source Edit / Commit / Push / PR / State Change" to the Tier 3 gate regardless of whether it's a follow-up. The approval gate lists exactly what counts as valid approval ("Approve", "Proceed", "Execute plan", T3 tag) and what doesn't (praise, questions, silence). The "minor follow-up" exemption from `<planning_mode>` has no corresponding path in the §1 flowchart — it's structurally excluded.

---

### #5 — No Git Safety Instructions in System Prompt vs. §5 Git Workflow

> **System says:** Nothing. Zero git safety rules anywhere.
> **user_global says:** Full §5 — rebase, atomic commits, stash-first, destructive command ban, pre-push conflict resolution.

| Dimension | Assessment |
|:---|:---|
| **user_global rule exists?** | Yes — full §5. |
| **Layer 2 (Micro-Anchor)?** | Not needed — there's no competing system tag to override. |
| **Conflict type?** | **Default Fallback**, not Direct Override. |

**Status: NO POLICY CONFLICT (Gap, not conflict)**

**Rationale:** This is a gap in the system prompt, not a conflict. The system prompt says nothing about git; user_global fills the vacuum. There's no competing instruction to override. prompt-override-architecture's techniques don't apply here because there's no adversarial signal to defeat. The risk is purely **Default Fallback** (model falls back to training defaults), which user_global's explicit rules adequately address.

**Future action (out of scope):** §5 is written as flat declarative bullet points using MUST/NEVER imperatives. In a document where every section uses MUST, this creates imperative competition that dilutes adherence. §1 and §3 achieve better adherence through Mermaid flowcharts with procedural framing. §5 should be upgraded to procedural/Mermaid format (per `/write-for-ai` guidelines) in a future pass. This applies to either AGENTS.md (universal improvement).

**Decision: No changes in this walkthrough.** Gap is filled; adherence upgrade is a separate task.

---

### #6 — No Private Data Protection in System Prompt vs. §6 Private Data & Commits

> **System says:** Nothing about private data protection.
> **user_global says:** "MUST NEVER commit or push private session data, conversation logs, scratch scripts, or transcripts to public repositories."

| Dimension | Assessment |
|:---|:---|
| **user_global rule exists?** | Yes — §6 "Private Data & Commits" row. |
| **Conflict type?** | **Default Fallback** — no competing instruction, just a gap. |

**Status: NO POLICY CONFLICT (Gap, not conflict)**

**Rationale:** Same pattern as #5. The system prompt is silent; user_global fills the void. No override architecture needed because there's nothing to override.

---

### #7 — `<subagents>` Missing Rule-Passing vs. §6 Subagents Policy

> **System says:** How to invoke and communicate with subagents. No mention of passing user rules.
> **user_global says:** "Spawned subagents MUST be passed their corresponding rules from the active user config directory: `<user_home>/<active_platform>/subagent_rules/<role>.md`."

| Dimension | Assessment |
|:---|:---|
| **user_global rule exists?** | Yes — §6 "Subagents" row. |
| **Conflict type?** | **Default Fallback** — system prompt doesn't contradict, it just omits. |
| **Micro-anchor?** | No — §6's subagent rule doesn't reference `<subagents>` tag. |

**Status: STRUCTURALLY MITIGATED (No policy change needed)**

**Rationale:** user_global has the rule, but it's in a table row in §6 without a micro-anchor. The `<subagents>` system section is a procedural block the model reads closely at invocation time. However, the risk is low-severity: the `self` subagent type already inherits the parent agent's full configuration including system prompt and user_global. The gap is narrow — it only affects custom per-role rules from `subagent_rules/<role>.md`. Elevating the table row to a subsection offers marginal improvement without solving the token-distance problem.

**Decision: No changes.** Low-severity gap, narrow scope, marginal fix.

---

### #8 — `<web_application_development>` Marketing Tone vs. §6 Writing Tone

> **System says:** "wowed", "stunning", "WOW the user", "extremely premium", "UNACCEPTABLE", "you have FAILED!"
> **user_global says:** "MUST NOT use prideful, self-praising, or marketing language."

| Dimension | Assessment |
|:---|:---|
| **user_global rule exists?** | Yes — now standalone §6 "Writing & Communicating Tone" (promoted from table row). |
| **Layer 1 (Header Override)?** | Yes — header names `<web_application_development>`. |
| **Layer 2 (Micro-Anchor)?** | **Yes (added).** gemini/AGENTS.md §6 now opens with: _"Overrides `<communication_style>` default formatting and tone, `<web_application_development>` marketing language ('stunning', 'premium', 'WOW', 'UNACCEPTABLE', 'FAILED'), and `<identity>` autonomous-solver framing."_ |
| **Layer 3 (Footer Reinforcement)?** | Yes — footer lists all tags. |
| **Structural promotion?** | **Yes.** Tone rules elevated from §6 table row to standalone §6 section with own heading, subsections (Writing Tone / Communicating Tone), and Gemini-specific anti-energy kill list. |

**Status: RESOLVED**

**Rationale:** All 3 layers now applied. The micro-anchor names all three competing system tags (`<communication_style>`, `<web_application_development>`, `<identity>`). The structural promotion from table row to standalone section with dedicated heading gives the tone rules independent attention weight, no longer diluted by 7 other table rows. The anti-energy kill list directly anchors the exact model-tuning patterns (compliments, enthusiasm hedging, premature victory, filler transitions). Universal policy (Writing/Communicating Tone split, evidence-based claims, collaborative stance) added to root AGENTS.md. Gemini-specific additions (micro-anchor, kill list) in gemini/AGENTS.md.

**Changes applied:**
- Both AGENTS.md: new §6 (Writing & Communicating Tone) with Writing/Communicating split. Old §6 renumbered to §7, Writing Tone row removed.
- Both AGENTS.md §4: added "Investigate Before Acting" phased methodology with Mermaid flowchart (Phase 1 confirmation gate, Phase 3 hack-check gate).
- gemini/AGENTS.md §6: micro-anchor naming `<communication_style>`, `<web_application_development>`, `<identity>`. Kill list targeting both reasoning patterns (premature pattern-matching, excitement-driven shortcuts, conviction without evidence) and communication patterns (compliments, enthusiasm hedging, victory declarations, filler transitions).

---

### #9 — `<planning_mode>` Soft Verify Step vs. §4 Evidence-Based Progress Claims

> **System says:** "Verify that your changes have the desired effects e.g. run unit tests, make sure code builds, etc." (suggestion)
> **user_global says:** "MUST NEVER claim success or completion until runtime evidence explicitly confirms result." (hard gate)

| Dimension | Assessment |
|:---|:---|
| **user_global rule exists?** | Yes — §4 "Evidence-Based Progress Claims", with 2-failure stop rule. |
| **Layer 2 (Micro-Anchor)?** | **No.** §4 has no micro-anchor referencing `<planning_mode>`. |
| **Conflict type?** | **Attention Dilution** — both say "verify," but system prompt's version is a soft suggestion while user_global's is a hard MUST gate. |

**Status: RESOLVED**

**Rationale:** Micro-anchor added to gemini/AGENTS.md §4 top, naming `<planning_mode>` soft verification defaults and establishing §4's rules as hard gates. Combined with the existing §4 Mermaid flowchart (2-failure stop rule) and the new Investigate Before Acting flowchart (Phase 1 confirmation gate), §4 now has strong procedural framing that structurally overrides the system prompt's soft "e.g. run unit tests" suggestion.

**Changes applied:**
- gemini/AGENTS.md §4: added micro-anchor _"Overrides `<planning_mode>` soft verification defaults. The evidence-based progress rules below are hard gates, not suggestions."_

---

### #10 — `<web_application_development>` Prescriptive Fonts/Styles vs. §4 Avoid Hard-coding

> **System says:** Use "Inter, Roboto, or Outfit" / "glassmorphism" / "HSL tailored colors, sleek dark modes."
> **user_global says:** Don't hard-code. Use responsive, dynamic approaches.

| Dimension | Assessment |
|:---|:---|
| **user_global rule exists?** | Partially — §4 "Avoid Hard-coding" focuses on config values and px dimensions, not on font/color prescriptions. |
| **Conflict type?** | **Weak/Tangential** — the hard-coding rule wasn't designed to address design prescription. |

**Status: RESOLVED (covered by #3)**

**Rationale:** Already addressed by #3's Design Quality policy added to gemini/AGENTS.md §4: _"MUST NOT add animations, glassmorphism, gradients, or specific font/color choices unless the user requests them or the project's existing design system uses them."_ This directly counters the system prompt's prescriptive fonts/styles. No additional changes needed.

---

### #11 — `<communication_style>` Vague Tone Guidance vs. §6 Writing Tone

> **System says:** "Keep your responses concise."
> **user_global says:** Full tone policy — no marketing language, pragmatic/honest/direct, lead with substance, no celebratory emoji.

| Dimension | Assessment |
|:---|:---|
| **user_global rule exists?** | Yes — §6 "Writing Tone" row. |
| **Layer 2 (Micro-Anchor)?** | Yes — §6 opens with _"Overrides `<communication_style>` default formatting and tone."_ |
| **Conflict type?** | **Weak substitution** — not a contradiction, just a weaker standard. |

**Status: RESOLVED**

**Rationale:** `<communication_style>` is vague but not adversarial. user_global's micro-anchor directly names it, and the detailed tone rules are much more specific. The model has no reason to prefer the vague "keep it concise" over the detailed policy. This is the easiest override in the document.

---

## Part 2: The 7 Harmful Practices (A–G)

### A — Autonomous Execution Without Approval

> **Source:** `<planning_mode>` "When NOT to plan" + `<identity>` "solve their coding task"

**Status: RESOLVED** — Same as Risk #1 and #4. The §1 3-Tier framework with its micro-anchor and procedural flowchart fully overrides this.

---

### B — Native Tool Descriptions Encourage Direct Repo Edits

> **Source:** Tool JSON schema descriptions for all native file tools.

**Status: STRUCTURALLY MITIGATED** — Same as Risk #2. user_global §2 has the routing rules, but tool descriptions have inherent proximity advantage at invocation time. Cannot be fully solved via prompt engineering.

---

### C — Claim-Without-Evidence Risk

> **Source:** `<planning_mode>` soft verify step.

**Status: RESOLVED** — Same as Risk #9. Micro-anchor added to gemini/AGENTS.md §4 establishing evidence-based rules as hard gates. Combined with the new Investigate Before Acting flowchart (Phase 1 confirmation gate), claims-without-evidence are structurally blocked.

---

### D — Framework/Tooling Push Over Good Code

> **Source:** `<web_application_development>` §4 "New Project Creation" — positions framework scaffolding as the default.

| Dimension | Assessment |
|:---|:---|
| **user_global rule exists?** | Partially — §4 "Simplicity First" covers speculative abstractions, but doesn't specifically address framework selection bias. |
| **Micro-anchor?** | No — no micro-anchor at §4 referencing `<web_application_development>`. |

**Status: NO CONFLICT (self-gating)**

**Rationale:** The system prompt already gates framework use on explicit user request: "Only do this if the USER explicitly requests a web app." Combined with user_global's "Simplicity First" rule ("NEVER implement speculative abstractions, features, or unrequested config"), framework scaffolding without user request is already prohibited by both the system prompt and user_global. No additional rule needed.

---

### E — No Git Safety in System Prompt

> **Source:** Entire system prompt — zero git safety rules.

**Status: NO POLICY CONFLICT (Gap filled by user_global §5)** — Same as Risk #5. user_global fills the vacuum. No override needed because there's no competing instruction.

---

### F — No Private Data Protection

> **Source:** Entire system prompt — no mention of private data.

**Status: NO POLICY CONFLICT (Gap filled by user_global §6)** — Same as Risk #6.

---

### G — Subagent Rules Not Passed

> **Source:** `<subagents>` section omits rule-passing.

**Status: STRUCTURALLY MITIGATED** — Same as Risk #7. user_global has the rule but it's in a table row far from the subagent invocation context.

---

## Summary Matrix

| ID | Risk / Practice | Status | Action Needed? |
|:---|:---|:---|:---|
| **#1** | `<planning_mode>` "When NOT to plan" vs. Tier 3 gate | **RESOLVED** | None |
| **#2** | Native tool descriptions vs. MCP routing | **STRUCTURALLY MITIGATED** | No policy change needed — two-stage defense sufficient |
| **#3** | `<web_app_dev>` anti-MVP vs. Simplicity First | **RESOLVED** | Micro-anchor + anti-wow policy added to gemini/AGENTS.md §4 |
| **#4** | `<planning_mode>` "minor follow-up" vs. per-action approval | **RESOLVED** | None |
| **#5** | No git safety in system prompt | **NO CONFLICT (gap filled)** | §5 upgraded to procedural/Mermaid |
| **#6** | No private data protection in system prompt | **NO CONFLICT (gap filled)** | None |
| **#7** | `<subagents>` missing rule-passing | **STRUCTURALLY MITIGATED** | No change needed — low-severity, self inherits config |
| **#8** | `<web_app_dev>` marketing tone vs. Writing Tone | **RESOLVED** | New standalone §6 + micro-anchor + kill list in gemini/AGENTS.md |
| **#9** | `<planning_mode>` soft verify vs. Evidence-Based | **RESOLVED** | Micro-anchor added to gemini/AGENTS.md §4 |
| **#10** | `<web_app_dev>` prescriptive fonts/styles | **RESOLVED** | Covered by #3's Design Quality policy |
| **#11** | `<communication_style>` vague tone | **RESOLVED** | None |
| **A** | Autonomous execution bias | **RESOLVED** | (= #1 + #4) |
| **B** | Native tool descriptions | **STRUCTURALLY MITIGATED** | No policy change needed (= #2) |
| **C** | Claim-without-evidence | **RESOLVED** | Inherits #9's resolution |
| **D** | Framework push over vanilla | **NO CONFLICT (self-gating)** | System prompt already gates on user request |
| **E** | No git safety | **NO CONFLICT (gap filled)** | (= #5) |
| **F** | No private data protection | **NO CONFLICT (gap filled)** | (= #6) |
| **G** | Subagent rules not passed | **STRUCTURALLY MITIGATED** | (= #7) |

---

## Completed Actions

All identified conflicts have been assessed and resolved where needed:

1. **§4 micro-anchors (gemini/AGENTS.md):** Added overrides for `<planning_mode>` soft verify and `<web_application_development>` anti-MVP/design prescriptions.
2. **§4 Design Quality policy (gemini/AGENTS.md):** Anti-wow, anti-prescriptive-design rule anchoring "Premium" and "Wowing" vocabulary.
3. **§4 Investigate Before Acting (both AGENTS.md):** Phased methodology with Mermaid flowchart, Phase 1 confirmation gate, Phase 3 hack-check gate.
4. **§6 Writing & Communicating Tone (both AGENTS.md):** Promoted from table row to standalone section. Split into Writing Tone (on user's behalf) and Communicating Tone (collaborative, evidence-based claims, no energy padding).
5. **§6 micro-anchor + kill list (gemini/AGENTS.md):** Names `<communication_style>`, `<web_application_development>`, `<identity>`. Kill list targets both reasoning and communication patterns.
6. **§7 renumbered (both AGENTS.md):** Old §6 Core Operating Policies renumbered, Writing Tone row removed.

7. **§5 Git Workflow (both AGENTS.md):** Upgraded from flat declarative to procedural Mermaid flowchart with lifecycle stages (Pre-Task, Branch Ops, Committing, Pre-Push, Hard Bans). Added two rebase points (start + pre-push) and early rebase conflict handling.

### No Remaining Deferred Items
