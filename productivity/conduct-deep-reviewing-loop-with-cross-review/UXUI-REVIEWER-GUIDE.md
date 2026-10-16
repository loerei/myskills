# UXUI Reviewer Guide

Audits target-audience interaction flows, physical focus retention, layout stability (CLS), front-end developer experience (DX) & codebase maintainability, and regime-appropriate accessibility in the Directive Artifact (DA).

## 1. Core Review Protocol & Constraints

- **Clean-Slate Isolation**: Audit target DA(s) solely against codebase ground-truth, `<review_dir>/Context.md`, and this guide. NEVER inspect git history, `<review_dir>/host/`, or other roles' reports/sandboxes.
- **Single-Pass Exhaustiveness & Forward Simulation**: Scan the entire DA end-to-end and report all UI friction, missing states, unmount focus drops, layout shifts, front-end architectural debt, and event suppression defects in one pass. Mentally apply all proposed fixes and re-audit the projected state before writing `<review_dir>/reports/UXUI.md` directly via `write_to_file` (NEVER write helper `.js`/`.py` scripts in `sandbox/UXUI/` to generate or regex-edit your report).
- **UX/UI & Accessibility Regime Alignment (`## UX/UI & Accessibility Regime` in `Context.md`)**:
  Read `## UX/UI & Accessibility Regime` in `<review_dir>/Context.md` (defaulting to `PRAGMATIC_PRODUCT_UX` if unspecified) and enforce the matching standard:
  | UX/UI Regime Mode | Scope & Mandatory Audit Standards |
  | :--- | :--- |
  | `PRAGMATIC_PRODUCT_UX` *(default: local/desktop apps, game launchers/utilities, dev/internal tools, community/indie products)* | Enforce **strictly two core pillars**: (1) **Target-Audience UX & Physical Focus Retention** — complete 4-state interactive flows (`Idle/Loading/Success/Error`), `CLS = 0`, vector SVG icons, and preventing physical focus eviction to `document.body` when an active element unmounts (closing a modal/popover returns focus to its trigger; deleting the currently focused list item transfers focus to an adjacent surviving item or container; focused async buttons block duplicate activation without blurring focus to `document.body`); and (2) **Front-End DX & Zero Tech Debt** — clean component extensibility and maintainability, verified codebase design tokens (`theme.css`), zero `stopPropagation()`, immutable `key={entity.id}`, declarative CSS transitions over `setTimeout` DOM query hacks, and clean listener/ref lifecycles. **STRICT BAN on Enterprise WCAG Over-Engineering**: NEVER demand WAI-ARIA roving `tabindex` cyclic state machines, `aria-activedescendant`, arrow-key navigation loops on standard clickable controls (`<button>`, tabs, filter pills, badges), or screen-reader-only ARIA ID graphs (`useId()` `aria-labelledby`/`aria-describedby`/`aria-live`) on secondary views. |
  | `STRICT_ACCESSIBILITY_COMPLIANCE` *(tag `!A11Y` / `!WCAG`: Enterprise/Public SaaS, FinTech, Healthcare, GovTech, Design Systems)* | Enforce all `PRAGMATIC_PRODUCT_UX` standards **PLUS full WCAG 2.1 AA & WAI-ARIA Authoring Practices (`UX-ACCESSIBILITY-WCAG.md`)**: roving `tabindex` cyclic keyboard state machines (`Arrow/Home/End`), `aria-activedescendant`, screen-reader semantic graphs (`useId()`, `aria-labelledby`, `aria-describedby`, `role="alert"`, `aria-live`), and strict contrast/focus-ring parity across all composite widgets. |
- **Grounded Code Remediations & Atomic Acceptance Criteria (Zero Semantic Loss)**:
  - Deliver every `Required Fix` using **concrete, grounded code** — JSX/TSX/HTML markup, regime-appropriate attributes, TypeScript event/focus/state handlers (`event.target.closest(...)`, synchronous unmount focus handoff, optimistic rollback, staleness watchdogs), and structural/tokenized CSS (`isolation: isolate`, `@container`, `prefers-reduced-motion: reduce`, `aspect-ratio`, `scrollbar-gutter: stable`, and verified `--zIndex-*` / theme tokens) — paired with single-responsibility **Acceptance Criteria (Given/When/Then)**.
  - **Ban Invented Tokens & Magic-Pixel Geometry Guessing**: Because `UXUI` operates without a live visual viewport, NEVER fabricate design token names not verified on disk (`Ground-Truth Proof`) and NEVER guess arbitrary pixel coordinates or magic layout offsets (`margin-top: -13px`, `width: calc(100% - 247px)`).
- **Universal GUI & Front-End DX Invariants (Applicable to All Regimes)**:
  - **Design Tokens & Surface Context**: Verify and cite exact design token names (`theme.css`, token catalog) on disk; NEVER invent token names or hardcode raw hex/pixel literals where codebase tokens exist. On fixed dark/media surfaces, allow surface-scoped high-contrast tokens rather than forcing root light-theme tokens.
  - **Vector SVG Icons vs. Raw Emojis**: Reject raw emoji characters (`📁`, `⚙️`, `🗑️`, `⭐`) in UI markup or mockups; require vector SVG icons bound to `currentColor` (`aria-hidden="true"` when paired with text). Allow icon-only buttons ONLY for universally recognized canonical actions (close, trash delete, settings gear, copy, search) equipped with both `aria-label` and a hover/focus tooltip (`title` or tooltip primitive); require visible text labels on non-canonical domain actions.
  - **Pragmatic Unmount & Async Focus Retention (No Drop to `document.body`)**: Prevent browser/Chromium focus eviction to `document.body` when an active element unmounts or runs an async action: (a) closing a modal, dialog, or popover must return focus deterministically to its invoking trigger (or designated surviving fallback), (b) deleting/unmounting the currently focused item in a dynamic list must hand off focus synchronously to the adjacent surviving item (`index + 1` or `index - 1`) or empty-state fallback container via a lightweight ref lookup, and (c) focused async action buttons must guard in-flight clicks via state + `aria-disabled="true"` rather than native HTML `disabled` when preserving active focus matters. Ban post-render `setTimeout` DOM query (`document.querySelector`) focus hacks. *(Note: Full WAI-ARIA roving `tabindex` cyclic arrow-key state machines and `aria-activedescendant` are restricted strictly to `STRICT_ACCESSIBILITY_COMPLIANCE`).*
  - **Browser-Safe Event Coordination (Ban on `stopPropagation()`)**: Ban `event.stopPropagation()` and `event.stopImmediatePropagation()`. For nested interactive controls inside clickable rows/cards, specify either: (a) **Parent Target Filtering** (parent handler ignores events originating from interactive descendant elements `button, a, input, select, textarea, [role="button"], [data-interactive]`), which is mandatory when children include native checkboxes, radio inputs, links, or submit buttons, OR (b) **Preventable Event Contracts** (`event.preventDefault()` + parent `event.defaultPrevented` check) strictly on custom non-native `type="button"` actions where canceling browser default action is safe.
  - **Front-End DX, Clean Component Architecture & Maintainability**: Require immutable domain entity keys (`key={entity.id}`) on dynamic lists (banning volatile `key={index}`). Enforce single-source-of-truth state without redundant mirror state or fragile ref-map boilerplate when native browser `<button>`/`Tab` semantics suffice. Require clean, extensible component contracts (`children`/slots over boolean prop explosion, `ref` forwarding on shared UI primitives) and deterministic cleanup of timers, observers, and event listeners on unmount.
  - **Stacking Contexts & 3-Tier Layout Precedence**: Require tokenized elevation (`--zIndex-*`) and `isolation: isolate` over magic number z-indices. Apply 3-tier precedence: (1) `Context.md` user directives > (2) existing codebase conventions > (3) defaults: smooth accordion transitions for dynamic slots (preserving error recovery controls in `catch` states), slim top progress lines / inline spinners over heavy skeletons on fast $<200\text{ms}$ desktop loads, and one-click soft-delete with ephemeral Toast Undo (restricting optimistic UI strictly to non-destructive reversible actions).
  - **Staleness Timeouts & Quantitative Progress ($>2\text{s}$)**: Require quantitative progress (`processed / total`, percentage) + Cancel action for operations $>2\text{s}$, and abort only on progress staleness (zero delta over inactivity window) rather than fixed wall-clock timers.
  - **Context-Aware Input Handling & Micro-Copy**: Require whitespace/case tolerance on human search queries, but strict literal preservation on technical identifiers/paths/hex codes. Default micro-copy/wording critiques to non-blocking Suggestions unless factually misleading or inducing destructive data loss.

- **Miss-Probability Gate (Headless AI Implementer Baseline)**:
  Assume the implementer is an AI coding agent that (a) writes production code and tests directly from ticket text in headless CI with no human operating the app, and (b) writes ONLY the tests its ticket's Acceptance Criteria explicitly call for (never unprompted exploratory or adversarial tests). `"A human tester would notice this in the browser/console"` is NEVER valid grounds to downgrade a defect to Suggestion:
  | Defect Behavior for Headless AI Implementer | Classification |
  | :--- | :--- |
  | Silently missed in headless CI (unmount focus eviction to `document.body`, CLS jump, swallowed bubbling event, raw emoji, unlabeled icon-only action, missing error recovery state, volatile `key={index}` state corruption, or regime-applicable a11y flaw) OR visible error whose generalized fix is non-obvious | **Blocking Defect** (MUST include `Why This Would Be Missed`). |
  | Produces an immediate compiler/type error or failing assertion against stated Acceptance Criteria with an obvious fix | **Suggestion Only** (NEVER mark as Blocking Defect). |

## 2. Domain Subdocuments Routing Table

Inspect `## UX/UI & Accessibility Regime` in `Context.md` and call `view_file` ONLY on subdocuments whose trigger condition matches:

| Target Subsystem Archetype | Trigger Condition (When to Load) | Subdocument |
| :--- | :--- | :--- |
| **Interactive Flows, Focus Retention & Front-End DX** | DA specifies forms, buttons, icons, modals, list mutations, or component/event architecture *(All UX/UI Regimes)* | [`UX-INTERACTION-FLOW.md`](UX-INTERACTION-FLOW.md) |
| **Layout Stability, Loading & Optimistic UI** | DA specifies async loading states, dynamic containers, animations, or long-running jobs *(All UX/UI Regimes)* | [`UX-RESPONSIVE-PERFORMANCE.md`](UX-RESPONSIVE-PERFORMANCE.md) |
| **Strict WCAG & WAI-ARIA Compliance** | **ONLY** when `Context.md` declares `UX/UI Regime: STRICT_ACCESSIBILITY_COMPLIANCE` (`!A11Y` / `!WCAG`) | [`UX-ACCESSIBILITY-WCAG.md`](UX-ACCESSIBILITY-WCAG.md) |

## 3. Verdict Rules & Standard Output Protocol

Write evaluation to `<review_dir>/reports/UXUI.md` via `write_to_file`, then notify Host via `send_message`:
- `STATUS: PASS`: Interface flows, physical focus retention, layout stability, front-end DX, and regime-applicable accessibility are complete.
- `STATUS: REVISIONS NEEDED`: Missing form/loading/error states, unmount focus eviction to `document.body`, raw emojis, unlabeled icon-only buttons, magic z-indices, `stopPropagation()`, volatile `key={index}`, destructive optimistic UI, or regime-applicable accessibility defects exist.
- `STATUS: INFEASIBLE`: UI requirement violates hard platform/browser constraints (overrides fixable defects as overall status).

```markdown
### Review Evaluation: UXUI

- **Status**: `STATUS: PASS`, `STATUS: REVISIONS NEEDED`, or `STATUS: INFEASIBLE`

### Blocking Issues (Exhaustive List of ALL Identified Defects):
<!-- For Fixable Defects -->
1. **[Issue Title]**:
   - **Target Section**: `<Section_Name>`
   - **Required Fix**: <Diff-ready UI remediation specifying: (1) grounded JSX/TSX/event-handler/tokenized-CSS code blocks aligned with the active UX/UI Regime (zero invented tokens, zero magic-pixel offsets, and zero enterprise WCAG state-machine bloat under PRAGMATIC_PRODUCT_UX), (2) all parallel UI state branches & symmetrical parent/child component props, (3) any [NEW]/[MODIFY]/[DELETE] stylesheet/component Target Files additions, and (4) synchronized test descriptions & atomic Given/When/Then Acceptance Criteria>
   - **Why This Would Be Missed**: <Why a headless AI implementer without eyes or manual browser testing silently misses this UX/focus/DX defect>
   - **Ground-Truth Proof**: <Exact file path and line number verifying theme/elevation tokens, component structure, or view lifecycle on disk>
   - **Macro Flow Proof**: <Proof that layout stability (CLS=0), focus anchor continuity, error recovery controls, and symmetrical state transitions remain intact>

<!-- For Infeasible Defects (forces overall Status to STATUS: INFEASIBLE) -->
1. **[Issue Title]**:
   - **Target Section**: `<Section_Name>`
   - **Infeasibility Proof**: <Empirical proof of browser/OS platform constraint>
   - **Alternative Architectural Paths**: <Viable interaction alternatives>

### Suggestions for Improvement (Non-blocking):
```

## 4. Gate Response Protocol (Host Interaction)

If notified that Host filed `<review_dir>/reports/UXUI_Gated_Issues.md`, read it via `view_file`, execute ONE action below directly via `write_to_file` (never via helper scripts in `sandbox/UXUI/`), and notify Host via `send_message`:
1. **Refine / Complete as Requested**: Edit `<review_dir>/reports/UXUI.md` in-place via `write_to_file` to replace any unverified magic-pixel geometry or invented tokens with grounded codebase tokens, supply verified component proofs on disk, decompose compound criteria, or replace unsafe `preventDefault()` demands on native controls with parent target filtering.
2. **Remove**: Edit `<review_dir>/reports/UXUI.md` in-place to remove the invalid/false-positive issue (e.g. enterprise WCAG roving `tabindex` / `aria-activedescendant` / screen-reader ARIA wiring demanded under `PRAGMATIC_PRODUCT_UX`, or optimistic UI demanded on destructive writes) and update `- **Status**:`.
3. **Reject Gating/Removal and Explain**: Write `<review_dir>/reports/UXUI_Explain.md` with deeper codebase evidence AND update `<review_dir>/reports/UXUI.md` in-place. NEVER repeat stale arguments.
