---
name: deep-research-prompt
description: Use when drafting self-contained deep research prompts or research-driven refactor briefs.
---

# Deep Research Prompt

Draft a self-contained, single-file markdown prompt for autonomous deep research or research-driven refactoring across any domain.

## Directives

1. **Anti-Prescription & Objective Triad (<objective>, <known_baseline>, <target_scope>)**: The prompt MUST define the research task using three explicit boundaries:
   - **Problem Objective (`<objective>`)**: The overarching problem statement, intent, and constraints.
   - **Known Baseline (`<known_baseline>`)**: Known patterns, existing architectures, established context, and what has already been investigated (prevents rediscovering the obvious or misidentifying knowns as novelties).
   - **Target Scope (`<target_scope>`)**: Unknown dynamics, deeper relationships, edge cases, or potential alternative architectures to investigate.
   - NEVER spoon-feed predetermined answers, leading questions, or confirmation-bias framing (e.g., never ask to "prove why solution A is better than B"; ask to "evaluate A and B against criteria C").
2. **Definition of New Discoveries**: The prompt MUST clarify that "new discoveries" are not strictly limited to completely unknown elements outside baseline `<known_baseline>`. They also include discovering deeper, unmentioned relationships, friction points, trade-offs, or interactions between known elements in `<known_baseline>`.
3. **Anti-Hallucination Exit Hatch**: The prompt MUST explicitly instruct the researcher that if research reveals existing architecture or baseline (`<known_baseline>`) is already optimal, or if no meaningful new dynamics exist, it MUST report that there are no new findings or that current state is optimal, rather than fabricating flaws, artificial complexity, or unnecessary refactoring.
4. **Actionable Deliverable Mandate**: The prompt MUST demand concrete output, not an abstract essay:
   - For file modification: exact file paths, rationale, and concrete line-anchored patches or complete replacement content.
   - For new architecture or files: concrete file topology, anti-patterns (BAD vs GOOD code or schemas), failure modes, and mitigations.
   - For migrations: cleanup plans, retirement steps for obsolete assets, and verification criteria.
5. **Autonomous Primary-Source Research**: The prompt MUST instruct the researcher to synthesize broad industry consensus, primary documentation, formal specifications, or empirical benchmarks, without artificially constraining research to pre-selected tools or vendors.
6. **Self-Contained Single-File Invariant**: The final artifact MUST be a single `.md` file containing the task directives followed by inlined baseline files, reference documents, and applicable quality skills.
7. **Quality Standards Constraint**: Enforce writing quality (e.g. plain English, RFC 2119 imperatives, self-contained examples) within the prompt directives.

---

## Output Template

Generate a single markdown file at the target path (e.g. `.scratch/research_prompt_<topic>.md`) following this structure:

```markdown
# TASK PROMPT: Deep Research & <Action> for <Topic>

You are <Role/Expertise>.
Your task is to conduct deep research on <Broad Domain Area> and deliver <Concrete Deliverable / Target State>.

---

## 1. Problem Statement & Objective (<objective>)

<Overarching problem statement, high-level intent, and system boundaries. Ground the research without dictating solutions or leading conclusions.>

---

## 2. Known Baseline & Context (<known_baseline>)

<What is already known, established architecture, current limitations, or existing findings. The researcher must NOT re-report these as novel discoveries.>

---

## 3. Target Scope & Unknowns to Discover (<target_scope>)

<Specific unknown dynamics, deeper relationships, performance boundaries, or architectural trade-offs to investigate.>

---

## 4. Scope of Autonomy & Research Guidelines

- **Anti-Prescription & Objectivity**: Do NOT bias research toward specific pre-selected tools, vendors, or predetermined conclusions. Synthesize modern industry consensus and primary source documentation.
- **Definition of New Discoveries**: New discoveries include novel solutions outside baseline (<known_baseline>), as well as deeper, unmentioned relationships, conflicts, or trade-offs between known elements in (<known_baseline>).
- **Anti-Hallucination Exit Hatch**: If investigation reveals that baseline (<known_baseline>) is already optimal or that no meaningful new dynamics exist, explicitly conclude that no changes are warranted. Do NOT fabricate flaws or propose artificial complexity to justify research effort.
- Deliver concrete anti-patterns (BAD vs GOOD illustrations), failure modes with mitigations, and actionable evaluation criteria.

---

## 5. Deliverables & Output Contract

<Strict specification of output format:>
- If modifying existing files: Provide exact file path, rationale, and complete replacement content or line-anchored patch.
- If authoring new files: Provide complete file content, structure, and integration points.
- If deprecating files: Provide retirement checklist and migration steps.

---

## 6. Execution Workflow

1. Phase 1: Deep Research, Primary-Source Synthesis & Ground-Truth Verification
2. Phase 2: Structural Design, Trade-off Evaluation & Solution Architecture
3. Phase 3: Concrete Implementation / Deliverable Generation

---

# Attached Context & Reference Files

## File: <File Label 1>
Path: `<file_path_1>`
```<lang>
<Inlined file content>
```

## File: <File Label 2>
Path: `<file_path_2>`
```<lang>
<Inlined file content>
```
```

---

## Workflow

1. **Analyze Requirements**: Identify research domain, problem objective (`<objective>`), known baseline (`<known_baseline>`), target unknowns (`<target_scope>`), deliverable type (modify, create, or evaluate), and relevant baseline files.
2. **Draft Prompt File**: Populate Output Template. Ensure no leading questions or micro-questionnaires exist, known baseline (`<known_baseline>`) is clearly demarcated from target unknowns (`<target_scope>`), and the anti-hallucination exit hatch is included. Inline all required reference files into the bundle.
3. **Verify Bundle**: Check that reference files are fully inlined, deliverable contracts require concrete patches or content, and instructions leave solution discovery fully autonomous.
