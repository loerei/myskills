---
name: ux-interaction
description: Use when building or auditing interactive controls, search, menus, forms, scroll behavior, and states.
---

# UX Interaction

Design responsive, low-friction interactive controls, state transitions, and keyboard/pointer ergonomics for web and desktop apps.

## Core Principle: Minimum Steps to Intent

Ask from the user's seat: *"How should this control respond the instant I touch it, what state am I in, and what would be irritating to click through?"* Favor direct manipulation, immediate local feedback, and predictable keyboard/scroll behavior over modal ceremony and notification noise.

## Directives

1. **Direct Manipulation Over Ceremony**:
   - **Search & Filter**: For local or in-memory collections, filter results immediately on `input` (debounced `100-200ms` if rendering is heavy), highlight matching substrings when helpful, and show a clean inline empty-results row. Require an explicit submit button or `Enter` only for expensive remote queries.
   - **Inline Over Modal**: Use direct inline controls (click-to-rename, inline select, toggle, lightweight popover) for single-field or frequent edits. Reserve blocking modals for destructive confirmations or multi-step flows that cannot fit inline.
   - **Progressive Disclosure**: Keep primary rows and cards uncluttered; place secondary, batch, or infrequent actions inside right-click/overflow context menus or cascading submenus.
2. **Show, Don't Tell (Inline State Feedback)**:
   - Confirm actions directly on the triggered element (optimistic state update, icon morph `Copy -> Check`, inline progress/busy indicator) instead of firing `window.alert()` or stacking toast notifications.
   - Reserve floating toasts or banners for asynchronous background completions, cross-view side effects, or errors that require user attention.
3. **Complete State Coverage**:
   - Every data view and interactive control MUST explicitly handle four states:
     - `loading`: Layout-matched skeleton or subtle inline indicator that never jumps page height when data arrives.
     - `empty`: Concise explanation of why the view is empty and, if applicable, one direct action to populate it. Hide dead filter/sort toolbars when the underlying collection is empty.
     - `error`: Inline message adjacent to the failed control or section that preserves user input and offers a retry path.
     - `disabled`: Reduced opacity, `cursor: default` (or `not-allowed` when explanation is needed), and blocked pointer/keyboard activation.
4. **Tactile, Layout-Stable Affordances**:
   - Every interactive element (`button`, `a`, clickable row, custom control) MUST have `cursor: pointer` and distinct `:hover`, `:active`, and `:focus-visible` states that remain legible in both light and dark themes.
   - **Zero Layout Shift on Interaction**: Hover, focus, and active states MUST NOT alter element dimensions (`padding`, `border-width`, `font-weight` without width reservation) or shift neighboring elements. Animate `transform` and `opacity` only (`120-200ms ease-out`).
   - Apply `backdrop-filter: blur(...)` only to fixed headers, floating menus, or modal overlays, never to scrolling list items.
5. **Scroll, Focus & Keyboard Sanity**:
   - **No Scroll Trapping**: Never hijack native page scroll. Constrain internal scroll areas (`max-height` + `overflow-y: auto`) only when functionally required, add `overscroll-behavior: contain` on overlays/menus, and keep a visual fade or scrollbar affordance so content never looks truncated.
   - **Keyboard & Dismissal Contracts**: Support `Escape` and outside-click to dismiss any open menu, popover, or modal; `Enter` to commit single-line inline edits (`Escape` to cancel and restore prior value); and arrow-key navigation in custom menus/lists.
   - **Focus & Motion**: Ensure `:focus-visible` rings are never clipped by `overflow: hidden` or hidden behind sticky headers (`scroll-margin-top`). Respect `@media (prefers-reduced-motion: reduce)` by disabling non-essential movement.

---

## Pre-Delivery Interaction Audit

| Component / Flow | Required Verification |
| :--- | :--- |
| **Search / Filter Input** | Updates local list on `input`, clears cleanly (`Escape` or clear button), and renders an explicit `0 results` state. |
| **Buttons & Action Triggers** | Prevents double-submit while pending, shows inline feedback (`Show, Don't Tell`), and never triggers `alert()`. |
| **Menus, Popovers & Modals** | Closes on `Escape` and outside click, keeps within viewport bounds, and restores focus on close. |
| **Hover / Active / Focus** | Zero `1px` layout shift on hover/press; `:focus-visible` ring is clearly visible on keyboard `Tab`. |
| **Scrollable Containers** | Does not trap wheel events unexpectedly; nested scroll lists use `overscroll-behavior: contain`. |

---

## Workflow

1. **Map the Interaction Loop**: Before coding a control, trace: *Trigger -> Immediate Visual Response -> Pending/Optimistic State -> Success or Error Recovery -> Dismissal/Reset*.
2. **Implement Semantic Native Controls First**: Use native `<button>`, `<input>`, `<dialog>`, and keyboard events before custom `<div>` wrappers so focus and screen-reader behavior work by default.
3. **Verify All States & Inputs**: Walk through the Pre-Delivery Interaction Audit table with pointer hover, keyboard `Tab`/`Enter`/`Escape`, empty/error states, and both light/dark themes.
