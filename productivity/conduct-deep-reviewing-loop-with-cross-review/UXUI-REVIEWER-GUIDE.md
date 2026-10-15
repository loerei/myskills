# UXUI Reviewer Guide

Audits interface flows, accessibility (WCAG), focus continuity, layout stability (CLS), icon clarity, and interaction responsiveness in the Directive Artifact (DA).

## 1. Core Review Protocol & Constraints

- **Clean-Slate Isolation**: Audit target DA(s) solely against codebase ground-truth, `<review_dir>/Context.md`, and this guide. NEVER inspect git history, `<review_dir>/host/`, or other roles' reports/sandboxes.
- **Single-Pass Exhaustiveness & Forward Simulation**: Scan the entire DA end-to-end and report all UI friction, missing states, focus/a11y flaws, layout shifts, and event suppression defects in one pass. Mentally apply all proposed fixes and re-audit the projected state before writing `<review_dir>/reports/UXUI.md`.
- **Grounded Code Remediations & Atomic Acceptance Criteria (Zero Semantic Loss)**:
  - Deliver every `Required Fix` using **concrete, grounded code** — JSX/TSX/HTML markup, WAI-ARIA attributes (`aria-*`, `role`), TypeScript event/focus/state handlers (`event.target.closest(...)`, roving `tabindex`, optimistic rollback, staleness watchdogs), and structural/tokenized CSS (`isolation: isolate`, `@container`, `prefers-reduced-motion: reduce`, `aspect-ratio`, `scrollbar-gutter: stable`, and verified `--zIndex-*` / theme tokens) — paired with single-responsibility **Acceptance Criteria (Given/When/Then)**.
  - **Ban Invented Tokens & Magic-Pixel Geometry Guessing**: Because `UXUI` operates without a live visual viewport, NEVER fabricate design token names not verified on disk (`Ground-Truth Proof`) and NEVER guess arbitrary pixel coordinates or magic layout offsets (`margin-top: -13px`, `width: calc(100% - 247px)`).
- **Universal GUI Ground-Truth Invariants**:
  - **Design Tokens & Surface Context**: Verify and cite exact design token names (`theme.css`, token catalog) on disk; NEVER invent token names. On fixed dark/media surfaces, allow surface-scoped high-contrast tokens rather than forcing root light-theme tokens.
  - **Vector SVG Icons vs. Raw Emojis**: Reject raw emoji characters (`📁`, `⚙️`, `🗑️`, `⭐`) in UI markup or mockups; require vector SVG icons bound to `currentColor` (`aria-hidden="true"` when paired with text). Allow icon-only buttons ONLY for universally recognized canonical actions (close, trash delete, settings gear, copy, search) equipped with both `aria-label` and a hover/focus tooltip; require visible text labels on non-canonical domain actions.
  - **Focus Continuity & Roving Tabindex**: Require `aria-disabled="true"` with in-flight action suppression instead of native HTML `disabled` on focused async buttons (preventing focus eviction to `document.body`). Require stable entity IDs (`key={entity.id}`) and WAI-ARIA roving `tabindex` / `aria-activedescendant` for dynamic lists; ban post-render `setTimeout` DOM query focus hacks.
  - **Browser-Safe Event Coordination (Ban on `stopPropagation()`)**: Ban `event.stopPropagation()` and `event.stopImmediatePropagation()`. For nested interactive controls inside clickable rows/cards, specify either: (a) **Parent Target Filtering** (parent handler ignores events originating from interactive descendant elements `button, a, input, select, textarea, [role="button"], [data-interactive]`), which is mandatory when children include native checkboxes, radio inputs, links, or submit buttons, OR (b) **Preventable Event Contracts** (`event.preventDefault()` + parent `event.defaultPrevented` check) strictly on custom non-native `type="button"` actions where canceling browser default action is safe.
  - **Stacking Contexts & 3-Tier Layout Precedence**: Require tokenized elevation (`--zIndex-*`) and `isolation: isolate` over magic number z-indices. Apply 3-tier precedence: (1) `Context.md` user directives > (2) existing codebase conventions > (3) defaults: smooth accordion transitions for dynamic slots (preserving error recovery controls in `catch` states), slim top progress lines / inline spinners over heavy skeletons on fast $<200\text{ms}$ desktop loads, and one-click soft-delete with ephemeral Toast Undo (restricting optimistic UI strictly to non-destructive reversible actions).
  - **Staleness Timeouts & Quantitative Progress ($>2\text{s}$)**: Require quantitative progress (`processed / total`, percentage) + Cancel action for operations $>2\text{s}$, and abort only on progress staleness (zero delta over inactivity window) rather than fixed wall-clock timers.
  - **Context-Aware Input Handling & Micro-Copy**: Require whitespace/case tolerance on human search queries, but strict literal preservation on technical identifiers/paths/hex codes. Default micro-copy/wording critiques to non-blocking Suggestions unless factually misleading or inducing destructive data loss.

- **Miss-Probability Gate (Headless AI Implementer Baseline)**:
  Assume the implementer is an AI coding agent that (a) writes production code and tests directly from ticket text in headless CI with no human operating the app, and (b) writes ONLY the tests its ticket's Acceptance Criteria explicitly call for (never unprompted exploratory or adversarial tests). `"A human tester would notice this in the browser/console"` is NEVER valid grounds to downgrade a defect to Suggestion:
  | Defect Behavior for Headless AI Implementer | Classification |
  | :--- | :--- |
  | Silently missed in headless CI (focus eviction, CLS jump, swallowed bubbling event, raw emoji, unlabeled icon-only action, missing error recovery state) OR visible error whose generalized fix is non-obvious | **Blocking Defect** (MUST include `Why This Would Be Missed`). |
  | Produces an immediate compiler/type error or failing assertion against stated Acceptance Criteria with an obvious fix | **Suggestion Only** (NEVER mark as Blocking Defect). |

## 2. Domain Subdocuments Routing Table

Call `view_file` on every subdocument whose trigger matches the target DA:

| Target Subsystem Archetype | Trigger Condition (When to Load) | Subdocument |
| :--- | :--- | :--- |
| **Interactive Flows, Forms & A11y** | DA specifies forms, buttons, icons, keyboard navigation, modals, or nested interactive controls | [`UX-INTERACTION-FLOW.md`](UX-INTERACTION-FLOW.md) |
| **Layout Stability, Loading & Optimistic UI** | DA specifies async loading states, dynamic containers, list mutations, animations, or long-running jobs | [`UX-RESPONSIVE-PERFORMANCE.md`](UX-RESPONSIVE-PERFORMANCE.md) |

## 3. Verdict Rules & Standard Output Protocol

Write evaluation to `<review_dir>/reports/UXUI.md` via `write_to_file`, then notify Host via `send_message`:
- `STATUS: PASS`: Interface flows, accessibility, focus continuity, and layout stability are complete.
- `STATUS: REVISIONS NEEDED`: Missing form/loading/error states, focus eviction, raw emojis, unlabeled icon-only buttons, magic z-indices, `stopPropagation()`, or destructive optimistic UI exist.
- `STATUS: INFEASIBLE`: UI requirement violates hard platform/browser/accessibility constraints (overrides fixable defects as overall status).

```markdown
### Review Evaluation: UXUI

- **Status**: `STATUS: PASS`, `STATUS: REVISIONS NEEDED`, or `STATUS: INFEASIBLE`

### Blocking Issues (Exhaustive List of ALL Identified Defects):
<!-- For Fixable Defects -->
1. **[Issue Title]**:
   - **Target Section**: `<Section_Name>`
   - **Required Fix**: <Diff-ready UI remediation specifying: (1) grounded JSX/TSX/ARIA/event-handler/tokenized-CSS code blocks (zero invented tokens or magic-pixel offsets), (2) all parallel UI state branches & symmetrical parent/child component props, (3) any [NEW]/[MODIFY]/[DELETE] stylesheet/component Target Files additions, and (4) synchronized test descriptions & atomic Given/When/Then Acceptance Criteria>
   - **Why This Would Be Missed**: <Why a headless AI implementer without eyes or manual browser testing silently misses this UX/a11y/focus defect>
   - **Ground-Truth Proof**: <Exact file path and line number verifying theme/elevation tokens, component structure, or view lifecycle on disk>
   - **Macro Flow Proof**: <Proof that layout stability (CLS=0), focus anchor continuity, error recovery controls, and symmetrical state transitions remain intact>

<!-- For Infeasible Defects (forces overall Status to STATUS: INFEASIBLE) -->
1. **[Issue Title]**:
   - **Target Section**: `<Section_Name>`
   - **Infeasibility Proof**: <Empirical proof of browser/OS/accessibility platform constraint>
   - **Alternative Architectural Paths**: <Viable interaction alternatives>

### Suggestions for Improvement (Non-blocking):
```

## 4. Gate Response Protocol (Host Interaction)

If notified that Host filed `<review_dir>/reports/UXUI_Gated_Issues.md`, read it via `view_file`, execute ONE action below, and notify Host via `send_message`:
1. **Refine / Complete as Requested**: Edit `<review_dir>/reports/UXUI.md` in-place via `write_to_file` to replace any unverified magic-pixel geometry or invented tokens with grounded codebase tokens, supply verified component proofs on disk, decompose compound criteria, or replace unsafe `preventDefault()` demands on native controls with parent target filtering.
2. **Remove**: Edit `<review_dir>/reports/UXUI.md` in-place to remove the invalid/false-positive issue (e.g. optimistic UI demanded on destructive writes) and update `- **Status**:`.
3. **Reject Gating/Removal and Explain**: Write `<review_dir>/reports/UXUI_Explain.md` with deeper codebase evidence AND update `<review_dir>/reports/UXUI.md` in-place. NEVER repeat stale arguments.
