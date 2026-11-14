# Strict WCAG 2.1 AA, WAI-ARIA Composite Flows, and Front-End DX

**REGIME GATE**: Load and enforce this subdocument **ONLY** when `<review_dir>/Context.md` declares `UX/UI Regime: STRICT_ACCESSIBILITY_COMPLIANCE` (triggered by `!A11Y` / `!WCAG` or ADA/EAA/Section 508-mandated Enterprise, Public SaaS, FinTech, Healthcare, GovTech, or shared UI Component Library targets).

Audits 4-state interaction completeness, WAI-ARIA Authoring Practices (APG) composite widget keyboard state machines (`roving tabindex` and `aria-activedescendant`), screen-reader semantic ID graphs (`useId()`, `aria-labelledby`, `aria-describedby`, `aria-live`), WCAG 2.1 AA contrast/focus-ring parity, vector icon clarity, and browser-safe Front-End DX. Pair grounded JSX/TSX/ARIA/event-handler code remediations with atomic Given/When/Then acceptance criteria (never invent unverified token names or magic-pixel offsets).

## Domain Audit Checklist

### 1. Form Validation, 4-State Coverage & Live Announcements
- [ ] **Explicit Four-State Coverage**: Verify interactive forms and dialogs explicitly specify all four states: `Idle`, `Submitting` / `Loading`, `Success`, and `Error`.
- [ ] **Screen-Reader Validation Alerts**: Keep submit buttons focusable via `aria-disabled="true"` and associate validation error summaries with inputs via collision-free `useId()` IDs, `aria-invalid="true"`, and `aria-describedby` (`role="alert"`) rather than silently disabling submit controls without explanation.
- [ ] **Polite & Assertive Live Regions**: Announce asynchronous status updates, background filter counts, and toast notifications via `role="status"` (`aria-live="polite"`), and announce blocking validation errors or critical alerts via `role="alert"` (`aria-live="assertive"`).

### 2. WAI-ARIA Composite Widgets & Roving Tabindex State Machines
- [ ] **Single Tab-Stop Composite Navigation (`roving tabindex`)**: For composite widgets (`role="tablist"`, `role="listbox"`, `role="menu"`, `role="menubar"`, `role="toolbar"`, `role="radiogroup"`, `role="treegrid"`), enforce a single tab stop (`tabIndex={isActive ? 0 : -1}`) with cyclic directional arrow-key navigation (`ArrowDown`/`ArrowUp` or `ArrowRight`/`ArrowLeft`), `Home` (first enabled item), and `End` (last enabled item) via deterministic ref maps, plus synchronous focus handoff to item $k+1$ (or $k-1$) on item deletion.
- [ ] **Virtualized Composite Focus (`aria-activedescendant`)**: For virtualized comboboxes, command palettes, or large grids where DOM nodes mount/unmount on scroll, maintain container focus and synchronize `aria-activedescendant={activeOptionId}` with scroll-into-view guarantees.
- [ ] **Modal Focus Trapping, `aria-labelledby` & Restoration**: Verify `role="dialog"` / `role="alertdialog"` containers set `aria-modal="true"`, bind their heading via `useId()` and `aria-labelledby`, trap `Tab` and `Shift+Tab` cyclically within focusable descendants while open, support `Escape` dismissal, and restore focus to the invoking trigger on close.
- [ ] **In-Flight Focus Continuity**: For buttons initiating async jobs, require `aria-disabled="true"` with in-flight interaction blocking rather than native HTML `disabled` (which causes browsers to blur the control and evict focus to `document.body`).
- [ ] **Dynamic ARIA State Synchronization**: Confirm interactive disclosures, toggles, tabs, and selection controls synchronize `aria-expanded`, `aria-selected`, `aria-checked`, `aria-pressed`, `aria-invalid`, and `aria-current` with component state transitions.

### 3. Visual Contrast, Icons & Clean Front-End DX
- [ ] **WCAG 2.1 AA Contrast & `:focus-visible` Outlines**: Verify text tokens maintain $\ge 4.5:1$ contrast for normal text and $\ge 3:1$ for large text, icons, and control boundaries. Reject `outline: none` unless replaced by a high-contrast tokenized `:focus-visible` indicator ($\ge 2\text{px}$ solid offset outline).
- [ ] **Vector Icon Accessibility & Parity**: Require clean vector SVGs (`currentColor`, explicit dimensions, and `aria-hidden="true"` when paired with text, or `aria-label` + hover/focus tooltip on canonical icon-only controls). Strictly reject raw emoji characters (`📁`, `⚙️`, `🗑️`, `⭐`). Require visible text labels on non-canonical domain actions.
- [ ] **Browser-Safe Event Coordination (Ban on `stopPropagation()`)**: Reject `event.stopPropagation()` and `event.stopImmediatePropagation()`. Use **Parent Target Filtering** (`event.target.closest('button, a, input, select, textarea, [role="button"], [data-interactive]')`) when children include native checkboxes/links/submit buttons, or **Preventable Event Contracts** (`event.preventDefault()` + `event.defaultPrevented`) on custom non-native `type="button"` actions.
- [ ] **Immutable Entity Keys & Reusable Primitive Ergonomics**: Enforce immutable entity keys (`key={item.id}`, banning `key={index}` and `setTimeout` DOM query hacks). For shared UI primitives, verify Controlled/Uncontrolled support and `ref` forwarding (`forwardRef`).

## Concrete Anti-Patterns

### Anti-Pattern 1: Unmanaged Tab Stops in WAI-ARIA Composite Tablist / Listbox

```tsx
// BAD: Every tab is a separate Tab stop with no Arrow/Home/End roving tabindex
function CategoryTabsBad({ tabs, activeId, onSelect }: { tabs: { id: string; label: string }[]; activeId: string; onSelect: (id: string) => void }) {
  return (
    <div role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={t.id === activeId} onClick={() => onSelect(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// GOOD: WAI-ARIA APG roving tabindex with cyclic ArrowLeft/ArrowRight, Home, and End
function CategoryTabsAccessible({ tabs, activeId, onSelect }: { tabs: { id: string; label: string }[]; activeId: string; onSelect: (id: string) => void }) {
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (tabs.length === 0) return;
    let nextIndex: number | null = null;
    if (e.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") nextIndex = 0;
    else if (e.key === "End") nextIndex = tabs.length - 1;

    if (nextIndex !== null) {
      e.preventDefault();
      const nextTab = tabs[nextIndex];
      onSelect(nextTab.id);
      tabRefs.current.get(nextTab.id)?.focus();
    }
  };

  return (
    <div role="tablist" aria-orientation="horizontal">
      {tabs.map((t, idx) => {
        const isSelected = t.id === activeId;
        return (
          <button
            key={t.id}
            ref={(el) => { if (el) tabRefs.current.set(t.id, el); else tabRefs.current.delete(t.id); }}
            type="button"
            role="tab"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelect(t.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
```
- **Acceptance Criterion**: *Given* focus is on the active tab in `role="tablist"`, *when* the user presses `ArrowRight`, `ArrowLeft`, `Home`, or `End`, *then* `tabIndex={0}` and `aria-selected="true"` transition cyclically to the target tab and DOM focus moves synchronously via `tabRefs`.

### Anti-Pattern 2: Unlinked Screen-Reader Modal Headings & Form Validation Alerts

```tsx
// BAD: Dialog lacks aria-labelledby linkage, button uses native disabled, and error message is not bound via aria-describedby
function RenameDialogBad({ isValid, error }: { isValid: boolean; error?: string }) {
  return (
    <div role="dialog" aria-modal="true">
      <h2>Rename Workspace</h2>
      <input type="text" />
      {error && <span>{error}</span>}
      <button disabled={!isValid}>Submit</button>
    </div>
  );
}

// GOOD: Collision-free useId() wiring for aria-labelledby, aria-describedby, role="alert", and aria-disabled focus retention
function RenameDialogAccessible({ isValid, error, onSubmit }: { isValid: boolean; error?: string; onSubmit: () => void }) {
  const titleId = useId();
  const errorId = useId();
  return (
    <div role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <h2 id={titleId}>Rename Workspace</h2>
      <input
        type="text"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      {error && <div id={errorId} role="alert">{error}</div>}
      <button
        type="button"
        aria-disabled={!isValid}
        aria-describedby={error ? errorId : undefined}
        onClick={(e) => { if (!isValid) { e.preventDefault(); return; } onSubmit(); }}
      >
        Submit
      </button>
    </div>
  );
}
```
- **Acceptance Criterion**: *Given* the dialog mounts with a validation error, *when* inspected in the accessibility tree, *then* `role="dialog"` references the heading `id` via `aria-labelledby`, the input sets `aria-invalid="true"` and references `#errorId` (`role="alert"`) via `aria-describedby`, and activating Submit while invalid retains focus via `aria-disabled="true"`.

### Anti-Pattern 3: Indiscriminate `stopPropagation()` & Raw Emoji Icons

```tsx
// GOOD: Parent target filtering ignores interactive descendants and buttons use vector SVGs with currentColor
const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, [role="button"], [data-interactive]';

function AccessibleRowSafe({ item, onSelectRow, onDelete }: { item: { id: string; name: string }; onSelectRow: (id: string) => void; onDelete: (id: string) => void }) {
  const handleRowClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest(INTERACTIVE_SELECTOR)) return;
    onSelectRow(item.id);
  };
  return (
    <div onClick={handleRowClick}>
      <input type="checkbox" aria-label={`Select ${item.name}`} />
      <button type="button" aria-label={`Delete ${item.name}`} title={`Delete ${item.name}`} onClick={() => onDelete(item.id)}>
        <svg width="16" height="16" fill="currentColor" aria-hidden="true"><use href="#icon-trash" /></svg>
      </button>
    </div>
  );
}
```
- **Acceptance Criterion**: *Given* a clickable row containing a child checkbox and canonical icon-only Delete button, *when* the user activates the checkbox or Delete button, *then* the child action executes without firing `onSelectRow`, `document` click listeners receive the bubbled event, and the Delete button exposes `<svg aria-hidden="true">`, `aria-label`, and `title`.

## Failure Modes & Mitigations

- **Fragmented Composite Keyboard Navigation**: Implement WAI-ARIA roving `tabindex` (`0` on active item, `-1` on peers) with `Arrow`, `Home`, and `End` handlers on composite widgets.
- **Duplicate Hardcoded ARIA IDs**: Use `useId()` to generate unique instance-scoped IDs for `aria-labelledby` and `aria-describedby`.
- **Silent Screen-Reader State Changes**: Pair dynamic visual state changes with `aria-expanded`, `aria-selected`, `aria-invalid`, and `role="status"` / `role="alert"` live regions.
- **Swallowed Global Shortcuts & Dismiss Events**: Ban `stopPropagation()`; use parent `event.target.closest(...)` filtering.
